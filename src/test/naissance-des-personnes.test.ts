import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ClientFile } from "@/lib/domain/kyc";
import { missingForApproval } from "@/lib/kyc/checklist";
import { namesToScreen, personnesAScreener } from "@/lib/kyc/screening";
import { personnesDuDossier } from "@/lib/desk/registre-data";
import { correspondances, type Ecarte } from "@/lib/domain/registre-ecartes";

/**
 * LA DATE DE NAISSANCE DES PERSONNES DÉCLARÉES.
 *
 * Un nom seul ne distingue personne, et deux contrôles tournaient à vide
 * sur la personne même qui agit pour le titulaire : le contrôle sanctions,
 * dont le champ de notes demande pourtant d'écarter l'homonymie « date de
 * naissance comparée », et le registre des personnes écartées, dont la
 * ressemblance est la seule prise qui survive à une pièce neuve.
 */
const dossier = (over: Partial<ClientFile> = {}): ClientFile => ({
  id: "f1",
  userId: "u1",
  kind: "morale",
  status: "soumis",
  identity: { name: "Société de démonstration SARL", registration: "RC/YAO/2020/B/1234" },
  persons: [{ role: "representant", name: "Jean-Pierre Onana", birthDate: "1984-03-12", idNumber: "123456789" }],
  documents: [],
  funds: { pep: false },
  profile: { category: "non_professionnel" },
  consents: {},
  review: {},
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

describe("le contrôle sanctions reçoit ce qui distingue d'un homonyme", () => {
  it("la date part avec le nom", () => {
    const p = personnesAScreener(dossier());
    expect(p).toEqual([{ nom: "Société de démonstration SARL", naissance: undefined }, { nom: "Jean-Pierre Onana", naissance: "1984-03-12" }]);
  });

  it("et la requête la porte, sauf pour la personne morale qui n'en a pas", () => {
    const src = readFileSync("src/lib/kyc/screening.ts", "utf8");
    expect(src).toContain("birthDate: [p.naissance]");
    // Une société n'a pas de date de naissance : son schéma n'a pas ce champ.
    expect(src).toContain("!morale && p.naissance");
  });

  it("les noms restent ce qu'ils étaient, pour les listes consultées à la main", () => {
    expect(namesToScreen(dossier())).toEqual(["Société de démonstration SARL", "Jean-Pierre Onana"]);
  });
});

describe("le registre peut enfin accrocher par ressemblance", () => {
  const ecarte: Ecarte = { id: "e1", nom: "Jean-Pierre Onana", naissance: "1984-03-12", pieceType: "CNI", pieceNumero: "999999999", motif: "fraude_averee", par: "Georges", le: "2026-10-01T00:00:00.000Z" };

  it("un représentant revenu avec une pièce neuve est vu", () => {
    /* C'était le trou : sa seule prise était le numéro, c'est à dire celle
       que changer de pièce annule. */
    const hits = correspondances([ecarte], personnesDuDossier(dossier()), new Date("2026-10-10T12:00:00.000Z"));
    expect(hits).toHaveLength(1);
    expect(hits[0].niveau).toBe("ressemblance");
    expect(hits[0].personne.role).toBe("représentant");
  });

  it("et sans la date, il ne l'était pas", () => {
    const sansDate = dossier({ persons: [{ role: "representant", name: "Jean-Pierre Onana", idNumber: "123456789" }] });
    expect(correspondances([ecarte], personnesDuDossier(sansDate), new Date("2026-10-10T12:00:00.000Z"))).toHaveLength(0);
  });
});

describe("elle est obligatoire, et son absence se voit", () => {
  it("le formulaire l'exige", () => {
    const src = readFileSync("src/app/ouvrir-un-compte/Sections.tsx", "utf8");
    expect(src).toContain('<input type="date" name="birthDate" required />');
    const actions = readFileSync("src/app/ouvrir-un-compte/actions.ts", "utf8");
    expect(actions).toContain("birthDate: z.string().trim().regex(");
    // Le refus nomme le champ manquant, sinon le client cherche.
    expect(actions).toContain("la date de naissance sont obligatoires");
  });

  it("et un dossier plus ancien ne passe pas en approbation sans elle", () => {
    const sansDate = dossier({ persons: [{ role: "representant", name: "Jean-Pierre Onana", idNumber: "123456789" }] });
    expect(missingForApproval(sansDate).join(" · ")).toContain("date de naissance de Jean-Pierre Onana");
    expect(missingForApproval(dossier()).join(" · ")).not.toContain("date de naissance de");
  });
});
