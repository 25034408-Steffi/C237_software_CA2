// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Admin - database migration (order lifecycle, card tiers, reservation table)
// ============================================================
// One-off migration for the admin features (run: node sql/migrate_admin.js)
// Adds order status/type columns, card tiers, the reservation table,
// and seeds sample orders + reservations so the admin pages have data.
const db = require('../database');

const steps = [
    // order lifecycle
    "ALTER TABLE `order` ADD COLUMN status ENUM('preparing','ready','received','finished') NOT NULL DEFAULT 'preparing'",
    "ALTER TABLE `order` ADD COLUMN order_type ENUM('online','in_restaurant') NOT NULL DEFAULT 'online'",
    "ALTER TABLE `order` ADD COLUMN impatient TINYINT NOT NULL DEFAULT 0",
    "ALTER TABLE `order` ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    // order_item pk was not auto increment in the original schema
    // (drop the referencing FK first, then restore it)
    "ALTER TABLE order_item_has_add_on DROP FOREIGN KEY fk_order_item_has_add_on_order_item1",
    "ALTER TABLE order_item MODIFY order_item_id INT NOT NULL AUTO_INCREMENT",
    "ALTER TABLE order_item_has_add_on ADD CONSTRAINT fk_order_item_has_add_on_order_item1 FOREIGN KEY (order_item_id) REFERENCES order_item (order_item_id)",
    // membership card tier
    "ALTER TABLE user ADD COLUMN card_tier ENUM('classic','gold','platinum') NOT NULL DEFAULT 'classic'",
    // reservations
    `CREATE TABLE IF NOT EXISTS reservation (
        reservation_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        reserve_date DATE NOT NULL,
        reserve_time TIME NOT NULL,
        pax INT NOT NULL,
        table_number INT NULL,
        status ENUM('pending','upcoming') NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (reservation_id),
        CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES user (user_id)
    ) ENGINE = InnoDB`,
];

const seeds = [
    // sample tiers
    "UPDATE user SET card_tier='gold' WHERE card_id IN ('J091200','S096600')",
    "UPDATE user SET card_tier='platinum' WHERE card_id='M098700'",
    // sample orders (checkout is not built yet, so seed a realistic mix)
    `INSERT INTO \`order\` (order_id, user_id, total, points_earned, points_redeemed, discount_amount, status, order_type, impatient, created_at) VALUES
      (1, 2, 44.00, 44, NULL, NULL, 'received',  'online',        0, '2026-07-18 12:31:00'),
      (2, 3, 29.00, 29, NULL, NULL, 'finished',  'in_restaurant', 0, '2026-07-19 19:05:00'),
      (3, 2, 26.00, 26, NULL, NULL, 'preparing', 'online',        0, '2026-07-21 18:22:00'),
      (4, 5, 43.00, 43, NULL, NULL, 'ready',     'in_restaurant', 1, '2026-07-22 12:02:00'),
      (5, 6, 28.00, 28, NULL, NULL, 'preparing', 'in_restaurant', 0, '2026-07-22 12:40:00'),
      (6, 4, 15.00, 15, NULL, NULL, 'ready',     'online',        0, '2026-07-22 13:05:00')`,
    `INSERT INTO order_item (order_id, menu_item_id, size_id, quantity) VALUES
      (1, 1, NULL, 1), (1, 3, NULL, 1), (1, 5, NULL, 1),
      (2, 6, NULL, 1), (2, 7, NULL, 1), (2, 10, NULL, 0),
      (3, 2, NULL, 1), (3, 8, NULL, 1),
      (4, 4, NULL, 1), (4, 1, NULL, 1), (4, 7, NULL, 1),
      (5, 3, NULL, 2),
      (6, 2, NULL, 1)`,
    // sample reservations: two pending requests + one accepted upcoming booking
    `INSERT INTO reservation (user_id, reserve_date, reserve_time, pax, table_number, status) VALUES
      (3, '2026-07-23', '19:00:00', 4, NULL, 'pending'),
      (5, '2026-07-24', '12:30:00', 2, NULL, 'pending'),
      (2, '2026-07-23', '18:30:00', 6, 12, 'upcoming')`,
];

function runAll(list, label, done) {
    let i = 0;
    const next = () => {
        if (i >= list.length) return done();
        const sql = list[i++];
        db.query(sql, (err) => {
            if (err) {
                // ignore "already applied" errors so the script can be re-run safely
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
    db.query('SELECT COUNT(*) AS n FROM `order`', (err, r) => {
        if (err) { console.error(err.message); process.exit(1); }
        if (r[0].n > 0) {
            console.log('orders already exist - skipping seeds');
            return db.end();
        }
        runAll(seeds, 'seed', () => { console.log('done'); db.end(); });
    });
});
