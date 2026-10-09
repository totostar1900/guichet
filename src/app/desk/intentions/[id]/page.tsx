import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { LineIdentity } from "@/components/LineIdentity";
import { Info } from "@/components/Info";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { orderChecks } from "@/lib/domain/checks";
import { cequiManque } from "@/lib/domain/ouverture";
import { estimate } from "@/lib/domain/estimate";
import { avancement, INTENT_LABEL, INTENT_STATE_LABEL, nextStates, STATE_ACTION_LABEL, STATE_EFFECT, STATE_FINAL, STATE_PASSAGE } from "@/lib/domain/intent";
import { summarize } from "@/lib/domain/summary";
import type { Intent, IntentState } from "@/lib/domain/types";
import { fmt, fmtDateTime, fmtMillions } from "@/lib/format";
import { missingForApproval, RISK_LABEL, STATUS_LABEL } from "@/lib/kyc/checklist";
import { positionsFrom } from "@/lib/positions";
import { transitionIntent } from "../../actions";
import { COMPANY } from "@/lib/config";
import styles from "./page.module.css";
import { getLang, getT } from "@/i18n/server";
import { ProfileCard } from "@/components/desk/ProfileCard";
import { ReachLine } from "@/components/desk/ReachLine";
import { CancelOrder } from "./CancelOrder";
import { preparedMessages } from "@/lib/documents/messages";
import { Compose } from "./Compose";
import { Cash } from "./Cash";
import { clientCash } from "./cash-actions";
import { Messages } from "./Messages";
import { CounterOffer } from "./CounterOffer";
import { counterTerms, counterLapsed, defaultUntil, untilText } from "@/lib/domain/counter";
import { reasonForDesk } from "@/lib/domain/cancel-reasons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intention" };

const TRACK: IntentState[] = ["recue", "confirmee", "transmise", "servie", "reglee"];
const MARKET_TYPES = new Set(["achat", "vente", "souscription", "rachat"]);

/**
 * One intention, opened: the order as the client sent it, the line as they saw
 * it, the consistency checks, the client's file, history, positions and
 * messages : and the decision, without leaving the screen.
 */
