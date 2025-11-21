import websocket from '@fastify/websocket';
import users from '../database/users.js';
import friends from '../database/friends.js';
import chatRoomDB from '../database/chatRoom.js';
import lobbyManager from './lobbyManager.js';

const onlineUsers = new Map();

class NotificationService {
	constructor (onlineUsers) {
		this.onlineUsers = onlineUsers;
	}

	async sendToUser(userId, messageData, errorContext = 'notification') {
		try {
			const userConnection = this.onlineUsers.get(userId);
			if (userConnection) {
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

async function notifyFriendRequest(friendId, userData) {
	await notificationService.sendToUser(friendId, {
		type: 'friend_request_received',
		newFriend: {
			id: userData.id,
			name: userData.name,
			online: userData.online
		}
	}, 'friend_request_received');
}

async function notifyFriendRequestAccepted(friendId, userData) {
	await notificationService.sendToUser(friendId, {
		type: 'friend_request_accepted',
		newFriend: {
			id: userData.id,
			name: userData.name,
			online: userData.online
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
				else if (data.type === 'lobby:watch') {
					const { lobbyId } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					connection.send(JSON.stringify({ type: 'lobby:update', lobby }));
				}
				else if (data.type === 'lobby:setSettings') {
					const { lobbyId, settings } = data;
					try {
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						if (lobby.leaderId !== currentUserId)
							return connection.send(JSON.stringify({ type: 'error', message: 'Only leader can change settings' }));
						lobbyManager.updateSettings(lobbyId, settings);
					}
					catch (err) {
						connection.send(JSON.stringify({ type: 'error', message: err.message }));
					}
				}
				else if (data.type === 'lobby:start') {
					const { lobbyId } = data;
					try {
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						if (lobby.leaderId !== currentUserId)
							return connection.send(JSON.stringify({ type: 'error', message: 'Only leader can start the match' }));
						lobbyManager.broadcast(lobbyId, 'lobby:start', { startedAt: Date.now(), lobbyId });
					}
					catch (err) {
						connection.send(JSON.stringify({ type: 'error', message: err.message }));
					}
				}
				else if (data.type === 'lobby:transferLeadership') {
					const { lobbyId, newLeaderId } = data;
					try {
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						if (lobby.leaderId !== currentUserId)
							return connection.send(JSON.stringify({ type: 'error', message: 'Only leader can transfer leadership' }));
						lobbyManager.transferLeadership(lobbyId, newLeaderId, currentUserId);
					}
					catch (err) {
						connection.send(JSON.stringify({ type: 'error', message: err.message }));
					}
				}
				else if (data.type === 'lobby:leave') {
					const { lobbyId } = data;
					try {
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						lobbyManager.leaveLobby(lobbyId, currentUserId);
					}
					catch (err) {
						connection.send(JSON.stringify({ type: 'error', message: err.message }));
					}
				}
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
					const lobbyId = lobbyManager.userToLobby.get(currentUserId);
					if (lobbyId) {
						lobbyManager.setConnected(lobbyId, currentUserId, false);
						const GRACE_MS = 30_000;
						setTimeout(() => {
							const lobby = lobbyManager.getLobby(lobbyId);
							if (lobby) {
								const player = lobby.playersIds ? lobby.playersIds.find(p => p.userId === currentUserId) : null;
								if (player && !player.connected)
									lobbyManager.leaveLobby(lobbyId, currentUserId);
							}
						}, GRACE_MS);
					}
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