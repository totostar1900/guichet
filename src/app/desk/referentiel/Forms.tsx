"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState, useState } from "react";
import type { BondTerms } from "@/data/bond-terms";
import type { Term } from "@/lib/glossary";
import { INTENT_LABEL } from "@/lib/domain/intent";
import { SEGMENT_LABEL } from "@/lib/domain/status";
import { ENGINE_LABEL, type Engine, type ProductType } from "@/lib/registry";
import type { Lesson } from "@/data/lessons";
import { saveGlossaryAction, saveJsonAction, saveLessonAction, saveTermAction, saveTypeAction, type RefResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: RefResult | null }) {
  if (!state) return null;
  return <p className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</p>;
}

const INTENTS = Object.keys(INTENT_LABEL) as (keyof typeof INTENT_LABEL)[];

/** One product type: what the client reads, what the desk must check, what the maths engine is. */
export function TypeForm({ t, isNew }: { t?: ProductType; isNew?: boolean }) {
  const tr = useT();
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveTypeAction, null);
  const [color, setColor] = useState(t?.color ?? "#0b2545");
  const [soft, setSoft] = useState(t?.colorSoft ?? "#e3e9f3");
  return (
    <form action={action} className={styles.form}>
      <div className={styles.row3}>
        <label>
          <span>{tr("Clé (identifiant, ne change plus)")}</span>
          <input name="key" defaultValue={t?.key} readOnly={!isNew} className="mono" placeholder={tr("ex. OBL_PRIVEE")} required />
        </label>
        <label>
          <span>{tr("Badge (court)")}</span>
          <input name="short" defaultValue={t?.short} maxLength={14} required />
        </label>
        <label>
          <span>Ordre d&apos;affichage</span>
          <input name="sort" type="number" min={0} max={999} defaultValue={t?.sort ?? 500} />
        </label>
      </div>
      <label>
        <span>{tr("Libellé (filtres, fiche)")}</span>
        <input name="label" defaultValue={t?.label} required />
      </label>
      <div className={styles.row3}>
        <label>
          <span>{tr("Marché")}</span>
          <Select block name="segment" value={t?.segment ?? "primaire"} options={(Object.keys(SEGMENT_LABEL) as (keyof typeof SEGMENT_LABEL)[]).map((k) => ({ value: k, label: SEGMENT_LABEL[k] }))} />
        </label>
        <label className={styles.span2}>
          <span>{tr("Moteur de calcul (la seule chose qui demande du code)")}</span>
          <Select block name="engine" value={t?.engine ?? "bullet_bond"} options={(Object.keys(ENGINE_LABEL) as Engine[]).map((k) => ({ value: k, label: ENGINE_LABEL[k] }))} />
        </label>
      </div>
      <div className={styles.row3}>
        <label>
          <span>{tr("Couleur du badge")}</span>
          <span className={styles.colorIn}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label={tr("Choisir la couleur")} />
            <input name="color" value={color} onChange={(e) => setColor(e.target.value)} className="mono" pattern="#[0-9a-fA-F]{6}" required />
          </span>
        </label>
        <label>
          <span>{tr("Fond du badge")}</span>
          <span className={styles.colorIn}>
            <input type="color" value={soft} onChange={(e) => setSoft(e.target.value)} aria-label={tr("Choisir le fond")} />
            <input name="colorSoft" value={soft} onChange={(e) => setSoft(e.target.value)} className="mono" pattern="#[0-9a-fA-F]{6}" required />
          </span>
        </label>
        <div className={styles.preview}>
          <span>{tr("Aperçu")}</span>
          <b style={{ color, background: soft, borderColor: color }}>{t?.short ?? "Badge"}</b>
        </div>
      </div>
      <label>
        <span>{tr("Intentions ouvertes au client (tant que la ligne est ouverte ou cotée)")}</span>
        <span className={styles.checks}>
          {INTENTS.map((k) => (
            <label key={k}>
              <input type="checkbox" name="intent" value={k} defaultChecked={t?.intentsOpen.includes(k) ?? (k === "info")} /> {tr(INTENT_LABEL[k])}
            </label>
          ))}
        </span>
      </label>
      <label>
        <span>{tr("« À garder en tête » sur la fiche client — une ligne par point : Titre. | texte")}</span>
        <textarea name="cautions" rows={5} defaultValue={t?.cautions.map(([a, b]) => `${a} | ${b}`).join("\n")} placeholder={"Crédit. | L'émetteur est…\nLiquidité. | …"} />
      </label>
      <label>
        <span>{tr("Liste de contrôle avant publication — une ligne par point")}</span>
        <textarea name="checklist" rows={4} defaultValue={t?.checklist.join("\n")} placeholder={"Communiqué joint\nCoupon, nominal et échéance saisis"} />
      </label>
      <label>
        <span>{tr("Champs libres affichés sur la fiche — une ligne par champ : cle|Libellé|oui (obligatoire) ou non")}</span>
        <textarea name="fields" rows={3} defaultValue={t?.fields.map((f) => `${f.key}|${f.label}|${f.required ? "oui" : "non"}`).join("\n")} placeholder={"garantie|Garantie|non\nagent_payeur|Agent payeur|oui"} />
      </label>
      <div className={styles.actions}>
        <label className={styles.inlineCheck}>
          <input type="checkbox" name="enabled" defaultChecked={t?.enabled ?? true} /> {tr("Proposé dans le Guichet et le desk")}
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
  const tr = useT();
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveTermAction, null);
  return (
    <form action={action} className={`${styles.form} ${styles.compact}`}>
      <div className={styles.row3}>
        <label>
          <span>{tr("ISIN")}</span>
          <input name="isin" defaultValue={t?.isin} readOnly={Boolean(t)} className="mono" maxLength={12} required />
        </label>
        <label>
          <span>{tr("Échéance exacte")}</span>
          <input name="maturityOn" type="date" defaultValue={t?.maturityOn} required />
        </label>
        <label>
          <span>{tr("Paiements par an")}</span>
          <Select block name="periodsPerYear" value={String(t?.periodsPerYear ?? 1)} options={[{ value: "1", label: "1 — annuel" }, { value: "2", label: "2 — semestriel" }, { value: "4", label: "4 — trimestriel" }]} />
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
  const tr = useT();
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveGlossaryAction, null);
  return (
    <form action={action} className={`${styles.form} ${styles.compact}`}>
      <div className={styles.row3}>
        <label>
          <span>{tr("Clé (ex. rendement_actuariel)")}</span>
          <input name="key" defaultValue={k} readOnly={Boolean(k)} className="mono" required />
        </label>
        <label>
          <span>{tr("Terme affiché")}</span>
          <input name="short" defaultValue={t?.short} required />
        </label>
        <label>
          <span>{tr("Forme longue (facultatif)")}</span>
          <input name="long" defaultValue={t?.long} />
        </label>
      </div>
      <label>
        <span>{tr("Explication en une ou deux phrases")}</span>
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

const WIDGET_LABEL: Record<Lesson["widget"], string> = { read_ota: "Lire une OTA (cinq chiffres)", bond_price: "Prix → rendement (curseur)", bta_rate: "Taux précompté → prix et rendement", tenor: "Deux durées, même décote", equity: "Cours, dividende, PER", fund: "Montant → parts à la VL", auction: "Part servie à l'adjudication", risks: "Les quatre risques (cases)" };

export function LessonForm({ l }: { l?: Lesson }) {
  const tr = useT();
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveLessonAction, null);
  return (
    <form action={action} className={styles.form}>
      <div className={styles.row3}>
        <label>
          <span>{tr("Clé (adresse de la page, ne change plus)")}</span>
          <input name="key" defaultValue={l?.key} readOnly={Boolean(l)} className="mono" placeholder={tr("ex. lire-un-bta")} required />
        </label>
        <label>
          <span>{tr("Ordre")}</span>
          <input name="order" type="number" min={1} max={99} defaultValue={l?.order ?? 9} required />
        </label>
        <label>
          <span>{tr("Durée annoncée (min)")}</span>
          <input name="minutes" type="number" min={1} max={30} defaultValue={l?.minutes ?? 2} />
        </label>
      </div>
      <label>
        <span>{tr("Titre")}</span>
        <input name="title" defaultValue={l?.title} required />
      </label>
      <label>
        <span>Une phrase d&apos;introduction</span>
        <input name="intro" defaultValue={l?.intro} required />
      </label>
      <label>
        <span>{tr("Corps — un paragraphe par bloc, séparés par une ligne vide (trois à quatre paragraphes courts)")}</span>
        <textarea name="body" rows={9} defaultValue={l?.body.join("\n\n")} required />
      </label>
      <label>
        <span>{tr("Bloc interactif (illustré avec une vraie ligne du Guichet)")}</span>
        <Select block name="widget" value={l?.widget ?? "read_ota"} options={(Object.keys(WIDGET_LABEL) as Lesson["widget"][]).map((k) => ({ value: k, label: WIDGET_LABEL[k] }))} />
      </label>
      <label>
        <span>{tr("Question de fin")}</span>
        <input name="q" defaultValue={l?.quiz.q} required />
      </label>
      <div className={styles.row3}>
        {[0, 1, 2].map((i) => (
          <label key={i}>
            <span>Réponse {i + 1}</span>
            <input name={`o${i + 1}`} defaultValue={l?.quiz.options[i]} required />
          </label>
        ))}
      </div>
      <div className={styles.row3}>
        <label>
          <span>{tr("Bonne réponse")}</span>
          <Select block name="answer" value={String(l?.quiz.answer ?? 0)} options={[{ value: "0", label: "Réponse 1" }, { value: "1", label: "Réponse 2" }, { value: "2", label: "Réponse 3" }]} />
        </label>
        <label className={styles.span2}>
          <span>{tr("Pourquoi (une phrase, affichée après la réponse)")}</span>
          <input name="why" defaultValue={l?.quiz.why} required />
        </label>
      </div>
      <label>
        <span>{tr("Termes du glossaire dont la bulle « i » renvoie à cette leçon (clés, séparées par des virgules)")}</span>
        <input name="terms" className="mono" defaultValue={l?.terms.join(", ")} placeholder={tr("ota, nominal, coupon")} />
      </label>
      <div className={styles.actions}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer la leçon"}
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
