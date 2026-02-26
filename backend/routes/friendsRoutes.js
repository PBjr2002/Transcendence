import friendsDB from '../database/friends.js';
import { getUserById } from '../database/users.js';
import BaseRoute from '../other/BaseRoutes.js';
import ValidationUtils from '../other/validation.js';

class FriendSecurity {
	static getUserNotificationData(userId) {
		const user = getUserById(userId);
		if (user.success) {
			return {
				id: user.user.id,
				name: user.user.name,
				online: user.user.online
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
		required: ['friendId'],
		properties: {
			friendId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { friendId } = request.body;
		const idValidation = ValidationUtils.validateUserId(friendId);
		if (!idValidation.isValid) {
			return reply.status(200).send({
				success: false,
				error: "Invalid user ID format"
			});
		}
		const requestValidationCheck = ValidationUtils.validateFriendRequest(friendId);
		if (!requestValidationCheck.isValid) {
			return reply.status(200).send({
				success: false,
				error: requestValidationCheck.errors
			});
		}
		try {
			const existing = await friendsDB.checkFriendshipExists(userId, friendId);
    		if (existing.success && existing.friendship) {
				if (existing.friendship.status === 'blocked') {
					return reply.status(200).send({
						success: false,
						error: "This friendship has been blocked."
					});
				}
				return reply.status(200).send({
					success: false,
					error: "Friendship already exists or pending."
				});
    		}
    		const friendship = await friendsDB.sendFriendRequest(userId, friendId);
			if (!friendship.success)
				return BaseRoute.handleError(reply, null, friendship.errorMsg, friendship.status);
			const userData = FriendSecurity.getUserNotificationData(userId);
			if (userData)
				await fastify.notifyFriendRequest(friendId, userData);
			BaseRoute.handleSuccess(reply, "Friend request sent.", 201);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to send friend request.", 500);
		}
  	});

//used to accept friend request
  fastify.post('/api/friends/accept',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['friendId'],
		properties: {
			friendId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
    	const { friendId } = request.body;
		const idValidation = ValidationUtils.validateUserId(friendId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, null, "Invalid user ID format", 400);
		try {
			const friendship = await friendsDB.acceptFriendRequest(friendId, userId);
			if (!friendship.success)
				return BaseRoute.handleError(reply, null, friendship.errorMsg, friendship.status);
			const userData = FriendSecurity.getUserNotificationData(userId);
			if (userData)
				await fastify.notifyFriendRequestAccepted(friendId, userData);
			const friendData = FriendSecurity.getUserNotificationData(friendId);
			if (friendData)
				await fastify.notifyFriendRequestAccepted(userId, friendData);
			BaseRoute.handleSuccess(reply, "Friend request accepted.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to accept friend request.", 500);
		}
  	});

//used to reject friend requests
  fastify.post('/api/friends/reject',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['friendId'],
		properties: {
			friendId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
    	const { friendId } = request.body;
		const idValidation = ValidationUtils.validateUserId(friendId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, null, "Invalid user ID format", 400);
		try {
			const friendship = await friendsDB.undoFriendship(friendId, userId);
			if (!friendship.success)
				return BaseRoute.handleError(reply, null, friendship.errorMsg, friendship.status);
			BaseRoute.handleSuccess(reply, "Friend request rejected.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to reject friend request.", 500);
		}
  	});

//used to block users
  fastify.post('/api/friends/block',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['friendId'],
		properties: {
			friendId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { friendId } = request.body;
		const idValidation = ValidationUtils.validateUserId(friendId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, null, "Invalid user ID format", 400);
		try {
			const status = friendsDB.checkFriendshipStatus(userId, friendId);
			if (!status.success)
				return BaseRoute.handleError(reply, null, status.errorMsg, status.status);
			if(status.status === 'blocked')
				return BaseRoute.handleError(reply, null, "Friendship already blocked", 409);
			const blockedFriend = await friendsDB.blockUser(userId, friendId, userId);
			if (!blockedFriend.success)
				return BaseRoute.handleError(reply, null, blockedFriend.errorMsg, blockedFriend.status);
			await fastify.notifyFriendOfBlock(userId, friendId);
			BaseRoute.handleSuccess(reply, "User blocked.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to block friend", 500);
		}
	});

//used to unblock users
  fastify.post('/api/friends/unblock',
	BaseRoute.authenticateRoute(fastify, BaseRoute.createSchema(null, {
		type: 'object',
		required: ['friendId'],
		properties: {
			friendId: { type: 'integer' }
		}
	})),
	async (request, reply) => {
		const userId = request.user.id;
		const { friendId } = request.body;
		const idValidation = ValidationUtils.validateUserId(friendId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, null, "Invalid user ID format", 400);
		try {
			const status = friendsDB.checkFriendshipStatus(userId, friendId);
			if (!status.success)
				return BaseRoute.handleError(reply, null, status.errorMsg, status.status);
			if(status.status === 'accepted')
				return BaseRoute.handleError(reply, null, "Friendship already unblocked", 409);
			const canBlock = friendsDB.checkIfUserCanUnblock(userId, friendId);
			if (!canBlock.success && !canBlock.errorMsg)
				return BaseRoute.handleError(reply, null, "User cannot unblock friendship", 403);
			else if (!canBlock.success)
				return BaseRoute.handleError(reply, null, canBlock.errorMsg, canBlock.status);
			const unblockedFriend = await friendsDB.unblockUser(userId, friendId, userId);
			if (!unblockedFriend.success)
				return BaseRoute.handleError(reply, null, unblockedFriend.errorMsg, unblockedFriend.status);
			await fastify.notifyFriendOfUnblock(userId, friendId);
			BaseRoute.handleSuccess(reply, "User unblocked.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to unblock friend", 500);
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
		const userId = request.user.id;
		const { friendId } = request.body;
		const idValidation = ValidationUtils.validateUserId(friendId);
		if (!idValidation.isValid)
			return BaseRoute.handleError(reply, null, "Invalid user ID format", 400);
		try {
			const exists = await friendsDB.checkFriendshipExists(userId, friendId);
			if (!exists.success)
				return BaseRoute.handleError(reply, null, exists.errorMsg, exists.status);
    		if (exists.success && exists.friendship.status !== 'accepted')
				return BaseRoute.handleError(reply, null, "Friendship not found.", 404);
    		const friendship = await friendsDB.undoFriendship(userId, friendId);
			if (!friendship.success)
				return BaseRoute.handleError(reply, null, friendship.errorMsg, friendship.status);
    		await fastify.notifyFriendRemoved(userId, friendId);
			BaseRoute.handleSuccess(reply, "Friendship removed.");
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to remove friendship.", 500);
		}
	});

//used to get all the accepted friends
  fastify.get('/api/friends',
	BaseRoute.authenticateRoute(fastify),
  	async (request, reply) => {
    	const userId = parseInt(request.user.id);
		try {
			const friends = await friendsDB.getFriends(userId);
			if (!friends.success)
				return BaseRoute.handleError(reply, null, friends.errorMsg, friends.status);
			BaseRoute.handleSuccess(reply, friends.friendsList);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch friends.", 500);
		}
	});

//used to get all the pending friend requests
  fastify.get('/api/friends/pending',
	BaseRoute.authenticateRoute(fastify),
	async (request, reply) => {
		const userId = parseInt(request.user.id);
		try {
    		const pending = await friendsDB.getPendingRequests(userId);
			if (!pending.success)
				return BaseRoute.handleError(reply, null, pending.errorMsg, pending.status);
			BaseRoute.handleSuccess(reply, pending.pendingRequests);
		}
		catch (err) {
			BaseRoute.handleError(reply, err, "Failed to fetch pending requests.", 500);
		}
	});
}

export default friendsRoutes;
