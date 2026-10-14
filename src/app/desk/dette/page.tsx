import { DeskNav } from "@/components/DeskNav";
import { TallTable } from "@/components/desk/TallTable";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { issuerKey } from "@/data/issuer-registry";
import { adjugeParEmetteur, coteParEmetteur, fiches, RESERVES, total, type CouponAdjuge } from "@/lib/market/dette-souveraine";
import { echeancierDe } from "@/lib/market/amortissement";
import { mur, partMesuree, plusLourd, type TombeeSituee } from "@/lib/market/mur-echeances";
import { principalDuCoupon } from "@/lib/market/principal-par-le-coupon";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "La dette des États" };

/**
 * LA DETTE D'UN ÉTAT DE LA ZONE, PAR SES DEUX PORTES, AU MÊME ENDROIT.
 *
 * Aucun chiffre de cette page n'était visible avant le 14 octobre 2026, et la
 * moitié droite n'existait nulle part dans la zone. Un Trésor emprunte par la
 * cote, dont la BVMAC publie l'encours à chaque séance, et par l'adjudication,
 * qui n'en publie aucun : il s'y déduit du coupon, un paiement d'intérêts
 * étant exact et le taux facial imprimé à côté.
 *
 * LA PAGE MONTRE DEUX COLONNES ET NON UN TOTAL, et c'est une décision. Le coté
 * est un stock du jour, l'adjugé est le dernier principal connu de chaque
 * ligne, à la date de son dernier coupon. Leur somme a un ordre de grandeur
 * juste et une date floue : les fondre en un chiffre unique donnerait
 * l'illusion d'une mesure simultanée.
 *
 * LE NOM DE L'ÉTAT VIENT DU REGISTRE, parce que les deux portes ne l'écrivent
 * pas pareil : la cote dit « ETAT DU GABON », le livre des mouvements dit
 * « Gabon », et sans cette résolution le Trésor gabonais paraissait deux fois,
 * sa dette réelle de 1 101 milliards n'apparaissant nulle part.
 */
