# Référence analysée : l'accueil d'une application de courtage moderne

*À lire avec `docs/design-refs/concurrents/revolut/ANALYSE-accueil.md` (grille complète) et `NOTES.md` (index des images). Les images sont dans `docs/design-refs/concurrents/revolut/` ; à ouvrir avant de proposer quoi que ce soit.*

## Images à regarder pour l'Accueil

| Pour voir… | Ouvrir |
|---|---|
| l'ordre des blocs et le rythme de toute la page | `accueil-capture-longue-1.jpeg` (puis `-2`, `-3`) |
| que la structure survit à un autre thème | `accueil-capture-longue-4-theme-vert.jpeg` |
| la tuile-icône et le titre de bloc discret | `accueil-grille-produits.jpeg` |
| la rangée « identité à gauche, valeur à droite » et « Tout voir » | `trade-listes-obligations.jpeg` |
| le prix en grand et le graphique pleine largeur (fiche) | `fiche-obligation-prix-et-graphique.jpeg` |

## Les neuf principes, et où ils se traduisent dans Guichet

| # | Principe | Se traduit en… | Réserve propre à Guichet |
|---|---|---|---|
| 1 | Le chiffre du portefeuille en tête, avec sa variation | un chapitre « hero » de l'Accueil | la maison a décidé « les devoirs d'abord, puis les occasions, puis le constat » : **arbitrer, ne pas imiter** |
| 2 | Une échelle de texte plus grande | jetons `--t-*` de `globals.css` — **globaux** : mesurer l'effet sur toutes les pages, ou piloter l'Accueil par classes locales | texte de Guichet ≈ 25–35 % plus petit que la référence |
| 3 | Titre de bloc = lien à chevron, « Tout voir » à droite | `TitreDeBloc` : **fait le 8 novembre 2026** (bandeau dans la carte, `--t-6`, « Tout voir › » or, 44 px ; `ETALON.md` § 8.15) | le bandeau est dans la carte (la référence le pose à plat) : choix du client, planche 1B |
| 4 | Une carte par bloc, rayon généreux, rangées séparées par l'espace | un aspect de plus dans `AspectDesTuiles` (`config.ts`) + un bloc `html[data-tuiles="…"]` | rayon actuel 6 px ; les six familles de tuiles lisent les mêmes jetons |
| 5 | Rangée à deux colonnes : identité à gauche, valeur et variation à droite | classes `qui` / `quoi` de `DossierAccueil` (déjà là pour les lignes suivies) | un chiffre sans date ni unité n'est pas lisible |
| 6 | Un avatar rond par rangée (drapeau pour un Trésor, monogramme sinon) | composant d'avatar ; drapeaux en SVG de domaine public | pas d'emoji (rendu inégal), pas de logo tiers |
| 7 | Raccourcis d'action ronds sous le chiffre | rangée de 3 à 4 liens (Verser, Retirer, Investir, Plus) | seulement si le compte est ouvert et la convention acceptée |
| 8 | Chiffres tabulaires, décimales plus petites | `font-variant-numeric: tabular-nums` (déjà là), classe de décimales | les montants en FCFA n'ont pas de décimales ; vaut pour les taux |
| 9 | Pied réglementaire discret | un paragraphe en pied d'Accueil | la maison tranche le texte ; ne pas cacher un avertissement obligatoire |

## Les quatre principes de navigation (2 novembre 2026)

Sources : `trade-listes-obligations.jpeg` (listes de catégories), `fiche-obligation-capture-longue.jpeg` et `fiche-capture-longue-1/2.jpeg` (fiches). Ils répondent à : comment une liste d'entrée se relie à sa fiche, et la fiche à la liste complète.

| # | Principe | Dans Guichet | Réserve |
|---|---|---|---|
| 10 | **Une carte par catégorie** (« Government bonds », « Corporate bonds »), trois rangées généreuses | un bloc par famille (Titres, Fonds) pleine largeur, pas une demi-tuile à deux lignes | la maison n'a que 2 familles cotées : ne pas inventer de catégories |
| 11 | **La rangée entière est un lien vers la fiche ; le titre du bloc et « See all » mènent à la liste** | rangée = lien `/offres/{id}` ; titre et « Tout voir » = lien vers `/titres`, `/fonds` | **jamais de lien dans un lien** : la tuile devient un conteneur, le titre un lien, chaque rangée un lien |
| 12 | **La rangée dit l'essentiel sans ouvrir** : nom jusqu'à 3 lignes, méta (coupon · échéance), valeur à droite avec son libellé dessous (« Yield ») | nom jusqu'à 2 lignes, méta (échéance, émetteur), valeur en gras + libellé (« rendement », « sur 12 mois »), pastille de variation | un chiffre sans libellé ni date n'est pas lisible ; pas de troncature à une ligne |
| 13 | **La fiche garde ses sorties** : « See all » par section (stats, notes, attributs), et « similaires » en bas de la fiche d'une action | un pied de fiche « Lignes similaires » (même émetteur, même famille) et un lien « Voir toutes les … » vers la liste, filtrée comme on est arrivé | les similaires ne recommandent rien : même famille ou même émetteur, jamais « pour vous » |

