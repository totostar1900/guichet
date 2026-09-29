import type { AvisGarde } from "@/lib/domain/garde";
import { fmt, fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./AvisGardeList.module.css";

/**
 * Ce que la conservation a coûté, trimestre par trimestre.
 *
 * Un frais qu'on ne voit qu'au relevé bancaire est un frais qu'on subit. Celui
 * dont on peut lire la ligne à ligne est un frais qu'on vérifie, et c'est la
 * seule différence qui compte : l'avis porte l'assiette de chaque titre, les
 * jours réellement gardés, et le taux appliqué.
 *
 * Un avis à zéro paraît comme les autres. Il dit que la conservation a été
 * calculée et qu'elle n'a rien coûté, ce qui est une information : son absence
 * se lirait comme un oubli, sa présence se lit comme une décision.
 */
export async function AvisGardeList({ avis }: { avis: AvisGarde[] }) {
  const t = await getT();
  if (!avis.length) return null;
  return (
    <div className={styles.liste}>
      {avis.map((a) => {
        const facturees = a.lignes.filter((l) => l.jours > 0 && !l.exoneree);
        return (
          <details key={a.id} className={styles.avis}>
            <summary>
              <span className={styles.periode}>
                {a.period}
                <small>{t("du {a} au {b}", { a: fmtDate(a.periodFrom), b: fmtDate(a.periodTo) })}</small>
              </span>
              <span className={styles.montant}>
                {a.du > 0 ? (
                  <b>{t("{m} FCFA", { m: fmt(Math.round(a.du)) })}</b>
                ) : (
                  <b className={styles.gratuit}>{t("sans frais")}</b>
                )}
                <small className="mono">{a.ref}</small>
              </span>
            </summary>
            <div className={styles.detail}>
              {a.du <= 0 && (
                <p className={styles.raison}>
                  {a.raison === "barème fermé"
                    ? t("La maison n'applique pas de droits de garde sur cette période : votre conservation ne vous a rien coûté.")
                    : a.raison === "sous la franchise"
                      ? t("Votre encours moyen est resté sous la franchise : la période n'est pas facturée.")
                      : t("Aucune ligne facturable sur cette période.")}
                </p>
              )}
              <table>
                <thead>
                  <tr>
                    <th>{t("Ligne")}</th>
                    <th className="r">{t("Assiette")}</th>
                    <th className="r">{t("Jours gardés")}</th>
                    <th className="r">{t("Part")}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.lignes.map((l, i) => (
                    <tr key={`${l.intentId}-${i}`} className={l.exoneree || l.jours <= 0 ? styles.hors : undefined}>
                      <td>
                        {l.titre}
                        {/* Un nominal n'est pas un prix : le dire évite qu'on
                            croie l'assiette tirée d'un cours qui n'existe pas. */}
                        <small>{l.origine === "cours" ? t("valorisée au dernier cours") : t("valorisée au nominal, faute de cours")}</small>
                      </td>
                      <td className="r">{fmt(Math.round(l.assiette))}</td>
                      <td className="r">{l.jours}</td>
                      <td className="r">{l.exoneree ? <span className="muted">{t("exonérée")}</span> : fmt(Math.round(l.brut))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.pied}>
                {t("Taux appliqué : {b} points de base par an, au prorata des jours réellement gardés.", { b: a.bareme.bps })}
                {a.plancher ? ` ${t("Le plancher de {m} FCFA par trimestre s'est appliqué.", { m: fmt(a.bareme.minimum) })}` : ""}
                {a.bareme.exonerees.length ? ` ${t("Les parts de fonds sont exonérées : leurs frais sont déjà pris dans la valeur liquidative.")}` : ""}
              </p>
              {facturees.length === 0 && a.lignes.length > 0 && (
                <p className={styles.pied}>{t("Les lignes grisées n'ont pas été facturées : exonérées, ou entrées après la fin de la période.")}</p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
