const friendsDB = require('../database/friends');

async function friendsRoutes(fastify, options) {
  fastify.post('/api/friends/request', async (request, reply) => {
	const { requesterId, addresseeId } = request.body;
    const existing = friendsDB.checkFriendshipExists(requesterId, addresseeId);
    if (existing) {
    	return reply.status(409).send({ error: "Friendship already exists or pending." });
    }
    friendsDB.sendFriendRequest(requesterId, addresseeId);
    reply.send({ message: "Friend request sent." });
  });

  fastify.post('/api/friends/accept', async (request, reply) => {
    const { requesterId, addresseeId } = request.body;
    friendsDB.acceptFriendRequest(requesterId, addresseeId);
    reply.send({ message: "Friend request accepted." });
  });

  fastify.post('/api/friends/reject', async (request, reply) => {
    const { requesterId, addresseeId } = request.body;
    friendsDB.undoFriendship(requesterId, addresseeId);
    reply.send({ message: "Friend request rejected." });
  });

  fastify.post('/api/friends/remove', async (request, reply) => {
    const { userId1, userId2 } = request.body;
    const exists = friendsDB.checkFriendshipExists(userId1, userId2);
    if (!exists || exists.status !== 'accepted') {
      return reply.status(404).send({ error: "Friendship not found." });
    }
    friendsDB.undoFriendship(userId1, userId2);
    reply.send({ message: "Friendship removed." });
  });

  fastify.get('/api/friends/:userId', async (request, reply) => {
    const userId = request.params.userId;
    const friends = friendsDB.getFriends(userId);
    reply.send(friends);
  });

  fastify.get('/api/friends/pending/:userId', async (request, reply) => {
    const userId = request.params.userId;
    const pending = friendsDB.getPendingRequests(userId);
    reply.send(pending);
  });
}

module.exports = friendsRoutes;
