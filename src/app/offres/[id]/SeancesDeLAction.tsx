import { PastilleVariation } from "@/components/PastilleVariation";
import { Mosaique, Majeur } from "@/components/Mosaique";
import { tradedSession, type Quote } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { getT } from "@/i18n/server";
import fa from "./FicheAction.module.css";

/**
 * LES SÉANCES D'UNE ACTION, UNE SEULE FOIS (6 novembre 2026) : la fiche de la ligne et la page de la société les montrent, et une seule définition les écrit. La clôture de la dernière
 * séance est LE cours ; le dernier échange (date, titres, cours moyen de la séance) est écrit à part, il dit la liquidité et non le prix.
 */
const signe = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`;
const titres = (n: number) => `${fmt(n)} titre${n > 1 ? "s" : ""}`;

export async function SeancesDeLAction({ quotes }: { quotes: Quote[] }) {
  const t = await getT();
  const dernier = quotes[0];
  const tradee = quotes.find(tradedSession);
  if (!dernier) return null;
  return (
    <>
      <Mosaique
        majeur={<Majeur etiquette={t("Clôture · {d}", { d: fmtDate(dernier.sessionDate) })} valeur={fmt(dernier.close)} unite="FCFA" sous={<PastilleVariation v={dernier.variationPct} periode={t("séance")} />} />}
        tuiles={[
          [t("Dernière transaction"), tradee ? `${fmtDate(tradee.sessionDate)}${tradee.volumeTraded > 0 ? ` · ${titres(tradee.volumeTraded)}` : ""}${tradee.volumeTraded > 0 && tradee.valueTraded > 0 ? ` · ${t("à {p} FCFA", { p: fmt(Math.round(tradee.valueTraded / tradee.volumeTraded)) })}` : ""}` : t("aucune sur {n} séances", { n: String(quotes.length) })],
          [t("Seuils de séance"), `${fmt(dernier.thresholdLow)} – ${fmt(dernier.thresholdHigh)}`],
          [t("Volume échangé"), `${titres(dernier.volumeTraded)} · ${fmt(dernier.valueTraded)} FCFA`],
          [t("Référence prochaine séance"), `${fmt(dernier.referenceNext)} FCFA`],
        ]}
      />
      <table className={fa.seances}>
        <thead>
          <tr>
            <th>{t("Séance")}</th>
            <th>{t("Clôture")}</th>
            <th>{t("Var.")}</th>
            <th>{t("Volume")}</th>
          </tr>
        </thead>
        <tbody>
          {quotes.slice(0, 5).map((q) => (
            <tr key={q.sessionDate}>
              <td>{fmtDate(q.sessionDate)}</td>
              <td>{fmt(q.close)}</td>
              <td className={q.variationPct < 0 ? fa.baisse : q.variationPct > 0 ? fa.hausse : undefined}>{signe(q.variationPct)}</td>
              <td>{fmt(q.volumeTraded)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {quotes.length > 5 && (
        <details className={fa.plus}>
          <summary>{t("Voir les {n} séances", { n: Math.min(quotes.length, 40) })}</summary>
          <table className={fa.seances}>
            <tbody>
              {quotes.slice(5, 40).map((q) => (
                <tr key={q.sessionDate}>
                  <td>{fmtDate(q.sessionDate)}</td>
                  <td>{fmt(q.close)}</td>
                  <td className={q.variationPct < 0 ? fa.baisse : q.variationPct > 0 ? fa.hausse : undefined}>{signe(q.variationPct)}</td>
                  <td>{fmt(q.volumeTraded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <p className={fa.note}>{t("Ces cours ne préjugent pas du prix auquel votre ordre sera exécuté.")}</p>
    </>
  );
}
