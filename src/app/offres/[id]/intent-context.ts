import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus, isPast } from "@/lib/domain/status";
import type { IntentType, Offer } from "@/lib/domain/types";
import type { Session } from "@/lib/auth/types";
import type { ChannelStatus } from "@/lib/domain/types";
import { positionsFrom } from "@/lib/positions";
import { FENETRE_MAX_JOURS, arriveesPossibles } from "@/lib/domain/arbitrage";
import { fmt, fmtPct, fmtPrice, localIso } from "@/lib/format";
import type { FinancialProfile } from "@/data/profile";

/**
 * What the intention form needs, loaded once for the fiche (desk-sized
 * screens, the form in the side column) and for its own page on the phone
 * (/offres/[id]/intention): the line, the client and their proven channels,
 * the desk's WhatsApp bridge, the financial profile against this line, the
 * allowed intent types, what the client already holds, the price in words.
 */
export interface IntentContext {
  o: Offer;
  session: Session | null;
  channels?: ChannelStatus;
  bridge?: { phone: string; token: string };
  fin?: FinancialProfile;
  mark: ReturnType<typeof import("@/data/profile").profileFlag>;
  types: IntentType[];
  initial: IntentType;
  held: number;
  qty?: number;
  st: ReturnType<typeof displayStatus>;
  past: boolean;
  /**
   * ARBITRAGE : LES LIGNES ATTEIGNABLES DEPUIS CELLE-CI.
   *
   * Vides sur une ligne qu'on ne peut pas quitter — une adjudication, une
   * émission : on n'y détient rien tant qu'elle n'a pas servi, et ce qu'elle a
   * servi est devenu une ligne cotée ou un titre conservé.
   */
  switchTargets: { id: string; title: string; fonds: boolean }[];
  /**
   * LES DEUX BOUTS DE LA FENÊTRE D'UN ARBITRAGE, CALCULÉS AU SERVEUR.
   *
   * Le champ de date les porte en « min » et « max », pour que le client ne
   * découvre pas le refus du serveur après avoir rempli le reste. Ils viennent
   * d'ici et non du composant : `Date.now()` pendant un rendu donne une valeur
   * au serveur et une autre au navigateur, ce qui est une discordance
   * d'hydratation la nuit du passage à minuit — et un appel impur dans un
   * rendu, que le linter refuse à juste titre.
   */
  fenetre: { min: string; max: string };
}

export type IntentSearch = { intent?: string; qty?: string; de?: string };

export async function loadIntentContext(o: Offer, sp: IntentSearch, session: Session | null): Promise<IntentContext> {
  // Tout ce qu'il faut, en une fois.
  //
  // Les canaux du client, son profil financier, puis ses intentions et les
  // lignes pour ce qu'il détient : trois allers-retours qui s'attendaient, et
  // rien ne liait l'un à l'autre. La fonction tourne dans une fonction serveur
  // aux États-Unis tandis que la base est ailleurs, donc chaque attente se paie
  // en dizaines de millisecondes. C'est ce que le lecteur connecté attendait en
  // ouvrant une fiche.
  //
  // Un lecteur anonyme ne lisait déjà rien de tout cela : pour lui, rien ne
  // change.
  /* LE RACHAT DU TRÉSOR EST UNE SORTIE, DONC IL PART DE CE QU'ON DÉTIENT.
     Il manquait à cette liste, et c'était la seule ligne dont la question
     s'appelle « cession » : la page ne lisait pas la position, donc le
     formulaire n'avait ni plafond, ni « tout céder », ni ce qui resterait.
     Un lecteur anonyme ne lit toujours rien de tout cela. */
  const wantsHeld = Boolean(session) && (o.kind === "MARCHE" || o.kind === "FONDS" || o.kind === "RACHAT");
  const [{ readLineLink }, { profileFlag }, channels, fin, allIntents, allOffers] = await Promise.all([
    import("@/lib/channels"),
    import("@/data/profile"),
    session ? repo().getChannelStatus(session.userId) : undefined,
    session ? repo().getFinancialProfile(session.userId).catch(() => undefined) : undefined,
    wantsHeld ? repo().listIntents() : [],
    wantsHeld ? repo().listOffers() : [],
  ]);
  // Came through the desk's WhatsApp link: that number is vouched for, the form asks for the e-mail code only.
  const bridgedPhone = readLineLink(sp.de);
  const bridge = bridgedPhone && sp.de ? { phone: bridgedPhone, token: sp.de } : undefined;
  const tenorYears = o.maturityOn ? Math.max(0, (new Date(o.maturityOn).getTime() - new Date().getTime()) / (365.25 * 864e5)) : undefined;
  const equity = o.kind === "ACTIONS" || o.instrument === "action" || (o.kind === "FONDS" && o.fund?.category === "A");
  const mark = profileFlag(fin, { tenorYears, equity });
  const st = displayStatus(o);
  const past = isPast(st);
  const types = allowedIntents(o, st);
  const initial = (types.includes(sp.intent as IntentType) ? sp.intent : types[0]) as IntentType;
  // What the signed-in client already holds on this line : caps sales / redemptions and pre-fills « tout vendre ».
  let held = 0;
  if (wantsHeld && session) {
    held = positionsFrom(allIntents.filter((i) => i.clientId === session.userId), allOffers).filter((p) => p.offer.isin === o.isin).reduce((s, p) => s + p.units, 0);
  }
  /* LES ARRIVÉES POSSIBLES, et elles ne sont plus réservées aux fonds.
     « switchTargets_(o, …) » ne rendait quelque chose que depuis un fonds :
     un client qui vendait une action n'avait aucune destination à choisir, et
     l'arbitrage n'existait que pour un sixième des lignes qu'on détient. La
     liste se calcule sur des offres déjà lues, donc elle ne coûte aucune
     lecture de plus — et elle reste vide quand on ne lit pas les positions. */
  const switchTargets = wantsHeld ? arriveesPossibles(o, allOffers).map((x) => ({ id: x.id, title: x.title, fonds: x.kind === "FONDS" })) : [];
  const qty = sp.qty && /^[\d.,]+$/.test(sp.qty) ? Number(sp.qty.replace(",", ".")) : undefined;
  const jour = (n: number) => localIso(new Date(Date.now() + n * 86_400_000));
  const fenetre = { min: jour(1), max: jour(FENETRE_MAX_JOURS) };
  return { o, session, channels, bridge, fin, mark, types, initial, held, qty, st, past, switchTargets, fenetre };
}

/** The intention page for a line, with the type or quantity a caller pre-selects. */
export function intentHref(id: string, opts?: { intent?: string; qty?: number | string; de?: string }): string {
  const q = new URLSearchParams();
  if (opts?.intent) q.set("intent", opts.intent);
  if (opts?.qty != null) q.set("qty", String(opts.qty));
  if (opts?.de) q.set("de", opts.de);
  const s = q.toString();
  return `/offres/${id}/intention${s ? `?${s}` : ""}`;
}


