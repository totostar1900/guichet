"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { deposer, type PlaceResult } from "../actions";
import styles from "./page.module.css";

interface Ligne {
  id: string;
  titre: string;
  nominal: number;
  unite: "pct" | "fcfa";
  detenus: number;
}

export function FormulaireDAnnonce({ lignes }: { lignes: Ligne[] }) {
  const t = useT();
  const [etat, action, enCours] = useActionState<PlaceResult | null, FormData>(deposer, null);
  const [sens, setSens] = useState<"vend" | "achete">("vend");
  const [offerId, setOfferId] = useState("");
  const [titres, setTitres] = useState("");
  const ligne = lignes.find((l) => l.id === offerId);
  const n = Number(titres.replace(/\D/g, "")) || 0;
  const facial = ligne ? n * ligne.nominal : 0;
  const options = lignes
    .filter((l) => sens === "achete" || l.detenus > 0)
    .map((l) => ({ value: l.id, label: l.titre, hint: sens === "vend" ? `${l.detenus} ${t("titres détenus")}` : undefined }));
  return (
    <form action={action} className={styles.form}>
      <div className={styles.sens} role="group" aria-label={t("Sens")}>
        <label>
          <input type="radio" name="sens" value="vend" checked={sens === "vend"} onChange={() => { setSens("vend"); setOfferId(""); }} /> {t("Je vends")}
        </label>
        <label>
          <input type="radio" name="sens" value="achete" checked={sens === "achete"} onChange={() => { setSens("achete"); setOfferId(""); }} /> {t("Je cherche")}
        </label>
      </div>
      <label className={styles.champ}>
        <span>{t("Ligne")}</span>
        <Select name="offerId" value={offerId} onChange={setOfferId} options={options} label={t("Ligne")} placeholder={t("Choisir une ligne")} block />
      </label>
      <label className={styles.champ}>
        <span>{t("Nombre de titres")}</span>
        <input inputMode="numeric" value={titres} onChange={(e) => setTitres(e.target.value)} />
        <input type="hidden" name="facial" value={facial} />
        {ligne && n > 0 && <small>{t("Facial")} : <strong>{facialLisible(facial)} FCFA</strong></small>}
      </label>
      <label className={styles.case}>
        <input type="checkbox" name="decoupage" /> {t("Le découpage est permis : on peut m'en prendre une partie.")}
      </label>
      <label className={styles.champ}>
        <span>{ligne?.unite === "fcfa" ? t("Prix par titre (FCFA)") : t("Prix (% du nominal)")}</span>
        <input name="prix" inputMode="decimal" />
      </label>
      <label className={styles.case}>
        <input type="checkbox" name="arrangeur" /> {t("J'accepte que Purpose arrange l'échange si une proposition est acceptée.")}
      </label>
      <div className={styles.pied}>
        <button className="btn primary" type="submit" disabled={enCours}>
          {t("Déposer l'annonce")}
        </button>
        {etat && !etat.ok && <span className={styles.ko} role="alert">{t(etat.error)}</span>}
      </div>
    </form>
  );
}
