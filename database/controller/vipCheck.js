const Vip = require("../models/vip");

/**
 * Check if a user has active VIP (admins always pass).
 * @param {string} userID
 * @returns {Promise<boolean>}
 */
async function checkVip(userID) {
    try {
        const adminList = global.GoatBot?.config?.adminBot || [];
        if (adminList.includes(String(userID))) return true;
        const record = await Vip.findOne({ userID: String(userID) }).lean();
        const result = !!(record && record.expiry > Date.now());
        console.log(`[VIP CHECK] userID=${userID} | found=${!!record} | expiry=${record?.expiry} | now=${Date.now()} | isVip=${result}`);
        return result;
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
        const record = await Vip.findOne({ userID: String(userID) }).lean();
        if (!record || record.expiry <= Date.now()) return null;
        return record;
    } catch (err) {
        console.error("[VIP] getVipRecord error:", err.message);
        return null;
    }
}

/**
 * Grant or extend VIP for a user.
 * Uses $set + $setOnInsert so userID is NEVER wiped on update.
 * @param {string} userID
 * @param {number} days
 * @returns {Promise<{expiry: number, isNew: boolean}>}
 */
async function grantVip(userID, days) {
    userID = String(userID);
    const ms = days * 24 * 60 * 60 * 1000;

    const existing = await Vip.findOne({ userID }).lean();
    console.log(`[VIP GRANT] userID=${userID} | existing=${JSON.stringify(existing)} | days=${days}`);

    const base = (existing && existing.expiry > Date.now()) ? existing.expiry : Date.now();
    const newExpiry = base + ms;

    const result = await Vip.findOneAndUpdate(
        { userID },
        {
            $set: { expiry: newExpiry },
            $setOnInsert: { userID, start: Date.now() }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[VIP GRANT] Saved: ${JSON.stringify(result)}`);
    return { expiry: newExpiry, isNew: !existing };
}

/**
 * Revoke VIP for a user.
 * @param {string} userID
 * @returns {Promise<boolean>}
 */
async function revokeVip(userID) {
    const result = await Vip.findOneAndDelete({ userID: String(userID) });
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
