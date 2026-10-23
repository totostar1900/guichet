# L'étalon d'une page

Tiré de « Mes documents » le 24 octobre 2026, comme demandé, et mesuré sur
treize pages à 390, 900 et 1440 px. Ce document dit **ce qui est**, puis **ce
qui doit être**, puis **ce qui change et où**.

Deux questions restent ouvertes en bas : elles demandent un arbitrage, pas une
mesure.

---

## 1. Ce que la maison a déjà déclaré, et que les pages ignorent

Les échelles existent dans `globals.css`. C'est le fait le plus utile de tout
ce relevé : **il n'y a rien à inventer, seulement à appliquer.**

| jeton | valeur | ce que son commentaire dit |
|---|---|---|
| `--marge-page` | 16 px (≤760) / 20 px | la marge d'une page |
| `--sections-gap` | 20 px | l'écart entre sections |
| `--t-7` | 20,2 px | **« titre de page »** |
| `--t-6` | 17,2 px | « titre de panneau » |
| `--t-4` | 13,2 px | « corps d'un panneau » |
| `--s-*` | 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40 | l'échelle d'espacement |

**Aucun `h1` de l'application n'utilise `--t-7`.** Aucune coquille de page
n'utilise `--marge-page` : cinq fichiers seulement s'en servent, et pas un
n'est une page.

---

## 2. Ce que les treize pages font réellement

Mesuré à 390 px, le format qui commande.

| page | gouttière | h1 | h2 | avant le titre |
|---|---|---|---|---|
| `/moi/documents` | **30** | 30 | — | sur-titre « Vos papiers » |
| `/moi/textes` | **30** | 30 | — | sur-titre « La maison » |
| `/moi/performance` | **30** | 30 | 16 | **lien retour** « ← Portefeuille » |
| `/moi/compte` | **30** | 26 | — | rien |
| `/moi/provision` | 14 | 30 | 17 | sur-titre |
| `/marche` | 14 | 30 | 17 | sur-titre |
| `/` | 14 | **27→39** | 11 | rien |
| `/trader` | 14 | 26 | 11 | rien |
| `/moi/securite` | 14 | 24 | 17 | **fil d'Ariane** « Portefeuille › Sécurité » |
| `/moi/ordres` | 46 | 24 | 14 | rien |
| `/fonds` | 14 | 20 | — | rien |
| `/calendrier` | 14 | 20 | 15 | rien |
| `/titres` | 14 | **16** | 13 | rien |

### Les cinq divergences, nommées

1. **Deux gouttières, 14 et 30 px, et l'écart est systématique.** Le gabarit
   pose `--marge-page` ; les pages qui vivent dans une boîte (`Feuillet`,
   `documents`) ajoutent `padding: var(--s-9) var(--s-7) var(--s-11)`, donc
   **16 px de plus sur les côtés**. On retrouve l'écart aux trois largeurs :
   30/14 à 390, 36/20 à 900, 410/394 à 1440. Une marge posée deux fois n'est
   pas une marge, c'est un accident reproductible.

2. **Sept tailles de titre** : 16, 20, 24, 26, 27, 30 — plus `/` qui enfle
   avec l'écran (27 → 32 → 39) quand toutes les autres restent fixes.
   `/titres` titre en **16 px**, plus petit que le corps de lecture (15 px) et
   plus petit que son propre `h2` voisin ailleurs.

3. **Six tailles de sous-titre** : 11, 13, 14, 15, 16, 17.

4. **Le créneau avant le titre porte trois choses différentes** — un sur-titre
   de catégorie, un fil d'Ariane, un lien retour — et il est vide sur sept
   pages. Trois grammaires pour un seul emplacement : le lecteur ne peut rien
   y apprendre.

5. **Quatre écarts entre sections** : 16, 20, 32, 40, quand le jeton dit 20.

---

## 3. L'étalon, et ses deux fautes à lui

Ce que « Mes documents » fait bien, mesuré :

