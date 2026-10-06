"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import type { Controle } from "@/lib/market/coherence";
import styles from "./comparateur.module.css";

/**
 * LES CINQ CONTRÔLES, ET LEURS LIGNES REPLIÉES DESSOUS.
 *
 * Les fautes s'affichaient toutes, tout le temps : deux contrôles fautifs
 * noyaient le verdict d'ensemble sous le détail. Elles se replient donc, et
 * UNE SEULE SECTION RESTE OUVERTE — ouvrir la suivante ferme la précédente,
 * parce que deux listes de montants côte à côte ne se comparent pas, elles
 * se confondent.
 *
 * TOUT CONTRÔLE APPLICABLE S'OUVRE, MÊME SANS FAUTE, et c'est une correction.
 * Seul le contrôle fautif était un bouton : les autres lui ressemblaient trait
 * pour trait, on les touchait, rien ne venait. Pire, un contrôle qui ne montre
 * jamais rien est indiscernable d'un contrôle qui ne tourne pas. Celui qui
 * passe montre donc trois lignes vues passer, avec à droite ce que la règle
 * exigeait : la preuve qu'elle a mordu. Seul « sans objet » reste muet, et il
 * dit déjà pourquoi.
 *
 * LE RÉSULTAT EST ÉCRIT EN MOTS, PAS EN FRACTION. « 12 / 12 » voulait dire
 * douze lignes bonnes sur douze, et « 1 / 12 » une faute sur douze : le
 * premier nombre changeait de sens selon l'état, et rien ne disait lequel on
 * lisait.
 */
export function Controles({ controles }: { controles: Controle[] }) {
  const t = useT();
  const [ouvert, setOuvert] = useState<string | null>(null);

  const nom: Record<Controle["id"], string> = {
    chainage: t("Le chaînage des cours"),
    bande: t("La bande de variation"),
    nominal: t("Le nominal ne remonte pas"),
    saut: t("Aucun cours ne saute sa bande"),
    identite: t("Un ISIN garde son nom"),
  };
  const regle: Record<Controle["id"], string> = {
    chainage: t("Le « cours précédent » d'une séance est la clôture de la précédente. Vrai par construction, donc un écart est une lecture fausse."),
    bande: t("Les seuils valent dix pour cent du cours précédent pour une action, six pour une obligation, et rien avant novembre 2023."),
    nominal: t("Une obligation amortit : son nominal restant décroît, il ne grandit jamais. Une remontée est un chiffre mal lu, ou deux lignes confondues."),
    saut: t("Un cours ne peut pas franchir en une séance les seuils que la bourse lui a fixés. S'il le fait, l'un des deux chiffres est faux."),
    identite: t("Un mnémonique ou un émetteur qui change sous le même ISIN est le signe d'une ligne mal lue. Une espace de plus n'est pas un autre nom."),
  };

  const resultat = (c: Controle) =>
    !c.applicable ? t("sans objet")
    : c.fautes.length ? t("{n} faute(s) sur {m}", { n: c.fautes.length, m: c.examinees })
    : t("{n} ligne(s) vérifiée(s)", { n: c.examinees });

  return (
    <div>
      {controles.map((c) => {
        const fautif = c.applicable && c.fautes.length > 0;
        /* Un contrôle applicable qui n'a examiné aucune ligne n'a pas de
           témoin à montrer : il ne promet donc pas de s'ouvrir. */
        const pliant = c.applicable && (fautif || c.temoins.length > 0);
        const montrees = fautif ? c.fautes : c.temoins;
        const tete = (
          <>
            <span className={`${styles.puce} ${!c.applicable ? styles.puceNa : c.fautes.length ? styles.puceKo : styles.puceOk}`} aria-hidden="true">
              {!c.applicable ? "·" : c.fautes.length ? "!" : "✓"}
            </span>
            <span>
              <span className={styles.ctrlNom}>{nom[c.id]}</span>
              <span className={styles.ctrlRegle}>{regle[c.id]}</span>
            </span>
            <span className={styles.ctrlRes}>
              {resultat(c)}
              {pliant ? <span className={`${styles.chev} ${ouvert === c.id ? styles.chevOuvert : ""}`} aria-hidden="true">▾</span> : null}
            </span>
          </>
        );
        if (!pliant) return <div key={c.id} className={styles.ctrl}>{tete}</div>;
        return (
          <div key={c.id} className={styles.ctrlPliant}>
            <button type="button" className={styles.ctrlBouton} aria-expanded={ouvert === c.id} onClick={() => setOuvert(ouvert === c.id ? null : c.id)}>
              {tete}
            </button>
            {ouvert === c.id && (
              <div className={styles.volet}>
                {/* Le volet dit CE QU'ON REGARDE avant de le montrer : sans
                    cette phrase, trois lignes saines ressemblaient à trois
                    fautes dont on n'aurait pas vu l'écart. */}
                <p className={styles.voletQuoi}>
                  {fautif
                    ? t("Les lignes que la règle refuse.")
                    : t("Trois lignes parmi les {m} que la règle a vues passer : à droite ce qu'elle exigeait, à gauche ce que le bulletin a répondu.", { m: c.examinees })}
                </p>
                {/* Le chiffre fautif se tient à côté de celui qui l'attendait :
                    c'est le rapprochement qui informe, pas la couleur seule. */}
                <table className={styles.fautes}>
                  {/* DEUX EN-TÊTES FIXES, et non « {valeur} lu » : une clef de
                      traduction presque vide se recopie d'un écran à l'autre et
                      finit par vouloir dire deux choses. Le nom du contrôle dit
                      déjà de quelle valeur il s'agit. */}
                  <thead>
                    <tr>
                      <th>{t("Ligne")}</th>
                      <th className="r">{t("Ce que le bulletin dit")}</th>
                      <th className="r">{t("Ce que la règle veut")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {montrees.map((f) => (
                      <tr key={f.isin}>
                        <td className="mono">{f.nom}</td>
                        <td className={`r ${fautif ? styles.mal : ""}`}>{f.lu}</td>
                        <td className="r">{f.attendu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
