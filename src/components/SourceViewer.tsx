"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./SourceViewer.module.css";

/**
 * Le communiqué, lu de près.
 *
 * Les communiqués des Trésors sont des scans : le taux, le nominal et la quotité
 * s'y lisent en petits caractères, souvent de travers, parfois sous un tampon.
 * Le lecteur du navigateur affichait la page entière dans un cadre haut de
 * quatre cents pixels, où plus rien n'était lisible ; agrandir revenait à ouvrir
 * le fichier dans un autre onglet et à perdre le formulaire de vue, donc à
 * recopier de mémoire les chiffres qu'on venait de lire. C'est exactement là que
 * se glissent les fautes de saisie.
 *
 * D'où la main. On attrape la page et on la déplace, comme une feuille sur une
 * table, et le formulaire reste à côté. La molette agrandit sous le curseur,
 * pour que le point qu'on regarde ne s'échappe pas.
 *
 * Deux choix qui méritent un mot.
 *
 * Le rendu passe par pdf.js plutôt que par le cadre du navigateur : un visualiseur
 * natif ne se pilote pas de l'extérieur, et c'est la seule raison de peindre nous
 * mêmes. La bibliothèque est chargée à la demande, quand une fiche s'ouvre, pour
 * qu'elle ne pèse pas sur le reste du desk.
 *
 * Et le curseur dit ce qu'on peut faire : main ouverte au repos, fermée pendant
 * le déplacement. Sans cela, personne ne devine qu'une image se prend.
 *
 * Le texte, quand il y en a. Peindre une page sur un canevas donne une image, et
 * une image ne se sélectionne pas : l'outil flèche rendait le curseur ordinaire
 * au-dessus de quelque chose qui n'avait rien à offrir. pdf.js sait rendre la
 * couche de texte par-dessus le dessin, transparente, calée sur les mêmes
 * coordonnées, et c'est elle qu'on attrape pour copier un code d'émission
 * plutôt que de le recopier à la main, ce qui est précisément là où se glissent
 * les fautes.
 *
 * Reste que la plupart de ces communiqués sont des scans purs, sans un caractère
 * dedans. Le dire vaut mieux que de laisser chercher : la barre annonce que la
 * page n'a pas de texte, et l'outil flèche se grise plutôt que de promettre une
 * sélection impossible.
 */
/** Le grossissement d'usine : la largeur à laquelle une page tient sans qu'on la déplace. */
const ZOOM_USINE = 1.1;
const MEMOIRE_ZOOM = "source.zoom";

