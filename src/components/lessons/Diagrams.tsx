"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACTOR_LABEL, Actor, ActorGlyph, type ActorKind } from "../Illustrations";
import styles from "./Diagrams.module.css";
import { useT } from "@/i18n/client";

/**
 * The three diagrams a lesson can carry when its notion is a relationship or
 * a path: the actors map (who does what, who watches whom), the path of an
 * order (where your money is at each step), the lifeline of a security (what
 * falls, when). Drawn once, in the charts' colours; every actor opens its
 * glossary word.
 */
const GLOSS: Partial<Record<ActorKind, string>> = { svt: "svt", gestion: "opcvm", depositaire: "opcvm", tresor: "ota", entreprise: "apes", bvmac: "cours", cosumaf: "apes" };

const SUB: Record<ActorKind, string> = {
  beac: "banque centrale · titres publics",
  cosumaf: "agréments, visas, surveillance",
  bvmac: "la bourse, à Douala",
  depositaire: "le registre des titres",
  tresor: "BTA, OTA, rachats",
  entreprise: "APE, introductions en bourse",
  guichet: "société de bourse : votre guichet",
  svt: "dépose à l'adjudication",
  gestion: "gère le fonds, fixe la VL",
  client: "compte-titres à votre nom",
};

function Node({ kind, x, y, w, focus, scale = 0.55, dark }: { kind: ActorKind; x: number; y: number; w: number; focus?: string[]; scale?: number; dark?: boolean }) {
  const t = useT();
  const dim = Boolean(focus && focus.length && !focus.includes(kind));
  const label = (
    <>
      <ActorGlyph kind={kind} x={x} y={y} scale={scale} dim={dim} />
      <text x={x + 120 * scale + 10} y={y + 26} className={`${styles.name} ${dark ? styles.onDark : ""}`} opacity={dim ? 0.4 : 1}>
        {t(ACTOR_LABEL[kind])}
      </text>
      <text x={x + 120 * scale + 10} y={y + 42} className={`${styles.sub} ${dark ? styles.onDark : ""}`} opacity={dim ? 0.4 : 1}>
        {t(SUB[kind])}
      </text>
      <rect x={x - 4} y={y - 4} width={w} height={120 * scale * 0.75 + 12} fill="transparent" />
    </>
  );
  const g = GLOSS[kind];
  return g ? (
    <Link href={`/info#terme-${g}`} className={styles.node} aria-label={t(ACTOR_LABEL[kind])}>
      {label}
    </Link>
  ) : (
    <g className={styles.node}>{label}</g>
  );
}

