import Link from "next/link";
import { Suspense } from "react";
import { Toolbar } from "@/components/ui/Toolbar";
import { textMatch } from "@/lib/text";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL, nextStates, STATE_ACTION_LABEL } from "@/lib/domain/intent";
import { countdown, displayStatus, headlineYield, isActionable } from "@/lib/domain/status";
import type { Intent, Offer } from "@/lib/domain/types";
import { parseDate } from "@/lib/finance";
import { fmt, fmtDateTime, fmtMillions, fmtPct, fmtPrice, fmtTime } from "@/lib/format";
import { transitionIntent } from "./actions";
import { DeskLive } from "@/components/DeskLive";
import { FeaturePanel } from "./featured/FeaturePanel";
import { LineIdentity } from "@/components/LineIdentity";
import { summarize } from "@/lib/domain/summary";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desk" };

const FIRM = (i: Intent) => i.type === "ferme" || i.type === "cession";
const OPEN_STATES: Intent["state"][] = ["recue", "confirmee", "transmise"];

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ etat?: string; q?: string; ligne?: string; tri?: string }> }) {
  const sp = await searchParams;
  const r = repo();
  const [offers, intents, events, notifications, approvals] = await Promise.all([r.listOffers(), r.listIntents(), r.listEvents(30), r.listNotifications(20), r.listApprovals(true)]);
  const now = new Date();
  const byId = new Map(offers.map((o) => [o.id, o]));

  // Book: open offers, grouped by their deadline (an auction = one deadline per issuer).
  const live = offers.filter((o) => isActionable(displayStatus(o, now)) && o.kind !== "ACTIONS" && o.kind !== "MARCHE");
  const rows = live.map((o) => {
    const its = intents.filter((i) => i.offerId === o.id && OPEN_STATES.includes(i.state));
    const firm = its.filter(FIRM);
    const soft = its.filter((i) => i.type === "appetit");
    const toFcfa = (i: Intent) => (i.amount ?? 0) * (o.kind === "RACHAT" ? o.nominal : 1);
    return { o, nF: firm.length, sF: firm.reduce((s, i) => s + toFcfa(i), 0), nA: soft.length, sA: soft.reduce((s, i) => s + toFcfa(i), 0) };
  });
  const max = Math.max(...rows.map((x) => x.sF + x.sA), 1);
  const nextDeadline = live.map((o) => o.deadlineAt).sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime())[0];
  const totalF = rows.reduce((s, x) => s + x.sF, 0);
  const totalA = rows.reduce((s, x) => s + x.sA, 0);
  const todo = intents.filter((i) => i.state === "recue").length;
  // The intentions table follows the toolbar: state, search, line, sort.
  const stateOf = (i: Intent) => (i.state === "recue" ? "recue" : i.state === "confirmee" ? "confirmee" : i.state === "transmise" ? "transmise" : i.state === "annulee" ? "annulee" : "finie");
  const counts = { recue: 0, confirmee: 0, transmise: 0, finie: 0, annulee: 0 } as Record<string, number>;
  for (const i of intents) counts[stateOf(i)]++;
  const shown = intents
    .filter((i) => (!sp.etat || stateOf(i) === sp.etat) && (!sp.ligne || i.offerId === sp.ligne) && textMatch(sp.q, i.ref, i.clientName, i.clientSegment, byId.get(i.offerId)?.title, i.contactPhone, i.contactEmail, i.message))
    .sort((a, b) => (sp.tri === "ancien" ? a.createdAt.localeCompare(b.createdAt) : sp.tri === "montant" ? (b.amount ?? 0) - (a.amount ?? 0) : sp.tri === "client" ? a.clientName.localeCompare(b.clientName, "fr") : b.createdAt.localeCompare(a.createdAt)));
  const lines = [...new Set(intents.map((i) => i.offerId))].map((id) => ({ value: id, label: byId.get(id)?.title ?? id })).sort((a, b) => a.label.localeCompare(b.label, "fr"));

  // À la une: what is featured now, and which lines could be (open or quoted, not hidden).
  const today = now.toISOString().slice(0, 10);
  const featRow = (o: Offer) => ({ id: o.id, title: o.title, hero: summarize(o, now).hero, deadline: o.kind === "MARCHE" || o.kind === "FONDS" ? undefined : o.deadlineAt.slice(0, 10), featured: o.featured });
  const featActive = offers.filter((o) => o.featured && o.featured.until >= today).map(featRow);
  const featCandidates = offers.filter((o) => !o.hidden && !(o.featured && o.featured.until >= today) && isActionable(displayStatus(o, now))).map(featRow);

  const notifStatus: Record<string, [string, string]> = { sent: ["confirmee", "Envoyé"], skipped: ["recue", "Préparé"], failed: ["annulee", "Échec"], queued: ["info", "En file"] };

  return (
    <>
      <DeskLive supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL} anonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY} />
      <DeskNav current="/desk" badges={{ "/desk/approbations": approvals.length }} />

      <FeaturePanel active={featActive} candidates={featCandidates} />

      <div className={styles.kpis} data-coach="kpis">
        <div className={`${styles.kpi} ${styles.hot}`}>
          <span>Prochaine clôture dans</span>
          <b className="num">{nextDeadline ? countdown(nextDeadline, now) : "—"}</b>
          <small>{nextDeadline ? fmtDateTime(nextDeadline) : "aucune offre ouverte"}</small>
        </div>
        <div className={styles.kpi}>
          <span>Prises fermes</span>
          <b className="num">{fmtMillions(totalF)}</b>
          <small>{rows.reduce((s, x) => s + x.nF, 0)} ordres à confirmer ou transmettre</small>
        </div>
        <div className={styles.kpi}>
          <span>Appétits à convertir</span>
          <b className="num">{fmtMillions(totalA)}</b>
          <small>{rows.reduce((s, x) => s + x.nA, 0)} clients à rappeler</small>
        </div>
        <div className={styles.kpi}>
          <span>Intentions non traitées</span>
          <b className="num">{todo}</b>
          <small>sur {intents.length} reçues</small>
        </div>
      </div>

      <div className="panel" data-coach="feed">
        <div className="panel-h">
          <h2>Flux en direct</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Chaque intention client apparaît ici dès son enregistrement
          </span>
        </div>
        <div className={styles.feed}>
          {events.map((e) => (
            <div key={e.id} className={`${styles.ev} ${e.kind === "intent" ? styles.evNew : ""}`}>
              <span className={styles.when}>{fmtTime(e.at)}</span>
              <span dangerouslySetInnerHTML={{ __html: e.html }} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Diffusion</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Messages sortants (WhatsApp, e-mail) — « préparé » tant que le canal n&apos;est pas configuré
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Quand</th>
                <th>Canal</th>
                <th>Destinataire</th>
                <th>Message</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td className="num">{fmtTime(n.createdAt)}</td>
                  <td>{n.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</td>
                  <td className="who">
                    {n.contactName ?? n.to}
                    <small className="mono">{n.to}</small>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: ".78rem" }}>{n.body.split("\n").slice(0, 2).join(" · ").slice(0, 140)}</span>
                  </td>
                  <td>
                    <span className={`st ${notifStatus[n.status][0]}`}>{notifStatus[n.status][1]}</span>
                    {n.error && <small className="muted"> · {n.error}</small>}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Aucun message sortant pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Carnet d&apos;appétits — offres ouvertes</h2>
          <span className="muted right" style={{ fontSize: ".8rem" }}>
            prises fermes en navy, appétits en or
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Prix Purpose</th>
                <th className="r">Prises fermes</th>
                <th className="r">Appétits</th>
                <th>Volume</th>
                <th className="r">Rendement publié</th>
                <th className="r">Clôture</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ o, nF, sF, nA, sA }) => (
                <tr key={o.id}>
                  <td>
                    <LineIdentity o={o} s={summarize(o, now)} href={`/offres/${o.id}`} />
                  </td>
                  <td className="num">{o.kind === "BTA" ? fmtPct(o.precountRate ?? 0, 2) : fmtPrice(o.pricePct ?? 100)}{o.priceNote || o.rateNote ? <span className="muted"> (indic.)</span> : null}</td>
                  <td className="r">
                    <b>{nF}</b> · {fmtMillions(sF)}
                  </td>
                  <td className="r">
                    {nA} · {fmtMillions(sA)}
                  </td>
                  <td>
                    <div className={styles.bar}>
                      <i className={styles.barFirm} style={{ width: `${(sF / max) * 100}%` }} />
                      <i style={{ width: `${(sA / max) * 100}%` }} />
                    </div>
                  </td>
                  <td className="r num">{headlineYield(o) != null ? fmtPct(headlineYield(o) as number) : "—"}</td>
                  <td className="r">
                    <span className={styles.cd}>{countdown(o.deadlineAt, now)}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Aucune offre ouverte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" data-coach="intents">
        <div className="panel-h">
          <h2>Intentions reçues</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {intents.length} au total · {todo} à traiter{shown.length !== intents.length ? ` · ${shown.length} affichée${shown.length > 1 ? "s" : ""}` : ""}
          </span>
        </div>
        <Suspense>
          <Toolbar
            inset
            placeholder="Réf., client, ligne, téléphone…"
            chipKey="etat"
            chips={[
              { value: "", label: "Toutes", count: intents.length },
              { value: "recue", label: "À traiter", count: counts.recue },
              { value: "confirmee", label: "Confirmées", count: counts.confirmee },
              { value: "transmise", label: "Transmises", count: counts.transmise },
              { value: "finie", label: "Servies · réglées", count: counts.finie },
              { value: "annulee", label: "Annulées", count: counts.annulee },
            ]}
            selects={[{ key: "ligne", label: "Ligne", all: "toutes les lignes", options: lines }]}
            sort={{ key: "tri", label: "Tri", options: [{ value: "recent", label: "plus récent" }, { value: "ancien", label: "plus ancien" }, { value: "montant", label: "montant" }, { value: "client", label: "client" }] }}
          />
        </Suspense>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Ligne</th>
                <th>Type</th>
                <th className="r">Montant</th>
                <th>Canal</th>
                <th>Reçue</th>
                <th>État</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const o = byId.get(i.offerId) as Offer | undefined;
                const next = nextStates(i.state, i.type);
                return (
                  <tr key={i.id}>
                    <td className="mono">
                      <Link href={`/desk/intentions/${i.id}`} className={styles.refLink}>
                        {i.ref}
                      </Link>
                    </td>
                    <td className="who">
                      {i.clientName}
                      <small>{i.clientSegment}</small>
                    </td>
                    <td>
                      {o?.title ?? i.offerId}
                      {i.message && (
                        <>
                          <br />
                          <small className="muted">« {i.message} »</small>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`st ${i.type}`}>{INTENT_LABEL[i.type]}</span>
                    </td>
                    <td className="r num">{i.amount ? (o?.kind === "RACHAT" ? `${fmt(i.amount)} titres` : i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : fmt(i.amount)) : "—"}</td>
                    <td>
                      {i.channel}
                      {(i.contactPhone || i.contactEmail) && (
                        <>
                          <br />
                          <small className="muted">{i.channel === "E-mail" ? (i.contactEmail ?? i.contactPhone) : (i.contactPhone ?? i.contactEmail)}</small>
                        </>
                      )}
                    </td>
                    <td className="num">{fmtTime(i.createdAt)}</td>
                    <td>
                      <span className={`st ${i.state}`}>{INTENT_STATE_LABEL[i.state]}</span>
                    </td>
                    <td>
                      <div className={styles.rowbtns}>
                        <Link className="btn sm" href={`/desk/intentions/${i.id}`}>
                          Ouvrir
                        </Link>
                        {(i.type === "achat" || i.type === "vente" || i.type === "souscription" || i.type === "rachat") && i.state === "transmise" ? (
                          <Link className="btn sm primary" href="/desk/marche">
                            Exécuter (Marché)
                          </Link>
                        ) : null}
                        {next
                          .filter((s) => s !== "annulee" && !((i.type === "achat" || i.type === "vente" || i.type === "souscription" || i.type === "rachat") && i.state === "transmise"))
                          .map((s) => (
                            <form key={s} action={transitionIntent}>
                              <input type="hidden" name="intentId" value={i.id} />
                              <input type="hidden" name="state" value={s} />
                              <button className={`btn sm ${s === "transmise" ? "primary" : ""}`} type="submit">
                                {STATE_ACTION_LABEL[s]}
                              </button>
                            </form>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    Aucune intention ne correspond à ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
