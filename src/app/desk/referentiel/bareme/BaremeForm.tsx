"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { INGREDIENT_LABEL, INGREDIENTS, type Bareme } from "@/lib/domain/activite";
import { enregistrerBaremeAction, publierBaremeAction, jeterBaremeAction, type BaremeResult } from "./actions";

/**
 * Le formulaire des poids, et la publication en deux temps.
 *
 * Enregistrer ne publie pas : le brouillon laisse voir qui bouge. Publier
 * demande de recopier un mot, comme les autres textes de la maison, parce
 * qu'un barème déplace des cohortes et que les cohortes commandent des envois.
 */
export function BaremeForm({ courant, brouillon }: { courant: Bareme; brouillon?: Bareme }) {
  const t = useT();
  const [enr, enregistrer, enCours] = useActionState<BaremeResult | null, FormData>(enregistrerBaremeAction, null);
  const [pub, publier, enPub] = useActionState<BaremeResult | null, FormData>(publierBaremeAction, null);
  const vu = brouillon ?? courant;

  return (
    <div className="panel">
      <div className="panel-h">
        <h2>{t("Régler les poids")}</h2>
        {brouillon && <span className="st recue">{t("brouillon en attente")}</span>}
      </div>

      <form action={enregistrer} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)", padding: "0 var(--s-6) var(--s-6)" }}>
        {INGREDIENTS.map((k) => (
          <label key={k} className="field" style={{ display: "flex", alignItems: "center", gap: "var(--s-5)" }}>
            <span style={{ flexGrow: 1, minWidth: 0 }}>{t(INGREDIENT_LABEL[k])}</span>
            <input type="number" name={k} min={0} max={100} step={5} defaultValue={vu.poids[k]} style={{ width: "5rem", textAlign: "right" }} />
          </label>
        ))}
        <label className="field">
          {t("Ce qui change, en une phrase")}
          <input type="text" name="quoi" maxLength={200} defaultValue={brouillon?.quoi ?? ""} placeholder={t("la suite aux appétits passe de 10 à 20")} />
        </label>
        <div style={{ display: "flex", gap: "var(--s-4)", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn primary" type="submit" disabled={enCours}>
            {enCours ? "…" : t("Enregistrer en brouillon")}
          </button>
          {brouillon && (
            <button className="btn sm" type="button" onClick={() => void jeterBaremeAction()}>
              {t("Abandonner le brouillon")}
            </button>
          )}
          <span className="muted" style={{ fontSize: ".82rem" }}>
            {t("La somme doit faire 100.")}
          </span>
        </div>
        {enr && <p className={enr.ok ? "good-ink" : "crit-ink"}>{enr.ok ? enr.message : enr.error}</p>}
      </form>

      {brouillon && (
        <form action={publier} style={{ display: "flex", gap: "var(--s-4)", alignItems: "flex-end", flexWrap: "wrap", padding: "0 var(--s-6) var(--s-6)", borderTop: "1px solid var(--line)", paddingTop: "var(--s-6)" }}>
          <label className="field">
            {t("Recopiez « publier » pour confirmer")}
            <input type="text" name="mot" autoComplete="off" placeholder="publier" />
          </label>
          <button className="btn primary" type="submit" disabled={enPub}>
            {enPub ? "…" : t("Publier le barème v{n}", { n: String(courant.version + 1) })}
          </button>
          {pub && <p className={pub.ok ? "good-ink" : "crit-ink"}>{pub.ok ? pub.message : pub.error}</p>}
        </form>
      )}
    </div>
  );
}
