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
	createLobby(hostUserId, { maxPlayers = 2, settings = {} } = {}) {
		if (!userDB.getUserById(hostUserId))
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
			playersIds: [{
				userId: hostUserId,
				connected: true,
				joinedAt: Date.now()
			}],
			maxPlayers,
			status: 'open',
			createdAt: Date.now(),
			settings: settings || {}
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
		for (const playersIds of lobby.playersIds) {
			try {
				const connection = onlineUsers.get(playersIds.userId);
				if (connection)
					connection.send(message);
			}
			catch (error) {
				console.error('Lobby broadcast error', error);
			}
		}
	}
	getLobby(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return null;
		return lobby;
	}
	joinLobby(lobbyId, userId) {
		if (!userDB.getUserById(userId))
			return { success: false, status:400, errorMsg: 'Invalid User' };
		const lobby = this.getLobby(lobbyId);
		if (!lobby)
			return { success: false, status: 404, errorMsg: 'Invalid LobbyId' };
		if (lobby.status !== 'open')
			return { success: false, status: 403, errorMsg: 'Lobby Closed' };
		if (lobby.playersIds.length >= lobby.maxPlayers)
			return { success: false, status: 403, errorMsg: 'Lobby Already Full' };
		if (this.userToLobby.has(userId)) {
			const existingLobby = this.userToLobby.get(userId);
			if (existingLobby === lobbyId)
				return { success: false, status: 409, errorMsg: 'User already inside the lobby' };
			return { success: false, status: 409, errorMsg: 'User already in a different lobby' };
		}
		const player = {
			userId,
			connected: true,
			joinedAt: Date.now()
		};
		lobby.playersIds.push(player);
		this.userToLobby.set(userId, lobbyId);
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
		const before = lobby.playersIds.length;
		lobby.playersIds = lobby.playersIds.filter(p => p.userId !== userId);
		this.userToLobby.delete(userId);
		if (lobby.playersIds.length === 0) {
			this.lobbies.delete(lobbyId);
			return { success: true };
		}
		if (lobby.leaderId === userId) {
			let next = lobby.playersIds[0];
			for (const p of lobby.playersIds) {
				if (p.joinedAt < next.joinedAt)
					next = p;
			}
			lobby.leaderId = next.userId;
			this.broadcast(lobbyId, 'lobby:leaderChanged', { newLeaderId: next.userId });
		}
		if (lobby.playersIds.length !== before) {
			this.broadcast(lobbyId, 'lobby:playerLeft', { playerId: userId });
			this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		}
		return { success: true };
	}
	setConnected(lobbyId, userId, connected) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:400, errorMsg: 'Invalid Lobby ID' };
		const player = lobby.playersIds.find(p => p.userId === userId);
		if (!player)
			return ;
		player.connected = !!connected;
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
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
	transferLeadership(lobbyId, newLeaderId, oldLeaderId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return { success: false, status:404, errorMsg: 'Lobby not found' };
		if (lobby.leaderId !== oldLeaderId)
			return { success: false, status:403, errorMsg: 'Only leader can change leadership' };
		const found = lobby.playersIds.find(p => p.userId === newLeaderId);
		if (!found)
			return { success: false, status:404, errorMsg: 'New Leader not in the Lobby' };
		lobby.leaderId = newLeaderId;
		this.broadcast(lobbyId, 'lobby:leaderChanged', { newLeaderId });
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
