import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { storageKey } from "@/lib/intake/storage";

/**
 * Une clef refusée au dépôt est un fichier perdu en silence.
 *
 * Supabase rejette une clef qui porte un caractère non ASCII. Les communiqués du
 * Trésor congolais en portent tous, et ils étaient déposés sans être gardés :
 * l'appel échouait, et la fiche restait sans sa pièce. Ces cas fixent ce qui
 * sort de la moulinette, y compris ce qu'elle ne doit pas toucher.
 */
describe("la clef d'un objet stocké", () => {
  it("laisse intacte une clef déjà saine, dossiers compris", () => {
    expect(storageKey("boc/BOC-20260925.pdf")).toBe("boc/BOC-20260925.pdf");
    expect(storageKey("kyc/u-123/piece-1a2b3c.png")).toBe("kyc/u-123/piece-1a2b3c.png");
  });

  it("fait tomber les accents plutôt que de les remplacer par un tiret", () => {
    // « Communique » se relit ; « Communiqu- » non.
    expect(storageKey("beac/Communiqué-dannonce-BTA-52-semaines.pdf")).toBe("beac/Communique-dannonce-BTA-52-semaines.pdf");
    expect(storageKey("issuers/SEMC/États-financiers-2025.pdf")).toBe("issuers/SEMC/Etats-financiers-2025.pdf");
  });

  it("garde les dossiers, qui ont un sens chez Supabase", () => {
    expect(storageKey("beac/x.pdf")).toContain("/");
  });

  it("remplace d'un seul tiret ce qui reste inacceptable", () => {
    expect(storageKey("beac/communiqué n° 480 (annonce).pdf")).toBe("beac/communique-n-480-annonce-.pdf");
  });
});

/**
 * Les scripts de reprise écrivent dans le même dépôt.
 *
 * LA BARRIÈRE EST TOMBÉE LE 2026-10-02, et ce test change de sens. storageKey()
 * vivait derrière « server-only », donc aucun script ne pouvait l'importer : ils
 * en gardaient une copie, et une copie libre dérive. Celle du script d'ingestion des avis ne remplaçait que les
 * caractères non ASCII, un par un, là où l'original écrase aussi les espaces et
 * les points et réduit toute une suite à un seul tiret. Dix-sept avis de Guinée
 * équatoriale, seul pays dont le nom porte les trois, sont partis sous une clef
 * que l'application n'aurait jamais lue. Rien n'échouait : la file des avis
 * serait simplement restée pleine.
 *
 * Elle vit maintenant dans « cle.ts », qui ne porte pas cette barrière et
 * s'importe de partout, scripts compris. Ce test garde donc l'inverse de ce
 * qu'il gardait : qu'il n'en reste AUCUNE copie. Et si l'une reparaissait, elle
 * doit au moins se comporter comme l'originale, parce qu'une copie qui dérive ne
 * casse rien : elle écrit simplement sous une clef que personne ne relira.
 *
 * La liste des scripts ne s'énumère pas à la main. Celui qu'on ajouterait demain
 * serait oublié, et c'est le jour où ce test aurait servi.
 *
 * CE QUE LE DÉTECTEUR REGARDE A CHANGÉ LE 2026-10-13, et il faut dire pourquoi
 * parce qu'un cliquet qu'on desserre doit se justifier. Il repérait
 * `normalize("NFD")`, qui n'est pas la règle : c'est l'idiome par lequel on fait
 * tomber les accents, et il sert à tout autre chose ailleurs. Le script de
 * ramassage BEAC s'en sert pour fabriquer un NOM DE FICHIER WINDOWS, qui garde
 * les espaces, bannit les caractères interdits du système et se coupe à cent dix
 * signes : le contraire d'une clef d'objet, et c'est voulu, puisqu'un humain doit
 * pouvoir ouvrir le fichier. Le faire dériver vers storageKey casserait l'archive.
 *
 * Ce que le détecteur regarde maintenant est la règle elle-même : la classe
 * NIÉE `[^a-zA-Z0-9._`, qui écrase en tirets tout ce qui n'est pas elle. C'est
 * elle qui avait dérivé, c'est elle qui avait coûté dix-sept avis, et aucune
 * autre fonction du dépôt n'a de raison de l'écrire.
 *
 * LA NÉGATION N'EST PAS UN DÉTAIL. Sans elle, le détecteur attrapait
 * `verif-pieces-avis.mjs`, qui DÉCRIT la règle en commentaire et l'importe
 * proprement depuis cle.ts : un cliquet qui ne distingue pas une copie d'une
 * phrase qui en parle finit par apprendre à ne plus parler des règles.
 *
 * Le test qui suit vérifie les trois cas sur pièces, parce qu'un cliquet qu'on
 * resserre doit prouver qu'il n'a rien lâché.
 */
