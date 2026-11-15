import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { dateDuVersement, isDue, JOUR_MAX_VERSEMENT, nextRun, premierVersement, type StandingOrder } from "@/lib/domain/standing";

const ROOT = path.join(__dirname, "../..");
const code = (p: string) =>
  fs
    .readFileSync(path.join(ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const TSX = "src/components/EpargneParcours.tsx";
const uneEpargne = (patch: Partial<StandingOrder>) => ({ state: "active", dayOfMonth: 17, startsOn: "2026-01-01", ...patch }) as unknown as StandingOrder;

/**
 * UN MONTANT, UN JOUR, ET CE QUE ÇA FAIT — relevé le 29 octobre 2026, repris le 15 novembre 2026 avec le parcours en quatre pages et le jour de 1 à 30.
 */
describe("un montant, un jour", () => {
  /* LA DATE DU PREMIER VERSEMENT, ET SON SEUL CALCUL. */
  it("place le premier versement ce mois-ci s'il est devant, le mois suivant sinon", () => {
    expect(premierVersement(17, "2026-10-29"), "le 17 est passé, on part en novembre").toBe("2026-11-17");
    expect(premierVersement(30, "2026-10-29"), "le 30 est devant, on reste en octobre").toBe("2026-10-30");
    expect(premierVersement(29, "2026-10-29"), "le jour même est encore un premier versement").toBe("2026-10-29");
    expect(premierVersement(5, "2026-12-20"), "décembre ne roule pas sur janvier").toBe("2027-01-05");
  });

  /* LA RÈGLE DE FÉVRIER : le jour qui n'existe pas tombe le 1er du mois suivant. */
  it("fait tomber le 29 et le 30 le 1er mars quand février ne les a pas", () => {
    expect(JOUR_MAX_VERSEMENT).toBe(30);
    expect(dateDuVersement(2027, 2, 29), "2027 n'est pas bissextile").toBe("2027-03-01");
    expect(dateDuVersement(2027, 2, 30)).toBe("2027-03-01");
    expect(dateDuVersement(2028, 2, 29), "2028 est bissextile : le 29 existe").toBe("2028-02-29");
    expect(dateDuVersement(2028, 2, 30), "le 30 n'existe jamais en février").toBe("2028-03-01");
    expect(dateDuVersement(2026, 4, 30), "avril a un 30").toBe("2026-04-30");
    expect(premierVersement(30, "2027-02-10")).toBe("2027-03-01");
    expect(premierVersement(29, "2028-02-10")).toBe("2028-02-29");
  });

  it("rattrape février le 1er mars sans empêcher le versement du 30 mars", () => {
    const s = uneEpargne({ dayOfMonth: 30 });
    expect(isDue(s, "2027-02-28"), "février : rien n'est dû, le versement est reporté").toBe(false);
    expect(isDue(s, "2027-03-01"), "le 1er mars porte celui de février").toBe(true);
    const faitLe1er = uneEpargne({ dayOfMonth: 30, lastRunOn: "2027-03-01" });
    expect(isDue(faitLe1er, "2027-03-15"), "celui de février est fait").toBe(false);
    expect(isDue(faitLe1er, "2027-03-30"), "celui de mars arrive ensuite, dans le même mois civil").toBe(true);
    expect(nextRun(faitLe1er, "2027-03-02")).toBe("2027-03-30");
    expect(nextRun(uneEpargne({ dayOfMonth: 30, lastRunOn: "2027-01-30" }), "2027-02-05")).toBe("2027-03-01");
  });

  it("garde le rattrapage des jours ordinaires, dans le mois et pas au-delà", () => {
    const s = uneEpargne({ dayOfMonth: 5 });
    expect(isDue(s, "2026-11-04")).toBe(false);
    expect(isDue(s, "2026-11-09"), "le robot a manqué le 5 : il rattrape").toBe(true);
    expect(isDue({ ...s, lastRunOn: "2026-11-05" } as StandingOrder, "2026-11-09")).toBe(false);
    expect(isDue(uneEpargne({ dayOfMonth: 30 }), "2026-12-02"), "le 30 novembre manqué ne se rattrape pas en décembre").toBe(false);
  });

  /* LA RÈGLE PLUTÔT QUE SA COPIE : « nextRun » et « premierVersement » rendent la même date sur une épargne neuve. */
  it("laisse « nextRun » et « premierVersement » dire la même date", () => {
    for (const [j, d] of [[17, "2026-10-29"], [30, "2027-02-10"], [29, "2028-02-10"], [5, "2026-12-20"]] as const) {
      expect(nextRun(uneEpargne({ dayOfMonth: j, startsOn: "2020-01-01" }), d), `jour ${j} au ${d}`).toBe(premierVersement(j, d));
    }
  });

  /* LE MONTANT EST GROUPÉ DÈS L'OUVERTURE, et le jour est UN seul champ, d'un jour à trente. */
  it("ouvre le montant sur un nombre qu'on peut compter, et donne le jour en un seul champ de 1 à 30", () => {
    const src = code(TSX);
    expect(src, "le montant s'ouvre de nouveau sur des chiffres collés").toMatch(/useState\(plancher \? groupDigits\(String\(plancher\)\) : ""\)/);
    expect(src, "le jour n'est plus un champ de la maison à trente entrées").toMatch(/length: JOUR_MAX_VERSEMENT/);
    expect(src, "la grille des vingt-huit jours est revenue").not.toMatch(/length: 28/);
    expect(src, "la règle de février a disparu du formulaire").toMatch(/tombe le 1er mars quand ce jour n'existe pas/);
  });

  /* LES CONSÉQUENCES : la date du premier versement ; plus de « douze mois » ni de « valeur du jour » (15 novembre 2026). */
  it("dit le premier versement, et plus ni les douze mois ni la valeur du jour", () => {
    const src = code(TSX);
    expect(src, "la date du premier versement a disparu").toMatch(/Premier versement le \{d\}/);
    expect(src, "« sur douze mois » est revenu").not.toMatch(/douze mois/);
    expect(src, "« à la valeur du jour » est revenu").not.toMatch(/valeur du jour/);
    expect(src, "la date de fin est revenue dans le parcours").not.toMatch(/Jusqu'au/);
  });

  /* QUATRE PAGES, UN BOUTON CHACUNE ; le récapitulatif redit les décisions sans en demander une de plus. */
  it("redit les décisions avant de signer, sans en demander de nouvelle", () => {
    const src = code(TSX);
    expect(src, "le récapitulatif a disparu").toMatch(/etape === 3 &&/);
    const deb = src.indexOf("etape === 3 &&");
    const recap = src.slice(deb, src.indexOf("etape === 4 && mise?.ok &&", deb));
    for (const dit of ["Vers quel fonds", "Chaque mois", "Premier versement le \\{d\\}", "Si un mois le prélèvement est impossible", "Compte débité"]) {
      expect(recap, `le récapitulatif ne redit plus « ${dit} »`).toMatch(new RegExp(dit));
    }
    expect(recap.match(/<input/g)?.length ?? 0, "seuls les champs cachés de l'envoi vivent au récapitulatif").toBe(0);
  });

  it("ne laisse passer ni un montant sous le minimum ni un compte incomplet", () => {
    const src = code(TSX);
    expect(src).toMatch(/const montantOk = verse > 0 && verse >= plancher;/);
    expect(src).toMatch(/disabled=\{!montantOk\} onClick=\{\(\) => aller\(2\)\}/);
    expect(src).toMatch(/disabled=\{!compteOk\} onClick=\{\(\) => aller\(3\)\}/);
  });

  /* UN BOUTON PAR PAGE : le code ne se demande qu'à la page 3, il ne se signe qu'à la page 4. */
  it("n'a qu'un bouton principal par page", () => {
    const src = code(TSX);
    for (const label of ["Recevoir mon code", "Je signe ce mandat"]) expect(src.match(new RegExp(`t\\("${label}"\\)`, "g"))?.length, label).toBe(1);
    expect(src).toMatch(/\{etape === 3 && \(\s*<button[^>]*form="parcours-mise"/);
    expect(src).toMatch(/\{etape === 4 && \(\s*<button[^>]*form="parcours-signe"/);
  });

  /* LE JOUR D'AUJOURD'HUI VIENT DU SERVEUR : « new Date() » pendant un rendu donne une valeur au serveur et une autre au navigateur. */
  it("ne lit pas l'horloge pendant le rendu", () => {
    const src = code(TSX);
    expect(src, "le parcours lit l'horloge pendant son rendu").not.toMatch(/new Date\(\)/);
    expect(src, "le jour d'aujourd'hui ne vient plus du serveur").toMatch(/aujourdhui/);
    for (const page of ["src/app/moi/epargne/nouvelle/page.tsx"]) {
      expect(code(page), `${page} ne passe pas le jour au parcours`).toMatch(/aujourdhui=\{/);
    }
  });
});
