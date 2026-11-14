---
name: guichet-bamboo
description: Tout ce que Guichet sait de Bamboo, le courtier en ligne africain pris pour modèle (investbamboo.com) : le journal de chaque fois que le client l'a cité, ce qui a été exploré, les principes retenus ou écartés, les décisions prises et leur état, et le travail en attente (page d'accueil vitrine, intro unique). À lire dès qu'on cite Bamboo, qu'on conçoit la vitrine, une intro animée, une fiche de titre, une annonce ou un parcours d'ordre. Complète guichet-benchmark ; ne copie jamais ni marque, ni texte, ni visuel.
---

# Guichet × Bamboo — la mémoire de ce qu'on en a pris, et de ce qu'on n'en prend pas

**Skills voisins :** `guichet-benchmark` (la méthode : images → principes mesurés → écart → planche), `guichet-maquette` (discuter et maquetter avant de coder), `guichet-espace-tuiles` (écarts, chapitres, tuiles) ; un texte de risque suit `ETALON.md` § 10.

**Règle d'usage.** Dès que le client écrit « Bamboo » ou « comme Bamboo », ou qu'une demande de conception s'en inspire : lire ce fichier et `docs/design-refs/concurrents/bamboo/NOTES.md` AVANT de proposer. **À chaque nouvelle mention, ajouter une ligne au journal ci-dessous** (date, ce qui a été demandé, ce qui a été fait) : c'est ce qui fait de ce fichier la mémoire unique de Bamboo. Une leçon nouvelle s'écrit ici, pas seulement dans la conversation.

**Ce qu'on ne reprend jamais :** le nom, le logo, le texte, l'illustration, la photo, la composition à l'identique. Une planche n'écrit pas « Bamboo » (« un courtier en ligne »). Les captures du site restent des notes de travail dans le dépôt (`docs/design-refs/README.md`), jamais publiées ni intégrées à l'application.

## 1. Journal des mentions (du début de la session, 11 novembre 2026)

