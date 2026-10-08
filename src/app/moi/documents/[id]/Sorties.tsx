"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { sansFenetreAPart, useModeAffichage } from "@/components/useModeAffichage";
import styles from "./page.module.css";

/**
 * DEUX GESTES, DEUX BOUTONS.
 *
 * Il n'y en avait qu'un, « Enregistrer sur l'appareil », et il ouvrait la
 * feuille de partage : il promettait un rangement et proposait un envoi. Ce
 * sont deux intentions différentes, elles méritent deux commandes.
 *
 *   Enregistrer : le fichier descend, directement, sans rien demander.
 *   Partager    : la feuille du système s'ouvre, et c'est elle qui choisit la
 *                 destination : Fichiers, WhatsApp, courriel.
 *
 * ET L'ENREGISTREMENT SE DIT. Il marchait mais ne répondait rien : sur un
 * téléphone, où la barre de téléchargement du navigateur n'existe pas, un geste
 * silencieux est un geste dont on doute, et qu'on refait. La confirmation
 * nomme le fichier obtenu.
 */

/** Le dessin des deux gestes, au gabarit de la maison : 24 au carré, trait et non remplissage. */
const D = {
  enregistrer: "M12 4v10M8 11l4 4 4-4M5 19h14",
  partager: "M18 5m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M6 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M18 19m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M8.1 13.3l7.8 4.4M15.9 6.3l-7.8 4.4",
};

function Icone({ d }: { d: string }) {
  return (
    <svg className={styles.icone} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function SortiesDuDocument({ fichier, nom }: { fichier: string; nom: string }) {
  const t = useT();
  const mode = useModeAffichage();
  const [etat, setEtat] = useState<"repos" | "en_cours" | "enregistre" | "echec">("repos");

  const recuperer = async (): Promise<File> => {
    const r = await fetch(fichier);
    if (!r.ok) throw new Error(String(r.status));
    return new File([await r.blob()], `${nom}.pdf`, { type: "application/pdf" });
  };

  /* Le téléchargement passe par un lien d'objet construit ici plutôt que par
     une navigation vers l'adresse : dans une app installée, une navigation qui
     ne rend pas de page peut ne rien donner du tout. */
  const enregistrer = async () => {
    setEtat("en_cours");
    try {
      const f = await recuperer();
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setEtat("enregistre");
    } catch {
      setEtat("echec");
    }
  };

  /* Ce qui se partage est le FICHIER et non son adresse : une pièce privée
     derrière une session ne s'ouvre chez personne d'autre. */
  const partager = async () => {
    setEtat("en_cours");
    try {
      const f = await recuperer();
      await navigator.share({ files: [f], title: nom });
      setEtat("repos");
    } catch (e) {
      // Une feuille refermée par la personne n'est pas un échec.
      setEtat(e instanceof DOMException && e.name === "AbortError" ? "repos" : "echec");
    }
  };

  if (mode === "inconnu") return <div className={styles.actions} />;
  const partageable = typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([], "x.pdf", { type: "application/pdf" })] });

  return (
    <div className={styles.actions}>
      <button type="button" className={`btn primary sm ${styles.geste}`} onClick={enregistrer} disabled={etat === "en_cours"} title={t("Enregistrer sur l'appareil")} aria-label={t("Enregistrer sur l'appareil")}>
        <Icone d={D.enregistrer} />
      </button>
      {partageable && (
        <button type="button" className={`btn sm ${styles.geste}`} onClick={partager} disabled={etat === "en_cours"} title={t("Partager")} aria-label={t("Partager")}>
          <Icone d={D.partager} />
        </button>
      )}
      {/* Au navigateur, l'onglet est une vraie sortie : il se referme. Dans l'app
          installée il n'y a pas d'onglet, donc pas de retour : on ne le propose pas. */}
      {!sansFenetreAPart(mode) && (
        <a className="btn sm" href={fichier} target="_blank" rel="noreferrer">
          {t("Ouvrir à part")}
        </a>
      )}
      <span className={styles.note} role="status">
        {etat === "enregistre" && t("Enregistré : {f}", { f: `${nom}.pdf` })}
        {etat === "echec" && t("L'enregistrement n'a pas abouti. Le document reste lisible ci-dessous.")}
      </span>
    </div>
  );
}
