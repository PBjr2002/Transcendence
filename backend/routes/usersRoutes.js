import userDB from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import Security from '../other/security.js';
import ValidationUtils from '../other/validation.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { pipeline } from 'stream/promises';

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
		if (!user.success)
			return null;
		return user.user;
	}
	static async checkIfUsernameExists(username, excludeId = null) {
		const existingUser = await userDB.getUserByName(username);
		if (!existingUser.success)
			return { isValid: true };
		if (excludeId && existingUser.user.id === excludeId)
			return { isValid: true };
		return { isValid: false, error: "Username already exists" };
	}
	static async checkIfEmailExists(email, excludeId = null) {
		const existingUser = await userDB.checkIfEmailIsUsed(email);
		if (!existingUser.success)
			return { isValid: true };
		if (excludeId && existingUser.user.id === excludeId)
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
			if (!users.success)
				return BaseRoute.handleError(reply, null, users.errorMsg, users.status);
			const safeUsers = UserSecurity.createSafeUserList(users.users);
			BaseRoute.handleSuccess(reply, safeUsers);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch users.", 500);
		}
  });

//to add a new user
  fastify.post('/api/users',
	BaseRoute.createSchema(null, {
		type: 'object',
		required: ['name', 'email', 'password'],
		properties: {
			name: { type: 'string', minLength: 3 },
			email: { type: 'string', format: 'email' },
			password: { type: 'string', minLength: 6 },
			info: { type: 'string' }
		}
	}),
	async (request, reply) => {
    const { name , email, password, info } = request.body;
	try {
		const cleanName = Security.sanitizeInput(name);
		const cleanInfo = Security.sanitizeInput(info);
		const validationCheck = ValidationUtils.validateUserRegistration({
			name: cleanName,
			email: email,
			password: password,
		});
		if (!validationCheck.isValid)
			return BaseRoute.handleError(reply, null, validationCheck.errors.join(', ', 400));
		const checkForUsername = await UserSecurity.checkIfUsernameExists(cleanName);
		if (!checkForUsername.isValid)
			return BaseRoute.handleError(reply, null, checkForUsername.error, 409);
		const checkForUserEmail = await UserSecurity.checkIfEmailExists(email);
		if (!checkForUserEmail.isValid)
			return BaseRoute.handleError(reply, null, checkForUserEmail.error, 409);
		const result = await userDB.addUser(cleanName, cleanInfo, email, password);
		if (!result.success)
			return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
		BaseRoute.handleSuccess(reply, {
			id: result.newUser.lastInsertRowid
		}, 201);
	}
	catch (err) {
		BaseRoute.handleError(reply, err, "Failed to create user.", 500);
	}
  });

//to delete user
  fastify.delete('/api/users',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.user.id;
			const result = await userDB.removeUser(userId);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, "User Removed.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to delete user.", 409);
		}
  });

//!TESTING ONLY REMOVE LATER
  fastify.delete('/api/users/:id',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const userId = request.params.id;
			const result = await userDB.removeUser(userId);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, "User Removed.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to delete user.", 500);
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
				return BaseRoute.handleError(reply, null, "Invalid Username", 400);
			const user = await userDB.getUserByName(cleanName);
			if (!user.success)
				return BaseRoute.handleError(reply, null, user.errorMsg, user.status);
			const safeUser = UserSecurity.createSafeUser(user.user);
			BaseRoute.handleSuccess(reply, safeUser);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch user.", 500);
		}
  });

