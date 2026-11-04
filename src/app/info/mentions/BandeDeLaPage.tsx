"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BandeDeLaPage.module.css";

/**
 * LA BANDE DE MENU DE LA PAGE (7 novembre 2026) : l'index de CETTE page, collé sous la barre de l'application. Un mot par section, un toucher y mène ;
 * le mot de la section lue passe en or. Elle n'a pas de rôle de navigation entre pages : le titre reste « Mentions légales ».
 */
export function BandeDeLaPage({ onglets, label }: { onglets: { id: string; nom: string }[]; label: string }) {
  const [actif, setActif] = useState(onglets[0]?.id ?? "");
  const bande = useRef<HTMLElement>(null);
  useEffect(() => {
    const cibles = onglets.map((o) => document.getElementById(o.id)).filter((e): e is HTMLElement => Boolean(e));
    const lecture = new IntersectionObserver(
      (es) => {
        const vu = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vu) setActif(vu.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    cibles.forEach((c) => lecture.observe(c));
    return () => lecture.disconnect();
  }, [onglets]);
  useEffect(() => {
    bande.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [actif]);
  return (
    <nav className={styles.bande} ref={bande} aria-label={label}>
      {onglets.map((o) => (
        <a key={o.id} href={`#${o.id}`} className={styles.onglet} aria-current={o.id === actif ? "true" : undefined}>
          {o.nom}
        </a>
      ))}
    </nav>
  );
}
