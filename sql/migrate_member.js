// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Member dashboard - complaints, favourites, redeemable items
// ============================================================
// Safe to re-run: duplicate-column / duplicate-row errors are skipped.
const db = require('../database');

const steps = [
    // complaints / opinions the manager reviews
    `CREATE TABLE IF NOT EXISTS complaint (
        complaint_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        topic ENUM('food','staff','service','other') NOT NULL,
        message VARCHAR(1000) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (complaint_id),
        CONSTRAINT fk_complaint_user FOREIGN KEY (user_id) REFERENCES user (user_id)
    ) ENGINE = InnoDB`,
    // member favourite dishes
    `CREATE TABLE IF NOT EXISTS favourite (
        user_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        PRIMARY KEY (user_id, menu_item_id),
        CONSTRAINT fk_favourite_user FOREIGN KEY (user_id) REFERENCES user (user_id),
        CONSTRAINT fk_favourite_item FOREIGN KEY (menu_item_id) REFERENCES menu_item (menu_item_id)
    ) ENGINE = InnoDB`,
    // items that can be redeemed with points (NULL = not redeemable)
    "ALTER TABLE menu_item ADD COLUMN points_cost INT NULL",
];

const seeds = [
    // drinks and desserts are redeemable with points
    "UPDATE menu_item SET points_cost = 300 WHERE name = 'Coca-Cola'",
    "UPDATE menu_item SET points_cost = 350 WHERE name = 'Iced Lemon Tea'",
    "UPDATE menu_item SET points_cost = 550 WHERE name = 'Mango Smoothie'",
    "UPDATE menu_item SET points_cost = 750 WHERE name = 'Cheesecake'",
    "UPDATE menu_item SET points_cost = 800 WHERE name = 'Tiramisu'",
    "UPDATE menu_item SET points_cost = 900 WHERE name = 'Chocolate Lava Cake'",
    // sample complaints so the admin page is not empty
    `INSERT INTO complaint (user_id, topic, message) VALUES
      (2, 'food', 'The laksa was lukewarm when it arrived at the table.'),
      (3, 'staff', 'Service was slow during Saturday dinner, we waited 20 minutes to order.')`,
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
    db.query('SELECT COUNT(*) AS n FROM complaint', (err, r) => {
        if (err) { console.error(err.message); process.exit(1); }
        if (r[0].n > 0) {
            console.log('complaints already exist - running only item seeds');
            runAll(seeds.slice(0, 6), 'seed', () => { console.log('done'); db.end(); });
            return;
        }
        runAll(seeds, 'seed', () => { console.log('done'); db.end(); });
    });
});
