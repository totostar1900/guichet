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
import { epinglerAction, etiquetterAction, handledAction, lotTraiteAction, reporterAction, rouvrirAction } from "./actions";
import { ETIQUETTES, motEtiquette } from "./etiquettes";
import { estReporte, REPORTS } from "./report";
import { modelesDuFil } from "./modeles";
import { ReplyForm } from "./ReplyForm";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

type Msg = { at: string; dir: "in" | "out"; channel: string; text: string; status?: string; subject?: string; handled?: boolean; intentId?: string; id?: string; pieces?: PieceGardee[] };
type Thread = { key: string; channel: "whatsapp" | "email"; name?: string; clientId?: string; msgs: Msg[]; unread: number; last: string; pinnedAt?: string; snoozedUntil?: string; labels: string[] };

/**
 * The desk inbox: one conversation per phone number or e-mail address
 * what the client wrote (WhatsApp webhook, inbound mailbox) and what we sent
 * (every outbound notification). Reply from here; mark a thread handled.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ avec?: string; q?: string; etat?: string; canal?: string; etiquette?: string; depuis?: string; point?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  /* Qui signe. La disposition garde déjà le desk ; on relit la session pour le
     nom, que le serveur met au bas de chaque message. */
  const desk = await requireDesk();
  const r = repo();
  const [inbound, notifications, contacts, intents, offers, etats] = await Promise.all([r.listInbound(1000), r.listNotifications(1000), r.listContacts(), r.listIntents(), r.listOffers(), r.listDeskThreads()]);
  const now = new Date();
  const lines = offers.filter((o) => !isPast(displayStatus(o, now))).map((o) => ({ id: o.id, title: o.title }));
  const threads = new Map<string, Thread>();
  const get = (key: string, channel: "whatsapp" | "email") => {
    let t = threads.get(key);
    if (!t) {
      const c = contacts.find((x) => (channel === "whatsapp" ? x.phone === key : x.email === key));
      const i = intents.find((x) => (channel === "whatsapp" ? x.contactPhone === key : x.contactEmail === key));
      t = { key, channel, name: c?.name ?? i?.clientName, clientId: c?.id ?? i?.clientId, msgs: [], unread: 0, last: "", labels: [] };
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
  /* L'état du fil rejoint le fil : épinglé, reporté, étiqueté. Il est porté par
     la conversation et non par ses messages, et il vient donc d'ailleurs. */
  for (const e of etats) {
    const t = threads.get(e.addr);
    if (t && t.channel === e.channel) {
      t.pinnedAt = e.pinnedAt;
      t.snoozedUntil = e.snoozedUntil;
      t.labels = e.labels;
    }
  }
  const maintenant = now.getTime();
  /* L'ÉPINGLÉ PASSE DEVANT, avant même le non-lu : c'est le dossier du jour, et
     il doit rester sous la main quand vingt messages arrivent par-dessus. */
  const all = [...threads.values()].sort((a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.unread - a.unread || b.last.localeCompare(a.last));
  /* UN FIL REPORTÉ SORT DE LA FILE jusqu'à son heure, et y rentre tout seul :
     c'est à cela que sert une date plutôt qu'un drapeau. Le chapeau
     « Reportées » le montre entre-temps, sinon un report se ferait à l'aveugle
     et personne ne saurait ce qu'il a mis de côté. */
  const list = all.filter(
    (t) =>
      (!sp.canal || t.channel === sp.canal) &&
      (sp.etiquette ? t.labels.includes(sp.etiquette) : true) &&
      (sp.etat === "reportees" ? estReporte(t.snoozedUntil, maintenant) : !estReporte(t.snoozedUntil, maintenant)) &&
      (sp.etat !== "a_traiter" || t.unread > 0) &&
      (sp.etat !== "traites" || t.unread === 0) &&
      (sp.etat !== "epinglees" || Boolean(t.pinnedAt)) &&
      textMatch(sp.q, t.key, t.name, ...t.msgs.slice(-3).map((m) => m.text)),
  );
  const open = sp.avec ? threads.get(sp.avec) : list[0];
  /* Le compteur de la navigation ignore les reportés : ils ne sont pas en
     attente, ils ont un rendez-vous. */
  const unread = all.reduce((s, t) => s + (estReporte(t.snoozedUntil, maintenant) ? 0 : t.unread), 0);
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
          { value: "epinglees", label: t("Épinglées"), count: all.filter((x) => x.pinnedAt).length },
          { value: "reportees", label: t("Reportées"), count: all.filter((x) => estReporte(x.snoozedUntil, maintenant)).length },
        ]}
        selects={[
          { key: "canal", label: t("Canal"), all: "tous", options: [{ value: "whatsapp", label: t("WhatsApp") }, { value: "email", label: t("E-mail") }] },
          { key: "etiquette", label: t("Étiquette"), all: "toutes", options: ETIQUETTES.map((e) => ({ value: e.cle, label: e.mot })) },
        ]}
      />

      <div className={styles.layout} data-coach="inbox">
        <aside className={styles.list}>
          {/* LES FORMULAIRES DES GESTES, posés une seule fois.
              Chaque bouton de ligne s'y rattache par « form », et porte sa cible
              en valeur. Un bouton dans un lien serait du HTML invalide, et un
              formulaire par ligne en ferait autant que de fils. */}
          <form id="g-epingler" action={epinglerAction} />
          <form id="g-reporter" action={reporterAction} />
          <form id="g-traiter" action={handledAction} />
          <form id="g-lot" action={lotTraiteAction} />
          {list.length > 0 && (
            <div className={styles.lot}>
              <button className="btn sm" type="submit" form="g-lot">
                {t("Marquer traités")}
              </button>
              <small className="muted">{t("les fils cochés")}</small>
            </div>
          )}
          {list.map((t2) => {
            const lastMsg = t2.msgs[t2.msgs.length - 1];
            const ou = `${t2.channel}|${t2.key}`;
            return (
              <div key={t2.key} className={styles.item} data-ouvert={open?.key === t2.key ? "" : undefined}>
                <input type="checkbox" name="fils" value={ou} form="g-lot" className={styles.coche} aria-label={t("Choisir {q}", { q: t2.name ?? t2.key })} />
                <Link href={`/desk/messages?avec=${encodeURIComponent(t2.key)}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={styles.itemLien} aria-current={open?.key === t2.key ? "true" : undefined}>
                  <div className={styles.itemTop}>
                    <b>{t2.name ?? t2.key}</b>
                    <small>{fmtDateTime(t2.last).split(" ")[0]}</small>
                  </div>
                  <div className={styles.itemBottom}>
                    <span className={styles.chan}>{t2.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</span>
                    {t2.labels.map((l) => (
                      <span key={l} className={styles.marque}>
                        {motEtiquette(l)}
                      </span>
                    ))}
                    <span className={styles.preview}>
                      {lastMsg?.dir === "out" ? "Vous : " : ""}
                      {lastMsg?.text.replace(/\s+/g, " ").slice(0, 70)}
                    </span>
                    {t2.unread > 0 && <em className={styles.unread}>{t2.unread}</em>}
                  </div>
                </Link>
                <div className={styles.gestes}>
                  <button type="submit" form="g-epingler" name="cible" value={ou} className={styles.geste} aria-pressed={Boolean(t2.pinnedAt)} title={t2.pinnedAt ? t("Retirer l'épingle") : t("Épingler")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={t2.pinnedAt ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M14 2 9 7H6a2 2 0 0 0-2 2v2h5v11l2-3 2 3V11h5V9a2 2 0 0 0-2-2h-3Z" />
                    </svg>
                  </button>
                  <button type="submit" form="g-reporter" name="cible" value={ou} className={styles.geste} title={estReporte(t2.snoozedUntil, maintenant) ? t("Revient le {d}", { d: fmtDateTime(t2.snoozedUntil ?? "") }) : t("Reporter à demain 9 h")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </button>
                  {t2.unread > 0 && (
                    <button type="submit" form="g-traiter" name="to" value={t2.key} className={styles.geste} title={t("Marquer comme traité")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <path d="m4 12 5 5L20 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
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
                  {estReporte(open.snoozedUntil, maintenant) ? ` · ${t("revient le {d}", { d: fmtDateTime(open.snoozedUntil ?? "") })}` : ""}
                </small>
                {/* L'ÉTIQUETTE SE POSE ICI et non dans la liste : savoir de quoi
                    parle un courrier demande de l'avoir lu. Le même bouton la
                    pose et la retire. */}
                <div className={styles.marques}>
                  {ETIQUETTES.map((e) => {
                    const posee = open.labels.includes(e.cle);
                    return (
                      <form key={e.cle} action={etiquetterAction}>
                        <input type="hidden" name="cible" value={`${open.channel}|${open.key}`} />
                        <input type="hidden" name="etiquette" value={e.cle} />
                        <button type="submit" className={styles.marqueBtn} aria-pressed={posee} style={posee ? { background: e.fond, color: e.teinte, borderColor: e.teinte } : undefined}>
                          {e.mot}
                        </button>
                      </form>
                    );
                  })}
                  {REPORTS.map((rp) => (
                    <form key={rp.cle} action={reporterAction}>
                      <input type="hidden" name="cible" value={`${open.channel}|${open.key}`} />
                      <input type="hidden" name="quand" value={rp.cle} />
                      <button type="submit" className={styles.marqueBtn}>
                        {t("Reporter {q}", { q: rp.mot })}
                      </button>
                    </form>
                  ))}
                  {estReporte(open.snoozedUntil, maintenant) && (
                    <form action={reporterAction}>
                      <input type="hidden" name="cible" value={`${open.channel}|${open.key}`} />
                      <input type="hidden" name="quand" value="rendre" />
                      <button type="submit" className={styles.marqueBtn}>
                        {t("Rendre maintenant")}
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div className={styles.threadBtns}>
                {open.clientId && (
                  <Link className="btn sm ghost" href={`/desk/clients`}>
                    {t("Dossier")}
                  </Link>
                )}
                {open.unread > 0 ? (
                  <form action={handledAction}>
                    <input type="hidden" name="to" value={open.key} />
                    <button className="btn sm" type="submit">
                      {t("Marquer comme traité")}
                    </button>
                  </form>
                ) : (
                  /* L'INVERSE, QUI MANQUAIT. « Marquer comme traité » était une
                     porte à sens unique : un clic de trop sortait le fil de la
                     file sans retour, et rien ne le disait. */
                  <form action={rouvrirAction}>
                    <input type="hidden" name="cible" value={`${open.channel}|${open.key}`} />
                    <button className="btn sm ghost" type="submit">
                      {t("Remettre à traiter")}
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
