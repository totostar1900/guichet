"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import type { LessonWidget as Kind } from "@/data/lessons";
import { ActorsMap, FundCategories, Lifeline, OrderPath } from "@/components/lessons/Diagrams";
import { bondCalc, btaCalc } from "@/lib/finance";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./page.module.css";

/** What the server hands the widget: a real line, reduced to the numbers the lesson plays with. */
export interface Live {
  title: string;
  href?: string;
  nominal?: number;
  couponRate?: number;
  settleOn?: string;
  maturityOn?: string;
  lastCouponOn?: string | null;
  pricePct?: number;
  precountRate?: number;
  yieldPct?: number;
  pricePerShare?: number;
  dividendPerShare?: number;
  eps?: number;
  nav?: number;
  entryFeePct?: number;
  exampleNote?: string;
  /** For the index lesson: the last level, the horizons, the weights of the shares. */
  index?: { level: number; date: string; day?: number; month?: number; ytd?: number; year?: number; weights: { mnemo: string; wTotal: number; wFloat: number }[] };
}

const pct = (n: number) => fmtPct(n, 2);

function LiveLine({ live }: { live: Live }) {
  const t = useT();
  return (
    <div className={styles.live}>
      <b>{t("Sur une vraie ligne du Guichet")}</b>
      {live.href ? <a href={live.href}>{live.title}</a> : live.title}
      {live.exampleNote && <small> · {live.exampleNote}</small>}
    </div>
  );
}

function BondPrice({ live }: { live: Live }) {
  const t = useT();
  const [price, setPrice] = useState(live.pricePct ?? 96);
  const input = { nominal: live.nominal ?? 10_000, couponRate: live.couponRate ?? 6, settleOn: live.settleOn ?? "2026-09-17", maturityOn: live.maturityOn ?? "2028-03-31", lastCouponOn: live.lastCouponOn ?? null };
  const r = bondCalc(input, 10_000_000, price);
  const reading = price < 99.95 ? t("Décote de {n} points, récupérée à l'échéance : le rendement dépasse le coupon.", { n: (100 - price).toFixed(1).replace(".", ",") }) : price > 100.05 ? t("Prime de {n} points, perdue à l'échéance : le rendement passe sous le coupon.", { n: (price - 100).toFixed(1).replace(".", ",") }) : t("Au pair : vous payez 100, récupérez 100 ; le rendement est le coupon, {c}.", { c: pct(input.couponRate) });
  return (
    <>
      <LiveLine live={live} />
      <label className={styles.slider}>
        <span>
          {t("Prix payé")} <b>{price.toFixed(1).replace(".", ",")} %</b> {t("du nominal")}
        </span>
        <input type="range" min={90} max={106} step={0.5} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label={t("Prix en pourcentage du nominal")} />
        <span className={styles.ends}>
          <i>90 %</i>
          <i>{t("au pair · 100 %")}</i>
          <i>106 %</i>
        </span>
      </label>
      <div className={styles.pair}>
        <div>
          <span>{t("Coupon nominal")}</span>
          <b>{pct(input.couponRate)}</b>
        </div>
        <div>
          <span>{t("Rendement actuariel annuel")}</span>
          <b className={styles.gold}>{pct(r.irr)}</b>
        </div>
      </div>
      <p className={styles.reading}>
        {reading} {r.accruedDays ? t("Pour 10 000 000 de nominal : décaissement {o} FCFA dont {a} de coupon couru ({d} j).", { o: fmt(r.outlay), a: fmt(r.accrued), d: r.accruedDays }) : t("Pour 10 000 000 de nominal : décaissement {o} FCFA.", { o: fmt(r.outlay) })}
      </p>
    </>
  );
}

