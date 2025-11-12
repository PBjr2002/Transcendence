import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import xss from 'xss';
import validator from 'validator';

class Security {
	static rateLimitConfig = {
		max: 100,
		timeWindow: '15 minutes',
		errorResponseBuilder: function (request, context) {
			return {
				error: 'Too many requests',
				message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
				statusCode: 429,
				timeWindow: context.timeWindow,
				limit: context.max
			};
		}
	};
	static authRateLimitConfig = {
		max: 5,
		timeWindow: '15 minutes',
		keyGenerator: function (request) {
			return request.ip + ':auth';
		},
		errorResponseBuilder: function (request, context) {
			return {
				success: false,
				error: {
					message: 'Too many authentication attempts',
					statusCode: 429,
					retryAfter: Math.round(context.ttl / 1000),
					details: 'Please wait before trying to login again'
				}
			};
		}
	};
	static sanitizeInput(input) {
		if (typeof input !== 'string')
			return input;
		return xss(input, {
			whiteList: {},
			stripIgnoreTag: true,
			stripIgnoreTagBody: ['script', 'style']
		});
	}
	static sanitizeObject(obj) {
		for (const key in obj) {
			if (typeof obj[key] === 'string')
				obj[key] = Security.sanitizeInput(obj[key]);
			else if (Array.isArray(obj[key])) {
				obj[key].forEach((item, index) => {
					if (typeof item === 'string')
						obj[key][index] = Security.sanitizeInput(item);
					else if (typeof item === 'object' && item !== null)
						Security.sanitizeObject(item);
				});
			}
			else if (typeof obj[key] === 'object' && obj[key] !== null)
				Security.sanitizeObject(obj[key]);
		}
	}
	static createSanitizeHook() {
		return async function (request, reply) {
			if (request.body && typeof request.body === 'object')
				Security.sanitizeObject(request.body);
		};
	}
	static helmetConfig = {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", "data:", "https:"],
				connectSrc: ["'self'", "wss:", "ws:"],
				fontSrc: ["'self'"],
				objectSrc: ["'none'"],
				mediaSrc: ["'self'"],
				frameSrc: ["'none'"],
			},
		},
		crossOriginEmbedderPolicy: false,
		hsts: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true
		}
	};
	static validateEmail(email) {
		return validator.isEmail(email);
	}
	static validatePhoneNumber(phoneNumber) {
		return validator.isMobilePhone(phoneNumber, 'any', { strictMode: false });
	}
	static validateUserName(username) {
		if (!username || typeof username !== 'string')
			return false;
		return validator.isLength(username, { min: 3, max: 20 }) && validator.matches(username, /^[a-zA-Z0-9_-]+$/);
	}
	static validatePassword(password) {
		if (!password || typeof password !== 'string')
			return false;
		return validator.isStrongPassword(password, {
			minLength: 8,
			maxLength: 25,
			minLowercase: 1,
			minUppercase: 1,
			minNumbers: 1,
			minSymbols: 0
		});
	}
	static validateURl(url) {
		return validator.isURL(url);
	}
	static escapeHTML(text) {
		return validator.escape(text);
	}
	static generateGuestSession() {
		const temporaryId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const defaultAlias = `Guest_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
		const profileImage = "/profile_pictures/default.jpg";
		const winRatio = "420%";
		const country = "Wakanda";
		return {
			id: temporaryId,
			alias: defaultAlias,
			profile_image: profileImage,
			win_ratio: winRatio,
			country: country,
			createdAt: Date.now()
		};
	}
	static getGuestSessionFromRequest(request) {
		try {
			if (request && request.guestSession)
				return request.guestSession;
			const guestSessionCookie = request.cookies.guestSession;
			if (guestSessionCookie)
				return JSON.parse(guestSessionCookie);
		}
		catch (error) {
			console.error('Error parsing guest session:', error);
		}
		return null;
	}
	static updateGuestSessionAlias(request, reply, newAlias) {
		const currentSession = Security.getGuestSessionFromRequest(request);
		if (!currentSession)
			return false;
		if (!Security.validateUserName(newAlias))
			return false;
		const updatedSession = {
			...currentSession,
			alias: newAlias
		}
		reply.setCookie('guestSession', JSON.stringify(updatedSession), {
			secure: true,
			sameSite: 'strict',
			maxAge: 3600000,
			path: '/'
		});
		request.guestSession = updatedSession;
		request.cookies.guestSession = JSON.stringify(updatedSession);
		return true;
	}
	static createSecurityHook() {
		return async function (request, reply) {
			const userAgent = request.headers['user-agent'] || 'unknown';
			const suspicious = [
				'sqlmap', 'nmap', 'nikto', 'burp', 'postman',
				'curl', 'wget', 'python-request'
			];
			if (suspicious.some(tool => userAgent.toLowerCase().includes(tool)))
				console.warn(`[SECURITY] Suspicious request from ${request.ip}: ${userAgent}`);
		};
	}
	static createTemporaryUserHook() {
		return async (request, reply) => {
			if (!request.cookies.authToken && !request.cookies.guestSession) {
				const guestSession = Security.generateGuestSession();
				reply.setCookie('guestSession', JSON.stringify(guestSession), {
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000,
					path: '/'
				});
				request.guestSession = guestSession;
				request.cookies.guestSession = JSON.stringify(guestSession);
			}
		};
	}
}

export default Security;
