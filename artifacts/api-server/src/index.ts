import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from the api-server root (two levels up from src/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { execSync } from 'child_process';
import app from "./app.js";

console.log("SERVER: DATABASE_URL configured:", !!process.env.DATABASE_URL);
console.log("Server starting...");

// ---------------------------------------------------------------------------
// Auto-initialize the database: push schema (CREATE TABLE IF NOT EXISTS etc.)
// using drizzle-kit. This is idempotent — safe to run on every startup.
// ---------------------------------------------------------------------------
async function initializeDatabase() {
  try {
    console.log("DB: Pushing schema (create tables if not exist)...");

    // Resolve the monorepo root (3 levels up from artifacts/api-server/src/)
    const monorepoRoot = path.resolve(__dirname, "../../..");

    execSync(
      // drizzle-kit push --force avoids interactive confirmation prompts.
      "pnpm --filter @workspace/db run push-force",
      {
        cwd: monorepoRoot,
        env: { ...process.env },
        stdio: "inherit",
      },
    );
    console.log("DB: Schema pushed successfully.");
  } catch (err) {
    // Log but do not crash — the app still starts (useful if already initialised).
    console.error(
      "DB: Schema push failed — the server will still start but some features may not work.",
      err,
    );
  }
}

await initializeDatabase();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