//to get a user by its id
  fastify.get('/api/users/id/:id',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema({
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'number' }
		}
	})),
	async (request, reply) => {
		try {
			const id = request.params.id;
			const user = await userDB.getUserById(id);
			if (!user.success)
				return BaseRoute.handleError(reply, null, user.errorMsg, user.status);
			const safeUser = UserSecurity.createSafeUser(user.user);
			BaseRoute.handleSuccess(reply, safeUser);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch user.", 500);
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
			password: { type: 'string' },
			info: { type: 'string' }
		}
	})),
	async (request, reply) => {
    	const id = parseInt(request.params.id);
    	const { name, info, email, password } = request.body;

		try {
			const existingUser = await UserSecurity.checkIfUserExists(id);
			if (!existingUser)
				return BaseRoute.handleError(reply, null, "User not found", 404);
			const cleanName = Security.sanitizeInput(name);
			if (!Security.validateUserName(cleanName))
				return BaseRoute.handleError(reply, null, "Invalid Username", 400);
			const cleanInfo = Security.sanitizeInput(info);
			if (cleanName && cleanName !== existingUser.name) {
				const usernameCheck = await UserSecurity.checkIfUsernameExists(cleanName, id);
				if (!usernameCheck.isValid)
					return BaseRoute.handleError(reply, null, usernameCheck.error, 409);
			}

			if (!Security.validateEmail(email))
				return BaseRoute.handleError(reply, null, "Invalid email", 400);
			if (email && email !== existingUser.email) {
				const emailCheck = await UserSecurity.checkIfEmailExists(email, id);
				if (!emailCheck.isValid)
					return BaseRoute.handleError(reply, null, emailCheck.error, 409);
			}
			const updatedFields = {
    			name: cleanName || existingUser.name,
    			info: cleanInfo || existingUser.info,
    			email: email || existingUser.email,
    		};
			if (password) {
				if (!Security.validatePassword(password))
					return BaseRoute.handleError(reply, null, "Weak password", 400);
				updatedFields.password = await bcrypt.hash(password, 10);
			}
			else
				updatedFields.password = existingUser.password;
			const result = await userDB.updateUser(id, updatedFields);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			const safeUpdatedUser = UserSecurity.createSafeUser({ id, ...updatedFields });
			BaseRoute.handleSuccess(reply, {
				message: "User updated",
				user: safeUpdatedUser
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to update user.", 500);
		}
  });

//used to get the User profile picture
  fastify.get('/api/users/profile_picture',
	BaseRoute.authenticateRoute(fastify),
	async(request, reply) => {
		try {
			const id = request.user.id;
			if (!UserSecurity.checkIfUserExists(id))
				return BaseRoute.handleError(reply, null, "User not found", 404);
			const fileName = userDB.getUserProfilePath(id);
			if (!fileName.success)
				return BaseRoute.handleError(reply, null, fileName.errorMsg, fileName.status);
			const url = `/profile_pictures/${fileName.profile_picture}`;
			BaseRoute.handleSuccess(reply, {
				filename: fileName.profile_picture,
				url: url
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, 'Failed to fetch the user profile picture', 500);
		}
  });

//used to change the User profile picture
  fastify.put('/api/users/:id/profile_picture',
	BaseRoute.authenticateRoute(fastify),
	async(request, reply) => {
		try {
			const id = parseInt(request.params.id, 10);
			if (!request.user || request.user.id !== id)
				return BaseRoute.handleError(reply, null, 'Not allowed', 403);
			const existingUser = await UserSecurity.checkIfUserExists(id);
			if (!existingUser)
				return BaseRoute.handleError(reply, null, 'User not found', 404);
			const file = await request.file();
			if (!file)
				return BaseRoute.handleError(reply, null, 'No file to upload', 400);
			const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
			if (!allowedMimeTypes.includes(file.mimetype))
				return BaseRoute.handleError(reply, null, 'File type not supported', 400);
			const fileExtension = mime.extension(file.mimetype) || 'png';
			const fileName = `user_${id}_${Date.now()}.${fileExtension}`;
			const saveDir = path.join(process.cwd(), 'profile_pictures');
			if (!fs.existsSync(saveDir))
				fs.mkdirSync(saveDir, { recursive: true });
			const saveTo = path.join(saveDir, fileName);
			await pipeline(file.file, fs.createWriteStream(saveTo));
			const previousPicture = existingUser.profile_picture;
			if (previousPicture && !['default.jpg', 'default.png'].includes(previousPicture)) {
				try {
					const oldPath = path.join(saveDir, previousPicture);
					if (fs.existsSync(oldPath))
						fs.unlinkSync(oldPath);
				}
				catch (err) {
					request.log.warn(`Failed to remove old avatar: ${err.message}`);
				}
			}
			const result = await userDB.setUserProfilePath(id, fileName);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, {
				message: 'Profile picture updated',
				filename: fileName,
				url: `/profile_pictures/${fileName}`
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, 'Upload failed', 500);
		}
  });

//used to delete the User profile picture and return to the default one
  fastify.delete('/api/users/:id/profile_picture',
	BaseRoute.authenticateRoute(fastify),
	async(request, reply) => {
		try {
			const id = parseInt(request.params.id, 10);
			if (!request.user || request.user.id !== id)
				return BaseRoute.handleError(reply, null, 'Not allowed', 403);
			const existingUser = await UserSecurity.checkIfUserExists(id);
			if (!existingUser)
				return BaseRoute.handleError(reply, null, 'User not found', 404);
			const previousPicture = existingUser.profile_picture;
			if (previousPicture && !['default.jpg', 'default.png'].includes(previousPicture)) {
				try {
					const saveDir = path.join(process.cwd(), 'profile_pictures');
					const oldPath = path.join(saveDir, previousPicture);
					if (fs.existsSync(oldPath))
						fs.unlinkSync(oldPath);
				}
				catch (err) {
					request.log.warn(`Failed to remove old avatar: ${err.message}`);
				}
			}
			const result = await userDB.setUserProfilePath(id, 'default.jpg');
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, {
				message: 'Profile picture deleted',
				filename: 'default.jpg',
				url: '/profile_pictures/default.jpg'
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, 'Delete Failed', 500);
		}
  });

//used to get the User country
  fastify.get('/api/users/country',
	BaseRoute.authenticateRoute(fastify),
	async(request, reply) => {
		try {
			const id = request.user.id;
			if (!UserSecurity.checkIfUserExists(id))
				return BaseRoute.handleError(reply, null, "User not found", 404);
			const country = await userDB.getUserCountry();
			if (!country.success)
				return BaseRoute.handleError(reply, null, country.errorMsg, country.status);
			BaseRoute.handleSuccess(reply, country.country);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch User country", 500);
		}
  });

//used to update the User country
  fastify.post('/api/users/country',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['country'],
		properties: {
			country: { type: 'string' }
		}
	})),
	async(request, reply) => {
		try {
			const id = request.user.id;
			if (!UserSecurity.checkIfUserExists(id))
				return BaseRoute.handleError(reply, null, "User not found", 404);
			const country = request.body;
			const cleanCountry = Security.sanitizeInput(country);
			const result = await userDB.setUserCountry(id, cleanCountry);
			if (!result.success)
				return BaseRoute.handleError(reply, null, result.errorMsg, result.status);
			BaseRoute.handleSuccess(reply, {
				message: 'Country Updated',
				newCountry: cleanCountry
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to update User country", 500);
		}
  });

//used to get all the information to the Game screen
  fastify.get('/api/users/gameScreen',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		try {
			const id = request.user.id;
			if (!UserSecurity.checkIfUserExists(id))
				return BaseRoute.handleError(reply, null, "User not found", 404);
			const user = await userDB.getUserById(id);
			if (!user.success)
				return BaseRoute.handleError(reply, null, user.errorMsg, user.status);
			const winRatio = userDB.getUserWinrate(id);
			if (!winRatio.success)
				return BaseRoute.handleError(reply, null, winRatio.errorMsg, winRatio.status);
			BaseRoute.handleSuccess(reply, {
				id: user.user.id,
				name: user.user.name,
				profile_picture: user.user.profile_picture,
				wins: user.user.wins,
				defeats: user.user.defeats,
				win_ratio: winRatio.winrate,
				country: user.user.country
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch User information", 500);
		}
  });

//used to check the type of user
  fastify.get('/api/me',
	async (request, reply) => {
		try {
			if (request.cookies && request.cookies.authToken) {
				BaseRoute.authenticateRoute(fastify);
				const user = await userDB.getUserById(request.cookies.userId);
				if (user.success) {
					const safeUser = UserSecurity.createSafeUser(user.user);
					return BaseRoute.handleSuccess(reply, {
						authenticated: true,
						safeUser
					});
				}
			}
			if (request.cookies && request.cookies.userId) {
				const userId = parseInt(request.cookies.userId, 10);
				if (!Number.isNaN(userId)) {
					const user = await userDB.getUserById(userId);
					if (user.success) {
						const safeUser = UserSecurity.createSafeUser(user.user);
						return BaseRoute.handleSuccess(reply, {
							authenticated: false,
							safeUser
						});
					}
				}
			}
			const guest = Security.getGuestSessionFromRequest(request);
			BaseRoute.handleSuccess(reply, {
				authenticated: false,
				guest
			});
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch user info", 500);
		}
  });
}

export default users;
