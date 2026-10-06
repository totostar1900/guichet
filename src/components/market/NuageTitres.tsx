"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
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
 * CE QUE LE NUAGE MONTRE. Mesuré le 6 octobre 2026 sur les trente-deux
 * obligations cotées : VINGT-CINQ COTENT EXACTEMENT 100,00, donc leur
 * rendement est leur coupon et elles dessinent ensemble le coupon par
 * échéance. SIX ont un cours qui s'est éloigné de 100, et leur rendement
 * s'écarte alors du coupon de 138 à 452 points de base. Ces six-là sont la
 * raison d'être du tracé : rien dans le tableau ne les désignait.
 *
 * LE GESTE SUR LE TRACÉ EST PARTI, et les barres le remplacent. Tirer un
 * rectangle marchait, mais la surface servait à deux choses — choisir une
 * plage et ouvrir une ligne — et se défendait par une règle invisible de
 * quatre pixels. Une barre par axe se voit, se touche, se prend au clavier,
 * et le point redevient un lien franc.
 *
 * LE BANDEAU DE SUIVI, de hauteur fixe, au-dessus du tracé : ce qu'on règle,
 * ce qu'il en reste, où est le milieu. Règle de la maison du 5 octobre 2026,
 * une valeur qui suit un geste ne va pas dans une bulle qui apparaît et
 * disparaît.
 *
 * L'ADRESSE N'EST ÉCRITE QU'AU RELÂCHEMENT. La page est rendue sur le serveur
 * à chaque changement d'adresse : écrire à chaque pas du curseur, c'était un
 * aller-retour par pixel, et le tracé traînait derrière le doigt.
 */

interface Plage {
  min?: number;
  max?: number;
}

/** Ce qu'une barre règle : son axe, ses bornes, et ce qu'elle écrit. */
interface Axe {
  clef: "duree" | "rendement";
  nom: string;
  bas: number;
  haut: number;
  pas: number;
  unite: "pct" | "ans";
}

const ansTexte = (v: number) => (v < 1 ? `${Math.max(1, Math.round(v * 12))} m` : `${(Math.round(v * 10) / 10).toString().replace(".", ",")} a`);
const dire = (v: number, u: "pct" | "ans") => (u === "pct" ? fmtPct(v, 1) : ansTexte(v));

