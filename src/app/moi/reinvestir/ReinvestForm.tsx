"use client";

import { useActionState, useState } from "react";
import { Select } from "@/components/ui/Select";
import { groupedInput } from "@/lib/ui/grouped";
import { useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { createReinvestAction, type StandingResult } from "../standing-actions";
import styles from "./page.module.css";

/**
 * L'instruction, en trois décisions et pas une de plus.
 *
 * Où va l'argent, à partir de quelle somme, et ce qu'on fait si la destination
 * se ferme. Tout le reste appartient au marché : ni le montant ni la date ne se
 * choisissent ici, parce que ni l'un ni l'autre n'est connu à la signature.
 *
 * Le plancher est proposé et non imposé : à zéro, tout coupon repart, ce qui
 * est le comportement que la plupart attendent. Le relever est une décision de
 * celui qui trouve qu'un ordre de mille francs ne vaut pas ses frais.
 */
export function ReinvestForm({ fonds }: { fonds: { id: string; title: string; min: number }[] }) {
  const t = useT();
  const [res, action, pending] = useActionState<StandingResult | null, FormData>(createReinvestAction, null);
  const [offerId, setOfferId] = useState(fonds[0]?.id ?? "");
  /* Le plancher est tenu en etat parce qu il se regroupe pendant la frappe : un
     champ non controle ne peut pas se reformater sous les doigts. */
  const [plancher, setPlancher] = useState("");
  const choisi = fonds.find((f) => f.id === offerId);

  if (!fonds.length) return <p className={styles.vide}>{t("Aucun fonds n'est ouvert à la souscription en ce moment : le réinvestissement se programmera dès qu'il y en aura un.")}</p>;

  return (
    <form action={action} className={styles.form}>
      <label className={styles.champ}>
        <span>{t("Où replacer vos encaissements")}</span>
        {/* La liste de la maison, pas celle du téléphone : la liste native
            s'ouvre en roue grise au bas de l'écran, sans les mots de
            l'application, et on n'y cherche pas. */}
        <Select block name="offerId" value={offerId} onChange={setOfferId} options={fonds.map((f) => ({ value: f.id, label: f.title }))} />
        <small>{t("Une ligne précise, fixée maintenant. La maison n'a pas l'agrément pour choisir à votre place le mois venu.")}</small>
      </label>

      <label className={styles.champ}>
        <span>{t("À partir de quelle somme encaissée")}</span>
        {/* Les milliers se séparent PENDANT la frappe : c'est là qu'on compte
            les zéros, et là qu'on se trompe d'un facteur dix. */}
        <input name="minAmount" value={plancher} {...groupedInput(setPlancher)} inputMode="numeric" autoComplete="off" />
        <small>
          {t("En deçà, on attend le coupon suivant plutôt que de passer un ordre dont les frais mangeraient le produit.")}
          {choisi && choisi.min > 0 ? ` ${t("Ce fonds demande au moins {m} FCFA par versement.", { m: fmt(choisi.min) })}` : ""}
        </small>
      </label>

      <fieldset className={styles.champ}>
        <span>{t("Si la destination se ferme")}</span>
        <div className={styles.radios}>
          <label>
            <input type="radio" name="onBlocked" value="passer" defaultChecked /> {t("garder l'argent disponible et m'en avertir")}
          </label>
          <label>
            <input type="radio" name="onBlocked" value="arreter" /> {t("arrêter l'instruction")}
          </label>
        </div>
        <small>{t("Décidé maintenant, par vous. Improviser le jour venu reviendrait à décider à votre place.")}</small>
      </fieldset>

      <div className={styles.pied}>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Mettre le réinvestissement en place")}
        </button>
        {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
      </div>
    </form>
  );
}
