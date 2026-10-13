"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import styles from "./TallTable.module.css";

/**
 * Un tableau haut, montré vingt lignes à la fois.
 *
 * La hauteur n'est pas devinée en rem : les lignes du carnet tiennent sur une
 * ou deux lignes de texte selon ce que porte la ligne, et une estimation
 * couperait au milieu d'une rangée. On mesure donc la vingt-et-unième et on
 * arrête la boîte juste avant : le lecteur voit vingt rangées entières, et la
 * vingt-et-unième dépasse à peine, ce qui est la seule façon honnête de lui
 * dire qu'il en reste.
 *
 * « Tout afficher » rend au tableau sa hauteur entière : la page défile alors
 * pour lui, ce qui est ce qu'on veut quand on relit le carnet en entier.
 * L'en-tête reste collé dans les deux cas.
 */
/**
 * APPARIER LE TABLEAU À CE QUI EST À CÔTÉ.
 *
 * Sur la page des bulletins, le tableau des séances a une matrice de codes
 * pour voisine. La matrice rend ses vingt-quatre familles quoi qu'il arrive,
 * le tableau s'arrêtait à vingt rangées : la colonne de gauche finissait bien
 * au-dessus de celle de droite, et le blanc entre les deux se lisait comme
 * une fin de liste alors qu'il restait des centaines de séances.
 *
 * ON ÉTEND, ON NE RÉTRÉCIT JAMAIS. La hauteur retenue est le PLUS GRAND des
 * deux : la matrice tire le tableau vers le bas quand elle est plus haute, et
 * un filtre qui la raccourcirait ne peut pas faire disparaître des rangées
 * déjà montrées. Le voisin se désigne par un attribut plutôt que par une
 * référence, parce que la page qui l'écrit est rendue sur le serveur.
 */
const VOISIN = "[data-hauteur-de-reference]";
const RANGEE = "[data-rangee-appariee]";

export function TallTable({ cap = 20, total, apparier = false, children }: { cap?: number; total: number; apparier?: boolean; children: ReactNode }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const [max, setMax] = useState<number>();
  const [all, setAll] = useState(false);
  const over = total > cap;

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const voisin = apparier ? el.closest(RANGEE)?.querySelector(VOISIN) : null;
    /* LE BOUTON FAIT PARTIE DE LA COLONNE, donc il entre dans la mesure : sans
       lui, les deux colonnes finissaient à trente pixels l'une de l'autre, ce
       qui est exactement l'alignement manqué qu'on cherchait à corriger. */
    const hauteurVoisine = voisin ? Math.max(0, voisin.getBoundingClientRect().height - (bouton.current?.offsetHeight ?? 0)) : 0;
    const rows = el.querySelectorAll("tbody tr");
    if (rows.length <= cap && !hauteurVoisine) return setMax(undefined);
    const top = el.getBoundingClientRect().top + el.scrollTop;
    /* Sans vingt-et-unième rangée, il n'y a rien à couper : seule la hauteur
       du voisin peut encore étendre la boîte. */
    const coupe = rows.length > cap ? Math.round(rows[cap].getBoundingClientRect().top + el.scrollTop - top + 18) : 0;
    const retenue = Math.max(coupe, Math.round(hauteurVoisine));
    /* Un tableau plus court que son voisin ne se gonfle pas de vide : on ne
       plafonne que s'il y a vraiment quelque chose à cacher. */
    setMax(retenue > 0 && el.scrollHeight > retenue ? retenue : undefined);
  }, [cap, apparier]);

  useEffect(() => {
    measure();
    /* On observe le tableau ET le voisin, jamais la boîte : la hauteur de la
       boîte est ce qu'on écrit, l'observer ferait une boucle. */
    const tbl = box.current?.querySelector("table");
    const voisin = apparier ? box.current?.closest(RANGEE)?.querySelector(VOISIN) : null;
    if (typeof ResizeObserver === "undefined") return;
    /* DEUX PASSES, ET LA SECONDE EST CELLE QUI COMPTE. L'observateur se
       déclenche AVANT que la requête de média ait fini de replacer la
       matrice : la première mesure lit l'ancienne hauteur, et plus rien ne
       repasse ensuite. Mesuré en franchissant la barre des 1 100 pixels dans
       les deux sens, cent quarante-deux pixels d'écart qui ne se corrigeaient
       qu'au rechargement. */
    const remesurer = () => {
      measure();
      requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(remesurer);
    if (tbl) ro.observe(tbl);
    if (voisin) ro.observe(voisin);
    /* LA RANGÉE AUSSI, et c'est elle qui rend la mesure fiable : sa LARGEUR
       change à chaque bascule de disposition, alors que la hauteur du voisin
       peut se stabiliser sans qu'aucun observateur ne repasse. Observer une
       largeur pour corriger une hauteur paraît oblique, c'est pourtant le
       seul signal qui arrive à coup sûr. */
    const rangee = apparier ? box.current?.closest(RANGEE) : null;
    if (rangee) ro.observe(rangee);
    /* LA BARRE DES 1 100 PIXELS fait passer la matrice sous le tableau, donc
       sa hauteur change d'un coup. L'observateur ne l'a pas toujours rattrapé
       en direct, et la colonne restait courte de cent cinquante pixels
       jusqu'au rechargement suivant : une mesure qui dépend d'une requête de
       média écoute aussi le redimensionnement. */
    window.addEventListener("resize", remesurer);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", remesurer);
    };
  }, [measure, apparier]);

  return (
    <>
      <div ref={box} className={styles.box} style={all || max == null ? undefined : { maxHeight: `${max}px` }}>
        {children}
      </div>
      {over && (
        <button ref={bouton} type="button" className={styles.more} onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? t("N'en montrer que {n}", { n: cap }) : t("Tout afficher : {n} lignes", { n: total })}
        </button>
      )}
    </>
  );
}
