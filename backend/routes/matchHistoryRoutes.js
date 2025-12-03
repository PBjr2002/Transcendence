import DB from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import ValidationUtils from '../other/validation.js';
import matchHistoryDB from '../database/matchHistory.js';

//juntar os x players no lobby do torneio
//o frontend decide quem e que joga com quem
//pede para criar cada tabela de matchHistory antes dos jogos para ter o ID de cada jogo
//dispersa os players para os seus jogos e no fim, dependendo do ID da tabela matchHistory, preenche o resto dos dados de cada

function matchHistoryRoutes(fastify, options) {
//used to add a new closed game to the Match History
  fastify.post('/api/addNewGame' ,
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['user1Id', 'user2Id'],
		properties: {
			user1Id: { type: 'integer' },
			user2Id: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		try {
			const { user1Id, user2Id } = request.body;
			const id1Validation = ValidationUtils.validateUserId(user1Id);
			if (!id1Validation.isValid)
				return BaseRoute.handleError(reply, null, "Invalid User1 ID format", 400);
			const id2Validation = ValidationUtils.validateUserId(user2Id);
			if (!id2Validation.isValid)
				return BaseRoute.handleError(reply, null, "Invalid User2 ID format", 400);
			if (user1Id == user2Id)
				return BaseRoute.handleError(reply, null, "Cannot create game with same user", 403);
			const user1 = await DB.getUserById(user1Id);
			const user2 = await DB.getUserById(user2Id);
			if (!user1.success)
				return BaseRoute.handleError(reply, null, "User1 not found", 404);
			if (!user2.success)
				return BaseRoute.handleError(reply, null, "User2 not found", 404);
			const check = await matchHistoryDB.addNewGame(user1Id, user2Id);
			if (!check.success)
				return BaseRoute.handleError(reply, null, check.errorMsg, check.status);
			BaseRoute.handleSuccess(reply, "Game added to match history successfully", 201);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Error adding a new game", 500);
		}
  });

//used to get the Match History
  fastify.get('/api/getGameHistory',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const matchHistory = await matchHistoryDB.getMatchHistoryById(userId);
			if (!matchHistory.success)
				return BaseRoute.handleError(reply, null, matchHistory.errorMsg, matchHistory.status);
			if (matchHistory.matchHistory.length === 0)
				return BaseRoute.handleError(reply, null, "No Match History found", 404);
			BaseRoute.handleSuccess(reply, {
				message: "Match History retrieved successfully",
				matchHistory: matchHistory.matchHistory
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Error fetching Match History", 500);
		}
  });
//used to get the Match History of another user
  fastify.get('/api/getGameHistory/:id',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		try {
			const id = parseInt(request.params.id);
			const matchHistory = await matchHistoryDB.getMatchHistoryById(id);
			if (!matchHistory)
				return BaseRoute.handleError(reply, null, matchHistory.errorMsg, matchHistory.status);
			if (matchHistory.matchHistory.length === 0)
				return BaseRoute.handleError(reply, null, "No Match History found", 404);
			BaseRoute.handleSuccess(reply, {
				message: "Match History retrieved successfully",
				matchHistory: matchHistory.matchHistory
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Error fetching Match History of a User", 500);
		}
  });

//used to check if a Game had power ups or not
  fastify.post('/api/MatchHistory/powerUp',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['gameId'],
		properties: {
			gameId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		try {
			const { gameId } = request.body;
			const flag = await matchHistoryDB.getPoweUpFlag(gameId);
			if (!flag.success)
				return BaseRoute.handleError(reply, null, flag.errorMsg, flag.status);
			BaseRoute.handleSuccess(reply, {
				message: "Game powerUp retrieved successfully",
				flag: flag.powerUp
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to get game power up flag", 500);
		}
  });

//used to set the Game power up flag
  fastify.put('/api/MatchHistory/powerUp',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['gameId', 'flag'],
		properties: {
			gameId: { type: 'integer' },
			flag: { type: 'boolean' }
		}
	})),
	async (request, reply) => {
		try {
			const { gameId, flag } = request.body;
			const result = await matchHistoryDB.setPowerUpFlag(gameId, flag);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			if (result.updatedGame.changes === 0)
				return BaseRoute.handleError(reply, null, "Error setting the powerUp flag", 400);
			BaseRoute.handleSuccess(reply, {
				message: "Game flag changed successfully",
				flag: flag
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to set the game power up flag", 500);
		}
  });

//used to get the Game final score
  fastify.post('/api/MatchHistory/score',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['gameId'],
		properties: {
			gameId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		try {
			const { gameId } = request.body;
			const score =  matchHistoryDB.getGameScore(gameId);
			if (!score)
				return BaseRoute.handleError(reply, null, score.errorMsg, score.status);
			BaseRoute.handleSuccess(reply, {
				message: "Game score retrieved successfully",
				score: score.score
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to get Game score", 500);
		}
  });

//used to set the Game final score
  fastify.put('/api/MatchHistory/score',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['gameId', 'score'],
		properties: {
			gameId: { type: 'integer' },
			score: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const { gameId, score } = request.body;
			const result = await matchHistoryDB.setGameScore(gameId, score);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, {
				message: "Game score setted successfully",
				score: score
			}, 201);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to set Game score", 500);
		}
  });
}
export default matchHistoryRoutes;
