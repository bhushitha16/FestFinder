import crypto from "crypto";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import type { Request, Response } from "express";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derivedHash, "hex"));
}

export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function generateOTP(digits = 6): string {
  return Math.floor(10 ** (digits - 1) + Math.random() * 9 * 10 ** (digits - 1)).toString();
}

export async function createSession(userId: number): Promise<string> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function getSessionUser(req: Request) {
  const token = req.cookies?.session;
  if (!token) return null;

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);

  if (!sessions.length) return null;

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, sessions[0].userId))
    .limit(1);

  return users[0] || null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie("session");
}
