const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');

const app = express();
const db = require('./database');
const { getFoodCategoryCount, getFoodByCategory, getUserFavourites, getFavouritesCount,
        getAllMenuItems, getMenuItemById,
        getAllCategories, insertMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability,
        getDishesForMember, getFavourites, toggleFavourite, getRedeemableItems,
        rateItem, getItemsByIds, getReviews, getMenuItemWithCategory,
        getAllAddOns, findMenuItemByName } = require("./models/foodModel");
const { addComplaint, getAllComplaints, removeComplaint } = require("./models/complaintModel");
const { getUserById, updateUser, getFamilyMembers, getRelationshipTypes, generateFamilyCardId, addFamilyMember, updateFamilyMember, deleteFamilyMember,
        getAllMembers, getMemberById, getMemberSpending, findMemberByCardId, updateCardTier } = require("./models/userModel");

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Membership card discounts applied at checkout
// ============================================================
const TIER_DISCOUNT = { basic: 0, silver: 0.05, gold: 0.10, vip: 0.15 };

// flat sizing from the design: every pizza is $15 small / $22 regular,
// every drink is $3 small / $5 large (size_id points at the size table)
const PIZZA_SIZES = { small: { id: 1, label: 'Small (12")', price: 15 }, regular: { id: 2, label: 'Regular (16")', price: 22 } };
const DRINK_SIZES = { small: { id: 3, label: 'Small', price: 3 }, large: { id: 4, label: 'Large', price: 5 } };
const PASTA_TYPES = ['Spaghetti', 'Fusilli', 'Penne', 'Linguine'];
const { getDashboardCounts } = require("./models/adminModel");
const { getOrdersByType, updateOrderStatus, getOrderById, getOrderItems,
        getOrdersByUser, getOrderForUser, markReceived, rushOrder } = require("./models/orderModel");
const { getReservationsByStatus, acceptReservation, addWalkInReservation, removeReservation,
        getReservationsByUser, addMemberReservation, cancelOwnReservation } = require("./models/reservationModel");

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// multer handles the menu item image uploads (L18)
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Session middleware
app.use(session({
    secret: 'notsasecret',
    resave: false,
    saveUninitialized: true,
    // cookie lasts for 24 hours
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(flash());
app.set('view engine', 'ejs');

// Custom Middlewares
const validateRegistration = (req, res, next) => {
    const { name, telephoneNo, password, confirmPassword } = req.body;

    if (!name || !telephoneNo || !password ) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body); 
        return res.redirect('/register');
    }
    if (password !== confirmPassword) {
        req.flash('error', 'Password and confirm password do not match');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/');
    }
};

// ==========================================
// PUBLIC & AUTHENTICATION ROUTES
// ==========================================

app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user, 
        messages: req.flash('success') 
    });
});

// Register routes
app.get('/register', (req, res) => {
    res.render('registerUser', {
        user: req.session.user,
        messages: req.flash('error'), 
        formData: req.flash('formData')[0]
    });
});

app.post('/register', validateRegistration, (req, res) => {
    const { password } = req.body;
    const name = req.body.name.trim();
    const telephoneNo = req.body.telephoneNo.trim();

    const card_id = `${name[0].toUpperCase()}0${telephoneNo.substring(0, 3)}00`;
    
    const sql = 'INSERT INTO user (name, card_id, phone_number, password, points, role) VALUES (?, ?, ?, SHA1(?), ?, ?)';
    db.query(sql, [name, card_id, telephoneNo, password, 0, 'customer'], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'A user with this Card ID already exists.');
                return res.redirect('/register');
            }
            throw err;
        }
        req.flash('success', `Registration successful! Your card ID is ${card_id}`);
        res.redirect('/login');
    });
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login', {
        user: req.session.user,
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    const card_id = req.body.card_id.trim();

    if (!card_id || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    // members log in with their card ID; the admin logs in with their name (same form).
    // session only stores non-sensitive columns (no password)
    const sql = `
    SELECT user_id, card_id, name, role, points, card_tier
    FROM user
    WHERE (card_id = ? OR (name = ? AND role = 'admin')) AND password = SHA1(?)`;

    db.query(sql, [card_id, card_id, password], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; // store user in session
            // role-based redirect - Khaing Khant Zaw (Leon)
            // same login form for everyone; role decides where they land
            if (req.session.user.role === 'admin') {
                res.redirect('/admin');
            } else {
                res.redirect('/dashboard');
            }
        } else {
            req.flash('error', 'Invalid card ID or password.');
            res.redirect('/login');
        }
    });
});

