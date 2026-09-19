import { l, type DocPage } from "./types";

/** Platforms, services and costs : who holds which account, which plan, what it costs. */
export const PLATEFORMES: DocPage = {
  slug: "plateformes",
  title: l("Plateformes, services et coûts", "Platforms, services and costs"),
  summary: l("Les huit services externes : rôle, titulaire du compte, abonnement nécessaire, coût mensuel ; comment on se connecte, où sont les clés.", "The eight external services: role, account holder, plan needed, monthly cost; how sign-in works, where the keys are."),
  visibility: "desk",
  audience: ["admin", "tech"],
  order: 2,
  checkedOn: "2026-09-18",
  owner: "Georges",
  chapters: [
    {
      id: "hebergement",
      title: l("Construction et hébergement", "Build and hosting"),
      blocks: [
        { type: "lead", text: l("Deux abonnements payants suffisent pour tourner en production : Vercel Pro et Supabase Pro. Le reste est gratuit. Les prix sont les tarifs publics connus au 18 septembre 2026, à vérifier avant de budgéter.", "Two paid plans are enough to run in production: Vercel Pro and Supabase Pro. Everything else is free. Prices are the public list prices known on 18 September 2026; check before budgeting.") },
        {
          type: "table",
          head: [l("Service", "Service"), l("Rôle", "Role"), l("Compte, administration", "Account, admin"), l("Abonnement et coût", "Plan and cost")],
          rows: [
            [l("GitHub (totostar1900/guichet)", "GitHub (totostar1900/guichet)"), l("Le code. Chaque envoi sur la branche master redéploie la production.", "The code. Every push to the master branch redeploys production."), l("Propriétaire du dépôt : Georges ; collaborateurs invités au besoin.", "Repo owner: Georges; collaborators as needed."), l("Gratuit", "Free")],
            [l("Vercel (projet purpose-capital/guichet)", "Vercel (project purpose-capital/guichet)"), l("Héberge l'application, exécute les sept tâches planifiées, garde toutes les clés (variables d'environnement).", "Hosts the app, runs the seven scheduled tasks, holds every secret (environment variables)."), l("Propriétaire de l'équipe : Georges ; membres ajoutés dans Vercel › Team.", "Team owner: Georges; members added in Vercel › Team."), l("Pro obligatoire : le plan Hobby est réservé à l'usage non commercial, limité à deux tâches quotidiennes et à des fonctions courtes. 20 $ par membre et par mois.", "Pro required: the Hobby plan is non-commercial only, limited to two daily tasks and short functions. $20 per member per month.")],
            [l("Supabase (projet sernniidkjkwqromvmqu)", "Supabase (project sernniidkjkwqromvmqu)"), l("Base de données, authentification (codes, second facteur), stockage privé des PDF et photos, règles d'accès ligne par ligne.", "Database, authentication (codes, second factor), private file storage, row-level access rules."), l("Propriétaire : Georges. Tableau de bord › Authentication › Users = gestionnaire de comptes (bloquer, supprimer, retirer un second facteur, changer un e-mail).", "Owner: Georges. Dashboard › Authentication › Users = the account manager (block, delete, remove a factor, change an e-mail)."), l("Pro obligatoire en production : le plan gratuit met le projet en pause après une semaine sans trafic. 25 $ par mois, puis à l'usage au-delà de 8 Go de base et 100 Go de fichiers.", "Pro required in production: the free tier pauses the project after a week idle. $25 per month, then usage beyond 8 GB of database and 100 GB of files.")],
            [l("Cloudflare (facultatif)", "Cloudflare (optional)"), l("DNS du domaine ; Email Routing et un Worker transmettent intake@ à l'application.", "Domain DNS; Email Routing and a Worker forward intake@ to the app."), l("Compte : Georges.", "Account: Georges."), l("Gratuit (paliers gratuits)", "Free (free tiers)")],
            [l("Nom de domaine", "Domain name"), l("Adresse de l'application, domaine d'envoi des e-mails, numéro WhatsApp rattaché.", "App address, e-mail sending domain, WhatsApp business number."), l("Registrar : Georges.", "Registrar: Georges."), l("10 à 40 $ par an selon l'extension", "$10 to $40 a year depending on the TLD")],
            [l("Google Fonts, web push", "Google Fonts, web push"), l("Police Manrope ; notifications du navigateur (clés VAPID générées par nous).", "Manrope typeface; browser notifications (VAPID keys we generate)."), l("—", "—"), l("Gratuit", "Free")],
          ],
        },
      ],
    },
    {
      id: "identite",
      title: l("Identité, connexion, codes, second facteur", "Identity, sign-in, codes, second factor"),
      blocks: [
        { type: "lead", text: l("Guichet n'a pas de mots de passe : on se connecte avec un code à usage unique reçu par e-mail, et l'équipe ajoute un second facteur. Il n'y a donc pas de « mot de passe oublié » : perdre l'accès, c'est redemander un code.", "Guichet has no passwords: you sign in with a one-time code received by e-mail, and the team adds a second factor. So there is no \"forgot password\": losing access just means asking for a new code.") },
        {
          type: "table",
          head: [l("Quoi", "What"), l("Comment ça marche", "How it works"), l("Où c'est géré, que faire en cas de perte", "Where managed, what to do when lost")],
          rows: [
            [l("Connexion client et desk", "Client and desk sign-in"), l("Code à six chiffres émis par Supabase Auth et envoyé par e-mail (page /connexion) ; lien magique en secours.", "Six-digit code issued by Supabase Auth, sent by e-mail (/connexion page); magic link as fallback."), l("Supabase › Authentication. L'expéditeur intégré de Supabase est limité à quelques e-mails par heure (usage test) : brancher l'envoi sur Resend (Supabase › Auth › SMTP). Accès perdu = nouveau code ; boîte e-mail perdue = un responsable change l'adresse dans Supabase › Users.", "Supabase › Authentication. The built-in sender is limited to a few e-mails per hour (test use): set SMTP to Resend. Lost access = new code; lost mailbox = a manager changes the address in Supabase › Users.")],
            [l("Code par téléphone (facultatif, désactivé)", "Phone code (optional, off)"), l("Supabase Auth › Phone avec un fournisseur (Twilio SMS ou canal WhatsApp Twilio) ; variable PHONE_OTP_ENABLED.", "Supabase Auth › Phone with a provider (Twilio SMS or Twilio WhatsApp); PHONE_OTP_ENABLED variable."), l("Compte Twilio ; payé au message (environ 0,05 à 0,10 $ par SMS vers le Cameroun, à vérifier).", "Twilio account; paid per message (about $0.05 to $0.10 per SMS to Cameroon, to verify).")],
            [l("Second facteur du desk", "Desk second factor"), l("Application d'authentification (TOTP : Google Authenticator, Authy…), obligatoire pour les rôles desk et responsable, enrôlée à la première connexion au desk.", "Authenticator app (TOTP), mandatory for desk and manager roles, enrolled at first desk sign-in."), l("Gratuit avec Supabase Auth. Téléphone perdu : un administrateur retire le facteur dans Supabase › Users › l'utilisateur, la personne se ré-enrôle. DESK_MFA=off sur Vercel est l'interrupteur d'urgence, jamais durable.", "Free with Supabase Auth. Lost phone: an admin removes the factor in Supabase › Users, the person re-enrols. DESK_MFA=off on Vercel is the emergency switch, never permanent.")],
            [l("Rôles", "Roles"), l("client, desk (opérateur), responsable. DESK_EMAILS (Vercel) nomme les premiers responsables ; ensuite Desk › Équipe promeut ou rétrograde, chaque changement est journalisé.", "client, desk (operator), manager. DESK_EMAILS (Vercel) names the first managers; afterwards Desk › Team promotes or demotes, every change logged."), l("Dans l'application (Équipe) ; Supabase › Users reste le super-administrateur.", "In the app (Team); Supabase › Users remains the super-admin.")],
          ],
        },
      ],
    },
    {
      id: "canaux",
      title: l("Canaux de communication", "Communication channels"),
      blocks: [
        { type: "lead", text: l("Trois services parlent aux clients : Resend pour les e-mails, Meta pour WhatsApp, Claude pour le robot qui répond. Ils sont payés à l'usage ; à notre volume, quelques dizaines de dollars par mois.", "Three services talk to clients: Resend for e-mail, Meta for WhatsApp, Claude for the answering robot. All pay-as-you-go; at our volume, a few tens of dollars a month.") },
        {
          type: "table",
          head: [l("Service", "Service"), l("Rôle", "Role"), l("Mise en place", "Setup"), l("Coût", "Cost")],
          rows: [
            [l("Resend", "Resend"), l("Tout l'e-mail sortant : codes de connexion (via SMTP), avis d'offre, avis de résultat, documents, point du matin, résumé des actualités.", "All outbound e-mail: sign-in codes (via SMTP), offer and result notices, documents, morning digest, news digest."), l("Compte : Georges. Domaine d'envoi vérifié (SPF/DKIM chez le registrar). Clés sur Vercel : RESEND_API_KEY, EMAIL_FROM.", "Account: Georges. Verified sending domain (SPF/DKIM at the registrar). Keys on Vercel: RESEND_API_KEY, EMAIL_FROM."), l("Gratuit jusqu'à 3 000 e-mails par mois (100 par jour) ; Pro 20 $ par mois pour 50 000.", "Free to 3,000 e-mails a month (100 a day); Pro $20 a month for 50,000.")],
            [l("Meta WhatsApp Cloud API", "Meta WhatsApp Cloud API"), l("Sortant : modèles approuvés guichet_offre et guichet_maj, documents ; réponses libres dans les 24 h. Entrant : questions → robot et boîte de réception ; photos et PDF de l'équipe → À valider ; liens de l'équipe → Actualités.", "Outbound: approved templates guichet_offre and guichet_maj, documents; free-form replies within 24 h. Inbound: questions → robot and inbox; staff photos and PDFs → To validate; staff links → News."), l("Meta Business Manager : Georges. Vérification de l'entreprise, numéro dédié, soumission des deux modèles, webhook /api/whatsapp/webhook. Clés : WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN.", "Meta Business Manager: Georges. Business verification, dedicated number, the two templates, webhook /api/whatsapp/webhook. Keys: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN."), l("Plateforme gratuite ; facturation par message pour les modèles envoyés par nous (de l'ordre de 0,01 à 0,05 $ dans la région, grille Meta à vérifier) ; les réponses dans la fenêtre de 24 h ouverte par le client sont gratuites.", "Free platform; per-message billing for templates we send (roughly $0.01 to $0.05 in the region, check Meta's rate card); replies within the client-opened 24 h window are free.")],
            [l("Anthropic : Claude API (modèle claude-opus-5)", "Anthropic : Claude API (model claude-opus-5)"), l("Le robot WhatsApp et l'extracteur de communiqués (PDF ou photo → brouillon d'offre). BOT_ENABLED=0 coupe le robot.", "The WhatsApp robot and the notice extractor (PDF or photo → draft offer). BOT_ENABLED=0 cuts the robot."), l("Console Anthropic : Georges ; plafond de dépense mensuel à fixer dans la console. Clé : ANTHROPIC_API_KEY.", "Anthropic Console: Georges; set a monthly spend limit in the console. Key: ANTHROPIC_API_KEY."), l("À l'usage : 5 $ le million de mots lus, 25 $ le million écrits, soit environ 0,02 à 0,05 $ par réponse du robot et 0,10 à 0,30 $ par communiqué extrait.", "Pay-as-you-go: $5 per million words read, $25 per million written, about $0.02 to $0.05 per robot reply and $0.10 to $0.30 per extracted notice.")],
            [l("Web push", "Web push"), l("Alertes « Suivre cette ligne », opportunités.", "Followed-line alerts, opportunities."), l("Clés VAPID générées une fois (npx web-push generate-vapid-keys), sur Vercel.", "VAPID keys generated once, on Vercel."), l("Gratuit", "Free")],
            [l("OpenSanctions (facultatif)", "OpenSanctions (optional)"), l("Pré-contrôle automatique sanctions / PPE des dossiers ; sans clé, le desk atteste à la main.", "Automatic sanctions / PEP pre-screen of files; without a key the desk attests by hand."), l("Compte OpenSanctions ; clé OPENSANCTIONS_API_KEY.", "OpenSanctions account; OPENSANCTIONS_API_KEY."), l("Abonnement commercial (une centaine d'euros par mois environ, à vérifier) ; peut rester désactivé.", "Commercial subscription (around a hundred euros a month, to verify); can stay off.")],
          ],
        },
      ],
    },
    {
      id: "budget",
      title: l("Budget mensuel", "Monthly budget"),
      blocks: [
        { type: "lead", text: l("Comptez environ 55 à 70 $ de fixe et 20 à 90 $ d'usage par mois, soit 75 à 160 $ (environ 45 000 à 100 000 FCFA), hors SMS Twilio et OpenSanctions qui restent facultatifs.", "Expect about $55 to $70 fixed and $20 to $90 usage per month, i.e. $75 to $160 (about 45,000 to 100,000 FCFA), excluding the optional Twilio SMS and OpenSanctions.") },
        {
          type: "table",
          head: [l("Poste", "Line"), l("Type", "Type"), l("Montant mensuel (USD)", "Monthly amount (USD)")],
          rows: [
            [l("Vercel Pro (un membre)", "Vercel Pro (one member)"), l("Fixe", "Fixed"), l("20", "20")],
            [l("Supabase Pro", "Supabase Pro"), l("Fixe", "Fixed"), l("25", "25")],
            [l("Nom de domaine (amorti)", "Domain (amortised)"), l("Fixe", "Fixed"), l("1 à 3", "1 to 3")],
            [l("Resend", "Resend"), l("Fixe", "Fixed"), l("0 jusqu'à 3 000 e-mails, puis 20", "0 up to 3,000 e-mails, then 20")],
            [l("Meta WhatsApp (quelques centaines de modèles)", "Meta WhatsApp (a few hundred templates)"), l("Usage", "Usage"), l("10 à 50", "10 to 50")],
            [l("Anthropic Claude (robot et extraction)", "Anthropic Claude (robot and extraction)"), l("Usage", "Usage"), l("10 à 40", "10 to 40")],
            [l("Twilio SMS (facultatif)", "Twilio SMS (optional)"), l("Usage", "Usage"), l("selon volume", "by volume")],
            [l("OpenSanctions (facultatif)", "OpenSanctions (optional)"), l("Fixe", "Fixed"), l("environ 100 et plus", "about 100 and up")],
            [l("Total sans options", "Total without options"), l("", ""), l("environ 75 à 160", "about 75 to 160")],
          ],
        },
        { type: "p", text: l("Chaque membre d'équipe supplémentaire sur Vercel ajoute 20 $ ; seuls ceux qui déploient ou lisent les journaux en ont besoin, pas le desk.", "Each extra Vercel member adds $20; only those who deploy or read logs need one, not the desk.") },
      ],
    },
    {
      id: "comptes",
      title: l("Comptes, titulaires et clés", "Accounts, owners and keys"),
      blocks: [
        { type: "lead", text: l("Un seul titulaire par service aujourd'hui (Georges). Chaque ligne indique où l'on se connecte pour administrer et sous quel nom la clé est rangée sur Vercel (Settings › Environment Variables). Après tout changement de clé : redéployer, puis vérifier Santé.", "One account holder per service today (Georges). Each row says where to sign in to administer and under which name the key is stored on Vercel (Settings › Environment Variables). After any key change: redeploy, then check Health.") },
        {
          type: "table",
          head: [l("Service", "Service"), l("Administration", "Administration"), l("Clés sur Vercel", "Keys on Vercel")],
          rows: [
            [l("GitHub", "GitHub"), l("github.com › totostar1900/guichet › Settings", "github.com › totostar1900/guichet › Settings"), l("—", "—")],
            [l("Vercel", "Vercel"), l("vercel.com › purpose-capital › guichet › Settings (Environment Variables, Cron Jobs, Domains)", "vercel.com › purpose-capital › guichet › Settings"), l("toutes", "all")],
            [l("Supabase", "Supabase"), l("supabase.com › projet › Authentication, Table Editor, SQL Editor", "supabase.com › project › Authentication, Table Editor, SQL Editor"), l("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY")],
            [l("Resend", "Resend"), l("resend.com › Domains, API Keys", "resend.com › Domains, API Keys"), l("RESEND_API_KEY, EMAIL_FROM", "RESEND_API_KEY, EMAIL_FROM")],
            [l("Meta WhatsApp", "Meta WhatsApp"), l("business.facebook.com (vérification, numéro, modèles) ; developers.facebook.com (webhook, jeton système)", "business.facebook.com (verification, number, templates); developers.facebook.com (webhook, system token)"), l("WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WA_TEMPLATE_OFFER, WA_TEMPLATE_UPDATE", "WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WA_TEMPLATE_OFFER, WA_TEMPLATE_UPDATE")],
            [l("Anthropic", "Anthropic"), l("console.anthropic.com › API Keys, Usage, Limits", "console.anthropic.com › API Keys, Usage, Limits"), l("ANTHROPIC_API_KEY, BOT_ENABLED", "ANTHROPIC_API_KEY, BOT_ENABLED")],
            [l("Cloudflare (intake e-mail)", "Cloudflare (e-mail intake)"), l("dash.cloudflare.com › Email Routing, Workers", "dash.cloudflare.com › Email Routing, Workers"), l("INBOUND_SECRET, INTAKE_TRUSTED_SENDERS", "INBOUND_SECRET, INTAKE_TRUSTED_SENDERS")],
            [l("Twilio (code par téléphone)", "Twilio (phone code)"), l("twilio.com, puis Supabase › Auth › Phone", "twilio.com, then Supabase › Auth › Phone"), l("PHONE_OTP_ENABLED, PHONE_OTP_CHANNEL", "PHONE_OTP_ENABLED, PHONE_OTP_CHANNEL")],
            [l("OpenSanctions", "OpenSanctions"), l("opensanctions.org › API", "opensanctions.org › API"), l("OPENSANCTIONS_API_KEY", "OPENSANCTIONS_API_KEY")],
            [l("Web push", "Web push"), l("clés générées en local", "keys generated locally"), l("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT", "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT")],
          ],
        },
        { type: "p", text: l("Autres clés sans compte externe : CRON_SECRET (tâches planifiées), DESK_EMAILS (premiers responsables), DESK_MFA, AUTH_SECRET, SETTLEMENT_BANK et SETTLEMENT_IBAN (coordonnées imprimées sur les appels de fonds), NEXT_PUBLIC_APP_URL, NEWS_FEEDS (flux de veille supplémentaires).", "Other keys with no external account: CRON_SECRET (scheduled tasks), DESK_EMAILS (first managers), DESK_MFA, AUTH_SECRET, SETTLEMENT_BANK and SETTLEMENT_IBAN (details printed on calls for funds), NEXT_PUBLIC_APP_URL, NEWS_FEEDS (extra watch feeds).") },
      ],
    },
    {
      id: "reste",
      title: l("Reste à faire côté entreprise", "Still to do on the company side"),
      blocks: [
        { type: "lead", text: l("Six gestes séparent l'application d'aujourd'hui d'un service ouvert aux clients ; aucun ne demande de code.", "Six actions stand between today's app and a service open to clients; none needs code.") },
        {
          type: "steps",
          items: [
            l("Vercel : passer le projet en Pro ; créer un nouveau jeton d'accès (l'ancien a expiré) ; ajouter le domaine.", "Vercel: move the project to Pro; create a new access token (the old one expired); add the domain."),
            l("Supabase : passer en Pro ; Auth › SMTP vers Resend ; mettre les e-mails de l'équipe dans DESK_EMAILS pour la première connexion (le second facteur s'enrôle à ce moment).", "Supabase: move to Pro; Auth › SMTP to Resend; put the team's e-mails in DESK_EMAILS for the first sign-in (the second factor enrols then)."),
            l("Resend : vérifier le domaine d'envoi (enregistrements DNS) et reporter la clé.", "Resend: verify the sending domain (DNS records) and set the key."),
            l("Meta : vérification de l'entreprise, numéro de production, soumission des modèles guichet_offre et guichet_maj, webhook et jetons.", "Meta: business verification, production number, submit the guichet_offre and guichet_maj templates, webhook and tokens."),
            l("Anthropic : créer la clé API, fixer un plafond de dépense mensuel, la reporter sur Vercel.", "Anthropic: create the API key, set a monthly spend limit, put it on Vercel."),
            l("Cloudflare, si l'intake par e-mail est voulu : Email Routing intake@ → Worker → application.", "Cloudflare, if e-mail intake is wanted: Email Routing intake@ → Worker → app."),
          ],
        },
      ],
    },
  ],
};
