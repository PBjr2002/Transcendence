async function users(fastify, options) {
  const userDB = require('../database/users');

  fastify.get('/api/users', async (request, reply) => {
    const users = userDB.getAllUsers();
    reply.send(users);
  });

  fastify.post('/api/users', async (request, reply) => {
    const { name, info } = request.body;
	const existingUser = userDB.getUserByName(name);
  	if (existingUser) {
    	return reply.status(409).send({ error: "Username already exists" });
  	}
    const result = userDB.addUser(name, info);
    reply.send({ id: result.lastInsertRowid });
  });

  fastify.get('/api/info', async () => ({
    env: process.env.NODE_ENV || "development",
    backend: process.env.HOST + ":" + process.env.PORT,
  }));
}

module.exports = users;
