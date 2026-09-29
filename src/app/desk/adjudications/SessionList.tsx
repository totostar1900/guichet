"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Poignee } from "@/components/desk/Poignee";
import { useT } from "@/i18n/client";
import { fmtDate } from "@/lib/format";
import type { EtatSeance } from "@/lib/market/auction-results";
import styles from "./SessionList.module.css";

/**
 * Les séances, en une table de trois colonnes.
 *
 * La liste tenait sous deux titres, « À relire » et « Relues », en cartes
 * empilées. C'était juste tant qu'il y avait dix séances ; il y en a deux cent
 * quarante-neuf, et une pile qu'on parcourt à la molette n'est plus une liste,
 * c'est un mur. Trois colonnes, une recherche, quatre onglets et des en-têtes
 * qui trient : de quoi retrouver une séance qu'on cherche plutôt que de la
 * croiser.
 *
 * Le tri et le filtre vivent ici et non dans l'adresse. Ce sont des gestes de
 * lecture, pas des états de la page : on veut pouvoir ouvrir une séance sans
 * perdre le tri, et revenir en arrière sans repasser par quinze réglages.
 * L'adresse ne porte donc que « ?s= », la séance ouverte, qui elle se partage.
 */

export interface LigneSeance {
  id: string;
  on: string;
  pays: string;
  instrument: string;
  tenor: string;
  code?: string;
  etat: EtatSeance;
  mince: boolean;
}

const MOT: Record<EtatSeance, string> = { a_lire: "à lire", a_relire: "à relire", relue: "relue", ecartee: "écartée" };
/**
 * « Toutes » veut dire toutes les séances de travail, et les écartées n en sont
 * pas : ce sont des pièces rangées, qui encombreraient une file de relecture.
 * Elles ont leur propre onglet, pour qu on puisse les retrouver et les remettre.
 */
const ONGLETS: { clef: EtatSeance | "tout"; mot: string }[] = [
  { clef: "tout", mot: "Toutes" },
  { clef: "a_lire", mot: "À lire" },
  { clef: "a_relire", mot: "À relire" },
  { clef: "relue", mot: "Relues" },
  { clef: "ecartee", mot: "Écartées" },
];
type Colonne = "date" | "ligne" | "etat";

