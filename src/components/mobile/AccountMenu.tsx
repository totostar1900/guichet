"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "./Sheet";
import styles from "./AccountMenu.module.css";

/**
 * The account, behind the initial at the top right of the phone header, in
 * the manner of the Claude app: a card with the name, the segment and the
 * account level, then rows. A mock for now: every row is drawn and reachable,
 * only « Mon espace », « Mon profil » and « Sécurité » lead anywhere; the
 * others say « bientôt » and do nothing else.
 */
export function AccountMenu({ name, segment, tier, desk, email }: { name: string; segment: string; tier: number; desk: boolean; email?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const initial = name.trim().charAt(0).toUpperCase();
  const rows: { key: string; icon: string; label: string; sub?: string; href?: string; soon?: boolean }[] = [
    { key: "espace", icon: "M4 19V9M10 19V5M16 19v-8M22 19H2", label: t(desk ? "Le desk" : "Mon espace"), sub: t(desk ? "intentions, lignes, documents" : "intentions, positions, documents"), href: desk ? "/desk" : "/moi" },
    { key: "profil", icon: "M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0", label: t("Mon profil financier"), sub: t("horizon, tolérance, connaissance, capacité"), href: "/moi/profil" },
    { key: "securite", icon: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4", label: t("Sécurité"), sub: t("canaux prouvés, appareils, code"), href: "/moi/securite" },
    { key: "compte", icon: "M6 3h9l4 4v14H6zM14 3v5h5", label: t("Mon compte-titres"), sub: t("dossier d'ouverture, relevés"), soon: true },
    { key: "famille", icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6 0", label: t("Mes proches"), sub: t("un compte pour un enfant, une tontine"), soon: true },
    { key: "parrainage", icon: "M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7c-2-3-6-3-6 0h6M12 7c2-3 6-3 6 0h-6", label: t("Inviter un proche"), sub: t("un lien, une ligne offerte à lire"), soon: true },
  ];
  return (
    <>
      <button type="button" className={styles.avatar} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("Mon compte")} title={name}>
        {initial}
      </button>
      <Sheet open={open} onClose={close} navy dock="top-right" title={t("Mon compte")}>
        <div className={styles.card}>
          <span className={styles.big}>{initial}</span>
          <span>
            <b>{name}</b>
            <small>{t(segment)}</small>
            <small>
              {email ?? ""}
              {email ? " · " : ""}
              {t("niveau")} {tier} · {t(tier < 2 ? "compte-titres à ouvrir" : "compte-titres actif")}
            </small>
          </span>
        </div>
        <div className={styles.rows}>
          {rows.map((r) =>
            r.href ? (
              <Link key={r.key} href={r.href} className={styles.row} onClick={close}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={r.icon} />
                </svg>
                <span>
                  <b>{r.label}</b>
                  <small>{r.sub}</small>
                </span>
                <i aria-hidden="true">›</i>
              </Link>
            ) : (
              <div key={r.key} className={`${styles.row} ${styles.soon}`} aria-disabled="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={r.icon} />
                </svg>
                <span>
                  <b>{r.label}</b>
                  <small>{r.sub}</small>
                </span>
                <em>{t("bientôt")}</em>
              </div>
            ),
          )}
        </div>
        <p className={styles.note}>{t("Le ⋮ garde l'aide, les couleurs, la langue et la déconnexion ; ici, ce qui vous appartient.")}</p>
      </Sheet>
    </>
  );
}
