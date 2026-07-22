const db = require('../database');

function getUserById(userId, callback) {
    const sql = `
    SELECT user_id, card_id, name, phone_number, points, role, primary_user_id, relationship_type_id
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

module.exports = {
    getUserById,
    updateUser,
    getFamilyMembers,
    getRelationshipTypes,
    generateFamilyCardId,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember
}