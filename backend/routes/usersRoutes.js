import userDB from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import Security from '../other/security.js';
import ValidationUtils from '../other/validation.js';

class UserSecurity {
	static createSafeUser(user) {
		if (!user)
			return null;
		const { password, twoFASecret, ...safeUser } = user;
		return safeUser;
	}
	static createSafeUserList(users) {
		return users.map(user => this.createSafeUser(user));
	}
	static async checkIfUserExists(userId) {
		const user = await userDB.getUserById(userId);
		return user ? user : null;
	}
	static async checkIfUsernameExists(username, excludeId = null) {
		const existingUser = await userDB.getUserByName(username);
		if (!existingUser)
			return { isValid: true };
		if (excludeId && existingUser.id === excludeId)
			return { isValid: true };
		return { isValid: false, error: "Username already exists" };
	}
	static async checkIfEmailExists(email, excludeId = null) {
		const existingUser = await userDB.checkIfEmailIsUsed(email);
		if (!existingUser)
			return { isValid: true };
		if (excludeId && existingUser.id === excludeId)
			return { isValid: true };
		return { isValid: false, error: "Email already being used" };
	}
}

function users(fastify, options) {
//to get all the users
  fastify.get('/api/users',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const users = await userDB.getAllUsers();
			const safeUsers = UserSecurity.createSafeUserList(users);
			BaseRoute.handleSuccess(reply, safeUsers);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch users.", 500);
		}
  });

//to add a new user
  fastify.post('/api/users',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['name', 'email', 'password'],
		properties: {
			name: { type: 'string', minLength: 3 },
			email: { type: 'string', format: 'email' },
			password: { type: 'string', minLength: 6 },
			info: { type: 'string' }
		}
	})),
	async (request, reply) => {
    const { name, info , email, password } = request.body;
	try {
		const cleanName = Security.sanitizeInput(name);
		const cleanInfo = Security.sanitizeInput(info);
		const validationCheck = ValidationUtils.validateUserRegistration({
			name: cleanName,
			email: email,
			password: password,
			phoneNumber: null
		});
		if (!validationCheck.isValid)
			return BaseRoute.handleError(reply, validationCheck.errors.join(', ', 400));
		const checkForUsername = await UserSecurity.checkIfUsernameExists(cleanName);
		if (!checkForUsername.isValid)
			return BaseRoute.handleError(reply, checkForUsername.error, 409);
		const checkForUserEmail = await UserSecurity.checkIfEmailExists(email);
		if (!checkForUserEmail.isValid)
			return BaseRoute.handleError(reply, checkForUserEmail.error, 409);
		const result = await userDB.addUser(cleanName, cleanInfo, email, password);
		return BaseRoute.handleSuccess(reply, { id: result.lastInsertRowid }, 201);
	}
	catch (err) {
		BaseRoute.handleError(reply, "Failed to create user.", 500);
	}
  });

  fastify.delete('/api/users',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			await userDB.removeUser(userId);
			BaseRoute.handleSuccess(reply, "User Removed.", 201);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to delete user.", 500);
		}
  });

//to get a user by its name
  fastify.get('/api/users/name/:name',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['name'],
		properties: {
			name: { type: 'string' }
		}
	})),
	async (request, reply) => {
		try {
			const cleanName = Security.sanitizeInput(request.params.name);
			if (!Security.validateUserName(cleanName))
				return BaseRoute.handleError(reply, "Invalid Username", 400);
			const user = await userDB.getUserByName(cleanName);
			if (!user)
				return BaseRoute.handleError(reply, "User not found", 404);
			const safeUser = UserSecurity.createSafeUser(user);
			BaseRoute.handleSuccess(reply, safeUser);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch user.", 500);
		}
  });

//to update user information
  fastify.put('/api/users/:id',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'integer' }
		}
	},
	{
		type: 'object',
		properties: {
			name: { type: 'string', minLength: 3 },
			email: { type: 'string', format: 'email' },
			password: { type: 'string', minLength: 6 },
			info: { type: 'string' }
		}
	})),
	async (request, reply) => {
    	const id = parseInt(request.params.id);
    	const { name, info, email, password } = request.body;

		try {
			const existingUser = await UserSecurity.checkIfUserExists(id);
			if (!existingUser)
				return BaseRoute.handleError(reply, "User not found", 404);
			const cleanName = Security.sanitizeInput(name);
			if (!Security.validateUserName(cleanName))
				return BaseRoute.handleError(reply, "Invalid Username", 400);
			const cleanInfo = Security.sanitizeInput(info);
			if (cleanName && cleanName !== existingUser.name) {
				const usernameCheck = await UserSecurity.checkIfUsernameExists(cleanName, id);
				if (!usernameCheck.isValid)
					return BaseRoute.handleError(reply, usernameCheck.error, 409);
			}

			if (!Security.validateEmail(email))
				return BaseRoute.handleError(reply, "Invalid email", 400);
			if (email && email !== existingUser.email) {
				const emailCheck = await UserSecurity.checkIfEmailExists(email, id);
				if (!emailCheck.isValid)
					return BaseRoute.handleError(reply, emailCheck.error, 409);
			}
			const updatedFields = {
    			name: cleanName || existingUser.name,
    			info: cleanInfo || existingUser.info,
    			email: email || existingUser.email,
    		};
			if (!Security.validatePassword(password))
				return BaseRoute.handleError(reply, "Weak password", 400);
			if (password) {
				const bcrypt = require('bcrypt');
      			updatedFields.password = await bcrypt.hash(password, 10);
			}
			else
				updatedFields.password = existingUser.password;
			await userDB.updateUser(id, updatedFields);
			const safeUpdatedUser = UserSecurity.createSafeUser({ id, ...updatedFields });
			BaseRoute.handleSuccess(reply, {
				message: "User updated",
				user: safeUpdatedUser
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to update user.", 500);
		}
  });
}

export default users;
