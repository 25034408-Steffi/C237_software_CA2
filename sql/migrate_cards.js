// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Membership cards (basic/silver/gold/vip), dish ratings,
//          dine-in table numbers and delivery options on orders
// ============================================================
// Safe to re-run: duplicate errors are skipped.
const db = require('../database');

const steps = [
    // new card line-up: basic, silver, gold, vip
    // (widen the enum first, convert old values, then tighten it)
    "ALTER TABLE user MODIFY card_tier ENUM('classic','gold','platinum','basic','silver','vip') NOT NULL DEFAULT 'basic'",
    "UPDATE user SET card_tier = 'basic' WHERE card_tier = 'classic'",
    "UPDATE user SET card_tier = 'vip' WHERE card_tier = 'platinum'",
    "ALTER TABLE user MODIFY card_tier ENUM('basic','silver','gold','vip') NOT NULL DEFAULT 'basic'",
    // dine-in orders carry a table number; online orders carry a delivery speed
    "ALTER TABLE `order` ADD COLUMN table_number INT NULL",
    "ALTER TABLE `order` ADD COLUMN delivery_option ENUM('saver','priority','standard') NULL",
    // one rating per member per dish
    `CREATE TABLE IF NOT EXISTS rating (
        user_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        stars TINYINT NOT NULL,
        PRIMARY KEY (user_id, menu_item_id),
        CONSTRAINT fk_rating_user FOREIGN KEY (user_id) REFERENCES user (user_id),
        CONSTRAINT fk_rating_item FOREIGN KEY (menu_item_id) REFERENCES menu_item (menu_item_id)
    ) ENGINE = InnoDB`,
];

const seeds = [
    // sample ratings so averages show on the dashboard
    "INSERT INTO rating (user_id, menu_item_id, stars) VALUES (2, 3, 5), (3, 3, 4), (4, 3, 5), (2, 1, 4), (3, 19, 5), (2, 27, 5)",
    // sample tiers for the demo accounts
    "UPDATE user SET card_tier = 'gold' WHERE card_id = 'J091200'",
    "UPDATE user SET card_tier = 'vip' WHERE card_id = 'M098700'",
    "UPDATE user SET card_tier = 'silver' WHERE card_id = 'J091201'",
];

function runAll(list, label, done) {
    let i = 0;
    const next = () => {
        if (i >= list.length) return done();
        db.query(list[i++], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_ENTRY') {
                    console.log(label, i, 'skipped (already applied)');
                } else {
                    console.error(label, i, 'FAILED:', err.message);
                    process.exit(1);
                }
            } else {
                console.log(label, i, 'ok');
            }
            next();
        });
    };
    next();
}

runAll(steps, 'migrate', () => {
    runAll(seeds, 'seed', () => { console.log('done'); db.end(); });
});
