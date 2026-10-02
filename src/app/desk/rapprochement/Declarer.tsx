"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { ecart } from "@/lib/domain/rapprochement";
import { fmt } from "@/lib/format";
import { enregistrerRapprochement, type RapproResult } from "./actions";
import styles from "./page.module.css";

type Ligne = { label: string; balance: string; evidence: string };
const VIDE: Ligne = { label: "", balance: "", evidence: "" };

/**
 * Déclarer ce que la maison tient, face à ce qu'elle doit.
 *
 * L'ÉCART SE CALCULE SOUS LES DOIGTS, et c'est tout l'intérêt de cet écran. Un
 * opérateur qui saisit trois soldes et découvre l'écart dans le message de
 * retour ne relit rien ; celui qui le voit grandir pendant qu'il tape relit la
 * ligne qu'il vient d'écrire.
 *
 * Et il se peint selon son sens, parce que les deux ne se valent pas. Un
 * excédent est ordinaire : l'argent propre de la maison est sur les mêmes
 * comptes. Un manque est la seule chose grave que ce contrôle existe pour voir,
 * et il ne doit pas ressembler à son contraire.
 *
 * La note s'ouvre d'elle-même quand l'écart apparaît. La demander d'avance
 * laisserait croire qu'un rapprochement juste a besoin d'être justifié ; ne pas
 * la demander du tout laisserait passer un écart sans explication, qui n'est pas
 * un contrôle mais un constat d'ignorance.
 */
export function Declarer({ du, aujourdHui }: { du: { owed: number; assigned: number; reclamable: number; clients: number }; aujourdHui: string }) {
  const t = useT();
  const [res, action, pending] = useActionState<RapproResult | null, FormData>(enregistrerRapprochement, null);
  const [lignes, setLignes] = useState<Ligne[]>([{ ...VIDE }, { ...VIDE }]);
  const [note, setNote] = useState("");

  const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
  const remplies = lignes.filter((l) => l.label.trim() || l.balance.trim() || l.evidence.trim());
  const tenu = remplies.reduce((t2, l) => t2 + (Number.isFinite(nombre(l.balance)) ? nombre(l.balance) : 0), 0);
  const e = ecart(du.owed, tenu);
  const majLigne = (i: number, champ: keyof Ligne, v: string) => setLignes((xs) => xs.map((x, j) => (j === i ? { ...x, [champ]: v } : x)));

  return (
    <form action={action} className={styles.declarer}>
      <div className={styles.dLigne}>
        <label className={styles.dDate}>
          <span>{t("Date des relevés")}</span>
          <input type="date" name="onDate" required defaultValue={aujourdHui} max={aujourdHui} />
        </label>
      </div>

      <div className="scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("Compte de la maison")}</th>
              <th className="r">{t("Solde du relevé")}</th>
              <th>{t("Pièce")}</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td>
                  <input name="label" value={l.label} onChange={(x) => majLigne(i, "label", x.target.value)} maxLength={80} placeholder={t("ex. BEAC · compte de règlement")} />
                </td>
                <td>
                  <input name="balance" value={l.balance} onChange={(x) => majLigne(i, "balance", x.target.value)} inputMode="numeric" className={styles.dMontant} />
                </td>
                <td>
                  <input name="evidence" value={l.evidence} onChange={(x) => majLigne(i, "evidence", x.target.value)} maxLength={120} placeholder={t("ex. relevé du 03/10")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn sm ghost" onClick={() => setLignes((xs) => [...xs, { ...VIDE }])}>
        {t("Ajouter un compte")}
      </button>

      {/* Les deux chiffres côte à côte, et l'écart entre eux : c'est la page entière. */}
      <div className={styles.balance}>
        <span>
          <small>{t("Dû aux clients")}</small>
          <b>{fmt(du.owed)}</b>
        </span>
        <span>
          <small>{t("Tenu, déclaré")}</small>
          <b>{fmt(Math.round(tenu))}</b>
        </span>
        <span className={e.sens === "manque" ? styles.manque : e.sens === "excedent" ? styles.excedent : styles.juste}>
          <small>{t("Écart")}</small>
          <b>
            {e.montant > 0 ? "+" : e.montant < 0 ? "−" : ""}
            {fmt(Math.abs(e.montant))}
          </b>
        </span>
      </div>

      {e.sens === "manque" && <p className={styles.alerte}>{t("La maison tient moins que ce qu'elle doit à ses clients. C'est la seule chose grave que ce contrôle existe pour voir.")}</p>}
      {e.sens === "excedent" && <p className={styles.muted}>{t("Un excédent est ordinaire : l'argent propre de la maison est sur les mêmes comptes, et un virement peut être en route. Dites lequel.")}</p>}

      {e.sens !== "juste" && (
        <label className={styles.dNote}>
          <span>{t("L'explication de l'écart")}</span>
          <textarea name="note" rows={2} maxLength={400} value={note} onChange={(x) => setNote(x.target.value)} placeholder={t("ex. 1 200 000 de fonds propres sur le compte Afriland, et un virement client parti le 2 non encore crédité")} />
        </label>
      )}

      <div className={styles.dFoot}>
        <button className="btn primary" type="submit" disabled={pending || !remplies.length || (e.sens !== "juste" && note.trim().length < 3)}>
          {pending ? "…" : t("Enregistrer le rapprochement")}
        </button>
        <small className={styles.muted}>{t("Un rapprochement ne se modifie pas : on en fait un autre. C'est ce qui lui donne sa valeur.")}</small>
      </div>
      {res && <p className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</p>}
    </form>
  );
}
