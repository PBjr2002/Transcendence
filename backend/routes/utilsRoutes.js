import DB from '../database/users.js';
import twoFa from '../database/twoFA.js';
import xss from 'xss';
import speakeasy from 'speakeasy';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import BaseRoute from '../other/BaseRoutes.js';

const accountSid = process.env.TWILLO_SID;
const authToken  = process.env.TWILLO_TOKEN;
const client = twilio(accountSid, authToken);

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.NODEMAILER_EMAIL,
		pass: process.env.NODEMAILER_PASS,
	},
});

class AuthSecurity {
	static generateAuthToken(fastify, user) {
		return fastify.jwt.sign({
			id: user.id,
			name: user.name,
			email: user.email
		});
	}
}

async function sendSMS(phoneNumber, code) {
	try {
		const message = await client.messages.create({
			body: `Your Transcendence 2FA code is: ${code}`,
			from: process.env.TWILLO_PHONE_NUMBER,
			to: phoneNumber,
		});
		console.log(`SMS sent: ${message.sid}`);
		return true;
	}
	catch (error) {
		console.error(`Failed to send SMS:`, error.message);
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
		console.log(`Email sent: ${message.messageId}`);
		return true;
	}
	catch (error) {
		console.error(`Failed to send Email:`, error.message);
		return false;
	}
}

function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

function utils(fastify, options) {
//used just for testing
  fastify.get('/api/info',
	async (request, reply) => {
		try {
			const info = {
				env: process.env.NODE_ENV || "development",
    			backend: process.env.HOST + ":" + process.env.PORT,
			};
			BaseRoute.handleSuccess(reply, info);
		}
		catch (error) {
			BaseRoute.handleError(reply, "Failed to get Server info", 500);
		}
  });

//used to login a user
  fastify.post('/api/login',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['emailOrUser', 'password'],
		properties: {
			emailOrUser: { type: 'string' },
			password: { type: 'string' }
		}
	}),
	async (request, reply) => {
		try {
			const { emailOrUser, password } = request.body;
			const cleanEmailOrUser = xss(emailOrUser);
			const existingUser = await DB.getUserByEmailOrUser(cleanEmailOrUser, password);
			if (!existingUser)
				return BaseRoute.handleError(reply, "Invalid Email or Password", 401);
			const existingTwoFa = await twoFa.getTwoFaById(existingUser.id);
			if (!existingTwoFa || (existingTwoFa && existingTwoFa.status !== "enabled")) {
				const token = AuthSecurity.generateAuthToken(fastify, existingUser);
				await DB.loginUser(existingUser.name);
				delete existingUser.password;
				BaseRoute.handleSuccess(reply, {
					message: "Login successful",
					token,
					existingUser
				});
			}
			else {
				delete existingUser.password;
				const actualDate = Date.now();
				if (existingTwoFa.twoFAType === 'EMAIL' && actualDate > existingTwoFa.expireDate) {
					const newOTP = generateOTP();
					await twoFa.resetTwoFaSecret(newOTP, existingUser.id);
					const emailSent = await sendEmail(existingUser.email, newOTP);
					if (!emailSent)
						return BaseRoute.handleError(reply, "Error sending email with new code", 400);
				}
				if (existingTwoFa.twoFAType === 'SMS' && actualDate > existingTwoFa.expireDate) {
					const newOTP = generateOTP();
					await twoFa.resetTwoFaSecret(newOTP, existingUser.id);
					const verification = await sendSMS(existingUser.phoneNumber, newOTP);
					if (!verification)
						return BaseRoute.handleError(reply, "Error sending SMS with new Code", 400);
				}
				BaseRoute.handleSuccess(reply, {
					message: "2FA required",
					existingUser
				});
			}
		}
		catch (error) {
			BaseRoute.handleError(reply, "Login failed", 500);
		}
  });

//used to check the 2FA Method
  fastify.post('/api/login/2fa',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['userId'],
		properties: {
			userId: { type: 'integer' }
		}
	}),
	async (request, reply) => {
		try {
			const { userId } = request.body;
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User doesnt exist", 403);
			const existingTwoFa = await twoFa.getTwoFaById(existingUser.id);
			if (!existingTwoFa)
				return BaseRoute.handleError(reply, "2FA not configured", 400);
			if (existingTwoFa.twoFAType === 'QR')
				BaseRoute.handleSuccess(reply, { message: "QR 2FA" });
			else if (existingTwoFa.twoFAType === 'EMAIL' || existingTwoFa.twoFAType === 'SMS')
				BaseRoute.handleSuccess(reply, { message: "SMS or Email 2FA" });
			else
				BaseRoute.handleError(reply, "Error with 2FA Method", 400);
		}
		catch (error) {
			BaseRoute.handleError(reply, "Failed to check 2FA method", 500);
		}
  });

//both functions used to check the 2FA code after login
  fastify.post('/api/login/2fa/QR',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['userId', 'twoFAcode'],
		properties: {
			userId: { type: 'integer' },
			twoFAcode: { type: 'string' }
		}
	}),
	async (request, reply) => {
		try {
			const { userId, twoFAcode } = request.body;
			const existingTwoFa = await twoFa.getTwoFaById(userId);
			if (!existingTwoFa)
				return BaseRoute.handleError(reply, "2FA not configured", 400);
			const verified = speakeasy.totp.verify({
				secret: existingTwoFa.twoFASecret,
				encoding: 'base32',
				token: twoFAcode,
				window: 1,
			});
			if (!verified)
				return BaseRoute.handleError(reply, "Invalid 2FA code", 403);
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			const token = AuthSecurity.generateAuthToken(fastify, existingUser);
			await DB.loginUser(existingUser.name);
			delete existingUser.password;
			delete existingUser.twoFASecret;
			BaseRoute.handleSuccess(reply, {
				message: "Login successful",
				token,
				existingUser
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, "2FA verification failed", 500);
		}
  });

  fastify.post('/api/login/2fa/SMSOrEmail',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['userId', 'twoFAcode'],
		properties: {
			userId: { type: 'integer' },
			twoFAcode: { type: 'string' }
		}
	}),
	async (request, reply) => {
		try {
			const { userId, twoFAcode } = request.body;
			const existingTwoFa = await twoFa.getTwoFaById(userId);
			if (!existingTwoFa)
				return BaseRoute.handleError(reply, "2FA not configured", 400);
			const verification = await twoFa.compareTwoFACodes(twoFAcode, userId);
			const actualDate = Date.now();
			if (!verification && actualDate > existingTwoFa.expireDate)
				return BaseRoute.handleError(reply, "2FA Code Expired", 403);
			else if (!verification)
				return BaseRoute.handleError(reply, "Invalid 2FA code", 403);
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			const token = AuthSecurity.generateAuthToken(fastify, existingUser);
			await DB.loginUser(existingUser.name);
			delete existingUser.password;
			BaseRoute.handleSuccess(reply, {
				message: "Login successful",
				token,
				existingUser
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, "2FA verification failed", 500);
		}
  });

//used to logout a user
  fastify.post('/api/logout',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const username = request.user.name;
			await DB.logoutUser(username);
			BaseRoute.handleSuccess(reply, {
				message: "Logout successful",
				username
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, "Logout failed", 500);
		}
  });
}

export { sendSMS, sendEmail, generateOTP };

export default utils;
