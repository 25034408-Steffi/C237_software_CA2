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

module.exports = {getReservationsByStatus, acceptReservation, addWalkInReservation, removeReservation}
