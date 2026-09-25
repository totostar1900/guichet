import Link from "next/link";
import type { Cross, LineCrossing } from "@/lib/domain/crossing";
import type { Offer } from "@/lib/domain/types";
import type { LineFill } from "@/lib/market/fill";
import { fmt, fmtPrice } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./CrossBook.module.css";

/**
 * Les clients qui se font face, ligne par ligne.
 *
 * Un porteur qui veut sortir d'une obligation de la zone n'a le plus souvent
 * aucun marché devant lui. Sa seule contrepartie possible est un autre client
 * de la maison, et les deux ordres dormaient dans la même liste sans que
 * personne ne les rapproche, parce que rien ne les mettait côte à côte.
 *
 * Deux précautions tiennent cet écran.
 *
 * Le prix n'est pas décidé ici. On montre la bande : le plancher du vendeur, le
 * plafond de l'acheteur, et le milieu qui partage l'écart en deux. Tout point
 * de la bande sert les deux clients, et c'est une négociation, pas un calcul.
 *
 * Ce qui attend reste affiché. Une ligne où trois vendeurs n'ont aucun acheteur
 * n'a rien à apparier, et c'est précisément le renseignement utile : il dit où
 * aller chercher la contrepartie qui manque.
 */
export async function CrossBook({ lines, fills }: { lines: { c: LineCrossing; o: Offer }[]; fills?: Map<string, LineFill> }) {
  const t = await getT();
  if (!lines.length) return <p className="muted">{t("Aucun ordre en attente sur une ligne cotée.")}</p>;
  return (
    <div className={styles.wrap}>
      {lines.map(({ c, o }) => {
        const bond = o.instrument === "obligation";
        const price = (v: number) => (bond ? fmtPrice(v) : `${fmt(v)} FCFA`);
        // La carte des taux de service est rangée par ISIN, pas par identifiant d'offre.
        const fill = o.isin ? fills?.get(o.isin) : undefined;
        const never = fill?.sessions ? fill.traded === 0 : false;
        return (
          <section key={c.offerId} className={styles.line}>
            <header className={styles.head}>
              <span className={styles.who}>
                <Link href={`/desk/lignes/${o.id}`}>{o.title}</Link>
                <small className="muted">
                  {o.isin}
                  {/* Le taux de service donne son poids à l'appariement : sur une
                      ligne qui ne s'échange jamais, il n'y a pas d'autre issue. */}
                  {never ? ` · ${t("jamais échangée")}` : ""}
                </small>
              </span>
              <span className={c.qty ? styles.qty : styles.none}>
                {c.qty ? t("{n} titres appariables", { n: fmt(c.qty) }) : t("aucune contrepartie")}
              </span>
            </header>

            {c.crosses.length > 0 && (
              <div className="scroll-x">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("Acheteur")}</th>
                      <th>{t("Vendeur")}</th>
                      <th className="r">{t("Titres")}</th>
                      <th className="r">{t("Plancher")}</th>
                      <th className="r">{t("Milieu")}</th>
                      <th className="r">{t("Plafond")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.crosses.map((x: Cross, k: number) => (
                      <tr key={`${x.buy.id}-${x.sell.id}-${k}`}>
                        <td className="who">
                          {x.buy.clientName}
                          <small className="mono">{x.buy.ref}</small>
                        </td>
                        <td className="who">
                          {x.sell.clientName}
                          <small className="mono">{x.sell.ref}</small>
                        </td>
                        <td className="r num">{fmt(x.qty)}</td>
                        {/* « au marché » ne pose aucune borne : le tiret dit qu'il
                            n'y a pas de chiffre, et non qu'il vaut zéro. */}
                        <td className="r num">{x.low != null ? price(x.low) : <span className="muted">{t("au marché")}</span>}</td>
                        <td className="r num">{x.mid != null ? <b>{price(x.mid)}</b> : <span className="muted">—</span>}</td>
                        <td className="r num">{x.high != null ? price(x.high) : <span className="muted">{t("au marché")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(c.restBuy > 0 || c.restSell > 0) && (
              <p className={styles.rest}>
                {c.restBuy > 0 ? t("{n} titres à l'achat sans contrepartie", { n: fmt(c.restBuy) }) : ""}
                {c.restBuy > 0 && c.restSell > 0 ? " · " : ""}
                {c.restSell > 0 ? t("{n} titres à la vente sans contrepartie", { n: fmt(c.restSell) }) : ""}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
