import BaseRoute from "../other/BaseRoutes.js";
import lobbyManager from "../other/lobbyManager.js";
import friendsDB from "../database/friends.js";
import userDB from "../database/users.js";
import { lobbyNotification, sendDataToUser } from "../other/socket.js";

function lobbyRoutes(fastify, options) {
//used to create a lobby
  fastify.post('/api/lobby',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['otherUserId'],
		properties: {
			otherUserId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		try {
			const id = request.user.id;
			const { otherUserId } = request.body || {};
			const lobby = lobbyManager.createLobby(id, otherUserId);
			if (!lobby.success)
				return BaseRoute.handleError(reply, null, lobby.errorMsg, lobby.status);
			/* const lobbyId = lobby.lobby.lobbyId
			await sendDataToUser(id, 'game:init', {
				lobbyId: lobbyId,
				leaderId: id,
				otherUserId: otherUserId
			}); */
			BaseRoute.handleSuccess(reply, lobby.lobby, 201);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, 'Failed to create a lobby', 500);
		}
  });

//used to join a lobby
  fastify.put('/api/lobby/:id/join',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const id = request.user.id;
			const lobbyId = request.params.id;
			const lobby = lobbyManager.joinLobby(lobbyId, id);
			if (!lobby.success)
				return BaseRoute.handleError(reply, null, lobby.errorMsg, lobby.status);
			BaseRoute.handleSuccess(reply, lobby.lobby);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to join Lobby", 500);
		}
  });

//used to leave a lobby
  fastify.put('/api/lobby/:id/leave',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const id = request.user.id;
			const lobbyId = request.params.id;
			const response = lobbyManager.leaveGame(lobbyId, id);
			if (!response.success)
				return BaseRoute.handleError(reply, null, response.errorMsg, response.status);
			lobbyManager.endGame(lobbyId);
			BaseRoute.handleSuccess(reply, "Left lobby successfully");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to leave lobby", 500);
		}
  });

//used to get the lobby
  fastify.get('/api/lobby/:id',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const lobbyId = request.params.id;
			const lobby = lobbyManager.getLobby(lobbyId);
			if (!lobby)
				return BaseRoute.handleError(reply, null, "Lobby not found", 404);
			BaseRoute.handleSuccess(reply, lobby);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to get lobby", 500);
		}
  });

//used to change the game/lobby settings
  fastify.post('/api/lobby/:id/settings',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	}, {
		type: 'object',
		properties: {
			settings: { type: 'object' }
		}
	})),
	async (request, reply) => {
		try {
			const id = request.user.id;
			const lobbyId = request.params.id;
			const lobby = lobbyManager.getLobby(lobbyId);
			if (!lobby)
				return BaseRoute.handleError(reply, null, "Lobby not found", 404);
			const settings = request.body && request.body.settings ? request.body.settings : {};
			const updated = lobbyManager.updateSettings(lobbyId, settings, id);
			if (!updated.success)
				return BaseRoute.handleError(reply, null, updated.errorMsg, updated.status);
			BaseRoute.handleSuccess(reply, updated.lobby);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to update settings", 500);
		}
  });

//used to invite someone to a specific lobby
  fastify.post('/api/lobby/:id/invite',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	}, {
		type: 'object',
		required: ['toUserId'],
		properties: {
			toUserId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		try {
			const lobbyId = request.params.id;
			const id = request.user.id;
			const { toUserId } = request.body;
			const lobby = lobbyManager.getLobby(lobbyId);
			if (!lobby)
				return BaseRoute.handleError(reply, null, "Lobby not found", 404);
			if (toUserId === id)
				return BaseRoute.handleError(reply, null, "Cannot Invite Yourself", 403);
			if (toUserId !== -42) {
				const otherUser = userDB.getUserById(toUserId);
				if (!otherUser.success)
					return BaseRoute.handleError(reply, null, otherUser.errorMsg, otherUser.status);
				const blocked = friendsDB.checkIfFriendshipBlocked(id, toUserId);
				if (blocked.success)
					return BaseRoute.handleError(reply, null, "Cannot send Invite. User relationship is blocked.", 403);
				else if (!blocked.success && blocked.errorMsg)
					return BaseRoute.handleError(reply, null, blocked.errorMsg, blocked.status);
			}
			await fastify.notifyGameInvite(toUserId, {
				fromUserId: id,
				fromUserName: request.user.name,
				lobbyId,
				lobbyMeta: lobby.settings || {}
			});
			BaseRoute.handleSuccess(reply, "Lobby invitation sent successfully.");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to send invite", 500);
		}
  });

