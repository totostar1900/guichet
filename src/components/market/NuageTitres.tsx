"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { useLineHref } from "@/components/DeskView";
import { fmtPct } from "@/lib/format";
import { bornesAxe, horsDuPair, type MesureNuage, MESURES, nomCourt, type PointTitre, teinteDe } from "@/lib/domain/nuage";
import styles from "./nuage.module.css";

/**
 * LE NUAGE DE LA COTE : CE QUE ÇA RAPPORTE CONTRE COMBIEN DE TEMPS.
 *
 * Un acheteur d'obligation décide de deux choses à la fois, et les mettre sur
 * un seul axe oblige à en oublier une. EOG MT 6,6 % rapporte 11,12 % sur un an
 * et deux mois ; EOG 7,5 % en rapporte 7,50 sur quatre ans et demi. Sur une
 * règle de rendement, ce sont deux points ; ce ne sont pas du tout les mêmes
 * placements.
 *
 * CE QUE LE NUAGE MONTRE, ET QU'AUCUNE COLONNE NE MONTRAIT. Mesuré le
 * 6 octobre 2026 sur les trente-deux obligations cotées : VINGT-CINQ COTENT
 * EXACTEMENT 100,00, donc leur rendement est leur coupon et elles dessinent
 * ensemble le coupon par échéance. SIX ont quitté le pair, et leur rendement
 * s'écarte du coupon de 138 à 452 points de base. Ces six-là sont la raison
 * d'être du tracé : elles se détachent au-dessus du peloton, et rien dans le
 * tableau ne les désignait.
 *
 * TROIS MESURES, PARCE QUE LA QUESTION N'EST PAS TOUJOURS LA MÊME. Le nuage
 * pour choisir un placement ; la bande du rendement seul quand on cherche le
 * mieux-disant ; la bande de la vie restante quand c'est une échéance de
 * trésorerie qu'on couvre.
 *
 * IL COMMANDE LES FILTRES QUI EXISTENT, il n'en ajoute pas. Tirer un rectangle
 * écrit la plage de durée et celle de rendement, c'est-à-dire « ans » et
 * « rendement » dans l'adresse, les deux mêmes que les jauges des
 * adjudications et que les pastilles de filtre. Un second jeu de bornes aurait
 * fait deux vérités sur la même liste.
 *
 * LES ACTIONS N'Y SONT PAS, et le tracé le dit. Sans échéance ni rendement
 * actuariel, elles n'ont aucun des deux axes : leur inventer une mesure pour
 * remplir un graphique serait un chiffre fabriqué.
 */

const arrondi = (v: number, pas: number) => Math.round(v / pas) * pas;
const ansTexte = (v: number) => (v < 1 ? `${Math.max(1, Math.round(v * 12))} m` : `${(Math.round(v * 10) / 10).toString().replace(".", ",")} a`);

interface Plage {
  min?: number;
  max?: number;
}

