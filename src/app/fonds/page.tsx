import Link from "next/link";
import { repo } from "@/lib/data";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL, type FundNav } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { MarketTabs } from "@/components/MarketTabs";
import { FAMILY_SEGMENT, offerFamily } from "@/lib/domain/status";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fonds — OPCVM de la CEMAC" };

const ORDER: FundNav["category"][] = ["M", "O", "D", "A", "?"];
const BLURB: Record<FundNav["category"], string> = {
  M: "Placement de trésorerie : titres courts, valeur liquidative très régulière, argent disponible sous quelques jours.",
  O: "Investis en obligations d'États et d'entreprises de la zone ; rendement porté par les coupons, sensibilité aux taux.",
  D: "Un panachage d'obligations, d'actions et de trésorerie, arbitré par la société de gestion.",
  A: "Exposés aux actions cotées à la BVMAC et à la région : le potentiel et la volatilité les plus élevés.",
  "?": "Catégorie non précisée au bulletin.",
};

export default async function FondsPage() {
  const r = repo();
  const [offers, bulletins] = await Promise.all([r.listOffers(), r.listBulletins(1)]);
  const funds = offers.filter((o): o is Offer & { fund: NonNullable<Offer["fund"]> } => o.kind === "FONDS" && Boolean(o.fund));
  const last = bulletins[0];
  const others = offers.filter((o) => !o.hidden && o.kind !== "FONDS");
  const signed = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);
  const cls = (v?: number) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);
  const open = funds.filter((o) => o.fund.distributed && !o.hidden).length;

  return (
    <>
      <MarketTabs active="fonds" counts={{ all: others.length, primaire: others.filter((o) => FAMILY_SEGMENT[offerFamily(o)] === "primaire").length, secondaire: others.filter((o) => FAMILY_SEGMENT[offerFamily(o)] === "secondaire").length, fonds: funds.length }} />
      <div className={styles.head}>
        <div>
          <h1 className="display">Fonds communs de placement</h1>
          <p className={styles.lead}>
            Les {funds.length} OPCVM agréés par la COSUMAF dont la valeur liquidative est publiée au Bulletin Officiel de la Cote, avec leur société de gestion et leur dépositaire.{" "}
            {open > 0 ? `${open} ${open > 1 ? "sont ouverts" : "est ouvert"} à la souscription chez Purpose Capital ; ` : ""}
            pour les autres, dites-nous votre intérêt : nous organisons la relation avec la société de gestion. Les parts sont toujours inscrites à votre nom chez le dépositaire.
          </p>
        </div>
        {last && (
          <div className={styles.stamp}>
            VL lues au BOC n° {last.number} du {fmtDate(last.sessionDate)}
            <br />
            source : sociétés de gestion agréées COSUMAF
          </div>
        )}
      </div>

      {ORDER.filter((c) => funds.some((o) => o.fund.category === c)).map((c) => {
        const rows = funds.filter((o) => o.fund.category === c).sort((a, b) => Number(b.fund.distributed) - Number(a.fund.distributed) || a.title.localeCompare(b.title));
        return (
          <section key={c} className={styles.group}>
            <div className={styles.groupH}>
              <h2 className="display">
                {FUND_CATEGORY_LABEL[c]}s · {rows.length}
              </h2>
              <p>{BLURB[c]}</p>
            </div>
            <div className="scroll-x">
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th>Fonds</th>
                    <th className={styles.hideSm}>Société de gestion · dépositaire</th>
                    <th className={styles.r}>VL (FCFA)</th>
                    <th className={styles.r}>Var.</th>
                    <th className={styles.r}>12 mois</th>
                    <th className={`${styles.r} ${styles.hideSm}`}>Depuis l&apos;origine</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const f = o.fund;
                    const openHere = f.distributed && !o.hidden;
                    return (
                      <tr key={o.id}>
                        <td className={styles.name}>
                          <Link href={`/offres/${o.id}`}>{o.title}</Link>
                          <small>
                            {FUND_CATEGORY_LABEL[f.category]} · {FUND_FREQUENCY_LABEL[f.frequency]}
                          </small>
                        </td>
                        <td className={styles.hideSm}>
                          {o.issuer}
                          <br />
                          <small className="muted">{f.depositary}</small>
                        </td>
                        <td className={styles.r}>
                          <b>{fmt(f.nav)}</b>
                          <br />
                          <small className="muted">{fmtDate(f.navDate)}</small>
                        </td>
                        <td className={`${styles.r} ${cls(f.variationPct)}`}>{signed(f.variationPct)}</td>
                        <td className={`${styles.r} ${cls(f.perf1yPct)}`}>{signed(f.perf1yPct)}</td>
                        <td className={`${styles.r} ${styles.hideSm} ${cls(f.perfSinceInceptionPct)}`}>{signed(f.perfSinceInceptionPct)}</td>
                        <td className={styles.r}>
                          {openHere ? (
                            <Link className="btn sm primary" href={`/offres/${o.id}?intent=souscription`}>
                              Souscrire
                            </Link>
                          ) : (
                            <Link className="btn sm ghost" href={`/offres/${o.id}?intent=info`}>
                              Sur demande
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {funds.length === 0 && <p className={styles.note}>Les fonds apparaissent dès que le premier Bulletin Officiel de la Cote est lu par le desk.</p>}
      <p className={styles.note}>
        Les performances passées ne préjugent pas des performances futures. Une souscription est exécutée à la prochaine valeur liquidative, inconnue au moment de l&apos;ordre ; droits d&apos;entrée et de sortie selon le règlement de chaque fonds. Purpose Capital agit en distributeur : aucune détention pour compte de tiers, les parts sont au nom du porteur au registre du dépositaire.
      </p>
    </>
  );
}
