import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { DOC_LABEL } from "@/lib/documents/registry";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate, fmtMillions } from "@/lib/format";
import type { Intent } from "@/lib/domain/types";
import { CounterAnswer } from "./CounterAnswer";
import { ContactForm } from "./ContactForm";
import { ConsentForm } from "./ConsentForm";
import { PushToggle } from "@/components/PushToggle";
import { positionsFrom } from "@/lib/positions";
import { StatementButtons } from "./StatementButtons";
import { MyDocuments } from "./MyDocuments";
import { FoldAll, FoldSection } from "@/components/Fold";
import { LineIdentity } from "@/components/LineIdentity";
import { WatchButton } from "@/components/WatchButton";
import { TrustNudge } from "@/components/TrustNudge";
import { Reinvest } from "@/components/Reinvest";
import { summarize } from "@/lib/domain/summary";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon espace") };
}

/** What a client can see of their own relationship: intents, states, documents. */
export default async function MyPage() {
  const s = await requireSession("/moi");
  const r = repo();
  const [intents, offers, docs] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  // A line no longer listed (back to draft, withdrawn) still exists: the history keeps its name and its fiche.
  const missing = [...new Set(mine.map((i) => i.offerId).filter((id) => !byOffer.has(id)))];
  for (const o of await Promise.all(missing.map((id) => r.getOffer(id).catch(() => undefined)))) if (o) byOffer.set(o.id, o);
  const [myFile, contact, watches] = await Promise.all([r.getClientFileByUser(s.userId), r.getContact(s.userId), r.listWatches(s.userId)]);
  const followed = watches.map((w) => byOffer.get(w.offerId)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const now = new Date();
  const positions = positionsFrom(mine, offers);
  const myDocs = docs.filter((d) => d.type !== "dossier_svt" && ((d.intentId && mine.some((i) => i.id === d.intentId)) || (myFile && d.clientFileId === myFile.id) || d.clientId === s.userId));

  const NEXT: Record<string, string> = {
    recue: "Un conseiller vous rappelle avant la clôture.",
    contre_proposee: "Nous vous proposons d’autres conditions : votre réponse est attendue.",
    confirmee: "Signez le bulletin et effectuez le virement indiqué sur l'appel de fonds.",
    transmise: "Ordre transmis au SVT : résultats attendus le jour de l'adjudication.",
    servie: "Servi. Règlement à la date indiquée, puis avis d'opéré.",
    non_servie: "Non servi. Fonds restitués sous deux jours ouvrés.",
    reglee: "Titres inscrits à votre nom. Prochain coupon selon l'échéancier de l'avis d'opéré.",
    annulee: "Annulée.",
  };
  const NEXT_FUND: Record<string, string> = {
    recue: "Un conseiller vous rappelle pour confirmer.",
    contre_proposee: "Nous vous proposons d’autres conditions : votre réponse est attendue.",
    confirmee: "Signez le bulletin de souscription et effectuez le virement indiqué sur l'appel de fonds.",
    transmise: "Ordre transmis à la société de gestion : exécution à la prochaine valeur liquidative.",
    servie: "Exécuté à la VL retenue. Inscription des parts au registre, puis avis d'opération.",
    non_servie: "Non exécuté. Fonds restitués sous deux jours ouvrés.",
    reglee: "Parts inscrites à votre nom au registre du dépositaire ; valeur suivant la VL publiée.",
    annulee: "Annulée.",
  };

  // The five stops every order goes through; a card shows where each intention stands.
  const STOPS: Intent["state"][] = ["recue", "confirmee", "transmise", "servie", "reglee"];
  // Une contre-proposition n’a pas recule : l’ordre est la, il attend une reponse.
  const stopIndex = (st: Intent["state"]) => (st === "non_servie" ? 3 : st === "annulee" ? -1 : st === "contre_proposee" ? 0 : STOPS.indexOf(st));
  const open = mine.filter((i) => i.state === "recue" || i.state === "confirmee" || i.state === "transmise").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const closed = mine.filter((i) => !open.includes(i)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toSign = open.filter((i) => i.state === "confirmee").length;
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
        <Link href="/moi/profil" className="btn">
          {t("Mon profil")}
        </Link>
        <Link href="/moi/securite" className="btn">
          {t("Sécurité")}
        </Link>
        <Link href="/" className="btn">
          {t("Voir les offres")}
        </Link>
      </div>
      <TrustNudge />
      {/* Ce qui est revenu et dort : la seule décision entre l’achat et le remboursement. */}
      <Reinvest positions={positions} now={now} />

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
      <div className={styles.foldBar}>
        <FoldAll group="moi" ids={["intentions", "coordonnees", "suivies", "positions", "historique", "documents"]} />
      </div>

      <FoldSection group="moi" id="intentions" title={t("Intentions en cours")} hint={`· ${open.length}${toSign ? ` · ${t(toSign > 1 ? "{n} à signer" : "une à signer", { n: toSign })}` : ""}`} aside={<span className="muted" style={{ fontSize: ".8rem" }}>{t("reçue → confirmée → transmise → servie → réglée")}</span>}>
      <div className="panel">
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
                  {/* Une contre-proposition se décide ici : c’est le oui du client qui change l’ordre. */}
                  {i.state === "contre_proposee" && o ? <CounterAnswer intent={i} offer={o} now={new Date()} /> : <div className={styles.next}>{t((o?.kind === "FONDS" ? NEXT_FUND : NEXT)[i.state])}</div>}
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

      </FoldSection>

      <FoldSection group="moi" id="coordonnees" title={t("Mes coordonnées")} hint={!contact?.phone || !contact?.email ? `· ${t("à compléter")}` : "· WhatsApp ✓ · e-mail ✓"}>
      <div className="panel">
        <ContactForm phone={contact?.phone ?? s.phone} email={contact?.email ?? s.email} />
        {/* Le consentement, à côté des coordonnées : c'est là qu'on se demande
            qui peut nous écrire, pas trois panneaux plus loin. */}
        <div className={styles.push}>
          <b>{t("Informations et opportunités")}</b>
          <ConsentForm whatsapp={Boolean(contact?.whatsappOptIn)} email={Boolean(contact?.emailOptIn)} hasPhone={Boolean(contact?.phone ?? s.phone)} hasEmail={Boolean(contact?.email ?? s.email)} />
        </div>
        <div className={styles.push}>
          <b>{t("Alertes sur cet appareil")}</b>
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </div>
      </div>

      </FoldSection>

      <FoldSection group="moi" id="suivies" title={t("Lignes suivies")} hint={`· ${followed.length}`} aside={<span className="muted" style={{ fontSize: ".8rem" }}>{t(followed.length ? "Un message à chaque changement de cours, de prix ou de statut." : "Sur chaque fiche, « Suivre » vous prévient des changements de cours, de prix ou de statut.")}</span>}>
      <div className="panel">
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

      </FoldSection>

      {positions.length > 0 && (
        <FoldSection group="moi" id="positions" title={t("Mes positions")} hint={`· ${fmtMillions(valued)}${nextFlow ? ` · ${t("flux le {date}", { date: fmtDate(nextFlow.date, false) })}` : ""}`} aside={<StatementButtons />}>
        <div className="panel">
          <div className={`panel-h ${styles.noHead}`}>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("titres inscrits à votre nom · flux à venir")}
            </span>
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
        </FoldSection>
      )}

      <FoldSection group="moi" id="historique" title={t("Historique")} hint={`· ${closed.length}`} aside={<span className="muted" style={{ fontSize: ".8rem" }}>{t("intentions servies, réglées, non servies ou annulées")}</span>} defaultOpen={false}>
      <div className="panel">
        <div className={styles.histCards}>
          {closed.map((i) => {
            const o = byOffer.get(i.offerId);
            return (
              <div key={i.id} className={styles.histCard}>
                <div className={styles.cardTop}>
                  <div>
                    <b>{o ? <Link href={`/offres/${o.id}`}>{o.title}</Link> : i.offerId}</b>
                    <small>
                      {t(INTENT_LABEL[i.type])}
                      {i.amount ? ` · ${amountText(i, o?.kind)}` : ""} · {t("réf.")} {i.ref} · {fmtDate(i.createdAt, false)}
                    </small>
                  </div>
                  <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                </div>
                <span className={styles.next}>{t((o?.kind === "FONDS" ? NEXT_FUND : NEXT)[i.state])}</span>
              </div>
            );
          })}
          {closed.length === 0 && <p className="muted">{t("Rien encore.")}</p>}
        </div>
        <div className={`scroll-x ${styles.deskTable}`}>
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
      </div>
      </FoldSection>

      <FoldSection group="moi" id="documents" title={t("Mes documents")} hint={`· ${myDocs.length}`} aside={<Link className="btn sm" href="/moi/reclamation">{t("Déposer une réclamation")}</Link>}>
      <MyDocuments
        inFold
        docs={myDocs.map((d) => ({ id: d.id, number: d.number, label: t(DOC_LABEL[d.type]), createdAt: d.createdAt, status: d.status, href: `/desk/documents/pdf/${d.id}`, intentId: d.intentId }))}
        ops={mine
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((i) => {
            const o = byOffer.get(i.offerId);
            return { id: i.id, title: o?.title ?? i.offerId, about: `${t(INTENT_LABEL[i.type])}${i.amount ? ` · ${amountText(i, o?.kind)}` : ""} · ${t("réf.")} ${i.ref}`, state: t(INTENT_STATE_LABEL[i.state]), stateKey: i.state, href: o ? `/offres/${o.id}` : undefined };
          })}
      />
      </FoldSection>
    </div>
  );
}