| Date | Ce que le client a demandé | Ce qui a été fait |
|---|---|---|
| 11 nov. 2026 | « Planche d'ordre épurée » : plusieurs pages demandent des montants et des informations ; audit, simplicité et clarté des étapes, **s'inspirer de l'app Bamboo** (fiche d'une action, pages en lecture libre) **et de Revolut** (skill et images). | Planche publiée (https://claude.ai/artifact/VCmjV8XHmSGCxhdnxwwTRq), A/B/C. **Aucune lettre donnée à ce jour** ; défaut connu laissé : le récapitulatif de l'ordre d'une action affiche « Montant — ». |
| 13 nov. 2026 | « Explore investbamboo.com : toutes les pages, boutons, fonctionnalités, design, introductions à l'app, présentation des services ; discute de ce qui est bon et réutilisable. » | Une vingtaine de pages publiques parcourues (accueil, pages produit, dix fiches de titres, Apprendre, Clients privés, Institutions, À propos). Discussion en chat. |
| 13 nov. 2026 | « Prépare les points 1, 2 et 3. Trouve l'historique des dividendes. Bandeau d'annonce. Oui, archive avec captures. » | Archive `docs/design-refs/concurrents/bamboo/` (11 captures + `NOTES.md`, commit `0c03f8d7`) ; ligne ajoutée au tableau des références de `guichet-benchmark` ; données de dividendes retrouvées ; planche publiée (https://claude.ai/artifact/LcT4zWBduX67zfmniNiAqL). |
| 14 nov. 2026 | « **1A, 2A, 3A, 4A**, en s'assurant qu'ils ne remplacent rien mais viennent **en rajout / complément de l'existant**. » | 1A, 3A, 4A codés (voir § 4) ; 2A **non fait** : conflit avec la règle de la vitrine (voir § 5). |
| 14 nov. 2026 | « **1a, 2a, dividende brut** » (sur la planche vitrine et intro) | **Vitrine 1A** et **intro unique 2A** codées ; **dividende brut** : une seule lecture du brut (`src/lib/market/dividende-brut.ts`). Voir § 6 et § 4. |
| 14 nov. 2026 | « Push, pour 2A **pas d'exemple avant connexion**. » | 2A clos : la règle « aucun taux, aucun rendement, aucun montant » de la vitrine est confirmée ; l'exemple chiffré reste sur les fiches, derrière la connexion. 1A, 3A, 4A poussés. |
| 14 nov. 2026 | « Il faudra **créer une page d'accueil similaire à Bamboo**, faire des propositions. On revisitera les **2 intros animées** : il n'en faut qu'**une**, au visuel plus marketing et commercial, qui vend les bienfaits de la plateforme, à quoi elle sert, comment elle aide l'utilisateur dans ses ambitions d'investissement, d'épargne, d'accès à l'information et à la donnée. **Un skill Bamboo** qui regroupe toutes les mentions. » | Ce skill (+ référence dans CLAUDE.md, `guichet-benchmark`, `guichet-maquette` et `skills.test.ts`) ; planche de propositions https://claude.ai/artifact/PA8oUUDyCK8HAbex8Cpncn (voir § 6). |

## 2. Ce qu'on a vu du site (13 novembre 2026, pages publiques seulement)

**Non vu :** l'application elle-même (derrière l'inscription), les onglets « Financials » et « News » des fiches, les pages Immobilier et Rendement fixe, les réponses de la FAQ, l'interactivité de la calculatrice.

- **Barre du haut :** Invest (menu : actions US, actions nigérianes, immobilier, rendement fixe, bons du Trésor), Save, Clients privés, Institutions, Learn, et un seul bouton « Get Started ». Au-dessus : un **bandeau d'annonce d'une phrase** (« dès 10 $ »).
- **Accueil :** photo plein écran et titre émotionnel (« Rêver, investir, vivre »), faux message animé « vous venez d'acheter… », logos de presse, **chiffre géant entouré à la main** (2,3 M d'utilisateurs), **six cartes de classes d'actifs** d'une couleur chacune (titre, une phrase, un lien), bloc sécurité, « comment atteindre vos rêves » en quatre étapes, **calculatrice à deux curseurs** (montant, durée) avec la mention « hypothétique », appel final.
- **Pages produit (Bons du Trésor, Épargne) :** accroche, trois ou quatre bénéfices, **ticket d'entrée dit dès le titre**, exemple chiffré à deux curseurs avec sa mention juste dessous, appel à télécharger l'app, ligne du régulateur en pied.
- **Fiche d'un titre (publique) :** fil d'Ariane, cours en grand, variation avec sa période, **état de la place et âge du cours** (« fermée, rouvre lundi 9 h », « cours différé »), graphique à sélecteur de période **avec l'indice en regard**, bande 52 semaines / volume / clôture précédente, onglets À propos · Financials · News, **tableau « contre l'indice » avec flèches « bat / retarde » et note de méthode**, **dividendes en trois tuiles et historique des versements**, FAQ, colonne de droite (recherche, alertes, titres similaires).
- **Apprendre :** cinq tuiles (guides, vidéos, glossaire, conseils, portefeuille) et deux parcours (éducation, FAQ).
- **À propos :** l'histoire, les chiffres, les régulateurs écrits en toutes lettres.

## 3. Principes retenus, et ce qu'on n'en retient pas

