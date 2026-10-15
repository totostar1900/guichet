import { fmtDate, fmtPct } from "@/lib/format";
import { getT } from "@/i18n/server";
import { santeIndice, type CotationLue, type PoidsValeur, type PointIndice, type Ponderation } from "@/lib/market/sante-indice";
import { coursSurBenefice, peDEnsemble, type ComptesLus } from "@/lib/market/cours-sur-benefice";
import styles from "./SanteIndice.module.css";

/**
 * LA SANTÉ DE L'INDICE, AU DESK.
 *
 * La page de l'indice dit déjà le niveau, les séances, la composition et les
 * poids. Ce panneau ne les répète pas : il ajoute les six mesures qu'elle ne
 * portait pas, et qui décident de la façon dont on lit tout le reste.
 *
 * POURQUOI AU DESK ET PAS CHEZ LE CLIENT. Ces chiffres se commentent : « un
 * émetteur pèse 73 % » est une mise en garde pour qui conseille, et une phrase
 * inquiétante pour qui lit seul. Ils entreront dans la page publique le jour
 * où l'éclairage les accompagnera.
 *
 * LES DEUX PONDÉRATIONS SONT MONTRÉES ENSEMBLE, parce que c'est précisément
 * leur écart qui informe : en capitalisation totale l'indice est le thermomètre
 * d'un émetteur, en flottant il décrit ce qu'un investisseur peut acheter.
 */
