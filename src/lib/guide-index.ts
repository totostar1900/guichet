import "server-only";
import { AIDE } from "@/data/docs/aide";
import { SECTIONS } from "@/data/parcours";
import type { Lang } from "@/i18n/core";
import { loadGlossary, loadLessons } from "@/lib/reference";
import type { SearchEntry } from "@/app/info/InfoSearch";
import type { AideRow, GuideIndex } from "./guide-index-shared";
export type { AideRow, GuideIndex, LessonSummary } from "./guide-index-shared";
export { TOP_QUESTIONS } from "./guide-index-shared";

/**
 * Everything the Guide's search and the « ⋮ » menu can find: the glossary,
 * every lesson, the tools and pages, and each question of the help. Built on
 * the server in the viewer's language; the info page renders it, the menu
 * fetches it once from /api/guide-index.
 */
export const slugOf = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** The questions of the help page, chapter by chapter, with a stable slug each (the anchor on /info/aide). */
export function aideRows(lang: Lang): AideRow[] {
  const rows: AideRow[] = [];
  for (const c of AIDE.chapters) {
    for (const b of c.blocks) {
      if (b.type !== "table" || b.head.length !== 2) continue;
      for (const r of b.rows) rows.push({ chapter: c.id, chapterTitle: c.title[lang], slug: slugOf(r[0].fr), q: r[0][lang], a: r[1][lang] });
    }
  }
  return rows;
}


export async function buildGuideIndex(t: (s: string) => string, lang: Lang): Promise<GuideIndex> {
  const G = await loadGlossary();
  const all = await loadLessons();
  const first = all.filter((l) => !l.section).sort((a, b) => a.order - b.order);
  const parcours = all.filter((l) => l.section).sort((a, b) => a.order - b.order);
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  const aide = aideRows(lang);
  const entries: SearchEntry[] = [
    ...keys.map((k) => ({ kind: "terme" as const, title: G[k].long ? `${t(G[k].short)} : ${t(G[k].long)}` : t(G[k].short), text: t(G[k].text), href: `/info#terme-${k}`, extra: k.replace(/_/g, " ") })),
    { kind: "lecon" as const, title: t("Comprendre le marché CEMAC"), text: t("Six sections : le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais, taux et monnaie."), href: "/info/parcours", extra: "parcours cours marché BEAC COSUMAF BVMAC acteurs instruments risques" },
    ...parcours.map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    ...first.map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    ...aide.map((r) => ({ kind: "page" as const, title: r.q, text: r.a, href: `/info/aide#q-${r.slug}`, extra: `aide ${r.chapterTitle}` })),
    { kind: "outil" as const, title: t("Simulateur d'obligation"), text: t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans le Guichet."), href: "/info#simulateur", extra: "simulation rendement prix coupon" },
    { kind: "outil" as const, title: t("Comparer deux lignes"), text: t("Deux offres côte à côte : rendement, durée, ticket, calendrier."), href: "/comparer", extra: "comparaison comparateur" },
    { kind: "page" as const, title: t("Guichet"), text: t("Titres neufs : vous souscrivez auprès de l'émetteur (Trésor, entreprise) pendant une fenêtre, à un prix fixé par adjudication ou par le desk.") + " " + t("Titres déjà cotés à la BVMAC : vous achetez ou vendez à un autre investisseur, au cours du jour, en séance."), href: "/", extra: "offres lignes marché primaire secondaire OTA BTA APE IPO" },
    { kind: "page" as const, title: t("Fonds"), text: t("Parts de fonds communs de placement : vous souscrivez ou rachetez à la prochaine valeur liquidative."), href: "/fonds", extra: "OPCVM FCP VL gestion collective" },
    { kind: "page" as const, title: t("Sociétés cotées et émetteurs"), text: t("Comptes, dividendes, actionnariat, documents publiés à la BVMAC."), href: "/societes", extra: "actions entreprises BVMAC PER dividende" },
    { kind: "page" as const, title: t("Ouvrir un compte"), text: t("Dix minutes sur votre téléphone : votre identité, quelques pièces en photo, l'origine des fonds et votre profil, puis l'acceptation de la convention par code. Un conseiller valide sous 24 h pour un résident, 48 h avec un appel vidéo depuis l'étranger."), href: "/ouvrir-un-compte", extra: "KYC compte-titres dossier pièces convention" },
    { kind: "page" as const, title: t("Mon espace"), text: t("Intentions en cours") + " · " + t("Mes positions") + " · " + t("Mes documents") + " · " + t("Lignes suivies") + " · " + t("Alertes sur cet appareil"), href: "/moi", extra: "positions relevé documents intentions alertes suivi" },
    { kind: "page" as const, title: t("Aide : vos questions, nos réponses"), text: t("Se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir ses documents, nous joindre."), href: "/info/aide", extra: "aide FAQ questions support code connexion réclamation données" },
    { kind: "page" as const, title: t("Mentions et responsabilités"), text: t("Ce que vous acceptez en utilisant le Guichet"), href: "/info/mentions", extra: "mentions légales responsabilités risques données réclamation" },
    { kind: "page" as const, title: t("Se connecter"), text: t("Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir."), href: "/connexion", extra: "connexion code mot de passe identifiant" },
  ];
  return {
    entries,
    aide,
    lessons: all.map((l) => ({ key: l.key, title: t(l.title), section: l.section, order: l.order, minutes: l.minutes })),
    sections: SECTIONS.map((s) => ({ key: s.key, order: s.order, title: t(s.title), color: s.color })),
  };
}
