"use client";

import { useEffect } from "react";

/**
 * Les deux panneaux de la boîte aux lettres gardent la taille qu'on leur donne.
 *
 * POURQUOI. La liste à 320 px et le fil à la hauteur de la fenêtre conviennent à
 * un écran et à un seul. Sur un grand écran la liste gâche la place ; sur un
 * portable elle mange le fil ; et quand on relit un long courrier on veut le fil
 * plus haut, pas la liste. Une taille imposée est un choix fait à la place de
 * quelqu'un qui voit son écran, et pas nous.
 *
 * COMMENT. La poignée est celle du navigateur, `resize: both` en CSS : pas de
 * barre à faire glisser à écrire, pas d'écouteur de souris, et le geste est
 * celui que les gens connaissent déjà. Ce composant ne fait que deux choses :
 * reposer la taille gardée à l'ouverture, et garder celle qu'on vient de poser.
 *
 * OÙ ELLE VIT. Dans le navigateur. Une taille de panneau appartient à qui
 * regarde l'écran, pas au desk : deux opérateurs sur la même machine ont deux
 * écrans, et rien de tout cela n'a sa place en base. Tout est en try/catch, et
 * la page marche sans : la taille vaut alors pour la visite.
 *
 * CE QU'IL NE FAIT PAS. La poignée du navigateur ne se prend pas au clavier.
 * Qui navigue au clavier garde les tailles par défaut, qui sont celles d'avant
 * et restent bonnes. C'est une limite assumée, pas un oubli : une barre
 * glissante maison l'aurait réglée au prix d'un composant à tenir.
 */
const CLE = "guichet.desk.messages.tailles";

/** Les deux panneaux, nommés une fois. Le composant ne sert que cette page. */
const PANNEAUX = ["desk-messages-liste", "desk-messages-fil"];

/** Une taille plus petite que cela n'est plus un panneau, c'est un accident. */
const PLANCHER = 160;

type Taille = { l: number; h: number };

const lire = (): Record<string, Taille> => {
  try {
    const brut = window.localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as Record<string, Taille>) : {};
  } catch {
    return {};
  }
};

export function GardeTaille() {
  useEffect(() => {
    const gardees = lire();
    const panneaux = PANNEAUX.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    for (const el of panneaux) {
      const t = gardees[el.id];
      /* Le plancher protège d'un stockage abîmé à la main : une largeur de
         trois pixels rendrait la page inutilisable sans rien dire. */
      if (t && t.l >= PLANCHER && t.h >= PLANCHER) {
        el.style.width = `${t.l}px`;
        el.style.height = `${t.h}px`;
      }
    }

    const obs = new ResizeObserver((entrees) => {
      const neuf = lire();
      let change = false;
      for (const e of entrees) {
        const el = e.target as HTMLElement;
        /* ON NE GARDE QUE CE QUE LA MAIN A POSÉ. Le navigateur n'écrit une
           taille en style que lorsqu'on tire la poignée ; un panneau qui change
           parce que la fenêtre change n'en a pas, et il ne doit pas figer sa
           taille du jour. */
        if (!el.style.width) continue;
        const r = el.getBoundingClientRect();
        neuf[el.id] = { l: Math.round(r.width), h: Math.round(r.height) };
        change = true;
      }
      if (!change) return;
      try {
        window.localStorage.setItem(CLE, JSON.stringify(neuf));
      } catch {
        /* Fenêtre privée, quota plein : la taille vaut pour cette visite. */
      }
    });
    for (const el of panneaux) obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return null;
}
