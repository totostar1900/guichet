import { describe, expect, it } from "vitest";
import { memoRepo } from "@/lib/data/memo";
import type { Repository } from "@/lib/data/repository";

/**
 * Une lecture, une fois par requête.
 *
 * Une fiche appelait « listOffers » trois fois pour se rendre (les lignes du
 * même émetteur, la position détenue, le dernier BTA de référence) et lisait
 * par ailleurs la table des intentions entière : cinq lectures complètes, en
 * série, pour une page. C'est ce qui rendait le passage d'une carte à la
 * suivante long sur téléphone.
 *
 * Ce qui suit tient les deux moitiés de la promesse, et la seconde compte plus
 * que la première : ne pas relire deux fois la même chose, et ne jamais servir
 * du périmé après une écriture. Un cache qui ment sur ce qu'on vient
 * d'enregistrer est pire que pas de cache du tout.
 *
 * Le sac de la requête est celui de `cache()`, qui ne mémorise que pendant un
 * rendu ; ces cas tournent hors rendu et lui en fournissent donc un à la main,
 * ce que `memoRepo` accepte en second argument. Le proxy éprouvé est bien
 * celui de la production.
 */
const held = () => {
  const m = new Map<string, Promise<unknown>>();
  return () => m;
};

describe("le dépôt mémorisé", () => {
  it("ne lit qu'une fois ce qu'on lui demande deux fois", async () => {
    let n = 0;
    const base = { async listOffers() { n++; return [{ id: "a" }] as never; } } as unknown as Repository;
    const r = memoRepo(base, held());
    const [x, y] = await Promise.all([r.listOffers(), r.listOffers()]);
    expect(n).toBe(1);
    expect(x).toBe(y);
  });

  it("distingue deux lectures par leurs arguments", async () => {
    const calls: string[] = [];
    const base = { async listQuotes(isin: string) { calls.push(isin); return [] as never; } } as unknown as Repository;
    const r = memoRepo(base, held());
    await Promise.all([r.listQuotes("A"), r.listQuotes("A"), r.listQuotes("B")]);
    expect(calls).toEqual(["A", "B"]);
  });

  it("oublie tout ce qu'il a lu dès qu'on écrit", async () => {
    // Le cas qui compte : une action serveur enregistre puis relit. Si la
    // relecture rendait l'ancienne liste, l'écran mentirait sur ce qu'on vient
    // de faire, et personne ne saurait pourquoi.
    let n = 0;
    let saved = 0;
    const base = {
      async listOffers() {
        n++;
        return [] as never;
      },
      async upsertOffer(o: unknown) {
        saved++;
        return o as never;
      },
    } as unknown as Repository;
    const r = memoRepo(base, held());
    await r.listOffers();
    await r.listOffers();
    expect(n).toBe(1);
    await r.upsertOffer({ id: "b" } as never);
    expect(saved).toBe(1);
    await r.listOffers();
    expect(n).toBe(2);
  });

  it("ne garde pas une lecture qui a échoué", async () => {
    // Sinon un incident de réseau tiendrait toute la requête : chaque appelant
    // suivant recevrait la même promesse rompue sans jamais réessayer.
    let n = 0;
    const base = {
      async listOffers() {
        n++;
        if (n === 1) throw new Error("réseau");
        return [] as never;
      },
    } as unknown as Repository;
    const r = memoRepo(base, held());
    await expect(r.listOffers()).rejects.toThrow("réseau");
    await expect(r.listOffers()).resolves.toEqual([]);
    expect(n).toBe(2);
  });

  it("ne mémorise rien hors d'une requête", async () => {
    // Un cron ou un script n'a pas de sac : tout doit se comporter comme avant,
    // sans quoi une tâche longue lirait des données figées à son premier appel.
    let n = 0;
    const base = { async listOffers() { n++; return [] as never; } } as unknown as Repository;
    const r = memoRepo(base);
    await r.listOffers();
    await r.listOffers();
    expect(n).toBe(2);
  });

  it("laisse passer ce qui n'est pas une fonction", () => {
    const base = { name: "essai", async listOffers() { return [] as never; } } as unknown as Repository;
    expect((memoRepo(base, held()) as unknown as { name: string }).name).toBe("essai");
  });
});
