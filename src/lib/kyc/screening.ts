import "server-only";
import type { ClientFile } from "@/lib/domain/kyc";

/**
 * Sanctions / PEP screening.
 *  - Manual attestation is always required (recorded on the file by the desk).
 *  - Automatic pre-check against OpenSanctions runs when OPENSANCTIONS_API_KEY is set;
 *    results are hints for the compliance officer, never a decision.
 */

export interface ScreeningHit {
  name: string;
  score: number; // 0..1
  datasets: string[];
  topics: string[]; // e.g. sanction, role.pep
  url?: string;
}

export interface ScreeningResult {
  provider: "opensanctions" | "none";
  checkedAt: string;
  queries: string[];
  hits: ScreeningHit[];
  error?: string;
}

export const screeningConfigured = (): boolean => Boolean(process.env.OPENSANCTIONS_API_KEY);

/** Names worth screening on a file: the holder and every person listed. */
export function namesToScreen(f: ClientFile): string[] {
  const names = [f.identity.name, ...f.persons.map((p) => p.name)].map((n) => n.trim()).filter((n) => n.length > 2);
  return Array.from(new Set(names));
}

type OsMatch = { caption: string; score: number; datasets?: string[]; properties?: { topics?: string[] }; id: string };

/** One /match call per name against the default (sanctions + PEP) collection. */
export async function screenFile(f: ClientFile): Promise<ScreeningResult> {
  const queries = namesToScreen(f);
  const checkedAt = new Date().toISOString();
  if (!screeningConfigured()) return { provider: "none", checkedAt, queries, hits: [] };
  const schema = f.kind === "physique" ? "Person" : "LegalEntity";
  const body = { queries: Object.fromEntries(queries.map((q, i) => [`q${i}`, { schema: i === 0 && f.kind !== "physique" ? schema : "Person", properties: { name: [q] } }])) };
  try {
    const res = await fetch("https://api.opensanctions.org/match/default?threshold=0.7", {
      method: "POST",
      headers: { authorization: `ApiKey ${process.env.OPENSANCTIONS_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { provider: "opensanctions", checkedAt, queries, hits: [], error: `HTTP ${res.status}` };
    const json = (await res.json()) as { responses?: Record<string, { results?: OsMatch[] }> };
    const hits: ScreeningHit[] = [];
    for (const r of Object.values(json.responses ?? {})) {
      for (const m of r.results ?? []) {
        hits.push({ name: m.caption, score: m.score, datasets: m.datasets ?? [], topics: m.properties?.topics ?? [], url: `https://www.opensanctions.org/entities/${m.id}/` });
      }
    }
    return { provider: "opensanctions", checkedAt, queries, hits: hits.sort((a, b) => b.score - a.score) };
  } catch (e) {
    return { provider: "opensanctions", checkedAt, queries, hits: [], error: e instanceof Error ? e.message : "échec" };
  }
}
