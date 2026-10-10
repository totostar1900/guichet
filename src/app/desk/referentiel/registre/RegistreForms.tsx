"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { ANS_D_ECART, MOTIFS_D_ECART, type Ecarte } from "@/lib/domain/registre-ecartes";
import { inscrireAction, jeterRegistreAction, leverAction, publierRegistreAction, type RegistreResult } from "./actions";

/**
 * Inscrire, lever, publier.
 *
 * Les trois vivent ensemble parce qu'ils partagent un brouillon : rien
 * n'écarte personne avant la publication, et la publication demande une
 * seconde personne. L'écran le dit à chaque étage, pour qu'on ne croie pas
 * avoir écarté quelqu'un qui ne l'est pas.
 */
export function InscrireForm() {
  const t = useT();
  const [state, action, pending] = useActionState<RegistreResult | null, FormData>(inscrireAction, null);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)", padding: "0 var(--s-6) var(--s-6)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "var(--s-5)" }}>
        <label className="field">
          {t("Nom, tel qu'il figure sur la pièce")}
          <input name="nom" maxLength={120} required autoComplete="off" />
        </label>
        <label className="field">
          {t("Date de naissance")}
          <input type="date" name="naissance" />
        </label>
        <label className="field">
          {t("Type de pièce")}
          <input name="pieceType" maxLength={40} placeholder={t("CNI, Passeport…")} autoComplete="off" />
        </label>
        <label className="field">
          {t("Numéro de pièce")}
          <input name="pieceNumero" maxLength={60} autoComplete="off" />
        </label>
        <label className="field">
          {t("Motif")}
          <Select
            block
            name="motif"
            value="fraude_averee"
            options={Object.entries(MOTIFS_D_ECART).map(([k, v]) => ({ value: k, label: t(v.libelle) }))}
          />
        </label>
        <label className="field">
          {t("Terme (vide : celui du motif)")}
          <input type="date" name="jusquAu" />
        </label>
      </div>
      <label className="field">
        {t("Note pour le desk")}
        <input name="note" maxLength={600} placeholder={t("ce que la personne suivante doit savoir")} autoComplete="off" />
      </label>
      <div style={{ display: "flex", gap: "var(--s-4)", alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "…" : t("Inscrire en brouillon")}
        </button>
        <span className="muted" style={{ fontSize: ".82rem" }}>
          {t("Sans numéro de pièce, la date de naissance est obligatoire : un nom seul n'accroche rien. Terme par défaut : {n} ans, sauf motifs sans terme.", { n: String(ANS_D_ECART) })}
        </span>
      </div>
      {state && <p className={state.ok ? "good-ink" : "crit-ink"}>{state.ok ? state.message : state.error}</p>}
    </form>
  );
}

export function LeverForm({ e }: { e: Ecarte }) {
  const t = useT();
  const [state, action, pending] = useActionState<RegistreResult | null, FormData>(leverAction, null);
  return (
    <form action={action} style={{ display: "flex", gap: "var(--s-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="id" value={e.id} />
      <label className="field" style={{ flexGrow: 1, minWidth: "14rem" }}>
        {t("Pourquoi vous la levez")}
        <input name="leveeMotif" maxLength={300} autoComplete="off" placeholder={t("dette réglée le 12 novembre")} />
      </label>
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : t("Lever")}
      </button>
      {state && <small className={state.ok ? "good-ink" : "crit-ink"}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}

export function PublierForm({ n }: { n: number }) {
  const t = useT();
  const [state, action, pending] = useActionState<RegistreResult | null, FormData>(publierRegistreAction, null);
  return (
    <form action={action} style={{ display: "flex", gap: "var(--s-4)", alignItems: "flex-end", flexWrap: "wrap", padding: "0 var(--s-6) var(--s-6)" }}>
      <label className="field">
        {t("Recopiez « publier » pour confirmer")}
        <input type="text" name="mot" autoComplete="off" placeholder="publier" />
      </label>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "…" : t("Publier {n} changement(s)", { n: String(n) })}
      </button>
      <button className="btn sm" type="button" onClick={() => void jeterRegistreAction()}>
        {t("Abandonner les brouillons")}
      </button>
      <span className="muted" style={{ fontSize: ".82rem" }}>
        {t("Une seconde personne confirme : écarter quelqu'un vaut une mesure posée d'avance sur un compte qui n'existe pas encore.")}
      </span>
      {state && <p className={state.ok ? "good-ink" : "crit-ink"}>{state.ok ? state.message : state.error}</p>}
    </form>
  );
}
