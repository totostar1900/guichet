import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activite,
  BAREME_DEFAUT,
  baremeValide,
  INGREDIENT_LABEL,
  INGREDIENTS,
  sommeDesPoids,
  volumesRegles,
  type Bareme,
  type SourcesActivite,
} from "@/lib/domain/activite";
import type { Contact, Intent, Notification, Offer } from "@/lib/domain/types";

/**
 * L'ACTIVITÉ EST UN NOMBRE, DONC ELLE DOIT DIRE D'OÙ IL VIENT.
 *
 * La tenue juge et se lit en crans ; l'activité ordonne une liste et se lit
 * en un score. Trois choses font sa justesse : des poids affichés parce
 * qu'arbitraires, un volume comparé au palier et jamais dans l'absolu, et un
 * numéro de barème sur chaque score, sans quoi deux chiffres pris à deux mois
 * d'intervalle ne se comparent pas.
 */
const MAINTENANT = new Date("2026-10-10T12:00:00.000Z");

const offre = (p: Partial<Offer> & { id: string }): Offer =>
  ({
    kind: "PRIMAIRE",
    title: `Ligne ${p.id}`,
    status: "published",
    opensAt: "2026-09-01T08:00:00",
    deadlineAt: "2026-09-20T15:00:00",
    resultsAt: "2026-09-25T15:00:00",
    ...p,
  }) as unknown as Offer;

const ordre = (p: Partial<Intent> & { id: string }): Intent =>
  ({
    ref: `PF-${p.id}`,
    offerId: "o1",
    offerVersion: 1,
    clientName: "Essai",
    clientSegment: "Personne physique",
    clientId: "u1",
    type: "ferme",
    amount: 1_000_000,
    channel: "E-mail",
    state: "reglee",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
    ...p,
  }) as unknown as Intent;

const contact = (id: string, tier = 1, demo = false): Contact => ({ id, name: id, segment: "", whatsappOptIn: false, tier: tier as 0 | 1 | 2, demo }) as Contact;

const sources = (p: Partial<SourcesActivite>): SourcesActivite => ({
  userId: "u1",
  tier: 1,
  intents: [],
  offers: [],
  notifications: [],
  cash: [],
  gestes: [],
  contacts: [contact("u1")],
  volumes: new Map(),
  ...p,
});

describe("le barème", () => {
  it("part équilibré entre ce qu'il apporte et ce qu'il fait", () => {
    expect(BAREME_DEFAUT.poids).toEqual({ presence: 30, volume: 30, suite: 20, regularite: 10, dossier: 10 });
    expect(sommeDesPoids(BAREME_DEFAUT)).toBe(100);
  });

  it("refuse une somme qui n'est pas cent", () => {
    // Sinon le score sortirait de cent, et « 112 sur 100 » ne veut rien dire.
    expect(baremeValide(BAREME_DEFAUT)).toBe(true);
    expect(baremeValide({ ...BAREME_DEFAUT, poids: { ...BAREME_DEFAUT.poids, presence: 40 } })).toBe(false);
    expect(baremeValide({ ...BAREME_DEFAUT, poids: { ...BAREME_DEFAUT.poids, presence: -10, volume: 70 } })).toBe(false);
  });

  it("et chaque score cite le sien", () => {
    const b: Bareme = { ...BAREME_DEFAUT, version: 7 };
    expect(activite(sources({}), b, MAINTENANT).bareme).toBe(7);
  });
});

