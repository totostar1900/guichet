# Analyse — l'accueil d'une application de courtage moderne (Revolut Invest)

**Écran** : accueil connecté, thème sombre, une session avec un compte de courtage.
**Images** : `accueil-capture-longue-1..4`, `accueil-grille-produits`, `trade-listes-obligations`.
**Pourquoi cette référence** : le client la tient pour le niveau de finition visé (« design moderne de la concurrence »). Wise : images à fournir.
**Équivalent Guichet** : `/` (Console), client connecté, 390 px — capture `docs/design-refs/guichet-actuel/accueil-390-2026-11-02.png`.
**Méthode des mesures de la référence** : captures de 720 px de large lues à l'échelle ×2 (1 dp ≈ 2 px d'image) ; les valeurs « ≈ » sont des **ordres de grandeur** relevés sur l'image, pas des cotes. Les mesures de Guichet sont calculées dans le navigateur.

## Grille

| Lecture | Référence (ce qu'on voit) | Guichet aujourd'hui (mesuré) | Écart |
|---|---|---|---|
| **Hiérarchie** | un chiffre dominant tout en haut (le capital) ≈ 36–40 dp, avec la variation sous lui ; une légende « capital en risque » à côté | le chiffre du portefeuille existe (33 px) mais il est **le troisième chapitre**, à ≈ 850 px du haut ; le haut dit « Bonjour » (30 px) puis les devoirs | le chiffre qui rassure n'est pas en tête |
| **Densité** | une dizaine de blocs, chacun = un titre, 3 rangées, « Tout voir » | sept chapitres, une page de **3 792 px** à 390 px | plus long, plus de blocs à lire avant la fin |
| **Rythme** | blocs séparés par un grand blanc régulier (≈ 24–28 dp), rangées d'une carte séparées par l'espace seul | 44 / 28 / 12 px mesurés, réguliers | **comparable** — le rythme de Guichet est déjà tenu par des jetons |
| **Tuiles / cartes** | **une carte par bloc**, rayon ≈ 20 dp, padding ≈ 14–16 dp, fond un cran plus clair que la page, **aucun trait** entre les rangées | **une tuile par rangée**, rayon **6 px**, 12 × 16 px, bord 1 px, traits entre les lignes | rayon ×3 plus faible ; rangées en tuiles séparées plutôt qu'en carte |
| **Typographie** | titre de bloc ≈ 16–17 dp, nom de rangée ≈ 14–15 dp, méta ≈ 12–13 dp, chiffre ≈ 14–15 dp en gras | titre de section **10,5 px** en capitales espacées, titre de tuile **12 px**, nom de ligne **11,1 px**, méta **10,2 px** | **le texte de Guichet est environ 25 à 35 % plus petit** ; c'est l'écart le plus visible |
| **Titres de bloc** | sobres, casse normale, avec un **chevron** (le titre est un lien) ; « Tout voir » en couleur d'accent à droite | capitales espacées, sans chevron ; lien « Toutes les échéances → » souligné | style, et le titre qui mène nulle part |
| **Couleur** | gris et blanc ; rouge / vert uniquement pour les variations ; peu d'accent | marine, bordures bleutées, or pour l'action et les étiquettes | Guichet a plus de teintes, mais cohérentes |
| **Données** | graphique pleine largeur dans le haut de l'écran ; rangées avec **valeur à droite et variation colorée dessous** | courbe en bas du chapitre « relevé » ; rangées avec état ou date à droite | la valeur et sa variation, côte à côte, n'existent que dans les lignes suivies |
| **Avatars** | un rond (logo, drapeau pour un État) à gauche de chaque rangée | aucun | repère visuel absent |
| **États** | bandeaux colorés pour les événements (marché fermé), vide soigné | bandeaux pour les devoirs (or) ; pièces muettes | comparable |
| **Gestes** | quatre boutons ronds sous le chiffre (Trade, Ajouter de l'argent, Retirer, Plus) | aucun raccourci d'action ; la barre du bas porte Trade | gestes fréquents à un toucher du chiffre |
| **Personnalisation** | « Ajouter des widgets » en pied | aucune | hors périmètre pour l'instant |
| **Confiance** | « capital en risque » près du chiffre, avertissements en pied, petit et gris | avertissements dans l'aide ; rien en pied d'Accueil | pied d'Accueil sans mention |

## Ce qu'on retient (principes)

1. **Le chiffre du portefeuille en tête, avec sa variation** — mais Guichet a décidé que « les devoirs passent d'abord » : à arbitrer, pas à imiter.
2. **Une échelle de texte plus grande** : le gain de lisibilité vient d'abord de la taille, pas de la décoration.
3. **Un titre de bloc qui est un lien** (chevron), et « Tout voir » à droite.
4. **Une carte par bloc**, rayon généreux, rangées séparées par l'espace.
5. **La rangée à deux colonnes** : identité à gauche, valeur et variation à droite.
6. **Un avatar** par rangée (un drapeau pour un Trésor, un monogramme pour une société).
7. **Des raccourcis d'action ronds** sous le chiffre.
8. **Les chiffres tabulaires**, avec des décimales plus petites quand il y en a.
9. **Un pied réglementaire discret.**

## Ce qu'on ne retient pas

- **Le bandeau promotionnel** (« N nouveaux actifs ») : de la croissance, pas du service ; Guichet n'a pas à pousser du volume.
- **Les « plus fortes hausses / baisses »** et les « plus échangés » en pastilles rondes : ils poussent à acheter ce qui bouge, ce qui va contre la mission d'épargne.
- **Les CFD, le conseil automatisé, les marchés privés** : produits que Guichet ne propose pas.
- **La personnalisation des blocs** (ajouter, déplacer) : elle contredit l'ordre « devoirs, occasions, constat » et demande de la persistance. À réserver.
- **L'image d'ambiance derrière le chiffre** : décorative, lourde sur un réseau lent.

## Droits et conformité

- [x] Aucune donnée personnelle ni réelle d'un client dans les images versées.
- [x] On reprend des **principes**, pas la marque, le texte, l'illustration ou l'icône.
- [x] Les mentions réglementaires de Guichet restent visibles dans l'adaptation (voir le principe 9).
