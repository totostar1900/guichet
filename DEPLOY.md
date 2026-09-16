# Mettre Guichet en ligne — 30 minutes

Tout ce qui suit demande vos identifiants (Supabase, Vercel, Meta, Resend) : c'est à vous de les saisir, jamais dans le code. Le dépôt est prêt ; `npm run build` passe.

## 1. Supabase (10 min)

1. https://supabase.com → *New project* (région Europe de l'Ouest, mot de passe base noté quelque part).
2. *SQL Editor* → exécuter, dans l'ordre, chaque fichier de `supabase/migrations/` (`0001_init.sql` … `0011_opcvm.sql`). Chaque fichier se colle tel quel et s'exécute en une fois.
3. *Storage* → créer le bucket privé **`sources`** (PDF des bulletins, documents générés, pièces KYC).
4. *Authentication › Providers › Email* : activer, modèle « Magic Link » remplacé par un code : mettre `{{ .Token }}` dans le corps. *URL Configuration* : Site URL = `https://<votre-domaine>`, Redirect URL = `https://<votre-domaine>/auth/callback`.
5. *Project Settings › API* : copier `Project URL`, `anon public`, `service_role` (secret).
6. (facultatif) `npm run seed:sql > seed.sql` puis exécuter ce fichier pour retrouver les offres de démonstration.

## 2. Vercel (10 min)

1. https://vercel.com/new → *Import Git Repository* → `totostar1900/guichet` (GitHub). Framework détecté : Next.js ; ne rien changer.
2. *Environment Variables* — coller les valeurs (les noms sont ceux de `.env.example`) :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `AUTH_SECRET` | 32 caractères aléatoires (`openssl rand -base64 32`) |
| `DESK_EMAILS` | e-mails du desk, séparés par des virgules |
| `CRON_SECRET` | 32 caractères aléatoires — Vercel l'envoie automatiquement en `Authorization: Bearer` aux crons |
| `NEXT_PUBLIC_APP_URL` | `https://<votre-domaine>` |
| `ANTHROPIC_API_KEY` | clé console.anthropic.com (extraction des communiqués, robot) |
| `SETTLEMENT_BANK`, `SETTLEMENT_IBAN` | compte de règlement clients (imprimés sur les appels de fonds) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | Meta (étape 3) — laisser vide pour l'instant : les messages sont journalisés « préparés » |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend — idem |

3. *Deploy*. À la fin : `https://guichet-<xxx>.vercel.app`. Ajouter votre domaine dans *Settings › Domains* et reporter l'URL dans `NEXT_PUBLIC_APP_URL` et dans Supabase (étape 1.4).
4. Les deux tâches planifiées de `vercel.json` sont créées automatiquement (*Settings › Cron Jobs*) :
   - `/api/cron/boc` — 18 h 30 UTC du lundi au vendredi : bulletin BVMAC du jour + rattrapage de la semaine ;
   - `/api/cron/coupons` — 7 h 00 UTC : avis de coupon J-3 et J.
   Plan Hobby : les crons tournent une fois par jour au plus, ce qui suffit ici. Pour un premier passage sans attendre 18 h 30 : *Cron Jobs › Run* ou `curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/boc`.

## 3. Meta WhatsApp Business (quand vous voulez ouvrir le canal)

1. developers.facebook.com → app *Business* → produit *WhatsApp* → numéro de production.
2. *Configuration › Webhook* : `https://<domaine>/api/whatsapp/webhook`, jeton = `WHATSAPP_VERIFY_TOKEN`, abonnement `messages`.
3. Modèles à soumettre : `guichet_offre` (4 variables : titre, accroche, clôture, lien) et `guichet_maj` (2 : nom, texte).
4. Reporter `WHATSAPP_TOKEN` (jeton système permanent) et `WHATSAPP_PHONE_ID` dans Vercel, redéployer.

## 4. Vérifier après le déploiement

1. `/connexion` avec un e-mail de `DESK_EMAILS` → code reçu → `/desk` accessible.
2. `/desk/marche` → « Ingérer le bulletin » sur la dernière séance → 7 actions, ~31 obligations, ~45 OPCVM, aucune anomalie.
3. `/fonds` liste les fonds ; activer un fonds avec une référence de convention → « Souscrire » apparaît.
4. `/desk/a-valider` → déposer un communiqué PDF → extraction → publication.
5. Depuis un second compte (client) : ouvrir un compte, envoyer une intention ; côté desk, la confirmer et vérifier le PDF dans *Documents*.

## Mises à jour

Chaque `git push` sur `master` redéploie. Les migrations SQL nouvelles (`supabase/migrations/00NN_*.sql`) sont à exécuter à la main dans Supabase avant le déploiement qui les utilise — le fichier README et le message de commit le signalent.


## État au 16 septembre 2026

- Projet Vercel `purpose-capital/guichet`, production sur https://guichet-seven.vercel.app (déployé avec `vercel deploy --prod` ; pour que chaque `git push` sur master redéploie, activer l'intégration GitHub du projet dans le tableau de bord Vercel).
- Variables d'environnement de production : celles de `.env.local` + `CRON_SECRET` (généré, aussi copié dans `.env.local`). `NEXT_PUBLIC_SUPABASE_ANON_KEY` est déclarée en valeur publique (clé navigateur, protégée par les RLS).
- Protection de déploiement limitée aux prévisualisations ; la production est publique. Cadre `nextjs` forcé sur le projet.
- Crons enregistrés : BOC 18:30 lun–ven, coupons 07:00, émetteurs lundi 06:00 — appelés par Vercel avec `Authorization: Bearer <CRON_SECRET>`.
- Domaine personnalisé : `vercel domains add <domaine>` puis l'enregistrement DNS indiqué.
