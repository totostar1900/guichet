import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chronologieDeLOrdre } from "@/lib/domain/chronologie-ordre";
import type { Intent } from "@/lib/domain/types";

const lire = (f: string) => readFileSync(f, "utf8");
const ordre = (o: Partial<Intent>): Intent => ({ id: "i", ref: "R", offerId: "o", offerVersion: 1, clientName: "C", clientSegment: "", type: "achat", channel: "E-mail", state: "recue", createdAt: "2027-03-01T09:00:00Z", updatedAt: "2027-03-01T09:00:00Z", ...o }) as Intent;

/**
 * LA CHRONOLOGIE D'UN ORDRE, POUR LE DESK SEUL (15 novembre 2026) : le desk lit toutes les dates ; le client n'en lit aucune de cette liste.
 */
describe("la chronologie d'un ordre", () => {
  it("une demande reçue ne porte que sa demande", () => {
    expect(chronologieDeLOrdre(ordre({})).map((e) => e.cle)).toEqual(["demande"]);
  });

  it("chaque passage atteint s'écrit dans l'ordre, avec sa date", () => {
    const e = chronologieDeLOrdre(ordre({ state: "reglee", signedAt: "2027-03-01T09:05:00Z", signedMethod: "code", coveredAt: "2027-03-01T09:05:00Z", coveredAmount: 250000, confirmedAt: "2027-03-01T10:00:00Z", transmittedAt: "2027-03-01T11:00:00Z", servedAt: "2027-03-02T09:00:00Z", settledAt: "2027-03-04T15:00:00Z", valueOn: "2027-03-05" }));
    expect(e.map((x) => x.cle)).toEqual(["demande", "signature", "couverture", "confirmation", "transmission", "execution", "reglement"]);
    expect(e.find((x) => x.cle === "signature")!.detail).toEqual({ texte: "par code" });
    expect(e.find((x) => x.cle === "couverture")!.detail?.vars?.m).toMatch(/250/);
    expect(e.find((x) => x.cle === "reglement")!.detail).toEqual({ texte: "règlement-livraison le {d}", vars: { d: "2027-03-05" } });
  });

  it("un passage atteint sans date enregistrée le dit au lieu d'en inventer une", () => {
    const e = chronologieDeLOrdre(ordre({ state: "reglee" }));
    expect(e.map((x) => x.cle)).toEqual(["demande", "confirmation", "transmission", "execution", "reglement"]);
    for (const x of e.filter((y) => y.cle !== "demande")) expect(x.le, `${x.cle} porte une date inventée`).toBeUndefined();
  });

  it("une clôture se nomme selon l'état : non servie ou annulée", () => {
    expect(chronologieDeLOrdre(ordre({ state: "non_servie", closedAt: "2027-03-03T09:00:00Z" })).at(-1)).toMatchObject({ cle: "cloture", libelle: "Non servie" });
    expect(chronologieDeLOrdre(ordre({ state: "annulee", closedAt: "2027-03-03T09:00:00Z" })).at(-1)).toMatchObject({ cle: "cloture", libelle: "Annulée" });
  });

  it("une annulation sans passage dans le parcours n'invente ni confirmation ni transmission", () => {
    expect(chronologieDeLOrdre(ordre({ state: "annulee" })).map((x) => x.cle)).toEqual(["demande", "cloture"]);
  });
});

describe("le desk lit la chronologie, le client n'en lit aucun champ", () => {
  it("la fiche de l'ordre au desk affiche la chronologie, étiquetée desk seulement", () => {
    const p = lire("src/app/desk/intentions/[id]/page.tsx");
    expect(p).toMatch(/chronologieDeLOrdre\(it\)\.map/);
    expect(p).toMatch(/t\("desk seulement"\)/);
    expect(p).toMatch(/t\("date non enregistrée"\)/);
  });

  const racine = join(__dirname, "../..", "src");
  const fichiers = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return fichiers(p);
      return /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
    });
  /* Les mêmes mots existent sur d'autres objets (un versement de provision a un « closedAt », un tirage de prélèvement un « settledAt ») : on cherche la lecture sur un ORDRE, par
     le nom que porte l'ordre dans le code (intent, it, i, ordre), et l'appel de la chronologie. */
  const CHAMPS = /\b(intent|it|i|ordre|order|updated|created)\??\.(confirmedAt|transmittedAt|servedAt|settledAt|closedAt|valueOn)\b|\bchronologieDeLOrdre\b/;

  it("aucun écran ni composant du client ne lit ces dates : ni /moi, ni les fiches, ni l'accueil, ni l'espace partagé", () => {
    const CLIENT = ["app/moi", "app/offres", "app/fonds", "app/titres", "app/marche", "app/calendrier", "components"].map((d) => join(racine, d));
    const fautifs = CLIENT.flatMap((d) => fichiers(d)).filter((f) => CHAMPS.test(lire(f)));
    expect(fautifs.map((f) => f.slice(racine.length - 3)), "un écran du client lit une date interne de l'ordre").toEqual([]);
  });

  it("les documents que le client reçoit ne portent pas ces dates : bulletin, avis, appel de fonds, avis d'opéré", () => {
    const fautifs = fichiers(join(racine, "lib/documents")).filter((f) => CHAMPS.test(lire(f)));
    expect(fautifs.map((f) => f.slice(racine.length - 3))).toEqual([]);
  });
});
