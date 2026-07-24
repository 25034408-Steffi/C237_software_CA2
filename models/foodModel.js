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
    // the derived table pre-computes each dish's average star rating (AVG + GROUP BY)
    let sql = `
    SELECT mi.menu_item_id, mi.name, mi.image, mi.description, mi.price, mi.points_cost,
           c.name AS category,
           f.user_id IS NOT NULL AS is_fav,
           rt.avg_stars, rt.rating_count
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    LEFT JOIN favourite f ON f.menu_item_id = mi.menu_item_id AND f.user_id = ?
    LEFT JOIN (
        SELECT menu_item_id, ROUND(AVG(stars), 1) AS avg_stars, COUNT(*) AS rating_count
        FROM rating
        GROUP BY menu_item_id
    ) rt ON rt.menu_item_id = mi.menu_item_id
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
            db.query('DELETE FROM favourite WHERE user_id = ? AND menu_item_id = ?', [userId, menuItemId], (err) => callback(err, false))
        } else {
            db.query('INSERT INTO favourite (user_id, menu_item_id) VALUES (?, ?)', [userId, menuItemId], (err) => callback(err, true))
        }
    })
}

// one rating per member per dish: update it if they rated before, insert otherwise.
// comment is optional ("Broth was rich!")
function rateItem(userId, menuItemId, stars, comment, callback) {
    const value = parseInt(stars);
    if (!value || value < 1 || value > 5) {
        return callback(new Error('Rating must be between 1 and 5'));
    }
    const text = (comment || '').trim() || null;
    db.query('SELECT * FROM rating WHERE user_id = ? AND menu_item_id = ?', [userId, menuItemId], (err, rows) => {
        if (err) {
            return callback(err)
        }
        if (rows.length > 0) {
            db.query('UPDATE rating SET stars = ?, comment = ? WHERE user_id = ? AND menu_item_id = ?', [value, text, userId, menuItemId], callback)
        } else {
            db.query('INSERT INTO rating (user_id, menu_item_id, stars, comment) VALUES (?, ?, ?, ?)', [userId, menuItemId, value, text], callback)
        }
    })
}

// every review for one dish, with the reviewer's name (for the detail page)
function getReviews(menuItemId, callback) {
    const sql = `
    SELECT r.stars, r.comment, u.name
    FROM rating r
    INNER JOIN user u ON u.user_id = r.user_id
    WHERE r.menu_item_id = ?
    ORDER BY r.stars DESC`
    db.query(sql, [menuItemId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// one dish together with its category name (customise/detail pages need both)
function getMenuItemWithCategory(id, callback) {
    const sql = `
    SELECT mi.*, c.name AS category
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE mi.menu_item_id = ?`
    db.query(sql, [id], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results[0])
    })
}

// the pizza add-ons with their prices (Anchovies, Olives, ...)
function getAllAddOns(callback) {
    db.query('SELECT * FROM add_on ORDER BY add_on_id', (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// pasta shows as just "Bolognese" / "Carbonara"; the chosen pasta type picks
// the real menu item, e.g. type "Penne" + sauce "Carbonara" -> "Penne Carbonara"
function findMenuItemByName(name, callback) {
    db.query('SELECT * FROM menu_item WHERE name = ? AND available = 1', [name], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results[0])
    })
}

// details for the items sitting in the session cart (used by the cart popup)
function getItemsByIds(ids, callback) {
    if (!ids || ids.length === 0) {
        return callback(null, [])
    }
    db.query('SELECT menu_item_id, name, price FROM menu_item WHERE menu_item_id IN (?)', [ids], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
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
    getRedeemableItems,
    rateItem,
    getItemsByIds,
    getReviews,
    getMenuItemWithCategory,
    getAllAddOns,
    findMenuItemByName
}
