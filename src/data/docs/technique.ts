import { l, type DocPage } from "./types";

/** The technical overview: enough for an auditor, a new maintainer, or a founder who wants to understand. */
export const TECHNIQUE: DocPage = {
  slug: "technique",
  title: l("Aperçu technique et exploitation", "Technical and operations overview"),
  summary: l("Comment l'application est construite, où sont les données, qui peut voir quoi, comment on la met à jour, la sauvegarde, la surveille et la répare.", "How the app is built, where the data is, who can see what, how it is updated, backed up, monitored and repaired."),
  visibility: "desk",
  audience: ["tech", "admin"],
  order: 7,
  checkedOn: "2026-09-23",
  owner: "Georges",
  chapters: [
    {
      id: "architecture",
      title: l("Architecture en une image", "Architecture in one picture"),
      blocks: [
        { type: "lead", text: l("Une seule application web (Next.js, TypeScript) hébergée sur Vercel, une seule base (Postgres chez Supabase), et des services externes appelés par l'application : e-mail, WhatsApp, Claude, BVMAC. Aucun serveur à administrer.", "One web application (Next.js, TypeScript) hosted on Vercel, one database (Postgres at Supabase), and external services called by the app: e-mail, WhatsApp, Claude, BVMAC. No server to administer.") },
        { type: "flow", steps: [l("Navigateur ou téléphone du client / du desk", "Client's or desk's browser or phone"), l("Vercel : pages, actions serveur, tâches planifiées", "Vercel: pages, server actions, scheduled tasks"), l("Supabase : base Postgres, Auth, fichiers", "Supabase: Postgres database, Auth, files"), l("Services : Resend, Meta WhatsApp, Claude, bvm-ac.org", "Services: Resend, Meta WhatsApp, Claude, bvm-ac.org")] },
        {
          type: "table",
          head: [l("Couche", "Layer"), l("Où", "Where"), l("En clair", "Plainly")],
          rows: [
            [l("Pages et écrans", "Pages and screens"), l("src/app : une dossier par adresse (/, /fonds, /societes, /actualites, /info, /moi, /desk/…)", "src/app : one folder per address"), l("Les pages sont rendues sur le serveur à chaque visite (données fraîches), avec quelques composants interactifs dans le navigateur (filtres, formulaires, recherche).", "Pages are rendered on the server at each visit (fresh data), with a few interactive parts in the browser (filters, forms, search).")],
            [l("Règles métier", "Business rules"), l("src/lib/domain (statuts, estimations, contrôles d'ordre), src/lib/finance (calculs de rendement), src/lib/kyc, src/lib/results, src/lib/news", "src/lib/domain, src/lib/finance, src/lib/kyc, src/lib/results, src/lib/news"), l("Les calculs et les règles sont dans du code testé, hors des pages ; 53 tests automatiques les vérifient à chaque modification.", "Calculations and rules live in tested code, outside the pages; 53 automatic tests check them on every change.")],
            [l("Accès aux données", "Data access"), l("src/lib/data : une interface (repository.ts), deux implémentations : mémoire (démonstration) et Supabase (production)", "src/lib/data : one interface, two implementations: memory (demo) and Supabase (production)"), l("La même application tourne sans base, sur un jeu de démonstration, pour les tests et les captures d'écran du guide.", "The same app runs without a database, on a demo dataset, for tests and the guide's screenshots.")],
            [l("Données de référence", "Reference data"), l("src/data (valeurs par défaut) + table reference (ce que le desk modifie)", "src/data (defaults) + table reference (what the desk changes)"), l("Types de produits, glossaire, sociétés, échéanciers, leçons, guide, documentation.", "Product types, glossary, companies, schedules, lessons, guide, documentation.")],
            [l("Bilingue", "Bilingual"), l("src/i18n : dictionnaire français → anglais", "src/i18n : French → English dictionary"), l("Chaque texte est écrit en français dans le code ; l'anglais est cherché dans le dictionnaire ; un texte sans traduction reste en français plutôt que de casser la page.", "Every text is written in French in the code; English is looked up in the dictionary; an untranslated text stays French rather than breaking the page.")],
            [l("Documents PDF", "PDF documents"), l("src/lib/documents (bulletins, appels de fonds, bordereaux, avis, relevés, rapports)", "src/lib/documents"), l("Générés à la demande, numérotés, stockés dans le bucket privé et journalisés.", "Generated on demand, numbered, stored in the private bucket and logged.")],
          ],
        },
      ],
    },
    {
      id: "donnees",
      title: l("Les données et qui peut les voir", "The data and who can see it"),
      blocks: [
        { type: "lead", text: l("Tout est dans une base Postgres chez Supabase, en Europe, chiffrée au repos. Vingt-cinq migrations SQL versionnées dans le dépôt (supabase/migrations) décrivent chaque table ; on les applique à la main, dans l'ordre, avant le déploiement qui les utilise.", "Everything is in a Postgres database at Supabase, in Europe, encrypted at rest. Twenty-five SQL migrations versioned in the repo (supabase/migrations) describe every table; they are applied by hand, in order, before the deployment that uses them.") },
        {
          type: "table",
          head: [l("Table", "Table"), l("Contenu", "Content"), l("Qui lit / qui écrit", "Who reads / who writes")],
          rows: [
            [l("offers, offer_versions", "offers, offer_versions"), l("Les lignes et chaque version publiée.", "Lines and every published version."), l("Tout le monde lit les publiées ; le desk écrit.", "Everyone reads published ones; the desk writes.")],
            [l("intents", "intents"), l("Les intentions, leur état, l'historique.", "Intentions, their state, history."), l("Le client lit les siennes ; le desk tout.", "The client reads their own; the desk everything.")],
            [l("profiles, client_files, documents", "profiles, client_files, documents"), l("Comptes, dossiers KYC, pièces, documents générés.", "Accounts, KYC files, pieces, generated documents."), l("Le client lit le sien ; le desk tout ; fichiers dans un bucket privé.", "The client reads their own; the desk everything; files in a private bucket.")],
            [l("quotes, fund_navs, bulletins", "quotes, fund_navs, bulletins"), l("Cours et VL historisés, un bulletin par séance.", "Historised prices and NAVs, one bulletin per session."), l("Tout le monde lit ; les tâches planifiées écrivent.", "Everyone reads; scheduled tasks write.")],
            [l("news", "news"), l("Les actualités : publiées, brouillons, liens reçus.", "News: published, drafts, received links."), l("Tout le monde lit les publiées seulement ; le desk tout.", "Everyone reads published only; the desk everything.")],
            [l("notifications, inbound_messages", "notifications, inbound_messages"), l("Tout ce qui est envoyé et reçu (WhatsApp, e-mail, push).", "Everything sent and received."), l("Desk.", "Desk.")],
            [l("audit, approvals, reference", "audit, approvals, reference"), l("Piste d'audit chaînée par empreintes, demandes d'approbation, données de référence.", "Hash-chained audit trail, approval requests, reference data."), l("Desk ; le journal ne se modifie jamais.", "Desk; the log is never edited.")],
          ],
        },
        { type: "p", text: l("Les règles d'accès sont dans la base elle-même (Row Level Security) : même une requête directe avec la clé publique ne renvoie que ce que la personne connectée a le droit de voir. Le serveur utilise une clé de service, jamais exposée au navigateur.", "Access rules live in the database itself (Row Level Security): even a direct request with the public key returns only what the signed-in person may see. The server uses a service key, never exposed to the browser.") },
      ],
    },
    {
      id: "deployer",
      title: l("Mettre à jour, revenir en arrière", "Updating, rolling back"),
      blocks: [
        {
          type: "steps",
          items: [
            l("Avant de publier une modification : npx tsc --noEmit -p . (types), npx eslint src (qualité), npx vitest run (53 tests), npx next build (construction). Les quatre doivent passer.", "Before publishing a change: npx tsc --noEmit -p . (types), npx eslint src (quality), npx vitest run (53 tests), npx next build (build). All four must pass."),
            l("git push sur master : Vercel construit et met en production en deux à trois minutes ; l'adresse ne change pas.", "git push to master: Vercel builds and puts into production in two to three minutes; the address does not change."),
            l("Si une migration SQL accompagne le changement (nouveau fichier dans supabase/migrations), l'appliquer d'abord dans Supabase › SQL Editor ; le message de commit le signale.", "If an SQL migration comes with the change (new file under supabase/migrations), apply it first in Supabase › SQL Editor; the commit message says so."),
            l("Vérifier : /desk/sante, puis la page touchée.", "Check: /desk/sante, then the page concerned."),
            l("Revenir en arrière : Vercel › Deployments › version précédente › Promote to Production. Une migration ne se défait pas seule : elle est écrite pour être additive (ajout de colonne, jamais suppression).", "Rolling back: Vercel › Deployments › previous version › Promote to Production. A migration does not undo itself: it is written to be additive (adding a column, never dropping)."),
          ],
        },
        { type: "note", kind: "info", text: l("Pour travailler sans toucher à la production : npm run dev:memory lance l'application sur le jeu de démonstration, sans base ni clé.", "To work without touching production: npm run dev:memory starts the app on the demo dataset, with no database and no key.") },
      ],
    },
    {
      id: "taches",
      title: l("Les tâches planifiées", "Scheduled tasks"),
      blocks: [
        { type: "lead", text: l("Sept tâches, déclenchées par Vercel (vercel.json) avec le jeton CRON_SECRET ; chacune peut aussi être lancée à la main depuis Vercel › Cron Jobs › Run ou par une requête avec le jeton.", "Seven tasks, triggered by Vercel (vercel.json) with the CRON_SECRET token; each can also be run by hand from Vercel › Cron Jobs › Run or with a request carrying the token.") },
        {
          type: "table",
          head: [l("Adresse", "Address"), l("Quand (UTC)", "When (UTC)"), l("Fait", "Does")],
          rows: [
            [l("/api/cron/boc", "/api/cron/boc"), l("18 h 30 lun–ven", "6:30 pm Mon–Fri"), l("Télécharge et lit le bulletin officiel de la cote du jour (cours, VL), rattrape la semaine.", "Downloads and reads the day's official bulletin (prices, NAVs), catches up the week.")],
            [l("/api/cron/coupons", "/api/cron/coupons"), l("7 h", "7 am"), l("Avis de coupon à J-3 et J.", "Coupon notices at D-3 and D.")],
            [l("/api/cron/suivi", "/api/cron/suivi"), l("7 h 15", "7:15 am"), l("Alertes des lignes suivies, point du matin au desk.", "Followed-line alerts, morning digest to the desk.")],
            [l("/api/cron/point", "/api/cron/point"), l("6 h 30 lun–ven", "6:30 am Mon–Fri"), l("Envoi des opportunités mises en file (hors heures calmes).", "Sends queued opportunities (outside quiet hours).")],
            [l("/api/cron/emetteurs", "/api/cron/emetteurs"), l("Lundi 6 h", "Monday 6 am"), l("Collecte les documents des sociétés cotées sur bvm-ac.org.", "Collects listed companies' documents from bvm-ac.org.")],
            [l("/api/cron/actualites", "/api/cron/actualites"), l("4 h", "4 am"), l("Veille des flux (BVMAC + NEWS_FEEDS), vérification des liens publiés.", "Feed watch (BVMAC + NEWS_FEEDS), check of published links.")],
            [l("/api/cron/actualites-hebdo", "/api/cron/actualites-hebdo"), l("Vendredi 16 h", "Friday 4 pm"), l("Résumé des actualités aux clients qui acceptent nos messages.", "News digest to clients who accept our messages.")],
          ],
        },
      ],
    },
    {
      id: "sauvegarde",
      title: l("Sauvegarde, reprise, incidents", "Backup, recovery, incidents"),
      blocks: [
        {
          type: "table",
          head: [l("Quoi", "What"), l("Comment", "How"), l("Pour revenir", "To restore")],
          rows: [
            [l("Base de données", "Database"), l("Sauvegarde quotidienne automatique par Supabase (plan Pro : 7 jours, point-in-time en option).", "Daily automatic backup by Supabase (Pro plan: 7 days, point-in-time optional)."), l("Supabase › Database › Backups › Restore ; prévenir le desk (quelques minutes d'indisponibilité).", "Supabase › Database › Backups › Restore; tell the desk (a few minutes down).")],
            [l("Fichiers (PDF, photos)", "Files (PDFs, photos)"), l("Bucket privé Supabase, répliqué par le fournisseur.", "Private Supabase bucket, replicated by the vendor."), l("Un document généré se régénère depuis l'intention.", "A generated document can be regenerated from the intention.")],
            [l("Le code", "The code"), l("GitHub ; chaque version déployée reste sur Vercel.", "GitHub; every deployed version stays on Vercel."), l("Promote to Production sur une version antérieure.", "Promote to Production on an earlier version.")],
            [l("Les clés", "The keys"), l("Vercel › Environment Variables (copie de secours hors ligne, chez le titulaire).", "Vercel › Environment Variables (offline backup copy, with the holder)."), l("Régénérer chez le fournisseur si perdue.", "Regenerate at the vendor if lost.")],
          ],
        },
        { type: "p", text: l("Surveillance : Desk › Santé chaque matin (un point rouge le soir envoie un e-mail au desk) ; Vercel › Logs pour les erreurs d'exécution ; Supabase › Reports pour la base ; resend.com › Logs pour les e-mails ; Meta › WhatsApp Manager pour la qualité du numéro. Un incident se note dans Messages ou dans un mémo avec l'heure, l'effet, la cause, le geste fait.", "Monitoring: Desk › Health every morning (a red point in the evening e-mails the desk); Vercel › Logs for runtime errors; Supabase › Reports for the database; resend.com › Logs for e-mail; Meta › WhatsApp Manager for the number's quality. An incident is noted in Messages or a memo with time, effect, cause, action taken.") },
      ],
    },
    {
      id: "echelle",
      title: l("L'échelle d'espacement et les pièces partagées", "The spacing scale and the shared parts"),
      blocks: [
        { type: "lead", text: l("Les couleurs et la typographie étaient déjà nommées ; les espaces ne l'étaient pas. Un audit des marges du desk a trouvé un panneau sans retrait intérieur, une table décalée de deux pixels de son propre titre, et vingt et une feuilles qui avaient rattrapé la même chose à la main, dont vingt au même chiffre. La règle existait, il lui manquait un endroit où s'écrire.", "Colours and type were already named; spacing was not. An audit of the desk margins found a panel with no inner inset, a table two pixels out of line with its own title, and twenty-one stylesheets that had fixed the same thing by hand, twenty of them at the same figure. The rule was there, it had nowhere to be written.") },
        {
          type: "table",
          head: [l("Ce qu'on pose", "What you set"), l("Où c'est déclaré", "Where it is declared")],
          rows: [
            [l("Un espace : 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40 px", "A space: 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40 px"), l("src/app/globals.css, --s-1 à --s-11", "src/app/globals.css, --s-1 to --s-11")],
            [l("Le retrait intérieur d'un panneau", "A panel's inner inset"), l("--panel-inset : le panneau le pose à son corps, la feuille de page ne le redit pas", "--panel-inset: the panel gives it to its body, the page stylesheet does not repeat it")],
            [l("Une couleur, une famille d'instrument, une bulle d'aide", "A colour, an instrument family, a tooltip"), l("globals.css : --navy, --gold, --ink-*, --line-*, --fam-*, --tip-*, --chart-*", "globals.css: --navy, --gold, --ink-*, --line-*, --fam-*, --tip-*, --chart-*")],
            [l("Un panneau, sa barre de titre, une table, un état", "A panel, its title bar, a table, a state"), l("Les classes globales panel · panel-h · tbl · scroll-x · empty · chips · btn · st", "The global classes panel · panel-h · tbl · scroll-x · empty · chips · btn · st")],
          ],
        },
        { type: "note", kind: "rule", text: l("Harmoniser n'est pas uniformiser : une page du desk se balaie et prend les petits pas, une note de marché se lit et prend les grands. C'est la même échelle, ce ne sont pas les mêmes degrés.", "Harmonising is not making everything the same: a desk page is scanned and takes the small steps, a market note is read and takes the large ones. The same scale, not the same steps.") },
        { type: "lead", text: l("Deux pas restent hors échelle, 14 px et 18 px, hérités et encore largement posés. Ils marchent, ils ne s'écrivent plus dans du code neuf. Le test src/test/spacing.test.ts compte ce qui sort de l'échelle et refuse que le compte augmente : il peut descendre quand une feuille se range, il ne remonte pas. Écrire la convention ne suffisait pas, on l'avait vérifié ailleurs ; ici quelque chose échoue.", "Two steps stay off the scale, 14px and 18px, inherited and still widely used. They work, they are no longer written in new code. The test src/test/spacing.test.ts counts what falls off the scale and refuses to let the count grow: it can fall when a stylesheet is tidied, it does not rise. Writing the convention down was not enough, as we had seen elsewhere; here something fails.") },
      ],
    },
    {
      id: "modifier",
      title: l("Ajouter ou modifier : les gestes courants", "Adding or changing: the common moves"),
      blocks: [
        {
          type: "table",
          head: [l("Besoin", "Need"), l("Sans code ?", "Without code?"), l("Où", "Where")],
          rows: [
            [l("Un nouveau type de produit, une borne de prix, une liste de contrôle", "A new product type, a price bound, a checklist"), l("Oui", "Yes"), l("Desk › Référentiel › Types de produits", "Desk › Reference data › Product types")],
            [l("Un terme du glossaire, une leçon, une fiche société", "A glossary term, a lesson, a company page"), l("Oui", "Yes"), l("Desk › Référentiel", "Desk › Reference data")],
            [l("Une actualité, une ligne, un dossier", "A news item, a line, a file"), l("Oui", "Yes"), l("Les pages du desk", "The desk pages")],
            [l("Une traduction manquante ou à corriger", "A missing or wrong translation"), l("Non", "No"), l("src/i18n/en-*.ts : ajouter la ligne « texte français » : « English text »", "src/i18n/en-*.ts: add the line \"French text\": \"English text\"")],
            [l("Un texte de cette documentation ou du guide du desk", "A text of this documentation or of the desk guide"), l("Non", "No"), l("src/data/docs/*.ts, src/data/desk-guide.ts ; captures : npm run guide:shots", "src/data/docs/*.ts, src/data/desk-guide.ts; screenshots: npm run guide:shots")],
            [l("Un nouveau champ sur une fiche, une nouvelle page", "A new field on a page, a new page"), l("Non", "No"), l("src/app/… + src/lib/… + une migration si une donnée nouvelle est stockée ; tests ; déploiement.", "src/app/… + src/lib/… + a migration if new data is stored; tests; deployment.")],
            [l("Un nouveau modèle WhatsApp", "A new WhatsApp template"), l("Meta", "Meta"), l("Le soumettre dans WhatsApp Manager, puis son nom dans WA_TEMPLATE_* sur Vercel.", "Submit it in WhatsApp Manager, then its name in WA_TEMPLATE_* on Vercel.")],
          ],
        },
        { type: "note", kind: "rule", text: l("Règle de maintenance : un changement d'écran met à jour son guide et sa documentation dans le même envoi ; la date « vérifié le » de chaque page de documentation dit quand on l'a relue face à l'application.", "Maintenance rule: a screen change updates its guide and its documentation in the same push; each documentation page's \"checked on\" date says when it was last read against the app.") },
      ],
    },
  ],
};