function ReadOta({ live }: { live: Live }) {
  const t = useT();
  const items: [string, string, string][] = [
    ["1", "Coupon", `${pct(live.couponRate ?? 6)} par an, calculé sur le nominal`],
    ["2", "Nominal", `${fmt(live.nominal ?? 10_000)} FCFA par titre : ce que l'État rembourse`],
    ["3", "Échéance", live.maturityOn ? fmtDate(live.maturityOn) : "—"],
    ["4", "Prix", live.pricePct != null ? `${live.pricePct} % du nominal : ce que vous payez` : "fixé par le desk"],
    ["5", "Rendement", live.yieldPct != null ? `${pct(live.yieldPct)} brut, si servi à ce prix et gardé jusqu'au bout` : "—"],
  ];
  return (
    <>
      <LiveLine live={live} />
      <ol className={styles.steps}>
        {items.map(([n, k, v]) => (
          <li key={n}>
            <i>{n}</i>
            <span>
              <b>{t(k)}</b>
              {t(v)}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

function BtaRate({ live }: { live: Live }) {
  const t = useT();
  const [rate, setRate] = useState(live.precountRate ?? 5.5);
  const input = { nominal: live.nominal ?? 1_000_000, settleOn: live.settleOn ?? "2026-09-17", maturityOn: live.maturityOn ?? "2027-09-16" };
  const r = btaCalc(input, 1_000_000, rate);
  return (
    <>
      <LiveLine live={live} />
      <label className={styles.slider}>
        <span>
          {t("Taux précompté")} <b>{pct(rate)}</b>
        </span>
        <input type="range" min={3} max={8} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label={t("Taux précompté")} />
        <span className={styles.ends}>
          <i>3 %</i>
          <i>8 %</i>
        </span>
      </label>
      <div className={styles.pair}>
        <div>
          <span>Prix d&apos;un bon de {fmt(input.nominal)}</span>
          <b>{fmt(Math.round(r.pricePerBond))}</b>
        </div>
        <div>
          <span>{t("Rendement actuariel annuel")}</span>
          <b className={styles.gold}>{pct(r.yieldPct)}</b>
        </div>
      </div>
      <p className={styles.reading}>
        {t("Sur {d} jours : vous payez {p}, recevez {n}. Le rendement dépasse le taux précompté parce que l'intérêt est calculé sur le nominal mais vous n'avancez que le prix.", { d: r.days, p: fmt(Math.round(r.pricePerBond)), n: fmt(input.nominal) })}
      </p>
    </>
  );
}

function Tenor({ live }: { live: Live }) {
  const t = useT();
  const settle = live.settleOn ?? "2026-09-17";
  const y = Number(settle.slice(0, 4));
  const base = { nominal: 10_000, couponRate: live.couponRate ?? 6, settleOn: settle, lastCouponOn: null as string | null };
  const price = live.pricePct ?? 96;
  const short = bondCalc({ ...base, maturityOn: `${y + 1}-${settle.slice(5)}` }, 10_000_000, price);
  const long = bondCalc({ ...base, maturityOn: `${y + 5}-${settle.slice(5)}` }, 10_000_000, price);
  return (
    <>
      <LiveLine live={live} />
      <p className={styles.reading}>
        Même coupon ({pct(base.couponRate)}), même prix ({price} %), deux durées :
      </p>
      <div className={styles.pair}>
        <div>
          <span>{t("Échéance dans 1 an")}</span>
          <b className={styles.gold}>{pct(short.irr)}</b>
          <small>{t("la décote pèse sur une seule année")}</small>
        </div>
        <div>
          <span>{t("Échéance dans 5 ans")}</span>
          <b className={styles.gold}>{pct(long.irr)}</b>
          <small>{t("la même décote, étalée sur cinq")}</small>
        </div>
      </div>
    </>
  );
}

function Equity({ live }: { live: Live }) {
  const t = useT();
  const [price, setPrice] = useState(live.pricePerShare ?? 45_000);
  const div = live.dividendPerShare ?? 2_500;
  const eps = live.eps ?? 5_000;
  return (
    <>
      <LiveLine live={live} />
      <label className={styles.slider}>
        <span>
          {t("Cours")} <b>{fmt(price)} FCFA</b>
        </span>
        <input type="range" min={Math.round((live.pricePerShare ?? 45_000) * 0.6)} max={Math.round((live.pricePerShare ?? 45_000) * 1.6)} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label={t("Cours")} />
      </label>
      <div className={styles.pair}>
        <div>
          <span>{t("Rendement du dividende")}</span>
          <b className={styles.gold}>{pct((div / price) * 100)}</b>
          <small>
            {fmt(div)} / {fmt(price)}
          </small>
        </div>
        <div>
          <span>PER</span>
          <b>{(price / eps).toFixed(1).replace(".", ",")}×</b>
          <small>{t(`${fmt(eps)} de bénéfice par action`)}</small>
        </div>
      </div>
      <p className={styles.reading}>{t("Quand le cours monte, le même dividende rapporte moins et vous payez plus d'années de bénéfice.")}</p>
    </>
  );
}

function Fund({ live }: { live: Live }) {
  const t = useT();
  const [amount, setAmount] = useState(1_000_000);
  const nav = live.nav ?? 13_262;
  const fee = live.entryFeePct ?? 0;
  const net = amount * (1 - fee / 100);
  return (
    <>
      <LiveLine live={live} />
      <label className={styles.slider}>
        <span>
          {t("Montant souscrit")} <b>{fmt(amount)} FCFA</b>
        </span>
        <input type="range" min={100_000} max={10_000_000} step={100_000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label={t("Montant")} />
      </label>
      <div className={styles.pair}>
        <div>
          <span>{t("Dernière VL connue")}</span>
          <b>{fmt(nav)} FCFA</b>
          <small>{fee ? `${t("frais d'entrée")} ${pct(fee)}` : t("sans frais d'entrée")}</small>
        </div>
        <div>
          <span>{t("≈ parts si la VL ne bouge pas")}</span>
          <b className={styles.gold}>{(net / nav).toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</b>
          <small>{t("le nombre exact dépend de la prochaine VL")}</small>
        </div>
      </div>
    </>
  );
}

function Auction({ live }: { live: Live }) {
  const t = useT();
  const [served, setServed] = useState(60);
  const asked = 10_000_000;
  return (
    <>
      <LiveLine live={live} />
      <label className={styles.slider}>
        <span>
          {t("Part servie par le Trésor à votre prix")} <b>{served} %</b>
        </span>
        <input type="range" min={0} max={100} step={10} value={served} onChange={(e) => setServed(Number(e.target.value))} aria-label={t("Part servie")} />
        <span className={styles.ends}>
          <i>{t("non servi")}</i>
          <i>{t("servi en totalité")}</i>
        </span>
      </label>
      <div className={styles.pair}>
        <div>
          <span>{t("Demandé")}</span>
          <b>{fmt(asked)}</b>
        </div>
        <div>
          <span>{t("Obtenu")}</span>
          <b className={styles.gold}>{fmt((asked * served) / 100)}</b>
          <small>{served < 100 ? `${fmt(asked - (asked * served) / 100)} ${t("restitués sous deux jours")}` : t("allocation totale")}</small>
        </div>
      </div>
    </>
  );
}

const RISKS: [string, string][] = [
  ["Crédit", "Répartir entre plusieurs émetteurs et échéances."],
  ["Liquidité", "N'engager que ce qu'on peut garder jusqu'au terme."],
  ["Prix", "Regarder le rendement à l'échéance, pas le prix du jour."],
  ["Allocation", "Attendre la confirmation du desk avant de compter les titres."],
];
function Risks() {
  const t = useT();
  const [on, setOn] = useState<number[]>([]);
  return (
    <ol className={styles.steps}>
      {RISKS.map(([k, v], i) => (
        <li key={k}>
          <button type="button" className={`${styles.chk} ${on.includes(i) ? styles.chkOn : ""}`} aria-pressed={on.includes(i)} onClick={() => setOn((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}>
            ✓
          </button>
          <span>
            <b>{t(k)}</b>
            {t(v)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The index: the level and its horizons, the weights of the seven shares, and « move one share » to see the index follow. */
function IndexWidget({ live }: { live: Live }) {
  const t = useT();
  const ix = live.index;
  const [pick, setPick] = useState(0);
  const [move, setMove] = useState(5);
  const [mode, setMode] = useState<"total" | "float">("total");
  if (!ix) return <div className="empty">{t("L'indice se lit dans le bulletin de la BVMAC : dès le premier bulletin lu, il s'affiche ici.")}</div>;
  const ws = ix.weights;
  const wgt = ws[pick] ? (mode === "total" ? ws[pick].wTotal : ws[pick].wFloat) / 100 : 0;
  const after = ix.level * (1 + (wgt * move) / 100);
  const sg = (v?: number, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`);
  return (
    <div className={styles.widget}>
      <div className={styles.wRow}>
        <div>
          <span className={styles.wLabel}>BVMAC All Share · {fmtDate(ix.date)}</span>
          <b className={styles.wBig}>{ix.level.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
        </div>
        <div className={styles.wStats}>
          <span>
            {t("séance")} <b>{sg(ix.day, 2)}</b>
          </span>
          <span>
            {t("un mois")} <b>{sg(ix.month)}</b>
          </span>
          <span>
            {t("depuis le 1er janvier")} <b>{sg(ix.ytd)}</b>
          </span>
          <span>
            {t("douze mois")} <b>{sg(ix.year)}</b>
          </span>
        </div>
      </div>
      {ws.length > 0 && (
        <>
          <div className={styles.wBars}>
            {ws.map((x, i) => (
              <button key={x.mnemo} type="button" className={`${styles.wBar} ${i === pick ? styles.wBarOn : ""}`} onClick={() => setPick(i)} aria-pressed={i === pick}>
                <span>{x.mnemo}</span>
                <i style={{ width: `${Math.max(1, mode === "total" ? x.wTotal : x.wFloat)}%` }} />
                <em>{(mode === "total" ? x.wTotal : x.wFloat).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</em>
              </button>
            ))}
          </div>
          <div className={styles.wControls}>
            <label>
              {t("Pondération")}
              <select value={mode} onChange={(e) => setMode(e.target.value as "total" | "float")}>
                <option value="total">{t("capital global")}</option>
                <option value="float">{t("flottant coté")}</option>
              </select>
            </label>
            <label>
              {t("{m} bouge de", { m: ws[pick]?.mnemo ?? "" })} <b>{sg(move, 1)}</b>
              <input type="range" min={-20} max={20} step={0.5} value={move} onChange={(e) => setMove(Number(e.target.value))} />
            </label>
          </div>
          <p className={styles.wRead}>
            {t("Si {m} seul bouge de {v}, l'indice passe à {a} ({d}) : les six autres valeurs n'ont pas bougé. Hypothèse : indice pondéré par la capitalisation, règles exactes à confirmer auprès de la BVMAC.", { m: ws[pick]?.mnemo ?? "", v: sg(move, 1), a: after.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), d: sg(wgt * move, 2) })}
          </p>
        </>
      )}
    </div>
  );
}

export function LessonWidget({ kind, live, focus }: { kind: Kind; live: Live; focus?: string[] }) {
  switch (kind) {
    case "indice":
      return <IndexWidget live={live} />;
    case "carte":
      return <ActorsMap focus={focus} />;
    case "chemin":
      return <OrderPath />;
    case "vie":
      return <Lifeline />;
    case "categories":
      return <FundCategories />;
    case "bond_price":
      return <BondPrice live={live} />;
    case "read_ota":
      return <ReadOta live={live} />;
    case "bta_rate":
      return <BtaRate live={live} />;
    case "tenor":
      return <Tenor live={live} />;
    case "equity":
      return <Equity live={live} />;
    case "fund":
      return <Fund live={live} />;
    case "auction":
      return <Auction live={live} />;
    default:
      return <Risks />;
  }
}
