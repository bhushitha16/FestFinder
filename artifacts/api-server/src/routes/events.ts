import { Router } from "express";
import { db, eventsTable, collegesTable, registrationsTable, adminProfilesTable, eventPhotosTable, reviewsTable, usersTable } from "@workspace/db";
import { eq, and, or, ilike, count, avg, lt, gte, inArray, sql } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const router = Router();
const upload = multer({ dest: path.resolve(process.cwd(), "uploads"), limits: { fileSize: 5 * 1024 * 1024 } });

const now = () => new Date();

function parseSafeDate(dateStr: any): Date {
  if (!dateStr) return new Date(""); 
  let d = new Date(dateStr as string);
  if (!isNaN(d.getTime())) return d;
  
  // Try DD-MM-YYYY HH:mm or DD-MM-YYYYTHH:mm
  const s = String(dateStr).replace('T', ' ');
  const match = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hh, mm] = match;
    d = new Date(`${year}-${month}-${day}T${hh}:${mm}:00`);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr as string);
}

// Single query to get registration counts, avg ratings, and review counts for a list of event IDs
async function getEventStats(eventIds: number[]) {
  if (!eventIds.length) return new Map<number, { registeredCount: number; averageRating: number | null; reviewCount: number }>();

  const [regCounts, reviewStats] = await Promise.all([
    db
      .select({ eventId: registrationsTable.eventId, count: count() })
      .from(registrationsTable)
      .where(inArray(registrationsTable.eventId, eventIds))
      .groupBy(registrationsTable.eventId),
    db
      .select({ eventId: reviewsTable.eventId, avg: avg(reviewsTable.rating), count: count() })
      .from(reviewsTable)
      .where(inArray(reviewsTable.eventId, eventIds))
      .groupBy(reviewsTable.eventId),
  ]);

  const regMap = new Map(regCounts.map((r) => [r.eventId, Number(r.count)]));
  const reviewMap = new Map(reviewStats.map((r) => [r.eventId, { avg: r.avg ? parseFloat(String(r.avg)) : null, count: Number(r.count) }]));

  return new Map(
    eventIds.map((id) => [
      id,
      {
        registeredCount: regMap.get(id) ?? 0,
        averageRating: reviewMap.get(id)?.avg ?? null,
        reviewCount: reviewMap.get(id)?.count ?? 0,
      },
    ])
  );
}

function serializeEvent(event: any, collegeName: string, stats: { registeredCount: number; averageRating: number | null; reviewCount: number }) {
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
    parentEventId: event.parentEventId ?? null,
    previousEventId: event.previousEventId ?? null,
    collegeId: event.collegeId,
    collegeName,
    registeredCount: stats.registeredCount,
    eventStatus: event.eventDate < now() ? "completed" : "upcoming",
    averageRating: stats.averageRating,
    reviewCount: stats.reviewCount,
    createdAt: event.createdAt.toISOString(),
  };
}

// GET /api/events
router.get("/", async (req, res) => {
  const { college_id, category, search, status } = req.query as Record<string, string>;
  const n = now();

  const conditions: any[] = [eq(collegesTable.status, "active")];
  if (college_id) conditions.push(eq(eventsTable.collegeId, parseInt(college_id)));
  if (category) conditions.push(eq(eventsTable.category, category));
  if (status === "upcoming") conditions.push(gte(eventsTable.eventDate, n));
  if (status === "completed") conditions.push(lt(eventsTable.eventDate, n));

  if (search) {
    const parentMatches = await db.select({ id: eventsTable.id }).from(eventsTable).where(ilike(eventsTable.title, `%${search}%`));
    const pIds = parentMatches.map(p => p.id);
    if (pIds.length > 0) {
      conditions.push(or(ilike(eventsTable.title, `%${search}%`), inArray(eventsTable.parentEventId, pIds)));
    } else {
      conditions.push(ilike(eventsTable.title, `%${search}%`));
    }
  }

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
      parentEventId: eventsTable.parentEventId,
      previousEventId: eventsTable.previousEventId,
      collegeId: eventsTable.collegeId,
      collegeName: collegesTable.name,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
    .where(and(...conditions));

  const statsMap = await getEventStats(events.map((e) => e.id));
  const result = events.map((e) => serializeEvent(e, e.collegeName, statsMap.get(e.id)!));
  return res.json(result);
});

