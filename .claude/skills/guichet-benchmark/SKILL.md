---
name: guichet-benchmark
description: Aligner le design de Guichet sur celui des meilleures applications financières modernes, à partir d'images de référence de la concurrence. À utiliser quand le client veut « le même niveau que », « un design moderne comme », « plus dynamique / moins plat / plus premium » ou fournit des captures d'autres applications. Transforme des images en principes mesurables, compare avec l'écran réel de Guichet, chiffre l'écart et le propose en planche. Complète guichet-maquette ; ne copie jamais ni marque, ni texte, ni illustration d'un tiers.
---

# Guichet — se mesurer à la concurrence, puis s'en inspirer

**But :** que Guichet atteigne le niveau de finition des applications modernes de sa catégorie, **sans les copier**. On reprend des **principes** (hiérarchie, densité, rythme, états, gestes) ; on ne reprend ni logo, ni illustration, ni texte, ni couleur de marque, ni composition reconnaissable à l'identique.

Un skill ne rend pas le design meilleur à lui seul. Ce qui le rend meilleur, c'est une **boucle courte et mesurée** :

```
références (images) → principes écrits → écran Guichet capturé à l'identique
        → écart chiffré → planche A/B/C → choix du client → code → nouvelle capture → écart restant
```

Ce skill décrit les quatre premières étapes ; `guichet-maquette` mène la planche et le code ; `guichet-espace-tuiles` dit comment l'écart se traduit en jetons.

## 0. Références déjà analysées (à lire avant de redemander des images)

| Écran visé | Référence | Où |
|---|---|---|
| **Accueil** | une application de courtage moderne (Revolut Invest) : 23 captures versées | `docs/design-refs/concurrents/revolut/` — `NOTES.md` (index), `ANALYSE-accueil.md` (grille et écart), et `references/revolut-accueil.md` à côté de ce fichier (les neuf principes traduits en jetons de Guichet) |
| Fiche d'une ligne, épargne | mêmes captures, pas encore analysées en grille | idem, `NOTES.md` |
| Toute référence **Wise** | **aucune image reçue** | à demander |

Pour l'Accueil, partir de `references/revolut-accueil.md` : les principes y sont déjà écrits, avec leurs réserves propres à Guichet.

## 1. Ce qu'il faut du client (et comment le demander)

Pour qu'une référence serve, elle doit venir avec **quatre choses**. Si l'une manque, on la demande avant d'analyser :

