/**
 * Removes .next (build cache).
 * Stop `next dev` / `next start` first — Windows often locks `.next/trace` while Node is running.
 * Paths with parentheses can make locks worse; if clean keeps failing, move the repo to a simpler path.
 */
const fs = require("fs");
const path = require("path");
const { setTimeout: delay } = require("timers/promises");

const nextDir = path.join(__dirname, "..", ".next");

async function main() {
  if (!fs.existsSync(nextDir)) {
    console.log(".next not found (nothing to clean)");
    return;
  }

  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log("Removed .next");
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `Attempt ${attempt}/5 failed:`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < 5) {
        console.warn(
          "→ Stop next dev / other Node using this project, retrying in 1s…",
        );
        await delay(1000);
      }
    }
  }

  console.error("Could not remove .next after 5 attempts.");
  console.error(
    "→ Close every terminal running `next dev`, then run: npm run clean",
  );
  if (lastErr instanceof Error) console.error(lastErr.message);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
