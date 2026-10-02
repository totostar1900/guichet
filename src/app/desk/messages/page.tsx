import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { FromSante } from "@/components/desk/FromSante";
import { Toolbar } from "@/components/ui/Toolbar";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { PieceGardee } from "@/lib/domain/types";
import type { InboundMessage, Notification } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/format";
import { textMatch } from "@/lib/text";
import { displayStatus, isPast } from "@/lib/domain/status";
import { handledAction } from "./actions";
import { modelesDuFil } from "./modeles";
import { ReplyForm } from "./ReplyForm";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

type Msg = { at: string; dir: "in" | "out"; channel: string; text: string; status?: string; subject?: string; handled?: boolean; intentId?: string; id?: string; pieces?: PieceGardee[] };
type Thread = { key: string; channel: "whatsapp" | "email"; name?: string; clientId?: string; msgs: Msg[]; unread: number; last: string };

/**
 * The desk inbox: one conversation per phone number or e-mail address
 * what the client wrote (WhatsApp webhook, inbound mailbox) and what we sent
 * (every outbound notification). Reply from here; mark a thread handled.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ avec?: string; q?: string; etat?: string; canal?: string; depuis?: string; point?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  /* Qui signe. La disposition garde déjà le desk ; on relit la session pour le
     nom, que le serveur met au bas de chaque message. */
  const desk = await requireDesk();
  const r = repo();
  const [inbound, notifications, contacts, intents, offers] = await Promise.all([r.listInbound(1000), r.listNotifications(1000), r.listContacts(), r.listIntents(), r.listOffers()]);
  const now = new Date();
  const lines = offers.filter((o) => !isPast(displayStatus(o, now))).map((o) => ({ id: o.id, title: o.title }));
  const threads = new Map<string, Thread>();
  const get = (key: string, channel: "whatsapp" | "email") => {
    let t = threads.get(key);
    if (!t) {
      const c = contacts.find((x) => (channel === "whatsapp" ? x.phone === key : x.email === key));
      const i = intents.find((x) => (channel === "whatsapp" ? x.contactPhone === key : x.contactEmail === key));
      t = { key, channel, name: c?.name ?? i?.clientName, clientId: c?.id ?? i?.clientId, msgs: [], unread: 0, last: "" };
      threads.set(key, t);
    }
    return t;
  };
  for (const m of inbound as InboundMessage[]) {
    if (m.channel === "push") continue;
    const t = get(m.from, m.channel);
    if (!t.name && m.name) t.name = m.name;
    t.msgs.push({ at: m.receivedAt, dir: "in", channel: m.channel, text: m.body, subject: m.subject, handled: Boolean(m.handledAt), id: m.id, pieces: m.attachments ?? [] });
    if (!m.handledAt) t.unread++;
  }
  for (const n of notifications as Notification[]) {
    if (n.channel === "push") continue;
    const t = get(n.to, n.channel);
    if (!t.name && n.contactName) t.name = n.contactName;
    t.msgs.push({ at: n.createdAt, dir: "out", channel: n.channel, text: n.body, status: n.status, subject: n.subject, intentId: n.intentId });
  }
  for (const t of threads.values()) {
    /* LE PLUS RÉCENT EN HAUT, décidé le 2026-10-01 par l'utilisateur.
       Un fil de discussion se lit d'habitude du plus ancien au plus récent, et
       c'est ce qu'il faisait : le dernier message était donc en bas, après tout
       l'historique. Mais ce desk ouvre un fil pour TRAITER ce qui vient
       d'arriver, pas pour relire une conversation : la chose à lire est la
       dernière, elle se met donc là où l'œil tombe.
       Le prix assumé : une réponse se trouve au-dessus du message qu'elle
       répond. Une ligne à inverser si ça gêne plus que ça ne sert. */
    t.msgs.sort((a, b) => b.at.localeCompare(a.at));
    t.last = t.msgs[t.msgs.length - 1]?.at ?? "";
  }
  const all = [...threads.values()].sort((a, b) => b.unread - a.unread || b.last.localeCompare(a.last));
  const list = all.filter((t) => (!sp.canal || t.channel === sp.canal) && (sp.etat !== "a_traiter" || t.unread > 0) && (sp.etat !== "traites" || t.unread === 0) && textMatch(sp.q, t.key, t.name, ...t.msgs.slice(-3).map((m) => m.text)));
  const open = sp.avec ? threads.get(sp.avec) : list[0];
  const unread = all.reduce((s, t) => s + t.unread, 0);
  /* Le dernier message VENU du client : il ouvre la fenêtre de 24 h de WhatsApp
     et c'est lui que « Citer » reprend. Le fil est trié du plus récent au plus
     ancien, donc c'est le PREMIER « in » qu'on cherche, pas le dernier. */
  const recu = open?.msgs.find((m) => m.dir === "in");
  const dernierRecu = recu ? { at: recu.at, text: recu.text } : undefined;
  /* LES MODÈLES DU RÉFÉRENTIEL, apportés dans la boîte aux lettres.
     L'ordre le plus récent de ce contact donne {ref} et {ligne}, et son état met
     en tête les modèles que cette situation appelle. Sans ordre, la liste
     entière reste là : un client écrit souvent avant d'en avoir passé un. */
  const sien = open
    ? intents
        .filter((i) => (open.channel === "whatsapp" ? i.contactPhone === open.key : i.contactEmail === open.key))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;
  const modeles = open
    ? await modelesDuFil(sien?.state, {
        client: open.name ?? "",
        ref: sien?.ref ?? "",
        ligne: sien ? (offers.find((o) => o.id === sien.offerId)?.title ?? "") : "",
      })
    : [];

  return (
    <>
      <DeskNav current="/desk/messages" badges={{ "/desk/messages": unread }} />
      {sp.depuis === "sante" && <FromSante point={sp.point ?? ""} />}
      <Toolbar
        placeholder={t("Nom, numéro, adresse, texte…")}
        chipKey="etat"
        chips={[
          { value: "", label: t("Toutes"), count: all.length },
          { value: "a_traiter", label: t("À traiter"), count: all.filter((t) => t.unread > 0).length },
          { value: "traites", label: t("Traitées") },
        ]}
        selects={[{ key: "canal", label: t("Canal"), all: "tous", options: [{ value: "whatsapp", label: t("WhatsApp") }, { value: "email", label: t("E-mail") }] }]}
      />

      <div className={styles.layout} data-coach="inbox">
        <aside className={styles.list}>
          {list.map((t) => {
            const lastMsg = t.msgs[t.msgs.length - 1];
            return (
              <Link key={t.key} href={`/desk/messages?avec=${encodeURIComponent(t.key)}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={styles.item} aria-current={open?.key === t.key ? "true" : undefined}>
                <div className={styles.itemTop}>
                  <b>{t.name ?? t.key}</b>
                  <small>{fmtDateTime(t.last).split(" ")[0]}</small>
                </div>
                <div className={styles.itemBottom}>
                  <span className={styles.chan}>{t.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</span>
                  <span className={styles.preview}>
                    {lastMsg?.dir === "out" ? "Vous : " : ""}
                    {lastMsg?.text.replace(/\s+/g, " ").slice(0, 70)}
                  </span>
                  {t.unread > 0 && <em className={styles.unread}>{t.unread}</em>}
                </div>
              </Link>
            );
          })}
          {list.length === 0 && <div className="empty">{t("Aucune conversation. Les messages WhatsApp arrivent par le webhook Meta, les e-mails par la boîte d'entrée configurée.")}</div>}
        </aside>

        {open ? (
          <div className={styles.thread}>
            <div className={styles.threadHead}>
              <div>
                <b>{open.name ?? open.key}</b>
                <small className="muted">
                  {open.key} · {open.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                </small>
              </div>
              <div className={styles.threadBtns}>
                {open.clientId && (
                  <Link className="btn sm ghost" href={`/desk/clients`}>
                    {t("Dossier")}
                  </Link>
                )}
                {open.unread > 0 && (
                  <form action={handledAction}>
                    <input type="hidden" name="to" value={open.key} />
                    <button className="btn sm" type="submit">
                      {t("Marquer comme traité")}
                    </button>
                  </form>
                )}
              </div>
            </div>
            <ol className={styles.msgs}>
              {open.msgs.map((m, i) => (
                <li key={i} className={m.dir === "in" ? styles.in : styles.out}>
                  <div className={styles.bubble}>
                    {m.subject && <b className={styles.subj}>{m.subject}</b>}
                    <span>{m.text}</span>
                  </div>
                  {/* LA PIÈCE VIT ICI, et plus dans « À valider ». Cette file sert
                      à ce qui peut devenir une ligne de marché ; un document
                      qu'un régulateur envoie n'a rien à y devenir, et le bouton
                      « Publier » n'a aucun sens à côté de lui. */}
                  {m.pieces?.map((piece, rang) => (
                    <div key={piece.fileKey} className={styles.piece}>
                      <span className={styles.pieceIcone} aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 3v5h5" />
                        </svg>
                      </span>
                      <span className={styles.pieceQuoi}>
                        <b>{piece.name}</b>
                        <small>
                          {piece.mimeType === "application/pdf" ? "PDF" : piece.mimeType.startsWith("image/") ? t("image") : piece.mimeType} · {Math.max(1, Math.round(piece.size / 1024))} ko · {t("gardé au dépôt")}
                        </small>
                      </span>
                      {/* La pièce se désigne par son message et son rang, jamais
                          par sa clef : une adresse portant la clef laisserait
                          demander n'importe quel fichier du dépôt.

                          « Ouvrir » ne s'affiche que pour ce qui se regarde. Un
                          .docx ou un .zip ne s'ouvrent pas dans un navigateur :
                          proposer le geste donnerait une page cassée. */}
                      {(piece.mimeType === "application/pdf" || piece.mimeType.startsWith("image/")) && (
                        <a className="btn sm" href={`/desk/messages/piece/${m.id}/${rang}`} target="_blank" rel="noopener noreferrer">
                          {t("Ouvrir")}
                        </a>
                      )}
                      <a className="btn sm" href={`/desk/messages/piece/${m.id}/${rang}?t=1`} download={piece.name}>
                        {t("Télécharger")}
                      </a>
                      {/* LE BOUTON DE PROMOTION A ETE RETIRE le 2026-10-02.
                          Plus aucun chemin ne mène d'un message à « À valider »,
                          qui ne reçoit donc que ce que les crons ramassent. Les
                          communiqués arrivent de la BEAC et de la BVMAC, pas de
                          la boîte aux lettres : une pièce de correspondance se
                          lit, se classe, et c'est tout. Le lien subsiste pour
                          les pièces parties avant ce jour-là. */}
                      {piece.intakeId && (
                        <Link className={styles.piecePartie} href={`/desk/a-valider?piece=${piece.intakeId}`}>
                          {t("déjà proposée en ligne de marché")}
                        </Link>
                      )}
                    </div>
                  ))}
                  <small>
                    {fmtDateTime(m.at)}
                    {m.dir === "out" ? ` · ${m.status === "sent" ? "envoyé" : m.status === "skipped" ? "préparé, non envoyé" : m.status === "failed" ? "échec" : "en file"}` : m.handled ? " · traité" : ""}
                    {m.intentId && (
                      <>
                        {" · "}
                        <Link href={`/desk/intentions/${m.intentId}`}>{t("intention")}</Link>
                      </>
                    )}
                  </small>
                </li>
              ))}
            </ol>
            <ReplyForm
              to={open.key}
              channel={open.channel}
              name={open.name}
              lines={lines}
              dernierRecu={dernierRecu}
              modeles={modeles}
              deskName={desk.name}
              appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
              from={process.env.EMAIL_FROM ?? ""}
            />
          </div>
        ) : (
          <div className={styles.thread}>
            <div className="empty">{t("Choisissez une conversation.")}</div>
          </div>
        )}
      </div>
    </>
  );
}
