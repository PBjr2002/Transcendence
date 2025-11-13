import BaseRoute from "../other/BaseRoutes.js";
import lobbyManager from "../other/lobbyManager.js";

function lobbyRoutes(fastify, options) {
//used to create a lobby
  fastify.post('/api/lobby',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
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
			BaseRoute.handleSuccess(reply, lobby, 201);
		}
		catch (error) {
			console.log(error);
			BaseRoute.handleError(reply, 'Failed to create a lobby', 500);
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
			BaseRoute.handleSuccess(reply, lobby);
		}
		catch (error) {
			console.log(error);
			BaseRoute.handleError(reply, "Failed to join Lobby", 500);
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
			lobbyManager.leaveLobby(lobbyId, id);
			BaseRoute.handleSuccess(reply, { message: "Success" });
		}
		catch (error) {
			console.log(error);
			BaseRoute.handleError(reply, "Failed to leave lobby", 500);
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
				return BaseRoute.handleError(reply, "Lobby not found", 404);
			BaseRoute.handleSuccess(reply, lobby);
		}
		catch (error) {
			console.log(error);
			BaseRoute.handleError(reply, "Failed to get lobby", 500);
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
				return BaseRoute.handleError(reply, "Lobby not found", 404);
			if (lobby.leadeId !== id)
				return BaseRoute.handleError(reply, "Only leader can change settings", 403);
			const settings = request.body && request.body.settings ? request.body.settings : {};
			const updated = lobbyManager.updateSettings(lobbyId, settings);
			BaseRoute.handleSuccess(reply, updated);
		}
		catch (error) {
			console.log(error);
			BaseRoute.handleError(reply, "Failed to update settings", 500);
		}
  });
}

export default lobbyRoutes;
