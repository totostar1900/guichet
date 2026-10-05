"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useLang, useT } from "@/i18n/client";
import { logout, logoutEverywhere } from "@/app/connexion/actions";
import { identityAction, prefsAction, type IdentityResult } from "@/app/moi/actions";
import type { ClientPrefs } from "@/lib/domain/types";
import { LangSwitch } from "@/components/LangSwitch";
import { PaletteSwitch } from "@/components/PaletteSwitch";
import { PushToggle } from "@/components/PushToggle";
import { MenuContact, MenuPied, MenuRecherche, MenuRejouables, useGuideIndex } from "@/components/menu/Pieces";
import { leconDuClient } from "@/lib/guide-link";
import { Sheet } from "./Sheet";
import menu from "@/components/AppMenu.module.css";
import styles from "./AccountMenu.module.css";

/**
 * LA FEUILLE DU COMPTE, ET PLUS QU'ELLE.
 *
 * Elle vit derrière l'initiale, en haut à droite. Jusqu'au 5 octobre 2026 une
 * seconde feuille vivait derrière le « ⋮ », à deux centimètres, et les deux
 * disaient la même chose : mesuré à 375 px, 2 433 px de feuille pour neuf
 * pages, cinq destinations écrites deux fois, et Sécurité joignable par quatre
 * chemins. La règle qui les séparait (« l'initiale c'est vous, le ⋮ c'est
 * l'application ») était écrite en tête des deux fichiers, et les deux la
 * franchissaient : le ⋮ portait Mon profil et Sécurité, le compte portait le
 * Guide, l'Aide, les Risques et les Mentions.
 *
 * ELLES N'EN FONT PLUS QU'UNE. Connecté, le « ⋮ » disparaît et tout est ici :
 * l'identité, les deux canaux et leur preuve, les huit destinations, la
 * recherche, les rejouables, le contact, les couleurs, les quatre réglages, et
 * la sortie dans un pied qui ne défile pas. Le visiteur, lui, n'a pas
 * d'initiale : le « ⋮ » reste pour lui, et pour le desk, qui a ses propres
 * entrées.
 *
 * LA RÈGLE DE REMPLACEMENT, celle qui se vérifie : le dock porte les quatre
 * sièges, la feuille porte tout le reste. « Les services » est donc parti
 * d'ici le jour où Agir est devenu un siège.
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
  /** KYC file status when one exists (brouillon → approuve): the hint under « Mes pièces ». */
  kycStatus?: string;
  /** Les canaux prouvés et les appareils de confiance : le mot sous « Sécurité ». */
  security?: { channels: number; devices: number };
  /** Le profil financier, quand il est fait : le mot sous « Mon profil ». */
  profile?: "prudent" | "equilibre" | "dynamique";
  /** La version, au pied de la feuille. */
  build?: string;
}

