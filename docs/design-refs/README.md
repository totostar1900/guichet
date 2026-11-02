# Images de référence du design

Déposer ici les images qui montrent **l'allure voulue** : une capture d'une autre application,
une maquette, la capture de l'écran actuel avec une annotation. Claude les lit directement.

## Convention

```
docs/design-refs/<sujet>/
  NOTES.md          une ligne par image : ce qu'elle montre, ce qu'on en retient, ce qu'on n'en retient pas
  01-courte-description.png
  02-courte-description.png
```

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
