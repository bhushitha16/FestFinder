import { Router } from "express";
import { db, registrationsTable, eventsTable, studentProfilesTable, usersTable, adminProfilesTable, collegesTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";

const router = Router();

// POST /api/events/:eventId/register (student only)
router.post("/events/:eventId/register", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "student" || user.status !== "active") return res.status(403).json({ error: "Only students can register for events" });

  const eventId = parseInt(req.params.eventId);
  const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!events.length) return res.status(404).json({ error: "Event not found" });

  const event = events[0];
  if (event.registrationDeadline < new Date()) {
    return res.status(400).json({ error: "Registration deadline has passed" });
  }

  // Check if already registered
  const existing = await db.select().from(registrationsTable).where(
    and(eq(registrationsTable.eventId, eventId), eq(registrationsTable.studentId, user.id))
  ).limit(1);
  if (existing.length) return res.status(400).json({ error: "You are already registered for this event" });

  // Check max participants
  if (event.maxParticipants) {
    const counts = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, eventId));
    if ((counts[0]?.count ?? 0) >= event.maxParticipants) {
      return res.status(400).json({ error: "Event is at full capacity" });
    }
  }

  const [registration] = await db.insert(registrationsTable).values({
    eventId,
    studentId: user.id,
    status: "pending",
  }).returning();

  const studentProfile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id)).limit(1);

  return res.status(201).json({
    id: registration.id,
    eventId: registration.eventId,
    eventTitle: event.title,
    studentId: user.id,
    studentName: user.fullName,
    studentEmail: user.email,
    studentCollegeIdNumber: studentProfile[0]?.collegeIdNumber ?? "",
    status: registration.status,
    registeredAt: registration.registeredAt.toISOString(),
  });
});

// GET /api/student/registrations
router.get("/student/registrations", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "student") return res.status(403).json({ error: "Forbidden" });

  const registrations = await db
    .select({
      id: registrationsTable.id,
      eventId: registrationsTable.eventId,
      eventTitle: eventsTable.title,
      studentId: registrationsTable.studentId,
      status: registrationsTable.status,
      registeredAt: registrationsTable.registeredAt,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.studentId, user.id));

  const studentProfile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id)).limit(1);

  return res.json(registrations.map((r) => ({
    ...r,
    studentName: user.fullName,
    studentEmail: user.email,
    studentCollegeIdNumber: studentProfile[0]?.collegeIdNumber ?? "",
    registeredAt: r.registeredAt.toISOString(),
  })));
});

// GET /api/admin/events (admin's own events)
router.get("/admin/events", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile.length || !adminProfile[0].collegeId) return res.json([]);

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
      thumbnailUrl: eventsTable.thumbnailUrl,
      collegeId: eventsTable.collegeId,
      collegeName: collegesTable.name,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
    .where(eq(eventsTable.collegeId, adminProfile[0].collegeId));

  const now = new Date();
  const result = await Promise.all(
    events.map(async (event) => {
      const counts = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, event.id));
      return {
        ...event,
        thumbnailUrl: event.thumbnailUrl ?? null,
        eventDate: event.eventDate.toISOString(),
        registrationDeadline: event.registrationDeadline.toISOString(),
        createdAt: event.createdAt.toISOString(),
        registeredCount: Number(counts[0]?.count ?? 0),
        eventStatus: event.eventDate < now ? "completed" : "upcoming",
      };
    })
  );

  return res.json(result);
});

// GET /api/admin/events/:eventId/registrations
router.get("/admin/events/:eventId/registrations", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId);
  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!events.length) return res.status(404).json({ error: "Event not found" });
  if (!adminProfile.length || adminProfile[0].collegeId !== events[0].collegeId) {
    return res.status(403).json({ error: "Not your event" });
  }

  const registrations = await db
    .select({
      id: registrationsTable.id,
      eventId: registrationsTable.eventId,
      studentId: registrationsTable.studentId,
      status: registrationsTable.status,
      registeredAt: registrationsTable.registeredAt,
      studentName: usersTable.fullName,
      studentEmail: usersTable.email,
    })
    .from(registrationsTable)
    .innerJoin(usersTable, eq(registrationsTable.studentId, usersTable.id))
    .where(eq(registrationsTable.eventId, eventId));

  const result = await Promise.all(
    registrations.map(async (r) => {
      const profile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, r.studentId)).limit(1);
      return {
        ...r,
        eventTitle: events[0].title,
        studentCollegeIdNumber: profile[0]?.collegeIdNumber ?? "",
        registeredAt: r.registeredAt.toISOString(),
      };
    })
  );

  return res.json(result);
});

// PUT /api/admin/registrations/:registrationId/status
router.put("/admin/registrations/:registrationId/status", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

  const registrationId = parseInt(req.params.registrationId);
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
  }

  const regs = await db.select().from(registrationsTable).where(eq(registrationsTable.id, registrationId)).limit(1);
  if (!regs.length) return res.status(404).json({ error: "Registration not found" });

  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  const events = await db.select().from(eventsTable).where(eq(eventsTable.id, regs[0].eventId)).limit(1);
  if (!adminProfile.length || !events.length || adminProfile[0].collegeId !== events[0].collegeId) {
    return res.status(403).json({ error: "Not your event's registration" });
  }

  const [updated] = await db.update(registrationsTable).set({ status }).where(eq(registrationsTable.id, registrationId)).returning();
  const student = await db.select().from(usersTable).where(eq(usersTable.id, updated.studentId)).limit(1);
  const profile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, updated.studentId)).limit(1);

  return res.json({
    id: updated.id,
    eventId: updated.eventId,
    eventTitle: events[0].title,
    studentId: updated.studentId,
    studentName: student[0]?.fullName ?? "",
    studentEmail: student[0]?.email ?? "",
    studentCollegeIdNumber: profile[0]?.collegeIdNumber ?? "",
    status: updated.status,
    registeredAt: updated.registeredAt.toISOString(),
  });
});

export default router;
