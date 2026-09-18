import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { LineIdentity } from "@/components/LineIdentity";
import { Info } from "@/components/Info";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { orderChecks } from "@/lib/domain/checks";
import { estimate } from "@/lib/domain/estimate";
import { INTENT_LABEL, INTENT_STATE_LABEL, nextStates, STATE_ACTION_LABEL } from "@/lib/domain/intent";
import { summarize } from "@/lib/domain/summary";
import type { Intent, IntentState } from "@/lib/domain/types";
import { fmt, fmtDateTime, fmtMillions } from "@/lib/format";
import { missingForApproval, RISK_LABEL, STATUS_LABEL } from "@/lib/kyc/checklist";
import { positionsFrom } from "@/lib/positions";
import { transitionIntent } from "../../actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intention" };

const TRACK: IntentState[] = ["recue", "confirmee", "transmise", "servie", "reglee"];
const MARKET_TYPES = new Set(["achat", "vente", "souscription", "rachat"]);

/**
 * One intention, opened: the order as the client sent it, the line as they saw
 * it, the consistency checks, the client's file, history, positions and
 * messages — and the decision, without leaving the screen.
 */
export default async function IntentionPage({ params }: { params: Promise<{ id: string }> }) {
  await loadRegistry();
  const { id } = await params;
  const r = repo();
  const [intents, offers, contacts, notifications, events] = await Promise.all([r.listIntents(), r.listOffers(), r.listContacts(), r.listNotifications(500), r.listEvents(500)]);
  const it = intents.find((x) => x.id === id);
  if (!it) notFound();
  const o = offers.find((x) => x.id === it.offerId);
  if (!o) notFound();
  const now = new Date();
  const s = summarize(o, now);
  const contact = (it.clientId && contacts.find((c) => c.id === it.clientId)) || contacts.find((c) => (it.contactPhone && c.phone === it.contactPhone) || (it.contactEmail && c.email === it.contactEmail));
  const file = it.clientId ? await r.getClientFileByUser(it.clientId) : undefined;
  const sameClient = (x: Intent) => (it.clientId && x.clientId === it.clientId) || (it.contactPhone && x.contactPhone === it.contactPhone) || (it.contactEmail && x.contactEmail === it.contactEmail);
  const history = intents.filter((x) => x.id !== it.id && sameClient(x)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const positions = it.clientId ? positionsFrom(intents.filter((x) => x.clientId === it.clientId), offers, now) : [];
  const held = positions.filter((p) => p.offer.isin === o.isin).reduce((sum, p) => sum + p.units, 0);
  const valued = positions.reduce((sum, p) => sum + (p.marketValue ?? p.nominalAmount), 0);
  const nextFlow = positions.map((p) => p.nextFlow).filter(Boolean).sort((a, b) => a!.date.localeCompare(b!.date))[0];
  const checks = orderChecks(o, it.type, it.amount, it.limitPrice, { held: it.type === "vente" || it.type === "rachat" ? held : undefined, needsAccount: /compte-titres à ouvrir/.test(it.message ?? "") });
  const est = it.amount ? estimate(o, it.amount) : undefined;
  const ids = new Set([it.id, ...history.map((x) => x.id)]);
  const outbound = notifications.filter((n) => (n.intentId && ids.has(n.intentId)) || (it.contactPhone && n.to === it.contactPhone) || (it.contactEmail && n.to === it.contactEmail));
  const inbound = events.filter((e) => e.intentId && ids.has(e.intentId));
  const messages = [
    ...outbound.map((n) => ({ at: n.createdAt, dir: "out" as const, who: n.channel === "whatsapp" ? "WhatsApp" : n.channel === "push" ? "Push" : "E-mail", text: n.body.split("\n").slice(0, 3).join(" · ").slice(0, 240), html: false, status: n.status })),
    ...inbound.map((e) => ({ at: e.at, dir: e.kind === "intent" ? ("in" as const) : ("sys" as const), who: e.kind === "intent" ? "Client" : e.kind === "desk" ? "Desk" : "Système", text: e.html, html: true, status: "" })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 40);
  const missing = file ? missingForApproval(file) : [];
  const next = nextStates(it.state, it.type);
  const marketExec = MARKET_TYPES.has(it.type) && it.state === "transmise";
  const step = TRACK.indexOf(it.state);
  const amountText = it.amount ? (o.kind === "RACHAT" ? `${fmt(it.amount)} titres` : it.type === "rachat" ? `${it.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : o.kind === "MARCHE" ? `${fmt(it.amount)} ${o.instrument === "obligation" ? "titres" : "actions"}` : `${fmt(it.amount)} FCFA`) : "—";
  const wa = it.contactPhone ? `https://wa.me/${it.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${it.clientName}, au sujet de votre ${INTENT_LABEL[it.type].toLowerCase()} ${it.ref} sur ${o.title} : `)}` : undefined;

  return (
    <>
      <DeskNav current="/desk" />
      <div className={styles.crumbs}>
        <Link href="/desk">← Carnet du jour</Link>
        <span>
          {it.ref} · reçue le {fmtDateTime(it.createdAt)} · {it.channel}
        </span>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className="panel">
            <div className="panel-h">
              <h2>
                {INTENT_LABEL[it.type]} · {amountText}
              </h2>
              <span className={`st ${it.state}`}>{INTENT_STATE_LABEL[it.state]}</span>
            </div>
            <div className={styles.line}>
              <LineIdentity o={o} s={s} href={`/offres/${o.id}`} size="lg" />
              <div className={styles.lineFacts}>
                <div>
                  <span>{s.gold ? "Rendement" : "Repère"}</span>
                  <b className={s.gold ? styles.gold : undefined}>{s.hero}</b>
                  <small>{s.heroSub}</small>
                </div>
                <div>
                  <span>Statut</span>
                  <b>{s.countdown ? `Clôture ${s.countdown}` : s.status}</b>
                  <small>{s.deadline}</small>
                </div>
                <div>
                  <span>Ticket minimum</span>
                  <b>{s.minimum}</b>
                  <small>{s.minimumSub}</small>
                </div>
              </div>
            </div>
            <dl className={styles.dl}>
              {est && !checks.some((c) => c.level === "ok") && (
                <>
                  <dt>Au prix publié</dt>
                  <dd>{est.text}</dd>
                </>
              )}
              {it.limitPrice != null && (
                <>
                  <dt>Prix limite du client</dt>
                  <dd>{o.instrument === "obligation" ? `${it.limitPrice} % du nominal` : `${fmt(it.limitPrice)} FCFA`}</dd>
                </>
              )}
              <dt>Contrôles</dt>
              <dd>
                <ul className={styles.checks}>
                  {checks.map((c) => (
                    <li key={c.key} className={c.level === "block" ? styles.block : c.level === "warn" ? styles.warn : styles.ok}>
                      {c.text} <Info text={c.why} label="Règle" subtle />
                    </li>
                  ))}
                  {file && file.status !== "approuve" && <li className={styles.warn}>Dossier client {STATUS_LABEL[file.status].toLowerCase()} — à approuver avant le règlement.</li>}
                  {!file && <li className={styles.warn}>Aucun dossier client : ouvrir le compte avant le règlement.</li>}
                  {checks.length === 0 && file?.status === "approuve" && <li className={styles.ok}>Rien à signaler.</li>}
                </ul>
              </dd>
              {it.message && (
                <>
                  <dt>Message du client</dt>
                  <dd>« {it.message} »</dd>
                </>
              )}
              <dt>Contact pour cet ordre</dt>
              <dd>
                {[it.contactPhone, it.contactEmail].filter(Boolean).join(" · ") || "—"}
              </dd>
              {(it.allocationPct != null || it.servedUnits != null || it.executedPrice != null) && (
                <>
                  <dt>Résultat</dt>
                  <dd>
                    {it.allocationPct != null ? `servi à ${it.allocationPct} %` : ""}
                    {it.servedUnits != null ? ` · ${fmt(it.servedUnits)} unités` : ""}
                    {it.executedPrice != null ? ` · exécuté à ${fmt(it.executedPrice)}` : ""}
                  </dd>
                </>
              )}
              <dt>Étape</dt>
              <dd>
                <div className={styles.track} aria-label={`Étape ${Math.max(step, 0) + 1} sur ${TRACK.length}`}>
                  {TRACK.map((st, i) => (
                    <i key={st} className={i <= step ? styles.done : undefined} title={INTENT_STATE_LABEL[st]} />
                  ))}
                </div>
                <small className="muted">{TRACK.map((st) => INTENT_STATE_LABEL[st].toLowerCase()).join(" → ")}</small>
              </dd>
            </dl>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>Décision</h2>
              <span className="muted" style={{ fontSize: ".8rem" }}>
                chaque passage est journalisé et produit ses documents
              </span>
            </div>
            <div className={styles.actions}>
              {marketExec && (
                <Link className="btn primary" href="/desk/marche">
                  Exécuter (Marché)
                </Link>
              )}
              {next
                .filter((st) => !(marketExec && st !== "annulee"))
                .map((st) => (
                  <form key={st} action={transitionIntent}>
                    <input type="hidden" name="intentId" value={it.id} />
                    <input type="hidden" name="state" value={st} />
                    <button className={`btn ${st === "transmise" || st === "confirmee" ? "primary" : st === "annulee" ? "ghost" : ""}`} type="submit">
                      {STATE_ACTION_LABEL[st] ?? INTENT_STATE_LABEL[st]}
                    </button>
                  </form>
                ))}
              {next.length === 0 && <span className="muted">Intention terminée — plus aucun passage possible.</span>}
              <Link className="btn ghost" href={`/offres/${o.id}`}>
                Voir la fiche
              </Link>
              {wa && (
                <a className="btn ghost" href={wa} target="_blank" rel="noreferrer">
                  Répondre sur WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>Messages</h2>
              <span className="muted" style={{ fontSize: ".8rem" }}>
                sortants (WhatsApp, e-mail) et événements reçus sur les intentions de ce client
              </span>
            </div>
            <ul className={styles.msgs}>
              {messages.map((m, i) => (
                <li key={i} className={styles[m.dir]}>
                  <span className={styles.when}>{fmtDateTime(m.at)}</span>
                  <b>{m.who}</b>
                  {m.html ? <span dangerouslySetInnerHTML={{ __html: m.text }} /> : <span>{m.text}</span>}
                  {m.status && <small className="muted">{m.status}</small>}
                </li>
              ))}
              {messages.length === 0 && <li className="muted">Aucun message pour l&apos;instant.</li>}
            </ul>
          </div>
        </div>

        <aside className={styles.side}>
          <div className={styles.who}>
            <div className="eyebrow">{it.clientSegment}</div>
            <h3 className="display">{it.clientName}</h3>
            <div className="muted" style={{ fontSize: ".8rem" }}>
              {[contact?.phone ?? it.contactPhone, contact?.email ?? it.contactEmail].filter(Boolean).join(" · ")}
              {contact ? (contact.whatsappOptIn ? " · WhatsApp ✓" : " · WhatsApp non consenti") : ""}
            </div>
          </div>

          <h4>Dossier client</h4>
          {file ? (
            <dl className={styles.kv}>
              <dt>Statut</dt>
              <dd>
                <span className={`st ${file.status === "approuve" ? "confirmee" : file.status === "refuse" ? "annulee" : "recue"}`}>{STATUS_LABEL[file.status]}</span>
              </dd>
              <dt>Risque</dt>
              <dd>{file.review.risk ? `${RISK_LABEL[file.review.risk]}${file.review.nextReviewOn ? ` · revue ${file.review.nextReviewOn.slice(0, 4)}` : ""}` : "non évalué"}</dd>
              <dt>Compte-titres</dt>
              <dd>{file.review.custodianAccount ?? "à ouvrir"}</dd>
              <dt>Pièces</dt>
              <dd>
                {file.documents.length} reçue{file.documents.length > 1 ? "s" : ""}
              </dd>
              <dt>Sanctions / PPE</dt>
              <dd>{file.screening?.outcome ? `${file.screening.outcome === "aucun" ? "aucune correspondance" : file.screening.outcome === "faux_positif" ? "faux positif écarté" : "correspondance confirmée"}${file.screening.attestedAt ? ` (${fmtDateTime(file.screening.attestedAt)})` : ""}` : "non attesté"}</dd>
              {missing.length > 0 && (
                <>
                  <dt>Manque</dt>
                  <dd className={styles.warnText}>{missing.join(" · ")}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="muted" style={{ fontSize: ".82rem" }}>
              Pas de dossier : le client n&apos;a pas commencé « Ouvrir un compte ».
            </p>
          )}
          <div className={styles.sideBtns}>
            {file && (
              <Link className="btn sm" href={`/desk/clients?file=${file.id}`}>
                Ouvrir le dossier KYC
              </Link>
            )}
            {it.clientId && (
              <Link className="btn sm ghost" href={`/desk/resultats?client=${it.clientId}`}>
                Positions et relevés
              </Link>
            )}
          </div>

          <h4>Positions</h4>
          {positions.length > 0 ? (
            <dl className={styles.kv}>
              <dt>Valorisées</dt>
              <dd>{fmtMillions(valued)}</dd>
              <dt>Lignes</dt>
              <dd>{positions.length}</dd>
              {held > 0 && (
                <>
                  <dt>Sur cette ligne</dt>
                  <dd>{fmt(held)} unité(s)</dd>
                </>
              )}
              {nextFlow && (
                <>
                  <dt>Prochain flux</dt>
                  <dd>
                    {fmt(nextFlow.amount)} FCFA le {nextFlow.date}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="muted" style={{ fontSize: ".82rem" }}>
              Aucune position réglée chez nous.
            </p>
          )}

          <h4>Historique</h4>
          <ul className={styles.hist}>
            {history.slice(0, 12).map((x) => {
              const ox = offers.find((z) => z.id === x.offerId);
              return (
                <li key={x.id}>
                  <span>{fmtDateTime(x.createdAt).split(" ")[0]}</span>
                  <Link href={`/desk/intentions/${x.id}`}>
                    <b>{INTENT_STATE_LABEL[x.state]}</b> {INTENT_LABEL[x.type].toLowerCase()} · {ox?.title ?? x.offerId}
                    {x.amount ? ` — ${fmt(x.amount)}` : ""}
                  </Link>
                </li>
              );
            })}
            {history.length === 0 && <li className="muted">Première intention de ce client.</li>}
          </ul>
        </aside>
      </div>
    </>
  );
}
