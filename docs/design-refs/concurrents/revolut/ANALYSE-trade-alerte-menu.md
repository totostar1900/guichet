# Analyse : achat épuré, types d'ordre, alerte de seuil, menu « Plus », notification à trois boutons

*9 novembre 2026. À lire avec `NOTES.md` (index des images) et `ANALYSE-accueil.md`. Mesures lues sur des captures à 360 dp (×2,5), donc approximatives.*

## Les cinq écrans, en une phrase chacun

1. **Achat** (`trade-achat-montant-epure`) : l'écran ne dit qu'une chose, « combien ». Montant ≈ 50 dp gras, au centre ; équivalent en titres dessous (≈ 16 dp) avec un bouton rond de bascule montant ↔ titres ; le compte et son solde dans une pastille de 44 dp ; en pied, un rond blanc de 44 dp (options) et un bouton plein « Revoir » de 44 dp de haut, **grisé tant que le montant vaut zéro**.
2. **Types d'ordre** (`trade-types-d-ordre-feuille`) : une feuille du bas (poignée, titre centré, rayon ≈ 24 dp). Quatre lignes de ≈ 64 dp : icône ronde teintée (34 dp), nom (17 dp), **une phrase qui nomme la valeur** (14 dp, gris). La ligne choisie est surlignée (fond plus clair, rayon 20 dp) et son icône porte une coche.
3. **Accueil Invest** (`invest-accueil-menu-plus`) : le chiffre en haut, quatre gestes ronds de 56 dp avec libellé dessous ; le dernier, « Plus », ouvre un menu ancré de cinq entrées (icône + mot, sans filet, une pastille verte de nouveauté). Les comptes sont des cartes repliables ; une carte promotionnelle se ferme d'une croix ; la barre d'onglets est une pilule flottante.
4. **Alerte** (`alerte-prix-creation`) : titre de 34 dp, une phrase d'énoncé, un champ-carte (devise / valeur), le cours du jour dessous, **un seul bouton plein**, une barre d'opérateurs et un pavé numérique de l'application.
5. **Notification** (`notification-trois-boutons`) : une tuile qui se déplie et porte, dessous, trois boutons-pastilles de 36 dp sur une rangée.

## Ce que Guichet fait déjà, et l'écart

| Principe de la référence | Guichet aujourd'hui | Écart |
|---|---|---|
| Un champ, un geste, un bouton grisé tant que vide | le formulaire d'intention (`IntentForm`) porte type, montant, produit du rachat, frais, total, mentions, signatures : plusieurs écrans de contenu | long ; la saisie du montant n'est pas seule à l'écran |
| Options avancées derrière un rond, avec une phrase par option | les types d'intention (ferme, appétit, souscription…) sont des onglets du formulaire | pas de feuille « Types d'ordre » à une phrase par option |
| Alerte sur un seuil de valeur, cours du jour rappelé | « Suivre » (un message à chaque mouvement) et « Alerte » (un message par jour jusqu'à la clôture) : **aucun seuil** | l'alerte de seuil n'existe pas |
| « Plus » : menu court ancré, gestes quotidiens à l'air libre | l'accueil a Verser, Retrait, Investir, Plus ; le menu « ≡ » de l'en-tête | le contenu de « Plus » à relire (Documents, Réglages, Thème, Transfert…) |
| Trois boutons-pastilles sous une tuile dépliée | fait le 9 novembre 2026 (`CarteDepliee`) | atteint ; en 44 px, texte à --t-3 |
| Comptes en cartes repliables | le portefeuille est une page, sans cartes de comptes repliables | à discuter avec la centralisation du portefeuille |

## Ce qu'on ne reprend pas

La carte promotionnelle (« nouveaux actifs »), l'icône de compte « Robo-Advisor » (conseil automatisé non proposé), le fond photographique derrière le chiffre, la barre d'onglets flottante (la barre de Guichet est pleine largeur et à cinq entrées), « Capital at risk » en tête (le texte de risque suit `ETALON.md` § 10 : le geste avant la menace, rien retiré).

## Les idées à proposer à Guichet

1. **Une page d'ordre épurée** (« Revoir » grisé, options derrière un rond).
2. **Une feuille des types d'ordre**, une phrase par option.
3. **L'alerte de seuil** (cours ou rendement atteint), page épurée, cours du jour dessous.
4. **Un centre du portefeuille** : un menu « Plus » ancré et des gestes à l'air libre (ordres, intentions, sondages, provision, rachats, coupons, documents).
