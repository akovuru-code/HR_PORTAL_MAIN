/*const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
*/

// src/models/db.js
const { Sequelize } = require('sequelize');

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.warn('WARNING: process.env.DATABASE_URL not set. Using fallback local connection string. Create a .env file or set DATABASE_URL to avoid this.');
}
const DEFAULT_PSQL = connStr || 'postgres://postgres:postgres@localhost:5432/hr_local';
const sequelize = new Sequelize(DEFAULT_PSQL, {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
