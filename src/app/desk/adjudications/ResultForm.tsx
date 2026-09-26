"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SourceViewer } from "@/components/SourceViewer";
import { useT } from "@/i18n/client";
import { coverageOf, thin, type AuctionResult } from "@/lib/market/auction-results";
import { confirmResultAction, proposeResultAction, reopenResultAction, saveResultAction, type ResultOutcome } from "./actions";
import styles from "./page.module.css";

/**
 * Les chiffres d'une séance, relevés sur la pièce.
 *
 * Le communiqué est un scan : rien n'y est sélectionnable, et le taux se lit en
 * petits caractères sous un tampon. Il tient donc la moitié gauche de l'écran,
 * avec la main et la loupe, pendant que les champs restent visibles à droite.
 * Recopier de mémoire un chiffre lu dans un autre onglet est la façon la plus
 * sûre de se tromper de colonne.
 *
 * « Lire le communiqué » fait passer la machine avant la personne, et c'est tout
 * ce qu'elle fait : la lecture arrive dans les champs et n'est écrite nulle
 * part. Le desk la compare à la pièce ouverte à côté, corrige ce qui doit
 * l'être, puis enregistre ou confirme. C'est pour cela que les champs sont
 * tenus par l'écran plutôt que par le navigateur : une valeur par défaut ne
 * change plus une fois posée, et la proposition n'aurait jamais paru.
 *
 * Les montants se saisissent en millions, comme le communiqué les imprime, et
 * se gardent en francs. La conversion se fait une fois, à l'enregistrement.
 *
 * Enfin la couverture et le nombre de soumissionnaires s'affichent à côté du
 * taux. Une séance servie à 6,97 % où une seule banque a soumissionné n'est pas
 * un prix de marché, et cette phrase doit être sous les yeux de celui qui
 * confirme, pas dans une note qu'il lira plus tard.
 */
type Champs = Record<string, string>;

const txt = (v: number | string | undefined | null): string => (v == null ? "" : String(v).replace(".", ","));
const enM = (v: number | undefined): string => (v == null ? "" : txt(v / 1_000_000));

const seedOf = (r: AuctionResult): Champs => ({
  codeEmission: r.codeEmission ?? "",
  tenor: r.tenor === "—" ? "" : r.tenor,
  offerId: r.offerId ?? "",
  networkSize: txt(r.networkSize),
  bidders: txt(r.bidders),
  announced: enM(r.announced),
  bid: enM(r.bid),
  served: enM(r.served),
  coverage: txt(r.coverage),
  rateMin: txt(r.rateMin),
  rateMax: txt(r.rateMax),
  rateLimit: txt(r.rateLimit),
  rateAvg: txt(r.rateAvg),
  priceMin: txt(r.priceMin),
  priceMax: txt(r.priceMax),
  priceLimit: txt(r.priceLimit),
  priceAvg: txt(r.priceAvg),
});

/** La lecture de la machine, mise sous la forme des champs. */
const proposedFields = (p: Partial<AuctionResult> | undefined): Champs => {
  if (!p) return {};
  const out: Champs = {
    codeEmission: p.codeEmission ?? "",
    tenor: p.tenor ?? "",
    networkSize: txt(p.networkSize),
    bidders: txt(p.bidders),
    announced: enM(p.announced),
    bid: enM(p.bid),
    served: enM(p.served),
    coverage: txt(p.coverage),
  };
  for (const k of ["rateMin", "rateMax", "rateLimit", "rateAvg", "priceMin", "priceMax", "priceLimit", "priceAvg"] as const) out[k] = txt(p[k]);
  return out;
};

