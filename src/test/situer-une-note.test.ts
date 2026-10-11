import { describe, expect, it } from "vitest";
import { situer, situerLesNotes, type Rangee } from "@/lib/market/boc-geometrie";

/**
 * LA PAGE D'UNE DIFFICULTÉ, PARCE QU'UNE PLAINTE N'EST PAS UNE QUESTION.
 *
 * « Obligation CM0000020115 : ligne de cours non reconnue » ne dit ni quelle
 * ligne du PDF, ni où regarder : le desk ne pouvait pas y répondre. Le
 * lecteur aplati ne connaît pas les pages (pdfText rend un seul bloc) ; les
 * rangées géométriques, elles, en portent une. On retrouve donc le texte brut
 * dans les rangées pour poser la page après coup.
 */
const rangee = (page: number, y: number, textes: string[]): Rangee => ({
  page,
  y,
  cellules: textes.map((texte, i) => ({ texte, x: i * 100, largeur: 90 })),
});

const PAGE = [
  rangee(1, 700, ["BULLETIN OFFICIEL DE LA COTE N° 1914", "DU 22/12/2023"]),
  rangee(3, 500, ["CM0000020115", "ECMR 5,60% net 2018-2023", "100,00", "25 000 000", "1 234,56"]),
  rangee(3, 480, ["CM0000020255", "ECMR 6,25% net 2021-2026", "99,50", "30 000 000", "987,65"]),
  rangee(4, 300, ["BVMAC ALL SHARE", "1 146,64", "+0,00"]),
];

describe("retrouver une note dans le document", () => {
  it("rend la page du texte brut", () => {
    expect(situer("CM0000020115 | ECMR 5,60% net 2018-2023 | 100,00 | 25 000 000", PAGE)).toBe(3);
    expect(situer("BVMAC ALL SHARE 1 146,64", PAGE)).toBe(4);
  });

  it("et se moque de la façon dont le texte a été assemblé", () => {
    /* Le lecteur aplati colle ses cellules avec « | », le PDF les séparait
       autrement. Comparer exige donc d'effacer la ponctuation d'assemblage,
       qui est précisément ce qui diffère entre les deux formes. */
    expect(situer("CM0000020115|ECMR 5,60% net 2018-2023|100,00|25000000", PAGE)).toBe(3);
    expect(situer("CM0000020115   ECMR  5,60 % net 2018 - 2023   100,00", PAGE)).toBe(3);
  });

  it("ON NE DEVINE PAS : sans correspondance, pas de page", () => {
    /* Une page approchée serait pire que pas de page du tout : le desk irait
       regarder au mauvais endroit et conclurait que la donnée n'y est pas. */
    expect(situer("GA0000020206 | une ligne qui n'est pas dans ce document", PAGE)).toBeUndefined();
  });

  it("ni sur un texte trop court pour désigner quoi que ce soit", () => {
    expect(situer("100,00", PAGE)).toBeUndefined();
    expect(situer("-", PAGE)).toBeUndefined();
    expect(situer("", PAGE)).toBeUndefined();
  });

  it("une rangée coupée en deux se reconnaît dans l'empreinte", () => {
    /* L'inverse du cas ordinaire : le lecteur aplati a gardé plus de texte
       que la rangée, parce que le PDF a coupé la ligne de cote en deux. */
    const coupee = [rangee(5, 200, ["CG0000020261 ECG 6,50% net 2021-2026 99,25"])];
    expect(situer("CG0000020261 | ECG 6,50% net 2021-2026 | 99,25 | 15 000 000 | 456,78", coupee)).toBe(5);
  });
});

describe("poser la page sur les notes", () => {
  it("seulement sur celles qui ont un texte brut et pas encore de page", () => {
    const notes = [
      { message: "a", brut: "CM0000020115 | ECMR 5,60% net 2018-2023 | 100,00" },
      { message: "b" }, // pas de brut : rien à situer, et c'est normal
      { message: "c", brut: "CM0000020255 | ECMR 6,25% net 2021-2026", page: 9 }, // déjà située : on n'y touche pas
      { message: "d", brut: "introuvable dans ce document" },
    ];
    expect(situerLesNotes(notes, PAGE)).toBe(1);
    expect(notes[0].page).toBe(3);
    expect(notes[1].page).toBeUndefined();
    expect(notes[2].page, "une page déjà posée ne bouge pas").toBe(9);
    expect(notes[3].page).toBeUndefined();
  });
});
