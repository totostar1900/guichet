---
name: guichet-maquette
description: Discuter et maquetter AVANT de coder, pour toute demande de conception ou de refonte d'un écran de Guichet (plusieurs points, intention floue, « discute d'abord », « propose des maquettes », « étends la réflexion »). Produit une discussion point par point puis une planche de choix A/B/C à sélectionner. N'écrit aucun code avant le choix. Ne pas utiliser pour une retouche explicite et sans ambiguïté (« retire cette phrase »), qui se fait directement.
---

# Guichet — discuter, maquetter, puis coder

La règle de la maison : **le client ne découvre pas une décision de conception dans le code.** Une demande de conception passe par trois temps, dans cet ordre, et le code n'arrive qu'au troisième.

## Les skills voisins — on les consulte à chaque étape, on les nomme au compte rendu

| Quand… | Consulter |
|---|---|
| on se compare à d'autres applications, on juge une hiérarchie, une densité, un chiffre en avant | `guichet-benchmark` (références déjà analysées d'abord : `docs/design-refs/`) |
| on touche un écart, un chapitre, une tuile, un jeton d'espace | `guichet-espace-tuiles` |
| le client cite Bamboo, ou demande une vitrine, une intro, une fiche de titre « comme » ce courtier | `guichet-ad` (journal, principes, ce qu'on ne reprend pas, règle de la vitrine sans chiffre) |
| on écrit un texte de risque, de mise en garde, d'avertissement | `ETALON.md` § 10 — **rassurer sans rien retirer** |
| on nomme un lieu du client ou on lui parle | `ETALON.md` § 9 — « Mes » pour ce qui est à lui, « Votre » pour la maison |

*Ce n'est pas une liste à cocher une fois :* chaque nouvelle demande de conception repart de cette table. Une leçon apprise en route (un piège, une règle de
ton, un principe de hiérarchie) **s'écrit dans le skill concerné** avant la fin de la session, pas seulement dans la conversation.

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

### Challenger, pas seulement exécuter

« Discuter et challenger » veut dire : si la demande contredit ce que montrent les **références** (`guichet-benchmark`) ou les **données** (marché peu échangé,
historique court), on le dit avec la mesure, on propose la forme qui sert l'intention, et on pose les **questions qui tranchent** (pas dix : celles dont la
réponse change le code). Exemples déjà rencontrés : « la variation en gros chiffre » → les références mettent le **prix** en avant et la variation à côté,
période écrite ; un « 0,0 % » sur une ligne muette se lit comme de la stabilité. Une réponse du client qui choisit autre chose que la recommandation **se suit**,
et le compte rendu dit ce que l'on avait déconseillé.

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

**L'état « aujourd'hui » d'une planche est une capture réelle, jamais un dessin.** Les « aujourd'hui » dessinés à la main ont été jugés infidèles (5 novembre
2026) : le client ne peut pas décider contre un état qu'il ne reconnaît pas. Capturer à 390 px, **sans bannière ouverte** (fermer la présentation et les coachs),
puis mesurer les tailles réelles (`getComputedStyle`) et les citer. Les options reprennent **les mêmes valeurs** que la capture.

**Chaque option dit ce qu'elle change ailleurs** : un chiffre en avant est lu par la carte, la tuile, la liste, la fiche ; une donnée calculée à un endroit doit
l'être **une seule fois** pour toutes les surfaces, sinon deux pages disent deux choses.

## 4. Attendre le choix

Le client répond « 1A, 2B, 3A, 4C… » avec ses corrections (« A, sans le nombre de lignes », « B, et renommer X »). On **relit chaque réponse comme une consigne** et on liste ce qu'on a compris, surtout quand une réponse est ambiguë (« tuile ouverte », « 13 : non »). Ce qui n'a pas été tranché reçoit un défaut prudent, **dit** dans le compte rendu final.

**Aucun code avant ce choix.** « Go » ou la liste des lettres est le feu vert ; un retour de hook de fin de session ne l'est pas.

## 5. Coder ce qui a été choisi

Respecter les règles de `CLAUDE.md` et les habitudes de la maison :

