require('dotenv').config();
const { updateUserOnlineStatus } = require('./database/users');
const { getFriends } = require('./database/friends');
const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({
	logger: true ,
	https: {
		key: fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
		cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
	}
});

fastify.register(require('@fastify/cors'), {
	origin: (origin, cb) => {
		if (!origin)
			return cb(null, true);
		try {
			const url = new URL(origin);
			if (url.protocol === 'https:')
				return cb(null, true);
		}
		catch (err) {
			return cb(new Error("Invalid Origin"));
		}
		cb(new Error("CORS not allowed for http origin"));
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '../frontend/dist'),
	prefix: '/',
});

fastify.register(require('@fastify/swagger'), {
	routePrefix: '/docs',
	swagger: {
		info: { title: 'Fastify API', version: '1.0.0' }
	},
	exposeRoute: true
});

const onlineUsers = new Map();
fastify.register(async function (fastify) {
	await fastify.register(require('@fastify/websocket'));
	fastify.get('/api/wss', { websocket: true }, (connection, req) => {
		let currentUserId = null;
		
		connection.on('message', async (message) => {
			try {
				const data = JSON.parse(message.toString());
				if (data.type === 'user_online') {
					currentUserId = data.userId;
					onlineUsers.set(currentUserId, connection);
					await updateUserOnlineStatus(currentUserId, true);
					await notifyFriendsOfStatusChange(currentUserId, true);
				} 
				else if (data.type === 'ping')
					connection.send(JSON.stringify({ type: 'pong' }));
			}
			catch (err) {
				console.error('Websocket message error:', err);
			}
		});
		
		connection.on('close', async () => {
			try {
				if (currentUserId) {
					onlineUsers.delete(currentUserId);
					await updateUserOnlineStatus(currentUserId, false);
					await notifyFriendsOfStatusChange(currentUserId, false);
				}
			}
			catch (err) {
				console.error('Websocket message error:', err);
			}
		});
	});
});

async function notifyFriendRemoved(userId1, userId2) {
	try {
		const user1Connection = onlineUsers.get(userId1);
		if (user1Connection && user1Connection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_removed',
				removedFriendId: userId2
			});
			user1Connection.send(message);
		}
		const user2Connection = onlineUsers.get(userId2);
		if (user2Connection && user2Connection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_removed',
				removedFriendId: userId1
			});
			user2Connection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying friend removal:', err);
	}
}

async function notifyFriendsOfStatusChange(userId, isOnline) {
	try {
		const friends = await getFriends(userId);
		friends.forEach(friend => {
			const friendConnection = onlineUsers.get(friend.id);
			if (friendConnection && friendConnection.readyState === 1) {
				const message = JSON.stringify({
					type: 'friend_status_change',
					friendId: userId,
					online: isOnline
				});
				friendConnection.send(message);
			}
		});
	}
	catch (err) {
		console.error('Error notifying friends:', err);
	}
}

async function notifyFriendRequest(addresseeId, requesterData) {
	try {
		const addresseeConnection = onlineUsers.get(addresseeId);
		if (addresseeConnection && addresseeConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_request_received',
				requester: requesterData
			});
			addresseeConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying friend request:', err);
	}
}

async function notifyFriendRequestAccepted(requesterId, addresseeData) {
	try {
		const requesterConnection = onlineUsers.get(requesterId);
		if (requesterConnection && requesterConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_request_accepted',
				newFriend: addresseeData
			});
			requesterConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying friend request accepted:', err);
	}
}

fastify.register(require('@fastify/helmet'), {
});
  

fastify.register(require('@fastify/jwt'), {
	secret: process.env.JWT_SECRET || 'superuserkey',
});

fastify.decorate("authenticate", async function (request, reply) {
	try {
		await request.jwtVerify();
	}
	catch {
		reply.code(401).send({ error: 'Unauthorized' });
	}
});

fastify.decorate('notifyFriendRequest', notifyFriendRequest);
fastify.decorate('notifyFriendRequestAccepted', notifyFriendRequestAccepted);
fastify.decorate('notifyFriendRemoved', notifyFriendRemoved);
fastify.decorate('onlineUsers', onlineUsers);

fastify.register(require('./routes/usersRoutes'));
fastify.register(require('./routes/friendsRoutes'));
fastify.register(require('./routes/utilsRoutes'));
fastify.register(require('./routes/twoFARoutes'));

const start = async () => {
	const port = process.env.PORT || 3000;
  	const host = process.env.HOST || '0.0.0.0';
	try {
		await fastify.listen({ port , host });
		fastify.log.info(`Server running at https://${host}:${port}`);
	}
	catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
