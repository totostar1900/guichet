import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALPHABET_DES_CODES, LONGUEUR_DU_CODE, codeLibre, exportAnonyme, formeDuCode, rapprochement, registreDesParts } from "@/lib/domain/registre-des-parts";
import { BAREME_DE_FRAIS_FERME, REGLE_FERMEE, baremePourLeClient, baremeTiersDe, fusionnerHistorique, fusionnerTiers, historiquePourLeClient, historiqueTiersDe, type BaremeDeFrais, type HistoriqueDeFrais } from "@/lib/domain/frais";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LE REGISTRE INTERNE DES PARTS ET LE CODE PORTEUR ANONYME (14 novembre 2026, planche 1B) : le gestionnaire ne reçoit que des codes et des parts.
 */
describe("le registre range les parts par fonds et par client", () => {
  const fonds = [{ id: "f1", title: "Fonds A", isin: "CM0001" }, { id: "f2", title: "Fonds B", isin: "CM0002" }];
  const noms = new Map([["c1", "Jean-Paul Onana"], ["c2", "Aline Ngo"], ["c3", "Marie Tamo"]]);
  const parts = [
    { clientId: "c1", offerId: "f1", units: 120 },
    { clientId: "c2", offerId: "f1", units: 45.5 },
    { clientId: "c1", offerId: "f1", units: 0.0004 },
    { clientId: "c3", offerId: "f2", units: 334.5 },
    { clientId: "c2", offerId: "f2", units: 0 },
  ];

  it("additionne les parts d'un client dans un fonds, trie la plus grosse position d'abord, n'écrit pas un client sans part", () => {
    const [a, b] = registreDesParts(parts, fonds, noms, new Map());
    expect(a.porteurs.map((p) => [p.clientId, p.parts])).toEqual([["c1", 120], ["c2", 45.5]]);
    expect(a.total).toBe(165.5);
    expect(b.porteurs.map((p) => p.clientId)).toEqual(["c3"]);
  });

  it("porte le code quand il existe, et signale un porteur sans code en n'inventant rien", () => {
    const [a] = registreDesParts(parts, fonds, noms, new Map([["c1", "P-ABC234"]]));
    expect(a.porteurs.find((p) => p.clientId === "c1")?.code).toBe("P-ABC234");
    expect("code" in a.porteurs.find((p) => p.clientId === "c2")!).toBe(false);
  });
});

describe("le code porteur", () => {
  it("n'a ni 0, ni O, ni 1, ni I, ni L : il se dicte au téléphone", () => {
    for (const c of ["0", "O", "1", "I", "L"]) expect(ALPHABET_DES_CODES).not.toContain(c);
    expect(formeDuCode("P-ABC234")).toBe(true);
    expect(formeDuCode("P-ABC23")).toBe(false);
    expect(formeDuCode("P-ABC230")).toBe(false);
    expect(LONGUEUR_DU_CODE).toBe(6);
  });

  it("ne reprend jamais un code déjà porté, et refuse de tourner sans fin", () => {
    const suite = ["P-AAAAAA", "P-AAAAAA", "P-BBBBBB"];
    let i = 0;
    expect(codeLibre(new Set(["P-AAAAAA"]), () => suite[Math.min(i++, 2)])).toBe("P-BBBBBB");
    expect(() => codeLibre(new Set(["P-AAAAAA"]), () => "P-AAAAAA")).toThrow(/Aucun code libre/);
  });
});

describe("le rapprochement avec le relevé du gestionnaire", () => {
  it("sans relevé : rien à comparer ; égal au millième : juste ; sinon l'écart est signé (relevé moins nous)", () => {
    expect(rapprochement(165.5, undefined)).toEqual({ etat: "sans_releve", ecart: 0 });
    expect(rapprochement(165.5, { parts: 165.5, au: "2027-03-01" })).toEqual({ etat: "juste", ecart: 0 });
    expect(rapprochement(165.5, { parts: 166, au: "2027-03-01" })).toEqual({ etat: "ecart", ecart: 0.5 });
    expect(rapprochement(165.5, { parts: 165, au: "2027-03-01" }).ecart).toBe(-0.5);
  });
});

describe("le fichier du gestionnaire ne porte que des codes et des parts", () => {
  const [r] = registreDesParts([{ clientId: "c1", offerId: "f1", units: 12.5 }, { clientId: "c2", offerId: "f1", units: 3 }, { clientId: "c3", offerId: "f1", units: 1 }], [{ id: "f1", title: "Fonds A", isin: "CM0001" }], new Map([["c1", "Jean-Paul Onana"], ["c2", "Aline Ngo"], ["c3", "Marie Tamo"]]), new Map([["c1", "P-ZZZZZZ"], ["c2", "P-AAAAAA"]]));

  it("deux colonnes, triées par code, sans nom ni identifiant interne ; les porteurs sans code sont comptés à part", () => {
    const { csv, sansCode } = exportAnonyme(r);
    expect(csv).toBe("code;parts\nP-AAAAAA;3.000\nP-ZZZZZZ;12.500\n");
    expect(csv).not.toMatch(/Onana|Ngo|Tamo|c1|c2|c3/);
    expect(sansCode).toBe(1);
  });

  it("la route d'export ne lit aucun nom", () => {
    const route = lire("src/app/desk/registre/export/route.ts");
    expect(route).toMatch(/registreDesParts\(detenues, \[[^\]]*\], new Map\(\), codes\)/);
    expect(route).not.toMatch(/clientName|\.nom\b/);
    expect(route).toMatch(/requireDesk/);
  });
});

