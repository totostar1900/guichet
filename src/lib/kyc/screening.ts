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

/** The public searches the officer runs by hand when no provider is configured, the name pre-filled where the site accepts it. */
export const MANUAL_LISTS: { key: string; label: string; url: (name: string) => string }[] = [
  { key: "opensanctions", label: "OpenSanctions (ONU, UE, OFAC, PPE réunis)", url: (n) => `https://www.opensanctions.org/search/?q=${encodeURIComponent(n)}` },
  { key: "un", label: "Liste consolidée ONU", url: () => "https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list" },
  { key: "eu", label: "Carte des sanctions UE", url: () => "https://www.sanctionsmap.eu/" },
  { key: "ofac", label: "OFAC (États-Unis)", url: () => "https://sanctionssearch.ofac.treas.gov/" },
];

/**
 * LES PERSONNES À CONTRÔLER, AVEC CE QUI LES DISTINGUE D'UN HOMONYME.
 *
 * Le titulaire et toutes les personnes déclarées. La date de naissance part
 * avec le nom quand le dossier la porte, et c'est elle qui fait le travail :
 * une liste de sanctions rend vingt « Jean Nguema », et le champ de notes du
 * contrôle demande au desk d'écarter l'homonymie « date de naissance
 * comparée ». La lui envoyer dans la requête épargne vingt lectures et
 * remonte un score qui veut dire quelque chose.
 */
export function personnesAScreener(f: ClientFile): { nom: string; naissance?: string }[] {
  const tout = [{ nom: f.identity.name, naissance: f.identity.birthDate }, ...f.persons.map((p) => ({ nom: p.name, naissance: p.birthDate }))];
  const vu = new Set<string>();
  const out: { nom: string; naissance?: string }[] = [];
  for (const p of tout) {
    const nom = p.nom?.trim() ?? "";
    if (nom.length <= 2 || vu.has(nom)) continue;
    vu.add(nom);
    out.push({ nom, naissance: p.naissance });
  }
  return out;
}

/** Names worth screening on a file: the holder and every person listed. */
export function namesToScreen(f: ClientFile): string[] {
  return personnesAScreener(f).map((p) => p.nom);
}

type OsMatch = { caption: string; score: number; datasets?: string[]; properties?: { topics?: string[] }; id: string };

/** One /match call per name against the default (sanctions + PEP) collection. */
export async function screenFile(f: ClientFile): Promise<ScreeningResult> {
  const personnes = personnesAScreener(f);
  const queries = personnes.map((p) => p.nom);
  const checkedAt = new Date().toISOString();
  if (!screeningConfigured()) return { provider: "none", checkedAt, queries, hits: [] };
  const schema = f.kind === "physique" ? "Person" : "LegalEntity";
  /* UNE PERSONNE MORALE N'A PAS DE DATE DE NAISSANCE : la première requête
     d'un dossier non physique porte sur l'entité elle-même, et `birthDate`
     n'existe pas sur son schéma. Les suivantes sont des personnes. */
  const body = {
    queries: Object.fromEntries(
      personnes.map((p, i) => {
        const morale = i === 0 && f.kind !== "physique";
        return [`q${i}`, { schema: morale ? schema : "Person", properties: { name: [p.nom], ...(!morale && p.naissance ? { birthDate: [p.naissance] } : {}) } }];
      }),
    ),
  };
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