const SIGNATURE = "[^a-zA-Z0-9._";

describe("les copies de la règle, dans les scripts", () => {
  const racine = process.cwd();
  const scripts = readdirSync(path.join(racine, "scripts"))
    .filter((f) => /\.(mjs|cjs|js|ts)$/.test(f))
    .map((f) => [f, readFileSync(path.join(racine, "scripts", f), "utf8")] as const)
    .filter(([, src]) => src.includes(SIGNATURE));

  it("le détecteur attrape encore la copie qui a coûté dix-sept avis", () => {
    /* ON NE RESSERRE PAS UN CLIQUET SANS LE PROUVER. Voici la copie telle
       qu'elle vivait dans le script d'ingestion des avis avant le 2026-10-02 :
       le détecteur d'aujourd'hui doit la voir, sinon le resserrement est une
       perte de garde déguisée en nettoyage. */
    const copieHistorique = `const storageKey = (k) => k.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9._\\-/]+/g, "-");`;
    expect(copieHistorique.includes(SIGNATURE), "le détecteur ne verrait plus la copie de 2026-10-02").toBe(true);

    /* Et il doit laisser passer le nom de fichier Windows, qui n'est pas elle. */
    const nomDeFichier = `const propre = (s) => (s ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[<>:"/\\\\|?*]/g, " ").trim().slice(0, 110);`;
    expect(nomDeFichier.includes(SIGNATURE), "le détecteur confond encore un nom de fichier avec une clef").toBe(false);

    /* Et il doit laisser passer la PHRASE qui décrit la règle. Un script qui
       importe storageKey et explique en tête ce qu'elle fait est exactement ce
       qu'on veut voir écrit, et le détecteur l'accusait. */
    const prose = ` * écrase toute suite de caractères hors [a-zA-Z0-9._-/] en UN seul tiret.`;
    expect(prose.includes(SIGNATURE), "le détecteur accuse encore un commentaire qui décrit la règle").toBe(false);
  });

  it("n'en garde aucune : la règle s'importe depuis cle.ts", () => {
    /* Le 2026-10-02, le balayage du dépôt a retrouvé le résidu de la dernière
       dérive : sept communiqués que la base désignait et que le dépôt gardait
       sous un autre nom, donc illisibles, et vingt-deux doublons périmés. Une
       copie ne casse rien au moment où on l'écrit, et c'est bien le problème. */
    expect(scripts.map(([f]) => f), "un script recopie storageKey : importez-la depuis « @/lib/intake/cle » ou « ../src/lib/intake/cle.ts »").toEqual([]);
  });

  /**
   * Les chaînes qui séparaient les deux versions. Une clef sans elles ne prouve
   * rien : c'est bien parce que cinq Trésors n'en portaient aucune que la
   * divergence est restée invisible.
   */
  const EPREUVES = [
    "beac/2026-09-22-annonce-Guinée éq.-3ans-COMMUNIQUE.pdf",
    "beac/communiqué n° 480 (annonce).pdf",
    "beac/Communiqué-dannonce-BTA-52-semaines.pdf",
    "beac/x.pdf",
  ];

  it.each(scripts.map(([f]) => f))("%s replie comme l'application", (f) => {
    const src = scripts.find(([n]) => n === f)![1];
    const m = src.match(/const (?:storageKey|replie) = \(\w+\) =>\s*\w+\s*((?:\s*\.\w+\([^;]*?\))+);/);
    expect(m, `aucune copie reconnaissable dans scripts/${f}`).not.toBeNull();
    const copie = new Function("s", `return s${m![1]};`) as (s: string) => string;
    for (const e of EPREUVES) expect(copie(e), `scripts/${f} sur « ${e} »`).toBe(storageKey(e));
  });
});
