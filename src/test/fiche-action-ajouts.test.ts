import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");
const FICHE = "src/app/offres/[id]/FicheAction.tsx";

/**
 * LA FICHE D'UNE ACTION GAGNE TROIS LECTURES ET N'EN PERD AUCUNE (14 novembre 2026, planche 1A : « en rajout, en complément de l'existant »).
 * Chaque section d'avant doit y être encore, et les ajouts ne doivent pas être mélangés à elles.
 */
describe("la fiche d'une action : des ajouts, aucun retrait", () => {
  const src = lire(FICHE);

  it("garde toutes ses sections d'avant", () => {
    for (const titre of ["Cours", "Chiffres clés", "Séances", "Cotation et règlement", "Documents", "L'émetteur", "Performance financière", "Dividende par action", "Actionnaires"]) {
      expect(src, `la section « ${titre} » a disparu de la fiche`).toMatch(new RegExp("\\bt\\(" + JSON.stringify(titre).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\)"));
    }
    expect(src, "la courbe du cours a disparu").toMatch(/<CourbeDuCours points=\{points\} \/>/);
    expect(src, "le rendement du dernier dividende a disparu des chiffres clés").toMatch(/Rendement du dernier dividende/);
    expect(src, "le tableau des séances a disparu").toMatch(/<SeancesDeLAction quotes=\{quotes\} \/>/);
  });

  it("ajoute les trois lectures, chacune dans sa section", () => {
    expect(src, "les repères sur 52 semaines ont disparu").toMatch(/Plus bas · 52 semaines/);
    expect(src, "la section « Dividendes versés » a disparu").toMatch(/titre=\{t\("Dividendes versés"\)\}/);
    expect(src, "la section « Contre l'indice » a disparu").toMatch(/titre=\{t\("Contre l'indice"\)\}/);
    expect(src, "la ligne « aucune séance publiée » a disparu").toMatch(/Aucune séance publiée depuis \{n\} jours/);
  });

  it("range les ajouts à côté de ce qu'ils complètent : les versements sous les chiffres clés, la comparaison sous les séances", () => {
    const i = (s: string) => src.indexOf(s);
    expect(i('titre={t("Chiffres clés")}'), "les versements ne suivent plus les chiffres clés").toBeLessThan(i('titre={t("Dividendes versés")}'));
    expect(i('titre={t("Dividendes versés")}'), "les versements ne précèdent plus les séances").toBeLessThan(i('titre={t("Séances")}'));
    expect(i('titre={t("Séances")}'), "la comparaison ne suit plus les séances").toBeLessThan(i('titre={t("Contre l\'indice")}'));
    expect(i('titre={t("Contre l\'indice")}'), "la comparaison ne précède plus la cotation").toBeLessThan(i('titre={t("Cotation et règlement")}'));
  });

  it("ne lit les ajouts que dans les lectures testées, sans recalculer ailleurs", () => {
    expect(src).toMatch(/from "@\/lib\/market\/fiche-action"/);
    expect(src, "l'écart est recalculé dans la fiche").not.toMatch(/ecartPts\s*=|indicePct\s*=|titrePct\s*=/);
  });

  it("garde la mention de risque et le « ne préjuge pas » à côté des chiffres qu'ils qualifient", () => {
    expect(src).toMatch(/Les séances passées ne préjugent pas des suivantes/);
    expect(src).toMatch(/Un dividende passé ne préjuge pas des suivants/);
    expect(src).toMatch(/Communication à caractère promotionnel/);
  });

  it("la lecture des bulletins ne se fait que pour une action cotée", () => {
    const l = lire("src/app/offres/[id]/FicheReading.tsx");
    expect(l, "les bulletins sont lus pour toutes les fiches").toMatch(/o\.kind === "MARCHE" && o\.instrument === "action" && o\.priceSource === "boc" \? r\.listBulletins\(400\)/);
  });
});