const D = {
  espace: "M4 19V9M10 19V5M16 19v-8M22 19H2",
  profil: "M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4",
  papers: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  book: "M4 5h6a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H4zM20 5h-6a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H20z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01",
  risques: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01",
  mentions: "M6 3h9l4 4v14H6zM14 3v5h5",
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
  const lang = useLang();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [who, setWho] = useState({ name: p.name, segment: p.segment });
  const [prefs, setPrefs] = useState<ClientPrefs>(p.prefs ?? {});
  const [prefErr, setPrefErr] = useState("");
  const [saving, startSave] = useTransition();
  const close = () => setOpen(false);
  const initial = who.name.trim().charAt(0).toUpperCase() || "?";
  const [kind, city = ""] = who.segment.split("·").map((s) => s.trim());
  const { index, lues } = useGuideIndex(open);
  const lecon = leconDuClient(path);

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

  /**
   * CHEZ VOUS, QUATRE TUILES, ET PAS LES SIÈGES.
   *
   * Portefeuille est un siège du dock et reste pourtant ici : c'est la
   * destination qu'on redemande le plus, et la feuille s'ouvre souvent depuis
   * une page qui n'est pas la sienne. Agir, lui, est parti : il est devenu un
   * siège le 1er octobre, et deux portes vers la même page dans la même vue
   * est exactement ce que cette fusion retire.
   *
   * UNE SEULE DE CES QUATRE EST VIVANTE : le dossier d'ouverture dit où il en
   * est. Cet état vaut mieux que « adresse, RIB, pièce », donc il prend sa
   * place au lieu de s'y ajouter.
   */
  const chezVous = [
    { key: "espace", d: D.espace, nom: t(p.desk ? "Le desk" : "Portefeuille"), mot: t(p.desk ? "intentions, lignes" : "intentions, positions"), href: p.desk ? "/desk" : "/" },
    {
      key: "pieces",
      d: D.papers,
      nom: t("Mes pièces"),
      mot: p.kycStatus && KYC_HINT[p.kycStatus] ? t(KYC_HINT[p.kycStatus]) : t("adresse, RIB, pièce"),
      href: p.kycStatus ? "/ouvrir-un-compte" : "/moi#coordonnees",
    },
    { key: "profil", d: D.profil, nom: t("Mon profil"), mot: p.profile ? t(p.profile === "prudent" ? "prudent" : p.profile === "equilibre" ? "équilibré" : "dynamique") : t("horizon, tolérance"), href: "/moi/profil" },
    { key: "securite", d: D.shield, nom: t("Sécurité"), mot: p.security ? t("{c} canaux · {d} appareil", { c: String(p.security.channels), d: String(p.security.devices) }) : t("canaux, appareils"), href: "/moi/securite" },
  ];
  /**
   * Comprendre : les quatre pages de la maison, qui vivaient dans les deux
   * feuilles à la fois. La première s'ouvre sur l'écran qu'on a sous les yeux
   * quand le Guide en parle, et dit lequel.
   */
  const comprendre = [
    { key: "guide", d: D.book, nom: t(lecon ? "Cette page expliquée" : "Le Guide"), mot: lecon ? t(lecon.titre) : index ? t("{d} / {n} lues", { d: lues, n: index.lessons.length }) : t("glossaire, éclairages"), href: lecon?.href ?? "/info" },
    { key: "aide", d: D.help, nom: t("Aide"), mot: t("les questions reçues"), href: "/info/aide" },
    { key: "risques", d: D.risques, nom: t("Risques"), mot: t("ce que ça engage"), href: "/info/risques" },
    { key: "mentions", d: D.mentions, nom: t("Mentions"), mot: t("agrément COSUMAF"), href: "/info/mentions" },
  ];
  const reach = prefs.reach ?? (p.phoneOk ? "whatsapp" : "email");

  const grille = (items: typeof comprendre, vif?: (k: string) => boolean) => (
    <div className={menu.tiles}>
      {items.map((it) => (
        <Link key={it.key} className={menu.tile} href={it.href} onClick={close}>
          <Icon d={it.d} />
          <b>{it.nom}</b>
          <small className={vif?.(it.key) ? menu.good : undefined}>{it.mot}</small>
        </Link>
      ))}
    </div>
  );

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
        title={t("Bonjour {name}", { name: who.name.split(/\s+/)[0] })}
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
            <MenuPied close={close} build={p.build} />
          </div>
        }
      >
        {/* LA RECHERCHE EN TÊTE. Elle était en sixième position, après dix-sept
            tuiles : c'est pourtant le chemin le plus court vers n'importe quoi,
            et le seul qui réponde à une question qu'on n'a pas su ranger. Elle
            vivait dans le « ⋮ » et n'existait donc pas sur un écran de bureau
            pour qui n'avait pas trouvé les trois points ; le desk, lui, a la
            sienne. */}
        {!p.desk && <MenuRecherche index={index} close={close} />}

        {/* LE TITRE DIT DÉJÀ LE NOM. « Bonjour Georges » en haut et « Georges »
            trois centimètres plus bas, avec l'initiale en grand entre les deux,
            disaient trois fois la même chose. Reste ce qui s'apprend : la
            qualité, la ville, le niveau et l'état du compte-titres.

            ET LE BOUTON NOMME CE QU'IL OUVRE. « Modifier » ouvrait le nom et la
            ville, posé au-dessus de deux canaux qu'il ne touche pas. */}
        <div className={styles.statut}>
          <span>
            <b>{[t(kind), city].filter(Boolean).join(" · ")}</b>
            <small>
              {t("niveau")} {p.tier} · {t(p.tier < 2 ? "compte-titres à ouvrir" : "compte-titres actif")}
            </small>
          </span>
          {!editing && (
            <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
              {t("Nom et ville")}
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
          {/* UN CANAL NE SE CORRIGE PAS, IL SE PROUVE : le desk envoie un code
              à l'adresse et un lien au numéro, et le canal ne compte pour une
              intention qu'une fois la preuve faite. Un champ libre ici
              laisserait croire que c'est réglé alors que le canal serait
              repassé « à prouver », et qu'un bulletin à signer n'arriverait
              plus. Le geste mène donc là où la preuve se fait. */}
          <Link href="/moi/securite#canaux" className={styles.channel} onClick={close}>
            <Icon d={D.mail} />
            <span>
              <b>{p.email ?? t("E-mail à renseigner")}</b>
              <small className={p.emailOk ? styles.ok : undefined}>{t(p.emailOk ? "prouvé" : p.email ? "à prouver" : "le desk vous écrit ici")}</small>
            </span>
            <span className={styles.chg}>{t(p.email ? "Changer" : "Ajouter")}</span>
          </Link>
          <Link href="/moi/securite#canaux" className={styles.channel} onClick={close}>
            <Icon d={D.wa} />
            <span>
              <b>{p.phone ?? t("WhatsApp à renseigner")}</b>
              <small className={p.phoneOk ? styles.ok : undefined}>{t(p.phoneOk ? "prouvé" : p.phone ? "à prouver" : "le desk vous joint ici")}</small>
            </span>
            <span className={styles.chg}>{t(p.phone ? "Changer" : "Ajouter")}</span>
          </Link>
        </div>

        {/* DEUX GRILLES ET DEUX TITRES : quatre destinations sont à vous,
            quatre à la maison, et huit tuiles d'affilée redeviendraient une
            liste d'icônes. */}
        <div className={styles.group}>{t("Chez vous")}</div>
        {grille(chezVous, (k) => k === "pieces" && Boolean(p.kycStatus))}

        <div className={styles.group}>{t("Comprendre")}</div>
        {grille(comprendre)}

        <div className={styles.group}>{t("Revoir")}</div>
        <MenuRejouables close={close} />

        {!p.desk && (
          <>
            <div className={styles.group}>{t("Nous joindre")}</div>
            <MenuContact close={close} compact />
            <div className={styles.group}>{t("Couleurs")}</div>
            <PaletteSwitch lang={lang} />
          </>
        )}

        <div className={styles.group}>{t("Préférences")}</div>
        <div className={styles.rows}>
          <div className={styles.pref}>
            <span>
              <b>{t("Langue")}</b>
            </span>
            <LangSwitch compact />
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
      </Sheet>
    </>
  );
}
