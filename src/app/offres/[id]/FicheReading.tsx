import Link from "next/link";
import { RelatedNews } from "@/components/RelatedNews";
import { FlowsChart } from "@/components/FlowsChart";
import { NavHistory } from "@/components/NavHistory";
import { QuoteHistory } from "@/components/QuoteHistory";
import { companyByIsin, issuerByIsin, loadIssuerRegistry } from "@/lib/reference";
import { FicheSegments } from "@/components/mobile/FichePanes";
import { Kpis } from "./Kpis";
import { Amount } from "@/components/Amount";
import { RefTotals } from "@/components/RefTotals";
import { repo } from "@/lib/data";
import { displayStatus, displayYield, marketAmortInput, marketBondInput } from "@/lib/domain/status";
import { summarize } from "@/lib/domain/summary";
import { bondTerms } from "@/lib/domain/status";
import { amortCalc } from "@/lib/finance";
import type { Offer } from "@/lib/domain/types";
import { bondCalc, btaAmountForBonds, btaCalc, daysBetween, firstCouponDate } from "@/lib/finance";
import { typeOf } from "@/lib/registry";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";
import { IssuerCard } from "./IssuerCard";
import { CrossSignal } from "@/components/CrossSignal";
import { facingSignal } from "@/lib/domain/crossing";
import { loadSignalPolicy } from "@/lib/policy";
import { getSession } from "@/lib/auth";
import { issuerKey, resolveIssuer } from "@/data/issuer-registry";

/**
 * Ce que la fiche donne à lire, et rien d'autre.
 *
 * La fiche client et la fiche du desk montrent les mêmes chiffres : elles
 * lisent la même ligne, au même instant, et il n'y aurait aucun sens à ce
 * qu'elles ne disent pas la même chose. Ce fichier est donc le seul endroit
 * où ces sections existent ; les deux pages l'appellent, aucune ne le recopie.
 *
 * Ce qui les sépare reste chez elles : le client garde le formulaire
 * d'intention, le bouton de suivi, le partage et la visite guidée ; le desk
 * garde les versions, le cycle de vie et la piste d'audit. Le desk ne peut
 * rien déclarer depuis cette lecture : c'est une lecture.
 *
 * « mode » ne change que les liens qui sortent : au desk, « Comparer » mène à
 * la page du desk, et les renvois vers le Guide ne sont pas des liens, le
 * Guide n'étant pas servi sur ce domaine.
 */
export type FicheMode = "client" | "desk";

/**
 * Read-only reference block at the published price.
 *
 * Le mode ne sert ici qu'a la taille du dessin : au desk, la page porte aussi
 * le cycle de vie, les pieces et la piste d'audit, et le graphique se range.
 */