- Lire `node_modules/next/dist/docs/` avant d'écrire du code Next.js.
- `src/lib/finance.ts` pour tout calcul ; toute écriture métier par `audit()` ; données en `types.ts` **et** migrations SQL.
- Les écarts viennent des jetons (skill `guichet-espace-tuiles`) ; jamais une valeur en dur.
- **Un texte de risque ou de mise en garde suit `ETALON.md` § 10** : le geste avant la menace, un vocabulaire calme, aucune mention retirée, la liquidité d'abord sur ce marché,
  un seul lien vers le texte opposable. Le ton se discute dans la planche comme le reste.
- **Un conteneur ne doit jamais rester vide** entre deux chapitres : une pièce qui se tait rend `null`, et le chapitre qui la porte avec elle.
- Un libellé est aussi une clé de traduction : ajouter l'anglais dans `src/i18n/en-*.ts`, le test de couverture le refuse sinon.
- **Une règle écrite dans un test se met à jour dans le test**, pas à côté : réécrire la clause pour qu'elle garde l'intention dans la nouvelle forme.
- **Chaque clause nouvelle se vérifie par mutation** : la casser volontairement dans le code et constater qu'elle tombe. Une clause qui ne tombe jamais ne garde rien.
- Toucher une page de `src/data/docs/*.ts` : porter son `checkedOn` au jour **dans le même commit** ; relire les pages de documentation que l'écran change.
- Avant de conclure : `npm run typecheck && npm run lint && npm test`.
- **Pas de commit ni de push sans le mot `push` tapé par le client.** Le retour d'un hook « il y a des changements non commités » n'est pas une autorisation.
- Après un push, **vérifier le déploiement** à la demande ; dire franchement ce qu'on ne peut pas voir en production (pages derrière la connexion).

## 6. Le compte rendu final

Court, factuel, dans cet ordre : ce qui est fait ; **les skills utilisés et ce qu'on en a appliqué** ; ce que j'ai **interprété** (portée non tranchée, défaut choisi) ; ce qui n'a pas été **vu à l'écran** ; ce qui reste à décider. Jamais un « tout est vérifié » qui ne l'est pas.

## Pièges déjà rencontrés

- **Dessiner l'état « aujourd'hui »** au lieu de le capturer : la planche est à refaire (5 novembre 2026).
- **Deux liens pour un même sujet** dans une feuille courte (la page opposable et la leçon) : un seul, vers le texte opposable, qui cite l'autre.
- **Un ton qui retire une mention** : adoucir une mise en garde jusqu'à la rendre moins nette n'est pas « plus positif », c'est une faute (`ETALON.md` § 10).
- **Une capture polluée** par une bannière (présentation, mentions légales) : la fermer avant de capturer, relire la capture avant de la poser dans la planche.

- **La portée oubliée** : « retirer le volet Émetteur » pour un fonds, ou pour toutes les lignes ?
- **Le même mot, deux pages** : « la page compte » = ouverture de compte ou « Mon compte » ?
- **Un chapitre vide** qui laisse 88 px d'écart après le retrait d'une phrase.
- **Copier au lieu d'adapter** : une planche qui reproduit l'écran d'un concurrent est une planche à refaire ; on reprend un principe, on garde la voix, les jetons et les mentions de Guichet.
- **Un défaut qui n'existe que dans un thème** (la boîte blanche du thème clair) : reproduire dans le thème où il apparaît.
- **Une donnée de démonstration absente** : la tuile n'a pas été vue, elle n'est pas « vérifiée ».
- **Un script qui réécrit un fichier avec lui-même** : ne jamais ouvrir un fichier en écriture avant d'avoir fini de le lire.

## Leçon du 7 novembre 2026 : une référence inaccessible se remplace par les captures et le PDF du client

