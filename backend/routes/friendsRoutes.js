const friendsDB = require('../database/friends');
const xss = require('xss');

async function friendsRoutes(fastify, options) {
//used to send friend requests
  fastify.post('/api/friends/request', {
	onRequest: [fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			required: ['addresseeId'],
			properties: {
				addresseeId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
	const requesterId = request.user.id;
	const { addresseeId } = request.body;
    const existing = await friendsDB.checkFriendshipExists(requesterId, addresseeId);
    if (existing) {
    	return reply.status(409).send({ error: "Friendship already exists or pending." });
    }
    await friendsDB.sendFriendRequest(requesterId, addresseeId);
    reply.send({ message: "Friend request sent." });
  });

//used to accept friend request
  fastify.post('/api/friends/accept', {
	onRequest: [fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			required: ['requesterId'],
			properties: {
				requesterId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
	const addresseeId = request.user.id;
    const { requesterId } = request.body;
    await friendsDB.acceptFriendRequest(requesterId, addresseeId);
    reply.send({ message: "Friend request accepted." });
  });

//used to reject friend requests
  fastify.post('/api/friends/reject', {
	onRequest: [fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			required: ['requesterId'],
			properties: {
				requesterId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
	const addresseeId = request.user.id;
    const { requesterId } = request.body;
    await friendsDB.undoFriendship(requesterId, addresseeId);
    reply.send({ message: "Friend request rejected." });
  });

//used to cancel friendships
  fastify.post('/api/friends/remove', {
	onRequest: [fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			required: ['friendId'],
			properties: {
				friendId: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
	const userId1 = request.user.id;
	const { friendId: userId2 } = request.body;
    const exists = await friendsDB.checkFriendshipExists(userId1, userId2);
    if (!exists || exists.status !== 'accepted') {
      return reply.status(404).send({ error: "Friendship not found." });
    }
    await friendsDB.undoFriendship(userId1, userId2);
    reply.send({ message: "Friendship removed." });
  });

//used to get all the accepted friends
  fastify.get('/api/friends', {onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = parseInt(request.user.id);
    const friends = await friendsDB.getFriends(userId);
    reply.send(friends);
  });

//used to get all the pending friend requests
  fastify.get('/api/friends/pending', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = parseInt(request.user.id);
    const pending = await friendsDB.getPendingRequests(userId);
    reply.send(pending);
  });
}

module.exports = friendsRoutes;
