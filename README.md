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

Sans configuration, l'app tourne sur le jeu de données de `src/data/seed.ts` (mention « démo · mémoire » dans l'en-tête). Les intentions créées sont visibles dans le desk jusqu'au redémarrage.

## Brancher Supabase

1. Créer un projet sur supabase.com (région EU-West ou la plus proche).
2. SQL Editor → coller `supabase/migrations/0001_init.sql`, exécuter ; puis `supabase/seed.sql`.
3. Copier `.env.example` en `.env.local` et remplir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project settings → API). La clé service role ne quitte jamais le serveur.
4. Redémarrer `npm run dev` — la mention « démo · mémoire » disparaît.

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

## Principes

- **Une offre se lit, ne se simule pas.** Le prix Purpose est fixé par le desk et versionné ; la fiche montre un bloc de référence au prix publié. Le simulateur est une page séparée, sans lien avec les offres en cours.
- **Une intention est une ligne**, quel que soit le canal. Son cycle : `recue → confirmee → transmise → servie | non_servie → reglee`. Chaque transition est journalisée dans `events`.
- **Le desk ne saisit que trois choses** : prix / commission / ticket minimum à la publication, le montant confirmé, des notes. Tout le reste est dérivé.

## Prochaines étapes

1. Auth (OTP WhatsApp / lien magique) et rattachement des intentions à un client.
2. Desk « À valider » : intake des communiqués (e-mail, PDF, photo) → extraction → publication.
3. Documents : bulletin d'ordre, appel de fonds, bordereau SVT, avis de résultat, avis d'opéré.
4. Diffusion WhatsApp (Cloud API) et e-mail à la publication ; Realtime sur le desk.
5. Onboarding client, KYC, ouverture de compte-titres.
