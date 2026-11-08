"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IndexChart, type ChartPoint, type OverlaySeries, type PeriodKey, type IndexView } from "@/components/IndexChart";
import { Select } from "@/components/ui/Select";
import { useDates, useT } from "@/i18n/client";
import styles from "./graphe.module.css";

/**
 * LA PÉRIODE DE LA PAGE, DANS UNE BARRE QUI COLLE (8 novembre 2026, planche « Sociétés de la cote »).
 *
 * La période (1 mois… tout, ou une plage de dates) pilote le graphe et tous les blocs qui le suivent ; elle sortait du graphe et se perdait en défilant. Elle vit maintenant dans une
 * liste, sous la barre du haut, et reste là tant qu'on lit le graphe et ses blocs. La liste s'ouvre en fenêtre centrée sur téléphone : rien ne bouge. « Plage personnalisée… » révèle
 * les deux poignées et les champs de dates sous le graphe.
 *
 * L'adresse porte la sélection (`periode`, ou `du` et `au` pour une plage), pour que les blocs calculés sur le serveur se recalculent avec elle. Une preset l'écrit tout de suite ;
 * une plage ne l'écrit qu'une demi-seconde après le dernier geste, pour qu'une poignée ne traîne pas un aller-retour par pixel.
 */
const LABELS: [PeriodKey, string][] = [
  ["1m", "1 mois"],
  ["3m", "3 mois"],
  ["ytd", "Depuis le 1er janvier"],
  ["12m", "12 mois"],
  ["all", "Tout"],
];

/** La plage d'un téléphone sur une ligne : « oct. 25 → oct. 26 » quand elle dépasse quatre mois, « 2 juil. → 1 oct. » sinon. */
const court = (a: string, b: string): string => {
  const jours = (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400e3;
  const f = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", jours > 120 ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });
  return `${f(a)} → ${f(b)}`;
};

const debutDe = (k: PeriodKey, derniere: string): string => {
  const shift = (j: number) => new Date(new Date(`${derniere}T12:00:00Z`).getTime() - j * 86400e3).toISOString().slice(0, 10);
  if (k === "1m") return shift(30);
  if (k === "3m") return shift(91);
  if (k === "12m") return shift(365);
  if (k === "ytd") return `${derniere.slice(0, 4)}-01-01`;
  return "";
};

export function IndiceGraphe({
  points,
  overlays,
  periode,
  du,
  au,
  vueInitiale,
  societeInitiale,
  lieSocieteALAdresse,
  children,
}: {
  points: ChartPoint[];
  overlays: OverlaySeries[];
  periode: PeriodKey;
  du?: string;
  au?: string;
  vueInitiale: IndexView;
  societeInitiale: string;
  lieSocieteALAdresse: boolean;
  /** Les blocs calculés sur le serveur, sous le graphe : ils restent dans le même panneau. */
  children: React.ReactNode;
}) {
  const t = useT();
  const { fmtDate } = useDates();
  const routeur = useRouter();
  const chemin = usePathname();
  const adresse = useSearchParams();
  const dates = useMemo(() => points.map((p) => p.date), [points]);
  const derniere = dates[dates.length - 1] ?? "";
  const indexDe = (d: string) => Math.max(0, dates.findIndex((x) => x >= d));
  const bornes = (k: PeriodKey): [number, number] => {
    const d = debutDe(k, derniere);
    const i = d ? dates.findIndex((x) => x >= d) : 0;
    return [i < 0 ? 0 : i, dates.length - 1];
  };
  const plageInitiale: [number, number] | null = du && au ? [indexDe(du), Math.max(0, dates.filter((x) => x <= au).length - 1)] : null;
  const [period, setPeriod] = useState<PeriodKey>(periode);
  const [zoom, setZoomEtat] = useState<[number, number] | null>(plageInitiale);
  const [plage, setPlage] = useState(Boolean(plageInitiale));
  const minuterie = useRef<number | null>(null);
  useEffect(() => () => {
    if (minuterie.current) window.clearTimeout(minuterie.current);
  }, []);

  const ecrire = (maj: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(adresse.toString());
    maj(q);
    routeur.replace(`${chemin}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  const choisir = (v: string) => {
    if (v === "plage") {
      setPlage(true);
      if (!zoom) setZoomEtat(bornes(period));
      return;
    }
    const k = v as PeriodKey;
    setPeriod(k);
    setZoomEtat(null);
    setPlage(false);
    if (minuterie.current) window.clearTimeout(minuterie.current);
    ecrire((q) => {
      q.set("periode", k);
      q.delete("du");
      q.delete("au");
    });
  };
  const setZoom = (z: [number, number] | null) => {
    setZoomEtat(z);
    if (minuterie.current) window.clearTimeout(minuterie.current);
    if (!z) {
      setPlage(false);
      ecrire((q) => {
        q.set("periode", period);
        q.delete("du");
        q.delete("au");
      });
      return;
    }
    minuterie.current = window.setTimeout(() => {
      ecrire((q) => {
        q.set("du", dates[z[0]] ?? "");
        q.set("au", dates[z[1]] ?? "");
      });
    }, 500);
  };

  const fenetre = zoom ?? bornes(period);
  const n = fenetre[1] - fenetre[0] + 1;
  const valeur = plage || zoom ? "plage" : period;
  const commande = { period, zoom, setZoom, plage };

  return (
    <>
      <div className={styles.barre}>
        <Select
          compact
          fixe
          cherchable={false}
          label={t("Période")}
          value={valeur}
          onChange={choisir}
          options={[...LABELS.map(([k, l]) => ({ value: k, label: t(l) })), { value: "plage", label: t("Plage personnalisée…") }]}
        />
        <span className={styles.lu}>
          <span className={styles.long}>{t("du {a} au {b}", { a: fmtDate(dates[fenetre[0]] ?? derniere), b: fmtDate(dates[fenetre[1]] ?? derniere) })}</span>
          <span className={styles.court}>{court(dates[fenetre[0]] ?? derniere, dates[fenetre[1]] ?? derniere)}</span> · {t("{n} séances", { n: String(n) })}
        </span>
      </div>
      <div className={styles.graphe}>
        <IndexChart points={points} overlays={overlays} defaultPeriod={periode} commande={commande} vueInitiale={vueInitiale} societeInitiale={societeInitiale} lieSocieteALAdresse={lieSocieteALAdresse} />
      </div>
      {children}
    </>
  );
}
