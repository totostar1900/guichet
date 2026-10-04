import { describe, expect, it } from "vitest";
import { nomsCourts } from "@/lib/domain/nom-court";

/**
 * LE NOM COURT D'UN GROUPE, ÉPROUVÉ SUR LES NOMS RÉELS DE LA COTE.
 *
 * Le défaut : la bande des groupes portait les noms entiers, et « Societe
 * Generale Capital Asset Management Central Africa » faisait 351 px sur un
 * écran de 412. Onze des treize sociétés de gestion finissent par « Asset
 * Management », un suffixe qui ne distingue personne et occupait 60 % de la
 * bande.
 *
 * Les listes ci-dessous sont celles de la production au 4 octobre 2026,
 * recopiées telles que le Bulletin Officiel de la Cote les écrit — trois
 * orthographes d'UBA comprises.
 */
const GESTIONS = [
  "Africa Bright Asset Management",
  "Asca Asset Management",
  "Harvest Asset Management",
  "EDC Asset Management CEMAC",
  "Enko Capital Central Africa",
  "ESS Asset Management",
  "L'archer Asset Management",
  "Corridor Asset Management",
  "Elite Capital Asset Management S.A.",
  "Contacturer Asset Management",
  "Makeda Asset Management",
  "Societe Generale Capital Asset Management Central Africa",
  "Kori Asset Management",
];
const DEPOSITAIRES = [
  "UBA CAMEROUN",
  "AFG BANK CAMEROUN",
  "BGFIBANK CAMEROUN",
  "ORABANK GABON",
  "ECOBANK CAMEROUN",
  "ASCA",
  "CCA -Bank",
  "Afriland First Bank",
  "CREDIT DU CONGO",
  "UBA BANK CAMEROUN",
  "UBA CAMEROON",
  "LCB BANK",
  "SOCIETE GENERALE CAMEROUN",
];
const CATEGORIES = ["Monétaire", "Obligataire", "Diversifié", "Actions"];

describe("le nom court d'un groupe", () => {
  it("retire ce qui est dans la moitié des noms, garde ce qui distingue", () => {
    const m = nomsCourts(GESTIONS);
    expect(m.get("Societe Generale Capital Asset Management Central Africa")).toBe("Societe Generale");
    expect(m.get("Africa Bright Asset Management")).toBe("Africa Bright");
    expect(m.get("Harvest Asset Management")).toBe("Harvest");
    expect(m.get("L'archer Asset Management")).toBe("L'archer");
    /* « Capital » n'est que dans trois noms sur treize : il reste, parce
       qu'il distingue Elite Capital d'un éventuel Elite tout court. */
    expect(m.get("Elite Capital Asset Management S.A.")).toBe("Elite Capital");
  });

  it("ne confond jamais deux groupes, même les trois UBA du bulletin", () => {
    /* LA SEULE GARANTIE QUI COMPTE. Mieux vaut une pastille large qu'une
       pastille qui désigne deux groupes : en cas de collision, les deux
       reprennent leur nom entier. */
    for (const liste of [GESTIONS, DEPOSITAIRES, CATEGORIES]) {
      const courts = [...nomsCourts(liste).values()];
      expect(new Set(courts.map((c) => c.toLowerCase())).size, `noms confondus : ${courts.join(" · ")}`).toBe(liste.length);
    }
    const d = nomsCourts(DEPOSITAIRES);
    expect(d.get("UBA CAMEROUN")).not.toBe(d.get("UBA CAMEROON"));
    expect(d.get("UBA CAMEROUN")).not.toBe(d.get("UBA BANK CAMEROUN"));
  });

  it("rend son nom entier à celui qui entrerait en collision", () => {
    /* AUCUNE DES TROIS LISTES RÉELLES NE PROVOQUE DE COLLISION aujourd'hui :
       éprouver la garde sur elles ne prouve donc rien, et le sabotage l'a
       montré — retirer la garde ne faisait tomber aucune épreuve. Voici le
       cas qui la déclenche, et il n'a rien d'exotique : un groupe bancaire
       avec deux filiales de pays. « Banque Atlantique » désignerait les
       deux, donc les deux reprennent leur nom entier, et les trois autres
       gardent le leur, court. */
    const groupe = ["Banque Atlantique Cameroun", "Banque Atlantique Gabon", "Orabank", "Ecobank", "UBA"];
    const m = nomsCourts(groupe);
    expect(m.get("Banque Atlantique Cameroun")).toBe("Banque Atlantique Cameroun");
    expect(m.get("Banque Atlantique Gabon")).toBe("Banque Atlantique Gabon");
    expect(m.get("Orabank"), "une collision ailleurs ne doit pas rallonger les autres").toBe("Orabank");
    expect(new Set(m.values()).size).toBe(groupe.length);
  });

  it("ne coupe pas juste après un mot-outil", () => {
    /* « Crédit du | Congo » est un nom estropié, pas un nom court. */
    expect(nomsCourts(DEPOSITAIRES).get("CREDIT DU CONGO")).toBe("CREDIT DU CONGO");
  });

  it("ne touche à rien quand il n'y a rien à dégraisser", () => {
    // Sous quatre noms, raccourcir ferait perdre sans rien gagner.
    for (const c of CATEGORIES) expect(nomsCourts(CATEGORIES).get(c)).toBe(c);
    // Et chez les dépositaires, aucun mot n'atteint la moitié des noms.
    expect(nomsCourts(DEPOSITAIRES).get("ORABANK GABON")).toBe("ORABANK GABON");
  });

  it("raccourcit assez pour que la mesure change", () => {
    /* La mesure du 4 octobre : 2 718 px de bande pour 412 d'écran. Le compte
       de caractères n'est pas la largeur, mais il en est le témoin, et il
       permet de tenir le gain sans ouvrir un navigateur. */
    const avant = GESTIONS.join("").length;
    const apres = [...nomsCourts(GESTIONS).values()].join("").length;
    expect(apres / avant, `le dégraissage ne gagne plus rien : ${apres} contre ${avant}`).toBeLessThan(0.55);
  });
});
