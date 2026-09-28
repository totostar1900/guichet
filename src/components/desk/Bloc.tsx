import type { ReactNode } from "react";
import { Poignee } from "@/components/desk/Poignee";
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
 *
 * La poignée est à la frontière qu'elle déplace, donc dans chaque section, mais
 * la largeur qu'elle règle vaut pour la page entière : elle écrit sur la grille
 * d'en haut, et les variables CSS héritant, les douze sections suivent d'un
 * même mouvement.
 */
export function Bloc({ id, note, children }: { id: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.sec}>
      <section className="panel" id={id}>
        {children}
      </section>
      <Poignee variable="--note" min={200} max={560} memoire="ana.note" depuisLaDroite porte=".grille-analyses" libelle="Régler la largeur du commentaire" />
      {note ? <aside>{note}</aside> : <aside aria-hidden="true" />}
    </div>
  );
}
