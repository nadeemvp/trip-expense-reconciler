require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 10);
}

async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

function generateToken(userId) {
  return jwt.sign(
    { id: userId },  // ← THIS LINE MUST INCLUDE THE USER ID
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { hashPassword, comparePassword, generateToken };