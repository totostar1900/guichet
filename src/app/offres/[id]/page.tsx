import Link from "next/link";
import { RelatedNews } from "@/components/RelatedNews";
import { newsFor } from "@/lib/news";
import { notFound } from "next/navigation";
import { FlowsChart } from "@/components/FlowsChart";
import { NavHistory } from "@/components/NavHistory";
import { QuoteHistory } from "@/components/QuoteHistory";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { companyByIsin, issuerByIsin } from "@/lib/reference";
import { IntentForm } from "@/components/IntentForm";
import { LineIdentity } from "@/components/LineIdentity";
import { WatchButton } from "@/components/WatchButton";
import { FichePanes, FicheSegments, StickyAction } from "@/components/mobile/FichePanes";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { KpiCard } from "@/components/KpiCard";
import { explainKpis } from "@/lib/domain/explain";
import { summarize } from "@/lib/domain/summary";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus, displayYield, familySegment, isPast, marketAmortInput, marketBondInput, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { bondTerms } from "@/lib/domain/status";
import { amortCalc } from "@/lib/finance";
import type { IntentType, Offer } from "@/lib/domain/types";
import { bondCalc, btaAmountForBonds, btaCalc, daysBetween, firstCouponDate, tenorText } from "@/lib/finance";
import { positionsFrom } from "@/lib/positions";
import { typeOf } from "@/lib/registry";
import { offerRisks } from "@/lib/domain/sheet";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string; qty?: string }> };

export async function generateMetadata({ params }: Props) {
  const o = await repo().getOffer((await params).id);
  return { title: o ? o.title : "Offre" };
}

