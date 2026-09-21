"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState, useState } from "react";
import { FEATURE_REASONS } from "@/lib/domain/featured";
import { broadcastOpportunityAction, featureOfferAction, unfeatureOfferAction, type FeatureResult } from "./actions";
import styles from "./FeaturePanel.module.css";

export interface FeatureRow {
  id: string;
  title: string;
  hero: string;
  deadline?: string; // YYYY-MM-DD default for « jusqu'au »
  featured?: { reason: string; until: string; by: string };
  /** Featured but no longer actionable: the client list already leaves it out; the desk sees why. */
  closed?: boolean;
}

/** The line to feature: type a few letters, pick among the open or quoted lines that match. */
function LinePicker({ candidates, value, onChange }: { candidates: FeatureRow[]; value: string; onChange: (id: string) => void }) {
  const t = useT();
  const chosen = candidates.find((c) => c.id === value);
  const [text, setText] = useState(chosen?.title ?? "");
  const [open, setOpen] = useState(false);
  const q = text.trim().toLowerCase();
  const hits = (q && text !== chosen?.title ? candidates.filter((c) => c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) : candidates).slice(0, 8);
  return (
    <div className={styles.picker}>
      <input
        value={text}
        placeholder={t("Tapez un nom de ligne, un ISIN…")}
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (chosen && e.target.value !== chosen.title) onChange("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      <input type="hidden" name="offerId" value={value} />
      {open && hits.length > 0 && (
        <ul className={styles.hits} role="listbox">
          {hits.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={c.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.id);
                  setText(c.title);
                  setOpen(false);
                }}
              >
                <b>{c.title}</b>
                <small>
                  {c.hero}
                  {c.deadline ? ` · ${t("clôture")} ${c.deadline}` : ` · ${t("cotée")}`}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q && hits.length === 0 && <small className={styles.none}>{t("Aucune ligne ouverte ou cotée ne correspond.")}</small>}
    </div>
  );
}

/** Desk › carnet : what is « à la une » now, and the form to add one (max three, factual reason, expiry). */
export function FeaturePanel({ active, candidates }: { active: FeatureRow[]; candidates: FeatureRow[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(featureOfferAction, null);
  const [pick, setPick] = useState("");
  const [reason, setReason] = useState<string>(FEATURE_REASONS[0]);
  const chosen = candidates.find((c) => c.id === pick);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="panel">
      <div className="panel-h">
        <h2>{t("À la une")}</h2>
        <span className="muted">{t(`Sélection du desk · ${active.length}/3 · une raison factuelle, une date de fin, jamais un conseil`)} · {t("seules les lignes ouvertes ou cotées")}</span>
      </div>
      {active.length > 0 && (
        <ul className={styles.list}>
          {active.map((a) => (
            <li key={a.id}>
              <div>
                <b>{a.title}</b>
                <small>
                  {a.featured?.reason} · jusqu&apos;au {a.featured?.until} · par {a.featured?.by}
                  {a.closed && <em className={styles.closed}> · {t("clôturée : plus affichée aux clients, à retirer")}</em>}
                </small>
              </div>
              <div className={styles.rowActions}>
                <BroadcastForm offerId={a.id} />
                <form action={unfeatureOfferAction}>
                  <input type="hidden" name="offerId" value={a.id} />
                  <button className="btn sm ghost" type="submit">
                    {t("Retirer")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {active.length < 3 && candidates.length > 0 && (
        <form action={action} className={styles.form}>
          <label>
            <span>{t("Ligne")}</span>
            <LinePicker candidates={candidates} value={pick} onChange={setPick} />
          </label>
          <label>
            <span>{t("Raison (factuelle)")}</span>
            <input name="reason" list="feature-reasons" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={90} required />
            <datalist id="feature-reasons">
              {FEATURE_REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label>
            <span>{t("Jusqu'au")}</span>
            <input name="until" type="date" key={pick} defaultValue={chosen?.deadline ?? today} min={today} required />
          </label>
          <button className="btn sm primary" type="submit" disabled={pending || !pick}>
            {t(pending ? "…" : "Mettre à la une")}
          </button>
          {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
        </form>
      )}
    </div>
  );
}

/** One line: pick the segment, get the count, confirm, send : every send is journalled in Diffusion. */
function BroadcastForm({ offerId }: { offerId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(broadcastOpportunityAction, null);
  return (
    <form action={action} className={styles.bc}>
      <input type="hidden" name="offerId" value={offerId} />
      <Select compact name="segment" label={t("Segment")} value="Tous les clients" options={["Tous les clients", "Institutionnels + entreprises", "Personnes physiques + groupements"].map((v) => ({ value: v, label: v }))} />
      <label className={styles.confirm}>
        <input type="checkbox" name="confirm" value="1" /> {t("Confirmer")}
      </label>
      <button className="btn sm primary" type="submit" disabled={pending}>
        {t(pending ? "…" : "Diffuser comme opportunité du moment")}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
