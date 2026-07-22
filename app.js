const express = require('express');

const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const db = require('./database')
const { getFoodCategoryCount, getFoodByCategory } = require("./models/foodModel");
const { getUserById, updateUser, getFamilyMembers, getRelationshipTypes, generateFamilyCardId, addFamilyMember, updateFamilyMember, deleteFamilyMember } = require("./models/userModel");
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
    const sql = `
    SELECT user_id, card_id, name, role, points
    FROM user
    WHERE card_id = ? AND password = SHA1(?)`;

    db.query(sql, [card_id, password], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; // store user in session
            res.redirect('/menu');  // have to add stuff here to redirect when successful
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
