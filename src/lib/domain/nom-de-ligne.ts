/**
 * LE NOM D'UNE SÉANCE DU TRÉSOR, SANS SON PAYS (9 novembre 2026, planche « Cartes, adjudications, portefeuille », 2B).
 *
 * Le titre d'une séance s'écrit « OTA 6,25 % · 5 ans · Gabon » ou « BTA 13 semaines · Tchad » ; le drapeau et le Trésor, sur la carte, disent déjà le pays. La carte écrit l'instrument et sa durée
 * (« OTA 6,25 % · 5 ans »), ce qui distingue deux lignes du même pays, au lieu de « Trésor public GAB » qui les confondait. Le dernier segment n'est retiré que s'il ne porte aucun chiffre : « Rachat OTA 6,50 % · éch.
 * 14 févr. 2028 » garde sa date.
 */
export function nomDeSeance(titre: string): string {
  const morceaux = titre.split(" · ");
  if (morceaux.length >= 2 && !/\d/.test(morceaux[morceaux.length - 1])) return morceaux.slice(0, -1).join(" · ");
  return titre;
}
