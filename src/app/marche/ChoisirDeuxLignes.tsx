"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { Select, type SelectOption } from "@/components/ui/Select";
import styles from "./page.module.css";

/** Une ligne qu'on peut mettre en face d'une autre : son nom, et sa famille. */
export interface LigneAComparer {
  id: string;
  titre: string;
  famille: string;
}

/**
 * DEUX LISTES DÉROULANTES, ET RIEN DE PLUS.
 *
 * ─── Ce que cette tuile ne fait pas, et c'est une décision ──────────────────
 *
 * Elle ne PROPOSE aucune paire. La première écriture devait montrer le plus
 * grand écart de rendement du moment : le dirigeant l'a écarté le 1er
 * novembre 2026 — « pas de paires, juste de belles cases avec listes
 * déroulantes » — et il a raison pour une raison que la maison connaît déjà.
 * Une paire choisie par nous est une mise en avant, et la maison n'a pas
 * l'agrément pour en faire : c'est exactement ce qui interdit de trier les
 * services par ce qu'ils rapportent. Deux listes vides ne recommandent rien.
 *
 * ─── Ce qu'elle garde du marché, pourtant ──────────────────────────────────
 *
 * Les options viennent du catalogue lu par la page, pas d'une table écrite à
 * la main : une ligne retirée disparaît des deux listes, une ligne ouverte y
 * entre, et le compte sous les cases dit combien il y en a. La tuile est donc
 * vivante sans rien désigner.
 *
 * ─── Ce que le choix de l'un fait à l'autre ────────────────────────────────
 *
 * La même ligne ne peut pas être des deux côtés : se comparer à soi-même rend
 * deux colonnes identiques, et le lecteur croit à une panne. Elle est donc
 * retirée de l'autre liste dès qu'elle est prise ici.
 */
export function ChoisirDeuxLignes({ lignes }: { lignes: LigneAComparer[] }) {
  const t = useT();
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  /* LA LISTE DE LA MAISON, ET NON LA BALISE NATIVE. Une liste native s'ouvre
     en roue au bas du téléphone, avec la typographie du système, sans la
     phrase qui dit ce qu'est chaque ligne et sans recherche quand la liste
     est longue — et le catalogue en porte des dizaines. Un cliquet le refuse,
     et il m'a repris à la première écriture de ce fichier.

     LES FAMILLES SONT DES EN-TÊTES de la liste : une option sans valeur et
     marquée « group ». La famille voyage aussi en « hint », de sorte qu'on
     retrouve une ligne en tapant « OTA » comme en tapant son nom. */
  const familles = [...new Set(lignes.map((l) => l.famille))];
  const options = (sauf: string): SelectOption[] =>
    familles.flatMap((f) => {
      const siennes = lignes.filter((l) => l.famille === f && l.id !== sauf);
      if (siennes.length === 0) return [];
      return [{ value: "", label: t(f), group: true }, ...siennes.map((l) => ({ value: l.id, label: t(l.titre), hint: t(f) }))];
    });

  const pret = a !== "" && b !== "" && a !== b;

  return (
    <div className={styles.comparer}>
      <label className={styles.case}>
        <span>{t("Première ligne")}</span>
        <Select value={a} onChange={setA} options={options(b)} placeholder={t("Choisir…")} block />
      </label>
      <label className={styles.case}>
        <span>{t("Seconde ligne")}</span>
        <Select value={b} onChange={setB} options={options(a)} placeholder={t("Choisir…")} block />
      </label>
      {/* LE BOUTON DIT CE QU'IL FERA, ET NON CE QU'IL ATTEND. Éteint tant que
          les deux cases ne sont pas remplies : un bouton qui mène à une page
          vide apprend à ne plus appuyer. */}
      <button
        type="button"
        className="btn sm primary"
        disabled={!pret}
        onClick={() => {
          if (pret) router.push(`/comparer?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
        }}
      >
        {t("Comparer")}
      </button>
    </div>
  );
}
