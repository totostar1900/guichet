import { l, type DocPage } from "./types";

/** The support playbook: symptom → what to check → what to say → whom to escalate to. */
export const SUPPORT: DocPage = {
  slug: "support",
  title: l("Aider un client : le guide du support", "Helping a client: the support guide"),
  summary: l("Les situations qu'un client rapporte, ce qu'on vérifie, ce qu'on répond en clair, et quand on passe la main.", "The situations a client reports, what to check, what to answer plainly, and when to hand over."),
  visibility: "desk",
  audience: ["desk"],
  order: 3,
  checkedOn: "2026-09-18",
  owner: "Desk",
  chapters: [
    {
      id: "regles",
      title: l("Trois règles avant de répondre", "Three rules before answering"),
      blocks: [
        {
          type: "list",
          items: [
            l("On informe, on ne conseille pas : « voici ce que la ligne rapporte et ses risques » ; jamais « vous devriez ».", "We inform, we do not advise: \"here is what the line earns and its risks\"; never \"you should\"."),
            l("On ne parle jamais d'un autre client, et on vérifie l'identité avant de parler d'un dossier : numéro ou e-mail du profil, référence de l'intention.", "We never speak about another client, and we verify identity before discussing a file: the profile's number or e-mail, the intention's reference."),
            l("Tout échange avec un client passe par les canaux de la société (WhatsApp du numéro de la société, e-mail, téléphone du desk), jamais un compte personnel ; la réponse écrite se fait depuis Desk › Messages, elle est ainsi gardée.", "Every exchange goes through the company's channels (the company WhatsApp number, e-mail, desk phone), never a personal account; written replies are sent from Desk › Messages, so they are kept."),
          ],
        },
      ],
    },
    {
      id: "connexion",
      title: l("Connexion et compte", "Sign-in and account"),
      blocks: [
        {
          type: "table",
          head: [l("Le client dit", "The client says"), l("On vérifie", "We check"), l("On répond", "We answer"), l("Si ça ne suffit pas", "If that is not enough")],
          rows: [
            [l("« Je n'ai pas reçu le code »", "\"I did not get the code\""), l("Adresse tapée sans faute ? Dossier spam ? Le code expire en dix minutes ; un nouveau code annule l'ancien.", "Address typed correctly? Spam folder? The code expires in ten minutes; a new code cancels the old one."), l("« Vérifiez le dossier indésirable, puis demandez un nouveau code sur la page de connexion ; le dernier reçu est le bon. »", "\"Check the junk folder, then ask for a new code on the sign-in page; the latest one is the right one.\""), l("Desk › Santé indique si l'e-mail est configuré ; si Resend a une panne, le responsable regarde resend.com › Logs.", "Desk › Health says whether e-mail is configured; if Resend is down, the manager checks resend.com › Logs.")],
            [l("« J'ai changé d'adresse e-mail »", "\"I changed my e-mail address\""), l("Identité confirmée par téléphone ou par le numéro WhatsApp du profil.", "Identity confirmed by phone or by the profile's WhatsApp number."), l("« Un responsable change l'adresse ; vous recevrez un code sur la nouvelle. »", "\"A manager changes the address; you will get a code on the new one.\""), l("Responsable : Supabase › Authentication › Users › modifier l'e-mail ; noter la demande dans Messages.", "Manager: Supabase › Authentication › Users › edit the e-mail; note the request in Messages.")],
            [l("« Mon compte est bloqué / je ne vois pas Souscrire »", "\"My account is blocked / I cannot see Subscribe\""), l("Dossier KYC : brouillon, soumis, en revue ou approuvé ? Fonds : sous convention ?", "KYC file: draft, submitted, under review or approved? Fund: under agreement?"), l("« Votre dossier est à l'étape X ; il manque Y » (la liste est dans Dossiers). Pour un fonds : « ce fonds n'est pas encore distribué par nous ».", "\"Your file is at step X; Y is missing\" (the list is under Files). For a fund: \"this fund is not distributed by us yet\"."), l("Compléter le dossier avec le client (Desk › Dossiers › demander des compléments).", "Complete the file with the client (Desk › Files › ask for more).")],
            [l("« Je veux supprimer mon compte / mes données »", "\"I want my account / data deleted\""), l("Demande écrite ; positions ouvertes ?", "Written request; open positions?"), l("« Nous fermons l'accès ; les documents réglementaires sont conservés la durée légale. »", "\"We close access; regulatory documents are kept for the legal period.\""), l("Responsable : bloquer dans Supabase › Users, journaliser ; ne rien effacer du journal.", "Manager: block in Supabase › Users, log it; erase nothing from the audit log.")],
          ],
        },
      ],
    },
    {
      id: "intentions",
      title: l("Intentions, ordres, règlement", "Intentions, orders, settlement"),
      blocks: [
        {
          type: "table",
          head: [l("Le client dit", "The client says"), l("On vérifie", "We check"), l("On répond", "We answer"), l("Si ça ne suffit pas", "If that is not enough")],
          rows: [
            [l("« Mon intention est-elle bien enregistrée ? »", "\"Is my intention recorded?\""), l("Desk › Carnet : la référence (PF-, AP-…) et son état.", "Desk › Book: the reference and its state."), l("« Oui, référence X, à l'état Y ; un conseiller vous rappelle avant transmission. »", "\"Yes, reference X, state Y; an adviser calls you before transmission.\""), l("Si absente : la reprendre au téléphone et la saisir depuis la fiche.", "If absent: take it over the phone and enter it from the line page.")],
            [l("« Je me suis trompé de montant »", "\"I entered the wrong amount\""), l("État : tant qu'elle est « reçue » ou « confirmée », on modifie ; « transmise », c'est le bordereau qui fait foi.", "State: while \"received\" or \"confirmed\", we edit; \"transmitted\", the slip prevails."), l("« Nous corrigeons » ou « le bordereau est parti ; nous verrons à l'allocation ».", "\"We correct it\" or \"the slip has gone; we will see at allocation\"."), l("Desk › intention › modifier le montant (journalisé) ; après transmission, en parler au responsable.", "Desk › intention › edit the amount (logged); after transmission, talk to the manager.")],
            [l("« Combien serai-je servi ? À quel prix ? »", "\"How much will I be served? At what price?\""), l("La ligne : prix publié, indicatif ou servi.", "The line: published, indicative or served price."), l("« Le prix que nous publions est celui auquel vos ordres sont présentés ; le Trésor sert en partie ou pas du tout ; l'avis de résultat vous le dira. » Jamais de promesse.", "\"The price we publish is the one your orders are presented at; the Treasury serves in part or not at all; the result notice will tell you.\" Never a promise."), l("—", "—")],
            [l("« Je n'ai pas reçu mon avis / mon appel de fonds »", "\"I did not get my notice / call for funds\""), l("Desk › Documents : généré ? envoyé ? canal ? erreur ?", "Desk › Documents: generated? sent? channel? error?"), l("« Il est dans Mon espace › Documents ; je vous le renvoie sur WhatsApp. »", "\"It is in My space › Documents; I resend it on WhatsApp.\""), l("Renvoyer depuis Documents ; si WhatsApp échoue (fenêtre de 24 h close), par e-mail.", "Resend from Documents; if WhatsApp fails (24 h window closed), by e-mail.")],
            [l("« Où envoyer l'argent ? »", "\"Where do I send the money?\""), l("L'appel de fonds porte les coordonnées du compte de règlement.", "The call for funds carries the settlement account details."), l("« Uniquement sur le compte indiqué dans l'appel de fonds, avec la référence ; jamais sur un autre compte, même si on vous le demande. »", "\"Only to the account shown in the call for funds, with the reference; never to another account, even if asked.\""), l("Toute demande de changement de compte = fraude possible : responsable.", "Any request to change the account = possible fraud: manager.")],
            [l("« Je veux vendre mes titres »", "\"I want to sell my securities\""), l("Position dans Mon espace ; rachat ouvert ou marché secondaire ?", "Position in My space; buyback open or secondary market?"), l("« Déposez une cession depuis la fiche du rachat ou de la ligne cotée ; un conseiller vous rappelle. »", "\"File a sale from the buyback or the listed line's page; an adviser calls back.\""), l("Aucune vente hors de ces deux voies.", "No sale outside these two routes.")],
          ],
        },
      ],
    },
    {
      id: "chiffres",
      title: l("Questions sur les chiffres", "Questions about figures"),
      blocks: [
        {
          type: "table",
          head: [l("Le client dit", "The client says"), l("On répond", "We answer")],
          rows: [
            [l("« Pourquoi le rendement n'est pas le coupon ? »", "\"Why is the yield not the coupon?\""), l("« Le coupon est fixé à l'émission ; le rendement dépend du prix que vous payez. Sous 100 %, vous gagnez plus que le coupon ; le simulateur dans Info le montre. »", "\"The coupon is set at issue; the yield depends on the price you pay. Below 100% you earn more than the coupon; the simulator under Info shows it.\"")],
            [l("« Le cours de la société a baissé d'un coup »", "\"The company's price dropped suddenly\""), l("Vérifier Actualités et la fiche : dividende détaché ? suspension ? « C'est le dividende qui sort du cours » ou « la cotation est suspendue dans l'attente d'un communiqué ».", "Check News and the page: dividend detached? suspension? \"It is the dividend leaving the price\" or \"quotation is suspended pending a notice\".")],
            [l("« Est-ce que c'est garanti ? »", "\"Is it guaranteed?\""), l("« Non. Un titre du Trésor est une dette de l'État ; une action peut monter ou descendre ; un fonds se souscrit à la prochaine valeur. Les risques sont listés sous “À garder en tête” sur chaque fiche. »", "\"No. A Treasury security is State debt; a share can rise or fall; a fund is bought at the next value. The risks are listed under 'Keep in mind' on every page.\"")],
            [l("« Quels sont vos frais ? »", "\"What are your fees?\""), l("« Les conditions vous sont communiquées par votre conseiller à la confirmation ; les chiffres affichés sont bruts, avant commission et fiscalité. »", "\"Terms are communicated by your adviser at confirmation; the figures shown are gross, before commission and tax.\"")],
            [l("« Que me conseillez-vous ? »", "\"What do you recommend?\""), l("« Nous ne donnons pas de conseil ; nous pouvons vous expliquer chaque ligne et comparer deux lignes ensemble (Info › Comparer). »", "\"We do not give advice; we can explain every line and compare two lines together (Info › Compare).\"")],
          ],
        },
      ],
    },
    {
      id: "technique",
      title: l("Problèmes techniques", "Technical problems"),
      blocks: [
        {
          type: "table",
          head: [l("Le client dit", "The client says"), l("On vérifie", "We check"), l("On répond / on fait", "We answer / we do")],
          rows: [
            [l("« La page ne s'ouvre pas / est lente »", "\"The page does not open / is slow\""), l("Ouvrir soi-même la page ; Desk › Santé ; vercel.com › statut du déploiement.", "Open the page ourselves; Desk › Health; vercel.com › deployment status."), l("Si tout va bien chez nous : « fermez l'application, rouvrez ; essayez en Wi-Fi ». Sinon : le responsable regarde Vercel › Deployments et redéploie la version précédente (Rollback).", "If fine on our side: \"close the app, reopen; try on Wi-Fi\". Otherwise the manager checks Vercel › Deployments and redeploys the previous version (Rollback).")],
            [l("« Les chiffres sont en anglais / en français »", "\"The figures are in English / French\""), l("Bouton FR · EN en haut ; le choix est gardé sur l'appareil.", "FR · EN button at the top; the choice is kept on the device."), l("Montrer le bouton.", "Show the button.")],
            [l("« Je ne reçois pas les notifications »", "\"I do not receive notifications\""), l("Mon espace › Préférences : WhatsApp accepté ? notifications activées ? A-t-il répondu STOP ?", "My space › Preferences: WhatsApp accepted? notifications on? Did they reply STOP?"), l("« Répondez START sur WhatsApp » ou activer les notifications depuis Mon espace.", "\"Reply START on WhatsApp\" or enable notifications from My space.")],
            [l("« Le robot m'a mal répondu »", "\"The robot answered wrongly\""), l("Desk › Messages : la conversation ; Desk › Robot : rejouer la question.", "Desk › Messages: the conversation; Desk › Robot: replay the question."), l("Répondre soi-même dans Messages ; signaler la question au responsable pour corriger le glossaire ou couper le robot (BOT_ENABLED=0) si nécessaire.", "Reply ourselves in Messages; report the question to the manager to fix the glossary or cut the robot if needed.")],
            [l("« Un document PDF ne s'ouvre pas »", "\"A PDF does not open\""), l("Desk › Documents : l'ouvrir soi-même.", "Desk › Documents: open it ourselves."), l("Le renvoyer par l'autre canal ; s'il est corrompu, le régénérer depuis l'intention.", "Resend by the other channel; if corrupt, regenerate it from the intention.")],
          ],
        },
        { type: "note", kind: "warn", text: l("Quand on passe la main : toute suspicion de fraude, une réclamation formelle, une demande de conseil insistante, une panne visible par plusieurs clients → responsable, tout de suite, avec la référence de la conversation.", "When to hand over: any suspicion of fraud, a formal complaint, an insistent request for advice, an outage seen by several clients → the manager, immediately, with the conversation's reference.") },
      ],
    },
  ],
};
