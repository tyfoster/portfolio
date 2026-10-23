// Refuses a production build while src/config.js still holds a placeholder, so a placeholder is never deployed.
// A local preview build can opt out with ALLOW_PLACEHOLDERS=1.
import { EMAIL } from "../src/config.js"

const problems = []
if (!EMAIL || /example\.(com|org|net)$/i.test(EMAIL)) problems.push(`src/config.js EMAIL is a placeholder (${EMAIL || "empty"})`)

if (problems.length && process.env.ALLOW_PLACEHOLDERS !== "1") {
  console.error("Build stopped: " + problems.join("; ") + ". Set it, or run with ALLOW_PLACEHOLDERS=1 for a local preview build.")
  process.exit(1)
}
if (problems.length) console.warn("Building with placeholders (ALLOW_PLACEHOLDERS=1): " + problems.join("; "))
