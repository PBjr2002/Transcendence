import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import users from './database/users.js';
import friends from './database/friends.js';
import socket from './other/socket.js';
import utilRoutes from './routes/utilsRoutes.js';
import twoFARoutes from './routes/twoFARoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import friendsRoutes from './routes/friendsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import Security from './other/security.js';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
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

await fastify.register(helmet, Security.helmetConfig);
await fastify.register(rateLimit, Security.rateLimitConfig);

fastify.addHook('preHandler', Security.createSanitizeHook());
fastify.addHook('preHandler', Security.createSecurityHook());
fastify.addHook('preHandler', Security.createTemporaryUserHook());

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

fastify.register(cookie, {
	secret: process.env.COOKIE_SECRET || 'cookiesecretkey',
	parseOptions: {}
});

fastify.decorate("authenticate", async function (request, reply) {
	try {
		const tokenFromCookie = request.cookies.authToken;
		if (tokenFromCookie)
    		request.headers.authorization = `Bearer ${tokenFromCookie}`;
		await request.jwtVerify();
	}
	catch {
		reply.code(401).send({ error: 'Unauthorized' });
	}
});

await fastify.register(socket.socketPlugin);

fastify.decorate('notifyFriendRequest', socket.notifyFriendRequest);
fastify.decorate('notifyFriendRequestAccepted', socket.notifyFriendRequestAccepted);
fastify.decorate('notifyFriendRemoved', socket.notifyFriendRemoved);
fastify.decorate('onlineUsers', socket.onlineUsers);
fastify.decorate('notifyNewMessage', socket.notifyNewMessage);
fastify.decorate('notifyMessageDeleted', socket.notifyMessageDeleted);	
fastify.decorate('notifyGameInvite', socket.notifyGameInvite);

await fastify.register(usersRoutes);
await fastify.register(friendsRoutes);
await fastify.register(utilRoutes);
await fastify.register(twoFARoutes);
await fastify.register(chatRoutes);

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
