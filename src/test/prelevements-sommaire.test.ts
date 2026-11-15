import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentDe } from "@/lib/nav-parent";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * AUTORISER UN PRÉLÈVEMENT EST UN SOMMAIRE (15 novembre 2026, option A · 1 : la provision par le même parcours · 2 : révoqués ok · 3 : historique à part).
 *
 * La page faisait 1 449 px et mêlait quatre métiers. Elle les range : une tuile par mandat, une pour en mettre un en place, une pour l'historique.
 */
describe("le sommaire des prélèvements", () => {
  const p = lire("src/app/moi/prelevements/page.tsx");

  it("n'est plus qu'une liste de tuiles-liens, sans carte de mandat ni formulaire", () => {
    expect(p).toMatch(/<Link key=\{x\.href\} href=\{x\.href\} className=\{styles\.tuile\}>/);
    expect(p).not.toMatch(/<MesMandats|creerMandatAction|<form/);
    expect(p).toMatch(/href: "\/moi\/prelevements\/historique"|href: `\/moi\/prelevements\/\$\{m\.id\}`/);
  });

  it("une tuile qui attend un geste le porte, et un mandat actif ne porte rien", () => {
    expect(p).toMatch(/attend: m\.etape !== "actif" \? ETAT\[m\.etape\] : undefined/);
    expect(p).toMatch(/\{x\.attend && <em className=\{styles\.attend\}>\{x\.attend\}<\/em>\}/);
  });

  it("les mandats révoqués n'ont plus de tuile : ils se retrouvent dans l'historique", () => {
    expect(p).toMatch(/vus\.filter\(\(m\) => m\.etat !== "revoque"\)/);
    expect(lire("src/app/moi/prelevements/historique/page.tsx")).toMatch(/mandats\.filter\(\(m\) => m\.state === "revoque"\)/);
  });
});

describe("les pages du parcours", () => {
  it("un mandat a sa page, qui ne montre que lui et refuse un mandat révoqué ou inconnu", () => {
    const m = lire("src/app/moi/prelevements/[id]/page.tsx");
    expect(m).toMatch(/vus\.find\(\(x\) => x\.id === id && x\.etat !== "revoque"\)/);
    expect(m).toMatch(/notFound\(\)/);
    expect(m).toMatch(/<MesMandats mandats=\{\[m\]\}/);
  });

  it("la carte d'un mandat n'a plus de formulaire de création : la mise en place est le parcours", () => {
    const c = lire("src/app/moi/prelevements/MesMandats.tsx");
    expect(c).not.toMatch(/creerMandatAction|Préparer, puis signer|En ajouter un/);
    expect(c, "le code et la signature ne se montrent pas ensemble").toMatch(/!\(m\.codeEnvoyeLe \|\| envoi\?\.ok\) \? \(/);
  });

  it("la provision passe par le parcours en cinq pages, sans fonds", () => {
    const e = lire("src/components/EpargneParcours.tsx");
    expect(e).toMatch(/const prov = usage === "provision";/);
    expect(e).toMatch(/\{!prov && \(\s*<section className=\{styles\.section\}>\s*<h2>\{t\("Le fonds"\)\}/);
    expect(e).toMatch(/<input type="hidden" name="objet" value="provision" \/>/);
    const a = lire("src/app/moi/epargne/actions.ts");
    expect(a).toMatch(/String\(form\.get\("objet"\) \?\? ""\) === "provision"/);
  });

  it("le retour d'un mandat est le sommaire, celui du sommaire reste Mon argent", () => {
    for (const f of ["abc", "nouveau", "historique"]) expect(parentDe(`/moi/prelevements/${f}`)).toBe("/moi/prelevements");
    expect(parentDe("/moi/prelevements")).toBe("/moi/argent");
  });
});
