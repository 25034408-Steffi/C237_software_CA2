const db = require('../database');


function getFoodCategoryCount(callback) {
    const sql = `
    SELECT c.name, COUNT(*) AS item_count
    FROM category c
    INNER JOIN menu_item mi ON c.category_id = mi.category_id
    GROUP BY c.name`

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    })
}

function getFoodByCategory(category, callback){
    const sql = `
    SELECT mi.menu_item_id, mi.name, image, description, price, available
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE c.name = ?`

    db.query(sql, [category], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    })
}

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Admin: manage menu (list, add, edit, delete, 86 toggle)
// ============================================================

// every item with its category, for the admin list (set only86 to true for the 86 list)
function getAllMenuItems(only86, callback) {
    let sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, mi.description, mi.price, mi.available, c.name AS category
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id`
    if (only86) {
        sql += ' WHERE mi.available = 0'
    }
    sql += ' ORDER BY c.name, mi.name'

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

function getMenuItemById(id, callback) {
    db.query('SELECT * FROM menu_item WHERE menu_item_id = ?', [id], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results[0])
    })
}

function getAllCategories(callback) {
    db.query('SELECT * FROM category ORDER BY name', (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

function insertMenuItem(item, callback) {
    const sql = 'INSERT INTO menu_item (category_id, name, image, description, price, available) VALUES (?, ?, ?, ?, ?, ?)'
    db.query(sql, [item.category_id, item.name, item.image, item.description, item.price, item.available], callback)
}

function updateMenuItem(id, item, callback) {
    const sql = 'UPDATE menu_item SET category_id = ?, name = ?, image = ?, description = ?, price = ?, available = ? WHERE menu_item_id = ?'
    db.query(sql, [item.category_id, item.name, item.image, item.description, item.price, item.available, id], callback)
}

function deleteMenuItem(id, callback) {
    db.query('DELETE FROM menu_item WHERE menu_item_id = ?', [id], callback)
}

// flip an item between available and 86'd (sold out)
function toggleAvailability(id, callback) {
    db.query('UPDATE menu_item SET available = NOT available WHERE menu_item_id = ?', [id], callback)
}

module.exports = {
    getFoodCategoryCount,
    getFoodByCategory,
    getAllMenuItems,
    getMenuItemById,
    getAllCategories,
    insertMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability
}
