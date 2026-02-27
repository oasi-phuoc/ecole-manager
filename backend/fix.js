const fs = require('fs');

fs.writeFileSync('./src/config/database.js', `
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ecole_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'admin',
      }
);

pool.connect()
  .then(() => console.log('✅ Base de données connectée !'))
  .catch(err => console.error('❌ Erreur DB:', err.message));

module.exports = pool;
`.trim());

console.log('database.js mis a jour !');