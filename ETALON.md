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
| `--sections-gap` | 20 px au 24 octobre ; **28 px depuis le 31 octobre 2026** | l'écart entre sections (voir § 8) |
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
| `/moi/documents` | **30** | 30 | — | sur-titre « Mes papiers » |
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

### Le cliquet des en-têtes, refait le 24 octobre 2026 au soir

Il comptait **49 au matin, 38, puis 27** — et parmi ces 27 il y avait
`EnTete.tsx` **lui-même** : le composant qui écrit le `h1` était compté comme
une page qui ne l'avait pas converti. Il y avait aussi les quatre pages de la
vitrine, qui ne convertiront jamais par la décision du § C ; le « Bonjour » de
la console, qui n'est pas un nom de page ; et trois écrans de seuil — la
connexion, le second facteur, le désabonnement — qui n'ont ni section au-dessus
ni parent derrière, et dont le titre nomme l'étape en cours.

**Un cliquet qui mélange « pas encore fait » et « ne sera jamais fait »
n'atteint jamais zéro**, et un compte qui ne peut pas tomber à zéro ne dit plus
s'il reste du travail.

D'où **deux mesures** : des dispenses **nommées**, chacune avec sa raison —
la forme que le § C a déjà donnée à la règle de la fonte, *« un compte dirait
combien de fichiers posent la fonte, pas lesquels ont le droit »* — et un
cliquet qui ne porte plus que ce qui attend d'être converti. Une dispense est
vérifiée comme le reste : si sa page est convertie, renommée ou supprimée, la
dispense ne vise plus rien et l'épreuve le dit.

### Le cliquet est à zéro

**49 au matin, 38, 27, 18, puis plus rien.** Toute page de l'application monte
`EnTete`. Les dix fichiers qui écrivent encore un `h1` sont nommés, chacun avec
sa raison : la vitrine (§ C), l'en-tête lui-même, le « Bonjour » de la console,
trois écrans de seuil, et **la note de marché trimestrielle** — un `article`
avec son bandeau à filet navy, un titre sur une échelle *fluide* hors de
`--t-8`, un chapô et une signature. C'est la grammaire d'une publication, celle
que le § C range du côté qui respire ; lui imposer l'en-tête de l'application
l'aplatirait en écran.

Le cliquet reste à `0` : il interdit désormais la **régression**, qui est son
autre moitié. Une page neuve qui écrirait son en-tête à la main le ferait
tomber le jour même.

→ *Le sur-titre accepte un NŒUD depuis ce soir-là : une page du guide y pose la
pastille de sa section — une forme, une couleur — avant de la nommer. La règle
« jamais un lien, jamais un chemin » était tenue par le TYPE ; elle est
désormais vérifiée sur les **appels**, et c'est là qu'elle comptait depuis le
début — le fil d'Ariane de « Sécurité » était un appel, pas une signature.*

→ *Quatre chemins déguisés se sont fait prendre à la conversion. Trois `nav`
d'un seul lien vers le parent — `/moi/epargne`, `/moi/reinvestir`, et le
chevron de `/moi/reclamation` — et **un mot cliquable au milieu d'un
sur-titre** : « BVMAC » menait à `/marche` depuis l'avant-titre de l'indice. Un
chemin vers le parent a un créneau, et c'est le premier : l'indice y a gagné le
retour qui lui manquait.*

→ *Et trois retours nommaient mal leur destination, toujours en citant autre
chose que le libellé de la maison :* « Portefeuille » *pour* `/` *(« Tableau de
bord »), deux fois, et* « Mon dossier d'ouverture » *pour* `/ouvrir-un-compte`
*— qui est l'INDICE de l'entrée dans `nav-groups`, pas son libellé* « Mes
pièces ». *L'épreuve des retours lit `retour={{ … }}` : elle ne pouvait rien
voir d'un `<Link>` écrit à la main.*

→ *Deux grilles de douze colonnes montées pour un seul en-tête sont parties
avec lui — celle de `/trader` en début de journée, celle d'`/info/risques` au
soir, où la phrase partait en colonne 9, loin à droite du titre qu'elle
explique.*

→ *Trois pages gardent un dispositif de retour à elles, et c'est délibéré :*
`/comparer` *a un retour d'historique, n'ayant pas un parent unique ;*
`/societes/[mnemo]` *porte deux liens, dont un conditionnel vers l'indice — une
bande de navigation, pas le créneau ;* `/offres/[id]` *garde son `ListNav`, qui
déplace dans une liste au lieu de remonter d'un cran.*

→ *Dix conversions le même soir, et deux d'entre elles ont découvert ce que
leur propre écriture cachait : `/moi/reclamation` et `/moi/epargne`
nommaient* « Portefeuille » *un lien vers* `/`, *que `nav-groups` appelle*
« Tableau de bord ». *L'épreuve des retours lit `retour={{ … }}` ; elle ne
pouvait rien voir d'un `<Link>` écrit à la main. Convertir une page, c'est
aussi la faire entrer sous les épreuves auxquelles son écriture l'exemptait.*

→ *Trois fils d'Ariane, et non un. Ce document disait celui de « Sécurité »*
« le seul de l'application » *: il y en avait trois. « Portefeuille ›
Réclamation » redisait en plus le nom de la page dans son dernier cran, et
`/moi/epargne` portait un `nav` d'un seul lien vers son parent — un fil d'un
seul cran est un retour, et il se dit avec une flèche.*

→ *Un créneau de plus, déclaré : `reference`. Deux pages — un ordre, un
document — titrent une RÉFÉRENCE, et écrivaient toutes deux `display mono` sur
leur propre `h1` ; un numéro à chasse variable se relit mal, et c'est
justement ce qu'on recopie chiffre par chiffre. C'est un booléen, pas une
ouverture à classes : rendre le `h1` libre rendrait à chaque page le droit de
redécider sa fonte, c'est-à-dire les sept tailles que cet en-tête a réunies.*

### Ce que seul le navigateur a dit

Les dix pages ont été ouvertes dans un vrai navigateur, sur le semis mémoire.
Neuf ont été vues ; la dixième, la fiche d'une pièce, n'a aucune instance dans
ce semis — les quatre rayons de `/moi/documents` ne portent aucun lien de
pièce — et elle reste donc **vérifiée par les épreuves, pas à l'écran**.

**Un titre de page à 12,3 px, et aucune feuille ne le disait.** Le créneau
`reference` posait d'abord la classe globale `mono`, qui règle *aussi*
`font-size: 0.82em` : elle gagnait sur la règle commune des `h1`, et le titre
d'un ordre tombait à 12,3 px au lieu de 30. Le défaut PRÉEXISTAIT — les deux
pages écrivaient déjà `display mono` — mais le porter dans l'en-tête commun le
rendait pire : c'est lui qui garantit « un titre de page, une taille ». Il pose
désormais sa propre classe : la chasse fixe et les chiffres tabulaires, rien
sur la taille.

