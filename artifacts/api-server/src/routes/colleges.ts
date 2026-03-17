import { Router } from "express";
import { db, collegesTable, adminProfilesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/colleges - list approved/active colleges
router.get("/", async (_req, res) => {
  const colleges = await db.select().from(collegesTable).where(eq(collegesTable.status, "active")).orderBy(collegesTable.name);

  // For each college, get admin name
  const result = await Promise.all(
    colleges.map(async (college) => {
      const admins = await db
        .select({ name: usersTable.fullName })
        .from(adminProfilesTable)
        .innerJoin(usersTable, eq(adminProfilesTable.userId, usersTable.id))
        .where(and(eq(adminProfilesTable.collegeId, college.id), eq(usersTable.status, "active")))
        .limit(1);
      return {
        id: college.id,
        name: college.name,
        status: college.status,
        adminName: admins.length ? admins[0].name : null,
        createdAt: college.createdAt.toISOString(),
      };
    })
  );

  return res.json(result);
});

export default router;
