const mysql = require('mysql2');

// Database connection POOL instead of a single connection.
// The Azure server drops idle connections, and with createConnection that
// crashed the whole app; a pool hands out a fresh connection per query and
// reconnects by itself. db.query(...) works exactly the same everywhere.
const db = mysql.createPool({
    host: 'c237-adib-mysql.mysql.database.azure.com',
    user: 'c237_026',
    password: 'c237026@2026!',
    database: 'c237_026_team5_ca2',
    ssl: {
        rejectUnauthorized: false
    },
    connectionLimit: 5,
    waitForConnections: true
});

// quick startup check that the database is reachable
db.query('SELECT 1', (err) => {
    if (err) {
        console.error('Could not reach the database:', err.message);
    } else {
        console.log('Connected to database');
    }
});

module.exports = db;
