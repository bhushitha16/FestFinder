import { Router } from "express";
import { db, usersTable, studentProfilesTable, adminProfilesTable, collegesTable, sessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateOTP,
  createSession,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/auth.js";

const router = Router();

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let collegeId: number | null = null;
  let collegeName: string | null = null;

  if (user.role === "student") {
    const profiles = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id)).limit(1);
    if (profiles.length) {
      collegeId = profiles[0].collegeId;
      const colleges = await db.select().from(collegesTable).where(eq(collegesTable.id, collegeId)).limit(1);
      if (colleges.length) collegeName = colleges[0].name;
    }
  } else if (user.role === "college_admin") {
    const profiles = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
    if (profiles.length) {
      collegeId = profiles[0].collegeId ?? null;
      collegeName = profiles[0].collegeName;
    }
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    status: user.status,
    collegeId,
    collegeName,
  });
});

// POST /api/auth/student/signup
router.post("/student/signup", async (req, res) => {
  const { fullName, contactNumber, collegeId, collegeEmail, collegeIdNumber, password } = req.body;
  if (!fullName || !collegeId || !collegeEmail || !collegeIdNumber || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, collegeEmail)).limit(1);
  if (existing.length) return res.status(409).json({ error: "Email already registered" });

  // Verify college exists and is active
  const colleges = await db.select().from(collegesTable).where(and(eq(collegesTable.id, collegeId), eq(collegesTable.status, "active"))).limit(1);
  if (!colleges.length) return res.status(400).json({ error: "Invalid or unapproved college selected" });

  const passwordHash = hashPassword(password);
  const emailVerifyToken = generateOTP();
  const emailVerifyExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes for OTP

  const [user] = await db.insert(usersTable).values({
    email: collegeEmail,
    passwordHash,
    fullName,
    contactNumber,
    role: "student",
    status: "active",
    emailVerified: false,
    emailVerifyToken,
    emailVerifyExpiry,
  }).returning();

  await db.insert(studentProfilesTable).values({
    userId: user.id,
    collegeId,
    collegeIdNumber,
  });

  console.log(`[OTP-VERIFY] Code for ${collegeEmail}: ${emailVerifyToken}`);

  return res.status(201).json({
    message: "Registration successful! Please enter the 6-digit OTP sent to your email.",
    email: collegeEmail,
    otp: process.env.NODE_ENV === "development" ? emailVerifyToken : undefined,
  });
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users.length) return res.status(400).json({ error: "User not found" });

  const user = users[0];
  if (user.emailVerifyToken !== otp) {
    return res.status(400).json({ error: "Invalid verification code" });
  }

  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    return res.status(400).json({ error: "Verification code has expired" });
  }

  await db.update(usersTable).set({
    emailVerified: true,
    status: user.role === 'student' ? "active" : "pending_approval",
    emailVerifyToken: null,
    emailVerifyExpiry: null,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));

  return res.json({ message: "Verification successful! You can now log in." });
});

// GET /api/auth/verify-email
router.get("/verify-email", async (req, res) => {
  const { token } = req.query as { token: string };
  if (!token) return res.status(400).json({ error: "Token required" });

  const users = await db.select().from(usersTable).where(eq(usersTable.emailVerifyToken, token)).limit(1);
  if (!users.length) return res.status(400).json({ error: "Invalid verification token" });

  const user = users[0];
  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    return res.status(400).json({ error: "Verification token has expired" });
  }

  await db.update(usersTable).set({
    emailVerified: true,
    status: "active",
    emailVerifyToken: null,
    emailVerifyExpiry: null,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));

  return res.json({ message: "Email verified successfully! You can now log in." });
});

// POST /api/auth/student/login
router.post("/student/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const users = await db.select().from(usersTable).where(and(eq(usersTable.email, email), eq(usersTable.role, "student"))).limit(1);
  if (!users.length) return res.status(401).json({ error: "Invalid email or password" });

  const user = users[0];
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Invalid email or password" });
  if (!user.emailVerified) return res.status(401).json({ error: "Please verify your email before logging in" });
  if (user.status !== "active") return res.status(401).json({ error: "Your account is not active" });

  const token = await createSession(user.id);
  setSessionCookie(res, token);

  let collegeId: number | null = null;
  let collegeName: string | null = null;
  const profiles = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id)).limit(1);
  if (profiles.length) {
    collegeId = profiles[0].collegeId;
    const colleges = await db.select().from(collegesTable).where(eq(collegesTable.id, collegeId)).limit(1);
    if (colleges.length) collegeName = colleges[0].name;
  }

  return res.json({
    message: "Login successful",
    user: { id: user.id, email: user.email, name: user.fullName, role: user.role, status: user.status, collegeId, collegeName },
  });
});

