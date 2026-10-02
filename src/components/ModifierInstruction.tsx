"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { PARTS_MAX, pourquoiPasDeCle } from "@/lib/domain/repartition";
import { fmt } from "@/lib/format";
import { Select } from "./ui/Select";
import { modifierStandingAction, type ModifResult } from "@/app/moi/modifier-actions";
import styles from "./Standing.module.css";

export interface FondsChoix {
  id: string;
  title: string;
  min: number;
}

type Ligne = { offerId: string; pct: string };

/**
 * Modifier une instruction, et écrire sa clé.
 *
 * MODIFIER, C'EST REMPLACER, et l'écran le dit. Le client doit comprendre que
 * son ancienne instruction ne disparaît pas : elle reste dans son historique
 * avec les ordres qu'elle a produits, parce que ces ordres la désignent et que
 * la réécrire ferait mentir le passé.
 *
 * LA CLÉ EST LA SIENNE. Le formulaire ne propose aucune répartition par défaut,
 * et n'en suggère pas : proposer « 60/40 » serait un conseil, et conseiller une
 * allocation demande un agrément que la maison n'a pas. Il offre des lignes
 * vides et compte ce que le client écrit.
 *
 * LE TOTAL SE VÉRIFIE SOUS LES DOIGTS. Un client qui découvre « le total fait
 * 90 % » après avoir cliqué recommence ; celui qui le voit pendant qu'il tape
 * corrige la ligne qu'il vient d'écrire. Et le bouton reste fermé tant que la
 * clé ne tient pas, parce qu'un bouton qui mène à un refus prévisible est une
 * petite trahison.
 */
export function ModifierInstruction({
  s,
  fonds,
  onClose,
}: {
  s: { id: string; ref: string; amount: number; dayOfMonth: number; minAmount: number; source?: string; offerId: string; splits?: { offerId: string; pct: number }[] };
  fonds: FondsChoix[];
  onClose: () => void;
}) {
  const t = useT();
  const [res, action, pending] = useActionState<ModifResult | null, FormData>(modifierStandingAction, null);
  const reinvest = s.source === "encaissements";
  const [lignes, setLignes] = useState<Ligne[]>(
    s.splits?.length ? s.splits.map((x) => ({ offerId: x.offerId, pct: String(x.pct) })) : [{ offerId: s.offerId, pct: "100" }],
  );

  const parts = lignes.filter((l) => l.offerId || l.pct).map((l) => ({ offerId: l.offerId, pct: Number(l.pct) }));
  const mauvaise = pourquoiPasDeCle(parts);
  const maj = (i: number, champ: keyof Ligne, v: string) => setLignes((xs) => xs.map((x, j) => (j === i ? { ...x, [champ]: v } : x)));

  return (
    <form action={action} className={styles.modif}>
      <input type="hidden" name="id" value={s.id} />
      <p className={styles.modifNote}>
        {t("Modifier crée une nouvelle version. L'ancienne reste dans votre historique avec les ordres qu'elle a produits : c'est ce qui permet de savoir sous quels termes chacun est parti.")}
      </p>

      <div className={styles.modifLigne}>
        {reinvest ? (
          <label>
            <span>{t("Replacer à partir de")}</span>
            <input name="minAmount" inputMode="numeric" defaultValue={s.minAmount ? fmt(s.minAmount) : ""} placeholder={t("quel que soit le montant")} />
          </label>
        ) : (
          <>
            <label>
              <span>{t("Montant du versement")}</span>
              <input name="amount" inputMode="numeric" required defaultValue={fmt(s.amount)} />
            </label>
            <label>
              <span>{t("Le jour du mois")}</span>
              <input name="dayOfMonth" type="number" min={1} max={28} required defaultValue={s.dayOfMonth} />
            </label>
          </>
        )}
      </div>

      <fieldset className={styles.cle}>
        <legend>{t("Vers quoi, et dans quelle proportion")}</legend>
        {lignes.map((l, i) => (
          <div key={i} className={styles.clePart}>
            {/* La liste de la maison, pas la native : sur un téléphone, la
                native s'ouvre en roue avec la typographie du système et sans la
                phrase qui dit ce que chaque ligne est. */}
            <Select
              block
              name="splitOffer"
              value={l.offerId}
              placeholder={t("Choisir une destination…")}
              onChange={(v) => maj(i, "offerId", v)}
              options={fonds.map((f) => ({ value: f.id, label: f.title, hint: f.min ? t("minimum {m}", { m: fmt(f.min) }) : undefined }))}
            />
            <input name="splitPct" inputMode="numeric" value={l.pct} onChange={(e) => maj(i, "pct", e.target.value)} aria-label={t("Part en pourcentage")} className={styles.clePct} />
            <span className={styles.cleSigne}>%</span>
            {lignes.length > 1 && (
              <button type="button" className={styles.cleRetirer} onClick={() => setLignes((xs) => xs.filter((_, j) => j !== i))}>
                {t("Retirer")}
              </button>
            )}
          </div>
        ))}
        {lignes.length < PARTS_MAX && (
          <button type="button" className="btn sm ghost" onClick={() => setLignes((xs) => [...xs, { offerId: "", pct: "" }])}>
            {t("Ajouter une destination")}
          </button>
        )}
        {/* Le total sous les doigts : le découvrir après le clic fait recommencer. */}
        <small className={mauvaise ? styles.cleKo : styles.cleOk}>{mauvaise ?? t("La clé tient : le total fait 100 %.")}</small>
      </fieldset>

      <div className={styles.modifFoot}>
        <button type="button" className="btn sm ghost" onClick={onClose}>
          {t("Annuler")}
        </button>
        <button className="btn sm primary" type="submit" disabled={pending || Boolean(mauvaise)}>
          {pending ? "…" : t("Enregistrer la nouvelle version")}
        </button>
      </div>
      {res && <small className={res.ok ? styles.cleOk : styles.cleKo}>{res.ok ? res.message : res.error}</small>}
    </form>
  );
}
