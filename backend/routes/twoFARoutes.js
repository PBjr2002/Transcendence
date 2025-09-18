import qrcode from 'qrcode';
import DB from '../database/users.js';
import twoFA from '../database/twoFA.js';
import speakeasy from 'speakeasy';
import utils from './utilsRoutes.js';

function twoFARoutes(fastify, options) {
//used to check if the user has already 2fa enabled
  fastify.get('/api/2fa/checkFor2FA', { onRequest: [fastify.authenticate] }, async (request, reply) => {
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
		const existingTwoFa = await twoFA.getTwoFaById(user.id);
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
		return reply.send({ message: '2FA not enabled' });
	}
	catch (error) {
		console.error('Error in /api/2fa/checkFor2FA:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });

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
		const existingTwoFa = await twoFA.getTwoFaById(user.id);
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "pending") {
			await twoFA.deleteTwoFa(existingUser.id);
		}
  		const secret = speakeasy.generateSecret({
  			name: `Transcendence (${existingUser.email})`,
  		});
		await twoFA.setNewTwoFaSecret(secret.base32, 'QR', existingUser.id);
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
		const existingTwoFa = await twoFA.getTwoFaById(user.id);
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "pending") {
			await twoFA.deleteTwoFa(existingUser.id);
		}
		const { contact } = request.body;
		if (!contact) {
			return reply.status(400).send({ error: 'PhoneNumber required' });
		}
		await DB.setPhoneNumber(existingUser.id, contact);
		const OTP = utils.generateOTP();
		await twoFA.setNewTwoFaSecret(OTP, 'SMS', existingUser.id);
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
		const existingTwoFa = await twoFA.getTwoFaById(user.id);
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "enabled") {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
		if (existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "pending") {
			await twoFA.deleteTwoFa(existingUser.id);
		}
		const { email } = request.body;
		if (!email) {
			return reply.status(400).send({ error: 'Email required' });
		}
		const OTP = utils.generateOTP();
		await twoFA.setNewTwoFaSecret(OTP, 'EMAIL', existingUser.id);
		const verification = await utils.sendEmail(email, OTP);
		if (!verification)
			return reply.status(400).send({ error: 'Error sending the Email' });
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
	const existingTwoFa = await twoFA.getTwoFaById(userId);
	const user = await DB.getUserById(userId);
	if (!user || !existingTwoFa) {
		return reply.status(403).send({ error: '2FA is not enabled or user not found' });
	}
	const actualDate = Date.now();
	if (existingTwoFa.twoFASecret === code && actualDate > existingTwoFa.expireDate) {
  		return reply.status(403).send({ error: "2FA Code Expired" });
  	}
	if (existingTwoFa.twoFASecret !== code) {
		return reply.status(403).send({ error: 'Invalid 2FA code' });
	}
	await twoFA.storeHashedTwoFaSecret(user.id);
	await twoFA.enableTwoFa(user.id);
  	reply.send({ message: '2FA enabled successfully' });
  });

//used to verify a 2FA authentication with QR
  fastify.post('/api/2fa/verifyQRCode', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  	const { userId, code } = request.body;
  	if (!userId || !code) {
  		return reply.status(400).send({ error: 'Missing token or secret' });
  	}
	const user = await DB.getUserById(userId);
	if (!user) {
		return reply.status(403).send({ error: 'User not found' });
	}
	const existingTwoFa = twoFA.getTwoFaById(userId);
	if (!existingTwoFa) {
		return reply.status(403).send({ error: '2FA is not enabled' });
	}
  	const verified = speakeasy.totp.verify({
		secret: existingTwoFa.twoFASecret,
		encoding: 'base32',
		token: code,
	});
  	if (!verified) {
  		return reply.status(403).send({ error: 'Invalid 2FA code' });
  	}
	await twoFA.enableTwoFa(userId);
  	reply.send({ message: '2FA enabled successfully' });
  });

//used to delete a existing 2FA authentication
  fastify.post('/api/2fa/disable', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	const userId = request.user.id;
	const existingTwoFa = twoFA.getTwoFaById(userId);
	if (!existingTwoFa || (existingTwoFa && existingTwoFa.status !== "enabled")) {
		return reply.status(403).send({ error: 'User doesnt have a 2FA to disable' });
	}
	await twoFA.deleteTwoFa(userId);
	reply.send({ message: '2FA has been disabled' });
  });
}

export default twoFARoutes;

