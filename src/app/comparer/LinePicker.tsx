"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/** One line as the picker shows it — computed on the server, flat. */
export interface PickLine {
  id: string;
  title: string;
  family: string; // product family label (OTA, BTA, Action cotée…)
  segment: "primaire" | "secondaire" | "fonds";
  issuer: string;
  country: string;
  yieldText: string; // « 6,25 % » or « — »
  status: string;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * The picker of one side of the comparison: a button that opens a panel with
 * a type-in field, a market chip row and a family row that narrow the list,
 * and the lines left. Keyboard: arrows, Enter, Escape. Works in the form
 * through a hidden input, and submits the form as soon as both sides are set.
 */
export function LinePicker({ name, lines, value, label, segments }: { name: string; lines: PickLine[]; value: string; label: string; segments: Record<PickLine["segment"], string> }) {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(value);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<PickLine["segment"] | "">("");
  const [fam, setFam] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const hidden = useRef<HTMLInputElement>(null);

  const families = useMemo(() => [...new Set(lines.filter((l) => !seg || l.segment === seg).map((l) => l.family))], [lines, seg]);
  const shown = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return lines.filter((l) => (!seg || l.segment === seg) && (!fam || l.family === fam) && words.every((w) => fold(`${l.title} ${l.issuer} ${l.country} ${l.family}`).includes(w)));
  }, [lines, q, seg, fam]);
  const current = lines.find((l) => l.id === cur);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (l: PickLine) => {
    setCur(l.id);
    setOpen(false);
    setQ("");
    // Both sides chosen → compare right away, no extra click.
    const form = hidden.current?.form;
    if (form) {
      const other = form.querySelector<HTMLInputElement>(`input[name="${name === "a" ? "b" : "a"}"]`);
      if (other?.value && other.value !== l.id) queueMicrotask(() => form.requestSubmit());
    }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(shown.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className={`${styles.picker} ${open ? styles.pickerOpen : ""}`} ref={box}>
      <input type="hidden" name={name} value={cur} ref={hidden} />
      <span className={styles.pickLabel}>{label}</span>
      <button type="button" className={styles.pickBtn} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
        {current ? (
          <span className={styles.pickCur}>
            <b>{current.title}</b>
            <small>
              {t(current.family)} · {current.issuer} · {current.yieldText}
            </small>
          </span>
        ) : (
          <span className={styles.pickEmpty}>{t("choisir une ligne")}</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className={styles.panel} id={`${id}-panel`} role="dialog" aria-label={label}>
          <label className={styles.pickSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={input}
              type="search"
              value={q}
              placeholder={t("Un titre, un émetteur, un pays…")}
              aria-label={t("Rechercher")}
              autoComplete="off"
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
            />
          </label>
          <div className={styles.chips} role="group" aria-label={t("Marché")}>
            <button type="button" className={`${styles.chip} ${seg === "" ? styles.chipOn : ""}`} onClick={() => setSeg("")}>
              {t("Tous")}
            </button>
            {(Object.keys(segments) as PickLine["segment"][])
              .filter((s) => lines.some((l) => l.segment === s))
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.chip} ${seg === s ? styles.chipOn : ""}`}
                  aria-pressed={seg === s}
                  onClick={() => {
                    setSeg(seg === s ? "" : s);
                    setFam("");
                    setActive(0);
                  }}
                >
                  {t(segments[s])}
                </button>
              ))}
          </div>
          {families.length > 1 && (
            <div className={styles.chips} role="group" aria-label={t("Instrument")}>
              {families.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.chip} ${styles.chipSm} ${fam === f ? styles.chipOn : ""}`}
                  aria-pressed={fam === f}
                  onClick={() => {
                    setFam(fam === f ? "" : f);
                    setActive(0);
                  }}
                >
                  {t(f)}
                </button>
              ))}
            </div>
          )}
          <div className={styles.list} role="listbox">
            {shown.map((l, i) => (
              <button key={l.id} type="button" role="option" aria-selected={l.id === cur} className={`${styles.opt} ${i === active ? styles.optOn : ""} ${l.id === cur ? styles.optCur : ""}`} onMouseEnter={() => setActive(i)} onClick={() => choose(l)}>
                <span className={styles.optBody}>
                  <b>{l.title}</b>
                  <small>
                    {t(l.family)} · {l.issuer} · {l.country} · {t(l.status)}
                  </small>
                </span>
                <span className={styles.optYield}>{l.yieldText}</span>
              </button>
            ))}
            {shown.length === 0 && <div className={styles.optEmpty}>{t("Aucune ligne ne correspond.")}</div>}
          </div>
          <div className={styles.panelFoot}>
            {shown.length} / {lines.length} {t("lignes")}
          </div>
        </div>
      )}
    </div>
  );
}
