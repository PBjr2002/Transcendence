import Security from "./security.js";

class ValidationUtils {
	static validateUserRegistration(userData) {
		const errors = [];
		if (!userData.name)
			errors.push('Username is required');
		else if (!Security.validateUserName(userData.name))
			errors.push('Username must be 3-20 characters, alphanumeric only (underscore and hyphen allowed)');

		if (!userData.email)
			errors.push('Email is required');
		else if (!Security.validateEmail(userData.email))
			errors.push('Invalid email');

		if (!userData.password)
			errors.push('Password is required');
		else if (!Security.validatePassword(userData.password))
			errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');

		return {
			isValid: errors.length === 0,
			errors
		}; 
	}
	static validateMessage(text) {
		const errors = [];
		if (!text)
			errors.push('Message text is required');
		else if (typeof text !== 'string')
			errors.push('Message must be text');
		else if (text.trim().length === 0)
			errors.push('Message cannot be empty');
		else if (text.length > 1000)
			errors.push('Message too long');

		return {
			isValid: errors.length === 0,
			errors
		};
	}
	static validate2FACode(code) {
		const errors = [];
		if (!code)
			errors.push('2FA code is required');
		else if (!/^\d{6}$/.test(code))
			errors.push('2FA code must be 6 digits');

		return {
			isValid: errors.length === 0,
			errors
		};
	}
	static validatePagination(page = 1, limit = 10) {
		const pageNumber = Math.max(1, parseInt(page) || 1);
		const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));
		return {
			page: pageNumber,
			limit: limitNumber,
			offset: (pageNumber - 1) * limitNumber
		};
	}
	static validateUserId(userId) {
		const id = parseInt(userId);
		return {
			isValid: !isNaN(id) && id > 0,
			id: id
		};
	}
	static validateFriendRequest(addressee_id) {
		const errors = [];
		const userValidation = ValidationUtils.validateUserId(addressee_id);
		if (!userValidation.isValid)
			errors.push('Invalid friend ID');
		return {
			isValid: errors.length === 0,
			errors
		};
	}
	static validateChatRoom(data) {
		const errors = [];

		if (!data.userId1 || !data.userId2)
			errors.push('Both user IDs are required');
		else {
			const user1Validation = ValidationUtils.validateUserId(data.userId1);
			const user2Validation = ValidationUtils.validateUserId(data.userId2);
			if (!user1Validation.isValid)
				errors.push('Invalid UserId1');
			else if (!user2Validation.isValid)
				errors.push('Invalid UserId2');
			else if (data.userId1 === data.userId2)
				errors.push('Cannot create chat room with yourself');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}

export default ValidationUtils;
