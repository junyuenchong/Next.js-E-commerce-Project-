/**
 * Removes .next (build cache).
 * Stop `next dev` / `next start` first — Windows often locks `.next/trace` while Node is running.
 */
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const nextDir = path.join(process.cwd(), ".next");

async function main() {
  if (!fs.existsSync(nextDir)) {
    console.log(".next not found (nothing to clean)");
    return;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log("Removed .next");
      return;
    } catch (error: unknown) {
      lastError = error;
      console.warn(
        `Attempt ${attempt}/5 failed:`,
        error instanceof Error ? error.message : String(error),
      );

      if (attempt < 5) {
        console.warn(
          "Stop next dev / other Node process using this project, retrying in 1s...",
        );
        await delay(1000);
      }
    }
  }

  console.error("Could not remove .next after 5 attempts.");
  console.error("Close terminals running `next dev`, then run: npm run clean");
  if (lastError instanceof Error) {
    console.error(lastError.message);
  }
  process.exit(1);
}

void main();
