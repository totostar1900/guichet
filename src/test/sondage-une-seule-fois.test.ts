import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { consensus, mur, SEUIL_CLIENTS, SEUIL_MONTANT, DOCTRINE_UNE_SEULE_FOIS } from "@/lib/domain/sondage";
import type { Country, LigneSondee } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * LE MONTANT D'UN CLIENT SE COMPTE UNE SEULE FOIS.
 *
 * ARBITRÉ LE 29 OCTOBRE 2026. La doctrine vit dans « domain/sondage », près du
 * consensus qu'elle lie.
 *
 * CETTE ÉPREUVE A CHANGÉ DE NATURE CE JOUR-LÀ, et il faut le dire parce que
 * c'est tout son intérêt. Elle était un FIL TENDU EN TRAVERS D'UNE PORTE :
 * elle affirmait un fait vrai — « LigneSondee » n'avait aucun champ de
 * famille — et devait tomber à l'instant où ce fait cesserait de l'être, pour
 * que la doctrine soit lue à ce moment-là plutôt qu'après. Elle est tombée, au
 * mot près, dès que « familleId » est entré dans le modèle, et elle portait
 * dans son message la marche à suivre.
 *
 * ELLE GARDE MAINTENANT CE QU'ELLE ATTENDAIT, et elle mesure plutôt qu'elle ne
 * surveille : non plus la présence d'un mot dans un corps de fonction, mais
 * les CHIFFRES que six lignes sœurs produisent.
 */
const ligne = (id: string, country: string, tenor: string, montant: number, userId: string, familleId?: string): LigneSondee => ({
  id,
  ref: id,
  origine: "client",
  userId,
  familleId,
  instrument: "OTA",
  country: country as Country,
  tenor,
  montant,
  dansJours: 30,
  state: "ouverte",
  createdAt: "2026-10-29T00:00:00Z",
  updatedAt: "2026-10-29T00:00:00Z",
});

/** Les six alternatives de la doctrine, nées d'un geste. */
const fratrie = (famille: string | undefined, userId = "client-1") =>
  ["Cameroun", "Gabon"].flatMap((p, i) => ["2 ans", "5 ans", "7 ans"].map((d, j) => ligne(`${userId}-${i}${j}`, p, d, 50_000_000, userId, famille)));

