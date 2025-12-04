import BaseRoute from "../other/BaseRoutes.js";
import lobbyManager from "../other/lobbyManager.js";
import friendsDB from "../database/friends.js";
import userDB from "../database/users.js";

function lobbyRoutes(fastify, options) {
//used to create a lobby
  fastify.post('/api/lobby',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['maxPlayers', 'settings'],
		properties: {
			maxPlayers: { type: 'integer', minimum: 2 },
			settings: { type: 'object' }
		}
	})),
	async (request, reply) => {
		try {
			const id = request.user.id;
			const { maxPlayers = 2, settings = {} } = request.body || {};
			const lobby = lobbyManager.createLobby(id, { maxPlayers, settings });
			if (!lobby.success)
				return BaseRoute.handleError(reply, null, lobby.errorMsg, lobby.status);
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
			const response = lobbyManager.leaveLobby(lobbyId, id);
			if (!response.success)
				return BaseRoute.handleError(reply, null, response.errorMsg, response.status);
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
			if (lobby.leadeId !== id)
				return BaseRoute.handleError(reply, null, "Only leader can change settings", 403);
			const settings = request.body && request.body.settings ? request.body.settings : {};
			const updated = lobbyManager.updateSettings(lobbyId, settings);
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
			const otherUser = userDB.getUserById(toUserId);
			if (!otherUser.success)
				return BaseRoute.handleError(reply, null, otherUser.errorMsg, otherUser.status);
			const blocked = friendsDB.checkIfFriendshipBlocked(id, toUserId);
			if (blocked.success)
				return BaseRoute.handleError(reply, null, "Cannot send Invite. User relationship is blocked.", 403);
			else if (!blocked.success && blocked.errorMsg)
				return BaseRoute.handleError(reply, null, blocked.errorMsg, blocked.status);
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

//used to start the tournament or the 1v1
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
				return BaseRoute.handleError(reply, null, "Only leader can start the tournament", 403);
			if (lobby.playersIds.length !== lobby.maxPlayers)
				return BaseRoute.handleError(reply, null, "Lobby not full", 400);
			const users = lobby.playersIds.map(p => p.userId);
			for (let i = users.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[users[i], users[j]] = [users[j], users[i]];
			}
			let games = [];
			let gameId = 1;
			for (let counter = 0; counter < users.length; counter += 2) {
				let game = {
					gameId: gameId++,
					player1Id: users[counter],
					player2Id: users[counter + 1]
				}
				games.push(game);
			}
			lobby.status = 'in-game';
			lobbyManager.broadcast(lobbyId, 'lobby:start', { games });
			const result = lobbyManager.storeGamesinLobby(lobbyId, games);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, {
				message: "Game started",
				lobby: lobby,
				games: games
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to start the tournament", 500);
		}
  });
}

export default lobbyRoutes;
