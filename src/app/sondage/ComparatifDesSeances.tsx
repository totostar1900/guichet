import type { Comparatif } from "@/lib/domain/sondage-comparatif";
import { cleDeDuree } from "@/lib/domain/sondage-comparatif";
import { fmtDate, fmtPct } from "@/lib/format";
import { CourbeDesSeances } from "./CourbeDesSeances";
import { SelecteursDeComparaison } from "./SelecteursDeComparaison";
import styles from "./ComparatifDesSeances.module.css";

type T = (s: string, v?: Record<string, string>) => string;

/**
 * LE COMPARATIF DES SÉANCES PASSÉES, SOUS LES CHIFFRES DU CLIENT (3 novembre 2026).
 *
 * DEUX LISTES EN TÊTE (pays, durée) PILOTENT TOUT : le tableau, la courbe et la phrase. Il n'y a plus
 * de second tableau « autres pays » : on change le pays au lieu de le lire dessous.
 *
 * LE TABLEAU PORTE LES DEUX CHIFFRES QUE LE CLIENT A POSÉS — le coupon et le prix — et la durée sur
 * chaque ligne : deux émissions du même jour (une 4 ans, une 5 ans) ne se confondent plus. La
 * couverture passe sous la date pour libérer la colonne.
 *
 * UN CHIFFRE NON PUBLIÉ S'ÉCRIT « non publié », jamais un tiret seul : un tiret se lit comme zéro.
 * ET QUAND AUCUNE LIMITE N'EST FIXÉE, L'ÉCRAN LE DIT : une phrase qui manque sans explication se lit
 * comme un oubli.
 */
export function ComparatifDesSeances({ c, rendementLimite, role = "attente", base, t }: { c: Comparatif; rendementLimite?: number; role?: "question" | "attente"; base: string; t: T }) {
  const np = <span className={styles.np}>{t("non publié")}</span>;
  const prix = c.unite === "prix";

  /* La durée choisie se nomme comme l'option qui la porte, quelle que soit l'écriture de l'adresse. */
  const nommee = (annees: number, repli: string) => c.options.exactes.find((o) => Math.abs(o.annees - annees) < 1e-6)?.libelle ?? repli;
  const cle = (d: Comparatif["choix"]["duree"]) => (d.type === "exacte" ? nommee(d.annees, d.libelle) : cleDeDuree(d));

  return (
    <div className={styles.comparatif}>
      <SelecteursDeComparaison
        base={base}
        pays={c.choix.pays}
        duree={cle(c.choix.duree)}
        parDefaut={{ pays: c.parDefaut.pays, duree: cle(c.parDefaut.duree) }}
        trouvees={c.trouvees}
        options={{
          pays: c.options.pays.map((o) => ({ valeur: o.pays, n: o.n })),
          exactes: c.options.exactes.map((o) => ({ valeur: o.libelle, libelle: o.libelle, n: o.n })),
          paniers: c.options.paniers.map((o) => ({ valeur: `panier:${o.nom}`, libelle: o.nom, n: o.n })),
        }}
      />

      {c.servies ? (
        <p className={styles.phrase}>
          {t(prix ? "Un prix de {l} ou moins a été servi à {n} séances sur {s}." : "Un taux de {l} ou plus a été servi à {n} séances sur {s}.", { l: fmtPct(c.limite!, 2), n: String(c.servies.n), s: String(c.servies.sur) })}{" "}
          <span className={styles.mention}>{t("Les séances passées ne préjugent pas de la prochaine.")}</span>
        </p>
      ) : c.limite == null && c.seances.length > 0 ? (
        <p className={styles.mention}>{t(prix ? "Aucun prix n'est fixé : le comparatif ne compte rien." : "Aucun taux minimum n'est fixé : le comparatif ne compte rien.")}</p>
      ) : null}

      {c.seances.length > 0 && (
        <div className={styles.defile}>
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th>{t("Séance")}</th>
                {prix && <th>{t("Coupon")}</th>}
                <th>{t(prix ? "Prix moy." : "Taux moy.")}</th>
                <th>{t("Rdt")}</th>
              </tr>
            </thead>
            <tbody>
              {c.limite != null && (
                <tr className={styles.vous}>
                  <td>{t(role === "question" ? "Niveau indicatif" : "Votre limite")}</td>
                  {prix && <td>{c.limiteCoupon != null ? `≥ ${fmtPct(c.limiteCoupon, 2)}` : ""}</td>}
                  <td>
                    {prix ? "≤" : "≥"} {fmtPct(c.limite, 2)}
                  </td>
                  <td>{rendementLimite != null ? `≥ ${fmtPct(rendementLimite, 2)}` : ""}</td>
                </tr>
              )}
              {c.seances.map((s) => (
                <tr key={s.id}>
                  <td>
                    {fmtDate(s.le)}
                    <small>{[s.tenor, s.couverture != null ? t("couv. {c} %", { c: String(Math.round(s.couverture)) }) : undefined].filter(Boolean).join(" · ")}</small>
                  </td>
                  {prix && <td>{s.coupon != null ? fmtPct(s.coupon, 2) : np}</td>}
                  <td>{s.niveau != null ? fmtPct(s.niveau, 2) : np}</td>
                  <td>{s.rendement != null ? fmtPct(s.rendement, 2) : np}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CourbeDesSeances
        points={c.seances.map((s) => ({ id: s.id, le: s.le, tenor: s.tenor, couverture: s.couverture, niveau: s.niveau, bas: s.bas, haut: s.haut, coupon: s.coupon, rendement: s.rendement }))}
        unite={c.unite}
        limite={c.limite}
        limiteCoupon={c.limiteCoupon}
        limiteRendement={rendementLimite}
        role={role}
      />
    </div>
  );
}
