import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketBulletin } from "@/lib/domain/market";

/**
 * LA PASSE DE RELECTURE, ET CE QU'ELLE CHOISIT DE REPRENDRE.
 *
 * Deux appelants la partagent : le bouton de la page Santé, six à la fois dans
 * le temps d'une action, et le robot de lecture, soixante à la fois dans ses
 * trois cents secondes. Une boucle écrite deux fois aurait fini par se
 * répondre différemment, et l'écart entre deux chemins vers le même résultat
 * ne se voit jamais avant qu'il ne coûte.
 *
 * Ce que ces cliquets tiennent, et chacun a déjà coûté une fois :
 *
 *   - L'ORDRE. Trier par date de séance ramenait éternellement les six mêmes
 *     en tête, et une séance qui ne s'améliore pas ne s'améliorera jamais : les
 *     deux cent quatre-vingts autres n'étaient jamais atteintes. On trie donc
 *     par date de dernière lecture, et la file tourne.
 *   - CE QU'ON NE TOUCHE PAS. Une séance complète n'a rien à gagner, et la
 *     reprendre coûte quatre secondes pour rien. C'est précisément ce que
 *     « relire » sur une plage de dates faisait : vingt minutes pour deux cent
 *     quatre-vingt-sept séances utiles sur huit cent huit.
 *   - L'ADRESSE D'UN DÉPÔT À LA MAIN. Un PDF déposé par le desk porte
 *     « upload: » et non une adresse : la passer au lecteur le ferait tomber
 *     sur l'adresse du jour, c'est à dire relire une autre séance que celle
 *     qu'on croit.
 */
const lu: { sessionDate: string; sourceUrl?: string }[] = [];

vi.mock("@/lib/market/boc", async (vrai) => ({
  ...(await vrai<typeof import("@/lib/market/boc")>()),
  /* Le lecteur est remplacé : un test ne télécharge pas huit cents PDF chez la
     bourse. On garde la trace de ce qu'on lui a demandé, qui est le sujet. */
  ingestBoc: vi.fn(async (opts: { sessionDate: string; sourceUrl?: string }) => {
    lu.push({ sessionDate: opts.sessionDate, sourceUrl: opts.sourceUrl });
    return { found: true, bulletin: { ...bulletin(opts.sessionDate, "ok", 6), ingestedAt: new Date().toISOString() }, created: [], refreshed: [] };
  }),
}));

const { memoryRepository } = await import("@/lib/data/memory");
const { relireArriere, ARRIERE_PAR_TOUR, REREAD_BATCH } = await import("@/lib/health");

function bulletin(sessionDate: string, status: MarketBulletin["status"], equities: number, ingestedAt = "2026-01-01T00:00:00.000Z", sourceUrl = `https://www.bvm-ac.org/${sessionDate}.pdf`): MarketBulletin {
  return { id: sessionDate, number: 1, sessionDate, sourceUrl, ingestedAt, ingestedBy: "cron", status, counts: { equities, bonds: 10, funds: 20 }, warnings: [], anomalies: [], notices: [] };
}

/** Quatre incomplètes, lues dans un ordre qui n'est pas celui des séances. */
const SEMIS: MarketBulletin[] = [
  bulletin("2024-01-02", "partiel", 0, "2026-03-01T00:00:00.000Z"),
  bulletin("2024-01-03", "partiel", 2, "2026-01-01T00:00:00.000Z"),
  bulletin("2024-01-04", "ok", 6, "2026-01-01T00:00:00.000Z"),
  bulletin("2024-01-05", "partiel", 3, "2026-02-01T00:00:00.000Z"),
  bulletin("2024-01-08", "echec", 0, "2026-04-01T00:00:00.000Z", "upload:depot-du-desk"),
];

beforeEach(async () => {
  lu.length = 0;
  /* Le semis d essai ne porte que des bulletins complets : il n entre donc
     jamais dans l arriere, et il n y a rien a vider avant de semer les notres. */
  for (const b of SEMIS) await memoryRepository.upsertBulletin(b);
});

