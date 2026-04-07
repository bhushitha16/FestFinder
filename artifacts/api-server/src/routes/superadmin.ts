import { Router } from "express";
import { db, usersTable, adminProfilesTable, collegesTable, eventsTable, registrationsTable, studentProfilesTable } from "@workspace/db";
import { eq, count, inArray } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";

const router = Router();

// Middleware: super admin check
router.use(async (req, res, next) => {
  const user = await getSessionUser(req);
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }
  (req as any).superAdmin = user;
  return next();
});

// GET /api/superadmin/admins/pending
router.get("/admins/pending", async (_req, res) => {
  const pendingAdmins = await db
    .select({
      id: usersTable.id,
      name: usersTable.fullName,
      email: usersTable.email,
      contactNumber: usersTable.contactNumber,
      status: usersTable.status,
      createdAt: usersTable.createdAt,
      collegeName: adminProfilesTable.collegeName,
      designation: adminProfilesTable.designation,
    })
    .from(usersTable)
    .innerJoin(adminProfilesTable, eq(adminProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.status, "pending_approval"));

  return res.json(pendingAdmins.map((a) => ({
    ...a,
    contactNumber: a.contactNumber ?? "",
    designation: a.designation ?? null,
    createdAt: a.createdAt.toISOString(),
  })));
});

// PUT /api/superadmin/admins/:adminId/approve
router.put("/admins/:adminId/approve", async (req, res) => {
  const adminId = parseInt(req.params.adminId);
  const admins = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);
  if (!admins.length) return res.status(404).json({ error: "Admin not found" });

  // Create or find the college
  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, adminId)).limit(1);
  if (!adminProfile.length) return res.status(400).json({ error: "Admin profile not found" });

  let college = await db.select().from(collegesTable).where(eq(collegesTable.name, adminProfile[0].collegeName)).limit(1);
  if (!college.length) {
    const [created] = await db.insert(collegesTable).values({ name: adminProfile[0].collegeName, status: "active" }).returning();
    college = [created];
  } else {
    await db.update(collegesTable).set({ status: "active" }).where(eq(collegesTable.id, college[0].id));
  }

  // Update admin profile with college ID
  await db.update(adminProfilesTable).set({ collegeId: college[0].id }).where(eq(adminProfilesTable.userId, adminId));

  await db.update(usersTable).set({ status: "active", updatedAt: new Date() }).where(eq(usersTable.id, adminId));

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);
  const profile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, adminId)).limit(1);

  return res.json({
    id: updated[0].id,
    name: updated[0].fullName,
    email: updated[0].email,
    contactNumber: updated[0].contactNumber ?? "",
    collegeName: profile[0]?.collegeName ?? "",
    designation: profile[0]?.designation ?? null,
    status: updated[0].status,
    createdAt: updated[0].createdAt.toISOString(),
  });
});

// PUT /api/superadmin/admins/:adminId/reject
router.put("/admins/:adminId/reject", async (req, res) => {
  const adminId = parseInt(req.params.adminId);
  await db.update(usersTable).set({ status: "rejected", updatedAt: new Date() }).where(eq(usersTable.id, adminId));

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);
  const profile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, adminId)).limit(1);

  return res.json({
    id: updated[0].id,
    name: updated[0].fullName,
    email: updated[0].email,
    contactNumber: updated[0].contactNumber ?? "",
    collegeName: profile[0]?.collegeName ?? "",
    designation: profile[0]?.designation ?? null,
    status: updated[0].status,
    createdAt: updated[0].createdAt.toISOString(),
  });
});

// PUT /api/superadmin/admins/:adminId/suspend
router.put("/admins/:adminId/suspend", async (req, res) => {
  const adminId = parseInt(req.params.adminId);
  await db.update(usersTable).set({ status: "suspended", updatedAt: new Date() }).where(eq(usersTable.id, adminId));

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);
  const profile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, adminId)).limit(1);

  return res.json({
    id: updated[0].id,
    name: updated[0].fullName,
    email: updated[0].email,
    contactNumber: updated[0].contactNumber ?? "",
    collegeName: profile[0]?.collegeName ?? "",
    designation: profile[0]?.designation ?? null,
    status: updated[0].status,
    createdAt: updated[0].createdAt.toISOString(),
  });
});

// GET /api/superadmin/stats
router.get("/stats", async (_req, res) => {
  const [studentsCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "student"));
  const [collegesCount] = await db.select({ count: count() }).from(collegesTable);
  const [eventsCount] = await db.select({ count: count() }).from(eventsTable);
  const [registrationsCount] = await db.select({ count: count() }).from(registrationsTable);
  const [pendingCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "pending_approval"));

  return res.json({
    totalStudents: studentsCount?.count ?? 0,
    totalColleges: collegesCount?.count ?? 0,
    totalEvents: eventsCount?.count ?? 0,
    totalRegistrations: registrationsCount?.count ?? 0,
    pendingAdminRequests: pendingCount?.count ?? 0,
  });
});

// GET /api/superadmin/colleges
router.get("/colleges", async (_req, res) => {
  const colleges = await db.select().from(collegesTable).orderBy(collegesTable.name);
  const result = await Promise.all(
    colleges.map(async (college) => {
      const admins = await db
        .select({ name: usersTable.fullName })
        .from(adminProfilesTable)
        .innerJoin(usersTable, eq(adminProfilesTable.userId, usersTable.id))
        .where(eq(adminProfilesTable.collegeId, college.id))
        .limit(1);
      return {
        id: college.id,
        name: college.name,
        status: college.status,
        adminName: admins.length ? admins[0].name : null,
        createdAt: college.createdAt.toISOString(),
      };
    })
  );
  return res.json(result);
});

// GET /api/superadmin/events
router.get("/events", async (_req, res) => {
  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      category: eventsTable.category,
      venue: eventsTable.venue,
      eventDate: eventsTable.eventDate,
      registrationDeadline: eventsTable.registrationDeadline,
      maxParticipants: eventsTable.maxParticipants,
      collegeId: eventsTable.collegeId,
      collegeName: collegesTable.name,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id));

  const result = await Promise.all(
    events.map(async (event) => {
      const counts = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, event.id));
      return {
        ...event,
        eventDate: event.eventDate.toISOString(),
        registrationDeadline: event.registrationDeadline.toISOString(),
        createdAt: event.createdAt.toISOString(),
        registeredCount: counts[0]?.count ?? 0,
      };
    })
  );
  return res.json(result);
});

export default router;
