const express = require('express');

const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');

const app = express();
const db = require('./database')
const { getFoodCategoryCount, getFoodByCategory, getAllMenuItems, getMenuItemById,
        getAllCategories, insertMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability,
        getDishesForMember, getFavourites, toggleFavourite, getRedeemableItems } = require("./models/foodModel");
const { addComplaint, getAllComplaints, removeComplaint } = require("./models/complaintModel");
const { getUserById, updateUser, getFamilyMembers, getRelationshipTypes, generateFamilyCardId, addFamilyMember, updateFamilyMember, deleteFamilyMember,
        getAllMembers, getMemberById, getMemberSpending, findMemberByCardId } = require("./models/userModel");
const { getDashboardCounts } = require("./models/adminModel");
const { getOrdersByType, updateOrderStatus, getOrderById, getOrderItems } = require("./models/orderModel");
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
app.use(session({
    secret: 'notsasecret',
    resave: false,
    saveUninitialized: true,
    // cookie lasts for for 24 hours
    cookie: {maxAge: 1000 * 60 * 60 * 24}
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(flash());
app.set('view engine', 'ejs');

const validateRegistration = (req, res, next) => {
    const { name, telephoneNo, password } = req.body;

    if (!name || !telephoneNo || !password ) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body)
        return res.redirect('/register')

    }
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body); 
        return res.redirect('/register'); // redirect to register with previous filled in formData if it fails
    }
    //If all validations pass, the next function is called, allowing the request to proceed to the
    //next middleware function or route handler.
    next();
};

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
}

const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/');
    }
};

app.get('/', (req, res) => {
    res.render('index', {
    user: req.session.user, 
    messages: req.flash('success') 
    });
});

// register routes
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

    const card_id = `${name[0].toUpperCase()}0${telephoneNo.substring(0, 3)}00`
    
    const sql = 'INSERT INTO user (name, card_id, phone_number, password, points, role) VALUES (?, ?, ?, SHA1(?), ?, ?)';
    db.query(sql, [name, card_id, telephoneNo , password, 0, 'customer'], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', `Registration successful! Your card ID is ${card_id}`);
        res.redirect('/login');
    });
});

// login routes
app.get('/login', (req, res) => {
    res.render('login', {
        user: req.session.user,
        messages: req.flash('success'),
        errors: req.flash('error')
    });
})

app.post('/login', (req, res) => {
    const {password } = req.body;
    const card_id = req.body.card_id.trim();
    // Validate email and password
    if (!card_id || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    // members log in with their card ID; the admin logs in with their name (same form).
    // session only stores non-sensitive columns (no password)
    const sql = `
    SELECT user_id, card_id, name, role, points
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
            // Invalid credentials
            req.flash('error', 'Invalid card ID or password.');
            res.redirect('/login');
        }
    });
});

// menu routes
app.get('/menu', (req, res) =>{
    res.redirect('/menu/Asian');
    }
)

// default page is asian so /menu redirects to it
app.get('/menu/:category', checkAuthenticated, (req, res) => {
    const activeCategory = req.params.category;
    getFoodCategoryCount((err, categoryCount) => {
        if (err) {
            throw err;
        }

        getFoodByCategory(activeCategory, (err, menuItems) => {
            if (err) {
                throw err;
            }
            res.render('menu', {
                user: req.session.user, 
                counts: categoryCount, 
                activeCategory,
                menuItems});
        })
    })
})

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
                res.render('memberDashboard', {
                    user: req.session.user, categories, activeCategory, dishes, search, nextBooking,
                    messages: req.flash('success')
                });
            })
        })
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
        if (err) {
            throw err;
        }

        // primary_user_id NULL means this account IS the family owner (not a member under someone else)
        const isFamilyOwner = userInfo.primary_user_id === null;

        // any family member's card_id shares the same prefix, so we can search from our own
        getFamilyMembers(userInfo.card_id, (err, familyMembers) => {
            if (err) {
                throw err;
            }

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

            // relationshipTypes only fills the "Add Family Member" dropdown, and only owners
            // ever see that modal, so skip the extra query for non-owners
            if (isFamilyOwner) {
                getRelationshipTypes((err, relationshipTypes) => {
                    if (err) {
                        throw err;
                    }
                    renderProfile(relationshipTypes);
                });
            } else {
                renderProfile([]);
            }
        });
    });
});

// for user editing their own profile, card id and points cant be changed
app.post('/profile', checkAuthenticated, (req, res) => {
    const name = req.body.name.trim();
    const phone_number = req.body.phone_number.trim();

    if (!name || !phone_number) {
        req.flash('error', 'Name and phone number are required.');
        return res.redirect('/profile');
    }

    updateUser(req.session.user.user_id, { name, phone_number }, (err) => {
        if (err) {
            throw err;
        }
        req.session.user.name = name;
        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');
    });
});

// family management routes
app.post('/profile/family/add', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) {
            throw err;
        }

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
                if (err) {
                    throw err;
                }
                req.flash('success', `${name} was added to your family. Their card ID is ${card_id}`);
                res.redirect('/profile');
            });
        });
    });
});

// edit family member (name, relationship, and optionally reset their password)
app.post('/profile/family/:id/edit', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) {
            throw err;
        }

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
            if (err) {
                throw err;
            }
            req.flash('success', 'Family member updated.');
            res.redirect('/profile');
        });
    });
});

// delete family member
app.post('/profile/family/:id/delete', checkAuthenticated, (req, res) => {
    getUserById(req.session.user.user_id, (err, userInfo) => {
        if (err) {
            throw err;
        }

        // if the user is not the family owner, they cannot remove family members
        if (userInfo.primary_user_id !== null) {
            req.flash('error', 'Only the family owner can remove family members.');
            return res.redirect('/profile');
        }

        deleteFamilyMember(req.params.id, userInfo.user_id, (err) => {
            if (err) {
                throw err;
            }
            req.flash('success', 'Family member removed.');
            res.redirect('/profile');
        });
    });
});

// destroys the session
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port http://localhost:${PORT}`);
});
