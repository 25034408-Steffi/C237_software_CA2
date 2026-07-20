const express = require('express');
const mysql = require('mysql2');

const session = require('express-session');
const flash = require('connect-flash');

const app = express();


// Database connection
const db = mysql.createConnection({
    host: 'c237-adib-mysql.mysql.database.azure.com',
    user: 'c237_026',
    password: 'c237026@2026!',
    database: 'insert db here',
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

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

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port http://localhost:${PORT}`);
});
