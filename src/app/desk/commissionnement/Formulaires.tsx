"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import type { Simulation } from "@/lib/domain/commissionnement";
import { apercuDesConditions, changerEtatDuReleve, enregistrerConditions, type CommissionResult } from "./actions";
import styles from "./page.module.css";

/** Les valeurs d'un formulaire de conditions, en texte : ce que la page serveur y pose au départ. */
export interface ValeursDeConditions {
  sousPct: string;
  sousPart: string;
  sousMin: string;
  sousMax: string;
  rachPct: string;
  rachPart: string;
  rachMin: string;
  rachMax: string;
  encPct: string;
  encMin: string;
  encMax: string;
  accordRef: string;
  echeanceLe: string;
  delai: string;
}

const Champ = ({ nom, libelle, valeur, pas = "0.01", requis }: { nom: string; libelle: string; valeur: string; pas?: string; requis?: boolean }) => (
  <label className={styles.champ}>
    <span>{libelle}</span>
    <input name={nom} type="number" min={0} step={pas} defaultValue={valeur} inputMode="decimal" required={requis} />
  </label>
);

/**
 * LES CONDITIONS D'UN FONDS : UN FORMULAIRE, DEUX GESTES (planche « Deux tableaux », points 3 et 4C). « Aperçu d'impact » rejoue les six derniers mois avec les conditions saisies, sans rien
 * écrire ; « Enregistrer » pose une version datée, avec son motif. Le même moteur sert l'un et l'autre, et la projection sur douze mois est dite estimation.
 */
