import { pgTable, serial, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { usersTable } from "./users";

export const registrationStatusEnum = pgEnum("registration_status", ["pending", "approved", "rejected"]);

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  status: registrationStatusEnum("status").notNull().default("pending"),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
}, (t) => [unique().on(t.eventId, t.studentId)]);

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({ id: true, registeredAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
