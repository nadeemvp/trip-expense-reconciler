const pool = require('./db');

async function isTripAdmin(tripId, userId) {
  const result = await pool.query(
    `SELECT role FROM trip_members WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  );

  if (result.rows.length === 0) return false;
  return result.rows[0].role === 'admin';
}

module.exports = { isTripAdmin };