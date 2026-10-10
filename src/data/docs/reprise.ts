import { l, type DocPage } from "./types";

/**
 * Taking the keys back: who owns what, and how a second person regains control.
 *
 * Cette page existe pour un jour où quelqu'un manque. Elle est donc écrite
 * pour être lue vite, dans l'ordre, par une personne qui n'a pas construit la
 * plateforme : chaque étape dit ce qu'elle casse si on l'oublie.
 */
export const REPRISE: DocPage = {
  slug: "reprise",
  title: l("Reprendre la main", "Taking the keys back"),
  summary: l(
    "Qui détient quoi, comment transférer la propriété des huit services à la maison, et ce qu'il faut faire le jour où quelqu'un manque.",
    "Who holds what, how to transfer ownership of the eight services to the firm, and what to do the day someone is unavailable.",
  ),
  visibility: "desk",
  audience: ["admin", "tech"],
  order: 4,
  checkedOn: "2026-10-10",
  owner: "Georges",
  chapters: [
    {
      id: "constat",
      title: l("Ce qui tient à une seule personne", "What hangs on one person"),
      blocks: [
        {
          type: "lead",
          text: l(
            "Au 10 octobre 2026, les huit services externes sont au nom personnel de Georges. Si Georges est indisponible, personne ne peut déployer un correctif, lancer une migration, ni renouveler le domaine. Ce n'est pas une question de confiance : c'est une question de continuité, et toute maison finit par y passer.",
            "As of 10 October 2026, the eight external services are in Georges's personal name. If Georges is unavailable, nobody can deploy a fix, run a migration, or renew the domain. This is not about trust: it is about continuity, and every firm goes through it.",
          ),
        },
        {
          type: "note",
          kind: "info",
          text: l(
            "L'application, elle, n'a pas ce défaut. Aucun compte administrateur partagé, aucun mot de passe : un code à six chiffres, des rôles nominatifs donnés et retirés depuis Desk › Équipe, et un second facteur obligatoire côté desk. C'est l'infrastructure autour qui est personnelle, pas le produit.",
            "The application itself does not have this flaw. No shared admin account, no password: a six-digit code, named roles granted and revoked from Desk › Team, and a mandatory second factor on the desk side. It is the surrounding infrastructure that is personal, not the product.",
          ),
        },
      ],
    },
    {
      id: "trois-choses",
      title: l("Trois choses à ne pas confondre", "Three things not to confuse"),
      blocks: [
        {
          type: "table",
          head: [l("Quoi", "What"), l("À quel nom", "In whose name"), l("Pourquoi", "Why")],
          rows: [
            [
              l("La propriété des comptes", "Ownership of the accounts"),
              l("Une adresse de rôle de la maison, techguichet@purposecapital.africa", "A firm role address, techguichet@purposecapital.africa"),
              l(
                "Elle survit aux personnes. Elle ne sert jamais à travailler au quotidien : on s'en sert pour inviter, pour transférer et pour reprendre la main.",
                "It outlives people. It is never used for day-to-day work: it is used to invite, to transfer and to take the keys back.",
              ),
            ],
            [
              l("L'accès de chacun", "Each person's access"),
              l("Son identité nominative, Georges compris", "Their own named identity, Georges included"),
              l(
                "On révoque une personne sans changer un mot de passe, et le journal dit qui a fait quoi. C'est exactement l'inverse d'un compte partagé, où un départ oblige à tout changer et où aucune trace n'est attribuable.",
                "A person is revoked without changing any password, and the log says who did what. This is the opposite of a shared account, where a departure forces everything to change and no trace is attributable.",
              ),
            ],
            [
              l("Les clés de production", "Production secrets"),
              l("Personne : elles vivent dans Vercel", "Nobody: they live in Vercel"),
              l(
                "C'est déjà le cas, et c'est correct. Ce qui manque est qu'un second responsable puisse y accéder.",
                "That is already the case, and it is right. What is missing is a second responsable being able to reach them.",
              ),
            ],
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Une adresse gratuite grand public (gmail.com, outlook.com) ne convient pas comme propriétaire. Elle n'appartient pas à la maison : personne ne peut en réinitialiser le mot de passe ni en récupérer le contenu si celui qui l'a créée s'en va, et sa récupération dépend d'un numéro de téléphone personnel. Elle convient en revanche très bien comme adresse de SECOURS, parce qu'elle ne dépend pas du domaine : si purposecapital.africa expirait ou si sa zone cassait, une boîte au domaine mourrait avec lui.",
            "A free consumer address (gmail.com, outlook.com) is not suitable as owner. It does not belong to the firm: nobody can reset its password or recover its contents if whoever created it leaves, and its recovery depends on a personal phone number. It is, however, well suited as a RECOVERY address, because it does not depend on the domain: if purposecapital.africa lapsed or its zone broke, a domain mailbox would die with it.",
          ),
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "UNE BOÎTE PARTAGÉE NE PEUT PAS PORTER UN SECOND FACTEUR, et c'est deux obstacles distincts. Chez Microsoft 365, une « boîte partagée » n'est pas un compte : elle n'a pas de licence, personne ne s'y connecte, donc elle n'a rien à protéger par un second facteur. Et quand bien même elle en serait un : recevoir le code par e-mail dans la boîte qui sert déjà à réinitialiser le mot de passe n'est pas un second facteur, c'est le même facteur deux fois. Qui ouvre la boîte tient les deux.",
            "A SHARED MAILBOX CANNOT CARRY A SECOND FACTOR, and these are two distinct obstacles. In Microsoft 365, a « shared mailbox » is not an account: it has no licence, nobody signs into it, so it has nothing to protect with a second factor. And even if it were an account: receiving the code by e-mail in the very mailbox that already resets the password is not a second factor, it is the same factor twice. Whoever opens the mailbox holds both.",
          ),
        },
        {
          type: "p",
          text: l(
            "La forme qui se partage sans se dédoubler est le code à six chiffres d'une application d'authentification (TOTP). Ce n'est pas un message mais un SECRET : la graine se range au coffre partagé, et chacune des deux personnes autorisées l'ajoute à son application. Les deux lisent le même code au même instant, sans se téléphoner et sans qu'une boîte commune ne devienne le maillon unique.",
            "The form that can be shared without being duplicated is the six-digit code of an authenticator app (TOTP). It is not a message but a SECRET: the seed is stored in the shared vault, and each of the two authorised people adds it to their app. Both read the same code at the same moment, without calling each other and without a common mailbox becoming the single link.",
          ),
        },
        {
          type: "list",
          items: [
            l(
              "techguichet@purposecapital.africa doit donc être un COMPTE avec sa licence, et non un objet « boîte partagée » : c'est le compte qui porte le second facteur, et sa boîte se délègue ensuite aux deux responsables.",
              "techguichet@purposecapital.africa must therefore be an ACCOUNT with its licence, not a « shared mailbox » object: it is the account that carries the second factor, and its mailbox is then delegated to the two responsables.",
            ),
            l(
              "Le SMS ne convient pas : un numéro vit dans une seule poche, et le transférer est plus lourd que de transférer un compte.",
              "SMS does not fit: a number lives in one pocket, and moving it is heavier than moving an account.",
            ),
            l(
              "Une clé matérielle ou une passkey vaut mieux qu'un code, mais elle tient à un appareil : là où le service en accepte plusieurs (GitHub, Google), en inscrire UNE PAR PERSONNE, et garder le TOTP du coffre comme chemin commun.",
              "A hardware key or a passkey beats a code, but it is tied to a device: where the service accepts several (GitHub, Google), register ONE PER PERSON, and keep the vault's TOTP as the common path.",
            ),
            l(
              "Les codes de secours se rangent au coffre, dans un article SÉPARÉ de celui du mot de passe : un seul article qui tient mot de passe, graine et codes de secours ramène tout à un seul vol.",
              "Recovery codes go in the vault, in a SEPARATE item from the password: a single item holding password, seed and recovery codes brings everything back to one theft.",
            ),
          ],
        },
      ],
    },
    {
      id: "transferts",
      title: l("Les transferts, dans l'ordre", "The transfers, in order"),
      blocks: [
        {
          type: "p",
          text: l(
            "Chaque étape est réversible et ne coupe rien si elle est faite dans cet ordre. Compter une soirée pour l'ensemble. À chaque ligne, ce qui casse si on l'oublie.",
            "Every step is reversible and cuts nothing if done in this order. Count one evening for the whole. On each line, what breaks if it is forgotten.",
          ),
        },
        {
          type: "table",
          head: [l("Ordre", "Order"), l("Service", "Service"), l("Le geste", "The move"), l("Ce qui casse si on l'oublie", "What breaks if forgotten")],
          rows: [
            [
              l("1", "1"),
              l("Microsoft 365", "Microsoft 365"),
              l(
                "Créer techguichet@purposecapital.africa comme COMPTE licencié (pas comme boîte partagée, qui ne peut porter aucun second facteur), poser son second facteur en TOTP, ranger mot de passe, graine et codes de secours dans le coffre partagé en articles séparés, déléguer la boîte aux deux responsables.",
                "Create techguichet@purposecapital.africa as a licensed ACCOUNT (not as a shared mailbox, which can carry no second factor), set its second factor as TOTP, store password, seed and recovery codes in the shared vault as separate items, delegate the mailbox to the two responsables.",
              ),
              l("Rien ne peut commencer : les sept transferts suivants visent cette adresse.", "Nothing can start: the next seven transfers all point at this address."),
            ],
            [
              l("2", "2"),
              l("GitHub", "GitHub"),
              l(
                "Créer une organisation au nom de la maison, y transférer le dépôt guichet, réinviter Georges comme administrateur. Vérifier que le crochet de déploiement Vercel suit.",
                "Create an organisation in the firm's name, transfer the guichet repository into it, re-invite Georges as an admin. Check the Vercel deploy hook follows.",
              ),
              l(
                "Un dépôt transféré sans vérifier le crochet laisse Vercel branché sur l'ancienne adresse : les envois ne redéploient plus, et rien ne le dit.",
                "A repository transferred without checking the hook leaves Vercel wired to the old address: pushes no longer redeploy, and nothing says so.",
              ),
            ],
            [
              l("3", "3"),
              l("Vercel", "Vercel"),
              l(
                "Transférer l'équipe purpose-capital à l'adresse de rôle, puis réinviter les personnes. Les variables d'environnement et les domaines suivent l'équipe.",
                "Transfer the purpose-capital team to the role address, then re-invite people. Environment variables and domains follow the team.",
              ),
              l(
                "C'est le service qui détient TOUTES les clés de production : sans lui, une reprise se résume à reconstruire chaque secret un par un.",
                "This is the service that holds EVERY production secret: without it, taking over means rebuilding each secret one by one.",
              ),
            ],
            [
              l("4", "4"),
              l("Supabase", "Supabase"),
              l(
                "Changer le propriétaire de l'organisation, puis ajouter les membres. La base, le stockage et l'authentification suivent l'organisation.",
                "Change the organisation owner, then add members. The database, storage and auth follow the organisation.",
              ),
              l(
                "C'est là que vivent les clients, leurs ordres et leurs pièces. Un accès perdu ici n'a pas de solution de rechange.",
                "This is where clients, their orders and their documents live. Access lost here has no workaround.",
              ),
            ],
            [
              l("5", "5"),
              l("GoDaddy, puis Netlify DNS", "GoDaddy, then Netlify DNS"),
              l(
                "Changer le contact du nom de domaine, puis celui de la zone. Activer le renouvellement automatique et une alerte à soixante jours.",
                "Change the domain contact, then the zone contact. Turn on auto-renewal and a sixty-day alert.",
              ),
              l(
                "Un domaine qui expire éteint l'application, les e-mails et le WhatsApp le même matin. C'est la panne la plus bête et la plus complète.",
                "An expired domain switches off the application, the e-mails and WhatsApp on the same morning. It is the silliest and the most complete outage.",
              ),
            ],
            [
              l("6", "6"),
              l("Resend", "Resend"),
              l("Transférer le compte, revérifier le domaine d'envoi si demandé.", "Transfer the account, re-verify the sending domain if asked."),
              l(
                "Sans lui, plus un code de connexion ne part : la plateforme devient inaccessible à tous les clients, pas seulement au desk.",
                "Without it, no sign-in code goes out: the platform becomes unreachable for every client, not just the desk.",
              ),
            ],
            [
              l("7", "7"),
              l("Anthropic", "Anthropic"),
              l("Recréer la clé sous l'organisation de la maison, la reporter sur Vercel, reposer le plafond de dépense.", "Re-create the key under the firm's organisation, put it on Vercel, set the spending cap again."),
              l("Le robot cesse de répondre, et les messages entrants s'accumulent sans réponse.", "The robot stops answering, and inbound messages pile up unanswered."),
            ],
            [
              l("8", "8"),
              l("Meta", "Meta"),
              l(
                "À faire dès la création, et non après : le Business Manager se crée directement au nom de la maison, avec l'adresse de rôle comme administrateur.",
                "To do at creation, not after: the Business Manager is created directly in the firm's name, with the role address as admin.",
              ),
              l(
                "Un Business Manager créé au nom d'une personne se transfère mal : c'est le seul des huit où l'ordre compte vraiment.",
                "A Business Manager created in a person's name transfers badly: it is the one of the eight where the order really matters.",
              ),
            ],
            [
              l("9", "9"),
              l("L'application", "The application"),
              l(
                "Mettre les adresses de l'équipe dans DESK_EMAILS, les faire se connecter une fois chacune, et vérifier dans Desk › Équipe qu'il y a au moins deux responsables.",
                "Put the team's addresses in DESK_EMAILS, have each sign in once, and check in Desk › Team that there are at least two responsables.",
              ),
              l(
                "Avec un seul responsable, le contrôle à quatre yeux ne s'applique jamais : chaque geste contrôlé passe seul et se contente de l'inscrire à l'audit.",
                "With a single responsable, the four-eyes control never applies: every controlled move passes alone and merely records it in the audit.",
              ),
            ],
          ],
        },
      ],
    },
    {
      id: "reprendre",
      title: l("Le jour où quelqu'un manque", "The day someone is unavailable"),
      blocks: [
        {
          type: "steps",
          items: [
            l(
              "Ouvrir le coffre partagé et prendre les identifiants de techguichet@purposecapital.africa. La graine du second facteur y est rangée à part : l'ajouter à son application d'authentification donne le code à six chiffres. Les codes de secours sont dans un troisième article, et ne servent que si l'application est perdue.",
              "Open the shared vault and take the credentials of techguichet@purposecapital.africa. The recovery key is with the designated second person; it alone gets past the second factor.",
            ),
            l(
              "Entrer dans Vercel avec l'adresse de rôle : tout part de là, puisque les clés y sont. Vérifier que le dernier déploiement est bien celui du dernier envoi sur master.",
              "Sign in to Vercel with the role address: everything starts there, since the secrets are there. Check that the latest deployment matches the latest push to master.",
            ),
            l(
              "Entrer dans Supabase, vérifier que le projet est actif et que la dernière migration appliquée correspond au dépôt.",
              "Sign in to Supabase, check the project is active and the last applied migration matches the repository.",
            ),
            l(
              "Se promouvoir responsable dans l'application : depuis Supabase › Users si plus aucun responsable ne peut se connecter, sinon depuis Desk › Équipe.",
              "Promote yourself to responsable in the application: from Supabase › Users if no responsable can sign in any more, otherwise from Desk › Team.",
            ),
            l(
              "Lire Santé. C'est la page qui dit en un écran ce qui ne tourne plus, et elle le dit avant que les clients ne s'en aperçoivent.",
              "Read Health. It is the page that says in one screen what has stopped working, and it says so before clients notice.",
            ),
          ],
        },
        {
          type: "note",
          kind: "warn",
          text: l(
            "Ne jamais partager le mot de passe de l'adresse de rôle pour donner un accès : inviter la personne nominativement. Un mot de passe partagé une fois est partagé pour toujours, et la trace de qui a agi est perdue au premier partage.",
            "Never share the role address's password to grant access: invite the person by name. A password shared once is shared forever, and the trace of who acted is lost at the first sharing.",
          ),
        },
      ],
    },
  ],
};
