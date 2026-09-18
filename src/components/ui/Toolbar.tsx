"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./ui.module.css";
import { Select, type SelectOption } from "./Select";
import { useT } from "@/i18n/client";

/**
 * One filter row for a list: search · chips · selects · (right) sort, all on a
 * single line, state kept in the URL so a view can be shared and comes back.
 * Server pages read the same query keys to filter their rows.
 */
export interface ToolbarChip {
  value: string;
  label: string;
  count?: number;
}
export interface ToolbarSelect {
  key: string;
  label: string;
  options: SelectOption[];
  /** Label of the « all » option (value ""), shown first. */
  all?: string;
}

export function Toolbar({ searchKey = "q", placeholder = "Rechercher", chipKey, chips, selects = [], sort, sticky, inset, children }: { searchKey?: string | null; placeholder?: string; chipKey?: string; chips?: ToolbarChip[]; selects?: ToolbarSelect[]; sort?: ToolbarSelect; sticky?: boolean; inset?: boolean; children?: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const keys = [searchKey, chipKey, ...selects.map((s) => s.key)].filter((k): k is string => Boolean(k));
  const active = keys.filter((k) => sp.get(k)).length;
  const chipCur = chipKey ? (sp.get(chipKey) ?? "") : "";

  return (
    <div className={`${styles.bar} ${sticky ? styles.barSticky : ""} ${inset ? styles.barInset : ""}`} role="search">
      {searchKey && (
        <label className={styles.search}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder={placeholder} aria-label={placeholder} defaultValue={sp.get(searchKey) ?? ""} onChange={(e) => update({ [searchKey]: e.target.value || undefined })} />
        </label>
      )}
      {chips && chipKey && (
        <>
          <span className={styles.sep} />
          <div className={styles.chips} role="group" aria-label="Filtre">
            {chips.map((c) => (
              <button key={c.value} type="button" className={`${styles.chip} ${chipCur === c.value ? styles.chipOn : ""}`} aria-pressed={chipCur === c.value} onClick={() => update({ [chipKey]: c.value || undefined })}>
                {c.label}
                {c.count != null && <b>{c.count}</b>}
              </button>
            ))}
          </div>
        </>
      )}
      {selects.length > 0 && <span className={styles.sep} />}
      {selects.map((s) => (
        <Select key={s.key} compact label={s.label} value={sp.get(s.key) ?? ""} options={[{ value: "", label: t(s.all ?? "toutes") }, ...s.options]} onChange={(v) => update({ [s.key]: v || undefined })} />
      ))}
      {children}
      <div className={styles.right}>
        {active > 0 && (
          <button type="button" className={styles.clear} onClick={() => update(Object.fromEntries(keys.map((k) => [k, undefined])))}>
            {t("Effacer")}
          </button>
        )}
        {sort && <Select compact label={sort.label} value={sp.get(sort.key) ?? sort.options[0]?.value ?? ""} options={sort.options} onChange={(v) => update({ [sort.key]: v })} />}
      </div>
    </div>
  );
}
