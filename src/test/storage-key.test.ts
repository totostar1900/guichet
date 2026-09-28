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
 * Ils ne peuvent pas importer storageKey() : son module porte « server-only » et
 * ne se charge pas hors de Next. Ils en gardent donc une copie, et une copie
 * libre dérive. Celle du script d'ingestion des avis ne remplaçait que les
 * caractères non ASCII, un par un, là où l'original écrase aussi les espaces et
 * les points et réduit toute une suite à un seul tiret. Dix-sept avis de Guinée
 * équatoriale, seul pays dont le nom porte les trois, sont partis sous une clef
 * que l'application n'aurait jamais lue. Rien n'échouait : la file des avis
 * serait simplement restée pleine.
 *
 * La liste des scripts ne s'énumère pas à la main. Celui qu'on ajouterait demain
 * serait oublié, et c'est le jour où ce test aurait servi.
 */
describe("les copies de la règle, dans les scripts", () => {
  const racine = process.cwd();
  const scripts = readdirSync(path.join(racine, "scripts"))
    .filter((f) => /\.(mjs|cjs|js|ts)$/.test(f))
    .map((f) => [f, readFileSync(path.join(racine, "scripts", f), "utf8")] as const)
    .filter(([, src]) => src.includes('normalize("NFD")'));

  it("garde au moins une copie, sans quoi ce test ne garde rien", () => {
    expect(scripts.length).toBeGreaterThan(0);
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