*Aucune épreuve de feuilles ne pouvait le voir : les deux règles vivent dans
deux fichiers, et c'est leur croisement dans le navigateur qui décide. C'est la
limite exacte des cliquets qui lisent du CSS, et elle vaut d'être écrite.*

→ *Relevé sur les neuf pages vues : un seul `h1`, 30 px, sans empattements,
dans un `header`, aucun débordement horizontal, aucune erreur de console,
aucun chevron résiduel dans un sur-titre.*

→ *Deux voiles couvraient toute page au premier passage — le consentement aux
mentions, puis l'accueil d'embarquement. La première passe a donc mesuré le DOM
correctement et photographié dix fois le même voile : une capture qu'on ne
REGARDE pas ne prouve rien.*

---

## 7. Les deux arbitrages — tranchés le 24 octobre 2026

**A — le titre répété : la barre cède.** *(Révisé le 31 octobre 2026 : la barre ne cède ni ne reprend plus rien, elle dit le LIEU — le siège en petites capitales, la rubrique dessous — à toute hauteur de défilement ; le sur-titre se tait sous 760 px. Ce qui suit est la décision du 24 octobre.)* Elle se tait tant que le `h1` est à
l'écran et reprend le nom dès qu'il passe **sous** elle : le repère réapparaît
au moment exact où l'autre disparaît, jamais les deux ensemble. Une page sans
`h1` garde son nom dans la barre. Mesuré après coup : opacité 0 / `aria-hidden`
tant que le titre est visible, opacité 1 dès qu'il est sous la barre.

*Le défaut du rendu est « la barre se tait », et non l'inverse : se taire une
fois l'observateur installé faisait clignoter le titre à chaque navigation.*

**B — l'écart entre bandes : 32, et écrit une seule fois.** *(Révisé le 31 octobre 2026 : 28, lu au jeton `--sections-gap` ; voir § 8. Ce qui suit est la décision du 24 octobre.)* En l'appliquant
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

## 8. L'espace d'une page — les mesures, et où elles vivent

*Décidé le 31 octobre 2026, à l'issue d'une revue des écarts mesurée au
navigateur à 390 px sur 57 pages. Cette section est la référence : un écart
qu'elle ne nomme pas n'a pas de règle, et un écart qu'une page écrit à la main
est une faute.*

### 8.0 Mode d'emploi — une demande, une ligne

*À lire d'abord. Le reste de la section explique pourquoi. Chaque ligne se dit en
une phrase à Claude, et se fait en un fichier.*

