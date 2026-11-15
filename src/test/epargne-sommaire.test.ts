import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentDe } from "@/lib/nav-parent";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * L'ÉPARGNE PROGRAMMÉE EST UN SOMMAIRE DE TROIS TUILES-LIENS (décision du 15 novembre 2026) : chaque tuile mène à sa page, au lieu de s'étendre par un chevron.
 */
describe("le sommaire de l'épargne programmée", () => {
  const p = lire("src/app/moi/epargne/page.tsx");

  it("n'a plus de pli : trois tuiles-liens vers trois pages", () => {
    expect(p).not.toMatch(/<Pli\b|components\/Pli/);
    for (const href of ["/moi/epargne/en-place", "/moi/epargne/nouvelle", "/moi/epargne/fonctionnement"]) expect(p, `la tuile vers ${href} a disparu`).toContain(`href: "${href}"`);
    expect(p).toMatch(/<Link key=\{x\.href\} href=\{x\.href\} className=\{styles\.tuile\}>/);
  });

  it("chaque tuile dit son état sans qu'on l'ouvre, et celle qui attend un geste le porte", () => {
    expect(p).toMatch(/prochain versement le \{d\}/);
    expect(p).toMatch(/attend: actifs\.length === 0 \? t\("rien en place"\) : undefined/);
    expect(p).toMatch(/\{x\.attend && <em className=\{styles\.attend\}>\{x\.attend\}<\/em>\}/);
  });

  it("les trois pages existent et ne repliant rien", () => {
    for (const f of ["en-place", "nouvelle", "fonctionnement"]) {
      const s = lire(`src/app/moi/epargne/${f}/page.tsx`);
      expect(s, `${f} garde un pli`).not.toMatch(/<Pli\b/);
      expect(s).toMatch(/requireSession\(/);
    }
  });
});

describe("les trois pages de l'épargne", () => {
  it("la liste de ce qui est en place dit son vide et renvoie au formulaire", () => {
    const s = lire("src/app/moi/epargne/en-place/page.tsx");
    expect(s).toMatch(/<StandingList/);
    expect(s).toMatch(/Rien n'est en place pour l'instant/);
    expect(s).toMatch(/href="\/moi\/epargne\/nouvelle"/);
  });

  it("le formulaire accepte le fonds de la fiche et atterrit sur la liste", () => {
    const s = lire("src/app/moi/epargne/nouvelle/page.tsx");
    expect(s).toMatch(/searchParams: Promise<\{ fonds\?: string \}>/);
    expect(s).toMatch(/fondsInitial=\{choisi\?\.id\}/);
    expect(s).toMatch(/apres="\/moi\/epargne\/en-place"/);
    expect(s, "le jour vient du serveur").toMatch(/aujourdhui=\{aujourdHui\}/);
  });

  it("l'explication est une vraie page, avec le mandat nommé et non contenu", () => {
    const s = lire("src/app/moi/epargne/fonctionnement/page.tsx");
    expect(s).toMatch(/<ol className=\{styles\.steps\}>/);
    expect(s).toMatch(/href="\/moi\/prelevements"/);
    expect(s).not.toMatch(/StandingForm/);
  });

  it("le formulaire sait atterrir sur la liste, sauf quand un mandat reste à signer", () => {
    const s = lire("src/components/Standing.tsx");
    expect(s).toMatch(/if \(state\?\.ok && apres && !state\.versLeMandat\) router\.replace\(apres\);/);
    expect(s, "le retour d'étape et l'atterrissage se courent de nouveau").toMatch(/if \(state\?\.ok && !apres && window\.location\.search\.includes\("etape="\)\) router\.back\(\);/);
    expect(s).toMatch(/fondsInitial && fonds\?\.some\(\(f\) => f\.id === fondsInitial\)/);
  });
});

describe("les autres portes d'entrée", () => {
  it("la fiche d'un fonds renvoie à la page du formulaire avec le fonds déjà choisi, et n'embarque plus le formulaire", () => {
    const s = lire("src/app/offres/[id]/intention/page.tsx");
    expect(s).toMatch(/href=\{`\/moi\/epargne\/nouvelle\?fonds=\$\{encodeURIComponent\(o\.id\)\}`\}/);
    expect(s).not.toMatch(/<StandingForm/);
  });

  it("le retour d'une des trois pages est le sommaire, et celui du sommaire reste Mon argent", () => {
    expect(parentDe("/moi/epargne/en-place")).toBe("/moi/epargne");
    expect(parentDe("/moi/epargne/nouvelle")).toBe("/moi/epargne");
    expect(parentDe("/moi/epargne/fonctionnement")).toBe("/moi/epargne");
    expect(parentDe("/moi/epargne")).toBe("/moi/argent");
  });
});
