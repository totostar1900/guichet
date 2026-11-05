---
name: guichet-espace-tuiles
description: Les écarts, les chapitres et les tuiles de Guichet. À utiliser pour toute création ou modification de page, de section, de liste de tuiles ou d'espacement (« plus d'air », « moins serré », « des tuiles moins prononcées », « des lignes fines à la place des tuiles », « fais une page », « convertis cette page »). Donne les jetons, les règles, la procédure et les pièges. La référence complète est ETALON.md § 8 ; ce skill en est le mode d'emploi.
---

# Guichet — l'espace d'une page et l'aspect des tuiles

**Skills voisins :** une demande de conception passe d'abord par `guichet-maquette` (discuter, maquetter, attendre le choix) ; se comparer à d'autres applications, par `guichet-benchmark` ; un texte de
risque suit `ETALON.md` § 10. Ce skill dit comment **traduire** le choix en jetons, une fois la planche tranchée.

**Référence :** `ETALON.md` § 8 (espace) et § 8.7 (tuiles). Ce skill ne la remplace pas : il dit quoi faire, dans quel ordre, et ce que les tests refusent. En cas de doute, la doctrine fait foi.

## 1. La règle d'or

> **Jamais un écart, un fond, un bord ou un rayon écrit en dur dans une page ou un composant.** On lit un jeton. Une page qui écrit son propre écart ne lit plus la maison.

Les cliquets (`src/test/espace-page.test.ts`, `etalon.test.ts`) refusent la faute le jour même.

## 2. Les cinq jetons d'espace (`src/app/globals.css`, bloc « l'espace d'une page »)

| Jeton | Valeur | Il règle | Où il s'applique |
|---|---|---|---|
| `--sections-gap` | **28 px** | entre deux sections d'une page ; gouttière entre deux colonnes | classe `pile`, ou `.page` / `.wrap` d'un module qui déclare `gap: var(--sections-gap)` |
| `--chapitres-gap` | **44 px** | entre deux **chapitres** d'une page d'arrivée (Accueil seulement) | classe `chapitres` |
| `--tuiles-gap` | **12 px** | entre deux tuiles d'une liste | grilles et classe `pile-tuiles` |
| `--titre-gap` | **12 px** | entre un titre de section et son contenu | le conteneur de la section |
| `--retour-gap` | **12 px** | entre la flèche de retour et le titre | intérieur à `EnTete` |

Les valeurs se changent **dans `globals.css`, dans une seule ligne** ; toutes les pages se redessinent à l'enregistrement. Changer une valeur demande de changer aussi la clause de test qui la nomme (voulu : une valeur ne glisse pas sans qu'on l'écrive deux fois). Il n'y a **ni panneau de réglage ni réglage au desk**, c'est décidé.

## 3. Les règles

