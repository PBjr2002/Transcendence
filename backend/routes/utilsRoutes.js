import DB from '../database/users.js';
import twoFa from '../database/twoFA.js';
import xss from 'xss';
import speakeasy from 'speakeasy';
import twilio from 'twilio';
const accountSid = process.env.TWILLO_SID;
const authToken  = process.env.TWILLO_TOKEN;
const client = twilio(accountSid, authToken);
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.NODEMAILER_EMAIL,
		pass: process.env.NODEMAILER_PASS,
	},
});

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

async function sendEmail(email, code) {
	try {
		const message = await transporter.sendMail({
			from: process.env.NODEMAILER_EMAIL,
			to: email,
			subject: 'Your 2FA Verification Code',
			text: `Your verification code is: ${code}`,
			html: `<p>Your verification code is: <strong>${code}</strong></p>`
		});
		console.log(`Email sent to ${email}: ${message.sid}`);
		return true;
	}
	catch (error) {
		console.error(`Failed to send Email to ${email}:`, error.message);
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
	const existingTwoFa = await twoFa.getTwoFaById(existingUser.id);
	if (!existingTwoFa || (existingTwoFa && existingTwoFa.status !== "enabled")) {
		const token = fastify.jwt.sign({ id: existingUser.id, name: existingUser.name, email: existingUser.email });
		DB.loginUser(existingUser.name);
		delete existingUser.password;
    	reply.send({message: "Login successful", token, existingUser});
	}
	else {
		delete existingUser.password;
		const actualDate = Date.now();
		if (existingTwoFa.twoFAType === 'EMAIL' && actualDate > existingTwoFa.expireDate) {
			const newOTP = generateOTP();
			await twoFa.resetTwoFaSecret(newOTP, existingUser.id);
			//sendEmail With new Code for user be able to input after
		}
		if (existingTwoFa.twoFAType === 'SMS' && actualDate > existingTwoFa.expireDate) {
			const newOTP = generateOTP();
			await twoFa.resetTwoFaSecret(newOTP, existingUser.id);
			const verification = await sendSMS(existingUser.phoneNumber);
			if (!verification) {
				return reply.status(400).send({ error: 'Error sending SMS with new Code' });
			}
		}
		reply.send({message: "2FA required", existingUser});
	}
  });

//used to check the 2FA Method
  fastify.post('/api/login/2fa', async (request, reply) => {
	const userId = request.body;
	const existingUser = await DB.getUserById(userId);
	if (!existingUser) {
		return reply.status(403).send({ error: "User doesnt exist" });
	}
	const existingTwoFa = await twoFa.getTwoFaById(existingUser.id);
	if (existingTwoFa.twoFAType === 'QR')
		return reply.send({ message: "QR 2FA" });
	if (existingTwoFa.twoFAType === 'EMAIL' || existingTwoFa.twoFAType === 'SMS')
		return reply.send({ message: "SMS or Email 2FA" });
    reply.status(400).send({ error: "Error with 2FA Method" });
  });

//both functions used to check the 2FA code after login
  fastify.post('/api/login/2fa/QR', async (request, reply) => {
	const { userId, twoFAcode } = request.body;
	if (!twoFAcode) {
		return reply.status(400).send({ error: "2FA code required." });
	}
	const existingTwoFa = await twoFa.getTwoFaById(userId);
	const verified = speakeasy.totp.verify({
		secret: existingTwoFa.twoFASecret,
		encoding: 'base32',
		token: twoFAcode,
		window: 1,
	});
	if (!verified) {
		return reply.status(403).send({ error: "Invalid 2FA code" });
	}
	const existingUser = await DB.getUserById(userId);
	const token = fastify.jwt.sign({ id: existingUser.id, name: existingUser.name, email: existingUser.email });
	DB.loginUser(existingUser.name);
	delete existingUser.password;
	delete existingUser.twoFAsecret;
    reply.send({message: "Login successful", token, existingUser});
  });

  fastify.post('/api/login/2fa/SMSOrEmail', async (request, reply) => {
	const { userId, twoFAcode } = request.body;
	if (!twoFAcode) {
		return reply.status(400).send({ error: "2FA code required." });
	}
	const existingTwoFa = twoFa.getTwoFaById(userId);
	const verification = twoFa.compareTwoFACodes(twoFAcode, userId);
	const actualDate = Date.now();
	if (!verification && actualDate > existingTwoFa.expireDate) {
		return reply.status(403).send({ error: "2FA Code Expired" });
	}
	if (!verification) {
		return reply.status(403).send({ error: "Invalid 2FA code" });
	}
	const existingUser = await DB.getUserById(userId);
	const token = fastify.jwt.sign({ id: existingUser.id, name: existingUser.name, email: existingUser.email });
	DB.loginUser(existingUser.name);
	delete existingUser.password;
    reply.send({message: "Login successful", token, existingUser});
  });

//used to logout a user
  fastify.post('/api/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const username = request.user.name;
	DB.logoutUser(username);
	reply.send({message: "Logout successful", username});
  });
}

export { sendSMS, sendEmail, generateOTP };

export default utils;
