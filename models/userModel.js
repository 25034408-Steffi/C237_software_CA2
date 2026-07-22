// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Admin - members list, card tiers and date-filtered spending
// ============================================================
const db = require('../database')

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
    ORDER BY u.card_id`

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

function getMemberById(userId, callback) {
    db.query("SELECT * FROM user WHERE user_id = ? AND role = 'customer'", [userId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results[0])
    })
}

// one member's orders, optionally filtered by a date range (either bound may be blank)
function getMemberSpending(userId, fromDate, toDate, callback) {
    let sql = `
    SELECT o.order_id, o.total, o.status, o.order_type, o.created_at, DATE(o.created_at) AS order_day
    FROM \`order\` o
    WHERE o.user_id = ?`
    const params = [userId]

    if (fromDate) {
        sql += ' AND DATE(o.created_at) >= ?'
        params.push(fromDate)
    }
    if (toDate) {
        sql += ' AND DATE(o.created_at) <= ?'
        params.push(toDate)
    }
    sql += ' ORDER BY o.created_at DESC'

    db.query(sql, params, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// look a member up by their card number (used when the admin adds a phone reservation)
function findMemberByCardId(cardId, callback) {
    db.query("SELECT * FROM user WHERE card_id = ? AND role = 'customer'", [cardId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results[0])
    })
}

module.exports = {getAllMembers, getMemberById, getMemberSpending, findMemberByCardId}
