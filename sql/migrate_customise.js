// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Dish customisation - review comments, pizza add-ons,
//          sizes for pizza/drinks, per-item comments and prices
// ============================================================
// Safe to re-run: duplicate errors are skipped.
const db = require('../database');

const steps = [
    // reviews can carry a comment beside the stars
    "ALTER TABLE rating ADD COLUMN comment VARCHAR(500) NULL",
    // each ordered item can carry a modification comment ("less pineapple")
    "ALTER TABLE order_item ADD COLUMN comment VARCHAR(255) NULL",
    // and the price actually charged (base + size + add-ons)
    "ALTER TABLE order_item ADD COLUMN unit_price DECIMAL(6,2) NULL",
];

const seeds = [
    // the five pizza add-ons
    "INSERT INTO add_on (add_on_id, name, price) VALUES (1, 'Anchovies', 1.00), (2, 'Pork/Chicken Sausages', 3.00), (3, 'Olives', 2.00), (4, 'Spinach', 1.00), (5, 'Pineapple', 2.00)",
    // drink sizes join the existing pizza sizes (1 Small 12in, 2 Regular 16in)
    "INSERT INTO size (size_id, name) VALUES (3, 'Small (drink)'), (4, 'Large (drink)')",
    // sample review comments so the detail page is not empty
    "UPDATE rating SET comment = 'Broth was rich and the prawns were fresh!' WHERE user_id = 2 AND menu_item_id = 3",
    "UPDATE rating SET comment = 'Good spice level, would order again.' WHERE user_id = 3 AND menu_item_id = 3",
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
