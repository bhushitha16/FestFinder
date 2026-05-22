import { pgTable, serial, text, varchar, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["student", "college_admin", "super_admin"]);
export const userStatusEnum = pgEnum("user_status", ["pending_verification", "active", "pending_approval", "rejected", "suspended"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  contactNumber: varchar("contact_number", { length: 50 }),
  role: userRoleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("pending_verification"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifyToken: text("email_verify_token"),
  emailVerifyExpiry: timestamp("email_verify_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studentProfilesTable = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  collegeId: integer("college_id").notNull(),
  collegeIdNumber: varchar("college_id_number", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminProfilesTable = pgTable("admin_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  collegeName: varchar("college_name", { length: 255 }).notNull(),
  collegeId: integer("college_id"),
  designation: varchar("designation", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
export type AdminProfile = typeof adminProfilesTable.$inferSelect;
