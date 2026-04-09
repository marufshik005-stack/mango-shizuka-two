const Vip = require("../models/vip");

/**
 * Check if a user has active VIP (admins always pass).
 * @param {string} userID
 * @returns {Promise<boolean>}
 */
async function checkVip(userID) {
    try {
        const adminList = global.GoatBot?.config?.adminBot || [];
        if (adminList.includes(userID)) return true;
        const record = await Vip.findOne({ userID }).lean();
        return !!(record && record.expiry > Date.now());
    } catch (err) {
        console.error("[VIP] checkVip error:", err.message);
        return false;
    }
}

/**
 * Get full VIP record for a user. Returns null if not VIP or expired.
 * @param {string} userID
 * @returns {Promise<object|null>}
 */
async function getVipRecord(userID) {
    try {
        const record = await Vip.findOne({ userID }).lean();
        if (!record || record.expiry <= Date.now()) return null;
        return record;
    } catch (err) {
        console.error("[VIP] getVipRecord error:", err.message);
        return null;
    }
}

/**
 * Grant or extend VIP for a user.
 * Uses $set + $setOnInsert so userID and start are NEVER lost on update.
 * @param {string} userID
 * @param {number} days
 * @returns {Promise<{expiry: number, isNew: boolean}>}
 */
async function grantVip(userID, days) {
    const ms = days * 24 * 60 * 60 * 1000;

    // Read existing BEFORE updating to calculate correct base expiry
    const existing = await Vip.findOne({ userID }).lean();
    const base = (existing && existing.expiry > Date.now()) ? existing.expiry : Date.now();
    const newExpiry = base + ms;

    // CRITICAL: use $set so userID is NEVER removed from the document on update.
    // $setOnInsert only fires on upsert (new document) to set start + userID.
    await Vip.findOneAndUpdate(
        { userID },
        {
            $set: { expiry: newExpiry },
            $setOnInsert: { userID, start: Date.now() }
        },
        { upsert: true, new: true }
    );

    return { expiry: newExpiry, isNew: !existing };
}

/**
 * Revoke VIP for a user.
 * @param {string} userID
 * @returns {Promise<boolean>}
 */
async function revokeVip(userID) {
    const result = await Vip.findOneAndDelete({ userID });
    return !!result;
}

/**
 * Get all active (non-expired) VIP records.
 * @returns {Promise<Array>}
 */
async function getAllActiveVips() {
    return Vip.find({ expiry: { $gt: Date.now() } }).lean();
}

module.exports = { checkVip, getVipRecord, grantVip, revokeVip, getAllActiveVips };
