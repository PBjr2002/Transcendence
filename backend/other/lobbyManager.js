import { onlineUsers } from "./socket.js";
import crypto from 'crypto';
import userDB from '../database/users.js';

class LobbyManager {
	constructor() {
		this.lobbies = new Map();
		this.userToLobby = new Map();
	}
	createLobby(hostUserId, { maxPlayers = 2, settings = {} } = {}) {
		if (!userDB.getUserById(hostUserId))
			throw new Error('Invalid Host');
		const lobbyId = crypto.randomUUID();
		const lobby = {
			lobbyId,
			leaderId: hostUserId,
			playersIds: [{
				userId: hostUserId,
				isReady: false,
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
		return lobby;
	}
	broadcast(lobbyId, type, payload = {}) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return ;
		const message = JSON.stringify({ type, ...payload });
		for (const playersIds of lobby.playersIds) {
			try {
				const connection = onlineUsers.get(playersIds.userId);
				if (connection && connection.readyState === 1)
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
			throw new Error('Invalid User');
		const lobby = this.getLobby(lobbyId);
		if (!lobby)
			throw new Error('Invalid LobbyId');
		if (lobby.status !== 'open')
			throw new Error('Lobby Closed');
		if (lobby.playersIds.length >= lobby.maxPlayers)
			throw new Error('Lobby Already Full');
		if (this.userToLobby.has(userId)) {
			const existingLobby = this.userToLobby.get(userId);
			if (existingLobby === lobbyId)
				throw new Error('User already inside the lobby');
			throw new Error('User already in a different lobby');
		}
		const player = {
			userId,
			isReady: false,
			connected: true,
			joinedAt: Date.now()
		};
		lobby.playersIds.push(player);
		this.userToLobby.set(userId, lobbyId);
		this.broadcast(lobbyId, 'lobby:playerJoined', { player });
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		return lobby;
	}
	leaveLobby(lobbyId, userId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return ;
		const before = lobby.playersIds.length;
		lobby.playersIds = lobby.playersIds.filter(p => p.userId !== userId);
		this.userToLobby.delete(userId);
		if (lobby.playersIds.length === 0) {
			this.lobbies.delete(lobbyId);
			return ;
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
	}
	setReady(lobbyId, userId, isReady) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			throw new Error('Lobby not found');
		const player = lobby.playersIds.find(p => p.userId === userId);
		if (!player)
			throw new Error('Player not found in the Lobby');
		player.isReady = !!isReady;
		this.broadcast(lobbyId, 'lobby:playerReady', { playerId: userId, isReady: player.isReady });
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		return player.isReady;
	}
	setConnected(lobbyId, userId, connected) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			return ;
		const player = lobby.playersIds.find(p => p.userId === userId);
		if (!player)
			return ;
		player.connected = !!connected;
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
	}
	updateSettings(lobbyId, settingsUpdate) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			throw new Error('Lobby not found');
		lobby.settings = { ...(lobby.settings || {}), ...(settingsUpdate || {}) };
		this.broadcast(lobbyId, 'lobby:settingsChanged', { settings: lobby.settings });
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		return lobby;
	}
	transferLeadership(lobbyId, newLeaderId, oldLeaderId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby)
			throw new Error('Lobby not found');
		if (lobby.leaderId !== oldLeaderId)
			throw new Error('Only leader can change leadership');
		const found = lobby.playersIds.find(p => p.userId === newLeaderId);
		if (!found)
			throw new Error('New Leader not in the Lobby');
		lobby.leaderId = newLeaderId;
		this.broadcast(lobbyId, 'lobby:leaderChanged', { newLeaderId });
		this.broadcast(lobbyId, 'lobby:update', { lobby: lobby });
		return lobby;
	}
}

const lobbyManager = new LobbyManager();
export default lobbyManager;
export { LobbyManager };
