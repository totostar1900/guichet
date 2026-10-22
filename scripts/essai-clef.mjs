/** La clef repond-elle ? Un appel minuscule, aucune valeur affichee. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const dire = (s) => fs.writeSync(1, `${s}\n`);
const { default: Anthropic } = await import("@anthropic-ai/sdk");
try {
  const r = await new Anthropic().messages.create({ model: process.env.AUCTION_READ_MODEL || "claude-opus-5", max_tokens: 16, messages: [{ role: "user", content: "Reponds exactement : ok" }] });
  dire(`la clef repond · modele ${r.model} · ${r.usage.input_tokens} jeton(s) en entree, ${r.usage.output_tokens} en sortie`);
} catch (e) {
  dire(`REFUS : ${e.status ?? ""} ${e.message?.slice(0, 400)}`);
}
