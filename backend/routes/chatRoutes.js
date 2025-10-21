import fastify from 'fastify';
import chatRoomDB from '../database/chatRoom.js';
import friends from '../database/friends.js';
import messagesDB from '../database/messages.js';
import { getUserById } from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import Security from '../other/security.js';
import ValidationUtils from '../other/validation.js';

class ChatSecurity {
	static validateChatAccess(userId, roomId) {
		return messagesDB.verifyUserChatRoomAccess(userId, roomId);
	}
	static checkBlock(userId, otherUserId) {
		return friends.checkIfFriendshipBlocked(userId, otherUserId);
	}
	static getOtherUserInsideRoom(chatRoom, currentUserId) {
		return chatRoom.userId1 === currentUserId ? chatRoom.userId2 : chatRoom.userId1;
	}
}

/* class SchemaBuilder {
	static roomIdParam() {
	}
	static messageIdParam() {
	}
	static messageBody() {
	}
	static userIdBody() {
	}
} */

async function chatRoutes(fastify, options) {
// Used to get all the chat rooms where the user is inserted
	fastify.get('/api/chat/rooms',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		const userId = request.user.id;

		try {
			const chatRooms = chatRoomDB.getUserChatRooms(userId);
			const chatRoomsWithoutBlocked = [];
			for (const room of chatRooms) {
				const otherUserId = ChatSecurity.getOtherUserInsideRoom(room, userId);
				if (!ChatSecurity.checkBlock(userId, otherUserId)) {
					const otherUser = getUserById(otherUserId);
					chatRoomsWithoutBlocked.push({
						...room,
						otherUser: {
							id: otherUser.id,
							name: otherUser.name,
							online: otherUser.online
						}
					});
				}
			}
			BaseRoute.handleSuccess(reply, chatRoomsWithoutBlocked);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch chat rooms.", 500);
		}
	});

// Used to get or create a chat room with another user
	fastify.post('/api/chat/rooms',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['otherUserId'],
		properties: {
			otherUserId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { otherUserId } = request.body;
		const validationCheck = ValidationUtils.validateChatRoom({
			userId1: userId,
			userId2: otherUserId
		});
		if (!validationCheck.isValid)
			return BaseRoute.handleError(reply, validationCheck.errors.join(', '), 400);

		const otherUser = getUserById(otherUserId);
		if (!otherUser)
			return BaseRoute.handleError(reply, "User not found.", 404);
		if (ChatSecurity.checkBlock(userId, otherUserId))
			return BaseRoute.handleError(reply, "Friendship is blocked.", 403);
		try {
			const chatRoom = chatRoomDB.createOrGetChatRoom(userId, otherUserId);
			BaseRoute.handleSuccess(reply, chatRoom);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to create chat room.", 500);
		}
	});

// Used to get messages from a specific chat room
	fastify.get('/api/chat/rooms/:roomId/messages',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['roomId'],
		properties: {
			roomId: { type: 'integer' }
		}
	}, null, {
		type: 'object',
		properties: {
			limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
			offset: { type: 'integer', minimum: 0, default: 0 }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { roomId } = request.params;
		const { limit = 50, offset = 0 } = request.query;

		if (!ChatSecurity.validateChatAccess(userId, roomId))
			return BaseRoute.handleError(reply, "Access denied to this chat.", 403);
		try {
			const messages = messagesDB.getChatRoomMessages(roomId, limit, offset);
			BaseRoute.handleSuccess(reply, messages);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch messages.", 500);
		}
	});

// Used to send a new Message
	fastify.post('/api/chat/rooms/:roomId/messages',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['roomId'],
		properties: {
			roomId: { type: 'integer' }
		}
	}, {
		type: 'object',
		required: ['messageText'],
		properties: {
			messageText: {
				type: 'string',
				minLength: 1,
				maxLength: 1000
			}
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { roomId } = request.params;
		let { messageText } = request.body;

		if (!ChatSecurity.validateChatAccess(userId, roomId))
			return BaseRoute.handleError(reply, "Access denied to this chat.", 403);

		const chatRoom = chatRoomDB.getChatRoom(roomId);
		const toUserId = ChatSecurity.getOtherUserInsideRoom(chatRoom, userId);

		if (ChatSecurity.checkBlock(userId, toUserId))
			return BaseRoute.handleError(reply, "Cannot send message. User relationship is blocked.", 403);

		const validationCheck = ValidationUtils.validateMessage(messageText);
		if (!validationCheck.isValid)
			return BaseRoute.handleError(reply, validationCheck.errors.join(', '), 400);
		messageText = Security.sanitizeInput(messageText.trim());

		try {
			const newMessage = messagesDB.sendMessage(roomId, userId, toUserId, messageText);
			await fastify.notifyNewMessage(toUserId, newMessage);
			BaseRoute.handleSuccess(reply, newMessage, 201);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to send message.", 500);
		}
	});

// Used to send a game invite
	fastify.post('/api/chat/rooms/:roomId/game-invite',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['roomId'],
		properties: {
			roomId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { roomId } = request.params;
		if (!ChatSecurity.validateChatAccess(userId, roomId))
			return BaseRoute.handleError(reply, "Access denied to this chat.", 403);
		const chatRoom = chatRoomDB.getChatRoom(roomId);
		const toUserId = ChatSecurity.getOtherUserInsideRoom(chatRoom, userId);
		if (ChatSecurity.checkBlock(userId, toUserId))
			return BaseRoute.handleError(reply, "Cannot send Invite. User relationship is blocked.", 403);
		const otherUser = getUserById(toUserId);
		if (!otherUser)
			return BaseRoute.handleError(reply, "User not found.", 404);

		try {
			await fastify.notifyGameInvite(toUserId, {
				fromUserId: userId,
				fromUserName: request.user.name,
				roomId: roomId
			});
			BaseRoute.handleSuccess(reply, "Game invitation sent successfully.");
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to send invite.", 500);
		}
	});

// Used to delete a message
	fastify.delete('/api/chat/messages/:messageId',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['messageId'],
		properties: {
			messageId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { messageId } = request.params;

		try {
			const messageToDelete = messagesDB.getMessageById(messageId);
			const chatRoomId = messageToDelete.chatRoomId;
			const result = messagesDB.deleteMessage(messageId, userId);
			if (result) {
				await fastify.notifyMessageDeleted(messageId, chatRoomId);
				BaseRoute.handleSuccess(reply, "Message deleted successfully.");
			}
			else
				BaseRoute.handleError(reply, "Message not found.", 404);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to delete message.", 500);
		}
	});

// Used to get the unread messages count
	fastify.get('/api/chat/unread-count',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		const userId = request.user.id;
		try {
			const count = messagesDB.getUnreadMessageCount(userId);
			BaseRoute.handleSuccess(reply, { unreadCount: count });
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch unread count.", 500);
		}
	});
}

export default chatRoutes;