| Principe | Pour Guichet | Statut |
|---|---|---|
| Tableau « contre l'indice » avec sa note de méthode | « Contre l'indice » sur la fiche d'une action | **Fait** (1A, 14 nov.) |
| Repères sur 52 semaines | Plus bas / plus haut des clôtures, se taisent sous un an de séances | **Fait** (1A) |
| Dividendes en historique | « Dividendes versés » (brut publié par la société + date de paiement du bulletin) | **Fait** (1A) |
| État de la place / âge du cours | Ligne « aucune séance publiée depuis N jours » (pas d'horaire inventé : aucun calendrier des fermetures) | **Fait** (1A) |
| Un point d'entrée pour apprendre | Bloc « Apprendre » de trois éclairages non lus sur l'Accueil | **Fait** (3A) |
| Bandeau d'annonce d'une phrase | Annonce de la maison : une seule à la fois, fermable, double validation, audit | **Fait** (4A) |
| Exemple chiffré à deux curseurs | Existe déjà sur chaque fiche d'OTA (« Vous payez… Vous recevez… ») | **2A écarté par le client** (14 nov.) : **pas d'exemple avant connexion**, la règle de la vitrine tient |
| Page d'accueil par bénéfices et par ambitions | Vitrine : « S'informer, épargner, financer, investir » en quatre gestes, un visuel de l'écran de l'application sans chiffre ni mot, la donnée par sa forme, « Une fois votre compte ouvert, quatre gestes » | **Fait** (1A, 14 nov.) |
| Une seule intro, orientée bénéfices | « Guichet en trente secondes » devient quatre scènes de bienfaits (7 s chacune), jouée d'abord sur la vitrine ; « Premiers pas » est supprimée | **Fait** (2A, 14 nov.) |

**Ce qu'on ne reprend pas :** une accroche qui est un taux (« jusqu'à 17,5 % payé d'avance ») ; le faux message d'achat animé (un ordre engage de l'argent réel) ; un chiffre de réputation qu'on n'a pas (« 2,3 M ») ; des textes génériques laissés en place (les quatre étapes de leur accueil décrivent des « bureaux satellites » : un texte d'un autre produit abîme la confiance) ; les dégradés vifs par classe d'actif (leur identité) ; « titres similaires +0,00 % » affiché place fermée ; le statut « Clients privés » à seuil et l'API institutionnelle (hors sujet).

## 4. Dividendes : où vivent les données (relevé du 13 novembre 2026)

- **Par exercice :** `figures[].dividendPerShare` dans `src/data/companies.ts` (chiffres publiés par l'émetteur), 4 à 5 exercices (2021–2025) pour les sept sociétés cotées ; `null` = non distribué.
- **Par versement, avec la date de paiement :** colonnes `last_dividend`, `dividend_year`, `dividend_date` de la table `quotes` (recopiées du tableau de capitalisation du bulletin BVMAC), depuis 2022. **Ni date de détachement ni date d'enregistrement.**
- **Pièges :** le bulletin recopie parfois un ancien versement avec une date plus récente ; pour quatre sociétés (SOCAP, BANGE, SCGRE, SAF) son montant vaut exactement 89 % ou 90 % du brut publié : **probablement net de retenue, alors que la fiche écrit « dividende brut »** — à confirmer avec la légende du bulletin ; une séance de BHC (4 août 2026) porte le montant et la date de SOCAP. `dividendesVerses` (`src/lib/market/fiche-action.ts`) retient la date la plus ancienne dont le montant est voisin du brut publié.
- **Tranché le 14 novembre : brut.** `dividendeBrut` (`src/lib/market/dividende-brut.ts`) écrit le brut publié par la société quand le bulletin porte le montant net du même exercice (rapport entre 0,85 et 1,02), et le montant du bulletin sinon ; la fiche (tuile, rendement, « i »), la page société, la liste des sociétés et l'offre ingérée la lisent. Les offres déjà stockées gardent l'ancien montant jusqu'à la prochaine ingestion du bulletin.

## 5. Contraintes Guichet à vérifier AVANT toute proposition inspirée de Bamboo

1. **Relire le code et l'écran avant de proposer.** Deux de mes propositions du 13 novembre existaient déjà (l'exemple chiffré des fiches d'OTA ; le Guide de huit éclairages et son parcours de 29). Leçon : on propose l'exposition d'une chose qui existe, pas sa création.
2. **« Nos placements » (la vitrine) porte une règle écrite : « AUCUN TAUX, AUCUN RENDEMENT, AUCUN MONTANT »** (`src/app/placements/page.tsx`) ; la page d'accueil du visiteur la tient aussi (le bandeau de marché dit « les prix, les rendements et le calendrier se lisent une fois connecté »). Un exemple chiffré ou un chiffre de rendement sur une page publique la contredit : **2A a été tranché le 14 novembre : pas d'exemple avant connexion** (la règle est confirmée ; aucun exemple chiffré, même écrit « exemple », sur une page publique). `/instruments` n'est plus une page : redirection fermée le 24 octobre 2026.
3. **Pas de preuve sociale inventée** : Guichet n'a pas de chiffre d'utilisateurs à afficher. Les preuves possibles sont des faits vérifiables sans promesse : la société de bourse agréée (COSUMAF-SDB-01/2026), les six États, les sociétés cotées, les fonds agréés, la ligne du régulateur.
4. **Une seule intro depuis le 14 novembre** (`src/components/mobile/Presentation.tsx`) : quatre scènes de bienfaits, **sans chiffre, taux ni montant**, jouée au premier passage d'un **visiteur sur « / »** (avant le compte) et, pour un client connecté, sur la première autre page, une fois par appareil ; elle se rejoue par « Trente secondes » (menu, page de connexion). « Premiers pas » (six écrans) est supprimée avec son CSS, son entrée de menu et la capture `premiers-pas.png` du guide du desk. La décision du 12 octobre « la racine du visiteur n'est pas couverte par une seconde intro » est levée par le client pour cette séquence unique.
5. **Ton des risques :** `ETALON.md` § 10 (rassurer sans rien retirer) ; « Communication à caractère promotionnel » reste visible ; aucune commission n'est affichée au client ; voix « Mes / Votre ».
6. **Le client demande des ajouts, pas des remplacements** (14 novembre) : chaque lecture nouvelle vient à côté de l'existante, et un test garde que les sections d'avant sont encore là (`src/test/fiche-action-ajouts.test.ts`).

## 6. La vitrine et l'intro unique (faites le 14 novembre 2026, sur les lettres 1A et 2A)

**Cahier des charges du client :** une page d'accueil **similaire à Bamboo** ; **une seule intro animée**, d'un visuel plus marketing et commercial, qui vend les bienfaits (investissement, épargne, accès à l'information et à la donnée). Planche : https://claude.ai/artifact/PA8oUUDyCK8HAbex8Cpncn.

**Ce qui a été fait, en gardant les décisions du 12 octobre :**
- **Un seul bouton en tête** (« Créer mon compte ») : la planche en montrait deux ; la décision écrite du 12 octobre (« trois propositions dans le même souffle en font zéro ») a été tenue, et un test la garde.
- **Aucune bande de preuve chiffrée** : la planche montrait des pastilles « 6 États · 7 sociétés cotées » ; elles n'ont **pas** été faites, la décision du 12 octobre retirant « une bande de preuve chiffrée (des comptes d'instruments restent des chiffres) ». La preuve reste la bande d'instruments qui défile (le marché existe parce qu'on le nomme) et la ligne COSUMAF.
- **Un visuel de l'écran de l'application** à côté du texte du hero (`VisuelProduit`, SVG sans mot ni chiffre), et **la donnée par sa forme** (`FormesDeLaDonnee`, sans graduation, légende « Les valeurs se lisent une fois connecté. »).
- **« S'informer » ouvre la liste des gestes** (le plus tranquille) : « S'informer, épargner, financer, investir », numérotés 01 à 04.
- **« Une fois votre compte ouvert, quatre gestes »** (voir, dire, parler, suivre) : le mode d'emploi des anciennes intros, avec leurs phrases qui protègent le client (« c'est une intention », « rien n'est débité sans votre accord », « chaque chiffre est expliqué, la décision reste la vôtre »).
- **Intro unique** : voir § 5 point 4. Les quatre scènes : « Guichet · Purpose Capital » (ambitions), « L'information », « À vos côtés », « En confiance » (agrément COSUMAF, risque de perte en capital) ; dernier écran : « Créer mon compte » pour un visiteur, « Voir les lignes » pour un client.
- **Gardé par** `src/test/vitrine-et-intro.test.ts` (vérifié par mutation).

**Pas vu / à regarder :** la vitrine et l'intro en thème clair seulement sur la vitrine (l'intro est en bleu nuit dans les deux thèmes) ; l'anglais des scènes (clés ajoutées, non relues à l'écran) ; la durée réelle de 7 s par scène sur un vrai téléphone.

