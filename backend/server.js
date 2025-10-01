import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import users from './database/users.js';
import friends from './database/friends.js';
import socketPlugin from './other/socket.js';
import utilRoutes from './routes/utilsRoutes.js';
import twoFARoutes from './routes/twoFARoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import friendsRoutes from './routes/friendsRoutes.js';
import chatRoutes from './routes/chatRoutes.js'
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
	logger: true ,
	https: {
		key: readFileSync(join(__dirname, 'certs/key.pem')),
		cert: readFileSync(join(__dirname, 'certs/cert.pem')),
	}
});

fastify.register(cors, {
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

fastify.register(fastStatic, {
	root: join(__dirname, '../frontend/dist'),
	prefix: '/',
});

fastify.register(jwt, {
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

await fastify.register(socketPlugin);
await fastify.register(usersRoutes);
await fastify.register(friendsRoutes);
await fastify.register(utilRoutes);
await fastify.register(twoFARoutes);
await fastify.register(chatRoutes);

fastify.decorate('notifyFriendRequest', socketPlugin.notifyFriendRequest);
fastify.decorate('notifyFriendRequestAccepted', socketPlugin.notifyFriendRequestAccepted);
fastify.decorate('notifyFriendRemoved', socketPlugin.notifyFriendRemoved);
fastify.decorate('onlineUsers', socketPlugin.onlineUsers);
fastify.decorate('notifyNewMessage', socketPlugin.notifyNewMessage);
fastify.decorate('notifyMessageDeleted', socketPlugin.notifyMessageDeleted);	
fastify.decorate('notifyGameInvite', socketPlugin.notifyGameInvite);

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
