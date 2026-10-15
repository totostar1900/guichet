/** Les regles du code du CRCT vivent dans `src/lib/market/code-crct.ts`. */
const m = await import("../src/lib/market/code-crct.ts");
export const CANONIQUE = m.canonique;
export const { distance, nettoyer, codesDeLAdresse, reparerParLaForme } = m;
