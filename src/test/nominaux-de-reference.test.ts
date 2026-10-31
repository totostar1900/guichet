import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { memoryRepository } from "@/lib/data/memory";
import type { Quote } from "@/lib/domain/market";

/**
 * LE DERNIER NOMINAL NON NUL, EN UNE SEULE REQUÊTE.
 *
 * La première version prenait la dernière cotation de chaque ligne, puis
 * reprenait l'historique ligne par ligne pour celles qui portaient un zéro :
 * une requête, plus une par ligne concernée, et cela UNE FOIS PAR SÉANCE.
 * Mesuré le 11 octobre 2026 pendant la reprise de l'arriéré : dix secondes
 * par séance au lieu de quatre, et le plafond de trois cents secondes de la
 * fonction tuait un tour de soixante séances.
 *
 * Deux écritures, une seule sémantique : la fonction SQL et le dépôt en
 * mémoire doivent répondre la même chose, sans quoi le jeu d'essai mentirait
 * sur le lecteur.
 */
const q = (isin: string, sessionDate: string, nominalRemaining: number, instrument: Quote["instrument"] = "obligation"): Quote =>
  ({
    isin, sessionDate, instrument, bulletinNo: 1, mnemo: "X", issuer: "ETAT", designation: "X", previousClose: 100, previousDate: sessionDate,
    open: 100, close: 100, thresholdHigh: 106, thresholdLow: 94, variationPct: 0, referenceNext: 100, volumeTraded: 0, valueTraded: 0, trades: 0,
    status: "NC", nominalRemaining, ytdVariationPct: null,
  }) as Quote;

describe("le dernier nominal non nul de chaque obligation", () => {
  beforeEach(async () => {
    const r = memoryRepository;
    await r.upsertQuotes([
      q("CG0000020238", "2026-03-10", 3333.333),
      q("CG0000020238", "2026-03-16", 0), // le bulletin imprime zéro : il n'apprend rien
      q("GA0000020248", "2026-05-29", 2500),
      q("CM0000020362", "2026-06-17", 10000),
      q("CM0000020362", "2026-06-18", 5000), // le capital vient d'être remboursé de moitié
      q("CM0000010041", "2026-06-17", 1, "action"), // une action n'a pas de nominal restant à suivre
    ]);
  });

  it("prend la cotation la plus récente d'avant la date", () => {
    return memoryRepository.nominauxDeReference("2026-06-19").then((m) => {
      expect(m.get("CM0000020362"), "la veille du 19, le nominal courait à 5 000").toBe(5000);
      expect(m.get("GA0000020248")).toBe(2500);
    });
  });

  it("et la date est STRICTE : la séance qu'on relit ne se sert pas d'elle-même", () => {
    /* Sans cela, relire une séance lui ferait lire son propre nominal, donc
       le zéro qu'elle vient de ne pas savoir couper. */
    return memoryRepository.nominauxDeReference("2026-06-18").then((m) => {
      expect(m.get("CM0000020362")).toBe(10000);
    });
  });

  it("un zéro n'efface pas la référence utile", () => {
    /* C'est tout l'objet du mot « non nul » : sur une ligne arrivée au bout,
       la dernière cotation ramène zéro, et c'est précisément le nombre dont
       le lecteur ne peut rien faire. */
    return memoryRepository.nominauxDeReference("2026-03-20").then((m) => {
      expect(m.get("CG0000020238")).toBe(3333.333);
    });
  });

  it("et une action n'y figure pas", () => {
    return memoryRepository.nominauxDeReference("2026-06-19").then((m) => {
      expect(m.has("CM0000010041")).toBe(false);
    });
  });

  it("rien avant la première cotation connue", () => {
    return memoryRepository.nominauxDeReference("2020-01-01").then((m) => {
      expect(m.size).toBe(0);
    });
  });
});

describe("les deux écritures disent la même chose", () => {
  it("la fonction SQL porte le même « non nul » et la même date stricte", () => {
    /* Une sémantique écrite deux fois finit par diverger, et l'écart entre le
       jeu d'essai et la production ne se voit jamais avant qu'il ne coûte. */
    const sql = readFileSync("supabase/migrations/0093_nominaux_de_reference.sql", "utf8");
    expect(sql).toContain("distinct on (q.isin)");
    expect(sql).toContain("q.session_date < avant");
    expect(sql).toContain("q.nominal_remaining > 0");
    expect(sql).toContain("q.instrument = 'obligation'");
    expect(sql).toContain("order by q.isin, q.session_date desc");
    /* L'INDEX PARTIEL : sans lui la requête balaie 15 905 lignes pour en
       rendre 39. ON GARDE SA CRÉATION, et non son nom : vérifié à l'envers le
       1er novembre 2026, renommer l'index laissait la clause verte, parce que
       le « comment on index » plus bas répète le nom. L'index aurait disparu
       de la migration sans que rien ne tombe. */
    expect(sql, "l'index partiel n'est plus créé : la requête balaiera toute la table").toMatch(/create index if not exists quotes_nominal_reference_idx/);
    expect(sql).toContain("revoke all on function nominaux_de_reference(date) from public");
  });
});
