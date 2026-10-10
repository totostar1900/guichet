import "server-only";
import { loadNews } from "@/lib/news";
import { isVisible } from "@/lib/news/model";
import { deskRecipients } from "@/lib/notify/recipients";
import { repo } from "@/lib/data";
import { emailConfigured, whatsappConfigured } from "@/lib/notify/providers";
import { localIso } from "@/lib/format";
import { bondTerms } from "@/lib/domain/status";
import { rythmeObserve } from "@/lib/domain/fund-perf";
import { JOURS_AVANT_ALERTE } from "@/lib/domain/virement";
import { JOURS_AVANT_RELANCE } from "@/lib/domain/standing";
import { addBusinessDays } from "@/lib/finance";
import { ageDeLaRemise, sansNouvelle } from "@/lib/domain/prelevement";
import { comptesDemo, ordreDeDemo } from "@/lib/domain/demo";
import { indexCheck } from "@/lib/market/index";
import { ingestBoc } from "@/lib/market/boc";
import { joursDAttente, propositions, sansResultat } from "@/lib/results/depouillement";
import { ABSENCE_SESSIONS, reconcileLines, reconcileSummary, type LineIssue } from "@/lib/market/reconcile";
import { positionsFrom } from "@/lib/positions";
import type { MarketBulletin } from "@/lib/domain/market";

/**
 * One glance at whether the machine is running: last bulletin, freshness of
 * prices and NAVs, messaging that could not go out, and offers with a
 * maturity we only guessed. Used by the desk's « Santé » page and by the
 * daily check that warns the desk.
 */
export interface HealthCheck {
  key: string;
  label: string;
  level: "ok" | "warn" | "crit";
  value: string;
  detail?: string;
}

/**
 * Les bulletins que le lecteur a laissés incomplets, sur toute l'histoire :
 * un statut autre que « ok », ou aucune action lue. C'est l'arriéré qu'une
 * relecture referme. Un lecteur corrigé ne rattrape pas le passé tout seul,
 * et ces séances manquantes faussent la lecture de l'indice.
 */
