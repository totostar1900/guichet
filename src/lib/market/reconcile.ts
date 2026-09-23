import "server-only";
import type { MarketBulletin, Quote } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";

/**
 * Les lignes publiées, confrontées au bulletin.
 *
 * Ce que le Guichet copie du bulletin se vérifie ligne par ligne : un cours,
 * une date, un instrument, un ISIN. Ce qui se vérifie moins bien, c'est ce
 * qu'il cesse de copier : une ligne qui sort de la cote reste publiée tant que
 * personne ne la retire, et un client peut encore passer un ordre dessus.
 *
 * Ce contrôle regarde les deux sens, à chaque séance lue.
 */

/** Combien de séances d'absence font une sortie de cote, plutôt qu'une séance sans cotation. */
export const ABSENCE_SESSIONS = 5;

export type LineIssueKind = "sortie" | "absente" | "prix" | "date" | "instrument" | "doublon";

export interface LineIssue {
  kind: LineIssueKind;
  isin: string;
  offerId?: string;
  title: string;
  detail: string;
  /** Dernière séance où le bulletin la portait, quand nous la connaissons. */
  lastSeen?: string;
  /** Sortie de cote et échéance passée : le retrait ne demande aucun jugement. */
  retirable?: boolean;
}

const clean = (s: string | undefined): string => (s ?? "").replace(/\s+/g, "").toUpperCase();

export interface ReconcileInput {
  offers: Offer[];
  /** Les dernières séances lues, la plus récente en tête. */
  bulletins: MarketBulletin[];
  /** Les cotations de ces séances, par date. */
  quotesByDate: Map<string, Quote[]>;
  now?: Date;
}

/**
 * Les écarts entre les lignes cotées publiées et le bulletin. Liste vide
 * quand tout concorde, ce qui est l'état normal.
 */
export function reconcileLines({ offers, bulletins, quotesByDate, now = new Date() }: ReconcileInput): LineIssue[] {
  const last = bulletins[0];
  if (!last) return [];
  const lastQuotes = (quotesByDate.get(last.sessionDate) ?? []).filter((q) => q.instrument === "action" || q.instrument === "obligation");
  if (lastQuotes.length === 0) return [];

  const today = now.toISOString().slice(0, 10);
  const window = bulletins.slice(0, ABSENCE_SESSIONS);
  // tout ISIN vu au moins une fois sur la fenêtre : une valeur peut manquer une séance et revenir
  const seenRecently = new Set<string>();
  for (const b of window) for (const q of quotesByDate.get(b.sessionDate) ?? []) seenRecently.add(clean(q.isin));

  const byIsin = new Map(lastQuotes.map((q) => [clean(q.isin), q]));
  const listed = offers.filter((o) => o.kind === "MARCHE" && o.status !== "withdrawn");
  const out: LineIssue[] = [];

  for (const o of listed) {
    const key = clean(o.isin);
    const q = byIsin.get(key);
    if (!q) {
      if (seenRecently.has(key)) continue; // absente d'une séance, pas de la cote
      const matured = !!o.maturityOn && o.maturityOn < today;
      out.push({
        kind: "sortie",
        isin: o.isin,
        offerId: o.id,
        title: o.title,
        lastSeen: o.lastPriceOn,
        retirable: matured,
        detail: matured
          ? `absente des ${window.length} dernières séances, échéance du ${o.maturityOn} passée : la ligne a quitté la cote`
          : `absente des ${window.length} dernières séances${o.lastPriceOn ? `, dernier cours le ${o.lastPriceOn}` : ""}${o.maturityOn ? `, échéance annoncée au ${o.maturityOn}` : ", échéance inconnue"} : à trancher au desk`,
      });
      continue;
    }
    if (o.lastPrice !== q.close) out.push({ kind: "prix", isin: o.isin, offerId: o.id, title: o.title, detail: `cours publié ${o.lastPrice} · cours du bulletin ${q.close}` });
    if (o.lastPriceOn !== last.sessionDate) out.push({ kind: "date", isin: o.isin, offerId: o.id, title: o.title, detail: `cours daté du ${o.lastPriceOn} alors que le bulletin est du ${last.sessionDate}` });
    if (o.instrument !== q.instrument) out.push({ kind: "instrument", isin: o.isin, offerId: o.id, title: o.title, detail: `publiée en « ${o.instrument} », le bulletin la cote en « ${q.instrument} »` });
  }

  const published = new Set(listed.map((o) => clean(o.isin)));
  for (const q of lastQuotes) {
    if (published.has(clean(q.isin))) continue;
    out.push({ kind: "absente", isin: q.isin, title: `${q.mnemo} · ${q.designation}`, detail: "cotée au bulletin, absente des lignes publiées" });
  }

  // deux lignes cotées pour le même ISIN : une ligne primaire et sa cotation cohabitent par construction, deux cotations non
  const seen = new Map<string, Offer[]>();
  for (const o of listed) {
    const k = clean(o.isin);
    if (!k) continue;
    seen.set(k, [...(seen.get(k) ?? []), o]);
  }
  for (const [k, list] of seen) {
    if (list.length < 2) continue;
    out.push({ kind: "doublon", isin: k, offerId: list[0].id, title: list[0].title, detail: `${list.length} lignes cotées pour le même ISIN : ${list.map((o) => o.id).join(" · ")}` });
  }

  return out;
}

/** Une phrase pour le point de Santé. */
export function reconcileSummary(issues: LineIssue[]): string {
  if (issues.length === 0) return "chaque ligne publiée est celle du bulletin";
  const n = (k: LineIssueKind) => issues.filter((i) => i.kind === k).length;
  const parts: string[] = [];
  if (n("sortie")) parts.push(`${n("sortie")} sortie(s) de cote encore publiée(s)`);
  if (n("absente")) parts.push(`${n("absente")} ligne(s) du bulletin non publiée(s)`);
  if (n("prix")) parts.push(`${n("prix")} cours différent(s) du bulletin`);
  if (n("date")) parts.push(`${n("date")} cours plus vieux que le bulletin`);
  if (n("instrument")) parts.push(`${n("instrument")} instrument(s) qui ne correspond(ent) pas`);
  if (n("doublon")) parts.push(`${n("doublon")} ISIN en double`);
  return parts.join(" · ");
}