export function FormulaireDeFonds({ offerId, societe, societes, valeurs, aujourdHui, simulateurSeul, aDesSoeurs }: { offerId: string; societe: string; societes: string[]; valeurs: ValeursDeConditions; aujourdHui: string; simulateurSeul?: boolean; aDesSoeurs?: boolean }) {
  const t = useT();
  const [res, action, pending] = useActionState<CommissionResult | null, FormData>(enregistrerConditions, null);
  const formulaire = useRef<HTMLFormElement>(null);
  const [apercu, setApercu] = useState<Simulation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [calcul, lancer] = useTransition();

  const voir = () => {
    const f = formulaire.current;
    if (!f) return;
    const brut = Object.fromEntries([...new FormData(f).entries()].map(([k, v]) => [k, String(v)]));
    setErreur(null);
    lancer(async () => {
      const r = await apercuDesConditions(offerId, brut);
      if (r.ok) setApercu(r.simulation);
      else {
        setApercu(null);
        setErreur(r.error);
      }
    });
  };

  return (
    <form ref={formulaire} action={action} className={styles.pb}>
      <input type="hidden" name="offerId" value={offerId} />
      <div className={styles.grille}>
        <div className={styles.bloc}>
          <h3>{t("Souscription")}</h3>
          <Champ nom="sousPct" libelle={t("Taux sur le montant (%)")} valeur={valeurs.sousPct} requis />
          <Champ nom="sousPart" libelle={t("Part des droits d'entrée (%)")} valeur={valeurs.sousPart} />
          <Champ nom="sousMin" libelle={t("Plancher (FCFA)")} valeur={valeurs.sousMin} pas="1" />
          <Champ nom="sousMax" libelle={t("Plafond (FCFA)")} valeur={valeurs.sousMax} pas="1" />
        </div>
        <div className={styles.bloc}>
          <h3>{t("Rachat")}</h3>
          <Champ nom="rachPct" libelle={t("Taux sur le montant (%)")} valeur={valeurs.rachPct} requis />
          <Champ nom="rachPart" libelle={t("Part des droits de sortie (%)")} valeur={valeurs.rachPart} />
          <Champ nom="rachMin" libelle={t("Plancher (FCFA)")} valeur={valeurs.rachMin} pas="1" />
          <Champ nom="rachMax" libelle={t("Plafond (FCFA)")} valeur={valeurs.rachMax} pas="1" />
        </div>
        <div className={styles.bloc}>
          <h3>{t("Encours")}</h3>
          <Champ nom="encPct" libelle={t("Rétrocession (% par an)")} valeur={valeurs.encPct} requis />
          <Champ nom="encMin" libelle={t("Plancher mensuel (FCFA)")} valeur={valeurs.encMin} pas="1" />
          <Champ nom="encMax" libelle={t("Plafond mensuel (FCFA)")} valeur={valeurs.encMax} pas="1" />
        </div>
      </div>

      {apercu && <ApercuDImpact s={apercu} />}
      {erreur && <p className={styles.ko}>{erreur}</p>}

      {!simulateurSeul && (
        <>
          <div className={styles.grille}>
            <label className={styles.champ}>
              <span>{t("Société de gestion")}</span>
              <input name="societe" list={`societes-${offerId}`} defaultValue={societe} required />
              <datalist id={`societes-${offerId}`}>
                {societes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className={styles.champ}>
              <span>{t("Départ le")}</span>
              <input name="effetLe" type="date" defaultValue={aujourdHui} required />
            </label>
            <label className={styles.champ}>
              <span>{t("Motif (obligatoire)")}</span>
              <input name="motif" placeholder={t("avenant du …, nouvel accord …")} required minLength={3} />
            </label>
            <label className={styles.champ}>
              <span>{t("Référence de l'accord")}</span>
              <input name="accordRef" defaultValue={valeurs.accordRef} />
            </label>
            <label className={styles.champ}>
              <span>{t("Échéance de l'accord")}</span>
              <input name="echeanceLe" type="date" defaultValue={valeurs.echeanceLe} />
            </label>
            <Champ nom="delai" libelle={t("Délai de paiement (jours)")} valeur={valeurs.delai} pas="1" />
          </div>
          {aDesSoeurs && (
            <label className={styles.note}>
              <input type="checkbox" name="tousLesFonds" value="on" /> {t("Appliquer à tous les fonds de cette société (chacun garde sa propre version)")}
            </label>
          )}
        </>
      )}

      <div className={styles.pied}>
        <button className="btn" type="button" onClick={voir} disabled={calcul}>
          {calcul ? t("Calcul…") : t("Aperçu d'impact")}
        </button>
        {!simulateurSeul && (
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? t("Enregistrement…") : t("Enregistrer")}
          </button>
        )}
        {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
      </div>
    </form>
  );
}

/** L'aperçu : les mois observés, le dû actuel et le dû proposé, puis la projection à volumes constants, toujours dite estimation. */
function ApercuDImpact({ s }: { s: Simulation }) {
  const t = useT();
  const signe = (n: number) => `${n > 0 ? "+" : ""}${fmt(n)}`;
  const classe = (n: number) => (n > 0 ? styles.hausse : n < 0 ? styles.baisse : undefined);
  return (
    <div className={styles.apercu}>
      <div className={styles.large}>
        <table className={styles.tableau} style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>{t("Mois")}</th>
              <th className={styles.r}>{t("Dû actuel")}</th>
              <th className={styles.r}>{t("Dû proposé")}</th>
              <th className={styles.r}>{t("Écart")}</th>
            </tr>
          </thead>
          <tbody>
            {s.mois.map((m) => (
              <tr key={m.mois}>
                <td>{m.mois}</td>
                <td className={styles.r}>{fmt(m.actuel)}</td>
                <td className={styles.r}>{fmt(m.propose)}</td>
                <td className={`${styles.r} ${classe(m.ecart) ?? ""}`}>{signe(m.ecart)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        <b>{t("Estimation sur douze mois")}</b> : {fmt(s.surDouzeMois.actuel)} → <b>{fmt(s.surDouzeMois.propose)}</b> FCFA (<span className={classe(s.surDouzeMois.ecart)}>{signe(s.surDouzeMois.ecart)}</span>). {t("À volumes constants : la moyenne des mois observés, jamais une promesse.")}
      </p>
    </div>
  );
}

/** Le passage d'un relevé à l'état suivant. L'envoi fige le mois. */
export function EtatDuReleveForm({ societe, mois, suivants }: { societe: string; mois: string; suivants: { etat: string; libelle: string }[] }) {
  const t = useT();
  const [res, action, pending] = useActionState<CommissionResult | null, FormData>(changerEtatDuReleve, null);
  if (suivants.length === 0) return null;
  return (
    <form action={action} className={styles.pied}>
      <input type="hidden" name="societe" value={societe} />
      <input type="hidden" name="mois" value={mois} />
      {suivants.map((s) => (
        <button key={s.etat} className="btn" type="submit" name="etat" value={s.etat} disabled={pending}>
          {t(s.libelle)}
        </button>
      ))}
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}