1. **Une page est une pile** : conteneur `className="pile"` (ou `.page`/`.wrap` de module qui lit `--sections-gap`).
2. **Aucune marge verticale entre deux enfants d'une pile.** L'espace vient du `gap`, seul. `.panel` perd sa marge basse dans une pile ; un `<p>` posé dans une pile n'a pas de marge par défaut (`.pile > p`).
3. **L'en-tête est un enfant comme un autre** : `EnTete` range flèche et titre dans un seul bloc.
4. **Dans une section** : titre à `--titre-gap` de son contenu ; tuiles à `--tuiles-gap` les unes des autres.
5. **Jamais une valeur en dur ni une échelle `--s-*` pour ces rôles.**
6. **Une exception se déclare** : la vitrine (accueil visiteur, À propos, Nos placements) garde son pas ; une page à deux colonnes pose le jeton en ligne *et* en colonne.
7. **Les chapitres** (page d'arrivée) : 28 px dans un chapitre, **44 px entre deux chapitres**. Le conteneur porte `chapitres` ; chaque enfant est soit une `pile` soit une pièce qui **se tait** (rend `null`) quand elle n'a rien à dire. **Jamais un conteneur vide entre deux chapitres** : il laisserait deux écarts, 88 px pour rien.

## 4. Les tuiles : un mot, trois aspects

Une **tuile** est un élément de liste qui se désigne et mène quelque part (rubrique, échéance, rayon, leçon, outil, sujet d'aide). Six familles, toutes lues aux **mêmes jetons** :

`--tuile-fond` · `--tuile-bord` · `--tuile-trait` (le trait du bas) · `--tuile-rayon` · `--tuile-pad-x` / `--tuile-pad-y`.

Chaque famille écrit exactement :

```css
.tuile {
  background: var(--tuile-fond);
  border: var(--tuile-bord);
  border-bottom: var(--tuile-trait);
  border-radius: var(--tuile-rayon);
  padding: var(--tuile-pad-y) var(--tuile-pad-x);
}
```

L'aspect se choisit **en un mot** dans `src/lib/config.ts` (`TUILES = "tuiles" | "douces" | "lignes"`), posé sur `<html data-tuiles>`. Les deux blocs `html[data-tuiles="douces"]` et `html[data-tuiles="lignes"]` de `globals.css` ne redisent que ce qui change. Dans l'aspect « lignes », l'écart entre tuiles tombe à 0 : **ne pas poser de bordure ni de marge qui casserait ce rendu**.

Une **nouvelle liste de tuiles** lit ces six jetons et entre dans `FAMILLES_DE_TUILES` de `src/test/espace-page.test.ts` (sélecteur de la première règle). Le sélecteur doit être **seul** dans sa règle : `.pleine, .compacte { … }` n'est pas lu, deux règles séparées le sont.

## 5. Demandes courantes → une ligne

| Le client dit | On fait | Fichier |
|---|---|---|
| « sections plus serrées / plus aérées » | changer `--sections-gap` | `globals.css` |
| « plus d'air entre les chapitres de l'Accueil » | changer `--chapitres-gap` | `globals.css` |
| « tuiles plus proches / écartées » | changer `--tuiles-gap` | `globals.css` |
| « titre plus près de son contenu » | changer `--titre-gap` | `globals.css` |
| « tuiles moins prononcées » | `TUILES = "douces"` | `config.ts` |
| « lignes fines à la place des tuiles » | `TUILES = "lignes"` | `config.ts` |
| « coins plus ou moins arrondis » | changer `--tuile-rayon` | `globals.css` |
| « un quatrième aspect (pleines, encadrées…) » | un bloc `html[data-tuiles="…"]` + le mot dans `AspectDesTuiles` | `globals.css`, `config.ts` |

Toujours reporter la nouvelle valeur dans `ETALON.md` (table § 8.0/8.2) **et** dans la clause de test qui la nomme.

## 6. Créer ou convertir une page

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

*Page existante à marges d'enfants :*
1. remplacer le conteneur par `pile` ;
2. retirer chaque `margin-top` / `margin-bottom` qui séparait deux blocs voisins (y compris la note de pied) ;
3. lire `--titre-gap` entre un titre et son contenu ;
4. **mesurer au navigateur à 390 px** (tous les écarts d'un niveau valent le jeton), puis déclarer la page :
   - `CONVERTIES` (module de feuille + classe du conteneur) dans `src/test/espace-registre.ts`, ou
   - `PAR_LA_PILE` si elle porte la classe globale `pile` sans règle de module, ou
   - `CHAPITRES` pour une page d'arrivée à chapitres.

Une page qui garde un écart écrit à la main figure dans `A_CONVERTIR` **et le dit** ; la clause tombe le jour où elle lit le jeton.

## 7. Mesurer (ne jamais déclarer « à 28 » de mémoire)

- Lancer l'application (`npm run dev`, un seul serveur à la fois), session de démonstration, **390 px**, puis 800 et 1280.
- Mesurer, pour le conteneur de la page : la distance entre le bas d'un enfant visible et le haut du suivant (`getBoundingClientRect`), les enfants non rendus (`display:none`, `position:absolute/fixed`) exclus.
- Attendre : `28` dans un chapitre, `44` entre chapitres, `12` titre → contenu et entre tuiles.
- **Dire ce qu'on n'a pas pu mesurer** : pages derrière la connexion en production, états absents de la démonstration (aucun bulletin, aucune séance prévue, aucune ligne suivie).

## 8. Les pièges déjà rencontrés

- **Une pièce qui rend `null` dans un conteneur sans condition** : le conteneur reste, avec son écart. Un conteneur de chapitre est soit une `pile` qui a toujours un enfant, soit conditionné (`{aDuReleve && (<div className="pile">…)}`).
- **Une règle `@media` cachée** qui réécrit `gap` : le cliquet lit **toutes** les règles du conteneur, y compris celles des médias.
- **Un composant partagé qui porte sa propre marge** (`IndexPulse`, onglets, bouton de rappel) : une variante compacte sans marge, et la pile remet les marges transitoires à zéro.
- **Deux enfants là où il n'en faut qu'un** : un en-tête et sa carte rendus en deux enfants d'une pile s'écartent de 28 + 16 ; les emballer dans un seul bloc.
- **Un bouton `<button>` dans une tuile** : le navigateur remet police et centrage ; garder `font: inherit; text-align: left`.
- **Une classe de feuille que plus aucun fichier ne nomme** : le test `trade-ecran` la refuse ; supprimer la règle avec le composant.
- **Un défilement doux sur `html`** (`scroll-behavior: smooth`) : tout `scrollTo` de restitution doit être `behavior: "instant"`.
- **Un composant créé dans le rendu** (`const Carte = () => …` dans la fonction) : la règle `react-hooks/static-components` le refuse ; le définir hors du rendu.

**Le titre à plat.** Le titre d'un bloc de l'Accueil se pose À PLAT au-dessus de sa carte (`TitreDeBloc` : capitales de 12 px, « Tout voir » à droite, le titre est un lien), et la carte ne porte que des rangées. Un titre écrit dans la carte avec un chevron en rond est l'ancien format : à convertir, et à ne pas reproduire dans un bloc neuf. L'écart titre → carte est `--titre-gap`.

**Un lien dans un lien.** Une tuile entière en `<a>` (« toute la tuile est le lien ») ne peut pas porter de rangées-liens : HTML interdit les ancres imbriquées et React le signale. Quand une tuile doit mener à la liste ET chaque rangée à sa fiche, la tuile est un conteneur ; le titre (avec « Tout voir ») est le lien vers la liste, et chaque rangée est son propre lien. À mesurer : la cible d'une rangée fait au moins 44 px de haut.

## 8 bis. Les sélecteurs de tuiles-icônes (4-5 novembre 2026)

`GrilleDInstruments` : jusqu'à **six tuiles sur une rangée** (`--colonnes`), trois colonnes au-delà ; avec six tuiles, la grille déborde de 6 px de chaque côté et le nom passe à
0,6 rem pour s'écrire en entier (mesuré : 54 px dans 54). Un nom plus long se coupe plutôt que de pousser sa voisine. Aucun nombre de lignes sur une tuile.

## 9. Avant de conclure

`npm run typecheck && npm run lint && npm test`. Une clause nouvelle se **vérifie par mutation** (la casser dans le code, constater qu'elle tombe). Mettre à jour `ETALON.md` et `CLAUDE.md` si un jeton ou une classe naît.

## Leçon du 7 novembre 2026 : une grille sans colonne nommée déborde

Une carte (`display: grid`) ou une identité (`.id`) sans `grid-template-columns` crée une colonne « auto », qui grandit jusqu'à la plus longue ligne insécable (émetteur + type, pastille « Sélection du desk » en `nowrap`). Résultat mesuré : en-tête de 356 px dans une boîte de 328, pastille d'état et « ⋯ » rognés. **Toute grille de carte ou de bloc d'identité déclare `grid-template-columns: minmax(0, 1fr)`**, et une pastille qui porte une phrase passe à la ligne. À mesurer à 390 px sur toutes les cartes (largeur de chaque enfant contre celle de l'article) avant de conclure ; une carte « À la une » dans un défilement n'est pas une excuse.

## Leçon du 7 novembre 2026 : une bande collante a son propre fond

Une barre d'onglets qui colle doit porter SON fond opaque et aller bord à bord (marge négative égale à la gouttière de la carte) : un segment arrondi à fond propre laissait lire le texte de la carte à travers ses coins. Un témoin d'un pixel juste au-dessus dit quand la bande colle, et c'est alors seulement qu'elle montre la ligne mince (nom court + chiffre en avant). Quand on mesure « collée », vérifier que la page défile assez : une fiche courte ne dépasse pas la position naturelle de la bande.

## Leçon du 7 novembre 2026 (nuit) : une feuille de style cassée passe les tests

Un retrait de règles CSS par expression régulière a laissé un bloc sans accolade ; `typecheck`, `lint` et les 3 700 épreuves sont restés verts, seul `next build` l'a refusé. **Après toute édition de `.module.css` en série, lancer le build** (ou la reconstruction de contrôle) avant de conclure, et relire la fin du fichier.

## Leçon du 8 novembre 2026 : la fiche d'une ligne est une page comme les autres (pile, sans cadre)

Le skill n'avait jamais été appliqué à la fiche : sa lecture vivait dans une carte (fond, bord, rayon, gouttière de 24 px), avec un filet sous chaque section et une seconde carte pour les lignes similaires. **Les marges standards d'une page de lecture** (ETALON § 8.8) :

1. Le conteneur de la lecture est une **pile** (`gap: var(--sections-gap)`), **sans fond, sans bord, sans rayon, sans `padding`** ; il est déclaré dans `CONVERTIES` de `espace-registre.ts`.
2. **Entre deux blocs : 28 px, par le `gap`.** Pas de filet de section, pas de marge basse (ListNav, bande d'onglets, note) : ce sont eux qui faisaient les espaces à 4, 8 ou 18 px.
3. Un titre de section → son contenu : `--titre-gap`. Une liste de rangées **à plat** (`plat` sur `BlocDeLignes`) : un filet entre deux rangées, rien autour.
4. Un lien de sortie d'une liste vit **dans le bloc de la liste** (`--titre-gap`), pas comme enfant de la pile (il se tiendrait à 28 px d'elle).
5. **Aucun enfant « témoin » dans une pile** : un élément d'un pixel (observateur de défilement) ajoute un écart de 28 px. Observer l'élément lui-même (`IntersectionObserver` avec `rootMargin` et `threshold: [1]`).
6. **Mesurer** : à 390 px, la distance entre les enfants visibles de la pile = 28 partout ; le conteneur a `background: transparent`, bords et `padding` à 0. Une carte d'un composant partagé (`BlocDeLignes`) se met à plat par une variante, pas par un style de page.

## Les bulles d'information : au milieu de l'écran, fermées d'un geste du doigt (8 novembre 2026)

**Règle.** Chaque bulle d'information (le petit « i » d'un terme, d'un chiffre, d'un titre : composant `Info`, et `Term`) s'ouvre **au milieu de l'écran**, sur un voile, et se ferme **d'un geste du doigt** (tirer vers le bas), par la croix ou en touchant à côté. On réutilise la fenêtre centrée de la maison : `Sheet` avec `centre`. Une bulle neuve se fait avec elle, jamais avec une infobulle à flèche posée près de son déclencheur (elle se coupait sous un en-tête collant, sortait de l'écran sur un téléphone et ne se fermait que d'un toucher précis).

- Le texte est un paragraphe à `--ink-2`, le lien « En savoir plus » à `--s-5` du texte ; le titre de la fenêtre est le nom du terme.
- Un clic dans la fenêtre ne remonte pas au parent du « i » (une rangée-lien, un en-tête de colonne) : l'enveloppe arrête la propagation.
- Mesurer : à 390 px, la fenêtre est centrée (gauche = droite), le tiré de plus de 80 px la ferme, la page dessous garde son défilement.

**Exceptions** (écrites ici pour ne pas être « corrigées » par erreur) :
1. **Le « i » de la barre du haut** : c'est une feuille à onglets (`EnBrefInstruments`), pleine page, pas une bulle d'un terme.
2. **La confirmation d'un suivi** (`Bulle`, `dire(...)`) **est une bulle comme les autres depuis le 8 novembre 2026** : fenêtre centrée, titre = ce qui précède « : », détail = ce qui suit, fermée d'un geste, par la croix ou en touchant à côté, et d'elle-même au bout de 3 s. Elle vit hors de la page qui la dit (magasin de module + `HoteDeLaBulle` dans la mise en page).
3. **L'astuce de glissement du pager** (« Glissez vers la gauche : la ligne suivante », une fois par type de page) **est une bulle centrée depuis le 8 novembre 2026**, comme la confirmation : titre avant « : », détail après, geste, croix, retrait d'elle-même (4,2 s).
4. **À discuter avec le client, tant qu'on n'a pas tranché** (ne rien changer sans lui) : l'étape d'une visite guidée (`CoachMarks`) ; l'infobulle de survol d'un graphe (date et valeur sous le doigt) ; les `title=""` natifs (pastille de variation, état) ; le bandeau d'état d'un contact rapide ou d'un export.

## Leçon du 8 novembre 2026 (soir) : une page de lecture se sépare par l'air et par UN titre, pas par des cadres

La fiche d'une ligne avait un seul écart (28 px) et trois styles de titre (phrase 14 px, capitales 12 px, capitales espacées) : à 390 px rien ne disait où une section commence. Ce qui a marché, validé sur planche (1A · 2A · 3C) :

- **Deux niveaux d'écart, pas de filet** : 28 px sous la tête et la bande d'onglets (`.main`), **44 px entre les sections** par un groupe `chapitres` posé dans la lecture ; les sections et leurs pièces (lignes similaires, pied) en sont les enfants. Le desk, qui partage `FicheReading`, garde sa lecture : le groupe dépend de `mode`.
- **Un seul titre** : `--t-6`, gras, encre pleine (+20 % demandé par le client). Un composant partagé avec l'Accueil (`TitreDeBloc`) prend une propriété (`fort`) plutôt qu'une feuille copiée.
- **Un groupe imbriqué** (le calcul en trois blocs) est lui-même `chapitres` : même écart dedans et dehors. Mesurer avec `.chapitres > *` compte aussi les enfants du groupe imbriqué : un « écart » négatif y est un artefact de mesure, pas un défaut.
- **Une taille hors échelle fait tomber `typographie.test`** : prendre un jeton `--t-*` (le plafond ne monte pas).
- **Un onglet vide parle**, et une pièce répétée sous chaque onglet (lignes similaires) se range dans l'onglet qui lui correspond.

## Leçon du 9 novembre 2026 : l'encadré en relief, le titre à plat, la mosaïque (fiche d'une action)

Le client a levé le § 8.8 pour les actions et demandé des encadrés en relief (ETALON § 8.10). Ce qui s'applique, et qui se réutilise pour la page suivante :

- **Le titre reste à plat, au-dessus de la carte** : une section = `<h3>` + `<Carte>`, jamais le titre dans la carte. Le gabarit existe (`Carte`, `Mosaique`/`Majeur`, `BarresDeComptes`, `CourbeDuCours`) : une nouvelle fiche l'assemble, elle ne le recopie pas.
- **Le relief se mesure dans les deux thèmes** : rapport page / carte 1,12 en sombre mais 1,07 en clair (sous la règle de 1,1) : c'est l'ombre qui porte le relief en clair. Un fond « plus sombre que la page » est exclu (skill benchmark).
- **Une mosaïque a UN majeur** (`--t-8`) et des tuiles dessous, deux par deux ; une tuile sans donnée n'est pas écrite, et le nombre de colonnes suit le nombre de tuiles.
- **Un graphe ne vient que de ce qui existe** (la cote, la fiche de la société) ; il n'écrit pas une seconde variation, qui contredirait celle de la tête.
- **La portée se déclare** : le desk et les autres lignes gardent leur lecture (`mode`, `o.instrument`) ; chaque nouvelle règle de lecture se garde par une clause dans `lecture-de-la-page.test.ts`, vérifiée par mutation.
- **Taille hors échelle** : prendre un jeton `--t-*` (le plafond de `typographie.test` ne monte pas).
- **Un cours démo n'est pas un cours cote** : les deux jeux de démonstration (`seed.ts` et `cote-seed.ts`) donnent 90 000 et 85 000 pour BHC ; en production le cours vient du bulletin (`boc.ts`), donc la même valeur. Ce n'est pas un défaut de lecture.

## Leçon du 9 novembre 2026 (suite) : une liste déroulante est celle de la maison, un axe secondaire se dit, un chiffre grisé se justifie

- **Pas de `<select>` natif dans les écrans du client** (`listes-natives.test.ts`) : la liste est `components/ui/Select`. Un choix que les données ne servent pas y est `disabled` avec sa raison dans l'indice (« historique insuffisant »), pas retiré.
- **Une variation de période n'a qu'une définition** (`periodes.ts`, partagée avec « Ce qui performe ») ; un fichier lu par le navigateur n'importe jamais le dépôt (`performe.ts` réimporte `periodes.ts`, pas l'inverse).
- **Deux grandeurs d'échelles différentes** (chiffre d'affaires, résultat net) : barres sur l'axe principal, courbe sur un axe secondaire dans sa propre couleur et sa propre unité ; jamais deux barres côte à côte sur deux échelles.
- **Un rapport qui tromperait n'est pas rendu** (marge nette au-dessus de 100 % : BHC publie un résultat net supérieur à son chiffre d'affaires) ; on écrit pourquoi, on ne trace pas.
- **La mention courte suit la dernière section de l'onglet** : elle se range par une liste des sections présentes, pas par une position écrite en dur.
- **Une donnée de source officielle se vérifie à la source** : l'image de la fiche BVMAC se lit (outil de lecture d'image) quand le texte n'est pas extractible.

