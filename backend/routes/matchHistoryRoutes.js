import DB from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import ValidationUtils from '../other/validation.js';
import matchHistoryDB from '../database/matchHistory.js';

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
				return BaseRoute.handleError(reply, "Invalid User1 ID format", 400);
			const id2Validation = ValidationUtils.validateUserId(user2Id);
			if (!id2Validation.isValid)
				return BaseRoute.handleError(reply, "Invalid User2 ID format", 400);
			if (user1Id == user2Id)
				return BaseRoute.handleError(reply, "Cannot create game with same user", 400);
			const user1 = await DB.getUserById(user1Id);
			const user2 = await DB.getUserById(user2Id);
			if (!user1)
				return BaseRoute.handleError(reply, "User1 not found", 404);
			if (!user2)
				return BaseRoute.handleError(reply, "User2 not found", 404);
			const check = await matchHistoryDB.addNewGame(user1Id, user2Id);
			if (!check)
				return BaseRoute.handleError(reply, "Error adding the game to matchHistory", 400);
			BaseRoute.handleSuccess(reply, "Game added to match history successfully", 201);
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to get the Match History
  fastify.get('/api/getGameHistory',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const matchHistory = await matchHistoryDB.getMatchHistoryById(userId);
			if (!matchHistory || matchHistory.length === 0)
				return BaseRoute.handleError(reply, "No Match History found", 404);
			BaseRoute.handleSuccess(reply, {
				message: "Match History retrieved successfully",
				matchHistory: matchHistory
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
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
			if (!matchHistory || matchHistory.length === 0)
				return BaseRoute.handleError(reply, "No Match History found", 404);
			BaseRoute.handleSuccess(reply, {
				message: "Match History retrieved successfully",
				matchHistory: matchHistory
			});
		}
		catch (error) {
			console.log(error);
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });
}
export default matchHistoryRoutes;
