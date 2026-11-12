"use client";

import { fold } from "@/lib/text";
import { useT } from "@/i18n/client";
import { COHORTES, COHORTE_LABEL, segmentDeCohorte } from "@/lib/domain/cohortes";
import { Select } from "@/components/ui/Select";
import { useActionState, useState, useId } from "react";
import { FEATURE_REASONS } from "@/lib/domain/featured";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { broadcastOpportunityAction, featureOfferAction, unfeatureOfferAction, type FeatureResult } from "./actions";
import styles from "./FeaturePanel.module.css";

const SANS_COMMENTAIRE = "__sans__";
const AUTRE_RAISON = "__autre__";

export interface FeatureRow {
  id: string;
  title: string;
  /** L'ISIN de la ligne : on la cherche aussi par lui, le champ le promet. */
  isin?: string;
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
  /* LE CHAMP SE DÉCLARE COMBINÉ, sans quoi tout le reste ne dit rien.
     « aria-autocomplete », « aria-expanded » et la liste « listbox » étaient
     déjà là, mais le champ gardait son rôle implicite de zone de texte : un
     lecteur d'écran annonçait donc un champ ordinaire, sans jamais dire qu'une
     liste s'était ouverte ni combien de lignes elle propose. Le rôle et le
     lien vers la liste manquaient, et eux seuls font tenir l'ensemble. */
  const listeId = useId();
  const q = fold(text.trim());
  /* TOUTES LES LIGNES SE PROPOSENT (12 novembre 2026) : la liste n'en montrait que huit sans que rien ne dise qu'il y en avait d'autres, et une ligne au-delà de la huitième n'était trouvable qu'en tapant son nom. Elle défile, et son en-tête dit combien elle en porte. */
  const hits = q && text !== chosen?.title ? candidates.filter((c) => fold(c.title).includes(q) || fold(c.id).includes(q) || fold(c.isin ?? "").includes(q)) : candidates;
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
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listeId}
      />
      <input type="hidden" name="offerId" value={value} />
      {open && hits.length > 0 && (
        <ul id={listeId} className={styles.hits} role="listbox">
          <li className={styles.compte} aria-hidden="true">
            {t("{n} lignes ouvertes ou cotées", { n: String(hits.length) })}
          </li>
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
                  {c.isin ? ` · ${c.isin}` : ""}
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
export function FeaturePanel({ active, candidates, comptes }: { active: FeatureRow[]; candidates: FeatureRow[]; comptes?: Record<string, number> }) {
  const t = useT();
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(featureOfferAction, null);
  const [pick, setPick] = useState("");
  /* LA RAISON SE CHOISIT DANS UNE LISTE (12 novembre 2026) : la liste native d'un champ texte ne montrait que ce qui ressemblait au texte déjà écrit, donc une seule raison. « Sans commentaire » met à la une sans phrase ; « Autre raison » rouvre le champ libre, qui reste factuel. */
  const [choixRaison, setChoixRaison] = useState<string>(FEATURE_REASONS[0]);
  const [autre, setAutre] = useState("");
  const reason = choixRaison === SANS_COMMENTAIRE ? "" : choixRaison === AUTRE_RAISON ? autre.trim() : choixRaison;
  const [untilChoisi, setUntilChoisi] = useState("");
  const featureId = useId();
  const chosen = candidates.find((c) => c.id === pick);
  const today = new Date().toISOString().slice(0, 10);
  /* La fin se lit comme elle s'écrit : la date choisie, sinon celle de la clôture de la ligne, sinon aujourd'hui. */
  const until = untilChoisi || chosen?.deadline || today;
  return (
    <div className={`panel ${styles.panneau}`}>
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
                  {a.featured?.reason ? `${a.featured.reason} · ` : `${t("sans commentaire")} · `}jusqu&apos;au {a.featured?.until} · par {a.featured?.by}
                  {a.closed && <em className={styles.closed}> · {t("clôturée : plus affichée aux clients, à retirer")}</em>}
                </small>
              </div>
              <div className={styles.rowActions}>
                <BroadcastForm offerId={a.id} comptes={comptes} />
                <RetirerForm offerId={a.id} titre={a.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {active.length < 3 && candidates.length > 0 && (
        <form id={featureId} action={action} className={styles.form}>
          <label>
            <span>{t("Ligne")}</span>
            <LinePicker candidates={candidates} value={pick} onChange={(id) => { setPick(id); setUntilChoisi(""); }} />
          </label>
          <div>
            <Select
              label={t("Raison (factuelle)")}
              value={choixRaison}
              onChange={setChoixRaison}
              block
              cherchable={false}
              options={[
                ...FEATURE_REASONS.map((r) => ({ value: r as string, label: t(r) })),
                { value: SANS_COMMENTAIRE, label: t("Sans commentaire") },
                { value: AUTRE_RAISON, label: t("Autre raison…") },
              ]}
            />
            <input type="hidden" name="reason" value={reason} />
            {choixRaison === AUTRE_RAISON && <input value={autre} onChange={(e) => setAutre(e.target.value)} maxLength={90} placeholder={t("Une phrase factuelle")} aria-label={t("Raison (factuelle)")} className={styles.autre} />}
          </div>
          <label>
            <span>{t("Jusqu'au")}</span>
            <input name="until" type="date" value={until} onChange={(e) => setUntilChoisi(e.target.value)} min={today} required />
          </label>
          {/* DEUX TEMPS (12 novembre 2026) : mettre une ligne à la une la place en tête du Guichet pour tous les clients. La relecture redit la ligne, la raison que les clients liront et la date de fin. */}
          <ConfirmPublish
            form={featureId}
            label={t("Mettre à la une")}
            title={t("Mettre cette ligne à la une ?")}
            lines={[
              t("« {l} » passe en tête du Guichet, pour tous les clients, dès maintenant.", { l: chosen?.title ?? "—" }),
              reason ? t("Raison affichée : « {r} ».", { r: reason }) : t("Sans commentaire : aucune raison n'est affichée."),
              t("Jusqu'au {d}.", { d: until }),
              t("{n} ligne(s) à la une sur trois au plus, celle-ci comprise.", { n: active.length + 1 }),
            ]}
            confirmLabel={t("Mettre à la une")}
            disabled={!pick || (choixRaison === AUTRE_RAISON && autre.trim().length < 4)}
            pending={pending}
          />
          {state && <small className={state.ok ? styles.ok : styles.err}>{said(state)}</small>}
        </form>
      )}
    </div>
  );
}

/**
 * RETIRER DE LA UNE, EN DEUX TEMPS (12 novembre 2026) : le geste est silencieux et immédiat côté clients, la ligne disparaît de leur tête de page. La relecture le dit avant.
 */
function RetirerForm({ offerId, titre }: { offerId: string; titre: string }) {
  const t = useT();
  const formId = useId();
  return (
    <form id={formId} action={unfeatureOfferAction}>
      <input type="hidden" name="offerId" value={offerId} />
      <ConfirmPublish
        form={formId}
        className="btn sm ghost"
        label={t("Retirer")}
        title={t("Retirer cette ligne de la une ?")}
        lines={[t("« {l} » n'est plus à la une : les clients ne la voient plus en tête du Guichet.", { l: titre }), t("La ligne reste au catalogue, avec sa fiche.")]}
        confirmLabel={t("Retirer de la une")}
      />
    </form>
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
function BroadcastForm({ offerId, comptes }: { offerId: string; comptes?: Record<string, number> }) {
  const t = useT();
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(broadcastOpportunityAction, null);
  const sendId = useId();
  const plan = state && !state.ok && "plan" in state ? state.plan : undefined;
  return (
    <div className={styles.bc}>
      <form action={action} className={styles.bc}>
        <input type="hidden" name="offerId" value={offerId} />
        {/* LES COHORTES SONT DES SEGMENTS, et elles portent leur compte :
            choisir « Fidèles » sans savoir combien ils sont, c est écrire à
            l aveugle. Le consentement, lui, se vérifie à l étape suivante. */}
        <Select
          compact
          name="segment"
          label={t("Segment")}
          value={plan?.segment ?? "Tous les clients"}
          options={[
            ...["Tous les clients", "Institutionnels + entreprises", "Personnes physiques + groupements"].map((v) => ({ value: v, label: v })),
            ...COHORTES.map((c) => ({ value: segmentDeCohorte(c), label: `${t(COHORTE_LABEL[c])} (${comptes?.[c] ?? 0})` })),
          ]}
        />
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
