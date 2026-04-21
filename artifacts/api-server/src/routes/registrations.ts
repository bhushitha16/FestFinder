import { Router } from "express";
import { db, registrationsTable, eventsTable, studentProfilesTable, usersTable, adminProfilesTable, collegesTable, reviewsTable } from "@workspace/db";
import { eq, and, count, avg, inArray, isNull, or } from "drizzle-orm";
import { getSessionUser } from "../lib/auth.js";
import { sendRegistrationStatusEmail } from "../lib/mail.js";

const router = Router();

// POST /api/events/:eventId/register (student only)
router.post("/events/:eventId/register", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "student" || user.status !== "active") return res.status(403).json({ error: "Only students can register for events" });

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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
      if ((Number(counts[0]?.count) ?? 0) >= event.maxParticipants) {
        return res.status(400).json({ error: "Event is at full capacity" });
      }
    }

    const [registration] = await db.insert(registrationsTable).values({
      eventId,
      studentId: user.id,
      status: "pending",
    }).returning();

    if (!registration) throw new Error("Failed to create registration");

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
  } catch (err) {
    next(err);
  }
});

// GET /api/student/registrations
router.get("/student/registrations", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/events (admin's own events)
router.get("/admin/events", async (req, res, next) => {
  try {
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
        parentEventId: eventsTable.parentEventId,
        previousEventId: eventsTable.previousEventId,
        collegeId: eventsTable.collegeId,
        collegeName: collegesTable.name,
        createdAt: eventsTable.createdAt,
      })
      .from(eventsTable)
      .innerJoin(collegesTable, eq(eventsTable.collegeId, collegesTable.id))
      .where(eq(eventsTable.collegeId, adminProfile[0].collegeId));

    if (!events.length) return res.json([]);

    const eventIds = events.map((e) => e.id);
    const now = new Date();

    // Batch fetch registration counts and review stats
    const [regCounts, reviewStats] = await Promise.all([
      db
        .select({ eventId: registrationsTable.eventId, cnt: count() })
        .from(registrationsTable)
        .where(inArray(registrationsTable.eventId, eventIds))
        .groupBy(registrationsTable.eventId),
      db
        .select({ eventId: reviewsTable.eventId, avgRating: avg(reviewsTable.rating), cnt: count() })
        .from(reviewsTable)
        .where(inArray(reviewsTable.eventId, eventIds))
        .groupBy(reviewsTable.eventId),
    ]);

    const regMap = new Map(regCounts.map((r) => [r.eventId, Number(r.cnt)]));
    const reviewMap = new Map(reviewStats.map((r) => [
      r.eventId,
      { avg: r.avgRating ? parseFloat(String(r.avgRating)) : null, count: Number(r.cnt) }
    ]));

    const result = events.map((event) => ({
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
      collegeName: event.collegeName,
      createdAt: event.createdAt.toISOString(),
      registeredCount: regMap.get(event.id) ?? 0,
      eventStatus: event.eventDate < now ? "completed" : "upcoming",
      averageRating: reviewMap.get(event.id)?.avg ?? null,
      reviewCount: reviewMap.get(event.id)?.count ?? 0,
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/events/:eventId/registrations
router.get("/admin/events/:eventId/registrations", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

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
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/events/:eventId/registrations/export
router.get("/admin/events/:eventId/registrations/export", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

    const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!events.length) return res.status(404).json({ error: "Event not found" });
    if (!adminProfile.length || adminProfile[0].collegeId !== events[0].collegeId) {
      return res.status(403).json({ error: "Not your event" });
    }

    const registrations = await db
      .select({
        id: registrationsTable.id,
        status: registrationsTable.status,
        registeredAt: registrationsTable.registeredAt,
        studentName: usersTable.fullName,
        studentEmail: usersTable.email,
        studentId: registrationsTable.studentId,
      })
      .from(registrationsTable)
      .innerJoin(usersTable, eq(registrationsTable.studentId, usersTable.id))
      .where(eq(registrationsTable.eventId, eventId));

    const result = await Promise.all(
      registrations.map(async (r) => {
        const profile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, r.studentId)).limit(1);
        return {
          "Registration ID": r.id,
          "Student Name": r.studentName,
          "Email": r.studentEmail,
          "College ID Number": profile[0]?.collegeIdNumber ?? "N/A",
          "Status": r.status,
          "Registered At": r.registeredAt.toISOString(),
        };
      })
    );

    const headers = ["Registration ID", "Student Name", "Email", "College ID Number", "Status", "Registered At"];
    const csvRows = [
      headers.join(","),
      ...result.map(row => headers.map(header => `"${String((row as any)[header]).replace(/"/g, '""')}"`).join(","))
    ];

    const csvString = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="event-${eventId}-registrations.csv"`);
    return res.send(csvString);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/registrations/export (bulk export for multiple or all events)
router.get("/admin/registrations/export", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

    const adminProfile = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).limit(1);
    if (!adminProfile.length || !adminProfile[0].collegeId) {
      return res.status(403).json({ error: "No college associated" });
    }
    const collegeId = adminProfile[0].collegeId;

    // Let's get the eventIds if provided
    const eventIdsParam = req.query.eventIds as string | undefined;
    
    // Get all events for the college
    const allEventsForCollege = await db.select({ id: eventsTable.id, title: eventsTable.title }).from(eventsTable).where(eq(eventsTable.collegeId, collegeId));
    const validEventIds = new Set(allEventsForCollege.map(e => e.id));
    const eventTitleMap = new Map(allEventsForCollege.map(e => [e.id, e.title]));

    let targetEventIds: number[] = [];
    if (eventIdsParam) {
      targetEventIds = eventIdsParam.split(",").map(Number).filter(id => !isNaN(id) && validEventIds.has(id));
    } else {
      targetEventIds = Array.from(validEventIds);
    }

    if (targetEventIds.length === 0) {
       return res.status(400).json({ error: "No valid events found to export." });
    }

    const registrations = await db
      .select({
        id: registrationsTable.id,
        eventId: registrationsTable.eventId,
        status: registrationsTable.status,
        registeredAt: registrationsTable.registeredAt,
        studentName: usersTable.fullName,
        studentEmail: usersTable.email,
        studentId: registrationsTable.studentId,
      })
      .from(registrationsTable)
      .innerJoin(usersTable, eq(registrationsTable.studentId, usersTable.id))
      .where(inArray(registrationsTable.eventId, targetEventIds));

    const result = await Promise.all(
      registrations.map(async (r) => {
        const profile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, r.studentId)).limit(1);
        return {
          "Event Title": eventTitleMap.get(r.eventId) ?? "Unknown Event",
          "Registration ID": r.id,
          "Student Name": r.studentName,
          "Email": r.studentEmail,
          "College ID Number": profile[0]?.collegeIdNumber ?? "N/A",
          "Status": r.status,
          "Registered At": r.registeredAt.toISOString(),
        };
      })
    );

    const headers = ["Event Title", "Registration ID", "Student Name", "Email", "College ID Number", "Status", "Registered At"];
    const csvRows = [
      headers.join(","),
      ...result.map(row => headers.map(header => `"${String((row as any)[header]).replace(/"/g, '""')}"`).join(","))
    ];

    const csvString = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="bulk-registrations.csv"`);
    return res.send(csvString);
  } catch (err) {
    next(err);
  }
});

router.put("/admin/registrations/:registrationId/status", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "college_admin") return res.status(403).json({ error: "Forbidden" });

    const registrationId = parseInt(req.params.registrationId);
    if (isNaN(registrationId)) return res.status(400).json({ error: "Invalid registration ID" });

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
    if (!updated) throw new Error("Failed to update registration status");

    const student = await db.select().from(usersTable).where(eq(usersTable.id, updated.studentId)).limit(1);
    const profile = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, updated.studentId)).limit(1);

    if (student.length && student[0].email) {
      // Background email sending - don't await to avoid delaying response, but catch error
      sendRegistrationStatusEmail(student[0].email, events[0].title, status as "approved" | "rejected")
        .catch(e => console.error("Error sending status email:", e));
    }

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
  } catch (err) {
    next(err);
  }
});

export default router;
