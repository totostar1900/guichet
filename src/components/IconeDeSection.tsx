import type { Section } from "@/lib/domain/sections";

/**
 * L'ICÔNE D'UNE SECTION DE LA COTE : l'émetteur, dessiné (3 novembre 2026).
 *
 * « Les pastilles États, Entreprises… ont des icônes représentant l'émetteur » : un État est une façade à
 * colonnes (le Trésor), une institution régionale un globe (la BDEAC, ni État ni entreprise), une entreprise un
 * immeuble, une action une courbe, une émission en souscription une horloge. Elles s'écrivent à l'encre de la
 * pastille et ne portent jamais le sens seules : le nom et le nombre sont à côté.
 */
const TRAITS: Partial<Record<Section, string>> = {
  etats: "M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18",
  regionales: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16",
  entreprises: "M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 10h3a1 1 0 0 1 1 1v10M3 21h18M9 8h2M9 12h2M9 16h2",
  actions: "M4 17l5-5 4 3 7-8M16 7h4v4",
  souscription: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM12 8v4l3 2",
};

export function IconeDeSection({ section, taille = 14 }: { section: Section; taille?: number }) {
  const d = TRAITS[section];
  if (!d) return null;
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ alignSelf: "center", flex: "none" }}>
      <path d={d} />
    </svg>
  );
}
