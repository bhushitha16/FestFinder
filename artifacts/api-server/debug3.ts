import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

import { pgTable, serial, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
});

async function test() {
  const users = await db.select().from(usersTable);
  console.log(JSON.stringify(users.filter(u => u.email.includes('bhush')), null, 2));
}

test().catch(console.error);
