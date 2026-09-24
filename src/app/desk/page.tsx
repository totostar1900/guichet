import Link from "next/link";
import { Suspense } from "react";
import { Toolbar } from "@/components/ui/Toolbar";
import { textMatch } from "@/lib/text";
import { PageOutline } from "@/components/PageOutline";
import { DeskNav } from "@/components/DeskNav";
import { FromSante } from "@/components/desk/FromSante";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL, nextStates, STATE_ACTION_LABEL } from "@/lib/domain/intent";
import { countdown, displayStatus, headlineYield, isActionable, KIND_LABEL } from "@/lib/domain/status";
import { TallTable } from "@/components/desk/TallTable";
import type { Intent, Offer } from "@/lib/domain/types";
import { parseDate } from "@/lib/finance";
import { fmt, fmtDateTime, fmtMillions, fmtPct, fmtPrice, fmtTime } from "@/lib/format";
import { transitionIntent } from "./actions";
import { DeskLive } from "@/components/DeskLive";
import { FeaturePanel } from "./featured/FeaturePanel";
import { TodayPanel } from "./today/TodayPanel";
import { todayTiles } from "./today/today";
import { LineIdentity } from "@/components/LineIdentity";
import { summarize } from "@/lib/domain/summary";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desk" };

const FIRM = (i: Intent) => i.type === "ferme" || i.type === "cession";
const OPEN_STATES: Intent["state"][] = ["recue", "confirmee", "transmise"];

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ etat?: string; q?: string; ligne?: string; tri?: string; filtre?: string; depuis?: string; point?: string; bq?: string; genre?: string; btri?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const [offers, intents, events, notifications, approvals] = await Promise.all([r.listOffers(), r.listIntents(), r.listEvents(30), r.listNotifications(20), r.listApprovals(true)]);
  const now = new Date();
  const byId = new Map(offers.map((o) => [o.id, o]));

  // Book: open offers, grouped by their deadline (an auction = one deadline per issuer).
  const noPrice = (o: (typeof offers)[number]) => o.pricePct == null && o.precountRate == null;
  const live = offers.filter((o) => isActionable(displayStatus(o, now)) && o.kind !== "ACTIONS" && o.kind !== "MARCHE");
  const rows = live.map((o) => {
    const its = intents.filter((i) => i.offerId === o.id && OPEN_STATES.includes(i.state));
    const firm = its.filter(FIRM);
    const soft = its.filter((i) => i.type === "appetit");
    const toFcfa = (i: Intent) => (i.amount ?? 0) * (o.kind === "RACHAT" ? o.nominal : 1);
    return { o, nF: firm.length, sF: firm.reduce((s, i) => s + toFcfa(i), 0), nA: soft.length, sA: soft.reduce((s, i) => s + toFcfa(i), 0) };
  });

  // Le carnet se cherche et se trie, mais les quatre chiffres du haut, eux,
  // restent ceux du carnet entier : un filtre est une façon de regarder, pas
  // une façon de diminuer ce qui est engagé.
  type BookRow = (typeof rows)[number];
  const chip = (v: string) => rows.filter((x) => (v === "sans-prix" ? noPrice(x.o) : v === "fermes" ? x.nF > 0 : v === "sans-suite" ? x.nF + x.nA === 0 : true));
  const kinds = [...new Set(live.map((o) => o.kind))].map((k) => ({ value: k, label: t(KIND_LABEL[k] ?? k) })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const bsort = (sp.btri ?? "cloture").replace(/-$/, "");
  const brev = (sp.btri ?? "").endsWith("-");
  const CMP: Record<string, (a: BookRow, b: BookRow) => number> = {
    cloture: (a, b) => parseDate(a.o.deadlineAt).getTime() - parseDate(b.o.deadlineAt).getTime(),
    ligne: (a, b) => a.o.title.localeCompare(b.o.title, "fr"),
    fermes: (a, b) => b.sF - a.sF || b.nF - a.nF,
    appetits: (a, b) => b.sA - a.sA || b.nA - a.nA,
    rendement: (a, b) => (headlineYield(b.o) ?? -Infinity) - (headlineYield(a.o) ?? -Infinity),
  };
  const book = chip(sp.filtre ?? "")
    .filter((x) => !sp.genre || x.o.kind === sp.genre)
    .filter((x) => textMatch(sp.bq, x.o.title, x.o.issuer, x.o.isin, t(KIND_LABEL[x.o.kind] ?? x.o.kind), x.o.sizeLabel))
    .sort((a, b) => (CMP[bsort] ?? CMP.cloture)(a, b) * (brev ? -1 : 1));
  // Trier depuis la colonne plutôt que depuis une boîte à part : l'en-tête
  // est déjà le nom de ce qu'on veut trier. Un second clic inverse.
  const bookHref = (tri: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    q.set("btri", tri);
    return `/desk?${q}#offres`;
  };
  // Une fonction, pas un composant : un composant déclaré dans le rendu
  // reperdrait son état à chaque passage, et le compilateur le refuse.
  const sortTh = (k: string, label: string, right?: boolean) => {
    const on = bsort === k;
    return (
      <th className={right ? "r" : undefined} aria-sort={on ? (brev ? "ascending" : "descending") : "none"}>
        <Link href={bookHref(on && !brev ? `${k}-` : k)} className={`${styles.sortTh} ${on ? styles.sortOn : ""}`} title={on ? t("Inverser l'ordre") : t("Trier par cette colonne")}>
          {label}
          <i aria-hidden="true">{on ? (brev ? "▲" : "▼") : "↕"}</i>
        </Link>
      </th>
    );
  };
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
  const featRow = (o: Offer) => ({ id: o.id, title: o.title, hero: summarize(o, now, { fine: true }).hero, deadline: o.kind === "MARCHE" || o.kind === "FONDS" ? undefined : o.deadlineAt.slice(0, 10), featured: o.featured });
  const featActive = offers.filter((o) => o.featured && o.featured.until >= today).map((o) => ({ ...featRow(o), closed: !isActionable(displayStatus(o, now)) }));
  const featCandidates = offers.filter((o) => !o.hidden && !(o.featured && o.featured.until >= today) && isActionable(displayStatus(o, now))).map(featRow);

  const today_ = await todayTiles(t, now, offers);

  const notifStatus: Record<string, [string, string]> = { sent: ["confirmee", "Envoyé"], skipped: ["recue", "Préparé"], failed: ["annulee", "Échec"], queued: ["info", "En file"] };

  return (
    <>
      <DeskLive supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL} anonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY} />
      <DeskNav current="/desk" badges={{ "/desk/approbations": approvals.length }} />
      {sp.depuis === "sante" && <FromSante point={sp.point ?? ""} count={sp.filtre === "sans-prix" ? String(book.length) : undefined} />}

      {/* Le carnet et son sommaire. Le rail est le même objet que sur les pages
          publiques : le desk se parcourt aussi, et il n’avait rien pour cela. */}
      <div className={styles.withRail}>
        <PageOutline
          label={t("Le carnet")}
          sections={[
            { id: "aujourdhui", title: t("Aujourd'hui") },
            { id: "une", title: t("À la une") },
            { id: "intentions", title: t("Intentions reçues") },
            { id: "offres", title: t("Carnet d'appétits") },
            { id: "diffusion", title: t("Diffusion") },
            { id: "flux", title: t("Flux en direct") },
          ]}
        />
        <div className={styles.rail}>
        <div id="aujourdhui" />
        <TodayPanel tiles={today_.tiles} bulletin={today_.bulletin} today={today_.today} />

        <div id="une" />
        <FeaturePanel active={featActive} candidates={featCandidates} />

        <div className={styles.kpis} data-coach="kpis">
          <div className={`${styles.kpi} ${styles.hot}`}>
            <span>{t("Prochaine clôture dans")}</span>
            <b className="num">{nextDeadline ? countdown(nextDeadline, now) : "—"}</b>
            <small>{nextDeadline ? fmtDateTime(nextDeadline) : "aucune offre ouverte"}</small>
          </div>
          <div className={styles.kpi}>
            <span>{t("Prises fermes")}</span>
            <b className="num">{fmtMillions(totalF)}</b>
            <small>{t("{n} ordres à confirmer ou transmettre", { n: rows.reduce((s, x) => s + x.nF, 0) })}</small>
          </div>
          <div className={styles.kpi}>
            <span>{t("Appétits à convertir")}</span>
            <b className="num">{fmtMillions(totalA)}</b>
            <small>{t("{n} clients à rappeler", { n: rows.reduce((s, x) => s + x.nA, 0) })}</small>
          </div>
          <div className={styles.kpi}>
            <span>{t("Intentions non traitées")}</span>
            <b className="num">{todo}</b>
            <small>{t(`sur ${intents.length} reçues`)}</small>
          </div>
        </div>




        <div className="panel" id="intentions" data-coach="intents">
          <div className="panel-h">
            <h2>{t("Intentions reçues")}</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("{n} au total · {m} à traiter", { n: intents.length, m: todo })}{shown.length !== intents.length ? ` · ${t(shown.length > 1 ? "{k} affichées" : "{k} affichée", { k: shown.length })}` : ""}
            </span>
          </div>
          <Suspense>
            <Toolbar
              inset
              placeholder={t("Réf., client, ligne, téléphone…")}
              chipKey="etat"
              chips={[
                { value: "", label: t("Toutes"), count: intents.length },
                { value: "recue", label: t("À traiter"), count: counts.recue },
                { value: "confirmee", label: t("Confirmées"), count: counts.confirmee },
                { value: "transmise", label: t("Transmises"), count: counts.transmise },
                { value: "finie", label: t("Servies · réglées"), count: counts.finie },
                { value: "annulee", label: t("Annulées"), count: counts.annulee },
              ]}
              selects={[{ key: "ligne", label: t("Ligne"), all: t("toutes les lignes"), options: lines }]}
              sort={{ key: "tri", label: t("Tri"), options: [{ value: "recent", label: t("plus récent") }, { value: "ancien", label: t("plus ancien") }, { value: "montant", label: t("montant") }, { value: "client", label: t("client") }] }}
            />
          </Suspense>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Réf.")}</th>
                  <th>{t("Client")}</th>
                  <th>{t("Ligne")}</th>
                  <th>{t("Type")}</th>
                  <th className="r">{t("Montant")}</th>
                  <th>{t("Canal")}</th>
                  <th>{t("Reçue")}</th>
                  <th>{t("État")}</th>
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
                        <span className={`st ${i.type}`}>{t(INTENT_LABEL[i.type])}</span>
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
                        <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                      </td>
                      <td>
                        <div className={styles.rowbtns}>
                          <Link className="btn sm" href={`/desk/intentions/${i.id}`}>
                            {t("Ouvrir")}
                          </Link>
                          {(i.type === "achat" || i.type === "vente" || i.type === "souscription" || i.type === "rachat") && i.state === "transmise" ? (
                            <Link className="btn sm primary" href="/desk/marche">
                              {t("Exécuter (Marché)")}
                            </Link>
                          ) : null}
                          {next
                            .filter((s) => s !== "annulee" && !((i.type === "achat" || i.type === "vente" || i.type === "souscription" || i.type === "rachat") && i.state === "transmise"))
                            .map((s) => (
                              <form key={s} action={transitionIntent}>
                                <input type="hidden" name="intentId" value={i.id} />
                                <input type="hidden" name="state" value={s} />
                                <button className={`btn sm ${s === "transmise" ? "primary" : ""}`} type="submit">
                                  {t(STATE_ACTION_LABEL[s] ?? "")}
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
                      {t("Aucune intention ne correspond à ces filtres.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" id="offres">
          <div className="panel-h">
            <h2>{t("Carnet d'appétits : offres ouvertes")}</h2>
            <span className="muted right" style={{ fontSize: ".8rem" }}>
              {book.length === rows.length ? t("prises fermes en navy, appétits en or") : t("{k} sur {n} · prises fermes en navy, appétits en or", { k: book.length, n: rows.length })}
            </span>
          </div>
          <Suspense>
            <Toolbar
              inset
              searchKey="bq"
              placeholder={t("Ligne, émetteur, ISIN…")}
              chipKey="filtre"
              chips={[
                { value: "", label: t("Toutes"), count: rows.length },
                { value: "fermes", label: t("Avec prises fermes"), count: chip("fermes").length },
                { value: "sans-suite", label: t("Sans intention"), count: chip("sans-suite").length },
                { value: "sans-prix", label: t("Sans prix"), count: chip("sans-prix").length },
              ]}
              selects={[{ key: "genre", label: t("Type"), all: t("tous les types"), options: kinds }]}
            />
          </Suspense>
          {/* Vingt lignes à la fois : au-delà, la boîte défile sous son en-tête,
              et « Tout afficher » rend au tableau sa hauteur entière. */}
          <TallTable total={book.length}>
            <table className="tbl">
              <thead>
                <tr>
                  {sortTh("ligne", t("Ligne"))}
                  <th>{t("Prix Purpose")}</th>
                  {sortTh("fermes", t("Prises fermes"), true)}
                  {sortTh("appetits", t("Appétits"), true)}
                  <th>{t("Volume")}</th>
                  {sortTh("rendement", t("Rendement publié"), true)}
                  {sortTh("cloture", t("Clôture"), true)}
                </tr>
              </thead>
              <tbody>
                {book.map(({ o, nF, sF, nA, sA }) => (
                  <tr key={o.id}>
                    <td>
                      <LineIdentity o={o} s={summarize(o, now, { fine: true })} href={`/desk/lignes/${o.id}`} />
                    </td>
                    <td className="num">
                      {noPrice(o) ? (
                        <Link className={styles.noPrice} href={`/desk/lignes/${o.id}`}>
                          {t("sans prix : renseigner")}
                        </Link>
                      ) : (
                        <>
                          {o.kind === "BTA" ? fmtPct(o.precountRate ?? 0, 2) : fmtPrice(o.pricePct ?? 100)}
                          {o.priceNote || o.rateNote ? <span className="muted"> (indic.)</span> : null}
                        </>
                      )}
                    </td>
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
                {book.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      {rows.length === 0 ? t("Aucune offre ouverte.") : t("Aucune offre ne correspond à cette recherche.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TallTable>
        </div>
        <div className="panel" id="diffusion">
          <div className="panel-h">
            <h2>{t("Diffusion")}</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("Messages sortants (WhatsApp, e-mail) : « préparé » tant que le canal n'est pas configuré")}
            </span>
          </div>
          {/* La hauteur du flux, les colonnes d'un tableau : la diffusion se lit
              du coin de l'œil, mais cinq faits par ligne demandent qu'on dise
              lesquels. L'en-tête reste donc en place pendant que la liste défile
              sous lui, sans quoi il disparaîtrait au premier envoi lu. */}
          <div className={styles.feedTable}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Quand")}</th>
                  <th>{t("Canal")}</th>
                  <th>{t("Destinataire")}</th>
                  <th>{t("Message")}</th>
                  <th>{t("État")}</th>
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
                      {t("Aucun message sortant pour l'instant.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" id="flux" data-coach="feed">
          <div className="panel-h">
            <h2>{t("Flux en direct")}</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("Chaque intention client apparaît ici dès son enregistrement")}
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
        </div>
      </div>
    </>
  );
}
