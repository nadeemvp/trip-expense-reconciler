const express = require('express');
const pool = require('./db');
require('dotenv').config();
const { hashPassword, comparePassword, generateToken } = require('./auth');
const app = express();
app.use(express.json());
const PORT = 3000;
const { getExchangeRate } = require('./fx');
const { calculateSettlement } = require('./settlement');
const cors = require('cors');
app.use(cors());
const { isTripAdmin } = require('./permissions');

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);
    res.status(201).json({ token, name: user.name, id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    res.status(200).json({ token, name: user.name, id: user.id });
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
    const userId = req.user.id;
    const { name, base_currency, trip_type, monthly_budget } = req.body;

    if (!name || !base_currency) {
      return res.status(400).json({ error: 'name and base_currency are required' });
    }

    const type = trip_type || 'group';
    const budget = monthly_budget || null;

    const result = await pool.query(
      `INSERT INTO trips (name, base_currency, created_by, trip_type, monthly_budget)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, base_currency, userId, type, budget]
    );

    const trip = result.rows[0];

    // Only add as member for group trips; personal trips are solo
    if (type === 'group') {
      await pool.query(
        'INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3)',
        [trip.id, userId, 'admin']
      );
    }

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
    const requesterId = req.user.id;

    const requesterIsAdmin = await isTripAdmin(tripId, requesterId);
    if (!requesterIsAdmin) {
      return res.status(403).json({ error: 'Only trip admins can add members' });
    }

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

app.get('/trips/:tripId/balances', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;

    const paidResult = await pool.query(
      `SELECT paid_by AS user_id, SUM(base_currency_amount) AS total_paid
       FROM expenses WHERE trip_id = $1 GROUP BY paid_by`,
      [tripId]
    );

    const owedResult = await pool.query(
      `SELECT es.user_id, SUM(es.share_amount) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.trip_id = $1 GROUP BY es.user_id`,
      [tripId]
    );

    const balances = {};

    paidResult.rows.forEach(row => {
      balances[row.user_id] = { paid: parseFloat(row.total_paid), owed: 0 };
    });

    owedResult.rows.forEach(row => {
      if (!balances[row.user_id]) balances[row.user_id] = { paid: 0, owed: 0 };
      balances[row.user_id].owed = parseFloat(row.total_owed);
    });

    const netBalances = Object.entries(balances).map(([userId, b]) => ({
      user_id: parseInt(userId),
      net: parseFloat((b.paid - b.owed).toFixed(2))
    }));

    res.status(200).json({ balances: netBalances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/trips/:tripId/settlement', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;

    const paidResult = await pool.query(
      `SELECT paid_by AS user_id, SUM(base_currency_amount) AS total_paid
       FROM expenses WHERE trip_id = $1 GROUP BY paid_by`,
      [tripId]
    );
    const owedResult = await pool.query(
      `SELECT es.user_id, SUM(es.share_amount) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.trip_id = $1 GROUP BY es.user_id`,
      [tripId]
    );

    const balances = {};
    paidResult.rows.forEach(row => {
      balances[row.user_id] = { paid: parseFloat(row.total_paid), owed: 0 };
    });
    owedResult.rows.forEach(row => {
      if (!balances[row.user_id]) balances[row.user_id] = { paid: 0, owed: 0 };
      balances[row.user_id].owed = parseFloat(row.total_owed);
    });

    const netBalances = Object.entries(balances).map(([userId, b]) => ({
      user_id: parseInt(userId),
      net: parseFloat((b.paid - b.owed).toFixed(2))
    }));

    const settlement = calculateSettlement(netBalances);

    res.status(200).json({ balances: netBalances, settlement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.get('/trips', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT DISTINCT t.* FROM trips t
       JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.status(200).json({ trips: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/trips/:tripId/recurring-expenses', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { description, amount, currency, category, day_of_month } = req.body;

    if (!description || !amount || !currency || !day_of_month) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const result = await pool.query(
      `INSERT INTO recurring_expenses (trip_id, description, amount, currency, category, day_of_month)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tripId, description, amount, currency, category, day_of_month]
    );

    res.status(201).json({ recurring_expense: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/trips/:tripId/process-recurring', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const recurringResult = await pool.query(
      `SELECT * FROM recurring_expenses WHERE trip_id = $1 AND is_active = true`,
      [tripId]
    );

    const tripResult = await pool.query(
      `SELECT base_currency FROM trips WHERE id = $1`,
      [tripId]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const baseCurrency = tripResult.rows[0].base_currency;
    const createdExpenses = [];

    for (const recurring of recurringResult.rows) {
      const alreadyGenerated = await pool.query(
        `SELECT id FROM recurring_expense_log 
         WHERE recurring_expense_id = $1 AND generated_for_month = $2`,
        [recurring.id, currentMonth]
      );

      if (alreadyGenerated.rows.length === 0) {
        const userId = req.user.id;
        
        // Get exchange rate and convert
        let exchangeRate = 1;
        if (recurring.currency !== baseCurrency) {
          const rateResult = await pool.query(
            `SELECT rate FROM exchange_rates 
             WHERE base_currency = $1 AND quote_currency = $2 
             ORDER BY fetched_at DESC LIMIT 1`,
            [recurring.currency, baseCurrency]
          );
          if (rateResult.rows.length > 0) {
            exchangeRate = rateResult.rows[0].rate;
          }
        }

        const baseAmount = parseFloat((recurring.amount * exchangeRate).toFixed(2));

        const expenseResult = await pool.query(
          `INSERT INTO expenses (trip_id, paid_by, description, amount, currency, category, 
            expense_date, base_currency_amount, exchange_rate_used)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [tripId, userId, recurring.description, recurring.amount, recurring.currency, 
           recurring.category, currentMonth, baseAmount, exchangeRate]
        );

        await pool.query(
          `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES ($1, $2, $3)`,
          [expenseResult.rows[0].id, userId, baseAmount]
        );

        await pool.query(
          `INSERT INTO recurring_expense_log (recurring_expense_id, generated_for_month, expense_id)
           VALUES ($1, $2, $3)`,
          [recurring.id, currentMonth, expenseResult.rows[0].id]
        );

        createdExpenses.push(expenseResult.rows[0].id);
      }
    }

    res.status(200).json({ created: createdExpenses.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});