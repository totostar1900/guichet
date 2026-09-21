"use client";

import { fold } from "@/lib/text";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./Glossary.module.css";

/**
 * « Les mots du Guichet »: the glossary with its own search field, a sort
 * (alphabetical, or by category) and a grouping by category. Categories are
 * fixed here, by key : a new term without one lands in « Autres ».
 */
export interface GlossEntry {
  k: string;
  short: string;
  long?: string;
  text: string;
}
export type GlossGroup = "acteurs" | "dette" | "actions" | "fonds" | "ordres" | "etats" | "autres";
const GROUP_OF: Record<string, GlossGroup> = Object.fromEntries([
  ...["ota", "bta", "precompte", "coupon", "coupon_couru", "nominal", "pair", "in_fine", "lignes", "decote_duree", "rendement_actuariel", "apes", "adjudication", "prix_limite", "rachat"].map((k) => [k, "dette"]),
  ...["beac", "cosumaf", "bvmac", "depositaire", "tresor", "svt", "gestion", "societe_bourse", "emetteur"].map((k) => [k, "acteurs"]),
  ...["per", "bnpa", "dividende", "rendement_dividende", "payout", "flottant", "capitalisation", "price_to_book", "roe", "marge_nette", "resultat_net", "fonds_propres", "chiffre_affaires", "total_bilan", "valeur_ajoutee", "primes", "pnb", "ytd", "cours", "seuils", "volume", "liquidite", "introduction"].map((k) => [k, "actions"]),
  ...["vl", "variation_vl", "opcvm", "perf_origine"].map((k) => [k, "fonds"]),
  ...["ticket", "commission", "rendement_cours", "compte_titres"].map((k) => [k, "ordres"]),
]) as Record<string, GlossGroup>;
const GROUP_LABEL: Record<GlossGroup, string> = { acteurs: "Les acteurs du marché", dette: "Titres de dette", actions: "Actions et sociétés", fonds: "Fonds", ordres: "Le Guichet et vos ordres", etats: "Les états d'une ligne", autres: "Autres" };
const GROUP_ORDER: GlossGroup[] = ["acteurs", "dette", "actions", "fonds", "ordres", "etats", "autres"];
export const groupOf = (k: string): GlossGroup => (k.startsWith("etat_") ? "etats" : (GROUP_OF[k] ?? "autres"));

export function Glossary({ entries }: { entries: GlossEntry[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"alpha" | "group">("alpha");
  const [only, setOnly] = useState<GlossGroup | "">("");

  const shown = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const list = entries.filter((e) => (!only || groupOf(e.k) === only) && words.every((w) => fold(`${e.short} ${e.long ?? ""} ${e.text} ${e.k.replace(/_/g, " ")}`).includes(w)));
    const byAlpha = (a: GlossEntry, b: GlossEntry) => a.short.localeCompare(b.short, "fr");
    return sort === "group" ? [...list].sort((a, b) => GROUP_ORDER.indexOf(groupOf(a.k)) - GROUP_ORDER.indexOf(groupOf(b.k)) || byAlpha(a, b)) : [...list].sort(byAlpha);
  }, [entries, q, sort, only]);
  const groups = sort === "group" ? GROUP_ORDER.map((g) => ({ g, items: shown.filter((e) => groupOf(e.k) === g) })).filter((x) => x.items.length) : [{ g: null as GlossGroup | null, items: shown }];
  const counts = GROUP_ORDER.map((g) => [g, entries.filter((e) => groupOf(e.k) === g).length] as const).filter(([, n]) => n > 0);

  return (
    <div className={styles.wrap} data-coach="info-glossaire">
      <div className={styles.bar}>
        <label className={styles.search}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Un mot du glossaire… ex. coupon, VL, PER")} aria-label={t("Rechercher dans le glossaire")} />
        </label>
        <div className={styles.tiles} role="group" aria-label={t("Catégorie")}>
          <button type="button" className={only === "" ? styles.on : ""} aria-pressed={only === ""} onClick={() => setOnly("")}>
            {t("Tous")} · {entries.length}
          </button>
          {counts.map(([g, n]) => (
            <button key={g} type="button" className={only === g ? styles.on : ""} aria-pressed={only === g} onClick={() => setOnly(only === g ? "" : g)}>
              {t(GROUP_LABEL[g])} · {n}
            </button>
          ))}
        </div>
        <label className={styles.opt}>
          {t("Tri")}
          <span className={styles.seg} role="group">
            <button type="button" className={sort === "alpha" ? styles.on : ""} aria-pressed={sort === "alpha"} onClick={() => setSort("alpha")}>
              A → Z
            </button>
            <button type="button" className={sort === "group" ? styles.on : ""} aria-pressed={sort === "group"} onClick={() => setSort("group")}>
              {t("par catégorie")}
            </button>
          </span>
        </label>
      </div>
      <div className={styles.count}>
        <b>{shown.length}</b> {t(shown.length > 1 ? "mots" : "mot")}
        {q || only ? ` ${t("correspondant aux filtres")}` : ""}
      </div>
      {groups.map(({ g, items }) => (
        <section key={g ?? "all"} className={styles.group}>
          {g && <h3 className={styles.groupTitle}>{t(GROUP_LABEL[g])}</h3>}
          <div className={styles.gloss}>
            {items.map((e) => (
              <div key={e.k} id={`terme-${e.k}`} className={styles.term}>
                <b>{e.long ? `${e.short} : ${e.long}` : e.short}</b>
                {!g && <small className={styles.tag}>{t(GROUP_LABEL[groupOf(e.k)])}</small>}
                <p>{e.text}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
      {shown.length === 0 && <div className="empty">{t("Aucun mot ne correspond.")}</div>}
    </div>
  );
}
