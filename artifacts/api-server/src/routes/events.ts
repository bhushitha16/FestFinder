import { Router } from "express";
import { db, eventsTable, collegesTable, registrationsTable, adminProfilesTable, eventPhotosTable, reviewsTable } from "@workspace/db";
import { eq, and, ilike, count, avg, lt, gte } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";

const router = Router();

async function buildEventRow(event: any, collegeName: string) {
  const [countRow] = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, event.id));
  const [avgRow] = await db.select({ avg: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.eventId, event.id));
  const [reviewCountRow] = await db.select({ count: count() }).from(reviewsTable).where(eq(reviewsTable.eventId, event.id));
  const now = new Date();
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    eventDate: event.eventDate.toISOString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    maxParticipants: event.maxParticipants ?? null,
    thumbnailUrl: event.thumbnailUrl ?? null,
    collegeId: event.collegeId,
    collegeName,
    registeredCount: Number(countRow?.count ?? 0),
    eventStatus: event.eventDate < now ? "completed" : "upcoming",
    averageRating: avgRow?.avg ? parseFloat(String(avgRow.avg)) : null,
    reviewCount: Number(reviewCountRow?.count ?? 0),
    createdAt: event.createdAt.toISOString(),
  };
}

// GET /api/events
router.get("/", async (req, res) => {
  const { college_id, category, search, status } = req.query as Record<string, string>;
  const now = new Date();

  const conditions: any[] = [eq(collegesTable.status, "active")];
  if (college_id) conditions.push(eq(eventsTable.collegeId, parseInt(college_id)));
  if (category) conditions.push(eq(eventsTable.category, category));
  if (search) conditions.push(ilike(eventsTable.title, `%${search}%`));
  if (status === "upcoming") conditions.push(gte(eventsTable.eventDate, now));
  if (status === "completed") conditions.push(lt(eventsTable.eventDate, now));

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
    .where(and(...conditions));

  const result = await Promise.all(events.map((e) => buildEventRow(e, e.collegeName)));
  return res.json(result);
});

// GET /api/events/:id — full detail with photos and reviews
router.get("/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const rows = await db
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
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!rows.length) return res.status(404).json({ error: "Event not found" });
  const event = rows[0];
  const base = await buildEventRow(event, event.collegeName);

  const photos = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
  const reviews = await db
    .select({
      id: reviewsTable.id,
      eventId: reviewsTable.eventId,
      studentId: reviewsTable.studentId,
      studentName: db.$with("u").from(reviewsTable).as("u"),
      rating: reviewsTable.rating,
      review: reviewsTable.review,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.eventId, eventId));

  // Get student names for reviews
  const { usersTable } = await import("@workspace/db");
  const reviewsWithNames = await Promise.all(
    reviews.map(async (r) => {
      const [user] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, r.studentId)).limit(1);
      return {
        id: r.id,
        eventId: r.eventId,
        studentId: r.studentId,
        studentName: user?.fullName ?? "Anonymous",
        rating: r.rating,
        review: r.review ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );

  return res.json({
    ...base,
    photos: photos.map((p) => ({
      id: p.id,
      eventId: p.eventId,
      photoUrl: p.photoUrl,
      caption: p.caption ?? null,
      uploadedAt: p.uploadedAt.toISOString(),
    })),
    reviews: reviewsWithNames,
  });
});

// POST /api/events (admin only)
router.post("/", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile.length || !adminProfile[0].collegeId) return res.status(400).json({ error: "Admin has no associated college" });

  const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants, thumbnailUrl } = req.body;
  if (!title || !description || !category || !venue || !eventDate || !registrationDeadline) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [event] = await db.insert(eventsTable).values({
    title, description, category, venue,
    eventDate: new Date(eventDate),
    registrationDeadline: new Date(registrationDeadline),
    maxParticipants: maxParticipants || null,
    thumbnailUrl: thumbnailUrl || null,
    collegeId: adminProfile[0].collegeId,
  }).returning();

  const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, event.collegeId)).limit(1);
  return res.status(201).json(await buildEventRow(event, college?.name ?? ""));
});

