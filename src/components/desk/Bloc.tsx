import type { ReactNode } from "react";
import styles from "@/app/desk/analyses/page.module.css";

/**
 * Une section, et son commentaire à côté d'elle.
 *
 * Le commentaire n'est pas un pied de page : rangé en bas, il se lit après
 * coup, c'est-à-dire jamais, le lecteur ayant déjà tiré sa conclusion du
 * graphique quand il y arrive. Chaque section est donc sa propre rangée, son
 * contenu à gauche et sa note à droite, collée tant qu'on lit cette section-là.
 *
 * L'identifiant sert deux fois : au rail de navigation qui y mène, et à
 * l'observateur qui suit la lecture pour dire où l'on en est.
 */
export function Bloc({ id, note, children }: { id: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.sec}>
      <section className="panel" id={id}>
        {children}
      </section>
      {note ? <aside>{note}</aside> : <aside aria-hidden="true" />}
    </div>
  );
}