| Vous voulez | Dites | Où ça change |
|---|---|---|
| des sections plus serrées ou plus aérées | « mets l'écart entre sections à 20 px » | `--sections-gap` · `globals.css` |
| plus ou moins d'air **entre les chapitres** de l'Accueil (le devoir, l'occasion, le marché, le dossier) | « mets l'écart entre chapitres à 36 px » | `--chapitres-gap` · `globals.css` |
| des tuiles plus proches ou plus écartées | « mets l'écart entre tuiles à 8 px » | `--tuiles-gap` · `globals.css` |
| un titre plus près de son contenu | « mets l'écart titre → contenu à 8 px » | `--titre-gap` · `globals.css` |
| la flèche de retour plus près du titre | « mets l'écart flèche → titre à 8 px » | `--retour-gap` · `globals.css` |
| **des tuiles moins prononcées**, partout | « passe les tuiles en douces » | `TUILES = "douces"` · `src/lib/config.ts` |
| **des lignes fines à la place des tuiles**, partout | « passe les tuiles en lignes » | `TUILES = "lignes"` · `src/lib/config.ts` |
| revenir à l'allure d'origine | « remets les tuiles en tuiles » | `TUILES = "tuiles"` · `src/lib/config.ts` |
| des coins plus ou moins arrondis | « arrondis les tuiles à 12 px » | `--tuile-rayon` · `globals.css` |
| un fond ou un bord de tuile différent | « mets le bord des tuiles en 2 px » | `--tuile-fond`, `--tuile-bord` · `globals.css` |
| plus ou moins d'air dans une tuile | « mets la marge intérieure des tuiles à 20 px » | `--tuile-pad-x`, `--tuile-pad-y` · `globals.css` |
| un quatrième aspect (« pleines », « encadrées »…) | « ajoute un aspect des tuiles nommé pleines : fond marine, sans bord » | un bloc `html[data-tuiles="…"]` · `globals.css`, et le mot dans `AspectDesTuiles` · `config.ts` |
| une page neuve | « fais une page avec la pile » | `className="pile"` (§ 8.4) |
| une liste de tuiles neuve | « fais cette liste avec les jetons de tuile » | les six jetons `--tuile-*` (§ 8.7) |

**Ce qu'on ne fait jamais :** écrire un écart, un fond, un bord ou un rayon en
dur dans une page ou un composant. Les cliquets (`espace-page.test.ts`) le
refusent le jour même.

**Ce que ces réglages ne couvrent pas :** les couleurs et la palette
(`palettes.css`), les tailles de texte (`--t-*`), la largeur des pages
(`--page-texte`, `--page-large`). Chacun a son propre jeton ; ce ne sont pas
des réglages d'espace.

*Pour juger un réglage :* `npm run dev`, enregistrer, et parcourir l'Accueil,
Trade, Éclairages et une page de compte à 390 px. Toutes les pages se
redessinent à l'enregistrement ; rien d'autre à toucher.

### 8.1 Ce que la revue a trouvé

Aucune mesure n'était tenue. Sur vingt-cinq pages au `gap` déclaré : **huit
valeurs** entre 8 et 40 px (douze pages à 20, cinq à 32, deux à 40, deux à 18,
deux à 16, une à 24, une à 12, une à 8) ; quatorze autres n'avaient pas de
`gap` et tiraient leur espace des marges de leurs enfants (24, 18, 0, 16, 58…).
Trois causes, toutes additives :

1. **le jeton et la décision se contredisaient** — `--sections-gap` valait 20 ;
   § 7-B disait 32 ; Trade lisait le jeton et ses voisines la décision ;
2. **l'en-tête ajoutait ses marges à l'écart de la page** : 20 sous la flèche,
   24 sous le titre, par-dessus le `gap` — le titre était à « gap + 24 » du
   premier bloc (40, 44, 50, 56 ou 64 px selon la page) ;
3. **le panneau portait sa marge basse** (`.panel`, 18 px) : dans une pile à
   `gap`, les deux s'additionnaient — 18 + 28 au lieu de 28.

Et un cliquet qui ne tenait rien : il cherchait la chaîne `gap: var(--s-10)`
*quelque part* dans quatre fichiers. Trade a glissé à 20 pendant qu'une autre
règle du même fichier gardait le 32 : il restait vert.

### 8.2 Les mesures — cinq rôles, cinq jetons

Tous vivent dans le bloc « l'espace d'une page » de `src/app/globals.css`. **Changer
la ligne d'un jeton change toute l'application, et rien d'autre à faire.**

| jeton | valeur | il règle | exemples |
|---|---|---|---|
| `--sections-gap` | **28 px** | l'écart entre deux sections d'une page ; aussi la gouttière quand deux colonnes se côtoient | l'Accueil, Trade, tout « Feuillet », le fil et le rail d'Actualités |
| `--chapitres-gap` | **44 px** | l'écart entre deux CHAPITRES d'une page d'arrivée (classe globale `chapitres`) : le devoir, l'occasion, le relevé, Investir, le marché, le dossier. L'Accueil et la fiche d'une ligne (§ 8.8) | l'Accueil (`Console`), la fiche d'une ligne (groupe `chapitres` dans la lecture) ; une page sans chapitres n'en lit pas |
| `--tuiles-gap` | **12 px** (`--s-6`) | l'écart entre deux tuiles d'une liste | les rubriques de l'Accueil, les rayons de Trade, les échéances |
| `--titre-gap` | **12 px** (`--s-6`) | entre le titre d'une section et ce qu'elle contient | « Ce qui ferme bientôt », « Mon dossier », « La sélection du desk » |
| `--retour-gap` | **12 px** (`--s-6`) | entre la flèche de retour et le titre de la page | toute page à flèche (intérieur à `EnTete`) |
| `--onglets-marge`, `--replay-marge`, `--infosearch-marge` | leur marge d'origine ; `0` dans une pile | la marge propre d'un composant partagé (onglets du marché, bouton de rappel des repères, champ de recherche) | **transitoires** : la pile les remet à zéro, les pages sans pile gardent la leur |

Ces valeurs sont **hors de l'échelle `--s-*` à dessein** pour la première
(28) : 20 se lisait comme un seul long texte, 32 flottait sur téléphone.
Les trois autres sont des pas de l'échelle. Les espaces *intérieurs* à un
composant — le `padding` d'une carte, le `gap` d'une ligne de tableau — restent
à l'échelle `--s-*` : ce ne sont pas des rôles de page.

### 8.3 Les règles

1. **Une page est une pile.** Son conteneur est la classe globale `pile`
   (`display: flex; flex-direction: column; gap: var(--sections-gap)`), ou une
   règle de module `.page` / `.wrap` qui déclare `gap: var(--sections-gap)`.
2. **Un enfant de la pile ne porte aucune marge verticale vers son voisin.**
   Pas de `margin-top` sur le premier bloc, pas de `margin-bottom` sur le
   dernier : l'espace vient du `gap`, seul. Le panneau (`.panel`) perd sa marge
   basse dans une pile (`.pile > .panel`) ; hors d'une pile il la garde.
3. **L'en-tête est un enfant comme un autre.** `EnTete` range la flèche et le
   titre dans un seul bloc ; la distance qui les sépare lui est intérieure
   (`--retour-gap`), et la page ne voit qu'un enfant.
4. **Dans une section : le titre à `--titre-gap` de son contenu, les tuiles à
   `--tuiles-gap` les unes des autres.**
5. **Jamais une valeur en dur, jamais un `--s-*`, pour ces rôles.** On lit le
   jeton. Une page qui écrit son propre écart ne lit plus la maison.
6. **Une exception se déclare.** La vitrine garde son pas (§ C : `--respiration`,
   `--s-9`, `--s-11`) ; une page à deux colonnes (Actualités, la fiche d'une
   ligne) pose le jeton en ligne *et* en colonne, sauf raison écrite.

7. **Les chapitres (Accueil, 1er novembre 2026).** Une page d'arrivée a deux
   niveaux d'écart : 28 px entre les sections d'un même chapitre, **44 px entre
   deux chapitres**. Son conteneur porte la classe `chapitres` (et non `pile`) ;
   chaque chapitre est soit une `pile`, soit une pièce qui se tait quand elle
   n'a rien à dire. **Jamais un conteneur vide entre deux chapitres** : il
   laisserait deux écarts de 44 px. D'où la règle des pièces muettes
   (`sections-qui-s-effacent.test.ts`) : « TuilesDuHaut » et « DossierAccueil »
   rendent `null` quand rien ne les justifie. L'Accueil sort de `CONVERTIES`
   pour `CHAPITRES` (`espace-registre.ts`).

### 8.4 Ajouter une page, convertir une page

*Page neuve :*

```tsx
<Glissement>
  <div className="pile">
    <EnTete retour={…} titre={…} phrase={…} />
    <section className="panel">…</section>
    <p className={styles.note}>…</p>
  </div>
</Glissement>
```

*Page existante à marges d'enfants :* (1) remplacer le conteneur par `pile` ;
(2) retirer chaque `margin-top` / `margin-bottom` qui séparait deux blocs
voisins, y compris la note de pied ; (3) lire `--titre-gap` entre un titre et
son contenu ; (4) mesurer au navigateur à 390 px — tous les écarts d'un niveau
valent le jeton — puis la déclarer dans `espace-page.test.ts`.

*Régler l'application, instantanément :* il n'y a ni panneau ni réglage au
desk (décidé le 31 octobre 2026) — **les mesures se changent dans le code, et
c'est volontaire** : un réglage de mise en page n'est pas une donnée métier, il
se relit en revue et se versionne avec le reste. Avec `npm run dev`, ouvrir
`src/app/globals.css`, changer la ligne du jeton (`--sections-gap: 28px;` par
exemple) et enregistrer : **toutes les pages se redessinent à l'enregistrement**,
sans rechargement ni autre fichier à toucher. Pour juger, parcourir l'Accueil,
Trade, Marché et une page de compte à 390 px. Le cliquet vérifie la valeur déclarée ; la changer demande de changer
aussi la clause qui la nomme, ce qui est voulu : une valeur ne glisse pas sans
que quelqu'un l'écrive deux fois.

### 8.5 Où en est la migration (31 octobre 2026)

*Mesuré à 390 px, tous les écarts d'un niveau à 28 :* l'Accueil, Trade, Marché,
Actualités (fil et rail), l'aide en questions, Éclairages, Glossaire, Simulateur, Titres, Fonds, Indice, Sociétés, Comparer, Ordres, Garde, Activité, Suivies, le parcours, la fiche d'un ordre, la fiche d'un document (non mesurée : aucun document dans les données de démonstration), l'intention, la convention, la fiche d'une ligne (colonnes de lecture et d'action ; le contenu de lecture garde ses marges internes), Sondage, Analyse, Provision, Tarifs,
Prélèvements, Textes, Sécurité, Profil, Réclamation, Risques,
Documents, Épargne, Réinvestir, et le « Feuillet » commun (Aide, Compte,
Appareil, Identité, Contact, Services, Agir).

