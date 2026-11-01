import { getT } from "@/i18n/server";
import { gestesProposables, rubriquesPresentes, type CleDeRubrique, type FaitsDuDossier } from "@/lib/domain/accueil";
import type { AvisGarde } from "@/lib/domain/garde";
import { INTENT_STATE_LABEL } from "@/lib/domain/intent";
import type { StandingOrder } from "@/lib/domain/standing";
import type { Intent, Offer, Watch } from "@/lib/domain/types";
import { fmt, fmtDate } from "@/lib/format";
import { TuilesDossier, type Geste, type TuileDeDossier } from "./TuilesDossier";

/**
 * « MON DOSSIER » : UNE RUBRIQUE N'EXISTE QUE SI ELLE A QUELQUE CHOSE À MONTRER.
 *
 * Huit rubriques fixes disaient « Vos intentions » à qui n'en avait jamais
 * posé : une porte sur une pièce vide, et huit portes qu'on apprend à ne plus
 * pousser. La règle des deux conditionnelles (sondage, prélèvements) devient
 * celle de toutes — `rubriquesPresentes` la tient, avec ses conditions, dans le
 * domaine.
 *
 * CE QUE CHACUNE DIT, C'EST SON DERNIER FAIT, jamais un compte : l'arbitrage du
 * 29 octobre 2026 vaut toujours. « Dernière : OTA 6,25 % Gabon » parle du
 * lecteur ; « 3 intentions » parle de la maison.
 *
 * CE QUI MANQUE SE PROPOSE, ET C'EST TOUT : le pied « Vous pouvez aussi » ne
 * liste que des gestes que le client peut faire lui-même (`gestesProposables`).
 * Les droits de garde et les documents ne s'y trouvent pas : on ne les crée pas,
 * ils paraissent d'eux-mêmes.
 *
 * LES LECTURES SONT CELLES DE LA PAGE, plus deux (les avis de garde et les
 * veilles), bornées au client et lues en même temps que les autres.
 */
export async function DossierAccueil({
  mine,
  offers,
  standing,
  avis,
  veilles,
  attentesSondees,
  mandats,
  mandatASigner,
  prochaine,
  operations,
  conventionOk,
}: {
  mine: Intent[];
  offers: Offer[];
  standing: StandingOrder[];
  avis: AvisGarde[];
  veilles: Watch[];
  attentesSondees: number;
  mandats: number;
  mandatASigner: boolean;
  /** Le prochain flux d'argent, s'il y en a un. */
  prochaine?: { date: string; titre: string };
  operations: number;
  conventionOk: boolean;
}) {
  const t = await getT();
  const titreDe = (id: string) => offers.find((o) => o.id === id)?.title ?? id;
  const actives = standing.filter((x) => x.state === "active");
  /* Dans l'ordre où le dépôt les rend : la plus récente d'abord (created_at décroissant). */
  const recentes = mine;
  const faits: FaitsDuDossier = {
    intentions: mine.length,
    attentesSondees,
    mandats,
    versements: actives.length,
    avisDeGarde: avis.length,
    lignesSuivies: veilles.length,
    operations,
    /* Tout papier naît d'une intention ou d'un mouvement : sans l'un ni l'autre, « Mes documents » n'a rien à ouvrir. */
    documents: mine.length + operations,
  };
  const presentes = new Set<CleDeRubrique>(rubriquesPresentes(faits));
  const aSigner = mine.filter((i) => i.state === "confirmee").length > 0;

  const toutes: Record<CleDeRubrique, TuileDeDossier> = {
    intentions: {
      cle: "intentions",
      href: "/moi/ordres",
      nom: t("Mes intentions"),
      resume: recentes[0] ? t("Dernière : {t}", { t: t(titreDe(recentes[0].offerId)) }) : "",
      lignes: recentes.slice(0, 2).map((i) => ({ texte: t(titreDe(i.offerId)), note: t(INTENT_STATE_LABEL[i.state]) })),
      etiquette: aSigner ? t("à signer") : undefined,
    },
    sondage: {
      cle: "sondage",
      href: "/sondage",
      nom: t("Mes intentions au sondage"),
      resume: t("Ce que vous prendriez, avant qu'une séance ouvre"),
      lignes: [],
    },
    prelevements: {
      cle: "prelevements",
      href: "/moi/prelevements",
      nom: t("Mes prélèvements"),
      resume: t("Le mandat qui vous débite, et ce qu'il a payé"),
      lignes: [],
      etiquette: mandatASigner ? t("à signer") : undefined,
    },
    versements: {
      cle: "versements",
      href: "/moi/epargne",
      nom: t("Mes versements programmés"),
      resume: actives[0] ? t("Le {j} de chaque mois · {m} FCFA", { j: String(actives[0].dayOfMonth), m: fmt(actives[0].amount) }) : "",
      lignes: actives.slice(0, 2).map((x) => ({ texte: t(titreDe(x.offerId)), note: x.amount ? `${fmt(x.amount)} FCFA` : t("à chaque encaissement") })),
    },
    garde: {
      cle: "garde",
      href: "/moi/garde",
      nom: t("Mes droits de garde"),
      resume: avis[0] ? t("Dernier avis : {p}", { p: avis[0].period }) : "",
      lignes: avis.slice(0, 2).map((a) => ({ texte: a.period, note: fmtDate(a.issuedAt.slice(0, 10), false) })),
    },
    suivies: {
      cle: "suivies",
      href: "/moi/suivies",
      nom: t("Lignes suivies"),
      resume: veilles[0] ? t("Dernière suivie : {t}", { t: t(titreDe(veilles[0].offerId)) }) : "",
      lignes: veilles.slice(0, 2).map((w) => ({ texte: t(titreDe(w.offerId)) })),
    },
    operations: {
      cle: "operations",
      href: "/moi/performance#operations",
      nom: t("Mes opérations et l'échéancier"),
      resume: prochaine ? t("Prochain flux le {d}", { d: fmtDate(prochaine.date, false) }) : t("Ce que votre argent a fait, et ce qui vient"),
      lignes: prochaine ? [{ texte: t(prochaine.titre), note: fmtDate(prochaine.date, false) }] : [],
    },
    documents: {
      cle: "documents",
      href: "/moi/documents",
      nom: t("Mes documents"),
      resume: t("Relevés, avis d'opéré et bulletins"),
      lignes: [],
    },
  };
  const ORDRE: CleDeRubrique[] = ["intentions", "sondage", "prelevements", "versements", "garde", "suivies", "operations", "documents"];
  const items = ORDRE.filter((c) => presentes.has(c)).map((c) => toutes[c]);

  const GESTES: Record<string, Geste> = {
    intention: { href: "/trader", nom: t("Déclarer une intention sur une ligne") },
    versement: { href: "/moi/epargne", nom: t("Programmer un versement") },
    suivre: { href: "/titres", nom: t("Suivre une ligne") },
    prelevement: { href: "/moi/prelevements", nom: t("Ajouter un prélèvement") },
  };
  const gestes = gestesProposables(faits, conventionOk).map((g) => GESTES[g]);

  /* RIEN À MONTRER, RIEN À PROPOSER : la section ne paraît pas (jamais un titre suivi de rien). */
  if (!items.length && !gestes.length) return null;

  return <TuilesDossier titre={t("Mon dossier")} items={items} aussiTitre={t("Vous pouvez aussi")} gestes={gestes} ouvrir={t("Ouvrir la page")} replier={t("Replier")} />;
}