describe("une passe de relecture", () => {
  it("prend les moins récemment lues, et non les plus anciennes séances", async () => {
    /* Par date de séance ce serait 01-02 puis 01-03. Par date de lecture c'est
       01-03 (janvier) puis 01-05 (février) : c'est la file qui tourne. */
    const out = await relireArriere("desk", 2);
    expect(out.pris).toEqual(["2024-01-03", "2024-01-05"]);
    expect(lu.map((x) => x.sessionDate)).toEqual(["2024-01-03", "2024-01-05"]);
  });

  it("ne touche jamais à une séance complète", async () => {
    const out = await relireArriere("desk", 99);
    expect(out.pris).not.toContain("2024-01-04");
    // Les quatre incomplètes, et elles seules.
    expect(out.pris).toHaveLength(4);
  });

  it("dit ce qui reste après elle", async () => {
    expect((await relireArriere("desk", 1)).reste).toBe(3);
    expect((await relireArriere("desk", 99)).reste).toBe(0);
  });

  it("reprend exactement les séances nommées, où qu'elles soient dans la file", async () => {
    // 01-02 est en queue de file : nommée, elle passe quand même.
    const out = await relireArriere("desk", 6, ["2024-01-02"]);
    expect(out.pris).toEqual(["2024-01-02"]);
    expect(out.reste).toBe(3);
  });

  it("ignore une séance nommée qui n'a rien à reprendre", async () => {
    // Sinon le bouton d'une ligne ferait retélécharger un bulletin complet.
    expect((await relireArriere("desk", 6, ["2024-01-04"])).pris).toEqual([]);
  });

  it("ne donne pas d'adresse au lecteur pour un dépôt fait à la main", async () => {
    /* « upload: » n'est pas une adresse. La passer telle quelle, ou pire la
       laisser tomber sur l'adresse du jour, relirait une autre séance. */
    await relireArriere("desk", 99);
    expect(lu.find((x) => x.sessionDate === "2024-01-08")?.sourceUrl).toBeUndefined();
    expect(lu.find((x) => x.sessionDate === "2024-01-03")?.sourceUrl).toBe("https://www.bvm-ac.org/2024-01-03.pdf");
  });

  it("compte ce qu'elle a refermé", async () => {
    // Le lecteur simulé rend « ok » : les quatre quittent l'arriéré.
    const out = await relireArriere("desk", 99);
    expect(out.closes).toBe(4);
    expect(out.echecs).toBe(0);
    // Deux gagnent des cours là où elles n'en avaient pas ou peu.
    expect(out.gagne).toBe(4);
  });
});

describe("les deux plafonds de passe", () => {
  it("celui du bouton est petit, celui du robot ne l'est pas", () => {
    /* Non vacuité : un plafond de robot tombé au niveau du bouton rendrait le
       bouton « Confier au robot » inutile sans que rien n'échoue, et une
       reprise de deux cent quatre-vingt-sept séances demanderait quarante-huit
       clics au lieu de cinq. */
    expect(REREAD_BATCH).toBeLessThanOrEqual(10);
    expect(ARRIERE_PAR_TOUR).toBeGreaterThanOrEqual(30);
    // Quatre secondes par bulletin, trois cents de budget : la marge est tenue.
    expect(ARRIERE_PAR_TOUR * 4).toBeLessThan(300);
  });
});

/**
 * LE DISQUE PLEIN DÉGUISÉ EN ÉCHEC DE LECTURE.
 *
 * Mesuré le 6 octobre 2026, deux heures après la mise en service du bouton :
 * 646 Mo occupés sur les 1024 du plan gratuit, un PDF de bulletin pèse
 * 1512 ko, et 287 séances attendent une relecture. Les archiver en les
 * relisant demande 424 Mo, donc le seau cède avant la fin.
 *
 * Et il cède à l'intérieur du `try` de la passe, qui compte l'exception comme
 * un échec de lecture : le desk verrait « 12 en échec » et conclurait que le
 * lecteur bute sur ces séances, alors que le disque est plein. La famille de
 * pannes la plus coûteuse de ce dépôt, une fois de plus.
 *
 * Une relecture lit donc sans archiver. Elle ne doit pas non plus EFFACER un
 * pointeur existant : 104 PDF sont dans le seau, et le lecteur écrivait
 * `fileKey = undefined` dès que `keepPdf` était faux. Les deux règles tiennent
 * ensemble ; la première sans la seconde détruirait les archives acquises.
 */
describe("une relecture lit sans archiver, et sans rien effacer", () => {
  it("elle ne demande jamais à garder le PDF", async () => {
    const appels: (boolean | undefined)[] = [];
    const { ingestBoc } = await import("@/lib/market/boc");
    const espion = vi.mocked(ingestBoc);
    espion.mockClear();
    await relireArriere("desk", 2);
    for (const appel of espion.mock.calls) appels.push((appel[0] as { keepPdf?: boolean }).keepPdf);
    expect(appels.length).toBeGreaterThan(0);
    expect(appels.every((k) => k === false), "une passe qui archive remplit le plan gratuit avant d'avoir fini").toBe(true);
  });

  it("le lecteur garde le pointeur d'un PDF déjà archivé", async () => {
    /* « Ne pas garder » ne veut pas dire « oublier » : le fichier reste dans
       le seau, et effacer son pointeur le rend introuvable. */
    const src = readFileSync(new URL("../lib/market/boc.ts", import.meta.url), "utf8");
    expect(src, "keepPdf=false doit hériter du fileKey existant, pas écrire undefined").toContain("const dejaGarde = opts.keepPdf === false");
    expect(src, "et ne réécrire le fichier que lorsque c'est nous qui l'archivons").toContain('if (fileKey && opts.keepPdf !== false)');
  });
});
