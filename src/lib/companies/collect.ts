import "server-only";
import { COMPANIES, type DocKind } from "@/data/companies";
import { repo } from "@/lib/data";
import type { IssuerDocument } from "@/lib/domain/market";
import { saveSource } from "@/lib/intake/storage";

/**
 * Keeps the catalogue of documents the listed companies publish on the BVMAC
 * site (états financiers, rapports, fiches) and archives a copy of each new one.
 * Deterministic: the page is scraped for document links, each link is matched to
 * a company by its file name, and only unseen links are downloaded.
 */

export const LISTED_PAGE = "https://www.bvm-ac.org/espace-emetteurs/societes-cotees-a-la-bvmac/";

const MATCH: [RegExp, string][] = [
  [/SEMC/i, "SEMC"],
  [/SAFACAM/i, "SAF"],
  [/SOCAPALM|Fiche-signaletique-SCP/i, "SOCAP"],
  [/REGIONALE/i, "REG"],
  [/BANGE/i, "BANGE"],
  [/SCG-?Re/i, "SCGRE"],
  [/BHC|BGFI/i, "BHC"],
];

export function classify(url: string, anchorText = ""): { mnemo?: string; kind: DocKind; year?: number; title: string } {
  const file = decodeURIComponent(url.split("/").pop() ?? "");
  const mnemo = MATCH.find(([re]) => re.test(file) || re.test(anchorText))?.[1];
  const yearMatch = file.match(/20\d{2}/g);
  // Upload folders start with /uploads/YYYY/MM/: prefer a year found in the file name itself.
  const year = yearMatch ? Number(yearMatch[yearMatch.length - 1]) : undefined;
  const f = file.toUpperCase();
  const kind: DocKind = /FICHE/.test(f) ? "fiche" : /SEMESTRIEL|30-06/.test(f) ? "rapport_semestriel" : /RAPPORT|GESTION|ACTIVITE/.test(f) ? "rapport_gestion" : /IFRS/.test(f) ? "etats_ifrs" : /OHADA|ETATS|FINANCIERS/.test(f) ? "etats_ohada" : /NOTE/.test(f) ? "note_information" : "autre";
  const label: Record<DocKind, string> = { fiche: "Fiche signalétique", etats_ohada: "États financiers OHADA", etats_ifrs: "États financiers IFRS", rapport_gestion: "Rapport de gestion", rapport_semestriel: "Rapport semestriel", note_information: "Note d'information", autre: "Document" };
  return { mnemo, kind, year, title: `${label[kind]}${year ? ` ${year}` : ""}` };
}

export function extractLinks(html: string): { url: string; text: string }[] {
  const out: { url: string; text: string }[] = [];
  const re = /<a[^>]+href="(https:\/\/www\.bvm-ac\.org\/wp-content\/uploads\/[^"]+\.(?:pdf|jpg|png))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ url: m[1], text: m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() });
  // image fiches are often <img> without an anchor
  const img = /<img[^>]+src="(https:\/\/www\.bvm-ac\.org\/wp-content\/uploads\/[^"]*FICHE[^"]*_page-0001\.(?:jpg|png))"/gi;
  while ((m = img.exec(html))) out.push({ url: m[1], text: "fiche" });
  return [...new Map(out.map((l) => [l.url, l])).values()];
}

export interface CollectResult {
  seen: number;
  added: IssuerDocument[];
  skipped: number;
  errors: string[];
}

/** Scrapes the BVMAC page, records new documents and stores a copy of each (PDF up to 20 MB). */
export async function collectIssuerDocuments(opts: { fetchFiles?: boolean } = {}): Promise<CollectResult> {
  const r = repo();
  const res = await fetch(LISTED_PAGE, { headers: { "user-agent": "Guichet/1.0 (Purpose Capital; issuer documents)" }, cache: "no-store" });
  if (!res.ok) throw new Error(`BVMAC a répondu ${res.status}`);
  const links = extractLinks(await res.text());
  const known = new Set((await r.listIssuerDocuments()).map((d) => d.sourceUrl));
  const registry = new Set(COMPANIES.flatMap((c) => c.documents.map((d) => d.url)));
  const added: IssuerDocument[] = [];
  const errors: string[] = [];
  let skipped = 0;
  for (const l of links) {
    if (known.has(l.url)) {
      skipped++;
      continue;
    }
    const c = classify(l.url, l.text);
    if (!c.mnemo || /SIAT/i.test(l.url)) {
      skipped++;
      continue;
    }
    let fileKey: string | undefined;
    let bytes: number | undefined;
    if (opts.fetchFiles !== false) {
      try {
        const f = await fetch(l.url, { headers: { "user-agent": "Guichet/1.0" }, cache: "no-store" });
        if (f.ok) {
          const buf = new Uint8Array(await f.arrayBuffer());
          if (buf.length <= 20 * 1024 * 1024) {
            fileKey = `issuers/${c.mnemo}/${decodeURIComponent(l.url.split("/").pop() ?? "doc")}`;
            await saveSource(fileKey, buf, l.url.endsWith(".pdf") ? "application/pdf" : l.url.endsWith(".png") ? "image/png" : "image/jpeg");
            bytes = buf.length;
          }
        }
      } catch (e) {
        errors.push(`${l.url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const doc = await r.upsertIssuerDocument({ mnemo: c.mnemo, kind: c.kind, year: c.year, title: c.title, sourceUrl: l.url, fileKey, bytes, collectedAt: new Date().toISOString() });
    added.push(doc);
    if (!registry.has(l.url)) await r.logEvent({ kind: "desk", html: `<b>Nouveau document émetteur</b> ${c.mnemo} : ${c.title} — à lire pour mettre à jour les chiffres clés de la société.` });
  }
  return { seen: links.length, added, skipped, errors };
}