// Menu routes - the old menu pages now forward to the new member dashboard
// so there is only one menu look for members (old links keep working)
app.get('/menu', (req, res) => {
    res.redirect('/dashboard');
});

// cant add a favourite category (food cant exist in 2 categories simultaneously)
// so faourites tab is hardcoded into the foodNav
// instead, fetch from a favourote table
app.get('/menu/favourites', checkAuthenticated, (req, res) => {
    res.redirect('/favourites');
});

app.get('/menu/:category', checkAuthenticated, (req, res) => {
    res.redirect('/dashboard?category=' + encodeURIComponent(req.params.category));
});

// ==========================================
// FEATURE ASSIGNMENT: CART & RESERVATIONS
// ==========================================

// 1. ADD TO CART (session cart with customisation)
// The price is worked out HERE on the server from the chosen options -
// the browser never decides what anything costs.
app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const quantity = parseInt(req.body.quantity) || 1;
    if (!req.session.cart) {
        req.session.cart = [];
    }

    getMenuItemWithCategory(req.params.id, (err, item) => {
        if (err) throw err;
        if (!item || !item.available) {
            req.flash('error', 'That dish is not available right now.');
            return res.redirect('/dashboard');
        }

        const comment = (req.body.comment || '').trim().slice(0, 255) || null;
        // one cart line = { foodId, quantity, unitPrice, label, sizeId, addonIds, addonNames, comment }
        const line = { foodId: item.menu_item_id, quantity, unitPrice: Number(item.price),
                       label: item.name, sizeId: null, addonIds: [], addonNames: [], comment: null };

        const finish = () => {
            req.session.cart.push(line);
            req.flash('success', `${line.label} added to cart.`);
            res.redirect('/dashboard?order=1');
        };

        if (item.category === 'Pizza') {
            // crust (free choice) + flat size pricing + priced add-ons + comment
            const size = PIZZA_SIZES[req.body.size] ? req.body.size : 'small';
            const crust = req.body.crust === 'thin' ? 'Thin Crust' : 'Normal Crust';
            line.sizeId = PIZZA_SIZES[size].id;
            line.unitPrice = PIZZA_SIZES[size].price;
            line.label = `${item.name} (${PIZZA_SIZES[size].label}, ${crust})`;
            line.comment = comment;
            // add-on prices come from the add_on table, never from the form
            let picked = req.body.addons || [];
            if (!Array.isArray(picked)) picked = [picked];
            getAllAddOns((err2, addOns) => {
                if (err2) throw err2;
                addOns.forEach(a => {
                    if (picked.includes(String(a.add_on_id))) {
                        line.addonIds.push(a.add_on_id);
                        line.addonNames.push(a.name);
                        line.unitPrice += Number(a.price);
                    }
                });
                finish();
            });
            return;
        }

        if (item.category === 'Pasta') {
            // menu shows just Bolognese / Carbonara; the type picks the real item
            const type = PASTA_TYPES.includes(req.body.pasta_type) ? req.body.pasta_type : 'Spaghetti';
            const sauce = item.name.includes('Carbonara') ? 'Carbonara' : 'Bolognese';
            findMenuItemByName(`${type} ${sauce}`, (err2, variant) => {
                if (err2) throw err2;
                if (!variant) {
                    req.flash('error', 'That pasta combination is not available.');
                    return res.redirect('/dashboard');
                }
                line.foodId = variant.menu_item_id;
                line.unitPrice = Number(variant.price);
                line.label = variant.name;
                finish();
            });
            return;
        }

        if (item.category === 'Drinks') {
            const size = DRINK_SIZES[req.body.size] ? req.body.size : 'small';
            line.sizeId = DRINK_SIZES[size].id;
            line.unitPrice = DRINK_SIZES[size].price;
            line.label = `${item.name} (${DRINK_SIZES[size].label})`;
            finish();
            return;
        }

        if (item.category === 'Asian' || item.category === 'Tandoori') {
            // modification comment only ("less chilli please")
            line.comment = comment;
        }
        // Dessert (and anything else) stays as it is
        finish();
    });
});

// 2. VIEW CART - the floating cart popup on the dashboard is the cart now
app.get('/cart', checkAuthenticated, (req, res) => {
    res.redirect('/dashboard');
});

