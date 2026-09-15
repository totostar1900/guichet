import Link from "next/link";
import { notFound } from "next/navigation";
import { FlowsChart } from "@/components/FlowsChart";
import { NavHistory } from "@/components/NavHistory";
import { QuoteHistory } from "@/components/QuoteHistory";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { companyByIsin } from "@/data/companies";
import { IntentForm } from "@/components/IntentForm";
import { LineIdentity } from "@/components/LineIdentity";
import { summarize } from "@/lib/domain/summary";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus, FAMILY_SEGMENT, headlineYield, isPast, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import type { IntentType, Offer } from "@/lib/domain/types";
import { bondCalc, btaAmountForBonds, btaCalc, daysBetween, firstCouponDate, tenorText } from "@/lib/finance";
import { positionsFrom } from "@/lib/positions";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string; qty?: string }> };

export async function generateMetadata({ params }: Props) {
  const o = await repo().getOffer((await params).id);
  return { title: o ? o.title : "Offre" };
}

function Kpis({ o }: { o: Offer }) {
  const y = headlineYield(o);
  const items: [string, string, boolean][] =
    o.kind === "OTA" || o.kind === "APE"
      ? [
          [`Rendement ${o.servedPricePct ? "servi" : "visé"}`, y != null ? fmtPct(y, 2) : "—", true],
          [`Prix ${o.servedPricePct ? "servi" : "Purpose"}`, fmtPrice(o.servedPricePct ?? o.pricePct ?? 100), false],
          ["Coupon annuel", fmtPct(o.couponRate ?? 0, 2), false],
        ]
      : o.kind === "FONDS" && o.fund
        ? [
            ["Valeur liquidative (FCFA)", fmt(o.fund.nav), true],
            ["Depuis l'origine", `${o.fund.perfSinceInceptionPct > 0 ? "+" : ""}${fmtPct(o.fund.perfSinceInceptionPct, 2)}`, false],
            ["Catégorie", `${FUND_CATEGORY_LABEL[o.fund.category]} · ${FUND_FREQUENCY_LABEL[o.fund.frequency]}`, false],
          ]
      : o.kind === "MARCHE"
        ? [
            [o.instrument === "obligation" ? "Dernier cours (% nominal)" : "Dernier cours (FCFA)", o.lastPrice != null ? (o.instrument === "obligation" ? fmtPrice(o.lastPrice) : fmt(o.lastPrice)) : "—", true],
            ["Acheteur / vendeur", o.bid != null && o.ask != null ? `${o.instrument === "obligation" ? fmtPrice(o.bid) : fmt(o.bid)} / ${o.instrument === "obligation" ? fmtPrice(o.ask) : fmt(o.ask)}` : "—", false],
            [o.instrument === "obligation" ? "Rendement au cours vendeur" : "Rendement du dividende", y != null ? fmtPct(y, 2) : "—", false],
          ]
      : o.kind === "BTA"
        ? [
            ["Rendement actuariel", y != null ? fmtPct(y, 2) : "—", true],
            ["Taux précompté", fmtPct(o.precountRate ?? 0, 2), false],
            ["Durée", o.maturityOn ? `${daysBetween(o.settleOn, o.maturityOn)} jours` : "—", false],
          ]
        : o.kind === "ACTIONS"
          ? [
              ["Prix de souscription", fmt(o.pricePerShare ?? 0), true],
              ["Dernier cours", o.lastPrice ? fmt(o.lastPrice) : "—", false],
              ["Rendement du dividende", y != null ? fmtPct(y, 2) : "—", false],
            ]
          : [
              ["Prix de rachat", "100 %", true],
              ["Échéance initiale", o.maturityOn ? fmtDate(o.maturityOn) : "—", false],
              ["Volume racheté", o.sizeLabel ?? "—", false],
            ];
  return (
    <div className={styles.kpis}>
      {items.map(([k, v, gold]) => (
        <div key={k} className={`${styles.kpi} ${gold ? styles.gold : ""}`}>
          <span>{k}</span>
          <b className="num">{v}</b>
        </div>
      ))}
    </div>
  );
}

