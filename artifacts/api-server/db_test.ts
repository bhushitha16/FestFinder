import { db, eventsTable } from '../lib/db/src/index.ts';
import fs from 'fs';

async function test() {
  try {
    const res = await db.insert(eventsTable).values({
      title: 'Comedy Workshop',
      description: 'come and laugh hahahaha',
      category: 'Workshop',
      venue: 'banglore',
      eventDate: new Date('2026-04-20T04:30:00.000Z'),
      registrationDeadline: new Date('2026-04-19T23:30:00.000Z'),
      maxParticipants: 200,
      parentEventId: null,
      previousEventId: null,
      thumbnailUrl: null,
      collegeId: 4
    }).returning();
    fs.writeFileSync('db_test_result.txt', 'SUCCESS: ' + JSON.stringify(res));
  } catch (err: any) {
    fs.writeFileSync('db_test_result.txt', 'ERROR MESSAGE: ' + err.message + '\nERROR DETAIL: ' + err.detail + '\nERROR STACK: ' + err.stack);
  }
  process.exit();
}
test();