Quand le site de référence ne se résout pas depuis le conteneur, on ne l'invente pas : on part des captures et des documents que le client fournit (ici le PDF « Description of Services, Financial Instruments and Risks »), on en tire la STRUCTURE (parties, ordre, tableaux terme · description) et jamais les phrases. Une documentation réglementaire n'affirme que ce que l'application fait déjà (parcours de `flows.ts`, chiffres de `summary.ts`) ; ce qui relève de la conformité (garantie d'investisseurs, assurance) reste signalé comme à écrire, pas improvisé. Le tour de lecture d'une page suit la vue choisie et ancre chaque arrêt à un repère réel (`data-coach`) : un repère mort est un arrêt qui ne parle jamais (c'était le cas de `titres-fonds`).

## Leçon du 7 novembre 2026 (soir) : un changement de carte vaut pour les DEUX densités, et on le vérifie dans celle du client

Le Trésor en surtitre et le coupon au rang du rendement ont été codés sur la carte détaillée seulement ; le client lit les adjudications en vue compacte et a écrit que « les adjudications ne sont pas mises à jour ». Avant de conclure : lister les vues où l'élément apparaît (détaillée, compacte, dos, liste, tableau, « À la une »), capturer chacune (`localStorage guichet:cartes = compact` pour la compacte), et nommer dans le compte rendu celles qu'on n'a pas touchées. Même règle pour les hauteurs d'une rangée de commandes : on mesure chaque élément de la rangée (champ, boutons), pas un seul.

## Leçon du 6 novembre 2026 : « garder les graphiques existants » veut dire les inventorier avant de dessiner

La première maquette de la fiche d'une séance avait remplacé le graphique des flux par un tableau, et fusionné « Chiffres » en perdant ses bulles ⓘ : le client a dû le redire. Avant une planche qui fusionne ou refond une page, **lister chaque graphique, chaque bulle et chaque texte** de la page actuelle (un script qui imprime le texte de chaque onglet suffit) et les placer un par un dans un tableau « où va chaque élément ». Un dessin se redessine à l'échelle avec ses vraies valeurs, jamais en tableau de remplacement. Deux remarques du client à la suite (« montant au milieu », « case blanche ») se résolvent dans la même planche, mais une remarque qu'on n'a pas retrouvée dans l'historique se dit comme une **interprétation** dans le compte rendu.

## Leçon du 6 novembre 2026 : importer un fichier externe, et ce qu'on en montre au client

- **Lire un classeur sans se fier à sa dimension déclarée** : les exports OJA « Enchères » et « Titres » annoncent une ligne et en ont des milliers ; un lecteur qui s'y fie n'en voit qu'une. Compter les lignes réellement lues, et le dire dans l'aperçu.
- **Un gros fichier se lit dans le navigateur, et seul l'agrégé voyage** : la limite d'une requête serveur (4,5 Mo sur Vercel) et celle de React sur les arguments d'une action (« Maximum array nesting exceeded » quand un lot de plusieurs Mo accompagne un deuxième argument) imposent UNE chaîne en argument, revalidée côté serveur.
- **Deux sources, une règle par champ, et une trace** : la valeur retenue se dérive des deux jeux de valeurs gardés ; l'écart tranché garde la valeur écartée, le motif, l'auteur, le jour. Une source se peut exclure, même chargée.
- **Le client lit une liste blanche** (`vueClient`), jamais une liste de retraits : un champ ajouté demain ne sort pas tant qu'il n'est pas écrit dans la projection et dans son test. Une couverture recalculée n'est pas une couverture imprimée.
- **Un test de navigateur sur fichiers à nom accentué** : Playwright perd le nom ; recopier sous un nom ASCII avant `setInputFiles`.

## Leçon du 7 novembre 2026 : comparer deux lignes, c'est d'abord les mettre sur la même période