export default async function IntentionPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  await loadRegistry();
  const { id } = await params;
  const r = repo();
  const [intents, offers, contacts, notifications, events] = await Promise.all([r.listIntents(), r.listOffers(), r.listContacts(), r.listNotifications(500), r.listEvents(500)]);
  const it = intents.find((x) => x.id === id);
  if (!it) notFound();
  const o = offers.find((x) => x.id === it.offerId);
  if (!o) notFound();
  const now = new Date();
  const s = summarize(o, now, { fine: true });
  const contact = (it.clientId && contacts.find((c) => c.id === it.clientId)) || contacts.find((c) => (it.contactPhone && c.phone === it.contactPhone) || (it.contactEmail && c.email === it.contactEmail));
  const file = it.clientId ? await r.getClientFileByUser(it.clientId) : undefined;
  const [lang, fin, prefs, channels] = await Promise.all([
    getLang(),
    it.clientId ? r.getFinancialProfile(it.clientId).catch(() => undefined) : undefined,
    it.clientId ? r.getPrefs(it.clientId).catch(() => undefined) : undefined,
    it.clientId ? r.getChannelStatus(it.clientId).catch(() => undefined) : undefined,
  ]);
  const sameClient = (x: Intent) => (it.clientId && x.clientId === it.clientId) || (it.contactPhone && x.contactPhone === it.contactPhone) || (it.contactEmail && x.contactEmail === it.contactEmail);
  const history = intents.filter((x) => x.id !== it.id && sameClient(x)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const positions = it.clientId ? positionsFrom(intents.filter((x) => x.clientId === it.clientId), offers, now) : [];
  const held = positions.filter((p) => p.offer.isin === o.isin).reduce((sum, p) => sum + p.units, 0);
  const valued = positions.reduce((sum, p) => sum + (p.marketValue ?? p.nominalAmount), 0);
  const nextFlow = positions.map((p) => p.nextFlow).filter(Boolean).sort((a, b) => a!.date.localeCompare(b!.date))[0];
  const checks = orderChecks(o, it.type, it.amount, it.limitPrice, { held: it.type === "vente" || it.type === "rachat" ? held : undefined, needsAccount: Boolean(cequiManque(it.type, file)) });
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
  // Répondre par le canal que le client a demandé : l’intention le porte depuis
  // toujours, et l’écran ne proposait que WhatsApp. Certains clients ne lisent
  // que leur courrier.
  const mailTo = contact?.email ?? it.contactEmail;
  const cash = await clientCash(it.clientId);
  const prepared = await preparedMessages(it.state, { client: it.clientName, ref: it.ref, ligne: o.title, montant: amountText, echeance: o.deadlineAt ? fmtDateTime(o.deadlineAt) : undefined, conseiller: (await getSession())?.name ?? COMPANY.name, societe: COMPANY.name }, await getLang());
  const asked = it.channel === "E-mail" ? "mail" : it.channel === "WhatsApp" ? "wa" : "tel";
  // Le desk traite une file, pas une fiche : la même liste que le carnet, dans
  // l'ordre d'arrivée, pour passer à la suivante sans repasser par la liste.
  const pile = intents.filter((x) => nextStates(x.state, x.type).length > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const rang = pile.findIndex((x) => x.id === it.id);
  const precedente = rang > 0 ? pile[rang - 1] : undefined;
  const suivante = rang >= 0 && rang < pile.length - 1 ? pile[rang + 1] : undefined;
  // Un ordre n'a jamais huit gestes possibles à la fois : il en a un qui le fait
  // avancer, et deux issues qui le détournent. Le bloc dit lequel.
  const avance = marketExec ? [] : avancement(next);
  // Ce que l'argent donne, à côté du montant demandé : décaissement pour un achat,
  // produit pour une cession. Ni le signe de l'estimation ni le genre de la ligne
  // ne disent le sens : le type de l'intention, lui, le dit.
  const sort = it.type === "vente" || it.type === "rachat" || it.type === "cession";
  const espece = est?.ok && est.outlay != null ? Math.abs(est.outlay) : undefined;

  return (
    <>
      <DeskNav current="/desk" />
      <div className={styles.crumbs}>
        <Link href="/desk">{t("← Carnet du jour")}</Link>
        <span>
          {it.ref}
          {it.registerNo && it.registerNo !== it.ref ? <span className="muted" title={t("Journal des ordres : jamais porté sur ce que reçoit le client")}> · {it.registerNo}</span> : null} · {t("reçue le {d} · {c}", { d: fmtDateTime(it.createdAt), c: it.channel })}
        </span>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* La file, pas la fiche : où l'on en est, et la suivante sans repasser par la liste. */}
          {rang >= 0 && pile.length > 1 && (
            <div className={styles.pile}>
              <span>{t("{n} sur {total} à traiter", { n: String(rang + 1), total: String(pile.length) })}</span>
              <div className={styles.pileTrack} aria-hidden="true">
                {pile.map((x, i) => (
                  <i key={x.id} className={i === rang ? styles.pileHere : i < rang ? styles.pileDone : undefined} />
                ))}
              </div>
              {precedente ? (
                <Link className="btn ghost" href={`/desk/intentions/${precedente.id}`}>
                  {t("← Précédente")}
                </Link>
              ) : (
                <span className={styles.pileOff}>{t("← Précédente")}</span>
              )}
              {suivante ? (
                <Link className="btn ghost" href={`/desk/intentions/${suivante.id}`}>
                  {t("Suivante →")}
                </Link>
              ) : (
                <span className={styles.pileOff}>{t("Suivante →")}</span>
              )}
            </div>
          )}

          <div className="panel">
            <div className="panel-h">
              <h2>
                {t(INTENT_LABEL[it.type])} · {amountText}
              </h2>
              <span className={`st ${it.state}`}>{t(INTENT_STATE_LABEL[it.state])}</span>
              {/* un ordre clos porte son motif la ou son etat se lit */}
              {it.state === "annulee" && it.closedReason && <span className="muted" style={{ fontSize: ".8rem" }}>{t(reasonForDesk(it.closedReason))}</span>}
              {/* En attente de réponse : ce qui a été proposé, et jusqu’à quand */}
              {it.state === "contre_proposee" && it.counter && (
                <span className="muted" style={{ fontSize: ".8rem" }}>
                  {counterTerms(it.counter, it, o)} · {t(counterLapsed(it.counter, now) ? "caduque depuis le {d}" : "jusqu’au {d}", { d: untilText(it.counter) })}
                </span>
              )}
            </div>
            {/* La demande du client, en premier et en grand : le montant et le prix
                étaient l'un dans un titre, l'autre au fond d'une liste de définitions. */}
            <div className={styles.demande}>
              <div className={styles.fort}>
                <span>{t("Montant demandé")}</span>
                <b>{amountText}</b>
              </div>
              <div className={styles.fort}>
                <span>{t(it.limitPrice != null ? "Prix limite du client" : "Prix")}</span>
                <b>{it.limitPrice != null ? (o.instrument === "obligation" ? `${it.limitPrice} %` : `${fmt(it.limitPrice)} FCFA`) : t("au prix publié")}</b>
              </div>
              <div className={styles.fort}>
                <span>{t(sort ? "Produit estimé" : "Décaissement estimé")}</span>
                <b>{espece != null ? `${fmt(espece)} FCFA` : "—"}</b>
              </div>
              <div className={styles.fort}>
                <span>{t("Clôture")}</span>
                <b>{o.deadlineAt ? fmtDateTime(o.deadlineAt) : s.deadline || "—"}</b>
              </div>
            </div>
            <div className={styles.line}>
              <LineIdentity o={o} s={s} href={`/desk/lignes/${o.id}`} size="lg" />
              <div className={styles.lineFacts}>
                <div>
                  <span>{t(s.gold ? "Rendement" : "Repère")}</span>
                  <b className={s.gold ? styles.gold : undefined}>{s.hero}</b>
                  <small>{t(s.heroSub)}</small>
                </div>
                <div>
                  <span>{t("Statut")}</span>
                  <b>{s.countdown ? `${t("Clôture")} ${t(s.countdown)}` : t(s.status)}</b>
                  <small>{s.deadline}</small>
                </div>
                <div>
                  <span>{t("Ticket minimum")}</span>
                  <b>{s.minimum}</b>
                  <small>{s.minimumSub}</small>
                </div>
              </div>
            </div>
            <dl className={styles.dl}>
              {est && !checks.some((c) => c.level === "ok") && (
                <>
                  <dt>{t("Au prix publié")}</dt>
                  <dd>{t(est.text)}</dd>
                </>
              )}
              <dt>{t("Contrôles")}</dt>
              <dd>
                <ul className={styles.checks}>
                  {checks.map((c) => (
                    <li key={c.key} className={c.level === "block" ? styles.block : c.level === "warn" ? styles.warn : styles.ok}>
                      {t(c.text)} <Info text={t(c.why)} label={t("Règle")} subtle />
                    </li>
                  ))}
                  {file && file.status !== "approuve" && <li className={styles.warn}>{t(`Dossier client ${STATUS_LABEL[file.status].toLowerCase()} : à approuver avant le règlement.`)}</li>}
                  {!file && <li className={styles.warn}>{t("Aucun dossier client : ouvrir le compte avant le règlement.")}</li>}
                  {checks.length === 0 && file?.status === "approuve" && <li className={styles.ok}>{t("Rien à signaler.")}</li>}
                </ul>
              </dd>
              {it.message && (
                <>
                  <dt>{t("Message du client")}</dt>
                  <dd>« {it.message} »</dd>
                </>
              )}
              <dt>{t("Contact pour cet ordre")}</dt>
              <dd>
                {[it.contactPhone, it.contactEmail].filter(Boolean).join(" · ") || "—"}
                {it.profileFlag && (
                  <small style={{ display: "block", color: "var(--warn-ink, #9a5b00)", fontWeight: 700 }}>
                    {t("Hors profil, confirmé par le client :")} {it.profileFlag}
                  </small>
                )}
                {(it.phoneVerified || it.emailVerified) && (
                  <small className="muted" style={{ display: "block" }}>
                    {t(it.phoneVerified && it.emailVerified ? "WhatsApp et e-mail prouvés par code à l'envoi." : it.phoneVerified ? "WhatsApp prouvé par code ; e-mail non prouvé." : "E-mail prouvé ; WhatsApp non prouvé.")}
                  </small>
                )}
              </dd>
              {(it.allocationPct != null || it.servedUnits != null || it.executedPrice != null) && (
                <>
                  <dt>{t("Résultat")}</dt>
                  <dd>
                    {it.allocationPct != null ? `servi à ${it.allocationPct} %` : ""}
                    {it.servedUnits != null ? ` · ${fmt(it.servedUnits)} unités` : ""}
                    {it.executedPrice != null ? ` · exécuté à ${fmt(it.executedPrice)}` : ""}
                  </dd>
                </>
              )}
              <dt>{t("Étape")}</dt>
              <dd>
                <div className={styles.track} aria-label={`Étape ${Math.max(step, 0) + 1} sur ${TRACK.length}`}>
                  {TRACK.map((st, i) => (
                    <i key={st} className={i <= step ? styles.done : undefined} title={t(INTENT_STATE_LABEL[st])} />
                  ))}
                </div>
                <small className="muted">{TRACK.map((st) => t(INTENT_STATE_LABEL[st]).toLowerCase()).join(" → ")}</small>
              </dd>
            </dl>
          </div>

          {/* Trois natures, trois étages. Le bloc mettait sur une seule rangée les
              passages d'état, l'exécution marché, la contre-proposition, la clôture,
              un lien de consultation, la messagerie et le bouton d'appel : de la
              navigation et un message à côté d'un acte irréversible. Consulter n'est
              pas décider, et parler n'est pas décider non plus. */}
          <div className="panel">
            <div className="panel-h">
              <h2>{t("Décision")}</h2>
            </div>

            {marketExec && (
              <div className={styles.passage}>
                <span className={styles.passageEtat}>{t("Le passage")}</span>
                <b>{t("Exécuter sur le marché")}</b>
                <span className={styles.passageQuoi}>{t("L’ordre est au carnet : son exécution se fait à la cote, puis le résultat revient ici pour être porté.")}</span>
                <span className={styles.passageGeste}>
                  <Link className="btn primary" href="/desk/marche">
                    {t("Ouvrir le marché")}
                  </Link>
                </span>
              </div>
            )}

            {avance.map((st) => (
              <div key={st} className={styles.passage}>
                <span className={styles.passageEtat}>
                  {t("Le passage")}
                  <em>
                    {t(INTENT_STATE_LABEL[it.state]).toLowerCase()} → {t(INTENT_STATE_LABEL[st]).toLowerCase()}
                  </em>
                </span>
                <b>{st === "confirmee" && it.signedAt ? t("Le client a signé : il ne manque que votre go.") : t(STATE_PASSAGE[st] ?? STATE_ACTION_LABEL[st] ?? INTENT_STATE_LABEL[st])}</b>
                {STATE_EFFECT[st] && <span className={styles.passageQuoi}>{t(STATE_EFFECT[st]!)}</span>}
                <span className={styles.passageGeste}>
                  <form action={transitionIntent}>
                    <input type="hidden" name="intentId" value={it.id} />
                    <input type="hidden" name="state" value={st} />
                    <button className="btn primary" type="submit">
                      {/* UN ORDRE SIGNE N ATTEND PLUS QU UN GESTE, et le bouton le dit :
                          « Confirmer » appelait une suite, « Donner le go » la clot. */}
                      {st === "confirmee" && it.signedAt ? t("Donner le go") : t(STATE_ACTION_LABEL[st] ?? INTENT_STATE_LABEL[st])}
                    </button>
                  </form>
                  {STATE_FINAL.has(st) && <small className={styles.ferme}>{t("Ce passage ne se reprend pas.")}</small>}
                </span>
              </div>
            ))}

            {avance.length === 0 && !marketExec && (
              <div className={styles.passage}>
                <span className={styles.passageEtat}>{t("Le passage")}</span>
                <b>{t(next.length === 0 ? "Aucun : cet ordre est arrivé au bout de son chemin." : "Aucun tant que le client n’a pas répondu.")}</b>
              </div>
            )}

            {/* Ce qui s'ouvre s'ouvre dans le flux et pousse la page : aucune liste ne
                flotte par-dessus l'écran, donc aucune ne peut passer derrière. */}
            {(next.includes("contre_proposee") || next.includes("annulee") || next.includes("recue")) && !marketExec && (
              <div className={styles.issues}>
                <span className={styles.etage}>{t("Une autre issue")}</span>
                <div className={styles.issuesGestes}>
                  {next.includes("recue") && (
                    <form action={transitionIntent}>
                      <input type="hidden" name="intentId" value={it.id} />
                      <input type="hidden" name="state" value="recue" />
                      <button className="btn" type="submit">
                        {t(STATE_ACTION_LABEL.recue!)}
                      </button>
                    </form>
                  )}
                  {/* Proposer d’autres conditions : un formulaire, pas un bouton. L’ordre ne bouge
                      qu’au oui du client, et l’écran montre la phrase qu’il recevra. */}
                  {next.includes("contre_proposee") && <CounterOffer intent={it} offer={o} defaultUntil={defaultUntil(o, now)} now={now.toISOString()} />}
                  {/* Clore sans suite a sa propre forme : un motif, une relecture, la phrase que le client lira. */}
                  {next.includes("annulee") && <CancelOrder intentId={it.id} ref_={it.ref} clientName={it.clientName} offerTitle={o.title} />}
                </div>
              </div>
            )}

            {/* Parler n'est pas décider : le même étage accompagne les deux précédents. */}
            <div className={styles.parler}>
              <span className={styles.etage}>{t("Parler au client")}</span>
              <div className={styles.issuesGestes}>
                {/* le canal demandé passe devant et porte la mention : c’est là que le client attend */}
                <Compose intentId={it.id} messages={prepared} phone={it.contactPhone} email={mailTo} subject={`${o.title} · votre ordre ${it.ref}`} asked={asked} />
                {asked === "tel" && it.contactPhone && (
                  <a className="btn" href={`tel:${it.contactPhone.replace(/[^\d+]/g, "")}`}>
                    {t("Appeler")} <em className={styles.asked}> · {t("demandé")}</em>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Les espèces du client : ce que la maison lui doit, et à quoi c’est destiné. */}
          {cash && (
            <div className="panel">
              <Cash intentId={it.id} ref_={it.ref} position={cash} />
            </div>
          )}

          <div className="panel">
            <Messages messages={messages} />
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
            <ReachLine prefs={prefs} channels={channels} t={t} />
          </div>

          <h4>{t("Profil financier")}</h4>
          <ProfileCard profile={fin} lang={lang} t={t} amount={est?.outlay ?? (o.kind === "FONDS" && it.type !== "rachat" ? (it.amount ?? undefined) : undefined)} />

          <h4>{t("Dossier client")}</h4>
          {file ? (
            <dl className={styles.kv}>
              <dt>{t("Statut")}</dt>
              <dd>
                <span className={`st ${file.status === "approuve" ? "confirmee" : file.status === "refuse" ? "annulee" : "recue"}`}>{t(STATUS_LABEL[file.status])}</span>
              </dd>
              <dt>{t("Risque")}</dt>
              <dd>{file.review.risk ? `${t(RISK_LABEL[file.review.risk])}${file.review.nextReviewOn ? ` · ${t("revue")} ${file.review.nextReviewOn.slice(0, 4)}` : ""}` : t("non évalué")}</dd>
              <dt>{t("Compte-titres")}</dt>
              <dd>{file.review.custodianAccount ?? t("à ouvrir")}</dd>
              <dt>{t("Pièces")}</dt>
              <dd>
                {t(file.documents.length > 1 ? "{n} reçues" : "{n} reçue", { n: file.documents.length })}
              </dd>
              <dt>{t("Sanctions / PPE")}</dt>
              <dd>{file.screening?.outcome ? `${t(file.screening.outcome === "aucun" ? "aucune correspondance" : file.screening.outcome === "faux_positif" ? "faux positif écarté" : "correspondance confirmée")}${file.screening.attestedAt ? ` (${fmtDateTime(file.screening.attestedAt)})` : ""}` : t("non attesté")}</dd>
              {missing.length > 0 && (
                <>
                  <dt>{t("Manque")}</dt>
                  <dd className={styles.warnText}>{missing.map((m) => t(m)).join(" · ")}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="muted" style={{ fontSize: ".82rem" }}>
              {t("Pas de dossier : le client n'a pas commencé « Ouvrir un compte ».")}
            </p>
          )}
          <div className={styles.sideBtns}>
            {file && (
              <Link className="btn sm" href={`/desk/clients?file=${file.id}`}>
                {t("Ouvrir le dossier KYC")}
              </Link>
            )}
            {it.clientId && (
              <Link className="btn sm ghost" href={`/desk/resultats?client=${it.clientId}`}>
                {t("Positions et relevés")}
              </Link>
            )}
          </div>

          <h4>{t("Positions")}</h4>
          {positions.length > 0 ? (
            <dl className={styles.kv}>
              <dt>{t("Valorisées")}</dt>
              <dd>{fmtMillions(valued)}</dd>
              <dt>{t("Lignes")}</dt>
              <dd>{positions.length}</dd>
              {held > 0 && (
                <>
                  <dt>{t("Sur cette ligne")}</dt>
                  <dd>{fmt(held)} unité(s)</dd>
                </>
              )}
              {nextFlow && (
                <>
                  <dt>{t("Prochain flux")}</dt>
                  <dd>
                    {fmt(nextFlow.amount)} FCFA le {nextFlow.date}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="muted" style={{ fontSize: ".82rem" }}>
              {t("Aucune position réglée chez nous.")}
            </p>
          )}

          <h4>{t("Historique")}</h4>
          <ul className={styles.hist}>
            {history.slice(0, 12).map((x) => {
              const ox = offers.find((z) => z.id === x.offerId);
              return (
                <li key={x.id}>
                  <span>{fmtDateTime(x.createdAt).split(" ")[0]}</span>
                  <Link href={`/desk/intentions/${x.id}`}>
                    <b>{t(INTENT_STATE_LABEL[x.state])}</b> {INTENT_LABEL[x.type].toLowerCase()} · {ox?.title ?? x.offerId}
                    {x.amount ? ` : ${fmt(x.amount)}` : ""}
                  </Link>
                </li>
              );
            })}
            {history.length === 0 && <li className="muted">{t("Première intention de ce client.")}</li>}
          </ul>
        </aside>
      </div>
    </>
  );
}
