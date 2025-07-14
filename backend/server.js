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

fastify.register(require('@fastify/cors'), { origin: '*' });

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

fastify.register(require('./routes/usersRoutes'));

const start = async () => {
	const port = process.env.PORT || 3000;
  	const host = process.env.HOST || '0.0.0.0';
	try {
		await fastify.listen({ port , host });
		console.log(`Server running at https://${host}:${port}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
