const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const MIGRATIONS_DIR = path.resolve(__dirname);

const getConnection = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'soho_dev',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    multipleStatements: true,
  });
  return conn;
};

const ensureMigrationsTable = async (conn) => {
  await conn.execute(
    `CREATE TABLE IF NOT EXISTS applied_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
};

const getApplied = async (conn) => {
  const [rows] = await conn.execute('SELECT filename FROM applied_migrations');
  return new Set(rows.map(r => r.filename));
};

const applyFile = async (conn, filePath, filename) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  if (!sql.trim()) return;
  console.log(`Applying migration: ${filename}`);
  await conn.query(sql);
  await conn.execute('INSERT INTO applied_migrations (filename) VALUES (?)', [filename]);
};

const run = async () => {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);
    const applied = await getApplied(conn);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }
      const filePath = path.join(MIGRATIONS_DIR, file);
      try {
        await applyFile(conn, filePath, file);
        console.log(`Migration applied: ${file}`);
      } catch (err) {
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }

    console.log('All migrations processed.');
  } finally {
    await conn.end();
  }
};

if (require.main === module) {
  run().catch(err => {
    console.error('Migration runner failed:', err);
    process.exit(1);
  });
}

module.exports = { run };