export function ResultForm({ r, offerTitle, canRead }: { r: AuctionResult; offerTitle?: string; canRead: boolean }) {
  const t = useT();
  // Ce que le desk a tapé, et rien d'autre : la valeur affichée se calcule.
  const [edits, setEdits] = useState<Champs>({});
  const [saved, save, saving] = useActionState<ResultOutcome | null, FormData>(saveResultAction, null);
  const [done, confirm, confirming] = useActionState<ResultOutcome | null, FormData>(confirmResultAction, null);
  const [read, propose, reading] = useActionState<ResultOutcome | null, FormData>(proposeResultAction, null);
  const state = read ?? done ?? saved;
  const bill = r.instrument === "BTA";
  const couv = coverageOf(r);
  const mince = thin(r);

  // La valeur d'un champ, dans cet ordre : ce que le desk a tapé, sinon ce que
  // la base porte, sinon ce que la machine propose. Une proposition ne recouvre
  // donc jamais une saisie ni une valeur déjà enregistrée, et rien n'a besoin
  // d'être recopié d'un état à l'autre : il n'y a qu'une source par cas.
  const base = seedOf(r);
  const propose_ = read?.ok ? proposedFields(read.proposal) : {};
  const vals: Champs = {};
  for (const k of Object.keys(base)) vals[k] = edits[k] ?? (base[k] || propose_[k] || "");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setEdits((v) => ({ ...v, [k]: e.target.value }));

  const num = (name: string, label: string, unit?: string, hint?: string) => (
    <label className={styles.field} key={name}>
      <span>
        {t(label)}
        {unit ? <em>{t(unit)}</em> : null}
      </span>
      <input name={name} value={vals[name] ?? ""} onChange={set(name)} inputMode="decimal" autoComplete="off" placeholder={hint ? t(hint) : undefined} />
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
          {/* La machine passe devant, et n'écrit rien. */}
          <div className={styles.machine}>
            <button className="btn sm" type="submit" formAction={propose} disabled={!canRead || !r.fileKey || reading} formNoValidate>
              {t(reading ? "Lecture en cours…" : "Lire le communiqué")}
            </button>
            <small>
              {canRead
                ? t("La lecture se pose dans les champs. Rien n'est enregistré : vous vérifiez, puis vous confirmez.")
                : t("Lecture automatique indisponible : les chiffres se saisissent à la main.")}
            </small>
          </div>

          {state && (state.ok ? <div className={styles.ok}>{state.message}</div> : <div className={styles.err}>{state.error}</div>)}
          {read?.remarks && read.remarks.length > 0 && (
            <ul className={styles.remarks}>
              {read.remarks.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <fieldset>
            <legend>{t("La ligne")}</legend>
            <label className={styles.field}>
              <span>
                {t("Durée")}
                <em>{t("exigée pour confirmer")}</em>
              </span>
              <input name="tenor" value={vals.tenor} onChange={set("tenor")} autoComplete="off" placeholder="52 semaines" />
            </label>
            <label className={styles.field}>
              <span>
                {t("Code émission")}
                <em>{t("pour rattacher à une ligne")}</em>
              </span>
              <input name="codeEmission" value={vals.codeEmission} onChange={set("codeEmission")} autoComplete="off" placeholder="CG1300001480" />
            </label>
            <label className={styles.field}>
              <span>
                {t("Notre ligne")}
                <em>{t("facultatif")}</em>
              </span>
              <input name="offerId" value={vals.offerId} onChange={set("offerId")} autoComplete="off" placeholder={t("identifiant de l'offre")} />
            </label>
            {offerTitle && (
              <p className={styles.linked}>
                {t("Rattachée à")} <Link href={`/desk/lignes/${r.offerId}`}>{offerTitle}</Link>
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend>{t("La séance")}</legend>
            {num("networkSize", "SVT du réseau")}
            {num("bidders", "SVT soumissionnaires")}
            {num("announced", "Montant annoncé", "en millions")}
            {num("bid", "Total des soumissions", "en millions")}
            {num("served", "Total servi", "en millions")}
            {num("coverage", "Taux de couverture", "%", "tel qu'imprimé")}
          </fieldset>

          <fieldset>
            <legend>{bill ? t("Les taux, précomptés") : t("Les prix, en % du nominal")}</legend>
            {bill
              ? [num("rateMin", "Taux minimum", "%"), num("rateMax", "Taux maximum", "%"), num("rateLimit", "Taux limite", "%"), num("rateAvg", "Taux moyen pondéré", "%")]
              : [num("priceMin", "Prix minimum", "%"), num("priceMax", "Prix maximum", "%"), num("priceLimit", "Prix limite", "%"), num("priceAvg", "Prix moyen pondéré", "%")]}
          </fieldset>

          {/* Ce que le chiffre vaut, dit à côté du chiffre. */}
          {(couv != null || r.bidders != null) && (
            <p className={`${styles.weight} ${mince ? styles.warn : ""}`}>
              {r.bidders != null ? t("{n} soumissionnaire(s)", { n: String(r.bidders) }) : ""}
              {couv != null ? `${r.bidders != null ? " · " : ""}${t("couverture {c} %", { c: couv.toFixed(2).replace(".", ",") })}` : ""}
              {mince ? ` · ${t("séance mince : le taux est celui d'une contrepartie, pas du marché")}` : ""}
            </p>
          )}

          <div className={styles.actions}>
            <button className="btn" type="submit" formAction={save} disabled={saving || confirming || reading}>
              {t(saving ? "Enregistrement…" : "Enregistrer la lecture")}
            </button>
            {r.confirmedBy ? (
              <button className="btn sm ghost" type="submit" formAction={reopenResultAction} formNoValidate>
                {t("Rouvrir")}
              </button>
            ) : (
              <button className="btn primary" type="submit" formAction={confirm} disabled={saving || confirming || reading}>
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
