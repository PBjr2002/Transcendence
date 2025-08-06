const qrcode = require('qrcode');
const DB = require('../database/users');
const speakeasy = require('speakeasy');
const utils = require('./utilsRoutes');

function twoFARoutes(fastify, options) {
//used to generate a new 2FA authentication QR code
  fastify.get('/api/2fa/generateQR', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	try {
		const user = request.user;
		if (!user) {
			console.error('User not authenticated');
			return reply.status(401).send({ error: 'Not authenticated' });
		}
		const existingUser = await DB.getUserById(user.id);
		if (!existingUser) {
			console.error(`User with id ${user.id} not found in DB`);
			return reply.status(404).send({ error: 'User not found' });
		}
		if (existingUser.twoFASecret && existingUser.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
  		const secret = speakeasy.generateSecret({
  			name: `Transcendence (${existingUser.email})`,
  		});
		await DB.setTwoFAType(existingUser.id, 'QR');
		await DB.setTwoFASecret(existingUser.id, secret.base32);
  		const qrCodeImageUrl = await qrcode.toDataURL(secret.otpauth_url);
  		reply.send({
  			message: '2FA secret generated',
  			secret: secret.base32,
  			qrCodeImageUrl,
  		});
	}
	catch (error) {
		console.error('Error in /api/2fa/generateQR:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });

//used to generate a new 2FA authentication SMS code
  fastify.post('/api/2fa/generateSMS', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	try {
		const user = request.user;
		if (!user) {
			console.error('User not authenticated');
			return reply.status(401).send({ error: 'Not authenticated' });
		}
		const existingUser = await DB.getUserById(user.id);
		if (!existingUser) {
			console.error(`User with id ${user.id} not found in DB`);
			return reply.status(404).send({ error: 'User not found' });
		}
		if (existingUser.twoFASecret && existingUser.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
		const { contact } = request.body;
		if (!contact) {
			return reply.status(400).send({ error: 'PhoneNumber required' });
		}
		await DB.setTwoFAType(existingUser.id, 'SMS');
		const OTP = utils.generateOTP();
		await DB.setPhoneNumber(existingUser.id, contact);
		await DB.setTwoFASecret(existingUser.id, OTP);
		const verification = await utils.sendSMS(contact, OTP);
		if (!verification)
			return reply.status(400).send({ error: 'Error sending the SMS' });
		return reply.send({ message: 'SMS code sent' });
	}
	catch (error) {
		console.error('Error in /api/2fa/generateSMS:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });

//used to generate a new 2FA authentication Email code
  fastify.post('/api/2fa/generateEmail', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	try {
		const user = request.user;
		if (!user) {
			console.error('User not authenticated');
			return reply.status(401).send({ error: 'Not authenticated' });
		}
		const existingUser = await DB.getUserById(user.id);
		if (!existingUser) {
			console.error(`User with id ${user.id} not found in DB`);
			return reply.status(404).send({ error: 'User not found' });
		}
		if (existingUser.twoFASecret && existingUser.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
		const { email } = request.body;
		if (!email) {
			return reply.status(400).send({ error: 'Email required' });
		}
		await DB.setTwoFAType(existingUser.id, 'EMAIL');
		const OTP = utils.generateOTP();
		await DB.setTwoFASecret(existingUser.id, OTP);

		//send Email function
		//const verification = await utils.sendSMS(contact, OTP);
		//if (!verification)
		//	return reply.status(400).send({ error: 'Error sending the SMS' });
		return reply.send({ message: 'Email code sent' });
	}
	catch (error) {
		console.error('Error in /api/2fa/generateEmail:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });

//used to verify a 2FA authentication with SMS or Email
  fastify.post('/api/2fa/verifySMSorEmail', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  	const { userId, code } = request.body;
  	if (!userId || !code) {
  		return reply.status(400).send({ error: 'Missing token or secret' });
  	}
	const user = await DB.getUserById(userId);
	if (!user || !user.twoFASecret) {
		return reply.status(403).send({ error: '2FA is not enabled or user not found' });
	}
  	const storedCode = DB.getTwoFASecret(userId);
  	if (storedCode !== code) {
  		return reply.status(403).send({ error: 'Invalid 2FA code' });
  	}
	await DB.enableTwoFASecret(userId);
  	reply.send({ message: '2FA enabled successfully' });
  });

//used to verify a 2FA authentication with QR
  fastify.post('/api/2fa/verifyQRCode', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  	const { userId, code } = request.body;
  	if (!userId || !code) {
  		return reply.status(400).send({ error: 'Missing token or secret' });
  	}
	const user = await DB.getUserById(userId);
	if (!user || !user.twoFASecret) {
		return reply.status(403).send({ error: '2FA is not enabled or user not found' });
	}
  	const verified = speakeasy.totp.verify({
  		secret: user.twoFASecret,
  		encoding: 'base32',
  		token: code,
  	});
  	if (!verified) {
  		return reply.status(403).send({ error: 'Invalid 2FA code' });
  	}
	await DB.enableTwoFASecret(userId);
  	reply.send({ message: '2FA enabled successfully' });
  });

//used to delete a existing 2FA authentication
  fastify.post('/api/2fa/disable', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	const userId = request.user.id;
	const existingUser = DB.getUserById(userId);
	if (!existingUser.twoFASecret || (existingUser.twoFASecret && existingUser.status !== "enabled")) {
		return reply.status(403).send({ error: 'User doesnt have a 2FA to disable' });
	}
	await DB.removeTwoFASecret(userId);
	reply.send({ message: '2FA has been disabled' });
  });
}

module.exports = twoFARoutes;

