import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sansLaDemo } from "@/lib/domain/demo";
import { clientRegister, orderJournal } from "@/lib/reporting";
import type { ClientFile } from "@/lib/domain/kyc";
import type { Intent } from "@/lib/domain/types";

/**
 * TROIS COMPTES D'ESSAI QUI RESTENT, ET QUI NE DOIVENT PLUS COMPTER.
 *
 * La base de production porte trois comptes d'essai de la maison depuis
 * septembre 2026. La décision du 10 octobre 2026 est de les garder, pour
 * montrer le service. Gardés sans règle, ils comptaient comme des clients
 * réels : un dossier chacun au registre des clients, trois ordres au journal
 * des ordres, c'est-à-dire dans les deux pièces qui se montrent au régulateur.
 *
 * Le fait vit sur le compte (`profiles.demo`), pas sur le dossier ni sur
 * l'ordre : tout ce qui découle d'un compte de démonstration en est, et jamais
 * l'inverse. L'écart se fait en un seul endroit, traversé par la page, le CSV
 * et le PDF.
 */
const dossier = (userId: string, name: string): ClientFile =>
  ({
    id: `f-${userId}`,
    userId,
    kind: "physique",
    status: "approuve",
    identity: { name },
    review: { risk: "faible", reviewedAt: "2026-10-01T08:00:00.000Z" },
    createdAt: "2026-09-19T08:00:00.000Z",
    updatedAt: "2026-10-01T08:00:00.000Z",
  }) as unknown as ClientFile;

const ordre = (clientId: string, ref: string): Intent =>
  ({
    id: `i-${clientId}-${ref}`,
    ref,
    offerId: "o1",
    offerVersion: 1,
    clientName: "Essai",
    clientSegment: "Personne physique",
    clientId,
    type: "souscription",
    amount: 50_000,
    channel: "E-mail",
    state: "confirmee",
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:00:00.000Z",
  }) as unknown as Intent;

describe("ce que le reporting laisse dehors", () => {
  const contacts = [
    { id: "u-demo", demo: true },
    { id: "u-vrai" },
  ];
  const dossiers = [dossier("u-demo", "Toto Star"), dossier("u-vrai", "Un vrai client")];
  const ordres = [ordre("u-demo", "PF-0001"), ordre("u-vrai", "PF-0002")];

  it("écarte les dossiers et les ordres des comptes marqués", () => {
    const r = sansLaDemo(contacts, dossiers, ordres);
    expect(r.files.map((f) => f.identity.name)).toEqual(["Un vrai client"]);
    expect(r.intents.map((i) => i.ref)).toEqual(["PF-0002"]);
  });

  it("et dit combien, parce qu'un retrait silencieux ressemble à un oubli", () => {
    const r = sansLaDemo(contacts, dossiers, ordres);
    expect(r).toMatchObject({ comptes: 1, dossiers: 1, ordres: 1 });
  });

  it("garde un ordre sans client identifié : il n'appartient à aucune démonstration", () => {
    /* Un ordre pris au guichet par un visiteur n'a pas de clientId. L'écarter
       par défaut retirerait du journal réglementaire des ordres bien réels. */
    const anonyme = { ...ordre("u-demo", "PF-0003"), clientId: undefined } as Intent;
    expect(sansLaDemo(contacts, [], [anonyme]).intents).toHaveLength(1);
  });

  it("ne touche à rien quand aucun compte n'est marqué", () => {
    // Le cas de la démonstration locale, et celui d'avant la décision.
    const r = sansLaDemo([{ id: "u-vrai" }], dossiers, ordres);
    expect(r.files).toBe(dossiers);
    expect(r.intents).toBe(ordres);
    expect(r.comptes).toBe(0);
  });

  it("le registre et le journal ne connaissent que ce qui reste", () => {
    const r = sansLaDemo(contacts, dossiers, ordres);
    expect(clientRegister(r.files)).toHaveLength(1);
    expect(orderJournal(r.intents, [], [], { from: "2026-01-01", to: "2026-12-31" }).length).toBeLessThanOrEqual(1);
  });
});