## Leçon du 9 novembre 2026 (valorisation) : un sélecteur partagé, des rapports qui ne dépendent pas du nombre de titres

- **Un sélecteur pour plusieurs graphes** : le composant client qui porte l'état rend toutes les sections (un fragment de `section` : elles restent des enfants de la pile des chapitres, donc à 44 px les unes des autres). Une seule `Select` (une clause compte `<Select` dans le fichier) ; la période se lit par `lirePeriode`, la même que le cours.
- **Écrire le rapport comme capitalisation ÷ grandeur de la société** (et non cours ÷ par-action) rend la série insensible à une division du nominal : le nombre de titres est celui de la séance, il disparaît du rapport. Garder le dividende PAR ACTION tel que publié pour le rendement.
- **Une hypothèse de calcul s'écrit dans UN endroit** (`entreeEnVigueur`) avec son test et sa phrase dans l'étalon : « l'exercice N compte à partir du 1ᵉʳ juillet N+1 » ne se redit pas ailleurs.
- **Un `label` de `Select` est visible** : un label long tronque la valeur sur un téléphone (« Durée », pas « Durée des quatre graphiques »).

## Leçon du 9 novembre 2026 (lecture des graphes) : l'année sur l'axe, la bulle au-dessus, le retour en haut d'onglet

