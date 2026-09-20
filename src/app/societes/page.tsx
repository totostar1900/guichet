import Link from "next/link";
import { loadCompanies, loadIssuers } from "@/lib/reference";
import { repo } from "@/lib/data";
import { analyse } from "@/lib/companies/analysis";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import { CompaniesBrowser } from "./CompaniesBrowser";
import { getRegistry } from "@/lib/registry";
import { fmtDate, fmtUnits } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sociétés cotées : BVMAC") };
}


export default async function SocietesPage() {
  const t = await getT();
  const r = repo();
  const [latest, bulletins] = await Promise.all([r.latestQuotes(), r.listBulletins(1)]);
  const quotes = new Map(latest.filter((q) => q.instrument === "action").map((q) => [q.isin, q]));
  const [COMPANIES, ISSUERS] = await Promise.all([loadCompanies(), loadIssuers()]);
  const rows = COMPANIES.map((c) => analyse(c, quotes.get(c.isin))).sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  const totalCap = rows.reduce((s, a) => s + (a.marketCap ?? 0), 0);

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className="display">{t("Les sociétés cotées")}</h1>
          <p className={styles.lead}>
            {t("Les {n} entreprises dont les actions s'échangent à la BVMAC, ensemble {cap} de capitalisation. Pour chacune : ce qu'elle fait, ses comptes certifiés des dernières années, ce que vaut l'action aujourd'hui et comment lire ces chiffres : puis un rapport PDF sur la période de votre choix.", { n: COMPANIES.length, cap: fmtUnits(totalCap, true) })}
          </p>
        </div>
        {bulletins[0] && (
          <div className={styles.stamp}>
            {t("Cours du BOC n°")} {bulletins[0].number} {t("du")} {fmtDate(bulletins[0].sessionDate)}
            <br />
            {t("comptes : fiches signalétiques et états financiers publiés sur bvm-ac.org")}
          </div>
        )}
      </div>

      <CompaniesBrowser
        rows={rows.map((a) => ({
          mnemo: a.company.mnemo,
          shortName: a.company.shortName,
          country: a.company.country,
          countryCode: COUNTRY_CODE[a.company.country],
          activity: a.company.activity,
          sector: a.company.sector,
          close: a.quote?.close,
          variationPct: a.quote?.variationPct,
          ytdPct: a.quote?.ytdVariationPct,
          marketCap: a.marketCap,
          per: a.per,
          dividendYieldPct: a.dividendYieldPct,
          lastDividend: a.quote?.lastDividend ?? a.latest.dividendPerShare,
          dividendYear: a.quote?.dividendYear ?? a.latest.year,
        }))}
      />

      <div className={styles.panel}>
        <div className={styles.issuersH}>
          <h2>{t("Émetteurs obligataires")}</h2>
          <p className="muted">{t("Les entreprises qui empruntent sur la BVMAC sans y être cotées en actions : ce qu'elles font, leurs comptes publiés et les lignes qu'elles remboursent. Les États (Cameroun, Gabon, Congo, Tchad) et la BDEAC ont leurs échéanciers directement sur chaque ligne.")}</p>
        </div>
        <div className={styles.issuers}>
          {ISSUERS.map((i) => {
            const last = i.figures[i.figures.length - 1];
            return (
              <Link key={i.slug} href={`/emetteurs/${i.slug}`} className={styles.issuer}>
                <div>
                  <span className="cc" title={i.country}>{COUNTRY_CODE[i.country]}</span> <b>{i.shortName}</b>
                  <small>{t(i.sector)} · {i.isins.length} {t(i.isins.length > 1 ? "emprunts cotés" : "emprunt coté")}</small>
                </div>
                <div className={styles.issuerFig}>
                  <span>{t(last.revenueLabel)} {last.year}</span>
                  <b>{fmtUnits(last.revenue * i.unit, true)}</b>
                </div>
                <div className={styles.issuerFig}>
                  <span>{t("Résultat net")} {last.year}</span>
                  <b>{fmtUnits(last.netIncome * i.unit, true)}</b>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.howto}>
        {(() => {
          const G = getRegistry().glossary;
          return (["per", "rendement_dividende", "capitalisation", "ytd"] as const).map((k) => (
            <div key={k}>
              <b>{"long" in G[k] && G[k].long ? `${t(G[k].short)} : ${t(G[k].long)}` : t(G[k].short)}</b>
              {t(G[k].text)}
            </div>
          ));
        })()}
      </div>
      <p className={styles.note}>
        {t("Les cours viennent du Bulletin Officiel de la Cote de la BVMAC ; les comptes des états financiers certifiés et des fiches signalétiques déposés par les sociétés sur bvm-ac.org. Ce sont des informations, pas des conseils : les performances passées ne préjugent pas des performances futures.")}
      </p>
    </>
  );
}
