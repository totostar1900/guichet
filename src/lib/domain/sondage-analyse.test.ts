import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ageEnJours, analyserGroupe, demandesDuGroupe, ENTETES_D_EXPORT, lignesDExport, minimum, repartitionDesTaux, versReponse } from "./sondage-analyse";
import { consensus, mur } from "./sondage";
import { DESK_GROUPS } from "../desk-groupes";
import type { Country, LigneSondee } from "./types";

const ligne = (id: string, o: Partial<LigneSondee> = {}): LigneSondee => ({
  id,
  ref: `SD-${id}`,
  origine: "client",
  userId: `u-${id}`,
  clientName: `Client ${id}`,
  clientSegment: "Personne morale",
  instrument: "OTA",
  country: "Cameroun" as Country,
  tenor: "5 ans",
  rate: 6.1,
  pricePct: 97,
  montant: 100_000_000,
  dansJours: 10,
  state: "ouverte",
  createdAt: "2026-11-01T08:00:00Z",
  updatedAt: "2026-11-01T08:00:00Z",
  ...o,
});

const TROIS = [ligne("a", { rate: 6.1, pricePct: 97, montant: 250_000_000 }), ligne("b", { rate: 6.4, pricePct: 96.5, montant: 120_000_000, updatedAt: "2026-11-08T08:00:00Z" }), ligne("c", { rate: 6.75, pricePct: undefined, montant: 50_000_000 })];

