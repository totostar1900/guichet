"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { repondreAction, type PlaceResult } from "../actions";
import styles from "./page.module.css";

/** Deux gestes, pas de texte libre : accepter le prix de l'annonce, ou en proposer un autre. */
export function Reponse({ annonceId, prix, unite, decoupage, titresOfferts, nominal }: { annonceId: string; prix: number; unite: "pct" | "fcfa"; decoupage: boolean; titresOfferts: number; nominal: number }) {
  const t = useT();
  const [etat, action, enCours] = useActionState<PlaceResult | null, FormData>(repondreAction, null);
  const [autre, setAutre] = useState(false);
  const [titres, setTitres] = useState(String(titresOfferts));
  const n = decoupage ? Number(titres.replace(/\D/g, "")) || 0 : titresOfferts;
  return (
    <form action={action} className={styles.reponse}>
      <input type="hidden" name="annonceId" value={annonceId} />
      <input type="hidden" name="facial" value={n * nominal} />
      {decoupage && (
        <label className={styles.champ}>
          <span>{t("Nombre de titres")}</span>
          <input inputMode="numeric" value={titres} onChange={(e) => setTitres(e.target.value)} />
          <small>{t("Facial")} : <strong>{facialLisible(n * nominal)} FCFA</strong></small>
        </label>
      )}
      {autre ? (
        <label className={styles.champ}>
          <span>{unite === "pct" ? t("Votre prix (% du nominal)") : t("Votre prix par titre (FCFA)")}</span>
          <input name="prix" inputMode="decimal" />
        </label>
      ) : (
        <input type="hidden" name="prix" value={prix} />
      )}
      <div className={styles.gestes}>
        {autre ? (
          <>
            <button className="btn primary" type="submit" disabled={enCours}>{t("Envoyer ma proposition")}</button>
            <button className="btn" type="button" onClick={() => setAutre(false)}>{t("Annuler")}</button>
          </>
        ) : (
          <>
            <button className="btn primary" type="submit" disabled={enCours}>{t("Accepter le prix")}</button>
            <button className="btn" type="button" onClick={() => setAutre(true)}>{t("Proposer un autre prix")}</button>
          </>
        )}
      </div>
      {etat && <p className={etat.ok ? styles.ok : styles.ko} role="status">{t(etat.ok ? etat.message : etat.error)}</p>}
    </form>
  );
}
