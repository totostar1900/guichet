import { describe, expect, it } from "vitest";
import { MENTIONS, planDEnvoi, refusDePreparer, texteComplet } from "@/lib/domain/envoi-cohorte";
import type { Contact } from "@/lib/domain/types";

/**
 * D'UNE COHORTE À UN MESSAGE, et les deux règles que la maquette énonce.
 *
 * Le consentement commande l'envoi, jamais l'appartenance. Et une cohorte
 * choisit qui prévenir, jamais quel prix.
 */
const c = (id: string, p: Partial<Contact> = {}): Contact => ({ id, name: id, tier: 1, ...p }) as Contact;

const COHORTE = [
  c("a", { phone: "+237600", whatsappOptIn: true, email: "a@x.cm", emailOptIn: true }),
  c("b", { email: "b@x.cm", emailOptIn: true }),
  c("d", { phone: "+237602", whatsappOptIn: true }),
  c("e", { phone: "+237603", email: "e@x.cm" }), // joignable nulle part : rien consenti
  c("demo", { email: "demo@x.cm", emailOptIn: true }),
];

describe("qui recevra, qui ne recevra pas", () => {
  const plan = planDEnvoi(COHORTE, new Set(["demo"]));

  it("les comptes de démonstration sont hors du compte", () => {
    /* Annoncer « cinq clients » dont un est un compte d'essai ferait croire à
       une portée qu'on n'a pas. */
    expect(plan.dansLaCohorte).toBe(4);
    expect(plan.joignables.map((x) => x.id)).not.toContain("demo");
  });

  it("celui qui n'a rien consenti reste dans la cohorte et ne reçoit rien", () => {
    /* LE CONSENTEMENT COMMANDE L'ENVOI, JAMAIS L'APPARTENANCE : le retirer du
       groupe reviendrait à le punir d'un refus, et fausserait tous les
       comptes du répertoire. */
    expect(plan.dansLaCohorte).toBe(4);
    expect(plan.sansCanal.map((x) => x.id)).toEqual(["e"]);
    expect(plan.joignables).toHaveLength(3);
  });

  it("et chaque canal porte son propre compte", () => {
    /* Trois joignables, mais pas par les mêmes canaux : un seul total
       laisserait croire que tout le monde est atteignable partout. */
    expect(plan.parWhatsapp).toBe(2);
    expect(plan.parEmail).toBe(2);
  });

  it("un numéro sans consentement ne compte pas, ni une adresse sans consentement", () => {
    const sansAccord = planDEnvoi([c("x", { phone: "+237", email: "x@x.cm" })], new Set());
    expect(sansAccord.parWhatsapp).toBe(0);
    expect(sansAccord.parEmail).toBe(0);
    expect(sansAccord.joignables).toHaveLength(0);
  });
});

describe("les mentions ne se retirent pas", () => {
  it("elles sont ajoutées, jamais saisies", () => {
    /* Une mention qu'on tape est une mention qu'on oublie, et celle-ci est la
       seule partie du message dont l'absence se paie ailleurs qu'en relation
       commerciale. */
    const texte = texteComplet("Une nouvelle ligne ouvre au Guichet.");
    for (const m of MENTIONS) expect(texte).toContain(m);
    expect(texte.startsWith("Une nouvelle ligne")).toBe(true);
  });

  it("et la sortie STOP en fait partie", () => {
    expect(texteComplet("x")).toContain("STOP");
  });
});

describe("ce qui empêche de préparer se dit avant le clic", () => {
  const plan = planDEnvoi(COHORTE, new Set(["demo"]));

  it("un objet vide, un texte trop court", () => {
    expect(refusDePreparer("", "un texte assez long pour être compris", plan)).toContain("objet");
    expect(refusDePreparer("Nouvelle ligne", "trop court", plan)).toContain("trop court");
  });

  it("une cohorte où personne n'a consenti", () => {
    const muette = planDEnvoi([c("e", { phone: "+237603" })], new Set());
    expect(refusDePreparer("Nouvelle ligne", "un texte assez long pour être compris", muette)).toContain("consenti");
  });

  it("et rien n'empêche quand tout est là", () => {
    expect(refusDePreparer("Nouvelle ligne", "un texte assez long pour être compris", plan)).toBeUndefined();
  });
});
