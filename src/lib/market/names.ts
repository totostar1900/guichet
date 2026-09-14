/** Display names for what the bulletin prints in capitals. Pure, shared by server and PDF code. */

const ACRONYMS = new Set(["BDEAC", "BEAC", "SNPC", "ACEP", "BGFI", "SCG", "CCA", "BHC", "SEMC", "SAF", "REG", "SOCAP", "BANGE", "UBA", "SA", "S.A.", "SARL", "MT", "II", "EDC", "ESS", "LCB", "AFG", "CRBC", "ABD", "RAPEC", "ACM", "L'ACM", "CEMAC", "FCP", "FCPE", "SICAV"]);
const SMALL = new Set(["DE", "DU", "DES", "LA", "LE", "LES", "ET", "EN", "D", "L", "AU", "AUX"]);

/** "SOCIETE DES EAUX MINERALES DU CAMEROUN" → "Societe des Eaux Minerales du Cameroun"; acronyms kept. */
export function prettyName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      const up = w.toUpperCase();
      if (up === "ETAT") return "État";
      if (ACRONYMS.has(up)) return up;
      if (i > 0 && SMALL.has(up)) return up.toLowerCase();
      if (/^[A-Z]{1,3}$/.test(up)) return up;
      return up.charAt(0) + up.slice(1).toLowerCase();
    })
    .join(" ");
}
