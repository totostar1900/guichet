import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { estPublic } from "@/lib/porte";
import { translator } from "@/i18n/core";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA PORTE PUBLIQUE DES TEXTES (18 novembre 2026, le client : « le meilleur des deux mondes, sans afficher de grille ou de politique tarifaire au public »).
 */
describe("la page publique « Textes et conditions »", () => {
  const brut = lire("src/app/info/textes/page.tsx");
  /* Le code sans ses commentaires : ils citent les mots écartés pour dire pourquoi. */
  const code = brut.replace(/\/\*[\s\S]*?\*\//g, "");

  it("est publique, dans le plan du site, et « /legal » y mène", () => {
    expect(estPublic("/info/textes")).toBe(true);
    expect(lire("src/app/sitemap.ts")).toContain('"/info/textes"');
    expect(lire("next.config.ts")).toMatch(/source: "\/legal", destination: "\/info\/textes", permanent: true/);
  });

  it("liste les textes qui existent, chacun avec sa version, et renvoie aux sections des mentions plutôt que d'en inventer", () => {
    for (const v of ["LEGAL_VERSION", "RISQUES_VERSION", "CONVENTION_VERSION"]) expect(code, `la version ${v} n'est plus lue`).toContain(v);
    for (const h of ["/info/mentions", "/info/conditions", "/info/risques", "/info/donnees", "/info/reclamations"]) expect(code, `la porte ${h} a disparu`).toContain(`"${h}"`);
    expect(code).toMatch(/version du \{d\}/);
  });

  it("n'affiche AUCUNE grille ni politique tarifaire : ni l'annexe tarifaire, ni les règles des services, ni leur adresse", () => {
    expect(code, "une porte vers l'annexe tarifaire est apparue en public").not.toMatch(/\/moi\/tarifs/);
    expect(code, "une porte vers les règles des services est apparue en public").not.toMatch(/\/moi\/services/);
    expect(code, "un titre d'annexe tarifaire est apparu dans la liste").not.toMatch(/titre: t\("Annexe tarifaire"\)/);
    expect(code, "un chiffre de frais est écrit dans la page").not.toMatch(/FCFA|\d+\s?%/);
    /* La composition du contrat nomme les conditions tarifaires sans en dire le contenu. */
    expect(code).toMatch(/des conditions tarifaires que remet votre conseiller/);
  });

  it("la convention est publiée en lecture seule, et le hub y mène un visiteur (un client connecté va à SA convention, qui se signe)", () => {
    expect(code).toMatch(/href: client \? "\/ouvrir-un-compte\/convention" : "\/info\/convention"/);
    expect(estPublic("/info/convention")).toBe(true);
    expect(lire("src/app/sitemap.ts")).toContain('"/info/convention"');
  });

  it("ne signe rien en public, ne répète pas l'adresse, et dit le nom de la maison et son agrément", () => {
    expect(code, "une signature est apparue sur une page publique").not.toMatch(/Signer|conventionAt: new|setConsent/);
    expect(code, "l'adresse ou le téléphone sont revenus").not.toMatch(/COMPANY\.(address|phone|email)/);
    expect(code).toMatch(/COMPANY\.legalName/);
    expect(code).toMatch(/COMPANY\.licence/);
  });

  it("un client connecté voit où il en est, et la porte vers « Vos textes et conditions » (qui, elle, a les tarifs)", () => {
    expect(code).toMatch(/s\.role === "client"/);
    expect(code).toMatch(/acceptées le/);
    expect(code).toMatch(/signée le/);
    expect(code).toContain('href="/moi/textes"');
  });

  it("l'accueil y mène, et l'anglais existe", () => {
    expect(lire("src/app/Accueil.tsx")).toContain('href="/info/textes"');
    const en = translator("en");
    for (const fr of ["Vos données personnelles", "En cas de désaccord", "Vos textes et conditions"]) expect(en(fr), `« ${fr} » n'est pas traduit`).not.toBe(fr);
  });
});

describe("la convention en lecture seule (19 novembre 2026, le client : « publier la convention, article 6 compris »)", () => {
  const brut = lire("src/app/info/convention/page.tsx");
  const code = brut.replace(/\/\*[\s\S]*?\*\//g, "");

  it("publie TOUS les articles du registre, sans en filtrer un, le sixième compris", () => {
    expect(code).toMatch(/\(PASSAGES\.convention \?\? \[\]\)\.map\(/);
    expect(code, "un article est écarté de l'exemplaire public").not.toMatch(/\.filter\(/);
    expect(code, "l'article 6 est écarté nommément").not.toMatch(/art_tarifs/);
    expect(lire("src/lib/documents/passages-catalog.ts")).toMatch(/P\("art_tarifs", "Article 6 · Tarifs"/);
  });

  it("lit le même registre et les mêmes variables que la page de signature, sauf la catégorie qui dépend du dossier", () => {
    const signature = lire("src/app/ouvrir-un-compte/convention/page.tsx");
    expect(code).toMatch(/resolvePassages\("convention", lang\)/);
    expect(signature).toMatch(/resolvePassages\("convention", lang\)/);
    for (const k of ["societe: COMPANY.legalName", "agrement: COMPANY.licence", "email: COMPANY.email"]) {
      expect(code, `la variable ${k} diffère de l'exemplaire à signer`).toContain(k);
      expect(signature).toContain(k);
    }
    expect(code).toMatch(/categorie: t\("professionnel ou non professionnel, selon votre dossier"\)/);
  });

  it("ne se signe pas en public, ne lit aucun dossier, et ne contient aucune grille", () => {
    expect(code, "une signature est apparue sur la page publique").not.toMatch(/Signer|setConsent|conventionAt|getClientFile/);
    expect(code, "un tarif ou un taux est écrit dans la page").not.toMatch(/FCFA|\d+\s?%/);
    expect(code, "la page publique porte une porte vers l'annexe tarifaire").not.toMatch(/\/moi\/tarifs/);
    expect(code).toMatch(/Exemplaire de lecture/);
  });

  it("l'article 6 ne contient aucune grille : il renvoie à l'annexe remise par le conseiller", () => {
    const catalogue = lire("src/lib/documents/passages-catalog.ts");
    const ligne = catalogue.split("\n").find((l) => l.includes('P("art_tarifs"')) ?? "";
    expect(ligne, "l'article 6 est introuvable").not.toBe("");
    expect(ligne).toMatch(/annexe tarifaire remise par le conseiller/);
    expect(ligne, "un montant ou un taux est écrit dans l'article 6").not.toMatch(/\d+\s?(%|FCFA|XAF)/);
  });
});

/**
 * UN TEXTE PAR SUJET (19 novembre 2026, planche « Compte, connexion et textes », 1A) : « les rubriques de textes et conditions renvoient au même document ».
 */
describe("la page « Textes et conditions » : une rubrique, un document", () => {
  const src = lire("src/app/info/textes/page.tsx");
  it("aucune rubrique ne partage l'adresse d'une autre, et aucune ne pointe une ancre d'un autre document", () => {
    const hrefs = [...src.matchAll(/href: (?:client \? "[^"]+" : )?"(\/[^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length, "le hub n'a plus sept rubriques").toBe(7);
    expect(new Set(hrefs).size, "deux rubriques ouvrent le même document").toBe(hrefs.length);
    for (const h of hrefs) expect(h, `${h} pointe une ancre`).not.toContain("#");
  });
  it("les mentions légales ne portent plus la présentation des services : elle est dans « Guichet en bref »", () => {
    expect(lire("src/app/info/mentions/page.tsx")).toMatch(/choisir\("qui"\)/);
    expect(lire("src/app/info/en-bref/page.tsx")).toMatch(/choisir\("services", "instruments", "chiffres"\)/);
    expect(lire("src/app/info/eclairages/page.tsx"), "« Guichet en bref » n'est plus atteignable depuis les éclairages").toContain('href="/info/en-bref"');
  });
  it("le texte que le client accepte (legal.ts) est toujours lu en entier, section par section", () => {
    const pages = ["mentions", "conditions", "donnees", "reclamations", "risques"].map((d) => lire(`src/app/info/${d}/page.tsx`)).join("\n");
    for (const id of ["qui", "conseil", "risques", "canaux", "reclamation"]) expect(pages, `la section acceptée « ${id} » n'a plus de page`).toContain(`"${id}"`);
  });
});

/**
 * LES CONDITIONS GÉNÉRALES, EN LECTURE SEULE (20 novembre 2026, le client : « publie les conditions générales »).
 */
describe("les conditions générales publiées en lecture seule", () => {
  const donnees = lire("src/data/conditions-generales.ts");
  const texte = donnees.replace(/\/\*[\s\S]*?\*\//g, "");
  const page = lire("src/app/info/conditions-generales/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "");

  it("est publique, dans le plan du site, et le hub y mène", () => {
    expect(estPublic("/info/conditions-generales")).toBe(true);
    expect(lire("src/app/sitemap.ts")).toContain('"/info/conditions-generales"');
    expect(lire("src/app/info/textes/page.tsx")).toContain('href: "/info/conditions-generales"');
  });

  it("ne change ni la version légale ni son acceptation : aucune signature, aucun consentement", () => {
    expect(page).not.toMatch(/LEGAL_VERSION|setConsent|conventionAt|getClientFile|Signer/);
    expect(texte).not.toMatch(/LEGAL_VERSION/);
  });

  it("ne publie AUCUN blanc à remplir, aucun tarif, et ne dit pas qui perçoit des frais", () => {
    expect(texte, "un [crochet] est resté dans le texte publié").not.toMatch(/"[^"\n]*\[[^\]"\n]*\][^"\n]*"/);
    expect(texte, "un chiffre de frais est écrit dans le texte").not.toMatch(/FCFA|frais[^."]*\d+\s?%/);
    expect(texte, "la destination des frais ne se dit pas au client").not.toMatch(/commission(?! de surveillance)|rétrocession|dépositaire[^.]*frais|frais[^.]*dépositaire/i);
    expect(texte).toMatch(/une seule ligne : les frais totaux à payer/);
  });

  it("garde les dix-neuf articles et l'annexe des pièces", () => {
    for (let n = 1; n <= 19; n++) expect(texte, `l'article ${n} a disparu`).toContain(`Article ${n} ·`);
    expect(page).toContain('id="annexe"');
  });
});
