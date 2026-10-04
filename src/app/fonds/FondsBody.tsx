import { repo } from "@/lib/data";
import { FundsBrowser } from "./FundsBrowser";
import { BackToTop } from "@/components/BackToTop";
import { FondsEnBref } from "./FondsEnBref";
import type { Offer } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

/**
 * La liste des fonds, une seule fois.
 *
 * Le Guichet la montre au client, le desk la montre au desk : ce sont les
 * mêmes fonds, lus au même bulletin, et il n'y aurait aucun sens à en tenir
 * deux versions. C'est « DeskView », autour de ce corps, qui dit où mènent les
 * rangées et quelles commandes n'ont pas lieu d'être.
 */
export async function FondsBody() {
  const t = await getT();
  const r = repo();
  const [offers, bulletins] = await Promise.all([r.listOffers(), r.listBulletins(1)]);
  const funds = offers.filter((o): o is Offer & { fund: NonNullable<Offer["fund"]> } => o.kind === "FONDS" && Boolean(o.fund));
  // Les courbes partent avec la page : une carte retournée les dessine tout de suite,
  // au lieu d'aller les demander et de montrer « Courbe en cours de lecture… ».
  const curves = await r.listFundCurves(funds.map((o) => o.fund.key));
  const last = bulletins[0];
  const open = funds.filter((o) => o.fund.distributed && !o.hidden).length;
  /* Le compte par categorie : la feuille « En bref » le montre a cote de
     chaque definition, parce qu une categorie vide ne se promet pas. */
  const parCategorie: Partial<Record<string, number>> = {};
  for (const o of funds) parCategorie[o.fund.category] = (parCategorie[o.fund.category] ?? 0) + 1;

  return (
    <>
      <BackToTop />
      <div className={styles.head}>
        <div>
          <h1 className="display">{t("Fonds communs de placement")}</h1>
          {/* LE CHAPO EST PASSE DANS LA FEUILLE « EN BREF ». Trois phrases sur
              ce qu est un OPCVM agree, plus le bandeau des quatre categories,
              faisaient pres de deux cents mots avant le premier fonds, relus a
              chaque visite. Ils n etaient pas faux, ils etaient permanents. */}
          <FondsEnBref />
        </div>
      </div>

      <FundsBrowser rows={funds.map((o) => ({ id: o.id, title: o.title, isin: o.isin, category: o.fund.category, frequency: o.fund.frequency, manager: o.issuer, depositary: o.fund.depositary, nav: o.fund.nav, navDate: o.fund.navDate, variationPct: o.fund.variationPct, perf1yPct: o.fund.perf1yPct, perfSinceInceptionPct: o.fund.perfSinceInceptionPct, inceptionDate: o.fund.inceptionDate, open: o.fund.distributed && !o.hidden, entryFeePct: o.fund.entryFeePct, exitFeePct: o.fund.exitFeePct, managementFeePct: o.fund.managementFeePct, minAmount: o.fund.minAmount, cutoff: o.fund.cutoff, settlementDays: o.fund.settlementDays, curve: curves.get(o.fund.key) }))} />
      {funds.length === 0 && <p className={styles.note}>{t("Les fonds apparaissent dès que le premier Bulletin Officiel de la Cote est lu par le desk.")}</p>}
      <p className={styles.note}>
        {t("Les performances passées ne préjugent pas des performances futures. Une souscription est exécutée à la prochaine valeur liquidative ; droits d'entrée et de sortie selon le règlement de chaque fonds. Purpose Capital agit en distributeur : aucune détention pour compte de tiers, les parts sont au nom du porteur au registre du dépositaire.")}
      </p>
    </>
  );
}