export function NuageTitres({
  points,
  mesure,
  surMesure,
  duree,
  rendement,
  surZone,
  epingles,
  surEpingle,
}: {
  points: PointTitre[];
  mesure: MesureNuage;
  surMesure: (m: MesureNuage) => void;
  duree: Plage;
  rendement: Plage;
  /** Écrit les deux plages d'un coup : le nuage en règle deux, une bande une seule. */
  surZone: (z: { duree?: Plage; rendement?: Plage }) => void;
  /** Les lignes épinglées, et la bascule : un point les pose et les retire. */
  epingles: string[];
  surEpingle: (id: string) => void;
}) {
  const t = useT();

  const nuage = mesure === "nuage";
  const surRendement = mesure === "rendement";

  const vue = useMemo(() => {
    /* Le rendement manque pour une ligne dont l'échéancier d'amortissement
       n'est pas au référentiel : elle sort du tracé, et le compte le dit. */
    const avec = points.filter((p) => (surRendement || nuage ? p.ytm != null : p.ans > 0));
    if (avec.length < 2) return undefined;
    const xs = surRendement ? avec.map((p) => p.ytm!) : avec.map((p) => p.ans);
    const ys = nuage ? avec.map((p) => p.ytm!) : null;
    return { avec, x: bornesAxe(xs, surRendement ? undefined : 0), y: ys ? bornesAxe(ys) : null };
  }, [points, nuage, surRendement]);

  /**
   * LES PLAGES EN COURS DE RÉGLAGE, et la clef de celle dont elles sont nées.
   *
   * Le réglage se DÉRIVE au lieu de se synchroniser : un effet qui remettait
   * l'état local à zéro quand l'adresse change déclenche un rendu en cascade.
   * Quand l'adresse change — retour arrière, lien ouvert — la clef ne
   * correspond plus et l'adresse reprend la main, sans un seul effet.
   */
  const [reglage, setReglage] = useState<{ pour: string; duree: Plage; rendement: Plage } | null>(null);
  const clef = `${mesure}|${duree.min ?? ""}:${duree.max ?? ""}|${rendement.min ?? ""}:${rendement.max ?? ""}`;

  const nom: Record<MesureNuage, string> = {
    nuage: t("Les deux"),
    rendement: t("Rendement"),
    duree: t("Vie restante"),
  };

  if (!vue) return null;
  const { avec, x, y } = vue;
  const sansRendement = points.length - avec.length;

  const vif = reglage?.pour === clef ? reglage : null;
  const dureeVive = vif?.duree ?? duree;
  const rendementVif = vif?.rendement ?? rendement;

  /* Les axes réellement réglables : deux sur le nuage, un sur une bande. */
  const axes: Axe[] = nuage
    ? [
        { clef: "duree", nom: t("Vie restante"), bas: x[0], haut: x[1], pas: 0.25, unite: "ans" },
        { clef: "rendement", nom: t("Rendement"), bas: y![0], haut: y![1], pas: 0.1, unite: "pct" },
      ]
    : surRendement
      ? [{ clef: "rendement", nom: t("Rendement"), bas: x[0], haut: x[1], pas: 0.1, unite: "pct" }]
      : [{ clef: "duree", nom: t("Vie restante"), bas: x[0], haut: x[1], pas: 0.25, unite: "ans" }];

  const plageDe = (a: Axe) => (a.clef === "duree" ? dureeVive : rendementVif);
  const bornesVives = (a: Axe): [number, number] => [plageDe(a).min ?? a.bas, plageDe(a).max ?? a.haut];

  const dedans = (p: PointTitre) => {
    const vx = surRendement ? p.ytm : p.ans;
    if (vx == null) return false;
    const px = surRendement ? rendementVif : dureeVive;
    if (px.min != null && vx < px.min) return false;
    if (px.max != null && vx > px.max) return false;
    if (nuage && p.ytm != null) {
      if (rendementVif.min != null && p.ytm < rendementVif.min) return false;
      if (rendementVif.max != null && p.ytm > rendementVif.max) return false;
    }
    return true;
  };
  const retenus = avec.filter(dedans).length;
  const posee = axes.some((a) => plageDe(a).min != null || plageDe(a).max != null);

  const bouger = (a: Axe, cote: "min" | "max", brut: number) => {
    const v = Math.round(brut / a.pas) * a.pas;
    const [bMin, bMax] = bornesVives(a);
    const prochain: Plage = cote === "min" ? { min: Math.min(v, bMax), max: bMax } : { min: bMin, max: Math.max(v, bMin) };
    const net = prochain.min! <= a.bas && prochain.max! >= a.haut ? {} : prochain;
    setReglage({ pour: clef, duree: a.clef === "duree" ? net : dureeVive, rendement: a.clef === "rendement" ? net : rendementVif });
  };
  const poser = () => {
    if (!vif) return;
    surZone({ duree: vif.duree, rendement: vif.rendement });
  };

  const px = (v: number) => ((v - x[0]) / (x[1] - x[0])) * 100;
  const py = (v: number) => ((v - y![0]) / (y![1] - y![0])) * 100;

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
      out.push({ v: r, texte: unite === "pct" ? `${r} %` : ansTexte(r) });
    }
    return out;
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
      </div>

      {/* LE BANDEAU DE SUIVI : hauteur fixe, toujours là, trois zones. */}
      <div className={styles.suivi}>
        <span className={styles.suiviPlage}>
          {axes.map((a) => {
            const [bMin, bMax] = bornesVives(a);
            return (
              <span key={a.clef} className={styles.suiviAxe}>
                <i>{a.nom}</i>
                <b>
                  {dire(bMin, a.unite)} <span aria-hidden="true">→</span> {dire(bMax, a.unite)}
                </b>
              </span>
            );
          })}
        </span>
        <span className={styles.suiviQuoi}>
          {posee ? t("{n} ligne(s) retenue(s) sur {m}", { n: retenus, m: avec.length }) : t("{n} ligne(s) sur le tracé", { n: avec.length })}
          {sansRendement ? ` · ${t("{n} sans rendement calculable", { n: sansRendement })}` : ""}
        </span>
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
          {t("prix sous 100 %")}
        </span>
      </div>

      {/* LA GOUTTIÈRE DE GAUCHE EST UNE VRAIE COLONNE, et non une marge
          négative. Les étiquettes de l'axe des ordonnées étaient posées à
          −34 px du tracé : sur un écran large elles tenaient, en portrait
          elles sortaient de la page. Le tracé est donc décalé par une boîte,
          et les étiquettes vivent dans la gouttière qu'elle laisse. */}
      <div className={`${styles.cadre} ${nuage ? styles.cadreNuage : ""}`} style={nuage ? undefined : { height: `${Math.max(etages, 2) * 13 + 34}px` }}>
        <div className={styles.plot}>
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

          {/* La zone retenue, en filigrane derrière les points. */}
          {posee ? (
            <span
              className={styles.zone}
              style={{
                left: `${px(bornesVives(axes[0])[0])}%`,
                width: `${px(bornesVives(axes[0])[1]) - px(bornesVives(axes[0])[0])}%`,
                bottom: nuage ? `${py(bornesVives(axes[1])[0])}%` : 0,
                height: nuage ? `${py(bornesVives(axes[1])[1]) - py(bornesVives(axes[1])[0])}%` : "100%",
              }}
              aria-hidden="true"
            />
          ) : null}

          {/* LE POINT ÉPINGLE SA LIGNE, IL NE L'OUVRE PLUS. Ouvrir, c'était
              quitter le tracé pour lire trois chiffres, puis revenir ; or ce
              qu'on veut en pointant un point, c'est le lire SANS perdre le
              nuage. La ligne vient donc se poser sous le tracé, et « Voir la
              fiche » reste au bout de sa rangée pour qui veut vraiment
              partir. */}
          {places.map(({ p, X, etage, Y }) => {
            const pose = epingles.includes(p.id);
            const dit = `${p.titre} · ${p.ytm == null ? t("rendement inconnu") : fmtPct(p.ytm, 2)} · ${ansTexte(p.ans)}`;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={pose}
                className={`${styles.pt} ${styles[teinteDe(p.pays)]} ${horsDuPair(p) ? styles.anneau : ""} ${dedans(p) ? "" : styles.hors} ${pose ? styles.pose : ""}`}
                style={nuage ? { left: `${X}%`, bottom: `${Y}%` } : { left: `${X}%`, bottom: `${16 + etage * 13}px` }}
                title={dit}
                aria-label={`${dit} — ${pose ? t("détacher") : t("épingler")}`}
                onClick={() => surEpingle(p.id)}
              />
            );
          })}

          {/* Le nom des lignes dont le cours s'est éloigné de 100 : c'est ce
              qu'un tracé sait faire et qu'un histogramme ne sait pas. */}
          {nuage
            ? places
                .filter(({ p }) => horsDuPair(p) && dedans(p))
                .map(({ p, X, Y }) => {
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
      </div>

      {/* UNE BARRE PAR AXE. Deux curseurs natifs superposés : seules les
          poignées prennent le doigt, sans quoi le second couvrirait le
          premier sur toute sa longueur. */}
      {axes.map((a) => {
        const [bMin, bMax] = bornesVives(a);
        const part = (v: number) => ((v - a.bas) / (a.haut - a.bas)) * 100;
        return (
          <div key={a.clef} className={styles.reglage}>
            <span className={styles.reglageNom}>{a.nom}</span>
            <div className={styles.barre}>
              <span className={styles.piste} aria-hidden="true" />
              <span className={styles.pisteOn} style={{ left: `${part(bMin)}%`, right: `${100 - part(bMax)}%` }} aria-hidden="true" />
              <input
                id={`cote-${a.clef}-min`}
                type="range"
                min={a.bas}
                max={a.haut}
                step={a.pas}
                value={bMin}
                aria-label={`${a.nom} ${t("minimale")}`}
                onChange={(e) => bouger(a, "min", Number(e.target.value))}
                onPointerUp={poser}
                onKeyUp={poser}
                onBlur={poser}
              />
              <input
                id={`cote-${a.clef}-max`}
                type="range"
                min={a.bas}
                max={a.haut}
                step={a.pas}
                value={bMax}
                aria-label={`${a.nom} ${t("maximale")}`}
                onChange={(e) => bouger(a, "max", Number(e.target.value))}
                onPointerUp={poser}
                onKeyUp={poser}
                onBlur={poser}
              />
            </div>
          </div>
        );
      })}

      <p className={styles.etat}>
        {duree.min != null || duree.max != null || rendement.min != null || rendement.max != null ? (
          <button type="button" className={styles.vider} onClick={() => surZone({ duree: {}, rendement: {} })}>
            {t("Tout revoir")}
          </button>
        ) : (
          <span className={styles.muet}>{t("Resserrez une barre pour ne garder qu'une plage. Un point mène à la ligne.")}</span>
        )}
      </p>
    </section>
  );
}
