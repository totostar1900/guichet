"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SourceViewer } from "@/components/SourceViewer";
import { useT } from "@/i18n/client";
import { coverageOf, thin, type AuctionResult } from "@/lib/market/auction-results";
import { confirmResultAction, reopenResultAction, saveResultAction, type ResultOutcome } from "./actions";
import styles from "./page.module.css";

/**
 * Les chiffres d'une séance, relevés sur la pièce.
 *
 * Le communiqué est un scan : rien n'y est sélectionnable, et le taux se lit en
 * petits caractères sous un tampon. Il tient donc la moitié gauche de l'écran,
 * avec la main et la loupe, pendant que les champs restent visibles à droite.
 * C'est la même disposition qu'à « À valider », pour la même raison : recopier
 * de mémoire un chiffre lu dans un autre onglet est la façon la plus sûre de se
 * tromper de colonne.
 *
 * Les montants se saisissent en millions parce que le communiqué les imprime
 * ainsi ; ils se gardent en francs. La conversion est faite une fois, à
 * l'enregistrement, et jamais au regard de celui qui saisit.
 *
 * Enfin l'écran compte lui-même la couverture et le nombre de soumissionnaires
 * à côté du taux. Une séance servie à 6,97 % où une seule banque a soumissionné
 * n'est pas un prix de marché, et cette phrase doit être sous les yeux de celui
 * qui confirme, pas dans une note qu'il lira plus tard.
 */
export function ResultForm({ r, offerTitle }: { r: AuctionResult; offerTitle?: string }) {
  const t = useT();
  const [saved, save, saving] = useActionState<ResultOutcome | null, FormData>(saveResultAction, null);
  const [done, confirm, confirming] = useActionState<ResultOutcome | null, FormData>(confirmResultAction, null);
  const state = done ?? saved;
  const bill = r.instrument === "BTA";
  const couv = coverageOf(r);
  const mince = thin(r);

  const num = (name: string, label: string, value: number | undefined, unit?: string, hint?: string) => (
    <label className={styles.field} key={name}>
      <span>
        {t(label)}
        {unit ? <em>{t(unit)}</em> : null}
      </span>
      <input name={name} defaultValue={value ?? ""} inputMode="decimal" autoComplete="off" placeholder={hint ? t(hint) : undefined} />
    </label>
  );

  return (
    <form className={styles.form}>
      <input type="hidden" name="id" value={r.id} />

      <header className={styles.head}>
        <div>
          <h2>
            {r.instrument} {r.tenor} · {t(r.country)}
          </h2>
          <p className="muted">
            {t("Séance du {d}", { d: r.sessionOn })}
            {r.abondement ? ` · ${t("abondement")}` : ""} ·{" "}
            <a href={r.sourceUrl} target="_blank" rel="noreferrer">
              {t("le communiqué chez la BEAC")} ↗
            </a>
          </p>
        </div>
        <span className={`${styles.pill} ${r.confirmedBy ? styles.done : styles.todo}`}>
          {r.confirmedBy ? t("Relue par {n}", { n: r.confirmedBy }) : t("À relire")}
        </span>
      </header>

      <div className={styles.split}>
        <div className={styles.doc}>
          {r.fileKey ? (
            <SourceViewer src={`/desk/adjudications/source/${r.id}`} title={t("Communiqué de résultats")} />
          ) : (
            <p className="muted">
              {t("Le communiqué n'a pas pu être rapatrié.")}{" "}
              <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                {t("L'ouvrir chez la BEAC")} ↗
              </a>
            </p>
          )}
        </div>

        <div className={styles.fields}>
          <fieldset>
            <legend>{t("La ligne")}</legend>
            <label className={styles.field}>
              <span>
                {t("Code émission")}
                <em>{t("exigé pour confirmer")}</em>
              </span>
              <input name="codeEmission" defaultValue={r.codeEmission ?? ""} autoComplete="off" placeholder="CG1300001480" />
            </label>
            <label className={styles.field}>
              <span>{t("Durée")}</span>
              <input name="tenor" defaultValue={r.tenor} autoComplete="off" />
            </label>
            <label className={styles.field}>
              <span>
                {t("Notre ligne")}
                <em>{t("facultatif")}</em>
              </span>
              <input name="offerId" defaultValue={r.offerId ?? ""} autoComplete="off" placeholder={t("identifiant de l'offre")} />
            </label>
            {offerTitle && (
              <p className={styles.linked}>
                {t("Rattachée à")} <Link href={`/desk/lignes/${r.offerId}`}>{offerTitle}</Link>
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend>{t("La séance")}</legend>
            {num("networkSize", "SVT du réseau", r.networkSize)}
            {num("bidders", "SVT soumissionnaires", r.bidders)}
            {num("announced", "Montant annoncé", r.announced == null ? undefined : r.announced / 1_000_000, "en millions")}
            {num("bid", "Total des soumissions", r.bid == null ? undefined : r.bid / 1_000_000, "en millions")}
            {num("served", "Total servi", r.served == null ? undefined : r.served / 1_000_000, "en millions")}
            {num("coverage", "Taux de couverture", r.coverage, "%", "tel qu'imprimé")}
          </fieldset>

          <fieldset>
            <legend>{bill ? t("Les taux, précomptés") : t("Les prix, en % du nominal")}</legend>
            {bill
              ? [
                  num("rateMin", "Taux minimum", r.rateMin, "%"),
                  num("rateMax", "Taux maximum", r.rateMax, "%"),
                  num("rateLimit", "Taux limite", r.rateLimit, "%"),
                  num("rateAvg", "Taux moyen pondéré", r.rateAvg, "%"),
                ]
              : [
                  num("priceMin", "Prix minimum", r.priceMin, "%"),
                  num("priceMax", "Prix maximum", r.priceMax, "%"),
                  num("priceLimit", "Prix limite", r.priceLimit, "%"),
                  num("priceAvg", "Prix moyen pondéré", r.priceAvg, "%"),
                ]}
          </fieldset>

          {/* Ce que le chiffre vaut, dit à côté du chiffre. */}
          {(couv != null || r.bidders != null) && (
            <p className={`${styles.weight} ${mince ? styles.warn : ""}`}>
              {r.bidders != null ? t("{n} soumissionnaire(s)", { n: String(r.bidders) }) : ""}
              {couv != null ? `${r.bidders != null ? " · " : ""}${t("couverture {c} %", { c: couv.toFixed(2).replace(".", ",") })}` : ""}
              {mince ? ` · ${t("séance mince : le taux est celui d'une contrepartie, pas du marché")}` : ""}
            </p>
          )}

          {state && (state.ok ? <div className={styles.ok}>{state.message}</div> : <div className={styles.err}>{state.error}</div>)}

          <div className={styles.actions}>
            <button className="btn" type="submit" formAction={save} disabled={saving || confirming}>
              {t(saving ? "Enregistrement…" : "Enregistrer la lecture")}
            </button>
            {r.confirmedBy ? (
              <button className="btn sm ghost" type="submit" formAction={reopenResultAction} formNoValidate>
                {t("Rouvrir")}
              </button>
            ) : (
              <button className="btn primary" type="submit" formAction={confirm} disabled={saving || confirming}>
                {t(confirming ? "…" : "Confirmer la séance")}
              </button>
            )}
          </div>
          <p className="muted">
            {r.confirmedBy
              ? t("Confirmée : ce taux sert de référence aux indications du desk.")
              : t("Tant qu'elle n'est pas confirmée, cette lecture ne sert de référence à aucune offre.")}
          </p>
        </div>
      </div>
    </form>
  );
}
