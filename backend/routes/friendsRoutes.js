const friendsDB = require('../database/friends');
const xss = require('xss');

async function friendsRoutes(fastify, options) {
//used to send friend requests
  fastify.post('/api/friends/request', {
	schema: {
		body: {
			type: 'object',
			required: ['requesterId', 'addresseeId'],
			properties: {
				requesterId: { type: 'integer' },
				addresseeId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
	const { requesterId, addresseeId } = request.body;
    const existing = await friendsDB.checkFriendshipExists(requesterId, addresseeId);
    if (existing) {
    	return reply.status(409).send({ error: "Friendship already exists or pending." });
    }
    await friendsDB.sendFriendRequest(requesterId, addresseeId);
    reply.send({ message: "Friend request sent." });
  });

//used to accept friend request
  fastify.post('/api/friends/accept', {
	schema: {
		body: {
			type: 'object',
			required: ['requesterId', 'addresseeId'],
			properties: {
				requesterId: { type: 'integer' },
				addresseeId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
    const { requesterId, addresseeId } = request.body;
    await friendsDB.acceptFriendRequest(requesterId, addresseeId);
    reply.send({ message: "Friend request accepted." });
  });

//used to reject friend requests
  fastify.post('/api/friends/reject', {
	schema: {
		body: {
			type: 'object',
			required: ['requesterId', 'addresseeId'],
			properties: {
				requesterId: { type: 'integer' },
				addresseeId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
    const { requesterId, addresseeId } = request.body;
    await friendsDB.undoFriendship(requesterId, addresseeId);
    reply.send({ message: "Friend request rejected." });
  });

//used to cancel friendships
  fastify.post('/api/friends/remove', {
	schema: {
		body: {
			type: 'object',
			required: ['userId1', 'userId2'],
			properties: {
				userId1: { type: 'integer' },
				userId2: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
    const { userId1, userId2 } = request.body;
    const exists = await friendsDB.checkFriendshipExists(userId1, userId2);
    if (!exists || exists.status !== 'accepted') {
      return reply.status(404).send({ error: "Friendship not found." });
    }
    await friendsDB.undoFriendship(userId1, userId2);
    reply.send({ message: "Friendship removed." });
  });

//used to get all the accepted friends
  fastify.get('/api/friends/:userId', {
	schema: {
		params: {
			type: 'object',
			properties: {
				userId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
    const userId = parseInt(request.params.userId);
    const friends = await friendsDB.getFriends(userId);
    reply.send(friends);
  });

//used to get all the pending friend requests
  fastify.get('/api/friends/pending/:userId', {
	schema: {
		params: {
			type: 'object',
			properties: {
				userId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
    const userId = parseInt(request.params.userId);
    const pending = await friendsDB.getPendingRequests(userId);
    reply.send(pending);
  });
}

module.exports = friendsRoutes;
