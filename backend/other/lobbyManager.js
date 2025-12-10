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
	createLobby(hostUserId, otherPlayerId, settings = {}) {
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
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/api/lobby/${lobbyId}/game/wss`;
		const lobby = {
			lobbyId,
			leaderId: hostUserId,
			playerId1: hostUserId,
			playerId2: otherPlayerId,
			createdAt: Date.now(),
			settings: settings || {},
			gameSocket: new WebSocket(wsUrl)
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
		const connection1 = onlineUsers.get(lobby.player1Id);
		const connection2 = onlineUsers.get(lobby.player2Id);
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
		if (lobby.status !== 'open')
			return { success: false, status: 403, errorMsg: 'Lobby Closed' };
		if (this.userToLobby.has(userId)) {
			const existingLobby = this.userToLobby.get(userId);
			if (existingLobby === lobbyId)
				return { success: false, status: 409, errorMsg: 'User already inside the lobby' };
			return { success: false, status: 409, errorMsg: 'User already in a different lobby' };
		}
		this.userToLobby.set(userId, lobbyId);
		lobby.player2Id = userId;
		this.broadcast(lobbyId, 'lobby:playerJoined', { player });
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		return {
			success: true,
			lobby
		};
	}
	leaveLobby(lobbyId, userId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:400, errorMsg: 'Invalid Lobby ID' };
		this.userToLobby.delete(userId);
		if (lobby.leaderId === userId) {
			this.lobbies.delete(lobbyId);
			return { success: true };
		}
		else {
			lobby.player2Id = null;
			this.broadcast(lobbyId, 'lobby:playerLeft', { playerId: userId });
			this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		}
		return { success: true };
	}
	updateSettings(lobbyId, settingsUpdate) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:404, errorMsg: 'Lobby not found' };
		lobby.settings = { ...(lobby.settings || {}), ...(settingsUpdate || {}) };
		this.broadcast(lobbyId, 'lobby:settingsChanged', { settings: lobby.settings });
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		return {
			success: true,
			lobby
		};
	}
}

const lobbyManager = new LobbyManager();
export default lobbyManager;
export { LobbyManager };
