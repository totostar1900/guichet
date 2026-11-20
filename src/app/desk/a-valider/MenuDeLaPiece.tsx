"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { lireSourceAction, retirerSourceAction } from "./actions";
import styles from "./MenuDeLaPiece.module.css";

/**
 * LE « ⋮ » DE CHAQUE COMMUNIQUÉ (20 novembre 2026, le client : « passer les deux boutons retirer et relire dans un menu trois points vertical sur l'encadré de chaque communiqué, en haut à droite ; la confirmation du retrait se fait par une page popup »).
 *
 * Il vit sur la carte de la file, pas dans le formulaire de la pièce ouverte : on lit ou on retire une pièce sans l'ouvrir, et le formulaire ne garde que ce qui engage (enregistrer, publier) et le tri (rejeter, relecture).
 *
 *  - « LIRE / RELIRE LA PIÈCE » : une lecture dure de quelques secondes à deux minutes. Le menu reste ouvert, grisé, et dit « Lecture en cours » ; la carte porte la même mention tant qu'elle dure, pour qu'un clic ne se lise jamais « il ne se passe rien ».
 *  - « RETIRER DE LA FILE » ouvre la fenêtre centrée de la maison (la même que les bulles d'information) : elle dit ce qui va se passer, et le retrait n'a lieu qu'au second geste. La pièce publiée n'a ni l'un ni l'autre.
 *  - LA LISTE EST POSÉE EN « fixed » depuis le rectangle du bouton : la colonne de la file défile, et une liste absolue y serait rognée au pied de la dernière carte.
 */
export function MenuDeLaPiece({ id, titre, peutLire, relire, peutRetirer, courant }: { id: string; titre: string; peutLire: boolean; relire: boolean; peutRetirer: boolean; courant: boolean }) {
  const t = useT();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [lecture, lancerLecture] = useTransition();
  const [retrait, lancerRetrait] = useTransition();
  const racine = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (racine.current?.contains(cible) || liste.current?.contains(cible)) return;
      setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    const defile = () => setOuvert(false);
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", touche);
    window.addEventListener("resize", defile);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", touche);
      window.removeEventListener("resize", defile);
    };
  }, [ouvert]);

  if (!peutLire && !peutRetirer) return null;

  const ouvrir = () => {
    if (!ouvert) {
      const r = racine.current?.getBoundingClientRect();
      if (r) setPos({ top: Math.round(r.bottom + 4), right: Math.round(window.innerWidth - r.right) });
    }
    setOuvert(!ouvert);
  };

  const lire = () => {
    lancerLecture(async () => {
      const fd = new FormData();
      fd.set("itemId", id);
      await lireSourceAction(fd);
    });
  };

  const retirer = () => {
    lancerRetrait(async () => {
      const fd = new FormData();
      fd.set("itemId", id);
      await retirerSourceAction(fd);
      setConfirmer(false);
      /* La pièce ouverte vient peut-être de partir : l'adresse ne doit plus la nommer. */
      if (courant) router.replace("/desk/a-valider");
    });
  };

  return (
    <>
      <div ref={racine} className={styles.racine}>
        <button type="button" className={styles.bouton} aria-label={t("Actions de la pièce")} aria-haspopup="menu" aria-expanded={ouvert} aria-busy={lecture} data-occupe={lecture ? "1" : undefined} onClick={ouvrir}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>
      {lecture && !ouvert && <span className={styles.enCours}>{t("Lecture en cours…")}</span>}
      {ouvert && pos && (
        <div ref={liste} className={styles.liste} role="menu" style={{ top: pos.top, right: pos.right }}>
          {peutLire && (
            <button type="button" role="menuitem" disabled={lecture} onClick={lire}>
              {lecture ? t("Lecture en cours… (jusqu'à deux minutes)") : t(relire ? "Relire la pièce" : "Lire la pièce")}
            </button>
          )}
          {peutRetirer && (
            <button
              type="button"
              role="menuitem"
              disabled={lecture}
              onClick={() => {
                setOuvert(false);
                setConfirmer(true);
              }}
            >
              {t("Retirer de la file")}
            </button>
          )}
        </div>
      )}
      <Sheet
        open={confirmer}
        onClose={() => {
          if (!retrait) setConfirmer(false);
        }}
        title={t("Retirer cette pièce de la file ?")}
        centre
        foot={
          <div className={styles.pied}>
            <button type="button" className="btn ghost" onClick={() => setConfirmer(false)} disabled={retrait}>
              {t("Garder")}
            </button>
            <button type="button" className="btn primary" onClick={retirer} disabled={retrait} aria-busy={retrait}>
              {retrait ? t("Retrait…") : t("Retirer")}
            </button>
          </div>
        }
      >
        <p className={styles.titre}>{titre}</p>
        <p className={styles.texte}>{t("La pièce quitte la file ; le fichier reste au dépôt.")}</p>
        <p className={styles.texte}>{t("Le retrait est inscrit à l'audit, avec l'état de la pièce avant qu'on la retire.")}</p>
      </Sheet>
    </>
  );
}
