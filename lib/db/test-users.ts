import { db, usersTable } from "./src/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const database = drizzle(pool);

async function run() {
  const users = await database.select().from(usersTable);
  console.log(JSON.stringify(users.map(u => ({ email: u.email, role: u.role, status: u.status })), null, 2));
  process.exit(0);
}
run();
