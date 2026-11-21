import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENTS } from "@/lib/config";
import { FAMILLE_BOOT, accentDe, familleDe } from "@/lib/famille";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * L'ACCENT D'UNE FAMILLE, EN UN MOT (21 novembre 2026, planche « Marché en bleu », 1A · 2A · 3A · 4A).
 *
 * Le Marché passe de l'or au bleu par UN mot de configuration (`ACCENTS.marche`). « or » le rend tel qu'il était, sans toucher une page : c'est la promesse « défaire en un prompt », et ce fichier la garde. Les changements de structure (titres à plat, porte des séances) se défont par le dépôt, pas par ce mot.
 */
describe("les familles", () => {
  it("suivent les sièges de la navigation, dans l'ordre d'une lecture", () => {
    const attendu: Record<string, string | null> = {
      "/": "accueil", "/moi": "accueil", "/moi/argent": "accueil", "/moi/ordres": "accueil", "/moi/documents": "accueil",
      "/marche": "marche", "/indice": "marche", "/indice/notes": "marche", "/societes": "marche", "/societes/bhc": "marche", "/emetteurs": "marche", "/actualites": "marche", "/comparer": "marche",
      "/titres": "instruments", "/fonds": "instruments", "/offres/ota-1": "instruments", "/offres/fund-x": "instruments", "/calendrier": "instruments", "/marche/adjudications": "instruments",
      "/activite": "trader",
      "/aide": "aide", "/info/conditions-generales": "aide", "/moi/contact": "aide", "/moi/reclamation": "aide",
      "/parametres": null, "/moi/profil": null, "/moi/securite": null, "/connexion": null, "/recherche": null,
    };
    for (const [p, f] of Object.entries(attendu)) expect(familleDe(p), p).toBe(f);
  });
  it("le script du <head> lit la même table, dans le même ordre, et pose aussi l'accent", () => {
    const run = (path: string) => {
      const attrs: Record<string, string> = {};
      const root = { setAttribute: (k: string, v: string) => (attrs[k] = v), removeAttribute: (k: string) => delete attrs[k] };
      new Function("location", "document", FAMILLE_BOOT)({ pathname: path }, { documentElement: root });
      return [attrs["data-famille"] ?? null, attrs["data-accent"] ?? null];
    };
    for (const p of ["/", "/moi/argent", "/marche", "/indice/note/2026-t3", "/societes/bhc", "/titres", "/offres/fund-x", "/marche/adjudications", "/activite", "/aide", "/moi/contact", "/moi/reclamation", "/parametres", "/moi/securite"]) {
      const f = familleDe(p);
      expect(run(p), p).toEqual([f, f ? ACCENTS[f] : null]);
    }
  });
  it("chaque famille a son mot d'accent, « or » ou « bleu »", () => {
    expect(Object.keys(ACCENTS).sort()).toEqual(["accueil", "aide", "instruments", "marche", "trader"]);
    for (const a of Object.values(ACCENTS)) expect(["or", "bleu"]).toContain(a);
    expect(ACCENTS.marche).toBe("bleu");
    for (const f of ["instruments", "trader", "aide", "accueil"] as const) expect(ACCENTS[f], f).toBe("or");
    expect(accentDe(null)).toBe("or");
  });
});

describe("l'accent bleu d'une famille", () => {
  const css = sansNotes(lire("src/app/globals.css"));
  it("est lu par la feuille de style depuis « data-accent », que le script et la navigation posent", () => {
    expect(sansNotes(lire("src/app/layout.tsx"))).toMatch(/__html: FAMILLE_BOOT/);
    expect(sansNotes(lire("src/app/layout.tsx")), "la mise en page ne pose plus un mot par famille").not.toMatch(/data-accent-marche/);
    expect(css).toMatch(/html\[data-accent="bleu"\] :is\(main, \[aria-current="page"\], \[data-accent-suit\]\) \{\s*--gold: var\(--info\);\s*--gold-ink: var\(--info\);\s*--gold-soft: var\(--info-soft\);/);
    const ms = sansNotes(lire("src/components/mobile/MobileShell.tsx"));
    expect(ms).toMatch(/dataset\.accent = accentDe\(f\)/);
  });
  it("ne se pose QUE quand une famille dit « bleu » : « or » ne pose rien", () => {
    const blocs = css.match(/[^{}]*data-accent="bleu"[^{}]*\{[^}]*\}/g) ?? [];
    expect(blocs.length).toBeGreaterThanOrEqual(3);
    expect(css, "un bloc d'accent dépend encore d'une famille écrite en dur").not.toMatch(/data-famille="marche"/);
  });
  it("laisse l'or à la barre du haut : seuls le contenu, l'entrée de menu active et le bouton flottant du Marché (qui porte « data-accent-suit ») sont touchés", () => {
    for (const b of css.match(/[^{}]*data-accent="bleu"[^{}]*\{/g) ?? []) {
      expect(b, "le bleu a quitté « main », l'entrée active et le bouton flottant").toMatch(/:is\(main, \[aria-current="page"\], \[data-accent-suit\]\)/);
      expect(b, "le bleu touche la barre du haut").not.toMatch(/\bheader\b|BarreDuHaut/);
    }
  });
  it("la pastille de menu du Marché (le bouton flottant) suit l'accent de sa famille", () => {
    expect(sansNotes(lire("src/components/mobile/MarketFab.tsx"))).toMatch(/data-accent-suit=""/);
  });
  it("le bouton principal et les segments ne passent au bleu qu'en sombre (en clair ils sont marine)", () => {
    const sombre = css.match(/\[data-theme="dark"\] :is\(main, \[aria-current="page"\], \[data-accent-suit\]\) \{[^}]*\}/)?.[0] ?? "";
    expect(sombre).toMatch(/--fill: var\(--info\);/);
    expect(sombre).toMatch(/--select: var\(--info\);/);
  });
});

describe("le Marché sans « Ce qui s'est échangé »", () => {
  const page = lire("src/app/marche/page.tsx");
  it("n'a plus la carte, ni la phrase « Les N autres », ni son mot dans l'en-tête", () => {
    expect(page).not.toMatch(/id="echanges"/);
    expect(page).not.toMatch(/Les \{n\} autres, et toutes/);
    expect(page).not.toMatch(/ce qui s'est échangé/);
  });
  it("n'a plus la porte « Les séances » sur la carte de l'indice ; l'indice a son titre à plat et son lien « L'indice » (21 novembre 2026)", () => {
    expect(page, "« Les séances » est revenu sur la carte de l'indice").not.toMatch(/seances=/);
    const carte = lire("src/components/IndexPulse.tsx");
    expect(carte, "la propriété « seances » existe encore").not.toMatch(/seances\??:/);
    expect(carte, "le titre à plat « BVMAC Index » n'est plus donné à la page qui demande un en-tête sans titre").toMatch(/titre: "BVMAC Index", href: entete\.lien\.href, mot: entete\.lien\.mot/);
  });
  it("ses sections ont le titre de l'Accueil, à plat, au-dessus de la carte", () => {
    expect((page.match(/<TitreDeBloc /g) ?? []).length).toBe(6);
    expect(page).not.toMatch(/className="panel-h"/);
  });
});
