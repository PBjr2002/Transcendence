async function users(fastify, options) {
  const userDB = require('../database/users');

  fastify.get('/api/users', async (request, reply) => {
    const users = userDB.getAllUsers();
    reply.send(users);
  });

  fastify.post('/api/users', async (request, reply) => {
    const { name, info , email, password} = request.body;
	  const existingUser = userDB.getUserByName(name);
  	if (existingUser) {
    	return reply.status(409).send({ error: "Username already exists" });
  	}
    const result = userDB.addUser(name, info, email, password);
    reply.send({ id: result.lastInsertRowid });
  });

  fastify.get('/api/info', async () => ({
    env: process.env.NODE_ENV || "development",
    backend: process.env.HOST + ":" + process.env.PORT,
  }));

  fastify.post('/api/login', async (request, reply) => {
    const { email, password } = request.body;
	  const existingUser = userDB.getUserByEmail(email, password);
  	if (!existingUser) {
    	return reply.status(409).send({ error: "Invalid Email or Password" });
  	}
    reply.send({id: existingUser.name});
  });
}

module.exports = users;
