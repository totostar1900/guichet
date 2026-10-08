"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/**
 * Comment la page est affichée, lu comme un système extérieur.
 *
 * Une chaîne et non un objet : « useSyncExternalStore » compare les instantanés
 * par identité, et un objet neuf à chaque lecture bouclerait. Le serveur rend
 * « inconnu », et le navigateur tranche après l'hydratation sans désaccord.
 */
type Mode = "inconnu" | "navigateur" | "installee" | "installee-partage";

const lireLeMode = (): Mode => {
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const installee = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (!installee) return "navigateur";
    return typeof navigator.share === "function" ? "installee-partage" : "installee";
  } catch {
    return "navigateur";
  }
};

const sAbonner = (cb: () => void) => {
  try {
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  } catch {
    return () => {};
  }
};

/**
 * EMPORTER LE DOCUMENT, SANS PERDRE L'APP.
 *
 * Trois sorties existaient, et sur un téléphone les trois étaient des impasses,
 * mesurées le 8 octobre 2026 : le cadre du navigateur restait vide, « ouvrir à
 * part » faisait disparaître l'app installée, et le téléchargement ne donnait
 * aucune notification.
 *
 * L'app installée tourne en « standalone » (manifest.ts) : pas de barre
 * d'adresse, pas d'onglets, donc rien pour revenir d'une page ouverte à côté.
 * On n'y propose donc plus de sortir : le document est peint dans la page
 * au-dessous, et le partage du système prend le relais pour l'envoyer ailleurs,
 * parce que lui sait où il va.
 *
 * Au navigateur ordinaire, les deux sorties restent : elles y fonctionnent, et
 * un onglet se referme.
 */
export function SortiesDuDocument({ fichier }: { fichier: string }) {
  const t = useT();
  const mode = useSyncExternalStore(sAbonner, lireLeMode, () => "inconnu" as Mode);

  if (mode === "inconnu") return <div className={styles.actions} />;

  if (mode !== "navigateur") {
    return (
      <div className={styles.actions}>
        {mode === "installee-partage" && (
          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              navigator.share({ title: document.title, url: new URL(fichier, location.href).toString() }).catch(() => {});
            }}
          >
            {t("Partager le PDF")}
          </button>
        )}
        <span className={styles.note}>{t("Le document se lit ci-dessous : l'app n'a pas de fenêtre à part.")}</span>
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      <a className="btn primary sm" href={`${fichier}?telecharger=1`}>
        {t("Télécharger le PDF")}
      </a>
      <a className="btn sm" href={fichier} target="_blank" rel="noreferrer">
        {t("Ouvrir à part")}
      </a>
    </div>
  );
}