/** The map itself, 900 × 440: drawn in the lesson on a desk, and in the phone's fullscreen view. */
function MapSvg({ focus, id }: { focus?: string[]; id: string }) {
  const t = useT();
  return (
    <svg viewBox="0 0 900 440" className={styles.map} role="img" aria-label={t("Carte des acteurs du marché CEMAC")}>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className={styles.arrowHead} />
        </marker>
      </defs>
      <rect x="0" y="0" width="900" height="96" rx="10" className={styles.band} />
      <text x="14" y="20" className={styles.bandTitle}>
        {t("CEUX QUI FIXENT LES RÈGLES ET SURVEILLENT")}
      </text>
      <Node kind="beac" x={14} y={30} w={210} focus={focus} />
      <Node kind="cosumaf" x={236} y={30} w={210} focus={focus} />
      <Node kind="bvmac" x={458} y={30} w={210} focus={focus} />
      <Node kind="depositaire" x={680} y={30} w={210} focus={focus} />

      <rect x="0" y="130" width="270" height="196" rx="10" className={styles.boxIssuers} />
      <text x="14" y="150" className={styles.boxTitle}>
        {t("CEUX QUI EMPRUNTENT")}
      </text>
      <Node kind="tresor" x={14} y={166} w={250} focus={focus} scale={0.45} />
      <Node kind="entreprise" x={14} y={236} w={250} focus={focus} scale={0.45} />

      <rect x="290" y="130" width="320" height="196" rx="10" className={styles.boxMid} />
      <text x="304" y="150" className={styles.boxTitleGold}>
        {t("CEUX QUI PORTENT VOS ORDRES")}
      </text>
      <Node kind="guichet" x={304} y={158} w={300} focus={focus} scale={0.4} />
      <Node kind="svt" x={304} y={212} w={300} focus={focus} scale={0.4} />
      <Node kind="gestion" x={304} y={266} w={300} focus={focus} scale={0.4} />

      <rect x="630" y="130" width="270" height="196" rx="10" className={styles.boxYou} />
      <text x="644" y="150" className={styles.boxTitleLight}>
        {t("VOUS")}
      </text>
      <rect x="644" y="186" width="92" height="70" rx="8" className={styles.clientCard} />
      <Node kind="client" x={650} y={190} w={250} focus={focus} scale={0.65} dark />

      <path d="M270 228 L290 228" className={styles.arrow} markerEnd={`url(#${id})`} />
      <text x="280" y="220" textAnchor="middle" className={styles.arrowLabel}>
        {t("titres")}
      </text>
      <path d="M610 228 L630 228" className={styles.arrowGold} markerEnd={`url(#${id})`} markerStart={`url(#${id})`} />
      <path d="M120 96 L120 130 M340 96 L420 130 M560 96 L520 130 M780 96 L780 130" className={styles.watch} />
      <text x="450" y="118" textAnchor="middle" className={styles.arrowLabel}>
        {t("agréments, règles, surveillance")}
      </text>

      <rect x="0" y="346" width="900" height="92" rx="10" className={styles.band} />
      <text x="14" y="366" className={styles.bandTitle}>
        {t("OÙ VA L'ARGENT · OÙ SONT LES TITRES")}
      </text>
      <foreignObject x="14" y="374" width="872" height="60">
        <p className={styles.bandText}>{t("Votre virement va au compte de l'appel de fonds (jamais ailleurs) → le SVT ou la bourse → l'émetteur. Les titres sont inscrits à votre nom au dépositaire ; les coupons et remboursements font le chemin inverse.")}</p>
      </foreignObject>
    </svg>
  );
}

/** One actor in the phone's stacked map: the drawing, the name (its glossary word when it has one), a line under it. */
function Card({ kind, focus, size = 56, sub }: { kind: ActorKind; focus?: string[]; size?: number; sub?: boolean }) {
  const t = useT();
  const dim = Boolean(focus && focus.length && !focus.includes(kind));
  const g = GLOSS[kind];
  const name = t(ACTOR_LABEL[kind]);
  return (
    <div className={`${styles.card} ${dim ? styles.cardDim : ""}`}>
      <Actor kind={kind} size={size} />
      {g ? (
        <Link href={`/info#terme-${g}`} className={styles.cardName}>
          {name}
        </Link>
      ) : (
        <b className={styles.cardName}>{name}</b>
      )}
      {sub && <small>{t(SUB[kind])}</small>}
    </div>
  );
}

/**
 * The map in fullscreen on the phone: pinch to zoom, drag to move, a
 * double tap between the fit and twice the fit. Portrait shows a line
 * inviting to turn the phone: landscape is the map's own shape.
 */
