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
| 3 | Titre de bloc = lien à chevron, « Tout voir » à droite | `EnTete` de section, `.eyebrow` | aujourd'hui capitales espacées de 10,5 px |
| 4 | Une carte par bloc, rayon généreux, rangées séparées par l'espace | un aspect de plus dans `AspectDesTuiles` (`config.ts`) + un bloc `html[data-tuiles="…"]` | rayon actuel 6 px ; les six familles de tuiles lisent les mêmes jetons |
| 5 | Rangée à deux colonnes : identité à gauche, valeur et variation à droite | classes `qui` / `quoi` de `DossierAccueil` (déjà là pour les lignes suivies) | un chiffre sans date ni unité n'est pas lisible |
| 6 | Un avatar rond par rangée (drapeau pour un Trésor, monogramme sinon) | composant d'avatar ; drapeaux en SVG de domaine public | pas d'emoji (rendu inégal), pas de logo tiers |
| 7 | Raccourcis d'action ronds sous le chiffre | rangée de 3 à 4 liens (Verser, Retirer, Investir, Plus) | seulement si le compte est ouvert et la convention acceptée |
| 8 | Chiffres tabulaires, décimales plus petites | `font-variant-numeric: tabular-nums` (déjà là), classe de décimales | les montants en FCFA n'ont pas de décimales ; vaut pour les taux |
| 9 | Pied réglementaire discret | un paragraphe en pied d'Accueil | la maison tranche le texte ; ne pas cacher un avertissement obligatoire |

## Ce qu'on ne reprend pas (raisons écrites)

Bandeau promotionnel, « plus fortes hausses / baisses » et « plus échangés » (poussent à acheter ce qui bouge), CFD / conseil automatisé / marchés privés (non proposés), personnalisation des blocs (contredit l'ordre des blocs, demande de la persistance), image d'ambiance derrière le chiffre (décorative, lourde sur un réseau lent).

## Mesures de départ de Guichet (Accueil, 390 px, 2 novembre 2026)

Titre de section 10,5 px capitales · titre de tuile 12 px · nom de ligne 11,1 px · méta 10,2 px · tuile : rayon 6 px, padding 12 × 16 px, bord 1 px · chiffre du portefeuille 33 px, au troisième chapitre · écarts 44 / 28 / 12 px · page de 3 792 px. Capture : `docs/design-refs/guichet-actuel/accueil-390-2026-11-02.png`. **À refaire avant toute nouvelle comparaison** : les valeurs bougent avec le code.
