import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart, LineChart, ShareBar } from "@/components/Charts";
import { companyByMnemo } from "@/data/companies";
import { repo } from "@/lib/data";
import { analyse, PERIODS, periodComment, periodFrom, pricePeriod } from "@/lib/companies/analysis";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ mnemo: string }>; searchParams: Promise<{ p?: string }> };

export async function generateMetadata({ params }: Props) {
  const c = companyByMnemo((await params).mnemo);
  return { title: c ? `${c.shortName} — analyse` : "Société" };
}

const bn = (v?: number) => (v == null ? "—" : `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`);
const DOC_LABEL: Record<string, string> = { fiche: "Fiche signalétique", etats_ohada: "États financiers OHADA", etats_ifrs: "États financiers IFRS", rapport_gestion: "Rapport de gestion", rapport_semestriel: "Rapport semestriel", note_information: "Note d'information", autre: "Document" };

export default async function SocietePage({ params, searchParams }: Props) {
  const [{ mnemo }, sp] = await Promise.all([params, searchParams]);
  const c = companyByMnemo(mnemo);
  if (!c) notFound();
  const p = PERIODS.some(([k]) => k === sp.p) ? (sp.p as string) : "ytd";
  const r = repo();
  const history = (await r.listQuotes(c.isin, 2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const quote = history[history.length - 1];
  const a = analyse(c, quote);
  const from = periodFrom(p);
  const slice = history.filter((q) => q.sessionDate >= from);
  const period = pricePeriod(slice);
  const signed = (v?: number | null, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
  const cls = (v?: number | null) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);
  const figs = [...c.figures].sort((x, y) => x.year - y.year);
  const years = figs.map((f) => String(f.year));
  const listedLine = (await r.listOffers()).find((o) => o.kind === "MARCHE" && o.isin === c.isin);

  return (
    <>
      <Link href="/societes" className={styles.back}>
        ← Toutes les sociétés cotées
      </Link>
      <div className={styles.head}>
        <div>
          <div className={`eyebrow ${styles.eyebrow}`}>
            <span className="cc">{COUNTRY_CODE[c.country]}</span> {c.sector} · BVMAC · {c.mnemo} · {c.isin}
          </div>
          <h1 className="display">{c.name}</h1>
          <p className={styles.activity}>{c.activity}</p>
          <p className={styles.headline}>{a.headline}</p>
        </div>
        <div className={styles.actions}>
          {listedLine && (
            <Link className="btn primary" href={`/offres/${listedLine.id}?intent=achat`}>
              Acheter l&apos;action
            </Link>
          )}
          <a className="btn" href={`/societes/${c.mnemo.toLowerCase()}/rapport?p=${p}`} target="_blank" rel="noreferrer">
            Rapport PDF · {PERIODS.find(([k]) => k === p)?.[1]}
          </a>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={`${styles.kpi} ${styles.gold}`}>
          <span>Cours</span>
          <b>{quote ? fmt(quote.close) : "—"}</b>
          <small>FCFA · {quote ? `clôture ${fmtDate(quote.sessionDate)}` : "pas de cours"}{quote?.variationPct ? ` · ${signed(quote.variationPct)}` : ""}</small>
        </div>
        <div className={styles.kpi}>
          <span>Depuis le 1er janvier</span>
          <b className={cls(quote?.ytdVariationPct)}>{quote?.ytdVariationPct != null ? signed(quote.ytdVariationPct) : "—"}</b>
          <small>{quote?.ytdVariationPct == null && c.listedOn.startsWith(String(new Date().getFullYear())) ? `introduite le ${fmtDate(c.listedOn)}` : "variation publiée par la BVMAC"}</small>
        </div>
        <div className={styles.kpi}>
          <span>Capitalisation</span>
          <b>{bn(a.marketCap)}</b>
          <small>{fmt(c.sharesTotal)} actions · flottant {fmtPct(c.freeFloatPct, 1)}</small>
        </div>
        <div className={styles.kpi}>
          <span>PER</span>
          <b>{a.per != null ? `${a.per.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ×` : "—"}</b>
          <small>bénéfice {a.latest.year} de {fmt(a.eps ?? 0)} FCFA / action</small>
        </div>
        <div className={styles.kpi}>
          <span>Rendement du dividende</span>
          <b>{a.dividendYieldPct != null ? fmtPct(a.dividendYieldPct, 2) : "—"}</b>
          <small>{quote?.lastDividend != null ? `${fmt(quote.lastDividend)} FCFA brut${quote.dividendDate ? ` payé le ${fmtDate(quote.dividendDate)}` : ""}` : "pas de dividende récent"}</small>
        </div>
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.panel}>
            <div className={styles.panelH}>
              <h2>Cours de l&apos;action</h2>
              <nav className={styles.periods} aria-label="Période">
                {PERIODS.map(([k, l]) => (
                  <Link key={k} href={`?p=${k}`} aria-current={k === p ? "true" : undefined} scroll={false}>
                    {l}
                  </Link>
                ))}
              </nav>
            </div>
            <LineChart points={slice.map((q) => ({ date: q.sessionDate, value: q.close }))} ariaLabel={`Cours de clôture de ${c.shortName}`} />
            {period ? (
              <div className={styles.reading}>
                <b>Comment lire.</b> {periodComment(period, c)}
              </div>
            ) : (
              <div className={styles.reading}>Aucun cours ingéré sur cette période — l&apos;historique se remplit à partir des bulletins de la BVMAC.</div>
            )}
          </div>

          <div className={styles.panel}>
            <h2>
              {a.latest.revenueLabel} et bénéfice net · {figs[0].year}–{a.latest.year}
            </h2>
            <BarChart groups={years} series={[{ name: a.latest.revenueLabel, values: figs.map((f) => f.revenue) }, { name: "Bénéfice net", values: figs.map((f) => f.netIncome), accent: true }]} ariaLabel={`${a.latest.revenueLabel} et bénéfice net par année`} />
            <div className={styles.reading}>
              <b>Comment lire.</b> Les barres bleues mesurent l&apos;activité ({a.latest.revenueLabel.toLowerCase()}), les barres dorées ce qu&apos;il en reste une fois tout payé. Un bénéfice qui suit les revenus est le signe d&apos;une entreprise dont les marges tiennent ; un bénéfice qui décroche alors que les revenus montent signale des coûts ou des provisions en hausse.
            </div>
          </div>

          <div className={styles.panel}>
            <h2>Fonds propres et total du bilan</h2>
            <BarChart groups={years} series={[{ name: "Total du bilan", values: figs.map((f) => f.totalAssets) }, { name: "Fonds propres", values: figs.map((f) => f.equity), accent: true }]} ariaLabel="Total du bilan et fonds propres par année" />
            <div className={styles.reading}>
              <b>Comment lire.</b> Le total du bilan est tout ce que l&apos;entreprise possède ; les fonds propres, la part qui appartient aux actionnaires. Des fonds propres qui grossissent année après année veulent dire que l&apos;entreprise garde une partie de ses bénéfices. {c.sector === "Banque" || c.sector === "Holding bancaire" ? "Pour une banque, un bilan très supérieur aux fonds propres est normal : il est constitué des dépôts des clients." : ""}
            </div>
          </div>

          <div className={styles.panel}>
            <h2>Chiffres clés certifiés (FCFA)</h2>
            <div className="scroll-x">
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th></th>
                    {figs.map((f) => (
                      <th key={f.year} className={styles.r}>
                        {f.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [a.latest.revenueLabel, (f) => fmt(f.revenue)],
                      ["Valeur ajoutée", (f) => (f.valueAdded != null ? fmt(f.valueAdded) : "—")],
                      ["Résultat net", (f) => fmt(f.netIncome)],
                      ["Fonds propres", (f) => fmt(f.equity)],
                      ["Total du bilan", (f) => fmt(f.totalAssets)],
                      ["Bénéfice par action", (f) => fmt(f.netIncome / c.sharesTotal)],
                      ["Dividende brut par action", (f) => (f.dividendPerShare === null ? "non distribué" : f.dividendPerShare != null ? fmt(f.dividendPerShare) : "—")],
                    ] as [string, (f: (typeof figs)[number]) => string][]
                  ).map(([label, fn]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {figs.map((f) => (
                        <td key={f.year} className={styles.r}>
                          {fn(f)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.source}>Sources : {[...new Set(figs.map((f) => f.source))].join(" · ")}. Normes {[...new Set(figs.map((f) => f.standard))].join(" / ")}. Bénéfice par action calculé sur {fmt(c.sharesTotal)} actions.</div>
          </div>
        </div>

        <div>
          <div className={styles.panel}>
            <h2>Ce que disent les chiffres</h2>
            <ul className={styles.comments}>
              {a.comments.map((t, i) => (
                <li key={i}>
                  {t.includes(" — ") ? (
                    <>
                      <b>{t.split(" — ")[0]}</b> — {t.split(" — ").slice(1).join(" — ")}
                    </>
                  ) : (
                    t
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.panel}>
            <h2>Ratios, et comment les lire</h2>
            <table className={styles.tbl}>
              <tbody>
                {a.ratios.map((x) => (
                  <tr key={x.key} className={styles.ratio}>
                    <td>{x.label}</td>
                    <td>{x.value}</td>
                    <td>{x.reading}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.panel}>
            <h2>Actionnariat</h2>
            <ShareBar parts={c.coreShareholders} />
            <dl className={styles.facts} style={{ marginTop: 12 }}>
              <dt>Introduite en bourse</dt>
              <dd>{fmtDate(c.listedOn)}{c.ipoPrice ? ` à ${fmt(c.ipoPrice)} FCFA` : ""}</dd>
              <dt>Capital social</dt>
              <dd>{fmt(c.shareCapital)} FCFA</dd>
              <dt>Actions</dt>
              <dd>{fmt(c.sharesTotal)} dont {fmt(c.sharesFloat)} en bourse</dd>
              {c.chair && (
                <>
                  <dt>Présidence</dt>
                  <dd>{c.chair}</dd>
                </>
              )}
              {c.ceo && (
                <>
                  <dt>Direction générale</dt>
                  <dd>{c.ceo}</dd>
                </>
              )}
              <dt>Siège</dt>
              <dd>{c.city}</dd>
              {c.website && (
                <>
                  <dt>Site</dt>
                  <dd>
                    <a href={c.website} target="_blank" rel="noreferrer">
                      {c.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className={styles.panel}>
            <h2>Documents publiés ({c.documents.length})</h2>
            <div className={styles.docs}>
              {[...c.documents]
                .sort((x, y) => y.year - x.year)
                .map((d) => (
                  <a key={d.url} href={d.url} target="_blank" rel="noreferrer">
                    <span>
                      {DOC_LABEL[d.kind]} {d.year}
                    </span>
                    <small>bvm-ac.org · {d.url.endsWith(".pdf") ? "PDF" : "image"}</small>
                  </a>
                ))}
            </div>
            <div className={styles.source}>Documents déposés par la société auprès de la BVMAC ; le desk en garde copie et met ces chiffres à jour à chaque nouvelle publication.</div>
          </div>
        </div>
      </div>
    </>
  );
}