// GET /api/events/:id — full detail with photos and reviews (all in 3 parallel queries)
router.get("/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);

  const [rows, photos, reviews, subEvents] = await Promise.all([
    db
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
        parentEventId: eventsTable.parentEventId,
        previousEventId: eventsTable.previousEventId,
        collegeId: eventsTable.collegeId,
        collegeName: collegesTable.name,
        createdAt: eventsTable.createdAt,
      })
      .from(eventsTable)
      .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
      .where(eq(eventsTable.id, eventId))
      .limit(1),
    db.select().from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId)),
    // Single JOIN to get reviews + student names in one query
    db
      .select({
        id: reviewsTable.id,
        eventId: reviewsTable.eventId,
        studentId: reviewsTable.studentId,
        studentName: usersTable.fullName,
        rating: reviewsTable.rating,
        review: reviewsTable.review,
        createdAt: reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.studentId, usersTable.id))
      .where(eq(reviewsTable.eventId, eventId)),
    db
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
        parentEventId: eventsTable.parentEventId,
        previousEventId: eventsTable.previousEventId,
        collegeId: eventsTable.collegeId,
        collegeName: collegesTable.name,
        createdAt: eventsTable.createdAt,
      })
      .from(eventsTable)
      .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
      .where(eq(eventsTable.parentEventId, eventId)),
  ]);

  if (!rows.length) return res.status(404).json({ error: "Event not found" });

  const event = rows[0];
  const allEventIds = [eventId, ...subEvents.map(e => e.id)];
  const statsMap = await getEventStats(allEventIds);
  const stats = statsMap.get(eventId)!;
  const base = serializeEvent(event, event.collegeName, stats);

  return res.json({
    ...base,
    subEvents: subEvents.map(e => serializeEvent(e, e.collegeName, statsMap.get(e.id)!)),
    photos: photos.map((p) => ({
      id: p.id,
      eventId: p.eventId,
      photoUrl: p.photoUrl,
      caption: p.caption ?? null,
      uploadedAt: p.uploadedAt.toISOString(),
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      studentId: r.studentId,
      studentName: r.studentName,
      rating: r.rating,
      review: r.review ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

// POST /api/events (admin only)
router.post("/", upload.single("thumbnail"), async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const [adminProfile] = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
  if (!adminProfile?.collegeId) return res.status(400).json({ error: "Admin has no associated college" });

  const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants, parentEventId, previousEventId } = req.body;
  if (!title || !description || !category || !venue || !eventDate || !registrationDeadline) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const parsedMax = maxParticipants && maxParticipants !== "null" && maxParticipants !== "undefined" && maxParticipants !== "" ? parseInt(maxParticipants.toString(), 10) : null;
  const parsedParentId = parentEventId && parentEventId !== "null" && parentEventId !== "undefined" && parentEventId !== "" ? parseInt(parentEventId.toString(), 10) : null;
  const parsedPrevId = previousEventId && previousEventId !== "null" && previousEventId !== "undefined" && previousEventId !== "" ? parseInt(previousEventId.toString(), 10) : null;

  const finalMax = typeof parsedMax === 'number' && !Number.isNaN(parsedMax) ? parsedMax : null;
  const finalParent = typeof parsedParentId === 'number' && !Number.isNaN(parsedParentId) ? parsedParentId : null;
  const finalPrev = typeof parsedPrevId === 'number' && !Number.isNaN(parsedPrevId) ? parsedPrevId : null;

  const thumbnailUrl = req.file ? `/api/uploads/${req.file.filename}` : null;

  const parsedEventDate = parseSafeDate(eventDate);
  const parsedRegDeadline = parseSafeDate(registrationDeadline);

  if (isNaN(parsedEventDate.getTime()) || isNaN(parsedRegDeadline.getTime())) {
    console.error("Invalid dates:", eventDate, registrationDeadline);
    return res.status(400).json({ error: "Invalid date format provided." });
  }

  try {
    const [event] = await db.insert(eventsTable).values({
      title, description, category, venue,
      eventDate: parsedEventDate,
      registrationDeadline: parsedRegDeadline,
      maxParticipants: finalMax,
      parentEventId: finalParent,
      previousEventId: finalPrev,
      thumbnailUrl,
      collegeId: adminProfile.collegeId,
    }).returning();

    const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, event.collegeId)).limit(1);
    return res.status(201).json(serializeEvent(event, college?.name ?? "", { registeredCount: 0, averageRating: null, reviewCount: 0 }));
  } catch (err: any) {
    console.error("DB INSERT ERROR in POST /api/events:", err, err.cause);
    const detail = err.cause ? (typeof err.cause === 'string' ? err.cause : JSON.stringify(err.cause)) : err.detail;
    return res.status(500).json({ error: `Failed query: ${err.message} | CAUSE: ${detail}` });
  }
});

// PUT /api/events/:id (admin only)
router.put("/:eventId", upload.single("thumbnail"), async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId as string);
  const [[existing], [adminProfile]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1),
  ]);

  if (!existing) return res.status(404).json({ error: "Event not found" });
  if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

  const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants, parentEventId, previousEventId } = req.body;
  
  const parsedMax = maxParticipants && maxParticipants !== "null" && maxParticipants !== "undefined" && maxParticipants !== "" ? parseInt(maxParticipants.toString(), 10) : null;
  const parsedParentId = parentEventId && parentEventId !== "null" && parentEventId !== "undefined" && parentEventId !== "" ? parseInt(parentEventId.toString(), 10) : null;
  const parsedPrevId = previousEventId && previousEventId !== "null" && previousEventId !== "undefined" && previousEventId !== "" ? parseInt(previousEventId.toString(), 10) : null;

  const finalMax = typeof parsedMax === 'number' && !Number.isNaN(parsedMax) ? parsedMax : null;
  const finalParent = typeof parsedParentId === 'number' && !Number.isNaN(parsedParentId) ? parsedParentId : null;
  const finalPrev = typeof parsedPrevId === 'number' && !Number.isNaN(parsedPrevId) ? parsedPrevId : null;
  
  const thumbnailUrl = req.file ? `/api/uploads/${req.file.filename}` : undefined;

  if (thumbnailUrl && existing.thumbnailUrl) {
    const oldPath = path.resolve(process.cwd(), "uploads", existing.thumbnailUrl.replace('/api/uploads/', ''));
    await fs.unlink(oldPath).catch(() => {});
  }

  const parsedEventDate = parseSafeDate(eventDate);
  const parsedRegDeadline = parseSafeDate(registrationDeadline);

  if (isNaN(parsedEventDate.getTime()) || isNaN(parsedRegDeadline.getTime())) {
    return res.status(400).json({ error: "Invalid date format provided." });
  }

  try {
    const [updated] = await db.update(eventsTable).set({
      title, description, category, venue,
      eventDate: parsedEventDate,
      registrationDeadline: parsedRegDeadline,
      maxParticipants: finalMax,
      parentEventId: finalParent,
      previousEventId: finalPrev,
      ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      updatedAt: new Date(),
    }).where(eq(eventsTable.id, eventId)).returning();

    const statsMap = await getEventStats([eventId]);
    const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, updated.collegeId)).limit(1);
    return res.json(serializeEvent(updated, college?.name ?? "", statsMap.get(eventId)!));
  } catch (err: any) {
    console.error("DB UPDATE ERROR in PUT /api/events:", err, err.cause);
    const detail = err.cause ? (typeof err.cause === 'string' ? err.cause : JSON.stringify(err.cause)) : err.detail;
    return res.status(500).json({ error: `Failed query: ${err.message} | CAUSE: ${detail}` });
  }
});

