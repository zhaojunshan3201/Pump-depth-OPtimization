require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3000),
  database: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '123456',
    database: process.env.PGDATABASE || 'bgua'
  }
};

module.exports = { config };