function MapZoom({ focus, onClose }: { focus?: string[]; onClose: () => void }) {
  const t = useT();
  const view = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const st = useRef({ s: 1, fit: 1, x: 0, y: 0, pointers: new Map<number, { x: number; y: number }>(), dist: 0, lastTap: 0 });
  const [scale, setScale] = useState(1);

  const apply = useCallback(() => {
    const k = st.current;
    if (inner.current) inner.current.style.transform = `translate(${k.x}px, ${k.y}px) scale(${k.s})`;
    setScale(Math.round((k.s / k.fit) * 10) / 10);
  }, []);
  const fit = useCallback(() => {
    const el = view.current;
    if (!el) return;
    const k = st.current;
    k.fit = Math.min((el.clientWidth - 16) / 900, (el.clientHeight - 16) / 440);
    k.s = k.fit;
    k.x = (el.clientWidth - 900 * k.s) / 2;
    k.y = (el.clientHeight - 440 * k.s) / 2;
    apply();
  }, [apply]);

  useEffect(() => {
    fit();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("resize", fit);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("resize", fit);
      document.removeEventListener("keydown", onKey);
    };
  }, [fit, onClose]);

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const k = st.current;
    const s = Math.min(k.fit * 4, Math.max(k.fit, k.s * factor));
    const f = s / k.s;
    k.x = cx - (cx - k.x) * f;
    k.y = cy - (cy - k.y) * f;
    k.s = s;
  };
  const onDown = (e: React.PointerEvent) => {
    const k = st.current;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    k.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (k.pointers.size === 2) {
      const [a, b] = [...k.pointers.values()];
      k.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const k = st.current;
    const p = k.pointers.get(e.pointerId);
    if (!p) return;
    const rect = view.current?.getBoundingClientRect();
    const ox = rect?.left ?? 0;
    const oy = rect?.top ?? 0;
    if (k.pointers.size === 1) {
      k.x += e.clientX - p.x;
      k.y += e.clientY - p.y;
    } else if (k.pointers.size === 2) {
      const other = [...k.pointers.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const dist = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const mx = (e.clientX + other.x) / 2 - ox;
        const my = (e.clientY + other.y) / 2 - oy;
        if (k.dist > 0) zoomAt(dist / k.dist, mx, my);
        k.x += (e.clientX - p.x) / 2;
        k.y += (e.clientY - p.y) / 2;
        k.dist = dist;
      }
    }
    k.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    apply();
  };
  const onUp = (e: React.PointerEvent) => {
    const k = st.current;
    const p = k.pointers.get(e.pointerId);
    k.pointers.delete(e.pointerId);
    k.dist = 0;
    if (!p || k.pointers.size > 0) return;
    // A tap (no move) twice within 300 ms: between the fit and twice the fit, around the finger.
    const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6;
    const now = e.timeStamp;
    if (!moved && now - k.lastTap < 300) {
      const rect = view.current?.getBoundingClientRect();
      const cx = e.clientX - (rect?.left ?? 0);
      const cy = e.clientY - (rect?.top ?? 0);
      if (k.s > k.fit * 1.05) fit();
      else {
        zoomAt(2, cx, cy);
        apply();
      }
      k.lastTap = 0;
    } else k.lastTap = moved ? 0 : now;
  };

  return createPortal(
    <div className={styles.zoom} role="dialog" aria-modal="true" aria-label={t("La carte des acteurs")}>
      <div className={styles.zoomHead}>
        <b>{t("La carte des acteurs")}</b>
        <small>{t("pincer pour zoomer · glisser pour se déplacer")}</small>
        <span className={styles.zoomScale} aria-live="polite">
          ×{scale.toLocaleString("fr-FR")}
        </span>
        <button type="button" className={styles.zoomClose} onClick={onClose} aria-label={t("Fermer")}>
          ×
        </button>
      </div>
      <div ref={view} className={styles.zoomView} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div ref={inner} className={styles.zoomInner}>
          <MapSvg focus={focus} id="dg-arr-zoom" />
        </div>
      </div>
      <p className={styles.turn}>{t("Tournez le téléphone : la carte s'étale sur toute la largeur.")}</p>
    </div>,
    document.body,
  );
}

