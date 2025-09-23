import chatRoomDB from '../database/chatRoom.js';
import friends from '../database/friends.js';
import messagesDB from '../database/messages.js';
import { getUserById } from '../database/users.js';
import xss from 'xss';

async function chatRoutes(fastify, options) {
// Used to get all the chat rooms where the user is inserted
	fastify.get('/api/chat/rooms', {
		onRequest: [fastify.authenticate]
	}, async (request, reply) => {
		const userId = request.user.id;

		try {
			const chatRooms = chatRoomDB.getUserChatRooms(userId);
			const chatRoomsWithoutBlocked = [];
			for (const room of chatRooms) {
				const otherUserId = room.userId1 === userId ? room.userId2 : room.userId1;
				const blockStatus = friends.checkIfFriendshipBlocked(userId, otherUserId);
				if (!blockStatus) {
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
			reply.send(chatRoomsWithoutBlocked);
		}
		catch (err) {
			reply.status(500).send({ err: "Failed to fetch chat rooms." });
		}
	});

// Used to get or create a chat room with another user
	fastify.post('/api/chat/rooms', {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				required: ['otherUserId'],
				properties: {
					otherUserId: { type: 'integer' }
				}
			}
		}
	}, async (request, reply) => {
		const userId = request.user.id;
		const { otherUserId } = request.body;
		
		if (userId === otherUserId)
			return reply.status(400).send({ error: "Cannot create chat room with yourself." });
		const otherUser = getUserById(otherUserId);
		if (!otherUser)
			return reply.status(404).send({ error: "User not found." });
		const blockStatus = friends.checkIfFriendshipBlocked();
		if (blockStatus)
			return reply.status(403).send({ error: "Friendship is blocked." });
		try {
			const chatRoom = chatRoomDB.createOrGetChatRoom(userId, otherUserId);
			return reply.send(chatRoom);
		}
		catch (err) {
			reply.status(500).send({ err: "Failed to create chat room." });
		}
	});

// Used to get messages from a specific chat room
	fastify.get('/api/chat/rooms/:roomId/messages', {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				required: ['roomId'],
				properties: {
					roomId: { type: 'integer' }
				}
			},
			querystring: {
				type: 'object',
				properties: {
					limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
					offset: { type: 'integer', minimum: 0, default: 0 }
				}
			}
		}
	}, async (request, reply) => {
		const userId = request.user.id;
		const { roomId } = request.params;
		const { limit = 50, offset = 0 } = request.query;

		if (!messagesDB.verifyUserChatRoomAccess(userId, roomId))
			return reply.status(403).send({ error: "Access denied to this chat." });
		try {
			const messages = messagesDB.getChatRoomMessages(roomId, limit, offset);
			reply.send(messages);
		}
		catch (err) {
			reply.status(500).send({ err: "Failed to fetch messages." });
		}
	});

// Used to send a new Message
	fastify.post('/api/chat/rooms/:roomId/messages', {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				required: ['roomId'],
				properties: {
					roomId: {type: 'integer' }
				}
			},
			body: {
				type: 'object',
				required: ['messageText'],
				properties: {
					messageText: {
						type: 'string',
						minLength: 1,
						maxLength: 1000
					}
				}
			}
		}		
	}, async (request, reply) => {
		const userId = request.user.id;
		const { roomId } = request.params;
		let { messageText } = request.body;

		if (!messagesDB.verifyUserChatRoomAccess(userId, roomId))
			return reply.status(403).send({ error: "Access denied to this chat." });

		const chatRoom = chatRoomDB.getChatRoom(roomId);
		const toUserId = chatRoom.userId1 === userId ? chatRoom.userId2 : chatRoom.userId1;

		const blockStatus = friends.checkIfFriendshipBlocked(userId, toUserId);
		if (blockStatus)
			return reply.status(403).send({ error: "Cannot send message. User relationship is blocked."});

		messageText = xss(messageText.trim());

		try {
			const newMessage = messagesDB.sendMessage(roomId, userId, toUserId, messageText);
			await fastify.notifyNewMessage(toUserId, newMessage);
			reply.status(201).send(newMessage);
		}
		catch (err) {
			reply.status(500).send({ err: "Failed to send message." });
		}
	});

// Used to delete a message
	fastify.delete('/api/chat/messages/:messageId', {
		onRequest: [fastify.authenticate],
		schema: {
			params:{
				type: 'object',
				required: ['messageId'],
				properties: {
					messageId: { type: 'integer' }
				}
			}
		}
	}, async (request, reply) => {
		const userId = request.user.id;
		const { messageId } = request.params;

		try {
			const result = messagesDB.deleteMessage(messageId, userId);
			if (result) {
				await fastify.notifyMessageDeleted(messageId);
				reply.send({ message: "Message deleted successfully." });
			}
			else
				reply.status(404).send({ error: "Message not found." });
		}
		catch (err) {
			reply.status(500).send({ err: "Failed to delete message." });
		}
	});

// Used to get the unread messages count
	fastify.get('/api/chat/unread-count', {
		onRequest: [fastify.authenticate]
	}, async (request, reply) => {
		const userId = request.user.id;
		try {
			const count = messagesDB.getUnreadMessageCount(userId);
			reply.send({ unreadCount: count });
		}
		catch (err) {
			reply.status(500).send({ err: "Failed to fetch unread count." });
		}
	});
}

export default chatRoutes;
