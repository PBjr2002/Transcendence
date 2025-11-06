import friendsDB from '../database/friends.js';
import { getUserById } from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import ValidationUtils from '../other/validation.js';

class FriendSecurity {
	static getUserNotificationData(userId) {
		const user = getUserById(userId);
		if (user) {
			return {
				id: user.id,
				name: user.name,
				online: user.online
			};
		}
		else
			return null;
	}
}

async function friendsRoutes(fastify, options) {
//used to send friend requests
  fastify.post('/api/friends/request',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['addresseeId'],
		properties: {
			addresseeId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const requesterId = request.user.id;
		const { addresseeId } = request.body;
		const idValidation = ValidationUtils.validateUserId(addresseeId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, "Invalid user ID format", 400);
		const requestValidationCheck = ValidationUtils.validateFriendRequest(addresseeId );
		if (!requestValidationCheck.isValid)
			return BaseRoute.handleError(reply, requestValidationCheck.errors.join(', '), 400);
		try {
			const existing = await friendsDB.checkFriendshipExists(requesterId, addresseeId);
    		if (existing) {
				if (existing.status === 'blocked')
					return BaseRoute.handleError(reply, "This friendship has been blocked.", 409);
				return BaseRoute.handleError(reply, "Friendship already exists or pending.", 409);
    		}
    		await friendsDB.sendFriendRequest(requesterId, addresseeId);
			const requesterData = FriendSecurity.getUserNotificationData(requesterId);
			if (requesterData)
				await fastify.notifyFriendRequest(addresseeId, requesterData);
			BaseRoute.handleSuccess(reply, "Friend request sent.");
		}
		catch (err) {
			console.log(err);
			BaseRoute.handleError(reply, "Failed to send friend request.", 500);
		}
  	});

//used to accept friend request
  fastify.post('/api/friends/accept',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['requesterId'],
		properties: {
			requesterId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const addresseeId = request.user.id;
    	const { requesterId } = request.body;
		const idValidation = ValidationUtils.validateUserId(requesterId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, "Invalid user ID format", 400);
		try {
			await friendsDB.acceptFriendRequest(requesterId, addresseeId);
			const addresseeData = FriendSecurity.getUserNotificationData(addresseeId);
			if (addresseeData)
				await fastify.notifyFriendRequestAccepted(requesterId, addresseeData);
			const requesterData = FriendSecurity.getUserNotificationData(requesterId);
			if (requesterData)
				await fastify.notifyFriendRequestAccepted(addresseeId, requesterData);
			BaseRoute.handleSuccess(reply, "Friend request accepted.");
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to accept friend request.", 500);
		}
  	});

//used to reject friend requests
  fastify.post('/api/friends/reject',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['requesterId'],
		properties: {
			requesterId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const addresseeId = request.user.id;
    	const { requesterId } = request.body;
		const idValidation = ValidationUtils.validateUserId(requesterId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, "Invalid user ID format", 400);
		try {
			await friendsDB.undoFriendship(requesterId, addresseeId);
			BaseRoute.handleSuccess(reply, "Friend request rejected.");
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to reject friend request.", 500);
		}
  	});

//used to block users
  fastify.post('/api/friends/block',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['requesterId'],
		properties: {
			requesterId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const addresseeId = request.user.id;
		const { requesterId } = request.body;
		const idValidation = ValidationUtils.validateUserId(requesterId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, "Invalid user ID format", 400);
		try {
			if(friendsDB.checkFriendshipStatus(requesterId, addresseeId) === 'blocked')
				return BaseRoute.handleError(reply, "Friendship already blocked", 400);
			await friendsDB.blockUser(requesterId, addresseeId);
			await fastify.notifyFriendOfBlock(requesterId, addresseeId);
			BaseRoute.handleSuccess(reply, "User blocked.");
		}
		catch (err) {
			console.log(err);
			BaseRoute.handleError(reply, "Failed to block friend", 500);
		}
	});

//used to unblock users
  fastify.post('/api/friends/unblock',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['requesterId'],
		properties: {
			requesterId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const addresseeId = request.user.id;
		const { requesterId } = request.body;
		const idValidation = ValidationUtils.validateUserId(requesterId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, "Invalid user ID format", 400);
		try {
			if(friendsDB.checkFriendshipStatus(requesterId, addresseeId) === 'accepted')
				return BaseRoute.handleError(reply, "Friendship already unblocked", 400);
			await friendsDB.acceptFriendRequest(requesterId, addresseeId);
			await fastify.notifyFriendOfUnblock(requesterId, addresseeId);
			BaseRoute.handleSuccess(reply, "User unblocked.");
		}
		catch (err) {
			console.log(err);
			BaseRoute.handleError(reply, "Failed to unblock friend", 500);
		}
	});

//used to cancel friendships
  fastify.post('/api/friends/remove',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['friendId'],
		properties: {
			friendId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId1 = request.user.id;
		const { friendId: userId2 } = request.body;
		const idValidation = ValidationUtils.validateUserId(userId2);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, "Invalid user ID format", 400);
		try {
			const exists = await friendsDB.checkFriendshipExists(userId1, userId2);
    		if (!exists || exists.status !== 'accepted')
				return BaseRoute.handleError(reply, "Friendship not found.", 404);
    		await friendsDB.undoFriendship(userId1, userId2);
    		await fastify.notifyFriendRemoved(userId1, userId2);
			BaseRoute.handleSuccess(reply, "Friendship removed.");
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to remove friendship.", 500);
		}
	});

//used to get all the accepted friends
  fastify.get('/api/friends',
	BaseRoute.authenticateRoute(fastify),
  	async (request, reply) => {
    	const userId = parseInt(request.user.id);
		try {
			const friends = await friendsDB.getFriends(userId);
			BaseRoute.handleSuccess(reply, friends);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch friends.", 500);
		}
	});

//used to get all the pending friend requests
  fastify.get('/api/friends/pending',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		const userId = parseInt(request.user.id);
		try {
    		const pending = await friendsDB.getPendingRequests(userId);
			BaseRoute.handleSuccess(reply, pending);
		}
		catch (err) {
			BaseRoute.handleError(reply, "Failed to fetch pending requests.", 500);
		}
	});
}

export default friendsRoutes;
