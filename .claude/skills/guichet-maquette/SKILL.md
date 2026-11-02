---
name: guichet-maquette
description: Discuter et maquetter AVANT de coder, pour toute demande de conception ou de refonte d'un écran de Guichet (plusieurs points, intention floue, « discute d'abord », « propose des maquettes », « étends la réflexion »). Produit une discussion point par point puis une planche de choix A/B/C à sélectionner. N'écrit aucun code avant le choix. Ne pas utiliser pour une retouche explicite et sans ambiguïté (« retire cette phrase »), qui se fait directement.
---

# Guichet — discuter, maquetter, puis coder

La règle de la maison : **le client ne découvre pas une décision de conception dans le code.** Une demande de conception passe par trois temps, dans cet ordre, et le code n'arrive qu'au troisième.

## 0. Quand ce skill s'applique

| La demande est… | On fait… |
|---|---|
| plusieurs points à la fois, ou « discute d'abord », « maquette », « propose plusieurs options » | ce skill, en entier |
| une intention (« plus dynamique », « plus de vie », « moins plat ») sans forme précise | ce skill, en entier |
| une retouche exacte (« retire la phrase "…" », « renomme X en Y ») | directement, sans planche ; mais voir § 5 pour les conséquences |
| un défaut à corriger (un bug, un saut, un écart) | diagnostiquer d'abord (§ 1), planche seulement s'il y a un vrai choix de forme |

Si la demande mélange les deux, on traite les retouches exactes tout de suite et on réserve la planche aux points qui ont un choix de forme.

## 1. Mesurer et lire avant de décider

On ne discute jamais de mémoire. Avant d'écrire un mot de recommandation :

1. **Lire le code de l'écran** (la page, ses composants, sa feuille de style) et la section de la doctrine qui le touche (`ETALON.md`, `CLAUDE.md`).
2. **Chercher les décisions antérieures** qui contredisent la demande : `grep` les commentaires « décidé le », les tests de `src/test/` qui nomment l'écran. Une règle déjà écrite se discute avec le client, elle ne se contourne pas en silence. Exemples déjà rencontrés : « aucun compte dans un intitulé » (29 octobre), « une seule réponse sur la provenance des chiffres dans l'aide » (`provenance.test.ts`).
3. **Voir l'écran réel** : lancer l'application, ouvrir l'écran à 390 px avec la session de démonstration, capturer, et **mesurer** (positions, écarts, hauteurs). Un défaut décrit en mots (« la boîte blanche », « la page bouge ») se confirme par une mesure avant d'être cause d'une option.
4. **Lister ce que les données de démonstration ne montrent pas** (pas de bulletin, pas de séance prévue, pas de ligne suivie…) : ces états se simulent ou se déclarent « non vus », jamais « vérifiés ».
5. **Regarder les images de référence** fournies : `docs/design-refs/` ou jointes à la demande. Une image dit « l'allure voulue » ; elle ne dit pas « la portée ».
6. **Si la demande vise le niveau de finition de la concurrence** (« moderne comme », « plus dynamique », « moins plat », images d'autres applications) : appliquer le skill **`guichet-benchmark`** avant la discussion. Il transforme les images en principes mesurés et en écart chiffré, qui nourrissent la planche. On ne compare qu'avec une capture de Guichet **dans le même état et la même largeur**.

## 2. La discussion, dans le chat

Pour **chaque point**, dans l'ordre de la demande, numéroté comme elle :

- **Ce que je vois** — le fait mesuré ou lu, en une ou deux phrases.
- **Les options** — A, B, C au plus, chacune avec sa conséquence concrète (ce qu'elle change dans l'écran, dans les données lues, dans les tests, dans la documentation).
- **Ma recommandation** — une option, et pourquoi, en une phrase.
- **Ce qui bloque** — les questions dont la réponse change ce que je fais, **la portée avant tout** : « toutes les lignes ou les seuls fonds ? », « téléphone seulement ? », « quelle page exactement ? ». Une portée non dite se devine mal et se paie en reprises.
- **Les conflits et les coûts** — règle antérieure heurtée, lecture de données ajoutée, traduction à ajouter, page de documentation à dater, risque de conformité.

Règles de ton : pas de compte rendu de ce que j'ai fait, pas de liste de ce que « je pourrais » ; des points décidables. Si un choix touche à la **conformité** (mentions réglementaires, avertissements de performance), je le dis et je ne le tranche pas.

> **Règle ajoutée le 2 novembre 2026.** Une correction de hiérarchie (titres, chiffres, couleurs, relief) passe aussi par la planche : elle se juge à l'œil, pas à la mesure. Montrer l'état actuel à côté de l'état proposé, **en thème sombre et en thème clair**.

## 3. La planche de choix

Une page HTML, publiée avec l'outil Artifact (charger d'abord le skill `artifact-design`). Partir de `modele-planche.html` à côté de ce fichier. Contenu :

- **Un en-tête** : titre, « réponse attendue sous la forme 1A, 2B… », « les chiffres sont des exemples, rien n'est codé ».
- **Une section par point**, avec son numéro, une phrase de contexte (le fait mesuré), et **2 ou 3 options** côte à côte, chacune :
  - une lettre dans un rond or, un titre, un sous-titre ;
  - une étiquette : `recommandé` (vert), `alternative` (ambre) ou `écarté` (rouge) ;
  - **un cadre de téléphone de 340 px** qui montre l'état visé avec les vrais gabarits (tuiles, écarts, libellés) ;
  - une note de deux lignes sur la conséquence, avec les mots clés en gras.
