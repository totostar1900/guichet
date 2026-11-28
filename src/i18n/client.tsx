"use client";

import { createContext, use, useContext, useMemo } from "react";
import { traducteurFrancais, type Lang, type T } from "./langue";
import { formatsDeLaLangue, setFormatLang, type FormatsDeDate } from "@/lib/format";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "fr", t: traducteurFrancais });

/**
 * LE DICTIONNAIRE ANGLAIS NE PART QUE POUR UN LECTEUR ANGLAIS : l'import est dynamique et mis en mémoire (une seule requête), et le rendu attend qu'il soit là (`use`), au serveur comme au navigateur,
 * pour que le premier rendu et l'hydratation disent la même chose. Un lecteur français n'en télécharge pas un octet.
 */
let dictionnaireEn: Promise<typeof import("./core")> | undefined;
const chargerLeDictionnaire = () => (dictionnaireEn ??= import("./core"));

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const core = lang === "en" ? use(chargerLeDictionnaire()) : null;
  const value = useMemo(() => {
    /* LA LANGUE DES DATES SE POSE POUR LE NAVIGATEUR, PAS POUR LE SERVEUR.
       Ce composant est « client », mais il s'exécute aussi au rendu serveur, et
       « setFormatLang » y écrasait la lecture par requête de i18n/server.ts :
       la fuite entre lecteurs revenait exactement par là, une requête anglaise
       repeignant les dates de la requête française d'à côté. Au navigateur, un
       document n'a qu'un lecteur et qu'une langue : la valeur fixe y est juste. */
    if (typeof window !== "undefined") setFormatLang(lang);
    return { lang, t: core ? core.translator(lang) : traducteurFrancais };
  }, [lang, core]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = (): Lang => useContext(Ctx).lang;
export const useT = (): T => useContext(Ctx).t;

/**
 * LES DATES D'UN COMPOSANT CLIENT VIENNENT D'ICI, ET DE NULLE PART AILLEURS.
 *
 * « fmtDate » et ses sœurs, importées de @/lib/format, lisent une variable de
 * module que SEUL le graphe serveur branche sur la requête. Dans le graphe
 * client la variable reste au français : au rendu serveur, un composant client
 * écrivait donc « jeu. 29 oct. » dans une page anglaise, et le navigateur
 * réécrivait « Thu 29 Oct » après hydratation. React jetait le sous-arbre.
 *
 * Le contexte, lui, connaît la langue des deux côtés — c'est le serveur qui la
 * lui passe en propriété. Les formateurs en sortent donc comme le
 * dictionnaire, et le rendu est le même des deux côtés.
 */
export const useDates = (): FormatsDeDate => formatsDeLaLangue(useLang());
