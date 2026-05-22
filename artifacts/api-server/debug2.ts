import { db, usersTable, adminProfilesTable } from "@workspace/db";

async function test() {
  const users = await db.select().from(usersTable);
  const admins = await db.select().from(adminProfilesTable);
  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));
  console.log("=== ADMINS ===");
  console.log(JSON.stringify(admins, null, 2));
  process.exit(0);
}
test();
