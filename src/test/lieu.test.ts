import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lieuDe, SIEGES } from "@/lib/domain/lieu";

describe("lieuDe : où l'on est, en un siège et une rubrique", () => {
  it("un siège seul quand la page est sa racine", () => {
    expect(lieuDe("/")).toEqual({ siege: "Accueil", rubrique: undefined });
    expect(lieuDe("/trader")?.siege).toBe("Activité");
    expect(lieuDe("/marche")?.siege).toBe("Marché");
    expect(lieuDe("/aide")?.siege).toBe("Aide");
  });
  it("sur la racine d'un siège, la bande ne redit pas le siège par une rubrique", () => {
    for (const r of ["/trader", "/marche", "/aide"]) expect(lieuDe(r)?.rubrique, `« ${r} » est la racine de son siège : pas de rubrique`).toBeUndefined();
    // Non-vacuité : une page qui n'est pas une racine garde la sienne.
    expect(lieuDe("/titres")?.rubrique).toBeTruthy();
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
    expect(lieuDe("/offres/ota-gabon")?.siege).toBe("Investir");
    expect(lieuDe("/offres/fund-x")).toEqual({ siege: "Investir", rubrique: "Fonds" });
  });
  it("Trade ne garde que sa page : les trois familles sont du siège « Investir »", () => {
    for (const p of ["/titres", "/fonds", "/calendrier"]) expect(lieuDe(p)?.siege, p).toBe("Investir");
    expect(lieuDe("/titres")?.rubrique).toBe("Titres");
    expect(lieuDe("/calendrier")?.rubrique).toBe("Adjudications");
  });
  it("la connexion n'a pas de lieu", () => {
    expect(lieuDe("/connexion")).toBeNull();
    expect(lieuDe("/connexion/mfa")).toBeNull();
  });
  it("les cinq sièges portent les mots du dock", () => {
    /* Deux copies d'un mot : celle du dock (MobileShell) et celle de la bande.
       Elles se lisent côte à côte à l'écran, et ne doivent jamais diverger. */
    const dock = readFileSync("src/components/mobile/MobileShell.tsx", "utf8");
    for (const mot of [SIEGES.accueil, SIEGES.trade, SIEGES.investir, SIEGES.marche, SIEGES.aide]) expect(dock, `le dock ne dit plus « ${mot} »`).toContain(["label:", " t", '("', mot, '")'].join(""));
  });
});
