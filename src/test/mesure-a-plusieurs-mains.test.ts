import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CAUSES_DE_RETRAIT, direLeRetrait, estCauseDeRetrait } from "@/lib/domain/acces-nomme";
import type { Session } from "@/lib/auth/types";

/**
 * UNE MESURE VIT SUR LE COMPTE, DONC ELLE FRAPPE TOUTES LES MAINS.
 *
 * C'est juste quand le manquement est un fait du compte : un ordre servi et
 * non réglé est un manquement de la tontine, pas d'un de ses trois membres.
 * C'est faux quand le problème est UNE personne : suspendre punirait deux
 * innocents et leur apprendrait qu'il se passe quelque chose, ce que le
 * silence de la conformité cherche précisément à éviter.
 *
 * L'outil par personne est le retrait de son accès, et il mérite la même
 * rigueur qu'une mesure : une cause fermée, et une phrase pour l'intéressé.
 */
const desk: Session = { userId: "d1", role: "responsable", name: "Georges", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };

vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, requireResponsable: async () => desk, authMode: () => "dev" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const lire = (p: string) => readFileSync(p, "utf8");
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("la mesure reste sur le compte, et l'écran le dit", () => {
  it("elle est lue et appliquée pour le COMPTE, pas pour la personne qui agit", () => {
    /* C'est voulu : le client est le compte. Mais il fallait que le desk le
       sache avant de suspendre une tontine pour un seul de ses membres. */
    expect(lire("src/lib/garde.ts")).toContain("r.getContact(s.userId)");
    expect(lire("src/app/Console.tsx")).toContain("r.getContact(session.userId)");
  });

  it("et le formulaire avertit qu'elle arrête toutes les mains", () => {
    const f = lire("src/app/desk/clients/MesureForm.tsx");
    expect(f).toContain("plusieursMains");
    expect(f).toContain("les arrête toutes, et toutes la lisent");
    // Et il nomme l'outil par personne, plutôt que de laisser chercher.
    expect(f).toContain("retirez son accès plus bas");
    expect(lire("src/app/desk/clients/page.tsx")).toContain('plusieursMains={selected.kind !== "physique"}');
  });
});

describe("l'outil par personne : le retrait, avec sa cause", () => {
  it("quatre causes fermées, dont une seule est muette", () => {
    expect(Object.keys(CAUSES_DE_RETRAIT).sort()).toEqual(["demande_du_titulaire", "quitte", "remplace", "verification"]);
    const muettes = Object.entries(CAUSES_DE_RETRAIT).filter(([, v]) => v.conformite).map(([k]) => k);
    expect(muettes).toEqual(["verification"]);
    expect(estCauseDeRetrait("quitte")).toBe(true);
    expect(estCauseDeRetrait("il_me_deplait")).toBe(false);
  });

  it("une cause libre est refusée : elle ne serait pas contestable", async () => {
    const { revoquerAccesAction } = await import("./../app/desk/clients/acces-actions");
    const { repo } = await import("@/lib/data");
    const f = (await repo().listClientFiles()).find((x) => x.kind === "groupement")!;
    const v = await revoquerAccesAction(null, form({ fileId: f.id, accesId: "peu-importe", cause: "parce-que", motif: "une raison" }));
    expect(v.ok).toBe(false);
    expect((v as { error: string }).error).toContain("une cause qui se réécrit");
  });

  it("et retirer un signataire emporte l'accès avec la bonne cause", () => {
    expect(lire("src/app/desk/clients/acces-actions.ts")).toContain('revoquerAcces(a.id, me.name, `Retiré du dossier : ${motif}`, "quitte")');
  });
});

describe("la personne apprend qu'on lui a retiré son accès", () => {
  it("sinon elle croit à une panne, et n'a plus de compte où se plaindre", () => {
    const dit = direLeRetrait("quitte", "Tontine Essos Solidarité", "2026-10-11T09:00:00.000Z");
    expect(dit).toContain("Tontine Essos Solidarité");
    expect(dit).toContain("2026-10-11");
    expect(dit).toContain("Vos fonctions ont pris fin");
    expect(dit).toContain("écrivez-nous");
  });

  it("mais la conformité ne dit jamais son nom", () => {
    const dit = direLeRetrait("verification", "Tontine Essos Solidarité", "2026-10-11T09:00:00.000Z");
    expect(dit).toContain("a été retiré le 2026-10-11");
    // Ni le mot, ni rien qui le laisse deviner.
    expect(dit).not.toMatch(/vérification|conformité|soupçon/i);
  });

  it("et la session porte le retrait sans basculer le compte", () => {
    /* Elle reste chez elle : on ne la met pas sur un compte dont on vient de
       lui retirer la clef. */
    const a = lire("src/lib/auth/index.ts");
    expect(a).toContain("accesRetire:");
    const i = a.indexOf("if (acces.revoqueLe) {");
    const branche = a.slice(i, a.indexOf("\n    }", i));
    expect(branche).toContain("return { ...s, accesRetire:");
    expect(branche).not.toContain("userId: acces.compteUserId");
    expect(lire("src/app/Console.tsx")).toContain("direLeRetrait(session.accesRetire.cause");
  });

  it("la note libre du desk ne lui parvient jamais", () => {
    /* La cause dit le genre et se montre ; la note dit le cas et reste au
       desk. Les confondre ferait lire « soupçon de fraude » à l intéressé. */
    const d = lire("src/lib/domain/acces-nomme.ts");
    expect(d.slice(d.indexOf("export function direLeRetrait"))).not.toContain("revoqueMotif");
  });
});
