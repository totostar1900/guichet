import Link from "next/link";
import { Suspense } from "react";
import { DeskNav } from "@/components/DeskNav";
import { Toolbar } from "@/components/ui/Toolbar";
import { repo } from "@/lib/data";
import type { InboundMessage, Notification } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/format";
import { textMatch } from "@/lib/text";
import { handledAction } from "./actions";
import { ReplyForm } from "./ReplyForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

type Msg = { at: string; dir: "in" | "out"; channel: string; text: string; status?: string; subject?: string; handled?: boolean; intentId?: string };
type Thread = { key: string; channel: "whatsapp" | "email"; name?: string; clientId?: string; msgs: Msg[]; unread: number; last: string };

/**
 * The desk inbox: one conversation per phone number or e-mail address —
 * what the client wrote (WhatsApp webhook, inbound mailbox) and what we sent
 * (every outbound notification). Reply from here; mark a thread handled.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ avec?: string; q?: string; etat?: string; canal?: string }> }) {
  const sp = await searchParams;
  const r = repo();
  const [inbound, notifications, contacts, intents] = await Promise.all([r.listInbound(1000), r.listNotifications(1000), r.listContacts(), r.listIntents()]);
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
    t.msgs.push({ at: m.receivedAt, dir: "in", channel: m.channel, text: m.body, subject: m.subject, handled: Boolean(m.handledAt) });
    if (!m.handledAt) t.unread++;
  }
  for (const n of notifications as Notification[]) {
    if (n.channel === "push") continue;
    const t = get(n.to, n.channel);
    if (!t.name && n.contactName) t.name = n.contactName;
    t.msgs.push({ at: n.createdAt, dir: "out", channel: n.channel, text: n.body, status: n.status, subject: n.subject, intentId: n.intentId });
  }
  for (const t of threads.values()) {
    t.msgs.sort((a, b) => a.at.localeCompare(b.at));
    t.last = t.msgs[t.msgs.length - 1]?.at ?? "";
  }
  const all = [...threads.values()].sort((a, b) => b.unread - a.unread || b.last.localeCompare(a.last));
  const list = all.filter((t) => (!sp.canal || t.channel === sp.canal) && (sp.etat !== "a_traiter" || t.unread > 0) && (sp.etat !== "traites" || t.unread === 0) && textMatch(sp.q, t.key, t.name, ...t.msgs.slice(-3).map((m) => m.text)));
  const open = sp.avec ? threads.get(sp.avec) : list[0];
  const unread = all.reduce((s, t) => s + t.unread, 0);

  return (
    <>
      <DeskNav current="/desk/messages" badges={{ "/desk/messages": unread }} />
      <Suspense>
        <Toolbar
          placeholder="Nom, numéro, adresse, texte…"
          chipKey="etat"
          chips={[
            { value: "", label: "Toutes", count: all.length },
            { value: "a_traiter", label: "À traiter", count: all.filter((t) => t.unread > 0).length },
            { value: "traites", label: "Traitées" },
          ]}
          selects={[{ key: "canal", label: "Canal", all: "tous", options: [{ value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "E-mail" }] }]}
        />
      </Suspense>

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
          {list.length === 0 && <div className="empty">Aucune conversation. Les messages WhatsApp arrivent par le webhook Meta, les e-mails par la boîte d&apos;entrée configurée.</div>}
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
                    Dossier
                  </Link>
                )}
                {open.unread > 0 && (
                  <form action={handledAction}>
                    <input type="hidden" name="to" value={open.key} />
                    <button className="btn sm" type="submit">
                      Marquer comme traité
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
                  <small>
                    {fmtDateTime(m.at)}
                    {m.dir === "out" ? ` · ${m.status === "sent" ? "envoyé" : m.status === "skipped" ? "préparé, non envoyé" : m.status === "failed" ? "échec" : "en file"}` : m.handled ? " · traité" : ""}
                    {m.intentId && (
                      <>
                        {" · "}
                        <Link href={`/desk/intentions/${m.intentId}`}>intention</Link>
                      </>
                    )}
                  </small>
                </li>
              ))}
            </ol>
            <ReplyForm to={open.key} channel={open.channel} name={open.name} />
          </div>
        ) : (
          <div className={styles.thread}>
            <div className="empty">Choisissez une conversation.</div>
          </div>
        )}
      </div>
    </>
  );
}
