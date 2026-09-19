import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { DOC_LABEL } from "@/lib/documents/registry";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate, fmtDateTime, fmtMillions } from "@/lib/format";
import type { Intent } from "@/lib/domain/types";
import { ContactForm } from "./ContactForm";
import { PushToggle } from "@/components/PushToggle";
import { positionsFrom } from "@/lib/positions";
import { StatementButtons } from "./StatementButtons";
import { LineIdentity } from "@/components/LineIdentity";
import { WatchButton } from "@/components/WatchButton";
import { TrustNudge } from "@/components/TrustNudge";
import { summarize } from "@/lib/domain/summary";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon espace" };

/** What a client can see of their own relationship: intents, states, documents. */
export default async function MyPage() {
  const s = await requireSession("/moi");
  const r = repo();
  const [intents, offers, docs] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  const [myFile, contact, watches] = await Promise.all([r.getClientFileByUser(s.userId), r.getContact(s.userId), r.listWatches(s.userId)]);
  const followed = watches.map((w) => byOffer.get(w.offerId)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const now = new Date();
  const positions = positionsFrom(mine, offers);
  const myDocs = docs.filter((d) => d.type !== "dossier_svt" && ((d.intentId && mine.some((i) => i.id === d.intentId)) || (myFile && d.clientFileId === myFile.id) || d.clientId === s.userId));

  const NEXT: Record<string, string> = {
    recue: "Un conseiller vous rappelle avant la clôture.",
    confirmee: "Signez le bulletin et effectuez le virement indiqué sur l'appel de fonds.",
    transmise: "Ordre transmis au SVT : résultats attendus le jour de l'adjudication.",
    servie: "Servi. Règlement à la date indiquée, puis avis d'opéré.",
    non_servie: "Non servi. Fonds restitués sous deux jours ouvrés.",
    reglee: "Titres inscrits à votre nom. Prochain coupon selon l'échéancier de l'avis d'opéré.",
    annulee: "Annulée.",
  };
  const NEXT_FUND: Record<string, string> = {
    recue: "Un conseiller vous rappelle pour confirmer.",
    confirmee: "Signez le bulletin de souscription et effectuez le virement indiqué sur l'appel de fonds.",
    transmise: "Ordre transmis à la société de gestion : exécution à la prochaine valeur liquidative.",
    servie: "Exécuté à la VL retenue. Inscription des parts au registre, puis avis d'opération.",
    non_servie: "Non exécuté. Fonds restitués sous deux jours ouvrés.",
    reglee: "Parts inscrites à votre nom au registre du dépositaire ; valeur suivant la VL publiée.",
    annulee: "Annulée.",
  };

  // The five stops every order goes through; a card shows where each intention stands.
  const STOPS: Intent["state"][] = ["recue", "confirmee", "transmise", "servie", "reglee"];
  const stopIndex = (st: Intent["state"]) => (st === "non_servie" ? 3 : st === "annulee" ? -1 : STOPS.indexOf(st));
  const open = mine.filter((i) => i.state === "recue" || i.state === "confirmee" || i.state === "transmise").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const closed = mine.filter((i) => !open.includes(i)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const valued = positions.reduce((t, p) => t + (p.marketValue ?? p.nominalAmount ?? 0), 0);
  const nextFlow = positions.map((p) => p.nextFlow).filter((x): x is NonNullable<typeof x> => Boolean(x)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const amountText = (i: Intent, kind?: string) => (i.amount ? (i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : `${fmt(i.amount)} ${kind === "RACHAT" ? "titres" : "FCFA"}`) : "");

  const t = await getT();
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Mon espace")}</div>
          <h1 className="display">{s.name}</h1>
          <div className="muted" style={{ fontSize: ".85rem" }}>
            {t(s.segment)} · {t("niveau")} {s.tier} {t(s.tier < 2 ? "compte-titres à ouvrir pour les prises fermes" : "compte-titres actif")}
          </div>
        </div>
        {s.tier < 2 && (
          <Link href="/ouvrir-un-compte" className="btn primary">
            {t(s.kycStatus ? "Mon dossier d'ouverture" : "Ouvrir mon compte")}
          </Link>
        )}
        <Link href="/moi/securite" className="btn">
          {t("Sécurité")}
        </Link>
        <Link href="/" className="btn">
          {t("Voir les offres")}
        </Link>
      </div>
      <TrustNudge />

      <div className={styles.kpis}>
        <div>
          <span>{t("Positions valorisées")}</span>
          <b>{positions.length ? fmtMillions(valued) : "—"}</b>
          <small>{positions.length ? `${positions.length} ${t(positions.length > 1 ? "lignes à votre nom" : "ligne à votre nom")}` : t("aucun titre inscrit encore")}</small>
        </div>
        <div>
          <span>{t("Prochain flux")}</span>
          <b>{nextFlow ? fmtDate(nextFlow.date, false) : "—"}</b>
          <small>{nextFlow ? `${fmt(nextFlow.amount)} FCFA · ${t(nextFlow.label)}` : t("coupons et remboursements à venir")}</small>
        </div>
        <div>
          <span>{t("En cours")}</span>
          <b>{open.length}</b>
          <small>{open.length ? t(open.length > 1 ? "intentions suivies par le desk" : "intention suivie par le desk") : t("aucune intention en cours")}</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Intentions en cours")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>{t("reçue → confirmée → transmise → servie → réglée")}</span>
        </div>
        {open.length === 0 && <div className="empty">{t("Aucune intention en cours : choisissez une ligne dans le Guichet.")}</div>}
        {open.length > 0 && (
          <div className={styles.cards}>
            {open.map((i) => {
              const o = byOffer.get(i.offerId);
              const k = stopIndex(i.state);
              return (
                <div key={i.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <b>{o ? <Link href={`/offres/${o.id}`}>{o.title}</Link> : i.offerId}</b>
                      <small>
                        {t(INTENT_LABEL[i.type])}
                        {i.amount ? ` · ${amountText(i, o?.kind)}` : ""} · {t("réf.")} {i.ref}
                      </small>
                    </div>
                    <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                  </div>
                  <div className={styles.next}>{t((o?.kind === "FONDS" ? NEXT_FUND : NEXT)[i.state])}</div>
                  <div className={styles.track} aria-label={t("Étape {n} sur 5", { n: k + 1 })}>
                    {STOPS.map((st, n) => (
                      <i key={st} className={n <= k ? styles.done : undefined} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Mes coordonnées")}</h2>
          {(!contact?.phone || !contact?.email) && <span className="pill closing">{t("à compléter")}</span>}
        </div>
        <ContactForm phone={contact?.phone ?? s.phone} email={contact?.email ?? s.email} />
        <div className={styles.push}>
          <b>{t("Alertes sur cet appareil")}</b>
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Lignes suivies")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>{t(followed.length ? "Un message à chaque changement de cours, de prix ou de statut." : "Sur chaque fiche, « Suivre » vous prévient des changements de cours, de prix ou de statut.")}</span>
        </div>
        {followed.length > 0 && (
          <div className={styles.watchList}>
            {followed.map((o) => {
              const sm = summarize(o, now);
              return (
                <div key={o.id} className={styles.watchRow}>
                  <LineIdentity o={o} s={sm} href={`/offres/${o.id}`} />
                  <div className={styles.watchHero}>
                    <b className={sm.gold ? styles.gold : undefined}>{sm.hero}</b>
                    <small>{t(sm.heroUnit ?? sm.heroSub)}</small>
                  </div>
                  <span className={`pill ${sm.statusClass}`}>{t(sm.status)}</span>
                  <WatchButton offerId={o.id} initial signedIn />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {positions.length > 0 && (
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Mes positions")}</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("titres inscrits à votre nom · flux à venir")}
            </span>
            <div className="right">
              <StatementButtons />
            </div>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Ligne")}</th>
                  <th className="r">{t("Quantité")}</th>
                  <th className="r">{t("Nominal · valeur")}</th>
                  <th>{t("Prochain flux")}</th>
                  <th>{t("Échéance")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.intent.id}>
                    <td>
                      <Link href={`/offres/${p.offer.id}`}>{p.offer.title}</Link>
                      <br />
                      <span className="mono muted">{p.offer.isin}</span>
                    </td>
                    <td className="r num">
                      {p.unitWord === "parts" ? p.units.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(p.units)} {t(p.unitWord)}
                    </td>
                    <td className="r num">
                      {p.offer.kind === "FONDS" ? "" : `${fmt(p.nominalAmount)} FCFA`}
                      {p.marketValue != null && (
                        <>
                          {p.offer.kind === "FONDS" ? "" : <br />}
                          <span className={p.offer.kind === "FONDS" ? "" : "muted"}>
                            {fmt(p.marketValue)} FCFA{p.valuedOn ? ` ${t(p.offer.kind === "FONDS" ? "à la VL du" : "au cours du")} ${fmtDate(p.valuedOn, false)}` : ""}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{p.nextFlow ? `${fmtDate(p.nextFlow.date)} · ${fmt(p.nextFlow.amount)} FCFA · ${t(p.nextFlow.label)}` : "—"}</td>
                    <td>{p.maturityOn ? fmtDate(p.maturityOn) : "—"}</td>
                    <td className="r">
                      {p.exit && (
                        <Link className="btn sm" href={`/offres/${p.exit.offerId}?intent=${p.exit.intent}&qty=${p.units}`}>
                          {t(p.exit.intent === "rachat" ? "Racheter" : "Vendre")}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <details className={`panel ${styles.history}`}>
        <summary className="panel-h">
          <h2>{t("Historique")} ({closed.length})</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>{t("intentions servies, réglées, non servies ou annulées")}</span>
        </summary>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Réf.")}</th>
                <th>{t("Ligne")}</th>
                <th>{t("Type")}</th>
                <th className="r">{t("Montant")}</th>
                <th>{t("État")}</th>
                <th>{t("Et maintenant")}</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((i) => {
                const o = byOffer.get(i.offerId);
                return (
                  <tr key={i.id}>
                    <td className="mono">{i.ref}</td>
                    <td>{o ? <Link href={`/offres/${o.id}`}>{o.title}</Link> : i.offerId}</td>
                    <td>
                      <span className={`st ${i.type}`}>{t(INTENT_LABEL[i.type])}</span>
                    </td>
                    <td className="r num">{i.amount ? (i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${t("parts")}` : `${fmt(i.amount)} ${o?.kind === "RACHAT" ? t("titres") : "FCFA"}`) : "—"}</td>
                    <td>
                      <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                    </td>
                    <td className="muted" style={{ fontSize: ".8rem" }}>
                      {t((o?.kind === "FONDS" ? NEXT_FUND : NEXT)[i.state])}
                    </td>
                  </tr>
                );
              })}
              {closed.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t("Rien encore.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Mes documents")}</h2>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("N°")}</th>
                <th>{t("Document")}</th>
                <th>{t("Émis le")}</th>
                <th>{t("État")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {myDocs.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.number}</td>
                  <td>{t(DOC_LABEL[d.type])}</td>
                  <td className="num">{fmtDateTime(d.createdAt)}</td>
                  <td>{t(d.status === "signe" ? "Signé" : d.status === "envoye" ? "Envoyé" : "Disponible")}</td>
                  <td>
                    <a className="btn sm" href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer">
                      {t("Ouvrir le PDF")}
                    </a>
                  </td>
                </tr>
              ))}
              {myDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    {t("Vos bulletins, appels de fonds et avis apparaîtront ici.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