describe("le montant d'un client se compte une seule fois", () => {
  it("écrit sa doctrine là où le calcul se fait", () => {
    /* La règle doit être lisible par qui touche au consensus, et non rangée
       dans un document que personne n'ouvre en codant. */
    const src = lire("src/lib/domain/sondage.ts");
    expect(DOCTRINE_UNE_SEULE_FOIS.length, "la doctrine a perdu son énoncé").toBeGreaterThan(60);
    expect(src, "la doctrine ne dit plus ce qu'elle exige du modèle").toMatch(/part FERME|sœurs/);
  });

  /* LE CHIFFRE QUI JUSTIFIE LA RÈGLE, recalculé à chaque passage plutôt que
     recopié dans un commentaire. */
  it("garde le montant possible de chacune des six alternatives", () => {
    const g = consensus(fratrie("f1"));
    expect(g.length, "le regroupement a changé : la doctrine parle de six groupes").toBe(6);
    expect(
      g.reduce((s, c) => s + c.montant, 0),
      "la somme des montants possibles n'est plus six fois cinquante millions",
    ).toBe(300_000_000);
    // Chacun dit bien « si cette ligne sortait, on prendrait cinquante millions ».
    for (const c of g) expect(c.montant).toBe(50_000_000);
  });

  /* ET NE PROMET RIEN. C'est la clause neuve, celle que le fil tendu
     attendait : six groupes à cinquante millions possibles, zéro franc ferme. */
  it("ne compte le montant ferme dans aucun des six groupes", () => {
    const g = consensus(fratrie("f1"));
    expect(
      g.reduce((s, c) => s + c.ferme, 0),
      "l'argent d'alternatives est redevenu promettable : la maison promettrait six fois le même",
    ).toBe(0);
    for (const c of g) expect(c.clientsFermes, "un client d'alternatives compte comme un client ferme").toBe(0);
  });

  /* UNE LIGNE SEULE RESTE FERME : la règle ne doit pas rendre tout le monde
     muet. Sans cette clause, « ferme = 0 » partout passerait pour un succès. */
  it("laisse ferme ce qui n'a pas de sœurs", () => {
    const seules = [ligne("a", "Cameroun", "5 ans", 50_000_000, "c1"), ligne("b", "Cameroun", "5 ans", 60_000_000, "c2")];
    const [g] = consensus(seules);
    expect(g.montant).toBe(110_000_000);
    expect(g.ferme, "une ligne sans sœurs a cessé d'être ferme").toBe(110_000_000);
    expect(g.clientsFermes).toBe(2);
  });

  /* UNE SŒUR CLOSE LIBÈRE LA DERNIÈRE VIVANTE : le client n'honorera qu'elle,
     et son montant redevient promettable sans que personne le déclare. */
  it("rend ferme la dernière vivante d'une famille", () => {
    const six = fratrie("f1");
    const cinqCloses = six.map((l, i) => (i === 0 ? l : { ...l, state: "close" as const }));
    const g = consensus(cinqCloses);
    expect(g.length, "les lignes closes comptent encore dans le consensus").toBe(1);
    expect(g[0].ferme, "la dernière vivante d'une famille n'est pas redevenue ferme").toBe(50_000_000);
    expect(g[0].clientsFermes).toBe(1);
  });

  /* LE MUR SE JUGE SUR LA PART FERME. C'est là que la doctrine mord : un
     groupe mûr en apparence et vide en réalité ne doit pas partir au Trésor. */
  it("ne laisse pas un mur de pure alternative franchir le seuil", () => {
    // Trois clients, chacun six alternatives de quarante millions : un groupe
    // porte 120 millions possibles et trois clients — le seuil, à la lettre.
    const trois = ["c1", "c2", "c3"].flatMap((u) => fratrie(`f-${u}`, u).map((l) => ({ ...l, montant: 40_000_000 })));
    const g = consensus(trois);
    const vise = g.find((c) => c.montant >= SEUIL_MONTANT && c.clients >= SEUIL_CLIENTS);
    expect(vise, "la fixture ne produit plus un groupe mûr en apparence : l'épreuve ne garde rien").toBeTruthy();
    expect(vise!.ferme, "ce groupe n'est bâti que d'alternatives, il ne doit rien porter de ferme").toBe(0);
    expect(mur(vise!), "un mur bâti sur des alternatives est franchi : la maison promettrait le même argent trois fois").toBe(false);
  });

  /* LA PHRASE QU'ON PORTE AU TRÉSOR DIT LA PART FERME.
     C'est le dernier maillon, et il manquait : le mur se jugeait déjà sur le
     ferme, mais l'écran du desk imprimait « montant » — le chiffre qui compte
     les alternatives. La règle aurait été juste dans le calcul et fausse dans
     la bouche de celui qui parle au Trésor. */
  it("porte la part ferme dans la phrase du desk, et le possible à part", () => {
    const src = lire("src/app/desk/sondage/page.tsx");
    const deb = src.indexOf("styles.consensus");
    expect(deb, "la phrase portée au Trésor est introuvable").toBeGreaterThan(0);
    const phrase = src.slice(deb, deb + 400);
    expect(phrase, "la phrase portée au Trésor dit de nouveau le montant possible").toMatch(/m: fmt\(c\.ferme\)/);
    expect(phrase, "elle compte de nouveau les clients d'alternatives").toMatch(/n: String\(c\.clientsFermes\)/);
    /* LA CLAUSE VISE LE PARAGRAPHE, ET NON LA COMPARAISON. Écrite sur
       « c.montant > c.ferme » seule, elle ne tombait pas quand on retirait le
       paragraphe : la même comparaison vit dans la cellule du tableau, et
       suffisait à la satisfaire. Vérification inverse faite. */
    expect(src, "ce qui pourrait venir en plus n'est plus dit au desk").toMatch(/styles\.possible/);
    expect(src, "le possible n'est plus conditionné à l'écart entre les deux").toMatch(/c\.montant > c\.ferme && \(/);
    /* ET « CE QUI S'ACCUMULE » DISTINGUE LES DEUX AUSSI. C'est la table où le
       desk lit ce qui vient : une seule colonne l'obligerait à choisir entre
       flatter et taire. */
    expect(src, "la table de ce qui s'accumule a perdu la colonne ferme").toMatch(/<td className=\{styles\.n\}>\{fmt\(c\.ferme\)\}<\/td>/);
    expect(src, "elle a perdu la colonne du possible").toMatch(/c\.montant > c\.ferme \? fmt\(c\.montant\) : "—"/);
  });

  /* ET IL SE FRANCHIT ENCORE QUAND LA DEMANDE EST RÉELLE. Sans cette clause,
     un mur toujours faux passerait pour une correction. */
  it("laisse passer un mur bâti sur des lignes fermes", () => {
    const vraies = ["c1", "c2", "c3"].map((u, i) => ligne(`v${i}`, "Cameroun", "5 ans", 40_000_000, u));
    const [g] = consensus(vraies);
    expect(g.ferme).toBe(120_000_000);
    expect(g.clientsFermes).toBe(3);
    expect(mur(g), "une demande réelle de trois clients ne franchit plus le mur").toBe(true);
  });
});
