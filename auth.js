require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 10);
}

async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { hashPassword, comparePassword, generateToken };