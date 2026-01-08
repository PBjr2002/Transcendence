import websocket from '@fastify/websocket';
import users from '../database/users.js';
import friends from '../database/friends.js';
import chatRoomDB from '../database/chatRoom.js';
import lobbyManager from './lobbyManager.js';
import BaseRoute from './BaseRoutes.js';

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
	if (!userFriends.success)
		return ;
	const friendsIds = userFriends.friendsList.map(friend => friend.id);
	await notificationService.sendToUsers(friendsIds, {
		type: 'friend_status_change',
		friendId: userId,
		online: isOnline
	}, 'friend_status_change');
}

async function notifyFriendRequest(friendId, userData) {
	await notificationService.sendToUser(userData.id, {
		type: 'friend_request_sent',
		newFriend: {
			id: friendId
		}
	}, 'friend_request_sent');
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

async function sendNewMessage(toUserId, message) {
	await notificationService.sendToUser(toUserId, {
		type: 'message',
		message: message
	}, 'message');
}

async function notifyMessageDeleted(messageId, chatRoomId) {
	const chatRoom = chatRoomDB.getChatRoom(chatRoomId);
	if (!chatRoom.success)
		return ;
	await notificationService.sendToUsers([chatRoom.chatRoom.userId1, chatRoom.chatRoom.userId2], {
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

async function sendDataToUser(userId, messageType, data) {
	await notificationService.sendToUser(userId, {
		type: messageType,
		data: data
	}, messageType);
}

async function lobbyNotification(lobbyId, messageType, data) {
	const lobby = lobbyManager.getLobby(lobbyId);
	if (!lobby)
		return ;
	await notificationService.sendToUsers([lobby.playerId1, lobby.playerId2], {
		type: messageType,
		data: data
	}, messageType);
}

/*
	Logica para jogo:
		- Lider convida o amigo para partida;
		- O amigo recebe um popup com a notificaçao;
		- Lider espera que o amigo aceite o convite (botao de invite pode ficar cinzento com o desenho dos 3 pontos);
		- Se o amigo recusar o botao de invite volta a ficar ativo e o processo repete-se;
		- Se o amigo aceitar vao os dois para a pagina do "lobby";
		- O lider tem que esperar que ambos estejam prontos para jogar(botao para confirmar que estao prontos);
		- Se o lider ativar/desativar os powerUps e o amigo ja estiver pronto, ele automaticamente deixa de estar pronto e tem que voltar a carregar no botao;
*/

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
					const result = await users.updateUserOnlineStatus(currentUserId, 1);
					if (!result.success) {
						console.log(result.errorMsg);
						return ;
					}
					await notifyFriendsOfStatusChange(currentUserId, true);
				}
				else if (data.type === 'invite:accepted') {
					const { lobbyId, leaderId, invitedUserId } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await notificationService.sendToUser(leaderId, {
						type: 'invite:accepted',
						leaderId: leaderId,
						otherUserId: invitedUserId
					}, 'invite:accepted');
				}
				else if (data.type === 'invite:refused') {
					const { lobbyId, leaderId, invitedUserId } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await notificationService.sendToUser(leaderId, {
						type: 'invite:refused',
						leaderId: leaderId,
						otherUserId: invitedUserId
					}, 'invite:refused');
				}
				else if (data.type === 'game:init') {
					const { lobbyId, leaderId, otherUserId } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:init', {
						lobbyId: lobbyId,
						leaderId: leaderId,
						otherUserId: otherUserId
					});
				}
				else if (data.type === 'game:start') {
					const { lobbyId, leaderId } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:start', {
						lobbyId: lobbyId,
						leaderId: leaderId
					});
				}
				else if (data.type === 'game:input') {
					const { lobbyId, userId, input } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:input', {
						lobbyId: lobbyId,
						userId: userId,
						input: input
					});
				}
				else if (data.type === 'game:playerState') {
					const { lobbyId, userId, state } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					const result = await lobbyManager.setPlayerState(lobbyId, userId, state);
					if (!result.success)
						return connection.send(JSON.stringify({ type: 'error', message: result.errorMsg }));
					await lobbyNotification(lobbyId, 'game:playerState', {
						lobbyId: lobbyId,
						userId: userId,
						state: state
					});
				}
				else if (data.type === 'game:settings') {
					const { lobbyId, userId, settings } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:settings', {
						lobbyId: lobbyId,
						userId: userId,
						settings: settings
					});
				}
				else if (data.type === 'game:powerUps') {
					const { lobbyId, state } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:powerUps', {
						lobbyId: lobbyId,
						state: state
					});
				}
				else if (data.type === 'game:score') {
					const { lobbyId, score } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:score', {
						lobbyId: lobbyId,
						score: score
					});
				}
				else if (data.type === 'game:end') {
					const { lobbyId, score } = data;
					const lobby = lobbyManager.getLobby(lobbyId);
					if (!lobby)
						return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
					await lobbyNotification(lobbyId, 'game:end', {
						lobbyId: lobbyId,
						score: score
					});
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
					const result = await users.updateUserOnlineStatus(currentUserId, 0);
					if (!result.success) {
						console.log(result.errorMsg);
						return ;
					}
					await notifyFriendsOfStatusChange(currentUserId, false);
					const lobbyId = lobbyManager.userToLobby.get(currentUserId);
					if (lobbyId)
						lobbyManager.leaveLobby(lobbyId, currentUserId);
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
    sendNewMessage,
    notifyMessageDeleted,
    notifyGameInvite,
	lobbyNotification,
	sendDataToUser
};
export {
	onlineUsers,
	notifyFriendRemoved,
	notifyFriendsOfStatusChange,
	notifyFriendRequest,
	notifyFriendRequestAccepted,
	notifyFriendOfBlock,
	notifyFriendOfUnblock,
	sendNewMessage,
	notifyMessageDeleted,
	notifyGameInvite,
	lobbyNotification,
	sendDataToUser
};