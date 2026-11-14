"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { arreterRegle, type FraisResult } from "./actions";
import type { CleDeRegle, RegleDeFrais } from "@/lib/domain/frais";
import styles from "./page.module.css";

/**
 * Arrêter une règle. Aucune valeur par défaut : à zéro, rien n'est pris, et cet état est le bon tant que la direction n'a pas
 * tranché. Les trois champs « reçu » ne sont jamais lus par le client.
 */
export function RegleForm({ cle, regle, fonds, premier }: { cle: CleDeRegle; regle: RegleDeFrais; fonds: boolean; premier: string }) {
  const t = useT();
  const [res, action, pending] = useActionState<FraisResult | null, FormData>(arreterRegle, null);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="cle" value={cle} />
      <div className={styles.champs}>
        <label className={styles.champ}>
          <span>{t("Frais du client")}</span>
          <input name="clientPct" type="number" min={0} max={5} step={0.05} defaultValue={regle.clientPct} inputMode="decimal" disabled={fonds} />
          <small>{t("En % du montant, de 0 à 5. Zéro : rien n'est pris sur cette opération.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Plancher")}</span>
          <input name="clientMin" type="number" min={0} step={100} defaultValue={regle.clientMin} inputMode="numeric" />
          <small>{t("En francs, appliqué à ce qui est déjà dû seulement.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Plafond")}</span>
          <input name="clientMax" type="number" min={0} step={1000} defaultValue={regle.clientMax} inputMode="numeric" />
          <small>{t("En francs ; zéro : pas de plafond.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Date de départ")}</span>
          <input name="effetLe" type="date" defaultValue={regle.effetLe ?? ""} />
          <small>{t("Une hausse demande trente jours de préavis : le {d} au plus tôt. Une baisse ou une fermeture s'applique tout de suite.", { d: premier })}</small>
        </label>
      </div>
      <div className={styles.champs}>
        <label className={styles.champ}>
          <span>{t(fonds ? "Reçu du partenaire (% du montant)" : "Reçu de l'émetteur (% du montant)")}</span>
          <input name="tiersPct" type="number" min={0} max={10} step={0.05} defaultValue={regle.tiersPct} inputMode="decimal" />
          <small>{t("Lu au desk seulement.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Reçu · plancher par opération")}</span>
          <input name="tiersMin" type="number" min={0} step={100} defaultValue={regle.tiersMin} inputMode="numeric" />
          <small>{t("En francs, appliqué à ce qui est déjà reçu seulement.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Reçu · plafond par opération")}</span>
          <input name="tiersMax" type="number" min={0} step={1000} defaultValue={regle.tiersMax} inputMode="numeric" />
          <small>{t("En francs ; zéro : pas de plafond.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Part des droits du fonds (%)")}</span>
          <input name="tiersPartDesDroitsPct" type="number" min={0} max={100} step={1} defaultValue={regle.tiersPartDesDroitsPct} inputMode="numeric" disabled={!fonds} />
          <small>{t(fonds ? "La part des droits d'entrée ou de sortie qui revient à la maison." : "Sans objet hors des fonds.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Rétrocession sur encours (%/an)")}</span>
          <input name="tiersEncoursPct" type="number" min={0} max={10} step={0.05} defaultValue={regle.tiersEncoursPct} inputMode="decimal" disabled={!fonds} />
          <small>{t(fonds ? "Calculée chaque mois sur l'encours moyen, rapprochée du relevé." : "Sans objet hors des fonds.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Rétrocession · plancher mensuel")}</span>
          <input name="tiersEncoursMin" type="number" min={0} step={100} defaultValue={regle.tiersEncoursMin} inputMode="numeric" disabled={!fonds} />
          <small>{t("En francs par mois, appliqué à ce qui est déjà dû seulement.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Rétrocession · plafond mensuel")}</span>
          <input name="tiersEncoursMax" type="number" min={0} step={1000} defaultValue={regle.tiersEncoursMax} inputMode="numeric" disabled={!fonds} />
          <small>{t("En francs par mois ; zéro : pas de plafond.")}</small>
        </label>
      </div>
      <div className={styles.pied}>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Arrêter cette règle")}
        </button>
        {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
      </div>
    </form>
  );
}
