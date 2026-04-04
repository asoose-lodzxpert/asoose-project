const { Client } = require('pg');
const connectionString = 'postgresql://postgres:MWwkeFDesJgCwBreBxbBboJuHSFkoRRD@ballast.proxy.rlwy.net:49770/railway';

const client = new Client({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000,
});

async function test() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

test();