1. **Les images** — dans `docs/design-refs/concurrents/<nom>/` (voir `docs/design-refs/README.md`). Idéalement **le même parcours** que l'écran de Guichet à améliorer : même état (liste, fiche, saisie du montant, confirmation, vide).
2. **Pourquoi celle-ci** — une ligne par image : ce qu'on aime (« la hiérarchie du solde », « les tuiles sans bordure »), et ce qu'on n'aime pas.
3. **L'écran de Guichet à comparer** — la page et l'état exacts, qu'on capture nous-mêmes à 390 px.
4. **Le degré de fidélité** — *s'inspirer du principe* (défaut) ou *approcher l'allure* (jamais l'identité). Et **les limites** : ce qui ne bouge pas (voix « Mes/Votre », absence de commission affichée au client, mentions réglementaires).

Les images qui aident le plus, dans l'ordre :
- **le même écran, chez deux ou trois acteurs**, à la même largeur ;
- **l'écran actuel de Guichet à côté**, capturé dans le même état ;
- **des annotations** (flèches, cercles, une phrase) qui disent *où* regarder ;
- **des anti-exemples** : ce qu'on ne veut surtout pas ;
- **des détails** (une tuile, un graphique, un état vide) quand l'écran entier noie l'idée.

## 2. Lire une référence : la grille d'analyse

Pour chaque image, remplir la grille de `docs/design-refs/_modele/ANALYSE.md`. On **décrit ce qu'on voit, on le mesure, on le traduit en jeton**. Dix lectures :

| Lecture | Ce qu'on note | Se traduit en… |
|---|---|---|
| **Hiérarchie** | le chiffre ou l'action dominants ; combien de niveaux de texte | échelle `--t-*`, poids, contraste |
| **Densité** | éléments par écran à 390 px ; lignes visibles sans défiler | écarts (`--sections-gap`…), hauteur de tuile |
| **Rythme** | régularité des écarts ; groupes séparés par l'espace plutôt que par des traits | jetons d'espace, chapitres |
| **Tuiles / cartes** | fond, bord, rayon, ombre, padding, présence de chevron | `--tuile-*`, aspect `tuiles/douces/lignes` |
| **Typographie** | familles, tailles relatives, chiffres tabulaires, casse des étiquettes | `--t-*`, `font-variant-numeric` |
| **Couleur** | nombre de teintes, rôle de la couleur (état, gain/perte, action) | palettes, `--good/--crit/--warn` |
| **Données** | graphique minimal ou riche ; sparkline ; variations en couleur ; unités | composants de courbe, format |
| **États** | vide, chargement, erreur, succès : ont-ils une voix ? | écrans vides, `null` des pièces muettes |
| **Gestes** | une action principale par écran ; confirmation ; retour ; gestes au pouce | barre d'action, bascules |
| **Confiance** | où sont mentions légales, sécurité, preuve d'avancement | mentions, bulles ⓘ, ancrage |

**Règle de lecture :** ne jamais écrire « c'est plus moderne ». Écrire « le solde est à 34 px, le reste à 13 px, six éléments par écran, aucune bordure, 16 px d'écart » — une phrase qu'on peut **tester** sur Guichet.

## 3. Capturer Guichet dans le même état

Un écart ne se mesure que contre un écran capturé **dans les mêmes conditions** que la référence : même largeur (390 px), même thème, même état. Procédure : application lancée (`npm run dev`, un seul serveur), session de démonstration, Playwright, capture à échelle ×2 et **mesures** (positions, hauteurs, écarts, tailles de police calculées). Nommer les captures `docs/design-refs/guichet-actuel/<écran>-<date>.png`.

Si l'état voulu n'existe pas dans la démonstration (pas de ligne suivie, pas de bulletin), le **simuler** par le DOM ou le déclarer « non vu » : on ne compare pas à un écran qu'on n'a pas.

## 4. L'écart, chiffré

Produire un tableau court, **une ligne par principe** :

| Principe observé chez la référence | Mesure référence | Guichet aujourd'hui | Écart | Jeton ou fichier concerné |
|---|---|---|---|---|
| chiffre dominant de la tuile | 28 px / 700 | 18 px / 600 | −10 px | `--t-*` de `DossierAccueil.module.css` |
| air autour des tuiles | 16 px | 12 px | −4 px | `--tuiles-gap` (jeton global : mesurer l'effet partout) |
| bord de tuile | aucun, fond seul | 1 px | — | aspect « douces » ou « lignes » |

Puis **trier** : ce qui se règle en une ligne de jeton (effet global, à valider à l'échelle de l'application) ; ce qui demande de refaire un composant ; ce qui n'est **pas transposable** (autre marché, autre réglementation, autre public).

## 5. Les garde-fous propres à Guichet

Une référence moderne peut être **fausse pour nous**. Avant de proposer quoi que ce soit, vérifier :

- **Conformité** : les mentions réglementaires et les avertissements de performance restent **visibles** à côté des chiffres qu'ils qualifient ; une bulle ⓘ ne remplace pas un avertissement obligatoire (le dire, ne pas le trancher).
- **Aucune commission affichée au client** (règle de la maison).
- **Pas de gamification trompeuse** (confettis sur un ordre, urgence artificielle) : un ordre engage de l'argent réel.
- **Un chiffre sans date ni unité n'est pas lisible** : la fraîcheur du chiffre reste affichée.
- **La voix** : « Mes/Mon » pour les lieux du client, « Votre » pour la maison (`ETALON.md` § 9).
- **Le public** : épargnant de la zone CEMAC, souvent sur téléphone, parfois réseau lent ; un effet gourmand n'est pas « moderne », il est lent.
- **L'accessibilité** : contraste, cibles tactiles d'au moins 44 px, texte lisible sans couleur seule.
- **La propriété** : on s'inspire de la structure ; ni marque, ni illustration, ni texte, ni icône propriétaire. Une maquette ne porte **jamais** le nom ou le logo d'un concurrent (voir la règle de l'outil Artifact sur l'imitation).

## 6. De l'écart à la planche

Les écarts triés alimentent une planche `guichet-maquette`, avec **trois formes de section** utiles ici :

1. **« Avant / après »** : la capture actuelle à gauche, l'état visé à droite (dessiné avec les jetons), les mesures en dessous.
2. **« Principe → options »** : le principe observé (une phrase testable), puis A/B/C de la façon de l'appliquer à Guichet, du plus léger (un jeton) au plus profond (un composant).
3. **« Ce qu'on ne reprend pas »** : le principe écarté et la raison (conformité, public, coût), pour que le client sache qu'on l'a vu.

Chaque option dit **ce que son application change** dans toute l'application quand c'est un jeton (« passer `--tuiles-gap` à 16 px change 40 pages : à mesurer »).

## 7. Après le code : refermer la boucle

1. Recapturer l'écran, dans le même état, à la même largeur.
2. Refaire les mesures du tableau d'écart ; **dire ce qui est atteint, ce qui reste, ce qui a régressé**.
3. Archiver la capture « après » à côté de « avant » (`docs/design-refs/guichet-actuel/`), avec le commit.
4. Si un principe se révèle bon à l'échelle, **l'écrire dans la doctrine** (`ETALON.md`) et dans le skill concerné : c'est ainsi que Guichet s'améliore d'une demande à l'autre.

## 8. Pièges

- **Copier l'écran au lieu du principe** : on obtient un clone sans âme et un risque d'imitation.
- **Une seule référence** : elle impose son goût. Au moins deux, de familles différentes (courtier mondial, banque mobile, application locale), et on cherche ce qu'elles **partagent**.
- **Comparer des états différents** : un écran chargé de données contre un écran vide ne dit rien.
- **« Plus moderne » sans mesure** : voir la règle de lecture.
- **Changer un jeton global pour une demande locale** : mesurer l'effet sur les autres pages, ou le faire par une classe locale, mais jamais par une valeur en dur.
- **Oublier ce que la démonstration ne montre pas** : la comparaison porte sur ce qu'on a vu.
