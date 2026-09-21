import { l, type DocPage } from "./types";

/** The manager's guide: what only a responsable does, and how to do it safely. */
export const ADMINISTRATION: DocPage = {
  slug: "administration",
  title: l("Administrer Guichet : le guide du responsable", "Administering Guichet: the manager's guide"),
  summary: l("Équipe et rôles, second facteur, approbations, référentiel, journal, reporting, santé, et les gestes d'urgence.", "Team and roles, second factor, approvals, reference data, audit log, reporting, health, and the emergency moves."),
  visibility: "desk",
  audience: ["admin"],
  order: 6,
  checkedOn: "2026-09-18",
  owner: "Georges",
  chapters: [
    {
      id: "equipe",
      title: l("Équipe et rôles", "Team and roles"),
      blocks: [
        { type: "lead", text: l("Trois niveaux : client, desk (opérateur), responsable. On ne crée pas de compte : une personne se connecte une première fois avec son e-mail, puis un responsable lui donne son niveau dans Desk › Équipe.", "Three levels: client, desk (operator), manager. Accounts are not created: a person signs in once with their e-mail, then a manager gives them their level under Desk › Team.") },
        {
          type: "steps",
          items: [
            l("La nouvelle recrue se connecte sur /connexion avec son e-mail professionnel (code reçu).", "The newcomer signs in on /connexion with their work e-mail (code received)."),
            l("Desk › Équipe : la trouver dans la liste, choisir Opérateur ou Responsable, enregistrer. Le changement est journalisé avec votre nom.", "Desk › Team: find them in the list, choose Operator or Manager, save. The change is logged with your name."),
            l("À sa prochaine connexion au desk, elle enrôle son second facteur (application d'authentification) ; sans lui, le desk reste fermé.", "At their next desk sign-in they enrol their second factor (authenticator app); without it the desk stays closed."),
            l("Départ : repasser la personne en Client (elle garde un accès client vide), retirer son numéro du profil pour que ses envois WhatsApp ne soient plus traités comme ceux de l'équipe.", "Departure: set the person back to Client, remove their number from the profile so their WhatsApp sends are no longer treated as staff."),
          ],
        },
        { type: "note", kind: "rule", text: l("La variable DESK_EMAILS sur Vercel n'est qu'un amorçage : chaque adresse listée devient responsable à sa première connexion. Une fois l'équipe en place, videz-la (Santé le rappelle).", "The DESK_EMAILS variable on Vercel is only a bootstrap: every listed address becomes a manager at first sign-in. Once the team is in place, clear it (Health reminds you).") },
      ],
    },
    {
      id: "mfa",
      title: l("Second facteur : perte, remise à zéro, urgence", "Second factor: loss, reset, emergency"),
      blocks: [
        {
          type: "table",
          head: [l("Situation", "Situation"), l("Geste", "Move")],
          rows: [
            [l("Téléphone perdu ou changé", "Phone lost or changed"), l("Supabase › Authentication › Users › la personne › Factors › supprimer le facteur TOTP. À sa prochaine connexion, elle en enrôle un nouveau. Journalisez-le dans Messages ou dans un mémo.", "Supabase › Authentication › Users › the person › Factors › delete the TOTP factor. At their next sign-in they enrol a new one. Note it in Messages or a memo.")],
            [l("Code refusé", "Code refused"), l("Heure du téléphone juste ? (le code dépend de l'heure). Sinon, remise à zéro comme ci-dessus.", "Is the phone's clock right? (the code depends on time). Otherwise reset as above.")],
            [l("Tout le desk bloqué", "Whole desk locked out"), l("Vercel › Environment Variables › DESK_MFA=off › redéployer. Temporaire uniquement : remettre la valeur vide dès que l'incident est réglé ; le journal garde la trace.", "Vercel › Environment Variables › DESK_MFA=off › redeploy. Temporary only: put the value back to empty as soon as the incident is over; the log keeps the trace.")],
          ],
        },
      ],
    },
    {
      id: "approbations",
      title: l("Approbations et fenêtre déléguée", "Approvals and the delegated window"),
      blocks: [
        { type: "lead", text: l("Un opérateur publie seul ce qui reste dans la fenêtre déléguée ; le reste attend un responsable dans Desk › Approbations, avec un compteur sur l'onglet.", "An operator publishes alone what stays within the delegated window; the rest waits for a manager under Desk › Approvals, with a counter on the tab.") },
        {
          type: "table",
          head: [l("Ce qui demande une approbation", "What needs an approval"), l("Pourquoi", "Why")],
          rows: [
            [l("Un prix hors des bornes du type de produit", "A price outside the product type's bounds"), l("Un prix aberrant publié se retrouve chez tous les clients.", "An aberrant published price reaches every client.")],
            [l("Un cours saisi à la main trop loin du dernier bulletin", "A manual price too far from the last bulletin"), l("La saisie manuelle n'est qu'un secours.", "Manual entry is only a fallback.")],
            [l("Des frais de fonds au-dessus du plafond", "Fund fees above the ceiling"), l("Engagement contractuel.", "Contractual commitment.")],
            [l("Une diffusion à tous les clients", "A broadcast to every client"), l("Un message de masse ne se rattrape pas.", "A mass message cannot be taken back.")],
            [l("Un changement de rôle", "A role change"), l("Quatre yeux sur les accès.", "Four eyes on access.")],
          ],
        },
        { type: "p", text: l("Décider : ouvrir la demande, lire le avant / après, approuver ou refuser avec une note. La décision est journalisée ; l'opérateur est prévenu dans le flux. Les bornes elles-mêmes se règlent dans Référentiel › Types de produits.", "Deciding: open the request, read the before / after, approve or refuse with a note. The decision is logged; the operator is told in the feed. The bounds themselves are set under Reference data › Product types.") },
      ],
    },
    {
      id: "referentiel",
      title: l("Référentiel : changer l'application sans code", "Reference data: changing the app without code"),
      blocks: [
        { type: "lead", text: l("Six onglets, chacun avec des valeurs par défaut livrées avec l'application ; ce que vous enregistrez prend le dessus, et « revenir aux valeurs par défaut » l'efface.", "Six tabs, each with defaults shipped with the app; what you save takes precedence, and \"back to defaults\" erases it.") },
        {
          type: "table",
          head: [l("Onglet", "Tab"), l("Ce qu'on y règle", "What is set there"), l("Effet immédiat sur", "Immediate effect on")],
          rows: [
            [l("Types de produits", "Product types"), l("Nom, badge, couleur, points d'attention, liste de contrôle avant publication, intentions ouvertes, champs libres, bornes de prix, moteur de calcul.", "Name, badge, colour, cautions, pre-publication checklist, open intentions, free fields, price bounds, calculation engine."), l("Filtres du Guichet, fiches, À valider, approbations.", "Guichet filters, line pages, To validate, approvals.")],
            [l("Échéanciers", "Schedules"), l("Les dates exactes de coupon et d'amortissement d'une obligation cotée.", "The exact coupon and amortisation dates of a listed bond."), l("Rendement affiché, avis de coupon.", "Displayed yield, coupon notices.")],
            [l("Glossaire", "Glossary"), l("Chaque terme : libellé, définition en deux phrases.", "Every term: label, two-sentence definition."), l("Bulles « i », Info, robot.", "\"i\" bubbles, Info, the robot.")],
            [l("Leçons", "Lessons"), l("Les huit leçons d'Info.", "The eight Info lessons."), l("Info, onboarding.", "Info, onboarding.")],
            [l("Sociétés cotées", "Listed companies"), l("Activité, comptes, actionnariat, lecture des chiffres, documents.", "Activity, accounts, shareholders, reading of the figures, documents."), l("Sociétés, rapports PDF.", "Companies, PDF reports.")],
            [l("Émetteurs", "Issuers"), l("Les émetteurs obligataires non cotés en actions.", "Bond issuers without listed shares."), l("Fiches émetteur.", "Issuer pages.")],
          ],
        },
        { type: "note", kind: "info", text: l("Chaque modification est versionnée dans le Journal (entité Référentiel) : on voit qui a changé quoi, avant / après, et on peut revenir en arrière.", "Every change is versioned in the audit log (entity Reference data): who changed what, before / after, and it can be undone.") },
      ],
    },
    {
      id: "journal",
      title: l("Journal, reporting, santé", "Audit log, reporting, health"),
      blocks: [
        {
          type: "table",
          head: [l("Page", "Page"), l("À quoi elle sert", "What it is for"), l("Rythme", "Rhythm")],
          rows: [
            [l("Journal", "Audit log"), l("La piste d'audit : chaque action métier avec auteur, avant / après, raison, chaînée pour ne pas être altérée. Filtres par entité (lignes, intentions, référentiel, équipe, approbations, actualités).", "The audit trail: every business action with author, before / after, reason, chained so it cannot be altered. Filters by entity."), l("À la demande ; export pour un contrôle.", "On demand; export for an inspection.")],
            [l("Reporting", "Reporting"), l("Le mois : ordres par ligne et par état, montants réglés, positions, registre des clients, horodatage de chaque étape.", "The month: orders by line and state, settled amounts, positions, client register, time-stamp of every step."), l("Fin de mois ; pièce pour la COSUMAF.", "Month-end; a piece for the COSUMAF.")],
            [l("Santé", "Health"), l("Huit points vert / orange / rouge : bulletin, ingestions, cours manquants, VL en retard, messages sans réponse, échéanciers, prix, actualités. Un point rouge le soir déclenche un e-mail au desk.", "Eight green / orange / red points: bulletin, ingestions, missing prices, late NAVs, unanswered messages, schedules, prices, news. A red point in the evening e-mails the desk."), l("Chaque matin.", "Every morning.")],
          ],
        },
      ],
    },
    {
      id: "urgence",
      title: l("Gestes d'urgence", "Emergency moves"),
      blocks: [
        {
          type: "table",
          head: [l("Problème", "Problem"), l("Geste", "Move")],
          rows: [
            [l("Une version vient d'être déployée et casse quelque chose", "A version was just deployed and breaks something"), l("Vercel › Deployments › la version précédente › Promote to Production (moins d'une minute). Prévenir la personne qui maintient le code.", "Vercel › Deployments › the previous version › Promote to Production (under a minute). Tell whoever maintains the code.")],
            [l("Le robot répond mal ou trop", "The robot answers wrongly or too much"), l("Vercel › BOT_ENABLED=0 › redéployer. Les messages restent dans Messages, à traiter à la main.", "Vercel › BOT_ENABLED=0 › redeploy. Messages stay under Messages, to handle by hand.")],
            [l("Un envoi de masse est parti par erreur", "A mass send went out by mistake"), l("Rien ne se rappelle. Envoyer une mise à jour (modèle guichet_maj) qui corrige, journaliser la cause.", "Nothing can be recalled. Send an update (guichet_maj template) that corrects, log the cause.")],
            [l("Une clé a fuité", "A key leaked"), l("La régénérer chez le fournisseur (Supabase, Resend, Meta, Anthropic), la remplacer sur Vercel, redéployer. Le journal ne dépend d'aucune clé.", "Regenerate it at the vendor, replace it on Vercel, redeploy. The audit log depends on no key.")],
            [l("La base ne répond plus", "The database no longer answers"), l("supabase.com › statut du projet (pause ? quota ?). Le plan Pro évite la pause ; les sauvegardes quotidiennes sont dans Database › Backups.", "supabase.com › project status (paused? quota?). The Pro plan avoids the pause; daily backups are under Database › Backups.")],
            [l("Un client signale une demande de virement vers un autre compte", "A client reports a transfer request to another account"), l("Fraude : ne jamais confirmer un autre compte ; vérifier par téléphone ; prévenir toute la liste des clients concernés par la ligne.", "Fraud: never confirm another account; verify by phone; warn every client concerned by the line.")],
          ],
        },
      ],
    },
  ],
};
