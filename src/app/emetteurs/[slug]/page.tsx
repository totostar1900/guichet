import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart, ShareBar } from "@/components/Charts";
import { Info } from "@/components/Info";
import { LineIdentity } from "@/components/LineIdentity";
import { bondTerms } from "@/data/bond-terms";
import { issuerBySlug, ISSUERS } from "@/data/issuers";
import { repo } from "@/lib/data";
import { displayYield } from "@/lib/domain/status";
import { COUNTRY_CODE, summarize } from "@/lib/domain/summary";
import { fmt, fmtPct, fmtScaled, fmtUnits, pickScale } from "@/lib/format";
import styles from "../../societes/[mnemo]/page.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const i = issuerBySlug((await params).slug);
  return { title: i ? `${i.shortName} — émetteur` : "Émetteur" };
}

export default async function EmetteurPage({ params }: Props) {
  const { slug } = await params;
  const i = issuerBySlug(slug);
  if (!i) notFound();
  const now = new Date();
  const offers = (await repo().listOffers()).filter((o) => i.isins.includes(o.isin));
  const lines = i.isins.map((isin) => offers.find((o) => o.isin === isin)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const figs = i.figures;
  const latest = figs[figs.length - 1];
  const scaled = figs.map((f) => ({ ...f, totalAssets: f.totalAssets * i.unit, revenue: f.revenue * i.unit, netIncome: f.netIncome * i.unit }));
  const scale = pickScale(scaled.flatMap((f) => [f.totalAssets, f.revenue, f.netIncome]));
  const growth = figs.length > 1 ? (latest.revenue / figs[figs.length - 2].revenue - 1) * 100 : null;
  const margin = latest.revenue ? (latest.netIncome / latest.revenue) * 100 : null;
  const revenueTerm = latest.revenueLabel.startsWith("Produit") ? "pnb" : "chiffre_affaires";
  const others = ISSUERS.filter((x) => x.slug !== i.slug);
  const alive = lines.filter((o) => displayYield(o).pct != null).length;

  return (
    <>
      <Link href="/societes" className={styles.back}>
        ← Sociétés cotées et émetteurs
      </Link>
      <div className={styles.head}>
        <div>
          <div className={`eyebrow ${styles.eyebrow}`}>
            <span className="cc">{COUNTRY_CODE[i.country]}</span> {i.sector} · émetteur obligataire BVMAC · {i.mnemo}
          </div>
          <h1 className="display">{i.name}</h1>
          <p className={styles.activity}>{i.activity}</p>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={`${styles.kpi} ${styles.gold}`}>
          <span>Emprunts cotés</span>
          <b>{lines.length}</b>
          <small>{alive} en vie · détail ci-dessous</small>
        </div>
        <div className={styles.kpi}>
          <span>
            {latest.revenueLabel} {latest.year} <Info term={revenueTerm} />
          </span>
          <b>{fmtUnits(latest.revenue * i.unit)}</b>
          <small>FCFA{growth != null ? ` · ${growth > 0 ? "+" : ""}${fmtPct(growth, 1)} vs ${latest.year - 1}` : ""}</small>
        </div>
        <div className={styles.kpi}>
          <span>
            Résultat net {latest.year} <Info term="resultat_net" />
          </span>
          <b>{fmtUnits(latest.netIncome * i.unit)}</b>
          <small>FCFA{margin != null ? ` · marge ${fmtPct(margin, 1)}` : ""}</small>
        </div>
        <div className={styles.kpi}>
          <span>
            Total du bilan {latest.year} <Info term="total_bilan" />
          </span>
          <b>{fmtUnits(latest.totalAssets * i.unit)}</b>
          <small>FCFA · capital social {fmtUnits(i.shareCapital)}</small>
        </div>
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.panel}>
            <h2>Emprunts cotés à la BVMAC</h2>
            {lines.length === 0 && <p className={styles.source}>Aucune ligne de cet émetteur n&apos;est actuellement reprise du bulletin.</p>}
            <div className={styles.docs}>
              {lines.map((o) => {
                const s = summarize(o, now);
                const t = bondTerms(o.isin);
                const dy = displayYield(o);
                return (
                  <Link key={o.id} href={`/offres/${o.id}`} className={styles.lineCard}>
                    <LineIdentity o={o} s={s} />
                    <div className={styles.lineFacts}>
                      <div>
                        <span>{dy.atPar ? "Taux nominal" : "Rendement"}</span>
                        <b className={dy.pct != null ? styles.goldTxt : undefined}>{s.hero}</b>
                        <small>{s.heroUnit ?? s.heroSub}</small>
                      </div>
                      <div>
                        <span>Échéance</span>
                        <b>{s.maturity}</b>
                        <small>{s.tenor}</small>
                      </div>
                      <div>
                        <span>Remboursement</span>
                        <b>{t ? (t.periodsPerYear === 1 ? "annuel" : t.periodsPerYear === 2 ? "semestriel" : "trimestriel") : "—"}</b>
                        <small>{t ? `nominal restant ${fmt(o.nominal)} / titre` : "échéancier à préciser"}</small>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className={styles.panel}>
            <h2>
              {latest.revenueLabel} <Info term={revenueTerm} /> et résultat net <Info term="resultat_net" /> · {figs[0].year}–{latest.year}
            </h2>
            <div className={styles.unitNote}>en FCFA · survolez les barres pour les montants exacts</div>
            <BarChart groups={figs.map((f) => String(f.year))} series={[{ name: latest.revenueLabel, values: scaled.map((f) => f.revenue) }, { name: "Résultat net", values: scaled.map((f) => f.netIncome), accent: true }]} ariaLabel={`${latest.revenueLabel} et résultat net par année`} />
            <div className={styles.reading}>
              <b>Comment lire.</b> Pour un prêteur, l&apos;essentiel est que les revenus couvrent durablement les intérêts et les remboursements : un résultat positif et stable compte plus qu&apos;une forte croissance.
            </div>
          </div>

          <div className={styles.panel}>
            <h2>Chiffres clés publiés</h2>
            <div className={styles.unitNote}>
              en {scale.label} · {i.unitNote}
            </div>
            <div className="scroll-x">
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th>{scale.short}</th>
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
                      [latest.revenueLabel, (f) => fmtScaled(f.revenue, scale.div)],
                      ["Résultat net", (f) => fmtScaled(f.netIncome, scale.div)],
                      ["Total du bilan", (f) => fmtScaled(f.totalAssets, scale.div)],
                    ] as [string, (f: (typeof scaled)[number]) => string][]
                  ).map(([label, fn]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {scaled.map((f) => (
                        <td key={f.year} className={styles.r}>
                          {fn(f)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.source}>Source : {i.documents.map((d) => d.title).join(" · ")}.</div>
          </div>
        </div>

        <div>
          <div className={styles.panel}>
            <h2>Ce que disent les chiffres</h2>
            <ul className={styles.comments}>
              {i.reading.map((t, k) => (
                <li key={k}>{t}</li>
              ))}
            </ul>
          </div>

          <div className={styles.panel}>
            <h2>Actionnariat</h2>
            <ShareBar parts={i.shareholders} />
            <dl className={styles.facts} style={{ marginTop: 12 }}>
              <dt>Capital social</dt>
              <dd>{fmtUnits(i.shareCapital, true)}</dd>
              {i.chair && (
                <>
                  <dt>Présidence</dt>
                  <dd>{i.chair}</dd>
                </>
              )}
              {i.ceo && (
                <>
                  <dt>Direction générale</dt>
                  <dd>{i.ceo}</dd>
                </>
              )}
              <dt>Siège</dt>
              <dd>{i.city}</dd>
              {i.website && (
                <>
                  <dt>Site</dt>
                  <dd>
                    <a href={i.website} target="_blank" rel="noreferrer">
                      {i.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </dd>
                </>
              )}
              {i.contact && (
                <>
                  <dt>Contact</dt>
                  <dd>{i.contact}</dd>
                </>
              )}
            </dl>
          </div>

          <div className={styles.panel}>
            <h2>Documents publiés ({i.documents.length})</h2>
            <div className={styles.docs}>
              {i.documents.map((d) => (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer">
                  <span>{d.title}</span>
                  <small>bvm-ac.org · image · {d.year}</small>
                </a>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <h2>Autres émetteurs</h2>
            <div className={styles.docs}>
              {others.map((x) => (
                <Link key={x.slug} href={`/emetteurs/${x.slug}`}>
                  <span>{x.shortName}</span>
                  <small>{x.sector}</small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
