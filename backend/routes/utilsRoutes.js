const DB = require('../database/users');
const xss = require('xss');
const speakeasy = require('speakeasy');

function utils(fastify, options) {
//used just for testing
  fastify.get('/api/info', async () => ({
    env: process.env.NODE_ENV || "development",
    backend: process.env.HOST + ":" + process.env.PORT,
  }));

//used to login a user
  fastify.post('/api/login', async (request, reply) => {
    const { emailOrUser, password, twoFAcode } = request.body;
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
	if (existingUser.twoFASecret) {
		if (!twoFAcode) {
			return reply.status(206).send({ message: "2FA required" });
		}
		const verified = speakeasy.totp.verify({
			secret: existingUser.twoFASecret,
			encoding: 'base32',
			token: twoFAcode,
			window: 1,
		});
		if (!verified) {
			return reply.status(403).send({ error: "Invalid 2FA code" });
		}
	}
	const token = fastify.jwt.sign({ id: existingUser.id, name: existingUser.name, email: existingUser.email });
	DB.loginUser(existingUser.name);
	delete existingUser.password;
	delete existingUser.twoFAsecret;
    reply.send({message: "Login successful", token, existingUser});
  });

//used to logout a user
  fastify.post('/api/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const username = request.user.name;
	DB.logoutUser(username);
	reply.send({ message: "Logout successful", username});
  });
}

module.exports = utils;
