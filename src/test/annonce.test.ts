import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";
import type { AnnonceResult } from "@/app/desk/annonce/actions";

/**
 * L'ANNONCE DE LA MAISON sur le dépôt mémoire : une seule à la fois, la nouvelle relève l'ancienne, rien ne s'efface, chaque geste est à l'audit
 * (14 novembre 2026, planche 4A).
 */
const desk: Session = { userId: "u-op", role: "desk", name: "Op Test", email: "op@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true } as Session;
vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, requireResponsable: async () => desk }));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const aboutit = async <T,>(f: () => Promise<T>): Promise<T | { ok: true; vers: string }> => {
  try {
    return await f();
  } catch (e) {
    const d = (e as { digest?: unknown }).digest;
    if (typeof d === "string" && d.startsWith("NEXT_REDIRECT")) return { ok: true, vers: d.split(";")[2] ?? "" };
    throw e;
  }
};
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const dans = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("l'annonce de la maison", () => {
  it("se publie, s'affiche, puis la nouvelle relève l'ancienne sans l'effacer", async () => {
    const { publierAnnonceAction, retirerAnnonceAction } = await import("@/app/desk/annonce/actions");
    const { annonceDuJour, listerAnnonces } = await import("@/lib/annonce");
    const { repo } = await import("@/lib/data");
    expect(await annonceDuJour()).toBeUndefined();

    const r1 = await aboutit(() => publierAnnonceAction(null, form({ texte: "Séance du Trésor : réponses ouvertes jusqu'au 20 nov.", jusquAu: dans(6) })));
    expect(r1, JSON.stringify(r1)).toMatchObject({ ok: true });
    const premiere = await annonceDuJour();
    expect(premiere?.texte).toMatch(/Séance du Trésor/);

    await aboutit(() => publierAnnonceAction(null, form({ texte: "La place est fermée lundi pour un jour férié.", jusquAu: dans(3) })));
    const courante = await annonceDuJour();
    expect(courante?.texte).toMatch(/jour férié/);
    const toutes = await listerAnnonces();
    expect(toutes, "une annonce a été effacée au lieu d'être retirée").toHaveLength(2);
    const ancienne = toutes.find((a) => a.id === premiere!.id)!;
    expect(ancienne.retireeLe).toBeTruthy();
    expect(ancienne.motifDeRetrait).toBe("remplacée");
    expect(ancienne.retireePar).toBe("Op Test");
    expect(toutes.filter((a) => !a.retireeLe && a.jusquAu >= dans(0))).toHaveLength(1);

    const audits = await repo().listAudit({ entity: "annonce", limit: 50 });
    const actions = audits.map((a) => a.action);
    expect(actions, "la publication n'est pas à l'audit").toContain("annonce.publie");
    expect(actions, "le remplacement n'est pas à l'audit").toContain("annonce.retire");
    const remplacement = audits.find((a) => a.action === "annonce.retire" && a.entityId === premiere!.id);
    expect(remplacement?.before, "l'audit du retrait n'a pas l'avant").toBeTruthy();
    expect(remplacement?.after, "l'audit du retrait n'a pas l'après").toBeTruthy();

    await aboutit(() => retirerAnnonceAction(form({ id: courante!.id })));
    expect(await annonceDuJour(), "l'annonce retirée s'affiche encore").toBeUndefined();
    expect((await listerAnnonces()).find((a) => a.id === courante!.id)?.motifDeRetrait).toBe("retirée");
  });

  it("refuse un conseil, une date passée et un texte trop court, sans rien publier", async () => {
    const { publierAnnonceAction } = await import("@/app/desk/annonce/actions");
    const { annonceDuJour } = await import("@/lib/annonce");
    for (const o of [{ texte: "Profitez de la meilleure séance", jusquAu: dans(3) }, { texte: "Séance du Trésor lundi prochain", jusquAu: dans(-1) }, { texte: "Court", jusquAu: dans(3) }]) {
      const r = (await aboutit(() => publierAnnonceAction(null, form(o)))) as AnnonceResult;
      expect(r.ok, JSON.stringify(o)).toBe(false);
    }
    expect(await annonceDuJour()).toBeUndefined();
  });
});

describe("la place de l'annonce, EN PLUS de l'existant", () => {
  const lire = (f: string) => readFileSync(f, "utf8");
  it("est posée dans la page, jamais au desk, avant le contenu de la page", () => {
    const l = lire("src/app/layout.tsx");
    expect(l, "le bandeau n'est plus posé").toMatch(/\{deskUi \? null : <BandeauDAnnonce \/>\}/);
    expect(l.indexOf("<BandeauDAnnonce />"), "le bandeau suit de nouveau le contenu").toBeLessThan(l.indexOf("{children}", l.indexOf("<BandeauDAnnonce />")));
    expect(l, "la page n'est plus rendue").toMatch(/<main className=\{styles\.main\}>[\s\S]*\{children\}[\s\S]*<\/main>/);
  });
  it("laisse « À la une », les actualités et le préavis d'ordre où ils sont", () => {
    const c = lire("src/app/Console.tsx");
    expect(c).toMatch(/<Annonce\b/);
    expect(c).toMatch(/titre="À la une" href="\/actualites"/);
    expect(lire("src/lib/desk-groupes.ts")).toMatch(/\["\/desk\/a-la-une", "À la une"\]/);
    expect(lire("src/lib/desk-groupes.ts")).toMatch(/\["\/desk\/annonce", "Annonce"\]/);
  });
  it("se tait sans annonce, et se ferme par la croix de 44 px, sous la clé de l'annonce", () => {
    expect(lire("src/components/BandeauDAnnonce.tsx")).toMatch(/if \(!a\) return null;/);
    expect(lire("src/components/BandeauFermable.tsx")).toMatch(/guichet:annonce:\$\{id\}/);
    expect(lire("src/components/BandeauDAnnonce.module.css")).toMatch(/\.croix \{[^}]*width: 44px[^}]*height: 44px/);
  });
  it("publier et retirer passent par la seconde question et par l'audit", () => {
    const f = lire("src/app/desk/annonce/FormulaireAnnonce.tsx");
    expect((f.match(/<ConfirmPublish/g) ?? []).length, "un geste de l'annonce n'a plus de seconde question").toBe(2);
    const a = lire("src/app/desk/annonce/actions.ts");
    expect(a).toMatch(/audit\("annonce\.publie"/);
    expect(a).toMatch(/audit\("annonce\.retire"/);
  });
});
