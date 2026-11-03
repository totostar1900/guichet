"use client";

import { useRef } from "react";
import { useT } from "@/i18n/client";
import { useSommaire } from "@/lib/ui/sommaire";
import { SECTION_COURT, type Section } from "@/lib/domain/sections";
import type { NomIcone } from "./IconeDeSection";
import { GrilleDInstruments, type TuileDInstrument } from "./GrilleDInstruments";

/**
 * LE SÉLECTEUR D'INSTRUMENTS : DE PETITES ICÔNES DANS DES CARRÉS, SANS LE NOMBRE DE LIGNES (4 novembre 2026).
 *
 * « Revoir le sélecteur d'instruments en format Revolut » : une grille de trois colonnes fixe, pas de défilement latéral —
 * chaque tuile est un carré arrondi, une icône, un mot dessous. Choisi sur la planche du 4 novembre (option C) : rien n'est
 * caché hors de l'écran, et les trois pages (Titres, Fonds, Adjudications) ont la même forme.
 *
 * LA BANDE FILTRE (la cote, depuis le 3 novembre, contre la décision du 4 octobre « conduit, ne filtre pas ») : la liste de la
 * cote faisait 12 390 px et les actions, que l'on cherche le plus, commençaient à 83 % de la page. « Tout » rend toutes les
 * sections.
 *
 * LE COMPTE EST PARTI DE LA TUILE, et il reste dans son nom accessible (« Actions, 8 lignes »). UNE SECTION VIDE RESTE VISIBLE,
 * ÉTEINTE : sans nombre, c'est l'éclat qui dit l'absence, et le nom accessible dit « aucune ». La règle de la maison est que
 * l'absence se voie.
 */
export function SectionChips({ sections, counts, selected, total, onChange, filtrant = false }: { sections: Section[]; counts: Record<string, number>; selected?: Section; total: number; onChange: (s: Section | undefined) => void; filtrant?: boolean }) {
  const t = useT();
  const bar = useRef<HTMLDivElement>(null);
  const { enVue, conduire } = useSommaire(sections, bar, !selected && !filtrant);
  const lignes = (n: number) => (n === 0 ? t("aucune") : n === 1 ? t("1 ligne") : t("{n} lignes", { n: String(n) }));

  const items: TuileDInstrument[] = [
    ...(selected || filtrant ? [{ cle: "tout", icone: "tout" as NomIcone, nom: t("Tout"), accessible: `${t("Tout")}, ${lignes(total)}`, on: !selected, onClick: () => onChange(undefined) }] : []),
    ...sections.map((s) => {
      const n = counts[s] ?? 0;
      const ici = !selected && !filtrant && enVue === s;
      return { cle: s, icone: s as NomIcone, nom: t(SECTION_COURT[s]), accessible: `${t(SECTION_COURT[s])}, ${lignes(n)}`, on: selected === s || ici, vide: n === 0, onClick: () => (filtrant ? onChange(s) : selected ? onChange(undefined) : conduire(s)) };
    }),
  ];
  return <GrilleDInstruments ref={bar} items={items} etiquette="Sections" coach="titres-sections" />;
}
