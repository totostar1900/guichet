/**
 * RACINES ET PAGES (10 novembre 2026, option A de la planche « navigation » : le modèle d'une application de courtage mobile).
 *
 * Sur téléphone, la barre du bas et la barre du haut complète ne paraissent qu'aux RACINES : les sept entrées que le dock et les tuiles d'Investir ouvrent. Dans une PAGE (une fiche, un formulaire, un éclairage, l'indice, une société, « Mon activité »…) la barre du bas
 * glisse hors de l'écran, et la barre du haut s'adapte : le retour, le menu, et les boutons de la page (favori, suivi). Le retour ramène à la racine d'où l'on vient, où les deux barres reviennent en glissant.
 *
 * C'est aussi ce qui règle le saut de l'onglet : dans une page il n'y a plus d'onglet allumé à tort (l'éclairage ouvert depuis le Marché allumait « Aide »).
 */
export const RACINES = ["/", "/activite", "/titres", "/fonds", "/calendrier", "/marche", "/aide"] as const;

export const estRacine = (chemin: string): boolean => (RACINES as readonly string[]).includes(chemin.split("?")[0].replace(/(.)\/$/, "$1"));

/** Le script du <head> : pose la profondeur avant la première image, pour qu'une page ouverte directement n'anime rien. */
export const PROFONDEUR_BOOT = `(function(){try{var R=${JSON.stringify(RACINES)};var p=location.pathname.replace(/(.)\\/$/,"$1");document.documentElement.setAttribute("data-profondeur",R.indexOf(p)>-1?"racine":"page");}catch(e){}})();`;
