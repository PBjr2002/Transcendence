import db from './db.js';

function sendMessage(chatRoomId, fromId, toId, messageText) {
	if (!chatRoomId || !fromId || !toId || !messageText)
		return { success: false, errorMsg: 'All fields are required', status: 400 };
	if (typeof messageText !== 'string' || messageText.trim().length === 0)
		return { success: false, errorMsg: 'Message text must be a non-empty string', status: 400 };
	if (messageText.length > 1000)
		return { success: false, errorMsg: 'Message too long (max: 1000 characters)', status: 400 };

	const trimmedMessage = messageText.trim();
	const newMessage = db.prepare('INSERT INTO Messages (chatRoomId, fromId, toId, messageText) VALUES(?, ? ,? ,?)').run(chatRoomId, fromId, toId, trimmedMessage);
	return {
		success: true,
		newMessage: getMessageById(newMessage.lastInsertRowid)
	};
}

function getChatRoomMessages(chatRoomId, limit = 50, offset = 0) {
	if (!chatRoomId || chatRoomId <= 0)
		return { success: false, errorMsg: 'Valid chat room ID required', status: 400 };

	const safeLimit = Math.min(Math.max(limit, 1), 100);
	const safeOffset = Math.max(offset, 0);
	const messages = db.prepare('SELECT * FROM Messages WHERE chatRoomId = ? ORDER BY Timestamp DESC LIMIT ? OFFSET ?').all(chatRoomId, safeLimit, safeOffset);
	return {
		success: true,
		messages: messages
	};
}

function getMessageById(messageId) {
	if (!messageId || messageId <= 0)
		return { success: false, errorMsg: 'Valid message ID required', status: 400 };
	const message = db.prepare('SELECT * FROM Messages WHERE id = ?').get(messageId);
	return {
		success: true,
		message: message
	};
}

function deleteMessage(messageId, userId) {
	if (!messageId || !userId)
		return { success: false, errorMsg: 'All fields are required', status: 400 };
	const deleted = db.prepare('DELETE FROM Messages WHERE id = ? AND fromId = ?').run(messageId, userId);
	if (deleted.changes > 0)
		return { success: true };
	return { success: false, errorMsg: 'Nothing deleted', status: 404 };
}

function getUnreadMessageCount(userId) {
	if (!userId || userId <= 0 )
		return { success: false, errorMsg: 'Valid user ID required', status: 400 };
	const unreadMessages = db.prepare('SELECT COUNT(*) as unreadCount FROM Messages WHERE toId = ?').get(userId);
	return {
		success: true,
		unreadCount: unreadMessages.unreadCount
	};
}

function verifyUserChatRoomAccess(userId, chatRoomId) {
	const chatRoom = db.prepare('SELECT * FROM ChatRoom WHERE id = ? AND (userId1 = ? OR userId2 = ?)').get(chatRoomId, userId, userId);
	return (!!chatRoom);
}

export {
	sendMessage,
	getChatRoomMessages,
	getMessageById,
	deleteMessage,
	getUnreadMessageCount,
	verifyUserChatRoomAccess
};

export default {
	sendMessage,
	getChatRoomMessages,
	getMessageById,
	deleteMessage,
	getUnreadMessageCount,
	verifyUserChatRoomAccess
};