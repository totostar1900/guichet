"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fold } from "@/lib/text";
import { useT } from "@/i18n/client";
import styles from "./ui.module.css";

/**
 * The app's own select, one box that does it all : closed, it shows the
 * value ; open, the same box becomes a search field with the whole list
 * under it, every entry shown until something is typed, then the list
 * narrows as you type (accents ignored, label and hint searched). Single
 * value, keyboard-driven (arrows, Enter, Escape), a form field through a
 * hidden input. On a phone the list opens as a sheet with the field on top.
 */
export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  /** Group heading (rendered, not selectable) when set on an option with an empty value. */
  group?: boolean;
}

const PHONE = "(max-width: 760px)";

export function Select({ value, options, onChange, label, name, placeholder, compact, block, className = "", disabled, required }: { value: string; options: SelectOption[]; onChange?: (v: string) => void; label?: string; name?: string; placeholder?: string; compact?: boolean; block?: boolean; className?: string; disabled?: boolean; required?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(value);
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState(false);
  const cur = onChange ? value : inner;
  const set = (v: string) => {
    if (onChange) onChange(v);
    else setInner(v);
  };
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const selectable = options.filter((o) => !o.group);
  const current = selectable.find((o) => o.value === cur);
  // the list as typed : every entry when nothing is typed, a group heading only when one of its entries matches
  const q = fold(query.trim());
  const matches = (o: SelectOption) => !q || fold(o.label).includes(q) || (o.hint ? fold(o.hint).includes(q) : false);
  const shown: SelectOption[] = [];
  options.forEach((o, i) => {
    if (o.group) {
      const next = options.slice(i + 1);
      const end = next.findIndex((x) => x.group);
      if (next.slice(0, end < 0 ? undefined : end).some(matches)) shown.push(o);
    } else if (matches(o)) shown.push(o);
  });
  const visible = shown.filter((o) => !o.group);

  useEffect(() => {
    const m = window.matchMedia(PHONE);
    const on = () => setPhone(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelectorAll<HTMLElement>("[role=option]")[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  const openMenu = (typed = "") => {
    setQuery(typed);
    setActive(typed ? 0 : Math.max(0, selectable.findIndex((o) => o.value === cur)));
    setOpen(true);
  };
  const closeMenu = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (v: string) => {
    set(v);
    closeMenu();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const n = (active < 0 ? 0 : active) + (e.key === "ArrowDown" ? 1 : -1);
      setActive(Math.min(visible.length - 1, Math.max(0, n)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && visible[active]) choose(visible[active].value);
      else if (open) closeMenu();
      else openMenu();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    } else if (e.key === "Home" && open) setActive(0);
    else if (e.key === "End" && open) setActive(visible.length - 1);
    else if (e.key === "Tab") closeMenu();
  };

  const field = (
    <input
      ref={inputRef}
      type="text"
      className={styles.selInput}
      value={query}
      placeholder={current?.label ?? placeholder ?? "…"}
      onChange={(e) => {
        setQuery(e.target.value);
        setActive(0);
      }}
      onKeyDown={onKey}
      autoFocus
      aria-autocomplete="list"
      aria-controls={`${id}-list`}
      aria-expanded={open}
      aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
      role="combobox"
      autoComplete="off"
      spellCheck={false}
    />
  );

  return (
    <div className={`${styles.sel} ${compact ? styles.selCompact : ""} ${block ? styles.selBlock : ""} ${open ? styles.selOpen : ""} ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={cur} required={required} />}
      {open && !phone ? (
        <div className={`${styles.selBtn} ${styles.selHas}`}>
          {label && <span className={styles.selLabel}>{label}</span>}
          <span className={styles.selValue}>{field}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
          </div>
      ) : (
        <button
          type="button"
          className={`${styles.selBtn} ${cur ? styles.selHas : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-label={label}
          disabled={disabled}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={(e) => {
            if (open) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openMenu();
            } else if (e.key.length === 1 && /S/.test(e.key)) {
              e.preventDefault();
              openMenu(e.key);
            }
          }}
        >
          {label && <span className={styles.selLabel}>{label}</span>}
          <span className={styles.selValue}>{current?.label ?? placeholder ?? "—"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
          </button>
      )}
      {open && (
        <div className={`${styles.selMenu} ${phone ? styles.selSheet : ""}`} id={`${id}-list`} ref={listRef}>
          {phone && (
            <div className={styles.selSheetHead}>
              {field}
              <button type="button" className={styles.selClose} onClick={closeMenu} aria-label={t("Fermer")}>
                ×
              </button>
            </div>
          )}
          <div role="listbox" aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined} className={styles.selList}>
            {shown.length === 0 && <div className={styles.selNone}>{query ? t("Rien pour « {q} »", { q: query }) : "—"}</div>}
            {shown.map((o) => {
              if (o.group)
                return (
                  <div key={`g-${o.label}`} className={styles.selGroup}>
                    {o.label}
                  </div>
                );
              const i = visible.indexOf(o);
              return (
                <div
                  key={o.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={o.value === cur}
                  className={`${styles.selItem} ${i === active ? styles.selActive : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o.value)}
                >
                  <span>{o.label}</span>
                  {o.hint && <small>{o.hint}</small>}
                  {o.value === cur && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