```
← Portefeuille          retour
VOS PAPIERS             sur-titre : 11 px, capitales, interlettrage
Mes documents           titre : 30 px
Tout ce qui porte…      phrase : 13,2 px, interligne 19,8
                        ↓
┌──────────────────────┐  bande : largeur 330, gouttière 30
│ Ce que vous avez…  › │  fond plein, bord 1 px, rayon 6
│ Vos engagements…     │  padding 12 / 16
└──────────────────────┘
        40 px            écart entre bandes
┌──────────────────────┐
```

**Ce qui mérite d'être la règle :** l'en-tête en quatre étages toujours dans le
même ordre ; une bande = une destination ; un chevron qui dit qu'on descend
d'un niveau ; une phrase sous chaque nom, qui épargne le détour.

**Ses deux fautes, à ne pas recopier :**

- **Le titre est écrit deux fois.** La barre du téléphone affiche déjà « Mes
  documents », et le `h1` le répète 290 px plus bas.
- **Deux retours à 150 px l'un de l'autre.** Le chevron `‹` de la barre, et le
  lien « ← Portefeuille » dans la page.

Et une troisième, qui relève du point 11 de la liste : la ligne « Aucun
document pour l'instant · Tout replier » annonce un état vide **et** propose de
replier ce qui n'existe pas.

---

## 4. L'étalon proposé

### 4.1 Une seule marge

La page ne pose **jamais** de marge latérale : le gabarit la pose, une fois,
avec `--marge-page`. Une coquille de page règle sa marge haute et basse, sa
largeur maximale, et rien d'autre horizontalement.

```css
.feuille {
  max-width: var(--page-texte);   /* 900px */
  margin-inline: auto;
  padding-block: var(--s-9) var(--s-11);   /* 24 haut, 40 bas */
  /* aucun padding-inline : il appartient au gabarit */
}
```

### 4.2 Un en-tête, quatre créneaux, un seul genre par créneau

Dans cet ordre, chacun facultatif, **jamais interverti** :

| créneau | ce que c'est | taille | règle |
|---|---|---|---|
| **retour** | un cran en arrière | `--t-3` | **seulement si la barre du haut n'en a pas** |
| **sur-titre** | où je suis — la section | `--t-2`, capitales | jamais un lien, jamais un fil d'Ariane |
| **titre** | ce qu'est cette page | `--t-8` *(nouveau)* | ne répète pas la barre du haut |
| **phrase** | ce qu'on y trouve, en une phrase | `--t-4` | une seule |

Le fil d'Ariane de `/moi/securite` disparaît : il dit la même chose que le
sur-titre, en plus long. *Écrit « le seul de l'application » le 24 octobre au
matin, et c'était faux : `/moi/profil` en portait un second, hors du relevé
des treize. Il est parti le soir même.*

**Et ce qui se pose à côté.** Les trois listes d'instruments portent un objet
de plus — un « en bref », un chiffre de tête, un bouton. Il va **en face du
titre** (`aCote`), jamais dessous : sous le titre il repousse d'un cran le
début de la liste, qui est ce pour quoi on vient ; en face il ne coûte aucune
hauteur. C'est la raison qu'avait écrite la page des fonds, et elle vaut pour
les trois. Quand la place manque — un titre de deux lignes sur un téléphone —
il passe à la ligne de lui-même.

### 4.3 Une section : la bande

```css
.bande {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: var(--s-6) var(--s-7);   /* 12 / 16 */
}
```

Écart entre bandes : **un seul jeton** (voir question B).

**Une bande qui mène ailleurs porte un chevron et rien d'autre de cliquable.**
C'est la forme visible du « un niveau, une page » : si une bande contient deux
actions sans rapport, c'est qu'elle devait être deux pages.

### 4.4 Le titre, et le jeton qui manque

