# Chantiers

Relevé le 24 octobre 2026, dicté par Georges, et clos le même jour. L'ordre
est celui de la dictée, pas celui des priorités.

**Les treize points sont clos, et rien n'attend plus ici.** Une seule ligne
reste nommée en bas, et c'est une DÉCISION, pas un reste : « Ce qui ferme
bientôt » paraît sur Trade et sur l'accueil, par choix, le même composant
appelé deux fois.

Quatre sections plus bas ne viennent pas de la dictée : ce sont les
chantiers que les GARDES ont ouvertes d'elles-mêmes, en chaîne — un cliquet de
classes mortes qui comptait mal a fait remonter six règles inertes, dont une
qui cachait un contraste à 2,97 : 1 ; la garde écrite pour ce défaut a mis au
jour le jeton qui en était la cause commune. **La dernière section, elle,
est une nouvelle dictée** : les budgets des six États, livrés en dix lots
les 24 et 25 octobre.

Chaque point barré porte ce qui a été MESURÉ avant d'y toucher, et ce qui a
été trouvé en chemin. Les relevés comptent autant que les décisions : c'est
eux qui disent pourquoi une maquette a été suivie, ou écartée. **Et les
chiffres de ce document ont été revérifiés contre le code le 25 octobre** :
quatre phrases mentaient, toutes sur l'état du point 7, que la journée avait
dépassé sans que son en-tête le dise.

---

## Téléphone

**1. ~~Le dock ne s'allume pas toujours.~~ FAIT le 24 octobre 2026.**
La cause n'était pas dans le dock : deux sommaires de siège — `/portefeuille`
et `/instruments` — ne figuraient dans aucune règle d'appartenance. Les trois
autres marchaient par chance, leur sommaire étant aussi la racine du préfixe
que leur règle nomme. Une épreuve lit maintenant les adresses *dans* le dock
et vérifie que chacune allume un onglet, et un seul.

**4. ~~Pas d'animation entre pages d'une même section.~~ FAIT le 24 octobre
2026.** Il manquait les deux conditions : neuf pages sur cinquante-cinq
portaient l'enveloppe, et les liens de section ne déclaraient aucune
direction. Les cinquante-trois pages du guichet l'ont maintenant, les liens
de retour disent « retour », et le rail du marché lit sa direction dans
l'ordre de ses propres pastilles.

---

## Harmonisation de l'affichage — le gros morceau

**2. ~~Marges, tailles, affichage des pages à harmoniser.~~ FAIT le
24 octobre 2026.** Les quatre décisions de grammaire sont prises et gardées —
la fonte d'un titre, les deux créneaux d'avant-titre, le mot d'un retour,
l'écart de l'étalon — et les deux derniers restes ont été réglés en fin de
journée (voir la liste ci-dessous).

**La fonte d'un titre : tranchée le 24 octobre 2026.** *La vitrine respire,
l'application travaille* — la vitrine publique garde son serif et son échelle
fluide, l'application titre en sans à `--t-8`. Relevé à l'écran sur
**36 pages** : 8 en Instrument Serif, 28 en Manrope, **36 sur 36 à 30 px**. La
taille tenait donc partout et la fonte nulle part, et ce qui décidait n'était
pas ce qu'EST la page mais **quelle coquille elle avait importée** —
`/portefeuille` et `/aide` en serif, `/marche` et `/trader` en sans, les
quatre étant des sommaires de siège. Voir `ETALON.md`, point C, et l'épreuve :
une **liste blanche**, pas un cliquet.

**Les deux créneaux d'avant-titre ne disent pas la même chose**, et quatre
pages l'avaient oublié : « ← Votre compte » suivi de « VOTRE COMPTE », à deux
lignes d'écart, dans les deux créneaux que l'étalon distingue. La règle : le
retour nomme la page d'au-dessus, le sur-titre nomme la FAMILLE.

**Et le mot d'un retour est le nom de sa destination.** Sept retours menaient
à `/` en l'appelant « Portefeuille » ou « Votre portefeuille » — or la table
de la maison (`nav-groups.ts`) l'appelle **« Tableau de bord »**, et
« Portefeuille » est le nom d'une AUTRE page, qui existe. Un lien dont le mot
nomme une page et dont la flèche en ouvre une autre est pire qu'un lien muet.
Deux épreuves le tiennent, la seconde comparant chaque retour à la table.

Ce qui reste au point 2 :

- ~~*Le sommaire du Marché.*~~ **FAIT le 24 octobre 2026.** C'est le RAIL qui
  s'efface, et sur la porte seulement. Il sert « celui qui LIT et veut savoir
  où il est » — sa propre note le dit — or sur `/marche` on ne lit pas, on
  choisit ; et il montre deux ou trois pastilles à la fois quand le sommaire
  les montre toutes avec ce qu'elles contiennent. C'est la leçon que la page
  avait elle-même écrite pour son pied : *une bande qui répète la famille est
  du bruit une fois les pastilles posées.* Sur les autres pages de la famille
  le rail garde tout son rôle, direction du glissement comprise. Deux
  épreuves tiennent les deux moitiés : le rail se tait PARCE QUE le sommaire
  est là.
- ~~*`/moi/profil`.*~~ **FAIT le 24 octobre 2026.** Il titrait à **19,5 px**,
  seule page hors de l'échelle, parce que son `h1` était la QUESTION courante
  du questionnaire — un titre qui change à chaque réponse. Il portait aussi
  **trois noms** (« Mon profil » dans la table, « Mon profil financier » dans
  l'onglet, la question à l'écran) et **un second fil d'Ariane** : celui de
  « Sécurité » n'était pas le dernier, il était le seul des treize pages
  relevées. La page a un nom, l'en-tête de l'étalon, et la question en `h2`.
- ~~*Les sept pages de `Feuillet`.*~~ **FAIT le 24 octobre 2026.** Elles
  écrivaient leur en-tête à la main et sont passées à `EnTete`. Trois sont
  des racines de siège (`/portefeuille`, `/instruments`, `/aide`) et ne
  prennent pas de sur-titre ; `/recherche` non plus — on y entre par la
  loupe, de partout, elle n'appartient à aucun siège. `/moi/identite` et
  `/moi/appareil` prennent « Vous », la famille de `/moi/compte` ;
  `/moi/contact` n'en prend pas, son retour disant déjà « Aide ».
  **Le cliquet des en-têtes écrits à la main tombe de 46 à 38.**
- ~~*La fonte du guide* (`info/risques`).~~ **FAIT le 24 octobre 2026.** La
  décision était prise sans que personne l'ait constaté : des cinq feuilles du
  guide, les quatre autres — la racine, chaque leçon, les mentions, le
  parcours — titraient en sans depuis le début. `risques` n'était pas une
  exception de principe, c'était le reste. **La liste blanche passe de 8
  entrées à 7, et ne porte plus aucun « à décider ».**

  → *Et ses sections passaient devant son titre : `clamp(1.5rem, 2.8vw,
  2.15rem)` monte à 32 px sur grand écran quand le `h1` de la page tient à 30.
  L'échelle nommait pourtant la taille juste — `--t-7 : titre de section` — et
  le poids vient de la règle globale des `h2`. L'échelle fluide part avec le
  serif : l'étalon les nomme ensemble comme les deux marques de la vitrine.*

**7. ~~L'en-tête de chaque page.~~ FAIT le 24 octobre 2026** — *cet en-tête a
porté « la conversion est en cours » jusqu'au 25 octobre, alors que le cliquet
avait touché zéro le soir même : voir « Ce qu'il reste », plus bas, qui le
disait clos depuis le début.* `EnTete` pose les quatre créneaux dans l'ordre —
retour, sur-titre, titre, phrase — et un seul genre par créneau. Dix pages y
sont passées le 24 octobre 2026, dont les deux qui sortaient du rang : le fil
d'Ariane de « Sécurité » et le lien de retour que « Analyse » rangeait dans le
créneau du sur-titre. **Dix autres y sont passées le soir du même jour**, et elles ont
démenti le mot écrit ici : ce fil d'Ariane était donné pour « le seul de
l'application », il y en avait **trois** (voir le relevé du point 7, en bas).

Les trois listes d'instruments ont suivi : `/titres`, `/fonds` et
`/calendrier` portent le sur-titre « Investissez », et les deux racines —
`/trader` et `/` — n'en portent aucun, sur décision. Leur « en bref » se pose
désormais EN FACE du titre (créneau `aCote`) plutôt que dessous, où il
repoussait d'un cran le début de la liste.

→ *Un cliquet compte les en-têtes encore écrits à la main : 49 le 24 octobre
au matin, 46 à midi, 38 après les sept pages de `Feuillet`, 27, 18, puis
**zéro** le soir même. Il descend, il ne monte pas — et à zéro il change de
métier : il interdit la régression. Dix fichiers écrivent encore un `h1`,
chacun dispensé par son nom et sa raison.*

**8. ~~Bandes et écarts.~~ FAIT le 24 octobre 2026.** La bande de « Mes
documents » est devenue la seule forme des rubriques : les sept sommaires du
guichet la portent, avec l'écart de l'étalon (`--s-10`) écrit en un seul
endroit. La variante en filets n'existe plus — deux formes qui coexistent
finissent par diverger.

→ *Coût mesuré et assumé : une liste gagne environ 120 px, et sur
`/portefeuille` une rubrique sur cinq passe sous la ligne de flottaison
(4/5 → 3/5). Les trois autres sommaires n'en perdent aucune.*

**12. ~~La page Trade.~~ FAIT le 24 octobre 2026.** Les trois points comptaient
la profondeur pendant que le chemin, à dix pixels de là, la NOMMAIT :
« Trade › Placer ». Deux dispositifs pour un fait, et le plus pauvre était le
plus voyant — une rangée de points à droite d'une barre se lit partout
ailleurs comme un nombre de pages à suivre, et c'est ainsi qu'elle a été lue.

Le reste tenait au même défaut : la page s'écrivait à elle seule ce que la
maison écrivait déjà.

- **En-tête** : celui de l'étalon. La phrase partait en colonne 8 d'une
  grille de douze, soit 820 px à droite du titre qu'elle explique, sur une
  page dont tout le reste tient en une colonne. Pas de sur-titre : racine.
