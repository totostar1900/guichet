"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { SourceViewer } from "@/components/SourceViewer";
import { reculer } from "@/components/mobile/retour";
import { useVerrouDeDefilement } from "@/components/mobile/verrou-defilement";
import styles from "./lecteur.module.css";

/**
 * LE LECTEUR PLEIN ÉCRAN : UNE BARRE FINE, UNE CROIX, ET LE DOCUMENT (maquette « Lecteur », B2).
 *
 * Il recouvre le cadre de la maison (barre du haut, barre du bas) sans le retirer du DOM : la page reste une route, avec son adresse, et le retour matériel d'Android la ferme.
 * La croix recule dans l'historique de l'app quand il est le nôtre, et va au repli sinon (« reculer ») : fermer la lecture ne ferme jamais l'application.
 * La phrase fine (« Rien n'est engagé… ») reste sous la barre, sur deux lignes au plus : un document qu'on n'a pas signé garde sa réassurance.
 */
export function Lecteur({ src, genre, titre, note, repli }: { src: string; genre: "pdf" | "html" | "image"; titre: string; note?: string; repli: string }) {
  const t = useT();
  const router = useRouter();
  const fermer = () => reculer(router, repli);

  // La page dessous ne défile pas (verrou partagé de la maison), et Échap ferme comme la croix.
  useVerrouDeDefilement(true);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") reculer(router, repli);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [router, repli]);

  return (
    <div className={styles.lecteur} role="dialog" aria-modal="true" aria-label={titre}>
      <div className={styles.barre}>
        <b>{titre}</b>
        <button type="button" className={styles.croix} onClick={fermer} aria-label={t("Fermer la lecture")}>
          ×
        </button>
      </div>
      <div className={styles.corps}>
        {note && <p className={styles.note}>{note}</p>}
        <div className={styles.contenu}>
          {genre === "pdf" && <SourceViewer src={src} title={titre} fill lecture />}
          {genre === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.image} src={src} alt={titre} />
          )}
          {genre === "html" && <iframe className={styles.cadre} src={src} title={titre} sandbox="" />}
        </div>
      </div>
    </div>
  );
}
