import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pgTable, serial, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import fs from 'fs';

const sql = neon("postgresql://neondb_owner:npg_F4AOjYuce7Ry@ep-red-bar-a1xd86fj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");
const db = drizzle(sql);

const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
});

const adminProfilesTable = pgTable("admin_profiles", {
  userId: integer("user_id").notNull(),
  collegeName: varchar("college_name", { length: 255 }).notNull(),
});
import { integer } from 'drizzle-orm/pg-core';

async function test() {
  const users = await db.select().from(usersTable);
  const admins = await db.select().from(adminProfilesTable);
  console.log("USERS:", JSON.stringify(users, null, 2));
  console.log("ADMINS:", JSON.stringify(admins, null, 2));
}
test();