export default async function DettePage() {
  await requireDesk();
  const t = await getT();
  const r = repo();

  const cotees = await r.encoursDette();
  const ops = await r.operationsDuTresor();
  const coupons: CouponAdjuge[] = ops
    .filter((o) => o.operation === "paiement_interets" && o.codeEmission && o.couponRate && o.montant && o.operationOn)
    .map((o) => ({ pays: o.pays, code: o.codeEmission!.trim().toUpperCase(), taux: o.couponRate!, montant: o.montant!, le: o.operationOn!, echeance: o.maturityOn ?? undefined }));

  const nommer = (brut: string) => issuerKey({ issuer: brut, isin: "", title: "" });
  const auj = new Date().toISOString().slice(0, 10);
  const liste = fiches(coteParEmetteur(cotees, nommer), adjugeParEmetteur(coupons, auj, nommer));
  const somme = total(liste);


  /**
   * LE MUR : l'échéancier de la cote vient d'`amortissement.ts`, qui dit si le
   * pas est mesuré ou supposé ; celui de l'adjudication est posé in fine,
   * faute de connaître les tranches, et la page avoue la proportion.
   */
  const tombees: TombeeSituee[] = [];
  for (const l of cotees) {
    const echeance =
      l.maturityYears && l.firstListedOn
        ? new Date(Date.parse(`${l.firstListedOn}T12:00:00Z`) + l.maturityYears * 365.25 * 86_400_000).toISOString().slice(0, 10)
        : undefined;
    if (!echeance) continue;
    for (const x of echeancierDe({
      isin: l.isin,
      tauxPct: l.couponRate,
      encours: l.outstanding,
      amortissement: l.amortisation,
      periodicite: l.periodicity,
      prochainCoupon: l.nextCouponOn || auj,
      echeance,
    })) {
      tombees.push({ ...x, porte: "cote", emetteur: nommer(l.issuer) });
    }
  }
  const dernierCoupon = new Map<string, CouponAdjuge>();
  for (const c of [...coupons].sort((a, b) => a.le.localeCompare(b.le))) dernierCoupon.set(c.code, c);
  for (const c of dernierCoupon.values()) {
    if (!c.echeance || c.echeance <= auj) continue;
    const principal = principalDuCoupon(c);
    if (principal === undefined) continue;
    tombees.push({ isin: c.code, quand: c.echeance, capital: principal, coupon: 0, source: "suppose", porte: "adjuge", emetteur: nommer(c.pays) });
    /* Un coupon par an jusqu'à l'échéance, au même jour que le dernier vu :
       ces coupons-là sont annuels, mesuré zéro semestriel sur quatre-vingts. */
    for (const d = new Date(`${c.le}T12:00:00Z`); ; ) {
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      const quand = d.toISOString().slice(0, 10);
      if (quand > c.echeance) break;
      tombees.push({ isin: c.code, quand, capital: 0, coupon: c.montant, source: "mesure", porte: "adjuge", emetteur: nommer(c.pays) });
    }
  }
  const leMur = mur(tombees, auj, 12);
  const pic = plusLourd(leMur);
  const hauteur = leMur.reduce((a, q) => Math.max(a, q.capital + q.coupon), 0);

  const mds = (n: number) => `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`;
  const pct = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  return (
    <>
      <DeskNav current="/desk/dette" />
      <main className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("La dette des États de la zone")}</h1>
            <p>
              {t(
                "Ce qu'un Trésor doit par la cote, dont la bourse publie l'encours, et par l'adjudication, qui n'en publie aucun et dont le stock se déduit du coupon.",
              )}
            </p>
          </div>
        </header>

        <section className={styles.bandeau} aria-label={t("Les totaux de la zone")}>
          <div>
            <span>{t("Encours total")}</span>
            <b>
              {mds(somme.total)} <small>{t("Mds")}</small>
            </b>
          </div>
          <div>
            <span>{t("Dont coté")}</span>
            <b>
              {mds(somme.cote)} <small>{t("Mds")}</small>
            </b>
          </div>
          <div>
            <span>{t("Dont adjugé")}</span>
            <b>
              {mds(somme.adjuge)} <small>{t("Mds")}</small>
            </b>
          </div>
          <div>
            <span>{t("Part adjugée")}</span>
            <b>{somme.partAdjugee.toFixed(0)} %</b>
          </div>
          <div>
            <span>{t("Coupons dus par an")}</span>
            <b>
              {mds(somme.coutTotal)} <small>{t("Mds")}</small>
            </b>
          </div>
          <div>
            <span>{t("Taux moyen pondéré")}</span>
            <b>{somme.total ? pct((somme.coutTotal / somme.total) * 100) : "—"}</b>
          </div>
        </section>

        <TallTable total={liste.length}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th rowSpan={2}>{t("Émetteur")}</th>
                <th colSpan={3} className={styles.groupe}>
                  {t("À la cote")}
                </th>
                <th colSpan={3} className={styles.groupe}>
                  {t("Par adjudication")}
                </th>
                <th rowSpan={2} className={styles.r}>
                  {t("Total")}
                </th>
                <th rowSpan={2} className={styles.r}>
                  {t("Coupons / an")}
                </th>
              </tr>
              <tr>
                <th className={styles.r}>{t("Encours")}</th>
                <th className={styles.r}>{t("Lignes")}</th>
                <th className={styles.r}>{t("Taux")}</th>
                <th className={styles.r}>{t("Encours")}</th>
                <th className={styles.r}>{t("Lignes")}</th>
                <th className={styles.r}>{t("Taux")}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((f) => (
                <tr key={f.emetteur}>
                  <td>{f.emetteur}</td>
                  {/* Une porte non empruntée garde une case vide, et le titre
                      dit laquelle : la BDEAC n'adjuge pas, ce n'est pas une
                      donnée qui manque. */}
                  <td className={styles.r} title={f.cote ? t("Stock publié à la séance du {d}", { d: fmtDate(f.cote.le) }) : undefined}>
                    {f.cote ? mds(f.cote.encours) : <span className={styles.vide}>{t("n'emprunte pas ainsi")}</span>}
                  </td>
                  <td className={styles.r}>{f.cote?.lignes ?? ""}</td>
                  <td className={styles.r}>{f.cote ? pct(f.cote.tauxMoyen) : ""}</td>
                  <td className={styles.r} title={f.adjuge ? t("Déduit du dernier coupon vu, le {d}", { d: fmtDate(f.adjuge.le) }) : undefined}>
                    {f.adjuge ? mds(f.adjuge.encours) : <span className={styles.vide}>{t("n'emprunte pas ainsi")}</span>}
                  </td>
                  <td className={styles.r}>{f.adjuge?.lignes ?? ""}</td>
                  <td className={styles.r}>{f.adjuge ? pct(f.adjuge.tauxMoyen) : ""}</td>
                  <td className={`${styles.r} ${styles.fort}`}>{mds(f.total)}</td>
                  <td className={styles.r}>{mds(f.coutTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("Zone")}</td>
                <td className={styles.r}>{mds(somme.cote)}</td>
                <td colSpan={2} />
                <td className={styles.r}>{mds(somme.adjuge)}</td>
                <td colSpan={2} />
                <td className={`${styles.r} ${styles.fort}`}>{mds(somme.total)}</td>
                <td className={styles.r}>{mds(somme.coutTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </TallTable>


        {/* LE MUR : un encours ne dit pas QUAND il faut payer. Deux mille
            quatre cents milliards dus ne disent rien du risque ; quatre cent
            soixante dus le meme trimestre le disent. */}
        <section className={styles.mur} aria-label={t("Le mur des échéances")}>
          <h2>{t("Quand la zone doit payer")}</h2>
          <p className={styles.sous}>
            {t(
              "Capital et coupons dus par trimestre, les deux portes réunies. Le capital se refinance ou se rembourse, le coupon se paie sur la trésorerie : les additionner cacherait lequel des deux pèse.",
            )}
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("Trimestre")}</th>
                <th className={styles.r}>{t("Capital")}</th>
                <th className={styles.r}>{t("Coupons")}</th>
                <th className={styles.r}>{t("Total")}</th>
                <th className={styles.barreTete}>{t("Dont coté · adjugé")}</th>
                <th className={styles.r}>{t("Lignes")}</th>
              </tr>
            </thead>
            <tbody>
              {leMur.map((q) => {
                const t2 = q.capital + q.coupon;
                return (
                  <tr key={q.clef} className={q.clef === pic?.clef ? styles.pic : undefined}>
                    <td>{q.clef}</td>
                    <td className={styles.r}>{t2 ? mds(q.capital) : "—"}</td>
                    <td className={styles.r}>{t2 ? mds(q.coupon) : "—"}</td>
                    <td className={`${styles.r} ${styles.fort}`}>{t2 ? mds(t2) : "—"}</td>
                    {/* La barre double la colonne Total, elle ne la remplace
                        pas : une longueur ne se lit pas au milliard près, et
                        un lecteur qui ne distingue pas les deux teintes garde
                        les chiffres. */}
                    <td>
                      <span className={styles.barre} aria-hidden="true">
                        <i className={styles.bCote} style={{ width: `${hauteur ? ((q.parPorte.cote.capital + q.parPorte.cote.coupon) / hauteur) * 100 : 0}%` }} />
                        <i className={styles.bAdj} style={{ width: `${hauteur ? ((q.parPorte.adjuge.capital + q.parPorte.adjuge.coupon) / hauteur) * 100 : 0}%` }} />
                      </span>
                    </td>
                    <td className={styles.r}>{q.lignes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={styles.unites}>
            {t("Le mur le plus haut : {q}, {m} Mds. Part du capital dont le pas d'amortissement est mesuré et non supposé : {p} %.", {
              q: pic?.clef ?? "—",
              m: pic ? mds(pic.capital + pic.coupon) : "—",
              p: partMesuree(leMur).toFixed(0),
            })}
          </p>
        </section>

        {/* LES RÉSERVES SONT SUR LA PAGE, PAS EN NOTE DE BAS DE PAGE. Un total
            dont on ignore ce qu'il laisse dehors ne vaut rien, et celui-ci
            laisse dehors trois choses nommables. */}
        <section className={styles.reserves}>
          <h2>{t("Ce qu'il faut lire avec ces chiffres")}</h2>
          <ul>
            {RESERVES.map((x) => (
              <li key={x}>{t(x)}</li>
            ))}
          </ul>
          <p className={styles.unites}>{t("Tous les montants sont en milliards de francs CFA.")}</p>
        </section>
      </main>
    </>
  );
}
