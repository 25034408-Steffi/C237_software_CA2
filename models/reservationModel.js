// ============================================================
// Done by: Khaing Khant Zaw (Leon)
// Feature: Admin - reservations (pending/upcoming, accept with table, phone bookings)
// ============================================================
const db = require('../database')

// reservations of one status ('pending' or 'upcoming') with the member's details
function getReservationsByStatus(status, callback) {
    const sql = `
    SELECT r.reservation_id, r.reserve_date, r.reserve_time, r.pax, r.table_number, r.status,
           u.name, u.card_id
    FROM reservation r
    INNER JOIN user u ON r.user_id = u.user_id
    WHERE r.status = ?
    ORDER BY r.reserve_date, r.reserve_time`

    db.query(sql, [status], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// admin accepts a pending reservation and assigns it a table
function acceptReservation(reservationId, tableNumber, callback) {
    const sql = "UPDATE reservation SET status = 'upcoming', table_number = ? WHERE reservation_id = ? AND status = 'pending'"
    db.query(sql, [tableNumber, reservationId], callback)
}

// admin keys in a phone booking directly (goes straight to upcoming with a table)
function addWalkInReservation(userId, reserveDate, reserveTime, pax, tableNumber, callback) {
    const sql = "INSERT INTO reservation (user_id, reserve_date, reserve_time, pax, table_number, status) VALUES (?, ?, ?, ?, ?, 'upcoming')"
    db.query(sql, [userId, reserveDate, reserveTime, pax, tableNumber], callback)
}

// used for finished upcoming reservations, member cancellations and rejected requests
function removeReservation(reservationId, callback) {
    db.query('DELETE FROM reservation WHERE reservation_id = ?', [reservationId], callback)
}

// ---------- member side (book a table) ----------

// a member's own reservations, soonest first
function getReservationsByUser(userId, callback) {
    const sql = `
    SELECT reservation_id, reserve_date, reserve_time, pax, table_number, status
    FROM reservation
    WHERE user_id = ?
    ORDER BY reserve_date, reserve_time`

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return callback(err)
        }
        callback(null, results)
    })
}

// member requests a table - goes in as pending until the manager accepts
function addMemberReservation(userId, reserveDate, reserveTime, pax, callback) {
    const sql = "INSERT INTO reservation (user_id, reserve_date, reserve_time, pax, status) VALUES (?, ?, ?, ?, 'pending')"
    db.query(sql, [userId, reserveDate, reserveTime, pax], callback)
}

// member can only cancel their OWN booking (user_id check stops others' ids)
function cancelOwnReservation(reservationId, userId, callback) {
    db.query('DELETE FROM reservation WHERE reservation_id = ? AND user_id = ?', [reservationId, userId], callback)
}

module.exports = {getReservationsByStatus, acceptReservation, addWalkInReservation, removeReservation,
                  getReservationsByUser, addMemberReservation, cancelOwnReservation}
