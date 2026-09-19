import { repo } from "@/lib/data";
import { FundsBrowser } from "./FundsBrowser";
import { BackToTop } from "@/components/BackToTop";
import { SwipePager } from "@/components/mobile/SwipePager";
import type { Offer } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fonds : OPCVM de la CEMAC" };

export default async function FondsPage() {
  const t = await getT();
  const r = repo();
  const [offers, bulletins] = await Promise.all([r.listOffers(), r.listBulletins(1)]);
  const funds = offers.filter((o): o is Offer & { fund: NonNullable<Offer["fund"]> } => o.kind === "FONDS" && Boolean(o.fund));
  const last = bulletins[0];
  const open = funds.filter((o) => o.fund.distributed && !o.hidden).length;
  const titres = offers.filter((o) => !o.hidden && o.kind !== "FONDS").length;

  return (
    <SwipePager prev={{ href: "/", title: t("Obligations, bons du Trésor et actions de la zone CEMAC"), pos: `${t("Titres")} · ${titres}` }} hintKey="liste" hints={{ next: "Glissez vers la gauche : les fonds", prev: "Glissez vers la droite : les titres" }}>
      <div className={styles.head}>
        <div>
          <h1 className="display">{t("Fonds communs de placement")}</h1>
          <p className={styles.lead}>
            {t("Les {n} OPCVM agréés par la COSUMAF dont la valeur liquidative est publiée au Bulletin Officiel de la Cote, avec leur société de gestion et leur dépositaire.", { n: funds.length })}{" "}
            {open > 0 ? t(open > 1 ? "{n} sont ouverts à la souscription chez Purpose Capital ; " : "{n} est ouvert à la souscription chez Purpose Capital ; ", { n: open }) : ""}
            {t("pour les autres, dites-nous votre intérêt : nous organisons la relation avec la société de gestion. Les parts sont toujours inscrites à votre nom chez le dépositaire.")}
          </p>
        </div>
        {last && (
          <div className={styles.stamp}>
            {t("VL lues au BOC n° {n} du {d}", { n: last.number, d: fmtDate(last.sessionDate) })}
            <br />
            {t("source : sociétés de gestion agréées COSUMAF")}
          </div>
        )}
      </div>

      <FundsBrowser rows={funds.map((o) => ({ id: o.id, title: o.title, isin: o.isin, category: o.fund.category, frequency: o.fund.frequency, manager: o.issuer, depositary: o.fund.depositary, nav: o.fund.nav, navDate: o.fund.navDate, variationPct: o.fund.variationPct, perf1yPct: o.fund.perf1yPct, perfSinceInceptionPct: o.fund.perfSinceInceptionPct, inceptionDate: o.fund.inceptionDate, open: o.fund.distributed && !o.hidden }))} />
      {funds.length === 0 && <p className={styles.note}>{t("Les fonds apparaissent dès que le premier Bulletin Officiel de la Cote est lu par le desk.")}</p>}
      <p className={styles.note}>
        {t("Les performances passées ne préjugent pas des performances futures. Une souscription est exécutée à la prochaine valeur liquidative ; droits d'entrée et de sortie selon le règlement de chaque fonds. Purpose Capital agit en distributeur : aucune détention pour compte de tiers, les parts sont au nom du porteur au registre du dépositaire.")}
      </p>
      <BackToTop />
    </SwipePager>
  );
}
