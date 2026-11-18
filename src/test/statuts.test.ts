import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";
import { lignesRetenues, messageDe, STATUTS_MAX, statutsAffiches, verifierMessage, MESSAGE_PAR_DEFAUT, type StatutLigne } from "@/lib/domain/statuts";

/**
 * LES STATUTS : le desk choisit les lignes (huit au plus), leur ordre et le message de la première page ; chaque geste est à l'audit, rien ne s'efface
 * (17 novembre 2026, planche « Accueil et insights », idée 1).
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

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("le message de la première page", () => {
  it("refuse un conseil, une promesse, une urgence, un texte trop court ou trop long", () => {
    expect(verifierMessage("Court")).toBeTruthy();
    expect(verifierMessage("Profitez de la meilleure séance de l'année")).toBeTruthy();
    expect(verifierMessage("Dernière chance pour souscrire cette semaine")).toBeTruthy();
    expect(verifierMessage("x".repeat(161))).toBeTruthy();
    expect(verifierMessage("Les lignes que le bureau retient cette semaine.")).toBeUndefined();
  });
  it("a un message par défaut quand le desk n'a rien écrit", () => {
    expect(messageDe([])).toBe(MESSAGE_PAR_DEFAUT);
  });
});

describe("les statuts sur le dépôt mémoire", () => {
  it("une ligne entre, se déplace, se retire sans s'effacer, et chaque geste est à l'audit", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerStatuts } = await import("@/lib/statuts");
    const { repo } = await import("@/lib/data");
    const offres = (await repo().listOffers()).filter((o) => !o.hidden && o.status !== "withdrawn").slice(0, 3);
    expect(offres.length).toBeGreaterThanOrEqual(3);
    for (const o of offres) await aboutit(() => a.ajouterStatutAction(form({ offerId: o.id })));
    let retenues = lignesRetenues(await listerStatuts());
    expect(retenues.map((l) => l.offerId), "l'ordre d'ajout n'est pas celui de la rangée").toEqual(offres.map((o) => o.id));

    await aboutit(() => a.deplacerStatutAction(form({ offerId: offres[2].id, sens: "haut" })));
    retenues = lignesRetenues(await listerStatuts());
    expect(retenues.map((l) => l.offerId), "la ligne n'a pas monté d'un rang").toEqual([offres[0].id, offres[2].id, offres[1].id]);

    await aboutit(() => a.retirerStatutAction(form({ offerId: offres[2].id })));
    const toutes = (await listerStatuts()).filter((x): x is StatutLigne => x.kind === "ligne");
    expect(toutes, "une ligne a été effacée au lieu d'être retirée").toHaveLength(3);
    const retiree = toutes.find((l) => l.offerId === offres[2].id)!;
    expect(retiree.retireeLe).toBeTruthy();
    expect(retiree.retireePar).toBe("Op Test");
    expect(lignesRetenues(toutes).map((l) => l.offerId)).toEqual([offres[0].id, offres[1].id]);

    const actions = (await repo().listAudit({ entity: "statut", limit: 50 })).map((x) => x.action);
    for (const attendu of ["statut.ajoute", "statut.deplace", "statut.retire"]) expect(actions, `${attendu} n'est pas à l'audit`).toContain(attendu);
  });

  it("refuse la neuvième ligne et une ligne que le client ne peut pas lire", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerStatuts } = await import("@/lib/statuts");
    const { repo } = await import("@/lib/data");
    const offres = (await repo().listOffers()).filter((o) => !o.hidden && o.status !== "withdrawn");
    expect(STATUTS_MAX, "la rangée n'est plus bornée à huit").toBe(8);
    for (const o of offres.slice(0, STATUTS_MAX + 2)) await aboutit(() => a.ajouterStatutAction(form({ offerId: o.id })));
    expect(lignesRetenues(await listerStatuts()).length, "plus de huit lignes dans la rangée").toBeLessThanOrEqual(STATUTS_MAX);
    const r = await aboutit(() => a.ajouterStatutAction(form({ offerId: "n-existe-pas" })));
    expect(JSON.stringify(r)).toContain("refus=ligne");
  });

  it("le message s'écrit, remplace le précédent et garde l'avant à l'audit", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerStatuts } = await import("@/lib/statuts");
    const { repo } = await import("@/lib/data");
    await aboutit(() => a.publierMessageAction(null, form({ texte: "Trois lignes ouvertes cette semaine." })));
    await aboutit(() => a.publierMessageAction(null, form({ texte: "Deux lignes ferment jeudi à midi." })));
    expect(messageDe(await listerStatuts())).toBe("Deux lignes ferment jeudi à midi.");
    const refuse = (await aboutit(() => a.publierMessageAction(null, form({ texte: "Ne manquez pas cette séance" })))) as { ok: boolean };
    expect(refuse.ok).toBe(false);
    const audits = (await repo().listAudit({ entity: "statut", limit: 50 })).filter((x) => x.action === "statut.message");
    expect(audits.length).toBeGreaterThanOrEqual(2);
    expect(audits.some((x) => JSON.stringify(x.before).includes("Trois lignes"))).toBe(true);
  });
});

describe("ce que le client voit", () => {
  it("une ligne retirée du catalogue sort de la rangée, sans que le desk ait rien à faire", () => {
    const l = (offerId: string, position: number): StatutLigne => ({ kind: "ligne", id: `l-${offerId}`, offerId, position, ajouteePar: "x", ajouteeLe: "2026-11-17T08:00:00Z" });
    const visibles = [{ id: "a" }, { id: "c" }] as never[];
    expect(statutsAffiches([l("a", 1), l("b", 2), l("c", 3)], visibles).map((x) => x.ligne.offerId)).toEqual(["a", "c"]);
  });
});

describe("la place des statuts", () => {
  const lire = (f: string) => readFileSync(f, "utf8");
  it("ouvrent le chapitre du marché de l'Accueil et se taisent sans ligne", () => {
    const t = lire("src/components/accueil/TuilesDuHaut.tsx");
    expect(t).toMatch(/\{aDesStatuts && <Statuts message=\{statuts\.message\} items=\{statuts\.items\} \/>\}/);
    expect(t, "le chapitre se rend vide quand il n'y a rien").toMatch(/if \(!aDuDesk && !aEcheances && !aDesStatuts\) return null;/);
  });
  it("la première page est le message sur le logo, chaque ligne a « Voir la fiche » et « Passer un ordre »", () => {
    const s = lire("src/components/statuts/Statuts.tsx");
    expect(s).toMatch(/t\("Voir la fiche"\)/);
    expect(s).toMatch(/t\("Passer un ordre"\)/);
    expect(s).toMatch(/\{it\.ordre && \(/);
    expect(lire("src/components/statuts/Statuts.module.css")).toMatch(/url\("\/icons\/icon-512\.png"\)/);
  });
  it("rien ne défile seul : ni minuterie ni compte à rebours dans la visionneuse", () => {
    expect(lire("src/components/statuts/Statuts.tsx")).not.toMatch(/setInterval|setTimeout/);
  });
  it("le desk les atteint par un onglet, et chaque geste passe par l'audit et la seconde question", () => {
    expect(lire("src/lib/desk-groupes.ts")).toMatch(/\["\/desk\/statuts", "Statuts"\]/);
    const a = lire("src/app/desk/statuts/actions.ts");
    for (const g of ["statut.ajoute", "statut.retire", "statut.deplace", "statut.message"]) expect(a).toContain(`audit("${g}"`);
    const g = lire("src/app/desk/statuts/Gestion.tsx");
    expect((g.match(/<ConfirmPublish/g) ?? []).length, "un geste des statuts n'a plus de seconde question").toBe(2);
  });
});
