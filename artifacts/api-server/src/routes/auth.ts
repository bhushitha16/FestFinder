import { Router } from "express";
import { db, usersTable, studentProfilesTable, adminProfilesTable, collegesTable, sessionsTable, loginAttemptsTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  createSession,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/auth.js";
import https from "https";
import { sendOTP } from "../lib/mail.js";

const authRouter = Router();

authRouter.get("/ping", (req, res) => res.json({ message: "pong" }));

async function checkLoginAttempts(email: string, ip: string | undefined) {
  const today = new Date().toISOString().split('T')[0];
  const attempts = await db.select()
    .from(loginAttemptsTable)
    .where(and(eq(loginAttemptsTable.email, email), eq(loginAttemptsTable.date, today)))
    .limit(1);

  if (attempts.length && attempts[0].attemptCount >= 3) {
    return false;
  }
  return true;
}

async function recordFailedAttempt(email: string, ip: string | undefined) {
  const today = new Date().toISOString().split('T')[0];
  const attempts = await db.select()
    .from(loginAttemptsTable)
    .where(and(eq(loginAttemptsTable.email, email), eq(loginAttemptsTable.date, today)))
    .limit(1);

  if (attempts.length) {
    await db.update(loginAttemptsTable)
      .set({ 
        attemptCount: attempts[0].attemptCount + 1,
        lastAttemptAt: new Date(),
        ipAddress: ip || attempts[0].ipAddress
      })
      .where(eq(loginAttemptsTable.id, attempts[0].id));
  } else {
    await db.insert(loginAttemptsTable).values({
      email,
      ipAddress: ip,
      date: today,
      attemptCount: 1,
    });
  }
}

async function clearLoginAttempts(email: string) {
  const today = new Date().toISOString().split('T')[0];
  await db.update(loginAttemptsTable)
    .set({ attemptCount: 0 })
    .where(and(eq(loginAttemptsTable.email, email), eq(loginAttemptsTable.date, today)));
}

// GET /api/auth/me
authRouter.get("/me", async (req, res) => {
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
authRouter.post("/student/signup", async (req, res) => {
  const { fullName, contactNumber, collegeId, collegeEmail, collegeIdNumber } = req.body;
  if (!fullName || !collegeId || !collegeEmail || !collegeIdNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, collegeEmail)).limit(1);
  if (existing.length) return res.status(409).json({ error: "Email already registered" });

  // Verify college exists and is active
  const colleges = await db.select().from(collegesTable).where(and(eq(collegesTable.id, collegeId), eq(collegesTable.status, "active"))).limit(1);
  if (!colleges.length) return res.status(400).json({ error: "Invalid or unapproved college selected" });

  const passwordHash = hashPassword(generateToken(16)); // Dummy password
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const [user] = await db.insert(usersTable).values({
    email: collegeEmail,
    passwordHash,
    fullName,
    contactNumber,
    role: "student",
    status: "active",
    emailVerified: false,
    emailVerifyToken: otp,
    emailVerifyExpiry: expiry,
  }).returning();

  await db.insert(studentProfilesTable).values({
    userId: user.id,
    collegeId,
    collegeIdNumber,
  });

  try {
    await sendOTP(collegeEmail, otp);
    return res.status(201).json({ message: "Registration successful! OTP sent to your email for verification." });
  } catch (error) {
    console.error("Error in signup send-otp:", error);
    return res.status(500).json({ error: "Registered, but failed to send OTP email." });
  }
});

// GET /api/auth/verify-email
authRouter.get("/verify-email", async (req, res) => {
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
authRouter.post("/student/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const canAttempt = await checkLoginAttempts(email, req.ip);
  if (!canAttempt) return res.status(429).json({ error: "Too many failed login attempts. Please try again tomorrow." });

  const users = await db.select().from(usersTable).where(and(eq(usersTable.email, email), eq(usersTable.role, "student"))).limit(1);
  
  if (!users.length) {
    await recordFailedAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = users[0];
  if (!verifyPassword(password, user.passwordHash)) {
    await recordFailedAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.emailVerified) return res.status(401).json({ error: "Please verify your email before logging in" });
  if (user.status !== "active") return res.status(401).json({ error: "Your account is not active" });

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  await clearLoginAttempts(email);

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
authRouter.post("/admin/signup", async (req, res) => {
  const { fullName, email, collegeName, contactNumber, designation } = req.body;
  if (!fullName || !email || !collegeName || !contactNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length) {
    const u = existing[0];
    if (u.role === "student") {
      return res.status(409).json({ error: "Email is already registered as a Student." });
    }
    if (u.role === "college_admin" && u.status === "active") {
      return res.status(409).json({ error: "This admin account is already approved and active." });
    }
    if (u.role === "college_admin" && u.emailVerified) {
       return res.status(409).json({ error: "Email already registered and verified." });
    }
    
    // If they exist but are NOT verified, we will just update their record and resend the OTP below.
  }

  // Check if college already has an admin (only if it's a different user or new signup)
  const existingAdmins = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.collegeName, collegeName));
  // Filter out the current unverified user from existingAdmins check
  const activeAdminsForCollege = existingAdmins.filter(a => !existing.length || a.userId !== existing[0].id);
  if (activeAdminsForCollege.length) return res.status(409).json({ error: "This college already has an admin registered" });

  const passwordHash = hashPassword(generateToken(16)); // Dummy password
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  let userId: number;

  if (existing.length) {
    // Update existing unverified user
    await db.update(usersTable).set({
      fullName,
      contactNumber,
      emailVerifyToken: otp,
      emailVerifyExpiry: expiry,
      updatedAt: new Date()
    }).where(eq(usersTable.id, existing[0].id));
    userId = existing[0].id;
    
    // Update admin profile
    await db.update(adminProfilesTable).set({
      collegeName,
      designation: designation || null,
    }).where(eq(adminProfilesTable.userId, userId));
  } else {
    // Create new user
    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash,
      fullName,
      contactNumber,
      role: "college_admin",
      status: "pending_approval",
      emailVerified: false,
      emailVerifyToken: otp,
      emailVerifyExpiry: expiry,
    }).returning();
    userId = user.id;

    await db.insert(adminProfilesTable).values({
      userId,
      collegeName,
      designation: designation || null,
    });
  }

  try {
    await sendOTP(email, otp);
    return res.status(201).json({ message: "Registration submitted! OTP sent to verify your email." });
  } catch (error) {
    return res.status(500).json({ error: "Registered, but failed to send OTP email." });
  }
});

// POST /api/auth/admin/send-otp
authRouter.post("/admin/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users.length) {
    return res.status(404).json({ error: "No admin account found with this email." });
  }

  const user = users[0];
  if (user.role !== "college_admin") {
    return res.status(403).json({ error: "This login is for college admins only." });
  }

  // Check login attempts
  const canAttempt = await checkLoginAttempts(email, req.ip);
  if (!canAttempt) return res.status(429).json({ error: "Too many attempts. Please try again tomorrow." });

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.update(usersTable).set({
    emailVerifyToken: otp,
    emailVerifyExpiry: expiry,
  }).where(eq(usersTable.id, user.id));

  try {
    await sendOTP(email, otp);
    return res.json({ message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error in send-otp:", error);
    return res.status(500).json({ error: "Failed to send OTP email. Please try again later." });
  }
});

// POST /api/auth/admin/verify-otp
authRouter.post("/admin/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  const users = await db.select().from(usersTable).where(and(eq(usersTable.email, email), eq(usersTable.role, "college_admin"))).limit(1);
  if (!users.length) return res.status(404).json({ error: "Admin account not found" });

  const user = users[0];
  if (user.emailVerifyToken !== otp) {
    await recordFailedAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid OTP" });
  }

  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    return res.status(401).json({ error: "OTP has expired" });
  }

  // Verify email
  await db.update(usersTable).set({
    emailVerifyToken: null,
    emailVerifyExpiry: null,
    emailVerified: true,
  }).where(eq(usersTable.id, user.id));
  
  if (user.status === "pending_approval") {
    return res.status(401).json({ error: "Email verified successfully! However, your account is still pending Super Admin approval." });
  }
  if (user.status === "rejected") return res.status(401).json({ error: "Your account request has been rejected." });

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  await clearLoginAttempts(email);

  let collegeId: number | null = null;
  let collegeName: string | null = null;
  const profiles = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (profiles.length) {
    collegeId = profiles[0].collegeId;
    collegeName = profiles[0].collegeName;
  }

  return res.json({
    message: "Login successful",
    user: { id: user.id, email: user.email, name: user.fullName, role: user.role, status: user.status, collegeId, collegeName },
  });
});