// 3. CHECKOUT (INSERT INTO order & order_item)
app.post('/checkout', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const cart = req.session.cart || [];

    if (cart.length === 0) {
        req.flash('error', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    // dine in (table number) or online (delivery speed) - from the cart popup
    const orderMode = req.body.order_mode === 'restaurant' ? 'in_restaurant' : 'online';
    let tableNumber = null;
    let deliveryOption = null;
    let deliveryAdjust = 0;
    if (orderMode === 'in_restaurant') {
        tableNumber = parseInt(req.body.table_number);
        if (!tableNumber) {
            req.flash('error', 'Please enter your table number to order in the restaurant.');
            return res.redirect('/dashboard');
        }
    } else {
        // saver is slower but $3 cheaper, priority is faster but $3 more
        const options = { saver: -3, priority: 3, standard: 0 };
        deliveryOption = options[req.body.delivery_option] !== undefined ? req.body.delivery_option : 'standard';
        deliveryAdjust = options[deliveryOption];
    }

    // every cart line already carries the server-computed unit price
    // (base + size + add-ons, set in /add-to-cart)
    let subtotal = 0;
    cart.forEach(line => subtotal += line.unitPrice * line.quantity);

    // membership card discount: basic 0%, silver 5%, gold 10%, vip 15%
    const tier = req.session.user.card_tier || 'basic';
    const discountAmount = Math.round(subtotal * (TIER_DISCOUNT[tier] || 0) * 100) / 100;
    const calculatedTotal = Math.max(0, subtotal - discountAmount + deliveryAdjust);

    // members earn 1 loyalty point per dollar actually paid
    const pointsEarned = Math.floor(calculatedTotal);
    const insertOrderSql = `INSERT INTO \`order\` (user_id, total, points_earned, discount_amount, status, order_type, table_number, delivery_option) VALUES (?, ?, ?, ?, 'preparing', ?, ?, ?)`;
    db.query(insertOrderSql, [userId, calculatedTotal, pointsEarned, discountAmount, orderMode, tableNumber, deliveryOption], (err, result) => {
        if (err) throw err;

        const orderId = result.insertId;

        // items go in one at a time so each add-on row can point at its
        // order_item_id (order_item_has_add_on needs it)
        const insertLine = (i) => {
            if (i >= cart.length) {
                // all items saved - credit the points to the member's account
                db.query('UPDATE user SET points = points + ? WHERE user_id = ?', [pointsEarned, userId], (err2) => {
                    if (err2) throw err2;
                    req.session.user.points += pointsEarned; // keep the navbar pill in sync
                    req.session.cart = []; // Clear cart after successful checkout
                    let msg = `Order placed successfully! You earned ${pointsEarned} points.`;
                    if (discountAmount > 0) {
                        msg += ` Your ${tier.toUpperCase()} card saved you $${discountAmount.toFixed(2)}.`;
                    }
                    req.flash('success', msg);
                    return res.redirect('/orders');
                });
                return;
            }
            const line = cart[i];
            const itemSql = 'INSERT INTO order_item (order_id, menu_item_id, quantity, size_id, comment, unit_price) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(itemSql, [orderId, line.foodId, line.quantity, line.sizeId || null, line.comment || null, line.unitPrice], (err2, itemResult) => {
                if (err2) throw err2;
                const addonIds = line.addonIds || [];
                if (addonIds.length === 0) {
                    return insertLine(i + 1);
                }
                const addonRows = addonIds.map(a => [itemResult.insertId, a]);
                db.query('INSERT INTO order_item_has_add_on (order_item_id, add_on_id) VALUES ?', [addonRows], (err3) => {
                    if (err3) throw err3;
                    insertLine(i + 1);
                });
            });
        };
        insertLine(0);
    });
});

