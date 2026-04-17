import { db, usersTable, adminProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function query() {
  const users = await db.select().from(usersTable).where(eq(usersTable.role, 'college_admin'));
  console.log("All College Admins: ", users);
  
  const profiles = await db.select().from(adminProfilesTable);
  console.log("All Admin Profiles: ", profiles);
  
  process.exit(0);
}
query();
