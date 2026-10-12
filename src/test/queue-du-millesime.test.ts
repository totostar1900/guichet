import { describe, expect, it } from "vitest";
import { lireValeurs } from "@/lib/market/boc-geometrie";

/**
 * LA QUEUE D'UNE RANGÉE D'OBLIGATION, ET CE QU'ELLE PERMET DE CROIRE.
 *
 * Question de Georges le 12 octobre 2026 : « comment se fait-il que le robot
 * puisse lire une ligne et pas celle en dessous dans le même tableau ? »
 *
 * La mesure a répondu, et la réponse n'était aucune de mes trois hypothèses.
 * Dans une table abîmée, dix lignes se lisent et deux se perdent : les
 * voisines sont dix fois plus nombreuses que les échecs. Mais les deux perdues
 * n'étaient ni absentes des rangées, ni mal découpées, ni privées de leur
 * queue. Elles étaient ENTIÈRES, et refusées par une condition qui supposait
 * un millésime : les seuils valent le cours précédent ± 6 %.
 *
 * EN 2023 CES COLONNES PORTENT LE PLUS HAUT ET LE PLUS BAS DE LA SÉANCE, pas
 * la bande de réservation. Sur une ligne qui n'a pas traité, elles valent donc
 * le cours précédent. LA PREUVE QUI A TRANCHÉ : page 3 du 25 septembre 2023,
 * la rangée TD0000020331 est LUE par le lecteur aplati et porte « 100 | 100 |
 * 100 | 100 | 0,00% | 10 000,00 ». La bande n'y tient pas non plus.
 *
 * LA RÈGLE RETENUE est celle que le fichier applique déjà au prix et au
 * nominal : une valeur imprimée se croit sur parole, une valeur coupée doit se
 * justifier. Les garanties d'avant sont donc intactes partout où une coupure a
 * pu inventer les nombres, et elles ne s'appliquent plus là où il n'y a rien à
 * départager.
 */

/* Les rangées réelles, telles que la grille les rend. */
const ALIOS_AVANT = ["100", "5 714,29", "5 714,286", "69,98", "0", "0", "0", "0", "0"];
const ALIOS_APRES = ["100", "100", "100", "100", "0,00%", "5 714,29"];
const MODERNE_AVANT = ["100", "10 000,00", "10 000,000", "120,55", "0", "0", "0", "0", "0"];

describe("une queue imprimée se croit sur parole", () => {
  it("la bande à six pour cent ne commande plus le refus", () => {
    /* ALIOS02 au 25 octobre 2023. Tout est imprimé, rien n'est coupé, et
       pourtant cette rangée était refusée : vingt lignes sur soixante-cinq
       séances du second semestre 2023. */
    const lu = lireValeurs(ALIOS_AVANT, ALIOS_APRES);
    expect(lu).toBeDefined();
    expect(lu?.pct).toBe(100);
    expect(lu?.prix).toBeCloseTo(5714.29, 2);
    expect(lu?.nominal).toBeCloseTo(5714.286, 3);
    expect(lu?.haut).toBe(100);
    expect(lu?.bas).toBe(100);
    expect(lu?.reference).toBeCloseTo(5714.29, 2);
  });

  it("et la bande se lit toujours quand elle est là", () => {
    /* Le millésime récent, qui imprime bien la bande de réservation : la
       lecture ne doit pas avoir changé d'un iota. */
    const lu = lireValeurs(MODERNE_AVANT, ["100", "100", "106", "94", "0,00%", "10 000,00"]);
    expect(lu?.haut).toBe(106);
    expect(lu?.bas).toBe(94);
    expect(lu?.variation).toBe(0);
  });
});

describe("une queue coupée doit toujours se justifier", () => {
  it("une queue qui sort d'une coupure et dément la bande est refusée", () => {
    /* « 100 100 » collés sont deux valeurs, « 200 300 » aussi, et rien dans le
       texte ne dit lesquelles sont les bonnes. C'est là que la bande sert, et
       elle reste exigée : la découpe se vérifie au lieu de se deviner. */
    const refuse = lireValeurs(MODERNE_AVANT, ["100", "100 100", "200 300", "0,00%", "10 000,00"]);
    expect(refuse).toBeUndefined();
  });

  it("et une queue coupée que la bande valide se lit", () => {
    const lu = lireValeurs(MODERNE_AVANT, ["100", "100 106", "94", "0,00%", "10 000,00"]);
    expect(lu?.haut).toBe(106);
    expect(lu?.bas).toBe(94);
  });
});

describe("l'encadrement attrape ce que l'égalité ne voyait pas", () => {
  it("une queue mal alignée est refusée, même entièrement imprimée", () => {
    /* CE QUE L'ÉGALITÉ NE VOYAIT PAS. Elle ne refusait qu'une découpe fausse ;
       elle laissait passer un DÉCALAGE, où les six dernières cellules ne sont
       pas les six colonnes attendues. L'encadrement le voit : un seuil haut
       sous la clôture est impossible, et un seuil au-delà de la bande de
       réservation l'est aussi, puisque c'est la définition de la bande. */
    expect(lireValeurs(MODERNE_AVANT, ["100", "100", "120,00", "80,00", "0,00%", "10 000,00"])).toBeUndefined();
    expect(lireValeurs(MODERNE_AVANT, ["100", "104", "102", "94", "0,00%", "10 000,00"])).toBeUndefined();
  });

  it("et un champ absent imprimé zéro ne borne rien", () => {
    /* Un bulletin qui n'imprime pas l'ouverture d'une ligne non traitée y pose
       un zéro. L'exiger supérieur au seuil bas refuserait la rangée pour une
       absence, ce qui serait la faute inverse. */
    const lu = lireValeurs(MODERNE_AVANT, ["0", "100", "106", "94", "0,00%", "10 000,00"]);
    expect(lu?.ouverture).toBe(0);
    expect(lu?.bas).toBe(94);
  });
});

describe("une queue courte reste refusée", () => {
  it("quatre valeurs ne suffisent pas, même imprimées telles quelles", () => {
    /* LA QUEUE COURTE N'EST PAS UNE ABSENCE : elle est posée trois points plus
       bas, sur sa propre rangée. Vérifié sur la page 3 du 25 septembre 2023,
       où « 0,00% | 10 000,00 » suit chaque BDEAC à 3,3 points d'écart. C'est
       obligationsGeometriques qui la rattache, et accepter une queue de quatre
       ici reviendrait à jeter une référence imprimée au lieu d'aller la
       chercher. */
    expect(lireValeurs(ALIOS_AVANT, ["100", "100", "100", "100"])).toBeUndefined();
  });
});
