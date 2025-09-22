import db from './db.js';

function sendMessage(chatRoomId, fromId, toId, messageText) {
	if (!chatRoomId || !fromId || !toId || !messageText)
		throw new Error('All fields are required');
	if (typeof messageText !== 'string' || messageText.trim().length === 0)
		throw new Error('Message text must be a non-empty string');
	if (messageText.length > 1000)
		throw new Error('Message too long (max: 1000 characters)');

	const trimmedMessage = messageText.trim();
	const newMessage = db.prepare('INSERT INTO Messages (chatRoomId, fromId, toId, messageText) VALUES(?, ? ,? ,?)').run(chatRoomId, fromId, toId, trimmedMessage);
	return (getMessageById(newMessage.lastInsertRowid));
}

function getChatRoomMessages(chatRoomId, limit = 50, offset = 0) {
	if (!chatRoomId || chatRoomId <= 0)
		throw new Error('Valid chat room ID required');

	const safeLimit = Math.min(Math.max(limit, 1), 100);
	const safeOffset = Math.max(offset, 0);
	return (db.prepare('SELECT * FROM Messages WHERE chatRoomId = ? ORDER BY Timestamp DESC LIMIT ? OFFSET ?').all(chatRoomId, safeLimit, safeOffset));
}

function getMessageById(messageId) {
	if (!messageId || messageId <= 0)
		throw new Error('Valid message ID required');
	return (db.prepare('SELECT * FROM Messages WHERE id = ?').get(messageId));
}

function deleteMessage(messageId, userId) {
	if (!messageId || !userId)
		throw new Error('All fields are required');
	const deleted = db.prepare('DELETE FROM Messages WHERE id = ? AND fromId = ?').run(messageId, userId);
	if (deleted.changes > 0)
		return (true);
	return (false);
}

function getUnreadMessageCount(userId) {
	if (!userId || userId <= 0 )
		throw new Error('Valid user ID is required');
	const unreadMessages = db.prepare('SELECT COUNT(*) as unreadCount FROM Messages WHERE toId = ?').get(userId);
	return (unreadMessages.unreadCount);
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