- **Les écarts dessinés** quand la mise en page est en jeu : une cote orange (`44 px`, `12 px`) entre les blocs, aux valeurs des jetons (`--chapitres-gap`, `--sections-gap`, `--tuiles-gap`, `--titre-gap`).
- **Les mesures réelles** dans une ligne `mesure` (ambre, police mono) : « mesuré à 390 px : la barre saute de 261 px ».
- **Une capture de l'écran actuel** en image (données `data:`) quand un défaut est décrit : le client voit ce que je vois.
- **Un tableau de synthèse** en fin de page : point, recommandation, décision attendue.
- **Quand une référence est en jeu** : une section « avant / après » (capture de Guichet à gauche, état visé à droite, mesures dessous), et une section « ce qu'on ne reprend pas » avec la raison. Jamais le nom, le logo, le texte ou l'illustration d'un concurrent dans la planche.

Contraintes techniques de la planche : un seul fichier, thème sombre à jetons, aucune dépendance externe hors polices Google, lisible à 400 px de large, pas de défilement horizontal. Vérifier le rendu par une capture avant de publier (texte qui déborde, nombres coupés).

Les mockups reprennent les **libellés de la maison** (voix « Mes/Mon » pour les lieux du client, « Votre » pour la voix de la maison : voir `ETALON.md` § 9) et **les jetons d'espace** (skill `guichet-espace-tuiles`). Une maquette qui invente un écart ou un libellé est une maquette fausse.

Après publication : donner le lien, résumer en chat les recommandations et les questions bloquantes. **L'abonnement de réveil sur la planche échoue souvent** : le dire une fois, et préciser que les réponses s'écrivent dans le chat.

## 4. Attendre le choix

Le client répond « 1A, 2B, 3A, 4C… » avec ses corrections (« A, sans le nombre de lignes », « B, et renommer X »). On **relit chaque réponse comme une consigne** et on liste ce qu'on a compris, surtout quand une réponse est ambiguë (« tuile ouverte », « 13 : non »). Ce qui n'a pas été tranché reçoit un défaut prudent, **dit** dans le compte rendu final.

**Aucun code avant ce choix.** « Go » ou la liste des lettres est le feu vert ; un retour de hook de fin de session ne l'est pas.

## 5. Coder ce qui a été choisi

Respecter les règles de `CLAUDE.md` et les habitudes de la maison :

- Lire `node_modules/next/dist/docs/` avant d'écrire du code Next.js.
- `src/lib/finance.ts` pour tout calcul ; toute écriture métier par `audit()` ; données en `types.ts` **et** migrations SQL.
- Les écarts viennent des jetons (skill `guichet-espace-tuiles`) ; jamais une valeur en dur.
- **Un conteneur ne doit jamais rester vide** entre deux chapitres : une pièce qui se tait rend `null`, et le chapitre qui la porte avec elle.
- Un libellé est aussi une clé de traduction : ajouter l'anglais dans `src/i18n/en-*.ts`, le test de couverture le refuse sinon.
- **Une règle écrite dans un test se met à jour dans le test**, pas à côté : réécrire la clause pour qu'elle garde l'intention dans la nouvelle forme.
- **Chaque clause nouvelle se vérifie par mutation** : la casser volontairement dans le code et constater qu'elle tombe. Une clause qui ne tombe jamais ne garde rien.
- Toucher une page de `src/data/docs/*.ts` : porter son `checkedOn` au jour **dans le même commit** ; relire les pages de documentation que l'écran change.
- Avant de conclure : `npm run typecheck && npm run lint && npm test`.
- **Pas de commit ni de push sans le mot `push` tapé par le client.** Le retour d'un hook « il y a des changements non commités » n'est pas une autorisation.
- Après un push, **vérifier le déploiement** à la demande ; dire franchement ce qu'on ne peut pas voir en production (pages derrière la connexion).

## 6. Le compte rendu final

Court, factuel, dans cet ordre : ce qui est fait ; ce que j'ai **interprété** (portée non tranchée, défaut choisi) ; ce qui n'a pas été **vu à l'écran** ; ce qui reste à décider. Jamais un « tout est vérifié » qui ne l'est pas.

## Pièges déjà rencontrés

- **La portée oubliée** : « retirer le volet Émetteur » pour un fonds, ou pour toutes les lignes ?
- **Le même mot, deux pages** : « la page compte » = ouverture de compte ou « Mon compte » ?
- **Un chapitre vide** qui laisse 88 px d'écart après le retrait d'une phrase.
- **Copier au lieu d'adapter** : une planche qui reproduit l'écran d'un concurrent est une planche à refaire ; on reprend un principe, on garde la voix, les jetons et les mentions de Guichet.
- **Un défaut qui n'existe que dans un thème** (la boîte blanche du thème clair) : reproduire dans le thème où il apparaît.
- **Une donnée de démonstration absente** : la tuile n'a pas été vue, elle n'est pas « vérifiée ».
- **Un script qui réécrit un fichier avec lui-même** : ne jamais ouvrir un fichier en écriture avant d'avoir fini de le lire.
