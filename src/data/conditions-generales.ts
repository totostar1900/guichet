/**
 * LES CONDITIONS GÉNÉRALES DU GUICHET ET DU COMPTE-TITRES (20 novembre 2026, le client : « publie les conditions générales »).
 *
 * Publiées en LECTURE SEULE, en français (la version française fait foi) : cette page ne change ni la version des mentions légales ni leur acceptation, personne n'a donc à les accepter de nouveau. Le texte est tiré du projet rédigé le même jour, privé de ses parties de travail (comment le lire, points à trancher, incohérences repérées) et de tout passage dont la valeur restait à fournir (capital social, délais, droit applicable, juridiction, inactivité du compte, compte unique, intérêts, politique d'exécution) : un blanc ne se publie pas, il est omis, et la liste des omissions reste au projet.
 * AUCUN TARIF, AUCUNE DESTINATION DES FRAIS : le client lit UNE ligne, les frais totaux à payer (CLAUDE.md). Le paragraphe du projet qui nommait ceux qui perçoivent des frais n'est donc pas repris.
 * UNE FOIS ENGAGÉES, les conditions s'écrivent ici ; le jour où le conseil les a validées et où l'on veut les faire accepter, elles rejoignent `legal.ts` et la version change.
 */
export const CONDITIONS_GENERALES_VERSION = "2026-11-20";

export type BlocDeCG = string | { liste: string[] };
export type ArticleDeCG = { id: string; titre: string; blocs: BlocDeCG[] };

export const CONDITIONS_GENERALES_INTRO =
  "Ces conditions fixent les règles d'accès et d'utilisation du Guichet, et les règles générales du compte-titres que Purpose Capital S.A. ouvre à votre nom. Elles complètent la Convention de compte-titres et les Mentions légales ; elles ne publient aucun tarif.";

