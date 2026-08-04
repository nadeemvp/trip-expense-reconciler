const axios = require('axios');
const pool = require('./db');

async function getExchangeRate(baseCurrency, quoteCurrency, date) {
  if (baseCurrency === quoteCurrency) {
    return 1;
  }

  const cached = await pool.query(
    `SELECT rate FROM exchange_rates
     WHERE base_currency = $1 AND quote_currency = $2 AND rate_date = $3`,
    [baseCurrency, quoteCurrency, date]
  );

  if (cached.rows.length > 0) {
    return parseFloat(cached.rows[0].rate);
  }

  const response = await axios.get('https://api.frankfurter.dev/v2/rates', {
    params: { date, base: baseCurrency, quotes: quoteCurrency }
  });

  const rate = response.data[0].rate;

  await pool.query(
    `INSERT INTO exchange_rates (base_currency, quote_currency, rate_date, rate)
     VALUES ($1, $2, $3, $4)`,
    [baseCurrency, quoteCurrency, date, rate]
  );

  return rate;
}

module.exports = { getExchangeRate };