## 7. Où sont les pièces

- Archive et notes : `docs/design-refs/concurrents/bamboo/` (`NOTES.md`, onze captures `01-…` à `11-…`) ; captures brutes de l'exploration dans le dossier de travail de la session (non versées).
- Planches : « ordre épuré » https://claude.ai/artifact/VCmjV8XHmSGCxhdnxwwTRq ; « fiche action, exemple chiffré, apprendre, annonce » https://claude.ai/artifact/LcT4zWBduX67zfmniNiAqL ; « vitrine et intro unique » https://claude.ai/artifact/PA8oUUDyCK8HAbex8Cpncn.
- Code issu de l'étude : `src/lib/market/dividende-brut.ts`, `src/components/accueil/VisuelProduit.tsx`, `FormesDeLaDonnee.tsx`, `src/components/mobile/Presentation.tsx`, `src/lib/market/fiche-action.ts` (+ test), `src/app/offres/[id]/FicheAction.tsx`, `src/components/accueil/BlocApprendre.tsx` et `ListeApprendre.tsx`, `src/lib/domain/annonce.ts`, `src/lib/annonce.ts`, `src/app/desk/annonce/`, `src/components/BandeauDAnnonce.tsx` et `BandeauFermable.tsx`.
- Tests qui gardent « en rajout » : `src/test/vitrine-et-intro.test.ts`, `src/test/fiche-action-ajouts.test.ts`, `src/test/bloc-apprendre.test.ts`, `src/test/annonce.test.ts`.