describe("l'analyse d'un sondage", () => {
  const groupes = consensus(TROIS);
  const analyse = () => analyserGroupe(groupes[0], demandesDuGroupe(TROIS, groupes[0].cle), undefined, new Map(), mur(groupes[0]));

  it("donne le taux minimal, moyen (pondéré par les montants) et maximal, et le prix minimal", () => {
    const a = analyse();
    expect(a.tauxMin).toBe(6.1);
    expect(a.tauxMax).toBe(6.75);
    expect(a.tauxMoyen).toBeCloseTo(groupes[0].niveau as number, 9);
    expect(a.prixMin).toBe(96.5);
  });

  it("reprend le ferme et le possible du consensus, sans les recalculer", () => {
    const a = analyse();
    expect(a.ferme).toBe(groupes[0].ferme);
    expect(a.possible).toBe(groupes[0].montant);
    expect(a.clientsFermes).toBe(groupes[0].clientsFermes);
  });

  it("le possible dépasse le ferme quand un client propose des alternatives : l'analyse garde les deux, sans les confondre", () => {
    const alt = ["Cameroun", "Gabon"].map((p, i) => ligne(`alt${i}`, { userId: "u-alt", familleId: "f1", country: p as Country, montant: 50_000_000 }));
    const g = consensus(alt)[0];
    expect(g.montant).toBeGreaterThan(g.ferme);
    const a = analyserGroupe(g, demandesDuGroupe(alt, g.cle), undefined, new Map(), false);
    expect(a.possible).toBe(g.montant);
    expect(a.ferme).toBe(g.ferme);
    expect(a.possible).toBeGreaterThan(a.ferme);
  });

  it("dit l'origine : des demandes de clients, ou les réponses à une question du desk", () => {
    expect(analyse().origine).toBe("clients");
    const q = ligne("q", { origine: "desk", userId: undefined, clientName: undefined, montant: 500_000_000 });
    const reps = TROIS.map((l) => ({ ...l, repondA: "q" }));
    const g = consensus([q, ...reps])[0];
    const a = analyserGroupe(g, demandesDuGroupe([q, ...reps], g.cle), q, new Map(), mur(g));
    expect(a.origine).toBe("desk");
    expect(a.refDesk).toBe("SD-q");
    expect(a.cherche).toBe(500_000_000);
  });

  it("la fraîcheur est la date de la dernière réponse, et son âge en jours", () => {
    expect(analyse().derniere).toBe("2026-11-08T08:00:00Z");
    expect(ageEnJours("2026-11-08T08:00:00Z", "2026-11-12")).toBe(4);
    expect(ageEnJours(undefined, "2026-11-12")).toBeUndefined();
    expect(ageEnJours("2026-11-20T00:00:00Z", "2026-11-12")).toBe(0);
  });

  it("chaque réponse porte son client, son segment, son montant, son taux, son prix et son prêt le", () => {
    const r = versReponse(TROIS[0], new Map([["a", "modifiée le 3 nov."]]));
    expect(r).toMatchObject({ client: "Client a", segment: "Personne morale", montant: 250_000_000, taux: 6.1, prix: 97, preteLe: "2026-11-11", modifiee: "modifiée le 3 nov." });
  });

  it("une demande close ou une question du desk ne compte pas dans les demandes d'un groupe", () => {
    const close = ligne("x", { state: "close" });
    const q = ligne("q", { origine: "desk" });
    expect(demandesDuGroupe([...TROIS, close, q], groupes[0].cle).map((l) => l.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("la répartition du taux demandé", () => {
  it("range les montants en classes égales de l'étendue lue, sans rien perdre", () => {
    const c = repartitionDesTaux(TROIS);
    expect(c).toHaveLength(4);
    expect(c.reduce((s, x) => s + x.montant, 0)).toBe(420_000_000);
    expect(c.reduce((s, x) => s + x.clients, 0)).toBe(3);
    expect(c[0].de).toBe(6.1);
    expect(c[3].a).toBe(6.75);
  });
  it("des taux tous égaux se rangent en une seule classe ; sans taux, rien", () => {
    expect(repartitionDesTaux([ligne("a"), ligne("b")])).toEqual([{ de: 6.1, a: 6.1, montant: 200_000_000, clients: 2 }]);
    expect(repartitionDesTaux([ligne("a", { rate: undefined })])).toEqual([]);
  });
  it("le minimum ignore ce qui manque", () => {
    expect(minimum([6.4, undefined, 6.1])).toBe(6.1);
    expect(minimum([undefined])).toBeUndefined();
  });
});

describe("le fichier d'analyse", () => {
  it("une ligne par réponse, avec la nature, la question à laquelle elle répond et les coordonnées du client", () => {
    const q = ligne("q", { origine: "desk", userId: undefined, clientName: undefined });
    const rep = ligne("r", { repondA: "q" });
    const toutes = [q, rep, ligne("s")];
    const rows = lignesDExport(toutes, new Map(toutes.map((l) => [l.id, l])));
    expect(rows).toHaveLength(3);
    expect(ENTETES_D_EXPORT).toHaveLength(rows[0].length);
    expect(rows[0][1]).toBe("question du desk");
    expect(rows[1].slice(1, 3)).toEqual(["réponse à une question", "SD-q"]);
    expect(rows[2][1]).toBe("demande de client");
    expect(rows[1][6]).toBe("Client r");
    expect(rows[1][9]).toBe("6,10");
  });
});

describe("annonces et sondages dans « La journée » (planche « Annonces », choix 1B, 2A, 3A)", () => {
  const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");

  it("« À la une » et « Sondages » sont deux onglets de « La journée » ; « Sondage » a quitté « Le marché »", () => {
    const journee = DESK_GROUPS.find((g) => g.label === "La journée")!.tabs.map(([h]) => h);
    expect(journee).toEqual(expect.arrayContaining(["/desk/a-la-une", "/desk/sondage"]));
    expect(DESK_GROUPS.find((g) => g.label === "Le marché")!.tabs.map(([h]) => h)).not.toContain("/desk/sondage");
  });

  it("« À la une » a sa page et n'est plus un panneau du Carnet", () => {
    expect(lire("app/desk/a-la-une/page.tsx")).toMatch(/<FeaturePanel active=\{featActive\}/);
    expect(lire("app/desk/page.tsx")).not.toMatch(/FeaturePanel/);
    expect(lire("app/desk/today/today.ts")).toMatch(/href: "\/desk\/a-la-une"/);
  });

  it("le tableau de ce qui s'accumule est riche et a son volet, les questions ouvertes ont leur tableau avec « Clore »", () => {
    const acc = lire("app/desk/sondage/Accumulation.tsx");
    for (const mot of ["Origine", "Taux min · moyen · max", "Prix min", "Dernière réponse", "Répartition du taux demandé", "Exporter ce sondage en CSV"]) expect(acc).toContain(mot);
    expect(lire("app/desk/sondage/Questions.tsx")).toMatch(/<Statuer id=\{q\.id\}/);
    expect(lire("app/desk/sondage/export/route.ts")).toMatch(/isDesk\(s\)/);
  });
});