// POST /api/auth/admin/login
authRouter.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const canAttempt = await checkLoginAttempts(email, req.ip);
  if (!canAttempt) return res.status(429).json({ error: "Too many failed login attempts. Please try again tomorrow." });

  const users = await db.select().from(usersTable).where(and(eq(usersTable.email, email), eq(usersTable.role, "college_admin"))).limit(1);
  
  if (!users.length) {
    await recordFailedAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = users[0];
  if (!verifyPassword(password, user.passwordHash)) {
    await recordFailedAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.status === "pending_approval") return res.status(401).json({ error: "Your account is pending Super Admin approval" });
  if (user.status === "rejected") return res.status(401).json({ error: "Your account request has been rejected" });
  if (user.status === "suspended") return res.status(401).json({ error: "Your account has been suspended" });
  if (user.status !== "active") return res.status(401).json({ error: "Your account is not active" });

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  await clearLoginAttempts(email);

  const profiles = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  const collegeId = profiles.length ? profiles[0].collegeId : null;
  const collegeName = profiles.length ? profiles[0].collegeName : null;

  return res.json({
    message: "Login successful",
    user: { id: user.id, email: user.email, name: user.fullName, role: user.role, status: user.status, collegeId, collegeName },
  });
});

// POST /api/auth/superadmin/login
authRouter.post("/superadmin/login", async (req, res) => {
  const { email, password } = req.body;
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
    await clearLoginAttempts(email);
    return res.json({
      message: "Login successful",
      user: { id: superAdmins[0].id, email: superAdmins[0].email, name: superAdmins[0].fullName, role: "super_admin", status: "active" },
    });
  }

  return res.status(401).json({ error: "Invalid super admin credentials" });
});

