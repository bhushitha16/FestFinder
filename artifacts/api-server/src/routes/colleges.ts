import { Router } from "express";
import { db, collegesTable, adminProfilesTable, usersTable, eventsTable, registrationsTable, reviewsTable } from "@workspace/db";
import { eq, and, count, avg, lt, gte, inArray } from "drizzle-orm";

const router = Router();

const now = () => new Date();

async function getEventStats(eventIds: number[]) {
  if (!eventIds.length) return new Map<number, { registeredCount: number; averageRating: number | null; reviewCount: number }>();

  const [regCounts, reviewStats] = await Promise.all([
    db.select({ eventId: registrationsTable.eventId, count: count() })
      .from(registrationsTable)
      .where(inArray(registrationsTable.eventId, eventIds))
      .groupBy(registrationsTable.eventId),
    db.select({ eventId: reviewsTable.eventId, avg: avg(reviewsTable.rating), count: count() })
      .from(reviewsTable)
      .where(inArray(reviewsTable.eventId, eventIds))
      .groupBy(reviewsTable.eventId),
  ]);

  const regMap = new Map(regCounts.map((r) => [r.eventId, Number(r.count)]));
  const reviewMap = new Map(reviewStats.map((r) => [r.eventId, { avg: r.avg ? parseFloat(String(r.avg)) : null, count: Number(r.count) }]));

  return new Map(eventIds.map((id) => [id, {
    registeredCount: regMap.get(id) ?? 0,
    averageRating: reviewMap.get(id)?.avg ?? null,
    reviewCount: reviewMap.get(id)?.count ?? 0,
  }]));
}

// GET /api/colleges — list active colleges
router.get("/", async (_req, res) => {
  const colleges = await db.select().from(collegesTable).where(eq(collegesTable.status, "active")).orderBy(collegesTable.name);

  // Batch fetch admin names for all colleges at once
  const adminRows = await db
    .select({ collegeId: adminProfilesTable.collegeId, name: usersTable.fullName })
    .from(adminProfilesTable)
    .innerJoin(usersTable, eq(adminProfilesTable.userId, usersTable.id))
    .where(and(
      inArray(adminProfilesTable.collegeId, colleges.map((c) => c.id)),
      eq(usersTable.status, "active")
    ));

  const adminMap = new Map(adminRows.map((a) => [a.collegeId, a.name]));

  return res.json(colleges.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    adminName: adminMap.get(c.id) ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

// GET /api/colleges/:id — college detail with events
router.get("/:collegeId", async (req, res) => {
  const collegeId = parseInt(req.params.collegeId);
  const n = now();

  const [[college], adminRows, allEvents] = await Promise.all([
    db.select().from(collegesTable).where(eq(collegesTable.id, collegeId)).limit(1),
    db.select({ name: usersTable.fullName })
      .from(adminProfilesTable)
      .innerJoin(usersTable, eq(adminProfilesTable.userId, usersTable.id))
      .where(and(eq(adminProfilesTable.collegeId, collegeId), eq(usersTable.status, "active")))
      .limit(1),
    db.select().from(eventsTable).where(eq(eventsTable.collegeId, collegeId)),
  ]);

  if (!college) return res.status(404).json({ error: "College not found" });

  const statsMap = await getEventStats(allEvents.map((e) => e.id));

  const serializeEvent = (event: typeof allEvents[0]) => {
    const stats = statsMap.get(event.id)!;
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
      collegeName: college.name,
      registeredCount: stats.registeredCount,
      eventStatus: event.eventDate < n ? "completed" : "upcoming",
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
      createdAt: event.createdAt.toISOString(),
    };
  };

  return res.json({
    id: college.id,
    name: college.name,
    status: college.status,
    adminName: adminRows[0]?.name ?? null,
    upcomingEvents: allEvents.filter((e) => e.eventDate >= n).map(serializeEvent),
    pastEvents: allEvents.filter((e) => e.eventDate < n).map(serializeEvent),
    createdAt: college.createdAt.toISOString(),
  });
});

export default router;
