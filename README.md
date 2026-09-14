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

## Authentification et rôles

- `src/lib/auth` expose `getSession()`, `requireSession()`, `requireDesk()` ; un seul contrat pour Supabase Auth (e-mail OTP / lien magique) et la session de démonstration.
- `/desk/*` est protégé par `src/proxy.ts` (anonyme → /connexion) et par `src/app/desk/layout.tsx` (rôle desk). Les actions serveur revérifient.
- Une intention porte `client_id` = utilisateur connecté ; sans session, le formulaire renvoie vers /connexion puis revient sur la fiche.
- Rôle : `profiles.role` ; amorçage par `DESK_EMAILS`. Niveaux 0/1/2 (visiteur, identifié, compte ouvert) dans `profiles.tier` — la prise ferme exigera le niveau 2 après l'onboarding.
- Connexion WhatsApp/SMS OTP : à activer dans Supabase (fournisseur SMS) — le code est prêt à l'accueillir via `signInWithOtp({ phone })`.

## Principes

- **Une offre se lit, ne se simule pas.** Le prix Purpose est fixé par le desk et versionné ; la fiche montre un bloc de référence au prix publié. Le simulateur est une page séparée, sans lien avec les offres en cours.
- **Une intention est une ligne**, quel que soit le canal. Son cycle : `recue → confirmee → transmise → servie | non_servie → reglee`. Chaque transition est journalisée dans `events`.
- **Le desk ne saisit que trois choses** : prix / commission / ticket minimum à la publication, le montant confirmé, des notes. Tout le reste est dérivé.

## Prochaines étapes

1. Diffusion WhatsApp (Cloud API) et e-mail à la publication ; Realtime sur le desk.
2. Onboarding client, KYC, ouverture de compte-titres.
