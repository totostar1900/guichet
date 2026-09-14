import Link from "next/link";
import { COMPANIES } from "@/data/companies";
import { repo } from "@/lib/data";
import { analyse } from "@/lib/companies/analysis";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sociétés cotées — BVMAC" };

const bn = (v?: number) => (v == null ? "—" : `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} Md`);

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
            Les {COMPANIES.length} entreprises dont les actions s&apos;échangent à la BVMAC, ensemble {bn(totalCap)} FCFA de capitalisation. Pour chacune : ce qu&apos;elle fait, ses comptes certifiés des dernières années, ce que vaut l&apos;action aujourd&apos;hui et comment lire ces chiffres — puis un rapport PDF sur la période de votre choix.
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
                <th className={styles.r}>Cours</th>
                <th className={`${styles.r} ${styles.hideSm}`}>Var. jour</th>
                <th className={styles.r}>Depuis le 1er janv.</th>
                <th className={styles.r}>Capitalisation</th>
                <th className={styles.r}>PER</th>
                <th className={styles.r}>Rendement</th>
                <th className={`${styles.r} ${styles.hideSm}`}>Dernier dividende</th>
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
                    <td className={styles.r}>{bn(a.marketCap)}</td>
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
        <div>
          <b>PER — cours / bénéfice</b>
          Combien d&apos;années de bénéfice vous payez au cours du jour. Entre 5 et 12, c&apos;est courant sur les marchés africains ; plus haut, le marché paie la croissance attendue ou la rareté du titre.
        </div>
        <div>
          <b>Rendement du dividende</b>
          Le dernier dividende brut rapporté au cours : ce que l&apos;action verse chaque année si le dividende est maintenu, avant retenue à la source.
        </div>
        <div>
          <b>Capitalisation</b>
          Le cours multiplié par toutes les actions de la société, flottant compris : la valeur que la bourse lui donne. La part effectivement échangeable est bien plus petite (3 à 20 %).
        </div>
        <div>
          <b>Depuis le 1er janvier</b>
          La variation du cours depuis la première séance de l&apos;année, telle que la BVMAC la publie ; « — » pour une société introduite dans l&apos;année.
        </div>
      </div>
      <p className={styles.note}>
        Les cours viennent du Bulletin Officiel de la Cote de la BVMAC ; les comptes des états financiers certifiés et des fiches signalétiques déposés par les sociétés sur bvm-ac.org. Ce sont des informations, pas des conseils : les performances passées ne préjugent pas des performances futures.
      </p>
    </>
  );
}