`--t-7` se dit « titre de page » et vaut 20,2 px. **Aucune page ne l'emploie**,
et les cinq pages les plus abouties titrent à 30. Quand toutes les pages
contredisent le jeton, c'est le jeton qui a tort : il décrit un titre de
*panneau*, pas de page.

Je propose donc d'**ajouter** le jeton manquant plutôt que de rapetisser dix
pages :

```css
--t-8: 2rem;   /* 30 px : titre de page */
```

`h1` → `--t-8` (30). `h2` → `--t-6` (17,2), qui est déjà la valeur la plus
fréquente. Rien d'autre entre les deux.

### 4.5 Ce qui ne s'annonce pas

Aucune page n'écrit le nombre de ce que porte la page suivante (point 11).
« Vos ordres passés · 1 » devient « Vos ordres passés ». Le compte se lit là
où les choses sont.

---

## 5. Ce que ça change, page par page

| page | ce qui bouge |
|---|---|
| `/titres` | titre 16 → 30 ; c'est le plus gros écart de l'application |
| `/fonds`, `/calendrier` | titre 20 → 30 |
| `/moi/securite`, `/moi/ordres` | titre 24 → 30 ; le fil d'Ariane devient un sur-titre |
| `/trader`, `/moi/compte` | titre 26 → 30 ; retrait des trois points de Trade (point 12) |
| `/` | titre fluide 27-39 → 30 fixe |
| `/moi/documents`, `/moi/textes`, `/moi/performance` | la boîte perd ses 16 px latéraux : gouttière 30 → marge du gabarit |
| toutes | un seul écart de sections ; un seul genre dans le créneau d'avant-titre |

Les six pages qui n'ont rien avant leur titre en gagnent un : c'est ce qui dit
au lecteur où il est tombé.

---

## 6. Comment ça tient

Trois épreuves, sur le modèle du cliquet déjà employé pour la typographie :

1. **Une gouttière.** Aucune coquille de page ne pose de `padding` latéral ;
   mesure : l'écart gauche du `h1` est le même sur toutes les pages.
2. **Un titre.** La liste des tailles de `h1` ne contient qu'une valeur, et
   c'est `--t-8`.
3. **Un genre par créneau.** Aucune page ne pose un lien ni un fil d'Ariane
   dans le créneau du sur-titre.

---

## 7. Les deux arbitrages — tranchés le 24 octobre 2026

**A — le titre répété : la barre cède.** Elle se tait tant que le `h1` est à
l'écran et reprend le nom dès qu'il passe **sous** elle : le repère réapparaît
au moment exact où l'autre disparaît, jamais les deux ensemble. Une page sans
`h1` garde son nom dans la barre. Mesuré après coup : opacité 0 / `aria-hidden`
tant que le titre est visible, opacité 1 dès qu'il est sous la barre.

*Le défaut du rendu est « la barre se tait », et non l'inverse : se taire une
fois l'observateur installé faisait clignoter le titre à chaque navigation.*

**B — l'écart entre bandes : 32, et écrit une seule fois.** En l'appliquant
j'ai trouvé que les 40 px n'étaient pas un réglage mais une **addition** :
20 px de `gap` au conteneur plus 20 px de `margin-top` au rayon. Deux pages
l'avaient remarqué et s'en accommodaient — « les deux font les quarante qu'on
veut » —, ce qui dit exactement le défaut : pour changer un écart il fallait
lire deux fichiers et faire une addition.

Leur raison de vouloir de l'air restait juste (« quatre titres nus séparés par
vingt pixels se lisaient comme un seul long texte »), et 32 ne la contredit
pas : ce n'est pas 20. Le rayon ne porte plus de marge, le nombre vit dans le
`gap`, seul. Mesuré sur « Mes documents » : à 40 les bandes de 81 px flottent,
à 32 elles se lisent comme une liste et une de plus tient au-dessus de la
ligne de flottaison.

---

## Annexe — l'énoncé d'origine des deux arbitrages

**A — Le titre répété.** La barre du téléphone affiche le nom de la page, et le
`h1` le répète. Trois sorties possibles :

