import Link from "next/link";
import type { Session } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate, fmtMillions, localIso } from "@/lib/format";
import type { Intent } from "@/lib/domain/types";
import { CounterAnswer } from "./CounterAnswer";
import { OrdreMenu } from "./OrdreMenu";
import { positionsFrom } from "@/lib/positions";
import { LineIdentity } from "@/components/LineIdentity";
import { WatchButton } from "@/components/WatchButton";
import { TrustNudge } from "@/components/TrustNudge";
import { Reinvest } from "@/components/Reinvest";
import { AvisGardeList } from "@/components/AvisGardeList";
import { StandingList } from "@/components/Standing";
import { nextRun, STANDING_STATE_LABEL } from "@/lib/domain/standing";
import { summarize } from "@/lib/domain/summary";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

/**
 * Le relevé : tout ce qu'un client voit de sa propre relation.
 *
 * C'était la page « Mon espace », à /moi, et elle n'existe plus comme page.
 * Elle posait la même question que le portefeuille, « qu'est-ce que je
 * possède », et deux pages pour une question sont une de trop : on ne sait
 * jamais laquelle ouvrir. Le portefeuille répond en un chiffre et une courbe,
 * le relevé répond en détail, et le détail appartient à la réponse.
 *
 * Elle devient donc le bas du portefeuille, et ses six sections arrivent
 * REPLIÉES : ouvertes, elles feraient du portefeuille plusieurs écrans chez un
 * client qui tient vingt lignes, et la première chose qu'il vient voir est ce
 * que ça vaut. Rien n'est perdu, tout est à un clic, et « Tout ouvrir » en
 * ouvre six d'un coup.
 *
 * Ce qui n'a pas suivi : l'en-tête, qui redisait le nom, le segment et le
 * palier que le portefeuille affiche déjà, et les trois boutons de navigation
 * qui vivent dans le menu du compte.
 */