*Balayage des pages que la revue n'avait pas ouvertes, fait le 31 octobre 2026 :* les notes de marché, la fiche société et la fiche émetteur, « Ouvrir un compte » et le dossier en cours, les éclairages (`/info/[key]`), les chapitres de l'aide, la lecture d'un ordre. Toutes lisent le jeton.

*Exemptée, comme document :* la note trimestrielle (`/indice/note/[trimestre]`) — une feuille éditoriale (bandeau, titre, chapeau, fiche, colonnes) qui a sa propre typographie, comme la peau d'un document ; elle n'est pas une pile de sections.

*Tout à 28 aux écarts d'un niveau.* *Écart interne restant, volontaire :* la liste de cartes d'offres de « Titres » et de « Calendrier » (20 px entre cartes : ce sont des cartes d'offre, pas une famille de tuiles, et un écart de 0 les collerait en aspect « lignes »).

*Exemptées* (§ C, la vitrine) : l'accueil du visiteur, À propos, Nos
placements, l'aperçu d'une ligne partagée.

### 8.6 Comment ça tient

`src/test/espace-page.test.ts` : les jetons d'espace et d'aspect des tuiles sont déclarés et valent ce que
cette section dit ; la pile existe et retire la marge du panneau ; `EnTete`
range la flèche et le titre dans un seul bloc ; chaque feuille de page est soit
convertie, soit nommée dans la liste « à convertir » — une page neuve qui
écrirait son écart en dur fait tomber la clause le jour même, et une page
convertie qu'on oublie de retirer de la liste la fait tomber aussi. Le cliquet
lit **la règle du conteneur**, jamais la chaîne dans le fichier.

---

### 8.7 L'aspect des tuiles

*Décidé le 31 octobre 2026 : « des tuiles moins prononcées, ou des lignes fines
à la place des tuiles, dans toute l'application » doit tenir en une ligne.*

Une **tuile** est un élément de liste qui se désigne et qui mène quelque part :
une rubrique de l'Accueil, une échéance, un rayon de Trade, une leçon, un outil,
un sujet d'aide. Six familles aujourd'hui, toutes lues aux mêmes jetons :

| jeton | allure d'origine | « douces » | « lignes » |
|---|---|---|---|
| `--tuile-fond` | `--surface` | surface à 45 % | transparent |
| `--tuile-bord` | 1 px `--line` | 1 px `--line` à 55 % | aucun |
| `--tuile-trait` (le trait du bas) | égal au bord | égal au bord | 1 px `--line`, **seul** |
| `--tuile-rayon` | `--radius` | 6 px | 0 |
| `--tuile-pad-x` / `--tuile-pad-y` | 16 / 12 px | inchangés | 0 / 12 px |
| `--tuiles-gap` (l'écart entre tuiles) | 12 px | inchangé | 0 |

**Comment ça marche.** Les jetons de `:root` valent l'allure d'origine. Les deux
autres aspects sont deux blocs, `html[data-tuiles="douces"]` et
`html[data-tuiles="lignes"]`, qui ne redisent que ce qui change. Le mot se
choisit dans `src/lib/config.ts` (`TUILES`) ; la mise en page le pose sur
`<html>`. Changer le mot change toutes les listes de tuiles, sans toucher une
page.

**Les six familles :** les rubriques (`Rubriques`), les échéances
(`CeQuiFermeBientot`), les tuiles de Trade (`trader/page.module.css`), les
sujets de l'aide (`info/aide`), et les leçons et outils des éclairages
(`info/page.module.css`). Chacune écrit `background: var(--tuile-fond)`,
`border: var(--tuile-bord)`, `border-bottom: var(--tuile-trait)`,
`border-radius: var(--tuile-rayon)` et un `padding` qui lit `--tuile-pad-*`.

**Un quatrième aspect, « cartes » (2 novembre 2026).** Posé sur la **racine d'une
page** (`data-tuiles="cartes"`, l'Accueil seul), jamais sur `<html>`. Il redit les
jetons : fond = `--surface` (6A, après la planche « couleur et fonds » : le fond
plus clair d'abord choisi pesait, il couvrait 60 % de l'écran et devenait en clair
plus sombre que la page), bord et trait nuls, rayon 16 px. Les listes de lignes se
groupent en **une** carte, leurs lignes sans fond ni trait ; l'indice et « Ce qui
performe » sont de cette famille sur l'Accueil (barre d'or de l'indice à 0). Il
porte aussi l'échelle locale : `--accueil-titre-*` (étiquette de 12 px, gras,
capitales, `--ink-2`), `--accueil-nom` (15 px), `--accueil-meta` (12 px),
`--accueil-chiffre` (17 px, gras) et `--accueil-geste-*` (3C : un chevron ou un « + »
est un geste, dans un rond de 28 px à l'encre d'accent). **La couleur dit un état
ou un geste** : l'état d'une intention est une pastille teintée (`TON_DE_LETAT`,
« non servie » reste neutre), la variation une pastille douce, jamais l'encre
pleine. Les rapports minimaux sont dans le skill `guichet-benchmark` (§ 4 bis) ; la
pastille de variation ne se pose que sur une ligne dont la maison connaît la
variation (`variationDe`, `variationDesDerniersEchanges`).

**Les blocs de lignes de l'Accueil (2 novembre 2026).** « Titres », « Fonds » et
« Adjudications » sont des blocs pleine largeur (`BlocDeLignes`), pas des demi-tuiles :
un titre qui est un lien vers la liste (avec « Tout voir »), puis UNE carte dont **chaque
rangée est un lien vers sa fiche** (64 px au moins, nom sur deux lignes, chiffre de tête
avec son libellé dessous, pastille de variation ou d'état). Le conteneur n'est jamais un
lien (pas de liens imbriqués). Le bloc des adjudications n'existe que s'il y a du
contenu ; sinon l'invitation à proposer une séance passe dans « Vous pouvez aussi ». La
fiche rend la liste de sa famille (`listeDeLaFiche`), trois lignes similaires et les
lignes du même émetteur (`LignesSimilaires`).

**Tous les titres de l'Accueil sont à plat (2 novembre 2026).** « Mes intentions »,
« Mes intentions au sondage », « Mes lignes suivies », « Mon espace » et « Vous pouvez
aussi » suivent le geste de « Titres » et « Fonds » : le titre au-dessus de la carte
(`BlocPlat`), la carte ne portant que des rangées, chacune un lien. Les deux petites tuiles
(opérations, documents) et leurs semblables sont fusionnées dans « Mon espace », une carte
de rangées-liens. **La ligne d'un titre** met le cours en tête (en or, `--accueil-cours`),
la pastille de variation collée dessous, puis les revenus abrégés — « Div. » et « Rdt »,
ou « Coupon » et « Rdt » pour une obligation — en bleu d'information
(`--accueil-revenu`) ; l'unité « FCFA » s'écrit en très petit.

**Le gabarit des lignes qui se demandent (2 novembre 2026).** « Mes intentions » et
« Mes intentions au sondage » écrivent « OTA 4 ans • CMR » (`gabarit.ts` : instrument,
durée, pays abrégé `CODE_PAYS`) ; dessous, le montant en or, le coupon et les limites en
bleu — un taux **minimum**, un prix **maximum** (« prix max partout », 3 novembre 2026) ; le rendement qui en
découle n'est qu'un équivalent, en gris entre parenthèses.

**La page Sondage et le détail d'une intention (3 novembre 2026).** Les deux listes (« Combien
investiriez-vous ? », « Mes intentions ») ont la grammaire de l'Accueil : titre à plat, carte qui ne
porte que des rangées, toute la rangée est un lien vers `/sondage?ligne=<id>` (une question du desk
aussi). « Modifier » et « Retirer » ne sont plus dans la liste : sur le détail, « Modifier » est le
bouton principal et « Retirer » un lien. La réponse rapide se déplie sous la rangée d'une question ;
les intentions closes sont repliées (« Closes (n) »). Le détail dit ce que le client a dit, puis ce
que la place a servi : deux listes en tête (pays — un seul à la fois —, durée exacte ou panier, dans
l'adresse), le tableau (coupon, prix, rendement, la durée sur chaque ligne), la courbe à axes avec
sa fourchette min–max et la limite étiquetée, un sélecteur de mesure (prix, coupon, rendement) et le
nuage coupon × prix en option. Aucune lecture n'est une promesse : un compte du passé, avec sa
mention. « Mes lignes suivies »
met le rendement seul en haut, la période sur sa ligne (« du {a} au {b} » pour un fonds), et
ce qui presse en pastille : plus de note qui répète le chiffre.

**La cote, les sociétés et « Ce qui performe » (3 et 4 novembre 2026).** « Ce qui performe » compare sur
**trois mois** (du 3 août au 2 nov. en ce moment), pas d'une séance à l'autre : le classement et le petit
graphe de chaque ligne (`MiniCourbe`, au milieu de la rangée, teinté par le signe, cours de départ en
pointillé) lisent une seule requête (`actionQuotesSince`). Aucun seuil n'écarte une ligne immobile : « toujours
deux à trois lignes », quitte à les afficher à 0,0 %. La page des sociétés a la même fenêtre : une rangée-lien par
société sur téléphone, le graphe au milieu, et la colonne « 3 mois » sur l'écran large. Les cartes d'actions de la
cote portent le même graphe : à droite du chiffre en avant sur la carte complète, au milieu de la tuile en vue
compacte (« Div. » abrégé, « FCFA » réduit sur les deux montants).

**Titres, Fonds, Adjudications : une seule barre (4 novembre 2026).** « Rechercher · Filtrer · Affichage »
(les adjudications ont la recherche, pas de tri). « Affichage » ouvre une fenêtre **au milieu de l'écran**
(`Affichage`, `Sheet centre`) : trier, grouper, la vue, la densité des cartes, et « Tout effacer » en pied. Le
sélecteur d'instruments est la même grille de **trois colonnes de carrés** (`GrilleDInstruments`) : une icône,
un nom, **pas de nombre** sur la tuile (il reste dans le nom accessible), une tuile vide est éteinte. La cote
ouvre sur « Actions » — la bande des sections filtre de nouveau, contre la décision du 4 octobre — et
« Tout » rend les cinq ; une section se limite à huit lignes, puis « Voir les N lignes ». Sur les États, six
pastilles filtrent par pays ; chaque Trésor a son **drapeau dessiné** (`Drapeau`), sur la pastille comme sur le
code de pays de chaque ligne. Le bandeau « Rendement et durée » est caché sur « Actions » (pas d'échéance).
Les tracés à lecture au toucher réclament le geste (`touch-action: none`) : le doigt les suit en toute
direction ; la page défile à la gouttière et au bandeau de lecture.
Les **quatre tuiles ou moins** tiennent sur une rangée (`--colonnes`) ; au-delà, trois colonnes. Au-dessus,
les **trois cartes** Titres · Fonds · Adjudications (`OngletsMarche`, icône, nom, sous-titre) *sont* le titre de la
page : le `h1` reste pour les lecteurs d'écran (`titreMasque`), et le « i » est dans la barre du haut
(`EnBrefInstruments` : une feuille, trois onglets, un tableau « en un coup d'œil », lecture seule). Le glissement
entre fiches et les cartes de famille **remplacent** l'entrée d'historique (`replace`) : Retour ne les rejoue pas.

**Retouches du 5 novembre 2026.** Aucun **nombre de lignes** ne s'écrit nulle part (tuiles, pastilles de pays, bandeau du
nuage, titres de groupe, « Voir toutes les lignes ») ; une section vide reste éteinte, sauf **Rachats**, retirée sans offre.
Un groupe se replie par le **chevron à gauche de son titre** (`BlocRepliable`), tous à la fois par celui d'« Affichage »
(`FoldAll`). « Affichage » porte aussi la **distinction entre les cartes** (une seule fenêtre). « Filtrer » est une fenêtre
**centrée** sur les trois pages (Fonds : société de gestion, dépositaire). Les drapeaux précèdent l'émetteur sur les cartes,
les titres de groupe et les fonds ; le pays choisi se lit sur sa pastille (fond plein), sans puce dessous. La flèche de
retour paraît partout sauf à l'Accueil et à la connexion. Un rendement n'est **pas calculé** sur une obligation cotée dont
seule l'année d'échéance est connue et qui a moins d'un an à courir (décision maintenue le 5 novembre).

**Dos des cartes, tuiles, filtre (5 novembre 2026, suite).** Le dos ne redit pas la face. **Action** : un seul bloc « Pour 100
actions » (dividende annuel attendu, écart acheteur / vendeur sur le cours vendeur, montant à T+n). **Obligation cotée** : les
flux (prochains versements et dernier + capital), la liquidité (dernier échange, écart), le gain gardé jusqu'au terme ; plus de
bandeau Cours · Rendement · Échéance. Les dos des OTA, BTA, rachats et fonds sont inchangés, en attente d'un choix sur une planche
fidèle. L'icône de retournement est de nouveau au dos, sous le « ··· ». Le sélecteur d'instruments tient jusqu'à **six tuiles sur
une rangée** (Fonds en cinq, Titres en six), le nom se coupe plutôt que de pousser. Le bouton **Filtrer est blanc sans filtre,
doré avec**, à la hauteur d'« Affichage ». Le drapeau précède aussi le code des lignes compactes.

**Suivi, dos, densité (5 novembre 2026, suite).** Le suivi d'une ligne a **un seul état par ligne** (`useSuivi`) : le menu « ··· »,
le glissement à gauche et la cloche de la carte le lisent et l'écrivent ensemble, la cadence suit le lieu (un message par jour
pour une adjudication). Le bouton de retournement **du dos ramène à la face** ; la face avant garde sa **hauteur naturelle** (plus
de pixels figés) et le dos prend la hauteur de son contenu ; changer de densité remet la carte à zéro. Les cases des fenêtres
« Filtrer » et « Affichage » ont l'arrondi de l'application, pas la pilule. Le choix de densité est de **deux grosses cases** avec
libellé. Une action n'écrit plus « Acheteur / vendeur » (case vide) ; son dos ajoute la fourchette sur trois mois.

**Le prix d'une action en avant (6 novembre 2026).** Choix 0·2, 1·1, 2·2, 3·1, 4·1 de la planche « Le cours et sa variation » (références : fiches
d'action et listes de cours des applications de courtage et de suivi de marchés — le prix domine, la variation est son satellite et nomme sa période).
Sur la carte détaillée d'une **action** : le prix est le plus grand chiffre (1,75 rem, encre), la **variation sur trois mois** dessous (flèche, couleur du
signe, « sur 3 mois » écrit), la courbe à droite ; le dividende est une case de la grille avec son rendement, puis « Cours inchangé depuis » (le ticket
redit le cours). Tuile compacte : prix à droite, variation dessous (« 3 mois »), « Div. 2,78 % » sous le nom. Le titre perd « : action cotée » (le badge
et « cotation continue » le disent) ; la pastille « Cotée » reste. Une variation à 0,0 % s'écrit comme les autres, et l'âge du cours est dans la grille.
Obligations, bons, fonds et adjudications gardent leur chiffre en avant. Tri « variation du cours » (les lignes sans variation connue en dernier).
**Avertissement :** le « i » de l'onglet Titres dit comment lire la variation et ce qu'il est bon de savoir (liquidité en premier, prix, dividende) avec
**un seul lien**, vers « Risques et limites » (la leçon « Les quatre risques » y est déjà citée) ; la même mise en garde est en pied de la page Titres.

**Le rond devant un nom (2 novembre 2026).** Seules les adjudications en ont un (le drapeau
du Trésor, `aUnRond`) : devant un titre coté ou un fonds, le monogramme prenait la place du nom
sans rien apprendre.

**Ajouter une famille de tuiles :** copier ces cinq déclarations dans sa règle,
ajouter la famille à `FAMILLES_DE_TUILES` dans `espace-page.test.ts`, et
regarder la page dans les trois aspects (`data-tuiles` se change dans les
outils du navigateur, sans recharger).

**Ce qui n'est pas une tuile :** une carte d'information qu'on ne touche pas
(un panneau, `.panel`), un bandeau marine (le parcours), une alerte. Elles
gardent leur allure : l'aspect des tuiles ne les concerne pas.

---

### 8.8 La page de lecture sans cadre — la fiche d'une ligne (8 novembre 2026)

**Une page de lecture n'a ni encadré, ni filet entre ses sections** (sauf la fiche d'une action : § 8.10). La fiche d'une ligne avait quatre surfaces imbriquées : la carte de la lecture (fond, bord, rayon, 24 px de gouttière), un filet sous chaque section, la carte des lignes similaires dans la carte, et une note de pied. À 390 px on lisait des lignes partout, et les espaces n'étaient ceux d'aucun jeton.

La règle, mesurée sur la fiche le jour même :

| Élément | Règle |
|---|---|
| La lecture (`.main`) | **une pile** : `display: grid; gap: var(--sections-gap)`. Ni fond, ni bord, ni rayon, ni `padding`. La page porte sa gouttière. |
| Entre la tête, la bande d'onglets et la lecture | **28 px**, par le `gap` de `.main`, jamais par une marge ni un filet |
| Entre deux sections de la lecture (Chiffres clés, En bref, Calendrier, Documents, lignes similaires, pied) | **44 px** (`--chapitres-gap`) : les sections sont les enfants d'un groupe `chapitres` posé dans la lecture (8 novembre 2026, planche 1A). Le desk garde sa lecture en 28 px |
| Un titre de section → son contenu | `--titre-gap` (12). **Un seul titre** : `--t-6` (17,25 px, +20 % sur les 14,25 d'avant), gras, encre pleine, jamais en capitales — `.sec h3`, le titre des lignes similaires (`fort`), le titre du pied |
| Une liste de rangées dans la page | **à plat** : pas de carte autour, un filet de `--line` seulement ENTRE deux rangées (`.plat` de `BlocDeLignes`) |
| Un lien de sortie rattaché à une liste (« Toutes les lignes de … ») | dans le même bloc que la liste, à `--titre-gap` d'elle |
| Un élément qui n'est qu'un témoin (observateur de défilement) | jamais un enfant de la pile : il lui ajouterait un écart ; on observe l'élément lui-même |

**Le pied de page** range ses textes comme un pied de page de référence : un titre de section (« Pour investir sereinement »), puis des **rangées-liens** à plat (le titre du texte, ce qu'il contient, une flèche), puis la mention en petit. Les risques y sont **trois liens** : le texte opposable (« Risques et limites »), la leçon qui l'explique, la documentation par instrument. Le ton est celui du § 10 : le chemin vers le texte avant la mise en garde, aucune mention retirée.

**Ce que la planche du 8 novembre 2026 a fixé** (1A · 2A · 3C, tous les onglets du client) :

- **Les lignes similaires ne paraissent que dans l'Essentiel** (`data-pane="essentiel"`) ; le pied de risques reste sous chaque onglet (§ 10 : le chemin vers le texte opposable accompagne les chiffres).
- **Le chiffre en avant, puis des rangées** : le chiffre de tête (`KpiCard` « heros », `--t-8`) puis les faits en rangées libellé / valeur ; de quand date le chiffre est la dernière rangée (plus de puce au-dessus). Le desk garde ses cartes.
- **Le calcul de référence se lit en trois blocs titrés** (« Pour … », « Ce que cela représente », « L'échéancier »), `RefTotals` à plat.
- **Le calendrier est une frise verticale** ; **un onglet Documents vide parle** (« Aucun document pour le moment »).

**Les liens de sortie mènent au contenu attendu** : « Toutes les lignes de {émetteur} » ouvre la liste de la famille (adjudications, titres, fonds) déjà filtrée sur cet émetteur (`?q=`), pas la page de recherche générale.

### 8.9 Les bulles d'information (8 novembre 2026)

**Chaque bulle d'information s'ouvre au milieu de l'écran et se ferme d'un geste du doigt.** C'est la fenêtre centrée de la maison (`Sheet` « centre ») : un voile, un titre, un texte, une croix, et un tiré vers le bas de plus de 80 px qui la ferme. Elle remplace l'infobulle à flèche du « i » de terme, qui se coupait sous un en-tête collant et sortait de l'écran sur un téléphone.

**La confirmation d'un suivi en fait partie** (titre, détail, geste, croix, et fermeture d'elle-même au bout de 3 s). **Exceptions** : le « i » de la barre du haut (une feuille à onglets) ; l'astuce de glissement du pager aussi ; pour le reste (visite guidée, survol d'un graphe, `title=""` natifs, bandeaux d'état), la décision appartient au client et se prend avec lui. La liste est dans le skill `guichet-espace-tuiles`.

### 8.10 La fiche d'une action : des encadrés en relief, des graphes, des mosaïques (9 novembre 2026)

**Décision du client** (planche « Fiche d'une action », réponses « 1A · 2B · 3 oui · 4 oui · a oui · b 44 · c rendement · d oui · e oui · f Émetteur · g cartes ») : pour les actions seulement, le § 8.8 est levé. Les autres lignes (OTA, BTA, rachats, fonds) gardent la page à plat ; elles seront décidées une à une.

| Élément | Règle |
|---|---|
| Une section | un **titre à plat** (`.sec h3`, `--t-6`, gras) puis UNE carte (`Carte`) : le titre n'est jamais dans la carte |
| La carte | fond `--surface`, rayon `--rond`, marge `--s-7`, l'ombre `--shadow` et un liseré clair en haut. Rapport page / carte : 1,12 en sombre, 1,07 en clair : en clair, l'ombre porte le relief |
| Entre deux sections | **44 px** (`--chapitres-gap`), comme avant : le groupe `chapitres` de la lecture |
| Une mosaïque (`Mosaique`) | le chiffre **majeur** en haut à `--t-8`, les autres dessous côte à côte en tuiles (`--surface-2`) : 2 colonnes pour 2 ou 4 tuiles, 3 pour 3. Une tuile sans valeur n'existe pas |
| Le chiffre majeur d'une action | le **rendement du dernier dividende** (bulle de calcul au toucher) ; le cours est dans la carte « Cours », avec sa variation sur 3 mois et sa courbe |
| Les graphes | la courbe du cours et ses volumes (`CourbeDuCours`, périodes 1 mois · 3 mois · depuis l'introduction), les dividendes et les comptes en barres (`BarresDeComptes`), les actionnaires en barres. Aucune série inventée ; le client lit 400 séances pour remonter à l'introduction |
| L'Émetteur | porte la société : identité en mosaïque, performance financière, actionnaires, et ses autres lignes à part |
| Les lignes similaires | des cartes qui défilent (`CartesSimilaires.module.css`) ; le pied de risques est une carte de rangées |

**Suite du 9 novembre 2026 (planche « périodes, onglets regroupés, Émetteur »)** : validée par « ok pour les recommandations, avec l'option 2B ».

- **Trois onglets** pour une action : Essentiel (Chiffres y est regroupé : cours, chiffres clés, séances, simulation, cotation), Documents, Émetteur. Une courbe du cours, un seul bloc « Séances ».
- **Les périodes** du graphe : une liste déroulante de la maison (`Select`, avec `disabled` pour les périodes sans historique), huit périodes (3 mois, 6 mois, 1 an, début d'année, 2 ans, 3 ans, 5 ans, max). La variation écrite à côté est celle de la période choisie, **une seule définition** (`src/lib/market/periodes.ts`, la même que « Ce qui performe »). Une période que la série ne couvre pas est grisée avec sa raison, jamais chiffrée.
- **La volumétrie** : un panneau de volumes sous la courbe, avec son axe en titres, et trois chiffres (volume échangé, séances avec échange, plus fort volume).
- **Les lignes similaires** d'une action sont les autres actions cotées (un ISIN une fois), en cartes de trois rangées fixes (nom, montant, performance).
- **Le pied « Pour investir sereinement »** n'est que dans l'Essentiel d'une action ; sous Documents et Émetteur reste la mention courte « Communication à caractère promotionnel. Risque de perte en capital. » (§ 10 : aucune mention retirée).
- **L'Émetteur** : le chiffre d'affaires en barres sur l'axe principal, le **résultat net en courbe sur un axe secondaire** (`GrapheComptes`) ; marge nette et rentabilité des fonds propres ; bilan et part des fonds propres ; dividende par action tel que publié ; actionnaires. Les rapports (marge, rentabilité, part des fonds propres) sont dans `finance.ts` et ne rendent rien quand ils tromperaient (résultat net supérieur aux produits : BHC, dont la fiche BVMAC publie 59,5 Md de résultat net pour 30,3 Md de chiffre d'affaires). **L'avertissement « résultat net supérieur au chiffre d'affaires publié : à lire avec prudence » est écrit sous la performance financière ET sous les rapports qui en sortent** (décision du client), pour toute société dans ce cas, pas pour BHC seule.

**La valorisation (9 novembre 2026, planche « capitalisation », option B)** : l'Émetteur d'une action porte la capitalisation boursière et les trois indicateurs qui en découlent, **un graphe par indicateur** (capitalisation avec sa part flottante, rapport cours / bénéfice, cours / valeur comptable, rendement du dividende), chacun en section à plat + carte, **une seule liste de durée pour les quatre** (les huit périodes du cours, celles sans historique grisées). Les rapports sont en marches, un trait marque le jour où l'exercice change ; l'axe part de zéro. Calculs dans `finance.ts` (`capitalisation`, `rapportCoursBenefice`, `coursSurValeurComptable`, `rendementDividendePct`), série dans `src/lib/market/valorisation.ts`. La capitalisation est le cours × le nombre de titres DE LA SÉANCE ; les rapports se tirent d'elle (ils ne dépendent pas du nombre de titres : une division du nominal les laisse intacts). **L'exercice N entre en vigueur, dans l'ordre (décision du client, 9 novembre) : à la date de publication EXISTANTE dans la donnée (`publieLe`), sinon à la date SAISIE PAR LE DESK (`publieLeDesk`, champ « Date de publication des comptes » du référentiel), sinon le 1ᵉʳ AVRIL de N+1.** Le formulaire du desk garde la date existante quand il réécrit une fiche. Un rapport qui ne veut rien dire (résultat net nul ou négatif) rend « — ».

**Lecture, axes, « i », onglets (9 novembre 2026, retouches du client)** :

- **Une bulle noire lit un point** : au toucher d'une barre ou d'un point, au glissement du doigt sur une courbe (`src/components/charts/lecture.tsx`), dans les trois graphes de la fiche d'une action. Elle est posée **au-dessus du dessin**, en absolu, hors du tracé : elle ne cache jamais le point lu et ne change pas la hauteur (le défaut de 30 % du dessin relevé le 5 octobre sur l'indice ne revient pas). Les graphes plus anciens gardent leur bandeau (`TrackBand`) ; le cliquet `bandeau-suivi` accepte l'un ou l'autre.
- **L'axe des abscisses d'un graphe de dates porte TOUJOURS l'année** : « 1 oct. 2025 », pas « 1 oct. ». Sur un axe de mois (douze repères), l'année est au premier repère et à chaque janvier (`motDeMois`, `src/lib/ui/axes.ts`).
- **Chaque section a son « i »** (la bulle centrée du § 8.9), comme « Chiffres clés » : ce que la section dit, en deux phrases, sans nommer d'où vient la donnée (provenance).
- **La courbe du cours a trois panneaux** : le prix, les titres échangés, puis le volume des transactions (la valeur échangée, en FCFA), chacun son axe.
- **Changer d'onglet, page défilée, ramène en haut du nouvel onglet** sous la bande collée (`defilerVers`, `cibleEnHaut`) ; quand la page n'a pas défilé jusqu'à la bande, la barre garde sa place (« garder la place »).
- **La tuile « Pour 100 actions au cours vendeur » est retirée** (elle ne disait rien de particulier) ; le dividende par action porte aussi le rendement au cours actuel (axe de droite).

**La rotation du flottant (9 novembre 2026)** : la part du flottant échangée sur la période (valeur échangée ÷ capitalisation flottante, `rotationDuFlottantPct` dans `finance.ts`). Un point (une tuile dans la carte Capitalisation, qui suit la durée choisie) ET une évolution (un graphe de barres mois par mois, dans sa propre section, avec la même liste de durée). Un chiffre bas décrit le marché, pas la société : le « i » le dit. Un graphe journalier n'aurait aucun sens (la plupart des séances n'ont aucun échange) : le mois est la plus petite maille lisible.

**Une action n'a pas de remboursement** : `repaymentLabel` ne rend « in fine » que pour une obligation (la ligne « Remboursement : in fine » s'affichait sur une action).

**Ce qu'on ne reprend pas des références** : la suggestion d'analystes, les CFD, le carnet d'ordres, l'alerte de prix en carte (déjà dans le menu « ··· »).

## 9. La voix des libellés — « Mes » pour ce qui est au client, « Votre » pour ce que la maison lui dit

*Décidé le 1er novembre 2026. Gardé par `src/test/mes-et-votre.test.ts`.*

Un **nom de rubrique, de page ou d'entrée de menu** est un lieu que le client
possède : il se dit à la première personne. Une **phrase de la maison**, une
**consigne de formulaire** ou un **texte contractuel** parlent *au* client : ils
restent à la deuxième. Le défaut relevé était le mélange dans une même liste,
« Mes documents » à côté de « Vos intentions ».

| Famille | Voix | Exemples |
|---|---|---|
| nom de rubrique, de page, d'entrée de menu, sur-titre | **Mes / Mon / Ma** | « Mon compte », « Mes intentions », « Mes versements programmés », « Ma provision », « Mon dossier » |
| renvoi vers l'un de ces lieux | **Mon compte › …** | « Mon compte › Sécurité » |
| phrase de la maison, statut, avis | **Votre / Vos** | « Votre ordre est servi », « Votre dossier est approuvé » |
| consigne ou champ de formulaire | **Votre / Vos** | « Votre limite », « Votre code à 4 chiffres » |
| texte contractuel, annexe, mentions | **Votre / Vos** | « Votre convention », « Vos titres à votre nom » |
| le catalogue de ce que la maison fait pour le client | **Vos** | « Tous vos services » |

*Pour changer un libellé :* « passe tel libellé de lieu à la deuxième personne »
est une régression ; l'inverse (un nouveau nom de lieu) se dit à la première.
Un libellé est aussi une clé de traduction : le renommer, c'est renommer sa clé
dans `src/i18n/en-*.ts` — le test de couverture le refuse sinon.

*Hors périmètre, à dessein :* l'interface du desk (`Votre poste`, `Votre siège`,
`Votre journée`) parle à l'équipe, non au client ; et la note de version de la
convention (`src/data/legal.ts`), qui cite « Votre activité » dans un texte daté
— le modifier suppose de versionner le texte.

## 10. Le ton des risques et des mises en garde — rassurer sans rien retirer

*Décidé le 6 novembre 2026. Gardé par `src/test/skills.test.ts` (le « i » des instruments).*

Un texte de risque se lit **avant d'investir**, par un épargnant qui n'est pas juriste. Il doit lui donner de quoi décider, pas lui faire peur. Le ton est celui
d'un **repère**, jamais d'une alerte ; la **vérité** est celle de la loi, jamais adoucie.

| Règle | Ce que cela veut dire |
|---|---|
| **Le geste avant la menace** | on dit ce qu'on peut faire (« prévoyez un délai pour revendre », « répartissez entre plusieurs sociétés ») avant ce qui peut arriver |
| **Un vocabulaire calme** | pas de « ATTENTION », de capitales, de point d'exclamation, de « danger » ; des verbes d'action et des phrases courtes |
| **Rien n'est retiré** | « le capital n'est pas garanti », « ne préjuge pas des performances futures » restent écrits **en toutes lettres** ; positif ne veut pas dire omis |
| **Le ton ne change pas le sens** | une mention obligatoire se reformule pour être plus claire, jamais pour être moins nette ; en cas de doute, on la garde telle quelle et on le dit |
| **La liquidité d'abord, sur ce marché** | peu de lignes s'échangent à chaque séance : c'est le trait de la BVMAC, donc le premier point de la liste |
| **À côté du chiffre qu'on qualifie** | l'avertissement vit dans la feuille « i » **et** en pied de la page ; une bulle ne remplace pas une mention |
| **Un seul lien vers le texte opposable** | « Risques et limites » ; la leçon pédagogique y est déjà citée, deux liens font du bruit |
| **Le rouge est réservé au faux ou au refusé** | une baisse de cours se colore par son signe, un risque ne se colore pas |

*Un texte de risque nouveau passe par la discussion (`guichet-maquette`), est confronté aux références (`guichet-benchmark`) et ne s'écrit en anglais qu'avec son
français validé.*

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