function Kpis({ o }: { o: Offer }) {
  const dy = displayYield(o);
  const y = dy.pct;
  const yTxt = y != null ? `${dy.approx ? "≈ " : ""}${fmtPct(y, 2)}` : "—";
  const items: [string, string, boolean][] =
    o.kind === "OTA" || o.kind === "APE"
      ? [
          [dy.atPar ? `Taux nominal ${o.servedPricePct ? "servi" : "visé"} au pair` : `Rendement actuariel ${o.servedPricePct ? "servi" : "visé"}`, yTxt, true],
          [`Prix ${o.servedPricePct ? "servi" : "Purpose"}`, fmtPrice(o.servedPricePct ?? o.pricePct ?? 100), false],
          ["Coupon annuel", fmtPct(o.couponRate ?? 0, 2), false],
        ]
      : o.kind === "FONDS" && o.fund
        ? [
            [o.fund.perf1yPct != null ? "Performance sur 12 mois" : `Depuis l'origine${o.fund.inceptionDate ? ` (${fmtDate(o.fund.inceptionDate)})` : ""}`, o.fund.perf1yPct != null ? `${o.fund.perf1yPct > 0 ? "+" : ""}${fmtPct(o.fund.perf1yPct, 2)}` : `${o.fund.perfSinceInceptionPct > 0 ? "+" : ""}${fmtPct(o.fund.perfSinceInceptionPct, 2)}`, true],
            ["Valeur liquidative (FCFA)", fmt(o.fund.nav), false],
            ["Catégorie", `${FUND_CATEGORY_LABEL[o.fund.category]} · ${FUND_FREQUENCY_LABEL[o.fund.frequency]}`, false],
          ]
      : o.kind === "MARCHE"
        ? [
            [dy.atPar ? "Taux nominal · au pair" : o.instrument === "obligation" ? "Rendement actuariel brut au cours" : "Rendement du dernier dividende", yTxt, true],
            [o.instrument === "obligation" ? "Coupon facial" : "Dernier dividende brut", o.instrument === "obligation" ? fmtPct(o.couponRate ?? 0, 2) : o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—", false],
            [o.instrument === "obligation" ? "Dernier cours (% nominal)" : "Dernier cours (FCFA)", o.lastPrice != null ? (o.instrument === "obligation" ? fmtPrice(o.lastPrice) : fmt(o.lastPrice)) : "—", false],
          ]
      : o.kind === "BTA"
        ? [
            ["Rendement actuariel", y != null ? fmtPct(y, 2) : "—", true],
            ["Taux précompté", fmtPct(o.precountRate ?? 0, 2), false],
            ["Durée", o.maturityOn ? `${daysBetween(o.settleOn, o.maturityOn)} jours` : "—", false],
          ]
        : o.kind === "ACTIONS"
          ? [
              ["Rendement du dividende au prix", y != null ? fmtPct(y, 2) : "—", true],
              ["Dernier dividende brut", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—", false],
              ["Prix de souscription (FCFA)", fmt(o.pricePerShare ?? 0), false],
            ]
          : [
              ["Prix de rachat", "100 %", true],
              ["Échéance initiale", o.maturityOn ? fmtDate(o.maturityOn) : "—", false],
              ["Volume racheté", o.sizeLabel ?? "—", false],
            ];
  // Every card opens on tap: the number decomposed with this line's own figures.
  const explains = explainKpis(o);
  return (
    <div className={styles.kpis} data-coach="kpis">
      {items.map(([k, v, gold], i) => (
        <KpiCard key={k} label={k} value={v} gold={gold} explain={explains[i]} compareHref={`/comparer?a=${o.id}`} coach={gold ? "hero" : undefined} />
      ))}
    </div>
  );
}

/** Read-only reference block at the published price. */
async function Reference({ o }: { o: Offer }) {
  const t = await getT();
  if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn) {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn, commissionPct: o.commissionPct }, 10_000_000, price);
    return (
      <>
        <h3>{t(o.servedPricePct ? "Pour 10 000 000 FCFA de nominal, au prix servi" : "Pour 10 000 000 FCFA de nominal, au prix Purpose")}</h3>
        <div className="out">
          <div>Titres (nominal {fmt(o.nominal)})</div>
          <div>{fmt(r.titles)}</div>
          <div>Prix {fmtPrice(price)}</div>
          <div>{fmt(r.titles * r.pricePerTitle)}</div>
          <div>Coupon couru ({r.accruedDays} jours)</div>
          <div>{r.accruedDays ? fmt(r.accrued) : "néant, ligne nouvelle"}</div>
          <div className="tot">{t(`Décaissement le ${fmtDate(o.settleOn, false)}`)}</div>
          <div>{fmt(r.outlay)} FCFA</div>
          <div>{t("Gain brut jusqu'au terme")}</div>
          <div>{fmt(r.gain)}</div>
          <div className="hl">{t("Rendement actuariel brut")}</div>
          <div>{fmtPct(r.irr, 2)}</div>
        </div>
        <FlowsChart r={r} settleOn={o.settleOn} />
      </>
    );
  }
  if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
    const b = { nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn };
    const r = btaCalc(b, btaAmountForBonds(b, 10, o.precountRate), o.precountRate);
    return (
      <>
        <h3>{t(`Pour 10 bons de ${fmt(o.nominal)} FCFA`)}</h3>
        <div className="out">
          <div>{t("Bons")}</div>
          <div>{fmt(r.n)}</div>
          <div>{t("Prix d'achat par bon")}</div>
          <div>{fmt(r.pricePerBond)}</div>
          <div className="tot">{t(`Décaissement le ${fmtDate(o.settleOn, false)}`)}</div>
          <div>{fmt(r.outlay)} FCFA</div>
          <div>{t(`Remboursé le ${fmtDate(o.maturityOn, false)}`)}</div>
          <div>{fmt(r.redemption)}</div>
          <div>{t("Intérêt (précompté)")}</div>
          <div>{fmt(r.gain)}</div>
          <div className="hl">{t("Rendement actuariel")}</div>
          <div>{fmtPct(r.yieldPct, 2)}</div>
        </div>
      </>
    );
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const amount = Math.max(f.minAmount, 1_000_000);
    const net = amount / (1 + f.entryFeePct / 100);
    const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
    return (
      <>
        <h3>{t(`Pour ${fmt(amount)} FCFA à la dernière VL`)}</h3>
        <div className="out">
          {f.entryFeePct > 0 && (
            <>
              <div>Frais du fonds à l&apos;entrée {fmtPct(f.entryFeePct, 2)}</div>
              <div>{fmt(amount - net)}</div>
            </>
          )}
          <div>{t("Investi dans le fonds")}</div>
          <div>{fmt(net)}</div>
          <div className="tot">{t(`Parts (VL ${fmt(f.nav)} du ${fmtDate(f.navDate, false)})`)}</div>
          <div>≈ {units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</div>
          {f.exitFeePct > 0 && (
            <>
              <div>{t("Frais du fonds à la sortie")}</div>
              <div>{fmtPct(f.exitFeePct, 2)}</div>
            </>
          )}
        </div>
      </>
    );
  }
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    const ref = o.ask ?? o.lastPrice ?? 0;
    const n = isBond ? 1000 : 100;
    const ai = isBond ? marketAmortInput(o) : null;
    const bi = isBond ? marketBondInput(o) : null;
    const terms = bondTerms(o.isin);
    if ((ai && ai.maturityOn > ai.settleOn) || (bi && bi.maturityOn > bi.settleOn)) {
      const r = ai && ai.maturityOn > ai.settleOn ? amortCalc(ai, n * o.nominal, ref) : bondCalc(bi!, n * o.nominal, ref);
      const settleOn = ai && ai.maturityOn > ai.settleOn ? ai.settleOn : bi!.settleOn;
      return (
        <>
          <h3>{t(`Pour ${fmt(n)} titres au cours vendeur`)}</h3>
          <div className="out">
            <div>Prix {fmtPrice(ref)}</div>
            <div>{fmt(r.titles * r.pricePerTitle)}</div>
            <div>Coupon couru ({r.accruedDays} jours)</div>
            <div>{fmt(r.accrued)}</div>
            <div className="tot">{t("Décaissement (règlement T+{n})", { n: o.settlementDays ?? 3 })}</div>
            <div>{fmt(r.outlay)} FCFA</div>
            <div className="hl">{t("Rendement actuariel brut à ce cours")}</div>
            <div>{fmtPct(r.irr, 2)}</div>
          </div>
          <FlowsChart r={r} settleOn={settleOn} />
          {terms ? (
            <p className={styles.note}>
              Échéancier : remboursement du capital en {terms.periodsPerYear === 1 ? "annuités" : terms.periodsPerYear === 2 ? "semestrialités" : "trimestrialités"} égales jusqu&apos;au {fmtDate(terms.maturityOn)}
              {terms.graceUntil ? `, intérêts seuls jusqu'au ${fmtDate(terms.graceUntil)}` : ""}, sur le nominal restant de {fmt(o.nominal)} FCFA par titre. Source : {terms.source}.
            </p>
          ) : (
            <p className={styles.note}>{t("Seule l'année de l'échéance figure au bulletin : rendement calculé sur un remboursement in fine au 31 décembre, à confirmer avec la note d'information.")}</p>
          )}
        </>
      );
    }
    return (
      <>
        <h3>{t(`Pour ${n} actions au cours vendeur`)}</h3>
        <div className="out">
          <div>{t("Cours vendeur")}</div>
          <div>{fmt(ref)} FCFA</div>
          <div className="tot">{t("Montant")}</div>
          <div>{fmt(n * ref)} FCFA</div>
          {o.dividendPerShare ? (
            <>
              <div>{t("Dividende annuel attendu")}</div>
              <div>{fmt(n * o.dividendPerShare)}</div>
            </>
          ) : null}
          <div className="hl">{t("Total à décaisser")}</div>
          <div>{fmt(n * ref)} FCFA</div>
        </div>
      </>
    );
  }
  if (o.kind === "ACTIONS" && o.pricePerShare) {
    const n = 100;
    return (
      <>
        <h3>{t(`Pour ${n} actions`)}</h3>
        <div className="out">
          <div>{t("Actions")}</div>
          <div>{n}</div>
          <div className="tot">{t("Montant à libérer")}</div>
          <div>{fmt(n * o.pricePerShare)} FCFA</div>
          <div>Dividende attendu ({fmt(o.dividendPerShare ?? 0)} / action)</div>
          <div>{fmt(n * (o.dividendPerShare ?? 0))}</div>
          {o.lastPrice && (
            <>
              <div>{t(`Valeur au dernier cours (${fmt(o.lastPrice)})`)}</div>
              <div>{fmt(n * o.lastPrice)}</div>
              <div className="hl">{t("Plus-value latente au cours du {d}", { d: o.lastPriceOn ? fmtDate(o.lastPriceOn, false) : "—" })}</div>
              <div>+{fmt(n * (o.lastPrice - o.pricePerShare))}</div>
            </>
          )}
        </div>
      </>
    );
  }
  const n = 500;
  const proceeds = n * o.nominal;
  return (
    <>
      <h3>{t(`Pour ${n} titres cédés`)}</h3>
      <div className="out">
        <div>{t("Titres cédés")}</div>
        <div>{n}</div>
        <div className="tot">{t("Produit de cession à 100 %")}</div>
        <div>{fmt(proceeds)} FCFA</div>
        <div>{t("Coupon couru")}</div>
        <div>{t("réglé par le Trésor")}</div>
        <div className="hl">{t(`Encaissement le ${fmtDate(o.settleOn, false)}`)}</div>
        <div>{fmt(proceeds)}</div>
      </div>
    </>
  );
}

