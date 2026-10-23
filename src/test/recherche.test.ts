import { beforeAll, describe, expect, it } from "vitest";
import { buildGuideIndex } from "@/lib/guide-index";
import { getRegistry } from "@/lib/registry";
import { loadRegistry } from "@/lib/reference";
import { AGIR_PAGES, AIDE_PAGES, COMPTE_PAGES, INSTRUMENTS_PAGES, PORTEFEUILLE_PAGES } from "@/lib/nav-groups";
import { CATALOGUE } from "@/lib/domain/services";

/**
 * LA RECHERCHE CONNAÎT L'APPLICATION, ET NE LA MONTRE QU'À QUI EST ENTRÉ.
 *
 * Elle ne connaissait que le Guide : le glossaire, les éclairages, l'aide,
 * deux outils et huit pages écrites à la main. « prélèvement », « rachats du
 * Trésor », « provision », « sécurité » ne ramenaient rien, ou une définition
 * au lieu de l'endroit. Elle lit maintenant les tables que l'application tient
 * déjà — les pages des sièges, les cinq rubriques du compte, le catalogue des
 * services, les sections du marché, les types du référentiel.
 *
 * CE QUI PEUT SE PERDRE ICI, ET QUE RIEN NE SIGNALERAIT :
 *
 * 1. UNE TABLE QUI SORT DE L'INDEX. Ajouter une page à un siège est gratuit ;
 *    la retirer de la recherche l'est aussi, et personne ne s'en aperçoit —
 *    une recherche qui ne trouve pas ne lève aucune erreur. L'épreuve compte
 *    les tables, pas les entrées.
 *
 * 2. L'INDEX DU GUIDE PUBLIC QUI S'OUVRE SUR L'APPLICATION. `/info` se lit
 *    sans compte. Une entrée « Sécurité » ou « Prélèvement automatique » y
 *    mène à `/connexion`, c'est-à-dire à un mur : pire qu'une absence, puisque
 *    ça promet. C'est arrivé le 24 octobre 2026, le jour même où l'index a
 *    appris à lire les tables, et c'est pour cela que `app` existe.
 */
describe("ce que la recherche connaît", () => {
  const t = (s: string) => s;
  beforeAll(async () => {
    await loadRegistry();
  });

  it("donne au client une entrée par page, par service et par instrument", async () => {
    const { entries } = await buildGuideIndex(t, "fr", { app: true });
    const portes = new Set(entries.map((e) => e.href));
    const manquants = [...PORTEFEUILLE_PAGES, ...INSTRUMENTS_PAGES, ...AGIR_PAGES, ...AIDE_PAGES, ...COMPTE_PAGES]
      .filter((p) => !portes.has(p.href))
      .map((p) => `${p.key} (${p.href})`);
    /* Le prélèvement et la provision sont des pages ET des services : le
       service gagne, et garde la même adresse. L'absence se mesure donc sur
       l'adresse, pas sur le genre. */
    expect(manquants, "ces pages sont introuvables à la recherche").toEqual([]);

    const services = entries.filter((e) => e.kind === "service");
    expect(services.length, "le catalogue des services a quitté l'index").toBe(CATALOGUE.length);

    const types = getRegistry().types.filter((x) => x.enabled);
    const instruments = entries.filter((e) => e.kind === "instrument");
    expect(instruments.length, "les types du référentiel ont quitté l'index").toBe(types.length);
    /* Chacun mène à SA famille : sans le paramètre, huit instruments
       partageraient trois adresses, et le dédoublonnage en effacerait sept. */
    expect(new Set(instruments.map((e) => e.href)).size, "deux instruments mènent à la même liste non filtrée").toBe(types.length);

    /* Les sections d'une liste : c'est ce qu'on tape quand on cherche « rachats
       du Trésor » sans savoir que ça vit sous « Adjudications ». */
    expect(entries.some((e) => e.href.includes("#sec-")), "les sections du marché ont quitté l'index").toBe(true);
  });

  /**
   * UNE EXCEPTION, ET C'EST LE CONTRAIRE D'UN TROU : « Ouvrir un compte » est
   * la rubrique « Mes pièces » du compte ET une entrée que le guide public
   * écrit à la main depuis toujours. Elle demande aussi de se connecter, mais
   * elle mène à `/connexion?next=/ouvrir-un-compte`, c'est-à-dire au parcours
   * d'entrée lui-même : c'est l'entonnoir, pas le mur. Un visiteur qui tape
   * « ouvrir un compte » doit la trouver, et c'est tout l'objet du guide.
   */
  it("ne montre au visiteur aucune porte fermée", async () => {
    const { entries } = await buildGuideIndex(t, "fr");
    const fermees = [...AGIR_PAGES, ...COMPTE_PAGES].map((p) => p.href).filter((h) => h !== "/ouvrir-un-compte");
    const fuites = entries
      .filter((e) => fermees.includes(e.href) || e.kind === "service" || e.kind === "instrument" || /#sec-|\?r=|\?instrument=/.test(e.href))
      .map((e) => `${e.kind} · ${e.title} → ${e.href}`);
    expect(fuites, `le guide public mène un visiteur sans compte vers :\n  ${fuites.join("\n  ")}`).toEqual([]);
  });

  /* Le défaut sûr : une page qui oublie l'option montre moins, jamais plus. */
  it("tient le guide public pour le défaut", async () => {
    const sans = await buildGuideIndex(t, "fr");
    const avec = await buildGuideIndex(t, "fr", { app: true });
    expect(sans.entries.length, "le défaut s'est mis à tout montrer").toBeLessThan(avec.entries.length);
  });

  /**
   * UN GENRE SANS ÉTIQUETTE EST UNE PASTILLE VIDE — la forme muette, celle qui
   * ne casse rien. « service » et « instrument » sont nés le 24 octobre 2026 ;
   * le troisième naîtra un autre jour.
   */
  it("nomme chaque genre qu'elle produit", async () => {
    const { entries } = await buildGuideIndex(t, "fr", { app: true });
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "src/app/info/InfoSearch.tsx"), "utf8");
    const map = src.slice(src.indexOf("const KIND"), src.indexOf("\n", src.indexOf("const KIND")));
    const sans = [...new Set(entries.map((e) => e.kind))].filter((k) => !new RegExp(`\\b${k}:`).test(map));
    expect(sans, "ces genres sortiraient avec une pastille vide").toEqual([]);
  });
});
