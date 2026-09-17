# Guichet · Purpose Capital

Répertoire d'opportunités et d'instruments financiers en CEMAC : les offres sont publiées et **tarifées par le desk**, les clients y répondent (appétit, prise ferme, question, cession), le desk traite et transmet au SVT — le tout sur une seule base.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000 — données de démonstration en mémoire
npm test           # tests de la bibliothèque financière (rendements du 9 sept. 2026)
npm run typecheck
npm run lint
```

Sans configuration, l'app tourne sur le jeu de données de `src/data/seed.ts` (mention « démo · mémoire » dans l'en-tête). Les intentions créées sont visibles dans le desk jusqu'au redémarrage. La page **/connexion** propose alors une session de démonstration (client ou desk), signée dans un cookie.

## Brancher Supabase

1. Créer un projet sur supabase.com (région EU-West ou la plus proche).
2. SQL Editor → exécuter dans l'ordre `supabase/migrations/0001_init.sql`, `0002_auth.sql`, puis `supabase/seed.sql`.
3. Copier `.env.example` en `.env.local` et remplir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project settings → API). La clé service role ne quitte jamais le serveur.
4. Authentication → Providers → Email : activer, et dans **Email Templates → Magic Link** remplacer le lien par le code `{{ .Token }}` (ou garder les deux : le lien renvoie vers `/auth/callback`). Dans **URL Configuration**, ajouter `http://localhost:3000/auth/callback` et l'URL de production.
5. Renseigner `DESK_EMAILS` avec les adresses du desk (ou promouvoir via SQL, voir `0002_auth.sql`).
6. Redémarrer `npm run dev` — la mention « démo · mémoire » disparaît et /connexion envoie un code par e-mail.

`npm run seed:sql` régénère `supabase/seed.sql` depuis `src/data/seed.ts`.

## Téléphone

- Sous 760 px, `src/components/mobile/MobileShell.tsx` remplace l'en-tête : barre du haut (flèche retour + titre de la page, lu dans `<title>`) et barre du bas à quatre onglets — Guichet, Fonds, Mon espace, Apprendre (+ Desk pour l'équipe). Le bureau garde l'en-tête et les onglets actuels.
- **Retour** : historique du navigateur quand la page précédente est à nous (Next restaure le défilement), sinon la dernière liste vue (`sessionStorage`, clé `guichet:lastList`, écrite par `OfferBrowser` à chaque changement de filtre) — un lien ouvert depuis WhatsApp revient donc sur la liste filtrée.
- **Liste** : cartes par défaut sur téléphone ; les cinq menus déroulants deviennent une feuille « Filtrer · n » (`FilterSheet`) et les filtres actifs des pastilles qu'on retire d'un tap. Les filtres restent dans l'URL.
- **Fiche** : quatre compartiments (Essentiel, Chiffres, Documents, Risques) via `data-pane` sur les sections et `FichePanes` / `FicheSegments` (CSS seul sous 760 px, tout visible au-dessus) ; `StickyAction` colle l'action au-dessus de la barre et s'efface quand le formulaire est à l'écran.
- **Intention en trois étapes** sur téléphone (`IntentForm`, attribut `data-at` sur le formulaire, `data-step` sur les blocs) : demande et montant avec l'estimation, coordonnées (contrôlées, pré-remplies), récapitulatif puis envoi ; « Continuer » vérifie les champs de l'étape ; le bureau affiche tout d'un bloc. Même parcours pour souscription et rachat de fonds.
- **Mon espace** : trois tuiles (positions valorisées, prochain flux, en cours), les intentions en cours en cartes avec la prochaine étape en clair et la jauge des cinq arrêts (reçue → confirmée → transmise → servie → réglée), l'historique replié ; coordonnées, lignes suivies, positions et documents inchangés.
- **Écran d'accueil** : `src/app/manifest.ts` (nom, icônes `public/icons`, plein écran, couleurs) et `viewport` avec `viewportFit: cover` ; les barres du téléphone respectent les zones sûres.
- `/apprendre` : la destination de l'onglet — simulateur, comparateur, sociétés et le glossaire du référentiel ; les leçons et le guide viennent à l'étape suivante.

