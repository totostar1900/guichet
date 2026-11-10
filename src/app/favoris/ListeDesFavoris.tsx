"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LineIdentity } from "@/components/LineIdentity";
import { texteDuSuivi, useBulle } from "@/components/mobile/Bulle";
import { toggleWatch } from "@/app/offres/[id]/actions";
import { poserSuivi } from "@/lib/ui/suivi";
import { useT } from "@/i18n/client";
import type { Favori, Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { basculerFavori } from "./actions";
import styles from "./favoris.module.css";

/**
 * LES FAVORIS : DES TUILES QUI SE TOUCHENT, ET QUI SORTENT EN GLISSANT (10 novembre 2026).
 *
 * Deux défauts relevés : la tuile n'était pas cliquable (seul le nom l'était), et retirer un favori était silencieux : la tuile disparaissait au rechargement, sans un mot. Maintenant TOUTE la tuile mène à sa page ou à sa fiche (un lien étendu,
 * sous l'étoile), et l'étoile retire : la tuile glisse vers la droite en se repliant, une bulle dit ce qui vient d'être retiré, et la liste se relit une fois le mouvement fini.
 */
export interface LigneFavorie {
  o: Offer;
  s: OfferSummary;
  cadence?: "evenement" | "quotidien";
}

export function ListeDesFavoris({ lignes, pages }: { lignes: LigneFavorie[]; pages: Favori[] }) {
  const t = useT();
  const router = useRouter();
  const { dire } = useBulle();
  const [sortis, setSortis] = useState<Set<string>>(new Set());
  const [, start] = useTransition();
  const sortir = (cle: string, message: string) => {
    setSortis((s) => new Set(s).add(cle));
    dire(message);
    window.setTimeout(() => router.refresh(), 480);
  };
  const retirerLigne = (l: LigneFavorie) =>
    start(async () => {
      const r = await toggleWatch(l.o.id, false, l.cadence);
      if (r.ok) {
        poserSuivi(l.o.id, false);
        sortir(`l:${l.o.id}`, texteDuSuivi(false, l.cadence, t));
      } else dire(t("Le suivi n'a pas pu être retiré. Réessayez."));
    });
  const retirerPage = (f: Favori) =>
    start(async () => {
      const r = await basculerFavori(f.href, f.title, false);
      if (r.ok) sortir(`p:${f.id}`, `${t("Retirée des favoris")} : ${t(f.title)}`);
      else dire(t("La page n'a pas pu être retirée. Réessayez."));
    });
  const etoile = (label: string, onClick: () => void) => (
    <button type="button" className={styles.etoile} aria-pressed="true" aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z" />
      </svg>
    </button>
  );
  return (
    <div className={styles.liste}>
      {lignes.map((l) => (
        <div key={l.o.id} className={`${styles.enveloppe} ${sortis.has(`l:${l.o.id}`) ? styles.sort : ""}`}>
          <div className={styles.tuile}>
            <Link href={`/offres/${l.o.id}`} className={styles.couvre} aria-label={l.o.title} tabIndex={-1} />
            <LineIdentity o={l.o} s={l.s} href={`/offres/${l.o.id}`} />
            {etoile(t("Retirer des favoris"), () => retirerLigne(l))}
          </div>
        </div>
      ))}
      {pages.map((f) => (
        <div key={f.id} className={`${styles.enveloppe} ${sortis.has(`p:${f.id}`) ? styles.sort : ""}`}>
          <div className={styles.tuile}>
            <Link href={f.href} className={styles.couvre} aria-label={t(f.title)} />
            <span className={styles.page}>
              <b>{t(f.title)}</b>
              <small>{t("Page")}</small>
            </span>
            {etoile(t("Retirer des favoris"), () => retirerPage(f))}
          </div>
        </div>
      ))}
    </div>
  );
}
