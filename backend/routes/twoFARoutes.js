const qrcode = require('qrcode');
const DB = require('../database/users');
const speakeasy = require('speakeasy');

function twoFARoutes(fastify, options) {
//used to generate a new 2FA authentication
  fastify.get('/api/2fa/generate', { onRequest: [fastify.authenticate] }, async (request, reply) => {
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
		if (existingUser.twoFASecret) {
			return reply.status(400).send({ error: '2FA is already enabled for this account' });
		}
  		const secret = speakeasy.generateSecret({
  			name: `MyApp (${existingUser.email})`,
  		});
		await DB.setTwoFASecret(existingUser.id, secret.base32);
  		const qrCodeImageUrl = await qrcode.toDataURL(secret.otpauth_url);
  		reply.send({
  			message: '2FA secret generated',
  			secret: secret.base32,
  			qrCodeImageUrl,
  		});
	}
	catch (error) {
		console.error('Error in /api/2fa/generate:', error);
		return reply.status(500).send({ error: 'Internal server error' });
	}
  });

//used to verify a 2FA authentication
  fastify.post('/api/2fa/verify', { onRequest: [fastify.authenticate] }, async (request, reply) => {
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
		window: 1,
  	});
  	if (!verified) {
  		return reply.status(403).send({ error: 'Invalid 2FA token' });
  	}
  	reply.send({ message: '2FA enabled successfully' });
  });

//used to delete a existing 2FA authentication
  fastify.post('/api/2fa/disable', { onRequest: [fastify.authenticate] }, async (request, reply) => {
	const userId = request.user.id;
	await DB.removeTwoFASecret(userId);
	reply.send({ message: '2FA has been disabled' });
  });
}

module.exports = twoFARoutes;