## Le Guichet (page d'accueil)

- Une barre de filtres (Instrument, Pays, Statut, Durée, Rendement ≥ — menus à cases avec compteur) et une recherche plein texte ; trois vues des mêmes lignes : **Tableau** (défaut sur ordinateur, plat, triable par en-tête), **Liste** (défaut sur mobile) et **Cartes**. Filtres, tri, sens et vue vivent dans l'URL (`?instrument=OTA,MARCHE&statut=open&tri=yield&sens=desc&vue=table`), donc une vue filtrée se partage sur WhatsApp.
- Ce que chaque ligne affiche par instrument (chiffre-héros, condition, coupon, échéance, minimum, action) est calculé une fois dans `src/lib/domain/summary.ts` et partagé par les trois vues.
- Typographie : une seule famille (Manrope, chiffres tabulaires) ; l'or est réservé au rendement actionnable, le navy à la barre et au bouton principal, les couleurs de statut aux pastilles.

## Structure

```
src/
  app/                 pages (App Router) : / guichet, /offres/[id] fiche, /simulateur, /desk
  components/          OfferBrowser (filtres, tri), OfferCard, IntentForm, FlowsChart, Simulator
  lib/finance.ts       arithmétique obligataire (Exact/Exact, BTA précompté, TRI) — testée
  lib/domain/          types, statut dérivé, intentions (cycle de vie), estimation
  lib/data/            Repository : memory (seed) | supabase — choisi par l'env
  data/seed.ts         offres de septembre 2026 (communiqués RCA, Congo, BHC)
supabase/migrations/   schéma SQL (offers, offer_versions, intents, events, RLS, realtime)
```

## Boîte d’entrée : courriel et WhatsApp

- `src/lib/intake/ingest.ts` : une seule porte d’entrée (`ingestSource`) pour un dépôt manuel, un courriel ou un document WhatsApp — original conservé, extraction, item dans « À valider » (ou « À compléter » si la source n’est pas officielle). Expéditeurs de confiance : `INTAKE_TRUSTED_SENDERS`.
- `POST /api/inbound/email` (`INBOUND_SECRET`) : message brut MIME (`postal-mime`) ou JSON ; une source par pièce jointe PDF / image. Branchement Cloudflare Email Routing dans OPERATIONS.md.
- Webhook WhatsApp : un document ou une image envoyés par un numéro de l’équipe deviennent une source (téléchargement via l’API Graph) ; d’un client, ils sont signalés dans le flux.
- L’extracteur reçoit les types de produits du référentiel (clé, moteur, champs libres) et remplit `typeKey` / `extra` du brouillon.

## Intake « À valider » (desk)

- Une source (PDF, photo, e-mail collé) est déposée depuis **/desk/a-valider → Nouvelle source**. L'original est conservé (`.uploads/` en démo, bucket privé `sources` sur Supabase).
- Avec `ANTHROPIC_API_KEY` dans `.env.local`, les champs sont extraits par Claude (`src/lib/intake/extract.ts`, sorties structurées) avec une confiance par champ : vert = lu, orange = déduit (à vérifier), rouge = absent. Sans clé, le desk saisit les champs à la main.
- Le desk fixe **prix (ou taux indicatif), commission, ticket minimum, segment, canaux** ; l'aperçu client se recalcule en direct. **Publier** crée ou met à jour l'offre (version +1, horodatage) et journalise la diffusion. Une photo ou un message transféré reste **bloqué** tant que « source officielle jointe » n'est pas coché.
- Tester l'extracteur hors application : `npm run extract:test -- "chemin/communique.pdf"`.

## Documents (desk)

