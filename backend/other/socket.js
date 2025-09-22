import websocket from '@fastify/websocket';
import users from '../database/users.js';
import friends from '../database/friends.js';
import chatRoomDB from '../database/chatRoom.js';

const onlineUsers = new Map();

async function notifyFriendRemoved(userId1, userId2) {
	try {
		const user1Connection = onlineUsers.get(userId1);
		if (user1Connection && user1Connection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_removed',
				removedFriendId: userId2
			});
			user1Connection.send(message);
		}
		const user2Connection = onlineUsers.get(userId2);
		if (user2Connection && user2Connection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_removed',
				removedFriendId: userId1
			});
			user2Connection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying friend removal:', err);
	}
}

async function notifyFriendsOfStatusChange(userId, isOnline) {
	try {
		const userFriends = await friends.getFriends(userId);
		userFriends.forEach(friend => {
			const friendConnection = onlineUsers.get(friend.id);
			if (friendConnection && friendConnection.readyState === 1) {
				const message = JSON.stringify({
					type: 'friend_status_change',
					friendId: userId,
					online: isOnline
				});
				friendConnection.send(message);
			}
		});
	}
	catch (err) {
		console.error('Error notifying friends:', err);
	}
}

async function notifyFriendRequest(addresseeId, requesterData) {
	try {
		const addresseeConnection = onlineUsers.get(addresseeId);
		if (addresseeConnection && addresseeConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_request_received',
				requester: requesterData
			});
			addresseeConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying friend request:', err);
	}
}

async function notifyFriendRequestAccepted(requesterId, addresseeData) {
	try {
		const requesterConnection = onlineUsers.get(requesterId);
		if (requesterConnection && requesterConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_request_accepted',
				newFriend: addresseeData
			});
			requesterConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying friend request accepted:', err);
	}
}

async function notifyFriendOfBlock(userId1, userId2) {
	try {
		const userBlockedConnection = onlineUsers.get(userId1);
		if (userBlockedConnection && userBlockedConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_blocked',
				friendId: userId1
			});
			userBlockedConnection.send(message);
		}
		const userBlockingConnection = onlineUsers.get(userId2);
		if (userBlockingConnection && userBlockingConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_blocked',
				friendId: userId2
			});
			userBlockingConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying user:', err);
	}
}

async function notifyFriendOfUnblock(userId1, userId2) {
	try {
		const userBlockedConnection = onlineUsers.get(userId1);
		if (userBlockedConnection && userBlockedConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_unblocked',
				friendId: userId1
			});
			userBlockedConnection.send(message);
		}
		const userBlockingConnection = onlineUsers.get(userId2);
		if (userBlockingConnection && userBlockingConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'friend_unblocked',
				friendId: userId2
			});
			userBlockingConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying user:', err);
	}
}

async function notifyNewMessage(toUserId, messageData) {
	try {
		const receiverConnection = onlineUsers.get(toUserId);
		if (receiverConnection && receiverConnection.readyState === 1) {
			const message = JSON.stringify({
				type: 'new_message',
				message: messageData
			});
			receiverConnection.send(message);
		}
	}
	catch (err) {
		console.error('Error notifying new message', err);
	}
}

async function notifyMessageDeleted(messageId, chatRoomId) {
	try {
		const chatRoom = chatRoomDB.getChatRoom(chatRoomId);
		if (chatRoom) {
			[chatRoom.userId1, chatRoom.userId2].forEach(userId => {
				const userConnection = onlineUsers.get(userId);
				if (userConnection && userConnection.readyState === 1) {
					const message = JSON.stringify({
						type: 'message_deleted',
						messageId: messageId,
						chatRoomId: chatRoomId
					});
					userConnection.send(message);
				}
			});
		}
	}
	catch (err) {
		console.error('Error notifying message deletion:', err);
	}
}

async function socketPlugin(fastify, options) {
	await fastify.register(websocket);
	fastify.get('/api/wss', { websocket: true }, (connection, req) => {
		let currentUserId = null;
		
		connection.on('message', async (message) => {
			try {
				const data = JSON.parse(message.toString());
				if (data.type === 'user_online') {
					currentUserId = data.userId;
					onlineUsers.set(currentUserId, connection);
					await users.updateUserOnlineStatus(currentUserId, true);
					await notifyFriendsOfStatusChange(currentUserId, true);
				} 
				else if (data.type === 'ping')
					connection.send(JSON.stringify({ type: 'pong' }));
			}
			catch (err) {
				console.error('Websocket message error:', err);
			}
		});
		
		connection.on('close', async () => {
			try {
				if (currentUserId) {
					onlineUsers.delete(currentUserId);
					await users.updateUserOnlineStatus(currentUserId, false);
					await notifyFriendsOfStatusChange(currentUserId, false);
				}
			}
			catch (err) {
				console.error('Websocket message error:', err);
			}
		});
	});
}

export default socketPlugin;
export {
	onlineUsers,
	notifyFriendRemoved,
	notifyFriendsOfStatusChange,
	notifyFriendRequest,
	notifyFriendRequestAccepted,
	notifyFriendOfBlock,
	notifyFriendOfUnblock,
	notifyNewMessage,
	notifyMessageDeleted
};