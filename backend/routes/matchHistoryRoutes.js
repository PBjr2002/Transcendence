const DB = require('../database/users');

function matchHistoryRoutes(fastify, options) {
//used to add a new closed game to the Match History
  fastify.post('/api/addNewGame' , { onRequest: [fastify.authenticate] }, async (request, reply) => {
	try {
		const user = request.user;
		if (!user) {
			console.error('User not authenticated');
			return reply.status(401).send({ error: 'Not authenticated' });
		}
		const { user1Id, user2Id } = request.body;
		if (!user1Id || !user2Id) {
			return reply.status(400).send({ error: 'Both user Ids required' });
		}
		const check = await DB.addNewGame(user1Id, user2Id);
		if (!check) {
			return reply.status(400).send({ error: 'Error adding the game to matchHistory' });
		}
	}
	catch (error) {
		console.error('Error in /api/addNewGame:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });

//used to get the Match History
  fastify.get('/api/getGameHistory', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	try {
		const user = request.user;
		if (!user) {
			console.error('User not authenticated');
			return reply.status(401).send({ error: 'Not authenticated' });
		}
		const matchHistory = await DB.getMatchHistoryById(user.id);
		if (!matchHistory) {
			return reply.status(400).send({ error: 'No Match History' });
		}
		return reply.send({ message: "Match History", matchHistory: matchHistory });
	}
	catch (error) {
		console.error('Error in /api/getGameHistory:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });
}

module.exports = matchHistoryRoutes;
