const { Pool } = require('pg');
const { config } = require('./config');

const pool = new Pool(config.database);

function query(text, params) {
  return pool.query(text, params);
}

async function closePool() {
  await pool.end();
}

module.exports = { query, closePool, pool };
