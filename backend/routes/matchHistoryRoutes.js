import DB from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';

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
			const user1 = await DB.getUserById(user1Id);
			const user2 = await DB.getUserById(user2Id);
			if (!user1)
				return BaseRoute.handleError(reply, "User1 not found", 404);
			if (!user2)
				return BaseRoute.handleError(reply, "User2 not found", 404);
			const check = await DB.addNewGame(user1Id, user2Id);
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
			const matchHistory = await DB.getMatchHistoryById(userId);
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
}
export default matchHistoryRoutes;
