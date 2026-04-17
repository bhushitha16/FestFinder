import { Router } from "express";
import { db, bookmarksTable, eventsTable, collegesTable, registrationsTable, reviewsTable } from "@workspace/db";
import { eq, and, count, avg } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";

const router = Router();

// GET /api/bookmarks
router.get("/", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const bookmarks = await db
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
    .from(bookmarksTable)
    .innerJoin(eventsTable, eq(bookmarksTable.eventId, eventsTable.id))
    .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
    .where(eq(bookmarksTable.userId, user.id));

  const now = new Date();
  const result = await Promise.all(bookmarks.map(async (event) => {
    const [countRow] = await db.select({ count: count() }).from(registrationsTable).where(eq(registrationsTable.eventId, event.id));
    const [avgRow] = await db.select({ avg: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.eventId, event.id));
    const [reviewCountRow] = await db.select({ count: count() }).from(reviewsTable).where(eq(reviewsTable.eventId, event.id));
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
      collegeName: event.collegeName,
      registeredCount: Number(countRow?.count ?? 0),
      eventStatus: event.eventDate < now ? "completed" : "upcoming",
      averageRating: avgRow?.avg ? parseFloat(String(avgRow.avg)) : null,
      reviewCount: Number(reviewCountRow?.count ?? 0),
      createdAt: event.createdAt.toISOString(),
    };
  }));

  return res.json(result);
});

// POST /api/bookmarks/:eventId
router.post("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const eventId = parseInt(req.params.eventId);
  try {
    await db.insert(bookmarksTable).values({ userId: user.id, eventId }).onConflictDoNothing();
    return res.status(201).json({ message: "Bookmark added" });
  } catch {
    return res.status(400).json({ error: "Could not add bookmark" });
  }
});

// DELETE /api/bookmarks/:eventId
router.delete("/:eventId", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const eventId = parseInt(req.params.eventId);
  await db.delete(bookmarksTable).where(and(eq(bookmarksTable.userId, user.id), eq(bookmarksTable.eventId, eventId)));
  return res.json({ message: "Bookmark removed" });
});

export default router;
