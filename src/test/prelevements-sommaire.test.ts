import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentDe } from "@/lib/nav-parent";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LE SOMMAIRE DES PRÉLÈVEMENTS REDIRIGE (16 novembre 2026, planche « Mon argent », 3A, 4A et 7). Avant : une tuile par mandat, une pour en mettre un en place, une pour l'historique
 * (15 novembre, option A). Le mandat d'une épargne est une étape de l'épargne ; chaque mandat vit dans « Ce qui part tout seul », sur Mon argent, et garde sa page.
 */
describe("le sommaire des prélèvements redirige", () => {
  const p = lire("src/app/moi/prelevements/page.tsx");

  it("les anciennes adresses restent valables : mandat de l'épargne, mise en place de la provision, sinon la section de Mon argent", () => {
    expect(p).toMatch(/redirect\(`\/moi\/prelevements\/\$\{demande\.id\}`\)/);
    expect(p).toMatch(/\(sp\.de === "argent" \|\| sp\.de === "alimenter"\) && provisionLibre\) redirect\("\/moi\/prelevements\/nouveau"\)/);
    expect(p).toMatch(/redirect\("\/moi\/argent#en-place"\)/);
    expect(p, "le sommaire n'a plus de tuiles").not.toMatch(/styles\.tuile|<Link|<MesMandats|<form/);
  });

  it("l'historique est une puce du journal de l'argent, et les mandats révoqués y sont", () => {
    expect(lire("src/app/moi/prelevements/historique/page.tsx")).toMatch(/redirect\("\/moi\/documents\/argent\?filtre=prelevements"\)/);
    expect(lire("src/app/moi/documents/rayons.ts")).toMatch(/m\.state === "revoque"/);
    expect(lire("src/app/moi/documents/argent/page.tsx")).toMatch(/genre: "prelevement"/);
  });
});

describe("les pages du parcours", () => {
  it("un mandat a sa page, qui ne montre que lui et refuse un mandat révoqué ou inconnu", () => {
    const m = lire("src/app/moi/prelevements/[id]/page.tsx");
    expect(m).toMatch(/vus\.find\(\(x\) => x\.id === id\)/);
    expect(m).toMatch(/notFound\(\)/);
    expect(m, "un mandat révoqué doit renvoyer au sommaire, pas répondre 404").toMatch(/m\.etat === "revoque"\) redirect\("\/moi\/argent#en-place"\)/);
    expect(m).toMatch(/<MesMandats mandats=\{\[m\]\}/);
  });

  it("la carte d'un mandat n'a plus de formulaire de création : la mise en place est le parcours", () => {
    const c = lire("src/app/moi/prelevements/MesMandats.tsx");
    expect(c).not.toMatch(/creerMandatAction|Préparer, puis signer|En ajouter un/);
    /* Un geste à la fois : « Recevoir mon code » avant l'envoi, « Je signe ce mandat » après, jamais les deux dans la barre. */
    expect(c, "le code et la signature ne se montrent pas ensemble").toMatch(/!signe && !codeParti && \(/);
    expect(c).toMatch(/!signe && codeParti && \(/);
  });

  it("la page d'un mandat : barre du bas, récapitulatif resserré, compte masqué, sans référence (15 novembre 2026)", () => {
    const c = lire("src/app/moi/prelevements/MesMandats.tsx");
    /* Les gestes vivent dans la barre collée au bas : le geste qui attend, et « Supprimer » (ou « Révoquer » une fois signé) à côté. */
    expect(c, "la barre du bas a disparu").toMatch(/<BarreDEtape/);
    expect(c).toMatch(/const retire = signe \? t\("Révoquer"\) : t\("Supprimer"\)/);
    /* La suppression se confirme sur place, dans la barre. */
    expect(c).toMatch(/Supprimer ce mandat \? Il ne sera jamais prélevé\./);
    expect(c).toMatch(/Révoquer ce mandat \? Rien ne sera plus prélevé\./);
    /* Le compte ne se montre qu'à ses quatre derniers chiffres, et la référence n'est plus sur la page. */
    expect(c, "le compte n'est plus masqué").toMatch(/slice\(-4\)/);
    expect(c, "le compte entier est revenu sur la page").not.toMatch(/\{m\.compte\}/);
    expect(c, "la référence du mandat est revenue sur la page").not.toMatch(/Référence du mandat/);
    expect(c, "la phrase « corriger » est revenue").not.toMatch(/pouvez encore le corriger/);
  });

  it("la provision passe par le parcours en cinq pages, sans fonds", () => {
    const e = lire("src/components/EpargneParcours.tsx");
    expect(e).toMatch(/const prov = usage === "provision";/);
    expect(e).toMatch(/\{!prov && \(\s*<section className=\{styles\.section\}>\s*<h2>\{t\("Le fonds"\)\}/);
    expect(e).toMatch(/<input type="hidden" name="objet" value="provision" \/>/);
    const a = lire("src/app/moi/epargne/actions.ts");
    expect(a).toMatch(/String\(form\.get\("objet"\) \?\? ""\) === "provision"/);
  });

  it("supprimer ou révoquer le mandat d'une épargne arrête l'épargne avec lui (16 novembre 2026, 3A)", () => {
    const a = lire("src/app/moi/prelevements/actions.ts");
    const i = a.indexOf("export async function revoquerMandatAction");
    const corps = a.slice(i, a.indexOf("\n}\n", i));
    expect(corps).toMatch(/m\.objet === "instruction" && m\.standingId/);
    expect(corps).toMatch(/updateStandingOrder\(st\.id, \{ state: "annulee"/);
    expect(corps).toMatch(/audit\("standing\.stop"/);
    /* La confirmation le dit avant : on ne supprime pas l'épargne sans l'avoir écrit. */
    expect(lire("src/app/moi/prelevements/MesMandats.tsx")).toMatch(/Supprimer ce mandat et l'épargne \? Rien ne sera jamais prélevé\./);
  });

  it("le retour d'un mandat est Mon argent, où vit sa rangée", () => {
    for (const f of ["abc", "nouveau", "historique"]) expect(parentDe(`/moi/prelevements/${f}`)).toBe("/moi/argent");
    expect(parentDe("/moi/prelevements")).toBe("/moi/argent");
  });
});
