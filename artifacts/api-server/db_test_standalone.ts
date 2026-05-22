import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import fs from 'fs';

const sql = neon("postgresql://neondb_owner:npg_F4AOjYuce7Ry@ep-red-bar-a1xd86fj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");
const db = drizzle(sql);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  venue: varchar("venue", { length: 255 }).notNull(),
  eventDate: timestamp("event_date").notNull(),
  registrationDeadline: timestamp("registration_deadline").notNull(),
  maxParticipants: integer("max_participants"),
  thumbnailUrl: text("thumbnail_url"),
  parentEventId: integer("parent_event_id"),
  previousEventId: integer("previous_event_id"),
  collegeId: integer("college_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

async function test() {
  try {
    const res = await db.insert(eventsTable).values({
      title: 'Comedy Workshop',
      description: 'come and laugh hahahaha',
      category: 'Workshop',
      venue: 'banglore',
      eventDate: new Date('2026-04-20T04:30:00.000Z'),
      registrationDeadline: new Date('2026-04-19T23:30:00.000Z'),
      maxParticipants: 200,
      parentEventId: null,
      previousEventId: null,
      thumbnailUrl: null,
      collegeId: 4
    }).returning();
    fs.writeFileSync('db_test_result.txt', 'SUCCESS: ' + JSON.stringify(res));
  } catch (err: any) {
    fs.writeFileSync('db_test_result.txt', 'ERROR MESSAGE: ' + err.message + '\nERROR DETAIL: ' + err.detail + '\nERROR STACK: ' + err.stack);
  }
}
test();