- PDF sur papier à en-tête, rendus côté serveur (`@react-pdf/renderer`, polices intégrées) depuis les lignes : `src/lib/documents/pdf/templates.tsx` (bulletin d'ordre, appel de fonds, ordre de cession, avis de résultat / non-allocation, avis d'opéré, bordereau SVT + annexe par client). Les montants viennent d'un seul calcul, `src/lib/documents/position.ts`.
- **Déclenchés par le cycle de vie** (`docsForTransition`) : confirmée → bulletin + appel de fonds (ou ordre de cession) ; servie / non servie → avis ; réglée → avis d'opéré. Le bordereau se génère depuis **/desk/documents** par adjudication et passe les ordres en « transmise ».
- Numérotation `PC-<PREFIXE>-<année>-<n>`, original conservé (`docs/…pdf`), états généré → envoyé (WhatsApp / e-mail) → signé. Un client ne voit que ses documents (`/desk/documents/pdf/[id]`, RLS sur `documents`).
- Coordonnées de règlement : `SETTLEMENT_BANK` / `SETTLEMENT_IBAN` ; SVT par pays dans `src/lib/config.ts`.

## Diffusion (WhatsApp, e-mail)

- `src/lib/notify` : `compose.ts` (les textes : offre publiée, accusé de réception, mises à jour du cycle, envoi de document), `providers.ts` (WhatsApp Cloud API : modèles, texte libre, document ; e-mail via Resend), `dispatch.ts` (destinataires par opt-in / canal préféré, journalisation dans `notifications`).
- Contrôle sanctions / PPE : attestation obligatoire du desk avant approbation ; pré-contrôle OpenSanctions optionnel (`OPENSANCTIONS_API_KEY`).
- **Sans identifiants, rien ne part** : chaque message est enregistré « préparé » et visible dans le panneau *Diffusion* du desk, avec le texte exact. Renseigner `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` (+ modèles approuvés) et `RESEND_API_KEY` / `EMAIL_FROM` pour envoyer.
- Déclencheurs : publication (segment + canaux cochés), intention reçue (accusé sur le canal choisi), transition du carnet (confirmée, transmise, servie…), bouton « Envoyé · WhatsApp / E-mail » d'un document (PDF joint).
- Webhook entrant : `/api/whatsapp/webhook` (vérification `WHATSAPP_VERIFY_TOKEN`, messages entrants journalisés dans le flux du desk).
- Le desk se rafraîchit seul : Realtime Supabase (`intents`, `events`) ou toutes les 20 s en démo. Les clients ont leur espace **/moi** (intentions, états, documents).

## Onboarding, KYC, compte-titres

