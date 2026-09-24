import type { DiagramKind } from "@/data/docs/types";
import { DOCUMENT_CHAIN } from "@/data/docs/chain";

/**
 * The schemas of the documentation, drawn in SVG with the theme's tokens so
 * they read in every palette. Each one is a picture of a mechanism the text
 * beside it explains: where information comes from and where it is kept,
 * the day at the desk, the client's path, the channels and their rules, the
 * document chain, the hosting. Text is bilingual through `lang`.
 */
type Lang = "fr" | "en";
const T = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);

const box = (x: number, y: number, w: number, h: number, key: string, fill = "var(--surface)", stroke = "var(--line-2)") => <rect key={key} x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} />;
const label = (x: number, y: number, text: string, key: string, opts: { size?: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end" } = {}) => (
  <text key={key} x={x} y={y} fontSize={opts.size ?? 12} fontWeight={opts.weight ?? 600} fill={opts.fill ?? "var(--ink)"} textAnchor={opts.anchor ?? "middle"}>
    {text}
  </text>
);
const arrow = (x1: number, y1: number, x2: number, y2: number, key: string, dashed = false) => <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-3)" strokeWidth={1.4} markerEnd="url(#arrow)" strokeDasharray={dashed ? "4 4" : undefined} />;
const Defs = () => (
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="var(--ink-3)" />
    </marker>
  </defs>
);

/** Where every kind of information comes from, and where it is kept. */
function Sources({ lang }: { lang: Lang }) {
  const cols: [string, string, string][] = [
    [T(lang, "BVMAC · bulletin", "BVMAC · bulletin"), T(lang, "cours, VL, avis", "prices, NAVs, notices"), "boc"],
    [T(lang, "Trésors · BEAC", "Treasuries · BEAC"), T(lang, "adjudications, résultats", "auctions, results"), "intake"],
    [T(lang, "Émetteurs, BVMAC", "Issuers, BVMAC"), T(lang, "fiches, comptes", "fiches, accounts"), "refs"],
    [T(lang, "Le client", "The client"), T(lang, "coordonnées, pièces, intentions", "details, papers, intentions"), "client"],
    [T(lang, "Le desk", "The desk"), T(lang, "prix, décisions, textes", "prices, decisions, texts"), "desk"],
  ];
  const stores: [string, string][] = [
    [T(lang, "Base (Supabase, Postgres)", "Database (Supabase, Postgres)"), T(lang, "lignes, cours, intentions, dossiers, journal, versions", "lines, quotes, intentions, files, audit log, versions")],
    [T(lang, "Fichiers « sources »", "Files “sources”"), T(lang, "PDF des bulletins, courriels et pièces reçues", "bulletin PDFs, e-mails and attachments received")],
    [T(lang, "Fichiers « documents » et « pièces »", "Files “documents” and “pieces”"), T(lang, "documents émis aux clients, pièces d'identité", "documents issued to clients, identity papers")],
    [T(lang, "Le code (dépôt Git)", "The code (Git repository)"), T(lang, "registre des émetteurs, modalités, modèles, leçons, documentation", "issuer registry, bond terms, models, lessons, documentation")],
  ];
  return (
    <svg viewBox="0 0 760 330" role="img" aria-label={T(lang, "Sources et stockage", "Sources and storage")}>
      <Defs />
      {cols.map(([name, what], i) => {
        const x = 10 + i * 150;
        return [box(x, 14, 140, 62, `s${i}`, "var(--surface-2)"), label(x + 70, 38, name, `sn${i}`, { size: 12, weight: 800 }), label(x + 70, 58, what, `sw${i}`, { size: 10.5, weight: 500, fill: "var(--ink-2)" })];
      })}
      {box(10, 110, 740, 46, "guichet", "var(--gold-soft)", "var(--gold-line)")}
      {label(380, 130, T(lang, "Guichet : lecture, contrôles, versions, journal", "Guichet: reading, checks, versions, audit log"), "g1", { size: 12.5, weight: 800, fill: "var(--gold-ink)" })}
      {label(380, 147, T(lang, "chaque chiffre garde sa source et sa date ; rien n'est publié sans validation", "every figure keeps its source and date; nothing is published without validation"), "g2", { size: 10.5, weight: 500, fill: "var(--ink-2)" })}
      {cols.map((_, i) => arrow(80 + i * 150, 78, 80 + i * 150, 108, `a${i}`))}
      {stores.map(([name, what], i) => {
        const x = 10 + i * 187;
        return [box(x, 200, 177, 96, `st${i}`), label(x + 88, 224, name, `stn${i}`, { size: 11.5, weight: 800 }), ...wrap(what, 30).map((line, k) => label(x + 88, 246 + k * 15, line, `stw${i}${k}`, { size: 10, weight: 500, fill: "var(--ink-2)" }))];
      })}
      {stores.map((_, i) => arrow(98 + i * 187, 158, 98 + i * 187, 198, `b${i}`))}
      {label(380, 320, T(lang, "Lecture : les sources en haut, la couche Guichet au milieu, les quatre lieux de stockage en bas.", "Reading: sources on top, the Guichet layer in the middle, the four storage places below."), "foot", { size: 10.5, weight: 500, fill: "var(--ink-3)" })}
    </svg>
  );
}

/** The desk's day. */
function Journee({ lang }: { lang: Lang }) {
  const steps: [string, string, string][] = [
    ["07:30", T(lang, "Point du matin", "Morning brief"), T(lang, "e-mail : clôtures, intentions, bulletin, santé", "e-mail: closings, intentions, bulletin, health")],
    ["08:00", T(lang, "Aujourd'hui", "Today"), T(lang, "les tuiles du carnet : tout en vert, rien à faire", "the carnet's tiles: all green, nothing to do")],
    ["08:15", T(lang, "À valider", "To validate"), T(lang, "sources reçues, relire, publier", "sources received, proofread, publish")],
    [T(lang, "journée", "day"), T(lang, "Intentions", "Intentions"), T(lang, "rappeler, confirmer, transmettre, régler", "call back, confirm, transmit, settle")],
    ["19:30", T(lang, "Bulletin", "Bulletin"), T(lang, "lu tout seul ; échec ⇒ tuile rouge le matin", "read by itself; failure ⇒ red tile next morning")],
  ];
  return (
    <svg viewBox="0 0 760 170" role="img" aria-label={T(lang, "La journée", "The day")}>
      <Defs />
      <line x1={60} y1={60} x2={700} y2={60} stroke="var(--gold-line)" strokeWidth={2} />
      {steps.map(([time, name, what], i) => {
        const x = 60 + i * 155;
        return [
          <circle key={`c${i}`} cx={x + 10} cy={60} r={7} fill={i === 1 ? "var(--gold)" : "var(--surface)"} stroke="var(--gold)" strokeWidth={2} />,
          label(x + 10, 42, time, `t${i}`, { size: 11, weight: 800, fill: "var(--gold-ink)" }),
          label(x + 10, 90, name, `n${i}`, { size: 12, weight: 800 }),
          ...wrap(what, 26).map((line, k) => label(x + 10, 108 + k * 14, line, `w${i}${k}`, { size: 10, weight: 500, fill: "var(--ink-2)" })),
        ];
      })}
      {label(380, 160, T(lang, "Le système fait les heures fixes ; le desk fait les gens.", "The system keeps the fixed hours; the desk keeps the people."), "foot", { size: 10.5, weight: 500, fill: "var(--ink-3)" })}
    </svg>
  );
}

/** The client's path, and who acts at each step. */
function Relation({ lang }: { lang: Lang }) {
  const steps: [string, string, string][] = [
    [T(lang, "Découvre", "Discovers"), T(lang, "site, WhatsApp, un proche", "site, WhatsApp, a friend"), T(lang, "client", "client")],
    [T(lang, "Comprend", "Understands"), T(lang, "fiche, Guide, profil", "line, Guide, profile"), T(lang, "client", "client")],
    [T(lang, "Déclare", "Declares"), T(lang, "une intention, deux canaux prouvés", "an intention, two proven channels"), T(lang, "client", "client")],
    [T(lang, "Est rappelé", "Is called back"), T(lang, "dans l'heure ouvrée ; confirme", "within the business hour; confirms"), T(lang, "desk", "desk")],
    [T(lang, "Est servi", "Is served"), T(lang, "ordre transmis, résultat, règlement", "order transmitted, result, settlement"), T(lang, "desk · SVT", "desk · dealer")],
    [T(lang, "Suit", "Follows"), T(lang, "documents, alertes, relevés, coupons", "documents, alerts, statements, coupons"), T(lang, "système", "system")],
  ];
  return (
    <svg viewBox="0 0 760 190" role="img" aria-label={T(lang, "Le parcours du client", "The client's path")}>
      <Defs />
      {steps.map(([name, what, who], i) => {
        const x = 8 + i * 125;
        const desk = who.startsWith("desk");
        return [
          box(x, 20, 116, 104, `b${i}`, desk ? "var(--gold-soft)" : who === "système" || who === "system" ? "var(--surface-2)" : "var(--surface)", desk ? "var(--gold-line)" : "var(--line-2)"),
          label(x + 58, 44, name, `n${i}`, { size: 12, weight: 800 }),
          ...wrap(what, 20).map((line, k) => label(x + 58, 64 + k * 14, line, `w${i}${k}`, { size: 10, weight: 500, fill: "var(--ink-2)" })),
          label(x + 58, 114, who, `o${i}`, { size: 9.5, weight: 800, fill: desk ? "var(--gold-ink)" : "var(--ink-3)" }),
          i < steps.length - 1 ? arrow(x + 116, 72, x + 125, 72, `a${i}`) : null,
        ];
      })}
      {label(380, 160, T(lang, "En or : les moments où une personne du desk parle au client. Rien n'est engagé sans le quatrième.", "In gold: the moments a desk person speaks to the client. Nothing is committed without the fourth."), "foot", { size: 10.5, weight: 500, fill: "var(--ink-3)" })}
      {label(380, 178, T(lang, "Le client garde tout dans Mon espace ; le desk garde tout dans le dossier et le journal.", "The client keeps everything in My space; the desk keeps everything in the file and the audit log."), "foot2", { size: 10.5, weight: 500, fill: "var(--ink-3)" })}
    </svg>
  );
}

/** Channels, and the rule for each. */
function Communication({ lang }: { lang: Lang }) {
  const rows: [string, string, string, string][] = [
    ["WhatsApp", T(lang, "première voix, accusés, rappels, liens de ligne", "first voice, acknowledgements, reminders, line links"), T(lang, "heures ouvrées · réponse dans l'heure", "business hours · answer within the hour"), T(lang, "jamais un chiffre non publié, jamais un conseil", "never an unpublished figure, never advice")],
    [T(lang, "E-mail", "E-mail"), T(lang, "code de connexion, documents, appels de fonds, relevés, résumé hebdo", "sign-in code, documents, fund calls, statements, weekly digest"), T(lang, "à l'instant ou 07:30 / vendredi 17:00", "at once or 07:30 / Friday 17:00"), T(lang, "expéditeur guichet@ ; PDF joints ou en lien", "sender guichet@; PDFs attached or linked")],
    [T(lang, "Appel", "Call"), T(lang, "confirmer une intention, expliquer, rassurer", "confirm an intention, explain, reassure"), T(lang, "avant toute transmission", "before any transmission"), T(lang, "noté dans le dossier : qui, quand, quoi", "noted in the file: who, when, what")],
    [T(lang, "Alertes (push)", "Alerts (push)"), T(lang, "clôture proche, ordre servi, ligne suivie", "closing soon, order served, followed line"), T(lang, "au plus une par jour", "at most one a day"), T(lang, "sur demande du client, par appareil", "at the client's request, per device")],
  ];
  return (
    <svg viewBox="0 0 760 210" role="img" aria-label={T(lang, "Les canaux", "The channels")}>
      {[T(lang, "Canal", "Channel"), T(lang, "Pour quoi", "For what"), T(lang, "Quand", "When"), T(lang, "Règle", "Rule")].map((h, i) => label([10, 120, 380, 560][i], 20, h, `h${i}`, { size: 10, weight: 800, fill: "var(--gold-ink)", anchor: "start" }))}
      <line x1={10} y1={28} x2={750} y2={28} stroke="var(--gold-line)" />
      {rows.map(([c, w, q, r], i) => {
        const y = 52 + i * 42;
        return [
          label(10, y, c, `c${i}`, { size: 12, weight: 800, anchor: "start" }),
          ...wrap(w, 44).map((line, k) => label(120, y + k * 13, line, `w${i}${k}`, { size: 10, weight: 500, fill: "var(--ink-2)", anchor: "start" })),
          ...wrap(q, 30).map((line, k) => label(380, y + k * 13, line, `q${i}${k}`, { size: 10, weight: 500, fill: "var(--ink-2)", anchor: "start" })),
          ...wrap(r, 34).map((line, k) => label(560, y + k * 13, line, `r${i}${k}`, { size: 10, weight: 500, fill: "var(--ink-2)", anchor: "start" })),
          <line key={`l${i}`} x1={10} y1={y + 24} x2={750} y2={y + 24} stroke="var(--line)" />,
        ];
      })}
    </svg>
  );
}

/**
 * The document chain of one order, drawn from the one list in
 * `data/docs/chain.ts` that the desk's table reads too : a step corrected
 * there is corrected in both places, which is what the two copies never did.
 */
function Documents({ lang }: { lang: Lang }) {
  const steps = DOCUMENT_CHAIN.map((c) => [c.doc[lang], c.trigger[lang]] as const);
  const W = 98;
  const STEP = 107;
  return (
    <svg viewBox="0 0 760 150" role="img" aria-label={T(lang, "La chaîne documentaire", "The document chain")}>
      <Defs />
      {steps.map(([name, when], i) => {
        const x = 8 + i * STEP;
        return [box(x, 24, W, 64, `b${i}`), ...wrap(name, 15).slice(0, 3).map((line, k) => label(x + W / 2, 44 + k * 12, line, `n${i}${k}`, { size: 10, weight: 800 })), ...wrap(when, 17).slice(0, 2).map((line, k) => label(x + W / 2, 78 + k * 10, line, `w${i}${k}`, { size: 8.5, weight: 500, fill: "var(--ink-3)" })), i < steps.length - 1 ? arrow(x + W, 56, x + STEP, 56, `a${i}`) : null];
      })}
      {label(380, 118, T(lang, "Chaque document est numéroté, généré par le Guichet à partir du modèle, gardé dans « documents », visible au client dans Mon espace.", "Each document is numbered, generated by Guichet from the model, kept in “documents”, visible to the client in My space."), "f1", { size: 10.5, weight: 500, fill: "var(--ink-3)" })}
      {label(380, 136, T(lang, "Le relevé est aussi produit à la demande du client.", "The statement is also produced at the client's request."), "f2", { size: 10.5, weight: 500, fill: "var(--ink-3)" })}
    </svg>
  );
}

/** The map of the documents: three kinds as lanes, the six moments of a relationship as columns; the four new acts marked. */
function CarteDocuments({ lang }: { lang: Lang }) {
  const cols = [T(lang, "Ouverture", "Opening"), T(lang, "Ordre", "Order"), T(lang, "Exécution", "Execution"), T(lang, "Règlement", "Settlement"), T(lang, "Vie du titre", "Life of the security"), T(lang, "Fin", "End")];
  const lanes: { name: string; rule: string; fill: string; stroke: string; cells: string[][] }[] = [
    { name: T(lang, "Signés par le client", "Signed by the client"), rule: T(lang, "réglementaire", "regulatory"), fill: "var(--gold-soft)", stroke: "var(--gold)", cells: [[T(lang, "Convention", "Agreement"), T(lang, "Mandat *", "Mandate *")], [T(lang, "Bulletin d'ordre", "Order form"), T(lang, "Ordre de cession", "Sale order")], [], [], [T(lang, "Réclamation *", "Complaint *")], [T(lang, "Transfert · clôture *", "Transfer · closure *")]] },
    { name: T(lang, "Envoyés au client", "Sent to the client"), rule: T(lang, "relu", "reviewed"), fill: "var(--info-soft)", stroke: "var(--info)", cells: [[], [T(lang, "Appel de fonds", "Call for funds")], [T(lang, "Avis de résultat", "Result notice"), T(lang, "Non-allocation", "Non-allotment")], [T(lang, "Avis d'opéré", "Contract note")], [T(lang, "Avis de coupon *", "Coupon notice *"), T(lang, "Relevé · attestation", "Statement · attestation")], [T(lang, "Relevé final", "Final statement")]] },
    { name: T(lang, "Transmis aux contreparties", "Sent to counterparties"), rule: T(lang, "libre · interne", "free · internal"), fill: "var(--surface-2)", stroke: "var(--line-2)", cells: [[T(lang, "Dossier SVT", "Custodian file")], [], [T(lang, "Bordereau SVT", "Auction slip"), T(lang, "Bordereau OPCVM", "Fund slip")], [T(lang, "Confirmation SDB", "Broker confirmation")], [], [T(lang, "Instruction dépositaire", "Custodian instruction")]] },
  ];
  const L = 138;
  const cw = (760 - L - 8) / 6;
  const rowH = 74;
  return (
    <svg viewBox="0 0 760 270" role="img" aria-label={T(lang, "La carte des documents", "The map of the documents")}>
      <Defs />
      {cols.map((c, i) => label(L + i * cw + cw / 2, 16, c, `h${i}`, { size: 9.5, weight: 800, fill: "var(--ink-3)" }))}
      {lanes.map((ln, r) => {
        const y = 26 + r * rowH;
        return [
          box(6, y, L - 12, rowH - 6, `l${r}`, ln.fill, ln.stroke),
          ...wrap(ln.name, 18).map((t, k) => label(6 + (L - 12) / 2, y + 22 + k * 13, t, `ln${r}${k}`, { size: 10.5, weight: 800 })),
          label(6 + (L - 12) / 2, y + rowH - 16, ln.rule, `lr${r}`, { size: 9, weight: 700, fill: "var(--ink-3)" }),
          ...ln.cells.flatMap((cell, c) =>
            cell.map((d, k) => [
              box(L + c * cw + 3, y + 4 + k * 32, cw - 6, 28, `c${r}${c}${k}`, ln.fill, ln.stroke),
              ...wrap(d, 16)
                .slice(0, 2)
                .map((t, j) => label(L + c * cw + cw / 2, y + 16 + k * 32 + j * 11, t, `ct${r}${c}${k}${j}`, { size: 8.5, weight: 700 })),
            ]),
          ),
        ];
      })}
      {label(380, 262, T(lang, "* nouveau depuis le 21 septembre 2026 : mandat, avis de coupon / remboursement, réclamation, ordre de transfert / clôture.", "* new since 21 September 2026: mandate, coupon / redemption notice, complaint, transfer / closure order."), "f", { size: 9.5, weight: 500, fill: "var(--ink-3)" })}
    </svg>
  );
}

/** Two addresses, one application; where each service runs. */
function Hebergement({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 760 210" role="img" aria-label={T(lang, "L'hébergement", "Hosting")}>
      <Defs />
      {box(10, 14, 220, 54, "c", "var(--surface-2)")}
      {label(120, 36, "guichet.purposecapital.africa", "c1", { size: 11.5, weight: 800 })}
      {label(120, 54, T(lang, "les clients · le site public", "clients · the public site"), "c2", { size: 10, weight: 500, fill: "var(--ink-2)" })}
      {box(530, 14, 220, 54, "d", "var(--gold-soft)", "var(--gold-line)")}
      {label(640, 36, "desk.purposecapital.africa", "d1", { size: 11.5, weight: 800, fill: "var(--gold-ink)" })}
      {label(640, 54, T(lang, "le desk · second facteur", "the desk · second factor"), "d2", { size: 10, weight: 500, fill: "var(--ink-2)" })}
      {box(230, 100, 300, 50, "app")}
      {label(380, 120, T(lang, "Une application (Vercel)", "One application (Vercel)"), "a1", { size: 12, weight: 800 })}
      {label(380, 138, T(lang, "même code, l'hôte décide ce qui est servi", "same code, the host decides what is served"), "a2", { size: 10, weight: 500, fill: "var(--ink-2)" })}
      {arrow(120, 70, 300, 98, "ac")}
      {arrow(640, 70, 460, 98, "ad")}
      {[
        [10, T(lang, "Supabase : base, fichiers, connexion", "Supabase: database, files, sign-in")],
        [200, T(lang, "Resend : e-mails", "Resend: e-mails")],
        [390, T(lang, "Meta : WhatsApp", "Meta: WhatsApp")],
        [580, T(lang, "Netlify DNS · GoDaddy", "Netlify DNS · GoDaddy")],
      ].map(([x, name], i) => [box(Number(x), 170, 170, 32, `s${i}`, "var(--surface-2)"), label(Number(x) + 85, 190, String(name), `sn${i}`, { size: 10.5, weight: 700 }), arrow(380, 152, Number(x) + 85, 168, `sa${i}`, true)])}
    </svg>
  );
}

/** Breaks a sentence into lines of about `n` characters, on spaces. */
function wrap(text: string, n: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    if ((line + " " + w).trim().length > n && line) {
      out.push(line.trim());
      line = w;
    } else line = `${line} ${w}`;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

export function DocDiagram({ kind, lang }: { kind: DiagramKind; lang: Lang }) {
  switch (kind) {
    case "sources":
      return <Sources lang={lang} />;
    case "journee":
      return <Journee lang={lang} />;
    case "relation":
      return <Relation lang={lang} />;
    case "communication":
      return <Communication lang={lang} />;
    case "documents":
      return <Documents lang={lang} />;
    case "hebergement":
      return <Hebergement lang={lang} />;
    case "carte-documents":
      return <CarteDocuments lang={lang} />;
  }
}
