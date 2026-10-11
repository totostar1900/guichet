"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { JOURS_DE_MESURE, MESURES, MESURE_LABEL, MESURE_QUOI, MESURE_TON, MOTIFS_DE_MESURE, mesureVivante, type MesurePosee } from "@/lib/domain/mesure";
import { poserMesureAction, type MesureResult } from "./mesure-actions";

/**
 * Poser une mesure, ou la lever.
 *
 * L'écran dit ce que chaque cran empêche, parce qu'un responsable ne doit pas
 * avoir à se souvenir : « suspendu » n'empêche ni de retirer son argent, ni
 * de nous écrire, et s'il fallait le deviner on finirait par croire que si.
 */
export function MesureForm({ userId, posee, plusieursMains }: { userId: string; posee?: MesurePosee; plusieursMains?: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<MesureResult | null, FormData>(poserMesureAction, null);
  const vivante = mesureVivante(posee);

  return (
    <div style={{ marginTop: "var(--s-5)" }}>
      <span className="eyebrow">{t("Mesure")}</span>{" "}
      <span className={`st ${MESURE_TON[vivante]}`}>{t(MESURE_LABEL[vivante])}</span>
      {posee && vivante !== "aucune" && (
        <small className="muted">
          {" "}
          {posee.motif ? t(MOTIFS_DE_MESURE[posee.motif].libelle) : ""}
          {posee.jusquAu ? ` · ${t("jusqu'au {d}", { d: posee.jusquAu })}` : ""}
          {posee.par ? ` · ${posee.par}` : ""}
        </small>
      )}

      <form action={action} style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-4)", alignItems: "flex-end", marginTop: "var(--s-4)" }}>
        <input type="hidden" name="userId" value={userId} />
        <label className="field">
          {t("Cran")}
          <select name="mesure" defaultValue={vivante}>
            {MESURES.map((m) => (
              <option key={m} value={m}>
                {t(MESURE_LABEL[m])}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("Motif")}
          <select name="motif" defaultValue={posee?.motif ?? ""}>
            <option value="">{t("choisir")}</option>
            {Object.entries(MOTIFS_DE_MESURE).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v.libelle)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("Jours")}
          <input type="number" name="jours" min={1} max={365} defaultValue={JOURS_DE_MESURE} style={{ width: "5rem" }} />
        </label>
        <button className="btn sm" type="submit" disabled={pending}>
          {pending ? "…" : t("Appliquer")}
        </button>
      </form>

      <ul style={{ margin: "var(--s-3) 0 0", paddingLeft: "var(--s-7)", fontSize: ".8rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
        {MESURES.filter((m) => m !== "aucune").map((m) => (
          <li key={m}>
            <b>{t(MESURE_LABEL[m])}</b> : {t(MESURE_QUOI[m])}
          </li>
        ))}
        <li>{t("Aucune mesure ne retient les espèces ni les titres du client, et aucune ne coupe son chemin vers le desk.")}</li>
      </ul>
      {/* UNE MESURE VIT SUR LE COMPTE, DONC ELLE FRAPPE TOUTES LES MAINS.
          C'est juste pour un manquement du compte, et faux quand le problème
          est une personne : suspendre punirait deux innocents et leur
          apprendrait qu'il se passe quelque chose, ce que le silence de la
          conformité cherche précisément à éviter. */}
      {plusieursMains && (
        <p className="muted" style={{ fontSize: ".8rem", margin: "var(--s-3) 0 0", borderLeft: "2px solid var(--warn)", paddingLeft: "var(--s-4)" }}>
          {t(
            "Ce compte est tenu par plusieurs personnes : une mesure posée ici les arrête toutes, et toutes la lisent. Si le problème ne concerne qu'une personne, retirez son accès plus bas plutôt que de suspendre le compte.",
          )}
        </p>
      )}
      {state && <p className={state.ok ? "good-ink" : "crit-ink"}>{state.ok ? state.message : state.error}</p>}
    </div>
  );
}
