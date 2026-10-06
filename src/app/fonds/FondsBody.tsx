import { repo } from "@/lib/data";
import { fondsListes } from "@/lib/domain/listes";
import { fundAnnualPct } from "@/lib/domain/fund-perf";
import { FundsBrowser } from "./FundsBrowser";
import { FondsEnBref } from "./FondsEnBref";
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
  /* LE BULLETIN N'EST PLUS LU ICI, NI LES COMPTES TENUS. « VL lues au BOC n° {n}
     du {d} » a quitté l'en-tête, et le chapô qui annonçait le nombre de fonds
     ouverts et le nombre par catégorie est parti dans « En bref », qui ne donne
     plus de compte. Il restait la requête du bulletin, payée à chaque visite
     pour une valeur que plus rien n'affiche, et trois variables mortes. */
  const offers = await r.listOffers();
  const funds = fondsListes(offers);
  // Les courbes partent avec la page : une carte retournée les dessine tout de suite,
  // au lieu d'aller les demander et de montrer « Courbe en cours de lecture… ».
  const curves = await r.listFundCurves(funds.map((o) => o.fund.key));
  /* L'ANNUALISÉ SE CALCULE ICI, UNE FOIS, parce qu'il dépend de la date du
     jour : calculé dans le navigateur, il diffère de celui qui vient d'être
     rendu, et React le signale comme un désaccord d'hydratation. La machine
     est à UTC+3, Vercel à UTC, et ce décalage a déjà coûté une fois. */
  const maintenant = new Date();

  return (
    <>
      {/* Le retour en haut est monté par la liste, avec son jumeau. */}
      {/* LE CHAPO EST PASSE DANS LA FEUILLE « EN BREF ». Trois phrases sur ce
          qu est un OPCVM agree, plus le bandeau des quatre categories,
          faisaient pres de deux cents mots avant le premier fonds, relus a
          chaque visite. Ils n etaient pas faux, ils etaient permanents.

          LE BOUTON PASSE EN FACE DU TITRE, au coin haut droit. Il etait SOUS
          le titre, dans la meme boite, donc sur la ligne suivante : il
          reculait d un cran le debut de la liste, qui est ce pour quoi on
          vient. En face, il ne coute aucune hauteur. */}
      <div className={styles.head}>
        <h1 className="display">{t("Fonds communs de placement")}</h1>
        <FondsEnBref />
      </div>

      <FundsBrowser rows={funds.map((o) => ({ id: o.id, title: o.title, isin: o.isin, category: o.fund.category, frequency: o.fund.frequency, manager: o.issuer, depositary: o.fund.depositary, nav: o.fund.nav, navDate: o.fund.navDate, variationPct: o.fund.variationPct, perf1yPct: o.fund.perf1yPct, perfSinceInceptionPct: o.fund.perfSinceInceptionPct, annualPct: fundAnnualPct(o.fund, maintenant) ?? undefined, inceptionDate: o.fund.inceptionDate, open: o.fund.distributed && !o.hidden, entryFeePct: o.fund.entryFeePct, exitFeePct: o.fund.exitFeePct, managementFeePct: o.fund.managementFeePct, minAmount: o.fund.minAmount, cutoff: o.fund.cutoff, settlementDays: o.fund.settlementDays, curve: curves.get(o.fund.key) }))} />
      {funds.length === 0 && <p className={styles.note}>{t("Les fonds apparaissent dès que le premier Bulletin Officiel de la Cote est lu par le desk.")}</p>}
      <p className={styles.note}>
        {t("Les performances passées ne préjugent pas des performances futures. Une souscription est exécutée à la prochaine valeur liquidative ; droits d'entrée et de sortie selon le règlement de chaque fonds.")}
      </p>
    </>
  );
}