async function Reference({ o, mode = "client" }: { o: Offer; mode?: FicheMode }) {
  const t = await getT();
  const chart = mode === "desk" ? 0.6 : 1;
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
        </div>
        <RefTotals
          figures={[
            { label: t("À décaisser"), value: <Amount value={r.outlay} />, note: t(`règlement le ${fmtDate(o.settleOn, false)}`) },
            { label: t("Encaissé jusqu'au terme"), value: <Amount value={r.outlay + r.gain} />, note: t(`soit ${fmt(r.gain)} de gain brut`) },
          ]}
          rate={{ label: t("Rendement actuariel annuel brut"), value: fmtPct(r.irr, 2), note: t("si la ligne est gardée jusqu'à l'échéance") }}
        />
        <FlowsChart r={r} settleOn={o.settleOn} scale={chart} />
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
        </div>
        <RefTotals
          figures={[
            { label: t("À décaisser"), value: <Amount value={r.outlay} />, note: t(`règlement le ${fmtDate(o.settleOn, false)}`) },
            { label: t("Remboursé"), value: <Amount value={r.redemption} />, note: t(`le ${fmtDate(o.maturityOn, false)} · ${fmt(r.gain)} d'intérêt précompté`) },
          ]}
          rate={{ label: t("Rendement actuariel annuel"), value: fmtPct(r.yieldPct, 2) }}
        />
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

          {f.exitFeePct > 0 && (
            <>
              <div>{t("Frais du fonds à la sortie")}</div>
              <div>{fmtPct(f.exitFeePct, 2)}</div>
            </>
          )}
        </div>
        <RefTotals
          figures={[
            { label: t("Investi dans le fonds"), value: <Amount value={net} />, note: f.entryFeePct > 0 ? t("après {p} de droits d'entrée", { p: fmtPct(f.entryFeePct, 2) }) : t("sans droits d'entrée") },
            { label: t("Parts obtenues"), value: <span className="num">≈ {units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</span>, note: t(`VL ${fmt(f.nav)} du ${fmtDate(f.navDate, false)}`) },
          ]}
        />
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
          </div>
          <RefTotals
            figures={[
              { label: t("À décaisser"), value: <Amount value={r.outlay} />, note: t("règlement T+{n}", { n: o.settlementDays ?? 3 }) },
              { label: t("Encaissé jusqu'au terme"), value: <Amount value={r.outlay + r.gain} />, note: t(`soit ${fmt(r.gain)} de gain brut`) },
            ]}
            rate={{ label: t("Rendement actuariel annuel brut à ce cours"), value: fmtPct(r.irr, 2) }}
          />
          <FlowsChart r={r} settleOn={settleOn} scale={chart} />
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
        </div>
        <RefTotals
          figures={[
            { label: t("À décaisser"), value: <Amount value={n * ref} />, note: t("{n} actions au cours vendeur", { n: fmt(n) }) },
            ...(o.dividendPerShare
              ? [{ label: t("Dividende annuel attendu"), value: <Amount value={n * o.dividendPerShare} />, note: t("s'il est maintenu") }]
              : []),
          ]}
        />
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

async function latestBta(): Promise<{ label: string; pct: number } | undefined> {
  const all = (await repo().listOffers()).filter((x) => x.kind === "BTA" && !x.hidden && x.precountRate != null && x.maturityOn && x.settleOn);
  const last = all.sort((p, q) => (q.pricedAt ?? "").localeCompare(p.pricedAt ?? ""))[0];
  if (!last) return undefined;
  const y = displayYield(last).pct;
  if (y == null) return undefined;
  const weeks = Math.round(daysBetween(last.settleOn!, last.maturityOn!) / 7);
  return { label: `BTA ${weeks} sem.`, pct: y };
}

/**
 * Tout ce que le corps de lecture demande à la base, en une fois.
 *
 * Les deux pages passent par là : si l'une lisait ses chiffres autrement, les
 * deux fiches finiraient par diverger sans que rien ne le signale.
 */
export async function loadFiche(o: Offer) {
  // L’état de la ligne sert au calendrier : il se relit ici plutôt que de
  // voyager depuis la page, pour que les deux fiches ne puissent pas en
  // recevoir deux versions différentes.
  const st = displayStatus(o, new Date());
  // Ce que la fiche demande, tout en même temps.
  //
  // Ces lectures ne dépendent pas les unes des autres, et pourtant chacune
  // attendait la précédente : six allers-retours en file, une seconde et demie
  // au bout. C'est ce que le lecteur attendait en glissant d'une fiche à la
  // suivante, la page étant rendue à chaque requête.
  //
  // Le registre des fiches publiées part avec les autres, et « resolveIssuer »
  // ne le lit qu'une fois tout revenu : la page ne dépend donc toujours pas de
  // l'ordre dans lequel Next rend la mise en page et elle. Les autres lignes de
  // l'émetteur se filtrent après coup, sur une table déjà lue : le dépôt se
  // souvient de ses lectures pendant la requête, donc la demander ici ne la
  // relit pas pour le taux BTA de référence, qui la demande aussi.
  const r = repo();
  // Le signal d'appariement part avec les autres lectures, et il ne lit rien du
  // tout sur une ligne qui n'est pas cotée : le carnet n'existe que sur la cote.
  const wantsFacing = o.kind === "MARCHE" && !o.hidden;
  const [, offers, company, issuer, quotes, navs, btaBenchmark, signalPolicy, session] = await Promise.all([
    loadIssuerRegistry(),
    r.listOffers(),
    o.kind === "MARCHE" && o.instrument === "action" ? companyByIsin(o.isin) : undefined,
    o.kind === "MARCHE" && o.instrument === "obligation" ? issuerByIsin(o.isin) : undefined,
    o.kind === "MARCHE" && o.priceSource === "boc" ? r.listQuotes(o.isin, 60) : [],
    o.kind === "FONDS" && o.fund ? r.listFundNavs(o.fund.key, 2000) : [],
    // The reference rate on a fund's charts: the most recent BTA the desk published (a client knows that rate).
    o.kind === "FONDS" ? latestBta() : undefined,
    wantsFacing ? loadSignalPolicy() : undefined,
    wantsFacing ? getSession() : undefined,
  ]);
  const profile = resolveIssuer(o);
  const others = profile ? offers.filter((x) => x.id !== o.id && !x.hidden && issuerKey(x) === profile.name).map((x) => ({ o: x, s: summarize(x, new Date()) })).slice(0, 8) : [];

  // Ce qu'un lecteur connecté apprend du carnet : une présence, jamais une
  // personne. Déconnecté, il n'apprend rien : le carnet n'est pas une vitrine.
  //
  // Le carnet ne se lit qu'une fois les deux conditions réunies. Tant que la
  // politique est fermée, et c'est l'état par défaut, la fiche ne touche pas aux
  // intentions du tout : la lecture groupée au-dessus ne porte que la politique
  // et la session, qui sont l'une et l'autre gratuites, déjà demandées ailleurs
  // dans la même requête. Ouverte, la lecture qui s'ajoute l'est aussi : le
  // contexte de l'intention liste déjà les intentions pour un lecteur connecté,
  // et le dépôt se souvient de ses lectures pendant la requête.
  const facing = signalPolicy?.tell && session ? facingSignal(await r.listIntents(), o, signalPolicy, { exceptClientId: session.userId }) : [];

  const stampPending = o.kind !== "MARCHE" && Boolean(o.priceNote || o.rateNote);
  const stamp = o.kind === "FONDS" && o.fund ? `VL du ${fmtDate(o.fund.navDate)} publiée par ${o.fund.manager} · Bulletin Officiel de la Cote${navs[0] ? ` n° ${navs[0].bulletinNo}` : ""}` : o.kind === "MARCHE" ? (o.priceSource === "boc" && quotes[0] ? `Clôture BVMAC · Bulletin Officiel de la Cote n° ${quotes[0].bulletinNo} du ${fmtDate(quotes[0].sessionDate)}` : `Cours saisi par le desk · ${o.pricedAt ? fmtDateTime(o.pricedAt) : "—"}`) : o.servedPricePct ? "Prix servi à l'adjudication" : stampPending ? "Indicatif : prix à fixer par le desk" : `Prix fixé par le desk · ${o.pricedAt ? fmtDateTime(o.pricedAt) : "—"} · v${o.version}`;

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
  return { profile, others, company, issuer, quotes, navs, btaBenchmark, stampPending, stamp, timeline, facing };
}

export type FicheData = Awaited<ReturnType<typeof loadFiche>>;

/** Les sections de lecture, dans l'ordre où la fiche les montre. */
export async function FicheReading({ o, data, mode = "client" }: { o: Offer; data: FicheData; mode?: FicheMode }) {
  const t = await getT();
  const { profile, others, company, issuer, quotes, navs, btaBenchmark, stampPending, stamp, timeline, facing } = data;
  const base = mode === "desk" ? "/desk" : "";
  return (
    <>
        <FicheSegments />
        <section className={styles.sec} data-pane="essentiel">
          <div style={{ marginBottom: 10 }}>
            <span className={`stamp ${stampPending ? "pending" : ""}`}>{t(stamp)}</span>
          </div>
          <Kpis o={o} base={base} />
          <p className={styles.blurb}>{t(o.blurb)}</p>
          {o.resultLine && <div className={styles.result}>{o.resultLine}</div>}
          <CrossSignal o={o} facing={facing} />
          <p className={styles.note}>
            {t("Les risques d'une ligne se lisent dans le Guide :")} <Link href="/info/les-quatre-risques">{t("Les quatre risques, et ce qu'on peut faire")}</Link>.
          </p>
        </section>

        <section className={styles.sec} data-pane="chiffres">
          <Reference o={o} mode={mode} />
          <p className={styles.note}>
            {t("Chiffres de référence au prix publié. Pour votre montant, indiquez-le dans votre intention ; le desk vous confirme le décaissement exact. Pour explorer d'autres prix ou durées, utilisez le")}{" "}
            <Link href="/info#simulateur">{t("simulateur")}</Link>.
          </p>
        </section>

        {navs.length > 0 && (
          <section className={styles.sec} data-pane="chiffres">
            <h3>{t("Valeurs liquidatives publiées")}</h3>
            <NavHistory navs={navs} benchmark={btaBenchmark} narrow={mode === "desk"} />
            <p className={styles.note}>{t("VL communiquées par la société de gestion et reprises du Bulletin Officiel de la Cote de la BVMAC, sans retraitement.")} {o.fund?.distributed ? "" : t("Ce fonds est présenté à titre d'information : Purpose Capital ne le distribue pas encore : dites-nous si vous souhaitez y souscrire, nous organisons la relation avec la société de gestion.")}</p>
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
            {o.documents.map((d, n) => {
              const href = d.url ?? (d.fileKey ? `/offres/${o.id}/doc/${n}` : undefined);
              if (!href) return null;
              return (
                <a key={`${d.name}-${n}`} className={`${styles.doc} ${styles.docLink}`} href={href} target="_blank" rel="noreferrer">
                  <span className="mono">{/\.(png|jpe?g)$/i.test(d.url ?? d.mimeType ?? "") || /image\//.test(d.mimeType ?? "") ? "IMG" : "PDF"}</span>
                  {t(d.name)}
                  <span className={styles.docMeta}>{d.meta} ↗</span>
                </a>
              );
            })}
          </div>
        </section>

        <RelatedNews kind="offer" keyOf={o.id} className={styles.sec} />

        <section className={styles.sec} data-pane="emetteur">
          <h3>{t("L'émetteur")}</h3>
          <IssuerCard profile={profile} o={o} others={others} company={company} issuer={issuer} />
        </section>
    </>
  );
}
