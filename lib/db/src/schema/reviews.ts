import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(), // 1-5
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.eventId, t.studentId)]);

export type Review = typeof reviewsTable.$inferSelect;
