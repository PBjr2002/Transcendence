import qrcode from 'qrcode';
import DB from '../database/users.js';
import twoFA from '../database/twoFA.js';
import speakeasy from 'speakeasy';
import utils from './utilsRoutes.js';
import BaseRoute from '../other/BaseRoutes.js';

class TwoFASecurity {
	static async checkIf2FAEnabled(userId) {
		const existingTwoFa = await twoFA.getTwoFaById(userId);
		return existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "enabled";
	}
	static async checkIf2FAPending(userId) {
		const existingTwoFa = await twoFA.getTwoFaById(userId);
		return existingTwoFa && existingTwoFa.twoFASecret && existingTwoFa.status === "pending";
	}
	static async cleanPending2FA(userId) {
		if (await this.checkIf2FAPending(userId))
			await twoFA.deleteTwoFa(userId);
	}
	static validateOTPCode(existingTwoFa, code) {
		const actualDate = Date.now();
		if (existingTwoFa.twoFASecret !== code)
			return { valid: false, reason: "Invalid 2FA code" };
		if (actualDate > existingTwoFa.expireDate)
			return { valid: false, reason: "2FA code expired" };
		return { valid: true };
	}
}

function twoFARoutes(fastify, options) {
//used to check if the user has already 2fa enabled
  fastify.get('/api/2fa/checkFor2FA',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			if (await TwoFASecurity.checkIf2FAEnabled(userId))
				return BaseRoute.handleError(reply, "2FA is already enabled for this account", 400);
			BaseRoute.handleSuccess(reply, "2FA not enabled");
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to generate a new 2FA authentication QR code
  fastify.get('/api/2fa/generateQR',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			if (await TwoFASecurity.checkIf2FAEnabled(userId))
				return BaseRoute.handleError(reply, "2FA is already enabled for this account", 400);
			await TwoFASecurity.cleanPending2FA(userId);
  			const secret = speakeasy.generateSecret({
  				name: `Transcendence (${existingUser.email})`,
  			});
			await twoFA.setNewTwoFaSecret(secret.base32, 'QR', existingUser.id);
  			const qrCodeImageUrl = await qrcode.toDataURL(secret.otpauth_url);
			BaseRoute.handleSuccess(reply, {
				message: '2FA secret generated',
  				secret: secret.base32,
  				qrCodeImageUrl,
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to generate a new 2FA authentication SMS code
  fastify.post('/api/2fa/generateSMS',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['contact'],
		properties: {
			contact: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const { contact } = request.body;
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			if (await TwoFASecurity.checkIf2FAEnabled(userId))
				return BaseRoute.handleError(reply, "2FA is already enabled for this account", 400);
			await TwoFASecurity.cleanPending2FA(userId);
			await DB.setPhoneNumber(existingUser.id, contact);
			const OTP = utils.generateOTP();
			await twoFA.setNewTwoFaSecret(OTP, 'SMS', existingUser.id);
			const verification = await utils.sendSMS(contact, OTP);
			if (!verification)
				return BaseRoute.handleError(reply, "Error sending the SMS", 400);
			BaseRoute.handleSuccess(reply, "SMS code sent");
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to generate a new 2FA authentication Email code
  fastify.post('/api/2fa/generateEmail',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['email'],
		properties: {
			email: { type: 'string', format: 'email' }
		}
	})),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const { email } = request.body;
			const existingUser = await DB.getUserById(userId);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			if (await TwoFASecurity.checkIf2FAEnabled(userId))
				return BaseRoute.handleError(reply, "2FA is already enabled for this account", 400);
			await TwoFASecurity.cleanPending2FA(userId);
			const OTP = utils.generateOTP();
			await twoFA.setNewTwoFaSecret(OTP, 'EMAIL', existingUser.id);
			const verification = await utils.sendEmail(email, OTP);
			if (!verification)
				return BaseRoute.handleError(reply, "Error sending the Email", 400);
			BaseRoute.handleSuccess(reply, "Email code sent");
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to verify a 2FA authentication with SMS or Email
  fastify.post('/api/2fa/verifySMSorEmail',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['userId', 'code'],
		properties: {
			userId: { type: 'integer' },
			code: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const { userId, code } = request.body;
			const user = await DB.getUserById(userId);
			if (!user)
				return BaseRoute.handleError(reply, "User not found", 404);
			const existingTwoFa = await twoFA.getTwoFaById(userId);
			if (!existingTwoFa)
				return BaseRoute.handleError(reply, "2FA is not enabled", 403);
			const validation = TwoFASecurity.validateOTPCode(existingTwoFa, code);
			if (!validation.valid)
				return BaseRoute.handleError(reply, validation.reason, 403);
			await twoFA.storeHashedTwoFaSecret(user.id);
			await twoFA.enableTwoFa(user.id);
			BaseRoute.handleSuccess(reply, "2FA enabled successfully");
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to verify a 2FA authentication with QR
  fastify.post('/api/2fa/verifyQRCode',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['userId', 'code'],
		properties: {
			userId: { type: 'integer' },
			code: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const { userId, code } = request.body;
			const user = await DB.getUserById(userId);
			if (!user)
				return BaseRoute.handleError(reply, "User not found", 404);
			const existingTwoFa = await twoFA.getTwoFaById(userId);
			if (!existingTwoFa)
				return BaseRoute.handleError(reply, "2FA is not enabled", 403);
			const verified = speakeasy.totp.verify({
				secret: existingTwoFa.twoFASecret,
				encoding: 'base32',
				token: code,
			});
  			if (!verified)
				return BaseRoute.handleError(reply, "Invalid 2FA code", 403);
			await twoFA.enableTwoFa(userId);
			BaseRoute.handleSuccess(reply, "2FA enabled successfully");
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });

//used to delete a existing 2FA authentication
  fastify.post('/api/2fa/disable',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const user = await DB.getUserById(userId);
			if (!user)
				return BaseRoute.handleError(reply, "User not found", 404);
			if (!await TwoFASecurity.checkIf2FAEnabled(userId))
				return BaseRoute.handleError(reply, "User doesnt have a 2FA to disable", 403);
			await twoFA.deleteTwoFa(userId);
			BaseRoute.handleSuccess(reply, "2FA has been disabled");
		}
		catch (error) {
			BaseRoute.handleError(reply, "Internal server error", 500);
		}
  });
}

export default twoFARoutes;

