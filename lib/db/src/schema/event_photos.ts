import { pgTable, serial, integer, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const eventPhotosTable = pgTable("event_photos", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  photoUrl: text("photo_url").notNull(),
  caption: varchar("caption", { length: 255 }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type EventPhoto = typeof eventPhotosTable.$inferSelect;
