import type { SurveyLadder } from "@/lib/domain/survey";
import { fmt, fmtPct, fmtPrice } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./DemandLadder.module.css";

/**
 * L'échelle de la demande, telle qu'on la porte à un émetteur.
 *
 * Elle se lit de haut en bas dans le sens du service : le premier palier est
 * celui qui sert l'émetteur le mieux, et chaque ligne dit ce qui tient encore
 * en descendant. « À 97 % ou mieux : deux cent cinquante millions, dont cent
 * quatre-vingts fermes » est une phrase qu'un émetteur écoute ; la liste des
 * demandes une par une ne l'est pas.
 *
 * Le ferme et l'appétit restent séparés partout, sans jamais être additionnés
 * en un total unique. Les confondre ferait annoncer comme un engagement ce qui
 * n'est qu'un intérêt, et c'est l'erreur qui se paie le plus cher : une seule
 * fois suffit pour que l'émetteur cesse de croire les chiffres suivants.
 *
 * Aucun nom ici. Ce qu'un émetteur a besoin de savoir est combien et à quelle
 * condition, pas qui.
 */
export async function DemandLadder({ l }: { l: SurveyLadder }) {
  const t = await getT();
  if (!l.orders) return <p className="muted">{t("Aucune demande sur cette ligne pour l'instant.")}</p>;
  const level = (v: number | null) => (v == null ? t("sans condition") : l.unit === "taux" ? fmtPct(v, 2) : fmtPrice(v));
  return (
    <div className={styles.wrap}>
      <div className="scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t(l.unit === "taux" ? "Taux minimum" : "Prix maximum")}</th>
              <th className="r">{t("Ferme")}</th>
              <th className="r">{t("Appétit")}</th>
              <th className="r">{t("Demandes")}</th>
            </tr>
          </thead>
          <tbody>
            {l.rows.map((r) => (
              <tr key={r.limit ?? "libre"}>
                <td className="num">
                  {level(r.limit)}
                  {r.limit != null && <small className="muted"> {t("ou mieux")}</small>}
                </td>
                <td className="r num">
                  <b>{fmt(r.firm)}</b>
                </td>
                <td className="r num">{fmt(r.soft)}</td>
                <td className="r num">{r.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.foot}>
        {/* Le total, dit une fois, et les deux natures jamais confondues. */}
        {t("{f} FCFA fermes et {s} FCFA d'appétit, sur {n} demande(s).", { f: fmt(l.firm), s: fmt(l.soft), n: String(l.orders) })}
        {l.unconditional > 0 ? ` ${t("Dont {u} FCFA sans condition.", { u: fmt(l.unconditional) })}` : ""}
      </p>
    </div>
  );
}