// 4. ORDER HISTORY (SELECT with JOINs)
app.get('/orders', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    // fixed to the real schema, aliased so the view keeps its field names
    const sql = `
        SELECT
            o.order_id,
            o.total AS total_amount,
            o.status,
            o.created_at,
            oi.quantity,
            COALESCE(oi.unit_price, mi.price) AS unit_price,
            mi.name AS food_name
        FROM \`order\` o
        JOIN order_item oi ON o.order_id = oi.order_id
        JOIN menu_item mi ON oi.menu_item_id = mi.menu_item_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) throw err;
        res.render('orders', {
            user: req.session.user,
            orders: results,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// 5. RESERVATIONS
app.get('/reservations', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    // fixed to the real schema, aliased so the view keeps its field names
    const sql = `
        SELECT reservation_id,
               reserve_date AS reservation_date,
               reserve_time AS reservation_time,
               pax AS party_size,
               table_number, status
        FROM reservation WHERE user_id = ? ORDER BY reserve_date DESC`;
    db.query(sql, [userId], (err, results) => {
        if (err) throw err;
        res.render('reservations', {
            user: req.session.user,
            reservations: results,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

app.post('/reservations', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const { reservation_date, reservation_time, party_size } = req.body;

    if (!reservation_date || !reservation_time || !party_size) {
        req.flash('error', 'All reservation fields are required.');
        return res.redirect('/reservations');
    }

    // fixed to the real schema; bookings start as 'pending' so the manager
    // can accept them and assign a table from the admin reservations queue
    const sql = `INSERT INTO reservation (user_id, reserve_date, reserve_time, pax, status) VALUES (?, ?, ?, ?, 'pending')`;
    db.query(sql, [userId, reservation_date, reservation_time, party_size], (err) => {
        if (err) throw err;
        req.flash('success', 'Reservation requested! The restaurant will confirm your table soon.');
        res.redirect('/reservations');
    });
});

// ==========================================
// PROFILE & FAMILY MANAGEMENT ROUTES
// ==========================================

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Member dashboard routes: dashboard with categories + search,
// favourites, book a table, complaints, redeem catalogue
// ============================================================

// member home: first category shown by default, or search results
app.get('/dashboard', checkAuthenticated, (req, res) => {
    const search = (req.query.search || '').trim();
    getAllCategories((err, categories) => {
        if (err) throw err;
        // default to the first category (e.g. Asian) when none picked
        const activeCategory = req.query.category || (categories.length > 0 ? categories[0].name : '');
        getDishesForMember(req.session.user.user_id, activeCategory, search, (err2, dishes) => {
            if (err2) throw err2;
            // show the member's next confirmed booking as a banner
            getReservationsByUser(req.session.user.user_id, (err3, reservations) => {
                if (err3) throw err3;
                const nextBooking = reservations.find(r => r.status === 'upcoming');

                // the floating cart popup reads the session cart directly -
                // each line already has its label, options and computed price
                const cart = req.session.cart || [];
                let cartSubtotal = 0;
                const cartItems = cart.map(line => {
                    cartSubtotal += line.unitPrice * line.quantity;
                    return { name: line.label, price: line.unitPrice, quantity: line.quantity,
                             addonNames: line.addonNames || [], comment: line.comment };
                });
                const tier = req.session.user.card_tier || 'basic';
                const discountRate = TIER_DISCOUNT[tier] || 0;

                // recent orders for the Order Status card under the points
                getOrdersByUser(req.session.user.user_id, (err5, myOrders) => {
                    if (err5) throw err5;
                    res.render('memberDashboard', {
                        user: req.session.user, categories, activeCategory, dishes, search, nextBooking,
                        cartItems, cartSubtotal, tier, discountRate, myOrders,
                        cartCount: cart.reduce((n, c) => n + c.quantity, 0),
                        orderMode: req.query.order === '1',
                        messages: req.flash('success'), errors: req.flash('error')
                    });
                })
            })
        })
    })
})

// dish detail page: description plus every member review (stars + comments).
// this is what a dish click opens while Order Now is NOT active
app.get('/dish/:id', checkAuthenticated, (req, res) => {
    getMenuItemWithCategory(req.params.id, (err, item) => {
        if (err) throw err;
        if (!item) return res.status(404).send('Dish not found');
        getReviews(req.params.id, (err2, reviews) => {
            if (err2) throw err2;
            // average worked out here so the page can draw filled star icons
            let avg = 0;
            reviews.forEach(r => avg += r.stars);
            avg = reviews.length > 0 ? Math.round((avg / reviews.length) * 10) / 10 : 0;
            res.render('dishDetail', {
                user: req.session.user, item, reviews, avg,
                messages: req.flash('success'), errors: req.flash('error')
            });
        })
    })
})

// member rates a dish 1-5 stars with an optional comment
app.post('/rate/:id', checkAuthenticated, (req, res) => {
    rateItem(req.session.user.user_id, req.params.id, req.body.stars, req.body.comment, (err) => {
        if (err) {
            req.flash('error', 'Could not save your rating.');
        } else {
            req.flash('success', 'Thanks for your review!');
        }
        res.redirect('/dish/' + req.params.id);
    })
})

// customise page: what a dish click opens while Order Now IS active.
// each category gets its own options (see the POST below for the pricing)
app.get('/customise/:id', checkAuthenticated, (req, res) => {
    getMenuItemWithCategory(req.params.id, (err, item) => {
        if (err) throw err;
        if (!item) return res.status(404).send('Dish not found');
        getAllAddOns((err2, addOns) => {
            if (err2) throw err2;
            res.render('customise', {
                user: req.session.user, item, addOns,
                pizzaSizes: PIZZA_SIZES, drinkSizes: DRINK_SIZES, pastaTypes: PASTA_TYPES,
                errors: req.flash('error')
            });
        })
    })
})

// order status tracker (like delivery apps): progress steps, summary,
// and the actions - online orders get "Received", dine-in gets "Rush"
app.get('/order-status/:id', checkAuthenticated, (req, res) => {
    getOrderForUser(req.params.id, req.session.user.user_id, (err, order) => {
        if (err) throw err;
        if (!order) return res.status(404).send('Order not found');
        getOrderItems(order.order_id, (err2, items) => {
            if (err2) throw err2;
            // delivery estimate follows the chosen speed
            const estimates = { saver: '45-50 min', priority: '15-20 min', standard: '20-35 min' };
            res.render('orderStatus', {
                user: req.session.user, order, items,
                estimate: order.delivery_option ? estimates[order.delivery_option] : null,
                messages: req.flash('success'), errors: req.flash('error')
            });
        })
    })
})

// online orders: the member confirms the food arrived
app.post('/order-status/:id/received', checkAuthenticated, (req, res) => {
    markReceived(req.params.id, req.session.user.user_id, (err) => {
        if (err) throw err;
        req.flash('success', 'Enjoy your meal! Order marked as received.');
        res.redirect('/order-status/' + req.params.id);
    })
})

// dine-in orders: rush request - flags the order so the admin sees the
// red "impatient" badge on the in-restaurant orders page
app.post('/order-status/:id/rush', checkAuthenticated, (req, res) => {
    rushOrder(req.params.id, req.session.user.user_id, (err) => {
        if (err) throw err;
        req.flash('success', 'Rush requested! The kitchen has been notified to speed up your order.');
        res.redirect('/order-status/' + req.params.id);
    })
})

// member switches their membership card from the profile page
app.post('/profile/card', checkAuthenticated, (req, res) => {
    const tier = req.body.card_tier;
    updateCardTier(req.session.user.user_id, tier, (err) => {
        if (err) {
            req.flash('error', 'That card type is not available.');
        } else {
            req.session.user.card_tier = tier; // keep the session in sync
            req.flash('success', `Your card has been switched to ${tier.toUpperCase()}.`);
        }
        res.redirect('/profile');
    })
})

// one heart button adds or removes a favourite, then returns to where you were
app.get('/favourites/toggle/:id', checkAuthenticated, (req, res) => {
    toggleFavourite(req.session.user.user_id, req.params.id, (err) => {
        if (err) throw err;
        if (req.query.back === 'favourites') {
            res.redirect('/favourites');
        } else {
            res.redirect('/dashboard?category=' + encodeURIComponent(req.query.category || ''));
        }
    })
})

app.get('/favourites', checkAuthenticated, (req, res) => {
    getFavourites(req.session.user.user_id, (err, favourites) => {
        if (err) throw err;
        res.render('favourites', { user: req.session.user, favourites });
    })
})

// book a table: request goes in as pending for the manager to accept
app.get('/book-table', checkAuthenticated, (req, res) => {
    getReservationsByUser(req.session.user.user_id, (err, reservations) => {
        if (err) throw err;
        res.render('bookTable', {
            user: req.session.user, reservations,
            messages: req.flash('success'), errors: req.flash('error')
        });
    })
})

app.post('/book-table', checkAuthenticated, (req, res) => {
    const { reserve_date, reserve_time, pax } = req.body;
    if (!reserve_date || !reserve_time || !pax) {
        req.flash('error', 'Date, time and number of people are required.');
        return res.redirect('/book-table');
    }
    // no bookings in the past
    if (reserve_date < new Date().toISOString().slice(0, 10)) {
        req.flash('error', 'The reservation date cannot be in the past.');
        return res.redirect('/book-table');
    }
    addMemberReservation(req.session.user.user_id, reserve_date, reserve_time, pax, (err) => {
        if (err) throw err;
        req.flash('success', 'Reservation requested! The restaurant will confirm your table soon.');
        res.redirect('/book-table');
    })
})

app.get('/book-table/cancel/:id', checkAuthenticated, (req, res) => {
    cancelOwnReservation(req.params.id, req.session.user.user_id, (err) => {
        if (err) throw err;
        req.flash('success', 'Reservation cancelled.');
        res.redirect('/book-table');
    })
})

// complaints / suggestions
app.get('/complain', checkAuthenticated, (req, res) => {
    res.render('complain', { user: req.session.user, messages: req.flash('success'), errors: req.flash('error') });
})

app.post('/complain', checkAuthenticated, (req, res) => {
    const topic = req.body.topic;
    const message = (req.body.message || '').trim();
    if (!topic || !message) {
        req.flash('error', 'Please pick a topic and write your feedback.');
        return res.redirect('/complain');
    }
    addComplaint(req.session.user.user_id, topic, message, (err) => {
        if (err) throw err;
        req.flash('success', 'Thank you! The manager will review your feedback.');
        res.redirect('/complain');
    })
})

// what your points can get you (redeeming happens at checkout)
app.get('/redeem', checkAuthenticated, (req, res) => {
    getRedeemableItems((err, items) => {
        if (err) throw err;
        res.render('redeem', { user: req.session.user, items });
    })
})

// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Admin routes: dashboard, manage menu + 86 list, orders,
// members & spending, reservations, complaints
// ============================================================
app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
    getDashboardCounts((err, counts) => {
        if (err) {
            throw err;
        }
        res.render('adminDashboard', { user: req.session.user, counts });
    })
})

// manage menu: plain list of every item (not the customer card view)
app.get('/admin/menu', checkAuthenticated, checkAdmin, (req, res) => {
    getAllMenuItems(false, (err, items) => {
        if (err) throw err;
        res.render('adminMenu', {
            user: req.session.user, items, only86: false,
            messages: req.flash('success'), errors: req.flash('error')
        });
    })
})

// the 86 list: same page but only sold-out items
app.get('/admin/menu/86', checkAuthenticated, checkAdmin, (req, res) => {
    getAllMenuItems(true, (err, items) => {
        if (err) throw err;
        res.render('adminMenu', {
            user: req.session.user, items, only86: true,
            messages: req.flash('success'), errors: req.flash('error')
        });
    })
})

app.get('/admin/menu/add', checkAuthenticated, checkAdmin, (req, res) => {
    getAllCategories((err, categories) => {
        if (err) throw err;
        res.render('adminMenuForm', { user: req.session.user, categories, item: null, errors: req.flash('error') });
    })
})

app.post('/admin/menu/add', checkAuthenticated, checkAdmin, upload.single('image'), (req, res) => {
    const { name, category_id, description, price } = req.body;
    if (!name || !category_id || !description || !price) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/admin/menu/add');
    }
    const item = {
        category_id, name, description, price,
        image: req.file ? req.file.filename : 'placeholder.jpg',
        available: req.body.available ? 1 : 0
    };
    insertMenuItem(item, (err) => {
        if (err) throw err;
        req.flash('success', `Added "${name}" to the menu.`);
        res.redirect('/admin/menu');
    })
})

app.get('/admin/menu/edit/:id', checkAuthenticated, checkAdmin, (req, res) => {
    getMenuItemById(req.params.id, (err, item) => {
        if (err) throw err;
        if (!item) return res.status(404).send('Menu item not found');
        getAllCategories((err2, categories) => {
            if (err2) throw err2;
            res.render('adminMenuForm', { user: req.session.user, categories, item, errors: req.flash('error') });
        })
    })
})

app.post('/admin/menu/edit/:id', checkAuthenticated, checkAdmin, upload.single('image'), (req, res) => {
    const { name, category_id, description, price } = req.body;
    let image = req.body.currentImage;   // keep the old picture...
    if (req.file) {
        image = req.file.filename;       // ...unless a new one was uploaded
    }
    const item = { category_id, name, description, price, image, available: req.body.available ? 1 : 0 };
    updateMenuItem(req.params.id, item, (err) => {
        if (err) throw err;
        req.flash('success', `Updated "${name}".`);
        res.redirect('/admin/menu');
    })
})

app.get('/admin/menu/delete/:id', checkAuthenticated, checkAdmin, (req, res) => {
    deleteMenuItem(req.params.id, (err) => {
        if (err) {
            // items that appear in past orders cannot be deleted (foreign key) - 86 them instead
            req.flash('error', 'This item has been ordered before so it cannot be deleted. Use 86 to hide it instead.');
        } else {
            req.flash('success', 'Item deleted.');
        }
        res.redirect('/admin/menu');
    })
})

app.get('/admin/menu/toggle/:id', checkAuthenticated, checkAdmin, (req, res) => {
    toggleAvailability(req.params.id, (err) => {
        if (err) throw err;
        // stay on whichever list the admin was looking at
        res.redirect(req.query.back === '86' ? '/admin/menu/86' : '/admin/menu');
    })
})

// orders: two tabs, online and in-restaurant
app.get('/admin/orders', checkAuthenticated, checkAdmin, (req, res) => {
    res.redirect('/admin/orders/online');
})

app.get('/admin/orders/:type', checkAuthenticated, checkAdmin, (req, res) => {
    const type = req.params.type === 'restaurant' ? 'in_restaurant' : 'online';
    getOrdersByType(type, (err, orders) => {
        if (err) throw err;
        res.render('adminOrders', {
            user: req.session.user, orders,
            activeTab: req.params.type === 'restaurant' ? 'restaurant' : 'online',
            messages: req.flash('success')
        });
    })
})

app.get('/admin/orders/:type/status/:id/:status', checkAuthenticated, checkAdmin, (req, res) => {
    updateOrderStatus(req.params.id, req.params.status, (err) => {
        if (err) throw err;
        req.flash('success', `Order #${req.params.id} marked as ${req.params.status}.`);
        res.redirect('/admin/orders/' + req.params.type);
    })
})

