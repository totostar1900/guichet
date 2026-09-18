"use client";

import { createContext, useContext, useMemo } from "react";
import { translator, type Lang, type T } from "./core";
import { setFormatLang } from "@/lib/format";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "fr", t: translator("fr") });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => {
    setFormatLang(lang);
    return { lang, t: translator(lang) };
  }, [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = (): Lang => useContext(Ctx).lang;
export const useT = (): T => useContext(Ctx).t;
