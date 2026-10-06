"use client";

import { useT } from "@/i18n/client";
import styles from "./bandeau.module.css";

/**
 * UN TRACÉ QUI SE DÉPLIE, ET QUI DIT CE QU'IL CACHE QUAND IL EST FERMÉ.
 *
 * Le nuage de la cote et la bande des fonds prenaient trois cents pixels en
 * haut de leur liste, à chaque visite, qu'on les regarde ou non. Or la liste
 * est ce pour quoi on vient ; le tracé sert à choisir où regarder, ce qui est
 * une seconde question. Replié par défaut, il rend sa hauteur et reste à un
 * toucher.
 *
 * MAIS UN TITRE ET UN CHEVRON, C'EST UNE PORTE SANS ÉCRITEAU : on ne l'ouvre
 * pas deux fois. Replié, le bandeau porte donc le résumé de ce qu'il contient
 * — les deux ou trois chiffres qui décident d'ouvrir — et c'est l'appelant qui
 * les fournit, puisque lui seul sait ce que son tracé montre.
 *
 * L'ÉTAT VIT DANS L'ADRESSE, comme tout le reste de ces listes : qui l'ouvre
 * le retrouve ouvert, et le lien qu'il envoie montre ce qu'il voyait.
 */
export function BandeauRepliable({
  titre,
  resume,
  ouvert,
  surOuvrir,
  children,
}: {
  titre: string;
  /** Les chiffres qui décident d'ouvrir, montrés quand c'est fermé. */
  resume: React.ReactNode;
  ouvert: boolean;
  surOuvrir: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <section className={`${styles.bandeau} ${ouvert ? styles.ouvert : ""}`}>
      <button type="button" className={styles.tirette} aria-expanded={ouvert} onClick={() => surOuvrir(!ouvert)}>
        <span className={styles.chev} aria-hidden="true">
          ▶
        </span>
        <span className={styles.quoi}>
          <span className={styles.titre}>{titre}</span>
          {!ouvert && <span className={styles.resume}>{resume}</span>}
        </span>
        <span className={styles.action}>{ouvert ? t("Replier") : t("Déplier")}</span>
      </button>
      {/* Le corps n'est pas monté quand il est replié : un tracé caché qui
          calcule ses points à chaque rendu coûte autant qu'un tracé visible,
          et il ne rend rien. */}
      {ouvert ? <div className={styles.corps}>{children}</div> : null}
    </section>
  );
}
