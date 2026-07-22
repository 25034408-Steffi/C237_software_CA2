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

function getFoodByCategory(category, callback){
    const sql = `
    SELECT mi.name, mi.image, description, price, available
    FROM menu_item mi
    INNER JOIN category c ON c.category_id = mi.category_id
    WHERE c.name = ?`;

    db.query(sql, [category], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

function getUserFavourites(userId, callback){
    const sql = `
    SELECT mi.name, mi.image, description, price, available
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
module.exports = {
    getFoodCategoryCount, 
    getFoodByCategory, 
    getUserFavourites,
    getFavouritesCount
}