describe("la règle s'applique aux trois pièces, et nulle part ailleurs", () => {
  const lire = (f: string) => readFileSync(f, "utf8");

  it("la page, le CSV et le rapport PDF passent par le même écart", () => {
    /* Trois copies de la même règle finiraient par ne pas dire pareil, et
       c'est le genre d'écart qu'on découvre dans une pièce déjà envoyée. */
    expect(lire("src/app/desk/reporting/page.tsx")).toMatch(/sansLaDemo\(contacts, tousLesDossiers, tousLesOrdres\)/);
    expect(lire("src/app/desk/reporting/export/route.ts")).toMatch(/sansLaDemo\(contacts, tousLesDossiers, tousLesOrdres\)/);
    expect(lire("src/lib/documents/generate.ts")).toMatch(/sansLaDemo\(contacts, tousLesDossiers, tousLesOrdres\)/);
  });

  it("la page dit ce qu'elle a écarté", () => {
    expect(lire("src/app/desk/reporting/page.tsx")).toMatch(/compte\(s\) de démonstration sont écartés de cette page, du CSV et du PDF/);
  });

  it("et le desk porte la marque là où on lit un nom", () => {
    expect(lire("src/app/desk/repertoire/page.tsx")).toMatch(/c\.demo && <span className="st"/);
    expect(lire("src/app/desk/clients/page.tsx")).toMatch(/compte\?\.demo && <span className="st"/);
  });

  it("le drapeau remonte de la base jusqu'au contact", () => {
    const sb = lire("src/lib/data/supabase.ts");
    expect(sb).toMatch(/const PROFILE_COLS = ".*, demo";/);
    expect(sb).toMatch(/demo: Boolean\(r\.demo\)/);
    expect(lire("supabase/migrations/0080_compte_de_demonstration.sql")).toMatch(/alter table profiles add column if not exists demo boolean not null default false/);
  });
});

/**
 * LA DISTINCTION QUI PORTE TOUT : COMPTER N'EST PAS TRAVAILLER.
 *
 * La règle a été étendue à Santé et au carnet le 10 octobre 2026. Mais un
 * carnet qui écarterait les ordres de démonstration de sa FILE rendrait
 * impossible de montrer le desk en train d'en traiter un, c'est-à-dire la
 * seule raison d'avoir gardé ces comptes. Ce qui compte ou se rapporte les
 * écarte ; ce qui se travaille les garde et les marque.
 */
describe("compter les écarte, travailler les garde", () => {
  const lire = (f: string) => readFileSync(f, "utf8");

  it("Santé ne relance pas un versement de démonstration", () => {
    /* Sinon le point monterait sans que personne puisse l'éteindre : on
       relancerait la maison elle-même. */
    const h = lire("src/lib/health.ts");
    expect(h).toMatch(/const ordres = tousLesOrdres\.filter\(\(i\) => !ordreDeDemo\(demo, i\.clientId\)\)/);
    expect(h).toMatch(/ecartesDeDemo\(tousLesOrdres\.length - ordres\.length\)/);
  });

  it("et ne compte pas un détenteur de démonstration dans l'urgence d'une ligne", () => {
    expect(lire("src/lib/health.ts")).toMatch(/const intents = tousLesOrdres\.filter\(\(i\) => !ordreDeDemo\(demo, i\.clientId\)\)/);
  });

  it("un point de Santé dit ce qu'il a laissé dehors", () => {
    // Un écart silencieux et un point qui n'a rien vu se ressemblent.
    expect(lire("src/lib/health.ts")).toMatch(/ligne\(s\) de comptes de démonstration écartées/);
  });

  it("le carnet garde l'ordre dans la file, et le marque", () => {
    const c = lire("src/app/desk/page.tsx");
    // Aucun filtrage de la liste : la file reste entière.
    expect(c).not.toMatch(/intents\.filter\(\(i\) => !ordreDeDemo/);
    expect(c).toMatch(/ordreDeDemo\(demo, i\.clientId\) && <span className="st"/);
    expect(c).toMatch(/dont \{k\} de démonstration, hors reporting et hors Santé/);
  });

  it("et la règle a un seul domicile, le domaine", () => {
    /* Quatre copies de « qu'est-ce qu'un compte de démonstration » finiraient
       par ne pas dire pareil, et l'écart se lirait dans une pièce envoyée. */
    for (const f of ["src/app/desk/reporting/page.tsx", "src/app/desk/reporting/export/route.ts", "src/lib/documents/generate.ts", "src/lib/health.ts", "src/app/desk/page.tsx"]) {
      expect(lire(f), f).toMatch(/from "@\/lib\/domain\/demo"/);
    }
    expect(lire("src/lib/reporting.ts")).not.toMatch(/sansLaDemo/);
  });
});
