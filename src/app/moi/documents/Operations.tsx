"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { Pli } from "@/components/Pli";
import { Annee, Ligne, type GesteDeLigne } from "./Ligne";
import styles from "./page.module.css";

/**
 * LES PAPIERS TOMBÉS D'UNE OPÉRATION, par opération ou par date.
 *
 * LA BASCULE EST DESCENDUE ICI le 10 octobre 2026, et c'est tout le point :
 * elle gouvernait la page entière, si bien que choisir « par date »
 * désagrégeait aussi la convention et les mandats, qui n'ont jamais appartenu
 * à une opération. Elle ne commande plus que ce rayon, le seul où lire par
 * opération veut dire quelque chose.
 *
 * Les textes arrivent traduits : ce composant ne traduit que sa propre barre.
 */
export interface DocLigne {
  id: string;
  titre: string;
  sous?: string;
  at: string;
  atText: string;
  etat?: string;
  ton?: "fait" | "attend";
  geste?: GesteDeLigne;
  intentId?: string;
}
export interface OpGroupe {
  id: string;
  titre: string;
  sous: string;
  etat: string;
  etatKey: string;
  href?: string;
}

const KEY = "guichet:docs:view";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KEY, cb);
  };
};
const lire = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

export function Operations({ docs, ops }: { docs: DocLigne[]; ops: OpGroupe[] }) {
  const t = useT();
  const garde = useSyncExternalStore(subscribe, lire, () => "");
  const parOperation = garde ? garde === "operation" : true;
  const poser = (v: "operation" | "date") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // sans stockage, le choix vaut pour cette page
    }
    window.dispatchEvent(new Event(KEY));
  };

  const parDate = [...docs].sort((a, b) => b.at.localeCompare(a.at));
  const groupes = ops
    .map((op) => ({ op, rows: docs.filter((d) => d.intentId === op.id).sort((a, b) => a.at.localeCompare(b.at)) }))
    .filter((g) => g.rows.length > 0);
  const orphelins = docs.filter((d) => !d.intentId || !ops.some((o) => o.id === d.intentId)).sort((a, b) => b.at.localeCompare(a.at));

  const barre = (
    <div className={styles.bascule} role="group" aria-label={t("Présentation")}>
      <button type="button" className={parOperation ? styles.basculeOn : ""} aria-pressed={parOperation} onClick={() => poser("operation")}>
        {t("Par opération")}
      </button>
      <button type="button" className={!parOperation ? styles.basculeOn : ""} aria-pressed={!parOperation} onClick={() => poser("date")}>
        {t("Par date")}
      </button>
    </div>
  );

  if (!docs.length) return <p className="muted">{t("Vos appels de fonds, résultats et avis d'opéré apparaîtront ici.")}</p>;

  return (
    <>
      <div className={styles.barreDuRayon}>{barre}</div>
      {parOperation ? (
        <>
          {groupes.map(({ op, rows }, i) => {
            const attend = rows.filter((r) => r.ton === "attend").length;
            const dernier = rows[rows.length - 1];
            return (
              <Pli
                key={op.id}
                cle={`docs:op:${op.id}`}
                niveau="filet"
                titre={op.titre}
                sous={op.sous}
                /* Un groupe replié dit ce qu'il contient ET de quand date son
                   dernier papier : sans cela, il faut l'ouvrir pour savoir. */
                compte={`${rows.length} · ${t("dernier le {d}", { d: dernier.atText })}`}
                attend={attend ? t(attend > 1 ? "{n} à faire" : "1 à faire", { n: String(attend) }) : undefined}
                etiquette={<span className={`st ${op.etatKey}`}>{op.etat}</span>}
                /* La plus récente s'ouvre, et toute opération qui attend un
                   geste aussi : les anciennes se replient. */
                defaut={i === 0 || attend > 0}
              >
                {rows.map((d) => (
                  <Ligne key={d.id} titre={d.titre} sous={d.sous} etat={d.etat} ton={d.ton} geste={d.geste} />
                ))}
              </Pli>
            );
          })}
          {orphelins.length > 0 && (
            <Pli cle="docs:op:autres" niveau="filet" titre={t("Hors opération")} sous={t("des papiers dont l'opération n'est plus au catalogue")} compte={String(orphelins.length)} defaut={false}>
              {orphelins.map((d) => (
                <Ligne key={d.id} titre={d.titre} sous={d.sous} etat={d.etat} ton={d.ton} geste={d.geste} />
              ))}
            </Pli>
          )}
        </>
      ) : (
        parDate.map((d, i) => {
          const an = d.at.slice(0, 4);
          const avant = i > 0 ? parDate[i - 1].at.slice(0, 4) : undefined;
          const op = d.intentId ? ops.find((o) => o.id === d.intentId) : undefined;
          return (
            <div key={d.id}>
              {an !== avant && <Annee an={an} />}
              <Ligne
                titre={d.titre}
                sous={
                  <>
                    {op ? (op.href ? <Link href={op.href}>{op.titre}</Link> : op.titre) : t("Hors opération")}
                    {d.sous ? ` · ${d.sous}` : ""}
                  </>
                }
                etat={d.etat}
                ton={d.ton}
                geste={d.geste}
              />
            </div>
          );
        })
      )}
    </>
  );
}
