// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Admin - dashboard statistics
// ============================================================
const db = require('../database')

// Counts shown on the admin dashboard landing page.
// Queries run one after another (same nested callback style as foodModel).
function getDashboardCounts(callback) {
    db.query('SELECT COUNT(*) AS totalItems FROM menu_item', (err, itemRows) => {
        if (err) {
            return callback(err)
        }
        db.query('SELECT COUNT(*) AS eightySixed FROM menu_item WHERE available = 0', (err, eightySixRows) => {
            if (err) {
                return callback(err)
            }
            db.query('SELECT COUNT(*) AS totalCategories FROM category', (err, categoryRows) => {
                if (err) {
                    return callback(err)
                }
                db.query("SELECT COUNT(*) AS totalMembers FROM user WHERE role = 'customer'", (err, memberRows) => {
                    if (err) {
                        return callback(err)
                    }
                    callback(null, {
                        totalItems: itemRows[0].totalItems,
                        eightySixed: eightySixRows[0].eightySixed,
                        totalCategories: categoryRows[0].totalCategories,
                        totalMembers: memberRows[0].totalMembers
                    })
                })
            })
        })
    })
}

module.exports = {getDashboardCounts}