**Palette des chiffres (2 novembre 2026, choix P2).** Le cours en or (`--accueil-cours`), les revenus (dividende, rendement, coupon) en bleu d'information (`--accueil-revenu`), la variation en vert ou rouge ; l'unité en très petit. Deux jetons de page : un mot à changer pour tout recolorer. À mesurer en deux thèmes (contraste d'au moins 4,5:1 sur la carte).

Mesures Revolut : rangée ≈ 80 px de haut à 360 px de large (165 px sur la capture de 720), nom 15 px, méta 12 px, valeur à droite en gras ; carte de rayon 16 px sans trait entre les rangées.

## Ce qu'on ne reprend pas (raisons écrites)

Bandeau promotionnel, « plus fortes hausses / baisses » et « plus échangés » (poussent à acheter ce qui bouge), CFD / conseil automatisé / marchés privés (non proposés), personnalisation des blocs (contredit l'ordre des blocs, demande de la persistance), image d'ambiance derrière le chiffre (décorative, lourde sur un réseau lent).

## Mesures de départ de Guichet (Accueil, 390 px, 2 novembre 2026)

Titre de section 10,5 px capitales · titre de tuile 12 px · nom de ligne 11,1 px · méta 10,2 px · tuile : rayon 6 px, padding 12 × 16 px, bord 1 px · chiffre du portefeuille 33 px, au troisième chapitre · écarts 44 / 28 / 12 px · page de 3 792 px. Capture : `docs/design-refs/guichet-actuel/accueil-390-2026-11-02.png`. **À refaire avant toute nouvelle comparaison** : les valeurs bougent avec le code.

## Les six principes d'achat, d'alerte et de menu (9 novembre 2026)

Sources : `trade-achat-montant-epure`, `trade-types-d-ordre-feuille`, `alerte-prix-creation`, `invest-accueil-menu-plus`, `notification-trois-boutons` (voir `ANALYSE-trade-alerte-menu.md`).

| # | Principe | Dans Guichet | Réserve |
|---|---|---|---|
| 14 | **Un écran d'ordre ne dit que « combien »** : le montant en très grand, l'équivalent en titres dessous, le compte et le solde dans une pastille, un bouton plein « Revoir » grisé tant que le montant est nul | une page d'ordre épurée avant l'`IntentForm` complet ; le solde disponible sous le champ | les frais et les mentions restent dites avant l'engagement : « Revoir » est le lieu où elles s'écrivent, pas l'endroit d'où on les retire (§ 10) |
| 15 | **Les options avancées sont derrière un rond**, et s'ouvrent en feuille du bas avec UNE PHRASE par option, qui nomme la valeur | feuille « Types d'ordre » : ferme, appétit, programmé, avec ce que chacun fait | la maison n'a pas d'ordre « au marché » : ne pas inventer de types qu'elle ne propose pas |
| 16 | **L'alerte se pose sur une valeur** (un seuil), le cours du jour rappelé dessous, un seul bouton | alerte de seuil sur un cours ou un rendement | demande le robot de suivi et une donnée de plus par alerte (types + migration) : à discuter |
| 17 | **Un clavier numérique maison avec opérateurs** (+ − × ÷ =) pour calculer son seuil ou son montant | le champ de montant de l'ordre et du versement | un clavier système suffit tant que la saisie reste courte |
| 18 | **Un menu « Plus » court, ancré à son déclencheur**, icône + mot, une pastille de point vert pour « nouveau » ; les gestes de tous les jours sont à l'air libre | centre du portefeuille : ordres, intentions, sondages, provision, coupons, documents | un menu ne contient pas ce qui se fait chaque semaine : c'est un geste à l'air libre |
| 19 | **Trois boutons-pastilles sous une tuile dépliée** (notification) | fait : `CarteDepliee` (l'action de la ligne, Favori, la fiche) | « Favori » est le suivi de la maison, pas une liste de souhaits |
