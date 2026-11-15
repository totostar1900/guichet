import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CHAQUE PASSAGE D'UN ORDRE LAISSE SON AVANT ET SON APRÈS (15 novembre 2026, audit des dates d'un ordre, étape 1).
 *
 * La règle de la maison est « toute écriture métier passe par `audit()` ». Les passages d'un ordre la respectaient presque tous, sauf quatre : la création
 * de la demande du client, sa signature (et la couverture par la provision), l'ordre d'arbitrage né d'une exécution, et l'application des résultats
 * d'adjudication en lot (servi, non servi, réglé). Le registre est la trace qu'on produit le jour où un client dit « je n'ai pas passé cet ordre ».
 *
 * Cet essai lit les sources et refuse qu'un chemin qui crée ou fait avancer un ordre n'écrive pas au registre : le cinquième chemin, celui de demain,
 * sera attrapé avant d'exister.
 */
const racine = join(__dirname, "../..", "src");
const fichiers = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "test" ? [] : fichiers(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
const lire = (p: string) => readFileSync(p, "utf8");
const tous = fichiers(racine).filter((p) => !p.includes("/lib/data/"));
const rel = (p: string) => p.slice(racine.length - 3);

describe("tout chemin qui crée un ordre écrit au registre", () => {
  const createurs = tous.filter((p) => /\.createIntent\(/.test(lire(p)));

  it("il y a des chemins à garder (l'essai ne tourne pas à vide)", () => {
    expect(createurs.length).toBeGreaterThanOrEqual(4);
  });

  it("chacun appelle audit(\"intent.create\") ou, pour l'épargne programmée, audit(\"standing.execute\"), autant de fois qu'il crée", () => {
    for (const p of createurs) {
      const src = lire(p);
      const crees = (src.match(/\.createIntent\(/g) ?? []).length;
      const audites = (src.match(/audit\("(intent\.create|standing\.execute)"/g) ?? []).length;
      expect(audites, `${rel(p)} crée ${crees} ordre(s) et n'en écrit que ${audites} au registre`).toBeGreaterThanOrEqual(crees);
    }
  });
});

describe("tout chemin qui fait avancer un ordre écrit au registre", () => {
  const AVANCE = /(updateIntent\([^)]*state: "(servie|non_servie|reglee|confirmee|transmise|annulee)"|setIntentState\()/;
  const passeurs = tous.filter((p) => AVANCE.test(lire(p)));

  it("il y a des chemins à garder", () => {
    expect(passeurs.length).toBeGreaterThanOrEqual(6);
  });

  it("chacun contient un audit d'ordre (« intent.* » ou « standing.* »)", () => {
    for (const p of passeurs) expect(lire(p), `${rel(p)} change l'état d'un ordre sans écrire au registre`).toMatch(/audit\("(intent|standing)\./);
  });
});

describe("la signature et les résultats en lot", () => {
  it("la signature écrit « intent.sign » avec le moyen, le document et la couverture", () => {
    const s = lire(join(racine, "app/moi/ordres/[id]/actions.ts"));
    expect(s).toMatch(/^\s*await audit\("intent\.sign"/m);
    expect(s).toMatch(/signedMethod: methode/);
    expect(s, "la couverture et la signature ne portent plus le même instant").toMatch(/coveredAt: signeLe/);
  });

  it("les résultats en lot écrivent « intent.execute » (servi, non servi) et « intent.settle » (réglé)", () => {
    const s = lire(join(racine, "lib/results/service.ts"));
    expect(s).toMatch(/^\s*await audit\("intent\.execute"/m);
    expect(s).toMatch(/^\s*await audit\("intent\.settle"/m);
    expect(s).toMatch(/au-delà du plafond signé/);
  });

  it("le robot WhatsApp signe sa trace : son nom est l'auteur", () => {
    expect(lire(join(racine, "lib/bot/reply.ts"))).toMatch(/audit\("intent\.create"[^\n]*actor: "robot WhatsApp"/);
  });
});