// members: membership, card tier and spending
app.get('/admin/members', checkAuthenticated, checkAdmin, (req, res) => {
    getAllMembers((err, members) => {
        if (err) throw err;
        res.render('adminMembers', { user: req.session.user, members });
    })
})

app.get('/admin/members/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const fromDate = req.query.from || '';
    const toDate = req.query.to || '';
    getMemberById(req.params.id, (err, member) => {
        if (err) throw err;
        if (!member) return res.status(404).send('Member not found');
        getMemberSpending(req.params.id, fromDate, toDate, (err2, orders) => {
            if (err2) throw err2;
            // total for the filtered period, added up server-side
            let periodTotal = 0;
            orders.forEach(o => periodTotal += Number(o.total));
            res.render('adminMemberDetail', { user: req.session.user, member, orders, periodTotal, fromDate, toDate });
        })
    })
})

// reservations: pending requests + upcoming (accepted) bookings
app.get('/admin/reservations', checkAuthenticated, checkAdmin, (req, res) => {
    getReservationsByStatus('pending', (err, pending) => {
        if (err) throw err;
        getReservationsByStatus('upcoming', (err2, upcoming) => {
            if (err2) throw err2;
            res.render('adminReservations', {
                user: req.session.user, pending, upcoming,
                messages: req.flash('success'), errors: req.flash('error')
            });
        })
    })
})

