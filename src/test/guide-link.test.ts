import { describe, expect, it } from "vitest";
import { CLES_LECONS, leconDuClient, sectionDuDesk } from "@/lib/guide-link";
import { LESSONS } from "@/data/lessons";
import { GUIDE } from "@/data/desk-guide";

/**
 * UNE ANCRE VERS UNE SECTION DISPARUE OUVRE LE GUIDE EN HAUT, SANS RIEN DIRE.
 *
 * C'est la panne muette de ce lot : le lien marche, la page s'ouvre, et le
 * lecteur ne voit pas qu'il n'est pas arrivé là où on le menait. Rien ne
 * l'aurait signalé.
 *
 * Le cliquet tient donc deux choses : que chaque clef citée désigne un éclairage
 * ou une section qui existe, et que les familles d'écrans ne se volent pas
 * leurs adresses, la fiche d'un fonds étant aussi une fiche.
 */
describe("la porte du guide depuis une page", () => {
  it("ne cite que des éclairages qui existent", () => {
    const connues = new Set(LESSONS.map((l) => l.key));
    for (const cle of CLES_LECONS) expect(connues.has(cle), cle).toBe(true);
  });

  it("ne cite que des sections du guide du desk qui existent", () => {
    const connues = new Set(GUIDE.map((g) => g.key));
    for (const g of GUIDE) {
      const l = sectionDuDesk(g.path.replace(/\/….*$/, ""));
      expect(l, g.path).toBeTruthy();
      expect(connues.has(l!.href.split("#")[1]), g.path).toBe(true);
    }
  });

  it("range la fiche d'un fonds avec les fonds, et non avec les titres", () => {
    expect(leconDuClient("/offres/fund-fcp-monetaire")!.href).toBe("/info/fonds-vl");
    expect(leconDuClient("/offres/boc-cm0000020388")!.href).toBe("/info/lire-une-ota");
  });

  it("mène chaque famille d'écrans à sa éclairage", () => {
    const attendu: [string, string][] = [
      ["/fonds", "/info/fonds-vl"],
      ["/titres", "/info/lire-une-ota"],
      ["/calendrier", "/info/adjudication"],
      ["/societes", "/info/action-cotee"],
      ["/indice", "/info/indice-bvmac"],
      ["/comparer", "/info/coupon-et-rendement"],
    ];
    for (const [page, href] of attendu) expect(leconDuClient(page)?.href, page).toBe(href);
  });

  it("ne force pas un éclairage là où aucune ne parle de la page", () => {
    /* Un lien qui mènerait « quelque part dans le guide » vaut moins que pas de
       lien : il apprend au lecteur que la porte ne sert à rien. */
    for (const p of ["/", "/trader", "/moi/profil", "/moi/performance", "/moi/documents"]) expect(leconDuClient(p), p).toBeUndefined();
  });
});