describe("ce que la maison reçoit de tiers ne se range que dans la table du desk (migration 0130)", () => {
  const complet: BaremeDeFrais = { ...BAREME_DE_FRAIS_FERME, "fonds.souscription": { ...REGLE_FERMEE, clientPct: 1, effetLe: "2027-02-03", tiersPct: 0.4, tiersMax: 9_000, tiersPartDesDroitsPct: 40, tiersEncoursPct: 0.3, tiersEncoursMin: 10 } };

  it("la partie publique est le barème du client, la partie desk les sept champs tiers, et l'ensemble se recompose", () => {
    const publique = baremePourLeClient(complet);
    const prive = baremeTiersDe(complet);
    expect(publique["fonds.souscription"].tiersPct + publique["fonds.souscription"].tiersMax + publique["fonds.souscription"].tiersEncoursPct).toBe(0);
    expect(publique["fonds.souscription"].clientPct).toBe(1);
    expect(Object.keys(prive["fonds.souscription"]).sort()).toEqual(["tiersEncoursMax", "tiersEncoursMin", "tiersEncoursPct", "tiersMax", "tiersMin", "tiersPartDesDroitsPct", "tiersPct"]);
    expect(fusionnerTiers(publique, prive)).toEqual(complet);
  });

  it("une partie desk absente ou mal formée donne des zéros, jamais une erreur", () => {
    expect(fusionnerTiers(baremePourLeClient(complet), undefined)["fonds.souscription"].tiersPct).toBe(0);
    expect(fusionnerTiers(baremePourLeClient(complet), { "fonds.souscription": { tiersPct: "x" } })["fonds.souscription"].tiersPct).toBe(0);
  });

  it("l'historique se recompose de la même façon, dans le même ordre", () => {
    const h: HistoriqueDeFrais = [{ cle: "fonds.souscription", jusquAu: "2027-02-10", regle: complet["fonds.souscription"] }];
    expect(fusionnerHistorique(historiquePourLeClient(h), historiqueTiersDe(h))).toEqual(h);
    expect(historiquePourLeClient(h)[0].regle.tiersPct).toBe(0);
  });

  it("la table du desk n'est lisible que par le desk, et le desk écrit la part tiers avant la part publique", () => {
    const m = lire("supabase/migrations/0130_desk_prive.sql");
    expect(m).toMatch(/enable row level security/);
    expect(m).toMatch(/for all using \(is_desk\(\)\) with check \(is_desk\(\)\)/);
    expect(m).not.toMatch(/using \(true\)/);
    const a = lire("src/app/desk/frais/actions.ts");
    expect(a.indexOf("upsertPrive(FRAIS_PRIVE_KIND")).toBeGreaterThan(-1);
    expect(a.indexOf("upsertPrive(FRAIS_PRIVE_KIND")).toBeLessThan(a.indexOf("upsertReference(REF.policy, FRAIS_POLICY_KEY"));
    expect(a).toMatch(/upsertReference\(REF\.policy, FRAIS_POLICY_KEY, baremePourLeClient\(apres\)/);
    expect(a).toMatch(/upsertReference\(REF\.policy, FRAIS_HISTORIQUE_KEY, historiquePourLeClient\(historique\)/);
    expect(a, "la table publique reçoit le barème complet").not.toMatch(/upsertReference\([^)]*(?<!baremePourLeClient\()apres[,)]/);
  });

  it("les pages du client ne lisent que le barème public", () => {
    expect(lire("src/app/moi/tarifs/page.tsx")).toMatch(/loadBaremeClient\(\)/);
    expect(lire("src/app/moi/tarifs/page.tsx")).not.toMatch(/loadBaremeDeFrais/);
  });
});

describe("le registre est écrit par le desk, avec l'audit", () => {
  const a = lire("src/app/desk/registre/actions.ts");
  it("les codes et les relevés passent par la table du desk et par l'audit", () => {
    expect(a).toMatch(/requireDesk\("\/desk\/registre"\)/);
    expect(a).toMatch(/^\s*await audit\("registre\.codes"/m);
    expect(a).toMatch(/^\s*await audit\("registre\.releve"[^\n]*before: avant, after: apres/m);
    expect(a).not.toMatch(/upsertReference/);
  });
  it("un code est tiré au hasard, jamais calculé d'un secret", () => {
    expect(a).toMatch(/randomInt/);
    expect(a).not.toMatch(/createHmac|AUTH_SECRET/);
  });
});
