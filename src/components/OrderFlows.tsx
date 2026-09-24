"use client";

import { useT } from "@/i18n/client";
import { bondCalc, btaCalc, type CashFlow } from "@/lib/finance";
import { marketBondCalc } from "@/lib/domain/status";
import { fmt, fmtDate } from "@/lib/format";
import type { IntentType, Offer } from "@/lib/domain/types";
import styles from "./OrderFlows.module.css";

/**
 * Ce que la ligne verserait, date par date, pour la quantité saisie.
 *
 * Le formulaire annonçait un décaissement et s'arrêtait là. Or ce qu'on achète
 * en achetant une obligation, ce n'est pas un prix, c'est une suite de
 * versements : un client qui voit « 970 000 FCFA à décaisser » ne sait toujours
 * pas ce qu'il reçoit ensuite, ni quand, ni combien de fois. Le tableau le dit,
 * et il le dit avant l'ordre plutôt qu'à l'avis d'opéré.
 *
 * Trois réserves tiennent à l'écran, parce qu'elles changent les chiffres.
 * L'échéancier suppose la ligne gardée jusqu'à l'échéance. Les montants sont
 * bruts, avant commission et avant fiscalité. Et sur le marché secondaire le
 * prix d'exécution n'est pas connu, donc le décaissement bouge, pas les
 * versements.
 */
export function OrderFlows({ offer, quantity, amount, limit, type }: { offer: Offer; quantity: number; amount: number; limit: number | null; type: IntentType }) {
  const t = useT();
  const flows = orderFlows(offer, quantity, amount, limit);
  if (!flows.length || type === "vente" || type === "cession" || type === "rachat") return null;
  const total = flows.reduce((s, f) => s + f.amount, 0);
  return (
    <details className={styles.wrap}>
      <summary>
        {t("Ce que cette ligne vous verserait")}
        <small>
          {flows.length} {t(flows.length > 1 ? "versements" : "versement")} · {fmt(Math.round(total))} FCFA
        </small>
      </summary>
      <div className={styles.scroll}>
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th>{t("Date")}</th>
              <th>{t("Nature")}</th>
              <th className="r">{t("Montant")}</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f) => (
              <tr key={f.date.toISOString()}>
                <td>{fmtDate(f.date.toISOString())}</td>
                <td>{t(f.label)}</td>
                <td className="r num">{fmt(Math.round(f.amount))}</td>
              </tr>
            ))}
            <tr className={styles.total}>
              <td colSpan={2}>{t("Total encaissé")}</td>
              <td className="r num">{fmt(Math.round(total))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{t("Montants bruts, avant commission et avant fiscalité, en gardant la ligne jusqu'à l'échéance. Le prix d'exécution peut changer le décaissement, pas ces versements.")}</p>
    </details>
  );
}

/**
 * Les flux d'un ordre, quel que soit le compartiment.
 *
 * `quantity` porte le nombre de titres sur la cote, où le carnet raisonne en
 * titres ; `amount` porte les francs au primaire, où c'est une somme qu'on
 * soumet. Les deux arrivent, et chaque branche prend celui qui la concerne.
 */
export function orderFlows(o: Offer, quantity: number, amount: number, limit: number | null): CashFlow[] {
  try {
    if (o.kind === "MARCHE" && o.instrument === "obligation" && quantity > 0) {
      const ref = limit ?? o.ask ?? o.lastPrice ?? 0;
      return ref > 0 ? (marketBondCalc(o, quantity * o.nominal, ref)?.flows ?? []) : [];
    }
    if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn && amount > 0) {
      const price = o.servedPricePct ?? o.pricePct ?? 100;
      return bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, amount, price).flows;
    }
    if (o.kind === "BTA" && o.precountRate != null && o.maturityOn && amount > 0) {
      // Un bon ne verse rien avant son terme : une seule ligne, et c'est déjà
      // l'information qui manque le plus, parce qu'on croit souvent à un coupon.
      const r = btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, amount, o.precountRate);
      return r.n > 0 ? [{ date: new Date(`${o.maturityOn}T12:00:00`), t: 0, amount: r.redemption, label: "Remboursement" }] : [];
    }
  } catch {
    // Un échéancier incomplet ne doit pas emporter le formulaire : sans flux, le tableau ne paraît pas.
  }
  return [];
}