- **Un chiffre de rendement a une nature** (promesse à l'échéance, passé, dividende au cours) **et un horizon.** Mettre en face deux natures sous un seul mot « rendement », ou couronner le plus grand, ment par omission : le verdict de compatibilité prévient sans bloquer, et l'étiquette « plus élevé » ne reste que sur une même nature.
- **On ne mesure sur une période que ce qu'on sait** : variation de la valeur liquidative pour un fonds, du cours (dividendes non compris) pour une action, bon tenu jusqu'à l'échéance et réinvesti pour un BTA. Un OTA, sans sortie anticipée, garde son rendement actuariel : « non mesuré sur la période » vaut mieux qu'un chiffre inventé.
- **La plage se borne aux données communes et le dit** ; sous trente jours, pas de taux annuel ; le rétrospectif porte sa mise en garde en tête (`ETALON.md` § 10) et montre la dispersion selon le jour d'entrée sans nommer « le bon jour ».
- **Un réglage de maison (taux bancaire) a une référence datée au Desk, que le client peut surcharger**, et la page dit toujours laquelle a servi.

## Leçon du 18 novembre 2026 : un geste se compte en places que le client voit, pas en routes

Le ruban du balayage suivait les sept routes (Titres, Fonds et Adjudications séparées) alors que la barre du bas n'en montre que cinq : il fallait trois gestes pour quitter Investir, et le client l'a écrit (« en un glissement et pas en 3 »). Quand un geste parcourt une suite, **compter les places telles que l'écran les montre**, et réserver aux onglets du dedans (ici la rangée d'onglets, `data-balayage-sections`) le passage d'une sous-page à l'autre. Deux autres règles de la même planche : le geste **montre où il mène** (nom et silhouette de la page voisine dans l'écart, onglet de la barre du bas qui s'allume) plutôt que de laisser un fond vide ; et **en arrivant dans un groupe, on retrouve la dernière section vue** (une préférence de l'appareil, `derniere-section.ts`). Reste connu : les rangées à glissement (`data-balayage-local`) et le champ de recherche gardent leur geste, donc le balayage de page ne part que d'une zone libre.

## Leçon du 18 novembre 2026 : une porte biométrique sans liste de clés ouvre le sélecteur du système

La connexion par Face ID demandait de « choisir la clé d'accès » : le serveur n'envoyait aucune liste de clés (`allowCredentials` vide), et le téléphone ouvrait son sélecteur de comptes avant le visage. **Un appareil déjà reconnu désigne sa propre clé** (identifiant d'appareil envoyé au serveur, clé de CET appareil, transport « interne », visage ou empreinte exigés) et passe directement à la biométrie ; seule la porte « j'ai une clé d'accès » reste sans liste. Sur un écran qu'on ouvre devant d'autres personnes, **jamais le nom** (« Bonjour … ») : un grand bouton, un seul geste. Voir `src/test/connexion-biometrie.test.ts`.

## Leçon du 18 novembre 2026 (suite) : « oublier cet appareil » n'oublie que le navigateur

Sur la page de connexion, « Oublier cet appareil ici » efface seulement le souvenir de CE navigateur (`clearDevice`) : l'appareil de confiance reste enregistré côté serveur et ne se retire que dans Mon compte > Sécurité (`forgetDeviceAction`). Un libellé qui promet plus qu'il ne fait se corrige dans les mots ou dans le geste, jamais en silence. Même page : **le lien ou le code par e-mail d'abord, la biométrie en bas** (icône, titre, phrase, bouton à bouts ronds, d'après l'image du client) ; plus de « Pas vous ? » ni de « Vous découvrez Guichet ? » (le test lit le code SANS ses commentaires : un commentaire qui cite le mot retiré ne doit pas le faire revenir).


## Leçon du 19 novembre 2026 : une planche se rouvre avec de nouvelles captures, et un compte neuf ne ressemble pas au compte de démonstration

- **Rouvrir une planche déjà publiée** (mêmes lettres, URL conservée) quand le client apporte de nouvelles références : on ajoute des points (ici 5 à 7), on garde les anciens, et on dit dans le chat ce qui s'ajoute. Les captures d'un autre courtier ne partent pas au dépôt quand elles montrent un e-mail ou un numéro réels : le skill en garde le texte.
- **« Les boutons de validation en bas de page »** : un écran de parcours est une colonne qui occupe la hauteur, et le bouton se pousse en bas (`margin-top: auto`) ; dans un long formulaire, il colle au bas de l'écran (`position: sticky`). C'est la zone du pouce.
- **En démonstration, tout compte dont l'identifiant commence par `dev-client-` reçoit un dossier approuvé** (`dossierDeDemonstration`). Un parcours de CRÉATION doit créer un compte sans dossier (`dev-nouveau-…`), sinon on ne voit jamais l'état « brouillon » qu'on dessine.
- **Un fichier « use server » n'exporte que des fonctions** : une constante partagée (ici le code de démonstration) vit dans un petit module à côté.
- **Un minuteur qui attend une fonction du parent dans ses dépendances** est annulé à chaque rendu : garder la fonction dans une référence.
- **Le build complet ne se lance pas hors ligne** (les polices Google sont téléchargées) : typecheck, lint et épreuves passent, et la compilation du développement a servi de contrôle des feuilles de style.

## Leçon du 19 novembre 2026 (suite) : ranger par sujet, ne rien réécrire, et ne pas déplacer ce qu'on accepte sans l'avis de la conformité

- **Découper un document sans toucher au texte accepté** : les pages par sujet lisent des TRANCHES des sources existantes (`legal.ts`, `services-risques.ts`) par identifiant ; le paquet que la ConsentGate fait accepter n'a pas changé d'un mot. Déplacer une section hors de ce paquet est une décision de conformité, pas de design.
- **Une garde de « une rubrique, un document »** compte les adresses du sommaire : six, toutes différentes, aucune ancre d'un autre document.
- **Un menu d'ancres ne pousse jamais l'historique** (`LienDAncre`, `replaceState`) : la flèche de retour quitte la page.
- **Consolider un compte** : écrire l'inventaire « donnée → endroits » avant de dessiner (ici l'e-mail et le téléphone en trois endroits, le canal de contact en trois, les alertes en deux), puis une garde par donnée qui interdit qu'elle revienne.
- **Une sous-page garde son adresse et sa place dans la recherche** : la table du sommaire porte `sousDe`, et le sommaire filtre ce qui n'est pas une rubrique.
- **Un écran de déverrouillage ne montre rien avant l'hydratation** : l'état de l'appareil n'est connu que du navigateur, et un formulaire e-mail qui clignote sous un appareil reconnu est une faute.

## Leçon du 19 novembre 2026 (verrou) : une propriété de la mise en page ne se relit pas à chaque navigation

- La mise en page racine ne se rend pas de nouveau à chaque `router.replace` : un composant qu'elle porte garde la propriété du premier rendu. Un état déduit d'une donnée serveur qu'on vient de changer (ici « le compte a son code ») se double d'un état local posé par le geste, sinon le voile « Choisissez votre code » revenait après la pose.
- **Une panne ne doit pas enfermer** : une exigence qui bloque tout (« tout compte a un code ») garde une sortie quand le serveur échoue (« Continuer sans code pour l'instant »), et une lecture en échec suppose que la condition est remplie.
- **Une migration qui élargit une contrainte se pose AVANT le déploiement du code qui l'emploie** ; le dire au client au moment de pousser.
- Un verrou de navigateur se compare des HEURES (départ, retour), jamais des durées comptées : les minuteurs sont gelés en arrière-plan. Se vérifie avec une horloge avancée (`Date.now`) et un `visibilitychange` simulé.

## Leçon du 19 novembre 2026 (Paramètres et connexion) : le mode strict de React remonte l'effet, un drapeau posé d'avance l'empêche de rien faire

Pour proposer Face ID tout seul (verrou et porte), un effet planifiait l'essai avec un drapeau `useRef` posé AVANT la minuterie : en développement, React monte, démonte et remonte l'effet, la minuterie de la première montée était annulée et la seconde ne se lançait jamais (le téléphone n'aurait rien demandé). **Poser le drapeau dans la minuterie, à l'échéance.** Vu seulement en remontant la page avec une clé d'accès virtuelle (CDP `WebAuthn.addVirtualAuthenticator`, authentificateur interne, vérification d'utilisateur simulée) : le test de lecture seul ne l'aurait pas vu.

Autres leçons du lot : (1) le dépôt mémoire du mode démonstration GARDE le code du compte d'un lancement à l'autre : un script de capture doit s'adapter à l'état (« poser » ou « saisir »), sinon il clique dans le vide ; (2) la porte de connexion (`PorteDeConnexion`) n'existe qu'avec Supabase, le mode démonstration montre le formulaire : le propos de la porte ne se vérifie pas à l'écran sans backend, on le dit ; (3) la voix d'un navigateur sur iPhone (Safari) peut exiger un geste pour WebAuthn : « Toucher pour réessayer » est le repli, pas une option ; (4) deux rubriques fusionnées (Sécurité, Préférences) laissent des liens, des phrases d'aide (« X › Y »), des synonymes de recherche (`InfoSearch`) et des clauses de tests : les chercher tous (`grep` des anciens noms et adresses) avant de lancer la suite.

## Leçon du 20 novembre 2026 : une fonction « biométrique » du web se juge sur ce que le repli autorise, pas sur le capteur

L'empreinte avait été construite sur les clés d'accès (WebAuthn) et livrée en deux jours. Le client a ouvert l'application avec le code d'écran de son téléphone, qui apparaît dans le même prompt : le navigateur accorde la clé à la biométrie OU au code d'écran, sans réglage pour n'accepter que la biométrie. La limite avait été dite dans le chat, mais pas posée sur la planche, et le client a tranché sur un schéma qui la cachait. **Une planche sur la connexion montre le prompt système réel, bouton de repli compris, et dit en une ligne ce que ce bouton autorise.** Corollaires : (1) retirer une entrée d'authentification, c'est supprimer les actions serveur (options, ouverture, enrôlement), pas seulement les écrans, sinon une clé existante ouvre encore par l'API ; (2) la nouvelle forme se garde par un test qui interdit leur retour (`connexion-biometrie.test.ts`) ; (3) l'empreinte ne reviendra qu'avec une application native qui peut exiger la biométrie forte seule.

## Leçon du 28 novembre 2026 : « la durée est fixe » se vérifie dans la liste d'à côté avant de se discuter

La demande disait « une durée fixe, 3 mois ou 12 mois » pour Titres ET Fonds ; la lecture du code a montré que Fonds avait déjà un sélecteur de cinq fenêtres, rangé dans un bandeau replié. La discussion a été corrigée avant le code : on ne crée pas un deuxième contrôle, on **déplace** celui qui existe sur la ligne commune et on y aligne l'autre liste. Deux règles en sortent : (1) une commande qui règle une mesure se pose sur la ligne de la liste, un seul composant partagé (`ChoixPeriode`), jamais deux styles ; (2) tout ce qui nomme la période (colonne, filtre, tri, note de pied) la lit de l'adresse, jamais « 3 mois » écrit en dur.

## Leçon du 28 novembre 2026 : un novice ne lit pas une carte, il lit une phrase puis les chiffres

Les cartes, l'extension et la fiche étaient justes et illisibles pour qui découvre le métier : des chiffres à noms de métier (ISIN, coupon, rendement actuariel, VL) sans la question qu'ils règlent. Ce qui a été fait, et qui se réutilise : (1) **une phrase « En clair » calculée de la ligne seule** (fonction pure testée, mots dans une table à clefs de traduction), au conditionnel pour un gain, avec « s'engage » pour l'émetteur, **le risque toujours dit avec le gain** ; (2) **trois curseurs communs** à l'extension, à la fiche et à la présentation (gagner, récupérer, risquer) : un seul fil à apprendre ; (3) **une ligne « à quoi sert cette section »** sous les titres techniques plutôt que des titres réécrits en questions (un client averti perd en précision) ; (4) **un bandeau qui se ferme pour de bon**, jamais une fenêtre qui s'ouvre seule quand l'écran a déjà verrou, mentions et intro ; (5) une page de présentation **dérivée de la même source** que le diaporama, pour qu'ils ne se contredisent pas. Le bloc de la fiche est rendu aussi dans l'aperçu d'une voisine (même hauteur de tête). Un test de lisibilité réel (3 à 5 novices, avant et après) reste à faire : ce que le code garantit, c'est la présence et le ton, pas la compréhension.

