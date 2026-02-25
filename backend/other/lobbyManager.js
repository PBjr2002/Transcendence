import { onlineUsers } from "./socket.js";
import crypto from 'crypto';
import userDB from '../database/users.js';

class LobbyManager {
	constructor() {
		this.lobbies = new Map();
		this.userToLobby = new Map();
	}
	generateLobbyId() {
		const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		const bytes = crypto.randomBytes(6);
		let id = '';
		for (let i = 0; i < 6; i++) {
			id += alpha[bytes[i] % alpha.length];
		}
		return id;
	}
	createLobby(hostUserId, otherPlayerId) {
		const user = userDB.getUserById(hostUserId);
		if (!user.success)
			return { success: false, status:400, errorMsg: 'Invalid Host' };
		let lobbyId = this.generateLobbyId();
		let retry = 0;
		while (this.lobbies.has(lobbyId) && retry < 10) {
			retry++;
			lobbyId = this.generateLobbyId();
		}
		if (retry >= 10)
			return { success: false, status:400, errorMsg: 'Failed to generate a Unique Lobby ID, Max Attempts Reached' };
		const lobby = {
			lobbyId,
			leaderId: hostUserId,
			playerId1: hostUserId,
			playerId2: otherPlayerId,
			player1Ready: false,
			player2Ready: false,
			player1HasJoined: false,
			player2HasJoined: false,
			createdAt: Date.now(),
			player1Settings: {},
			player2Settings: {},
			isLobby: false,
			isActive: false,
			player1GameInfo: {},
			player2GameInfo: {},
			ball: {},
			score: {
				player1: 0,
				player2: 0
			}
		};
		this.lobbies.set(lobbyId, lobby);
		this.userToLobby.set(hostUserId, lobbyId);
		return {
			success: true,
			lobby
		};
	}
	broadcast(lobbyId, type, payload = {}) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return ;
		const message = JSON.stringify({ type, ...payload });
		const connection1 = onlineUsers.get(lobby.playerId1);
		const connection2 = onlineUsers.get(lobby.playerId2);
		if (connection1)
			connection1.send(message);
		if (connection2)
			connection2.send(message);
	}
	getLobby(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return null;
		return lobby;
	}
	joinLobby(lobbyId, userId) {
		const user = userDB.getUserById(userId);
		if (!user.success)
			return { success: false, status:400, errorMsg: 'Invalid User' };
		const lobby = this.getLobby(lobbyId);
		if (!lobby)
			return { success: false, status: 404, errorMsg: 'Invalid LobbyId' };
		this.userToLobby.set(userId, lobbyId);
		lobby.player2Id = userId;
		lobby.player2HasJoined = true;
		lobby.player1HasJoined = true;
		lobby.isLobby = true;
		this.broadcast(lobbyId, 'lobby:enterLobby', { lobby: lobby });
		return {
			success: true,
			lobby
		};
	}
	leaveGame(lobbyId, userId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:400, errorMsg: 'Invalid Lobby ID' };
		if (userId === lobby.playerId1)
			lobby.player1Ready = false;
		else
			lobby.player2Ready = false;
		return {
			success: true,
			lobby
		};
	}
	rejoinGame(lobbyId, userId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:400, errorMsg: 'Invalid Lobby ID' };
		if (userId === lobby.playerId1) {
			lobby.player1Ready = true;
			lobby.player1HasJoined = true;
		}
		else { 
			lobby.player2Ready = true;
			lobby.player2HasJoined = true;
		}
		return {
			success: true,
			lobby
		};
	}
	updateSettings(lobbyId, settingsUpdate, userId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:404, errorMsg: 'Lobby not found' };
		if (userId === lobby.playerId1)
			lobby.player1Settings = { ...(lobby.player1Settings || {}), ...(settingsUpdate || {}) };
		else if (userId === lobby.playerId2)
			lobby.player2Settings = { ...(lobby.player2Settings || {}), ...(settingsUpdate || {}) };
		else
			return { success: false, state: 404, errorMsg: 'Player not found in Lobby' };
		return {
			success: true,
			lobby
		};
	}
	cancelGame(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		this.broadcast(lobbyId, 'game:canceled');
		this.lobbies.delete(lobbyId);
		return {
			success: true
		};
	}
	startGame(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		lobby.isActive = true;
		lobby.isLobby = false;
		return {
			success: true,
			lobby
		};
	}
	endSuspendedGame(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		const message = JSON.stringify({ type: 'game:ended' });
		const connection1 = onlineUsers.get(lobby.playerId1);
		const connection2 = onlineUsers.get(lobby.playerId2);
		if (lobby.player1Ready)
			connection1.send(message);
		if (lobby.player2Ready)
			connection2.send(message);
		this.lobbies.delete(lobbyId);
		return {
			success: true
		};
	}
	endGame(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		this.lobbies.delete(lobbyId);
		return {
			success: true
		};
	}
	setPlayerState(lobbyId, userId, state) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		if (userId === lobby.playerId1)
			lobby.player1Ready = state;
		else if (userId === lobby.playerId2)
			lobby.player2Ready = state;
		else
			return { success: false, state: 404, errorMsg: 'Player not found in Lobby' };
		return {
			success: true,
			lobby
		};
	}
	setPlayerLobbyState(lobbyId, userId, state) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		if (userId === lobby.playerId1)
			lobby.player1HasJoined = state;
		else if (userId === lobby.playerId2)
			lobby.player2HasJoined = state;
		else
			return { success: false, state: 404, errorMsg: 'Player not found in Lobby' };
		return {
			success: true,
			lobby
		};
	}
	gameSuspended(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		this.broadcast(lobbyId, 'game:suspended', { lobby: lobby });
		return {
			success: true,
			lobby
		};
	}
	gameResumed(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		this.broadcast(lobbyId, 'game:resumed', { lobby: lobby });
		return {
			success: true,
			lobby
		};
	}
	checkIfPlayerIsInGame(userId) {
		const user = userDB.getUserById(userId);
		if (!user.success)
			return { success: false, status: 400, errorMsg: 'Invalid User' };

		for (const lobby of this.lobbies.values()) {
			if (!lobby || lobby.isActive !== true)
				continue;
			if (lobby.playerId1 === userId || lobby.playerId2 === userId)
				return { success: true, inGame: true, lobby };
		}
		return {
			success: true,
			inGame: false
		};
	}
	checkIfPlayerIsInLobby(userId) {
		const user = userDB.getUserById(userId);
		if (!user.success)
			return { success: false, status: 400, errorMsg: 'Invalid User' };

		for (const lobby of this.lobbies.values()) {
			if (!lobby || lobby.isLobby !== true)
				continue;
			if (lobby.playerId1 === userId|| lobby.playerId2 === userId)
				return { success: true, inLobby: true, lobby };
		}
		return {
			success: true,
			inLobby: false
		};
	}
	storePlayerGameInfo(lobbyId, userId, playerGameInfo) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		if (userId === lobby.playerId1)
			lobby.player1GameInfo = playerGameInfo;
		else if (userId === lobby.playerId2)
			lobby.player2GameInfo = playerGameInfo;
		else
			return { success: false, state: 404, errorMsg: 'Player not found in Lobby' };
		return {
			success: true,
			lobby
		};
	}
	updateBall(lobbyId, ball) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		lobby.ball = ball;
		return {
			success: true,
			lobby
		};
	}
	updateScore(lobbyId, playerId, points) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, state: 404, errorMsg: 'Lobby not found' };
		if (playerId === lobby.playerId1)
			lobby.score.player1 += points;
		else if (playerId === lobby.playerId2)
			lobby.score.player2 += points;
		else
			return { success: false, state: 404, errorMsg: 'Player not found in Lobby' };
		return {
			success: true,
			lobby
		};
	}
}

const lobbyManager = new LobbyManager();
export default lobbyManager;
export { LobbyManager };