export default async function OfferPage({ params, searchParams }: Props) {
    const [{ id }, sp] = await Promise.all([params, searchParams]);
  const t = await getT();
  const [o, session] = await Promise.all([repo().getOffer(id), getSession()]);
  if (!o) notFound();
  if (o.status === "withdrawn" && !isDesk(session)) {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <Link href="/" className={styles.back}>
            {t("← Toutes les offres")}
          </Link>
          <h1 className="display" style={{ marginTop: 12 }}>
            {o.title}
          </h1>
          <p className="muted">{t("Cette ligne a été retirée du Guichet. Pour toute question, contactez le desk.")}</p>
        </div>
      </div>
    );
  }
  const watching = session ? (await repo().listWatches(session.userId)).some((w) => w.offerId === id) : false;
  const company = o.kind === "MARCHE" && o.instrument === "action" ? await companyByIsin(o.isin) : undefined;
  const issuer = o.kind === "MARCHE" && o.instrument === "obligation" ? await issuerByIsin(o.isin) : undefined;
  const quotes = o.kind === "MARCHE" && o.priceSource === "boc" ? await repo().listQuotes(o.isin, 60) : [];
  const navs = o.kind === "FONDS" && o.fund ? await repo().listFundNavs(o.fund.key, 60) : [];
  const st = displayStatus(o);
  const past = isPast(st);
  const summary = summarize(o, new Date());
  const types = allowedIntents(o, st);
  const initial = (types.includes(sp.intent as IntentType) ? sp.intent : types[0]) as IntentType;
  // What the signed-in client already holds on this line — caps sales / redemptions and pre-fills « tout vendre ».
  let held = 0;
  if (session && (o.kind === "MARCHE" || o.kind === "FONDS")) {
    const [allIntents, allOffers] = await Promise.all([repo().listIntents(), repo().listOffers()]);
    held = positionsFrom(allIntents.filter((i) => i.clientId === session.userId), allOffers).filter((p) => p.offer.isin === o.isin).reduce((s, p) => s + p.units, 0);
  }
  const qty = sp.qty && /^[\d.,]+$/.test(sp.qty) ? Number(sp.qty.replace(",", ".")) : undefined;

  const stampPending = o.kind !== "MARCHE" && Boolean(o.priceNote || o.rateNote);
  const stamp = o.kind === "FONDS" && o.fund ? `VL du ${fmtDate(o.fund.navDate)} publiée par ${o.fund.manager} · Bulletin Officiel de la Cote${navs[0] ? ` n° ${navs[0].bulletinNo}` : ""}` : o.kind === "MARCHE" ? (o.priceSource === "boc" && quotes[0] ? `Clôture BVMAC · Bulletin Officiel de la Cote n° ${quotes[0].bulletinNo} du ${fmtDate(quotes[0].sessionDate)}` : `Cours saisi par le desk · ${o.pricedAt ? fmtDateTime(o.pricedAt) : "—"}`) : o.servedPricePct ? "Prix servi à l'adjudication" : stampPending ? "Indicatif — prix à fixer par le desk" : `Prix fixé par le desk · ${o.pricedAt ? fmtDateTime(o.pricedAt) : "—"} · v${o.version}`;
  const priceText = o.kind === "FONDS" && o.fund ? `VL ${fmt(o.fund.nav)} FCFA` : o.kind === "MARCHE" ? `cours ${o.instrument === "obligation" ? fmtPrice(o.lastPrice ?? 0) : fmt(o.lastPrice ?? 0) + " FCFA"}` : o.kind === "RACHAT" ? "au pair (100 %)" : o.kind === "ACTIONS" ? `${fmt(o.pricePerShare ?? 0)} FCFA / action` : o.kind === "BTA" ? `taux ${fmtPct(o.precountRate ?? 0, 2)}` : `prix ${fmtPrice(o.servedPricePct ?? o.pricePct ?? 100)}`;

  const firstCoupon = o.kind === "OTA" && o.maturityOn ? firstCouponDate(o.settleOn, o.maturityOn) : undefined;
  const timeline: [string, string][] =
    o.kind === "FONDS" && o.fund
      ? [
          ["Société de gestion", o.fund.manager],
          ["Dépositaire", o.fund.depositary],
          ["Centralisation", o.fund.cutoff ?? (st === "quoted" ? "avant la prochaine VL" : "sur demande")],
          ["Création du fonds", fmtDate(o.fund.inceptionDate)],
        ]
      : o.kind === "MARCHE"
      ? [
          ["Marché", o.market ?? "—"],
          ["Cotation", "continue, jours ouvrés"],
          ["Règlement", `T+${o.settlementDays ?? 3}`],
          [o.instrument === "obligation" ? "Échéance" : "Dernier cours", o.instrument === "obligation" ? (o.maturityOn ? fmtDate(o.maturityOn) : "—") : o.lastPriceOn ? fmtDate(o.lastPriceOn) : "—"],
        ]
      : o.kind === "ACTIONS"
      ? [
          ["Ouverture", fmtDate(o.opensAt)],
          ["Clôture", fmtDate(o.deadlineAt)],
          ["Règlement", fmtDate(o.settleOn)],
          ["Cotation", "BVMAC"],
        ]
      : [
          ["Dépôt des offres", fmtDateTime(o.deadlineAt)],
          ["Résultats", o.resultsAt ? fmtDateTime(o.resultsAt) : "—"],
          ["Règlement", fmtDate(o.settleOn)],
          [o.kind === "BTA" ? "Remboursement" : o.kind === "RACHAT" ? "Échéance initiale" : "Premier coupon", firstCoupon ? fmtDate(firstCoupon.toISOString().slice(0, 10)) : o.maturityOn ? fmtDate(o.maturityOn) : "—"],
        ];

  // « À garder en tête » comes from the product type (desk-editable in the référentiel).
  const risks = offerRisks(o);
  // The walk-through speaks about this line, with its own numbers.
  const dyc = displayYield(o);
  const relatedNews = (await newsFor("offer", o.id)).length;
  const coachStops = [
    {
      target: "hero",
      title: "Le chiffre qui compte",
      text:
        o.kind === "FONDS"
          ? `${summary.hero} ${summary.heroUnit ?? ""}: la dernière valeur liquidative connue. Une souscription s'exécute à la prochaine, pas à celle-ci.`
          : o.kind === "ACTIONS" || (o.kind === "MARCHE" && o.instrument === "action")
            ? `${summary.hero} : ce que le dividende rapporte au prix du jour, s'il est maintenu. Le cours, lui, peut monter ou descendre.`
            : dyc.atPar
              ? `${summary.hero} : le taux nominal, parce que la ligne est au pair. Brut, avant impôt, si vous gardez le titre jusqu'à l'échéance.`
              : `${summary.hero} : ce que rapporte la ligne chaque année si vous êtes servi au prix affiché et gardez le titre jusqu'à l'échéance. Brut, avant impôt.`,
    },
    { target: "kpis", title: "Chaque chiffre s'explique", text: "Touchez une carte : d'où vient le chiffre, ligne par ligne, avec la leçon de deux minutes qui va avec. Les bulles « i » de la page font pareil pour chaque mot ; tout est réuni sous Info, avec un simulateur et la page Aide." },
    { target: "status", title: "Où en est la ligne", text: summary.countdown ? `Clôture dans ${summary.countdown} : après cette limite, plus de soumission possible. Une intention se déclare avant.` : `${summary.status}. Le statut dit ce que vous pouvez faire : souscrire, passer un ordre, ou seulement poser une question.` },
    ...(relatedNews > 0 ? [{ target: "news", title: "Ce qui s'est dit sur cette ligne", text: "Communiqués, bulletins, avis : le desk relie ici les publications qui concernent cette ligne, avec deux lignes sur ce que cela change. L'original est à un clic." }] : []),
    { target: "action", title: "Agir en trois étapes", text: "Montant, coordonnées, récapitulatif. Le desk vous rappelle avant de transmettre : rien n'est débité sans votre confirmation." },
  ];

  return (
    <div className={styles.page}>
      <FichePanes className={styles.main}>
        <Link href="/" className={styles.back}>
          ← {t("Toutes les offres")}
        </Link>
        <div className={styles.head}>
          <div className={styles.crumb}>
            {t(SEGMENT_LABEL[familySegment(offerFamily(o))])}
            {o.isExample && <span className="tag-ex">{t("exemple")}</span>}
          </div>
          <div className={styles.headRow}>
            <LineIdentity o={o} s={summary} size="xl" as="h1" />
            <div className={styles.headActions}>
              <span className={`pill ${st}`} data-coach="status">{t(statusLabel(o, st))}</span>
              <div className={styles.headBtns}>
                <a className="btn sm" href={`/offres/${o.id}/fiche`} target="_blank" rel="noreferrer">
                  {t("Fiche PDF")}
                </a>
                <Link className="btn sm ghost" href={`/comparer?a=${o.id}`}>
                  {t("Comparer")}
                </Link>
                <WatchButton offerId={o.id} initial={watching} signedIn={Boolean(session)} />
                <CoachMarks id="fiche" replayLabel={t("Comment lire cette fiche ?")} stops={coachStops.map((c) => ({ ...c, title: t(c.title), text: t(c.text) }))} />
              </div>
            </div>
          </div>
        </div>

        <FicheSegments />
        <section className={styles.sec} data-pane="essentiel">
          <div style={{ marginBottom: 10 }}>
            <span className={`stamp ${stampPending ? "pending" : ""}`}>{t(stamp)}</span>
          </div>
          <Kpis o={o} />
          <p className={styles.blurb}>{t(o.blurb)}</p>
          {o.resultLine && <div className={styles.result}>{o.resultLine}</div>}
        </section>

        <section className={styles.sec} data-pane="chiffres">
          <Reference o={o} />
          <p className={styles.note}>
            {t("Chiffres de référence au prix publié. Pour votre montant, indiquez-le dans votre intention ; le desk vous confirme le décaissement exact. Pour explorer d'autres prix ou durées, utilisez le")}{" "}
            <Link href="/info#simulateur">{t("simulateur")}</Link>.
          </p>
        </section>

        {navs.length > 0 && (
          <section className={styles.sec} data-pane="chiffres">
            <h3>{t("Valeurs liquidatives publiées")}</h3>
            <NavHistory navs={navs} />
            <p className={styles.note}>{t("VL communiquées par la société de gestion et reprises du Bulletin Officiel de la Cote de la BVMAC, sans retraitement.")} {o.fund?.distributed ? "" : t("Ce fonds est présenté à titre d'information : Purpose Capital ne le distribue pas encore — dites-nous si vous souhaitez y souscrire, nous organisons la relation avec la société de gestion.")}</p>
          </section>
        )}
        {company && (
          <section className={styles.sec} data-pane="docs">
            <h3>{t("La société")}</h3>
            <p className={styles.note}>
              {t(company.activity)}{" "}
              <Link href={`/societes/${company.mnemo.toLowerCase()}`}>{t("Analyse complète : comptes certifiés, ratios, dividendes, rapport PDF")} →</Link>
            </p>
          </section>
        )}
        {issuer && (
          <section className={styles.sec} data-pane="docs">
            <h3>{t("L'émetteur")}</h3>
            <p className={styles.note}>
              {t(issuer.activity)}{" "}
              <Link href={`/emetteurs/${issuer.slug}`}>{t("Profil de l'émetteur : comptes publiés, actionnariat, autres emprunts")} →</Link>
            </p>
          </section>
        )}
        {quotes.length > 0 && (
          <section className={styles.sec} data-pane="chiffres">
            <h3>{t("Au bulletin de la BVMAC")}</h3>
            <QuoteHistory quotes={quotes} />
            <p className={styles.note}>{t("Cours de clôture publiés par la Bourse des Valeurs Mobilières de l'Afrique Centrale, repris chaque jour de bourse sans retraitement. Ils ne préjugent pas du prix auquel votre ordre sera exécuté.")}</p>
          </section>
        )}

        {(() => {
          // Free facts declared by the product type and filled by the desk.
          const extras = typeOf(o).fields.filter((f) => o.extra?.[f.key]);
          return extras.length > 0 ? (
            <section className={styles.sec} data-pane="essentiel">
              <h3>{t("Caractéristiques")}</h3>
              <div className={styles.tl}>
                {extras.map((f) => (
                  <div key={f.key}>
                    <span>{f.label}</span>
                    <b>{o.extra![f.key]}</b>
                  </div>
                ))}
              </div>
            </section>
          ) : null;
        })()}
        <section className={styles.sec} data-pane="essentiel">
          <h3>{t(o.kind === "FONDS" ? "Souscription, rachat et règlement" : o.kind === "MARCHE" ? "Cotation et règlement" : "Calendrier de l'opération")}</h3>
          <div className={styles.tl}>
            {timeline.map(([k, v]) => (
              <div key={k}>
                <span>{t(k)}</span>
                <b>{t(v)}</b>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sec} data-pane="docs">
          <h3>{t("Documents")}</h3>
          <div className={styles.docs}>
            {o.documents.length === 0 && <span className="muted" style={{ fontSize: ".82rem" }}>{t("Documents archivés.")}</span>}
            {o.documents.map((d) =>
              d.url ? (
                <a key={d.name} className={`${styles.doc} ${styles.docLink}`} href={d.url} target="_blank" rel="noreferrer">
                  <span className="mono">{/\.(png|jpe?g)$/i.test(d.url) ? "IMG" : "PDF"}</span>
                  {t(d.name)}
                  <span className={styles.docMeta}>{d.meta} ↗</span>
                </a>
              ) : (
                <div key={d.name} className={styles.doc} title={t("Sur demande au desk")}>
                  <span className="mono">PDF</span>
                  {t(d.name)}
                  <span className={styles.docMeta}>{d.meta} · {t("sur demande")}</span>
                </div>
              ),
            )}
          </div>
        </section>

        <RelatedNews kind="offer" keyOf={o.id} className={styles.sec} />

        <section className={styles.sec} data-pane="risques">
          <h3>{t("À garder en tête")}</h3>
          <ul className={styles.risks}>
            {risks.map(([rt, d]) => (
              <li key={rt}>
                <b>{t(rt)}</b> {t(d)}
              </li>
            ))}
          </ul>
        </section>
      </FichePanes>

      <aside className={styles.side} id="intention" data-coach="action">
        <IntentForm offer={o} types={types} initialType={initial} initialAmount={qty} held={held} priceText={priceText} past={past} signedIn={Boolean(session)} tier={o.kind === "FONDS" && session?.kycStatus === "approuve" ? 2 : (session?.tier ?? 0)} phone={session?.phone ?? ""} email={session?.email ?? ""} name={session?.name ?? ""} />
        {o.maturityOn && !past && (
          <div className={styles.sideNote}>
            {t("Durée réelle")} <b>{tenorText(o.settleOn, o.maturityOn)}</b> · {t("règlement le")} {fmtDate(o.settleOn)} · {o.sizeLabel ?? ""}
          </div>
        )}
      </aside>
      {!past && <StickyAction label={t(o.kind === "FONDS" ? "Souscrire ou racheter" : o.kind === "MARCHE" ? "Passer un ordre" : "Déclarer une intention")} targetId="intention" secondaryHref={`/comparer?a=${o.id}`} secondaryLabel={t("Comparer")} />}
    </div>
  );
}
