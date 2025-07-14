function users(fastify, options) {
  const userDB = require('../database/users');

  fastify.get('/api/users', async (request, reply) => {
    const users = userDB.getAllUsers();
	const usersWithoutPass = users.map(({ password, ...rest }) => rest);
    reply.send(usersWithoutPass);
  });

  fastify.post('/api/users', async (request, reply) => {
    const { name, info , email, password} = request.body;
	  const existingUser = userDB.getUserByName(name);
  	if (existingUser) {
    	return reply.status(409).send({ error: "Username already exists" });
  	}
    const result = await userDB.addUser(name, info, email, password);
    reply.send({ id: result.lastInsertRowid });
  });

  fastify.get('/api/info', async () => ({
    env: process.env.NODE_ENV || "development",
    backend: process.env.HOST + ":" + process.env.PORT,
  }));

  fastify.post('/api/login', async (request, reply) => {
    const { emailOrUser, password } = request.body;
	if (!emailOrUser) {
		return res.status(400).send({ error: "Email or Username are required." });
	}
	if (!password) {
		return res.status(400).send({ error: "Password is required." });
	}
	const existingUser = await userDB.getUserByEmailOrUser(emailOrUser, password);
  	if (!existingUser) {
		return reply.status(401).send({ error: "Invalid Email or Password" });
	}
	delete existingUser.password;
    reply.send({message: "Login successful", existingUser});
  });
}

module.exports = users;
