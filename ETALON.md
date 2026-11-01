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
| `--chapitres-gap` | **44 px** | l'écart entre deux CHAPITRES d'une page d'arrivée (classe globale `chapitres`) : le devoir, l'occasion, le relevé, Investir, le marché, le dossier. Réservé à l'Accueil | l'Accueil (`Console`) ; une page sans chapitres n'en lit pas |
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

**Ajouter une famille de tuiles :** copier ces cinq déclarations dans sa règle,
ajouter la famille à `FAMILLES_DE_TUILES` dans `espace-page.test.ts`, et
regarder la page dans les trois aspects (`data-tuiles` se change dans les
outils du navigateur, sans recharger).

**Ce qui n'est pas une tuile :** une carte d'information qu'on ne touche pas
(un panneau, `.panel`), un bandeau marine (le parcours), une alerte. Elles
gardent leur allure : l'aspect des tuiles ne les concerne pas.

---

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
