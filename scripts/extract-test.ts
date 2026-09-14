/**
 * Runs the communiqué extractor on a local file and prints the draft.
 * Usage: node scripts/extract-test.ts "C:\path\to\communique.pdf" ["consigne"]
 * Needs ANTHROPIC_API_KEY (or an `ant auth login` profile).
 */
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { extractOffer } from "../src/lib/intake/extract.ts";

const [file, hint] = process.argv.slice(2);
if (!file) {
  console.error("Indiquez un fichier PDF / JPEG / PNG.");
  process.exit(1);
}
const bytes = readFileSync(file);
const ext = extname(file).toLowerCase();
const base64 = bytes.toString("base64");
const input =
  ext === ".pdf"
    ? ({ kind: "pdf", base64, hint } as const)
    : ({ kind: "image", base64, mediaType: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg", hint } as const);

const { draft, seconds } = await extractOffer(input);
console.log(`Extrait en ${seconds} s`);
console.log(JSON.stringify(draft, null, 2));