1. la barre garde le nom, la page perd son `h1` → on gagne ~90 px de haut,
   mais la page perd sa tête quand on l'imprime ou qu'on l'ouvre en large ;
2. **la page garde son `h1`, la barre n'affiche le nom qu'une fois le titre
   sorti de l'écran** (c'est ce que font les systèmes qui ont les deux) ;
3. on ne change rien.

*Je recommande la 2.* Elle garde les deux dans leur rôle et ne coûte qu'un
observateur d'intersection. Mais elle touche la barre de toutes les pages,
donc je ne la prends pas seul.

**B — L'écart entre bandes.** « Mes documents » pose **40 px** entre des bandes
de 81 px : l'écart vaut la moitié de la bande, et les bandes flottent. Le jeton
déclaré dit 20. Je recommande **32** (`--s-10`) : assez pour séparer deux
destinations, assez peu pour qu'elles se lisent comme une liste. C'est le seul
endroit où je m'écarte de l'étalon que tu as désigné, et je le signale plutôt
que de le faire en douce.

---

*Quand A et B sont tranchés, le reste s'applique page par page sans nouvelle
décision — et les points 2, 7 et 12 de `CHANTIERS.md` sont réglés par
construction.*

---

## C — la fonte du titre : **tranchée le 24 octobre 2026**

**La vitrine respire, l'application travaille.** La vitrine publique garde son
serif et son échelle fluide ; dans l'application, un titre de page est sans
empattements, à `--t-8`.

Le relevé des treize pages avait mesuré la TAILLE d'un titre et rien d'autre.
Mesuré à l'écran, cette fois sur **trente-six pages** de l'application :

| | |
|---|---|
| à empattements | **8** — `/`, `/portefeuille`, `/instruments`, `/aide`, `/recherche`, `/moi/identite`, `/moi/appareil`, `/moi/contact` |
| sans | **28** |
| à 30 px | **36 sur 36** |

La taille tenait donc partout, et la fonte nulle part. **Ce qui décidait
n'était pas ce qu'EST la page, mais quelle coquille elle avait importée** :
`Feuillet` pose le serif, `EnTete` ne pose rien. D'où `/portefeuille` et
`/aide` en serif, `/marche` et `/trader` en sans — les quatre étant des
sommaires de siège.

La ligne retenue était déjà écrite en tête de la feuille de la console : *« Le
site public respire, la console travaille. »*

**Ce qui a changé** : `.bonjour h1` et `.sansValeur` (console), `.tete h1`
(ouverture de compte), `.tete h1` et `.bloc h2` (`Feuillet`, sept pages),
`.cQui b` (nous contacter). Les `h2` de `Feuillet` suivent leur `h1` : les
laisser aurait donné un titre sans sur des sous-titres serif.

**Ce qui garde le serif** : `Accueil`, `a-propos`, `placements`,
`ApercuPartage` — la vitrine. Et trois dispenses déclarées dans l'épreuve :
les deux voiles montés par le gabarit sur les deux domaines (`Onboarding`,
`Presentation`), la bulle de `AppMenu`, et `info/risques` — le guide se lit
des deux côtés, sa fonte reste à décider avec le point 2.

**L'épreuve est une liste blanche, pas un cliquet** : un compte dirait combien
de fichiers posent la fonte, pas lesquels ont le droit.

→ *`/moi/profil`, relevé ici puis réglé le même jour : il titrait à 19,5 px,
seule page hors de l'échelle, parce que son `h1` n'était pas le nom de la
page mais la QUESTION courante du questionnaire. Il portait aussi **trois
noms** — « Mon profil » dans la table, « Mon profil financier » dans
l'onglet, la question à l'écran — et **un second fil d'Ariane** : celui de
« Sécurité » n'était donc pas le dernier, il était le seul des treize pages
relevées. La page a maintenant un nom, « Profil d'investisseur », l'en-tête
de l'étalon, et la question en `h2`.*
