"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toggleWatch } from "@/app/offres/[id]/actions";
import { Drapeau } from "@/components/Drapeau";
import { deverrouiller, verrouiller } from "@/components/mobile/verrou-defilement";
import { useT } from "@/i18n/client";
import { SECONDES_PAR_PAGE, type GroupeDeStatut } from "@/lib/domain/statuts";
import type { Country } from "@/lib/domain/types";
import { tic } from "@/lib/ui/haptique";
import { useFiligrane } from "@/lib/ui/filigrane";
import type { ItemStatut } from "./chargerStatuts";
import styles from "./Statuts.module.css";

/**
 * LES STATUTS, FAÇON MESSAGERIE (18 novembre 2026, planche « Statuts et dynamisme », 1B ; précisé le même jour : UN SEUL STATUT, la pastille dans la barre du haut).
 *
 * Une seule pastille « G » se tient à GAUCHE DE LA BARRE DU HAUT, sur les racines. Son anneau est découpé en autant d'arcs que de pages : de la couleur pour ce qui est nouveau, du gris
 * pour ce qui est vu (la mémoire est celle de l'appareil, comme la croix de l'annonce : aucun suivi du client). La toucher ouvre la visionneuse DIRECTEMENT sur la première page non vue.
 *
 * La visionneuse est UNE SEULE SUITE, sans groupes : un message de la maison tiré au hasard, puis une page par ligne que le desk retient. Les barres du haut avancent seules (5 s) ; un doigt
 * maintenu met en pause (et le bouton ⏸) ; on touche à droite pour avancer, à gauche pour reculer ; un balayage de côté fait de même ; TIRER VERS LE BAS ferme, la page suit le doigt.
 * Pas de minuterie en JavaScript : l'avance est l'animation de la barre courante, qui s'arrête avec « réduire les animations » (alors rien n'avance seul). La croix et Échap ferment aussi.
 *
 * LE SIGNE DU PAYS (code, mot, monument) n'est QUE le fond d'une page de statut : jamais celui d'une carte ou d'une ligne.
 */
type Donnees = { messages: string[]; items: ItemStatut[] };
type Page = { cle: string; groupe: GroupeDeStatut; item?: ItemStatut };

const CLE_VUS = "guichet:statuts:vus";
/** La première ouverture de la bulle : jusque-là, une étiquette « Nouveautés » l'accompagne. */
const CLE_OUVERTE = "guichet:statuts:ouverte";
function dejaOuverte(): boolean {
  try {
    return localStorage.getItem(CLE_OUVERTE) === "1";
  } catch {
    return true;
  }
}
const FONDS_DE_MESSAGE = ["fm0", "fm1", "fm2", "fm3", "fm4"] as const;
const jourCourt = () => new Date().toISOString().slice(0, 10);

