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
import matchHistoryRoutes from './routes/matchHistoryRoutes.js';
import lobbyRoutes from './routes/lobbyRoutes.js';
import Security from './other/security.js';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multipart from '@fastify/multipart';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDest = pino.destination('./logs/app.log');

const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' }
    }
};

const fastify = Fastify({
	logger: loggerConfig,
	https: {
		key: readFileSync(path.join(__dirname, 'certs/key.pem')),
		cert: readFileSync(path.join(__dirname, 'certs/cert.pem')),
	}
});

await fastify.register(helmet, Security.helmetConfig);
await fastify.register(rateLimit, Security.rateLimitConfig);
await fastify.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } });

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

await fastify.register(fastStatic, {
	root: path.join(process.cwd(), 'profile_pictures'),
	prefix: '/profile_pictures/',
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
fastify.decorate('sendNewMessage', socket.sendNewMessage);
fastify.decorate('notifyMessageDeleted', socket.notifyMessageDeleted);	
fastify.decorate('notifyGameInvite', socket.notifyGameInvite);
fastify.decorate('notifyFriendOfBlock', socket.notifyFriendOfBlock);
fastify.decorate('notifyFriendOfUnblock', socket.notifyFriendOfUnblock);

await fastify.register(usersRoutes);
await fastify.register(friendsRoutes);
await fastify.register(utilRoutes);
await fastify.register(twoFARoutes);
await fastify.register(chatRoutes);
await fastify.register(matchHistoryRoutes);
await fastify.register(lobbyRoutes);

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