export function SessionList({ rows, current }: { rows: LigneSeance[]; current?: string }) {
  const t = useT();
  const router = useRouter();
  const [onglet, setOnglet] = useState<EtatSeance | "tout">("tout");
  const [q, setQ] = useState("");
  const [tri, setTri] = useState<{ col: Colonne; rev: boolean }>({ col: "date", rev: false });
  const courante = useRef<HTMLTableRowElement>(null);

  // La séance ouverte se montre d'elle-même : arriver depuis la table des
  // séances ou depuis un lien ne doit pas obliger à la chercher dans la liste.
  useEffect(() => {
    // On défile la liste, et elle seule : « scrollIntoView » remonte tous les
    // parents défilants, la page comprise, et choisir une séance faisait sauter
    // l'écran alors que la liste a son propre défilement.
    const ligne = courante.current;
    const boite = ligne?.closest<HTMLElement>("[data-defile]");
    if (!ligne || !boite) return;
    const haut = ligne.offsetTop - boite.clientHeight / 2 + ligne.clientHeight / 2;
    boite.scrollTo({ top: Math.max(0, haut) });
  }, [current]);

  const vues = useMemo(() => {
    const mots = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const gardees = rows.filter((r) => {
      if (onglet === "tout" ? r.etat === "ecartee" : r.etat !== onglet) return false;
      if (!mots.length) return true;
      const foin = `${r.on} ${r.pays} ${r.instrument} ${r.tenor} ${r.code ?? ""}`.toLowerCase();
      // Chaque mot doit être présent : c'est le même comportement que la
      // recherche des dossiers, et le desk n'a qu'une habitude à prendre.
      return mots.every((m) => foin.includes(m));
    });
    const clef = (r: LigneSeance) => (tri.col === "date" ? r.on : tri.col === "ligne" ? `${r.pays} ${r.tenor}` : `${r.etat} ${r.on}`);
    const ordre = [...gardees].sort((a, b) => String(clef(b)).localeCompare(String(clef(a))));
    return tri.rev ? ordre.reverse() : ordre;
  }, [rows, onglet, q, tri]);

  const compte = (c: EtatSeance | "tout") => (c === "tout" ? rows.length : rows.filter((r) => r.etat === c).length);
  /**
   * Un en-tête trie, et porte la poignée de sa colonne.
   *
   * La largeur d'une colonne vaut « pointeur moins bord gauche de l'en-tête »,
   * c'est-à-dire exactement ce que la poignée calcule sur son parent. La
   * variable, elle, se pose sur la table, qui la lit pour ses trois colonnes.
   */
  const th = (col: Colonne, mot: string, largeur?: { variable: string; min: number; max: number; memoire: string; libelle: string }) => (
    <th
      aria-sort={tri.col === col ? (tri.rev ? "ascending" : "descending") : "none"}
      onClick={() => setTri((v) => (v.col === col ? { col, rev: !v.rev } : { col, rev: false }))}
    >
      {t(mot)} <i aria-hidden="true">{tri.col === col ? (tri.rev ? "▲" : "▼") : "↕"}</i>
      {largeur && <Poignee {...largeur} porte=".table-seances" className={styles.tirette} />}
    </th>
  );

  return (
    <div className={styles.bloc}>
      <div className={styles.tete}>
        <div className={styles.onglets} role="tablist">
          {ONGLETS.map((o) => (
            <button key={o.clef} type="button" role="tab" aria-selected={onglet === o.clef} onClick={() => setOnglet(o.clef)}>
              {t(o.mot)} <span>{compte(o.clef)}</span>
            </button>
          ))}
        </div>
        <input className={styles.cherche} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Trésor, durée, code…")} aria-label={t("Chercher une séance")} autoComplete="off" />
      </div>

      <div className={styles.corps} data-defile>
        <table className={`${styles.table} table-seances`}>
          {/* Les largeurs vivent ici : trois colonnes déclarées une fois, et la
              dernière prend ce qui reste. */}
          <colgroup>
            <col className={styles.colSeance} />
            <col className={styles.colLigne} />
            <col />
          </colgroup>
          <thead>
            <tr>
              {th("date", "Séance", { variable: "--col-seance", min: 72, max: 220, memoire: "adj.col.seance", libelle: "Régler la largeur de la colonne Séance" })}
              {th("ligne", "Ligne", { variable: "--col-ligne", min: 72, max: 260, memoire: "adj.col.ligne", libelle: "Régler la largeur de la colonne Ligne" })}
              {th("etat", "État")}
            </tr>
          </thead>
          <tbody>
            {vues.map((r) => (
              <tr
                key={r.id}
                ref={r.id === current ? courante : undefined}
                aria-selected={r.id === current}
                className={styles.cliquable}
                onClick={(e) => {
                  // Le lien de la date fait son travail tout seul, et une
                  // sélection de texte n'est pas un clic : on ne navigue ni
                  // par-dessus l'un ni en travers de l'autre.
                  if ((e.target as HTMLElement).closest("a")) return;
                  if (window.getSelection()?.toString()) return;
                  // « scroll: false » : Next ramène la page en haut à chaque
                  // navigation, et on relit vingt communiqués de suite sans vouloir
                  // remonter vingt fois.
                  router.push(`/desk/adjudications?s=${r.id}`, { scroll: false });
                }}
              >
                <td className={styles.jour}>
                  <Link href={`/desk/adjudications?s=${r.id}`} scroll={false}>{fmtDate(r.on)}</Link>
                  <small>{r.code ?? "—"}</small>
                </td>
                <td>
                  {r.pays}
                  <small>
                    {r.instrument} · {r.tenor}
                  </small>
                </td>
                <td>
                  <span className={`${styles.etat} ${styles[r.etat]}`}>{t(MOT[r.etat])}</span>
                  {r.mince && <span className={styles.mince}>{t("mince")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vues.length === 0 && <p className={styles.vide}>{t("Aucune séance ne répond à cette recherche.")}</p>}
      </div>
    </div>
  );
}
