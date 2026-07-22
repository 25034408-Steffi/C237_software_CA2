// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Admin - order management (online / in-restaurant, status workflow)
// ============================================================
const db = require('../database')

// all orders of one type ('online' or 'in_restaurant') with the member's details
function getOrdersByType(orderType, callback) {
    const sql = `
    SELECT o.order_id, o.total, o.status, o.impatient, o.created_at, u.name, u.card_id
    FROM \`order\` o
    INNER JOIN user u ON o.user_id = u.user_id
    WHERE o.order_type = ?
    ORDER BY o.created_at DESC`

    db.query(sql, [orderType], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// admin moves an order along: preparing -> ready -> received -> finished
function updateOrderStatus(orderId, status, callback) {
    // whitelist so only valid statuses ever reach the database
    const allowed = ['preparing', 'ready', 'received', 'finished']
    if (!allowed.includes(status)) {
        return callback(new Error('Invalid status: ' + status))
    }
    db.query('UPDATE `order` SET status = ? WHERE order_id = ?', [status, orderId], callback)
}

module.exports = {getOrdersByType, updateOrderStatus}
