"use client";

import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LIST_ORDER_KEY, rememberedListUrl, type ListMemory, type ListPeek } from "@/components/ListNav";
import { neighbourReading } from "@/app/offres/[id]/neighbour";
import styles from "./SwipePager.module.css";

/**
 * On the phone a page has neighbours: a fiche is one card in the reader's
 * list (the next and previous lines), the Titres list has the Fonds list at
 * its side. A sideways drag follows the finger, the neighbour peeks in, and
 * past a third of the screen (or with a flick) the page snaps to it. Taps
 * (the arrows of the list bar, the tabs) stay for those who prefer them.
 * Under 760 px only; above, plain children. The first time, the page steps
 * aside on its own for a moment so the neighbour shows on the edge.
 *
 * What the gesture leaves alone: the first 22 px of the left edge (the
 * system's back swipe), anything that scrolls sideways (tables, chip rows),
 * charts and sliders (they own their own drag), form fields, and a drag whose
 * first 10 px go up or down (the page scrolls).
 */
const EDGE = 22;
const SLOP = 10;
const COMMIT = 0.3; // of the width
const FLICK = 0.6; // px / ms
const EXIT = 180; // ms : la sortie, et l'instant où la page suivante est demandée

export interface Neighbour {
  href: string;
  title: string;
  pos: string; // "3 / 12", "Fonds · 6"
  peek?: ListPeek; // le haut de sa fiche, quand la liste le connaît
}

