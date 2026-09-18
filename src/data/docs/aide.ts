import { l, type DocPage } from "./types";

/**
 * The client help page — the only page rendered outside the desk (/info/aide).
 * Written for clients alone: answers, never procedures; no internal names.
 * A test refuses any internal detail in a public page.
 */
export const AIDE: DocPage = {
  slug: "aide",
  title: l("Aide : vos questions, nos réponses", "Help: your questions, our answers"),
  summary: l("Comment Guichet fonctionne pour vous : se connecter, lire une ligne, déclarer une intention, suivre vos ordres, recevoir vos documents, nous joindre.", "How Guichet works for you: signing in, reading a line, declaring an intention, following your orders, receiving your documents, reaching us."),
  visibility: "public",
  audience: ["client"],
  order: 0,
  checkedOn: "2026-09-18",
  owner: "Desk",
  chapters: [
    {
      id: "guichet",
      title: l("Ce qu'est Guichet, et ce qu'il n'est pas", "What Guichet is, and is not"),
      blocks: [
        { type: "lead", text: l("Guichet est le comptoir en ligne de Purpose Capital, société de bourse agréée par la COSUMAF. Vous y voyez les placements de la zone CEMAC avec leurs chiffres expliqués, vous nous dites ce que vous souhaitez faire, et un conseiller vous rappelle avant tout engagement.", "Guichet is the online counter of Purpose Capital, a brokerage firm licensed by the COSUMAF. You see the CEMAC zone's investments with their figures explained, you tell us what you wish to do, and an adviser calls you back before any commitment.") },
        {
          type: "list",
          items: [
            l("Guichet ne débite jamais votre compte : un règlement se fait par virement, uniquement sur le compte indiqué dans l'appel de fonds que vous recevez.", "Guichet never debits your account: settlement is a transfer, only to the account shown in the call for funds you receive."),
            l("Guichet ne donne pas de conseil : chaque chiffre est expliqué, jamais recommandé. Les risques de chaque ligne sont écrits sous « À garder en tête ».", "Guichet gives no advice: every figure is explained, never recommended. Each line's risks are written under \"Keep in mind\"."),
            l("Les rendements affichés sont bruts, avant commission et fiscalité ; les conditions vous sont communiquées par votre conseiller.", "Yields shown are gross, before commission and tax; terms are communicated by your adviser."),
          ],
        },
      ],
    },
    {
      id: "connexion",
      title: l("Se connecter", "Signing in"),
      blocks: [
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Où est mon mot de passe ?", "Where is my password?"), l("Il n'y en a pas. À chaque connexion, vous recevez un code à six chiffres par e-mail ; il vaut dix minutes. Le dernier code reçu est toujours le bon.", "There is none. At each sign-in you receive a six-digit code by e-mail; it is valid ten minutes. The latest code received is always the right one.")],
            [l("Je n'ai pas reçu le code", "I did not get the code"), l("Vérifiez le dossier indésirable, puis demandez un nouveau code. Si rien n'arrive en quelques minutes, écrivez-nous sur WhatsApp : nous vérifions l'adresse enregistrée.", "Check the junk folder, then ask for a new code. If nothing comes within a few minutes, write to us on WhatsApp: we check the registered address.")],
            [l("J'ai changé d'adresse e-mail ou de numéro", "I changed my e-mail address or number"), l("Dites-le-nous sur WhatsApp ou par téléphone ; après vérification de votre identité, nous mettons votre profil à jour.", "Tell us on WhatsApp or by phone; after verifying your identity, we update your profile.")],
            [l("Puis-je utiliser Guichet sur mon téléphone ?", "Can I use Guichet on my phone?"), l("Oui, dans le navigateur, sans rien installer. La barre du bas donne Guichet, Fonds, Mon espace, Info ; l'icône journal ouvre les actualités. Le bouton FR · EN change la langue.", "Yes, in the browser, nothing to install. The bottom bar gives Guichet, Funds, My space, Info; the newspaper icon opens the news. The FR · EN button changes the language.")],
          ],
        },
      ],
    },
    {
      id: "compte",
      title: l("Ouvrir un compte", "Opening an account"),
      blocks: [
        { type: "flow", steps: [l("Vous remplissez le dossier (cinq minutes)", "You fill in the file (five minutes)"), l("Vous le soumettez", "You submit it"), l("Nous le complétons avec vous si besoin", "We complete it with you if needed"), l("Approuvé : votre compte-titres est ouvert", "Approved: your custody account is opened")] },
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Quelles pièces préparer ?", "Which documents to prepare?"), l("Personne physique : pièce d'identité, selfie, justificatif de domicile, RIB, attestation NIU. Entreprise : extrait RCCM, statuts, pouvoirs des signataires, bénéficiaires effectifs, RIB. Groupement : récépissé ou acte constitutif, PV des mandataires, liste des membres, matrice des signataires.", "Individual: ID, selfie, proof of address, bank details, tax identifier. Company: trade register extract, articles, signatories' powers, beneficial owners, bank details. Group: receipt or founding deed, proxies' minutes, list of members, signatory matrix.")],
            [l("Puis-je déclarer une intention avant que mon dossier soit approuvé ?", "Can I declare an intention before my file is approved?"), l("Oui, dès qu'il est soumis. L'approbation est nécessaire avant que votre ordre soit transmis.", "Yes, as soon as it is submitted. Approval is needed before your order is transmitted.")],
            [l("Où en est mon dossier ?", "Where does my file stand?"), l("Dans Mon espace : brouillon, soumis, en revue (nous vous avons demandé un complément) ou approuvé.", "In My space: draft, submitted, under review (we asked you for more) or approved.")],
          ],
        },
      ],
    },
    {
      id: "lignes",
      title: l("Lire une ligne", "Reading a line"),
      blocks: [
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Pourquoi le rendement n'est-il pas le coupon ?", "Why is the yield not the coupon?"), l("Le coupon est fixé à l'émission ; le rendement dépend du prix que vous payez. Sous 100 % du nominal, vous gagnez plus que le coupon. Le simulateur dans Info le montre en changeant le prix.", "The coupon is set at issue; the yield depends on the price you pay. Below 100% of par you earn more than the coupon. The simulator under Info shows it as you change the price.")],
            [l("Que veut dire « si servi à 93 % » ?", "What does \"if served at 93%\" mean?"), l("À une adjudication du Trésor, nous présentons vos ordres au prix que nous publions ; le Trésor sert les meilleures offres, en partie ou pas du tout. Le rendement affiché suppose que vous êtes servi à ce prix.", "At a Treasury auction we present your orders at the price we publish; the Treasury serves the best bids, in part or not at all. The yield shown assumes you are served at that price.")],
            [l("Le cours d'une société a baissé d'un coup", "A company's price dropped suddenly"), l("Regardez les actualités et la fiche : souvent c'est le dividende qui sort du cours, ou une cotation suspendue en attente d'un communiqué.", "Look at the news and the page: often it is the dividend leaving the price, or a quotation suspended pending a notice.")],
            [l("Un fonds s'achète à quel prix ?", "At what price is a fund bought?"), l("À la prochaine valeur liquidative, pas à celle affichée. La fiche dit si elle est calculée chaque jour ou chaque semaine.", "At the next net asset value, not the one shown. The page says whether it is computed daily or weekly.")],
            [l("Que signifie le bouton « i » ?", "What does the \"i\" button mean?"), l("Une explication d'une phrase du terme, et un lien vers la leçon de deux minutes qui va avec.", "A one-sentence explanation of the term, and a link to the two-minute lesson that goes with it.")],
          ],
        },
      ],
    },
    {
      id: "intentions",
      title: l("Déclarer une intention, suivre un ordre", "Declaring an intention, following an order"),
      blocks: [
        { type: "lead", text: l("Une intention n'est pas un ordre : vous dites ce que vous voulez, un conseiller vous rappelle, confirme avec vous, puis transmet. Rien n'est engagé sans votre confirmation.", "An intention is not an order: you say what you want, an adviser calls you back, confirms with you, then transmits. Nothing is committed without your confirmation.") },
        { type: "flow", steps: [l("Reçue", "Received"), l("Confirmée avec vous", "Confirmed with you"), l("Transmise", "Transmitted"), l("Servie ou non servie", "Served or not served"), l("Réglée", "Settled")] },
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Quelle différence entre appétit et prise ferme ?", "What is the difference between interest and a firm order?"), l("L'appétit dit « je serais intéressé pour environ tel montant », sans engagement. La prise ferme dit « je souscris ce montant » : vous recevez un bulletin d'ordre à signer et un appel de fonds.", "Interest says \"I would be interested for roughly this amount\", without commitment. A firm order says \"I subscribe this amount\": you receive an order form to sign and a call for funds.")],
            [l("Je me suis trompé de montant", "I entered the wrong amount"), l("Écrivez-nous tout de suite : tant que l'ordre n'est pas transmis, nous le corrigeons avec vous.", "Write to us right away: as long as the order is not transmitted, we correct it with you.")],
            [l("Où suivre mes ordres ?", "Where do I follow my orders?"), l("Mon espace montre chaque intention avec sa référence (par exemple PF-0914-017), son état et ses documents.", "My space shows each intention with its reference (for example PF-0914-017), its state and its documents.")],
            [l("Comment vendre mes titres ?", "How do I sell my securities?"), l("Depuis la fiche du rachat (quand l'émetteur reprend ses titres) ou de la ligne cotée : déposez une cession, un conseiller vous rappelle.", "From the buyback page (when the issuer takes back its securities) or the listed line's page: file a sale, an adviser calls you back.")],
          ],
        },
      ],
    },
    {
      id: "reglement",
      title: l("Régler, recevoir ses documents", "Settling, receiving your documents"),
      blocks: [
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Où envoyer l'argent ?", "Where do I send the money?"), l("Uniquement sur le compte indiqué dans votre appel de fonds, avec la référence de l'ordre. Nous ne vous demanderons jamais un virement vers un autre compte : si cela arrive, ne payez pas et appelez-nous.", "Only to the account shown in your call for funds, with the order's reference. We will never ask you for a transfer to another account: if that happens, do not pay and call us.")],
            [l("Quels documents vais-je recevoir ?", "Which documents will I receive?"), l("Un accusé de réception, le bulletin d'ordre et l'appel de fonds à la confirmation, l'avis de résultat, puis les avis de coupon et relevés de position pendant la vie du titre. Tous sont dans Mon espace › Documents et vous sont envoyés sur WhatsApp ou par e-mail.", "An acknowledgement, the order form and call for funds at confirmation, the result notice, then coupon notices and position statements during the life of the security. All are in My space › Documents and are sent to you on WhatsApp or by e-mail.")],
            [l("Je n'ai pas reçu un document", "I did not get a document"), l("Il est toujours dans Mon espace › Documents ; demandez-nous de le renvoyer sur l'autre canal.", "It is always in My space › Documents; ask us to resend it on the other channel.")],
          ],
        },
      ],
    },
    {
      id: "contact",
      title: l("Nous joindre, être prévenu", "Reaching us, being told"),
      blocks: [
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Comment poser une question ?", "How do I ask a question?"), l("Le bouton « Information » de chaque fiche ouvre la conversation WhatsApp avec Purpose Capital ; vous pouvez aussi nous appeler ou nous écrire. Un robot répond aux questions simples sur les lignes publiées ; un conseiller prend le relais dès que la question le demande.", "The \"Information\" button on each page opens the WhatsApp conversation with Purpose Capital; you can also call or write to us. A robot answers simple questions on published lines; an adviser takes over as soon as the question requires it.")],
            [l("Quels messages vais-je recevoir ?", "Which messages will I receive?"), l("Les nouvelles lignes, les mises à jour des lignes que vous suivez, vos avis et documents, et le vendredi un résumé des actualités. Répondez STOP sur WhatsApp pour arrêter, START pour reprendre ; les réglages sont dans Mon espace.", "New lines, updates on the lines you follow, your notices and documents, and on Friday a news digest. Reply STOP on WhatsApp to stop, START to resume; settings are in My space.")],
            [l("Que faites-vous de mes données ?", "What do you do with my data?"), l("Elles servent à ouvrir et tenir votre compte, à exécuter vos ordres et à répondre aux obligations réglementaires. Elles ne sont ni vendues ni partagées hors de ce cadre ; les documents réglementaires sont conservés la durée légale.", "They are used to open and keep your account, execute your orders and meet regulatory obligations. They are neither sold nor shared beyond that; regulatory documents are kept for the legal period.")],
            [l("Comment faire une réclamation ?", "How do I make a complaint?"), l("Par écrit, sur WhatsApp ou par e-mail, avec la référence concernée ; un responsable vous répond.", "In writing, on WhatsApp or by e-mail, with the reference concerned; a manager answers you.")],
          ],
        },
      ],
    },
    {
      id: "entretien",
      title: l("Comment Guichet est entretenu", "How Guichet is looked after"),
      blocks: [
        { type: "lead", text: l("Guichet est mis à jour souvent, par petites touches, sans interruption de service. Ce que vous voyez est relu par une personne avant d'être publié ; ce qui tourne tout seul est surveillé chaque matin.", "Guichet is updated often, in small steps, with no service interruption. What you see is read by a person before it is published; what runs by itself is checked every morning.") },
        {
          type: "table",
          head: [l("Question", "Question"), l("Réponse", "Answer")],
          rows: [
            [l("Qui écrit ce que je lis ?", "Who writes what I read?"), l("Chaque ligne, chaque actualité et chaque chiffre publié passe par un membre du desk qui le vérifie et le signe ; l'explication des termes et les leçons sont tenues à jour par la même équipe. Rien n'est publié par une machine seule.", "Every line, every news item and every published figure goes through a desk member who checks and signs it; the explanation of terms and the lessons are kept up to date by the same team. Nothing is published by a machine on its own.")],
            [l("D'où viennent les cours et les valeurs liquidatives ?", "Where do prices and net asset values come from?"), l("Du bulletin officiel de la BVMAC, lu chaque soir de bourse, et des sociétés de gestion pour les fonds. Un cours saisi à la main est signalé comme tel sur la fiche.", "From the BVMAC official bulletin, read every trading evening, and from the fund managers for funds. A manually entered price is flagged as such on the page.")],
            [l("À quelle fréquence l'application change-t-elle ?", "How often does the app change?"), l("Plusieurs fois par semaine, par petites améliorations ; votre adresse, vos identifiants et vos documents ne changent pas. Quand un écran change, son guide et son aide changent avec lui.", "Several times a week, in small improvements; your address, your sign-in and your documents do not change. When a screen changes, its guide and its help change with it.")],
            [l("Que se passe-t-il en cas de panne ?", "What happens if something breaks?"), l("L'équipe est prévenue automatiquement et revient à la version précédente en quelques minutes. Vos intentions, ordres et documents sont conservés et sauvegardés chaque jour ; aucun paiement ne passe par l'application, donc aucun paiement ne peut être perdu.", "The team is alerted automatically and returns to the previous version within minutes. Your intentions, orders and documents are kept and backed up every day; no payment goes through the app, so no payment can be lost.")],
            [l("Un chiffre ou un texte vous semble faux ?", "A figure or a text looks wrong?"), l("Dites-le-nous sur WhatsApp ou par e-mail, en indiquant la page. Une erreur signalée est corrigée à la source, pour tout le monde, et la correction est tracée.", "Tell us on WhatsApp or by e-mail, naming the page. A reported error is fixed at the source, for everyone, and the fix is traced.")],
            [l("Mes données sont-elles en sécurité ?", "Is my data safe?"), l("Vos données sont stockées chiffrées, en Europe, chez un hébergeur spécialisé ; chacun ne voit que ce qui le concerne ; le desk y accède avec un second facteur. Elles ne sont ni vendues ni partagées hors du cadre réglementaire.", "Your data is stored encrypted, in Europe, with a specialised host; everyone sees only what concerns them; the desk reaches it with a second factor. It is neither sold nor shared beyond the regulatory framework.")],
          ],
        },
      ],
    },
  ],
};
