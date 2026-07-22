const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const db = require('./database');
const { 
    getFoodCategoryCount, 
    getFoodByCategory, 
    getUserFavourites,
    getFavouritesCount
} = require("./models/foodModel");
const { 
    getUserById, 
    updateUser, 
    getFamilyMembers, 
    getRelationshipTypes, 
    generateFamilyCardId, 
    addFamilyMember, 
    updateFamilyMember, 
    deleteFamilyMember 
} = require("./models/userModel");

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
    const { name, telephoneNo, password } = req.body;

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

    const sql = `
    SELECT user_id, card_id, name, role, points
    FROM user
    WHERE card_id = ? AND password = SHA1(?)`;

    db.query(sql, [card_id, password], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/menu');
        } else {
            req.flash('error', 'Invalid card ID or password.');
            res.redirect('/login');
        }
    });
});

// Menu routes
app.get('/menu', (req, res) => {
    res.redirect('/menu/Asian');
});

// cant add a favourite category (food cant exist in 2 categories simultaneously)
// so faourites tab is hardcoded into the foodNav
// instead, fetch from a favourote table
app.get('/menu/favourites', checkAuthenticated, (req, res) => {
    getFoodCategoryCount((err, categoryCount) => {
        if (err) throw err;

        getUserFavourites(req.session.user.user_id, (err, favouriteMenuItems) => {
            if (err) throw err;

            getFavouritesCount(req.session.user.user_id, (err, favouriteCount) => {
                if (err) throw err;

                res.render('menu', {
                    user: req.session.user,
                    counts: categoryCount,
                    activeCategory: 'Favourites',
                    menuItems: favouriteMenuItems,
                    favouriteCount
                });

            });
        });
    });
});

app.get('/menu/:category', checkAuthenticated, (req, res) => {
    const activeCategory = req.params.category;
    getFoodCategoryCount((err, categoryCount) => {
        if (err) throw err;

        getFoodByCategory(activeCategory, (err, menuItems) => {
            if (err) throw err;

            getFavouritesCount(req.session.user.user_id, (err, favouriteCount) => {
                if (err) throw err;

                res.render('menu', {
                    user: req.session.user,
                    counts: categoryCount,
                    activeCategory,
                    menuItems,
                    favouriteCount
                });
            });
        });
    });
});

// ==========================================
// FEATURE ASSIGNMENT: CART & RESERVATIONS
// ==========================================

// 1. ADD TO CART (Session-based Cart)
app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const foodId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    const existingIndex = req.session.cart.findIndex(item => item.foodId === foodId);
    if (existingIndex > -1) {
        req.session.cart[existingIndex].quantity += quantity;
    } else {
        req.session.cart.push({ foodId, quantity });
    }

    req.flash('success', 'Item added to cart.');
    res.redirect('/cart');
});

// 2. VIEW CART (Server-side Total Calculation)
app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    
    if (cart.length === 0) {
        return res.render('cart', { 
            user: req.session.user, 
            cartItems: [], 
            total: "0.00",
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    }

    const ids = cart.map(item => item.foodId);
    const sql = `SELECT * FROM food WHERE id IN (?)`;

    db.query(sql, [ids], (err, results) => {
        if (err) throw err;

        let total = 0;
        const cartItems = results.map(food => {
            const itemInCart = cart.find(c => c.foodId === food.id);
            const itemTotal = food.price * itemInCart.quantity;
            total += itemTotal;

            return {
                ...food,
                quantity: itemInCart.quantity,
                itemTotal: itemTotal.toFixed(2)
            };
        });

        res.render('cart', {
            user: req.session.user,
            cartItems,
            total: total.toFixed(2),
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// 3. CHECKOUT (INSERT INTO order & order_item)
app.post('/checkout', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const cart = req.session.cart || [];

    if (cart.length === 0) {
        req.flash('error', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    const ids = cart.map(item => item.foodId);
    db.query(`SELECT * FROM food WHERE id IN (?)`, [ids], (err, items) => {
        if (err) throw err;

        let calculatedTotal = 0;
        cart.forEach(cartItem => {
            const food = items.find(f => f.id === cartItem.foodId);
            if (food) {
                calculatedTotal += food.price * cartItem.quantity;
            }
        });

        const insertOrderSql = `INSERT INTO \`order\` (user_id, total_amount, status) VALUES (?, ?, 'Pending')`;
        db.query(insertOrderSql, [userId, calculatedTotal], (err, result) => {
            if (err) throw err;

            const orderId = result.insertId;
            const orderItemsData = cart.map(item => {
                const food = items.find(f => f.id === item.foodId);
                return [orderId, item.foodId, item.quantity, food.price];
            });

            const insertItemsSql = `INSERT INTO order_item (order_id, food_id, quantity, price) VALUES ?`;
            db.query(insertItemsSql, [orderItemsData], (err) => {
                if (err) throw err;

                req.session.cart = []; // Clear cart after successful checkout
                req.flash('success', 'Order placed successfully!');
                res.redirect('/orders');
            });
        });
    });
});

// 4. ORDER HISTORY (SELECT with JOINs)
app.get('/orders', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    const sql = `
        SELECT 
            o.id AS order_id, 
            o.total_amount, 
            o.status, 
            o.created_at,
            oi.quantity, 
            oi.price AS unit_price,
            f.name AS food_name
        FROM \`order\` o
        JOIN order_item oi ON o.id = oi.order_id
        JOIN food f ON oi.food_id = f.id
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

    const sql = `SELECT * FROM reservation WHERE user_id = ? ORDER BY reservation_date DESC`;
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

    const sql = `INSERT INTO reservation (user_id, reservation_date, reservation_time, party_size, status) VALUES (?, ?, ?, ?, 'Confirmed')`;
    db.query(sql, [userId, reservation_date, reservation_time, party_size], (err) => {
        if (err) throw err;
        req.flash('success', 'Reservation confirmed!');
        res.redirect('/reservations');
    });
});

// ==========================================
// PROFILE & FAMILY MANAGEMENT ROUTES
// ==========================================

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
