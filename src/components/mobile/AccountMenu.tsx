"use client";

import Link from "next/link";
import { Suspense, useActionState, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { logout, logoutEverywhere } from "@/app/connexion/actions";
import { identityAction, prefsAction, type IdentityResult } from "@/app/moi/actions";
import type { ClientPrefs } from "@/lib/domain/types";
import { LangSwitch } from "@/components/LangSwitch";
import { PushToggle } from "@/components/PushToggle";
import { Sheet } from "./Sheet";
import styles from "./AccountMenu.module.css";

/**
 * The account, behind the initial at the top right of the phone header, in
 * the manner of the Claude app. The rule: the initial is you, the ⋮ is the
 * app. So here: the card (name and city, corrected in place), the two
 * channels and their proof, what is yours (Mon espace, the profile, the
 * security, the papers), your preferences (language, alerts on this device,
 * how the desk reaches you first, statements by e-mail), what comes next,
 * and the way out (this device, or everywhere).
 */
export interface AccountProps {
  name: string;
  segment: string;
  tier: number;
  desk: boolean;
  email?: string;
  phone?: string;
  /** Proven channels : a ✓ on the row, otherwise « à prouver » with the way to Sécurité. */
  phoneOk?: boolean;
  emailOk?: boolean;
  prefs?: ClientPrefs;
  vapidKey?: string;
  /** KYC file status when one exists (brouillon → approuve): the hint under « Mes coordonnées et pièces ». */
  kycStatus?: string;
}

const D = {
  espace: "M4 19V9M10 19V5M16 19v-8M22 19H2",
  profil: "M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4",
  papers: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  compte: "M3 7h18v12H3zM3 11h18M7 15h4",
  famille: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6 0",
  invite: "M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7c-2-3-6-3-6 0h6M12 7c2-3 6-3 6 0h-6",
  out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  wa: "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z",
};
const KYC_HINT: Record<string, string> = { brouillon: "dossier commencé", soumis: "dossier envoyé", en_revue: "dossier en revue", approuve: "dossier approuvé", refuse: "dossier à reprendre" };

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Name and city, corrected in place; the segment's first word (« Personne physique ») stays. */
function IdentityForm({ name, city, onDone }: { name: string; city: string; onDone: (r: IdentityResult) => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<IdentityResult | null, FormData>(async (p, f) => {
    const r = await identityAction(p, f);
    if (r.ok) onDone(r);
    return r;
  }, null);
  return (
    <form action={action} className={styles.edit}>
      <label className="field">
        {t("Nom")}
        <input name="name" defaultValue={name} autoComplete="name" required minLength={2} maxLength={80} />
      </label>
      <label className="field">
        {t("Ville")}
        <input name="city" defaultValue={city} autoComplete="address-level2" maxLength={60} placeholder="Yaoundé" />
      </label>
      {state && !state.ok && <small className={styles.err}>{t(state.error)}</small>}
      <div className={styles.editFoot}>
        <button type="button" className="btn sm" onClick={() => onDone({ ok: false, error: "" })}>
          {t("Annuler")}
        </button>
        <button type="submit" className="btn sm primary" disabled={pending}>
          {t(pending ? "Enregistrement…" : "Enregistrer")}
        </button>
      </div>
    </form>
  );
}

export function AccountMenu(p: AccountProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [who, setWho] = useState({ name: p.name, segment: p.segment });
  const [prefs, setPrefs] = useState<ClientPrefs>(p.prefs ?? {});
  const [prefErr, setPrefErr] = useState("");
  const [saving, startSave] = useTransition();
  const close = () => setOpen(false);
  const initial = who.name.trim().charAt(0).toUpperCase() || "?";
  const [kind, city = ""] = who.segment.split("·").map((s) => s.trim());

  const setPref = (patch: ClientPrefs) => {
    const before = prefs;
    setPrefs({ ...prefs, ...patch });
    setPrefErr("");
    startSave(async () => {
      const r = await prefsAction(patch);
      if (!r.ok) {
        setPrefs(before);
        setPrefErr(r.error);
      }
    });
  };

  const mine: { key: string; icon: string; label: string; sub: string; href: string }[] = [
    { key: "espace", icon: D.espace, label: t(p.desk ? "Le desk" : "Mon espace"), sub: t(p.desk ? "intentions, lignes, documents" : "intentions, positions, documents"), href: p.desk ? "/desk" : "/moi" },
    { key: "profil", icon: D.profil, label: t("Mon profil financier"), sub: t("horizon, tolérance, connaissance, capacité"), href: "/moi/profil" },
    { key: "securite", icon: D.shield, label: t("Sécurité"), sub: t("canaux prouvés, appareils, code"), href: "/moi/securite" },
    { key: "pieces", icon: D.papers, label: t("Mes coordonnées et pièces"), sub: p.kycStatus && KYC_HINT[p.kycStatus] ? t(KYC_HINT[p.kycStatus]) : t("adresse, pièce d'identité, RIB, dossier"), href: p.kycStatus ? "/ouvrir-un-compte" : "/moi#coordonnees" },
  ];
  const soon: { key: string; icon: string; label: string; sub: string }[] = [
    { key: "compte", icon: D.compte, label: t("Mon compte-titres"), sub: t("dossier d'ouverture, relevés") },
    { key: "famille", icon: D.famille, label: t("Mes proches"), sub: t("un compte pour un enfant, une tontine") },
    { key: "parrainage", icon: D.invite, label: t("Inviter un proche"), sub: t("un lien, une ligne offerte à lire") },
  ];
  const reach = prefs.reach ?? (p.phoneOk ? "whatsapp" : "email");

  return (
    <>
      <button type="button" className={styles.avatar} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("Mon compte")} title={who.name}>
        {initial}
      </button>
      <Sheet
        open={open}
        onClose={close}
        navy
        dock="top-right"
        tall
        title={t("Mon compte")}
        foot={
          <div className={styles.out}>
            <form action={logout}>
              <button type="submit" className={styles.outBtn}>
                <Icon d={D.out} />
                {t("Se déconnecter de cet appareil")}
              </button>
            </form>
            <form action={logoutEverywhere}>
              <button type="submit" className={styles.outAll}>
                {t("Se déconnecter partout")}
              </button>
            </form>
          </div>
        }
      >
        <div className={styles.card}>
          <span className={styles.big}>{initial}</span>
          <span className={styles.who}>
            <b>{who.name}</b>
            <small>{[t(kind), city].filter(Boolean).join(" · ")}</small>
            <small>
              {t("niveau")} {p.tier} · {t(p.tier < 2 ? "compte-titres à ouvrir" : "compte-titres actif")}
            </small>
          </span>
          {!editing && (
            <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
              {t("Modifier")}
            </button>
          )}
        </div>
        {editing && (
          <IdentityForm
            name={who.name}
            city={city}
            onDone={(r) => {
              if (r.ok) setWho({ name: r.name, segment: r.segment });
              setEditing(false);
            }}
          />
        )}

        <div className={styles.channels}>
          <Link href="/moi/securite" className={styles.channel} onClick={close}>
            <Icon d={D.mail} />
            <span>
              <b>{p.email ?? t("E-mail à renseigner")}</b>
              <small className={p.emailOk ? styles.ok : undefined}>{t(p.emailOk ? "prouvé" : p.email ? "à prouver" : "le desk vous écrit ici")}</small>
            </span>
            <i aria-hidden="true">›</i>
          </Link>
          <Link href="/moi/securite" className={styles.channel} onClick={close}>
            <Icon d={D.wa} />
            <span>
              <b>{p.phone ?? t("WhatsApp à renseigner")}</b>
              <small className={p.phoneOk ? styles.ok : undefined}>{t(p.phoneOk ? "prouvé" : p.phone ? "à prouver" : "le desk vous joint ici")}</small>
            </span>
            <i aria-hidden="true">›</i>
          </Link>
        </div>

        <div className={styles.group}>{t("Chez vous")}</div>
        <div className={styles.rows}>
          {mine.map((r) => (
            <Link key={r.key} href={r.href} className={styles.row} onClick={close}>
              <Icon d={r.icon} />
              <span>
                <b>{r.label}</b>
                <small>{r.sub}</small>
              </span>
              <i aria-hidden="true">›</i>
            </Link>
          ))}
        </div>

        <div className={styles.group}>{t("Préférences")}</div>
        <div className={styles.rows}>
          <div className={styles.pref}>
            <span>
              <b>{t("Langue")}</b>
            </span>
            <Suspense>
              <LangSwitch compact />
            </Suspense>
          </div>
          {p.vapidKey && (
            <div className={`${styles.pref} ${styles.prefCol}`}>
              <span>
                <b>{t("Alertes sur cet appareil")}</b>
              </span>
              <PushToggle vapidKey={p.vapidKey} compact />
            </div>
          )}
          <div className={`${styles.pref} ${styles.prefCol}`}>
            <span>
              <b>{t("Comment vous joindre d'abord")}</b>
              <small>{t("Le conseiller commence par là ; les accusés de réception vont sur les deux canaux.")}</small>
            </span>
            <div className={styles.seg} role="group" aria-label={t("Comment vous joindre d'abord")}>
              {(["whatsapp", "email", "call"] as const).map((k) => (
                <button key={k} type="button" className={reach === k ? styles.segOn : ""} aria-pressed={reach === k} disabled={saving} onClick={() => setPref({ reach: k })}>
                  {k === "whatsapp" ? "WhatsApp" : t(k === "email" ? "E-mail" : "Appel")}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.pref}>
            <span>
              <b>{t("Relevés par e-mail")}</b>
              <small>{t("Chaque relevé, dès qu'il est produit ; ils restent dans Mes documents.")}</small>
            </span>
            <button type="button" role="switch" aria-checked={prefs.statementsByEmail !== false} className={`${styles.switch} ${prefs.statementsByEmail !== false ? styles.switchOn : ""}`} disabled={saving} onClick={() => setPref({ statementsByEmail: prefs.statementsByEmail === false })}>
              <i />
            </button>
          </div>
          {prefErr && <small className={styles.err}>{t(prefErr)}</small>}
        </div>

        <div className={styles.group}>{t("Bientôt")}</div>
        <div className={styles.rows}>
          {soon.map((r) => (
            <div key={r.key} className={`${styles.row} ${styles.soon}`} aria-disabled="true">
              <Icon d={r.icon} />
              <span>
                <b>{r.label}</b>
                <small>{r.sub}</small>
              </span>
              <em>{t("bientôt")}</em>
            </div>
          ))}
        </div>
        <p className={styles.note}>{t("Le ⋮ garde l'aide, les couleurs et le contact ; ici, ce qui vous appartient.")}</p>
      </Sheet>
    </>
  );
}
