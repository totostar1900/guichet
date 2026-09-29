"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SourceViewer } from "@/components/SourceViewer";
import { Poignee } from "@/components/desk/Poignee";
import { useT } from "@/i18n/client";
import { coverageOf, etatSeance, thin, type AuctionResult } from "@/lib/market/auction-results";
import { auctionYield, YIELD_ORIGIN_LABEL } from "@/lib/market/yield";
import { Ecarter } from "./Ecarter";
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
  /* Chaque retour s'affiche auprès du bouton qui le produit : plus rien à arbitrer. */
  const ecrit = done ?? saved;
  const bill = r.instrument === "BTA";
  const couv = coverageOf(r);
  const mince = thin(r);
  const etat = etatSeance(r);
  // Le rendement se déduit des champs enregistrés : il dit tout de suite si la
  // séance servira de point sur la courbe, ou pourquoi elle n'en donnera pas.
  const rdt = auctionYield(r);

  // La valeur d'un champ, dans cet ordre : ce que le desk a tapé, sinon ce que
  // la base porte, sinon ce que la machine propose. Une proposition ne recouvre
  // donc jamais une saisie ni une valeur déjà enregistrée, et rien n'a besoin
  // d'être recopié d'un état à l'autre : il n'y a qu'une source par cas.
  const base = seedOf(r);
  const propose_ = read?.ok ? proposedFields(read.proposal) : {};
  const vals: Champs = {};
  for (const k of Object.keys(base)) vals[k] = edits[k] ?? (base[k] || propose_[k] || "");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setEdits((v) => ({ ...v, [k]: e.target.value }));

  /**
   * Un champ : le libellé sur une ligne, l'unité dans la boîte.
   *
   * « lu » distingue ce que la machine vient de proposer de ce que la base
   * portait déjà : la boîte passe au doré, et le desk voit d'un coup d'œil ce
   * qu'il lui reste à vérifier sur la pièce.
   */
  const champ = (name: string, label: string, unit?: string, aide?: string, texte = false) => {
    const lu = !edits[name] && !base[name] && Boolean(propose_[name]);
    return (
      <label className={`${styles.field} ${texte ? styles.large : ""}`} key={name}>
        <span title={aide ? `${t(label)} · ${t(aide)}` : t(label)}>
          {t(label)}
          {aide ? <em> · {t(aide)}</em> : null}
        </span>
        <div className={`${styles.box} ${texte ? styles.txt : ""} ${lu ? styles.lu : ""}`}>
          <input name={name} value={vals[name] ?? ""} onChange={set(name)} inputMode={texte ? undefined : "decimal"} autoComplete="off" />
          {unit ? <span className={styles.unite}>{t(unit)}</span> : null}
        </div>
      </label>
    );
  };
  const num = champ;

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
        <span className={`${styles.pill} ${etat === "ecartee" ? styles.range : r.confirmedBy ? styles.done : styles.todo}`}>
          {etat === "ecartee"
            ? t("Écartée")
            : etat === "relue"
              ? t("Relue par {n}", { n: r.confirmedBy ?? "" })
              : etat === "a_relire"
                ? t("À relire")
                : t("À lire")}
        </span>
      </header>

      <div className={styles.split}>
        <div className={styles.doc}>
          {r.fileKey ? (
            <SourceViewer src={`/desk/adjudications/source/${r.id}`} title={t("Communiqué de résultats")} fill />
          ) : (
            <p className="muted">
              {t("Le communiqué n'a pas pu être rapatrié.")}{" "}
              <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                {t("L'ouvrir chez la BEAC")} ↗
              </a>
            </p>
          )}
        </div>

        <Poignee variable="--champs" min={280} max={560} memoire="adj.champs" depuisLaDroite libelle="Régler la largeur des champs" />

        <div className={styles.fields}>
          {/* Ce qu'on regarde avant de signer, déduit et non saisi. */}
          <div className={styles.strip}>
            <div>
              <span>{t("Couverture")}</span>
              <b className={couv != null && couv < 100 ? styles.crit : undefined}>{couv == null ? "—" : `${(couv / 100).toFixed(2).replace(".", ",")} ×`}</b>
            </div>
            <div>
              <span>{t("Soumissionnaires")}</span>
              <b>{r.bidders == null ? "—" : `${r.bidders}${r.networkSize ? ` / ${r.networkSize}` : ""}`}</b>
            </div>
            <div>
              <span>{t("Rendement")}</span>
              <b className={styles.gold} title={rdt ? t(YIELD_ORIGIN_LABEL[rdt.origin]) : undefined}>
                {rdt ? `${rdt.pct.toFixed(2).replace(".", ",")} %` : "—"}
              </b>
            </div>
          </div>

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

          {read && (read.ok ? <div className={styles.ok}>{read.message}</div> : <div className={styles.err}>{read.error}</div>)}
          {read?.remarks && read.remarks.length > 0 && (
            <ul className={styles.remarks}>
              {read.remarks.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <fieldset>
            <legend>{t("La ligne")}</legend>
            {champ("tenor", "Durée", undefined, "exigée pour confirmer", true)}
            {champ("codeEmission", "Code émission", undefined, "pour rattacher à une ligne", true)}
            {champ("offerId", "Notre ligne", undefined, "facultatif", true)}
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

          {ecrit && (ecrit.ok ? <div className={styles.ok}>{ecrit.message}</div> : <div className={styles.err}>{ecrit.error}</div>)}

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

          {/* Le troisieme geste : ni lire, ni confirmer, mais constater que
              cette piece n en est pas une. Il vit en dehors du formulaire de
              saisie parce qu il ne sauve aucun champ. */}
          <Ecarter id={r.id} ecartee={etat === "ecartee"} motif={r.setAsideReason} par={r.setAsideBy} />
          <p className="muted">
            {etat === "ecartee"
              ? t("Rangée : cette pièce n'est pas un résultat, et ne compte nulle part.")
              : etat === "relue"
              ? t("Confirmée : ce taux sert de référence aux indications du desk.")
              : etat === "a_relire"
                ? t("Lue et enregistrée. Tant qu'une personne ne l'a pas confirmée, elle ne sert de référence à aucune offre.")
                : t("Rien n'a encore été lu sur cette pièce.")}
          </p>
        </div>
      </div>
    </form>
  );
}
