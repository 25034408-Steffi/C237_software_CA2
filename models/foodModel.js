const db = require('../database');


function getFoodCategoryCount(callback) {
    const sql = `
    SELECT c.name, COUNT(*) AS item_count
    FROM category c
    INNER JOIN menu_item mi ON c.category_id = mi.category_id
    GROUP BY c.name`;

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

function getFoodByCategory(category, userId, callback){
    const sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, description, price, available,
           f.user_id IS NOT NULL AS is_fav
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    LEFT JOIN favourite f ON f.menu_item_id = mi.menu_item_id AND f.user_id = ?
    WHERE c.name = ?`;

    db.query(sql, [userId, category], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

// favourites tab on the menu page (teammate's feature - same favourite table)
function getUserFavourites(userId, callback){
    const sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, description, price, available, TRUE AS is_fav
    FROM menu_item mi
    INNER JOIN favourite f ON mi.menu_item_id = f.menu_item_id
    WHERE f.user_id = ?`;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

function getFavouritesCount(userId, callback){
    const sql = `
    SELECT COUNT(*) as favourites_count
    FROM favourite f
    WHERE f.user_id = ?`;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results[0].favourites_count)
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

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Member dashboard: dishes with favourite flag, favourites, redeemables
// ============================================================

// dishes for the member dashboard: one category OR a name search across
// the whole menu. 86'd items are hidden, and each row carries is_fav for
// the heart toggle of the logged-in member.
function getDishesForMember(userId, category, search, callback) {
    let sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, mi.description, mi.price, mi.points_cost,
           c.name AS category,
           f.user_id IS NOT NULL AS is_fav
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    LEFT JOIN favourite f ON f.menu_item_id = mi.menu_item_id AND f.user_id = ?
    WHERE mi.available = 1`
    const params = [userId]

    if (search) {
        sql += ' AND mi.name LIKE ?'
        params.push(`%${search}%`)
    } else {
        sql += ' AND c.name = ?'
        params.push(category)
    }
    sql += ' ORDER BY mi.name'

    db.query(sql, params, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

function getFavourites(userId, callback) {
    const sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, mi.description, mi.price, c.name AS category
    FROM favourite f
    INNER JOIN menu_item mi ON mi.menu_item_id = f.menu_item_id
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE f.user_id = ?
    ORDER BY mi.name`

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// add if missing, remove if present (one heart button does both)
function toggleFavourite(userId, menuItemId, callback) {
    db.query('SELECT * FROM favourite WHERE user_id = ? AND menu_item_id = ?', [userId, menuItemId], (err, rows) => {
        if (err) {
            return callback(err)
        }
        if (rows.length > 0) {
            db.query('DELETE FROM favourite WHERE user_id = ? AND menu_item_id = ?', [userId, menuItemId], callback)
        } else {
            db.query('INSERT INTO favourite (user_id, menu_item_id) VALUES (?, ?)', [userId, menuItemId], callback)
        }
    })
}

// everything a member can redeem with points, cheapest first
function getRedeemableItems(callback) {
    const sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, mi.description, mi.price, mi.points_cost, c.name AS category
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE mi.points_cost IS NOT NULL AND mi.available = 1
    ORDER BY mi.points_cost`

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

module.exports = {
    getFoodCategoryCount,
    getFoodByCategory,
    getUserFavourites,
    getFavouritesCount,
    getAllMenuItems,
    getMenuItemById,
    getAllCategories,
    insertMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    getDishesForMember,
    getFavourites,
    toggleFavourite,
    getRedeemableItems
}
