import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UN ENCAISSEMENT SE CONSTATE CONTRE UNE PIÈCE.
 *
 * Le geste était un bouton. L'opérateur voyait l'échéancier, cliquait, et le
 * journal inscrivait le montant ATTENDU daté de l'ÉCHÉANCE. Rien ne lui
 * demandait contre quoi il confirmait, rien n'était conservé de ce qu'il avait
 * vu, et le seul écran devant lui était la prédiction qu'on lui demandait de
 * valider.
 *
 * Trois choses sont tenues ici, et la troisième est la moins évidente : un
 * encaissement partiel inscrit pour son seul montant réel donne une
 * comptabilité juste et fait DISPARAÎTRE la créance. Garder l'attendu à côté
 * est ce qui la maintient en vie.
 *
 * Le dépôt en mémoire laissait tomber `flowKey` à l'insertion : en mode
 * mémoire, un encaissement n'était jamais rapproché, le flux restait
 * « attendu » pour toujours, et la garde contre le double clic ne mordait pas.
 * Une panne muette, mesurée ici.
 */
const RACINE = "C:/dev/guichet/src";
const lire = (rel: string) => readFileSync(path.join(RACINE, rel), "utf8");

vi.mock("@/lib/auth", () => ({ requireDesk: async () => ({ name: "Desk Test", role: "desk" }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const champs = (o: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

/**
 * Le dépôt en mémoire vit sur `globalThis` et survit à `resetModules` : un
 * client partagé ferait lire à un test l'écriture du précédent, et deux
 * assertions passeraient pour une raison qui n'est pas la leur.
 */
let rang = 0;
const sien = () => {
  rang += 1;
  return { userId: `u-test-${rang}`, flowKey: `i-${rang}|2026-07-05|500000` };
};

const base = { label: "Coupon", date: "2026-07-05", titre: "OTA 6 % 2028", expected: "500000" };

describe("le constat d'encaissement", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuse sans la pièce, et le dit", async () => {
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const r = await porterAuJournal(null, champs({ ...base, ...sien(), amount: "500000", valueOn: "2026-07-06" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/pièce/i);
  });

  it("refuse sans la date de valeur", async () => {
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const r = await porterAuJournal(null, champs({ ...base, ...sien(), amount: "500000", evidence: "avis n° 4471" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/date de valeur/i);
  });

  it("refuse une date de valeur dans l'avenir", async () => {
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const demain = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const r = await porterAuJournal(null, champs({ ...base, ...sien(), amount: "500000", evidence: "avis n° 4471", valueOn: demain }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/avenir/i);
  });

  it("inscrit la pièce, le montant reçu et la date de valeur, et garde l'attendu", async () => {
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const { repo } = await import("@/lib/data");
    const ici = sien();
    const r = await porterAuJournal(null, champs({ ...base, ...ici, amount: "480000", evidence: "relevé du 16/10 ligne 42", valueOn: "2026-07-09" }));
    expect(r.ok).toBe(true);
    // L'écart est annoncé à l'opérateur, pas seulement rangé.
    if (r.ok) expect(r.message).toMatch(/écart/i);

    const e = (await repo().listCash(ici.userId)).find((x) => x.flowKey === ici.flowKey);
    expect(e).toBeTruthy();
    expect(e!.evidence).toBe("relevé du 16/10 ligne 42");
    expect(e!.amount).toBe(480_000);
    // Sans l'attendu, la créance de 20 000 disparaîtrait au moment de l'inscription.
    expect(e!.expected).toBe(500_000);
    // La date de valeur, non celle de l'échéance : « encaissé le » cesse de répéter « échu le ».
    expect(e!.at.slice(0, 10)).toBe("2026-07-09");
    expect(e!.at.slice(0, 10)).not.toBe(base.date);
  });

  it("n'inscrit pas deux fois la même échéance", async () => {
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const bon = { ...base, ...sien(), amount: "500000", evidence: "avis n° 4471", valueOn: "2026-07-06" };
    expect((await porterAuJournal(null, champs(bon))).ok).toBe(true);
    const deux = await porterAuJournal(null, champs(bon));
    expect(deux.ok).toBe(false);
    if (!deux.ok) expect(deux.error).toMatch(/déjà portée/i);
  });

  it("le flux inscrit devient « encaissé », et non plus « attendu »", async () => {
    // C'est ce que le dépôt en mémoire cassait : flowKey se perdait à
    // l'insertion, donc le rapprochement ne trouvait jamais rien.
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const { repo } = await import("@/lib/data");
    const { suivre } = await import("@/lib/domain/encaissement");
    const ici = sien();
    const intentId = ici.flowKey.split("|")[0];
    await porterAuJournal(null, champs({ ...base, ...ici, amount: "500000", evidence: "avis n° 4471", valueOn: "2026-07-06" }));
    const suivis = suivre(
      [{ intentId, titre: base.titre, echus: [{ date: base.date, amount: 500_000, label: "Coupon" }], aVenir: [] }],
      await repo().listCash(ici.userId),
      new Date("2026-08-01T10:00:00Z"),
    );
    expect(suivis[0].etat).toBe("encaisse");
    expect(suivis[0].encaisseLe).toBe("2026-07-06");
  });
});

describe("la base redemande la pièce", () => {
  it("la migration 0059 l'exige dès qu'un mouvement encaisse une échéance", () => {
    const sql = readFileSync("C:/dev/guichet/supabase/migrations/0059_preuve_de_l_encaissement.sql", "utf8");
    expect(sql).toMatch(/evidence/);
    expect(sql).toMatch(/expected/);
    expect(sql).toMatch(/flow_key is null or \(evidence is not null/);
  });

  it("les deux dépôts écrivent les deux colonnes", () => {
    // Le dépôt en mémoire est celui qui laissait tomber des champs en silence.
    for (const rel of ["lib/data/supabase.ts", "lib/data/memory.ts"]) {
      const s = lire(rel);
      expect(s, rel).toMatch(/evidence/);
      expect(s, rel).toMatch(/expected/);
      expect(s, rel).toMatch(/flow[_K]?[eE]y/);
    }
  });
});
