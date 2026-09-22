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
 * hidden input. The list opens anchored under the box (above it when the
 * room is below), measured against the visual viewport so a keyboard never
 * hides it ; the keyboard itself only comes when asked : a short list is
 * two taps, the magnifier (or typing on a keyboard) turns on the field.
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
  // the field is earned, not automatic : on a phone it appears on the magnifier ; on a desktop it is focused for long lists only
  const [typing, setTyping] = useState(false);
  const [place, setPlace] = useState<{ up: boolean; maxH: number; right: boolean }>({ up: false, maxH: 320, right: false });
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
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vv = window.visualViewport;
    const top = vv ? vv.offsetTop : 0;
    const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const width = vv ? vv.width : window.innerWidth;
    const below = bottom - r.bottom - 12;
    const above = r.top - top - 12;
    const up = below < 180 && above > below;
    setPlace({ up, maxH: Math.max(120, Math.min(320, (up ? above : below))), right: r.left + Math.max(r.width, 220) > width - 8 });
  };
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
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
    measure();
    setQuery(typed);
    setTyping(Boolean(typed) || (!phone && selectable.length > 12));
    setActive(typed ? 0 : Math.max(0, selectable.findIndex((o) => o.value === cur)));
    setOpen(true);
  };
  const closeMenu = () => {
    setOpen(false);
    setQuery("");
    setTyping(false);
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
      autoFocus={typing}
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
        <div className={`${styles.selBtn} ${styles.selHas}`} onClick={() => setTyping(true)}>
          {label && <span className={styles.selLabel}>{label}</span>}
          <span className={styles.selValue}>{typing ? field : current?.label ?? placeholder ?? "—"}</span>
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
        <div className={`${styles.selMenu} ${place.up ? styles.selUp : ""} ${place.right ? styles.selRight : ""}`} id={`${id}-list`} ref={listRef} style={{ maxHeight: place.maxH }}>
          {phone && (
            <div className={styles.selHead}>
              {typing ? (
                field
              ) : (
                <span className={styles.selHeadLabel}>{label ?? placeholder ?? t("{n} choix", { n: String(selectable.length) })}</span>
              )}
              <button type="button" className={styles.selIcon} onClick={() => setTyping((v) => !v)} aria-label={t("Chercher dans la liste")} aria-pressed={typing}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
              <button type="button" className={styles.selIcon} onClick={closeMenu} aria-label={t("Fermer")}>
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
