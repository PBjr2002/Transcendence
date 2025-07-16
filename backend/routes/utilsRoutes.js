const DB = require('../database/users');
const xss = require('xss');

function utils(fastify, options) {
//used just for testing
  fastify.get('/api/info', async () => ({
    env: process.env.NODE_ENV || "development",
    backend: process.env.HOST + ":" + process.env.PORT,
  }));

//used to login a user
  fastify.post('/api/login', async (request, reply) => {
    const { emailOrUser, password } = request.body;
	if (!emailOrUser) {
		return reply.status(400).send({ error: "Email or Username are required." });
	}
	if (!password) {
		return reply.status(400).send({ error: "Password is required." });
	}
	const cleanEmailOrUser = xss(emailOrUser);
	const existingUser = await DB.getUserByEmailOrUser(cleanEmailOrUser, password);
  	if (!existingUser) {
		return reply.status(401).send({ error: "Invalid Email or Password" });
	}
	DB.loginUser(existingUser.name);
	delete existingUser.password;
    reply.send({message: "Login successful", existingUser});
  });

//used to logout a user
  fastify.post('/api/logout', async (request, reply) => {
    const { name } = request.body;
	if (!name) {
		return reply.status(400).send({ error: "User name is required" });
	}
	const cleanName = xss(name);
	DB.logoutUser(cleanName);
	reply.send({ message: "Logout successful", cleanName});
  });
}

module.exports = utils;
