// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Complaints & opinions (member submits, manager reviews)
// ============================================================
const db = require('../database')

function addComplaint(userId, topic, message, callback) {
    const sql = 'INSERT INTO complaint (user_id, topic, message) VALUES (?, ?, ?)'
    db.query(sql, [userId, topic, message], callback)
}

// newest first, with the member's details for the manager
function getAllComplaints(callback) {
    const sql = `
    SELECT c.complaint_id, c.topic, c.message, c.created_at, u.name, u.card_id
    FROM complaint c
    INNER JOIN user u ON c.user_id = u.user_id
    ORDER BY c.created_at DESC`

    db.query(sql, (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// manager clears a complaint once it has been handled
function removeComplaint(complaintId, callback) {
    db.query('DELETE FROM complaint WHERE complaint_id = ?', [complaintId], callback)
}

module.exports = {addComplaint, getAllComplaints, removeComplaint}
