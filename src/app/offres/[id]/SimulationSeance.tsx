"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Amount } from "@/components/Amount";
import { Carte } from "@/components/Carte";
import { FlowsChart } from "@/components/FlowsChart";
import { Info } from "@/components/Info";
import { useT } from "@/i18n/client";
import { useDates } from "@/i18n/client";
import { MONTANT_PAR_DEFAUT, calculer, type ParamsSeance } from "@/lib/domain/simulation-seance";
import { fmt, fmtPct, parseAmount } from "@/lib/format";
import styles from "./page.module.css";
import css from "./SimulationSeance.module.css";

/**
 * « CE QUE CELA REPRÉSENTE », AVEC UN MONTANT QU'ON SAISIT (6 novembre 2026, planche « A · 10 000 000 par défaut »).
 *
 * Le calcul d'une séance se faisait pour 10 000 000 FCFA de nominal, écrit en dur. Le champ le garde pour valeur de départ et laisse le lecteur poser le sien ; la
 * carte et l'échéancier suivent. Tout le calcul reste dans « finance.ts » (`bondCalc`, `btaCalc`) : ce fichier ne calcule rien, il choisit quoi appeler.
 *
 * LE CHAMP EST UNE TUILE DE LA SURFACE, PAS UN CHAMP NATIF : fond « --surface-2 », encre de la page, jamais la case blanche à encre noire que le navigateur pose dans
 * une carte sombre. Le montant est un NOMINAL (c'est ce que le titre de la carte disait) ; un montant sous le ticket minimum de la ligne est refusé, un montant qui
 * n'est pas un multiple du titre est arrondi vers le bas, et la ligne d'aide le dit.
 */
export function SimulationSeance({ params: p, fin }: { params: ParamsSeance; /** La note « Chiffres de référence » : elle se range sous le bloc, comme avant. */ fin?: ReactNode }) {
  const t = useT();
  const { fmtDate } = useDates();
  const id = useId();
  const [saisie, setSaisie] = useState(fmt(MONTANT_PAR_DEFAUT));
  const montant = parseAmount(saisie);
  const refuse = montant < p.minimum;
  const c = refuse ? null : calculer(p, montant);
  const modifie = montant !== MONTANT_PAR_DEFAUT;
  const obligation = p.genre === "obligation";
  const unite = p.nominal;
  const arrondi = c != null && c.retient !== montant;
  const aide = refuse
    ? t("Minimum {m} FCFA (ticket minimum)", { m: fmt(p.minimum) })
    : arrondi
      ? t("Arrondi à {m} FCFA : un multiple de {u}", { m: fmt(c!.retient), u: fmt(unite) })
      : t("Multiple de {u} · minimum {m}", { u: fmt(unite), m: fmt(p.minimum) });
  const hypothese = obligation
    ? t(p.servi ? "Au prix servi" : "Au prix Purpose")
    : t("Un bon vaut {v} FCFA au remboursement", { v: fmt(p.nominal) });
  const dateRegl = fmtDate(p.settleOn, false);
  const dateEch = fmtDate(p.maturityOn, false);
  return (
    <>
      <section className={styles.sec} data-pane="essentiel">
        <h3>
          {t("Ce que cela représente")}
          <Info text={t("Ce que vous payez, ce que vous recevez et le rendement, pour le montant nominal que vous indiquez (10 000 000 FCFA au départ). Chiffres de référence au prix publié : le desk vous confirme le décaissement exact.")} label={t("Ce que cela représente")} />
        </h3>
        <Carte>
          <div className={css.champ}>
            <label htmlFor={id} className={css.lab}>
              {t("Montant investi (nominal)")}
            </label>
            <div className={`${css.saisie} ${refuse ? css.refus : ""}`}>
              <input
                id={id}
                inputMode="numeric"
                autoComplete="off"
                value={saisie}
                aria-invalid={refuse}
                aria-describedby={`${id}-aide`}
                onChange={(e) => {
                  const v = parseAmount(e.target.value);
                  setSaisie(v ? fmt(v) : "");
                }}
              />
              <span>FCFA</span>
            </div>
            <div id={`${id}-aide`} className={`${css.aide} ${refuse ? css.erreur : ""}`} role={refuse ? "alert" : undefined}>
              <span>{aide}</span>
              {modifie ? (
                <button type="button" onClick={() => setSaisie(fmt(MONTANT_PAR_DEFAUT))}>
                  {t("Rétablir {m}", { m: fmt(MONTANT_PAR_DEFAUT) })}
                </button>
              ) : (
                <em>{t("valeur par défaut")}</em>
              )}
            </div>
          </div>
          <p className={css.hypothese}>{hypothese}</p>
          <div className={`${css.paire} ${c ? "" : css.grise}`}>
            <div className={css.pay}>
              <span className={css.lab}>{t("Vous payez")}</span>
              <b>{c ? <Amount value={c.paye} /> : "—"}</b>
              <small>{t("règlement le {d}", { d: dateRegl })}</small>
            </div>
            <i className={css.fleche} aria-hidden="true">
              →
            </i>
            <div className={css.get}>
              <span className={css.lab}>{t("Vous recevez")}</span>
              <b>{c ? <Amount value={c.recu} /> : "—"}</b>
              <small>{obligation ? (c ? t("jusqu'au terme, soit {g} de gain brut", { g: fmt(c.recu - c.paye) }) : t("jusqu'au terme")) : c ? t("le {d} · {g} d'intérêt précompté", { d: dateEch, g: fmt(c.recu - c.paye) }) : t("au remboursement")}</small>
            </div>
          </div>
          <div className={`${css.rendement} ${c ? "" : css.grise}`}>
            <span className={css.lab}>{t(obligation ? "Rendement actuariel annuel brut" : "Rendement actuariel annuel")}</span>
            <b>{c ? fmtPct(c.rendement, 2) : "—"}</b>
            <small>{t(obligation ? "si la ligne est gardée jusqu'à l'échéance" : "si le bon est gardé jusqu'à l'échéance")}</small>
          </div>
          <dl className={`${css.detail} ${c ? "" : css.grise}`}>
            {(obligation
              ? [t("Titres"), t("Prix"), t("Coupon couru")]
              : [t("Bons"), t("Prix d'achat par bon"), t("Intérêt précompté")]
            ).map((k, i) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{c ? (c.detail[i] === "néant" ? t("néant") : c.detail[i]) : "—"}</dd>
              </div>
            ))}
          </dl>
        </Carte>
        {fin}
      </section>
      {c && (
        <section className={styles.sec} data-pane="essentiel">
          <h3>
            {t("L'échéancier")}
            <Info text={t("Chaque versement à sa date : la mise au règlement (barre bleue), puis ce qui revient. Le dessin suit le montant saisi.")} label={t("L'échéancier")} />
          </h3>
          <Carte>
            <FlowsChart {...c.graphe} settleOn={p.settleOn} />
          </Carte>
        </section>
      )}
    </>
  );
}
