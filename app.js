const express = require('express');

const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const db = require('./database')
const { getFoodCategoryCount } = require("./models/foodModel");
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
    const { username, email, password } = req.body;

    if (!username || !email || !password ) {
        return res.send('All fields are required.');
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
        res.redirect('/dashboard');
    }
};

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

app.get('/register', (req, res) => {
    res.render('registerUser', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password } = req.body;

    const sql = 'INSERT INTO user (username, email, password) VALUES (?, ?, SHA1(?))';
    db.query(sql, [username, email, password], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});



app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
})

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    const sql = 'SELECT * FROM user WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; // store user in session
            req.flash('success', 'Login successful!');
            res.redirect('/menu');  // have to add stuff here to redirect when successful
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/menu', (req, res) =>{
    res.redirect('/menu/Asian')
    }
)

// dedault page is asian so /menu redirects to it
app.get('/menu/:category', checkAuthenticated, (req, res) => {
    const activeCategory = req.params.category;
    getFoodCategoryCount((err, results) => {
        if (err) {
            throw err;
        }
        res.render('menu', {user: req.session.user, counts: results, activeCategory});
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port http://localhost:${PORT}`);
});