- **Chemin** : il ne paraît plus au premier écran, où son unique cran,
  « Trade », était le titre de la page écrit une seconde fois.
- **Bandes** : oui. Les deux listes du parcours sont les sommaires de la
  maison (`Rubriques`) — lequel est né de cette liste-ci, et était resté en
  filets quand les six autres sièges sont passés en bandes le matin même.
  « En place » s'écrit maintenant, au lieu d'un filet dans la marge.
- **Ménage** : la feuille portait 617 lignes et 37 classes, dont **22 que
  plus aucun fichier ne nommait** et **cinq écrites deux fois**. Pour
  `.rayons`, le doublon coûtait l'écart de l'étalon : 32 déclaré en haut avec
  sa justification, 20 appliqué en bas. 130 lignes, 12 classes, 0 morte.
  `Etapes.tsx` était mort aussi. *(La feuille est remontée depuis à 250 lignes
  et 20 classes : les aperçus des tuiles, le même soir. Toujours 0 morte — le
  cliquet des classes mortes l'interdit maintenant à toute la maison.)*

→ *Deux relevés à verser aux chantiers ouverts, et laissés tels quels :*

*(a)* ~~*Le titre perd sa fonte à empattements.*~~ **RÉGLÉ le 24 octobre
2026** par l'item 2 : la vitrine garde le serif et son échelle fluide,
l'application titre en sans. Une liste blanche, et non un cliquet — un
cliquet dirait COMBIEN de feuilles posent la fonte, pas lesquelles en ont le
droit. Elle est passée de 8 entrées à 7 le soir même, quand le guide a
tranché.*

*(b) **441 px sur 844 ne bougent jamais** : au-dessus du ruban, le titre, la
phrase et « Ce qui vous attend » se repeignent à l'identique aux trois
niveaux. C'est 52 % de l'écran.*

→ *Entamé le 24 octobre 2026, par l'autre bout. « Placer » a perdu son cran :
ses services sont à plat sur la racine, en tuiles, parce qu'ils SE COMPARENT.
Le rayon ne faisait que répéter la question de la page — on touchait
« Placer » pour lire, un écran plus loin et en plus petit, « Où va mon
argent, cette fois-ci ». Deux niveaux au lieu de trois pour le rayon qu'on
ouvrait vraiment ; « Programmer » et « Tenir » gardent le leur, eux rangent
des gestes de natures différentes. La règle vit hors du composant
(`trader/niveaux.ts`) pour qu'un cliquet puisse la lire sans monter un rendu.
Les 441 px fixes restent à traiter : c'est la bande d'en-tête, pas le
découpage.*

---

## Un niveau, une page

Principe directeur : **ne pas offrir plusieurs actions sans rapport sur la
même page.** Une page mène à une page, qui mène à une page.

**3. ~~Page Marché : le récapitulatif du bas.~~ FAIT le 24 octobre 2026.**
Tu avais raison sur « déjà accessible ailleurs », et le relevé dit à quel
point : au téléphone, la famille du marché s'écrivait **trois fois** sur une
page de 1 363 px —

| | |
|---|---|
| y 60 | les pastilles du rail, sept entrées |
| y 115 – 659 | le sommaire en bandes, les six autres |
| y 1 175 | le récapitulatif du pied, trois de plus |

« Comparer deux lignes » y figurait **deux fois au mot près**. Sur grand
écran, la colonne tient la famille et le pied en reprenait trois.

C'était la leçon que `MarketStrip` avait déjà tirée — une bande de pied qui
répète la famille est du bruit une fois les pastilles posées —, restée à
moitié appliquée. Son autre moitié tient, et c'est elle qu'on garde : **un
lien dans une phrase porte sa raison**. « Ce que le bulletin publie » n'était
cité nulle part ailleurs ; il reste donc seul, contre la phrase qui dit
pourquoi on le suivrait.

`MarketStrip` part avec : elle rend `null` hors du desk depuis le 5 octobre,
et trois pages du client la montaient quand même, sans `mode`. Un composant
monté là où il ne rend jamais rien est une description fausse de la page.

→ ~~*Reste à voir, et c'est l'item 2 : le sommaire en bandes redit le rail de
pastilles.*~~ **RÉGLÉ le 24 octobre 2026** : c'est le rail qui se tait, et sur
la porte seulement. La distinction entre un menu et un sommaire tenait ; ce
qui ne tenait pas, c'est d'en poser deux avant le titre. Voir le point 2.*

**5. ~~« Votre provision ».~~ FAIT le 24 octobre 2026**, maquette approuvée
d'abord. La page portait **quatre gestes numérotés empilés**, et sur le même
écran : le motif du virement, le bénéficiaire, la banque, le RIB, quatre
boutons « copier », **un champ de montant pour placer, un second pour se
faire virer**. Garnir un compte, souscrire un fonds et demander un virement
n'ont en commun que le solde qu'ils déplacent. **2 518 px → 1 267.**

| le geste | sa page |
|---|---|
| L'alimenter | `/moi/provision/alimenter`, **créée** |
| La faire travailler | `/moi/provision/placer`, **créée** |
| La reprendre | `/moi/provision/reprendre`, **créée** |

La page d'arrivée ne porte plus **aucun formulaire** : le total, la barre, les
deux états, ce qui est placé hors du total — la réponse, pas un
développement. Puis trois bandes, puis **deux pastilles au pied**, un rond
plein pour ce qui entre et un rond cerclé pour ce qui sort, chacun avec son
mot dessous : un rond muet serait un menu, pas un sommaire.

Le titre « Ce que vous pouvez en faire » est parti, et avec lui « L'alimenter »
et « La reprendre » de la liste des bandes : les pastilles les disent déjà.
« La faire travailler » y reste — ce n'est pas un mouvement d'argent, la
somme ne sort pas, elle devient des parts.

→ *Le quatrième encadré n'était pas un geste. « Régler un ordre » portait
l'étiquette « sans vous » et ne proposait aucune action : c'était la seule
chose de la page qu'on ne pouvait pas faire. Il EXPLIQUAIT le mis de côté, et
il est remonté dans ce bloc, sous le chiffre qu'il explique.*

→ *Deux défauts réparés en chemin : « Vos ordres en cours » pointait sur
`/#ordres-en-cours`, une ancre morte depuis que l'accueil a cessé de déplier
le relevé ; et la règle qui reconnaît un fonds monétaire, écrite une fois
pour deux lectures de la même page, en servait trois une fois les pages
séparées — elle vit maintenant dans `monetaire.ts`.*

**6. ~~« Mes documents » : la liste s'ouvre dans un dépliant.~~ FAIT le
24 octobre 2026**, maquette approuvée d'abord. Les quatre rayons étaient des
plis : la bande portait un chevron — elle promettait une page — et ne faisait
que se déplier. Chacun est maintenant une page, l'en-tête des quatre vient
d'une seule coquille, et le sommaire a perdu sa barre « Tout replier » et ses
compteurs.

→ *Ouvre le point 8 : les rubriques du sommaire sont posées en BANDES ici
(`<Rubriques bandes>`). Les autres sièges gardent les filets. Basculer le
défaut harmoniserait tout d'un coup.*

**9. ~~La page « Bonjour ».~~ FAIT le 24 octobre 2026**, maquette approuvée
d'abord. Elle portait le relevé entier, six sections dépliées, et disait
quatre fois la même chose. **2 954 px → 2 414 px** (3,5 → 2,9 écrans de
téléphone).

Le relevé, mesuré avant de toucher à quoi que ce soit :

| la même chose | une fois | et une autre | écart |
|---|---|---|---|
| le lien de l'analyse | y 715 | y 1 684 | 969 px |
| la fiche de l'OTA | y 1 257 | y 2 072 | 815 px |
| la fiche du FCP | y 1 345 | y 2 215 | 870 px |
| « Vos opérations » | y 2 019 | y 2 681 | 662 px |
| la date du 14 février | y 660 | y 1 851 · y 2 812 | **trois noms** |
| le nombre d'intentions | « En cours · 2 » y 1 851 | les deux cartes y 2 019 | 168 px |

**Et un chiffre qui en contredisait un autre.** « Positions valorisées · 7 M »
était le SEUL chiffre de la page à compter la ligne sans cours publié —
1 980 276 + 4 890 548 — quand la page écrit quatre cents pixels plus haut
« elle reste hors de ce total ». L'étiquette disait l'inverse de ce que le
chiffre faisait. Les trois compteurs sont partis.

Ce qui se dépliait a maintenant une adresse, et l'accueil n'en garde que la
bande, dans le sommaire de la maison :

- **Vos intentions** → `/moi/ordres`, **page créée**. En cours et passées.
- **Vos versements programmés** → `/moi/epargne`, qui portait déjà la même
  section avec le même composant. Rien à créer.
- **Vos droits de garde** → `/moi/garde`, **page créée**.
- **Lignes suivies** → `/moi/suivies`, **page créée** ; chaque ligne mène à sa
  fiche, qui existe déjà.
- Les quatre tuiles du « reste du dossier » sont devenues des bandes du même
  sommaire : une grille et une liste pour la même chose faisaient deux
  grammaires sur une page.

→ *Trois défauts trouvés en chemin, et réparés :*

*(a) **Une contre-proposition n'apparaissait dans aucune liste.** Le filtre
retenait « reçue, confirmée, transmise » : l'état qui attend justement une
réponse du client tombait entre les deux, et la carte capable de l'afficher
ne pouvait donc jamais paraître.*

*(b) **« Signer » et « Répondre » se repliaient sur `/moi#ordres-en-cours` »**,
une adresse morte : `/moi` redirige vers la racine, qui perd le fragment, et
l'ancre vivait de toute façon sur la racine. Sans ordre désigné, les deux
boutons déposaient le client en haut de la page qu'il avait sous les yeux.*

*(c) **Une contre-proposition sans termes rendait une carte muette** : le
composant rend `null` faute de `counter`, et il ne restait rien entre le titre
et la piste. La phrase de suite prend le relais.*

---

## Défauts nommés

**10. ~~« Ne faites pas ça » est très pauvre.~~ FAIT le 24 octobre 2026.**
C'étaient deux choses, et la mesure l'a montré : « Ne faites pas ça » est le
bouton qui ARRÊTE un versement annoncé, pas une procédure qu'on reprend. Il
s'appelle maintenant « Arrêter cet ordre », du nom de son geste et dans la
langue des deux boutons qu'il ouvre.

La reprise, elle, portait sur le dossier d'ouverture : « Reprendre mon
dossier » ouvrait le haut du formulaire. Il ouvre maintenant la première
étape non faite, et l'ancre vit dans la table des étapes pour qu'elle ne
puisse pas désigner une section disparue.

**Péremption : écartée, sur décision.** Un dossier au brouillon porte les
photos de la pièce d'identité ; les détruire pour ranger un écran coûterait
au client de tout refaire. Rien ne s'efface, et la réclame reste.

**11. ~~« Vos ordres passés » annonce 1, et la page suivante est vide.~~
FAIT le 24 octobre 2026.** Le compte n'était pas faux : il comptait *autre
chose*. La tuile comptait les intentions closes (4) et ouvrait le journal des
espèces, qui n'avait aucune écriture — deux sources pour une promesse. Les
trois tuiles disent maintenant ce qu'on trouve de l'autre côté, et une
épreuve interdit qu'un lien reprenne un compteur.

→ ~~*Reste à voir : il n'existe nulle part de liste des ordres passés.*~~
**RÉGLÉ le 24 octobre 2026** par le point 9 : `/moi/ordres` a été créée, et
elle porte les deux — en cours et passées. La tuile avait été renommée
d'après sa destination réelle plutôt que de promettre une page qui n'existait
pas ; la page existe maintenant.*

---

## 13. ~~Une page d'accueil.~~ FAIT le 24 octobre 2026

Maquette approuvée d'abord, puis codée section par section. Chaque section
sait se taire quand elle n'a rien à dire — c'est la règle de niveau 3
ci-dessous —, et une épreuve interdit qu'un titre survive à son contenu.

| la section | ce qu'elle porte | d'où vient la donnée |
|---|---|---|
| Ce qui ferme bientôt | les séances qui ferment, le temps qui reste en trois tons | `domain/echeances`, partagée avec Trade |
| Investir | les trois familles et ce qu'elles contiennent | `comptesParLieu`, celle de leurs pages |
| Le marché · l'indice | le niveau, sa séance, quatre fenêtres | `IndexPulse`, en variante compacte |
| Ce qui performe | les actions qui ont bougé, sur une fenêtre écrite | `market/performe`, **trois requêtes** |
| À la une | la dépêche épinglée et son « pourquoi ça compte » | `lib/news`, partagée avec `/marche` |
| Lignes suivies | un compte, au dossier | `lignesSuivies`, celle de sa page |

**Le prochain flux dit enfin ce qu'il est.** « Prochaine échéance · 14 février »
ne disait ni ce qui tombe, ni combien, ni sur quelle ligne — alors que
`nextFlow` porte `{ date, amount, label }` et que la page n'en gardait que le
premier tiers.

→ *Quatre éléments de la maquette sont ÉCARTÉS, et leurs raisons sont dans le
code :*

*— **L'agenda.** Son côté « la place » demandait les jours sans séance, que
`finance.ts` dit ne pas connaître : « ils diffèrent d'un État de la zone à
l'autre et demanderaient un calendrier tenu quelque part ». Les dessiner,
c'était inventer un fait de marché pour six États. Son côté « vous » aurait
été une QUATRIÈME surface pour une date que la page porte déjà deux fois à
bon droit — et l'en-tête du fichier raconte précisément qu'on en a retiré une
troisième le matin même.*

*— **Le volet « la séance »** (lignes servies, transactions, montant échangé).
Il se calcule par `indexPageData` : deux mille bulletins, les derniers cours,
les sociétés, puis deux mille cotations PAR LIGNE cotée. Une dizaine de
requêtes, dont sept non bornées, sur la page la plus visitée de la maison. Il
reste sur `/marche`, où la donnée est déjà lue.*

*— **La liste de suivi relistée.** La page `/moi/suivies` dit pourquoi elle
existe : « sur la page d'accueil, elle se lisait trois lignes après Vos
lignes, et les deux se confondaient — ce qu'on a, ce qu'on regarde ». Deux
listes de noms de titres se confondent ; un compte ne se confond avec rien.*

*— **Le pied de mentions.** `layout.tsx` l'a retiré aux clients, mesure à
l'appui : « cent treize pixels qu'on lit une fois, puis plus jamais ». Les
mentions vivent à `/info/mentions`, que le siège Aide nomme — et une épreuve
lie désormais les deux faits, car la note qui justifiait cette ligne
s'appuyait sur un pied qui n'existe plus.*

### Les trois niveaux, et ce qu'ils décident

Pas de widgets, pas de réglages : la page se range sur l'état réel du dossier
et de la place. Le principe existait déjà — `IndexPulse` rend `null` sans
bulletin, `/marche` écrit `{aLaUne && …}` — il est étendu à l'accueil.

- **Niveau 1, le socle.** Toujours là, toujours à la même place : l'en-tête,
  le portefeuille, les quatre gestes, la provision, le dossier. Ce dont le
  client a besoin même quand il ne se passe rien, et ce que la maison doit
  pouvoir prouver avoir affiché.
- **Niveau 2, ce qui remonte.** Un seul seuil est écrit à ce jour : une
  échéance **à moins de sept jours** fait passer « Ce qui ferme bientôt »
  devant le reste. Ce n'est pas de l'esthétique — un virement interbancaire
  de la zone met deux à trois jours, et l'argent doit être arrivé avant le
  dépôt.
- **Niveau 3, ce qui s'efface.** Absent quand il n'y a rien : pas de carte
  vide, pas de « aucun élément ». Toutes les sections du tableau ci-dessus le
  tiennent.

→ *Et un défaut de cette règle, trouvé en la relisant : la section du marché
écrivait son titre dans une `section` inconditionnelle, au-dessus d'un indice
qui rend `null`. Il restait « LE MARCHÉ · La place → » suivi de rien —
l'état de TOUTE page d'arrivée en développement, le dépôt mémoire n'ayant
aucun bulletin. Le titre appartient désormais à la pièce qui sait s'il y a
quelque chose à montrer.*

### 13 bis — ~~la barre du haut et le découpage du dock.~~ FAIT le 24 octobre 2026

*Dicté, discuté, puis codé.*

- ~~**Retirer la marque du haut.**~~ Elle tenait le tiers gauche de tous les
  sièges du dock, sur l'écran le plus étroit de la maison, pour dire au
  client ce qu'il sait déjà. **Et elle menait à `/` depuis `/`** : sur une
  racine, c'est-à-dire là où elle paraissait, le lien ramenait à la page
  qu'on regardait. La barre porte maintenant le nom de la PAGE, et le cède au
  `h1` tant qu'il est à l'écran — le mécanisme existait, il ne servait que
  hors racine.

  → *Deux écritures en dur sont parties avec elle.* `PURPOSE CAPITAL` *en
  littéral, à côté d'un* `config.ts` *qui se présente comme « the one place
  to change names ». Et le découpeur de titre, qui coupait sur*
  `(Guichet|Purpose Capital)` *écrits à la main : renommer la société aurait
  laissé « Tableau de bord · Nouvelle Raison Sociale » dans la barre, sans
  que rien ne tombe.*

  → *Et un décalage d'une colonne évité : la barre est une grille de trois
  colonnes, la flèche tenait la première. Sans place écrite, le jour où elle
  manque — c'est-à-dire sur toute racine — le titre serait passé en première
  colonne et les icônes en deuxième.*

- ~~**La cloche portant un nombre**, et **sur l'accueil** l'utilisateur, la
  recherche et les notifications.~~ **Déjà acquis** : `BarreDuCompte` posait
  la loupe, la cloche à compteur et l'initiale sur toutes les pages, racine
  comprise. Rien à écrire.

- ~~**Fondre Trade et Instruments.**~~ Les deux sièges nommaient deux fois le
  même sujet — et c'étaient précisément les deux qui ne s'allumaient jamais
  (point 1). `/instruments` rangeait par instrument, l'axe que
  `domain/services` avait écarté en toutes lettres — *personne ne se réveille
  en voulant un OPCVM* — et ses cinq services menaient DÉJÀ aux trois
  familles. `/portefeuille`, lui, résumait la racine : sa première rubrique
  ÉTAIT la racine. Les deux redirigent, en 307 et non en 308 : elles vivent
  dans des signets et dans des liens envoyés par le desk.

  **Le dock passe de cinq sièges à quatre : Accueil, Trade, Marché, Aide.** À
  390 px, cinq sièges laissaient 78 px chacun et « Instruments » n'y tenait
  qu'en coupant.

  → *Un geste qui menait à une page de lecture, réparé au passage :
  « Acheter et vendre en bourse » pointait* `/marche` *, à deux crans de*
  `/titres` *— qui n'était la destination d'aucun service. Une épreuve lit
  les deux tables et refuse qu'un service mène à une page qui se lit.*

→ *L'arbitrage A de `ETALON.md` n'est pas rouvert : la barre cède toujours le
nom au `h1`, et elle le cède désormais sur TOUTES les pages, racines
comprises. La croix reste à décider, page par page, le jour où une page en
demandera une.*

---

## Ce qu'il reste, au soir du 24 octobre 2026

**Les treize points sont clos** — douze l'étaient quand cette section a été
écrite, le septième l'a été dans la soirée. L'ordre proposé a été suivi : l'étalon
d'abord, l'en-tête commun ensuite, puis les défauts isolés, les redécoupages,
et la page d'accueil en dernier — elle était bien la vitrine de toutes les
décisions d'avant, et aucune n'a eu à être refaite.

**Le point 7 est clos : le cliquet est à zéro.** 49 en-têtes écrits à la main
au matin, 38, 27, 18, puis plus rien — **toute page de l'application monte
`EnTete`**. Les dix fichiers qui écrivent encore un `h1` sont nommés, chacun
avec sa raison : la vitrine, l'en-tête lui-même, le « Bonjour » de la console,
trois écrans de seuil, et la note de marché trimestrielle, qui est un document
publié et non une page.

Le cliquet reste, à `0` : il interdit maintenant la RÉGRESSION, qui est son
autre moitié. Une page neuve qui écrirait son en-tête à la main le ferait
tomber le jour même. Un cliquet ne se coche pas ; celui-ci a touché le fond.

**Il ne POUVAIT pas toucher le fond, et c'est ce qu'il a fallu corriger
d'abord.** Parmi les 27 d'alors, `EnTete.tsx` **lui-même** : le composant qui
écrit le `h1` était compté comme une page qui ne l'avait pas converti. Un
cliquet qui mélange « pas encore fait » et « ne sera jamais fait » n'atteint
jamais zéro, et un compte qui ne peut pas tomber à zéro ne dit plus s'il reste
du travail. D'où **deux mesures** : des dispenses NOMMÉES, chacune avec sa
raison — la forme que l'ETALON donne déjà à la règle de la fonte, *« un compte
dirait combien de fichiers posent la fonte, pas lesquels ont le droit »* — et un
cliquet qui ne porte plus que ce qui attend. Une dispense dont la page est
convertie, renommée ou supprimée ne vise plus rien, et l'épreuve le dit.

**Vingt-sept pages converties, en deux lots** : dix d'abord — mentions légales,
notes de marché, réclamation, parcours du guide, annexe tarifaire,
prélèvements, épargne programmée, activité, et les deux pièces qui titrent une
référence —, puis les dix-sept qui restaient, de `/marche` à `/ouvrir-un-compte`.

→ *Trois pages gardent un dispositif de retour à elles, et c'est délibéré :*
`/comparer` *a un retour d'historique, n'ayant pas un parent unique ;*
`/societes/[mnemo]` *porte deux liens dont un conditionnel — une bande de
navigation, pas le créneau ;* `/offres/[id]` *garde son `ListNav`, qui déplace
dans une liste au lieu de remonter d'un cran. Et* `Dossier` *garde son encre :
un bleu franc et un trait plus léger, l'identité de cet écran — le § C de
l'ETALON porte sur la FONTE, pas sur le poids ni la couleur.*

→ *Ce que les conversions ont trouvé, et que l'écriture à la main cachait.*
*Trois fils d'Ariane, alors que la note de `EnTete` disait celui de
« Sécurité »* « le seul de l'application » *: « Portefeuille › Réclamation »
redisait en plus le nom de la page dans son dernier cran, et `/moi/epargne`
portait un `nav` d'un seul lien vers son parent — un fil d'un seul cran est un
retour. Deux de ces pages nommaient en outre MAL leur destination,*
« Portefeuille » *pour* `/`, *que la maison appelle* « Tableau de bord » *:
l'épreuve des retours lit `retour={{ … }}` et ne pouvait rien voir d'un
`<Link>` écrit à la main. Et le sur-titre des mentions répétait son titre mot
pour mot. Convertir une page, c'est aussi la faire entrer sous les épreuves
auxquelles son écriture l'exemptait.*

→ *Le second lot en a sorti autant.* **Quatre chemins déguisés** — trois `nav`
d'un seul lien vers le parent, et **un mot cliquable au milieu d'un
sur-titre** : « BVMAC » menait à `/marche` depuis l'avant-titre de l'indice,
qui y a gagné le retour qui lui manquait. *Un troisième retour mal nommé —*
« Mon dossier d'ouverture » *est l'INDICE de l'entrée dans `nav-groups`, pas
son libellé* « Mes pièces ». *Une seconde grille de douze colonnes montée pour
un seul en-tête, sur `/info/risques`, où la phrase partait en colonne 9. Deux*
`font-family: var(--font-display)` *sur des titres, c'est-à-dire la fonte de
l'interface sous un autre nom. Et une marge écrite en style en ligne sur un
`h1`.*

→ *Un créneau de plus, déclaré :* `reference`. *Deux pages titrent une
RÉFÉRENCE et écrivaient toutes deux `display mono` sur leur `h1`. Et le
sur-titre accepte désormais un NŒUD — une page du guide y pose la pastille de
sa section ; la règle « jamais un lien, jamais un chemin » était tenue par le
TYPE, elle est maintenant vérifiée sur les APPELS, et c'est là qu'elle
comptait depuis le début.*

Trois lignes restaient ici au moment d'écrire cette section. **Les trois sont
réglées** — deux faites dans la soirée même, la troisième étant une décision et
non un reste —, et aucune n'était un défaut :

- ~~**Les aperçus des tuiles de Trade.**~~ **FAIT, EN DEUX TEMPS.** D'abord
  l'invariant rompu : l'écran large rendait la phrase de chaque service, les
  tuiles du téléphone n'en portaient que le nom, alors que le fichier déclare
  en tête que *« les deux écrans rendent le même texte dans le même ordre »*.
  Les tuiles portent la phrase — et non la précondition, la même pour presque
  tous les services.

  **Puis les deux lignes de la maquette, pour trois tuiles sur quatre.** Ce
  qui a décidé : **aucune lecture de plus**. Les offres sont déjà en main sur
  cette page, le contexte est en cache par requête, et les trois sélecteurs
  existaient — `lignesDeLaCote`, `fondsListes`, les parts détenues du
  contexte. Un aperçu à une requête par tuile aurait été écarté comme le volet
  « la séance » de l'accueil ; une épreuve interdit d'ailleurs au domaine de
  toucher au dépôt.

  **Le refus, et c'est mon propre commentaire du matin qui l'impose.**
  « Adjudications et émissions » n'en reçoit pas : ses deux lignes seraient les
  deux prochaines séances, exactement celles que « Ce qui ferme bientôt » pose
  en tête de la même racine. Deux listes de la même chose sur un écran
  divergent toujours. L'objection était juste, et elle ne valait que pour
  celle-là — les trois autres montrent ce que rien d'autre ne montre ici : la
  cote, les fonds ouverts, la part qu'on détient. L'épreuve garde le refus
  autant que les aperçus, faute de quoi quelqu'un « compléterait » la série de
  bonne foi sans jamais savoir pourquoi c'est faux.
- **« Ce qui ferme bientôt » vit sur Trade ET sur l'accueil**, par décision
  explicite. C'est le même composant appelé deux fois, pas deux listes à
  tenir — et depuis ce soir le même `joursEnMots` que le rappel quotidien.
  **C'est la seule des trois qui reste, et c'est un choix, pas un reste.**
- ~~**Le lockup `COMPANY.name`**~~ en tête de la colonne des grands écrans.
  **TRANCHÉ.** Il reste — sur une colonne de 260 px fixe, un nom de maison ne
  prend la place de personne, et un client ne le lirait plus nulle part
  ailleurs : le pied réglementaire ne paraît qu'au visiteur. Mais il **n'y
  mène plus** : la barre large a son onglet « Accueil » et la colonne son
  groupe « Accueil », et une enseigne qui y mène aussi donnait deux cibles
  pour une destination à quelques dizaines de pixels l'une de l'autre — le
  défaut même que le bandeau du téléphone s'est fait retirer. Muet pour le
  client, lien pour le visiteur.

Et deux chantiers nommés par les relevés, qui n'ont jamais été des points de
la dictée. **Les deux sont clos.**

- ~~**Les 441 px fixes du parcours de Trade**~~ (relevé 12-b). **FAIT.** Le
  solde, « Ce qui vous attend » et les échéances se repeignaient à l'identique
  aux trois niveaux, au-dessus du ruban — et le solde comme les échéances
  s'étaient AJOUTÉS depuis le relevé, ce qui avait aggravé la chose. La tête
  entre maintenant dans le premier panneau du ruban et glisse avec lui ; au
  deuxième niveau il ne reste que le chemin et la fiche. Un seul assemblage
  rendu à deux endroits, et une seule lecture : `contexteDuClient` est en
  cache par requête, les offres sont lues une fois dans la page.

- ~~**Les « huit autres seuils de niveau 2 »**~~ — **ce compte était faux, et
  je l'avais déjà corrigé ici même avant de le réécrire dans cette liste.**
  Le relevé ligne par ligne du 24 octobre avait conclu que la plupart des
  règles étaient déjà tenues par des composants qui rendent `null` ; cette
  section a tout de même gardé le chiffre de l'estimation d'avant. Il n'y a
  jamais eu huit seuils.

  **Le relevé exact : la planche porte DEUX seuils, pas neuf.** Sept jours
  pour une échéance — écrit, `JOURS_URGENT` et `presse()` dans
  `domain/echeances` — et cinq jours pour un flux qui tombe, qui n'a jamais
  été écrit. Ce dernier **est retiré de la planche**, avec sa raison : c'était
  le seuil de l'agenda, la section qu'il devait faire remonter, et l'agenda a
  été écarté faute de connaître les jours fériés de la zone. Un seuil dont la
  section n'existe pas ne déplace rien.

  **Sa raison, elle, tenait.** Un coupon modifie la provision, donc ce que le
  client peut engager d'ici là — et la carte de la provision écrivait
  « Prochaine échéance · 14 février », laissant la soustraction au lecteur.
  C'est exactement ce que `echeances.ts` interdit en tête de fichier : *le
  temps qui reste, et non la date seule ; la page sait quel jour on est, lui
  doit s'en souvenir.* Trois surfaces posent cette question, et le relevé les
  a trouvées toutes les trois en défaut d'une façon ou d'une autre : le rappel
  quotidien et la bande des séances écrivaient **le même ternaire à trois
  branches en double** — la seconde copie sous un commentaire qui disait
  « les mêmes mots que le message de rappel » —, et la carte de la provision
  ne le disait pas du tout. Une définition (`joursEnMots`), trois appels, et
  une épreuve qui nomme les deux seuls fichiers ayant le droit de porter les
  trois mots.

  → *Deux choses vérifiées avant d'y toucher, dont une qui a évité une fausse
  réparation : `« demain »` paraissait absent des dictionnaires, et il y est —
  en clef non guillemetée, que mon motif de recherche ne voyait pas. Et le
  décompte de jours vient de `inDays`, déjà porté par le flux : le recalculer
  aurait donné un second arrondi, donc un jour d'écart un jour sur deux.*

---

## Ce que seul le navigateur a dit

**Les vingt-sept pages converties ont toutes été ouvertes à l'écran**, plus la
fiche d'une pièce et la branche « ligne retirée » d'une offre. Ces deux-là
n'ont aucune instance dans le semis : une pièce s'ÉMET et un retrait se POSE,
tous deux par le desk. Le pilote les produit donc avant d'aller les lire avec
les yeux du client, au lieu de les déclarer inatteignables.

**Trois défauts qu'aucune épreuve ne pouvait voir** — et c'est la leçon de la
journée :

1. **Un titre de page à 12,3 px.** Le créneau `reference` posait la classe
   globale `mono`, qui règle AUSSI `font-size: 0.82em` : elle gagnait sur la
   règle commune des `h1`. Le défaut préexistait, mais le porter dans l'en-tête
   commun le rendait pire — c'est lui qui garantit « un titre de page, une
   taille ». Il pose désormais sa propre classe : la chasse fixe et les
   chiffres tabulaires, rien sur la taille.
2. **Les aperçus sortaient de leur tuile** — 205 px de rangée dans une tuile de
   175. La cause n'était pas l'enfant mais la rangée : élément de grille, son
   `min-width: auto` l'empêchait de se rétrécir. Le relevé du DOM donnait
   pourtant `debordement = 0` et la console était muette : la page ne défilait
   pas, un parent coupait. Deux formes ont été rejetées sur preuve avant la
   bonne — tronqué, « FCP Trés… » et « FCP Obli… » ne distinguaient plus deux
   fonds ; coupé n'importe où, « Obligatio / ns CEMAC ».
3. **Une classe morte née d'un commentaire** : le détecteur lit aussi les
   commentaires des feuilles, où j'avais écrit « .mono » avec son point.

*Dans les deux premiers cas, les deux règles en cause vivent dans deux
fichiers, et c'est leur croisement au RENDU qui décide. C'est la limite exacte
des cliquets qui lisent du CSS, et elle vaut d'être écrite ici.*

→ *Et deux voiles couvrent toute page au premier passage — le consentement aux
mentions, puis l'accueil d'embarquement. La première passe a mesuré le DOM
correctement et photographié dix fois le même voile : une capture qu'on ne
REGARDE pas ne prouve rien.*

---

## Les planches, relues contre le code

La planche n'est pas un dessin qu'on garde : c'est la seule trace des règles
qui ne sont pas encore du code, et **la tenir à jour est ce qui l'empêche de
mentir**. Les sept ont été relues ; six mentaient.

- **`Regles`** — sa colonne « sa place » décrivait du code EXISTANT et se
  trompait sur cinq lignes. Relevée dans `Console.tsx` et numérotée dans
  l'ordre du rendu. Deux lignes décrivaient l'inexistant : « Les quatre
  gestes », une grille REFUSÉE, et le pied réglementaire, qui ne paraît qu'au
  VISITEUR — l'encadré du niveau 1 justifiait sa règle par un bloc absent de
  l'écran qu'il décrit.
- **`Dock`** — trois intentions devenues des faits, et une prédiction fausse :
  « deux règles d'appartenance disparaissent » — ni l'une ni l'autre n'a
  disparu, `isInstrumentsSection` est ABSORBÉE.
- **`TradeRoutes`** — son encadré « les deux trous que la fusion oblige à
  combler » les énonçait toujours au présent ; ils sont comblés.
- **`Barre`** — elle montre quatre états, dont un qui N'EST PAS AU CODE : la
  croix d'un parcours qu'on ferme. Marqué « pas écrit ».
- **`Trade`** — ses pastilles abrégeaient « dans 5 j », que le composant
  rejette en toutes lettres.
- **`Main` et `Court`** — non retouchées, et c'est délibéré : ce sont les
  dessins d'INTENTION dont le code s'est écarté décision par décision. Une
  huitième planche, **`Ecart`**, porte les dix-huit blocs en trois colonnes —
  rendu, changé, jamais écrit — avec la raison de chacun.

  **Tranché le 25 octobre : `Ecart` ne les remplace pas, elle les ouvre.** Les
  deux dessins portent ce que le code a cessé de dire — pourquoi les quatre
  gestes ont été refusés, pourquoi l'agenda a été écarté — et `Court` montre en
  outre, côte à côte et en cadres pointillés, les SILENCES du niveau 3, qu'aucun
  écran ne peut montrer ensemble puisqu'on n'en voit qu'un état à la fois. Les
  jeter effacerait l'avant qui rend chaque décision lisible. Ce qui mentait
  n'était pas le dessin, c'était l'absence d'étiquette : les deux cadres
  s'appellent désormais **« dessin d'intention »**, et `Ecart` se nomme leur clé
  de lecture.

  **Et `Ecart` mentait à son tour, en un jour.** Son encadré annonçait « dix
  blocs sur dix-huit » et donnait trois sections pour absentes — « Ce qui ferme
  bientôt », « À la une », « La sélection du desk » — en les mettant au compte
  de la règle de niveau 3. **C'était le SEMIS**, réparé le soir même : les trois
  paraissent. Relevé du 25 octobre, dossier complet sans ligne : neuf blocs sur
  dix-huit, et « Ce qui ferme bientôt » OUVRE la page, une séance à quatre jours
  faisant enfin jouer le seuil des sept.

  **Le compte lui-même a été retiré de l'en-tête**, parce qu'il ne mesure pas ce
  qu'il prétend : 2 744 px et neuf blocs pour un dossier complet sans ligne,
  1 332 px et cinq pour un dossier à l'examen, 1 759 px et cinq pour un compte
  sans dossier. **C'est une propriété du COMPTE, pas de la page.** Ce qui reste
  gravé dans `Ecart` est la table des DÉCISIONS, bloc par bloc : elle, ne bouge
  pas avec le compte qu'on regarde.

---

→ *Deux faits à retenir pour qui reprendra : le dépôt mémoire n'a **aucun
bulletin** — la série du BOC est ingérée, jamais semée —, donc l'indice et le
classement ne paraissent pas sans `.env.local`, et c'est la règle de niveau 3
qui joue, pas une panne. Et il n'a **aucun document ni aucune offre retirée** :
ces états se posent par le desk, ils ne se sèment pas.*

---

## Le cliquet des classes mortes : il comptait mal, quatre fois

Le cliquet portait **95**. Avant de le rabaisser, on l'a mesuré — et ce sont
les angles morts du COMPTEUR qui faisaient le chiffre :

1. **Il ne lisait que `styles.X`.** Une feuille importée sous un autre nom
   voyait toutes ses classes comptées mortes, et les `styles.X` d'une AUTRE
   feuille lue par le même fichier lui étaient attribués. `FundCard.tsx` fait
   les deux à la fois : ses quatorze « mortes » étaient vivantes, dont quatre
   qu'une épreuve voisine exige. **95 → 80.**
2. **Il lisait les commentaires comme du CSS.** `.teteBoite` ne survivait que
   dans une phrase qui parlait d'une autre feuille. **80 → 56.**
3. **Il reconnaissait les feuilles par leur NOM DE FICHIER** — et
   `page.module.css` existe **79 fois**, une par route. Les 79 se mélangeaient,
   et il suffisait qu'un seul de leurs lecteurs compose ses noms de classe pour
   que les 79 sortent du relevé d'un coup. Le relevé en lisait 112 sur 191.
   Découvert en plantant une classe morte à la main dans la feuille de Trade :
   **l'épreuve ne la voyait pas.** **56 → 137.**
4. **Il comptait `:global(.x)` pour une classe du module.** Une classe échappée
   est posée par une chaîne, jamais par `styles.x` : les compter mortes aurait
   fait élaguer les rails de poignée du desk, qui travaillent. **137 → 128.**

**Et sur les 128, six n'étaient pas mortes : elles étaient INERTES.** Une
classe de la maison écrite sans `:global` est hachée par le module, et la règle
ne mord sur rien. Les élaguer aurait effacé l'intention au lieu de la rendre
vraie — c'est le piège où le relevé conduit tout seul, et le message de
l'épreuve nomme désormais les deux remèdes. Ce que leur réparation a rendu :

- **Le surtitre de la carte « Parcours » sur `/info` passait de 2,97 : 1 à
  12,16 : 1** — il gardait l'encre claire de la maison, faite pour un fond
  clair, sur du bleu de nuit. Dans les deux thèmes. Les gardes de contraste
  existantes mesurent **dans une même règle** ; ici le fond est sur `.parcours`
  et l'encre sur une règle descendante : la limite qu'elles annoncent.
- **La piste d'audit du desk laissait ses 130 px de gauche vides** sur toute sa
  hauteur : `:not(.mono)` n'excluait rien, donc l'heure passait en colonne 2
  comme le reste. Mesuré : tous les enfants à `x = 142`, désormais l'heure à 0.
- **La puce « PDF » d'une pièce** n'avait ni fond, ni rayon, ni cale.
- **Le bouton de la carte d'appareil connu** s'étirait sur 956 px au lieu de
  129, et le nom de l'appareil restait à 14,25 px au lieu de 12.

**Et quatre pages nommaient une classe qui n'existe nulle part.** `/moi/ordres`,
`/moi/activite`, `/moi/suivies` et `/moi/garde` écrivaient `className="wrap"` —
`.wrap` n'est pas une classe de la maison, et leur feuille la porte en module.
Elles s'étalaient sur 1 152 px quand leurs voisines s'arrêtent à 880–900. Le
`.wrap` du dossier était le fossile de ce lien rompu : il disait 1 100 px, que
personne n'appliquait. Les quatre y sont revenues, centrées.

Reste **120 classes vraiment mortes**, élaguées — 1 750 lignes. Les 61 feuilles
touchées ont été rechargées route par route : 750 à 1 300 règles analysées
par page, aucune feuille vide, aucun débordement. Le cliquet ne porte plus de
plafond : **zéro**, tenu par une non-vacuité qui exige 150 feuilles et 2 000
classes lues — le seuil est choisi sur le plus gros des quatre angles morts,
celui qui en cachait 79.

*Effet de bord mesuré : le cliquet de la typographie tombe de 1 091 à 1 032.
Cinquante-neuf tailles hors échelle sont parties AVEC leurs règles — une taille
hors échelle dans une règle morte n'était pas une dette de typographie.*

---

## La garde de contraste descendante

Les deux gardes de contraste de la maison nomment elles-mêmes ce qu'elles ne
voient pas. `contrast.test.ts` mesure les règles qui posent **à la fois** un
fond et une encre, et écrit : « ce qu'il ne mesure pas : l'encre posée sans
fond, dont le sol vient d'un parent ». `contraste-sans-fond.test.ts` prend
l'autre moitié — une encre FIXE sur un papier qui bascule. Entre les deux, il
restait le cas le plus courant : une encre à jeton sur le fond coloré d'une
boîte parente. C'est celui de `/info`.

**Le trou ne se referme pas avec du CSS seul**, et c'est la leçon. Le fond est
sur `.parcours`, l'encre vient de `globals.css` : aucun fichier ne porte les
deux. **Ce qui les réunit, c'est le balisage** — le JSX dit quelle boîte
contient quel élément. La garde a donc deux mesures : l'une dans une même
feuille, l'autre en croisant feuille et balisage.

**La première mesure est prudente, et chacune de ses trois conditions a été
posée sur un faux qu'elle écartait.** Le premier relevé donnait quatorze
écarts, dont **quatorze étaient faux** :

- `.band { background: var(--line) }` avec `.band span { color: … }` : la
  feuille porte aussi `.band > div { background: var(--surface) }` — la bande
  ne montre son trait que dans les gouttières, le texte est sur la surface. Un
  sélecteur-préfixe ne dit pas ce qui s'intercale, donc **dès qu'un fond PEUT
  s'intercaler, on se tait**.
- `.gx { width: 1px; background: var(--line-2) }` avec `.gx b { position:
  absolute; bottom: -18px }` : l'étiquette sort de sa ligne d'un pixel. **Une
  encre en position absolue a un sol que le fichier ne connaît pas.**
- `.mrow small, .mrowOn small { color: var(--ink-3) }` suivi, deux règles plus
  bas, de `.mrowOn small { color: var(--on-navy-2) }` : la cascade avait déjà
  corrigé. **On ne lit que la dernière déclaration d'un sélecteur.**

Reste zéro écart en même feuille, et **deux par le balisage** : la barre des
brouillons et l'avis des ISIN manquants du Référentiel posaient un
`className="muted"` dans une boîte `--warn-soft`. Mesuré au rendu, avant
**4,44 : 1** au thème clair, après **6,48**, et la mesure statique tombe au
centième sur le rendu dans les trois thèmes.

**Et la garde s'est fait prendre par sa propre vérification à l'envers.** Elle
acceptait `.parcours .eyebrow` comme écrasement de l'encre de la maison — or
c'est la forme INERTE, celle du défaut. Elle se serait tue exactement là où
elle doit parler. Un écrasement ne compte plus que s'il est écrit `:global`.

*Un fait mesuré, qui dépasse ces deux écarts et que la maison voudra trancher :
**`--ink-3` ne tient pas sur un fond doux au thème clair.** Sur les dix jetons
`*-soft`, il va de 4,18 à 4,62 — six sous 4,5. `--ink-2` tient partout, de 6,09
à 6,73. La garde ne voit que les couples que le balisage lui donne ; le jeton,
lui, est en cause partout.*

*Au passage, la formule de contraste du W3C vivait en deux exemplaires et une
troisième garde allait en faire une troisième : elle est maintenant dans
`src/test/couleurs.ts`, et les trois gardes la lisent.*

---

## L'encre tertiaire sur les fonds teintés

**Le défaut n'était pas dans les teintes, il était dans la marge.** `--ink-3`
valait `#676d7b`, soit **4,84 : 1 sur le papier** — sept pour cent au-dessus du
seuil. Une encre sans marge sur le papier tombe sur la moindre teinte : 4,03
sur `--crit-soft`, et **sous 4,5 sur onze des quatorze fonds doux** de la
maison. Au thème sombre elle passait à 4,51 sur `--neutral-soft`, c'est-à-dire
d'un centième. Le dim, lui, tenait.

**Deux issues ont été chiffrées avant de choisir.**

*Éclaircir les quatorze teintes* : mesuré, puis **écarté**. Il fallait aller de
`#fadcda` à `#fdeeee` pour `--crit-soft`, de `#ece2f4` à `#f5f0f9` pour
`--fam-APE-soft` — c'est-à-dire laver les couleurs de **famille d'instruments**,
qui portent du sens, pour réparer une encre qui n'en porte pas.

*Assombrir l'encre* : retenu, et **ce n'est pas mon arbitrage, c'est celui de la
maison**. Le commentaire posé en septembre juste au-dessus des trois encres de
statut dit exactement quoi faire dans ce cas : « Mesurées contre leur fond
pâle… **assombries du strict nécessaire pour tenir 4,5:1, la teinte reste la
même à l'œil.** » Septembre avait visé 4,64 à 5,08 ; on vise pareil.

| | avant | après | pire fond doux |
|---|---|---|---|
| clair | `#676d7b` | `#5e6471` | 4,03 → **4,61** |
| sombre et `dark` | `#8c9bb2` | `#8e9db3` | 4,51 → **4,62** |
| `dim` | `#4e5a6c` | inchangé | 5,22 |

**Le prix est écrit, parce qu'il y en a un** : l'écart de clarté entre `--ink-2`
et `--ink-3` passe de 10,2 à 6,5 en L\*, et la hiérarchie des trois encres se
resserre. L'écart entre `--ink` et `--ink-2` reste à 27,5 : elle était déjà
irrégulière.

**Mesuré au rendu, avant et après, à la différence de pixels** : 2,5 à 3,1 % de
l'écran change, d'un écart moyen de 5,6/255 au clair et 1,5/255 au sombre, pire
écart 11. La phrase de septembre se vérifie au chiffre.

*Et une garde le tient désormais : `--ink-3` doit se lire sur chaque jeton
`*-soft`, sur chacun des quatre écrans. Elle ne porte aucune liste — le suffixe
`-soft` est la convention de la maison pour un fond teinté, donc une famille
d'instruments ajoutée demain sera mesurée le jour où elle est écrite.*

---

## Les quatre écrans qui ne se mesuraient pas

Ils avaient été prouvés **en injectant le balisage réel** dans la page, faute
de pouvoir les atteindre : le semis mémoire ne porte ni brouillon, ni écriture
d'audit, ni pièce téléchargeable, ni appareil retenu. Je l'avais écrit comme
tel. Maintenant que la page s'hydrate, ils se produisent par de **vrais
gestes**, et les mesures se confrontent.

| l'écran | le geste qui le fait naître | mesuré en situation |
|---|---|---|
| la barre des brouillons du Référentiel | modifier un type de produit, enregistrer | `muted` sur `--warn-soft` : **6,48 : 1** au clair, **7,42** au sombre |
| la piste d'audit d'une ligne | retirer la ligne avec un motif | l'heure en **colonne 1** (x = 0), le reste en colonne 2 (x = 142) |
| la puce d'une pièce | déposer un PDF depuis le desk | fond doux, rayon 3 px, cale 2/6 px, **11,01 : 1** |
| la carte d'appareil connu | enrôler un code à quatre chiffres, puis une clé | `muted` à **12 px** ; le bouton à `justify-self: start`, **332 px** dans une carte de 662 |

**Les quatre chiffres tombent sur ceux de la veille**, obtenus par injection.
C'est la seule chose que cette passe prouve de neuf — mais c'en est une : une
mesure prise sur un balisage qu'on a écrit soi-même ne vaut que si le vrai
balisage lui ressemble, et rien ne le garantissait.

*La variante « clé » de la carte demande un authentificateur virtuel
(`WebAuthn.addVirtualAuthenticator` par CDP) : sans lui, le chemin du code à
quatre chiffres ne rend pas le bouton que la règle vise.*

→ *Deux choses apprises sur la conduite d'une passe, et qui ne se voyaient pas
tant que rien ne s'hydratait. **Le thème ne se force plus de l'extérieur** :
`PaletteSwitch` observe la racine et réapplique son réglage, donc un
`data-theme` posé à la main est annulé en silence — il faut passer par le
cookie `guichet_theme` et la clef `guichet:theme`, c'est-à-dire par le réglage
de la maison. **Et les deux voiles se lèvent différemment** : celui des
mentions par un vrai geste, puisque son acceptation s'écrit au serveur ; celui
de la présentation par son drapeau `guichet:presented`, qu'il pose lui-même
une fois vu.*

---

## Les budgets des six États, et la note du desk

**Dicté par Georges le 24 octobre 2026, livré en dix lots — sept le 24, trois le 25.**
Il ne vient pas des gardes : c'est une demande, et elle a grossi en route —
d'abord une page, puis l'écriture d'une note, puis le signal qui dit qu'il y
aurait de quoi en écrire une, puis le rapprochement avec ce que le marché a
réellement servi.

### Ce que la page a trouvé, et qui vaut la page entière

Le Cameroun 2026 déclare un déficit de **631,0 milliards** et un besoin de
financement de **3 104,2** — **près de cinq fois plus**. L'écart n'est pas une
erreur : c'est l'amortissement du principal, 2 473,2, qui tombe aux dates
prévues quel que soit l'état des comptes. **Qui raisonne « déficit donc
émissions » se trompe de 80 %**, et c'est pour ne pas laisser faire la division
au lecteur que la fiche écrit le rapport en toutes lettres.

Et la ligne des titres publics — 400,0 milliards, **13 %** du besoin — n'est
pas une décision, c'est un **solde** : elle enfle quand une autre porte se
ferme, en cours d'année, sans qu'aucune loi soit rouverte. D'où les six portes
montrées ensemble, et jamais la seule qui nous concerne.

### Trois refus, tenus par les tests

| le refus | ce qu'il empêche |
|---|---|
| le solde déclaré n'est **jamais** recalculé | la soustraction donne −323,5, la loi écrit −631,0 : les périmètres diffèrent. L'écart reste **visible et nommé**, pas résorbé |
| **aucun total « CEMAC »** | six lois, six nomenclatures, trois millésimes révisés : un total serait un chiffre sans date |
| **aucune prévision d'émission** | le programme est une déclaration, l'adjugé un fait ; on montre les deux et on n'invente pas un troisième |

Quatre États sur six sont **incomplets**, et la carte le dit en NOMMANT ce qui
manque plutôt qu'en alignant des tirets — un tableau aurait fait croire à une
couverture qui n'existe pas.

### La règle a dû descendre d'un étage

Les trois disciplines d'une note — constat *et* lecture, lecture au
conditionnel, aucun conseil — vivaient dans un essai qui lisait le semis.
Tenable tant que rien ne pouvait entrer sans passer par un fichier du dépôt.
**Dès que le desk écrit depuis un écran, cette garde ne couvre plus rien de ce
qui sera écrit** : elle garde une vitrine pendant que la porte est ouverte à
côté, et elle resterait verte quoi qu'on écrive.

Elle vit donc dans `verifierNote`, appelé **à trois étages** : le formulaire à
chaque frappe (le bouton reste fermé tant qu'un refus tient), l'action serveur
qui le rejoue — un formulaire se contourne —, et la base en `check`, parce
qu'une règle qui n'existe qu'en TypeScript se contourne par un script. Le semis
n'est plus qu'un de ses justiciables.

*Le relevé des chiffres est **pris sur la fiche, jamais saisi**. « Ce qui a
changé depuis la note précédente » ne vaut que si les deux relevés sortent du
même endroit ; frappés à la main, ils compareraient de l'orthographe. Le semis
le prend au même endroit, sinon la première note écrite depuis l'écran aurait
affiché six lignes « changées » qui n'ont pas bougé.*

### Le carnet, et le défaut qu'il corrige

Une note qui ne s'écrit que **sur demande** s'écrit quand quelqu'un est déjà
inquiet : la série penche vers les crises et se tait dans le calme — et le
récit dans la durée, qui est tout l'objet, s'en trouve faussé. Le remède n'est
pas de produire la note, ce serait le calendrier qu'on a écarté. C'est que
l'outil **signale**, et laisse le desk décider.

**Trois interdits, lus dans le code et non promis en prose** : le carnet
n'écrit aucune note, n'en date aucune, n'en propose à aucun client. Il ne lit
pas non plus l'horloge — le jour lui est passé, sans quoi « il y a sept mois »
ne se testerait pas, et c'est une phrase qu'on cite.

Et **il se tait quand le desk a écrit**. Le Cameroun n'y paraît pas : sa note
est fraîche, son relevé n'a pas bougé, et le constat du baril est déjà
consigné. Un signal qui reste allumé après qu'on y a répondu devient du papier
peint — la maison a déjà vu un lecteur de bulletins signaler soixante lectures
partielles pendant un an sans que personne n'agisse.

### L'écart déclaré / levé : le pourcentage qu'on refuse

La planche demandait « Cameroun : **78 % du programme levé** à mi-parcours ».
**Ce rapport ne se calcule pas sur ces données**, et c'est le résultat du
quatrième lot. Trois raisons, chacune mesurée :

| | mesuré |
|---|---|
| le relevé couvre des **semaines**, pas un exercice | les 8 séances camerounaises de 2026 vont du 3 août au 14 septembre : **43 jours**. Le Gabon est pire — ses 8 séances tombent **le même jour** |
| le **périmètre** de la ligne déclarée est inconnu | brut émis ou net d'amortissement : le plan ne le dit pas, et les deux lectures existent dans la zone |
| les **bons se renouvellent** dans l'année | un bon à 13 semaines reconduit 4 fois lève 4 fois son montant pour un seul financement ; leur échéance est vide sur toutes les séances de bons du dépôt |

Ce qui se mesure, lui, est exact et répond à la question que la note posait
vraiment — « le calendrier d'adjudications dira si les 400 milliards
tiennent » : non pas *combien du programme est fait*, inconnaissable ici, mais
**ce que l'État obtient quand il se présente**.

| | servi / annoncé | séances |
|---|---|---|
| Cameroun | **91 %** | 8 |
| Tchad | 87 % | 4 |
| Congo | **72 %** | 12 |
| Gabon | **49 %** | 8 |

Le Gabon a annoncé 135 milliards sur huit tranches le 22 juillet et en a placé
66 : **cinq tranches entièrement non servies**. C'est le cinquième signal du
carnet, et il remplace celui de la planche.

*Trois pièges désamorcés dans les données : les cinq lignes camerounaises au
même montant portent **cinq codes d'émission distincts** — cinq tranches, pas
cinq lectures ; deux séances de 2020 portent en revanche un code déjà vu, elles
sont **comptées et nommées**, jamais retirées, parce que laquelle des deux est
la bonne ne se devine pas ; et le dénominateur n'accepte que les séances où les
DEUX chiffres sont relevés.*

### Ce que seules l'écran et `tsc` ont dit

| le défaut | ce qui l'a trouvé |
|---|---|
| `"sur"` et `"retirer"` ajoutés au dictionnaire **existaient déjà** : la seconde définition l'emporte en silence, et `"sur"` serait passé de « of » à « on » **sur tout le desk** | `tsc`, pas la suite |
| le tableau des écarts rendait **« Price du baril retenu »** : faute d'entrée, `t()` traduit mot à mot, donc un intitulé de loi en ressort hybride | la page lue **en anglais** |
| le formulaire affichait **« cameroun »** — l'adresse au lieu du nom | l'écran |
| le carnet et l'état vide d'une fiche **se répétaient** coup sur coup | l'écran |
| six épreuves du carnet recevaient `REF_AUCTIONS`, **vide sous vitest** — le semis dense est réservé à la branche d'essai : le signal qui dépend des adjudications n'était éprouvé par rien | la garde désarmée à l'envers |
| la règle de formatage des dates portait sur le **nom** du trou, pas sur sa forme : les dates des motifs du refus sortaient en brut | l'écran, deux fois — d'où une règle de forme, et non un correctif par champ |

### La porte qui n'existait pas

Une question était restée ouverte sur le tableau des routes : **la fiche d'un
État doit-elle aussi paraître sous « Émetteurs », où le Trésor a déjà la
sienne ?** Deux portes vers le même objet, ce que la maison refuse ailleurs.
Georges a tranché le 24 octobre — **pas de seconde porte**.

**En posant le renvoi vers la première, elle s'est révélée inexistante.**
`/emetteurs/[slug]` ne sert que **trois** émetteurs obligataires — `snpc`,
`acep`, `alios`. Les six États n'ont qu'une entrée de REGISTRE, qui est une
identité servant à rattacher une ligne à une entité, pas un écran.
`/emetteurs/etat-cameroun` rend un **404**, et `/desk/dette` est une page
unique, pas une par pays.

**La fiche d'un budget est donc, à ce jour, la seule page par pays de
l'application.** Le renvoi a été retiré avant d'être livré : un lien mort est
exactement ce qu'on venait de refuser pour les pièces d'une note.

*Et le cliquet des classes mortes a attrapé, dans la foulée, les deux règles
CSS que le renvoi retiré laissait derrière lui. Il s'est exercé sur son
auteur.*

### Et aucun souverain n'aura de fiche — la décision, puis la garde

Second verdict de Georges : **pas de fiche d'émetteur pour les Trésors ni pour
les pays.** La décision était **déjà prise dans le produit sans être gardée** —
la page « Sociétés » l'écrit à l'écran depuis longtemps : « les États
(Cameroun, Gabon, Congo, Tchad) et la BDEAC ont leurs échéanciers directement
sur chaque ligne ».

Le pourquoi est maintenant écrit là où le prochain ajoutera une entrée : *une
fiche d'émetteur dit ce qu'une société fait, ce qu'elle gagne et qui la
détient ; ces trois questions n'ont pas d'objet pour un Trésor, et la page
serait un cadre vide portant un nom d'État.*

**Ce qui n'était gardé par rien.** Les huit entrées souveraines — six Trésors,
la BDEAC, la BEAC — portent un `slug` qui **ressemble à une adresse**. Un
`href` posé dessus ferait paraître un lien vers `/emetteurs/etat-cameroun`, et
ce serait la **carte d'émetteur d'une offre du Trésor** qui l'afficherait —
donc sur un **écran client**. L'épreuve refuse le `href` sur toute entrée
souveraine, et vérifie en outre qu'aucune adresse `/emetteurs/` du registre ne
vise un slug absent des émetteurs obligataires.

*Relevé au passage, et sain : les deux seuls endroits qui fabriquent un lien
d'émetteur ne peuvent pas atteindre un souverain — la liste parcourt `ISSUERS`
et non le registre, et la carte d'une offre retombe sur `undefined` faute de
`href`.*

→ *Et un défaut hérité, qu'aucune suite lancée avant un commit ne peut voir :
`docs-exactes` compare la date « vérifié le » d'une page de documentation à la
date du dernier commit qui l'a touchée. **C'est le commit lui-même qui la fait
tomber.** La suite se relance donc APRÈS, désormais.*

### Les pièces ouvertes, et ce qu'elles ont corrigé

Georges a ouvert le réseau de l'atelier sur `dgb.cm`, `beac.int` et
`dgtcfm.cm`. Les six pièces camerounaises ont été demandées et ont répondu.
**Mais le lot ne vaut pas par les adresses : il vaut parce que l'exposé des
motifs de la DGB a été LU.**

| ce que le relevé disait | ce que le document dit |
|---|---|
| recettes fiscales et douanières **4 889,5** | **4 689,5** — impôts 3 446,2 + douanes 1 243,2, et le document donne lui-même ce total. **Deux cents milliards de trop**, un 8 lu pour un 6 dans une reprise de presse |
| appuis budgétaires : « un programme avec le FMI qui tient » | **« Appuis budgétaires (BM) »**, et le tableau des opérations financières porte « Dont FMI : **0,0** » |
| « loi n° 2025/012 du 17 décembre 2025 » | l'exposé est celui du **PROJET**, daté de novembre 2025 ; la colonne lue est « PLFI 2026 ». Ce que la loi promulguée a retenu reste à relever |

La somme des recettes passe donc de 5 887,0 à **5 687,0**, et l'écart avec le
solde déclaré de −323,5 à **−523,5**.

**Un point laissé ouvert se tranche.** Le périmètre du solde −631,0, que le
relevé demandait de nommer « sur les annexes officielles » : l'exposé le
décompose — budget général **−607,5**, comptes d'affectation spéciale
**−23,5**. La soustraction de nos deux agrégats ne pouvait pas y tomber, et on
sait maintenant pourquoi.

**Et une contradiction est trouvée, nommée, non résolue.** Le même document
porte **deux plans de financement**. Le texte énumère six portes sommant à
3 104,2 ; le tableau des opérations financières en donne d'autres sommant à
**2 996,8** — extérieurs 650,0 contre 1 000, bancaire 505,7 contre 589,7,
exceptionnels 144,4 contre 167,8. **Seule la ligne des titres publics, 400,0,
est la même des deux côtés.** Lequel fait foi n'est pas à nous d'en décider :
c'est rangé dans « ce qui n'a pas été relevé ».

*Une adresse ne se consigne que si quelqu'un l'a ouverte, et le jour se range
avec elle — un lien pourrit en silence, et sans date on ne sait pas s'il a été
suivi cette année ou il y a trois ans. La loi promulguée reste sans adresse :
elle n'a pas été trouvée, et l'écran l'écrit.*

### Du projet à la loi promulguée

Le relevé travaillait depuis le début sur le **projet** de loi. La DGB publie
une présentation de lancement du budget 2026, datée de janvier 2026 — donc
**après promulgation** —, qui imprime les deux colonnes du budget général. Le
relevé camerounais passe dessus.

| | le projet | la loi promulguée |
|---|---|---|
| investissement | 2 026,3 | **2 031,2** |
| personnel | 1 625,4 | **1 626,2** |
| biens et services | 1 206,0 | **1 192,7** |
| transferts et subventions | 820,3 | **827,9** |
| intérêts de la dette | 532,5 | 532,5 |
| **total hors principal** | **6 210,5** | **6 210,5** |

**Même total, autre répartition** : c'est exactement ce qu'un vote fait à un
projet, et on ne l'aurait pas vu sans ouvrir la pièce.

**Le principal de la dette est désormais PUBLIÉ : 2 473,4.** Il était *déduit*
— besoin moins déficit — à 2 473,2. Les deux tombent à deux dixièmes, et c'est
justement pourquoi l'écran dit maintenant lequel il montre : *un chiffre publié
passe devant son calcul*, comme le rendement imprimé par un Trésor passe devant
celui qu'on reconstitue. La leçon centrale de la page ne repose donc plus sur
une soustraction.

**Et deux points du relevé tombent.** Le total se décompose — 8 816,4 = budget
général **8 683,9** + comptes d'affectation spéciale **132,5** —, ce qui
explique enfin pourquoi le tableau des opérations financières du projet
plafonnait à 8 683,9. Et la base 2025 se tranche : +1 014,9 sur le général,
+65,6 sur les CAS, soit 1 080,5, donc **7 735,9** et non 7 801,5.

### Le relevé d'une note se recalculait sous elle

Trouvé en chemin, et pire qu'il n'en avait l'air. Le relevé de la note semée
s'écrivait `releveDuBudget(CAMEROUN)` — choisi exprès, pour que ses clefs ne
divergent pas de celles de la fiche. **Mais il se RECALCULAIT à chaque
chargement.** La note suivait donc en silence tout changement du budget — une
note réécrite sous elle-même — et **le carnet ne pouvait jamais voir un poste
bouger** : le signal le plus important de la série était mort-né.

**Mesuré** : avec le relevé figé, déplacer le millésime fait parler le carnet ;
avant, rien. Les valeurs sont maintenant celles du 25 octobre, en dur.

*Et l'invariant des clefs a dû changer avec lui. Il exigeait l'ÉGALITÉ entre le
relevé d'une note et celui de sa fiche — juste tant que le relevé se
recalculait, faux depuis qu'il est figé : une note ignore légitimement un poste
que la fiche a gagné depuis. Ce qui reste interdit, c'est l'inverse : un poste
inventé, que rien ne produit, et dont la note suivante ne pourrait jamais
montrer qu'il a bougé.*

**Résultat à l'écran, et c'est la chaîne entière qui se vérifie :**

> Cameroun 2026 · Le relevé a changé sur 1 poste(s) depuis la note n° 1.

Une source lue, le relevé qui bouge, le carnet qui le dit, et le desk qui
décide. La note, elle, reste à écrire par une personne : elle se demande.

### La note n° 2, et la boucle qui se referme

Georges l'a demandée explicitement, après qu'on lui a dit qu'une note engage
une lecture et que son auteur en répond. **Elle est donc écrite par Claude,
sous son nom** — et la main qui a tenu le stylo est consignée dans le semis, en
commentaire au-dessus de la note, là où un relecteur la cherchera. Le champ
« rédigée par » dit le desk ; cette ligne-là dit le reste.

Elle est passée par la règle commune, sans exception : trois constats, deux
lectures au conditionnel, auto-correction, six pièces.

**Son auto-correction est la part la moins confortable**, et c'est tout son
objet : *« La note n° 1 citait la loi du 17 décembre comme source alors que ses
chiffres venaient de l'exposé des motifs du PROJET. Nous présentions comme voté
ce qui n'était que proposé. »*

**Et le carnet s'est tu.** Il réclamait une note depuis que la loi avait
apporté un principal publié ; la n° 2 l'a consigné, le signal s'est éteint de
lui-même. La boucle complète s'est vérifiée en une journée : une source
ouverte, un relevé qui bouge, un carnet qui le dit, une note qui répond, un
carnet qui se tait. **C'est ce qui sépare un carnet d'un panneau décoratif**, et
l'épreuve qui le mesurait a changé de sens avec lui — elle exigeait un signal,
elle exige maintenant le silence.

| le défaut | ce qui l'a trouvé |
|---|---|
| la pièce de janvier était **en double** sous la note — reprise de la fiche ET ajoutée à la main | **React**, par une clef dupliquée. Aucune épreuve ne regardait. Le dédoublonnage vit désormais à l'écriture : au serveur qui décide, et au formulaire pour que le compte soit le même des deux côtés |
| la note avançait **« 13,4 % »** là où 400 / 2 996,8 donne **13,3** | la division, refaite avant de livrer. Un dixième — et exactement la précision rassurante que cette page refuse ailleurs. Les deux parts qu'elle cite sont maintenant recalculées par une épreuve, qui dit le chiffre attendu quand elle tombe |

*Une note ne se réécrit pas. Si une phrase de la n° 2 ne convient pas, elle se
corrige dans la n° 3, au champ « ce que la note précédente a mal lu » — la même
discipline qui vaut pour les erreurs du desk vaut pour celles de sa machine.*

### Pouvoir écrire une note, et pouvoir l'écrire sans chercher d'abord

Georges demande que le desk crée lui-même les notes des cinq autres États. Le
formulaire était déjà sur les six fiches : c'était donc **possible**, mais pas
**faisable d'un trait**. Deux freins, trouvés en ESSAYANT d'écrire plutôt qu'en
raisonnant sur le code.

**Le premier était écrit à l'écran** — *« cette fiche ne nomme aucune pièce »*.
Le formulaire exige au moins un document, puisqu'une lecture que rien n'étaye
n'apprend rien ; chaque note sur ces cinq États commençait donc par aller
chercher où la pièce se trouve.

La BEAC en publie **deux par État** — programme annuel, calendrier trimestriel
—, aux mêmes adresses à un nom près. Les dix ont été demandées et ont répondu.
Ce sont des **scans** (Xerox PrimeLink, Genius Scan, aucune couche de texte),
donc aucun chiffre n'en est tiré : *elles sont consignées pour que le desk les
OUVRE*. C'est toute la différence entre pouvoir écrire une note et pouvoir
l'écrire sans chercher d'abord.

**Le second était plus sourd.** Le relevé du Gabon ne portait qu'une ligne, son
millésime. Une note l'aurait enregistrée seule, et le tableau des écarts de la
suivante n'aurait rien eu à montrer : **toute la machine du récit calculé était
inerte pour cinq États sur six**, sans que rien ne le dise. Le total du budget
entre donc au relevé — il bouge rarement et lourdement, ce qui est exactement
ce qu'une note suit, et toute l'histoire gabonaise tient dedans : 7 233,3
ramenés à 5 495,2 en cours d'année.

**Une conséquence tranchée plutôt que subie.** Ajouter une colonne au relevé
fait, mécaniquement, que les notes existantes « retardent » et que le carnet
réclame une note alors que rien n'a bougé dans le monde. La n° 2 ayant été
écrite le même jour, le total figurait sous ses yeux : son relevé le porte, et
le carnet reste muet sur le Cameroun. **Fausse alerte évitée, pas masquée** —
et la question reviendra à chaque extension du relevé.

*Vérifié en écrivant vraiment : une note sur le Gabon, depuis l'écran, sans
taper la moindre pièce. Le bouton s'ouvre, les deux documents sont hérités, le
relevé porte deux lignes. Elle vivait en mémoire et n'a pas été livrée —
c'était une mesure, pas une donnée.*

→ *Et le scan n'était pas une particularité camerounaise : les six programmes
annuels de la BEAC sont des images. Ce qui bloque le pourcentage d'exécution
bloque pour toute la zone, et un outil de reconnaissance de caractères le
lèverait d'un coup pour les six.*

→ *Ce qui reste nommé sur la fiche, deux points ayant été réglés : les
**107,4 milliards** entre les emprunts inscrits au budget voté (2 996,8) et le
besoin chiffré par l'exposé (3 104,2), qu'aucune pièce relevée n'explique ; et
les **comptes d'affectation spéciale** (132,5), dont les lignes ne sont pas
relevées.*

→ *Mis de côté sur décision de Georges, et noué pour qu'on le reprenne : **le
pourcentage d'exécution du programme**. Le dénominateur existe et il est
public — la BEAC publie un programme annuel d'émissions par État, celui du
Cameroun 2026 est consigné dans les pièces avec son adresse —, mais c'est un
**scan** (« Creator: HP Scan »), sans couche de texte, et aucun outil de
reconnaissance de caractères n'est installé. Le blocage et sa raison sont
rangés sur la fiche, sous « ce qui n'a pas été relevé » : au retour, il n'y a
rien à retrouver.*

→ *Ce qui reste en service et n'attendait pas ce pourcentage : **le taux de
service** — ce que chaque État obtient de ce qu'il demande —, qui était la
vraie question de la note.*