// POST /api/auth/admin/signup
router.post("/admin/signup", async (req, res) => {
  const { fullName, email, collegeName, contactNumber, designation, password } = req.body;
  if (!fullName || !email || !collegeName || !contactNumber || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length) return res.status(409).json({ error: "Email already registered" });

  // Check if college already has an admin
  const existingAdmins = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.collegeName, collegeName));
  if (existingAdmins.length) return res.status(409).json({ error: "This college already has an admin registered" });

  const passwordHash = hashPassword(password);
  const emailVerifyToken = generateOTP();
  const emailVerifyExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes for OTP

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    fullName,
    contactNumber,
    role: "college_admin",
    status: "pending_approval",
    emailVerified: false,
    emailVerifyToken,
    emailVerifyExpiry,
  }).returning();

  await db.insert(adminProfilesTable).values({
    userId: user.id,
    collegeName,
    designation: designation || null,
  });

  console.log(`[OTP-VERIFY] Code for ${email}: ${emailVerifyToken}`);

  return res.status(201).json({
    message: "Registration submitted! Please verify your email first. Your account will then be pending Super Admin approval.",
    email,
    otp: process.env.NODE_ENV === "development" ? emailVerifyToken : undefined,
  });
});

// POST /api/auth/admin/login
router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const users = await db.select().from(usersTable).where(and(eq(usersTable.email, email), eq(usersTable.role, "college_admin"))).limit(1);
  if (!users.length) return res.status(401).json({ error: "Invalid email or password" });

  const user = users[0];
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Invalid email or password" });

  if (user.status === "pending_approval") return res.status(401).json({ error: "Your account is pending Super Admin approval" });
  if (user.status === "rejected") return res.status(401).json({ error: "Your account request has been rejected" });
  if (user.status === "suspended") return res.status(401).json({ error: "Your account has been suspended" });
  if (user.status !== "active") return res.status(401).json({ error: "Your account is not active" });

  const token = await createSession(user.id);
  setSessionCookie(res, token);

  const profiles = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  const collegeId = profiles.length ? profiles[0].collegeId : null;
  const collegeName = profiles.length ? profiles[0].collegeName : null;

  return res.json({
    message: "Login successful",
    user: { id: user.id, email: user.email, name: user.fullName, role: user.role, status: user.status, collegeId, collegeName },
  });
});

// POST /api/auth/superadmin/login
router.post("/superadmin/login", async (req, res) => {
  const { email: rawEmail, password: rawPassword } = req.body;
  const email = rawEmail?.trim();
  const password = rawPassword?.trim();

  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  // Check for hardcoded super admin or DB super admin
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "superadmin@festportal.com";
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

  if (email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
    // Ensure super admin exists in DB
    let superAdmins = await db.select().from(usersTable).where(eq(usersTable.email, SUPER_ADMIN_EMAIL)).limit(1);
    if (!superAdmins.length) {
      const [created] = await db.insert(usersTable).values({
        email: SUPER_ADMIN_EMAIL,
        passwordHash: hashPassword(SUPER_ADMIN_PASSWORD),
        fullName: "Super Admin",
        role: "super_admin",
        status: "active",
        emailVerified: true,
      }).returning();
      superAdmins = [created];
    }
    const token = await createSession(superAdmins[0].id);
    setSessionCookie(res, token);
    return res.json({
      message: "Login successful",
      user: { id: superAdmins[0].id, email: superAdmins[0].email, name: superAdmins[0].fullName, role: "super_admin", status: "active" },
    });
  }

  return res.status(401).json({ error: "Invalid super admin credentials" });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const token = req.cookies?.session;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  clearSessionCookie(res);
  return res.json({ message: "Logged out successfully" });
});

// POST /api/auth/phone-verify
// Receives the phone.email `user_json_url` from the frontend,
// fetches the verified phone details from phone.email's server, and returns them.
// This keeps the verification trusted (server-to-server) rather than relying on client-supplied data.
router.post("/phone-verify", async (req, res) => {
  const { user_json_url } = req.body as { user_json_url?: string };

  if (!user_json_url) {
    return res.status(400).json({ error: "user_json_url is required" });
  }

  // Only allow URLs from the official phone.email user JSON host for security.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(user_json_url);
  } catch {
    return res.status(400).json({ error: "Invalid user_json_url" });
  }

  if (!parsedUrl.hostname.endsWith("phone.email")) {
    return res.status(400).json({ error: "user_json_url must be from phone.email domain" });
  }

  try {
    const response = await fetch(user_json_url);
    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch verification data from phone.email" });
    }
    const data = await response.json() as {
      user_country_code?: string;
      user_phone_number?: string;
      user_first_name?: string;
      user_last_name?: string;
    };

    return res.json({
      countryCode: data.user_country_code ?? "",
      phoneNumber: data.user_phone_number ?? "",
      firstName: data.user_first_name ?? "",
      lastName: data.user_last_name ?? "",
      // Provide a combined E.164-style phone number for convenience
      fullPhone: `${data.user_country_code ?? ""}${data.user_phone_number ?? ""}`,
    });
  } catch (err) {
    console.error("phone-verify fetch error:", err);
    return res.status(502).json({ error: "Error communicating with phone.email" });
  }
});

export default router;
