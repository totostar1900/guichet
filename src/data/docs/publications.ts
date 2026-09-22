import { l, type DocPage } from "./types";

/**
 * The market notes on the index: the two that exist, where their figures come
 * from, when the robot prepares them, what the desk reads before publishing,
 * where each one goes, and what to do when something does not run. The written
 * version of this page, with the file map, is docs/notes-de-marche.md.
 */
export const PUBLICATIONS: DocPage = {
  slug: "publications",
  title: l("Les notes de marché", "The market notes"),
  summary: l("Deux notes sur l'indice : une trimestrielle, publique, écrite pour un client ; une mensuelle, gardée au desk, qui sert au contrôle. D'où viennent les chiffres, qui relit, quand cela part, où cela va.", "Two notes on the index: a quarterly one, public, written for a client; a monthly one, kept at the desk, used for control. Where the figures come from, who reads them, when they go out, where they land."),
  visibility: "desk",
  audience: ["desk", "admin", "tech"],
  order: 4,
  checkedOn: "2026-09-22",
  owner: "Georges",
  chapters: [
    {
      id: "deux-notes",
      title: l("Les deux notes", "The two notes"),
      blocks: [
        { type: "lead", text: l("Le Guichet écrit deux notes sur l'indice BVMAC All Share, à partir des mêmes bulletins. La trimestrielle sort : elle est publique, elle se lit sans compte, elle s'adresse à un client. La mensuelle reste au desk : elle sert au contrôle et prépare la trimestrielle.", "Guichet writes two notes on the BVMAC All Share index, from the same bulletins. The quarterly one goes out: it is public, it reads without an account, it speaks to a client. The monthly one stays at the desk: it serves control and feeds the quarterly.") },
        {
          type: "table",
          head: [l("", ""), l("Note trimestrielle", "Quarterly note"), l("Note mensuelle", "Monthly note")],
          rows: [
            [l("Pour qui", "For whom"), l("tout le monde : clients, presse, partenaires", "everyone: clients, press, partners"), l("le desk seul", "the desk alone")],
            [l("Où elle se lit", "Where it is read"), l("page publique /indice/note/<trimestre>, et son PDF", "public page /indice/note/<quarter>, and its PDF"), l("/desk/indice, et le PDF dans Documents", "/desk/indice, and the PDF in Documents")],
            [l("Numéro", "Number"), l("PC-IDX-2026T2", "PC-IDX-2026T2"), l("PC-IDX-202608", "PC-IDX-202608")],
            [l("Rythme", "Rhythm"), l("quatre par an, le 5 du mois qui ouvre le trimestre suivant", "four a year, on the 5th of the month opening the next quarter"), l("douze par an, le 3 de chaque mois", "twelve a year, on the 3rd of each month")],
            [l("Envoi automatique", "Automatic sending"), l("aucun", "none"), l("aucun", "none")],
          ],
        },
        { type: "p", text: l("Le rythme trimestriel vient de la cote elle-même : sept sociétés, beaucoup de séances sans transaction. Un mois de cette cote laisse souvent trop peu à raconter pour qu'un client y trouve une lecture ; un trimestre lui en donne une.", "The quarterly rhythm comes from the market itself: seven companies, many sessions without a trade. A month of this market often leaves too little to tell for a client to find a reading in it; a quarter gives one.") },
        { type: "note", kind: "rule", text: l("Le robot prépare, il ne diffuse pas. Rien ne part à un client sans qu'une personne l'ait lu et ait cliqué sur Publier.", "The robot prepares, it does not distribute. Nothing reaches a client without a person having read it and clicked Publish.") },
        { type: "link", href: "/desk/indice", label: l("Desk › Indice : relire et publier", "Desk › Index: read and publish"), hint: l("les deux notes, dans l'ordre", "both notes, in order") },
      ],
    },
    {
      id: "chiffres",
      title: l("D'où viennent les chiffres", "Where the figures come from"),
      blocks: [
        { type: "p", text: l("Une seule chaîne, du PDF de la BVMAC à la phrase de la note. Aucun chiffre n'est saisi à la main.", "One chain only, from the BVMAC PDF to the sentence in the note. No figure is keyed in by hand.") },
        {
          type: "flow",
          steps: [
            l("Bulletin Officiel de la Cote", "Official Quotation Bulletin"),
            l("le lecteur de bulletin, chaque séance", "the bulletin reader, every session"),
            l("market_bulletins et quotes", "market_bulletins and quotes"),
            l("séries, poids, rotation", "series, weights, rotation"),
            l("les chiffres et les trois phrases de la note", "the figures and the note's three sentences"),
            l("la page publique et le PDF", "the public page and the PDF"),
          ],
        },
        { type: "p", text: l("Le bulletin donne deux choses : en tête, le niveau de l'indice et sa variation du jour ; plus loin, pour chaque société, le cours de clôture, les titres du flottant coté et du capital global, les capitalisations, le dernier dividende et la liquidité. Le premier fait la courbe, le second fait les poids.", "The bulletin gives two things: at the head, the index level and its variation for the day; further on, for each company, the closing price, the shares in the quoted float and in the global capital, the capitalisations, the last dividend and the liquidity. The first makes the curve, the second makes the weights.") },
        { type: "p", text: l("Les trois phrases que chaque note porte en tête sont écrites par le calcul, à partir de ces chiffres : le niveau, la variation, la séance qui a le plus pesé, la part échangée, les séances sans mouvement. Elles changent de forme selon ce que le trimestre a fait.", "The three sentences each note leads with are written by the computation, from those figures: the level, the variation, the session that weighed most, the amount traded, the sessions without a move. They change shape with what the quarter did.") },
        { type: "p", text: l("Le paragraphe réglementaire de fin de note vient du Référentiel › Modèles, comme pour tous les autres documents : il y est relu, versionné, et la version utilisée est enregistrée avec le document publié.", "The regulatory paragraph closing the note comes from Reference data › Templates, like every other document: it is reviewed and versioned there, and the version used is recorded with the published document.") },
        { type: "note", kind: "info", text: l("Une note close ne change plus. Elle est calculée à partir des seules séances de son trimestre, jamais de l'état du jour : la note du deuxième trimestre, relue dans un an, donne les mêmes chiffres.", "A closed note never changes. It is computed from that quarter's sessions alone, never from today's state: the second-quarter note, read a year from now, gives the same figures.") },
        { type: "link", href: "/desk/docs/indice", label: l("L'indice BVMAC All Share", "The BVMAC All Share index"), hint: l("ce qu'il est, comment il se calcule, qui pèse quoi", "what it is, how it is computed, who weighs what") },
      ],
    },
    {
      id: "calendrier",
      title: l("Le calendrier", "The calendar"),
      blocks: [
        {
          type: "table",
          head: [l("Ce qui tourne", "What runs"), l("Quand", "When"), l("Ce que cela fait", "What it does")],
          rows: [
            [l("Le lecteur de bulletin", "The bulletin reader"), l("18 h 30, du lundi au vendredi", "18:30, Monday to Friday"), l("lit la séance du jour : c'est lui qui alimente tout le reste", "reads the day's session: it feeds everything else")],
            [l("La note mensuelle", "The monthly note"), l("le 3 de chaque mois", "the 3rd of each month"), l("prépare le mois clos, le range dans Documents, écrit une ligne au journal du desk", "prepares the closed month, files it in Documents, writes a line in the desk journal")],
            [l("La note trimestrielle", "The quarterly note"), l("le 5 janvier, avril, juillet, octobre", "5 January, April, July, October"), l("prépare le trimestre clos, de même", "prepares the closed quarter, likewise")],
          ],
        },
        { type: "p", text: l("Les deux préparations peuvent être rejouées sans risque : elles regardent d'abord si un document porte déjà le numéro du mois ou du trimestre, et ne font rien si c'est le cas. Un trimestre sans aucune séance lue ne produit rien non plus.", "Both preparations can be replayed safely: they first look for a document already carrying that month's or quarter's number, and do nothing if one exists. A quarter with no session read produces nothing either.") },
        { type: "note", kind: "info", text: l("Le robot n'est qu'une commodité. Le bouton Publier de Desk › Indice fait exactement la même chose, à n'importe quel moment.", "The robot is only a convenience. The Publish button on Desk › Index does exactly the same thing, at any moment.") },
      ],
    },
    {
      id: "relire",
      title: l("Relire, avant de publier", "Reading, before publishing"),
      blocks: [
        { type: "p", text: l("Tout se passe sur Desk › Indice. La note trimestrielle vient en premier, avec les six derniers trimestres en pastilles et un ✓ sur ceux déjà publiés ; la note mensuelle suit, avec la contribution de chaque société et les séances à éclaircir.", "Everything happens on Desk › Index. The quarterly note comes first, with the last six quarters as pills and a ✓ on those already published; the monthly note follows, with each company's contribution and the sessions to clear.") },
        {
          type: "steps",
          items: [
            l("Ouvrir le trimestre et lire la page publique telle qu'un client la verra : le lien est sur la page du desk.", "Open the quarter and read the public page as a client will see it: the link is on the desk page."),
            l("Regarder les séances à éclaircir de la note mensuelle : une séance y figure quand la variation publiée ne se reconstitue pas avec les cours du même bulletin.", "Look at the monthly note's sessions to clear: a session appears there when the published variation does not reconstitute with the prices of the same bulletin."),
            l("Vérifier les jours sans bulletin : un trou de plusieurs jours veut souvent dire que la lecture a échoué, pas que le marché a fermé.", "Check the days without a bulletin: a gap of several days usually means the reading failed, not that the market closed."),
            l("Vérifier le ton : la note dit ce que l'indice fait et ce qu'il ne dit pas ; elle ne recommande rien et ne compare aucun client à l'indice.", "Check the tone: the note says what the index does and what it does not say; it recommends nothing and compares no client to the index."),
            l("Publier.", "Publish."),
          ],
        },
        { type: "note", kind: "warn", text: l("Tant que la note méthodologique de la BVMAC n'est pas reçue, la note publique dit en une ligne, en bas de page, que la méthodologie est en cours de confirmation. Le détail des écarts reste au desk : il ne se conclut pas en public avant la réponse de la Bourse.", "Until the BVMAC methodology note is received, the public note says in one line, at the foot of the page, that the methodology is being confirmed. The detail of the gaps stays at the desk: it is not concluded in public before the exchange replies.") },
      ],
    },
    {
      id: "publier",
      title: l("Ce que publier veut dire", "What publishing means"),
      blocks: [
        { type: "p", text: l("La page publique existe avant la publication : elle se calcule à la demande, et un trimestre en cours est déjà lisible. Publier ne l'ouvre pas ; publier fige le PDF.", "The public page exists before publication: it is computed on demand, and a running quarter is already readable. Publishing does not open it; publishing freezes the PDF.") },
        {
          type: "list",
          items: [
            l("Le PDF est rendu et rangé dans Documents, avec son numéro et la version de chaque passage de modèle utilisé.", "The PDF is rendered and filed in Documents, with its number and the version of each template passage used."),
            l("Une ligne part au journal du desk : qui a publié, quand.", "A line goes to the desk journal: who published, and when."),
            l("La page publique est rafraîchie et porte sa date.", "The public page is refreshed and carries its date."),
          ],
        },
        { type: "p", text: l("Le PDF publié est l'exemplaire de référence : celui qu'on envoie, qu'on joint à un dossier, qu'on archive. La page, elle, reste vivante et mène au reste du Guichet.", "The published PDF is the reference copy: the one that is sent, attached to a file, archived. The page stays alive and leads to the rest of Guichet.") },
      ],
    },
    {
      id: "destinations",
      title: l("Où elles vont, et comment les partager", "Where they go, and how to share them"),
      blocks: [
        {
          type: "table",
          head: [l("Destination", "Destination"), l("Trimestrielle", "Quarterly"), l("Mensuelle", "Monthly")],
          rows: [
            [l("Page publique de la note", "Public page of the note"), l("oui, sans compte", "yes, no account needed"), l("non", "no")],
            [l("Panneau « Les notes de marché » sur la page de l'indice", "“The market notes” panel on the index page"), l("oui, six derniers trimestres", "yes, last six quarters"), l("non", "no")],
            [l("PDF public", "Public PDF"), l("oui", "yes"), l("non", "no")],
            [l("Documents, au desk", "Documents, at the desk"), l("oui, à la publication", "yes, on publication"), l("oui, à la publication", "yes, on publication")],
            [l("Envoi à un client", "Sending to a client"), l("à la main, comme tout document", "by hand, like any document"), l("à la main, rare", "by hand, rarely")],
            [l("Presse, partenaires, réseaux", "Press, partners, social"), l("le lien de la page", "the page's link"), l("non", "no")],
          ],
        },
        { type: "note", kind: "rule", text: l("Partager le lien de la page, pas le fichier. La page porte le numéro, les dates de séance, la source et l'avertissement réglementaire, et elle reste à jour si un correctif est apporté. Le PDF sert à ce qui doit voyager hors ligne.", "Share the page's link, not the file. The page carries the number, the session dates, the source and the regulatory notice, and it stays current if a correction is made. The PDF is for what has to travel offline.") },
        { type: "p", text: l("Ne sortent jamais du desk : la table des séances à éclaircir, les écarts de reconstitution, et toute formulation qui conclurait sur la méthode de la BVMAC avant sa réponse.", "Never leave the desk: the table of sessions to clear, the reconstitution gaps, and any wording that would conclude on the BVMAC method before its reply.") },
        { type: "link", href: "/indice", label: l("La page de l'indice", "The index page"), hint: l("mise à jour à chaque séance ; les notes y sont listées", "updated every session; the notes are listed there") },
      ],
    },
    {
      id: "panne",
      title: l("Quand quelque chose ne tourne pas", "When something does not run"),
      blocks: [
        {
          type: "table",
          head: [l("Ce qu'on voit", "What is seen"), l("Ce que cela veut dire", "What it means"), l("Quoi faire", "What to do")],
          rows: [
            [l("Un trimestre sans note", "A quarter without a note"), l("la préparation automatique n'a pas tourné", "the automatic preparation did not run"), l("ouvrir Desk › Indice, choisir le trimestre, lire, publier à la main", "open Desk › Index, pick the quarter, read, publish by hand")],
            [l("« Aucune séance lue sur ce trimestre »", "“No session read on this quarter”"), l("aucun bulletin n'a été lu sur la période", "no bulletin was read over the period"), l("normal avant le premier bulletin capté ; sinon, regarder le lecteur de bulletin", "normal before the first bulletin captured; otherwise, look at the bulletin reader")],
            [l("Des chiffres qui paraissent faux", "Figures that look wrong"), l("presque toujours une lecture de bulletin incomplète, pas le calcul", "almost always an incomplete bulletin reading, not the computation"), l("remonter la chaîne : le bulletin au Dépôt, puis la séance, puis la société", "walk back the chain: the bulletin in the Repository, then the session, then the company")],
            [l("Beaucoup de séances à éclaircir", "Many sessions to clear"), l("notre lecture ou la méthode de l'indice diffèrent", "our reading or the index method differ"), l("la note le dit en une ligne, sans conclure ; la réponse de la BVMAC tranchera", "the note says so in one line, without concluding; the BVMAC reply will settle it")],
          ],
        },
        { type: "p", text: l("Après un correctif en amont, on ne réécrit pas l'ancienne note : on publie une édition corrigée, visible dans « autres éditions » comme pour les autres modèles.", "After a correction upstream, the old note is not rewritten: a corrected edition is published, visible under “other editions” as for the other templates.") },
        { type: "link", href: "/desk/documents?type=note_indice", label: l("Les notes publiées", "The published notes"), hint: l("chaque édition, avec sa date et son auteur", "each edition, with its date and author") },
      ],
    },
  ],
};
