"use client";

import { createContext, useContext, useMemo } from "react";
import { translator, type Lang, type T } from "./core";
import { setFormatLang } from "@/lib/format";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "fr", t: translator("fr") });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => {
    /* LA LANGUE DES DATES SE POSE POUR LE NAVIGATEUR, PAS POUR LE SERVEUR.
       Ce composant est « client », mais il s'exécute aussi au rendu serveur, et
       « setFormatLang » y écrasait la lecture par requête de i18n/server.ts :
       la fuite entre lecteurs revenait exactement par là, une requête anglaise
       repeignant les dates de la requête française d'à côté. Au navigateur, un
       document n'a qu'un lecteur et qu'une langue : la valeur fixe y est juste. */
    if (typeof window !== "undefined") setFormatLang(lang);
    return { lang, t: translator(lang) };
  }, [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = (): Lang => useContext(Ctx).lang;
export const useT = (): T => useContext(Ctx).t;
