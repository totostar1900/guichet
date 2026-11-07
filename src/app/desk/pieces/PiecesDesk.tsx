"use client";

import { useActionState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useT } from "@/i18n/client";
import { archiverPiece, archiverReleve, type PieceResult } from "./actions";
import { chargerReleve, enregistrerBudget, type BudgetResult } from "../budgets/actions";
import styles from "./PiecesDesk.module.css";

const MILLESIMES: [string, string][] = [
  ["vote", "voté"],
  ["revision_annoncee", "révision annoncée"],
  ["revision_deposee", "révision déposée"],
  ["revise", "révisé"],
];

function Etat({ s }: { s: PieceResult | BudgetResult | null }) {
  const t = useT();
  if (!s) return null;
  return (
    <span className={s.ok ? styles.fait : styles.erreur} role="status">
      {s.ok ? t(s.message) : t(s.error)}
    </span>
  );
}

/** Garde la copie d'une pièce : une adresse que le serveur lit, ou un fichier déposé à la main quand le site refuse les robots. */
export function ArchiverPieceForm({ entite, objet }: { entite: string; objet: "budget" | "notation" | "autre" }) {
  const t = useT();
  const [state, action, pending] = useActionState<PieceResult | null, FormData>(archiverPiece, null);
  return (
    <form action={action} className={styles.form} encType="multipart/form-data">
      <input type="hidden" name="entite" value={entite} />
      <input type="hidden" name="objet" value={objet} />
      <label>
        {t("Titre de la pièce")}
        <input name="titre" required minLength={3} />
      </label>
      <label>
        {t("Qui la publie")}
        <input name="editeur" required minLength={2} placeholder="Ministère des Finances, Fitch…" />
      </label>
      <label className={styles.large}>
        {t("Adresse de la pièce (https)")}
        <input name="url" type="url" placeholder="https://" />
      </label>
      <label className={styles.large}>
        {t("ou le fichier, si le site refuse la lecture par le serveur")}
        <input name="fichier" type="file" accept="application/pdf,text/html,image/png,image/jpeg" />
      </label>
      <div className={styles.actions}>
        <button className="btn primary" type="submit" disabled={pending}>
          {t("Conserver une copie")}
        </button>
        <Etat s={state} />
      </div>
    </form>
  );
}

/** Prend la copie de toutes les pièces citées par le relevé officiel d'un État. */
export function ArchiverReleve({ pays }: { pays: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<PieceResult | null, FormData>(archiverReleve, null);
  return (
    <form action={action} className={styles.ligne}>
      <input type="hidden" name="pays" value={pays} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : t("Conserver une copie des pièces du relevé")}
      </button>
      <Etat s={state} />
    </form>
  );
}

/** Charge le relevé des pièces officielles, avec la relecture habituelle avant d'écrire. */
export function ChargerReleve({ pays, etats }: { pays: string; etats: string[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<BudgetResult | null, FormData>(chargerReleve, null);
  const id = `releve-${pays}`;
  return (
    <form id={id} action={action} className={styles.ligne}>
      <input type="hidden" name="pays" value={pays} />
      <ConfirmPublish
        form={id}
        label={pays === "tous" ? t("Charger le relevé officiel") : t("Charger le relevé de cet État")}
        title={t("Charger le relevé des pièces officielles")}
        lines={[
          t("Les budgets de {e} sont enregistrés tels que les pièces officielles les écrivent.", { e: etats.join(", ") }),
          t("Un budget qui existe déjà est remplacé ; l'ancien reste dans le journal d'audit."),
          t("La fiche publique de chaque État le montre aussitôt."),
        ]}
        confirmLabel={t("Charger")}
        pending={pending}
      />
      <Etat s={state} />
    </form>
  );
}

/** La saisie d'un budget : montants en milliards, postes un par ligne, rien n'est calculé. */
export function SaisieBudgetForm({ pays }: { pays: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<BudgetResult | null, FormData>(enregistrerBudget, null);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="pays" value={pays} />
      <label>
        {t("Exercice")}
        <input name="exercice" type="number" defaultValue={2026} min={2020} max={2035} required />
      </label>
      <label>
        {t("Millésime")}
        <select name="millesime" defaultValue="vote">
          {MILLESIMES.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.large}>
        {t("Texte de la loi")}
        <input name="loi" required minLength={5} placeholder="Loi n° … du … portant loi de finances pour l'exercice 2026" />
      </label>
      <label>
        {t("Promulguée le")}
        <input name="promulgueeLe" type="date" />
      </label>
      <label>
        {t("Budget total (Md FCFA)")}
        <input name="budgetTotal" inputMode="decimal" />
      </label>
      <label>
        {t("Solde déclaré (Md FCFA, négatif si déficit)")}
        <input name="solde" inputMode="decimal" />
      </label>
      <label>
        {t("Besoin de financement (Md FCFA)")}
        <input name="besoin" inputMode="decimal" />
      </label>
      <label className={styles.large}>
        {t("Recettes : un poste par ligne, « libellé | montant en milliards »")}
        <textarea name="recettes" />
      </label>
      <label className={styles.large}>
        {t("Dépenses : un poste par ligne, « libellé | montant en milliards »")}
        <textarea name="depenses" />
      </label>
      <label className={styles.large}>
        {t("Financement : un poste par ligne ; « | titres » à la fin de la ligne des titres publics")}
        <textarea name="financement" />
      </label>
      <label className={styles.large}>
        {t("Pièce source : ce que le texte cite")}
        <input name="source" required minLength={5} />
      </label>
      <label className={styles.large}>
        {t("Adresse de la pièce source (https)")}
        <input name="sourceUrl" type="url" placeholder="https://" />
      </label>
      <label className={styles.large}>
        {t("Pièces : « titre | éditeur | adresse », une par ligne")}
        <textarea name="references" />
      </label>
      <label className={styles.large}>
        {t("Ce que la pièce ne dit pas ou dit de deux façons : une phrase par ligne")}
        <textarea name="aRelever" />
      </label>
      <div className={styles.actions}>
        <button className="btn primary" type="submit" disabled={pending}>
          {t("Enregistrer le budget")}
        </button>
        <Etat s={state} />
      </div>
    </form>
  );
}
