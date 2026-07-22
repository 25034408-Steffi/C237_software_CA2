const db = require('../database')


function getFoodCategoryCount(callback) {
    const sql = `
    SELECT c.name, COUNT(*) AS item_count
    FROM category c
    INNER JOIN menu_item mi ON c.category_id = mi.category_id
    GROUP BY c.name`

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

function getFoodByCategory(category, callback){
    const sql = `
    SELECT mi.name, description, price, available
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE c.name = ?`

    db.query(sql, [category], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

module.exports = {getFoodCategoryCount, getFoodByCategory}
