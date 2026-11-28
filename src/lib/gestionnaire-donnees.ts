import "server-only";
import { redirect } from "next/navigation";
import { requireSession, authMode, mfaRequired } from "@/lib/auth";
import { clientOrigin } from "@/lib/hosts";
import { repo } from "@/lib/data";
import { fold } from "@/lib/text";
import { servedUnits } from "@/lib/positions";
import { jourDesParts, sensDeLIntention } from "@/lib/domain/intent";
import { ACCES_DE_DEMONSTRATION, accesLu, cleDeLAcces, EMAIL_DE_DEMONSTRATION, KIND_ACCES_GESTIONNAIRE, type AccesGestionnaire } from "@/lib/domain/gestionnaire-acces";
import { joursEntre, jourAvant, resumeDeLaSerie, serieJournaliere, type FondsDuCalcul, type PointDuJour } from "@/lib/domain/gestionnaire";
import type { Intent, Offer } from "@/lib/domain/types";
import type { Session } from "@/lib/auth/types";

/**
 * LES DONNÉES DU GESTIONNAIRE ET LA PORTE (28 novembre 2026). Ce fichier est le seul à lire pour lui, et ce qu'il rend ne contient ni nom de client, ni ordre, ni somme perçue par la maison.
 * Il ne lit pas le commissionnement : un fonds est « à lui » parce que sa société de gestion, au nom du bulletin, figure sur son accès.
 */

/** L'accès actif de cette adresse, ou rien. */
export async function accesDeLAdresse(email: string | undefined): Promise<AccesGestionnaire | undefined> {
  if (!email) return undefined;
  const cle = cleDeLAcces(email);
  if (authMode() === "dev" && cle === EMAIL_DE_DEMONSTRATION) return ACCES_DE_DEMONSTRATION;
  const rows = await repo().listPrive(KIND_ACCES_GESTIONNAIRE);
  const row = rows.find((r) => cleDeLAcces(r.key) === cle);
  const a = row ? accesLu(row.key, row.data) : undefined;
  return a?.actif ? a : undefined;
}

/** La porte de l'espace : une session, le second facteur comme au desk, et un accès actif. Sinon on retourne à l'accueil du client. */
export async function requireGestionnaire(next = "/gestion"): Promise<{ session: Session; acces: AccesGestionnaire }> {
  const session = await requireSession(next);
  if (session.provider === "supabase" && mfaRequired()) {
    if (!session.mfaEnrolled) redirect(`/connexion/mfa?enrol=1&next=${encodeURIComponent(next)}`);
    if (!session.mfaVerified) redirect(`/connexion/mfa?next=${encodeURIComponent(next)}`);
  }
  const acces = await accesDeLAdresse(session.email);
  if (!acces) redirect(`${clientOrigin()}/?acces=gestion`);
  return { session, acces };
}

/** Les fonds d'un accès : ceux dont la société de gestion, au nom du bulletin, est l'une des siennes. */
export const fondsDeLAcces = (offres: Offer[], acces: AccesGestionnaire): Offer[] => {
  const siens = new Set(acces.gestionnaires.map(fold));
  return offres.filter((o) => o.kind === "FONDS" && o.fund && siens.has(fold(o.fund.manager)));
};

/** Les mouvements de parts d'un fonds : l'identifiant du porteur ne sert qu'à compter, et ne sort jamais d'ici. */
const mouvementsDuFonds = (intents: Intent[], o: Offer) =>
  intents
    .filter((i) => i.offerId === o.id && i.state === "reglee")
    .map((i) => ({ jour: jourDesParts(i), porteur: i.clientId ?? i.clientName, units: (sensDeLIntention(i.type) === "reduit" ? -1 : 1) * servedUnits(i, o) }));

export interface FondsDuTableau {
  id: string;
  nom: string;
  isin: string;
  /** La date de la dernière valeur liquidative et sa valeur. */
  vl?: { valeur: number; le: string };
  serie: PointDuJour[];
  resume: ReturnType<typeof resumeDeLaSerie>;
}

export interface Tableau {
  du: string;
  au: string;
  fonds: FondsDuTableau[];
  global: { serie: PointDuJour[]; resume: ReturnType<typeof resumeDeLaSerie> };
}

/** Le tableau de bord d'un accès : une série journalière par fonds et une série globale, sur `jours` jours se terminant aujourd'hui. */
export async function tableauDuGestionnaire(acces: AccesGestionnaire, jours = 365, aujourdhui = new Date()): Promise<Tableau> {
  const au = aujourdhui.toISOString().slice(0, 10);
  const du = jourAvant(au, jours - 1);
  const [offres, intents] = await Promise.all([repo().listOffers(), repo().listIntents()]);
  const siens = fondsDeLAcces(offres, acces);
  const calcul: { o: Offer; f: FondsDuCalcul }[] = [];
  for (const o of siens) {
    const navs = o.fund ? await repo().listFundNavs(o.fund.key, 1000) : [];
    const lues = navs.length ? navs : o.fund ? [{ navDate: o.fund.navDate, nav: o.fund.nav }] : [];
    calcul.push({ o, f: { mouvements: mouvementsDuFonds(intents, o), navs: lues.map((n) => ({ navDate: n.navDate, nav: n.nav })) } });
  }
  const fonds: FondsDuTableau[] = calcul.map(({ o, f }) => {
    const serie = serieJournaliere([f], du, au);
    const derniere = [...f.navs].sort((a, b) => b.navDate.localeCompare(a.navDate))[0];
    return { id: o.id, nom: o.title, isin: o.isin, ...(derniere ? { vl: { valeur: derniere.nav, le: derniere.navDate } } : {}), serie, resume: resumeDeLaSerie(serie) };
  });
  const globale = serieJournaliere(calcul.map((c) => c.f), du, au);
  return { du, au, fonds, global: { serie: globale, resume: resumeDeLaSerie(globale) } };
}

export { joursEntre };