export function NuageTitres({
  points,
  mesure,
  surMesure,
  duree,
  rendement,
  surZone,
}: {
  points: PointTitre[];
  mesure: MesureNuage;
  surMesure: (m: MesureNuage) => void;
  duree: Plage;
  rendement: Plage;
  /** Écrit les deux plages d'un coup : le nuage en pose deux, une bande une seule. */
  surZone: (z: { duree?: Plage; rendement?: Plage }) => void;
}) {
  const t = useT();
  const href = useLineHref();
  const boite = useRef<HTMLDivElement>(null);
  const tire = useRef<{ x0: number; y0: number; r: DOMRect; bouge: boolean } | null>(null);
  const [glisse, setGlisse] = useState(false);

  const nuage = mesure === "nuage";
  const surRendement = mesure === "rendement";

  const vue = useMemo(() => {
    /* Le rendement manque pour une ligne dont l'échéancier d'amortissement
       n'est pas au référentiel : elle sort du tracé, et le pied le dit. */
    const avec = points.filter((p) => (surRendement || nuage ? p.ytm != null : p.ans > 0));
    if (avec.length < 2) return undefined;
    const xs = surRendement ? avec.map((p) => p.ytm!) : avec.map((p) => p.ans);
    const ys = nuage ? avec.map((p) => p.ytm!) : null;
    /* Le plancher à zéro sur une durée : une durée négative n'existe pas, et
       l'axe partait à moins deux dixièmes d'année. Un rendement, lui, peut
       être négatif, donc rien ne le borne. */
    return { avec, x: bornesAxe(xs, surRendement ? undefined : 0), y: ys ? bornesAxe(ys) : null };
  }, [points, nuage, surRendement]);

  const nom: Record<MesureNuage, string> = {
    nuage: t("Les deux"),
    rendement: t("Rendement"),
    duree: t("Vie restante"),
  };

  if (!vue) return null;
  const { avec, x, y } = vue;
  const sansRendement = points.length - avec.length;

  /* En pour cent de la boîte : la mise en page reste au CSS, qui connaît la
     largeur réelle, là où un calcul en pixels demanderait de la mesurer. */
  const px = (v: number) => ((v - x[0]) / (x[1] - x[0])) * 100;
  const py = (v: number) => ((v - y![0]) / (y![1] - y![0])) * 100;

  const dedans = (p: PointTitre) => {
    const vx = surRendement ? p.ytm : p.ans;
    if (vx == null) return false;
    const plageX = surRendement ? rendement : duree;
    if (plageX.min != null && vx < plageX.min) return false;
    if (plageX.max != null && vx > plageX.max) return false;
    if (nuage && p.ytm != null) {
      if (rendement.min != null && p.ytm < rendement.min) return false;
      if (rendement.max != null && p.ytm > rendement.max) return false;
    }
    return true;
  };
  const retenus = avec.filter(dedans).length;
  const pose = duree.min != null || duree.max != null || rendement.min != null || rendement.max != null;

  /* L'empilement d'une bande : deux lignes trop proches se cachent. Sur un
     nuage, l'ordonnée fait déjà ce travail. */
  const occupe: number[] = [];
  const places = [...avec]
    .sort((a, b) => (surRendement ? a.ytm! - b.ytm! : a.ans - b.ans))
    .map((p) => {
      const X = px(surRendement ? p.ytm! : p.ans);
      if (nuage) return { p, X, etage: 0, Y: py(p.ytm!) };
      let etage = 0;
      while (occupe[etage] != null && X - occupe[etage] < 3.2) etage += 1;
      occupe[etage] = X;
      return { p, X, etage, Y: null as number | null };
    });
  const etages = nuage ? 1 : Math.max(...places.map((q) => q.etage)) + 1;

  const graduations = (bas: number, haut: number, unite: "pct" | "ans") => {
    const etendue = haut - bas;
    const pas = etendue > 6 ? 1 : etendue > 3 ? 0.5 : 0.25;
    const out: { v: number; texte: string }[] = [];
    for (let v = Math.ceil(bas / pas) * pas; v <= haut + 1e-9; v += pas) {
      const r = Math.round(v * 100) / 100;
      out.push({ v: r, texte: unite === "pct" ? `${r} %` : r < 1 ? `${Math.round(r * 12)} m` : `${String(r).replace(".", ",")} a` });
    }
    return out;
  };

  const valeurEnX = (clientX: number, r: DOMRect) => {
    const part = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return arrondi(x[0] + part * (x[1] - x[0]), surRendement ? 0.1 : 0.25);
  };
  const valeurEnY = (clientY: number, r: DOMRect) => {
    const part = Math.min(1, Math.max(0, (r.bottom - clientY) / r.height));
    return arrondi(y![0] + part * (y![1] - y![0]), 0.1);
  };

  const SEUIL = 4;
  const bouger = (clientX: number, clientY: number) => {
    const d = tire.current!;
    const xa = valeurEnX(d.x0, d.r);
    const xb = valeurEnX(clientX, d.r);
    const bornesX = { min: Math.min(xa, xb), max: Math.max(xa, xb) };
    if (nuage) {
      const ya = valeurEnY(d.y0, d.r);
      const yb = valeurEnY(clientY, d.r);
      surZone({ duree: bornesX, rendement: { min: Math.min(ya, yb), max: Math.max(ya, yb) } });
    } else if (surRendement) surZone({ rendement: bornesX });
    else surZone({ duree: bornesX });
  };

  return (
    <section className={styles.bloc} aria-label={t("Rendement et durée des lignes cotées")}>
      <div className={styles.tete}>
        <div className={styles.mesures} role="group" aria-label={t("Ce qu'on regarde")}>
          <span className={styles.mesEtiq}>{t("Voir")}</span>
          {MESURES.map((m) => (
            <button key={m} type="button" className={styles.mes} aria-pressed={m === mesure} onClick={() => surMesure(m)}>
              {nom[m]}
            </button>
          ))}
        </div>
        <p className={styles.compte}>
          {t("{n} ligne(s) sur le tracé", { n: avec.length })}
          {sansRendement ? ` · ${t("{n} sans rendement calculable", { n: sansRendement })}` : ""}
        </p>
      </div>

      {/* La légende est toujours là dès qu'il y a plus d'une couleur : une
          teinte sans nom n'est pas une information. */}
      <div className={styles.legende}>
        {[
          ["t1", t("Cameroun")],
          ["t2", t("Congo")],
          ["t3", t("Gabon")],
          ["t4", t("Tchad")],
        ].map(([c, n]) => (
          <span key={c}>
            <i className={styles[c]} aria-hidden="true" />
            {n}
          </span>
        ))}
        <span>
          <i className={`${styles.t1} ${styles.anneau}`} aria-hidden="true" />
          {t("a quitté le pair")}
        </span>
      </div>

      <div
        ref={boite}
        className={`${styles.trace} ${nuage ? styles.traceNuage : ""}`}
        style={nuage ? undefined : { height: `${Math.max(etages, 2) * 13 + 34}px` }}
        onPointerDown={(e) => {
          tire.current = { x0: e.clientX, y0: e.clientY, r: e.currentTarget.getBoundingClientRect(), bouge: false };
        }}
        onPointerMove={(e) => {
          const d = tire.current;
          if (!d) return;
          if (!d.bouge && Math.abs(e.clientX - d.x0) < SEUIL && Math.abs(e.clientY - d.y0) < SEUIL) return;
          d.bouge = true;
          setGlisse(true);
          bouger(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          if (tire.current?.bouge) window.setTimeout(() => setGlisse(false), 0);
          tire.current = null;
        }}
        onPointerCancel={() => {
          tire.current = null;
        }}
      >
        {graduations(x[0], x[1], surRendement ? "pct" : "ans").map((g) => (
          <span key={`x${g.v}`} className={styles.gx} style={{ left: `${px(g.v)}%` }} aria-hidden="true">
            <b>{g.texte}</b>
          </span>
        ))}
        {nuage
          ? graduations(y![0], y![1], "pct")
              .filter((g) => Number.isInteger(g.v))
              .map((g) => (
                <span key={`y${g.v}`} className={styles.gy} style={{ bottom: `${py(g.v)}%` }} aria-hidden="true">
                  <b>{g.texte}</b>
                </span>
              ))
          : null}

        {places.map(({ p, X, etage, Y }) => (
          <Link
            key={p.id}
            href={href(p.id)}
            className={`${styles.pt} ${styles[teinteDe(p.pays)]} ${horsDuPair(p) ? styles.anneau : ""} ${dedans(p) ? "" : styles.hors}`}
            style={nuage ? { left: `${X}%`, bottom: `${Y}%` } : { left: `${X}%`, bottom: `${18 + etage * 13}px` }}
            title={`${p.titre} · ${p.ytm == null ? t("rendement inconnu") : fmtPct(p.ytm, 2)} · ${ansTexte(p.ans)}`}
            aria-label={`${p.titre} · ${p.ytm == null ? t("rendement inconnu") : fmtPct(p.ytm, 2)} · ${ansTexte(p.ans)}`}
            onClick={(e) => {
              if (glisse) e.preventDefault();
            }}
          />
        ))}

        {/* Le nom des lignes hors du pair : c'est ce qu'un tracé sait faire et
            qu'un histogramme ne sait pas, et c'est la raison de ce tracé. */}
        {nuage
          ? places
              .filter(({ p }) => horsDuPair(p) && dedans(p))
              .map(({ p, X, Y }) => {
                /* L'étiquette passe SOUS son point quand il est en haut du
                   tracé, et s'ancre par son bord quand il est sur un côté :
                   posée toujours au-dessus et centrée, celle de la ligne la
                   plus haute sortait de la boîte, et c'est précisément la
                   ligne qu'on vient voir. */
                const dessous = Y! > 86;
                const bord = X > 80 ? "translateX(-100%)" : X < 12 ? "none" : "translateX(-50%)";
                return (
                  <span
                    key={`n${p.id}`}
                    className={styles.nom}
                    style={{ left: `${X}%`, bottom: dessous ? `calc(${Y}% - 20px)` : `calc(${Y}% + 11px)`, transform: bord }}
                    aria-hidden="true"
                  >
                    {nomCourt(p.titre)}
                  </span>
                );
              })
          : null}
      </div>

      <p className={styles.etat}>
        {pose ? (
          <>
            {t("{n} ligne(s) retenue(s) sur {m}", { n: retenus, m: avec.length })}{" "}
            <button type="button" className={styles.vider} onClick={() => surZone({ duree: {}, rendement: {} })}>
              {t("Tout revoir")}
            </button>
          </>
        ) : (
          <span className={styles.muet}>
            {nuage ? t("Tirez un rectangle pour ne garder qu'une poignée de lignes. Un point mène à la ligne.") : t("Tirez à même la bande pour ne garder qu'une plage. Un point mène à la ligne.")}
          </span>
        )}
      </p>
    </section>
  );
}
