import { pgTable, serial, varchar, timestamp, integer } from "drizzle-orm/pg-core";

export const loginAttemptsTable = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
  date: varchar("date", { length: 10 }).notNull(), // Format: YYYY-MM-DD
});

export type LoginAttempt = typeof loginAttemptsTable.$inferSelect;
export type InsertLoginAttempt = typeof loginAttemptsTable.$inferInsert;
