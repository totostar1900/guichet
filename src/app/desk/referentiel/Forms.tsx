"use client";

import { useActionState, useState } from "react";
import type { BondTerms } from "@/data/bond-terms";
import type { Term } from "@/lib/glossary";
import { INTENT_LABEL } from "@/lib/domain/intent";
import { SEGMENT_LABEL } from "@/lib/domain/status";
import { ENGINE_LABEL, type Engine, type ProductType } from "@/lib/registry";
import { saveGlossaryAction, saveJsonAction, saveTermAction, saveTypeAction, type RefResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: RefResult | null }) {
  if (!state) return null;
  return <p className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</p>;
}

const INTENTS = Object.keys(INTENT_LABEL) as (keyof typeof INTENT_LABEL)[];

/** One product type: what the client reads, what the desk must check, what the maths engine is. */
export function TypeForm({ t, isNew }: { t?: ProductType; isNew?: boolean }) {
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveTypeAction, null);
  const [color, setColor] = useState(t?.color ?? "#0b2545");
  const [soft, setSoft] = useState(t?.colorSoft ?? "#e3e9f3");
  return (
    <form action={action} className={styles.form}>
      <div className={styles.row3}>
        <label>
          <span>Clé (identifiant, ne change plus)</span>
          <input name="key" defaultValue={t?.key} readOnly={!isNew} className="mono" placeholder="ex. OBL_PRIVEE" required />
        </label>
        <label>
          <span>Badge (court)</span>
          <input name="short" defaultValue={t?.short} maxLength={14} required />
        </label>
        <label>
          <span>Ordre d&apos;affichage</span>
          <input name="sort" type="number" min={0} max={999} defaultValue={t?.sort ?? 500} />
        </label>
      </div>
      <label>
        <span>Libellé (filtres, fiche)</span>
        <input name="label" defaultValue={t?.label} required />
      </label>
      <div className={styles.row3}>
        <label>
          <span>Marché</span>
          <select name="segment" defaultValue={t?.segment ?? "primaire"}>
            {(Object.keys(SEGMENT_LABEL) as (keyof typeof SEGMENT_LABEL)[]).map((k) => (
              <option key={k} value={k}>
                {SEGMENT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.span2}>
          <span>Moteur de calcul (la seule chose qui demande du code)</span>
          <select name="engine" defaultValue={t?.engine ?? "bullet_bond"}>
            {(Object.keys(ENGINE_LABEL) as Engine[]).map((k) => (
              <option key={k} value={k}>
                {ENGINE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.row3}>
        <label>
          <span>Couleur du badge</span>
          <span className={styles.colorIn}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Choisir la couleur" />
            <input name="color" value={color} onChange={(e) => setColor(e.target.value)} className="mono" pattern="#[0-9a-fA-F]{6}" required />
          </span>
        </label>
        <label>
          <span>Fond du badge</span>
          <span className={styles.colorIn}>
            <input type="color" value={soft} onChange={(e) => setSoft(e.target.value)} aria-label="Choisir le fond" />
            <input name="colorSoft" value={soft} onChange={(e) => setSoft(e.target.value)} className="mono" pattern="#[0-9a-fA-F]{6}" required />
          </span>
        </label>
        <div className={styles.preview}>
          <span>Aperçu</span>
          <b style={{ color, background: soft, borderColor: color }}>{t?.short ?? "Badge"}</b>
        </div>
      </div>
      <label>
        <span>Intentions ouvertes au client (tant que la ligne est ouverte ou cotée)</span>
        <span className={styles.checks}>
          {INTENTS.map((k) => (
            <label key={k}>
              <input type="checkbox" name="intent" value={k} defaultChecked={t?.intentsOpen.includes(k) ?? (k === "info")} /> {INTENT_LABEL[k]}
            </label>
          ))}
        </span>
      </label>
      <label>
        <span>« À garder en tête » sur la fiche client — une ligne par point : Titre. | texte</span>
        <textarea name="cautions" rows={5} defaultValue={t?.cautions.map(([a, b]) => `${a} | ${b}`).join("\n")} placeholder={"Crédit. | L'émetteur est…\nLiquidité. | …"} />
      </label>
      <label>
        <span>Liste de contrôle avant publication — une ligne par point</span>
        <textarea name="checklist" rows={4} defaultValue={t?.checklist.join("\n")} placeholder={"Communiqué joint\nCoupon, nominal et échéance saisis"} />
      </label>
      <label>
        <span>Champs libres affichés sur la fiche — une ligne par champ : cle|Libellé|oui (obligatoire) ou non</span>
        <textarea name="fields" rows={3} defaultValue={t?.fields.map((f) => `${f.key}|${f.label}|${f.required ? "oui" : "non"}`).join("\n")} placeholder={"garantie|Garantie|non\nagent_payeur|Agent payeur|oui"} />
      </label>
      <div className={styles.actions}>
        <label className={styles.inlineCheck}>
          <input type="checkbox" name="enabled" defaultChecked={t?.enabled ?? true} /> Proposé dans le Guichet et le desk
        </label>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {pending ? "…" : isNew ? "Créer le type" : "Enregistrer"}
        </button>
      </div>
      <Msg state={state} />
    </form>
  );
}

export function TermForm({ t }: { t?: BondTerms }) {
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveTermAction, null);
  return (
    <form action={action} className={`${styles.form} ${styles.compact}`}>
      <div className={styles.row3}>
        <label>
          <span>ISIN</span>
          <input name="isin" defaultValue={t?.isin} readOnly={Boolean(t)} className="mono" maxLength={12} required />
        </label>
        <label>
          <span>Échéance exacte</span>
          <input name="maturityOn" type="date" defaultValue={t?.maturityOn} required />
        </label>
        <label>
          <span>Paiements par an</span>
          <select name="periodsPerYear" defaultValue={String(t?.periodsPerYear ?? 1)}>
            <option value="1">1 — annuel</option>
            <option value="2">2 — semestriel</option>
            <option value="4">4 — trimestriel</option>
          </select>
        </label>
      </div>
      <div className={styles.row3}>
        <label>
          <span>Différé : intérêts seuls jusqu&apos;au</span>
          <input name="graceUntil" type="date" defaultValue={t?.graceUntil} />
        </label>
        <label className={styles.span2}>
          <span>Source (fiche signalétique, note d&apos;information, date)</span>
          <input name="source" defaultValue={t?.source} required />
        </label>
      </div>
      <div className={styles.actions}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
      <Msg state={state} />
    </form>
  );
}

export function GlossaryForm({ k, t }: { k?: string; t?: Term }) {
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveGlossaryAction, null);
  return (
    <form action={action} className={`${styles.form} ${styles.compact}`}>
      <div className={styles.row3}>
        <label>
          <span>Clé (ex. rendement_actuariel)</span>
          <input name="key" defaultValue={k} readOnly={Boolean(k)} className="mono" required />
        </label>
        <label>
          <span>Terme affiché</span>
          <input name="short" defaultValue={t?.short} required />
        </label>
        <label>
          <span>Forme longue (facultatif)</span>
          <input name="long" defaultValue={t?.long} />
        </label>
      </div>
      <label>
        <span>Explication en une ou deux phrases</span>
        <textarea name="text" rows={3} defaultValue={t?.text} required />
      </label>
      <div className={styles.actions}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
      <Msg state={state} />
    </form>
  );
}

/** Company / issuer sheets are large structured records: edited as JSON, checked field by field on save. */
export function JsonForm({ kind, data, label }: { kind: string; data?: unknown; label: string }) {
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveJsonAction, null);
  return (
    <form action={action} className={`${styles.form} ${styles.compact}`}>
      <input type="hidden" name="kind" value={kind} />
      <label>
        <span>{label} — fiche complète (JSON)</span>
        <textarea name="json" rows={data ? 22 : 10} className="mono" defaultValue={data ? JSON.stringify(data, null, 2) : ""} spellCheck={false} required />
      </label>
      <div className={styles.actions}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer la fiche"}
        </button>
      </div>
      <Msg state={state} />
    </form>
  );
}
