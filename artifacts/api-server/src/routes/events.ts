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
    eventDate: event.eventDate instanceof Date ? event.eventDate.toISOString() : event.eventDate,
    registrationDeadline: event.registrationDeadline instanceof Date ? event.registrationDeadline.toISOString() : event.registrationDeadline,
    maxParticipants: event.maxParticipants ?? null,
    thumbnailUrl: event.thumbnailUrl ?? null,
    parentEventId: event.parentEventId ?? null,
    previousEventId: event.previousEventId ?? null,
    collegeId: event.collegeId,
    collegeName,
    registeredCount: stats.registeredCount,
    eventStatus: (event.eventDate instanceof Date ? event.eventDate : new Date(event.eventDate)) < now() ? "completed" : "upcoming",
    averageRating: stats.averageRating,
    reviewCount: stats.reviewCount,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
  };
}

// GET /api/events
router.get("/", async (req, res, next) => {
  try {
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
    const result = events.map((e) => serializeEvent(e, e.collegeName, statsMap.get(e.id) || { registeredCount: 0, averageRating: null, reviewCount: 0 }));
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id
router.get("/:eventId", async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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
    const stats = statsMap.get(eventId) || { registeredCount: 0, averageRating: null, reviewCount: 0 };
    const base = serializeEvent(event, event.collegeName, stats);

    return res.json({
      ...base,
      subEvents: subEvents.map(e => serializeEvent(e, e.collegeName, statsMap.get(e.id) || { registeredCount: 0, averageRating: null, reviewCount: 0 })),
      photos: photos.map((p) => ({
        id: p.id,
        eventId: p.eventId,
        photoUrl: p.photoUrl,
        caption: p.caption ?? null,
        uploadedAt: p.uploadedAt instanceof Date ? p.uploadedAt.toISOString() : p.uploadedAt,
      })),
      reviews: reviews.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        studentId: r.studentId,
        studentName: r.studentName,
        rating: r.rating,
        review: r.review ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/events (admin only)
router.post("/", upload.single("thumbnail"), async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

    const [adminProfile] = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
    if (!adminProfile?.collegeId) return res.status(400).json({ error: "Admin has no associated college" });

    const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants, parentEventId, previousEventId } = req.body;
    if (!title || !description || !category || !venue || !eventDate || !registrationDeadline) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parseId = (val: any) => {
      if (val === undefined || val === null || val === "" || val === "null" || val === "undefined" || val === "0" || val === 0) return null;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) || parsed <= 0 ? null : (parsed || null);
    };

    const finalMax = (maxParticipants && maxParticipants !== "" && maxParticipants !== "null" && maxParticipants !== "undefined") ? parseInt(String(maxParticipants), 10) : null;
    const finalParent = parseId(parentEventId);
    const finalPrev = parseId(previousEventId);

    const thumbnailUrl = req.file ? `/api/uploads/${req.file.filename}` : null;

    const parsedEventDate = parseSafeDate(eventDate);
    const parsedRegDeadline = parseSafeDate(registrationDeadline);

    if (isNaN(parsedEventDate.getTime()) || isNaN(parsedRegDeadline.getTime())) {
      console.error("Invalid dates:", eventDate, registrationDeadline);
      return res.status(400).json({ error: "Invalid date format provided." });
    }

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

    if (!event) throw new Error("Failed to create event");

    const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, event.collegeId)).limit(1);
    return res.status(201).json(serializeEvent(event, college?.name ?? "", { registeredCount: 0, averageRating: null, reviewCount: 0 }));
  } catch (err) {
    next(err);
  }
});

// PUT /api/events/:id (admin only)
router.put("/:eventId", upload.single("thumbnail"), async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

    const eventId = parseInt(req.params.eventId as string);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

    const [[existing], [adminProfile]] = await Promise.all([
      db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
      db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1),
    ]);

    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (!adminProfile || adminProfile.collegeId !== existing.collegeId) return res.status(403).json({ error: "Not your event" });

    const { title, description, category, venue, eventDate, registrationDeadline, maxParticipants, parentEventId, previousEventId } = req.body;
    
    const parseId = (val: any) => {
      if (val === undefined || val === null || val === "" || val === "null" || val === "undefined" || val === "0" || val === 0) return null;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) || parsed <= 0 ? null : (parsed || null);
    };

    const finalMax = (maxParticipants && maxParticipants !== "" && maxParticipants !== "null" && maxParticipants !== "undefined") ? parseInt(String(maxParticipants), 10) : null;
    const finalParent = parseId(parentEventId);
    const finalPrev = parseId(previousEventId);
    
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

    if (!updated) throw new Error("Failed to update event");

    const statsMap = await getEventStats([eventId]);
    const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, updated.collegeId)).limit(1);
    return res.json(serializeEvent(updated, college?.name ?? "", statsMap.get(eventId) || { registeredCount: 0, averageRating: null, reviewCount: 0 }));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/events/:id (admin only)
router.delete("/:eventId", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

    const eventId = parseInt(req.params.eventId as string);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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

    // Null out child event references to this event before deleting to avoid orphaned FK refs in UI
    await Promise.all([
      db.update(eventsTable).set({ parentEventId: null }).where(eq(eventsTable.parentEventId, eventId)),
      db.update(eventsTable).set({ previousEventId: null }).where(eq(eventsTable.previousEventId, eventId)),
    ]);

    await Promise.all([
      db.delete(reviewsTable).where(eq(reviewsTable.eventId, eventId)),
      db.delete(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId)),
      db.delete(registrationsTable).where(eq(registrationsTable.eventId, eventId)),
    ]);
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
    return res.json({ message: "Event deleted" });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id/photos
router.get("/:eventId/photos", async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId as string);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });
    const photos = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.eventId, eventId));
    return res.json(photos.map((p) => ({
      id: p.id, eventId: p.eventId, photoUrl: p.photoUrl, caption: p.caption ?? null, uploadedAt: p.uploadedAt instanceof Date ? p.uploadedAt.toISOString() : p.uploadedAt,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:id/photos (admin only)
router.post("/:eventId/photos", upload.array("photos", 15), async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin" || user.status !== "active") return res.status(403).json({ error: "Forbidden" });

    const eventId = parseInt(req.params.eventId as string);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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
        uploadedAt: photo.uploadedAt instanceof Date ? photo.uploadedAt.toISOString() : photo.uploadedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// DELETE /api/events/:id/photos/:photoId (admin only)
router.delete("/:eventId/photos/:photoId", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

    const photoId = parseInt(req.params.photoId as string);
    if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });

    const [photo] = await db.select().from(eventPhotosTable).where(eq(eventPhotosTable.id, photoId)).limit(1);
    if (photo) {
      const filePath = path.resolve(process.cwd(), "uploads", photo.photoUrl.replace('/api/uploads/', ''));
      await fs.unlink(filePath).catch(() => {});
      await db.delete(eventPhotosTable).where(eq(eventPhotosTable.id, photo.id));
    }
    return res.json({ message: "Photo deleted" });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id/reviews
router.get("/:eventId/reviews", async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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
      rating: r.rating, review: r.review ?? null, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:id/reviews (student only, completed event, must have attended)
router.post("/:eventId/reviews", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "student") return res.status(403).json({ error: "Only students can review events" });

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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
    if (rating === undefined || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

    const [created] = await db.insert(reviewsTable).values({ eventId, studentId: user.id, rating, review: review || null }).returning();
    if (!created) throw new Error("Failed to create review");

    return res.status(201).json({
      id: created.id, eventId: created.eventId, studentId: created.studentId,
      studentName: user.fullName, rating: created.rating, review: created.review ?? null,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
