const db = require('./db');
const bcrypt = require('bcrypt');

function setNewTwoFaSecret(newSecret, type, userId) {
	const createdDate = Date.now();
	const expireDate = Date.now() + 3600000;
	const newFa = db.prepare(`INSERT INTO twoFa (userId, twoFAType, twoFASecret, createdDate, expireDate, status) VALUES (?, ?, ?, ?, ?, 'pending')`);
	return newFa.run(userId, type, newSecret, createdDate, expireDate);
}

async function storeHashedTwoFaSecret(userId) {
	const twoFa = getTwoFaById(userId);
	const hashedSecret = await bcrypt.hash(twoFa.twoFaSecret, 10);
	return db.prepare('UPDATE twoFa SET twoFASecret = ? WHERE userId = ?').run(hashedSecret, userId);
}

async function resetTwoFaSecret(newSecret, userId) {
	const newCreatedDate = Date.now();
	const newExpireDate = Date.now() + 3600000;
	const newHashedCode = await bcrypt.hash(newSecret, 10);
	return db.prepare('UPDATE twoFa SET twoFaSecret = ?, createdDate = ?, expireDate = ? WHERE userId = ?').run(newHashedCode, newCreatedDate, newExpireDate, userId);
}

function setTwoFAType(secretType, userId) {
	return db.prepare('UPDATE twoFa SET twoFaType = ? WHERE userId = ?').run(secretType, userId);
}

async function compareTwoFACodes(code, userId) {
	const twoFA = getTwoFaById(userId);
	if (!twoFA)
		return false;
	const isCodeValid = await bcrypt.compare(code, twoFA.twoFaSecret);
	if (!isCodeValid)
		return false;
	const actualDate = Date.now();
	if (actualDate > twoFA.expireDate)
		return false;
	return true;
}

function enableTwoFa(userId) {
	return db.prepare(`UPDATE twoFa SET status = 'enabled' WHERE userId = ?`).run(userId);
}

function disableTwofa(userId) {
	return db.prepare(`UPDATE twoFa SET status = 'disabled' WHERE userId = ?`).run(userId);
}

function getTwoFaType(userId) {
	const twoFA = getTwoFaById(userId);
	if (!twoFA)
		return null;
	return twoFA.get(twoFaType);
}

function getTwoFaById(userId) {
	return db.prepare('SELECT * FROM twoFa WHERE userId = ?').get(userId);
}

function deleteTwoFa(userId) {
	return db.prepare('DELETE FROM twoFa WHERE userId = ?').run(userId);
}

module.exports = {
	setNewTwoFaSecret,
	storeHashedTwoFaSecret,
	resetTwoFaSecret,
	setTwoFAType,
	compareTwoFACodes,
	enableTwoFa,
	disableTwofa,
	getTwoFaType,
	getTwoFaById,
	deleteTwoFa
};