function ownsDrag(target: HTMLElement, root: HTMLElement): boolean {
  let el: HTMLElement | null = target;
  while (el && el !== root) {
    if (el.matches("svg, canvas, input, textarea, select, [role=slider], [data-noswipe], [role=dialog]")) return true;
    const cs = getComputedStyle(el);
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Précharger pour de bon.
 *
 * `router.prefetch(href)` ne rapporte presque rien sur une fiche : la route
 * est rendue à chaque requête, et le préchargement par défaut ne va chercher
 * que la coquille. Mesuré : 1 595 octets, contre 9 908 pour la charge que la
 * navigation lit vraiment. Le voisin était donc annoncé mais pas prêt, et le
 * glissement attendait la page entière : trois quarts de seconde à une
 * seconde, chaque fois.
 *
 * « full » demande cette charge complète. Le glissement tombe alors à une
 * vingtaine de millisecondes, parce qu'il n'y a plus rien à attendre.
 *
 * Ce que cela coûte : chaque fiche ouverte fait rendre ses deux voisines au
 * serveur, qu'on y aille ou non. C'est le prix d'une lecture instantanée, et
 * il se reprendrait en ne préchargeant que la suivante.
 *
 * La charge préchargée reste réutilisable cinq minutes (`staleTimes.static`).
 * Les cours et les VL changent une fois par jour : cinq minutes ne se voient
 * pas. L'étoile d'une ligne suivie, elle, peut retarder d'autant.
 */
const FULL = { kind: "full" } as const;
// Le type public de `router.prefetch` n'expose pas encore l'option ; la valeur, elle, est bien celle que Next attend.
type Prefetcher = { prefetch: (href: string, options?: typeof FULL) => void };

export function SwipePager({ id, prev: prevProp, next: nextProp, hintKey, hints, children }: { id?: string; prev?: Neighbour; next?: Neighbour; hintKey: string; hints: { next: string; prev: string }; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLDivElement>(null);
  // The reader's list, read once the page is on the client (the raw string is stable, parsing it is cheap).
  const raw = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(LIST_ORDER_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const mem = useMemo(() => {
    if (!id) return null;
    try {
      const m = raw ? (JSON.parse(raw) as ListMemory) : null;
      const i = m ? m.ids.indexOf(id) : -1;
      return m && i >= 0 ? { mem: m, i } : null;
    } catch {
      return null;
    }
  }, [raw, id]);
  const [bodies, setBodies] = useState<Record<string, React.ReactNode>>({});
  const [hint, setHint] = useState(false);
  const [nudge, setNudge] = useState(false);
  // The neighbours: from the list memory for a fiche, from the page otherwise.
  const prev: Neighbour | null = id ? (mem && mem.i > 0 ? { href: `/offres/${mem.mem.ids[mem.i - 1]}`, title: mem.mem.titles?.[mem.i - 1] ?? "", pos: `${mem.i} / ${mem.mem.ids.length}`, peek: mem.mem.peeks?.[mem.i - 1] } : null) : (prevProp ?? null);
  const next: Neighbour | null = id ? (mem && mem.i < mem.mem.ids.length - 1 ? { href: `/offres/${mem.mem.ids[mem.i + 1]}`, title: mem.mem.titles?.[mem.i + 1] ?? "", pos: `${mem.i + 2} / ${mem.mem.ids.length}`, peek: mem.mem.peeks?.[mem.i + 1] } : null) : (nextProp ?? null);
  // A list neighbour opens as it was last shown: same filters, same sort, and its own scroll comes back with it.
  const resolve = (n: Neighbour | null) => (n ? (id ? n.href : (rememberedListUrl(n.href) ?? n.href)) : null);
  const prevHref = resolve(prev);
  const nextHref = resolve(next);
  const ready = id ? Boolean(mem) : true;

  /**
   * Les deux fiches voisines, rendues et gardées.
   *
   * Demandées à l'ouverture et non au geste : quand le doigt part, elles sont
   * déjà là, et c'est la vraie lecture qui glisse, pas une vignette. Seules les
   * fiches en ont : le Guide, qui passe d'une leçon à l'autre par le même
   * composant, garde sa vignette.
   */
  const wantIds = useMemo(() => (id ? [prevHref, nextHref].map((h) => h?.split("/").pop()).filter((x): x is string => Boolean(x)) : []), [id, prevHref, nextHref]);
  const asked = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!ready || !window.matchMedia("(max-width: 760px)").matches) return;
    for (const nid of wantIds) {
      if (asked.current.has(nid)) continue;
      asked.current.add(nid);
      neighbourReading(nid)
        .then((node) => setBodies((b) => (node ? { ...b, [nid]: node } : b)))
        .catch(() => {
          // la vignette reste : mieux vaut un résumé qu'un trou
          asked.current.delete(nid);
        });
    }
  }, [ready, wantIds]);

  // The neighbours are fetched ahead so the snap lands on a ready page; the first time, the page steps aside and a word says why.
  useEffect(() => {
    if (!ready || !window.matchMedia("(max-width: 760px)").matches) return;
    const ahead = router as unknown as Prefetcher;
    if (prevHref) ahead.prefetch(prevHref, FULL);
    if (nextHref) ahead.prefetch(nextHref, FULL);
    try {
      const key = `guichet:hint:swipe:${hintKey}`;
      if (!localStorage.getItem(key) && (prevHref || nextHref)) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // The key is written when the word shows, not before: a cancelled run (a re-render, StrictMode) leaves a second chance.
        const timers = [
          window.setTimeout(() => {
            localStorage.setItem(key, "1");
            setHint(true);
          }, 900),
          window.setTimeout(() => setHint(false), 4200),
        ];
        if (!reduced) timers.push(window.setTimeout(() => setNudge(true), 800), window.setTimeout(() => setNudge(false), 1900));
        return () => timers.forEach(clearTimeout);
      }
    } catch {
      // storage unavailable
    }
  }, [ready, prevHref, nextHref, hintKey, router]);

  useEffect(() => {
    const el = root.current;
    const card = cur.current;
    if (!el || !card || !ready) return;
    const peekPrev = el.querySelector<HTMLElement>(`.${styles.prev}`);
    const peekNext = el.querySelector<HTMLElement>(`.${styles.next}`);
    let d: { x0: number; y0: number; dx: number; lock: "h" | "v" | null; lastX: number; lastT: number; vx: number } | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // « exit » est la sortie d'un glissement abouti : plus courte que le suivi du doigt,
    // et de la même durée que l'attente avant de demander la page, pour qu'elle finisse
    // son chemin au lieu d'être arrachée aux trois quarts.
    const place = (dx: number, anim: boolean, exit = false) => {
      const w = el.clientWidth;
      [card, peekPrev, peekNext].forEach((c) => {
        c?.classList.toggle(styles.anim, anim && !reduced && !exit);
        c?.classList.toggle(styles.exit, anim && !reduced && exit);
      });
      card.style.transform = dx ? `translateX(${dx}px)` : "";
      if (peekPrev) peekPrev.style.transform = `translateX(${-w + dx}px)`;
      if (peekNext) peekNext.style.transform = `translateX(${w + dx}px)`;
    };
    const onStart = (e: TouchEvent) => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      const tch = e.touches[0];
      if (tch.clientX < EDGE || ownsDrag(e.target as HTMLElement, el)) return;
      d = { x0: tch.clientX, y0: tch.clientY, dx: 0, lock: null, lastX: tch.clientX, lastT: performance.now(), vx: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (!d) return;
      const tch = e.touches[0];
      const dx = tch.clientX - d.x0;
      const dy = tch.clientY - d.y0;
      if (!d.lock) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        d.lock = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
        if (d.lock === "h") el.classList.add(styles.dragging);
      }
      if (d.lock !== "h") return;
      if (e.cancelable) e.preventDefault();
      const atEnd = (dx > 0 && !prevHref) || (dx < 0 && !nextHref);
      d.dx = atEnd ? dx * 0.25 : dx * 0.92; // a rubber band at the ends
      // Past the commit point the neighbour says so: let go and it opens.
      const w0 = el.clientWidth;
      peekNext?.classList.toggle(styles.ready, dx < 0 && Math.abs(d.dx) > w0 * COMMIT);
      peekPrev?.classList.toggle(styles.ready, dx > 0 && Math.abs(d.dx) > w0 * COMMIT);
      const now = performance.now();
      d.vx = (tch.clientX - d.lastX) / Math.max(1, now - d.lastT);
      d.lastX = tch.clientX;
      d.lastT = now;
      place(d.dx, false);
    };
    const onEnd = () => {
      if (!d) return;
      const done = d;
      d = null;
      if (done.lock !== "h") return;
      peekNext?.classList.remove(styles.ready);
      peekPrev?.classList.remove(styles.ready);
      const w = el.clientWidth;
      const dir = done.dx < 0 ? 1 : -1;
      const target = dir > 0 ? nextHref : prevHref;
      const commit = target && (Math.abs(done.dx) > w * COMMIT || Math.abs(done.vx) > FLICK);
      if (commit) {
        // La vignette du voisin finit son chemin jusqu'au centre : c'est elle, et elle
        // seule, qui fait le mouvement. La page qui arrive prend ensuite sa place sans
        // rien rejouer. Elle glissait auparavant depuis le bord à son tour, refaisant le
        // trajet que la vignette venait de faire : on voyait une page presque vide entrer,
        // puis la vraie entrer par-dessus, deux fois le même geste.
        place(-dir * w, true, true);
        try {
          navigator.vibrate?.(8);
        } catch {
          // haptics unavailable
        }
        window.setTimeout(() => router.push(target), reduced ? 0 : EXIT);
      } else {
        place(0, true);
        window.setTimeout(() => el.classList.remove(styles.dragging), 280);
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ready, prevHref, nextHref, router]);

  // The step aside goes towards the next neighbour, or the previous one when there is no next.
  const nudgeDir = nudge ? (nextHref ? "next" : prevHref ? "prev" : null) : null;
  // La vraie page voisine, quand elle est arrivée : la vignette lui laisse alors toute la place,
  // sans marge à elle, pour que rien ne bouge au moment où la page prend le relais.
  const prevBody = bodies[prevHref?.split("/").pop() ?? ""];
  const nextBody = bodies[nextHref?.split("/").pop() ?? ""];
  return (
    <div ref={root} className={styles.pager}>
      <div ref={cur} className={`${styles.cur} ${nudgeDir === "next" ? styles.nudgeNext : nudgeDir === "prev" ? styles.nudgePrev : ""}`}>
        {children}
      </div>
      {ready && prev && (
        <div className={`${styles.peek} ${styles.prev} ${prevBody ? styles.peekFull : ""} ${nudgeDir === "prev" ? styles.nudgePrevIn : ""}`} aria-hidden="true">
          <PeekBody n={prev} pos={`← ${prev.pos}`} go={t("Relâchez pour ouvrir")} body={prevBody} />
        </div>
      )}
      {ready && next && (
        <div className={`${styles.peek} ${styles.next} ${nextBody ? styles.peekFull : ""} ${nudgeDir === "next" ? styles.nudgeNextIn : ""}`} aria-hidden="true">
          <PeekBody n={next} pos={`${next.pos} →`} go={t("Relâchez pour ouvrir")} body={nextBody} />
        </div>
      )}
      <div className={`${styles.hint} ${hint ? styles.hintOn : ""}`} role="status">
        {t(nextHref ? hints.next : hints.prev)}
      </div>
    </div>
  );
}

/**
 * Ce que le doigt tire : le haut de la fiche voisine.
 *
 * Le cachet, le titre, l'émetteur, le chiffre de tête. C'est exactement ce que
 * la vraie page montre en premier, si bien qu'au relâchement elle ne remplace
 * pas une carte vide : elle complète ce qu'on lisait déjà.
 *
 * Une liste d'une autre session n'a peut-être rien de tout cela : le titre
 * seul reste alors, comme avant.
 */
function PeekBody({ n, pos, go, body }: { n: Neighbour; pos: string; go: string; body?: React.ReactNode }) {
  const p = n.peek;
  // La vraie lecture est là : elle remplace le résumé, et rien ne s'ajoute par-dessus.
  // Sa barre de retour porte déjà « 2 / 45 » et « Suivante » : un second repère aurait
  // disparu au relâchement, puisque la vraie page ne l'a pas.
  if (body) return <div className={styles.peekPage}>{body}</div>;
  return (
    <div className={styles.peekBody}>
      <span className={styles.peekPos}>{pos}</span>
      {p?.stamp && <span className={`pill ${p.tone ?? ""}`}>{p.stamp}</span>}
      <b>{n.title}</b>
      {p?.sub && <span className={styles.peekSub}>{p.sub}</span>}
      {p?.hero && (
        <span className={`${styles.peekHero} ${p.gold ? styles.peekGold : ""}`}>
          <em>{p.hero}</em>
          {p.unit && <i>{p.unit}</i>}
        </span>
      )}
      <span className={styles.peekGo}>{go}</span>
    </div>
  );
}
