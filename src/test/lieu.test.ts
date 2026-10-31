import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lieuDe, SIEGES } from "@/lib/domain/lieu";

describe("lieuDe : où l'on est, en un siège et une rubrique", () => {
  it("un siège seul quand la page est sa racine", () => {
    expect(lieuDe("/")).toEqual({ siege: "Accueil", rubrique: undefined });
    expect(lieuDe("/trader")?.siege).toBe("Trade");
    expect(lieuDe("/marche")?.siege).toBe("Marché");
    expect(lieuDe("/aide")?.siege).toBe("Aide");
  });
  it("la rubrique est la page du siège dont l'adresse est le plus long préfixe", () => {
    expect(lieuDe("/moi/documents/argent")).toEqual({ siege: "Accueil", rubrique: "Mes documents" });
    expect(lieuDe("/info/parcours")).toEqual({ siege: "Aide", rubrique: "Le parcours CEMAC" });
    expect(lieuDe("/info/parcours?section=a")).toEqual({ siege: "Aide", rubrique: "Le parcours CEMAC" });
  });
  it("le compte est un lieu à part, pas la possession", () => {
    expect(lieuDe("/moi/securite")).toEqual({ siege: "Compte", rubrique: "Sécurité" });
    expect(lieuDe("/moi/compte")).toEqual({ siege: "Compte", rubrique: undefined });
    expect(lieuDe("/moi/appareil")?.rubrique).toBe("Paramétrages");
  });
  it("contact et réclamation sont de l'aide, pas de l'accueil, bien qu'ils vivent sous /moi", () => {
    expect(lieuDe("/moi/contact")?.siege).toBe("Aide");
    expect(lieuDe("/moi/reclamation")?.siege).toBe("Aide");
  });
  it("une fiche dit la liste d'où elle vient", () => {
    expect(lieuDe("/offres/ota-gabon")?.siege).toBe("Trade");
    expect(lieuDe("/offres/fund-x")?.rubrique).toBe("Fonds");
  });
  it("la connexion n'a pas de lieu", () => {
    expect(lieuDe("/connexion")).toBeNull();
    expect(lieuDe("/connexion/mfa")).toBeNull();
  });
  it("les quatre sièges portent les mots du dock", () => {
    /* Deux copies d'un mot : celle du dock (MobileShell) et celle de la bande.
       Elles se lisent côte à côte à l'écran, et ne doivent jamais diverger. */
    const dock = readFileSync("src/components/mobile/MobileShell.tsx", "utf8");
    for (const mot of [SIEGES.accueil, SIEGES.trade, SIEGES.marche, SIEGES.aide]) expect(dock, `le dock ne dit plus « ${mot} »`).toContain(["label:", " t", '("', mot, '")'].join(""));
  });
});