//used to start the 1v1
  fastify.put('/api/lobby/:id/start',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const lobbyId = request.params.id;
			const userId = request.user.id;
			const lobby = lobbyManager.getLobby(lobbyId);
			if (!lobby)
				return BaseRoute.handleError(reply, null, "Lobby not found", 404);
			if (userId !== lobby.leaderId)
				return BaseRoute.handleError(reply, null, "Only leader can start the game", 403);
			const data = lobbyManager.startGame(lobbyId);
			if (!data.success)
				return BaseRoute.handleError(reply, null, data.errorMsg, data.status);
			BaseRoute.handleSuccess(reply, {
				message: "Game started",
				lobby: data.lobby
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to start the game", 500);
		}
  });

//used to find if a player is in the middle of a match
  fastify.get('/api/lobby/player',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const data = lobbyManager.checkIfPlayerIsInGame(userId);
			if (!data.success)
				return BaseRoute.handleError(reply, null, data.errorMsg, data.status);
			if (data.inGame)
				return BaseRoute.handleSuccess(reply, { message: "In Game", lobby: data.lobby });
			BaseRoute.handleSuccess(reply, {
				message: "Not In Game"
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to find if the player was in a game", 500);
		}
  });

//used to store the player game info
  fastify.post(`/api/lobby/:id/playerGameInfo`,
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	}, {
		type: 'object',
		required: ['playerGameInfo'],
		properties: {
			playerGameInfo: { type: 'object' }
		}
	})),
	async (request, reply) => {
		try {
			const lobbyId = request.params.id;
			const userId = request.user.id;
			const { playerGameInfo } = request.body;
			const lobby = lobbyManager.getLobby(lobbyId);
			if (!lobby)
				return BaseRoute.handleError(reply, null, "Lobby not found", 404);
			const result = await lobbyManager.storePlayerGameInfo(lobbyId, userId, playerGameInfo);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, "Player game info stored successfully");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to store the player game info", 500);
		}
  });

//used to get the player game info
  fastify.get('/api/lobby/:id/playerGameInfo',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const lobbyId = request.params.id;
			const userId = request.user.id;
			const lobby = lobbyManager.getLobby(lobbyId);
			if (!lobby)
				return BaseRoute.handleError(reply, null, "Lobby not found", 404);
			if (lobby.playerId1 === userId)
				return BaseRoute.handleSuccess(reply, { message: "Game info successfully fetched", playerGameInfo: lobby.player1GameInfo });
			else if (lobby.playerId2 === userId)
				return BaseRoute.handleSuccess(reply, { message: "Game info successfully fetched", playerGameInfo: lobby.player2GameInfo });
			BaseRoute.handleError(reply, null, "Player not found in Lobby", 404);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to find if the player was in a game", 500);
		}
  });

//used to end the game
  fastify.put('/api/lobby/:id/end',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const lobbyId = request.params.id;
			const response = lobbyManager.endGame(lobbyId);
			if (!response.success)
				return BaseRoute.handleError(reply, null, response.errorMsg, response.status);
			BaseRoute.handleSuccess(reply, "Game ended successfully");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to end game", 500);
		}
  });
}

export default lobbyRoutes;