- **L'axe des abscisses d'un graphe de dates porte TOUJOURS l'année.** « 1 oct. » ne dit pas de quelle année on parle ; un graphe qui n'écrit l'année que « sur les longues périodes » est une faute (`NavChart` le faisait). Sur un axe de mois, l'année va au premier repère et à chaque janvier (`motDeMois`). **À vérifier pour tout nouveau graphe** : `fmtDate(d)` sans `false`. Gardé par `lecture-de-la-page.test.ts` (graphes de la fiche, `NavChart`, `CompareCharts`, `IndiceEtNegoce`, `CardBack`).
- **Une bulle de lecture ne se pose jamais à côté du point** : au-dessus du dessin, en absolu (le doigt ne la cache pas, le tracé ne bouge pas). `useLecture` + `BulleNoire` ; `touch-action: pan-y` sur le `<svg>` pour que la page défile verticalement pendant que le doigt glisse en travers.
- **Un « i » par section, pas seulement sur le chiffre clé** : `Bloc` porte `info` ; le texte dit ce que la section montre, sans provenance (`provenance.test.ts` refuse « Bulletin Officiel », « BVMAC »…).
- **Changer d'onglet page défilée = revenir en HAUT de l'onglet.** « Garder la place » (la barre sous le doigt) ne vaut que quand la page n'a pas défilé jusqu'à la bande ; une fois la bande collée, le client veut le début de ce qu'il choisit, surtout pour un onglet court (Documents). Le cas se mesure à 390 px, page défilée, avant / après le clic.
- **Un graphe de séances en trois panneaux** (prix, titres, valeur) : trois échelles, trois axes écrits ; la bulle dit les trois.
- **Un cliquet de doctrine ancien se lit avant de le contourner** (`bandeau-suivi` : « la bulle est partie le 5 octobre ») : la demande du client rouvre la question, la réponse garde la raison de l'ancienne règle (le doigt ne cache rien, la hauteur ne bouge pas) et l'écrit dans le cliquet.