// POST /api/auth/logout
authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.session;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  clearSessionCookie(res);
  return res.json({ message: "Logged out successfully" });
});

// POST /api/auth/phone-email/verify
authRouter.post("/phone-email/verify", async (req, res) => {
  const { user_json_url } = req.body;
  if (!user_json_url) return res.status(400).json({ error: "user_json_url is required" });

  try {
    const data = await new Promise<string>((resolve, reject) => {
      https.get(user_json_url, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(body));
      }).on("error", (err) => reject(err));
    });

    const jsonData = JSON.parse(data);
    const user_email_id = jsonData.user_email_id;
    const user_phone_number = jsonData.user_phone_number;

    if (!user_email_id && !user_phone_number) {
      return res.status(400).json({ error: "Could not retrieve email or phone from phone.email" });
    }

    const identifier = user_email_id || user_phone_number;

    // Check if user exists by email or phone (using identifier as email for now if it's the only field, or updating logic)
    // For simplicity, we'll treat the identifier as the unique email/username
    let users = await db.select().from(usersTable).where(eq(usersTable.email, identifier)).limit(1);
    let user;

    if (!users.length) {
      // Auto-signup if user doesn't exist
      const [created] = await db.insert(usersTable).values({
        email: identifier,
        passwordHash: hashPassword(generateToken(16)), // Dummy password
        fullName: jsonData.user_full_name || (user_email_id ? user_email_id.split('@')[0] : "User"),
        contactNumber: user_phone_number || null,
        role: "student",
        status: "active",
        emailVerified: true,
      }).returning();
      user = created;
    } else {
      user = users[0];
      // Sync phone number if it's available and not set
      if (user_phone_number && !user.contactNumber) {
        await db.update(usersTable).set({ contactNumber: user_phone_number }).where(eq(usersTable.id, user.id));
      }
    }

    const token = await createSession(user.id);
    setSessionCookie(res, token);

    return res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email, name: user.fullName, role: user.role, status: user.status },
    });

  } catch (error) {
    console.error("Phone.email verification error:", error);
    return res.status(500).json({ error: "Failed to verify with phone.email" });
  }
});

// POST /api/auth/student/send-otp
authRouter.post("/student/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users.length) {
    return res.status(404).json({ error: "No account found with this email. Please sign up first." });
  }

  const user = users[0];
  if (user.role !== "student") {
    return res.status(403).json({ error: "This login is for students only." });
  }

  // Check login attempts
  const canAttempt = await checkLoginAttempts(email, req.ip);
  if (!canAttempt) return res.status(429).json({ error: "Too many attempts. Please try again tomorrow." });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.update(usersTable).set({
    emailVerifyToken: otp,
    emailVerifyExpiry: expiry,
  }).where(eq(usersTable.id, user.id));

  try {
    await sendOTP(email, otp);
    return res.json({ message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error in send-otp:", error);
    return res.status(500).json({ error: "Failed to send OTP email. Please try again later." });
  }
});

// POST /api/auth/student/verify-otp
authRouter.post("/student/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users.length) return res.status(404).json({ error: "User not found" });

  const user = users[0];
  if (user.emailVerifyToken !== otp) {
    await recordFailedAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid OTP" });
  }

  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    return res.status(401).json({ error: "OTP has expired" });
  }

  // Clear OTP and verify email if not already
  await db.update(usersTable).set({
    emailVerifyToken: null,
    emailVerifyExpiry: null,
    emailVerified: true,
    status: "active",
  }).where(eq(usersTable.id, user.id));

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  await clearLoginAttempts(email);

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

// POST /api/auth/reset-password-final
authRouter.post("/reset-password-final", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: "Email and new password are required" });

  const user = await getSessionUser(req);
  if (!user || user.email !== email) {
    return res.status(403).json({ error: "Unauthorized: Email verification required via Phone.Email callback before reset." });
  }

  await db.update(usersTable)
    .set({ 
      passwordHash: hashPassword(newPassword),
      updatedAt: new Date()
    })
    .where(eq(usersTable.id, user.id));

  return res.json({ message: "Password reset successful" });
});

export default authRouter;