function lireVus(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLE_VUS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function ecrireVus(v: Set<string>) {
  try {
    localStorage.setItem(CLE_VUS, JSON.stringify([...v].slice(-200)));
  } catch {
    // stockage indisponible : les pages reparaîtront comme nouvelles
  }
}

/** La suite des pages : le message de la maison d'abord, puis une page par ligne retenue. */
export function pagesDe(items: ItemStatut[]): Page[] {
  return [{ cle: `maison:${jourCourt()}`, groupe: "maison" }, ...items.map((item): Page => ({ cle: item.id, groupe: item.groupe, item }))];
}

/** L'index de la première page non vue ; sinon la toute première. */
export function premiereNonVue(pages: Page[], vus: ReadonlySet<string>): number {
  const i = pages.findIndex((x) => !vus.has(x.cle));
  return i >= 0 ? i : 0;
}

export function BulleDesStatuts() {
  const t = useT();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [vus, setVus] = useState<Set<string>>(new Set());
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [message, setMessage] = useState({ texte: "", fond: 0 });
  const [premiere, setPremiere] = useState(false);

  useEffect(() => {
    let annule = false;
    fetch("/api/statuts")
      .then((r) => (r.status === 200 ? (r.json() as Promise<Donnees>) : null))
      .then((d) => {
        if (annule || !d) return;
        setDonnees(d);
        setVus(lireVus());
        setPremiere(!dejaOuverte());
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  const toutes = useMemo(() => (donnees ? pagesDe(donnees.items) : []), [donnees]);
  const marquer = useCallback((cle: string) => {
    setVus((anciens) => {
      if (anciens.has(cle)) return anciens;
      const v = new Set(anciens).add(cle);
      ecrireVus(v);
      return v;
    });
  }, []);
  if (!donnees || donnees.items.length === 0) return null;

  const ouvrir = () => {
    tic(6);
    try {
      localStorage.setItem(CLE_OUVERTE, "1");
    } catch {
      // stockage refusé : l'étiquette reviendra
    }
    setPremiere(false);
    const pool = donnees.messages;
    setMessage({ texte: pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : "", fond: Math.floor(Math.random() * FONDS_DE_MESSAGE.length) });
    setOuvert(premiereNonVue(toutes, vus));
  };
  const nouveaux = toutes.filter((p) => !vus.has(p.cle)).length;
  return (
    <>
      <button type="button" className={styles.bulle} data-nouveau={nouveaux > 0 ? "" : undefined} onClick={ouvrir} aria-haspopup="dialog" aria-label={nouveaux > 0 ? t("Statuts : {n} nouveaux", { n: nouveaux }) : t("Statuts")}>
        <Anneau pages={toutes} vus={vus} />
        <b className={styles.g}>G</b>
        {nouveaux > 0 && <i className={styles.point} aria-hidden="true" />}
      </button>
      {nouveaux > 0 && premiere && <span className={styles.etiquette}>{t("Nouveautés")}</span>}
      {ouvert !== null && <Visionneuse pages={toutes} depart={ouvert} message={message} marquer={marquer} fermer={() => setOuvert(null)} />}
    </>
  );
}

/** L'anneau de la bulle : un arc par page, séparés par un blanc ; gris quand la page est vue. */
function Anneau({ pages, vus }: { pages: Page[]; vus: ReadonlySet<string> }) {
  const n = Math.max(1, pages.length);
  const r = 24;
  const C = 2 * Math.PI * r;
  const trou = n > 1 ? 4 : 0;
  const seg = C / n - trou;
  return (
    <svg className={styles.anneau} viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <linearGradient id="statuts-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2b94c" />
          <stop offset="0.55" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#c14bd1" />
        </linearGradient>
      </defs>
      {pages.map((p, i) => (
        <circle key={p.cle} className={vus.has(p.cle) ? styles.vu : styles.nv} cx="28" cy="28" r={r} strokeDasharray={`${seg} ${C - seg}`} strokeDashoffset={-i * (seg + trou)} />
      ))}
    </svg>
  );
}

function Visionneuse({ pages, depart, message, marquer, fermer }: { pages: Page[]; depart: number; message: { texte: string; fond: number }; marquer: (cle: string) => void; fermer: () => void }) {
  const t = useT();
  const router = useRouter();
  const [pos, setPos] = useState(depart);
  const [pause, setPause] = useState(false);
  const [maintenu, setMaintenu] = useState(false);
  const [dy, setDy] = useState(0);
  const [relache, setRelache] = useState(false);
  const [suivis, setSuivis] = useState<Set<string>>(new Set());
  const [monte, setMonte] = useState(false);
  const geste = useRef<{ x: number; y: number; t: number; axe?: "h" | "v"; tenu?: ReturnType<typeof setTimeout> } | null>(null);

  const page = pages[pos];
  const it = page.item;
  const signe = useFiligrane(it?.pays as Country | undefined);

  useEffect(() => {
    verrouiller();
    const id = requestAnimationFrame(() => setMonte(true));
    return () => {
      cancelAnimationFrame(id);
      deverrouiller();
    };
  }, []);
  useEffect(() => {
    marquer(page.cle);
  }, [page.cle, marquer]);

  /* LA POSITION COURANTE SE LIT DANS UNE RÉFÉRENCE, pas dans la mise à jour : fermer depuis une mise à jour de l'état est un effet de bord que React refuse en plein rendu. */
  const courante = useRef(pos);
  useEffect(() => {
    courante.current = pos;
  }, [pos]);
  const suivant = useCallback(() => {
    if (courante.current < pages.length - 1) setPos(courante.current + 1);
    else fermer();
  }, [pages, fermer]);
  const precedent = useCallback(() => setPos((c) => Math.max(0, c - 1)), []);
  /* Un balayage de côté avance ou recule, et s'arrête aux bouts : il ne ferme pas. */
  const avancer = useCallback(() => setPos((c) => Math.min(pages.length - 1, c + 1)), [pages]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight") suivant();
      else if (e.key === "ArrowLeft") precedent();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [fermer, suivant, precedent]);

  const aDeux = pause || maintenu;
  const debut = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    const tenu = setTimeout(() => setMaintenu(true), 220);
    geste.current = { x: e.clientX, y: e.clientY, t: Date.now(), tenu };
    setRelache(false);
  };
  const bouge = (e: React.PointerEvent) => {
    const g = geste.current;
    if (!g) return;
    const ddx = e.clientX - g.x;
    const ddy = e.clientY - g.y;
    if (!g.axe && Math.hypot(ddx, ddy) > 10) {
      g.axe = Math.abs(ddy) > Math.abs(ddx) * 1.2 ? "v" : "h";
      if (g.tenu) clearTimeout(g.tenu);
      setMaintenu(true);
    }
    if (g.axe === "v" && ddy > 0) setDy(ddy);
  };
  const fin = (e: React.PointerEvent) => {
    const g = geste.current;
    geste.current = null;
    if (!g) return;
    if (g.tenu) clearTimeout(g.tenu);
    const ddx = e.clientX - g.x;
    const ddy = e.clientY - g.y;
    const duree = Math.max(1, Date.now() - g.t);
    setMaintenu(false);
    if (g.axe === "v") {
      if (ddy > 120 || (ddy > 40 && ddy / duree > 0.6)) {
        setRelache(true);
        setDy(window.innerHeight);
        tic(8);
        setTimeout(fermer, 180);
      } else {
        setRelache(true);
        setDy(0);
      }
      return;
    }
    if (g.axe === "h") {
      if (ddx < -60) avancer();
      else if (ddx > 60) precedent();
      return;
    }
    if (duree < 220) {
      if (e.clientX < window.innerWidth * 0.35) precedent();
      else suivant();
    }
  };

  const suivre = async (item: ItemStatut) => {
    const on = !suivis.has(item.id);
    setSuivis((s) => {
      const n = new Set(s);
      if (on) n.add(item.id);
      else n.delete(item.id);
      return n;
    });
    tic(8);
    const res = await toggleWatch(item.id, on, item.groupe === "tresor" ? "quotidien" : "evenement").catch(() => ({ ok: false, watching: false }));
    if (!res.ok) {
      setSuivis((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
      router.push(`/connexion?next=${encodeURIComponent(item.fiche)}`);
    }
  };

  const fond = it ? styles[`f${it.groupe === "tresor" && it.genre === "BTA" ? "bta" : it.groupe}` as keyof typeof styles] : styles[FONDS_DE_MESSAGE[message.fond]];
  return createPortal(
    <div
      data-fili={it ? signe : undefined}
      className={`${styles.voile} ${monte ? styles.monte : ""} ${relache ? styles.relache : ""} ${fond}`}
      style={{ transform: dy ? `translateY(${dy}px)` : undefined, opacity: dy ? Math.max(0.35, 1 - dy / 500) : undefined }}
      role="dialog"
      aria-modal="true"
      aria-label={t("Statuts")}
      onPointerDown={debut}
      onPointerMove={bouge}
      onPointerUp={fin}
      onPointerCancel={fin}
    >
      <div className={styles.pages} aria-hidden="true">
        {pages.map((p, n) => (
          <i key={p.cle} className={n < pos ? styles.faite : n === pos ? styles.courante : undefined}>
            {n === pos && <b key={pos} style={{ animationDuration: `${SECONDES_PAR_PAGE}s`, animationPlayState: aDeux ? "paused" : "running" }} onAnimationEnd={suivant} />}
          </i>
        ))}
      </div>
      <div className={styles.entete}>
        <span className={styles.mini}>G</span>
        <b>{t("Statuts")}</b>
        <button type="button" className={styles.rond} onClick={() => setPause((p) => !p)} aria-pressed={pause} aria-label={pause ? t("Reprendre") : t("Pause")}>
          {pause ? "▶" : "⏸"}
        </button>
        <button type="button" className={styles.rond} onClick={fermer} aria-label={t("Fermer")}>
          ×
        </button>
      </div>
      {it ? (
        <article className={styles.ligne} aria-live="polite">
          <Drapeau pays={it.pays as Country} largeur={44} />
          <span className={styles.pastille}>{it.etat}</span>
          <h2>{it.titre}</h2>
          <p className={styles.emetteur}>{it.emetteur}</p>
          <p className={styles.chiffre}>
            <b>{it.hero}</b>
            <small>{it.heroSub}</small>
          </p>
          {it.courbe && it.courbe.length > 1 && <Trace ys={it.courbe} />}
          <div className={styles.boutons}>
            <Link href={it.fiche} className="btn" onClick={fermer}>
              {t("Voir la fiche")}
            </Link>
            {it.ordre && (
              <Link href={it.ordre} className="btn primary" onClick={fermer}>
                {t("Passer un ordre")}
              </Link>
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.rond} onClick={() => suivre(it)} aria-pressed={suivis.has(it.id)} aria-label={suivis.has(it.id) ? t("Ne plus suivre cette ligne") : t("Suivre cette ligne")}>
              {suivis.has(it.id) ? "♥" : "♡"}
            </button>
            <span className={styles.indice}>{t("Glissez vers le bas pour fermer")}</span>
          </div>
        </article>
      ) : (
        <article className={styles.premiere} aria-live="polite">
          <p>{message.texte}</p>
        </article>
      )}
    </div>,
    document.body,
  );
}

/** Le tracé d'un fonds : les VL, mises à l'échelle de leur plus bas et de leur plus haut ; il se dessine à l'arrivée de la page. */
function Trace({ ys }: { ys: number[] }) {
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const d = ys.map((v, i) => `${i ? "L" : "M"}${((i / (ys.length - 1)) * 200).toFixed(1)} ${(44 - ((v - min) / span) * 40).toFixed(1)}`).join(" ");
  return (
    <svg className={styles.trace} viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} pathLength={1} />
    </svg>
  );
}
