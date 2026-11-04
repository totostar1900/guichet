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