export async function bulletinsToReread(): Promise<MarketBulletin[]> {
  const all = await repo().listBulletins(2000);
  return all.filter((b) => b.status !== "ok" || !b.counts?.equities).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

/** Combien de séances une passe reprend : assez pour avancer, assez peu pour finir. */
export const REREAD_BATCH = 6;

/**
 * Combien de séances le ROBOT reprend par tour, lui qui n'est pas pressé.
 *
 * Six est le plafond d'un bouton de page, borné par le délai d'une action.
 * Le robot de lecture dispose de trois cents secondes, et un bulletin
 * demande environ quatre secondes : soixante en laissent soixante de marge,
 * ce qui couvre un PDF lourd et une BVMAC lente sans se faire couper au
 * milieu d'une séance.
 */
export const ARRIERE_PAR_TOUR = 60;

/**
 * L'ordre dans lequel on reprend les séances : la moins récemment relue
 * d'abord.
 *
 * Par date de séance, les six plus anciennes passaient en tête à chaque fois.
 * Quand elles ne s'améliorent pas, et une séance dont le PDF ne porte pas la
 * ligne manquante ne s'améliorera jamais, elles repassaient indéfiniment et
 * les vingt-six autres n'étaient jamais atteintes : le bouton ne pouvait pas
 * vider sa propre liste.
 *
 * `ingestedAt` bouge à chaque lecture, y compris une relecture : trier
 * dessus fait tourner la file sans rien stocker de plus. Une passe couvre du
 * terrain neuf, et après un tour complet elle recommence, ce qui est juste :
 * un lecteur corrigé mérite un nouvel essai sur tout le monde.
 */
export const rereadOrder = (list: MarketBulletin[]): MarketBulletin[] => [...list].sort((a, b) => a.ingestedAt.localeCompare(b.ingestedAt) || a.sessionDate.localeCompare(b.sessionDate));

/** Ce qu'une passe de relecture a changé, en chiffres et en dates. */
export interface PasseDeRelecture {
  /** Les séances effectivement reprises, dans l'ordre où elles l'ont été. */
  pris: string[];
  /**
   * Celles qui ont gagné des cours, QUEL QUE SOIT L'INSTRUMENT.
   *
   * Ce compte ne regardait que les actions. La lecture géométrique rend des
   * OBLIGATIONS, donc une passe qui en rattrape cent trente-trois aurait
   * annoncé « 0 séance améliorée » : un progrès réel, invisible dans le seul
   * chiffre que la page montre.
   */
  gagne: number;
  /** Ce que le lecteur a dit des séances qu'il n'a pas pu reprendre. */
  motifs: string[];
  /** Celles qui sont repassées en « ok » et quittent donc l'arriéré. */
  closes: number;
  /** Celles que le lecteur n'a pas pu reprendre du tout. */
  echecs: number;
  /** Ce qui reste à reprendre après la passe. */
  reste: number;
}

/**
 * UNE PASSE DE RELECTURE, ÉCRITE À UN SEUL ENDROIT.
 *
 * Deux appelants : le bouton de la page Santé, qui en prend six dans le temps
 * d'une action de formulaire, et le robot de lecture, qui en prend soixante
 * dans ses trois cents secondes. La même boucle écrite deux fois aurait fini
 * par se répondre différemment, et un écart entre deux chemins vers le même
 * résultat ne se voit jamais avant qu'il ne coûte.
 *
 * « seules » sert les boutons d'une ligne : on reprend ces séances-là, qu'elles
 * soient en tête de file ou non. Sans elle, ce sont les moins récemment
 * reprises, parce que trier par date de séance ramenait éternellement les
 * mêmes six et n'atteignait jamais la fin de la liste.
 */
export async function relireArriere(by: MarketBulletin["ingestedBy"], n: number, seules?: string[]): Promise<PasseDeRelecture> {
  const enAttente = await bulletinsToReread();
  const todo = seules?.length ? enAttente.filter((b) => seules.includes(b.sessionDate)) : rereadOrder(enAttente).slice(0, Math.max(0, n));

  const out: PasseDeRelecture = { pris: [], gagne: 0, closes: 0, echecs: 0, motifs: [], reste: Math.max(0, enAttente.length - todo.length) };
  for (const b of todo) {
    /* « upload: » désigne un PDF déposé à la main : il n'a pas d'adresse à
       reprendre, et sans ce garde le lecteur irait chercher celle du jour. */
    const sourceUrl = b.sourceUrl && !b.sourceUrl.startsWith("upload:") ? b.sourceUrl : undefined;
    out.pris.push(b.sessionDate);
    try {
      /* ELLE LIT, ELLE N ARCHIVE PAS. Le PDF est téléchargé pour être lu,
         puis jeté. Mesuré le 6 octobre 2026 : 646 Mo sur 1024 déjà pris, un
         bulletin pèse 1,5 Mo, et 287 séances attendent. Les garder toutes en
         les relisant demande 424 Mo, donc le plan gratuit cède avant la fin,
         et il cède DANS le try ci-dessous, qui compterait un disque plein
         comme un échec de lecture. La reprise des anciens PDF est une
         opération à part, décidée pour elle-même. */
      const res = await ingestBoc({ sessionDate: b.sessionDate, sourceUrl, by, keepPdf: false });
      if (!res.found || !res.bulletin) {
        out.echecs += 1;
        out.motifs.push(`${b.sessionDate} : la bourse ne sert pas ce document.`);
        continue;
      }
      /* Les trois instruments, pas seulement les actions : les lignes que la
         lecture géométrique rattrape sont des obligations. */
      const avant = b.counts;
      const apres = res.bulletin.counts;
      if ((apres?.equities ?? 0) > (avant?.equities ?? 0) || (apres?.bonds ?? 0) > (avant?.bonds ?? 0) || (apres?.funds ?? 0) > (avant?.funds ?? 0)) out.gagne += 1;
      if (res.bulletin.status === "ok") out.closes += 1;
    } catch (e) {
      /* UN ÉCHEC SE DIT. Ce catch était muet : une séance qui lève, comme le
         22 décembre 2023 dont un cours déborde la colonne numérique, se
         comptait sans que personne ne puisse savoir pourquoi, et l'on
         reprenait indéfiniment une séance dont l'échec était connu du seul
         moteur de base de données. */
      out.echecs += 1;
      out.motifs.push(`${b.sessionDate} : ${(e as Error).message}`);
    }
  }
  return out;
}

/**
 * Les écarts entre les lignes cotées publiées et le bulletin, sur la
 * dernière séance lue. Ce que le Guichet copie se vérifie ; ce qu'il cesse
 * de copier aussi.
 */
export async function lineIssues(): Promise<LineIssue[]> {
  const r = repo();
  const bulletins = await r.listBulletins(ABSENCE_SESSIONS);
  if (bulletins.length === 0) return [];
  const quotesByDate = new Map<string, Awaited<ReturnType<typeof r.quotesOn>>>();
  await Promise.all(bulletins.map(async (b) => quotesByDate.set(b.sessionDate, await r.quotesOn(b.sessionDate))));
  const [offers, tousLesOrdres, contacts] = await Promise.all([r.listOffers(), r.listIntents(), r.listContacts().catch(() => [])]);
  /* Un compte de démonstration qui détient une ligne ne rend pas son écart
     plus urgent : personne n'a d'argent dessus. La même règle qu'au
     reporting, décidée le 10 octobre 2026. */
  const demo = comptesDemo(contacts);
  const intents = tousLesOrdres.filter((i) => !ordreDeDemo(demo, i.clientId));
  // qui détient encore la ligne : c'est ce qui décide de l'urgence, pas la ligne elle-même
  const holdersByOffer = new Map<string, number>();
  for (const p of positionsFrom(intents, offers)) {
    const key = p.offer.id;
    holdersByOffer.set(key, (holdersByOffer.get(key) ?? 0) + 1);
  }
  return reconcileLines({ offers, bulletins, quotesByDate, holdersByOffer });
}

/**
 * CE QU'UN POINT A LAISSÉ DEHORS, DIT EN BOUT DE PHRASE.
 *
 * Un point de Santé qui écarte des lignes sans le dire ressemble trait pour
 * trait à un point qui ne les a jamais vues. La phrase est la même partout,
 * et elle disparaît quand il n'y a rien à écarter.
 */
const ecartesDeDemo = (n: number): string => (n > 0 ? ` · ${n} ligne(s) de comptes de démonstration écartées` : "");

/** Business days between two dates (Mon–Fri, holidays not known). */
function businessDaysBetween(from: string, to: string): number {
  let n = 0;
  const d = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
}

export async function healthChecks(now = new Date()): Promise<HealthCheck[]> {
  const r = repo();
  const today = localIso(now);
  /* Une année de dates de VL suffit à lire un rythme, et borne la lecture :
     au-delà on paierait des pages pour des fonds qui ne publient plus. */
  const depuisUnAn = localIso(new Date(now.getTime() - 365 * 86_400_000));
  const [bulletins, offers, notifications, navs, datesVL] = await Promise.all([
    r.listBulletins(30),
    r.listOffers(),
    r.listNotifications(300),
    r.latestFundNavs(),
    r.fundNavDates(depuisUnAn).catch(() => [] as { fundKey: string; navDate: string }[]),
  ]);
  const out: HealthCheck[] = [];

  /* Le rythme réellement observé de chaque fonds, par sa série. */
  const serieDe = new Map<string, { navDate: string; nav: number }[]>();
  for (const d of datesVL) serieDe.set(d.fundKey, [...(serieDe.get(d.fundKey) ?? []), { navDate: d.navDate, nav: 1 }]);
  const rythmeDe = new Map<string, ReturnType<typeof rythmeObserve>>();
  for (const [k, s] of serieDe) rythmeDe.set(k, rythmeObserve(s));

  // 1. Last bulletin: the BOC comes out after each session; two missed business days is a problem.
  const last = bulletins[0];
  const lag = last ? businessDaysBetween(last.sessionDate, today) : 99;
  out.push({
    key: "boc",
    label: "Dernier bulletin BVMAC",
    level: !last ? "crit" : lag >= 3 ? "crit" : lag >= 2 ? "warn" : "ok",
    value: last ? `BOC n° ${last.number} du ${last.sessionDate}` : "aucun",
    detail: last ? `ingéré ${last.ingestedAt.slice(0, 16).replace("T", " ")} par ${last.ingestedBy} · ${last.status}${last.anomalies.length ? ` · ${last.anomalies.length} anomalie(s)` : ""}${lag >= 2 ? ` · ${lag} jours ouvrés sans bulletin` : ""}` : "le cron de 18:30 n'a encore rien ingéré",
  });

  // 2. Failed / partial ingests in the last 30 bulletins.
  const bad = bulletins.filter((b) => b.status !== "ok");
  out.push({
    key: "ingests",
    label: "Ingestions à vérifier (30 derniers bulletins)",
    level: bulletins.some((b) => b.status === "echec") ? "crit" : bad.length > 5 ? "warn" : "ok",
    value: `${bad.length} partiel(s) ou échec(s)`,
    detail: bad.slice(0, 5).map((b) => `${b.sessionDate} ${b.status}${b.anomalies[0] ? ` : ${b.anomalies[0].slice(0, 80)}` : ""}`).join(" · ") || "tout est propre",
  });

  // 2 bis. The whole backlog, not just the last 30: incomplete readings distort the index.
  const arriere = await bulletinsToReread();
  const sansCours = arriere.filter((b) => !b.counts?.equities).length;
  out.push({
    key: "relire",
    label: "Bulletins à relire",
    level: sansCours ? "crit" : arriere.length ? "warn" : "ok",
    value: `${arriere.length} séance${arriere.length > 1 ? "s" : ""}`,
    detail: arriere.length
      ? `${sansCours ? `${sansCours} sans aucun cours d'action · ` : ""}du ${arriere[0].sessionDate} au ${arriere[arriere.length - 1].sessionDate} · relisibles depuis leur adresse d'origine`
      : "chaque séance lue est complète",
  });

  // 2 ter. Every published listed line against the bulletin, both ways.
  const issues = await lineIssues();
  const sorties = issues.filter((i) => i.kind === "sortie");
  out.push({
    key: "lignes",
    label: "Lignes publiées contre le bulletin",
    level: issues.some((i) => i.kind !== "sortie") ? "crit" : sorties.length ? "warn" : "ok",
    value: issues.length ? `${issues.length} écart${issues.length > 1 ? "s" : ""}` : `${offers.filter((o) => o.kind === "MARCHE" && o.status !== "withdrawn").length} lignes conformes`,
    detail: reconcileSummary(issues),
  });

  // 3. Listed lines whose price is older than the last bulletin.
  const listed = offers.filter((o) => o.kind === "MARCHE" && !o.hidden);
  const stale = listed.filter((o) => last && o.lastPriceOn && o.lastPriceOn < last.sessionDate);
  out.push({
    key: "prices",
    label: "Lignes cotées sans cours à la dernière séance",
    level: stale.length > listed.length / 2 ? "warn" : "ok",
    value: `${stale.length} / ${listed.length}`,
    detail: stale.length ? stale.slice(0, 6).map((o) => `${o.title.slice(0, 40)} (${o.lastPriceOn})`).join(" · ") : "toutes au dernier bulletin",
  });

  /* 4. VL en retard. UN PEU EN RETARD ET FIGÉ NE SONT PAS LA MÊME CHOSE, et
     le seuil « plus de cinq » les confondait : un fonds dont la VL n'a pas
     bougé depuis MILLE CENT CINQUANTE-HUIT jours comptait pour un, donc le
     contrôle restait vert. C'est ainsi qu'un fonds dédoublé est resté publié
     trois ans avec le prix de sa première séance. Un retard se compte, un
     gel se nomme. */
  /* LE RETARD SE JUGE SUR LE RYTHME OBSERVÉ, PAS SUR CELUI DÉCLARÉ, parce
     que le second se trompe : deux fonds dits mensuels publient chaque
     semaine, un fonds dit quotidien publie chaque semaine. Juger sur la
     déclaration laissait donc des fonds hors du contrôle et en mettait
     d'autres en retard permanent. La déclaration ne sert plus que de
     repli, quand la série est trop courte pour trancher. */
  const rythmeDeLaVL = (n: (typeof navs)[number]) => {
    const vu = rythmeDe.get(n.fundKey);
    return vu && vu !== "?" ? vu : n.frequency;
  };
  const enRetard = navs.filter((n) => businessDaysBetween(n.navDate, today) > 15 && ["quotidienne", "hebdomadaire"].includes(rythmeDeLaVL(n)));
  const geles = enRetard.filter((n) => businessDaysBetween(n.navDate, today) > 60);
  out.push({
    key: "navs",
    label: "VL quotidiennes / hebdomadaires en retard (> 3 semaines)",
    level: geles.length ? "crit" : enRetard.length > 5 ? "warn" : "ok",
    value: `${enRetard.length} / ${navs.length}${geles.length ? ` · ${geles.length} figée(s)` : ""}`,
    detail: geles.length
      ? `Figée(s) depuis plus de trois mois, à vérifier : ${geles.slice(0, 6).map((n) => `${n.name} (${n.navDate})`).join(" · ")}`
      : enRetard.slice(0, 6).map((n) => `${n.name} (${n.navDate})`).join(" · ") || "à jour",
  });

  /* 4 bis. LE MÊME FONDS SOUS DEUX CLEFS. Le bulletin a écrit une fois
     « FCP BGFI Bank ATLAS » et cent trente et une fois « FCP BGFIBank
     ATLAS » : une espace, deux clefs, deux lignes publiées, et le client
     voyait le même fonds deux fois dont une au prix de 2023. La clef se
     fabrique du nom, donc elle suit ses variantes d'orthographe ; on
     détecte ici, une personne décide de fusionner. */
  const forme = (k: string) => k.replace(/[^a-z0-9]/g, "");
  const parForme = new Map<string, string[]>();
  for (const n of navs) parForme.set(forme(n.fundKey), [...(parForme.get(forme(n.fundKey)) ?? []), n.fundKey]);
  const doubles = [...parForme.values()].filter((ks) => ks.length > 1);
  out.push({
    key: "fonds-doubles",
    label: "Fonds connus sous deux clefs (une variante d'orthographe)",
    level: doubles.length ? "crit" : "ok",
    value: `${doubles.length}`,
    detail: doubles.length ? doubles.map((ks) => ks.join(" ≠ ")).join(" · ") : "aucun",
  });

  /* 4 ter. LA FRÉQUENCE DÉCLARÉE CONTRE LE RYTHME OBSERVÉ.
     La section du bulletin où paraît un fonds est un horizon de comparaison,
     pas une cadence : le 25 septembre 2026, FCP HARVEST DIVERSIFIE, fonds
     quotidien, figure aussi au mensuel et au trimestriel. La fréquence que
     nous affichons au client vient pourtant de là, et elle lui promet un
     rythme de publication. Mesuré le 6 octobre 2026 : neuf fonds sur
     quarante-cinq ne tiennent pas cette promesse. */
  const divergents = navs
    .map((n) => ({ n, vu: rythmeDe.get(n.fundKey) }))
    .filter(({ n, vu }) => vu && vu !== "?" && vu !== n.frequency);
  out.push({
    key: "fonds-rythme",
    label: "Fréquence annoncée ≠ rythme réel des VL",
    level: divergents.length > 10 ? "warn" : "ok",
    value: `${divergents.length} / ${navs.length}`,
    detail: divergents.length
      ? divergents.slice(0, 8).map(({ n, vu }) => `${n.name} : annoncé ${n.frequency}, observé ${vu}`).join(" · ")
      : "tous conformes",
  });

  // 5. Messaging.
  const recent = notifications.filter((n) => n.createdAt >= localIso(new Date(now.getTime() - 7 * 86_400_000)));
  const skipped = recent.filter((n) => n.status === "skipped").length;
  const failed = recent.filter((n) => n.status === "failed").length;
  out.push({
    key: "notify",
    label: "Messages clients (7 jours)",
    level: failed ? "crit" : !whatsappConfigured() || !emailConfigured() ? "warn" : "ok",
    value: `${recent.length} préparés · ${recent.filter((n) => n.status === "sent").length} envoyés · ${skipped} non envoyés · ${failed} échecs`,
    detail: `WhatsApp ${whatsappConfigured() ? "configuré" : "non configuré"} · e-mail ${emailConfigured() ? "configuré" : "non configuré"}${skipped ? " : les accusés de réception sont à envoyer à la main" : ""}`,
  });

  // 6. Bonds priced on a guessed maturity.
  const guessed = listed.filter((o) => o.instrument === "obligation" && !bondTerms(o.isin) && o.priceSource !== "desk");
  out.push({
    key: "terms",
    label: "Obligations cotées sans échéancier exact",
    level: guessed.length ? "warn" : "ok",
    value: `${guessed.length}`,
    detail: guessed.map((o) => o.issuer).filter((v, i, a) => a.indexOf(v) === i).join(" · ") || "toutes documentées",
  });

  // 7. Offers closing without a published price.
  const pending = offers.filter((o) => (o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA") && o.status === "published" && o.deadlineAt > now.toISOString() && (o.pricePct == null && o.precountRate == null));
  out.push({
    key: "pricing",
    label: "Lignes ouvertes sans prix du desk",
    level: pending.length ? "warn" : "ok",
    value: `${pending.length}`,
    detail: pending.map((o) => o.title).join(" · ") || "—",
  });

  /**
   * 8. LES SÉANCES CLOSES QUI ATTENDENT ENCORE LEUR RÉSULTAT.
   *
   * Mesuré le 4 octobre 2026 : onze lignes du primaire, closes depuis douze à
   * vingt jours, sans prix servi. Le dépouillement de deux des trois séances
   * était pourtant au dépôt, lu et confirmé huit jours plus tôt. Rien ne le
   * disait, parce que le prix servi ne s'écrivait qu'en servant des ordres
   * clients : une séance où la maison n'avait placé personne n'avait aucune
   * raison d'apparaître quelque part.
   *
   * Un rendement affiché « si servi à 93 % » trois semaines après la séance
   * est une promesse périmée sous les yeux d'un client.
   */
  const closes = offers.filter((o) => sansResultat(o, now));
  const attente = Math.max(0, ...closes.map((o) => joursDAttente(o, now)));
  const pretes = propositions(closes, await r.listAuctionResults({ limit: 400 }).catch(() => []), now);
  out.push({
    key: "depouillement",
    label: "Séances closes sans résultat",
    // Deux jours de tolérance : un dépouillement paraît rarement le soir même.
    level: closes.length === 0 ? "ok" : attente > 7 ? "crit" : "warn",
    value: `${closes.length}`,
    detail: closes.length
      ? `la plus ancienne attend depuis ${attente} jours · ${pretes.size} avec un dépouillement prêt à appliquer`
      : "chaque séance close porte son résultat",
  });

  // 9. The index against the share prices of the last two sessions read.
  try {
    const [b0, b1] = bulletins;
    const [q0, q1] = await Promise.all([b0 ? r.quotesOn(b0.sessionDate) : [], b1 ? r.quotesOn(b1.sessionDate) : []]);
    const chk = indexCheck(b0, q1, q0);
    out.push({ key: "index", label: "Indice BVMAC et cours d'actions", level: chk.ok ? "ok" : "warn", value: b0?.indexValue != null ? `${b0.indexValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${(b0.indexVariationPct ?? 0) >= 0 ? "+" : ""}${(b0.indexVariationPct ?? 0).toFixed(2).replace(".", ",")} %` : "non lu", detail: chk.detail });
  } catch {
    /* quiet */
  }

  // 9. Actualités : les liens morts, et la file d'attente de relecture.
  //
  // Le compte ne portait que sur les liens reçus depuis plus de sept jours :
  // une file fraîche restait invisible, et « personne n'a trié » se lisait
  // comme « rien n'est arrivé ». Le point compte désormais tout ce qui attend,
  // et ne s'alarme qu'au-delà de sept jours : voir la file est normal, la
  // laisser vieillir ne l'est pas.
  const news = await loadNews();
  const dead = news.filter((n) => n.status === "publiee" && isVisible(n, now) && n.linkOk === false);
  const waiting = news.filter((n) => n.status === "recu");
  const aged = waiting.filter((n) => now.getTime() - new Date(n.createdAt).getTime() > 7 * 86_400_000);
  const days = (n: (typeof waiting)[number]) => Math.floor((now.getTime() - new Date(n.createdAt).getTime()) / 86_400_000);
  const oldest = [...waiting].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  out.push({
    key: "news",
    label: "Actualités : liens à trier / liens morts",
    level: dead.length || aged.length ? "warn" : "ok",
    value: `${waiting.length} à trier · ${dead.length} mort${dead.length > 1 ? "s" : ""}`,
    detail:
      [
        ...(oldest ? [`le plus ancien attend depuis ${days(oldest)} jour${days(oldest) > 1 ? "s" : ""} : ${oldest.domain}`] : []),
        ...(aged.length ? [`${aged.length} au-delà de sept jours`] : []),
        ...dead.map((n) => `lien mort : ${n.title.slice(0, 50)}`),
      ]
        .slice(0, 3)
        .join(" · ") || "aucun lien en attente, aucun lien mort",
  });

  /* Les virements arrivés sans nom.
     C'est un défaut MUET par nature : l'argent est bien sur le compte de la
     maison, le rapprochement est juste au franc près, et pourtant un client
     regarde une page vide en se demandant où est son virement. Rien d'autre
     dans l'application ne regarde de ce côté, puisque le crédit n'a pas de
     client à qui s'inscrire. L'âge décide, pas le montant : trois jours est le
     délai d'un virement de place. */
  const virements = await r.listVirements({ state: "recu" }).catch(() => []);
  const ageDe = (v: { at: string }) => Math.floor((now.getTime() - new Date(`${v.at.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000);
  const vieux = virements.filter((v) => ageDe(v) > JOURS_AVANT_ALERTE);
  const plusVieux = [...virements].sort((a, b) => a.at.localeCompare(b.at))[0];
  out.push({
    key: "virements",
    label: "Virements reçus sans nom",
    level: vieux.length ? "crit" : virements.length ? "warn" : "ok",
    value: `${virements.length}`,
    detail: plusVieux ? `le plus ancien attend depuis ${ageDe(plusVieux)} jour${ageDe(plusVieux) > 1 ? "s" : ""} : ${plusVieux.amount.toLocaleString("fr-FR")} FCFA de ${plusVieux.payer}` : "tout est rattaché",
  });

  /* Les prélèvements remis dont on n'a aucune nouvelle.
     Troisième issue d'un tirage, et la pire : l'argent a pu être débité chez
     le client sans nous parvenir, ou n'avoir jamais été présenté, et les deux
     se ressemblent de notre côté. Rien d'autre ne regarde là : un tirage sans
     sort n'est ni au journal d'un client, ni dans un écart de rapprochement. */
  const remis = await r.listTirages({ state: "remis" }).catch(() => []);
  const muets = remis.filter((x) => sansNouvelle(x, now));
  const plusVieuxTirage = [...muets].sort((a, b) => (a.handedAt ?? "").localeCompare(b.handedAt ?? ""))[0];
  out.push({
    key: "prelevements",
    label: "Prélèvements remis sans nouvelle",
    level: muets.length ? "crit" : "ok",
    value: `${muets.length} / ${remis.length}`,
    detail: plusVieuxTirage
      ? `le plus ancien attend depuis ${ageDeLaRemise(plusVieuxTirage, now)} jours : ${plusVieuxTirage.amount.toLocaleString("fr-FR")} FCFA, tirage ${plusVieuxTirage.ref}`
      : remis.length
        ? "tous remis depuis moins de dix jours"
        : "aucun tirage en attente de sort",
  });

  /* LES VERSEMENTS PROGRAMMÉS QUI ATTENDENT LEUR ARGENT.
     Un versement par virement crée un ordre que le client doit régler ; celui
     dont la provision portait déjà le montant est couvert et ne compte pas
     ici. Personne ne regardait de ce côté : le robot en ajoutait un chaque
     mois, et un client qui ne vire jamais accumulait des ordres confirmés que
     rien ne relançait. Cinq jours ouvrés : le délai d'un virement de place
     plus un jour, au-delà duquel ce n'est plus un virement en route. */
  const [tousLesOrdres, contacts] = await Promise.all([r.listIntents().catch(() => []), r.listContacts().catch(() => [])]);
  /* LES COMPTES DE DÉMONSTRATION NE SE RELANCENT PAS. Ils existent pour
     montrer le service, et un versement d'essai jamais réglé ferait monter un
     point que personne ne pourrait éteindre : on relancerait la maison
     elle-même. La même règle qu'au reporting, décidée le 10 octobre 2026, et
     le point dit qu'il l'applique. */
  const demo = comptesDemo(contacts);
  const ordres = tousLesOrdres.filter((i) => !ordreDeDemo(demo, i.clientId));
  const versements = ordres.filter((i) => i.standingId && i.state === "confirmee" && !i.coveredAt);
  const limite = addBusinessDays(now, -JOURS_AVANT_RELANCE).toISOString();
  const versementsEnRetard = versements.filter((i) => i.createdAt < limite);
  const plusVieuxVersement = [...versementsEnRetard].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  out.push({
    key: "versements",
    label: "Versements programmés non réglés",
    level: versementsEnRetard.length ? "warn" : "ok",
    value: `${versementsEnRetard.length} / ${versements.length}`,
    detail:
      (plusVieuxVersement
        ? `le plus ancien attend depuis le ${plusVieuxVersement.createdAt.slice(0, 10)} : ${(plusVieuxVersement.amount ?? 0).toLocaleString("fr-FR")} FCFA, ${plusVieuxVersement.clientName}`
        : versements.length
          ? "tous attendent depuis moins de cinq jours ouvrés"
          : "aucun versement programmé n'attend son règlement") + ecartesDeDemo(tousLesOrdres.length - ordres.length),
  });

  /* LES GESTES PASSÉS SANS SECOND REGARD.
     Quatre yeux veut dire deux personnes : quand la maison n'a qu'un
     responsable, le contrôle est impossible, et le geste passe. Ce n'est pas
     un trou tant que cela SE DIT : ici, on les compte. Zéro est le cas
     normal d'un desk à deux responsables ; un chiffre qui monte dit soit
     qu'il faut un second responsable, soit qu'on en a perdu un. */
  const seuls = await r.listAudit({ entity: "quatre-yeux", limit: 200 }).catch(() => []);
  const duMois = seuls.filter((a) => a.at >= new Date(now.getTime() - 30 * 86_400_000).toISOString());
  out.push({
    key: "quatre-yeux",
    label: "Gestes passés sans second regard",
    level: duMois.length > 3 ? "warn" : "ok",
    value: `${duMois.length}`,
    detail: duMois.length ? `sur trente jours · le dernier : ${duMois[0].reason ?? duMois[0].action}` : "chaque geste sensible a eu deux personnes, ou n'en avait pas besoin",
  });

  return out;
}

/**
 * After the evening ingest: log the state, and e-mail the desk when a point is
 * red (needs RESEND_API_KEY + EMAIL_FROM; otherwise the event log is the alert).
 */
export async function alertDesk(now = new Date()): Promise<{ level: HealthCheck["level"]; mailed: boolean }> {
  const checks = await healthChecks(now);
  const crit = checks.filter((c) => c.level === "crit");
  const warn = checks.filter((c) => c.level === "warn");
  const level: HealthCheck["level"] = crit.length ? "crit" : warn.length ? "warn" : "ok";
  const r = repo();
  await r.logEvent({
    kind: "system",
    html: `<b>Santé</b> : ${level === "ok" ? "tout est vert" : [...crit, ...warn].map((c) => `${c.level === "crit" ? "🔴" : "🟠"} ${c.label} : ${c.value}`).join(" · ")}`,
  });
  if (!crit.length) return { level, mailed: false };
  const to = await deskRecipients();
  if (!to.length || !emailConfigured()) return { level, mailed: false };
  const { sendEmail } = await import("@/lib/notify/providers");
  const text = crit.map((c) => `${c.label}\n${c.value}${c.detail ? `\n${c.detail}` : ""}`).join("\n\n");
  const html = `<p>Points en rouge après le passage du soir :</p>${crit.map((c) => `<p><b>${c.label}</b><br>${c.value}${c.detail ? `<br><small>${c.detail}</small>` : ""}</p>`).join("")}<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/desk/sante">Voir la page Santé</a></p>`;
  for (const addr of to) {
    try {
      await sendEmail(addr, `Guichet : ${crit.length} point(s) à traiter`, html, text);
    } catch {
      /* the event log already carries the alert */
    }
  }
  return { level, mailed: true };
}
