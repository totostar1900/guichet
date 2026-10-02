"use client";

import { useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";

/**
 * Les colonnes du rail : lesquelles, dans quel ordre, et de quelle largeur.
 *
 * POURQUOI. Une ligne d'échange porte six choses au delà de son titre : les
 * étiquettes, l'aperçu du dernier message, le canal, la date, le compte de non
 * lus et les gestes. Toutes utiles à quelqu'un, aucune utile à tout le monde en
 * même temps, et leur ordre dépend de ce qu'on cherche : qui trie par date la
 * veut à gauche, qui traite sa file veut les gestes sous la main. Imposer un
 * jeu, un ordre et des largeurs, c'est choisir trois fois à la place de qui
 * regarde l'écran.
 *
 * COMMENT, ET POURQUOI AINSI. Le serveur rend TOUTES les colonnes, dans l'ordre
 * du document, et ce composant pose une petite feuille de style qui les range :
 * `order` pour la place, `flex-basis` pour la largeur, `display: none` pour
 * celles qu'on ne veut pas. Rien ne se recalcule côté serveur, la liste ne
 * clignote pas, et une colonne retirée revient d'un clic sans aller rechercher
 * quoi que ce soit.
 *
 * SANS JAVASCRIPT, OU AVANT LE MONTAGE, tout paraît dans l'ordre du document et
 * à sa largeur naturelle. C'est le bon défaut : une liste entière et un peu
 * serrée vaut mieux qu'une liste vide.
 *
 * L'APERÇU EST LA SEULE EXCEPTION : il absorbe la place qui reste, parce qu'un
 * texte coupé à largeur fixe gâche le vide à sa droite alors que c'est
 * justement lui qui gagne à être long.
 *
 * OÙ VIT LE RÉGLAGE. Dans le navigateur, comme la taille des panneaux : il
 * appartient à qui regarde, pas au desk. Tout est en try/catch.
 */
const CLE = "guichet.desk.messages.colonnes";
const RAIL = "desk-messages-liste";

export const COLONNES = ["etiquettes", "apercu", "canal", "date", "nonlus", "gestes"] as const;
export type Colonne = (typeof COLONNES)[number];

/** Les largeurs de départ, en pixels, mesurées sur ce que chaque colonne porte. */
const LARGEUR: Record<Colonne, number> = { etiquettes: 76, apercu: 150, canal: 60, date: 44, nonlus: 28, gestes: 56 };
const MIN = 24;
const MAX = 320;

type Reglage = { ordre: Colonne[]; largeurs: Record<string, number>; caches: Colonne[] };

const DEFAUT: Reglage = { ordre: [...COLONNES], largeurs: { ...LARGEUR }, caches: [] };

const connue = (x: unknown): x is Colonne => typeof x === "string" && (COLONNES as readonly string[]).includes(x);
const borne = (n: unknown, secours: number): number => (typeof n === "number" && Number.isFinite(n) ? Math.min(MAX, Math.max(MIN, Math.round(n))) : secours);

/**
 * Un réglage lu du stockage est une donnée du dehors : il se modifie à la main,
 * et il reste en place après qu'une colonne a changé de nom. On ne garde donc
 * que des noms connus, on complète ce qui manque, et on borne les largeurs : une
 * colonne de trois pixels rendrait la liste illisible sans rien dire.
 */
function lire(): Reglage {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return DEFAUT;
    const o = JSON.parse(brut) as Partial<Reglage>;
    const ordre = (Array.isArray(o.ordre) ? o.ordre.filter(connue) : []) as Colonne[];
    return {
      ordre: [...ordre, ...COLONNES.filter((c) => !ordre.includes(c))],
      largeurs: Object.fromEntries(COLONNES.map((c) => [c, borne(o.largeurs?.[c], LARGEUR[c])])),
      caches: (Array.isArray(o.caches) ? o.caches.filter(connue) : []) as Colonne[],
    };
  } catch {
    return DEFAUT;
  }
}

