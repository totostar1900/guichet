"use client";

import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { toggleWatch } from "@/app/offres/[id]/actions";
import styles from "./LineMenu.module.css";

/**
 * The « ··· » of a line: the same five actions wherever the line appears (a
 * card, a row of the table, the fiche itself), in a bottom sheet on the phone
 * and a small dialog on a desk.
 * « Déclarer une intention » is deliberately not here: it stays a visible
 * button, never a menu item.
 */
export interface LineRef {
  id: string;
  title: string;
  isin: string;
  sub?: string; // issuer · the number, under the title of the sheet
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function LineMenu({ line, watching, onFiche = true, pdf, className }: { line: LineRef; watching?: boolean; onFiche?: boolean; pdf?: boolean; className?: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [onState, setOn] = useState<boolean | null>(null);
  const on = onState ?? Boolean(watching);
  const [pending, start] = useTransition();
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);
  // The sheet is a portal: only once the page is on the client.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const close = useCallback(() => setOpen(false), []);
  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const href = `/offres/${line.id}`;
  const url = () => `${window.location.origin}${href}`;
  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      say(done);
    } catch {
      // No clipboard permission: the old way, and failing that, the value itself to read off the screen.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      say(ok ? done : text);
    }
  };
  const act = async (what: string) => {
    close();
    if (what === "fiche") router.push(href);
    else if (what === "comparer") router.push(`/comparer?a=${line.id}`);
    else if (what === "pdf") window.open(`${href}/fiche`, "_blank", "noopener");
    else if (what === "isin") await copy(line.isin, t("ISIN copié"));
    else if (what === "partager") {
      const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
      if (nav.share) {
        try {
          await nav.share({ title: line.title, url: url() });
        } catch {
          // dismissed
        }
      } else await copy(url(), t("Lien copié"));
    } else if (what === "suivre") {
      start(async () => {
        const next = !on;
        const res = await toggleWatch(line.id, next);
        if (res.ok) {
          setOn(res.watching);
          say(t(res.watching ? "Ligne suivie : vous êtes prévenu à chaque changement" : "Ligne retirée du suivi"));
        } else router.push(`/connexion?next=${encodeURIComponent(href)}`);
      });
    }
  };

  // Pull the sheet down to close it.
  const onTouchStart = (e: React.TouchEvent) => {
    drag.current = { y0: e.touches[0].clientY, dy: 0 };
    sheet.current?.classList.add(styles.drag);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y0);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onTouchEnd = () => {
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    sheet.current?.classList.remove(styles.drag);
    if (sheet.current) sheet.current.style.transform = "";
    if (dy > 80) close();
  };

  const items: [string, string, string, string?][] = [
    ...(onFiche ? [["fiche", "Voir la fiche", "M4 5h16v14H4z M8 9h8 M8 13h5"] as [string, string, string]] : []),
    ["suivre", on ? "Ne plus suivre" : "Suivre", "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z", on ? "alertes actives sur cette ligne" : "prévenu à chaque changement"],
    ["comparer", "Comparer avec…", "M4 6h7v12H4z M13 6h7v12h-7z"],
    ["partager", "Partager le lien", "M12 3v12 M8 7l4-4 4 4 M5 13v6h14v-6"],
    ["isin", "Copier l'ISIN", "M8 4h9l3 3v13H8z M5 8v12h10", line.isin],
    ...(pdf ? [["pdf", "Fiche PDF", "M6 3h9l4 4v14H6z M9 12h6 M9 16h6"] as [string, string, string]] : []),
  ];

  return (
    <>
      <button type="button" className={`${styles.dots} ${className ?? ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("Plus d'actions")}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {mounted &&
        createPortal(
          <>
            <div className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`} onClick={close} aria-hidden="true" />
            <div ref={sheet} className={`${styles.sheet} ${open ? styles.sheetOpen : ""}`} role="dialog" aria-modal="true" aria-label={t("Actions sur cette ligne")} aria-hidden={!open} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <div className={styles.grab} />
              <div className={styles.title}>{line.title}</div>
              {line.sub && <div className={styles.sub}>{line.sub}</div>}
              {items.map(([k, label, d, small]) => (
                <button key={k} type="button" className={styles.action} onClick={() => act(k)} disabled={k === "suivre" && pending}>
                  <Icon d={d} />
                  <span>{t(label)}</span>
                  {small && <small>{k === "isin" ? small : t(small)}</small>}
                </button>
              ))}
              <button type="button" className={styles.cancel} onClick={close}>
                {t("Fermer")}
              </button>
            </div>
            <div className={`${styles.toast} ${toast ? styles.toastOn : ""}`} role="status" aria-live="polite">
              {toast}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
