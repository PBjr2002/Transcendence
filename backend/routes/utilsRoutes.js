import DB from '../database/users.js';
import twoFa from '../database/twoFA.js';
import speakeasy from 'speakeasy';
import BaseRoute from '../other/BaseRoutes.js';
import Security from '../other/security.js';
import messages from '../database/messages.js';

class AuthSecurity {
	static generateAuthToken(fastify, user) {
		return fastify.jwt.sign({
			id: user.id,
			name: user.name,
			email: user.email
		});
	}
}

function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getBrowserLanguage(request) {
	const browserLang = request.headers['accept-language'];
	if (browserLang.startsWith('pt'))
		return 'pt';
	else if (browserLang.startsWith('de'))
		return 'de';
	else if (browserLang.startsWith('no') || browserLang.startsWith('nb') || browserLang.startsWith('nn'))
		return 'no';
  	else if (browserLang.startsWith('ja'))
		return 'ja';
  	else if (browserLang.startsWith('wo'))
		return 'wo';
	return ('en');
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
			BaseRoute.handleError(reply, error, "Failed to get Server info", 500);
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
			const cleanEmailOrUser = Security.sanitizeInput(emailOrUser);
			if (cleanEmailOrUser.includes('@') && !Security.validateEmail(cleanEmailOrUser))
				return BaseRoute.handleError(reply, null, "Invalid email", 400);
			else if (!Security.validateUserName(cleanEmailOrUser))
				return BaseRoute.handleError(reply, null, "Invalid Username", 400);
			const existingUser = await DB.getUserByEmailOrUser(cleanEmailOrUser, password);
			if (!existingUser.success)
				return BaseRoute.handleError(reply, null, "Invalid Email or Password", 401);
			const online = DB.isUserAlreadyOnline(existingUser.user.id);
			if (!online.success)
				return BaseRoute.handleError(reply, null, online.errorMsg, online.status);
			if (online.online)
				return BaseRoute.handleError(reply, null, "User already logged somewhere", 401);
			const existingTwoFa = await twoFa.getTwoFaById(existingUser.user.id);
			if (!existingTwoFa.success || (existingTwoFa.twoFa && existingTwoFa.twoFa.status !== "enabled")) {
				const token = AuthSecurity.generateAuthToken(fastify, existingUser.user);
				const result = await DB.loginUser(existingUser.user.name);
				if (!result.success)
					return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
				delete existingUser.user.password;
				reply.clearCookie('guestSession', {
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000,
					path: '/'
				});
				reply.setCookie('authToken', token, {
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000,
					path: '/'
				});
				reply.setCookie('userId', existingUser.user.id.toString(), {
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000,
					path: '/'
				});
				BaseRoute.handleSuccess(reply, {
					message: "Login successful",
					existingUser: existingUser.user
				});
			}
			else {
				delete existingUser.user.password;
				BaseRoute.handleSuccess(reply, {
					message: "2FA required",
					existingUser: existingUser.user
				});
			}
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Login failed", 500);
		}
  });

//both functions used to check the 2FA code after login
  fastify.post('/api/login/2fa',
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
			if (!existingTwoFa.success)
				return BaseRoute.handleError(reply, null, existingTwoFa.errorMsg, existingTwoFa.status);
			const verified = speakeasy.totp.verify({
				secret: existingTwoFa.twoFa.twoFASecret,
				encoding: 'base32',
				token: twoFAcode,
				window: 1,
			});
			if (!verified)
				return BaseRoute.handleError(reply, null, "Invalid 2FA code", 403);
			const existingUser = await DB.getUserById(userId);
			if (!existingUser.success)
				return BaseRoute.handleError(reply, null, existingUser.errorMsg, existingUser.status);
			const token = AuthSecurity.generateAuthToken(fastify, existingUser.user);
			const result = await DB.loginUser(existingUser.user.name);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			delete existingUser.user.password;
			delete existingUser.user.twoFASecret;
			reply.clearCookie('guestSession', {
				secure: true,
				sameSite: 'strict',
				maxAge: 3600000,
				path: '/'
			});
			reply.setCookie('authToken', token, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 3600000,
				path: '/'
			});
			reply.setCookie('userId', existingUser.user.id.toString(), {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 3600000,
				path: '/'
			});
			BaseRoute.handleSuccess(reply, {
				message: "Login successful",
				existingUser: existingUser.user
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "2FA verification failed", 500);
		}
  });

//used to logout a user
  fastify.post('/api/logout',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const username = request.user.name;
			const result = await DB.logoutUser(username);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			reply.clearCookie('authToken', {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				path: '/'
			});
			reply.clearCookie('userId', {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				path: '/'
			});
			BaseRoute.handleSuccess(reply, {
				message: "Logout successful",
				username
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Logout failed", 500);
		}
  });

//used to initialize a Guest User
  fastify.get('/api/init', 
	async(request, reply) => {
		try {
			BaseRoute.handleSuccess(reply, {
				messages: "User initialized",
				hasAuth: !!request.cookies.authToken,
				hasTemp: !!Security.getGuestSessionFromRequest(request)
			}, 201);
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Initialization failed", 500);
		}
	});

//used to update the alias of a Guest user
  fastify.put('/api/guest/alias',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['alias'],
		properties: {
			alias: { type: 'string' }
		}
	}),
	async (request, reply) => {
		try {
			const { alias } = request.body;
			if (request.cookies.authToken)
				return BaseRoute.handleError(reply, null, "Not a Guest User", 400);
			if (!Security.validateUserName(alias))
				return BaseRoute.handleError(reply, null, "Invalid Username", 400);
			if (!Security.updateGuestSessionAlias(request, reply, alias))
				return BaseRoute.handleError(reply, null, "Failed to update alias", 400);
			BaseRoute.handleSuccess(reply, {
				message: "Alias updated",
				alias
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Modification of alias failed", 500);
		}
	}
  );

//used to get the alias of a Guest user
  fastify.get('/api/guest/info',
	async (request, reply) => {
		try {
			if (request.cookies.authToken)
				return BaseRoute.handleError(reply, null, "Not a Guest User", 400);
			const currentSession = Security.getGuestSessionFromRequest(request);
			if (!currentSession)
				return BaseRoute.handleError(reply, null, "Error fetching the current session", 400);
			BaseRoute.handleSuccess(reply, {
				message: "Guest User info",
				currentSession: currentSession
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Error fetching the guest information", 500);
		}
	}
  );

//used to get the actual language
  fastify.get('/api/lang', 
	async (request, reply) => {
		try {
			if (!request.cookies || (request.cookies && !request.cookies.app_language)) {
				const languageCode = await getBrowserLanguage(request);
				reply.setCookie('app_language', languageCode, {
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000,
					path: '/'
				});
				return BaseRoute.handleSuccess(reply, {
					app_language: languageCode
				}, 201);
			}
			const language = request.cookies.app_language;
			BaseRoute.handleSuccess(reply, {
				app_language: language
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Error fetching the language selected", 500);
		}
  });

//used to change the language of the website
  fastify.post('/api/lang',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['newLanguage'],
		properties: {
			newLanguage: { type: 'string' }
		}
	}),
	async (request, reply) => {
		try {
			const { newLanguage } = request.body;
			reply.setCookie('app_language', newLanguage, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 3600000,
				path: '/'
			});
			BaseRoute.handleSuccess(reply, {
				app_language: newLanguage
			});
		}
		catch (error) {
			BaseRoute.handleError(reply, error, "Error changing the language", 500);
		}
  });
}

export { generateOTP };

export default utils;
