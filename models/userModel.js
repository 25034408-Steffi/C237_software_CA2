const db = require('../database');

function getUserById(userId, callback) {
    const sql = `
    SELECT user_id, card_id, name, phone_number, points, role, card_tier, primary_user_id, relationship_type_id
    FROM user
    WHERE user_id = ?`;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results[0]);
    });
}

function updateUser(userId, { name, phone_number }, callback) {
    const sql = `
    UPDATE user
    SET name = ?, phone_number = ?
    WHERE user_id = ?`;

    db.query(sql, [name, phone_number, userId], (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}

// Everyone in a family - owner included - shares the same card_id prefix, so a LIKE
// search on the prefix pulls back the whole family (owner + members) in one query,
// no matter whose card_id we search from.
function getFamilyMembers(anyFamilyCardId, callback) {
    const prefix = anyFamilyCardId.slice(0, -2);
    const sql = `
    SELECT u.user_id, u.card_id, u.name, u.phone_number, u.points, u.relationship_type_id,
           u.primary_user_id IS NULL AS is_owner, -- 1 for the owner's own row, 0 for members
           IF(u.primary_user_id IS NULL, 'Owner', rt.name) AS relationship_name
    FROM user u
    LEFT JOIN relationship_type rt ON u.relationship_type_id = rt.relationship_type_id
    WHERE u.card_id LIKE ?
    -- owner first (is_owner=1 sorts before 0 when DESC), then members A-Z
    ORDER BY is_owner DESC, u.name`;

    db.query(sql, [`${prefix}%`], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

function getRelationshipTypes(callback) {
    const sql = `SELECT relationship_type_id, name FROM relationship_type ORDER BY name`;

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

// Family members share the owner's card_id prefix (e.g. "J0912") and only differ
// in the last 2 digits. We take the highest suffix currently in use by this family
// and add 1 - NOT just count(members), because deleting a middle member (e.g. 01,02,03
// -> delete 02) would make count-based numbering hand out "02" again, colliding with
// existing member 03. Using MAX(suffix)+1 avoids that. The table's unique constraint
// on card_id is the backstop if a collision ever slips through.
function generateFamilyCardId(ownerId, ownerCardId, callback) {
    const prefix = ownerCardId.slice(0, -2);
    const sql = `
    SELECT MAX(CAST(RIGHT(card_id, 2) AS UNSIGNED)) AS highest
    FROM user
    WHERE primary_user_id = ?`;

    db.query(sql, [ownerId], (err, results) => {
        if (err) {
            return callback(err);
        }

        const nextSuffix = (results[0].highest || 0) + 1;
        if (nextSuffix > 99) {
            return callback(new Error('This family has reached the maximum number of members.'));
        }

        callback(null, `${prefix}${String(nextSuffix).padStart(2, '0')}`);
    });
}

function addFamilyMember(ownerId, { card_id, name, phone_number, password, relationship_type_id }, callback) {
    const sql = `
    INSERT INTO user (card_id, name, phone_number, password, role, points, primary_user_id, relationship_type_id)
    VALUES (?, ?, ?, SHA1(?), 'customer', 0, ?, ?)`;

    db.query(sql, [card_id, name, phone_number, password, ownerId, relationship_type_id], (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}

// password is optional here - if left blank, only name/relationship change and the
// member keeps their existing password
function updateFamilyMember(memberId, ownerId, { name, relationship_type_id, password }, callback) {
    let sql = `UPDATE user SET name = ?, relationship_type_id = ?`;
    const params = [name, relationship_type_id];

    if (password) {
        sql += `, password = SHA1(?)`;
        params.push(password);
    }

    sql += ` WHERE user_id = ? AND primary_user_id = ?`;
    params.push(memberId, ownerId);

    db.query(sql, params, (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}

function deleteFamilyMember(memberId, ownerId, callback) {
    const sql = `DELETE FROM user WHERE user_id = ? AND primary_user_id = ?`;

    db.query(sql, [memberId, ownerId], (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Admin - members list, card tiers and date-filtered spending
// ============================================================

// all members with their tier, points and lifetime spending (for the admin members page)
function getAllMembers(callback) {
    const sql = `
    SELECT u.user_id, u.card_id, u.name, u.phone_number, u.card_tier, u.points,
           COUNT(o.order_id) AS total_orders,
           COALESCE(SUM(o.total), 0) AS total_spent
    FROM user u
    LEFT JOIN \`order\` o ON o.user_id = u.user_id
    WHERE u.role = 'customer'
    GROUP BY u.user_id
    ORDER BY u.card_id`;

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

function getMemberById(userId, callback) {
    db.query("SELECT * FROM user WHERE user_id = ? AND role = 'customer'", [userId], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results[0]);
    });
}

// one member's orders, optionally filtered by a date range (either bound may be blank)
function getMemberSpending(userId, fromDate, toDate, callback) {
    let sql = `
    SELECT o.order_id, o.total, o.status, o.order_type, o.created_at, DATE(o.created_at) AS order_day
    FROM \`order\` o
    WHERE o.user_id = ?`;
    const params = [userId];

    if (fromDate) {
        sql += ' AND DATE(o.created_at) >= ?';
        params.push(fromDate);
    }
    if (toDate) {
        sql += ' AND DATE(o.created_at) <= ?';
        params.push(toDate);
    }
    sql += ' ORDER BY o.created_at DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

// member switches their card from the profile page (whitelist keeps the enum safe)
function updateCardTier(userId, tier, callback) {
    const allowed = ['basic', 'silver', 'gold', 'vip'];
    if (!allowed.includes(tier)) {
        return callback(new Error('Invalid card type: ' + tier));
    }
    db.query('UPDATE user SET card_tier = ? WHERE user_id = ?', [tier, userId], callback);
}

// look a member up by their card number (used when the admin adds a phone reservation)
function findMemberByCardId(cardId, callback) {
    db.query("SELECT * FROM user WHERE card_id = ? AND role = 'customer'", [cardId], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results[0]);
    });
}

module.exports = {
    getUserById,
    updateUser,
    getFamilyMembers,
    getRelationshipTypes,
    generateFamilyCardId,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getAllMembers,
    getMemberById,
    getMemberSpending,
    findMemberByCardId,
    updateCardTier
}
