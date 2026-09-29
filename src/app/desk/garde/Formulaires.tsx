"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { arreterBareme, emettreAvis, type GardeResult } from "./actions";
import styles from "./page.module.css";

/**
 * Arrêter le barème.
 *
 * Le formulaire ne propose aucune valeur par défaut, et c'est le point : à zéro
 * point de base rien n'est facturé, et cet état est le bon tant que la maison
 * n'a pas tranché. Un champ pré-rempli à vingt-cinq points de base
 * suggérerait un tarif que personne n'a décidé.
 */
export function BaremeForm({ bareme }: { bareme: { bps: number; minimum: number; franchise: number; exonerees: string[] } }) {
  const t = useT();
  const [res, action, pending] = useActionState<GardeResult | null, FormData>(arreterBareme, null);
  return (
    <form action={action} className={styles.form}>
      <div className={styles.champs}>
        <label className={styles.champ}>
          <span>{t("Taux annuel")}</span>
          <input name="bps" type="number" min={0} max={500} step={1} defaultValue={bareme.bps} inputMode="numeric" />
          <small>{t("En points de base de l'assiette. Zéro ferme le barème : plus rien n'est dû, par aucun chemin.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Plancher par période")}</span>
          <input name="minimum" type="number" min={0} step={500} defaultValue={bareme.minimum} inputMode="numeric" />
          <small>{t("Appliqué à ce qui est déjà dû, jamais à ce qui ne l'est pas. Un barème fermé ne le déclenche pas.")}</small>
        </label>
        <label className={styles.champ}>
          <span>{t("Franchise d'assiette")}</span>
          <input name="franchise" type="number" min={0} step={100_000} defaultValue={bareme.franchise} inputMode="numeric" />
          <small>{t("En deçà de cette assiette moyenne, la période ne se facture pas : l'avis coûterait plus qu'il ne réclame.")}</small>
        </label>
      </div>
      <label className={styles.case}>
        <input type="checkbox" name="exonereFonds" defaultChecked={bareme.exonerees.includes("FONDS")} />
        <span>
          {t("Exonérer les fonds")}
          <small>{t("Un fonds porte déjà ses frais de gestion dans sa valeur liquidative : le facturer ici ferait payer deux fois la même conservation.")}</small>
        </span>
      </label>
      <div className={styles.pied}>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Arrêter ce barème")}
        </button>
        {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
      </div>
    </form>
  );
}

/**
 * Émettre les avis d'une période.
 *
 * Le bouton porte le compte de ce qu'il va faire : émettre est irréversible,
 * un avis ne se retire pas, et un prélèvement se répare par un mouvement
 * inverse plutôt que par un effacement.
 */
export function EmettreForm({ period, aEmettre, aPrelever }: { period: string; aEmettre: number; aPrelever: number }) {
  const t = useT();
  const [res, action, pending] = useActionState<GardeResult | null, FormData>(emettreAvis, null);
  return (
    <form action={action} className={styles.pied}>
      <input type="hidden" name="period" value={period} />
      <button className="btn primary" type="submit" disabled={pending || aEmettre === 0}>
        {pending
          ? t("Émission…")
          : aPrelever > 0
            ? t("Émettre {n} avis et prélever {m} FCFA", { n: aEmettre, m: aPrelever.toLocaleString("fr-FR") })
            : t("Émettre {n} avis, sans prélèvement", { n: aEmettre })}
      </button>
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}
