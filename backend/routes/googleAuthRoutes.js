const verifyGoogleToken = require('./googleAuth');
const db = require('../database/db');

async function googleAuthRoute(fastify, options) {
  fastify.post('/auth/google', async (request, reply) => {
    const { token } = request.body;

    if (!token) {
    	return reply.code(400).send({ error: 'No token provided' });
    }

    try {
    	const { googleId, email, name } = await verifyGoogleToken(token);

    	let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    	if (!user) {
    		db.prepare(`
    		  INSERT INTO users (name, email, info, password, online, status)
    		  VALUES (?, ?, ?, NULL, true, 'enabled')
    		`).run(name, email, 'Signed in with Google');
    		user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    	}

    	const appToken = fastify.jwt.sign(
    		{
    		  id: user.id,
    		  name: user.name,
    		  email: user.email,
    		},
    		{ expiresIn: '1h' }
    	);

		reply.send({ token: appToken, user });
    }
	catch (err) {
    	console.error(err);
    	reply.code(401).send({ error: 'Invalid Google token' });
    }
  });
}

module.exports = googleAuthRoute;