## Leçon du 9 novembre 2026 (exercice en vigueur, rotation) : une règle de repli se dit dans l'ordre, un champ saisi ne doit pas effacer la donnée

- **Un repli en trois rangs s'écrit en une fonction** (`dateDEntree` : la date existante, sinon celle du desk, sinon le 1er avril de N+1), chaque rang testé, une valeur mal formée laissant la main au rang suivant.
- **Un formulaire qui réécrit un objet perd ce qu'il ne montre pas** : le formulaire du référentiel du desk reconstruit les comptes champ par champ ; la date existante doit être relue dans l'état et réécrite (clause dans `lecture-de-la-page.test.ts`). Ajouter un champ à la donnée = ajouter sa conservation au formulaire.
- **Une grandeur « point » ET « évolution »** : le point (tuile) suit la durée ; l'évolution se dessine à la plus petite maille lisible (le mois pour une rotation, car la plupart des séances n'ont aucun échange).
- **Une réserve de lecture se dit à chaque endroit où le chiffre fautif se voit** : sous le graphe qui montre l'incohérence ET sous les rapports qui en sortent.

## Leçon du 9 novembre 2026 (soir) : des libellés d'axe lisibles, une période qui ne déplace rien, une limite de lecture qui ne ment pas

- **Les libellés de l'axe des abscisses ne se superposent JAMAIS, à aucune largeur ni période.** Ajouter l'année aux dates (règle précédente) allonge les libellés : à chaque changement d'étiquette, MESURER (Playwright : les boîtes des `<text>` d'un même `<svg>` ne se recouvrent pas, à 390 et à 340 px, sur chaque période). `reperesSansChevauchement` éclaircit un axe de mois ; un axe de dates à repères fixes réduit leur nombre (trois sur téléphone).
- **Un changement de période ne déplace RIEN** : tout ce que la liste fait varier (le texte du bouton, la pastille) vit dans une cellule de largeur fixe qui rogne au lieu de pousser ; sinon la ligne s'élargit, la carte aussi, le dessin change de rapport et la page glisse (« Début d'année » faisait +11 px). Mesurer le rectangle du `<svg>` et de la section avant / après sur la période la plus longue en libellé.
- **Une limite de lecture grise à tort ce qu'elle tronque** : lire « 400 séances » alors que la base en tient 829 rendait « 2 ans » et « 3 ans » indisponibles. Avant de dire « historique insuffisant », vérifier la profondeur réelle en base (SQL), pas celle de la démonstration.
- **Un « ? » ou un « i » en double se fusionne** : une section a un seul « i » qui dit tout (ce qu'elle montre et le calcul du chiffre), le chiffre n'a pas le sien.

## Leçon du 10 novembre 2026 : une fiche qui ressemble à une autre se calque, et chaque mesure qu'on ajoute garde la même hauteur

- **« S'inspirer fortement » d'une page se traduit par la MÊME suite de blocs et les MÊMES composants** : la fiche d'un fonds reprend `Bloc`, `Majeur`, `Mosaique`, la liste de périodes, la bulle noire et la bande de cartes de la fiche d'une action ; ce qui est propre au fonds (la VL, ses trois mesures, « Investir », la société de gestion) prend la place de ce qui est propre au titre. On ne réinvente pas un second langage.
- **Un commutateur de mesures change le contenu, jamais la hauteur** : la légende d'une mesure écrit parfois trois lignes, une autre une seule ; on réserve la hauteur du cas le plus long (`min-height: 3lh`), sinon la carte et tout ce qui la suit sautent au toucher. À mesurer sur chaque mesure × chaque période, à 390 et 340 px.
- **L'unité d'un axe se pose au-dessus de la graduation du haut, pas sur elle** : un tracé qui démarre à 14 px fait toucher « FCFA » (y = 9) et la première graduation ; 18 px, comme la courbe du cours. L'audit des chevauchements doit viser le bon `svg` (`svg[role=img]`), pas le premier venu (un chevron).
- **Un nom long en capitales ne se met pas en chiffre majeur** : le nom d'une société de gestion se lit en identité (monogramme + nom), pas à la taille d'un chiffre.
- **Inverser une décision écrite se dit et se teste** : le volet émetteur d'un fonds, retiré le 1er novembre, revient sous un autre nom ; le test d'origine est réécrit, la documentation relue et datée, et le compte rendu l'annonce.

## Leçon du 10 novembre 2026 (soir) : un en-tête qui suit un commutateur, un vide qui reste en bas, une donnée qu'on n'invente pas

- **Un en-tête qui suit un commutateur se mesure dans CHAQUE état** : le chiffre du haut dit la mesure choisie (valeur, rendement, montant placé) ; son étiquette peut passer sur deux lignes à 340 px (86 px mesurés contre 72) : on réserve le plus haut (`min-height`), et la légende deux lignes. Vérifier mesure × période × deux largeurs : une seule hauteur.
- **Un `min-height` rendu à une grille s'étire sur TOUTES ses lignes** : sans `align-content: start`, le vide d'un onglet court s'ouvre entre l'en-tête et la barre d'onglets. Pour tout conteneur auquel on rend de la hauteur, dire où va le surplus.
- **Trois tuiles à libellé long ne se mettent pas sur trois colonnes** : « hebdomadai/re » coupé ; deux colonnes, la dernière pleine largeur (`Tuiles deux`).
- **Une donnée qu'on ne peut pas lire à la source ne s'écrit pas** : la liste des sociétés de gestion de la COSUMAF était inaccessible (403, article payant) ; on a livré le champ vide et le formulaire du desk, avec la source obligatoire, plutôt qu'un siège ou un agrément tirés d'un article de presse ; puis le PDF officiel (« L'Essentiel », COSUMAF, tableau des sociétés de gestion d'OPC) a été lu, et seules les correspondances SÛRES ont été livrées (graphies du bulletin conservées, « BRIGTH » de la COSUMAF corrigé en Bright ; ESS rapproché d'« Emrald Securities Services » seulement après confirmation du client). Un PDF qu'un fetch ne lit pas se télécharge (curl) et s'extrait (pdftotext -layout). Et la source ne s'affiche pas chez le client (provenance).
- **Une clef interne n'est pas un identifiant à montrer** : l'« ISIN » d'un fonds est sa clef ; on ne l'écrit pas.
- **Deux graphies d'un même nom font deux lignes** tant qu'on ne groupe pas par clef normalisée (« Corridor » / « CORRIDOR »).

## Leçon du 10 novembre 2026 (nuit) : un lien muet se règle par un squelette, une entrée se règle par un siège

- **Une lenteur se mesure avant de se soigner, et le premier remède est le retour d'information** : aucune des cent neuf pages dynamiques n'avait d'écran d'attente, donc un lien ne bougeait rien avant la réponse du serveur. Un `loading.tsx` racine (squelette aux jetons, `pile`, `--surface`, `--rond`, pulsation coupée par `prefers-reduced-motion`) donne un retour en ~100 ms même si le serveur met 2,5 s. À vérifier en retardant les réponses RSC (`page.route(/_rsc=/)`), pas à l'œil.
- **Deux sièges ne s'allument jamais ensemble** : quand un siège nouveau (« Investir ») reprend des pages qu'un autre (« Trade ») possédait, on réécrit la règle d'appartenance de l'ancien (`isTraderSection`) et on déclare celle du nouveau dans le cliquet des sièges (`nav-section.test`), sinon « /titres » en allume deux. La bande du haut (`lieuDe`) suit le dock, et la documentation qui annonce « N sièges » est relue (un test la compare au dock).
- **Un siège retiré par une fusion peut revenir si le client le demande** : on ne rouvre pas la page qu'il avait absorbée, on lui donne sa propre entrée. La page d'un siège qu'on ne veut pas toucher n'est pas modifiée.
- **Un `loading.tsx` change le statut des pages introuvables** (200 + `noindex`) : le dire, à chaque fois.

## Leçon du 11 novembre 2026 : un nouvel onglet révèle les deux définitions d'un même chiffre, et une simulation se fait sur le chemin critique

- **Classer des lignes entre elles oblige à n'avoir qu'une définition du chiffre** : en rangeant le fonds parmi ses pairs, « +4,57 % » (la liste) a croisé « +4,69 % » (la carte) pour le même fonds, la même période. La carte a été alignée sur la fonction de la liste (`fenetresDe`, via `fundCurveFrom`) plutôt que d'ajouter une troisième règle ; la courbe part de la VL que la mesure retient, sinon « 1 M placés » et la pastille se contredisent.
- **Un mode qui remplace un dessin garde la boîte du dessin** : les barres ont le rapport 320 × 190 de la courbe qu'elles remplacent ; mais ce sont les TEXTES (en-tête, légende) qui font sauter la carte à 340 et 320 px : à mesurer sur les quatre onglets et trois largeurs, et à raccourcir (« Rang sur 5 fonds · 1 an », une légende de deux lignes).
- **Une comparaison entre natures se refuse avec un chiffre** : « un BTA 13 semaines n'a pas de rendement sur 4 ans » ; on compare des fonds entre eux, et l'on renvoie vers la page « Comparer » pour le reste, qui écrit la nature de chaque chiffre.
- **Simuler un gain avant de le coder** : une latence artificielle par lecture (`SIMUL_LAT_MS`) et une bascule qui retire un étage du chemin critique donnent le gain maximal sans rien livrer. La TRACE chronologique des lectures (début, fin) montre les étapes en série, qu'un simple compte de lectures cache : trois étapes en série, dont deux (session puis langue) évitables. Le prototype se restaure depuis des copies (`cp`), jamais par `git checkout`.
- **Avant de corriger un étage, tracer ce qu'un CLIC relit, pas seulement un premier chargement** : le socle du menu (13 lectures) ne coûte rien à un clic, la mise en page n'étant pas refaite ; la langue, lue après la session, coûtait une étape à CHAQUE page. Le correctif utile n'était pas celui qu'on avait recommandé en premier. Une lecture non classée dans la mémoire de la requête (`READS`) la vide à chaque appel : en trouver par la trace chronologique, pas par le compte.
- **Se mesurer sur le fil, compressé, pas sur le HTML brut** : 264 Ko de HTML faisaient 58 Ko de transfert. Avant d'alléger une page, décomposer ce que le navigateur reçoit (balisage, données de la page, données de la mise en page) : le plus gros morceau n'était pas la liste mais le registre des éclairages renvoyé sur CHAQUE page. Un morceau qu'une page ne lit que pour un lien (clé + titre) ne doit pas voyager en entier.
- **Garder une page quelques secondes côté navigateur change le second passage, pas le premier** : `experimental.staleTimes.dynamic: 30` a ramené les retours de ~660 à ~32 ms (même banc, trois tours de clics, 3G rapide émulée, latence de base simulée) sans toucher au premier toucher. À chaque action qui écrit : `revalidatePath` (ou un cookie) vide la mémoire, vérifié par « suivre une ligne puis revenir sur les favoris ». Une action sans invalidation montrerait du vieux.
- **Alléger un tracé en gardant ses extrêmes et son vrai compte** : un sous-échantillonnage régulier perd le creux et le sommet ; on les force dans l'échantillon, et l'on porte le nombre réel de points à part (`n`) pour que le libellé (« 60 VL ») ne mente pas. Annoncer le gain après mesure sur le fil compressé, pas avant : 4,6 Ko mesurés pour 6 à 8 Ko attendus.
- **Chercher la lenteur dans la chaîne de la page, pas dans la mise en page** : la mise en page et la page se lisent en parallèle ; retirer 13 lectures du menu n'a rien gagné (321 contre 320 ms), alors que remettre en parallèle cinq `await` en série d'un corps de page a fait passer `/fonds` de 642 à 350 ms. Avant de refactorer un composant, mesurer ce qu'on retire (une bascule d'environnement suffit) ; compter les `await` consécutifs d'un corps de page, et ne chaîner que ce qui dépend vraiment de l'étage d'avant.