// PUT /api/events/:id (admin only)
router.put("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId);
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!existing) return res.status(404).json({ error: "Event not found" });

  const [adminProfile] = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

  const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants, thumbnailUrl } = req.body;
  const [updated] = await db.update(eventsTable).set({
    title, description, category, venue,
    eventDate: new Date(eventDate),
    registrationDeadline: new Date(registrationDeadline),
    maxParticipants: maxParticipants || null,
    thumbnailUrl: thumbnailUrl || null,
    updatedAt: new Date(),
  }).where(eq(eventsTable.id, eventId)).returning();

  const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, updated.collegeId)).limit(1);
  return res.json(await buildEventRow(updated, college?.name ?? ""));
});

// DELETE /api/events/:id (admin only)
router.delete("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId);
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!existing) return res.status(404).json({ error: "Event not found" });

  const [adminProfile] = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

  await db.delete(reviewsTable).where(eq(reviewsTable.eventId, eventId));
  await db.delete(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
  await db.delete(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  return res.json({ message: "Event deleted" });
});

// GET /api/events/:id/photos
router.get("/:eventId/photos", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const photos = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
  return res.json(photos.map((p) => ({
    id: p.id, eventId: p.eventId, photoUrl: p.photoUrl, caption: p.caption ?? null, uploadedAt: p.uploadedAt.toISOString(),
  })));
});

// POST /api/events/:id/photos (admin only)
router.post("/:eventId/photos", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId);
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!existing) return res.status(404).json({ error: "Event not found" });

  const [adminProfile] = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

  const { photoUrl, caption } = req.body;
  if (!photoUrl) return res.status(400).json({ error: "photoUrl is required" });

  const [photo] = await db.insert(eventPhotosTable).values({ eventId, photoUrl, caption: caption || null }).returning();
  return res.status(201).json({ id: photo.id, eventId: photo.eventId, photoUrl: photo.photoUrl, caption: photo.caption ?? null, uploadedAt: photo.uploadedAt.toISOString() });
});

// DELETE /api/events/:id/photos/:photoId (admin only)
router.delete("/:eventId/photos/:photoId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

  const photoId = parseInt(req.params.photoId);
  await db.delete(eventPhotosTable).where(eq(eventPhotosTable.id, photoId));
  return res.json({ message: "Photo deleted" });
});

// GET /api/events/:id/reviews
router.get("/:eventId/reviews", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const { usersTable } = await import("@workspace/db");
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.eventId, eventId));
  const result = await Promise.all(
    reviews.map(async (r) => {
      const [user] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, r.studentId)).limit(1);
      return { id: r.id, eventId: r.eventId, studentId: r.studentId, studentName: user?.fullName ?? "Anonymous", rating: r.rating, review: r.review ?? null, createdAt: r.createdAt.toISOString() };
    })
  );
  return res.json(result);
});

// POST /api/events/:id/reviews (student only, event must be completed, must have attended)
router.post("/:eventId/reviews", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "student") return res.status(403).json({ error: "Only students can review events" });

  const eventId = parseInt(req.params.eventId);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.eventDate > new Date()) return res.status(400).json({ error: "Can only review completed events" });

  const [registration] = await db.select().from(registrationsTable).where(
    and(eq(registrationsTable.eventId, eventId), eq(registrationsTable.studentId, user.id), eq(registrationsTable.status, "approved"))
  ).limit(1);
  if (!registration) return res.status(403).json({ error: "You must have an approved registration to review this event" });

  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

  const [existing] = await db.select().from(reviewsTable).where(and(eq(reviewsTable.eventId, eventId), eq(reviewsTable.studentId, user.id))).limit(1);
  if (existing) return res.status(400).json({ error: "You have already reviewed this event" });

  const [created] = await db.insert(reviewsTable).values({ eventId, studentId: user.id, rating, review: review || null }).returning();
  return res.status(201).json({ id: created.id, eventId: created.eventId, studentId: created.studentId, studentName: user.fullName, rating: created.rating, review: created.review ?? null, createdAt: created.createdAt.toISOString() });
});

export default router;
