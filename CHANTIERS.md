# Chantiers ouverts

Relevé le 24 octobre 2026, dicté par Georges. Rien n'est commencé sauf
mention contraire. L'ordre est celui de la dictée, pas celui des priorités —
une proposition d'ordre est en bas.

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

**2. Marges, tailles, affichage des pages à harmoniser**, toutes pages
confondues. À discuter page par page.

**La fonte d'un titre : tranchée le 24 octobre 2026.** *La vitrine respire,
l'application travaille* — la vitrine publique garde son serif et son échelle
fluide, l'application titre en sans à `--t-8`. Relevé à l'écran sur
**36 pages** : 8 en Instrument Serif, 28 en Manrope, **36 sur 36 à 30 px**. La
taille tenait donc partout et la fonte nulle part, et ce qui décidait n'était
pas ce qu'EST la page mais **quelle coquille elle avait importée** —
`/portefeuille` et `/aide` en serif, `/marche` et `/trader` en sans, les
quatre étant des sommaires de siège. Voir `ETALON.md`, point C, et l'épreuve :
une **liste blanche**, pas un cliquet.

Ce qui reste au point 2 :

- *Le sommaire du Marché* : au téléphone il redit le rail de pastilles — six
  destinations deux fois — et les deux occupent 720 px avant le titre de la
  page, qui tombe à y 798.
- *`/moi/profil`* titre à **19,5 px**, seule page hors de l'échelle : son `h1`
  n'est pas le nom de la page mais la QUESTION courante du questionnaire. Un
  `h1` qui change à chaque réponse, et un nom de page nulle part.
- *Les sept pages de `Feuillet`* écrivent encore leur en-tête à la main
  (`/portefeuille`, `/instruments`, `/aide`, `/recherche`, `/moi/identite`,
  `/moi/appareil`, `/moi/contact`). Leur titre a maintenant la fonte et la
  taille de l'étalon : les passer à `EnTete` ne coûterait plus qu'un sur-titre
  à décider par page, et ferait tomber le cliquet du point 7 de sept crans.
- *La fonte du guide* (`info/risques`), servi sur les deux domaines : dispensé
  dans l'épreuve, à décider.

**7. L'en-tête de chaque page : la règle est posée, la conversion est en
cours.** `EnTete` pose les quatre créneaux dans l'ordre — retour, sur-titre,
titre, phrase — et un seul genre par créneau. Dix pages y sont passées le
24 octobre 2026, dont les deux qui sortaient du rang : le fil d'Ariane de
« Sécurité » (le seul de l'application) et le lien de retour que « Analyse »
rangeait dans le créneau du sur-titre.

Les trois listes d'instruments ont suivi : `/titres`, `/fonds` et
`/calendrier` portent le sur-titre « Investissez », et les deux racines —
`/trader` et `/` — n'en portent aucun, sur décision. Leur « en bref » se pose
désormais EN FACE du titre (créneau `aCote`) plutôt que dessous, où il
repoussait d'un cran le début de la liste.

→ *Un cliquet compte les en-têtes encore écrits à la main : 49 le 24 octobre
au matin, 46 le soir. Il descend, il ne monte pas.*

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

*(a) **Le titre perd sa fonte à empattements** en passant à l'étalon, qui n'a
jamais tranché la question. Six h1 la portent encore, dont `Accueil` et
`Console` côté client. C'est l'item 2, pas l'item 12 — à décider.*

*(b) **441 px sur 844 ne bougent jamais** : au-dessus du ruban, le titre, la
phrase et « Ce qui vous attend » se repeignent à l'identique aux trois
niveaux. C'est 52 % de l'écran. Le remède n'est pas un réglage mais le
redécoupage de l'item 9 — trois pages au lieu d'un ruban —, et il demande une
maquette.*

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

→ *Reste à voir, et c'est l'item 2 : au téléphone, le sommaire en bandes
redit le rail de pastilles — six destinations deux fois — et les deux
occupent 720 px AVANT le titre de la page, qui tombe à y 798. La distinction
est écrite (« un menu dit où aller, un sommaire dit ce qu'il y a ») et elle
se défend ; sa place, non.*

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

→ *Reste à voir : il n'existe nulle part de liste des ordres passés. La tuile
a été renommée d'après sa destination réelle plutôt que de promettre une page
qui n'existe pas.*

---

## 13. Une page d'accueil

À l'entrée dans l'application : un tableau de bord enrichi. Pas une liste de
liens — **un ensemble de sections dessinées**, chacune portant une
information utile :

- le rendement du portefeuille avec son graphique, et des boutons sous la
  section ;
- un accès direct aux pages majeures (Trade…) ;
- un aperçu des informations importantes, avec un lien vers le détail.

**Maquette demandée.**

### 13 bis — la barre du haut et le découpage du dock

*Dicté le 24 octobre 2026, à ne toucher qu'après discussion.*

- **Retirer la marque « Purpose Capital » du haut.** Elle occupe la barre sur
  toutes les pages pour n'y rien dire : la place ainsi libérée devient
  dynamique, et sert à ce que la page en cours a besoin de montrer.
- **La pastille de notification** devient une **cloche portant un nombre**.
- **Sur l'accueil**, la barre porte l'utilisateur, la recherche et les
  notifications.
- **Ailleurs**, elle porte le nom de la page, un retour, une croix quand il en
  faut une — ou un mélange de ces éléments selon le cas. *À étendre : décider
  ce que chaque page y met, et pourquoi.*
- **Fondre Trade et Instruments** en une seule page Trade, plus large. Le
  créneau ainsi libéré dans le dock accueille un bouton **Accueil**.

→ *Lien avec l'arbitrage A de `ETALON.md` : la barre « cède » aujourd'hui le
nom de la page au `h1`. Si la barre doit porter le nom, un retour et une
croix, cet arbitrage est à rouvrir — c'est la même barre.*

→ *Lien avec le point 1 : la règle d'appartenance du dock est écrite par
section (`nav-section.ts`). Fondre Trade et Instruments y touche, et une
épreuve vérifie déjà que chaque adresse du dock allume un onglet, et un seul.*

---

## Ordre proposé

Les items 2, 7, 8 et 12 sont une seule décision — *quelle est la grammaire
d'une page ?* — et les items 3, 5, 6, 9 et 13 l'appliquent. Décider la
grammaire d'abord évite de refaire cinq pages deux fois.

1. **Écrire l'étalon** à partir de « Mes documents » (8), avec mesures : en
   tête, bande, écart, largeur, échelles. C'est la pièce dont tout le reste
   dépend.
2. **L'en-tête commun** (7), qui en découle, puis (2) et (12).
3. Les défauts isolés, qui ne dépendent de rien : **1**, **4**, **11**, **10**.
4. Les redécoupages, maquette d'abord : **3**, **5**, **6**, **9**.
5. **La page d'accueil** (13) en dernier : elle est la vitrine de toutes les
   décisions ci-dessus.

*(1, 4 et 11 peuvent se faire à tout moment : ils ne touchent pas la
grammaire.)*
