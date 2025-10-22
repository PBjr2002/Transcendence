import websocket from '@fastify/websocket';
import users from '../database/users.js';
import friends from '../database/friends.js';
import chatRoomDB from '../database/chatRoom.js';

const onlineUsers = new Map();

class NotificationService {
	constructor (onlineUsers) {
		this.onlineUsers = onlineUsers;
	}

	async sendToUser(userId, messageData, errorContext = 'notification') {
		try {
			const userConnection = this.onlineUsers.get(userId);
			if (userConnection && userConnection.readyState === 1) {
				const message = JSON.stringify(messageData);
				userConnection.send(message);
				return true;
			}
		}
		catch (err) {
			console.error(`Error ${errorContext}:`, err);
			return false;
		}
	}

	async sendToUsers(userIds, messageData, errorContext = 'notification') {
		userIds.forEach(userId => {
			this.sendToUser(userId, messageData, errorContext);
		});
	}
}

const notificationService = new NotificationService(onlineUsers);

async function notifyFriendRemoved(userId1, userId2) {
	await notificationService.sendToUser(userId1, {
		type: 'friend_removed',
		removedFriendId: userId2
	}, 'friend_removed');
	await notificationService.sendToUser(userId2, {
		type: 'friend_removed',
		removedFriendId: userId1
	}, 'friend_removed');
}

async function notifyFriendsOfStatusChange(userId, isOnline) {
	const userFriends = await friends.getFriends(userId);
	const friendsIds = userFriends.map(friend => friend.id);
	await notificationService.sendToUsers(friendsIds, {
		type: 'friend_status_change',
		friendId: userId,
		online: isOnline
	}, 'friend_status_change');
}

async function notifyFriendRequest(addresseeId, requesterData) {
	await notificationService.sendToUser(addresseeId, {
		type: 'friend_request_received',
		requester: {
			id: requesterData.id,
			name: requesterData.name,
			online: requesterData.online
		}
	}, 'friend_request_received');
}

async function notifyFriendRequestAccepted(requesterId, addresseeData) {
	await notificationService.sendToUser(requesterId, {
		type: 'friend_request_accepted',
		newFriend: {
			id: addresseeData.id,
			name: addresseeData.name,
			online: addresseeData.online
		}
	}, 'friend_request_accepted');
}

async function notifyFriendOfBlock(userId1, userId2) {
	await notificationService.sendToUser(userId1, {
		type: 'friend_blocked',
		friendId: userId2
	}, 'friend_blocked');
	await notificationService.sendToUser(userId2, {
		type: 'friend_blocked',
		friendId: userId1
	}, 'friend_blocked');
}

async function notifyFriendOfUnblock(userId1, userId2) {
	await notificationService.sendToUser(userId1, {
		type: 'friend_unblocked',
		friendId: userId2
	}, 'friend_unblocked');
	await notificationService.sendToUser(userId2, {
		type: 'friend_unblocked',
		friendId: userId1
	}, 'friend_unblocked');
}

async function notifyNewMessage(toUserId, messageData) {
	await notificationService.sendToUser(toUserId, {
		type: 'new_message',
		message: messageData
	}, 'new_message');
}

async function notifyMessageDeleted(messageId, chatRoomId) {
	const chatRoom = chatRoomDB.getChatRoom(chatRoomId);
	await notificationService.sendToUsers([chatRoom.userId1, chatRoom.userId2], {
		type: 'message_deleted',
		messageId: messageId,
		chatRoomId: chatRoomId
	}, 'message_deleted');
}

async function notifyGameInvite(invitedUserId, invitationData) {
	await notificationService.sendToUser(invitedUserId, {
		type: 'game_invite_received',
		invitation: invitationData
	}, 'game_invite_received');
}

async function socketPlugin(fastify, options) {
	await fastify.register(websocket);
	fastify.get('/api/wss', { websocket: true }, (connection, req) => {
		let currentUserId = null;
		
		connection.on('message', async (message) => {
			try {
				const data = JSON.parse(message.toString());
				if (data.type === 'user_online') {
					currentUserId = data.userId;
					onlineUsers.set(currentUserId, connection);
					await users.updateUserOnlineStatus(currentUserId, true);
					await notifyFriendsOfStatusChange(currentUserId, true);
				} 
				else if (data.type === 'ping')
					connection.send(JSON.stringify({ type: 'pong' }));
			}
			catch (err) {
				console.error('Websocket message error:', err);
			}
		});
		
		connection.on('close', async () => {
			try {
				if (currentUserId) {
					onlineUsers.delete(currentUserId);
					await users.updateUserOnlineStatus(currentUserId, false);
					await notifyFriendsOfStatusChange(currentUserId, false);
				}
			}
			catch (err) {
				console.error('Websocket message error:', err);
			}
		});
	});
}

export default {
    socketPlugin,
    onlineUsers,
    notifyFriendRemoved,
    notifyFriendsOfStatusChange,
    notifyFriendRequest,
    notifyFriendRequestAccepted,
    notifyFriendOfBlock,
    notifyFriendOfUnblock,
    notifyNewMessage,
    notifyMessageDeleted,
    notifyGameInvite
};
export {
	onlineUsers,
	notifyFriendRemoved,
	notifyFriendsOfStatusChange,
	notifyFriendRequest,
	notifyFriendRequestAccepted,
	notifyFriendOfBlock,
	notifyFriendOfUnblock,
	notifyNewMessage,
	notifyMessageDeleted,
	notifyGameInvite
};