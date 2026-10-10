import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LA LISTE DES PERSONNES D'UN DOSSIER APPROUVÉ.
 *
 * Qui écrit cette liste commande qui peut recevoir un accès : sans deux
 * regards ici, le contrôle de l'accès se contourne en une ligne. Et retirer
 * quelqu'un sans fermer son accès laisserait un ancien administrateur passer
 * des ordres sur un compte dont il ne répond plus : les deux gestes n'en
 * font qu'un, parce qu'on ne peut pas se souvenir de faire le second.
 */
const desk: Session = { userId: "d1", role: "responsable", name: "Georges", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };

vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, requireResponsable: async () => desk, authMode: () => "dev" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const lire = (p: string) => readFileSync(p, "utf8");

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

describe("retirer un signataire ferme son accès dans le même geste", () => {
  it("c'est tout le point de ce geste", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const f = (await r.listClientFiles()).find((x) => x.kind === "groupement")!;
    expect(f, "le jeu d'essai doit porter un compte à plusieurs mains").toBeTruthy();

    const { accorderAccesAction, retirerSignataireAction } = await import("./../app/desk/clients/acces-actions");
    const pose = await accorderAccesAction(null, form({ fileId: f.id, nom: "Esther Mballa", canal: "phone", valeur: "+237600000077" }));
    expect(pose.ok, pose.ok ? "" : pose.error).toBe(true);
    expect((await r.listAccesDuCompte(f.userId)).filter((a) => !a.revoqueLe)).toHaveLength(1);

    const retrait = await retirerSignataireAction(null, form({ fileId: f.id, nom: "Esther Mballa", motif: "a quitté l'assemblée" }));
    expect(retrait.ok, retrait.ok ? "" : retrait.error).toBe(true);
    // L'accès est fermé, et la personne a quitté la liste.
    expect((await r.listAccesDuCompte(f.userId)).filter((a) => !a.revoqueLe)).toHaveLength(0);
    expect((await r.getClientFile(f.id))!.persons.some((p) => p.name === "Esther Mballa")).toBe(false);
    // Ce qu'elle a fait reste à son nom : l'accès est révoqué, pas effacé.
    expect((await r.listAccesDuCompte(f.userId)).some((a) => a.nom === "Esther Mballa" && a.revoqueLe)).toBe(true);
  });

  it("et un motif est exigé, parce qu'un départ se justifie", async () => {
    const { retirerSignataireAction } = await import("./../app/desk/clients/acces-actions");
    const { repo } = await import("@/lib/data");
    const f = (await repo().listClientFiles()).find((x) => x.kind === "groupement")!;
    const v = await retirerSignataireAction(null, form({ fileId: f.id, nom: "Pascal Nkodo", motif: "" }));
    expect(v.ok).toBe(false);
  });
});

describe("ajouter un signataire demande deux regards et un acte", () => {
  it("l'acte est obligatoire : pas sur un appel téléphonique", async () => {
    const { ajouterSignataireAction } = await import("./../app/desk/clients/acces-actions");
    const { repo } = await import("@/lib/data");
    const f = (await repo().listClientFiles()).find((x) => x.kind === "groupement")!;
    const v = await ajouterSignataireAction(null, form({ fileId: f.id, nom: "Alice Ngo", role: "cotitulaire", birthDate: "1990-01-01", acte: "" }));
    expect(v.ok).toBe(false);
    expect((v as { error: string }).error).toContain("Citez l'acte");
  });

  it("la date de naissance aussi, pour les deux contrôles qui en dépendent", async () => {
    const { ajouterSignataireAction } = await import("./../app/desk/clients/acces-actions");
    const { repo } = await import("@/lib/data");
    const f = (await repo().listClientFiles()).find((x) => x.kind === "groupement")!;
    const v = await ajouterSignataireAction(null, form({ fileId: f.id, nom: "Alice Ngo", role: "cotitulaire", birthDate: "", acte: "PV du 3 octobre" }));
    expect(v.ok).toBe(false);
    expect((v as { error: string }).error).toContain("homonyme");
  });

  it("et le second regard est demandé, parce que cette liste commande les accès", () => {
    const a = lire("src/app/desk/clients/acces-actions.ts");
    const i = a.indexOf("export async function ajouterSignataireAction");
    const bloc = a.slice(i, a.indexOf("export async function retirerSignataireAction"));
    expect(bloc).toContain("quatreYeux(me,");
    expect(bloc).toContain("direLeGestePasseSeul");
    // Retirer se fait d'une main : c'est une restriction.
    expect(a.slice(a.indexOf("export async function retirerSignataireAction"), a.indexOf("export async function fixerPlafondAction"))).not.toContain("quatreYeux(");
  });

  it("un ajout n'est possible qu'après l'approbation : avant, c'est le client qui déclare", async () => {
    const { ajouterSignataireAction } = await import("./../app/desk/clients/acces-actions");
    const { repo } = await import("@/lib/data");
    const brouillon = (await repo().listClientFiles()).find((x) => x.status !== "approuve");
    if (!brouillon) return;
    const v = await ajouterSignataireAction(null, form({ fileId: brouillon.id, nom: "Alice Ngo", role: "representant", birthDate: "1990-01-01", acte: "PV" }));
    expect(v.ok).toBe(false);
  });
});

describe("et Santé veille à ce qu'aucun accès ne survive à sa personne", () => {
  it("le point existe, et il devrait toujours valoir zéro", () => {
    /* Il ne surveille pas le cas ordinaire : il surveille que la règle
       tient. Un accès qui survit à sa personne est un ancien administrateur
       qui passe encore des ordres, et rien d'autre ne le dirait. */
    const h = lire("src/lib/health.ts");
    expect(h).toContain('key: "acces-orphelins"');
    expect(h).toContain("!a.revoqueLe && !declares.has(a.nom)");
    expect(lire("src/lib/health-how.ts")).toContain('"acces-orphelins"');
  });
});
