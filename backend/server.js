require('dotenv').config();
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

fastify.register(require('@fastify/websocket'));
fastify.get('/wss', { websocket: true }, (conn) => {
	conn.socket.on('message', message => {
		conn.socket.send(`Echo: ${message}`);
	});
});

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
