const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables found:', tables.rows.map(r => r.table_name));

    for (const r of tables.rows) {
      try {
        const count = await client.query(`SELECT count(*) FROM "${r.table_name}"`);
        console.log(`Table ${r.table_name}: ${count.rows[0].count} rows`);
        if (parseInt(count.rows[0].count, 10) > 0) {
          const sample = await client.query(`SELECT * FROM "${r.table_name}" LIMIT 3`);
          console.log(`Sample from ${r.table_name}:`, sample.rows);
        }
      } catch (err) {
        console.warn(`Could not query table ${r.table_name}:`, err.message);
      }
    }
    await client.end();
  } catch (e) {
    console.error('Database connection error:', e.message);
  }
}

check();