app.post('/admin/reservations/accept/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const tableNumber = parseInt(req.body.table_number);
    if (!tableNumber) {
        req.flash('error', 'Enter a table number to accept a reservation.');
        return res.redirect('/admin/reservations');
    }
    acceptReservation(req.params.id, tableNumber, (err) => {
        if (err) throw err;
        req.flash('success', `Reservation accepted - table ${tableNumber} assigned.`);
        res.redirect('/admin/reservations');
    })
})

// phone bookings keyed in by the admin go straight to upcoming
app.post('/admin/reservations/add', checkAuthenticated, checkAdmin, (req, res) => {
    const { card_id, reserve_date, reserve_time, pax, table_number } = req.body;
    if (!card_id || !reserve_date || !reserve_time || !pax || !table_number) {
        req.flash('error', 'All reservation fields are required.');
        return res.redirect('/admin/reservations');
    }
    findMemberByCardId(card_id.trim(), (err, member) => {
        if (err) throw err;
        if (!member) {
            req.flash('error', `No member found with card ID ${card_id}.`);
            return res.redirect('/admin/reservations');
        }
        addWalkInReservation(member.user_id, reserve_date, reserve_time, pax, table_number, (err2) => {
            if (err2) throw err2;
            req.flash('success', `Reservation added for ${member.name} (table ${table_number}).`);
            res.redirect('/admin/reservations');
        })
    })
})

