"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./ui.module.css";

/**
 * The app's own select : the same menu on a phone and on a desktop, instead of
 * the device's picker. Single value, keyboard-driven (arrows, Enter, Escape,
 * type-ahead on the first letter), works as a form field through a hidden input.
 */
export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  /** Group heading (rendered, not selectable) when set on an option with an empty value. */
  group?: boolean;
}

export function Select({ value, options, onChange, label, name, placeholder, compact, block, className = "", disabled, required }: { value: string; options: SelectOption[]; onChange?: (v: string) => void; label?: string; name?: string; placeholder?: string; compact?: boolean; block?: boolean; className?: string; disabled?: boolean; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(value);
  const cur = onChange ? value : inner;
  const set = (v: string) => {
    if (onChange) onChange(v);
    else setInner(v);
  };
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const selectable = options.filter((o) => !o.group);
  const current = selectable.find((o) => o.value === cur);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelectorAll<HTMLElement>("[role=option]")[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const idx = Math.max(0, selectable.findIndex((o) => o.value === cur));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(idx);
        return;
      }
      const n = (active < 0 ? idx : active) + (e.key === "ArrowDown" ? 1 : -1);
      setActive(Math.min(selectable.length - 1, Math.max(0, n)));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && active >= 0) {
        set(selectable[active].value);
        setOpen(false);
      } else setOpen(!open);
    } else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Home" && open) setActive(0);
    else if (e.key === "End" && open) setActive(selectable.length - 1);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const from = open && active >= 0 ? active + 1 : 0;
      const hit = [...selectable.slice(from), ...selectable.slice(0, from)].find((o) => o.label.toLowerCase().startsWith(k));
      if (hit) {
        if (open) setActive(selectable.indexOf(hit));
        else set(hit.value);
      }
    }
  };

  return (
    <div className={`${styles.sel} ${compact ? styles.selCompact : ""} ${block ? styles.selBlock : ""} ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={cur} required={required} />}
      <button
        type="button"
        className={`${styles.selBtn} ${cur ? styles.selHas : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          setActive(Math.max(0, selectable.findIndex((o) => o.value === cur)));
        }}
        onKeyDown={onKey}
      >
        {label && <span className={styles.selLabel}>{label}</span>}
        <span className={styles.selValue}>{current?.label ?? placeholder ?? "—"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className={styles.selMenu} role="listbox" id={`${id}-list`} ref={listRef} aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}>
          {options.map((o) => {
            if (o.group)
              return (
                <div key={`g-${o.label}`} className={styles.selGroup}>
                  {o.label}
                </div>
              );
            const i = selectable.indexOf(o);
            return (
              <div
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.value === cur}
                className={`${styles.selItem} ${i === active ? styles.selActive : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  set(o.value);
                  setOpen(false);
                }}
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
      )}
    </div>
  );
}
