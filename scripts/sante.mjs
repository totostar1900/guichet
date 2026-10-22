/**
 * La page Santé, en texte, contre la base de production.
 *
 * Décider de la suite demande de savoir ce qui est rouge AUJOURD'HUI, et non
 * ce qui l'était la dernière fois qu'on a regardé l'écran.
 *
 *   npx tsx scripts/sante.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { healthChecks } = await import("../src/lib/health.ts");
const checks = await healthChecks();
const marque = { crit: "ROUGE", warn: "ORANGE", ok: "  ok " };
for (const c of checks.sort((a, b) => ({ crit: 0, warn: 1, ok: 2 })[a.level] - ({ crit: 0, warn: 1, ok: 2 })[b.level])) {
  console.log(`${marque[c.level]}  ${c.label} : ${c.value}`);
  if (c.level !== "ok" && c.detail) console.log(`        ${c.detail}`);
}
console.log(`\n${checks.filter((c) => c.level === "crit").length} rouges · ${checks.filter((c) => c.level === "warn").length} oranges · ${checks.filter((c) => c.level === "ok").length} au vert`);
