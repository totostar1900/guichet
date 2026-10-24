import { redirect } from "next/navigation";

/**
 * LE SOMMAIRE DU PORTEFEUILLE A FERMÉ, le 24 octobre 2026.
 *
 * Il portait une bande d'attentes et cinq rubriques, dont la première était
 * la racine elle-même : « Tableau de bord », déclarée dans `nav-groups` avec
 * `href: "/"`. Le siège menait donc à une page dont le premier élément était
 * la page d'où l'on venait, à un geste de plus.
 *
 * La racine fait maintenant le travail entier : elle porte ce qui attend, la
 * provision, les lignes, et les chemins vers l'analyse, le réinvestissement
 * et les documents. Un sommaire qui résume la page d'accueil n'ajoute qu'un
 * palier.
 *
 * UNE REDIRECTION TEMPORAIRE, ET C'EST VOULU. Un 308 se grave dans les
 * navigateurs : si la maison revenait sur la fusion, les clients qui ont
 * visité cette adresse resteraient renvoyés des mois durant. 307 coûte une
 * requête et se défait.
 *
 * L'adresse reste servie plutôt que supprimée : elle est dans l'historique
 * des téléphones, dans des signets, et dans les liens que le desk a pu
 * envoyer.
 */
export default function PortefeuilleDeplace() {
  redirect("/");
}
