import { Router } from "express";
import { db, collegesTable, adminProfilesTable, usersTable, eventsTable, registrationsTable, reviewsTable } from "@workspace/db";
import { eq, and, count, avg, lt, gte } from "drizzle-orm";

const router = Router();

// GET /api/colleges - list active colleges
router.get("/", async (_req, res) => {
  const colleges = await db.select().from(collegesTable).where(eq(collegesTable.status, "active")).orderBy(collegesTable.name);
  const result = await Promise.all(
    colleges.map(async (college) => {
      const [admin] = await db
        .select({ name: usersTable.fullName })
        .from(adminProfilesTable)
        .innerJoin(usersTable, eq(adminProfilesTable.userId, usersTable.id))
        .where(and(eq(adminProfilesTable.collegeId, college.id), eq(usersTable.status, "active")))
        .limit(1);
      return { id: college.id, name: college.name, status: college.status, adminName: admin?.name ?? null, createdAt: college.createdAt.toISOString() };
    })
  );
  return res.json(result);
});

// GET /api/colleges/:id - college detail with events
router.get("/:collegeId", async (req, res) => {
  const collegeId = parseInt(req.params.collegeId);
  const [college] = await db.select().from(collegesTable).where(eq(collegesTable.id, collegeId)).limit(1);
  if (!college) return res.status(404).json({ error: "College not found" });

  const [admin] = await db
    .select({ name: usersTable.fullName })
    .from(adminProfilesTable)
    .innerJoin(usersTable, eq(adminProfilesTable.userId, usersTable.id))
    .where(and(eq(adminProfilesTable.collegeId, collegeId), eq(usersTable.status, "active")))
    .limit(1);

  const now = new Date();
  const allEvents = await db.select().from(eventsTable).where(eq(eventsTable.collegeId, collegeId));

  const enrichEvent = async (event: any) => {
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
      collegeName: college.name,
      registeredCount: Number(countRow?.count ?? 0),
      eventStatus: event.eventDate < now ? "completed" : "upcoming",
      averageRating: avgRow?.avg ? parseFloat(String(avgRow.avg)) : null,
      reviewCount: Number(reviewCountRow?.count ?? 0),
      createdAt: event.createdAt.toISOString(),
    };
  };

  const upcomingEvents = await Promise.all(allEvents.filter((e) => e.eventDate >= now).map(enrichEvent));
  const pastEvents = await Promise.all(allEvents.filter((e) => e.eventDate < now).map(enrichEvent));

  return res.json({
    id: college.id,
    name: college.name,
    status: college.status,
    adminName: admin?.name ?? null,
    upcomingEvents,
    pastEvents,
    createdAt: college.createdAt.toISOString(),
  });
});

export default router;
