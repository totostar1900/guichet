"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const MOT: Record<EtatSeance, string> = { a_lire: "à lire", a_relire: "à relire", relue: "relue" };
const ONGLETS: { clef: EtatSeance | "tout"; mot: string }[] = [
  { clef: "tout", mot: "Toutes" },
  { clef: "a_lire", mot: "À lire" },
  { clef: "a_relire", mot: "À relire" },
  { clef: "relue", mot: "Relues" },
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
    courante.current?.scrollIntoView({ block: "center" });
  }, [current]);

  const vues = useMemo(() => {
    const mots = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const gardees = rows.filter((r) => {
      if (onglet !== "tout" && r.etat !== onglet) return false;
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
  const th = (col: Colonne, mot: string) => (
    <th
      aria-sort={tri.col === col ? (tri.rev ? "ascending" : "descending") : "none"}
      onClick={() => setTri((v) => (v.col === col ? { col, rev: !v.rev } : { col, rev: false }))}
    >
      {t(mot)} <i aria-hidden="true">{tri.col === col ? (tri.rev ? "▲" : "▼") : "↕"}</i>
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

      <div className={styles.corps}>
        <table className={styles.table}>
          <thead>
            <tr>
              {th("date", "Séance")}
              {th("ligne", "Ligne")}
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
                  router.push(`/desk/adjudications?s=${r.id}`);
                }}
              >
                <td className={styles.jour}>
                  <Link href={`/desk/adjudications?s=${r.id}`}>{fmtDate(r.on)}</Link>
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
