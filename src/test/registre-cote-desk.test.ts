import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";
import type { Ecarte } from "@/lib/domain/registre-ecartes";

/**
 * LE REGISTRE CÔTÉ DESK : CE QU'IL LUI MANQUAIT.
 *
 * Il savait arrêter un dossier EN COURS, c'est à dire le cas le moins
 * probable. On inscrit quelqu'un au registre PARCE QUE quelque chose s'est
 * passé, et ce quelqu'un est le plus souvent déjà client : écarter un
 * client en activité ne déclenchait rien, et son compte continuait de
 * tourner. Et le bandeau ne se levant que sur un dossier, on ne pouvait pas
 * chercher un nom au moment le plus utile, avant qu'un dossier existe.
 */
const desk: Session = { userId: "d1", role: "responsable", name: "Georges", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };

vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, requireResponsable: async () => desk, authMode: () => "dev" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const lire = (p: string) => readFileSync(p, "utf8");
const MAINTENANT = new Date("2026-10-11T12:00:00.000Z");

/* Esther Mballa est cotitulaire du compte APPROUVÉ du jeu d'essai : c'est
   exactement le cas que le registre ne voyait pas. */
const ecarte = (over: Partial<Ecarte> = {}): Ecarte => ({
  id: "e-essai",
  nom: "Esther Mballa",
  naissance: "1981-07-19",
  pieceType: "CNI",
  pieceNumero: "551234987",
  motif: "fraude_averee",
  par: "Georges",
  le: "2026-10-11T09:00:00.000Z",
  ...over,
});

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("une publication dit qui elle toucherait", () => {
  it("y compris un compte déjà ouvert, et il passe devant", async () => {
    const { dossiersQuiAccrochent } = await import("@/lib/desk/registre-data");
    const touches = await dossiersQuiAccrochent([ecarte()], MAINTENANT);
    expect(touches.length).toBeGreaterThan(0);
    expect(touches[0].f.identity.name).toBe("Tontine Essos Solidarité");
    expect(touches[0].f.status).toBe("approuve");
    expect(touches[0].hits[0].niveau).toBe("correspondance");
  });

  it("rien à publier, rien à chercher : la lecture ne se paie pas pour rien", async () => {
    const { dossiersQuiAccrochent } = await import("@/lib/desk/registre-data");
    expect(await dossiersQuiAccrochent([], MAINTENANT)).toEqual([]);
  });

  it("et l'écran dit que l'inscription seule ne suffit pas", () => {
    /* Elle ferme la porte d'entrée, pas celle qui est déjà franchie : il
       faut encore une mesure, ou le retrait de l'accès de la personne. */
    const p = lire("src/app/desk/referentiel/registre/page.tsx");
    expect(p).toContain("Ce que la publication toucherait");
    expect(p).toContain("pas celle qui est déjà franchie");
    expect(p).toContain('f.status === "approuve" ? <span className="st annulee">');
  });
});

describe("chercher un nom sans dossier sous la main", () => {
  it("par le nom, accents et casse ignorés", async () => {
    const { chercherAuRegistre } = await import("@/lib/desk/registre-data");
    const { repo } = await import("@/lib/data");
    const { REF } = await import("@/lib/reference");
    await repo().saveReferenceDraft(REF.ecartes, "e-cherche", { op: "set", data: ecarte({ id: "e-cherche", nom: "Jean-Pierre ONANA" }) }, "Georges");
    await repo().publishReference(REF.ecartes, ["e-cherche"]);
    expect((await chercherAuRegistre("onana")).map((e) => e.id)).toContain("e-cherche");
    expect((await chercherAuRegistre("ONANA")).map((e) => e.id)).toContain("e-cherche");
  });

  it("par le numéro de pièce, ponctuation ignorée", async () => {
    const { chercherAuRegistre } = await import("@/lib/desk/registre-data");
    expect((await chercherAuRegistre("551 234 987")).map((e) => e.id)).toContain("e-cherche");
  });

  it("une requête trop courte ne renvoie pas tout le registre", async () => {
    /* « a » ramènerait tout le monde, et une liste de gens écartés qui
       s'affiche sur une frappe est exactement ce qu'on ne veut pas. */
    const { chercherAuRegistre } = await import("@/lib/desk/registre-data");
    expect(await chercherAuRegistre("a")).toEqual([]);
    expect(await chercherAuRegistre("")).toEqual([]);
  });
});

describe("Santé voit maintenant les comptes ouverts", () => {
  it("il ne regardait que les dossiers en cours, c'est à dire le cas le moins probable", () => {
    const h = lire("src/lib/health.ts");
    const i = h.indexOf('key: "registre-ecartes"');
    const bloc = h.slice(h.indexOf("const accroches", i - 2000), i);
    // Plus de filtre sur le statut avant de chercher les correspondances.
    expect(bloc).toContain("dossiers\n    .map((f) => ({ f, hits: correspondances(");
    expect(h).toContain('x.f.status === "approuve"');
    // Et le compte ouvert passe devant dans la phrase.
    expect(h).toContain("compte(s) OUVERT(S) accrochant le registre");
  });
});
