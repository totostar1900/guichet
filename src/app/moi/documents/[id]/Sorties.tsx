"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { saitPartagerUnFichier, sansFenetreAPart, telechargementFiable, useModeAffichage } from "@/components/useModeAffichage";
import styles from "./page.module.css";

/**
 * DEUX GESTES, DEUX BOUTONS, ET DEUX SYSTÈMES QUI NE SE VALENT PAS.
 *
 *   Enregistrer : poser le fichier sur l'appareil.
 *   Partager    : l'envoyer ailleurs, par la feuille du système.
 *
 * Le même bouton faisait les deux, et promettait un rangement en proposant un
 * envoi. Mais les séparer ne suffit pas : sur iOS, dans une app ajoutée à
 * l'écran d'accueil, « a download » ne fait RIEN. Pas de fichier, pas de
 * notification, pas d'erreur. C'est le téléchargement muet du 8 octobre, et
 * aucune confirmation à l'écran n'y changerait quoi que ce soit, puisqu'il n'y
 * a rien à confirmer.
 *
 * « Enregistrer » y passe donc par la feuille de partage, dont la première
 * entrée est « Enregistrer dans Fichiers » : c'est le seul chemin qui pose
 * vraiment un fichier sur un iPhone. Sur Android le téléchargement descend et
 * le système le signale lui-même ; on garde le vrai téléchargement, et la bande
 * de confirmation dit où regarder.
 */

/** Le dessin des deux gestes, au gabarit de la maison : 24 au carré, trait et non remplissage. */
const D = {
  enregistrer: "M12 4v10M8 11l4 4 4-4M5 19h14",
  partager: "M18 5m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M6 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M18 19m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M8.1 13.3l7.8 4.4M15.9 6.3l-7.8 4.4",
  fait: "M5 13l4 4 10-10",
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

  /* La bande se retire d'elle-même : une confirmation qui reste devient un
     meuble, et on cesse de la lire. Dix secondes, le temps d'en être sûr. */
  useEffect(() => {
    if (etat !== "enregistre" && etat !== "echec") return;
    const id = setTimeout(() => setEtat("repos"), 10_000);
    return () => clearTimeout(id);
  }, [etat]);

  const recuperer = async (): Promise<File> => {
    const r = await fetch(fichier);
    if (!r.ok) throw new Error(String(r.status));
    return new File([await r.blob()], `${nom}.pdf`, { type: "application/pdf" });
  };

  const parLaFeuille = async (f: File) => {
    await navigator.share({ files: [f], title: nom });
  };

  /* Le téléchargement passe par un lien d'objet construit ici plutôt que par
     une navigation vers l'adresse : dans une app installée, une navigation qui
     ne rend pas de page peut ne rien donner du tout. */
  const parLeTelechargement = (f: File) => {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const lancer = async (geste: "enregistrer" | "partager") => {
    setEtat("en_cours");
    try {
      const f = await recuperer();
      // Sur iOS installée, « enregistrer » n'a qu'un chemin : la feuille.
      if (geste === "partager" || !telechargementFiable(mode)) {
        await parLaFeuille(f);
        setEtat("repos");
        return;
      }
      parLeTelechargement(f);
      setEtat("enregistre");
    } catch (e) {
      // Une feuille refermée par la personne n'est pas un échec.
      setEtat(e instanceof DOMException && e.name === "AbortError" ? "repos" : "echec");
    }
  };

  if (mode === "inconnu") return <div className={styles.actions} />;
  const partageable = saitPartagerUnFichier();
  // Sans feuille de partage ET sans téléchargement fiable, le bouton mentirait.
  const enregistrable = telechargementFiable(mode) || partageable;

  return (
    <div className={styles.actions}>
      {enregistrable && (
        <button type="button" className={`btn primary sm ${styles.geste}`} onClick={() => lancer("enregistrer")} disabled={etat === "en_cours"} title={t("Enregistrer sur l'appareil")} aria-label={t("Enregistrer sur l'appareil")}>
          <Icone d={D.enregistrer} />
        </button>
      )}
      {partageable && (
        <button type="button" className={`btn sm ${styles.geste}`} onClick={() => lancer("partager")} disabled={etat === "en_cours"} title={t("Partager")} aria-label={t("Partager")}>
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
      {/* LA CONFIRMATION EST UNE BANDE, PAS UNE NOTE EN COIN.
          Elle l'était, et elle se lisait « timidement » : sur un téléphone, où
          la barre de téléchargement du navigateur n'existe pas, c'est le SEUL
          signal qu'il se soit passé quelque chose. Elle prend donc toute la
          largeur, porte la coche et le nom du fichier, et dit où regarder. */}
      {(etat === "enregistre" || etat === "echec") && (
        <p className={`${styles.bande} ${etat === "echec" ? styles.bandeEchec : ""}`} role="status">
          {etat === "enregistre" ? (
            <>
              <Icone d={D.fait} />
              <span>
                <b>{t("Enregistré : {f}", { f: `${nom}.pdf` })}</b> {t("Dans les téléchargements de votre appareil.")}
              </span>
            </>
          ) : (
            <span>{t("L'enregistrement n'a pas abouti. Le document reste lisible ci-dessous.")}</span>
          )}
        </p>
      )}
    </div>
  );
}