export function ActorsMap({ focus }: { focus?: string[] }) {
  const t = useT();
  const [zoom, setZoom] = useState(false);
  const dim = (k: ActorKind) => Boolean(focus && focus.length && !focus.includes(k));
  return (
    <div className={styles.wrap}>
      {/* the desk: the map as one drawing */}
      <div className={styles.scroll}>
        <MapSvg focus={focus} id="dg-arr" />
      </div>

      {/* the phone: three bands read from top to bottom, and « Agrandir » */}
      <div className={styles.stack}>
        <div className={styles.stackHead}>
          <b>{t("La carte des acteurs")}</b>
          <button type="button" className={styles.enlarge} onClick={() => setZoom(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
            {t("Agrandir")}
          </button>
        </div>
        <section className={styles.bandBox}>
          <h4>{t("Ceux qui fixent les règles et surveillent")}</h4>
          <div className={styles.four}>
            <Card kind="beac" focus={focus} />
            <Card kind="cosumaf" focus={focus} />
            <Card kind="bvmac" focus={focus} />
            <Card kind="depositaire" focus={focus} />
          </div>
        </section>
        <p className={styles.between}>↓ {t("agréments, règles, surveillance")} ↓</p>
        <div className={styles.pair}>
          <section className={styles.boxA}>
            <h4>{t("Ceux qui empruntent")}</h4>
            <Card kind="tresor" focus={focus} size={44} sub />
            <Card kind="entreprise" focus={focus} size={44} sub />
          </section>
          <section className={styles.boxB}>
            <h4>{t("Ceux qui portent vos ordres")}</h4>
            <Card kind="guichet" focus={focus} size={44} sub />
            <Card kind="svt" focus={focus} size={44} sub />
            <Card kind="gestion" focus={focus} size={44} sub />
          </section>
        </div>
        <p className={styles.between}>↓ {t("titres")} · {t("argent")} ↓</p>
        <section className={`${styles.youBox} ${dim("client") ? styles.cardDim : ""}`}>
          <span className={styles.youPlate}>
            <Actor kind="client" size={64} />
          </span>
          <span>
            <small className={styles.youEyebrow}>{t("Vous")}</small>
            <b>{t("Un compte-titres à votre nom")}</b>
            <small>{t("inscrit chez le dépositaire ; vos titres et votre argent y sont, à votre nom")}</small>
          </span>
        </section>
        <p className={styles.bandTextStack}>
          <b>{t("Où va l'argent, où sont les titres")}</b> : {t("Votre virement va au compte de l'appel de fonds (jamais ailleurs) → le SVT ou la bourse → l'émetteur. Les titres sont inscrits à votre nom au dépositaire ; les coupons et remboursements font le chemin inverse.")}
        </p>
      </div>
      {zoom && <MapZoom focus={focus} onClose={() => setZoom(false)} />}

      <p className={styles.how}>
        <b>{t("Comment lire")}</b> : {t("de gauche à droite, le chemin d'un titre ; de haut en bas, qui surveille qui. Un acteur estompé n'est pas concerné par cette leçon ; un acteur souligné ouvre son mot du glossaire.")}
      </p>
    </div>
  );
}

const STEPS: { n: number; title: string; a: string; b: string; tone: "you" | "market" | "back" }[] = [
  { n: 1, title: "Intention", a: "appétit ou prise ferme", b: "depuis la fiche", tone: "you" },
  { n: 2, title: "Confirmation", a: "un conseiller vous rappelle", b: "montant, prix, date", tone: "you" },
  { n: 3, title: "Transmission", a: "au SVT, à la bourse", b: "ou à la société de gestion", tone: "market" },
  { n: 4, title: "Exécution", a: "adjudication, séance", b: "ou prochaine VL", tone: "market" },
  { n: 5, title: "Servi · non servi", a: "avis de résultat,", b: "appel de fonds", tone: "back" },
  { n: 6, title: "Règlement", a: "virement, avis,", b: "titres à votre nom", tone: "back" },
];

export function OrderPath() {
  const t = useT();
  return (
    <div className={styles.wrap}>
      <ol className={styles.path}>
        {STEPS.map((s) => (
          <li key={s.n} className={`${styles.step} ${styles[s.tone]}`}>
            <span className={styles.num}>{s.n}</span>
            <b>{t(s.title)}</b>
            <small>
              {t(s.a)}
              <br />
              {t(s.b)}
            </small>
          </li>
        ))}
      </ol>
      <div className={styles.keys}>
        <span>
          <i className={styles.kYou}>●</i> {t("vous et votre conseiller")}
        </span>
        <span>
          <i className={styles.kMarket}>●</i> {t("le marché")}
        </span>
        <span>
          <i className={styles.kBack}>●</i> {t("le résultat et l'argent")}
        </span>
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> : {t("six étapes, trois couleurs : ce qui dépend de vous, ce qui dépend du marché, ce qui revient. Sur la fiche d'une ligne, la pastille d'état vous dit à quelle étape vous êtes ; dans Mon espace, chaque intention porte la sienne.")}
      </p>
    </div>
  );
}

export function Lifeline() {
  const t = useT();
  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
      <svg viewBox="0 0 900 210" className={styles.life} role="img" aria-label={t("Ligne de vie d'une OTA et d'un BTA")}>
        <text x="0" y="16" className={styles.lifeTitle}>
          {t("OTA 3 ans · 6,50 % : vous prêtez 10 M, vous touchez 650 000 par an, on vous rend 10 M")}
        </text>
        <path d="M40 60 L860 60" className={styles.base} />
        <rect x="34" y="60" width="12" height="42" className={styles.out} />
        <text x="40" y="118" textAnchor="middle" className={styles.amt}>
          −10,00 M
        </text>
        <text x="40" y="50" textAnchor="middle" className={styles.when}>
          {t("règlement")}
        </text>
        <rect x="307" y="40" width="12" height="20" className={styles.inA} />
        <text x="313" y="34" textAnchor="middle" className={styles.amt}>
          +0,65 M
        </text>
        <rect x="580" y="40" width="12" height="20" className={styles.inA} />
        <text x="586" y="34" textAnchor="middle" className={styles.amt}>
          +0,65 M
        </text>
        <rect x="854" y="6" width="12" height="54" className={styles.inA} />
        <text x="850" y="76" textAnchor="end" className={styles.amt}>
          +10,65 M
        </text>
        <text x="313" y="118" textAnchor="middle" className={styles.when}>
          {t("an 1 · coupon")}
        </text>
        <text x="586" y="118" textAnchor="middle" className={styles.when}>
          {t("an 2 · coupon")}
        </text>
        <text x="860" y="118" textAnchor="end" className={styles.when}>
          {t("an 3 · coupon + capital")}
        </text>
        <text x="0" y="152" className={styles.lifeTitleB}>
          {t("BTA 52 semaines · 5,50 % précompté : vous payez 9,44 M, on vous rend 10 M : l'intérêt est pris d'avance")}
        </text>
        <path d="M40 186 L860 186" className={styles.base} />
        <rect x="34" y="186" width="12" height="12" className={styles.out} />
        <text x="54" y="182" className={styles.amtSmall}>
          −9,44 M {t("au règlement")}
        </text>
        <rect x="854" y="174" width="12" height="12" className={styles.inB} />
        <text x="846" y="182" textAnchor="end" className={styles.amtSmall}>
          +10,00 M {t("à 52 semaines, rien entre les deux")}
        </text>
      </svg>
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> : {t("rouge, ce que vous payez ; bleu, ce qui revient et quand. C'est le calendrier des flux du comparateur, réduit à un titre : vous retrouverez la même image sur la fiche et dans la comparaison.")}
      </p>
    </div>
  );
}

const CATS: { key: string; name: string; what: string; cls: string }[] = [
  { key: "M", name: "Monétaire", what: "titres courts, VL très régulière, sortie sous quelques jours", cls: styles.cM },
  { key: "O", name: "Obligataire", what: "obligations d'États et d'entreprises, coupons, sensible aux taux", cls: styles.cO },
  { key: "D", name: "Diversifié", what: "obligations, actions et trésorerie, arbitrés par la société de gestion", cls: styles.cD },
  { key: "A", name: "Actions", what: "actions cotées : le potentiel et la volatilité les plus élevés", cls: styles.cA },
];

export function FundCategories() {
  const t = useT();
  return (
    <div className={styles.wrap}>
      <div className={styles.cats}>
        <svg viewBox="0 0 120 120" className={styles.pie} aria-hidden="true">
          <path d="M60 60 L60 10 A50 50 0 0 1 110 60 Z" className={styles.cM} />
          <path d="M60 60 L110 60 A50 50 0 0 1 60 110 Z" className={styles.cO} />
          <path d="M60 60 L60 110 A50 50 0 0 1 10 60 Z" className={styles.cD} />
          <path d="M60 60 L10 60 A50 50 0 0 1 60 10 Z" className={styles.cA} />
          <circle cx="60" cy="60" r="18" className={styles.pieHole} />
        </svg>
        <ul className={styles.catList}>
          {CATS.map((c) => (
            <li key={c.key}>
              <i className={c.cls} />
              <b>{t(c.name)}</b>
              <span>{t(c.what)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> : {t("du plus calme au plus mobile, dans le sens des aiguilles d'une montre. La catégorie est écrite sur chaque fiche de fonds et range le tableau des fonds ; la fréquence de la VL (jour, semaine, mois) dit à quel rythme le prix est connu.")}
      </p>
    </div>
  );
}