describe("les cinq ingrédients", () => {
  it("la présence compte les séances ouvertes où il a déposé quelque chose", () => {
    const offers = [offre({ id: "o1" }), offre({ id: "o2" }), offre({ id: "o3" })];
    const a = activite(sources({ offers, intents: [ordre({ id: "i1", offerId: "o1" })] }), BAREME_DEFAUT, MAINTENANT);
    const p = a.parts.find((x) => x.clef === "presence")!;
    expect(p.brut).toBe("1 / 3");
    expect(p.points).toBe(10);
  });

  it("une maison sans séance ouverte ne reproche rien, mais ne donne rien non plus", () => {
    const p = activite(sources({ offers: [] }), BAREME_DEFAUT, MAINTENANT).parts.find((x) => x.clef === "presence")!;
    expect(p).toMatchObject({ brut: "0 / 0", points: 0 });
  });

  it("LE VOLUME SE COMPARE AU PALIER, jamais dans l'absolu", () => {
    /* Sans cela trois institutionnels occuperaient tout le haut de la liste,
       et la colonne ne dirait plus rien des autres. */
    const contacts = [contact("u1", 1), contact("u2", 1), contact("gros", 2)];
    const volumes = new Map([
      ["u1", 5_000_000],
      ["u2", 10_000_000],
      ["gros", 900_000_000],
    ]);
    const p = activite(sources({ contacts, volumes }), BAREME_DEFAUT, MAINTENANT).parts.find((x) => x.clef === "volume")!;
    // La moitié du plus haut de SON palier, et non une poussière du plus gros.
    expect(p.points).toBe(15);
  });

  it("et un compte de démonstration ne sert jamais de référence", () => {
    const contacts = [contact("u1", 1), contact("demo", 1, true)];
    const volumes = new Map([
      ["u1", 5_000_000],
      ["demo", 900_000_000],
    ]);
    const p = activite(sources({ contacts, volumes }), BAREME_DEFAUT, MAINTENANT).parts.find((x) => x.clef === "volume")!;
    expect(p.points).toBe(30);
  });

  it("sans appétit, la suite est pleine : on ne punit pas qui n'a rien annoncé", () => {
    const p = activite(sources({}), BAREME_DEFAUT, MAINTENANT).parts.find((x) => x.clef === "suite")!;
    expect(p).toMatchObject({ brut: "—", points: 20 });
  });

  it("la régularité compte les mois où quelque chose s'est passé, de trois sources", () => {
    /* Le registre des gestes est jeune : un client d'avant son ouverture n'a
       pas à paraître absent, donc les ordres et les espèces comptent aussi. */
    const a = activite(
      sources({
        intents: [ordre({ id: "i1", createdAt: "2026-08-02T09:00:00.000Z" })],
        cash: [{ id: "c1", userId: "u1", at: "2026-09-02T09:00:00.000Z", amount: 1, kind: "provision", label: "" }],
        gestes: [{ id: "g1", at: "2026-10-02T09:00:00.000Z", userId: "u1", geste: "vu.fiche", genre: "consultation" }],
      }),
      BAREME_DEFAUT,
      MAINTENANT,
    );
    expect(a.parts.find((x) => x.clef === "regularite")!.brut).toBe("3 / 12");
  });

  it("le score est la somme de ses parts, et rien d'autre", () => {
    const a = activite(sources({}), BAREME_DEFAUT, MAINTENANT);
    expect(a.score).toBe(a.parts.reduce((n, p) => n + p.points, 0));
    expect(a.score).toBeLessThanOrEqual(100);
  });
});

describe("le volume réglé de chacun", () => {
  it("ne compte que les ordres réglés, et par client", () => {
    const v = volumesRegles(
      [
        ordre({ id: "i1", amount: 1_000_000 }),
        ordre({ id: "i2", amount: 2_000_000, state: "confirmee" }),
        ordre({ id: "i3", amount: 4_000_000, clientId: "u2" }),
        ordre({ id: "i4", amount: 500_000, clientId: undefined }),
      ],
      MAINTENANT,
    );
    expect(v.get("u1")).toBe(1_000_000);
    expect(v.get("u2")).toBe(4_000_000);
    expect(v.size).toBe(2);
  });
});

describe("le barème se règle au référentiel, et se publie en voyant qui bouge", () => {
  const lire = (f: string) => readFileSync(f, "utf8");

  it("enregistrer ne publie pas", () => {
    /* Les poids commandent les cohortes, et les cohortes commandent les
       envois : un poids changé d'un trait modifierait une liste de diffusion
       sans que personne ne l'ait regardée. */
    const src = lire("src/app/desk/referentiel/bareme/actions.ts");
    expect(src).toMatch(/saveReferenceDraft\(REF\.bareme, BAREME_KEY/);
    const enregistrer = src.slice(src.indexOf("export async function enregistrerBaremeAction"), src.indexOf("export async function publierBaremeAction"));
    expect(enregistrer).not.toMatch(/publishReference/);
  });

  it("publier demande le mot, monte la version et laisse une trace", () => {
    const src = lire("src/app/desk/referentiel/bareme/actions.ts");
    expect(src).toMatch(/if \(mot !== "publier"\)/);
    expect(src).toMatch(/version: avant\.version \+ 1/);
    expect(src).toMatch(/audit\("bareme\.publish"/);
  });

  it("et l'écran montre qui bouge avant la publication", () => {
    const src = lire("src/app/desk/referentiel/bareme/page.tsx");
    expect(src).toMatch(/activitesDeTous\(courant\)/);
    expect(src).toMatch(/brouillon \? activitesDeTous\(brouillon\) : undefined/);
    expect(src).toMatch(/Ce que la publication déplacerait/);
  });
});

describe("tout ce que l'activité affiche est traduit", () => {
  it("les cinq libellés passent par une variable, donc le scanner ne les voit pas", async () => {
    // Même angle mort que le catalogue des gestes : on ferme de la même façon.
    const { EN_JOURNAL } = await import("@/i18n/en-journal");
    const manquants = INGREDIENTS.filter((k) => !EN_JOURNAL[INGREDIENT_LABEL[k]]);
    expect(manquants, `sans traduction : ${manquants.join(", ")}`).toEqual([]);
  });
});