export function Colonnes() {
  /* Le réglage se lit après le montage : localStorage n'existe pas au rendu
     serveur, et deux arbres différents feraient se plaindre React. */
  const monte = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return monte ? <Panneau /> : null;
}

function Panneau() {
  const t = useT();
  const [r, setR] = useState<Reglage>(() => lire());

  const garder = (neuf: Reglage) => {
    setR(neuf);
    try {
      window.localStorage.setItem(CLE, JSON.stringify(neuf));
    } catch {
      /* Pas de stockage : le réglage vaut pour cette visite. */
    }
  };

  const basculer = (c: Colonne) => garder({ ...r, caches: r.caches.includes(c) ? r.caches.filter((x) => x !== c) : [...r.caches, c] });
  const large = (c: Colonne, px: number) => garder({ ...r, largeurs: { ...r.largeurs, [c]: borne(px, LARGEUR[c]) } });
  const deplacer = (c: Colonne, pas: -1 | 1) => {
    const i = r.ordre.indexOf(c);
    const j = i + pas;
    if (i < 0 || j < 0 || j >= r.ordre.length) return;
    const ordre = [...r.ordre];
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    garder({ ...r, ordre });
  };

  const mot: Record<Colonne, string> = {
    etiquettes: t("Étiquettes"),
    apercu: t("Aperçu"),
    canal: t("Canal"),
    date: t("Date"),
    nonlus: t("Non lus"),
    gestes: t("Gestes"),
  };

  /* La feuille est construite de noms connus et de nombres bornés : rien de ce
     qui vient du stockage n'arrive tel quel dans du style.
     LES GESTES SONT À PART, et pas par oubli : ce sont des boutons, et un bouton
     dans un lien est du HTML invalide. Ils vivent donc hors de la bande, au
     niveau de la ligne, et leur ordre ne peut dire que deux choses : avant le
     titre ou après. Les mettre en tête de la liste de réglage les passe à
     gauche, partout ailleurs ils restent à droite. */
  const feuille = r.ordre
    .map((c, i) => {
      const l = r.largeurs[c] ?? LARGEUR[c];
      const souple = c === "apercu" ? `flex: 1 1 ${l}px; min-width: 0;` : `flex: 0 0 ${l}px;`;
      const place = c === "gestes" ? (i === 0 ? -1 : 1) : i;
      return `#${RAIL} [data-col="${c}"]{order:${place};${souple}${r.caches.includes(c) ? "display:none;" : ""}}`;
    })
    .join("\n");

  return (
    <>
      <style>{feuille}</style>
      <details className="colonnes">
        <summary className="btn sm ghost">{t("Colonnes")}</summary>
        <div className="colonnes-liste">
          {r.ordre.map((c, i) => (
            <div key={c} className="colonnes-ligne">
              <label>
                <input type="checkbox" checked={!r.caches.includes(c)} onChange={() => basculer(c)} />
                <span>{mot[c]}</span>
              </label>
              <input
                type="number"
                className="colonnes-px"
                value={r.largeurs[c] ?? LARGEUR[c]}
                min={MIN}
                max={MAX}
                step={4}
                onChange={(e) => large(c, Number(e.target.value))}
                aria-label={t("Largeur de {q}, en pixels", { q: mot[c] })}
              />
              <button type="button" className="btn sm ghost" onClick={() => deplacer(c, -1)} disabled={i === 0} aria-label={t("Monter {q}", { q: mot[c] })}>
                ↑
              </button>
              <button type="button" className="btn sm ghost" onClick={() => deplacer(c, 1)} disabled={i === r.ordre.length - 1} aria-label={t("Descendre {q}", { q: mot[c] })}>
                ↓
              </button>
            </div>
          ))}
          <button type="button" className="btn sm ghost" onClick={() => garder(DEFAUT)}>
            {t("Rétablir les colonnes")}
          </button>
        </div>
      </details>
    </>
  );
}