// DELETE /api/events/:id (admin only)
router.delete("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId as string);
  const [[existing], [adminProfile]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1),
  ]);

  if (!existing) return res.status(404).json({ error: "Event not found" });
  if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

  const photos = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
  for (const photo of photos) {
    const filePath = path.resolve(process.cwd(), "uploads", photo.photoUrl.replace('/api/uploads/', ''));
    await fs.unlink(filePath).catch(() => {});
  }
  if (existing.thumbnailUrl) {
    const thumbPath = path.resolve(process.cwd(), "uploads", existing.thumbnailUrl.replace('/api/uploads/', ''));
    await fs.unlink(thumbPath).catch(() => {});
  }

  await Promise.all([
    db.delete(reviewsTable).where(eq(reviewsTable.eventId, eventId)),
    db.delete(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId)),
    db.delete(registrationsTable).where(eq(registrationsTable.eventId, eventId)),
  ]);
  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  return res.json({ message: "Event deleted" });
});

// GET /api/events/:id/photos
router.get("/:eventId/photos", async (req, res) => {
  const eventId = parseInt(req.params.eventId as string);
  const photos = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
  return res.json(photos.map((p) => ({
    id: p.id, eventId: p.eventId, photoUrl: p.photoUrl, caption: p.caption ?? null, uploadedAt: p.uploadedAt.toISOString(),
  })));
});