/** Read-only reference block at the published price. */
function Reference({ o }: { o: Offer }) {
  if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn) {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn, commissionPct: o.commissionPct }, 10_000_000, price);
    return (
      <>
        <h3>Pour 10 000 000 FCFA de nominal, au prix {o.servedPricePct ? "servi" : "Purpose"}</h3>
        <div className="out">
          <div>Titres (nominal {fmt(o.nominal)})</div>
          <div>{fmt(r.titles)}</div>
          <div>Prix {fmtPrice(price)}</div>
          <div>{fmt(r.titles * r.pricePerTitle)}</div>
          <div>Coupon couru ({r.accruedDays} jours)</div>
          <div>{r.accruedDays ? fmt(r.accrued) : "néant, ligne nouvelle"}</div>
          <div className="tot">Décaissement le {fmtDate(o.settleOn, false)}</div>
          <div>{fmt(r.outlay)} FCFA</div>
          <div>Commission {fmtPct(o.commissionPct, 2)}</div>
          <div>{fmt(r.commission)}</div>
          <div>Gain net hors commission, jusqu&apos;au terme</div>
          <div>{fmt(r.gain)}</div>
          <div className="hl">Rendement actuariel brut</div>
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
        <h3>Pour 10 bons de {fmt(o.nominal)} FCFA</h3>
        <div className="out">
          <div>Bons</div>
          <div>{fmt(r.n)}</div>
          <div>Prix d&apos;achat par bon</div>
          <div>{fmt(r.pricePerBond)}</div>
          <div className="tot">Décaissement le {fmtDate(o.settleOn, false)}</div>
          <div>{fmt(r.outlay)} FCFA</div>
          <div>Remboursé le {fmtDate(o.maturityOn, false)}</div>
          <div>{fmt(r.redemption)}</div>
          <div>Intérêt (précompté)</div>
          <div>{fmt(r.gain)}</div>
          <div className="hl">Rendement actuariel</div>
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
        <h3>Pour {fmt(amount)} FCFA à la dernière VL</h3>
        <div className="out">
          <div>Droits d&apos;entrée {fmtPct(f.entryFeePct, 2)}</div>
          <div>{fmt(amount - net)}</div>
          <div>Investi dans le fonds</div>
          <div>{fmt(net)}</div>
          <div className="tot">Parts (VL {fmt(f.nav)} du {fmtDate(f.navDate, false)})</div>
          <div>≈ {units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</div>
          <div>Droits de sortie</div>
          <div>{fmtPct(f.exitFeePct, 2)}</div>
        </div>
      </>
    );
  }
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    const ref = o.ask ?? o.lastPrice ?? 0;
    const n = isBond ? 1000 : 100;
    if (isBond && o.couponRate != null && o.maturityOn) {
      const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn, commissionPct: o.commissionPct }, n * o.nominal, ref);
      return (
        <>
          <h3>Pour {fmt(n)} titres au cours vendeur</h3>
          <div className="out">
            <div>Prix {fmtPrice(ref)}</div>
            <div>{fmt(r.titles * r.pricePerTitle)}</div>
            <div>Coupon couru ({r.accruedDays} jours)</div>
            <div>{fmt(r.accrued)}</div>
            <div className="tot">Décaissement (règlement T+{o.settlementDays ?? 3})</div>
            <div>{fmt(r.outlay)} FCFA</div>
            <div>Commission {fmtPct(o.commissionPct, 2)}</div>
            <div>{fmt(r.commission)}</div>
            <div className="hl">Rendement actuariel brut à ce cours</div>
            <div>{fmtPct(r.irr, 2)}</div>
          </div>
          <FlowsChart r={r} settleOn={o.settleOn} />
        </>
      );
    }
    return (
      <>
        <h3>Pour {n} actions au cours vendeur</h3>
        <div className="out">
          <div>Cours vendeur</div>
          <div>{fmt(ref)} FCFA</div>
          <div className="tot">Montant</div>
          <div>{fmt(n * ref)} FCFA</div>
          <div>Commission {fmtPct(o.commissionPct, 2)}</div>
          <div>{fmt((n * ref * o.commissionPct) / 100)}</div>
          {o.dividendPerShare ? (
            <>
              <div>Dividende annuel attendu</div>
              <div>{fmt(n * o.dividendPerShare)}</div>
            </>
          ) : null}
          <div className="hl">Total à décaisser</div>
          <div>{fmt(n * ref * (1 + o.commissionPct / 100))} FCFA</div>
        </div>
      </>
    );
  }
  if (o.kind === "ACTIONS" && o.pricePerShare) {
    const n = 100;
    return (
      <>
        <h3>Pour {n} actions</h3>
        <div className="out">
          <div>Actions</div>
          <div>{n}</div>
          <div className="tot">Montant à libérer</div>
          <div>{fmt(n * o.pricePerShare)} FCFA</div>
          <div>Dividende attendu ({fmt(o.dividendPerShare ?? 0)} / action)</div>
          <div>{fmt(n * (o.dividendPerShare ?? 0))}</div>
          {o.lastPrice && (
            <>
              <div>Valeur au dernier cours ({fmt(o.lastPrice)})</div>
              <div>{fmt(n * o.lastPrice)}</div>
              <div className="hl">Plus-value latente au cours du {o.lastPriceOn ? fmtDate(o.lastPriceOn, false) : "—"}</div>
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
      <h3>Pour {n} titres cédés</h3>
      <div className="out">
        <div>Titres cédés</div>
        <div>{n}</div>
        <div className="tot">Produit de cession à 100 %</div>
        <div>{fmt(proceeds)} FCFA</div>
        <div>Coupon couru</div>
        <div>réglé par le Trésor</div>
        <div>Commission {fmtPct(o.commissionPct, 2)}</div>
        <div>{fmt((proceeds * o.commissionPct) / 100)}</div>
        <div className="hl">Encaissement le {fmtDate(o.settleOn, false)}</div>
        <div>{fmt(proceeds * (1 - o.commissionPct / 100))}</div>
      </div>
    </>
  );
}

export default async function OfferPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [o, session] = await Promise.all([repo().getOffer(id), getSession()]);
  if (!o) notFound();
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

  const risks =
    o.kind === "FONDS"
      ? [
          ["Valeur liquidative inconnue à l'ordre.", "Une souscription ou un rachat s'exécute à la prochaine VL calculée par la société de gestion, pas à celle affichée ; le nombre de parts n'est connu qu'après centralisation."],
          ["Performance non garantie.", "Les performances passées ne préjugent pas des performances futures ; la VL peut baisser, y compris pour un fonds monétaire ou obligataire."],
          ["Frais et liquidité.", "Droits d'entrée et de sortie, frais de gestion prélevés dans la VL ; un rachat est réglé après la VL de rachat, selon la périodicité du fonds. Les parts sont inscrites à votre nom chez le dépositaire ; Purpose Capital n'est que distributeur."],
        ]
      : o.kind === "MARCHE"
      ? [
          ["Prix d'exécution.", "Le cours indiqué est le dernier connu ; votre ordre s'exécute au prix du marché ou à votre limite, en tout ou partie, selon la contrepartie disponible."],
          ["Liquidité.", "Le marché secondaire régional est étroit : un ordre peut rester non exécuté plusieurs séances."],
          ["Perte en capital.", "La valeur des titres varie ; céder avant l'échéance peut dégager une perte."],
        ]
      : o.kind === "ACTIONS"
      ? [
          ["Volatilité et liquidité.", "Le cours dépend de l'offre et de la demande sur un compartiment actions encore étroit ; la BVMAC borne les variations quotidiennes."],
          ["Perte en capital.", "Comme tout actionnaire, l'investisseur peut perdre tout ou partie de sa mise."],
          ["Dividende non garanti.", "Le dividende dépend des résultats et de la décision de l'assemblée."],
        ]
      : [
          ["Crédit.", "L'émetteur est un État de la CEMAC ; coupons et capital dépendent de sa capacité à honorer sa dette."],
          ["Allocation.", "Prix et volumes servis sont arrêtés par le Trésor : une soumission peut être servie à un autre prix, en partie, ou pas du tout."],
          ["Liquidité.", "Conservé jusqu'au terme, le titre délivre le rendement calculé ; cédé avant, il se négocie au prix d'un secondaire encore étroit."],
        ];

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Link href="/" className={styles.back}>
          ← Toutes les offres
        </Link>
        <div className={styles.head}>
          <div className={styles.crumb}>
            {SEGMENT_LABEL[FAMILY_SEGMENT[offerFamily(o)]]}
            {o.isExample && <span className="tag-ex">exemple</span>}
          </div>
          <div className={styles.headRow}>
            <LineIdentity o={o} s={summary} size="xl" as="h1" />
            <span className={`pill ${st}`}>{statusLabel(o, st)}</span>
          </div>
        </div>

        <section className={styles.sec}>
          <div style={{ marginBottom: 10 }}>
            <span className={`stamp ${stampPending ? "pending" : ""}`}>{stamp}</span>
          </div>
          <Kpis o={o} />
          <p className={styles.blurb}>{o.blurb}</p>
          {o.resultLine && <div className={styles.result}>{o.resultLine}</div>}
        </section>

        <section className={styles.sec}>
          <Reference o={o} />
          <p className={styles.note}>
            Chiffres de référence au prix publié. Pour votre montant, indiquez-le dans votre intention ; le desk vous confirme le décaissement exact. Pour explorer d&apos;autres prix ou durées, utilisez le{" "}
            <Link href="/simulateur">simulateur</Link>.
          </p>
        </section>

        {navs.length > 0 && (
          <section className={styles.sec}>
            <h3>Valeurs liquidatives publiées</h3>
            <NavHistory navs={navs} />
            <p className={styles.note}>VL communiquées par la société de gestion et reprises du Bulletin Officiel de la Cote de la BVMAC, sans retraitement. {o.fund?.distributed ? "" : "Ce fonds est présenté à titre d'information : Purpose Capital ne le distribue pas encore — dites-nous si vous souhaitez y souscrire, nous organisons la relation avec la société de gestion."}</p>
          </section>
        )}
        {o.kind === "MARCHE" && o.instrument === "action" && companyByIsin(o.isin) && (
          <section className={styles.sec}>
            <h3>La société</h3>
            <p className={styles.note}>
              {companyByIsin(o.isin)!.activity}{" "}
              <Link href={`/societes/${companyByIsin(o.isin)!.mnemo.toLowerCase()}`}>Analyse complète : comptes certifiés, ratios, dividendes, rapport PDF →</Link>
            </p>
          </section>
        )}
        {quotes.length > 0 && (
          <section className={styles.sec}>
            <h3>Au bulletin de la BVMAC</h3>
            <QuoteHistory quotes={quotes} />
            <p className={styles.note}>Cours de clôture publiés par la Bourse des Valeurs Mobilières de l&apos;Afrique Centrale, repris chaque jour de bourse sans retraitement. Ils ne préjugent pas du prix auquel votre ordre sera exécuté.</p>
          </section>
        )}

        <section className={styles.sec}>
          <h3>Calendrier</h3>
          <div className={styles.tl}>
            {timeline.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sec}>
          <h3>Documents</h3>
          <div className={styles.docs}>
            {o.documents.length === 0 && <span className="muted" style={{ fontSize: ".82rem" }}>Documents archivés.</span>}
            {o.documents.map((d) =>
              d.url ? (
                <a key={d.name} className={`${styles.doc} ${styles.docLink}`} href={d.url} target="_blank" rel="noreferrer">
                  <span className="mono">{/\.(png|jpe?g)$/i.test(d.url) ? "IMG" : "PDF"}</span>
                  {d.name}
                  <span className={styles.docMeta}>{d.meta} ↗</span>
                </a>
              ) : (
                <div key={d.name} className={styles.doc} title="Sur demande au desk">
                  <span className="mono">PDF</span>
                  {d.name}
                  <span className={styles.docMeta}>{d.meta} · sur demande</span>
                </div>
              ),
            )}
          </div>
        </section>

        <section className={styles.sec}>
          <h3>À garder en tête</h3>
          <ul className={styles.risks}>
            {risks.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b> {d}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className={styles.side}>
        <IntentForm offer={o} types={types} initialType={initial} initialAmount={qty} held={held} priceText={priceText} past={past} signedIn={Boolean(session)} tier={o.kind === "FONDS" && session?.kycStatus === "approuve" ? 2 : (session?.tier ?? 0)} phone={session?.phone ?? ""} email={session?.email ?? ""} name={session?.name ?? ""} />
        {o.maturityOn && !past && (
          <div className={styles.sideNote}>
            Durée réelle <b>{tenorText(o.settleOn, o.maturityOn)}</b> · règlement le {fmtDate(o.settleOn)} · {o.sizeLabel ?? ""}
          </div>
        )}
      </aside>
    </div>
  );
}
