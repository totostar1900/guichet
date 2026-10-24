import fs from "node:fs";
import path from "node:path";
import { RACINE } from "./racine";

/**
 * LA MESURE DES COULEURS, ÉCRITE UNE FOIS.
 *
 * La formule de contraste du W3C vivait en DEUX exemplaires, dans
 * « contrast.test.ts » et « contraste-sans-fond.test.ts », à la virgule près.
 * Une troisième garde allait en faire un troisième. Deux copies d'une formule
 * ne divergent pas le jour où on les écrit ; elles divergent le jour où l'une
 * est corrigée.
 *
 * Ce fichier ne porte que la MESURE : lire les jetons d'un thème, résoudre une
 * valeur en couleur, mesurer un rapport. Ce que chaque garde CHERCHE lui
 * appartient, et reste chez elle.
 */

export const SEUIL = 4.5;

export type Rgb = [number, number, number];

export const feuillesCss = (): string[] => {
  const out: string[] = [];
  const marche = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (e.name.endsWith(".css")) out.push(p);
    }
  };
  marche(path.join(RACINE, "src"));
  return out.sort();
};

export const sansCommentaires = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "");

export const globals = (): string => fs.readFileSync(path.join(RACINE, "src/app/globals.css"), "utf8");

/** Le corps d'un bloc, accolades suivies : « :root { … } », « @media … { … } ». */
export const bloc = (g: string, depuis: string): string => {
  const i = g.indexOf(depuis);
  if (i < 0) return "";
  const o = g.indexOf("{", i);
  let d = 0;
  for (let j = o; j < g.length; j++) {
    if (g[j] === "{") d++;
    else if (g[j] === "}") {
      d--;
      if (d === 0) return g.slice(o + 1, j);
    }
  }
  return "";
};

export const jetons = (t: string): Record<string, string> =>
  Object.fromEntries([...t.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

/** Tous les écrans que l'application peut rendre, jetons résolus pour chacun. */
export const ecrans = (): Record<string, Record<string, string>> => {
  const g = globals();
  const clair = jetons(bloc(g, ":root {"));
  const out: Record<string, Record<string, string>> = { clair };
  out["sombre"] = { ...clair, ...jetons(bloc(g, "@media (prefers-color-scheme: dark)")) };
  for (const m of g.matchAll(/(?::root)?\[data-(theme|palette)="([\w-]+)"\]\s*\{/g)) {
    const vars = jetons(bloc(g, m[0].slice(0, -1).trim() + " {"));
    if (Object.keys(vars).length === 0) continue;
    /* « dim » est un thème clair : la requête média sombre s'exclut elle-même. */
    const base = m[1] === "theme" && m[2] === "dark" ? out["sombre"] : clair;
    out[`${m[1]}=${m[2]}`] = { ...base, ...vars };
  }
  return out;
};

export const rgb = (s: string): Rgb | null => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export const resoudre = (value: string, vars: Record<string, string>, depth = 0): Rgb | null => {
  if (depth > 5) return null;
  const v = value.trim();
  const direct = rgb(v);
  if (direct) return direct;
  if (v === "white") return [255, 255, 255];
  if (v === "black") return [0, 0, 0];
  const m = /^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/.exec(v);
  if (!m) return null;
  if (vars[m[1]]) return resoudre(vars[m[1]], vars, depth + 1);
  return m[2] ? resoudre(m[2], vars, depth + 1) : null;
};

export const luminance = ([r, g, b]: Rgb): number => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

export const contraste = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

/** Le pire rapport entre deux valeurs CSS sur l'ensemble des écrans, ou null si l'une ne se résout pas. */
export const pireContraste = (fond: string, encre: string, tous = ecrans()): { rapport: number; ecran: string } | null => {
  let pire: { rapport: number; ecran: string } | null = null;
  for (const [ecran, vars] of Object.entries(tous)) {
    const a = resoudre(fond, vars);
    const b = resoudre(encre, vars);
    if (!a || !b) return null;
    const rapport = contraste(a, b);
    if (!pire || rapport < pire.rapport) pire = { rapport, ecran };
  }
  return pire;
};

export type Regle = { selecteur: string; declarations: string };

/**
 * Les règles d'une feuille, à plat, les at-règles explorées.
 *
 * Le découpage par « ([^{}]+)\{([^{}]*)\} » que les deux premières gardes
 * emploient ne voit que les blocs SANS imbrication : il travaille parce qu'il
 * ne s'intéresse qu'aux déclarations. Une garde qui lit les SÉLECTEURS a
 * besoin, elle, du sélecteur entier et non de la queue d'un « @media ».
 */
export const regles = (css: string): Regle[] => {
  const out: Regle[] = [];
  const lire = (texte: string, prefixe: string) => {
    let i = 0;
    let tampon = "";
    while (i < texte.length) {
      if (texte[i] !== "{") {
        tampon += texte[i++];
        continue;
      }
      const tete = tampon.trim();
      tampon = "";
      let prof = 1;
      let j = i + 1;
      while (j < texte.length && prof) {
        if (texte[j] === "{") prof++;
        else if (texte[j] === "}") prof--;
        j++;
      }
      const corps = texte.slice(i + 1, j - 1);
      if (tete.startsWith("@")) lire(corps, prefixe);
      else if (corps.includes("{")) {
        /* Imbrication CSS : les déclarations propres, puis les règles filles. */
        out.push({ selecteur: prefixe + tete, declarations: corps.replace(/\{[^{}]*\}/g, "") });
        lire(corps, prefixe + tete + " ");
      } else out.push({ selecteur: prefixe + tete, declarations: corps });
      i = j;
    }
  };
  lire(css, "");
  return out;
};

/** La valeur d'une propriété dans un corps de règle, ou null. */
export const valeur = (declarations: string, propriete: string): string | null =>
  new RegExp(`(?:^|[\\s;])${propriete}\\s*:\\s*([^;]+)`).exec(declarations)?.[1]?.trim() ?? null;

/** Les sélecteurs d'une liste, séparés et nettoyés. */
export const selecteurs = (liste: string): string[] =>
  liste
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
