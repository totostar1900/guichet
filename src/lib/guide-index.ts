import "server-only";
import { AIDE } from "@/data/docs/aide";
import { SECTIONS } from "@/data/parcours";
import { AGIR_PAGES, AIDE_PAGES, COMPTE_PAGES, INSTRUMENTS_PAGES, PORTEFEUILLE_PAGES } from "@/lib/nav-groups";
import { MARKET_PAGES } from "@/lib/market/pages";
import { LIEU_LABEL, SECTIONS as SECTIONS_DU_MARCHE, SECTION_LABEL, SECTION_NOTE, type Lieu } from "@/lib/domain/sections";
import { CATALOGUE, RAISON, RAYONS } from "@/lib/domain/services";
import { getRegistry } from "@/lib/registry";
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


/**
 * DEUX LECTEURS, DEUX INDEX.
 *
 * Le guide de `/info` est PUBLIC : un visiteur y arrive sans compte, et y
 * cherche des mots. Tout ce que les tables de l'application portent — les
 * pages des sièges, les cinq rubriques du compte, les services, les sections
 * du marché — vit derrière la connexion, et une entrée qui mène à un mur
 * n'est pas une réponse. Elle est pire qu'une absence : elle promet.
 *
 * `app` est donc faux par défaut, et c'est le défaut sûr : une page qui
 * oublie de le passer montre moins, jamais plus.
 */
