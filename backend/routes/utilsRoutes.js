const DB = require('../database/users');

function utils(fastify, options) {
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
	const existingUser = await DB.getUserByEmailOrUser(emailOrUser, password);
  	if (!existingUser) {
		return reply.status(401).send({ error: "Invalid Email or Password" });
	}
	DB.loginUser(existingUser.name);
	delete existingUser.password;
    reply.send({message: "Login successful", existingUser});
  });

  fastify.post('/api/logout', async (request, reply) => {
    const { name } = request.body;
	if (!name) {
		return reply.status(400).send({ error: "User name is required" });
	}
	DB.logoutUser(name);
	reply.send({ message: "Logout successful", name});
  });
}

module.exports = utils;