// remove covers: finished bookings, member cancellations and rejected requests
app.get('/admin/reservations/remove/:id', checkAuthenticated, checkAdmin, (req, res) => {
    removeReservation(req.params.id, (err) => {
        if (err) throw err;
        req.flash('success', 'Reservation removed.');
        res.redirect('/admin/reservations');
    })
})

// drill-down from a member's spending: what was in one order
app.get('/admin/members/:id/order/:orderId', checkAuthenticated, checkAdmin, (req, res) => {
    getMemberById(req.params.id, (err, member) => {
        if (err) throw err;
        if (!member) return res.status(404).send('Member not found');
        getOrderById(req.params.orderId, (err2, order) => {
            if (err2) throw err2;
            // the order must actually belong to this member
            if (!order || order.user_id !== member.user_id) return res.status(404).send('Order not found');
            getOrderItems(req.params.orderId, (err3, items) => {
                if (err3) throw err3;
                res.render('adminOrderDetail', { user: req.session.user, member, order, items });
            })
        })
    })
})

// complaints and opinions from members
app.get('/admin/complaints', checkAuthenticated, checkAdmin, (req, res) => {
    getAllComplaints((err, complaints) => {
        if (err) throw err;
        res.render('adminComplaints', { user: req.session.user, complaints, messages: req.flash('success') });
    })
})