// POST /api/events/:id/photos (admin only)
router.post("/:eventId/photos", upload.array("photos", 15), async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

  const eventId = parseInt(req.params.eventId as string);
  const [[existing], [adminProfile]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1),
  ]);

  if (!existing) return res.status(404).json({ error: "Event not found" });
  if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

  const caption = req.body.caption as string | undefined;
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "Missing photos" });
  }

  const currentPhotos = await db.select({ count: count() }).from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
  const currentCount = Number(currentPhotos[0]?.count || 0);

  if (currentCount + files.length > 15) {
    return res.status(400).json({ error: `Cannot upload images. A maximum of 15 images is allowed. Currently has ${currentCount}.` });
  }

  const newPhotos = await db.insert(eventPhotosTable).values(
    files.map((file) => ({ eventId, photoUrl: `/api/uploads/${file.filename}`, caption: caption || null }))
  ).returning();

  return res.status(201).json(
    newPhotos.map((photo) => ({
      id: photo.id,
      eventId: photo.eventId,
      photoUrl: photo.photoUrl,
      caption: photo.caption ?? null,
      uploadedAt: photo.uploadedAt.toISOString(),
    }))
  );
});

// DELETE /api/events/:id/photos/:photoId (admin only)
router.delete("/:eventId/photos/:photoId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

  const [photo] = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.id, parseInt(req.params.photoId as string))).limit(1);
  if (photo) {
    const filePath = path.resolve(process.cwd(), "uploads", photo.photoUrl.replace('/api/uploads/', ''));
    await fs.unlink(filePath).catch(() => {});
    await db.delete(eventPhotosTable).where(eq(eventPhotosTable.id, photo.id));
  }
  return res.json({ message: "Photo deleted" });
});

// GET /api/events/:id/reviews
router.get("/:eventId/reviews", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const reviews = await db
    .select({
      id: reviewsTable.id,
      eventId: reviewsTable.eventId,
      studentId: reviewsTable.studentId,
      studentName: usersTable.fullName,
      rating: reviewsTable.rating,
      review: reviewsTable.review,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.studentId, usersTable.id))
    .where(eq(reviewsTable.eventId, eventId));

  return res.json(reviews.map((r) => ({
    id: r.id, eventId: r.eventId, studentId: r.studentId, studentName: r.studentName,
    rating: r.rating, review: r.review ?? null, createdAt: r.createdAt.toISOString(),
  })));
});

// POST /api/events/:id/reviews (student only, completed event, must have attended)
router.post("/:eventId/reviews", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "student") return res.status(403).json({ error: "Only students can review events" });

  const eventId = parseInt(req.params.eventId);
  const [[event], [registration], [existing]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(registrationsTable).where(
      and(eq(registrationsTable.eventId, eventId), eq(registrationsTable.studentId, user.id), eq(registrationsTable.status, "approved"))
    ).limit(1),
    db.select().from(reviewsTable).where(and(eq(reviewsTable.eventId, eventId), eq(reviewsTable.studentId, user.id))).limit(1),
  ]);

  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.eventDate > now()) return res.status(400).json({ error: "Can only review completed events" });
  if (!registration) return res.status(403).json({ error: "You must have an approved registration to review this event" });
  if (existing) return res.status(400).json({ error: "You have already reviewed this event" });

  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

  const [created] = await db.insert(reviewsTable).values({ eventId, studentId: user.id, rating, review: review || null }).returning();
  return res.status(201).json({
    id: created.id, eventId: created.eventId, studentId: created.studentId,
    studentName: user.fullName, rating: created.rating, review: created.review ?? null,
    createdAt: created.createdAt.toISOString(),
  });
});

export default router;
