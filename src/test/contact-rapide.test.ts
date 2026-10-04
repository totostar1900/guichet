import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CANAL_PROMESSE, CANAUX, canauxOuverts, contactRapidePossible, messageParDefaut } from "@/lib/domain/contact-rapide";
import { EN_ALL } from "@/i18n/core";

/**
 * JOINDRE LE DESK SUR UNE LIGNE, SANS RIEN REDÉCLARER.
 *
 * Un client dont un canal est déjà prouvé voyait, pour poser une question, le
 * formulaire d'intention entier : prénom, nom, numéro, adresse, tous connus et
 * tous prouvés. Ce formulaire existe pour engager une opération ; une demande
 * de rappel n'engage rien, et le péage se payait deux fois.
 *
 * LE MESSAGE RESTE DANS LA MAISON. Un lien « wa.me » ou « mailto » aurait
 * ouvert l'application du client et n'aurait laissé ici ni fil, ni trace, ni
 * suite, alors que la règle posée le 2 octobre 2026 est que la plateforme soit
 * le seul exemplaire du courrier. Le geste dépose une intention « rappel » que
 * le desk trouve dans sa file.
 */
describe("qui peut écrire au desk d'un geste", () => {
  it("personne sans connexion", () => {
    expect(contactRapidePossible({ connecte: false, emailProuve: true, telephoneProuve: true })).toBe(false);
  });

  it("personne sans canal prouvé : le desk n'aurait pas où répondre", () => {
    expect(contactRapidePossible({ connecte: true, emailProuve: false, telephoneProuve: false })).toBe(false);
  });

  it("un canal prouvé suffit", () => {
    expect(contactRapidePossible({ connecte: true, emailProuve: true, telephoneProuve: false })).toBe(true);
  });
});

describe("les canaux proposés sont ceux qui aboutissent", () => {
  it("pas de rappel téléphonique sans numéro prouvé", () => {
    /* Le desk n'aurait pas où appeler, et la demande resterait sans suite sans
       que personne sache pourquoi. */
    expect(canauxOuverts({ emailProuve: true, telephoneProuve: false })).toEqual(["E-mail"]);
  });

  it("un numéro prouvé ouvre WhatsApp et l'appel", () => {
    expect(canauxOuverts({ emailProuve: false, telephoneProuve: true })).toEqual(["WhatsApp", "Appel"]);
  });

  it("les trois quand tout est prouvé, et rien d'autre", () => {
    expect(canauxOuverts({ emailProuve: true, telephoneProuve: true })).toEqual(CANAUX);
  });
});

describe("le message part en disant de quoi il parle", () => {
  it("nomme la ligne", () => {
    /* Un desk qui lit « bonjour, je voudrais des informations » doit rouvrir
       la fiche pour savoir de quoi on parle. */
    expect(messageParDefaut({ title: "GAB · EOG MT 6,6 % NET 2024-2027-II" })).toContain("EOG MT 6,6 % NET 2024-2027-II");
  });

  it("demande un retour, et rien de plus", () => {
    // Une prise de contact n'engage pas une opération : elle ne doit rien promettre.
    const m = messageParDefaut({ title: "X" });
    expect(m).toMatch(/recontacter/);
    expect(m).not.toMatch(/souscri|achet|vend/i);
  });
});

describe("le canal dit ce qui va se passer", () => {
  it("chaque canal porte sa promesse, en français et en anglais", () => {
    const manque = CANAUX.filter((c) => !CANAL_PROMESSE[c] || EN_ALL[CANAL_PROMESSE[c]] == null);
    expect(manque, `promesses absentes du dictionnaire : ${manque.join(", ")}`).toEqual([]);
  });

  it("la promesse est à la première personne, pas un nom de canal", () => {
    /* Trois icônes sans phrase laisseraient croire que l'une d'elles ouvre
       WhatsApp. Aucune ne sort de la maison. */
    for (const c of CANAUX) expect(CANAL_PROMESSE[c], c).toMatch(/conseiller vous/);
  });
});

describe("rien ne sort de la maison", () => {
  const composant = readFileSync("C:/dev/guichet/src/components/ContactRapide.tsx", "utf8");
  const action = readFileSync("C:/dev/guichet/src/app/offres/[id]/actions.ts", "utf8");

  it("aucun lien wa.me, mailto ou tel:", () => {
    // C'est le choix de fond : le desk doit voir la demande et pouvoir y répondre.
    expect(composant).not.toMatch(/wa\.me|mailto:|tel:/);
  });

  it("le geste dépose une intention « rappel » attachée à la ligne", () => {
    expect(action).toContain('type: "rappel"');
    expect(action).toContain("export async function contacterSurLigne");
  });

  it("l'action refuse un canal non prouvé, pas seulement l'écran", () => {
    /* Un contrôle qui ne vit qu'à l'écran se contourne : la liste des canaux
       ouverts se revérifie côté serveur. */
    expect(action).toContain("canauxOuverts({ emailProuve, telephoneProuve }).includes(canal)");
  });

  it("« Contacter » mène au bloc de contact, plus au formulaire entier", () => {
    const swipe = readFileSync("C:/dev/guichet/src/components/mobile/SwipeActions.tsx", "utf8");
    const ligne = swipe.split("\n").find((l) => l.includes('t("Contacter")') || l.includes("#contact"));
    expect(ligne).toBeDefined();
    expect(swipe).toContain("#contact");
    expect(swipe).not.toContain("intention?intent=rappel");
  });
});