export async function Releve({ session: s }: { session: Session }) {
  const r = repo();
  const [intents, offers, docs] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  // A line no longer listed (back to draft, withdrawn) still exists: the history keeps its name and its fiche.
  const missing = [...new Set(mine.map((i) => i.offerId).filter((id) => !byOffer.has(id)))];
  for (const o of await Promise.all(missing.map((id) => r.getOffer(id).catch(() => undefined)))) if (o) byOffer.set(o.id, o);
  /* Le journal des espèces part avec le reste : sans lui, la bande des coupons
     ne sait dire que « échu », et c'est la question qu'elle existe pour fermer. */
  const [myFile, watches, cash, temoignages] = await Promise.all([
    r.getClientFileByUser(s.userId),
    r.listWatches(s.userId),
    r.listCash(s.userId).catch(() => []),
    /* Ce que le client a déjà dit : sans cela, la bande lui redemanderait ce
       qu'il vient de répondre, ce qui est la façon la plus sûre de faire taire
       un témoin. */
    r.listTemoignages({ userId: s.userId }).catch(() => []),
  ]);
  const followed = watches.map((w) => byOffer.get(w.offerId)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const now = new Date();
  // Les versements programmés du lecteur : une poignée, lus avec le reste de la page.
  const standing = await r.listStandingOrders(s.userId).catch(() => []);
  /* Les avis de droits de garde : un frais qu on ne voit qu au releve bancaire
     est un frais qu on subit ; celui dont on lit le detail est un frais qu on
     verifie. */
  const avisGarde = await r.listCustodyNotices({ userId: s.userId }).catch(() => []);
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
    <div className={styles.wrap} id="releve">
      {/* Le seul reste de l'ancien en-tête : un appel à agir, pas une redite du
          nom ni du palier, que le portefeuille dit déjà au-dessus. */}
      {/* Le même partage qu'ailleurs : un bouton plein pour ce qui attend la
          main du client, un lien discret pour ce qui attend le desk, et rien du
          tout quand le compte est ouvert. Répéter « Ouvrir mon compte » à
          quelqu'un dont le dossier est en revue, c'est lui demander de refaire
          ce qu'il a déjà fait. */}
      {s.tier < 2 &&
        (!s.kycStatus || s.kycStatus === "complements" || (s.kycStatus === "approuve" && !s.conventionAccepted) ? (
          <p className={styles.reportLink}>
            <Link href="/ouvrir-un-compte" className="btn primary">
              {t(s.kycStatus === "complements" ? "Compléter mon dossier" : s.kycStatus === "approuve" ? "Accepter ma convention" : "Ouvrir mon compte")}
            </Link>
          </p>
        ) : s.kycStatus ? (
          <p className={styles.reportLink}>
            <Link href="/ouvrir-un-compte">{t("Mon dossier d'ouverture")}</Link>
          </p>
        ) : null)}
      <TrustNudge />
      {/* La question qu un releve laisse ouverte : ai-je gagne, et combien. */}
      {positions.length > 0 && (
        <p className={styles.reportLink}>
          <Link href="/moi/performance">{t("L'analyse de votre portefeuille")}</Link>
        </p>
      )}
      {/* Ce qui est revenu et dort : la seule décision entre l’achat et le remboursement. */}
      <Reinvest positions={positions} entries={cash} temoignages={temoignages} now={now} />

      {/* Ce que la conservation a coûté, ouvrable ligne à ligne. Un avis à zéro
          paraît comme les autres : son absence se lirait comme un oubli. */}
      {avisGarde.length > 0 && (
        <section className={styles.sec}>
          <h2>{t("Vos droits de garde")}</h2>
          <AvisGardeList avis={avisGarde} />
        </section>
      )}

      {standing.length > 0 && (
        <section className={styles.sec} id="versements">
          <h2>{t("Vos versements programmés")}</h2>
          <StandingList
            rows={standing.map((x) => {
              const o = offers.find((y) => y.id === x.offerId);
              return {
                id: x.id,
                ref: x.ref,
                offerId: x.offerId,
                title: o?.title ?? x.offerId,
                href: `/offres/${x.offerId}`,
                amount: x.amount,
                dayOfMonth: x.dayOfMonth,
                source: x.source,
                minAmount: x.minAmount,
                state: x.state,
                stateLabel: STANDING_STATE_LABEL[x.state],
                next: nextRun(x, localIso(now)),
                lastRunOn: x.lastRunOn,
                endsOn: x.endsOn,
                stopReason: x.stopReason,
              };
            })}
          />
        </section>
      )}

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

      {/* LES INTENTIONS NE SE REPLIENT PLUS. Elles demandent quelque chose, et
          ce qui demande quelque chose ne se range pas derrière un pli. Elles
          étaient dites deux fois, ici et en chiffre dans un compteur plus
          haut : le compteur est parti, les cartes portent le nombre par leur
          présence. */}
      <section className={styles.sec} id="ordres-en-cours">
        <div className={styles.secTete}>
          <h2>{t("Vos intentions en cours")}</h2>
          <span className="muted">{t("reçue → confirmée → transmise → servie → réglée")}</span>
          <Link href="/moi/performance#operations">{t("Vos ordres passés")} →</Link>
        </div>
      <div className="panel">
        {open.length === 0 && <div className="empty">{t("Aucune intention en cours : choisissez une ligne dans Guichet.")}</div>}
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
                    {/* Ce qu'on peut encore faire d'un ordre déjà parti : la
                        carte disait où il en était, et rien d'autre. */}
                    <OrdreMenu intentId={i.id} offerId={i.offerId} etat={i.state} ref_={i.ref} />
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

      </section>

      {/* LES COORDONNÉES SONT PARTIES EN SÉCURITÉ, le 2 octobre 2026.
          Elles n'ont jamais été une affaire de portefeuille : le téléphone et
          l'adresse sont les deux canaux prouvés, et cette page-là les gouverne
          déjà, avec les appareils et les alertes. Le tableau de bord montre ce
          qu'on possède, pas la façon dont on nous joint. */}

      <section className={styles.sec}>
        <div className={styles.secTete}>
          <h2>{t("Lignes suivies")}</h2>
          <span className="muted">{t(followed.length ? "Un message à chaque changement de cours, de prix ou de statut." : "Sur chaque fiche, « Suivre » vous prévient des changements de cours, de prix ou de statut.")}</span>
        </div>
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

      </section>

      {/* LE RESTE DU DOSSIER, EN TUILES. Trois plis vivaient ici : les positions,
          l'historique et les documents. Un pli pose au lecteur la question « y
          a-t-il quelque chose là-dedans » à chaque ouverture ; une tuile y
          répond avec son chiffre, et mène à une page qui montre mieux.
          Les positions et l'historique sont dans Analyse, qui porte déjà la
          répartition, le rendement ligne par ligne et l'échéancier : une
          troisième table ici aurait fait trois lectures du même argent. */}
      <section className={styles.sec}>
        <div className={styles.secTete}>
          <h2>{t("Le reste de votre dossier")}</h2>
        </div>
        <div className={styles.tuiles}>
          <Link href="/moi/performance#detenu" className={styles.tuile}>
            <b>{t("Vos positions")}</b>
            <span>{positions.length ? t("{n} ligne(s) · {v}", { n: String(positions.length), v: fmtMillions(valued) }) : t("aucun titre inscrit encore")}</span>
          </Link>
          <Link href="/moi/documents" className={styles.tuile}>
            <b>{t("Mes documents")}</b>
            <span>{t("{n} relevé(s), avis et bulletins", { n: String(myDocs.length) })}</span>
          </Link>
          <Link href="/moi/performance#operations" className={styles.tuile}>
            <b>{t("Vos ordres passés")}</b>
            <span>{t("{n} ordre(s) servis, réglés ou clos", { n: String(closed.length) })}</span>
          </Link>
          <Link href="/moi/performance#echeancier" className={styles.tuile}>
            <b>{t("L'échéancier")}</b>
            <span>{nextFlow ? t("prochain flux le {date}", { date: fmtDate(nextFlow.date, false) }) : t("coupons et remboursements à venir")}</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
