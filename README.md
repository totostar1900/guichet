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
- **Sans identifiants, rien ne part** : chaque message est enregistré « préparé » et visible dans le panneau *Diffusion* du desk, avec le texte exact. Renseigner `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` (+ modèles approuvés) et `RESEND_API_KEY` / `EMAIL_FROM` pour envoyer.
- Déclencheurs : publication (segment + canaux cochés), intention reçue (accusé sur le canal choisi), transition du carnet (confirmée, transmise, servie…), bouton « Envoyé · WhatsApp / E-mail » d'un document (PDF joint).
- Webhook entrant : `/api/whatsapp/webhook` (vérification `WHATSAPP_VERIFY_TOKEN`, messages entrants journalisés dans le flux du desk).
- Le desk se rafraîchit seul : Realtime Supabase (`intents`, `events`) ou toutes les 20 s en démo. Les clients ont leur espace **/moi** (intentions, états, documents).

## Onboarding, KYC, compte-titres

- **/ouvrir-un-compte** (client) : type (physique, morale, groupement, institutionnel), identité, personnes (représentants, mandataires, bénéficiaires effectifs), pièces en photo (liste par type, `src/lib/kyc/checklist.ts`), origine des fonds, PPE, questionnaire investisseur, consentements, **acceptation de la convention par code** (WhatsApp / e-mail, affiché en démo). Soumission bloquée tant que le dossier est incomplet.
- **/desk/clients** : file des dossiers, contrôles automatiques (majorité, validité de la pièce, complétude, PPE ; sanctions à brancher), pièces à vérifier, notation de risque (suggérée), décision : approuver (→ niveau 2, convention signée + dossier d'ouverture SVT générés, client prévenu), compléments, refus. Revue périodique 1 / 3 / 5 ans selon le risque.
- Une prise ferme reste possible au niveau 1 : l'intention est gardée et marquée « compte-titres à ouvrir », le client est renvoyé vers l'ouverture de compte, le desk voit l'alerte.
- Niveau de relation dans la session (`tier`) : 1 identifié, 2 compte ouvert ; `profiles.tier` sur Supabase, dossier `client_files` (migration 0006, bucket `kyc`).
- **Structure de compte : nominative** (décision du 14 sept. 2026). Un dossier approuvé devient un compte *actif* (niveau 2, prises fermes) quand le SVT retourne le numéro de sous-compte, saisi dans Desk › Clients. Le numéro figure sur les bulletins et dans l'annexe du bordereau. Décision encore ouverte : forme des groupements (association déclarée ou indivision de mandataires) — champ `legalForm`.

## Résultats, règlement, positions (desk › Résultats & positions)

- **Résultats** : par adjudication, prix (ou taux) servi par ligne et allocation (%) par ordre transmis ; un seul envoi passe les ordres en servie / non servie, fixe `servedPricePct` sur l'offre, génère les avis et prévient les clients (`src/lib/results/service.ts`).
- **Règlement** : un clic passe les ordres servis en réglée, l'offre en « en vie », génère les avis d'opéré.
- **Positions** : dérivées des ordres réglés (jamais stockées) — `src/lib/positions.ts` ; visibles dans *Mon espace* et sur le desk avec les flux à venir. Le segment « Porteurs de la ligne » des diffusions se résout sur ces positions.
- **Avis de coupon** : `/api/cron/coupons` (J-3 et jour J, idempotent), planifié dans `vercel.json` ; protégé par `CRON_SECRET`.

## Robot WhatsApp

- `src/lib/bot/reply.ts` répond aux messages entrants (webhook) avec Claude en sortie structurée : réponse, besoin de rappel, intention détectée. Il connaît le glossaire, les offres publiées (chiffres calculés, jamais inventés), les intentions et positions de l'expéditeur. Il ne conseille pas, ne promet rien, ne parle pas des autres clients ; prise ferme et cession = appétit enregistré + rappel d'un conseiller.
- STOP / START gèrent l'opt-in WhatsApp. `BOT_ENABLED=0` coupe le robot (les messages restent journalisés).
- Banc d'essai : **/desk/robot** — tester un message comme un client, sans envoi.

## Déploiement

1. **Supabase** : projet, migrations `0001` → `0007` dans l'ordre, `seed.sql` (optionnel), Auth › Email (code `{{ .Token }}`), Auth › Phone si `PHONE_OTP_ENABLED=1`, URL de redirection `/auth/callback`.
2. **Vercel** (ou tout hôte Node) : importer le dépôt, renseigner les variables de `.env.example` (Supabase, `AUTH_SECRET`, `DESK_EMAILS`, `ANTHROPIC_API_KEY`, WhatsApp, Resend, `SETTLEMENT_*`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`). `vercel.json` planifie les avis de coupon.
3. **Meta** : application WhatsApp Business, numéro, webhook `https://<domaine>/api/whatsapp/webhook` avec `WHATSAPP_VERIFY_TOKEN`, modèles `guichet_offre` (4 paramètres) et `guichet_maj` (2) soumis à approbation.
4. Vérifier : `npm run build`, puis /connexion, /desk (rôle desk via `DESK_EMAILS`), une publication depuis /desk/a-valider, une intention depuis une fiche.

## Authentification et rôles

- `src/lib/auth` expose `getSession()`, `requireSession()`, `requireDesk()` ; un seul contrat pour Supabase Auth (e-mail OTP / lien magique) et la session de démonstration.
- `/desk/*` est protégé par `src/proxy.ts` (anonyme → /connexion) et par `src/app/desk/layout.tsx` (rôle desk). Les actions serveur revérifient.
- Une intention porte `client_id` = utilisateur connecté ; sans session, le formulaire renvoie vers /connexion puis revient sur la fiche.
- Rôle : `profiles.role` ; amorçage par `DESK_EMAILS`. Niveaux 0/1/2 (visiteur, identifié, compte ouvert) dans `profiles.tier` — la prise ferme exigera le niveau 2 après l'onboarding.
- Connexion par téléphone (SMS ou WhatsApp via le fournisseur configuré dans Supabase) : `PHONE_OTP_ENABLED=1`, `PHONE_OTP_CHANNEL=sms|whatsapp`.

## Principes

- **Une offre se lit, ne se simule pas.** Le prix Purpose est fixé par le desk et versionné ; la fiche montre un bloc de référence au prix publié. Le simulateur est une page séparée, sans lien avec les offres en cours.
- **Une intention est une ligne**, quel que soit le canal. Son cycle : `recue → confirmee → transmise → servie | non_servie → reglee`. Chaque transition est journalisée dans `events`.
- **Le desk ne saisit que trois choses** : prix / commission / ticket minimum à la publication, le montant confirmé, des notes. Tout le reste est dérivé.

## Prochaines étapes

1. Screening sanctions / PPE (OpenSanctions) et vérification d'identité (Smile ID) dans la revue KYC.
2. Marché secondaire : cotations BVMAC, ordres d'achat / vente hors adjudication.
3. Reporting COSUMAF : journal des ordres exportable, statistiques d'activité.