- **/ouvrir-un-compte** (client) : type (physique, morale, groupement, institutionnel), identité, personnes (représentants, mandataires, bénéficiaires effectifs), pièces en photo (liste par type, `src/lib/kyc/checklist.ts`), origine des fonds, PPE, questionnaire investisseur, consentements, **acceptation de la convention par code** (WhatsApp / e-mail, affiché en démo). Soumission bloquée tant que le dossier est incomplet.
- **/desk/clients** : file des dossiers, contrôles automatiques (majorité, validité de la pièce, complétude, PPE ; sanctions à brancher), pièces à vérifier, notation de risque (suggérée), décision : approuver (→ niveau 2, convention signée + dossier d'ouverture SVT générés, client prévenu), compléments, refus. Revue périodique 1 / 3 / 5 ans selon le risque.
- Une prise ferme reste possible au niveau 1 : l'intention est gardée et marquée « compte-titres à ouvrir », le client est renvoyé vers l'ouverture de compte, le desk voit l'alerte.
- Niveau de relation dans la session (`tier`) : 1 identifié, 2 compte ouvert ; `profiles.tier` sur Supabase, dossier `client_files` (migration 0006, bucket `kyc`).
- **Structure de compte : nominative** (décision du 14 sept. 2026). Un dossier approuvé devient un compte *actif* (niveau 2, prises fermes) quand le SVT retourne le numéro de sous-compte, saisi dans Desk › Clients. Le numéro figure sur les bulletins et dans l'annexe du bordereau. **Groupements** (décision du 14 sept. 2026) : les deux formes sont admises ; l'indivision de mandataires est plafonnée à **25 M FCFA** de nominal (`INDIVISION_CEILING`, contrôle à la soumission du dossier, dans la revue desk et sur chaque prise ferme cumulée aux positions) ; au-delà, association déclarée obligatoire.

## Résultats, règlement, positions (desk › Résultats & positions)

- Positions valorisées au dernier cours de clôture BVMAC (ligne cotée de même ISIN) ou à la dernière VL (`marketValue`, `valuedOn`) ; `/moi` propose « Vendre » / « Racheter » pré-rempli avec la quantité détenue (`?intent=vente&qty=`), le formulaire affiche la détention et un raccourci « tout vendre ». Le RIB du compte de règlement (dossier KYC, étape « Fonds & profil ») est imprimé sur les ordres de cession, demandes de rachat, avis d'opéré de vente et le bordereau de centralisation.

- **Résultats** : par adjudication, prix (ou taux) servi par ligne et allocation (%) par ordre transmis ; un seul envoi passe les ordres en servie / non servie, fixe `servedPricePct` sur l'offre, génère les avis et prévient les clients (`src/lib/results/service.ts`).
- **Règlement** : un clic passe les ordres servis en réglée, l'offre en « en vie », génère les avis d'opéré.
- **Positions** : dérivées des ordres réglés (jamais stockées) — `src/lib/positions.ts` ; visibles dans *Mon espace* et sur le desk avec les flux à venir. Le segment « Porteurs de la ligne » des diffusions se résout sur ces positions.
- **Avis de coupon** : `/api/cron/coupons` (J-3 et jour J, idempotent), planifié dans `vercel.json` ; protégé par `CRON_SECRET`.

## Robot WhatsApp

- `src/lib/bot/reply.ts` répond aux messages entrants (webhook) avec Claude en sortie structurée : réponse, besoin de rappel, intention détectée. Il connaît le glossaire, les offres publiées (chiffres calculés, jamais inventés), les intentions et positions de l'expéditeur. Il ne conseille pas, ne promet rien, ne parle pas des autres clients ; prise ferme et cession = appétit enregistré + rappel d'un conseiller.
- STOP / START gèrent l'opt-in WhatsApp. `BOT_ENABLED=0` coupe le robot (les messages restent journalisés).
- Banc d'essai : **/desk/robot** — tester un message comme un client, sans envoi.

## Déploiement

Pas à pas complet dans [DEPLOY.md](DEPLOY.md).

1. **Supabase** : projet, migrations `0001` → `0011` dans l'ordre, `seed.sql` (optionnel), Auth › Email (code `{{ .Token }}`), Auth › Phone si `PHONE_OTP_ENABLED=1`, URL de redirection `/auth/callback`.
2. **Vercel** (ou tout hôte Node) : importer le dépôt, renseigner les variables de `.env.example` (Supabase, `AUTH_SECRET`, `DESK_EMAILS`, `ANTHROPIC_API_KEY`, WhatsApp, Resend, `SETTLEMENT_*`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`). `vercel.json` planifie les avis de coupon.
3. **Meta** : application WhatsApp Business, numéro, webhook `https://<domaine>/api/whatsapp/webhook` avec `WHATSAPP_VERIFY_TOKEN`, modèles `guichet_offre` (4 paramètres) et `guichet_maj` (2) soumis à approbation.
4. Vérifier : `npm run build`, puis /connexion, /desk (rôle desk via `DESK_EMAILS`), une publication depuis /desk/a-valider, une intention depuis une fiche.

## Marché secondaire (desk › Marché)

- **Bulletin Officiel de la Cote (BVMAC), ingéré automatiquement.** La BVMAC n'a pas d'API ; elle publie chaque jour de bourse un PDF à une adresse déterministe (`https://www.bvm-ac.org/wp-content/uploads/AAAA/MM/BOC-AAAAMMJJ.pdf`). `/api/cron/boc` (18 h 30 UTC, jours ouvrés, `vercel.json`, protégé par `CRON_SECRET`) télécharge le bulletin du jour et rattrape les séances de la semaine non encore lues ; le texte est extrait en Node (`pdf-parse`), lu par un parseur déterministe testé sur un bulletin réel (`src/lib/market/boc-parse.ts`), validé (seuils, dates, écarts > 15 % avec la veille, lignes disparues) puis versé dans l'historique des cotations (`quotes`), des VL d'OPCVM (`fund_navs`) et le registre des bulletins (`market_bulletins`). Le PDF est conservé (`sources/boc/`).
- Chaque action et obligation cotée devient une ligne du Guichet (`kind: MARCHE`, id `boc-<isin>`) avec la clôture du jour, le n° de bulletin en source et la commission par défaut (1 % actions, 0,5 % obligations) ; les lignes existantes sont rafraîchies sans perdre les réglages du desk (commission, fourchette acheteur / vendeur). Le desk peut **masquer** une ligne. La fiche affiche l'historique des clôtures (courbe, seuils, volumes, coupon couru) avec l'attribution « BOC n° … ».
- Le panneau *Marché* montre le dernier bulletin (indice BVMAC All Share, lignes lues, anomalies à vérifier, avis publiés), permet de relancer une séance ou de **déposer le PDF** reçu par e-mail en secours ; la saisie manuelle d'un cours reste possible mais est marquée « Saisie desk » sur la fiche.
- Ordres d'achat / vente : quantité, prix limite facultatif (marché sinon), compte-titres requis, vente limitée aux titres détenus. Cycle : reçu → confirmé (ordre de bourse + appel de fonds) → placé → **exécuté** (prix et quantité, partiel possible) → **réglé** (avis d'opéré). Les positions sont nettées des ventes (FIFO).

## Sociétés cotées (page Sociétés)

- `src/data/companies.ts` : les 7 émetteurs du compartiment actions (identité, actionnariat, dirigeants, documents publiés sur bvm-ac.org) et leurs **chiffres clés certifiés** par exercice (total bilan, fonds propres, chiffre d'affaires / PNB / primes, valeur ajoutée, résultat net, dividende) relevés dans les fiches signalétiques et états financiers — source citée par année.
- `src/lib/companies/analysis.ts` : ratios (PER, rendement, distribution, marge, ROE, cours / fonds propres, flottant) avec leur lecture en français courant, phrase de synthèse, commentaires ; `pricePeriod` / `periodComment` pour le cours sur une période. Pages `/societes` (tableau comparatif) et `/societes/[mnemo]` (cours sur 1 mois → max, graphiques CA / résultat et bilan / fonds propres, tableau des comptes, ratios, actionnariat, documents) ; rapport PDF `/societes/[mnemo]/rapport?p=`.
- Le bulletin BVMAC fournit aussi la **capitalisation** (actions flottantes / totales, dernier dividende et sa date, liquidité 3 mois, BNPA) — `quotes` (migration 0012) ; `/api/cron/boc?from=&to=` rejoue l'historique (cours et VL, PDF non archivés) et le parseur lit les mises en page 2026 antérieures (lignes actions et obligataires « denses »).
- `src/lib/companies/collect.ts` + `/api/cron/emetteurs` (lundi 6 h UTC) : les documents des sociétés cotées publiés sur bvm-ac.org sont catalogués (`issuer_documents`) et archivés dans `sources/issuers/<MNEMO>/` ; un nouveau document alerte le desk pour mettre à jour `companies.ts`.

## OPCVM (page Fonds, desk › Marché)

- Les 45 fonds dont la VL paraît au bulletin deviennent des lignes `kind: FONDS` (id `fund-<clé>`, champ `fund` : société de gestion, dépositaire, catégorie, périodicité, VL, origine, performance) — **masquées** tant qu'aucune convention de distribution n'existe. La page publique `/fonds` les présente tous (VL, variation, depuis l'origine, société de gestion) ; un fonds non distribué reçoit des intentions « information / rappel » seulement.
- Le desk active un fonds dans *Marché › OPCVM* : case « distribué », référence de la convention (obligatoire), droits d'entrée / de sortie, minimum, heure de centralisation. Le fonds passe alors « Souscription ouverte » dans le Guichet.
- Intentions `souscription` (montant FCFA, minimum du fonds) et `rachat` (nombre de parts, limité aux parts détenues) — réservées aux dossiers KYC approuvés (les parts sont inscrites au nom du client au registre du dépositaire, pas de sous-compte SVT). Cycle identique aux ordres de bourse : confirmé (bulletin de souscription + appel de fonds, ou demande de rachat) → transmis → **exécuté** à la VL retenue (VL et parts saisies par le desk d'après l'avis de la société de gestion) → **réglé** (avis d'opération). Positions en parts, valorisées à la VL de la dernière exécution.
- **Bordereau de centralisation** par société de gestion (`generateFundBordereau`) : tous les ordres confirmés / transmis de ses fonds, porteurs et références de registre, espèces réglées par Purpose Capital.
- Modèles PDF dédiés dans `src/lib/documents/pdf/fund-templates.tsx` (aucune mention d'adjudication ni de SVT).

## Reporting (desk › Reporting)

- **Rapport d'activité périodique (PDF)** : `/desk/reporting/pdf?from&to` — synthèse (intentions, ordres, règlements par instrument et segment, comptes ouverts, encours valorisé), journal des ordres, clientèle et conformité (types, risques, attestations sanctions, revues échues), positions en conservation, bulletins BVMAC utilisés. Rendu à la demande depuis les mêmes lignes que la page, jamais saisi.

- Journal des ordres sur une période avec l'horodatage de chaque étape (reçu, confirmé, transmis, exécuté, réglé), registre des clients (statut, risque, revue, contrôle sanctions), positions en conservation, statistiques d'activité (intentions, montants, règlements par instrument et par segment, comptes ouverts, documents, diffusion).
- Exports CSV (`/desk/reporting/export?type=ordres|clients|positions`) au format Excel français (BOM, point-virgule). Tout est recalculé depuis les lignes : reproductible, jamais saisi à la main.

## Référentiel (desk › Référentiel)

Ce que l’application sait sans qu’on touche au code, édité dans l’app par le desk et stocké dans la table `reference` (`kind`, `key`, `data` jsonb, `updated_by`). Chaque entrée part d’une valeur par défaut livrée dans le code (`src/lib/registry.ts`, `src/data/bond-terms.ts`, `src/lib/glossary.ts`, `src/data/companies.ts`, `src/data/issuers.ts`) ; une ligne enregistrée par le desk prend le dessus, « revenir aux valeurs par défaut » la supprime, « importer les valeurs par défaut » copie les valeurs manquantes dans la table pour les éditer.

- **Types de produits** : clé, libellé, badge, marché (primaire / secondaire / fonds), moteur de calcul (obligation in fine, amortissable, bon précompté, action, part de fonds, rachat au pair, information seule), couleurs, « à garder en tête » de la fiche, liste de contrôle avant publication, intentions ouvertes au client, champs libres affichés sur la fiche. Un nouveau produit = un type de plus, sans code, tant qu’un moteur existant convient ; seul un nouveau moteur demande du développement.
- **Échéanciers** : date exacte, périodicité et différé des obligations cotées (le bulletin ne donne que l’année).
- **Glossaire** : les bulles « i ».
- **Sociétés cotées / émetteurs** : fiches complètes (chiffres, actionnariat, documents, lecture), éditées en JSON et vérifiées champ par champ à l’enregistrement.

Le registre est chargé une fois par requête (`loadRegistry()` dans `src/lib/reference.ts`), installé côté serveur et envoyé au navigateur par `RegistryProvider` ; les actions serveur et les crons l’appellent avant de lire un type. À la publication, `offers.type_key` mémorise le type et `offers.extra` les champs libres ; la liste de contrôle du type et ses champs obligatoires bloquent « Publier ».

## Cycle de vie d'une ligne (jamais de suppression)

```
source reçue ──► à valider ──► (en revue) ──► publié ──► clôturé / résultats ──► en vie ──► échu
                   │                             │
                   └─► rejeté (rouvrable)        └─► retiré (remise en ligne possible)
```

- **À valider → en revue** : l'opérateur demande une relecture avec une note ; le relecteur publie ou **renvoie en correction** (note). La personne qui a demandé la relecture ne peut pas publier ce brouillon.
- **Publier** exige : source officielle jointe, champs obligatoires, liste de contrôle du type cochée, champs libres requis, et la fenêtre déléguée (sinon approbation).
- **Retirer** (desk › ligne › Historique) : statut `withdrawn`, ligne masquée, fiche client remplacée par un avis ; intentions, versions et audit conservés. **Remettre en ligne** suit la règle des quatre yeux. Rien n'est jamais supprimé — ni source, ni ligne, ni intention.
- États dérivés (clôturé, résultats, en vie, échu) viennent des dates et des résultats saisis, pas d'une action manuelle.

## Contrôle : audit, versions, verrou, quatre yeux

- **Piste d'audit** (`audit`, desk › Journal) : une ligne par action métier — qui (session), quoi (`offer.publish`, `offer.quote`, `intent.transition`, `reference.upsert`, `staff.role`, `approval.*`…), l'enregistrement avant / après, le motif, l'adresse IP et le navigateur. Chaînée par empreinte SHA-256 (`prev_hash` → `hash`) ; un déclencheur refuse toute modification ou suppression, clé service comprise. Le journal affiche « chaîne intègre / rompue ». Distinct du flux `events` (lisible, à destination du desk).
- **Versions** (`offer_versions.snapshot`, desk › ligne › Historique) : chaque publication ou saisie garde la fiche complète ; la page montre les différences champ par champ entre versions et permet de **restaurer** une version (nouvelle version, motif obligatoire, jamais d'effacement).
- **Verrou optimiste** : les formulaires portent la version affichée ; `upsertOffer(offer, { expectedVersion })` refuse (`ConflictError`) si quelqu'un a enregistré entre-temps — message « rechargez la page ».
- **Quatre yeux sans goulot** (desk › Approbations) : le responsable délègue une fenêtre (prix OTA/APE, taux BTA, écart de cours, frais de fonds — table `reference`, kind `policy`). Dedans, l'opérateur publie seul ; dehors, sa proposition va dans `approvals` avec l'avant / après, et un **autre** responsable l'approuve (écrit la version, notifie) ou la refuse avec une note. Le responsable publie directement. Une restauration suit la même règle.

## Authentification et rôles

- `src/lib/auth` expose `getSession()`, `requireSession()`, `requireDesk()` ; un seul contrat pour Supabase Auth (e-mail OTP / lien magique) et la session de démonstration.
- `/desk/*` est protégé par `src/proxy.ts` (anonyme → /connexion) et par `src/app/desk/layout.tsx` (rôle desk). Les actions serveur revérifient.
- Une intention porte `client_id` = utilisateur connecté ; sans session, le formulaire renvoie vers /connexion puis revient sur la fiche.
- Rôles : `profiles.role` = `client` | `desk` (opérateur) | `responsable` (opérateur + équipe + approbations). `requireDesk()` accepte les deux niveaux desk, `requireResponsable()` le second. Le système (crons, robot) n'est pas un utilisateur : `CRON_SECRET` et la clé service.
- **Équipe** (desk › Équipe, responsable seulement) : donner / changer / retirer l'accès desk d'un compte existant, jamais le sien, jamais le dernier responsable ; chaque changement est journalisé dans `events`. `DESK_EMAILS` ne sert qu'à l'amorçage : une adresse listée devient responsable à sa première connexion (persisté), puis la variable peut être vidée.
- **Second facteur** obligatoire pour le desk (TOTP via Supabase Auth, aucun service tiers) : première entrée sur /desk → `/connexion/mfa?enrol=1` (QR à scanner, code de confirmation), ensuite un code à 6 chiffres à chaque connexion (`aal2`). `DESK_MFA=off` désactive la contrainte (amorçage, incident) — à ne pas laisser en production.
- Niveaux 0/1/2 (visiteur, identifié, compte ouvert) dans `profiles.tier` — la prise ferme exigera le niveau 2 après l'onboarding.
- Connexion par téléphone (SMS ou WhatsApp via le fournisseur configuré dans Supabase) : `PHONE_OTP_ENABLED=1`, `PHONE_OTP_CHANNEL=sms|whatsapp`.

## Principes

- **Une offre se lit, ne se simule pas.** Le prix Purpose est fixé par le desk et versionné ; la fiche montre un bloc de référence au prix publié. Le simulateur est une page séparée, sans lien avec les offres en cours.
- **Une intention est une ligne**, quel que soit le canal. Son cycle : `recue → confirmee → transmise → servie | non_servie → reglee`. Chaque transition est journalisée dans `events`.
- **Le desk ne saisit que trois choses** : prix / ticket minimum à la publication (aucune commission affichée au client pour l’instant), le montant confirmé, des notes. Tout le reste est dérivé — et ce qui décrit un produit (type, échéancier, glossaire, fiches) se maintient dans le Référentiel, pas dans le code.

## Prochaines étapes

1. Vérification d'identité automatisée (Smile ID) dans la revue KYC.
2. Virement automatique des produits de rachat depuis le RIB du dossier (fichier de virement bancaire).
3. Rapport d'activité périodique en PDF (COSUMAF) à partir du reporting.

### Migration 0013 — contact sur l'intention

`supabase/migrations/0013_intent_contact.sql` ajoute `contact_phone` / `contact_email` sur `intents` (le numéro ou l'e-mail que le client donne avec son intention). Tant qu'elle n'est pas appliquée, l'app garde le contact dans le message de l'intention et l'indique dans les logs.

`node scripts/seed-supabase.ts` charge les offres d'exemple (OTA, BTA, IPO, rachats) dans le projet Supabase de `.env.local` sans toucher aux lignes du BOC.

### Échéanciers des obligations cotées

`src/data/bond-terms.ts` porte, par ISIN, la date d'échéance exacte, la périodicité et le différé d'amortissement lus sur les fiches signalétiques publiées par la BVMAC (Espace émetteurs › Émetteurs obligations, images JPG). Le rendement actuariel d'une ligne cotée se calcule alors sur son vrai échéancier (`amortCalc`) ; sans fiche, il reste calculé in fine au 31 décembre de l'année imprimée au BOC et signalé « ≈ ». À mettre à jour à chaque nouvelle fiche (l'État du Congo — EOCG 2021-2026 — manque encore).

### Messages automatiques

- 06:30 lun–ven `/api/cron/point` : point du matin du desk (clôtures du jour et du lendemain, intentions reçues, en attente, dernier bulletin, santé) — e-mail à `DESK_EMAILS` quand Resend est configuré, journal et notifications sinon.
- 07:15 `/api/cron/suivi` : lignes suivies — un message WhatsApp + e-mail au client quand le rendement, le cours, le prix ou le statut d'une ligne qu'il suit a changé (table `watchlist`, migration 0014 ; valeurs d'énumération `watch` / `digest`, migration 0015).
