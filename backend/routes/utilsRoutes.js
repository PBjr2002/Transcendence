const DB = require('../database/users');
const xss = require('xss');
const speakeasy = require('speakeasy');
const twilio = require('twilio');
const accountSid = process.env.TWILLO_SID;
const authToken  = process.env.TWILLO_TOKEN;
const client = twilio(accountSid, authToken);

async function sendSMS(phoneNumber, code) {
	try {
		const message = await client.messages.create({
			body: `Your Transcendence 2FA code is: ${code}`,
			from: process.env.TWILLO_PHONE_NUMBER,
			to: phoneNumber,
		});
		console.log(`SMS sent to ${phoneNumber}: ${message.sid}`);
		return true;
	}
	catch (error) {
		console.error(`Failed to send SMS to ${phoneNumber}:`, error.message);
		return false;
	}
}

function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

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
	console.log("2FA Status: ", existingUser.status);
	if (!existingUser.twoFASecret || existingUser.status !== "enabled") {
		const token = fastify.jwt.sign({ id: existingUser.id, name: existingUser.name, email: existingUser.email });
		DB.loginUser(existingUser.name);
		delete existingUser.password;
		delete existingUser.twoFAsecret;
    	reply.send({message: "Login successful", token, existingUser});
	}
	else {
		delete existingUser.password;
		delete existingUser.twoFAsecret;
		reply.send({message: "2FA required", existingUser});
	}
  });

//used to check the 2FA after login
  fastify.post('/api/login/2fa', async (request, reply) => {
	const { userId, twoFAcode } = request.body;
	if (!twoFAcode) {
		return reply.status(400).send({ error: "2FA code required." });
	}
	const existingUser = await DB.getUserById(userId);
	const verified = speakeasy.totp.verify({
		secret: existingUser.twoFASecret,
		encoding: 'base32',
		token: twoFAcode,
		window: 1,
	});
	if (!verified) {
		return reply.status(403).send({ error: "Invalid 2FA code" });
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
	reply.send({message: "Logout successful", username});
  });
}

module.exports = utils;

module.exports.sendSMS = sendSMS;
module.exports.generateOTP = generateOTP;
