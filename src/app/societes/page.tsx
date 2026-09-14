import Link from "next/link";
import { COMPANIES } from "@/data/companies";
import { repo } from "@/lib/data";
import { analyse } from "@/lib/companies/analysis";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import { Info } from "@/components/Info";
import { GLOSSARY } from "@/lib/glossary";
import { fmt, fmtDate, fmtPct, fmtUnits } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sociétés cotées — BVMAC" };


export default async function SocietesPage() {
  const r = repo();
  const [latest, bulletins] = await Promise.all([r.latestQuotes(), r.listBulletins(1)]);
  const quotes = new Map(latest.filter((q) => q.instrument === "action").map((q) => [q.isin, q]));
  const rows = COMPANIES.map((c) => analyse(c, quotes.get(c.isin))).sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  const totalCap = rows.reduce((s, a) => s + (a.marketCap ?? 0), 0);
  const signed = (v?: number | null, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
  const cls = (v?: number | null) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className="display">Les sociétés cotées</h1>
          <p className={styles.lead}>
            Les {COMPANIES.length} entreprises dont les actions s&apos;échangent à la BVMAC, ensemble {fmtUnits(totalCap, true)} de capitalisation. Pour chacune : ce qu&apos;elle fait, ses comptes certifiés des dernières années, ce que vaut l&apos;action aujourd&apos;hui et comment lire ces chiffres — puis un rapport PDF sur la période de votre choix.
          </p>
        </div>
        {bulletins[0] && (
          <div className={styles.stamp}>
            Cours du BOC n° {bulletins[0].number} du {fmtDate(bulletins[0].sessionDate)}
            <br />
            comptes : fiches signalétiques et états financiers publiés sur bvm-ac.org
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className="scroll-x">
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th>Société</th>
                <th className={styles.r}>
                  Cours <Info term="cours" />
                </th>
                <th className={`${styles.r} ${styles.hideSm}`}>Var. jour</th>
                <th className={styles.r}>
                  Depuis le 1er janv. <Info term="ytd" />
                </th>
                <th className={styles.r}>
                  Capitalisation <Info term="capitalisation" />
                </th>
                <th className={styles.r}>
                  PER <Info term="per" />
                </th>
                <th className={styles.r}>
                  Rendement <Info term="rendement_dividende" />
                </th>
                <th className={`${styles.r} ${styles.hideSm}`}>
                  Dernier dividende <Info term="dividende" />
                </th>
                <th className={styles.hideSm}>Secteur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const c = a.company;
                const q = a.quote;
                return (
                  <tr key={c.mnemo}>
                    <td className={styles.name}>
                      <Link href={`/societes/${c.mnemo.toLowerCase()}`}>
                        <span className="cc" title={c.country}>{COUNTRY_CODE[c.country]}</span> {c.shortName} <span className="muted">· {c.mnemo}</span>
                      </Link>
                      <small>{c.activity.split(".")[0]}.</small>
                    </td>
                    <td className={styles.r}>
                      <b>{q ? fmt(q.close) : "—"}</b>
                    </td>
                    <td className={`${styles.r} ${styles.hideSm} ${cls(q?.variationPct)}`}>{signed(q?.variationPct)}</td>
                    <td className={`${styles.r} ${cls(q?.ytdVariationPct)}`}>{q?.ytdVariationPct != null ? signed(q.ytdVariationPct) : "—"}</td>
                    <td className={styles.r}>{a.marketCap != null ? fmtUnits(a.marketCap) : "—"}</td>
                    <td className={styles.r}>{a.per != null ? `${a.per.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ×` : "—"}</td>
                    <td className={styles.r}>{a.dividendYieldPct != null ? fmtPct(a.dividendYieldPct, 1) : "—"}</td>
                    <td className={`${styles.r} ${styles.hideSm}`}>
                      {q?.lastDividend != null ? `${fmt(q.lastDividend)} FCFA` : a.latest.dividendPerShare ? `${fmt(a.latest.dividendPerShare)} FCFA` : a.latest.dividendPerShare === null ? "non distribué" : "—"}
                      {q?.dividendYear ? <small className="muted"> ({q.dividendYear})</small> : a.latest.dividendPerShare ? <small className="muted"> ({a.latest.year})</small> : null}
                    </td>
                    <td className={styles.hideSm}>{c.sector}</td>
                    <td className={styles.r}>
                      <Link className="btn sm" href={`/societes/${c.mnemo.toLowerCase()}`}>
                        Analyse
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.howto}>
        {(["per", "rendement_dividende", "capitalisation", "ytd"] as const).map((k) => (
          <div key={k}>
            <b>{"long" in GLOSSARY[k] ? `${GLOSSARY[k].short} — ${GLOSSARY[k].long}` : GLOSSARY[k].short}</b>
            {GLOSSARY[k].text}
          </div>
        ))}
      </div>
      <p className={styles.note}>
        Les cours viennent du Bulletin Officiel de la Cote de la BVMAC ; les comptes des états financiers certifiés et des fiches signalétiques déposés par les sociétés sur bvm-ac.org. Ce sont des informations, pas des conseils : les performances passées ne préjugent pas des performances futures.
      </p>
    </>
  );
}
