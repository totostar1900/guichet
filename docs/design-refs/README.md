# Images de référence du design

Déposer ici les images qui montrent **l'allure voulue** : une capture d'une autre application,
une maquette, la capture de l'écran actuel avec une annotation. Claude les lit directement.

## Organisation

```
docs/design-refs/
  concurrents/<nom>/          les écrans d'une autre application, un dossier par acteur
    NOTES.md                  une ligne par image : ce qu'elle montre, ce qu'on en retient, ce qu'on n'en retient pas
    ANALYSE-<ecran>.md        l'analyse chiffrée (copie de _modele/ANALYSE.md)
    01-courte-description.png
  guichet-actuel/             nos propres écrans, capturés dans le même état et la même largeur, datés
    fiche-fonds-chiffres-2026-11-02.png
  <sujet>/                    une idée précise (une tuile, un graphique) quand elle ne vient pas d'un acteur
  _modele/ANALYSE.md          la grille d'analyse à copier
```

Le skill **`guichet-benchmark`** lit ce dossier : il passe des images à une grille de principes mesurés, compare avec `guichet-actuel/`, chiffre l'écart et le propose en planche. Le skill `guichet-maquette` mène ensuite la discussion et le code.

## Ce qu'on peut reprendre, et ce qu'on ne reprend pas

On s'inspire de **principes** (hiérarchie, densité, rythme, états, gestes). On ne reprend **ni** le nom ou le logo, **ni** le texte, **ni** l'illustration ou l'icône, **ni** la composition à l'identique. Les captures de concurrents restent dans ce dépôt comme **notes de travail** ; elles ne sont jamais publiées ni intégrées à l'application.

Exemple de `NOTES.md` :

```
01-tuile-pleine-largeur.png — la tuile pleine largeur avec ses lignes de détail. Retenir : le chiffre à droite, l'état en dessous. Ne pas retenir : la couleur de fond.
02-actuel-fiche-chiffres.png — l'écran d'aujourd'hui, onglet Chiffres, 390 px. La boîte blanche est la case « Total à décaisser ».
```

## Ce qui rend une image utile

- **Une idée par image.** Une capture entière sans commentaire dit tout et rien.
- **L'écran actuel à côté de l'exemple.** Sans le point de départ, « plus dynamique » reste un mot.
- **La largeur d'un téléphone** (390 px) pour les écrans client ; ne pas recadrer le haut ni le bas qui donnent le contexte.
- **Un nom qui dit le sujet**, pas `Capture d'écran 2026-11-02.png`.
- **Ne pas y déposer de données réelles de clients** (noms, numéros, montants) : des captures de la démonstration.

## Comment les citer dans une demande

« Voir `docs/design-refs/accueil-dossier/01-tuile-pleine-largeur.png` : même allure pour les lignes suivies, sans le fond coloré. »