export function SourceViewer({ src, title, fill }: { src: string; title: string; fill?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const couche = useRef<HTMLDivElement | null>(null);
  const doc = useRef<{ numPages: number; getPage: (n: number) => Promise<PdfPage> } | null>(null);
  /** La bibliothèque, gardée pour rendre la couche de texte après le dessin. */
  const lib = useRef<PdfLib | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  /**
   * Le grossissement appartient à la personne, pas à la pièce.
   *
   * Chaque séance sélectionnée remonte un visualiseur neuf : sans mémoire, on
   * refait le même réglage à chaque communiqué, vingt fois de suite. La lecture
   * est gardée, un navigateur pouvant refuser le stockage sans prévenir.
   */
  const [zoom, setZoom] = useState(() => {
    try {
      const v = Number(localStorage.getItem(MEMOIRE_ZOOM));
      return Number.isFinite(v) && v >= 0.5 && v <= 4 ? v : ZOOM_USINE;
    } catch {
      return ZOOM_USINE;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(MEMOIRE_ZOOM, String(zoom));
    } catch {
      // Un navigateur qui refuse le stockage ne doit pas casser la lecture.
    }
  }, [zoom]);
  // Un quart de tour à la fois : les communiqués arrivent parfois couchés, et
  // certains scanners les rendent à l'envers.
  const [rot, setRot] = useState(0);
  // La main déplace la page ; la flèche rend le curseur ordinaire, pour viser un
  // détail ou laisser le navigateur faire ce qu'il fait d'habitude. Le lecteur
  // natif offrait les deux, et les reprendre ne coûte qu'un état.
  const [tool, setTool] = useState<"main" | "fleche">("main");
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  /**
   * La page porte-t-elle du texte ?
   *
   * « undefined » tant qu'on ne l'a pas rendue : on ne dit pas qu'une page est
   * muette avant de l'avoir regardée. La réponse vaut pour la page affichée, un
   * document pouvant mêler une couverture saisie et des annexes scannées.
   */
  const [duTexte, setDuTexte] = useState<boolean | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        const d = await pdfjs.getDocument({ data: bytes }).promise;
        if (!alive) return;
        doc.current = d as unknown as { numPages: number; getPage: (n: number) => Promise<PdfPage> };
        lib.current = pdfjs as unknown as PdfLib;
        setPages(d.numPages);
        setState("ready");
      } catch {
        if (alive) setState("failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  const draw = useCallback(async () => {
    const d = doc.current;
    const el = canvas.current;
    if (!d || !el) return;
    const p = await d.getPage(page);
    // Le rendu suit la densité de l'écran : sur un portable récent, une page
    // peinte à un pour un se lit floue, et un scan flou ne se valide pas.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vp = p.getViewport({ scale: zoom * dpr, rotation: rot });
    el.width = vp.width;
    el.height = vp.height;
    el.style.width = `${vp.width / dpr}px`;
    el.style.height = `${vp.height / dpr}px`;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, el.width, el.height);
    await p.render({ canvasContext: ctx, viewport: vp, canvas: el }).promise;

    /**
     * La couche de texte, posée par-dessus le dessin.
     *
     * Elle est transparente et calée sur la page rendue à l'échelle de l'écran,
     * et non sur celle du canevas, qui est multipliée par la densité de pixels :
     * les deux confondues, la sélection tombe à côté des mots.
     */
    const boite = couche.current;
    const bib = lib.current;
    if (!boite || !bib) return;
    boite.replaceChildren();
    boite.style.width = `${vp.width / dpr}px`;
    boite.style.height = `${vp.height / dpr}px`;
    try {
      const contenu = await p.getTextContent();
      const mots = contenu.items.filter((i): i is PdfTextItem => typeof (i as PdfTextItem).str === "string" && (i as PdfTextItem).str.trim() !== "");
      setDuTexte(mots.length > 0);
      if (!mots.length) return;
      await new bib.TextLayer({ textContentSource: contenu, container: boite, viewport: p.getViewport({ scale: zoom, rotation: rot }) }).render();
    } catch {
      // Une page sans couche de texte n'est pas une panne : c'est un scan, et
      // c'est le cas de la plupart des communiqués de la zone.
      setDuTexte(false);
    }
  }, [page, zoom, rot]);

  useEffect(() => {
    if (state === "ready") void draw();
  }, [state, draw]);

  const onDown = (e: React.PointerEvent) => {
    const box = wrap.current;
    if (!box || tool !== "main") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop };
    setGrabbing(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const box = wrap.current;
    const d = drag.current;
    if (!box || !d) return;
    box.scrollLeft = d.left - (e.clientX - d.x);
    box.scrollTop = d.top - (e.clientY - d.y);
  };
  const onUp = () => {
    drag.current = null;
    setGrabbing(false);
  };

  // La molette agrandit sous le curseur : le point qu'on regarde ne bouge pas.
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  };

  if (state === "failed") {
    return (
      <p className="muted">
        {t("Le document ne s'affiche pas ici.")}{" "}
        <a href={src} target="_blank" rel="noreferrer">
          {t("L'ouvrir dans un onglet")}
        </a>
      </p>
    );
  }

  return (
    <div className={`${styles.viewer} ${fill ? styles.fill : ""}`}>
      <div className={styles.viewerBar}>
        <button type="button" className="btn sm ghost" onClick={() => setZoom((z) => Math.max(0.5, z * 0.85))} aria-label={t("Réduire")}>
          −
        </button>
        <span className={styles.zoomTxt}>{Math.round(zoom * 100)} %</span>
        <button type="button" className="btn sm ghost" onClick={() => setZoom((z) => Math.min(4, z * 1.15))} aria-label={t("Agrandir")}>
          +
        </button>
        <button type="button" className="btn sm ghost" onClick={() => setZoom(ZOOM_USINE)}>
          {t("Ajuster")}
        </button>
        <span className={styles.tools} role="group" aria-label={t("Outil")}>
          <button
            type="button"
            className={`btn sm ${tool === "main" ? "" : "ghost"}`}
            aria-pressed={tool === "main"}
            onClick={() => setTool("main")}
            title={t("Déplacer la page")}
          >
            ✋
          </button>
          <button
            type="button"
            className={`btn sm ${tool === "fleche" ? "" : "ghost"}`}
            aria-pressed={tool === "fleche"}
            onClick={() => setTool("fleche")}
            disabled={duTexte === false}
            title={duTexte === false ? t("Cette page est un scan : elle ne porte aucun texte à sélectionner.") : t("Sélectionner le texte")}
          >
            ⤢
          </button>
        </span>
        {/* Dire qu'une page est muette vaut mieux que de laisser chercher : la
            plupart de ces communiqués sont des scans purs. */}
        {duTexte === false && <span className={styles.scanTxt}>{t("scan, sans texte")}</span>}
        <button type="button" className="btn sm ghost" onClick={() => setRot((r) => (r + 270) % 360)} title={t("Pivoter à gauche")} aria-label={t("Pivoter à gauche")}>
          ↺
        </button>
        <button type="button" className="btn sm ghost" onClick={() => setRot((r) => (r + 90) % 360)} title={t("Pivoter à droite")} aria-label={t("Pivoter à droite")}>
          ↻
        </button>
        {pages > 1 && (
          <span className={styles.pager}>
            <button type="button" className="btn sm ghost" onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page <= 1} aria-label={t("Page précédente")}>
              ‹
            </button>
            {t("page {n} sur {m}", { n: String(page), m: String(pages) })}
            <button type="button" className="btn sm ghost" onClick={() => setPage((n) => Math.min(pages, n + 1))} disabled={page >= pages} aria-label={t("Page suivante")}>
              ›
            </button>
          </span>
        )}
        <a className={styles.viewerOpen} href={src} target="_blank" rel="noreferrer">
          {t("Plein écran")} ↗
        </a>
      </div>
      <div
        ref={wrap}
        className={`${styles.viewerBox} ${tool === "main" ? styles.hand : styles.arrow} ${grabbing ? styles.grabbing : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        role="img"
        aria-label={title}
      >
        {/* La page et son texte se superposent, d'où le calage : même origine,
            mêmes dimensions, et la couche par-dessus pour qu'on l'attrape. */}
        <div className={styles.feuille}>
          <canvas ref={canvas} className={styles.viewerCanvas} />
          <div ref={couche} className={`${styles.couche} ${tool === "fleche" ? styles.couchePrise : ""}`} aria-hidden="true" />
        </div>
        {state === "loading" && <p className={`muted ${styles.viewerWait}`}>{t("Chargement du document…")}</p>}
      </div>
    </div>
  );
}

interface PdfTextItem {
  str: string;
}
interface PdfPage {
  getViewport: (o: { scale: number; rotation?: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement }) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: ({ str: string } | Record<string, unknown>)[] }>;
}
interface PdfLib {
  TextLayer: new (o: { textContentSource: unknown; container: HTMLElement; viewport: unknown }) => { render: () => Promise<void> };
}
