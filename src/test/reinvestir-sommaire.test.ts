import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentDe } from "@/lib/nav-parent";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * RÉINVESTIR EST UN SOMMAIRE DE TUILES-LIENS (décision du 15 novembre 2026, « même geste partout ») : chaque tuile mène à sa page, au lieu de s'étendre par un chevron.
 */
describe("le sommaire du réinvestissement", () => {
  const p = lire("src/app/moi/reinvestir/page.tsx");

  it("n'a plus de pli : des tuiles-liens vers des pages", () => {
    expect(p).not.toMatch(/<Pli\b|components\/Pli/);
    for (const href of ["/moi/reinvestir/solde", "/moi/reinvestir/instruction", "/moi/reinvestir/mettre", "/moi/reinvestir/fonctionnement"]) expect(p, `la tuile vers ${href} a disparu`).toContain(`href: "${href}"`);
    expect(p).toMatch(/<Link key=\{x\.href\} href=\{x\.href\} className=\{styles\.tuile\}>/);
  });

  it("une tuile n'est proposée que si elle sert, et celle qui attend un geste le porte", () => {
    expect(p, "l'instruction n'est proposée que s'il y en a une").toMatch(/if \(enPlace\.length > 0\) \{/);
    expect(p, "un usage déjà couvert n'est plus proposé").toMatch(/if \(!active\) \{/);
    expect(p).toMatch(/attend: t\("rien en place"\)/);
    expect(p).toMatch(/\{x\.attend && <em className=\{styles\.attend\}>\{x\.attend\}<\/em>\}/);
  });

  it("les quatre pages existent et ne replient rien", () => {
    for (const f of ["solde", "instruction", "mettre", "fonctionnement"]) {
      const s = lire(`src/app/moi/reinvestir/${f}/page.tsx`);
      expect(s, `${f} garde un pli`).not.toMatch(/<Pli\b/);
      expect(s).toMatch(/requireSession\(/);
    }
  });
});

describe("les quatre pages du réinvestissement", () => {
  it("le disponible vient du journal et se distingue de l'échu", () => {
    const s = lire("src/app/moi/reinvestir/solde/page.tsx");
    expect(s).toMatch(/Math\.round\(poche\.idle\)/);
    expect(s).toMatch(/Échu, pas encore reçu/);
  });

  it("la liste dit son vide et renvoie au formulaire", () => {
    const s = lire("src/app/moi/reinvestir/instruction/page.tsx");
    expect(s).toMatch(/<StandingList/);
    expect(s).toMatch(/href="\/moi\/reinvestir\/mettre"/);
  });

  it("le formulaire renvoie à la liste quand une instruction tourne déjà, et y atterrit une fois posée", () => {
    const s = lire("src/app/moi/reinvestir/mettre/page.tsx");
    expect(s).toMatch(/if \(active\) redirect\("\/moi\/reinvestir\/instruction"\);/);
    expect(s).toMatch(/apres="\/moi\/reinvestir\/instruction"/);
    expect(lire("src/app/moi/reinvestir/ReinvestForm.tsx")).toMatch(/if \(res\?\.ok && apres\) router\.replace\(apres\);/);
  });

  it("les pages lisent le même lecteur et le retour est le sommaire", () => {
    for (const f of ["page", "solde/page", "instruction/page", "mettre/page"]) expect(lire(`src/app/moi/reinvestir/${f}.tsx`), f).toMatch(/lireLeReinvestissement\(/);
    for (const f of ["solde", "instruction", "mettre", "fonctionnement"]) expect(parentDe(`/moi/reinvestir/${f}`)).toBe("/moi/reinvestir");
    expect(parentDe("/moi/reinvestir")).toBe("/moi/argent");
  });
});
