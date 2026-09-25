"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Amount } from "./Amount";
import { FlowsChart } from "./FlowsChart";
import { bondCalc, btaCalc, type CashFlow } from "@/lib/finance";
import { marketAmortInput, marketBondCalc, marketBondInput } from "@/lib/domain/status";
import { fmtDate } from "@/lib/format";
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
export function OrderFlows({ offer, quantity, amount, limit, type, settleOn }: { offer: Offer; quantity: number; amount: number; limit: number | null; type: IntentType; settleOn?: string }) {
  const t = useT();
  // Le tableau d'abord : il donne les dates exactes, que le dessin ne donne
  // pas. Le dessin donne la forme, que le tableau ne donne pas. Personne ne
  // peut deviner lequel des deux le lecteur est venu chercher.
  const [view, setView] = useState<"table" | "chart">("table");
  const [open, setOpen] = useState(false);
  const { flows, outlay, settleOn: on } = orderPlan(offer, quantity, amount, limit);
  if (!flows.length || type === "vente" || type === "cession" || type === "rachat") return null;
  const total = flows.reduce((s, f) => s + f.amount, 0);
  return (
    <div className={styles.wrap}>
      {/* Un vrai bouton plutôt qu'un « summary » : la feuille de style met le
          sommaire en « display: flex », ce qui efface le triangle natif sur
          WebKit, et la section n'avait alors plus rien qui dise qu'elle s'ouvre. */}
      <button type="button" className={styles.head} aria-expanded={open} aria-controls="order-flows" onClick={() => setOpen((v) => !v)}>
        <span className={styles.headTitle}>{t("Ce que cette ligne vous verserait")}</span>
        <small>
          {flows.length} {t(flows.length > 1 ? "versements" : "versement")} · <Amount value={total} />
        </small>
        <svg className={`${styles.chev} ${open ? styles.chevOpen : ""}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id="order-flows">
          <div className={styles.views} role="group" aria-label={t("Affichage")}>
            {(["table", "chart"] as const).map((v) => (
              <button key={v} type="button" className={view === v ? styles.viewOn : undefined} aria-pressed={view === v} onClick={() => setView(v)}>
                {t(v === "table" ? "Tableau" : "Graphique")}
              </button>
            ))}
          </div>
          {view === "chart" ? (
            <div className={styles.chart}>
              <FlowsChart outlay={outlay} flows={flows} settleOn={settleOn ?? on} scale={0.8} />
            </div>
          ) : (
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
                      <td className="r num">
                        <Amount value={f.amount} unit={null} />
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.total}>
                    <td colSpan={2}>{t("Total encaissé")}</td>
                    <td className="r num">
                      <Amount value={total} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.note}>{t("Montants bruts, avant commission et avant fiscalité, en gardant la ligne jusqu'à l'échéance. Le prix d'exécution peut changer le décaissement, pas ces versements.")}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Le plan d'un ordre : ce qu'il coûte, quand il se règle, ce qu'il verse.
 *
 * Les trois se lisent du même calcul et se sont longtemps lus de deux
 * fonctions à conditions identiques. Une seule, désormais : le tableau prend
 * les versements, le dessin prend aussi la mise et sa date, faute de quoi la
 * courbe partirait d'un jour qui n'est pas celui du règlement.
 *
 * `quantity` porte le nombre de titres sur la cote, où le carnet raisonne en
 * titres ; `amount` porte les francs au primaire, où c'est une somme qu'on
 * soumet. Les deux arrivent, et chaque branche prend celui qui la concerne.
 */
export interface OrderPlan {
  flows: CashFlow[];
  outlay: number;
  settleOn: string;
  /** Le rendement actuariel de cet ordre-ci, pour la quantité saisie. */
  yieldPct?: number;
}

export function orderPlan(o: Offer, quantity: number, amount: number, limit: number | null): OrderPlan {
  const none = { flows: [] as CashFlow[], outlay: 0, settleOn: o.settleOn };
  try {
    if (o.kind === "MARCHE" && o.instrument === "obligation" && quantity > 0) {
      const ref = limit ?? o.ask ?? o.lastPrice ?? 0;
      if (ref <= 0) return none;
      const r = marketBondCalc(o, quantity * o.nominal, ref);
      const inp = marketAmortInput(o) ?? marketBondInput(o);
      return r ? { flows: r.flows, outlay: r.outlay, settleOn: inp?.settleOn ?? o.settleOn, yieldPct: r.irr } : none;
    }
    if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn && amount > 0) {
      const price = o.servedPricePct ?? o.pricePct ?? 100;
      const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, amount, price);
      return { flows: r.flows, outlay: r.outlay, settleOn: o.settleOn, yieldPct: r.irr };
    }
    if (o.kind === "BTA" && o.precountRate != null && o.maturityOn && amount > 0) {
      // Un bon ne verse rien avant son terme : une seule ligne, et c'est déjà
      // l'information qui manque le plus, parce qu'on croit souvent à un coupon.
      const r = btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, amount, o.precountRate);
      return r.n > 0 ? { flows: [{ date: new Date(`${o.maturityOn}T12:00:00`), t: 0, amount: r.redemption, label: "Remboursement" }], outlay: r.outlay, settleOn: o.settleOn, yieldPct: r.yieldPct } : none;
    }
  } catch {
    // Un échéancier incomplet ne doit pas emporter le formulaire : sans flux,
    // la section ne paraît pas.
  }
  return none;
}

/** Les seuls versements, pour qui n'a que faire de la mise. */
export const orderFlows = (o: Offer, quantity: number, amount: number, limit: number | null): CashFlow[] => orderPlan(o, quantity, amount, limit).flows;

/** Ce que l'ordre rend, une fois posé : la mise, ce qui revient, et le taux. */
export const orderTotals = (p: OrderPlan): { outlay: number; received: number; yieldPct?: number } => ({ outlay: p.outlay, received: p.flows.reduce((s, f) => s + f.amount, 0), yieldPct: p.yieldPct });
