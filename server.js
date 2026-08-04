const express = require('express');
const pool = require('./db');
require('dotenv').config();
const { hashPassword, comparePassword, generateToken } = require('./auth');
const app = express();
app.use(express.json());
const PORT = 3000;
const { getExchangeRate } = require('./fx');

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/', (req, res) => {
  res.send('API is running');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

app.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'You are authenticated', user: req.user });
});

app.post('/trips', verifyToken, async (req, res) => {
  try {
    const { name, base_currency } = req.body;
    const userId = req.user.id;

    if (!name || !base_currency) {
      return res.status(400).json({ error: 'Trip name and base currency are required' });
    }

    const result = await pool.query(
      'INSERT INTO trips (name, base_currency, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, base_currency, userId]
    );

    const trip = result.rows[0];

    await pool.query(
      'INSERT INTO trip_members (trip_id, user_id) VALUES ($1, $2)',
      [trip.id, userId]
    );

    res.status(201).json({ trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/trips/:tripId/members', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await pool.query(
      'INSERT INTO trip_members (trip_id, user_id) VALUES ($1, $2) RETURNING *',
      [tripId, userId]
    );

    res.status(201).json({ member: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/trips/:tripId', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;

    const tripResult = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const membersResult = await pool.query(
      `SELECT users.id, users.name, users.email
       FROM trip_members
       JOIN users ON trip_members.user_id = users.id
       WHERE trip_members.trip_id = $1`,
      [tripId]
    );

    res.status(200).json({
      trip: tripResult.rows[0],
      members: membersResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/trips/:tripId/expenses', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { description, amount, currency, category, expense_date, paid_by, splitBetween } = req.body;

    if (!description || !amount || !currency || !expense_date || !paid_by || !splitBetween) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tripResult = await pool.query('SELECT base_currency FROM trips WHERE id = $1', [tripId]);
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const baseCurrency = tripResult.rows[0].base_currency;

    const rate = await getExchangeRate(currency, baseCurrency, expense_date);
    const baseCurrencyAmount = (amount * rate).toFixed(2);

    const expenseResult = await pool.query(
      `INSERT INTO expenses (trip_id, paid_by, description, amount, currency, category, expense_date, base_currency_amount, exchange_rate_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tripId, paid_by, description, amount, currency, category, expense_date, baseCurrencyAmount, rate]
    );

    const expense = expenseResult.rows[0];

    const shareAmount = (baseCurrencyAmount / splitBetween.length).toFixed(2);

    const splitInserts = splitBetween.map(userId =>
      pool.query(
        'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES ($1, $2, $3)',
        [expense.id, userId, shareAmount]
      )
    );

    await Promise.all(splitInserts);

    res.status(201).json({ expense, splitBetween, shareAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/trips/:tripId/expenses', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;

    const result = await pool.query(
      'SELECT * FROM expenses WHERE trip_id = $1 ORDER BY expense_date DESC',
      [tripId]
    );

    res.status(200).json({ expenses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});