export const ARTICLES_DES_CG: ArticleDeCG[] = [
  {
    id: "definitions",
    titre: "Article 1 · Définitions",
    blocs: [
      "Dans ces conditions, on entend par :",
      "« Purpose Capital », « nous » : Purpose Capital S.A., société de bourse agréée par la COSUMAF, dont les coordonnées sont à l'article 3.",
      "« Guichet » : l'application web et mobile, et le site qui la présente, par lesquels vous consultez le marché, déclarez vos intentions, signez vos ordres et suivez votre compte.",
      "« Vous », « le Client » : la personne physique ou morale, ou le groupement, qui utilise le Guichet ou est titulaire d'un compte-titres chez nous.",
      "« Compte d'accès » : l'espace que vous créez avec votre adresse e-mail et votre numéro de téléphone. Il vous permet de consulter le marché et de préparer votre dossier. Il n'ouvre pas un compte-titres.",
      "« Compte-titres » : le compte, ouvert à votre nom après approbation de votre dossier et signature de la convention, qui reçoit les instruments financiers que vous acquérez par notre intermédiaire.",
      "« Dossier » : l'ensemble des informations et pièces que nous recueillons pour vous identifier et évaluer votre situation.",
      "« Intention » : ce que vous déclarez vouloir prendre sur une ligne. Une intention n'est ni un ordre ni une garantie d'allocation.",
      "« Ordre » : l'instruction que vous signez et que nous transmettons ou exécutons.",
      "« Ligne » : un instrument ou une opération présentés dans le Guichet (titre coté, fonds, adjudication du Trésor, opération d'appel public à l'épargne).",
      "« Code Guichet » : le code à six chiffres que vous choisissez pour ouvrir le Guichet.",
      "« Convention » : la Convention de compte-titres signée par le Client.",
      "« Annexe tarifaire » : le document qui fixe les frais applicables et que nous vous remettons.",
    ],
  },
  {
    id: "objet",
    titre: "Article 2 · Objet, champ et documents contractuels",
    blocs: [
      "2.1 Objet. Ces conditions fixent les règles d'accès et d'utilisation du Guichet, et les règles générales qui s'appliquent au compte-titres que nous ouvrons à votre nom. Elles disent ce que nous faisons, ce que nous vous demandons, et ce que vous pouvez attendre de nous.",
      "2.2 Documents. Votre relation avec nous est faite des documents suivants, du plus spécifique au plus général :",
      {
        liste: [
          "la Convention de compte-titres, signée après l'approbation de votre dossier ;",
          "les présentes conditions générales ;",
          "l'annexe tarifaire ;",
          "les Mentions légales, acceptées avant d'entrer dans le Guichet ;",
          "les informations sur les risques et le Guide du Guichet, consultables à tout moment.",
        ],
      },
      "En cas de contradiction, le document le plus spécifique l'emporte. Ce qui n'est pas écrit dans le Guichet ou envoyé par nous sur l'un de vos deux canaux ne nous engage pas.",
      "2.3 Langue. Ces conditions sont publiées en français ; la version française fait foi.",
      "2.4 Services concernés. Les services fournis par l'intermédiaire du Guichet sont ceux décrits à l'article 7. Aucun service n'est fourni en dehors de ce cadre.",
    ],
  },
  {
    id: "qui-nous-sommes",
    titre: "Article 3 · Qui nous sommes",
    blocs: [
      "Purpose Capital S.A., société de bourse agréée par la Commission de Surveillance du Marché Financier de l'Afrique Centrale (COSUMAF), n° d'agrément COSUMAF-SDB-01/2026.",
      "Siège : Rue Joseph Essono Balla, Elig-Essono, Yaoundé, Cameroun.",
      "Contact : info@purposecapital.africa · +237 6 87 67 67 67.",
      "Autorité de supervision : COSUMAF.",
      "Nous intervenons sur le marché monétaire de la CEMAC (bons et obligations du Trésor), à la Bourse des Valeurs Mobilières de l'Afrique Centrale (BVMAC : actions, obligations, parts d'organismes de placement collectif) et sur les opérations d'appel public à l'épargne que nous présentons dans le Guichet.",
    ],
  },
  {
    id: "acces",
    titre: "Article 4 · Accès au Guichet et création du compte d'accès",
    blocs: [
      "4.1 Qui peut créer un compte d'accès. Toute personne majeure et capable, ou toute personne morale ou groupement représenté par une personne habilitée.",
      "4.2 Ce que nous vous demandons d'abord : peu. Pour créer votre compte d'accès, nous vous demandons :",
      {
        liste: [
          "une adresse e-mail, prouvée par un code que nous vous envoyons ;",
          "un numéro de téléphone, prouvé par un code reçu sur WhatsApp ou par SMS ;",
          "votre prénom, pour vous accueillir ;",
          "votre acceptation des Mentions légales ;",
          "le choix de votre code Guichet, à six chiffres.",
        ],
      },
      "Rien d'autre n'est demandé à ce stade : ni pièce d'identité, ni photographie, ni justificatif. Vous pouvez parcourir le marché, les taux, les séances annoncées et les publications, suivre des lignes et activer des alertes.",
      "4.3 Exactitude. Vous nous donnez des informations exactes et vous nous prévenez sans délai si votre adresse e-mail ou votre numéro de téléphone change. Un canal que nous ne pouvons plus joindre est un canal que nous pouvons suspendre.",
      "4.4 Pas de connexion par un tiers. Votre accès ne passe par aucun compte tiers : le nom et l'adresse viennent de vous, et non d'un profil d'un autre service.",
      "4.5 Un compte d'accès par personne. Votre compte d'accès est personnel. Il ne se prête pas, ne se vend pas et ne se partage pas.",
      "4.6 Plusieurs appareils. Vous pouvez utiliser le Guichet sur plusieurs appareils avec le même code Guichet. Pour reconnaître un appareil nouveau, nous vous envoyons un code sur l'un de vos canaux, puis vous choisissez ou confirmez votre code Guichet.",
    ],
  },
  {
    id: "ouverture",
    titre: "Article 5 · Ouverture du compte-titres",
    blocs: [
      "5.1 Le dossier, à votre rythme. Quand vous souhaitez investir, vous complétez votre dossier. Vous pouvez le faire en plusieurs fois : ce que vous avez saisi est conservé.",
      "5.2 Ce que nous recueillons. Selon votre catégorie, nous recueillons :",
      {
        liste: [
          "votre identité complète, telle qu'elle figure sur votre pièce d'identité ;",
          "une pièce d'identité (recto et verso) ;",
          "une photographie de vous (selfie) pour vérifier votre visage ;",
          "un relevé d'identité bancaire (RIB) d'un compte à votre nom ;",
          "un justificatif de domicile de moins de trois mois ;",
          "votre attestation d'identifiant fiscal (NIU) si vous êtes résident ;",
          "pour une personne morale ou un groupement, les pièces constitutives et celles de ses représentants (voir l'annexe) ;",
          "les informations sur vos objectifs, votre horizon et votre tolérance au risque, et sur l'origine des fonds.",
        ],
      },
      "Une pièce vous manque ? Vous pouvez envoyer le dossier quand même : un conseiller vous la demandera.",
      "5.3 Notre examen. Nous examinons votre dossier, vérifions votre identité et pouvons vous demander toute pièce complémentaire. Nous pouvons refuser ou suspendre un dossier, notamment en cas de doute sur l'identité ou sur l'origine des fonds, ou lorsque la réglementation l'exige. Nous vous disons que nous avons refusé ; nous ne sommes pas tenus d'en donner le détail lorsque la loi nous l'interdit.",
      "5.4 Aucun ordre avant l'approbation. Tant que votre dossier n'est pas approuvé et la convention signée, vous ne pouvez ni verser d'argent ni passer d'ordre. Vous pouvez en revanche déclarer des intentions, qui ne vous engagent pas.",
      "5.5 Votre catégorie. Nous vous classons « client professionnel » ou « client non professionnel » selon votre dossier. Cette catégorie détermine le niveau de protection et d'information qui vous est dû. Vous pouvez demander à en changer ; nous examinons votre demande.",
      "5.6 La convention. Une fois le dossier approuvé, nous vous présentons la Convention de compte-titres. Elle se signe dans le Guichet. Le compte-titres est ouvert à la date de signature.",
    ],
  },
  {
    id: "securite",
    titre: "Article 6 · La sécurité de votre accès",
    blocs: [
      "6.1 Votre code Guichet. Votre code à six chiffres ouvre le Guichet. C'est le seul code qui l'ouvre. Il est le même sur tous vos appareils. Vous le choisissez vous-même, vous pouvez le modifier à tout moment (nous vous demandons alors l'ancien), et nous n'en connaissons pas le texte : seule une empreinte numérique irréversible est conservée.",
      "6.2 Ce que nous vous demandons. Gardez votre code pour vous. Évitez les suites et les répétitions (123456, 000000). Ne le donnez à personne, pas même à un conseiller de Purpose Capital : nous ne vous le demanderons jamais, ni par téléphone, ni par message, ni par e-mail.",
      "6.3 Cinq codes faux. Après cinq codes faux, votre code est supprimé. Vous n'êtes pas bloqué : l'option « Code oublié ? » vous envoie un code sur l'un de vos canaux, puis vous choisissez un nouveau code. Nous vous prévenons sur vos deux canaux.",
      "6.4 Verrouillage automatique. Le Guichet se verrouille quand vous le quittez plus de cinq minutes, ou après cinq minutes sans y toucher (dix minutes quand un code vient de vous être envoyé, le temps de l'aller chercher). L'aperçu de l'application dans le sélecteur d'applications de votre téléphone est masqué. Ces délais sont fixes. Le verrouillage vous protège contre l'œil qui passe ; il ne remplace ni la prudence ni la protection de votre téléphone.",
      "6.5 Pas de déverrouillage par le téléphone. Le Guichet n'accepte pas l'empreinte, le visage ou le code d'écran de votre téléphone comme moyen d'accès : ces moyens appartiennent au téléphone et peuvent être connus de vos proches. Seul le code Guichet, que vous êtes seul à connaître, ouvre le Guichet.",
      "6.6 Appareils reconnus. Un navigateur que vous avez reconnu peut conserver un code qui lui est propre. Vous voyez la liste de vos appareils dans Paramètres et vous pouvez en oublier un à tout moment. Chaque ajout ou retrait vous est annoncé sur vos deux canaux.",
      "6.7 Perte ou vol de l'appareil, soupçon. Si votre téléphone est perdu ou volé, ou si vous pensez qu'une autre personne connaît votre code : changez votre code dans Paramètres, ou utilisez « Se déconnecter partout » ; puis prévenez-nous à info@purposecapital.africa. Dès que nous sommes prévenus, nous bloquons l'accès et nous vous le confirmons.",
      "6.8 Ce que protège le code. Le code Guichet et le verrouillage protègent l'accès à votre espace. La signature d'un ordre exige, en plus, un code à usage unique envoyé sur l'un de vos canaux (article 8). Quelqu'un qui aurait ouvert votre Guichet ne peut donc pas, à lui seul, passer un ordre.",
    ],
  },
  {
    id: "services",
    titre: "Article 7 · Les services que nous fournissons",
    blocs: [
      "7.1 Ce que nous faisons. Par l'intermédiaire du Guichet, nous :",
      {
        liste: [
          "vous donnons accès à l'information de marché que nous publions (cours, séances, adjudications, indices, publications) ;",
          "recevons vos intentions et vos ordres et les transmettons ou les exécutons selon l'article 8 ;",
          "tenons votre compte-titres et votre journal des espèces ;",
          "vous adressons avis, relevés et documents.",
        ],
      },
      "7.2 Ce que nous ne faisons pas. Sauf convention distincte et signée, nous ne gérons pas votre portefeuille pour votre compte, nous ne vous donnons pas de conseil en investissement personnalisé, et nous n'agissons sur aucune procuration. Une décision qui vous concerne n'est jamais prise par une machine seule : un conseiller du desk intervient lorsqu'un ordre ou une validation l'exige.",
      "7.3 Les informations que vous lisez. Les cours, rendements, comparaisons et simulations sont fournis à titre d'information. Ils reposent sur des sources publiques (bulletins de la cote, communiqués d'adjudication, documents des émetteurs) dont nous indiquons la date. Ils ne constituent ni une offre, ni un conseil, ni une garantie. Un rendement ou une variation passés ne préjugent pas des résultats futurs.",
      "7.4 Disponibilité. Nous visons une disponibilité continue du Guichet, sans la garantir. Nous pouvons l'interrompre pour maintenance, avec ou sans préavis selon l'urgence.",
    ],
  },
  {
    id: "ordres",
    titre: "Article 8 · Intentions, ordres et exécution",
    blocs: [
      "8.1 L'intention n'est pas un ordre. Déclarer une intention sur une ligne ne vous engage pas et ne nous engage pas : ce n'est ni une réservation ni une garantie d'allocation.",
      "8.2 L'ordre naît de votre signature. Vous donnez votre ordre dans votre espace, après avoir relu son récapitulatif (ligne, quantité ou montant, prix ou condition, frais totaux à payer). Vous le signez avec un code à usage unique que nous vous envoyons sur l'un de vos deux canaux. Quand vous réglez votre ordre immédiatement par un moyen de paiement authentifié, le reçu de ce paiement vaut signature de l'ordre qu'il règle. Nous en conservons la preuve et vous en remettons copie.",
      "8.3 Un seul donneur d'ordres. Le compte ne connaît qu'un donneur d'ordres : vous-même. Nous n'acceptons aucune procuration et n'exécutons l'ordre d'aucun tiers. Pour une personne morale ou un groupement, les ordres sont donnés par son représentant légal ou par ses cotitulaires désignés dans le dossier.",
      "8.4 L'argent ne précède jamais l'ordre. L'argent accompagne l'ordre quand le paiement est immédiat, ou le suit quand il est viré, avec la référence imprimée sur l'ordre.",
      "8.5 Exécution. Selon la ligne, l'ordre est :",
      {
        liste: [
          "présenté à une adjudication du Trésor, à la séance et aux conditions annoncées par l'émetteur ;",
          "transmis à la BVMAC pour une valeur cotée, aux horaires et selon les règles de la place ;",
          "servi dans le cadre d'une opération d'appel public à l'épargne ou d'un fonds, aux conditions de son document d'information.",
        ],
      },
      "Nous exécutons dans le meilleur intérêt du client. Un ordre au mieux ne vous fait pas fixer le cours : il est exécuté au prix que la place forme.",
      "8.6 Pas de garantie d'exécution ni d'allocation. Une adjudication peut être servie en partie ou ne pas vous servir : l'allocation dépend de l'offre de l'émetteur et des prix des autres participants. Sur un marché peu échangé, un ordre peut ne pas trouver de contrepartie. Nous vous disons ce qui s'est passé, ligne par ligne, dans « Mes ordres ».",
      "8.7 Modification et annulation. Tant qu'un ordre n'est pas transmis, vous pouvez l'annuler depuis votre espace. Une fois transmis, l'annulation dépend de la règle de la place ; nous vous disons si elle est possible.",
      "8.8 Refus d'un ordre. Nous pouvons refuser ou suspendre un ordre : provision insuffisante, ligne fermée ou retirée, plafond dépassé, doute sur l'origine des fonds, indisponibilité du marché, demande de l'autorité. Nous vous le disons et nous vous restituons ce qui vous revient.",
      "8.9 Avis et justification. Après chaque opération, vous recevez un avis (résultat, nombre de titres, prix, frais totaux, date de règlement) dans vos documents et sur vos canaux.",
      "8.10 Versements programmés. Vous pouvez programmer un versement ou un prélèvement régulier. Vous gardez la main : vous pouvez l'arrêter ou le modifier depuis votre espace, avec effet à la prochaine échéance non encore transmise. Une échéance non provisionnée n'est pas exécutée et vous en êtes informé.",
    ],
  },
  {
    id: "argent",
    titre: "Article 9 · Votre argent : espèces, provision et règlement",
    blocs: [
      "9.1 Un compte de règlement séparé. Les espèces nécessaires à vos opérations transitent par un compte de règlement distinct de nos fonds propres. Nous ne les employons pas pour notre propre compte.",
      "9.2 D'où vient l'argent. Les fonds viennent d'un compte bancaire ouvert à votre nom. Un versement fait par un tiers est refusé et restitué.",
      "9.3 Ce qui vous revient vous appartient. Les sommes qui vous reviennent (coupons, remboursements, produits de cession) vous appartiennent. Elles sont inscrites, mouvement par mouvement, dans votre journal des espèces, que vous consultez à tout moment.",
      "9.4 Reprise. Vous pouvez demander la reprise de vos espèces disponibles vers votre compte bancaire. Nous la traitons dans les meilleurs délais.",
      "9.5 Opposition, saisie. Nous pouvons être tenus de bloquer ou de transférer des sommes ou des titres sur décision d'une autorité compétente. Nous vous en informons dans la mesure où la loi le permet.",
    ],
  },
  {
    id: "titres",
    titre: "Article 10 · Vos instruments financiers : inscription et conservation",
    blocs: [
      "10.1 Des titres dématérialisés, à votre nom. Les titres sont dématérialisés et inscrits à votre nom sur un sous-compte nominatif, sous le regroupement de Purpose Capital, dans les livres du dépositaire désigné pour la ligne concernée.",
      "10.2 Mandat d'ouverture. Vous nous donnez mandat d'ouvrir à votre nom les comptes nécessaires à l'exécution de vos ordres, sans autre formalité.",
      "10.3 Relevés. Vous recevez vos relevés selon la périodicité prévue, et vous consultez votre position à tout moment dans le Guichet. Signalez-nous toute erreur dès que vous la constatez.",
      "10.4 Opérations sur titres. Coupons, remboursements, amortissements, détachements de dividendes, offres publiques : nous vous informons et nous traitons ce qui nous revient d'exécuter. Le cours d'une action peut être ajusté un jour de détachement de dividende sans qu'aucun échange n'ait lieu : cet ajustement n'est pas une variation de prix.",
    ],
  },
  {
    id: "frais",
    titre: "Article 11 · Frais",
    blocs: [
      "11.1 Une seule ligne. Avant chaque opération, le Guichet vous indique une seule ligne : les frais totaux à payer. Rien n'est prélevé que vous n'ayez vu avant de signer.",
      "11.2 Aucun frais d'ouverture. L'ouverture du compte-titres est gratuite.",
      "11.3 Annexe tarifaire. Les frais applicables sont ceux de l'annexe tarifaire remise par votre conseiller et consultable dans votre espace. Elle ne se publie pas sur le site.",
      "11.4 Modification. Toute modification des frais vous est notifiée trente jours avant son application. Si elle ne vous convient pas, vous pouvez résilier sans pénalité pendant ce délai, dans les conditions de l'article 17.",
      "11.5 Fiscalité. Votre situation fiscale vous est propre. Nous ne donnons pas de conseil fiscal ; nous indiquons, lorsque la loi nous y oblige, les retenues que nous opérons.",
    ],
  },
  {
    id: "risques",
    titre: "Article 12 · Les risques, dits clairement",
    blocs: [
      "12.1 Investir comporte un risque. Un placement peut perdre de la valeur, y compris tout son capital. Les titres du Trésor sont des titres de créance d'un État : leur remboursement dépend de sa solvabilité. Les actions, obligations et parts de fonds cotées ou non cotées peuvent se négocier peu, rendre une sortie difficile, ou imposer des délais.",
      "12.2 Ce que nous faisons pour que vous décidiez en connaissance de cause. Nous expliquons les chiffres, nous datons les sources, nous écrivons les risques en toutes lettres à côté des chiffres qu'ils concernent, et nous vous proposons un conseiller pour en parler. Une intention ne vous engage jamais.",
      "12.3 Ce que nous ne pouvons pas faire. Nous ne pouvons ni garantir un rendement, ni prédire un cours, ni vous protéger d'une perte de marché. Les performances passées ne préjugent pas des performances futures.",
      "12.4 Votre décision. Vous décidez seul, avec les informations dont vous disposez, en fonction de votre situation, de vos objectifs et de votre capacité à supporter une perte. Les documents sur les risques sont consultables à tout moment.",
    ],
  },
  {
    id: "communications",
    titre: "Article 13 · Communications, preuve et signature électronique",
    blocs: [
      "13.1 Communications électroniques. Vous acceptez de recevoir avis, relevés, documents et informations par voie électronique : votre espace Guichet, votre e-mail, et WhatsApp si vous y avez consenti. Vous pouvez retirer votre consentement WhatsApp à tout moment (mot-clé STOP).",
      "13.2 Ce qui arrive toujours. Les messages liés à vos ordres (accusés de réception, avis de résultat, avis d'opéré, relevés) découlent de ce que vous avez demandé : ils arrivent toujours. Les informations et opportunités que nous vous proposons de notre initiative se règlent canal par canal dans Paramètres.",
      "13.3 Preuve. Les enregistrements que nous conservons (ordres, signatures, avis, journal des gestes) font preuve des opérations, jusqu'à preuve contraire. Vous pouvez en demander copie.",
      "13.4 Journal de votre activité. Les gestes que vous faites dans le Guichet sont enregistrés (la date, l'objet, l'appareil employé). Vous les lisez vous-même dans « Votre activité ». Le détail est conservé treize mois. Nous n'enregistrons ni vos saisies ni vos codes.",
      "13.5 Signature électronique. Les codes à usage unique, le code Guichet et la signature de la convention dans le Guichet valent signature électronique entre nous.",
    ],
  },
  {
    id: "donnees",
    titre: "Article 14 · Données personnelles et lutte contre le blanchiment",
    blocs: [
      "14.1 Responsable du traitement. Purpose Capital S.A., à l'adresse de l'article 3.",
      "14.2 Pourquoi nous recueillons vos données. Pour vous identifier, tenir votre compte, exécuter vos ordres, vous informer, assurer la sécurité du Guichet, répondre à vos demandes et satisfaire nos obligations légales (identification, lutte contre le blanchiment et le financement du terrorisme, obligations déclaratives, conservation).",
      "14.3 Ce que nous ne faisons pas. Vos données ne sont ni vendues ni cédées. Nous ne prenons aucune décision vous concernant par un traitement entièrement automatisé.",
      "14.4 Qui les reçoit. Nos équipes habilitées, le dépositaire, la BVMAC et les autres intervenants strictement nécessaires à vos opérations, nos prestataires techniques (hébergement, envoi de messages), et les autorités lorsque la loi l'impose.",
      "14.5 Durée. Vos données d'identification et vos ordres sont conservés dix ans après la fin de la relation, ou plus si la loi l'exige. Le journal des gestes est conservé treize mois.",
      "14.6 Vos droits. Vous pouvez demander l'accès à vos données, leur rectification, leur effacement lorsque la loi le permet, la limitation ou l'opposition à certains traitements. Écrivez à info@purposecapital.africa ; nous répondons dans les meilleurs délais.",
      "14.7 Sécurité. Nous protégeons vos données par des mesures techniques et organisationnelles adaptées (chiffrement, contrôle des accès, journalisation). Les pièces d'identité sont conservées de façon chiffrée et ne servent qu'à la vérification de votre identité.",
      "14.8 Lutte contre le blanchiment. Nous sommes tenus de connaître nos clients et l'origine des fonds. Nous pouvons demander toute pièce complémentaire, suspendre ou refuser une opération ou un compte en cas de doute, et déclarer certaines opérations aux autorités compétentes. La loi nous interdit de vous en informer.",
    ],
  },
  {
    id: "responsabilites",
    titre: "Article 15 · Responsabilités",
    blocs: [
      "15.1 La nôtre. Nous répondons des dommages directs qui résultent de notre faute dans l'exécution de nos obligations. Nous n'agissons pas à la place de votre jugement et nous ne répondons pas de la variation des marchés.",
      "15.2 La vôtre. Vous répondez de l'exactitude de vos informations, de la garde de votre code et de vos appareils, et de l'usage que vous faites de votre accès. Tant que nous n'avons pas été prévenus de la perte ou du vol de votre appareil ou de la compromission de votre code, les opérations signées avec votre code à usage unique sont réputées faites par vous, sauf preuve contraire.",
      "15.3 Erreurs de saisie. Relisez toujours le récapitulatif avant de signer : une erreur de montant, de ligne ou de prix que vous avez signée vous engage, sous réserve de ce que la loi prévoit.",
      "15.4 Informations de marché. Les informations de marché proviennent de sources tierces ; nous vérifions ce que nous publions, sans garantir l'absence totale d'erreur ou de retard. Une erreur manifeste que nous constatons est corrigée et signalée.",
      "15.5 Force majeure. Nous ne répondons pas d'un retard ou d'un manquement causé par un événement hors de notre contrôle (panne des réseaux, suspension de la cote, décision d'une autorité, événement de force majeure au sens de la loi).",
      "15.6 Ce qui ne peut pas être limité. Aucune stipulation ne limite notre responsabilité pour dol ou faute lourde, ni celle que la loi interdit de limiter.",
    ],
  },
  {
    id: "modification",
    titre: "Article 16 · Modification des conditions",
    blocs: [
      "16.1 Quand nous les modifions. Nous pouvons modifier ces conditions pour tenir compte d'une évolution de la loi, du marché, de nos services ou de notre sécurité.",
      "16.2 Comment nous vous prévenons. Nous vous notifions toute modification trente jours avant son application, sur vos canaux et dans le Guichet, en disant ce qui change, et nous vous demandons d'accepter la nouvelle version à votre prochaine connexion.",
      "16.3 Si elle ne vous convient pas. Vous pouvez résilier avant son entrée en vigueur sans frais de résiliation. Si vous continuez à utiliser le Guichet après l'entrée en vigueur et l'avoir acceptée, la nouvelle version s'applique.",
      "16.4 Modification imposée. Une modification imposée par la loi ou une décision d'une autorité s'applique à la date qu'elle fixe.",
    ],
  },
  {
    id: "resiliation",
    titre: "Article 17 · Durée, résiliation et clôture",
    blocs: [
      "17.1 Durée. Ces conditions sont conclues pour une durée indéterminée.",
      "17.2 Votre droit de partir. Vous pouvez résilier à tout moment, avec un préavis de trente jours, depuis votre espace ou par écrit. Les opérations en cours sont menées à leur terme.",
      "17.3 Notre droit de mettre fin. Nous pouvons résilier avec un préavis de trente jours. Nous pouvons suspendre ou clôturer sans préavis en cas de manquement grave (fausse déclaration, usage frauduleux, opération illicite, suspicion de blanchiment, injonction d'une autorité).",
      "17.4 Ce qui se passe à la clôture. Nous soldons ou transférons vos espèces vers votre compte bancaire, et nous transférons vos titres vers le teneur de compte que vous désignez, ou nous les maintenons selon ce que la réglementation impose, dans les meilleurs délais après avoir reçu vos instructions et les pièces nécessaires.",
      "17.5 Décès. En cas de décès, la position est conservée jusqu'à instruction des ayants droit dûment justifiés.",
      "17.6 Ce qui subsiste. Après la fin de la relation, restent applicables les stipulations qui, par nature, survivent : conservation et preuve, données personnelles, responsabilités, réclamations.",
    ],
  },
  {
    id: "reclamations",
    titre: "Article 18 · Réclamations et médiation",
    blocs: [
      "18.1 Nous écrire. Pour toute réclamation : info@purposecapital.africa, ou par courrier à l'adresse de l'article 3. Indiquez votre nom, votre compte et ce qui s'est passé.",
      "18.2 Nos engagements. Nous accusons réception de votre réclamation et nous y répondons dans les meilleurs délais, ou nous vous disons pourquoi il nous faut plus de temps.",
      "18.3 Si la réponse ne vous satisfait pas. Vous pouvez saisir la médiation de la COSUMAF, sans préjudice de votre droit de saisir la juridiction compétente.",
      "18.4 Le registre. Nous tenons un registre des réclamations, et nous en tirons des corrections.",
    ],
  },
  {
    id: "dispositions",
    titre: "Article 19 · Dispositions générales",
    blocs: [
      "19.1 Intégralité et divisibilité. Ces conditions, avec la convention et l'annexe tarifaire, expriment l'accord complet entre nous. Si une stipulation est jugée nulle, les autres restent applicables.",
      "19.2 Absence de renonciation. Ne pas exercer un droit n'est pas y renoncer.",
    ],
  },
];

/** L'annexe : les pièces demandées, par catégorie (mêmes pièces que la liste de `src/lib/kyc/checklist.ts`). */
export const PIECES_DEMANDEES: { categorie: string; pieces: string }[] = [
  { categorie: "Personne physique", pieces: "pièce d'identité (recto, verso) · selfie · RIB à son nom · justificatif de domicile (moins de trois mois) · NIU (si résident)" },
  { categorie: "Personne morale", pieces: "extrait d'immatriculation · statuts à jour · NIU · pouvoirs ou PV désignant les signataires · déclaration des bénéficiaires effectifs (au-delà de 25 %) · pièce d'identité du représentant · RIB" },
  { categorie: "Groupement, association, tontine", pieces: "récépissé de déclaration ou acte constitutif · PV désignant les personnes habilitées et la règle de décision · pièce d'identité du représentant · RIB · liste des membres" },
  { categorie: "Institutionnel", pieces: "extrait d'immatriculation · pouvoirs · matrice des signataires et plafonds · RIB" },
];
