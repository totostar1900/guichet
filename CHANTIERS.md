# Chantiers

Relevé le 24 octobre 2026, dicté par Georges, et clos le même jour. L'ordre
est celui de la dictée, pas celui des priorités — ce qui reste ouvert est
nommé en bas, et tient en cinq lignes.

Chaque point barré porte ce qui a été MESURÉ avant d'y toucher, et ce qui a
été trouvé en chemin. Les relevés comptent autant que les décisions : c'est
eux qui disent pourquoi une maquette a été suivie, ou écartée.

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

**7. L'en-tête de chaque page : la règle est posée, la conversion est en
cours.** `EnTete` pose les quatre créneaux dans l'ordre — retour, sur-titre,
titre, phrase — et un seul genre par créneau. Dix pages y sont passées le
24 octobre 2026, dont les deux qui sortaient du rang : le fil d'Ariane de
« Sécurité » et le lien de retour que « Analyse » rangeait dans le créneau du
sur-titre. **Dix autres y sont passées le soir du même jour**, et elles ont
démenti le mot écrit ici : ce fil d'Ariane était donné pour « le seul de
l'application », il y en avait **trois** (voir le relevé du point 7, en bas).

Les trois listes d'instruments ont suivi : `/titres`, `/fonds` et
`/calendrier` portent le sur-titre « Investissez », et les deux racines —
`/trader` et `/` — n'en portent aucun, sur décision. Leur « en bref » se pose
désormais EN FACE du titre (créneau `aCote`) plutôt que dessous, où il
repoussait d'un cran le début de la liste.

→ *Un cliquet compte les en-têtes encore écrits à la main : 49 le 24 octobre
au matin, 46 à midi, **38 le soir**, après les sept pages de `Feuillet`. Il
descend, il ne monte pas.*

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
  `Etapes.tsx` était mort aussi.

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

**Douze points sur treize sont clos.** L'ordre proposé a été suivi : l'étalon
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

**Mais il ne pouvait pas toucher le fond, et c'est corrigé.** 49 au matin, 38,
puis 27 — et parmi ces 27, `EnTete.tsx` **lui-même** : le composant qui écrit
le `h1` était compté comme une page qui ne l'avait pas converti. Avec lui, les
quatre pages de la vitrine, qui ne convertiront jamais par la décision de
l'ETALON § C ; le « Bonjour » de la console, qui n'est pas un nom de page ; et
trois écrans de seuil — connexion, second facteur, désabonnement — sans section
au-dessus ni parent derrière, dont le titre nomme l'étape en cours.

Un cliquet qui mélange « pas encore fait » et « ne sera jamais fait » n'atteint
jamais zéro, et un compte qui ne peut pas tomber à zéro ne dit plus s'il reste
du travail. D'où deux mesures : **neuf dispenses nommées, chacune avec sa
raison** — la forme que l'ETALON donne déjà à la règle de la fonte, *« un compte
dirait combien de fichiers posent la fonte, pas lesquels ont le droit »* — et un
cliquet qui ne porte plus que ce qui attend. **Il est à 18, et celui-là peut
finir.** Une dispense dont la page est convertie, renommée ou supprimée ne vise
plus rien, et l'épreuve le dit.

**Dix pages converties le même soir** : les mentions légales, les notes de
marché, la réclamation, le parcours du guide, l'annexe tarifaire, les
prélèvements, l'épargne programmée, votre activité, et les deux pièces qui
titrent une référence — un ordre et un document.

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

Trois lignes restaient ici au moment d'écrire cette section ; **deux ont été
faites dans la soirée même**, et aucune des trois n'était un défaut :

- ~~**Les aperçus des tuiles de Trade.**~~ **FAIT.** La maquette donnait deux
  lignes sous chaque tuile. C'était en réalité un invariant rompu, et le
  fichier qui l'annonce le déclarait en tête : *« les deux écrans rendent le
  même texte dans le même ordre ; ce qui change est la façon de s'y
  déplacer »*. L'écran large rendait la phrase de chaque service dans sa
  bande, les tuiles du téléphone n'en portaient que le nom. Elles portent la
  phrase — et non la précondition, qui est la même pour presque tous les
  services et effaçait neuf sous-titres pour dire neuf fois la même chose.
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

→ *Deux faits à retenir pour qui reprendra : le dépôt mémoire n'a **aucun
bulletin** — la série du BOC est ingérée, jamais semée —, donc l'indice et le
classement ne paraissent pas sans `.env.local`, et c'est la règle de niveau 3
qui joue, pas une panne. Et la planche `Regles.dc.html` est la seule trace
des règles qui ne sont pas encore du code : la tenir à jour est ce qui
l'empêche de mentir.*
