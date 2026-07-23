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

// one order header (used by the admin spending drill-down)
function getOrderById(orderId, callback) {
    const sql = `
    SELECT o.order_id, o.user_id, o.total, o.status, o.order_type, o.created_at
    FROM \`order\` o
    WHERE o.order_id = ?`

    db.query(sql, [orderId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results[0])
    })
}

// the food and drinks inside one order
function getOrderItems(orderId, callback) {
    const sql = `
    SELECT oi.quantity, mi.name, mi.price, c.name AS category,
           (oi.quantity * mi.price) AS line_total
    FROM order_item oi
    INNER JOIN menu_item mi ON mi.menu_item_id = oi.menu_item_id
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE oi.order_id = ?
    ORDER BY c.name, mi.name`

    db.query(sql, [orderId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

module.exports = {getOrdersByType, updateOrderStatus, getOrderById, getOrderItems}
