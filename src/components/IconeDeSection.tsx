import type { Section } from "@/lib/domain/sections";

/**
 * L'ICÔNE D'UNE SECTION OU D'UNE FAMILLE : l'émetteur, dessiné (4 novembre 2026).
 *
 * « Les pastilles États, Entreprises… ont des icônes représentant l'émetteur » : un État est une façade à colonnes (le
 * Trésor), une institution régionale un globe (la BDEAC, ni État ni entreprise), une entreprise un immeuble, une action une
 * courbe, une émission en souscription une horloge. Les catégories de fonds et les compartiments des adjudications ont les
 * leurs. Elles s'écrivent à l'encre de la tuile et ne portent jamais le sens seules : le nom est dessous.
 */
export type NomIcone = Section | "tout" | "calendrier" | "resultats" | "monetaire" | "obligataire" | "diversifie" | "fonds_actions";

const TRAITS: Partial<Record<NomIcone, string>> = {
  tout: "M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z",
  etats: "M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18",
  regionales: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16",
  entreprises: "M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 10h3a1 1 0 0 1 1 1v10M3 21h18M9 8h2M9 12h2M9 16h2",
  actions: "M4 17l5-5 4 3 7-8M16 7h4v4",
  fonds_actions: "M4 17l5-5 4 3 7-8M16 7h4v4",
  souscription: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM12 8v4l3 2",
  monetaire: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5V8m0 8v1.5",
  obligataire: "M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2ZM8.5 8h7M8.5 12h7M8.5 16h4",
  obligations_tresor: "M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2ZM8.5 8h7M8.5 12h7M8.5 16h4",
  diversifie: "M12 3v9h9a9 9 0 1 1-9-9ZM15 3.5A9 9 0 0 1 20.5 9H15V3.5Z",
  bons_tresor: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM12 8v4l3 2",
  rachats: "M5 12h14M9 8l-4 4 4 4",
  calendrier: "M4 6.5h16V20H4zM4 10.5h16M8 4v4M16 4v4",
  resultats: "M5 20v-9M12 20V4M19 20v-6",
};

export function IconeDeSection({ section, taille = 14 }: { section: NomIcone; taille?: number }) {
  const d = TRAITS[section];
  if (!d) return null;
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ alignSelf: "center", flex: "none" }}>
      <path d={d} />
    </svg>
  );
}