export async function buildGuideIndex(t: (s: string) => string, lang: Lang, { app = false }: { app?: boolean } = {}): Promise<GuideIndex> {
  const G = await loadGlossary();
  const all = await loadLessons();
  const first = all.filter((l) => !l.section).sort((a, b) => a.order - b.order);
  const parcours = all.filter((l) => l.section).sort((a, b) => a.order - b.order);
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  const aide = aideRows(lang);
  /**
   * CE QUE LA RECHERCHE CONNAÎT DE L'APPLICATION, et d'où elle le tient.
   *
   * Elle ne connaissait que le Guide : le glossaire, les éclairages, l'aide,
   * deux outils et huit pages écrites à la main. Un lecteur qui tape
   * « prélèvement », « rachats du Trésor » ou « provision » ne cherche pas une
   * définition, il cherche l'endroit.
   *
   * TOUT CE QUI SUIT EST LU DANS LES TABLES QUE L'APPLICATION TIENT DÉJÀ —
   * les pages des sièges, les rayons et le catalogue des services, les
   * sections du marché et leur note, les types de produits du référentiel.
   * Aucune n'est recopiée : une liste recopiée pour la recherche serait la
   * première à vieillir, et personne ne la relirait, puisqu'elle ne s'affiche
   * nulle part.
   */
  const pages = [...PORTEFEUILLE_PAGES, ...INSTRUMENTS_PAGES, ...AGIR_PAGES, ...AIDE_PAGES, ...COMPTE_PAGES, ...MARKET_PAGES];
  const lieuHref: Record<Lieu, string> = { cote: "/titres", adjudications: "/calendrier", fonds: "/fonds" };
  const types = getRegistry().types.filter((x) => x.enabled);

  /**
   * CE QUE SEUL UN CLIENT CONNECTÉ TROUVE.
   *
   * Les sept pages écrites à la main plus bas (Guichet, Fonds, Sociétés,
   * Ouvrir un compte, l'aide, les mentions, la connexion) restent au guide
   * public : elles y étaient avant, et elles disent ce que la maison fait.
   * Ce bloc-ci est de la NAVIGATION — les pages d'un siège, les cinq
   * rubriques du compte, les rayons et les services, les sections d'une liste,
   * les familles d'un filtre — et une navigation n'a de sens que pour qui est
   * entré.
   */
  const duClient: SearchEntry[] = !app
    ? []
    : [
        /* Les pages, par leur nom et la phrase qui dit ce qu'on y trouve. */
        /* `mots` porte ce qu'on tape et que la page ne dit pas d'elle-même —
           « langue » pour les paramétrages, par exemple. Il est traduit comme
           le reste : un lecteur anglais tape « language », pas « langue ». */
        ...pages.map((p) => ({ kind: "page" as const, title: t(p.label), text: t(p.hint), href: p.href, extra: [p.short, p.tuile, p.mots].filter(Boolean).map((x) => t(x as string)).join(" ") })),
        /* Les trois rayons de Trade : ce qu'on vient y faire. */
        ...RAYONS.map((r) => ({ kind: "page" as const, title: `${t("Trade")} · ${t(r.nom)}`, text: t(r.quoi), href: `/trader?r=${r.cle}`, extra: "trade services" })),
        /* Les dix services, avec leur raison d'être : c'est elle qu'on cherche,
           pas leur nom, qu'on ne connaît pas encore. */
        ...CATALOGUE.map((x) => ({ kind: "service" as const, title: t(x.nom), text: t(RAISON[x.cle] ?? ""), href: x.href, extra: `${t("Trade")} ${t(RAYONS.find((r) => r.cle === x.rayon)?.nom ?? "")} ${x.cle}` })),
        /* Les sections du marché et leur note. Elles ne sont plus rendues sous
           leur titre depuis le 4 octobre 2026, et leur table dit que « le Guide
           est l'endroit où elle doit reparaître » : c'est ici. */
        ...(Object.keys(SECTIONS_DU_MARCHE) as Lieu[]).flatMap((lieu) =>
          /* « Fonds · Fonds » : une section porte parfois le nom de sa liste,
             et le lieu répété se lit comme une panne. Le titre seul suffit —
             c'est déjà le nom de la page. */
          SECTIONS_DU_MARCHE[lieu].map((sec) => {
            const lieuNom = t(LIEU_LABEL[lieu]);
            const secNom = t(SECTION_LABEL[sec]);
            return { kind: "page" as const, title: lieuNom === secNom ? lieuNom : `${lieuNom} · ${secNom}`, text: t(SECTION_NOTE[sec]), href: `${lieuHref[lieu]}#sec-${sec}`, extra: secNom };
          }),
        ),
        /* Les instruments, par ce qu'ils engagent : les mises en garde d'un type
           sont la seule page où « à garder en tête » est écrit une fois pour
           toutes, et elles sont du référentiel, donc du desk. */
        /* Chacun mène à SA famille, filtrée : les deux listes lisent le même
           paramètre « instrument », qui porte la clef du type. Sans lui, les huit
           instruments menaient à trois adresses, et sept d'entre eux auraient
           disparu au dédoublonnage. */
        ...types.map((x) => ({ kind: "instrument" as const, title: t(x.label), text: x.cautions.map(([quoi, dit]) => `${t(quoi)} ${t(dit)}`).join(" "), href: x.segment === "fonds" ? "/fonds" : `${x.segment === "primaire" ? "/calendrier" : "/titres"}?instrument=${x.key}`, extra: `${x.short} ${x.key}` })),
      ];

  const entries: SearchEntry[] = [
    ...duClient,
    ...keys.map((k) => ({ kind: "terme" as const, title: G[k].long ? `${t(G[k].short)} : ${t(G[k].long)}` : t(G[k].short), text: t(G[k].text), href: `/info/glossaire#terme-${k}`, extra: k.replace(/_/g, " ") })),
    { kind: "lecon" as const, title: t("Comprendre le marché CEMAC"), text: t("Six sections : le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais, taux et monnaie."), href: "/info/parcours", extra: "parcours cours marché BEAC COSUMAF BVMAC acteurs instruments risques" },
    ...parcours.map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    ...first.map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    ...aide.map((r) => ({ kind: "page" as const, title: r.q, text: r.a, href: `/info/aide/${r.chapter}#q-${r.slug}`, extra: `aide ${r.chapterTitle}` })),
    { kind: "outil" as const, title: t("Simulateur d'obligation"), text: t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans Guichet."), href: "/info/simulateur", extra: "simulation rendement prix coupon" },
    { kind: "outil" as const, title: t("Comparer deux lignes"), text: t("Deux offres côte à côte : rendement, durée, ticket, calendrier."), href: "/comparer", extra: "comparaison comparateur" },
    { kind: "page" as const, title: t("Guichet"), text: t("Titres neufs : vous souscrivez auprès de l'émetteur (Trésor, entreprise) pendant une fenêtre, à un prix fixé par adjudication ou par le desk.") + " " + t("Titres déjà cotés à la BVMAC : vous achetez ou vendez à un autre investisseur, au cours du jour, en séance."), href: "/", extra: "offres lignes marché primaire secondaire OTA BTA APE IPO" },
    { kind: "page" as const, title: t("Fonds"), text: t("Parts de fonds communs de placement : vous souscrivez ou rachetez à la prochaine valeur liquidative."), href: "/fonds", extra: "OPCVM FCP VL gestion collective" },
    { kind: "page" as const, title: t("Sociétés cotées et émetteurs"), text: t("Comptes, dividendes, actionnariat, documents publiés à la BVMAC."), href: "/societes", extra: "actions entreprises BVMAC PER dividende" },
    { kind: "page" as const, title: t("Ouvrir un compte"), text: t("Dix minutes sur votre téléphone : votre identité, quelques pièces en photo, l'origine des fonds et votre profil, puis l'acceptation de la convention par code. Un conseiller valide sous 24 h pour un résident, 48 h avec un appel vidéo depuis l'étranger."), href: "/ouvrir-un-compte", extra: "KYC compte-titres dossier pièces convention" },
    { kind: "page" as const, title: t("Portefeuille"), text: t("Intentions en cours") + " · " + t("Mes positions") + " · " + t("Mes documents") + " · " + t("Lignes suivies") + " · " + t("Alertes sur cet appareil"), href: "/", extra: "positions relevé documents intentions alertes suivi" },
    { kind: "page" as const, title: t("Aide : vos questions, nos réponses"), text: t("Se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir ses documents, nous joindre."), href: "/info/aide", extra: "aide FAQ questions support code connexion réclamation données" },
    { kind: "page" as const, title: t("Mentions légales"), text: t("Ce que vous acceptez en utilisant Guichet"), href: "/info/mentions", extra: "mentions légales responsabilités risques données réclamation" },
    { kind: "page" as const, title: t("Se connecter"), text: t("Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir."), href: "/connexion", extra: "connexion code mot de passe identifiant" },
  ];

  /**
   * UN SOMMAIRE ET UN SERVICE QUI MÈNENT AU MÊME ENDROIT N'EN FONT QU'UN.
   * Le prélèvement est une page du siège « Trade » ET un service du
   * catalogue ; la provision une page du portefeuille ET un service. Deux
   * résultats pour la même adresse font douter le lecteur du second, et c'est
   * le service qui gagne : sa raison d'être dit ce qu'on y FAIT, là où la
   * phrase d'un sommaire dit ce qu'on y trouve.
   *
   * ON NE DÉDOUBLONNE PAS PLUS LOIN, et c'est une correction : la règle était
   * « une adresse, une entrée », et elle effaçait sept instruments sur huit —
   * ils partagent la porte d'une liste avec le service qui y mène, mais ils
   * disent autre chose, à savoir ce que la ligne engage. Deux entrées de
   * NATURE différente sur la même page ne se concurrencent pas : l'étiquette
   * les distingue avant le clic.
   */
  const portesDesServices = new Set(entries.filter((e) => e.kind === "service").map((e) => e.href));
  const retenues = entries.filter((e) => !(e.kind === "page" && portesDesServices.has(e.href)));

  return {
    entries: retenues,
    aide,
    lessons: all.map((l) => ({ key: l.key, title: t(l.title), section: l.section, order: l.order, minutes: l.minutes })),
    sections: SECTIONS.map((s) => ({ key: s.key, order: s.order, title: t(s.title), color: s.color })),
  };
}
