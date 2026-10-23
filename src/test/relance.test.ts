import { describe, expect, it } from "vitest";
import {
  laQuiParle,
  pourquoiPasEcarter,
  pourquoiPasRelancer,
  prochainRappel,
  RELANCE_DEFAUT,
  remplir,
  texteDuSujet,
  TEXTE_PAR_DEFAUT,
  type PolitiqueDeRelance,
  type Relance,
  type SujetDeRelance,
} from "@/lib/domain/relance";

const une = (p: Partial<Relance> = {}): Relance => ({
  id: "r1",
  userId: "u1",
  sujet: "signature",
  cle: "i-001",
  state: "en_cours",
  envois: 0,
  ouvertLe: "2026-10-01",
  ...p,
});

const pol = (p: Partial<PolitiqueDeRelance> = {}): PolitiqueDeRelance => ({ ...RELANCE_DEFAUT, ...p });

describe("le rappel d'une procédure laissée en route", () => {
  it("attend le délai du premier, puis part une fois par jour", () => {
    const r = une({ ouvertLe: "2026-10-01" });
    // delaiPremier = 1 : rien le jour du constat.
    expect(pourquoiPasRelancer(r, pol(), "2026-10-01")).toBe("trop_tot");
    expect(pourquoiPasRelancer(r, pol(), "2026-10-02")).toBeNull();
    // Parti hier : rien aujourd'hui tant que la cadence n'est pas écoulée.
    const parti = une({ envois: 1, dernierOn: "2026-10-02" });
    expect(pourquoiPasRelancer(parti, pol(), "2026-10-02")).toBe("deja_aujourdhui");
    expect(pourquoiPasRelancer(parti, pol(), "2026-10-03")).toBeNull();
  });

  it("s'arrête au cinquième, et pas au sixième jour", () => {
    const p = pol();
    for (let n = 0; n < p.rappels; n++) expect(pourquoiPasRelancer(une({ envois: n, dernierOn: "2026-10-05" }), p, "2026-10-06")).toBeNull();
    expect(pourquoiPasRelancer(une({ envois: p.rappels, dernierOn: "2026-10-05" }), p, "2026-10-06")).toBe("epuisee");
    expect(prochainRappel(une({ envois: p.rappels }), p)).toBeNull();
  });

  /* LA RÈGLE QUE LE CLIENT A DEMANDÉE, ET LA SEULE QUI NE SE RÈGLE PAS AU
     DESK : un écart interrompt les rappels, tout de suite et sans motif. */
  it("se tait dès que le client a écarté, quel que soit le réglage", () => {
    const r = une({ state: "ecartee", envois: 1, dernierOn: "2026-10-02" });
    expect(pourquoiPasRelancer(r, pol(), "2026-10-03")).toBe("ecartee");
    expect(pourquoiPasRelancer(r, pol({ rappels: 99 }), "2026-11-30")).toBe("ecartee");
    expect(prochainRappel(r, pol())).toBeNull();
  });

  it("se tait aussi quand le devoir est fait", () => {
    expect(pourquoiPasRelancer(une({ state: "faite" }), pol(), "2026-10-09")).toBe("faite");
  });

  it("obéit aux interrupteurs du desk", () => {
    const quand = "2026-10-09";
    expect(pourquoiPasRelancer(une(), pol({ active: false }), quand)).toBe("inactive");
    expect(pourquoiPasRelancer(une(), pol({ canaux: [] }), quand)).toBe("sans_canal");
    expect(pourquoiPasRelancer(une(), pol({ sujets: { ...RELANCE_DEFAUT.sujets, signature: false } }), quand)).toBe("sujet_decoche");
  });

  it("saute le week-end quand le desk l'a demandé, et pas autrement", () => {
    // 2026-10-10 est un samedi, 2026-10-11 un dimanche.
    expect(new Date("2026-10-10T12:00:00.000Z").getUTCDay()).toBe(6);
    const r = une({ envois: 1, dernierOn: "2026-10-09" });
    expect(pourquoiPasRelancer(r, pol(), "2026-10-10")).toBeNull();
    expect(pourquoiPasRelancer(r, pol({ joursOuvres: true }), "2026-10-10")).toBe("week_end");
    expect(prochainRappel(une({ ouvertLe: "2026-10-09" }), pol({ joursOuvres: true }))).toBe("2026-10-12");
  });

  it("respecte une cadence plus lente que le jour", () => {
    const r = une({ envois: 1, dernierOn: "2026-10-01" });
    const p = pol({ cadence: 3 });
    expect(pourquoiPasRelancer(r, p, "2026-10-03")).toBe("trop_tot");
    expect(pourquoiPasRelancer(r, p, "2026-10-04")).toBeNull();
    expect(prochainRappel(r, p)).toBe("2026-10-04");
  });

  /* UN SEUL MESSAGE PAR JOUR ET PAR CLIENT. La règle qui empêche un dossier
     chargé de produire quatre WhatsApp le même matin. */
  describe("quand plusieurs devoirs attendent", () => {
    const toutes: Relance[] = [
      une({ id: "a", sujet: "mandat", cle: "m-1" }),
      une({ id: "b", sujet: "signature", cle: "i-001" }),
      une({ id: "c", sujet: "convention", cle: "convention" }),
    ];

    it("n'en laisse parler qu'une, la plus bloquante", () => {
      const elue = laQuiParle(toutes, pol(), "2026-10-02");
      expect(elue?.id).toBe("c");
    });

    it("laisse la suivante parler une fois la première réglée", () => {
      const reste = toutes.filter((r) => r.id !== "c");
      expect(laQuiParle(reste, pol(), "2026-10-02")?.id).toBe("b");
      expect(laQuiParle([toutes[0]], pol(), "2026-10-02")?.id).toBe("a");
    });

    it("ne consomme pas celles qui se taisent", () => {
      // Aucune mutation : la fonction choisit, elle n'écrit pas.
      const avant = JSON.stringify(toutes);
      laQuiParle(toutes, pol(), "2026-10-02");
      expect(JSON.stringify(toutes)).toBe(avant);
    });

    it("ne rend personne quand toutes sont écartées", () => {
      expect(laQuiParle(toutes.map((r) => ({ ...r, state: "ecartee" as const })), pol(), "2026-10-02")).toBeUndefined();
    });
  });

  describe("les textes", () => {
    it("bouche les trous et ne laisse pas de virgule orpheline", () => {
      const m = "Bonjour {prenom}, votre bulletin pour {quoi} est prêt. {lien}";
      expect(remplir(m, { prenom: "Awa", quoi: "FCP Obligations", lien: "https://x" })).toBe("Bonjour Awa, votre bulletin pour FCP Obligations est prêt. https://x");
      expect(remplir(m, { quoi: "FCP Obligations", lien: "https://x" })).toBe("Bonjour, votre bulletin pour FCP Obligations est prêt. https://x");
    });

    it("prend celui du desk quand il est écrit, celui de la maison sinon", () => {
      expect(texteDuSujet(pol(), "mandat")).toEqual(TEXTE_PAR_DEFAUT.mandat);
      const p = pol({ textes: { mandat: { objet: "Un mot sur votre mandat" } } });
      expect(texteDuSujet(p, "mandat").objet).toBe("Un mot sur votre mandat");
      // L'objet seul réécrit n'efface pas le corps.
      expect(texteDuSujet(p, "mandat").texte).toBe(TEXTE_PAR_DEFAUT.mandat.texte);
    });

    /* Un texte vide au desk ne doit pas produire un message vide : il
       retombe sur celui de la maison, qui est toujours écrit. */
    it("ignore un texte effacé au desk", () => {
      const p = pol({ textes: { signature: { objet: "   ", texte: "" } } });
      expect(texteDuSujet(p, "signature")).toEqual(TEXTE_PAR_DEFAUT.signature);
    });

    it("donne à chaque sujet un objet et un corps, et un lien dans le corps", () => {
      for (const s of Object.keys(TEXTE_PAR_DEFAUT) as SujetDeRelance[]) {
        expect(TEXTE_PAR_DEFAUT[s].objet.length, s).toBeGreaterThan(8);
        expect(TEXTE_PAR_DEFAUT[s].texte, s).toContain("{lien}");
        expect(TEXTE_PAR_DEFAUT[s].texte, s).toContain("{prenom}");
      }
    });
  });

  describe("écarter", () => {
    it("se refuse deux fois, et sur un devoir fait", () => {
      expect(pourquoiPasEcarter(une())).toBeNull();
      expect(pourquoiPasEcarter(une({ state: "ecartee" }))).toMatch(/déjà interrompus/);
      expect(pourquoiPasEcarter(une({ state: "faite" }))).toMatch(/terminée/);
      expect(pourquoiPasEcarter(undefined)).toMatch(/n'existe pas/);
    });
  });
});