export async function SanteIndice({
  points,
  poids,
  histoires,
  comptes = [],
}: {
  points: PointIndice[];
  poids: PoidsValeur[];
  histoires: { mnemo?: string; quotes: CotationLue[] }[];
  comptes?: ComptesLus[];
}) {
  const t = await getT();
  const vues: Ponderation[] = ["total", "flottant"];
  const [tot, flo] = vues.map((p) => santeIndice(points, poids, histoires, p));
  const s = tot;
  if (!s.niveaux.points) return null;

  const pct = (v: number | undefined, d = 1) => (v == null ? "—" : fmtPct(v, d));
  const nombre = (v: number | undefined, d = 1) => (v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
  const part = (n: number, sur: number) => (sur ? fmtPct((100 * n) / sur, 1) : "—");

  /* LE RATIO COURS SUR BÉNÉFICE, débloqué le 15 octobre 2026 par la lecture
     des quarante-huit états financiers : la colonne du bulletin est vide sur
     les 4 995 lignes d'actions. */
  const pes = coursSurBenefice(comptes, poids.map((x) => ({ mnemo: x.mnemo, close: x.close, capTotal: x.capTotal })));
  const ens = peDEnsemble(pes);

  const cartes = [
    {
      b: pct(s.concentration.premier, 1),
      s: t("{m} dans la capitalisation", { m: s.concentration.nom ?? "—" }),
      e: t("Les trois premiers en pèsent {p}. Sur le flottant coté, le premier tombe à {f}.", {
        p: pct(s.concentration.troisPremiers, 1),
        f: pct(flo.concentration.premier, 1),
      }),
      alerte: s.concentration.premier > 50,
    },
    {
      b: part(s.souffle.negociees, s.souffle.cotations),
      s: t("des cotations portent un échange"),
      e: t("{n} cotation(s) négociée(s) sur {tous} lues, en {j} séance(s).", { n: s.souffle.negociees, tous: s.souffle.cotations, j: s.souffle.seances }),
      alerte: true,
    },
    {
      b: part(s.niveaux.distincts, s.niveaux.points),
      s: t("de niveaux distincts dans l'indice"),
      e: t("{d} valeurs différentes sur {p} séances : le reste reporte le niveau de la veille.", { d: s.niveaux.distincts, p: s.niveaux.points }),
      alerte: true,
    },
    {
      b: ens.pe == null ? "—" : `× ${nombre(ens.pe, 1)}`,
      s: t("cours sur bénéfice de la cote"),
      e: t("Capitalisations et résultats additionnés, sur {n} valeur(s) de {tous}. Exercice(s) {e}.", {
        n: ens.comptees,
        tous: ens.total,
        e: ens.exercices.join(", ") || "—",
      }),
    },
    {
      b: pct(s.rendement.pct, 2),
      s: t("rendement du dividende"),
      e: t("Pondéré par la capitalisation, sur {n} valeur(s) sur {tous}. Sur le flottant : {f}.", {
        n: s.rendement.comptees,
        tous: s.rendement.total,
        f: pct(flo.rendement.pct, 2),
      }),
    },
    {
      b: pct(s.repli.pct, 2),
      s: t("repli maximum"),
      e:
        s.repli.sommetLe && s.repli.creuxLe
          ? t("Du sommet du {a} au creux du {b}.", { a: fmtDate(s.repli.sommetLe), b: fmtDate(s.repli.creuxLe) })
          : t("L'indice n'a pas reculé sur la période lue."),
    },
    {
      b: pct(s.volatilite, 2),
      s: t("volatilité mensuelle"),
      e: t("Écart type des variations d'un mois à l'autre. Au jour le jour, ce chiffre mesurerait l'absence d'échange et non le risque."),
    },
    {
      b: s.total.total == null ? "—" : pct(s.total.total, 1),
      s: t("rendu dividendes compris"),
      e: t("Contre {p} pour le prix seul, sur {n} détachement(s) lus. L'indice officiel ignore ce que les sociétés versent.", {
        p: pct(s.total.prix, 1),
        n: s.total.detachements,
      }),
    },
  ];

  return (
    <section className="panel" id="sante">
      <div className="panel-h">
        <h2>{t("Santé de l'indice")}</h2>
        <span className="muted">{t("ce qu'il faut savoir avant de lire une variation")}</span>
      </div>
      <div className={styles.cartes}>
        {cartes.map((c) => (
          <div key={c.s} className={c.alerte ? `${styles.carte} ${styles.alerte}` : styles.carte}>
            <b>{c.b}</b>
            <span>{c.s}</span>
            <em>{c.e}</em>
          </div>
        ))}
      </div>
      <div className={styles.bande} aria-hidden>
        {s.concentration.parts.map((p) => (
          <i key={p.mnemo} style={{ width: `${p.pct}%` }} title={`${p.mnemo} ${fmtPct(p.pct, 1)}`}>
            {p.pct > 7 ? <span>{p.mnemo}</span> : null}
          </i>
        ))}
      </div>
      <p className={styles.note}>
        <b>{t("La pondération n'est pas un détail de calcul.")}</b>{" "}
        {t(
          "La bande ci-dessus montre la capitalisation totale. Sur le flottant coté, les trois premiers pèsent {f} au lieu de {p} : l'indice officiel décrit la taille des sociétés, pas ce qu'un investisseur peut acheter.",
          { f: pct(flo.concentration.troisPremiers, 1), p: pct(s.concentration.troisPremiers, 1) },
        )}
      </p>
      <div className={styles.deroule}>
        <table className={styles.valeurs}>
          <thead>
            <tr>
              <th>{t("Valeur")}</th>
              <th className={styles.num}>{t("Cours / bénéfice")}</th>
              <th className={styles.num}>{t("Rentabilité des fonds propres")}</th>
              <th className={styles.num}>{t("Croissance du bénéfice")}</th>
              <th className={styles.num}>{t("Exercice")}</th>
              <th className={styles.num}>{t("Bêta mensuel")}</th>
              <th className={styles.num}>{t("Mois comparés")}</th>
              <th className={styles.num}>{t("Mois où elle bouge")}</th>
              <th className={styles.num}>{t("Hausses")}</th>
              <th className={styles.num}>{t("Baisses")}</th>
            </tr>
          </thead>
          <tbody>
            {s.betas.map((b) => {
              const e = pes.find((x) => x.mnemo === b.mnemo);
              return (
              <tr key={b.mnemo}>
                <td>
                  <b>{b.mnemo}</b>
                </td>
                <td className={styles.num} title={e?.reserve}>
                  {e?.pe == null ? "—" : `× ${nombre(e.pe, 1)}`}
                </td>
                <td className={styles.num}>{e?.rendementDesFondsPropres == null ? "—" : pct(e.rendementDesFondsPropres, 1)}</td>
                <td className={styles.num}>{e?.croissance == null ? "—" : `${e.croissance > 0 ? "+" : ""}${pct(e.croissance, 0)}`}</td>
                <td className={styles.num}>
                  {e?.exercice ?? "—"}
                  {e?.referentiel && e.referentiel !== "OHADA" ? ` · ${e.referentiel}` : ""}
                </td>
                <td className={styles.num}>{b.beta == null ? "—" : b.beta.toFixed(2).replace(".", ",")}</td>
                <td className={styles.num}>{b.mois}</td>
                <td className={styles.num}>{b.moisActifs}</td>
                <td className={styles.num}>{b.hausses}</td>
                <td className={styles.num}>{b.baisses}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        <b>{t("Un bêta proche de zéro peut être de l'immobilité, pas de la stabilité.")}</b>{" "}
        {t(
          "Il est calculé au pas mensuel, parce qu'au jour le jour une valeur qui ne s'échange pas rendrait zéro et dirait l'inverse de la vérité. La colonne des mois où le cours bouge dit si le chiffre veut dire quelque chose.",
        )}
      </p>
      <p className={styles.manque}>
        <b>{t("Deux mesures ne peuvent pas exister ici.")}</b>{" "}
        {t(
          "Un indice de volatilité implicite est impossible faute de marché d'options dans la zone, et l'écart de réplication n'a pas d'objet tant qu'aucun fonds ne réplique l'indice. Le ratio cours sur bénéfice, lui, est désormais calculé : il sort de la lecture des quarante-huit états financiers des émetteurs, la colonne du bulletin étant vide sur toutes ses lignes.",
        )}
      </p>
    </section>
  );
}
