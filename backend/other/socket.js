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

async function socketPlugin(fastify, options) {
	await fastify.register(websocket);
	fastify.get('/api/wss', { websocket: true }, (connection, req) => {
		let currentUserId = null;
		
		connection.on('message', async (message) => {
			try {
				const data = JSON.parse(message.toString());
				switch (data.type) {
					case 'user_online': {
						currentUserId = data.userId;
						onlineUsers.set(currentUserId, connection);
						const result = await users.updateUserOnlineStatus(currentUserId, 1);
						if (!result.success) {
							console.log(result.errorMsg);
							return ;
						}
						await notifyFriendsOfStatusChange(currentUserId, true);
						return;
					}
					case 'game:init': {
						const { lobbyId, leaderId, otherUserId } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						await lobbyNotification(lobbyId, 'game:init', {
							lobbyId: lobbyId,
							leaderId: leaderId,
							otherUserId: otherUserId
						});
						return;
					}
					case 'game:start': {
						const { lobbyId, leaderId, dataForGame } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						lobbyManager.startGame(lobbyId);
						await lobbyNotification(lobbyId, 'game:start', {
							lobbyId: lobbyId,
							leaderId: leaderId,
							dataForGame,
							lobby
						});
						return;
					}
					case 'game:input': {
						const { lobbyId, userId, input, player } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						await lobbyNotification(lobbyId, 'game:input', {
							lobbyId: lobbyId,
							userId: userId,
							input: input,
							player: player
						});
						return;
					}
					case 'game:playerState': {
						const { lobbyId, userId, state } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						const result = await lobbyManager.setPlayerState(lobbyId, userId, state);
						if (!result.success)
							return connection.send(JSON.stringify({ type: 'error', message: result.errorMsg }));
						await lobbyNotification(lobbyId, 'game:playerState', {
							lobby,
							userId: userId,
							state: state
						});
						return;
					}
					case 'game:settings': {
						const { lobbyId, userId, settings } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						await lobbyNotification(lobbyId, 'game:settings', {
							lobbyId: lobbyId,
							userId: userId,
							settings: settings
						});
						return;
					}
					case 'game:powerUps': {
						const { lobbyId, state } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						lobbyManager.setPlayerState(lobbyId, lobby.playerId1, false);
						lobbyManager.setPlayerState(lobbyId, lobby.playerId2, false);
						await lobbyNotification(lobbyId, 'game:playerState', {
							lobby,
							userId: lobby.playerId1,
							state: false
						});
						await lobbyNotification(lobbyId, 'game:playerState', {
							lobby,
							userId: lobby.playerId2,
							state: false
						});
						await lobbyNotification(lobbyId, 'game:powerUps', {
							lobbyId: lobbyId,
							state: state
						});
						return;
					}
					case 'game:score': {
						const { lobbyId, score } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						await lobbyNotification(lobbyId, 'game:score', {
							lobbyId: lobbyId,
							score: score
						});
						return;
					}
					case 'game:suspended': {
						const { lobbyId, userId } = data;
						const	lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						if (!lobby.player1Ready && !lobby.player2Ready) {
							lobbyManager.endSuspendedGame(lobby.lobbyId);
							return connection.send(JSON.stringify({ type: 'game:stopCountdown' }));
						}
						else if (lobby.playerId1 === userId)
							await notificationService.sendToUser(lobby.playerId2, { type: 'game:suspended', lobby: lobby }, 'game:suspended');
						else
							await notificationService.sendToUser(lobby.playerId1, { type: 'game:suspended', lobby: lobby }, 'game:suspended');
						return;
					}
					case 'game:playerLeft': {
						const { lobbyId, userId } = data;
						const	lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						lobbyManager.leaveGame(lobby.lobbyId, userId);
						return {
							success: true,
							lobby
						};
					}
					case 'game:playerRejoined': {
						const { lobbyId, userId } = data;
						const	lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						lobbyManager.rejoinGame(lobbyId, userId);
						return {
							success: true,
							lobby
						};
					}
					case 'game:rejoin': {
						const { lobby } = data;
						const result = lobbyManager.getLobby(lobby.lobbyId);
						if (!result)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						return connection.send(JSON.stringify({ type: 'game:rejoin', lobby: lobby }));
					}
					case 'game:resumed': {
						const { lobbyId } = data;
						const	lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						await lobbyManager.gameResumed(lobbyId);
						return;
					}
					case 'game:end': {
						const { lobbyId, score, userId } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						if (userId !== lobby.leaderId)
							return;
						await lobbyNotification(lobbyId, 'game:end', {
							lobbyId: lobbyId,
							score: score
						});
						return;
					}
					case 'game:ballUpdate': {
						const { lobby, userId, ballData } = data;
						const lobbyCheck = lobbyManager.getLobby(lobby.lobbyId);
						if (!lobbyCheck)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						// Validar que o userId pertence ao lobby
						if (![lobbyCheck.playerId1, lobbyCheck.playerId2].includes(userId))
							return connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
						// Rebroadcast para o outro jogador
						lobbyManager.updateBall(lobbyCheck.lobbyId, ballData);
						await lobbyNotification(lobbyCheck.lobbyId, 'game:ballUpdate', data);
						return;
					}
					case 'game:paddleCollision': {
						const { lobbyId, userId } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						// Validar que o userId pertence ao lobby
						if (![lobby.playerId1, lobby.playerId2].includes(userId))
							return connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
						// Rebroadcast para o outro jogador
						await lobbyNotification(lobbyId, 'game:paddleCollision', data.data);
						return;
					}
					case 'game:wallCollision': {
						const { lobbyId, userId } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						// Validar que o userId pertence ao lobby
						if (![lobby.playerId1, lobby.playerId2].includes(userId))
							return connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
						// Rebroadcast para o outro jogador
						await lobbyNotification(lobbyId, 'game:wallCollision', data.data);
						return;
					}
					case 'game:goal': {
						const { lobbyId, userId } = data;
						const lobby = lobbyManager.getLobby(lobbyId);
						if (!lobby)
							return connection.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
						// Validar que o userId pertence ao lobby
						if (![lobby.playerId1, lobby.playerId2].includes(userId))
							return connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
						// Rebroadcast para o outro jogador
						await lobbyNotification(lobbyId, 'game:goal', data.data);
						return;
					}
				}

				//N SEI SE ESTES AINDA SAO NECESSARIOS
				if (data.type === 'invite:accepted') {
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
					const data = lobbyManager.checkIfPlayerIsInGame(currentUserId);
					if (data.success && data.inGame) {
						const backup = {...data.lobby};
						lobbyManager.leaveGame(data.lobby.lobbyId, currentUserId);
						if (!data.lobby.player1Ready && !data.lobby.player2Ready)
							lobbyManager.endSuspendedGame(data.lobby.lobbyId);
						else if (backup.player1Ready && backup.player2Ready)
							lobbyManager.gameSuspended(data.lobby.lobbyId);
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