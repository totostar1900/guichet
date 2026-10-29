import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { plancherFaceAuProduit } from "@/lib/domain/arbitrage";
import { produitAttendu, produitDuRachat } from "@/lib/domain/estimate";
import type { Offer } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const code = (p: string) =>
  fs
    .readFileSync(path.join(ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const TSX = "src/components/IntentForm.tsx";

const fonds = { id: "f", kind: "FONDS", nominal: 0, fund: { nav: 10_820, exitFeePct: 0.5, navDate: "2026-09-18" } } as unknown as Offer;
const rachatTresor = { id: "r", kind: "RACHAT", nominal: 10_000 } as unknown as Offer;
const cotee = { id: "m", kind: "MARCHE", nominal: 0 } as unknown as Offer;

/**
 * DEUX LIGNES, ET UN CHIFFRE QUI DIT NON — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * L'arbitrage est le seul écran du guichet qui a DEUX sujets : il n'est ni le
 * départ ni l'arrivée, mais le mouvement entre les deux. Mesuré à l'écran, ce
 * mouvement ne se voyait nulle part — la ligne qu'on quitte n'était nommée
 * dans aucun de ses panneaux, et celle qu'on rejoint ne se lisait qu'au fond
 * d'une liste repliée, tronquée à « FCP… ».
 *
 * ET LE PLANCHER N'AVAIT PAS DE BORNE HAUTE. Posé au-dessus de ce que la
 * vente rapporterait, il arme un arbitrage mort-né : « peutPartir » le refuse
 * chaque soir, en silence, jusqu'à l'expiration — et le client lit alors la
 * phrase de la maison, « ce n'est pas une panne, c'est la protection qui a
 * joué ». Elle est vraie, et elle cache que rien n'avait jamais eu la moindre
 * chance de partir.
 *
 * ON NE REFUSE RIEN POUR AUTANT. Le produit n'est qu'une estimation, et « je
 * ne pars qu'au-dessus de ce que ça vaut aujourd'hui » est un ordre sensé.
 * C'est le silence qu'on corrige, pas la permission.
 */
describe("deux lignes, un refus", () => {
  /* CE QUE LA VENTE RAPPORTE, POUR LES TROIS SORTIES. C'est la clause qui
     compte : deux des trois rendaient un chiffre inutilisable, et c'est
     pourquoi le plancher ne disait jamais rien. */
  it("sait ce que chacune des trois sorties rapporterait", () => {
    // Un fonds : « estimate » rendait zéro, parce qu'il attend des francs là
    // où le client compte des parts.
    expect(produitAttendu(fonds, "rachat", 50, 0), "le rachat de parts ne rapporte toujours rien").toBe(538_295);
    // Un rachat du Trésor : « estimate » le rend NÉGATIF, par la convention des flux.
    expect(produitAttendu(rachatTresor, "cession", 300, -3_000_000), "la cession au Trésor rend un produit négatif").toBe(3_000_000);
    // Une ligne cotée : le décaissement calculé EST le produit, et il est positif.
    expect(produitAttendu(cotee, "vente", 12, 1_074_000)).toBe(1_074_000);
    // Et rien du tout sur une entrée : il n'y a pas de produit à comparer.
    expect(produitAttendu(fonds, "souscription", 50, 0), "une entrée annonce un produit de vente").toBe(0);
  });

  /* LE NOMBRE QUI NE SORTAIT QUE SOUS FORME DE PHRASE. */
  it("rend le produit d'un rachat en chiffres, pas seulement en mots", () => {
    expect(produitDuRachat(fonds, 50)).toBe(538_295);
    expect(produitDuRachat(fonds, 0), "un rachat vide rapporte quelque chose").toBe(0);
    const src = code("src/lib/domain/estimate.ts");
    expect(src, "la phrase du rachat s'est remise à refaire le calcul").toMatch(/produitDuRachat\(o, units\)/);
  });

  /* LE PLANCHER FACE AU PRODUIT : trois réponses, et le silence quand il n'y a
     rien à comparer. */
  it("dit quand le plancher est au-dessus, et se tait quand il n'y a rien à dire", () => {
    expect(plancherFaceAuProduit(400_000, 538_295)).toBe("tient");
    expect(plancherFaceAuProduit(900_000, 538_295)).toBe("au_dessus");
    expect(plancherFaceAuProduit(538_295, 538_295), "le plancher à l'euro près est déclaré impossible").toBe("tient");
    // Les silences : pas de plancher, pas de montant, pas de produit connu.
    expect(plancherFaceAuProduit(null, 538_295)).toBe("sans_objet");
    expect(plancherFaceAuProduit(0, 538_295)).toBe("sans_objet");
    expect(plancherFaceAuProduit(400_000, 0), "un verdict tombe sans produit à comparer").toBe("sans_objet");
  });

  /* L'ÉCRAN : le mouvement, la question au négatif, les durées. */
  it("montre le mouvement et pose la question au négatif", () => {
    const src = code(TSX);
    expect(src, "la ligne qu'on quitte a de nouveau disparu du panneau").toMatch(/Vous quittez/);
    expect(src, "la ligne qu'on rejoint a de nouveau disparu du panneau").toMatch(/Vous rejoignez/);
    expect(src, "le plancher est redevenu une valeur à atteindre").toMatch(/Sous quel montant refusez-vous que la vente parte \?/);
    expect(src, "le mot du desk est revenu sur le champ du client").not.toMatch(/t\("Plancher \(FCFA\)"\)/);
    expect(src, "la fenêtre est redevenue un calendrier").not.toMatch(/name="switchBy" type="date"/);
    expect(src, "les durées de la fenêtre ont disparu").toMatch(/DUREES\.map/);
    // La borne haute vient du domaine, pas de l'écran.
    expect(src, "l'écran a réinventé la borne de la fenêtre").toMatch(/\[15, 30, 45, 60, 90\]\.filter\(\(j\) => j <= FENETRE_MAX_JOURS\)/);
  });

  /* LES MILLIERS SE SÉPARENT PENDANT LA FRAPPE, ICI AUSSI. C'était le dernier
     champ de montant du formulaire à s'en dispenser. */
  it("sépare les milliers du plancher pendant la frappe", () => {
    const src = code(TSX);
    expect(src, "le plancher a repris sa saisie brute").toMatch(/name="switchFloor"[^/]*\{\.\.\.groupedInput\(setFloor\)\}/);
  });
});
