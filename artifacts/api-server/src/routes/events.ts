import { Router } from "express";
import { db, eventsTable, collegesTable, registrationsTable, adminProfilesTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql, count } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";

const router = Router();

// GET /api/events
router.get("/", async (req, res) => {
  const { college_id, category, search } = req.query as Record<string, string>;

  let query = db
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
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
    .where(eq(collegesTable.status, "active"))
    .$dynamic();

  const conditions = [eq(collegesTable.status, "active")];
  if (college_id) conditions.push(eq(eventsTable.collegeId, parseInt(college_id)));
  if (category) conditions.push(eq(eventsTable.category, category));
  if (search) conditions.push(ilike(eventsTable.title, `%${search}%`));

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
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
    .where(and(...conditions));

  // Get registration counts
  const result = await Promise.all(
    events.map(async (event) => {
      const counts = await db
        .select({ count: count() })
        .from(registrationsTable)
        .where(eq(registrationsTable.eventId, event.id));
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

// GET /api/events/:id
router.get("/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
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
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!events.length) return res.status(404).json({ error: "Event not found" });
  const event = events[0];
  const counts = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  return res.json({
    ...event,
    eventDate: event.eventDate.toISOString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    createdAt: event.createdAt.toISOString(),
    registeredCount: counts[0]?.count ?? 0,
  });
});

// POST /api/events (admin only)
router.post("/", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile.length || !adminProfile[0].collegeId) return res.status(400).json({ error: "Admin has no associated college" });

  const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants } = req.body;
  if (!title || !description || !category || !venue || !eventDate || !registrationDeadline) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [event] = await db.insert(eventsTable).values({
    title,
    description,
    category,
    venue,
    eventDate: new Date(eventDate),
    registrationDeadline: new Date(registrationDeadline),
    maxParticipants: maxParticipants || null,
    collegeId: adminProfile[0].collegeId,
  }).returning();

  const college = await db.select().from(collegesTable).where(eq(collegesTable.id, event.collegeId)).limit(1);
  return res.status(201).json({
    ...event,
    eventDate: event.eventDate.toISOString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    createdAt: event.createdAt.toISOString(),
    collegeName: college[0]?.name ?? "",
    registeredCount: 0,
  });
});

// PUT /api/events/:id (admin only)
router.put("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId);
  const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!events.length) return res.status(404).json({ error: "Event not found" });

  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile.length || adminProfile[0].collegeId !== events[0].collegeId) {
    return res.status(403).json({ error: "You can only edit your own college's events" });
  }

  const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants } = req.body;
  const [updated] = await db.update(eventsTable).set({
    title, description, category, venue,
    eventDate: new Date(eventDate),
    registrationDeadline: new Date(registrationDeadline),
    maxParticipants: maxParticipants || null,
    updatedAt: new Date(),
  }).where(eq(eventsTable.id, eventId)).returning();

  const college = await db.select().from(collegesTable).where(eq(collegesTable.id, updated.collegeId)).limit(1);
  const counts = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  return res.json({
    ...updated,
    eventDate: updated.eventDate.toISOString(),
    registrationDeadline: updated.registrationDeadline.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    collegeName: college[0]?.name ?? "",
    registeredCount: counts[0]?.count ?? 0,
  });
});

// DELETE /api/events/:id (admin only)
router.delete("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId);
  const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!events.length) return res.status(404).json({ error: "Event not found" });

  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile.length || adminProfile[0].collegeId !== events[0].collegeId) {
    return res.status(403).json({ error: "You can only delete your own college's events" });
  }

  await db.delete(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  return res.json({ message: "Event deleted successfully" });
});

export default router;
