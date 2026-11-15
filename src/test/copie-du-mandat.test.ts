import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COPIE_FORMATS, COPIE_TAILLE_MAX, etapeDuMandat, JOURS_AVANT_ABANDON_DE_COPIE, JOURS_AVANT_RELANCE_DE_COPIE, mandatVivant, MOTIFS_DE_REFUS_DE_COPIE, paiementDeLEpargne, suiteDeLaCopie, tirageAutorise, type MandatPrelevement } from "@/lib/domain/mandat";
import { echeanceDuJour } from "@/lib/domain/prelevement";
import type { StandingOrder } from "@/lib/domain/standing";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA COPIE SIGNÉE À LA MAIN (15 novembre 2026, maquette « Signature manuelle » : 1A · 2 OK · 3 OK · 4 OK · 5 OK).
 *
 * Un mandat créé depuis cette date se signe par code, puis à la main sur le même document, déposé à la banque du client dont une copie vient au desk. Le prélèvement attend la vérification.
 * Les mandats d'avant ne sont pas concernés.
 */
const mandat = (patch: Partial<MandatPrelevement> = {}): MandatPrelevement => ({
  id: "m1",
  ref: "MP-2611-TEST",
  userId: "u1",
  objet: "instruction",
  standingId: "s1",
  bankName: "Banque",
  bankAccount: "CM21 0000 0000",
  accountHolder: "Client Essai",
  amount: 50_000,
  state: "actif",
  signedAt: "2026-11-01T10:00:00.000Z",
  createdAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...patch,
});

