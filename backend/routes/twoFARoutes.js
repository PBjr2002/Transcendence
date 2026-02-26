import qrcode from 'qrcode';
import DB from '../database/users.js';
import twoFA from '../database/twoFA.js';
import speakeasy from 'speakeasy';
import utils from './utilsRoutes.js';
import BaseRoute from '../other/BaseRoutes.js';
import ValidationUtils from '../other/validation.js';

class TwoFASecurity {
	static async checkIf2FAEnabled(userId) {
		const existingTwoFa = await twoFA.getTwoFaById(userId);
		if (!existingTwoFa.success)
			return null;
		return existingTwoFa.twoFa && existingTwoFa.twoFa.twoFASecret && existingTwoFa.twoFa.status === "enabled";
	}
	static async checkIf2FAPending(userId) {
		const existingTwoFa = await twoFA.getTwoFaById(userId);
		if (!existingTwoFa.success)
			return null;
		return existingTwoFa.twoFa && existingTwoFa.twoFa.twoFASecret && existingTwoFa.twoFa.status === "pending";
	}
	static async cleanPending2FA(userId) {
		if (await this.checkIf2FAPending(userId)) {
			const response = await twoFA.deleteTwoFa(userId);
			if (!response.success)
				return null;
		}
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
			if (!existingUser.success)
				return BaseRoute.handleError(reply, null, existingUser.errorMsg, existingUser.status);
			if (await TwoFASecurity.checkIf2FAEnabled(userId)) {
				return reply.status(200).send({
					success: false,
					error: "2FA is already enabled for this account"
				});
			}
			BaseRoute.handleSuccess(reply, "2FA not enabled");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to check if 2FA is active", 500);
		}
  });

//used to generate a new 2FA authentication QR code
  fastify.get('/api/2fa/generateQR',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const existingUser = await DB.getUserById(userId);
			if (!existingUser.success)
				return BaseRoute.handleError(reply, null, existingUser.errorMsg, existingUser.status);
			if (await TwoFASecurity.checkIf2FAEnabled(userId)) {
				return reply.status(200).send({
					success: false,
					error: "2FA is already enabled for this account"
				});
			}
			await TwoFASecurity.cleanPending2FA(userId);
  			const secret = speakeasy.generateSecret({
  				name: `Transcendence (${existingUser.user.email})`,
  			});
			const response = await twoFA.setNewTwoFaSecret(secret.base32, existingUser.user.id);
			if (!response.success)
				return BaseRoute.handleError(reply, null, response.errorMsg, response.status);
  			const qrCodeImageUrl = await qrcode.toDataURL(secret.otpauth_url);
			BaseRoute.handleSuccess(reply, {
				message: '2FA secret generated',
  				secret: secret.base32,
  				qrCodeImageUrl,
			}, 201);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to generate a QR", 500);
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
			if (!user.success)
				return BaseRoute.handleError(reply, null, user.errorMsg, user.status);
			const existingTwoFa = await twoFA.getTwoFaById(userId);
			if (!existingTwoFa.success)
				return BaseRoute.handleError(reply, null, existingTwoFa.errorMsg, existingTwoFa.status);
			const verified = speakeasy.totp.verify({
				secret: existingTwoFa.twoFa.twoFASecret,
				encoding: 'base32',
				token: code,
			});
  			if (!verified)
				return BaseRoute.handleError(reply, null, "Invalid 2FA code", 403);
			const enabled = await twoFA.enableTwoFa(userId);
			if (!enabled.success)
				return BaseRoute.handleError(reply, enabled.errorMsg, enabled.status);
			BaseRoute.handleSuccess(reply, "2FA enabled successfully");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to verify QR code", 500);
		}
  });

//used to delete a existing 2FA authentication
  fastify.post('/api/2fa/disable',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const user = await DB.getUserById(userId);
			if (!user.success)
				return BaseRoute.handleError(reply, null, user.errorMsg, user.status);
			if (!await TwoFASecurity.checkIf2FAEnabled(userId))
				return BaseRoute.handleError(reply, null, "User doesnt have a 2FA to disable", 403);
			const response = await twoFA.deleteTwoFa(userId);
			if (!response.success)
				return BaseRoute.handleError(reply, null, response.errorMsg, response.status);
			BaseRoute.handleSuccess(reply, "2FA has been disabled");
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Failed to disable 2FA", 500);
		}
  });
}

export default twoFARoutes;

