import { describe, expect, it } from "vitest";
import { CATALOGUE, ETAPES, RAISON, RAYONS, servicesDuClient, type ContexteClient } from "@/lib/domain/services";

/**
 * LE CATALOGUE DIT CE QUI EXISTE, `servicesDuClient` DIT CE QU'UN CLIENT VOIT.
 *
 * La seconde liste dépend de tout : du dossier, des lignes détenues, d'un
 * mandat signé, d'un coupon qui dort. La première n'a pas de client sous les
 * yeux — c'est ce que la recherche indexe, et ce qu'un lecteur tape dans un
 * champ avant de savoir ce que la maison propose.
 *
 * DEUX LISTES DE LA MÊME CHOSE DIVERGENT, et la maison l'a déjà payé trois
 * fois cette semaine : un sommaire qui citait cinq pages quand le rail en
 * citait sept, un siège qui portait ses rubriques à la main, un rail du marché
 * invisible à toute largeur. Cette épreuve monte donc un client qui a TOUT —
 * un dossier approuvé, une convention acceptée, des lignes, un mandat, des
 * liquidités — et compare clef pour clef, nom pour nom, porte pour porte.
 *
 * ELLE TIENT AUSSI LES DEUX TABLES VOISINES : une raison d'être et des étapes
 * par service, sans quoi la page de « Trade » montre un service muet et la
 * recherche une entrée sans phrase.
 */
const CLIENT_QUI_A_TOUT = {
  dossier: "ok",
  compteOuvert: true,
  peutOPCVM: true,
  lignes: 3,
  fonds: 2,
  disponible: 250_000,
  aSigner: 0,
  aRepondre: 0,
  mandatASigner: false,
  reinvestissement: undefined,
  epargne: undefined,
  prelevement: undefined,
  prochaineSeance: undefined,
  attendu: undefined,
} as unknown as ContexteClient;

describe("le catalogue des services", () => {
  const vus = servicesDuClient(CLIENT_QUI_A_TOUT);

  it("monte bien un client, et pas une coquille", () => {
    // Une épreuve qui compare deux listes vides passe toujours.
    expect(vus.length).toBeGreaterThan(5);
    expect(CATALOGUE.length).toBeGreaterThan(5);
  });

  it("nomme exactement les services qu'un client voit", () => {
    const duCode = [...new Set(vus.map((s) => s.cle))].sort();
    const duCatalogue = [...new Set(CATALOGUE.map((s) => s.cle))].sort();
    expect(duCatalogue, "le catalogue et les services rendus ne nomment plus les mêmes clefs").toEqual(duCode);
  });

  it("leur donne le même nom et la même porte", () => {
    const écarts: string[] = [];
    for (const s of vus) {
      const c = CATALOGUE.find((x) => x.cle === s.cle);
      if (!c) continue;
      if (c.nom !== s.nom) écarts.push(`${s.cle} : « ${c.nom} » au catalogue, « ${s.nom} » à l'écran`);
      if (c.href !== s.href) écarts.push(`${s.cle} : ${c.href} au catalogue, ${s.href} à l'écran`);
      if (c.rayon !== s.rayon) écarts.push(`${s.cle} : rayon ${c.rayon} au catalogue, ${s.rayon} à l'écran`);
    }
    expect(écarts, `le catalogue a dérivé :\n  ${écarts.join("\n  ")}`).toEqual([]);
  });

  it("donne à chacun sa raison d'être et ses étapes", () => {
    const sansRaison = CATALOGUE.filter((c) => !RAISON[c.cle]).map((c) => c.cle);
    const sansEtapes = CATALOGUE.filter((c) => !ETAPES[c.cle]?.length).map((c) => c.cle);
    expect(sansRaison, "ces services sortiraient muets dans la recherche").toEqual([]);
    expect(sansEtapes, "ces services n'auraient rien à montrer sur la page Trade").toEqual([]);
  });

  it("range chacun dans un rayon qui existe", () => {
    const rayons = new Set(RAYONS.map((r) => r.cle));
    expect(CATALOGUE.filter((c) => !rayons.has(c.rayon)).map((c) => c.cle), "un rayon inconnu range le service nulle part").toEqual([]);
  });
});