describe("où en est un mandat", () => {
  it("lit l'étape dans les dates, sans rien ranger", () => {
    expect(etapeDuMandat(mandat({ signedAt: undefined, copieRequise: true }))).toBe("a_signer");
    expect(etapeDuMandat(mandat({ copieRequise: true }))).toBe("copie_attendue");
    expect(etapeDuMandat(mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z" }))).toBe("en_verification");
    expect(etapeDuMandat(mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z", verifieLe: "2026-11-06T10:00:00.000Z" }))).toBe("actif");
  });

  it("un refus ramène à la copie refusée, jusqu'à ce qu'une copie plus récente arrive", () => {
    const refuse = mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z", refusLe: "2026-11-06T10:00:00.000Z", refusMotif: "rib_different" });
    expect(etapeDuMandat(refuse)).toBe("copie_refusee");
    expect(etapeDuMandat({ ...refuse, copieRecueLe: "2026-11-07T10:00:00.000Z" })).toBe("en_verification");
  });

  it("un mandat d'avant la règle reste actif sans copie", () => {
    expect(etapeDuMandat(mandat())).toBe("actif");
    expect(mandatVivant(mandat())).toBe(true);
  });
});

describe("le prélèvement attend la vérification", () => {
  it("ne prélève pas tant que la copie n'est pas vérifiée", () => {
    for (const patch of [{}, { copieRecueLe: "2026-11-05T10:00:00.000Z" }, { copieRecueLe: "2026-11-05T10:00:00.000Z", refusLe: "2026-11-06T10:00:00.000Z" }]) {
      const m = mandat({ copieRequise: true, ...patch });
      expect(mandatVivant(m)).toBe(false);
      expect(tirageAutorise(m, 50_000)).toBe(false);
    }
    const verifie = mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z", verifieLe: "2026-11-06T10:00:00.000Z" });
    expect(mandatVivant(verifie)).toBe(true);
    expect(tirageAutorise(verifie, 50_000)).toBe(true);
  });

  it("l'écarte de l'échéance en le disant au desk, et ne l'écarte plus une fois vérifié", () => {
    const s = { id: "s1", state: "active", dayOfMonth: 20, amount: 50_000, offerId: "f1", userId: "u1" } as unknown as StandingOrder;
    const attente = echeanceDuJour([mandat({ copieRequise: true })], [s], "2026-11-15");
    expect(attente.aTirer).toHaveLength(0);
    expect(attente.ecartes[0]?.raison).toMatch(/copie signée à la main/);
    const ok = echeanceDuJour([mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z", verifieLe: "2026-11-06T10:00:00.000Z" })], [s], "2026-11-15");
    expect(ok.aTirer).toHaveLength(1);
  });

  it("dit au client où en est son épargne", () => {
    const e = { id: "s1", reglement: "prelevement" as const };
    expect(paiementDeLEpargne(e, [mandat({ signedAt: undefined, copieRequise: true })])).toBe("mandat_a_signer");
    expect(paiementDeLEpargne(e, [mandat({ copieRequise: true })])).toBe("copie_attendue");
    expect(paiementDeLEpargne(e, [mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z" })])).toBe("en_verification");
    expect(paiementDeLEpargne(e, [mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z", refusLe: "2026-11-06T10:00:00.000Z" })])).toBe("copie_refusee");
    expect(paiementDeLEpargne(e, [mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z", verifieLe: "2026-11-06T10:00:00.000Z" })])).toBe("prelevement");
    expect(paiementDeLEpargne(e, [mandat()]), "un mandat d'avant la règle prélève").toBe("prelevement");
  });
});

describe("la copie qui tarde", () => {
  it("rappelle après 7 jours, une seule fois, et retire après 30", () => {
    expect(JOURS_AVANT_RELANCE_DE_COPIE).toBe(7);
    expect(JOURS_AVANT_ABANDON_DE_COPIE).toBe(30);
    const m = mandat({ copieRequise: true, signedAt: "2026-11-01T10:00:00.000Z" });
    expect(suiteDeLaCopie(m, "2026-11-07")).toBeNull();
    expect(suiteDeLaCopie(m, "2026-11-08")).toBe("relancer");
    expect(suiteDeLaCopie({ ...m, relanceLe: "2026-11-08T08:00:00.000Z" }, "2026-11-20"), "pas de second rappel").toBeNull();
    expect(suiteDeLaCopie({ ...m, relanceLe: "2026-11-08T08:00:00.000Z" }, "2026-12-01")).toBe("abandonner");
  });

  it("ne touche ni une copie reçue, ni un mandat révoqué, ni un mandat d'avant la règle", () => {
    const recu = mandat({ copieRequise: true, copieRecueLe: "2026-11-05T10:00:00.000Z" });
    expect(suiteDeLaCopie(recu, "2027-01-01")).toBeNull();
    expect(suiteDeLaCopie(mandat({ copieRequise: true, state: "revoque" }), "2027-01-01")).toBeNull();
    expect(suiteDeLaCopie(mandat(), "2027-01-01")).toBeNull();
  });

  it("compte les jours d'une copie refusée depuis le refus", () => {
    const m = mandat({ copieRequise: true, copieRecueLe: "2026-11-02T10:00:00.000Z", refusLe: "2026-11-20T10:00:00.000Z" });
    expect(suiteDeLaCopie(m, "2026-11-26")).toBeNull();
    expect(suiteDeLaCopie(m, "2026-11-27")).toBe("relancer");
  });
});

describe("ce qu'on accepte, et les motifs", () => {
  it("accepte un PDF, une photo ou un scan, 10 Mo au plus", () => {
    expect([...COPIE_FORMATS]).toEqual(["application/pdf", "image/jpeg", "image/png"]);
    expect(COPIE_TAILLE_MAX).toBe(10 * 1024 * 1024);
  });
  it("ne refuse que pour l'un des quatre motifs de la liste fermée", () => {
    expect(Object.keys(MOTIFS_DE_REFUS_DE_COPIE).sort()).toEqual(["copie_incomplete", "rib_different", "signature_illisible", "titulaire_different"]);
  });
});

describe("les portes", () => {
  it("tout mandat créé exige la copie ; le dépôt est audité et noté", () => {
    const a = lire("src/app/moi/prelevements/actions.ts");
    expect(a).toMatch(/createMandat\(\{ \.\.\.d, userId: s\.userId, copieRequise: true \}\)/);
    const debut = a.indexOf("export async function deposerCopieMandatAction");
    const dep = a.slice(debut, a.indexOf("export async function revoquerMandatAction", debut));
    expect(dep).toMatch(/COPIE_TAILLE_MAX/);
    expect(dep).toMatch(/COPIE_FORMATS/);
    expect(dep).toMatch(/await audit\("mandat\.copie"/);
    expect(dep).toMatch(/await noter\("mandat\.copie"/);
    expect(dep, "une copie ne se dépose que quand le mandat l'attend").toMatch(/etape !== "copie_attendue" && etape !== "copie_refusee"/);
  });

  it("le desk valide ou refuse, avec audit avant / après, et le refus a un motif de la liste fermée", () => {
    const d = lire("src/app/desk/prelevements/copies-actions.ts");
    expect(d.match(/await requireDesk\(/g)?.length).toBe(2);
    expect(d).toMatch(/await audit\("mandat\.copie_validee"/);
    expect(d).toMatch(/await audit\("mandat\.copie_refusee"/);
    expect(d).toMatch(/motif in MOTIFS_DE_REFUS_DE_COPIE/);
    expect(d, "un mandat qui n'attend pas de vérification ne se valide pas").toMatch(/etapeDuMandat\(m\) !== "en_verification"/);
  });

  it("la copie ne se lit que par le desk", () => {
    const r = lire("src/app/api/documents/mandat-copie/[id]/route.ts");
    expect(r).toMatch(/if \(!isDesk\(s\)\) return new NextResponse\("Accès refusé", \{ status: 403 \}\)/);
    expect(r).toMatch(/"cache-control": "no-store"/);
  });

  it("le robot rappelle et retire par une seule fonction, qui nomme sa main", () => {
    const c = lire("src/lib/mandat-copie.ts");
    expect(c).toMatch(/const ROBOT = "robot épargne"/);
    expect(c).toMatch(/actor: ROBOT/);
    expect(lire("src/app/api/cron/epargne/route.ts")).toMatch(/await suivreLesCopies\(today, ROBOT\)/);
  });

  it("le PDF dit que la copie conditionne le prélèvement, pour les mandats qui l'exigent", () => {
    const t = lire("src/lib/documents/pdf/kyc-templates.tsx");
    expect(t).toMatch(/mandat\.copieRequise \? \(/);
    expect(t).toMatch(/aucun prélèvement\s*\n?\s*n&apos;est présenté avant qu&apos;elle ait été vérifiée/);
  });
});

describe("le parcours du client", () => {
  const p = lire("src/components/EpargneParcours.tsx");
  it("a une cinquième page pour l'exemplaire à la main, avec un seul bouton principal", () => {
    expect(p).toMatch(/etape === 5 && sign\?\.ok/);
    expect(p.match(/t\("Envoyer ma copie signée"\)/g)?.length).toBe(1);
    expect(p).toMatch(/form="parcours-copie"/);
    expect(p, "« Plus tard » laisse l'épargne en attente").toMatch(/<Link href=\{apres\}>\{t\("Plus tard"\)\}<\/Link>/);
  });
  it("l'épargne dit l'étape de la copie, et cache la prochaine date tant que rien ne part", () => {
    expect(lire("src/components/Standing.tsx")).toMatch(/s\.paiement === "en_verification"/);
    expect(lire("src/app/moi/epargne/page.tsx")).toMatch(/\["prelevement", "virement"\]\.includes\(paiementDeLEpargne\(x, mandats, standing\)\) \? nextRun\(x, aujourdHui\) : null/);
  });
  it("le desk a sa file, au menu", () => {
    expect(lire("src/lib/desk-groupes.ts")).toMatch(/\["\/desk\/prelevements\/copies", "Mandats à vérifier"\]/);
  });
});