app.get('/admin/complaints/remove/:id', checkAuthenticated, checkAdmin, (req, res) => {
    removeComplaint(req.params.id, (err) => {
        if (err) throw err;
        req.flash('success', 'Complaint cleared.');
        res.redirect('/admin/complaints');
    })
})

// profile route
app.get('/profile', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) throw err;

        const isFamilyOwner = userInfo.primary_user_id === null;

        getFamilyMembers(userInfo.card_id, (err, familyMembers) => {
            if (err) throw err;

            const renderProfile = (relationshipTypes) => {
                res.render('profile', {
                    user: req.session.user,
                    profileUser: userInfo,
                    isFamilyOwner,
                    familyMembers,
                    relationshipTypes,
                    messages: req.flash('success'),
                    errors: req.flash('error')
                });
            };

            if (isFamilyOwner) {
                getRelationshipTypes((err, relationshipTypes) => {
                    if (err) throw err;
                    renderProfile(relationshipTypes);
                });
            } else {
                renderProfile([]);
            }
        });
    });
});

app.post('/profile', checkAuthenticated, (req, res) => {
    const name = req.body.name.trim();
    const phone_number = req.body.phone_number.trim();

    if (!name || !phone_number) {
        req.flash('error', 'Name and phone number are required.');
        return res.redirect('/profile');
    }

    updateUser(req.session.user.user_id, { name, phone_number }, (err) => {
        if (err) throw err;
        req.session.user.name = name;
        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');
    });
});

app.post('/profile/family/add', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) throw err;

        if (userInfo.primary_user_id !== null) {
            req.flash('error', 'Only the family owner can add family members.');
            return res.redirect('/profile');
        }

        const name = req.body.name.trim();
        const phone_number = req.body.phone_number.trim();
        const password = req.body.password;
        const relationship_type_id = req.body.relationship_type_id;

        if (!name || !phone_number || !password || !relationship_type_id) {
            req.flash('error', 'All fields are required to add a family member.');
            return res.redirect('/profile');
        }

        generateFamilyCardId(userInfo.user_id, userInfo.card_id, (err, card_id) => {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('/profile');
            }

            addFamilyMember(userInfo.user_id, { card_id, name, phone_number, password, relationship_type_id }, (err) => {
                if (err) throw err;
                req.flash('success', `${name} was added to your family. Their card ID is ${card_id}`);
                res.redirect('/profile');
            });
        });
    });
});

app.post('/profile/family/:id/edit', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) throw err;

        if (userInfo.primary_user_id !== null) {
            req.flash('error', 'Only the family owner can edit family members.');
            return res.redirect('/profile');
        }

        const name = req.body.name.trim();
        const relationship_type_id = req.body.relationship_type_id;
        const password = req.body.password.trim();

        if (!name || !relationship_type_id) {
            req.flash('error', 'Name and relationship are required.');
            return res.redirect('/profile');
        }

        updateFamilyMember(req.params.id, userInfo.user_id, { name, relationship_type_id, password }, (err) => {
            if (err) throw err;
            req.flash('success', 'Family member updated.');
            res.redirect('/profile');
        });
    });
});

app.post('/profile/family/:id/delete', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) throw err;

        if (userInfo.primary_user_id !== null) {
            req.flash('error', 'Only the family owner can remove family members.');
            return res.redirect('/profile');
        }

        deleteFamilyMember(req.params.id, userInfo.user_id, (err) => {
            if (err) throw err;
            req.flash('success', 'Family member removed.');
            res.redirect('/profile');
        });
    });
});

// Destroys the session
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port http://localhost:${PORT}`);
});
