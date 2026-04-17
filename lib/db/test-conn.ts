import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../artifacts/api-server/.env') });

const url = process.env.DATABASE_URL;
console.log('Testing connection to:', url);

if (!url) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
});

try {
  await client.connect();
  console.log('Connected successfully!');
  const res = await client.query('SELECT NOW()');
  console.log('Query result:', res.rows[0]);
  await client.end();
} catch (err) {
  console.error('Connection error:', err);
  process.exit(1);
}
