import { Router } from "express";
import { db, collegesTable, eventsTable, registrationsTable, reviewsTable } from "@workspace/db";
import { eq, and, count, avg, lt, gte } from "drizzle-orm";

const router = Router();

// GET /api/colleges
router.get("/", async (_req, res, next) => {
  try {
    const colleges = await db.select().from(collegesTable).where(eq(collegesTable.status, "active"));
    return res.json(colleges.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/colleges/:collegeId
router.get("/:collegeId", async (req, res, next) => {
  try {
    const collegeId = parseInt(req.params.collegeId);
    if (isNaN(collegeId)) return res.status(400).json({ error: "Invalid college ID" });

    const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, collegeId)).limit(1);
    if (!college) return res.status(404).json({ error: "College not found" });

    const now = new Date();
    const events = await db.select().from(eventsTable).where(eq(eventsTable.collegeId, collegeId));

    const result = await Promise.all(events.map(async (event) => {
      const [countRow] = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, event.id));
      const [avgRow] = await db.select({ avg: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.eventId, event.id));
      const [reviewCountRow] = await db.select({ count: count() }).from(reviewsTable).where(eq(reviewsTable.eventId, event.id));
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
        collegeId: event.collegeId,
        collegeName: college.name,
        registeredCount: Number(countRow?.count ?? 0),
        eventStatus: (event.eventDate instanceof Date ? event.eventDate : new Date(event.eventDate)) < now ? "completed" : "upcoming",
        averageRating: avgRow?.avg ? parseFloat(String(avgRow.avg)) : null,
        reviewCount: Number(reviewCountRow?.count ?? 0),
        createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
      };
    }));

    return res.json({
      id: college.id,
      name: college.name,
      status: college.status,
      createdAt: college.createdAt instanceof Date ? college.createdAt.toISOString() : college.createdAt,
      events: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
