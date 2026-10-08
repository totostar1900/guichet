"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { sansFenetreAPart, useModeAffichage } from "@/components/useModeAffichage";
import styles from "./page.module.css";

/**
 * EMPORTER LE DOCUMENT, SANS PERDRE L'APP.
 *
 * Trois sorties existaient, et sur un téléphone les trois étaient des impasses,
 * mesurées le 8 octobre 2026 : le cadre du navigateur restait vide, « ouvrir à
 * part » faisait disparaître l'app installée, et le téléchargement ne donnait
 * aucune notification.
 *
 * DEUX CORRECTIONS, ET LA SECONDE EST UN AVEU. Le partage envoyait l'ADRESSE du
 * document : pour une pièce privée derrière une session, le destinataire ne
 * peut rien en faire, et soi-même on retombe dans l'app d'où l'on vient. Ce qui
 * se partage, c'est le FICHIER. On le récupère, on l'enveloppe, et la feuille du
 * système prend le relais : « Enregistrer dans Fichiers », WhatsApp, courriel.
 * C'est elle qui sait poser un fichier sur un téléphone, pas nous.
 *
 * Le téléchargement de repli passe par un lien d'objet construit ici plutôt que
 * par une navigation vers l'adresse : dans une app installée, une navigation
 * qui ne rend pas de page peut ne rien donner du tout, et c'est exactement ce
 * qui n'a produit aucune notification.
 */
export function SortiesDuDocument({ fichier, nom }: { fichier: string; nom: string }) {
  const t = useT();
  const mode = useModeAffichage();
  const [etat, setEtat] = useState<"repos" | "en_cours" | "echec">("repos");

  const recuperer = async (): Promise<File> => {
    const r = await fetch(fichier);
    if (!r.ok) throw new Error(String(r.status));
    return new File([await r.blob()], `${nom}.pdf`, { type: "application/pdf" });
  };

  /** Poser le fichier sur l'appareil : la feuille du système d'abord, le téléchargement sinon. */
  const emporter = async () => {
    setEtat("en_cours");
    try {
      const f = await recuperer();
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: nom });
        setEtat("repos");
        return;
      }
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setEtat("repos");
    } catch (e) {
      // Une feuille de partage refermée par la personne n'est pas un échec.
      setEtat(e instanceof DOMException && e.name === "AbortError" ? "repos" : "echec");
    }
  };

  if (mode === "inconnu") return <div className={styles.actions} />;

  return (
    <div className={styles.actions}>
      <button type="button" className="btn primary sm" onClick={emporter} disabled={etat === "en_cours"}>
        {etat === "en_cours" ? "…" : t("Enregistrer sur l'appareil")}
      </button>
      {/* Au navigateur, l'onglet est une vraie sortie : il se referme. Dans l'app
          installée il n'y a pas d'onglet, donc pas de retour : on ne le propose pas. */}
      {!sansFenetreAPart(mode) && (
        <a className="btn sm" href={fichier} target="_blank" rel="noreferrer">
          {t("Ouvrir à part")}
        </a>
      )}
      {etat === "echec" && <span className={styles.note}>{t("L'enregistrement n'a pas abouti. Le document reste lisible ci-dessous.")}</span>}
    </div>
  );
}
