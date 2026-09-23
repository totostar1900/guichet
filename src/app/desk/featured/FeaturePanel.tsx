"use client";

import { fold } from "@/lib/text";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState, useState, useId } from "react";
import { FEATURE_REASONS } from "@/lib/domain/featured";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
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
  const q = fold(text.trim());
  const hits = (q && text !== chosen?.title ? candidates.filter((c) => fold(c.title).includes(q) || fold(c.id).includes(q)) : candidates).slice(0, 8);
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
          {state && <small className={state.ok ? styles.ok : styles.err}>{said(state)}</small>}
        </form>
      )}
    </div>
  );
}

/** La phrase d’un résultat : un échec porte soit un message, soit un plan de diffusion. */
const said = (r: FeatureResult): string => (r.ok ? r.message : "error" in r ? r.error : "");

/**
 * Diffuser est le seul geste du desk qui quitte la plateforme : un WhatsApp ne
 * se rattrape pas. Deux temps, donc. On demande d’abord qui serait prévenu, le
 * serveur compte sans rien envoyer, puis la relecture affiche ce compte et
 * demande de le recopier. La case à cocher d’avant pouvait être cochée avant
 * d’avoir vu le moindre chiffre.
 */
function BroadcastForm({ offerId }: { offerId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(broadcastOpportunityAction, null);
  const sendId = useId();
  const plan = state && !state.ok && "plan" in state ? state.plan : undefined;
  return (
    <div className={styles.bc}>
      <form action={action} className={styles.bc}>
        <input type="hidden" name="offerId" value={offerId} />
        <Select compact name="segment" label={t("Segment")} value={plan?.segment ?? "Tous les clients"} options={["Tous les clients", "Institutionnels + entreprises", "Personnes physiques + groupements"].map((v) => ({ value: v, label: v }))} />
        <button className="btn sm" type="submit" disabled={pending}>
          {t(pending ? "…" : "Voir qui serait prévenu")}
        </button>
      </form>
      {plan && (
        <form id={sendId} action={action} className={styles.bc}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="segment" value={plan.segment} />
          <input type="hidden" name="confirm" value="1" />
          <ConfirmPublish
            form={sendId}
            className="btn sm primary"
            label={t("Diffuser à {n} client(s)", { n: plan.recipients })}
            confirmLabel={t("Diffuser maintenant")}
            title={t("Diffuser comme opportunité du moment")}
            typed={String(plan.recipients)}
            lines={[
              t("{n} client(s) seront prévenus : push, WhatsApp et e-mail, selon ce que chacun a accepté.", { n: plan.recipients }),
              t("{d} appareil(s) avec alertes.", { d: plan.pushDevices }),
              ...(plan.capped ? [t("{c} client(s) déjà alerté(s) aujourd'hui ne le seront pas une seconde fois.", { c: plan.capped })] : []),
              ...(plan.quiet ? [t("Heures calmes : l'envoi est différé à 7 h.")] : []),
              t("« {r} » sur {x}.", { r: plan.reason, x: plan.title }),
              t("Un message parti ne se rattrape pas."),
            ]}
          />
        </form>
      )}
      {state && !plan && <small className={state.ok ? styles.ok : styles.err}>{said(state)}</small>}
    </div>
  );
}
