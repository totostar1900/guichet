# Analyse d'une référence — modèle à copier

> Copier ce fichier dans `docs/design-refs/concurrents/<nom>/ANALYSE-<ecran>.md`, un par écran analysé.
> Écrire **ce qu'on voit et ce qu'on mesure**, pas « c'est moderne ». Une phrase doit pouvoir se tester sur Guichet.

**Application** : _(nom de l'acteur, catégorie : courtier mondial / banque mobile / application locale)_
**Écran** : _(ex. « fiche d'un fonds », « saisie du montant », « accueil connecté »)_
**Image(s)** : `01-….png`, `02-….png` — largeur : _(390 px de préférence)_
**Pourquoi cette référence** : _(ce qu'on aime / ce qu'on n'aime pas, dit par le client)_
**Équivalent Guichet** : _(page et état exacts, ex. « /offres/fcp-obligataire, onglet Chiffres, connecté »)_ — capture : `docs/design-refs/guichet-actuel/….png`

## Grille

| Lecture | Ce que je vois / mesure | Traduction possible dans Guichet |
|---|---|---|
| Hiérarchie (chiffre dominant, niveaux de texte) | | `--t-*`, poids |
| Densité (éléments par écran à 390 px) | | écarts, hauteur de tuile |
| Rythme (régularité, groupes par l'espace) | | jetons d'espace, chapitres |
| Tuiles / cartes (fond, bord, rayon, ombre, padding, chevron) | | `--tuile-*`, aspect |
| Typographie (familles, tailles relatives, chiffres tabulaires) | | `--t-*` |
| Couleur (nombre de teintes, rôle) | | palettes, états |
| Données (graphique, variation, unités) | | composants de courbe |
| États (vide, chargement, erreur, succès) | | écrans vides |
| Gestes (action principale, confirmation, pouce) | | barre d'action |
| Confiance (légal, sécurité, avancement) | | mentions, bulles ⓘ |

## Ce qu'on retient / ce qu'on ne retient pas

- **Retenir** : …
- **Ne pas retenir** (et pourquoi : conformité, public, marque, coût) : …

## Droits et conformité

- [ ] Aucune donnée personnelle ni réelle d'un client dans l'image.
- [ ] On reprend un **principe**, pas la marque, le texte, l'illustration ou l'icône.
- [ ] Les mentions réglementaires de Guichet restent visibles dans l'adaptation.
