"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import type { ServiceVu } from "@/lib/domain/services";
import styles from "./page.module.css";

/**
 * LES SERVICES DANS UNE SEULE BANDE.
 *
 * C'étaient neuf cartes de 228 pixels, de la même forme et du même poids,
 * qu'un service tourne déjà ou qu'il attende un premier geste : 2 009 px de
 * mur sur un téléphone, pour une page qui doit faire agir. Mesuré le 5 octobre
 * 2026.
 *
 * Une surface les porte tous, avec un filet entre les lignes : on lit une
 * liste, et non une pile d'objets séparés. Une ligne s'ouvre à la fois, dans
 * la bande, et donne ce que la carte donnait : la phrase, la précision, les
 * étapes et le geste.
 *
 * AUCUNE LIGNE N'EST GRISÉE. Un service qu'on ne peut pas encore prendre n'est
 * pas fermé : il demande d'avoir commencé par autre chose, et c'est ce que sa
 * phrase dit. Sans compte-titres ouvert, les neuf proposent la même première
 * étape, l'ouverture, plutôt que de s'éteindre ensemble.
 *
 * LA PAGE NE SE COMPTE PAS. Ni « neuf services » ni « 3 en place sur 9 » : un
 * client cherche le sien, pas un inventaire, et un nombre affiché devient faux
 * le jour où la liste bouge.
 */
export function ServicesBande({ services, etapes }: { services: ServiceVu[]; etapes: Record<string, string[]> }) {
  const t = useT();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const id = useId();
  return (
    <div className={styles.bande}>
      {services.map((sv) => {
        const ici = ouvert === sv.cle;
        const pas = etapes[sv.cle];
        return (
          <div key={sv.cle} className={ici ? styles.bloc : undefined}>
            <button
              type="button"
              className={`${styles.svc} ${sv.etat === "en_place" ? styles.svcEnPlace : ""}`}
              aria-expanded={ici}
              aria-controls={`${id}-${sv.cle}`}
              onClick={() => setOuvert(ici ? null : sv.cle)}
            >
              <span className={styles.ico}>{ICONE_SERVICE[sv.cle]}</span>
              <span className={styles.quoi}>
                <b>{t(sv.nom)}</b>
                {/* Le lieu, court : la phrase du service et sa precision se lisent
                    dans la fiche. En sous-titre, elles faisaient des lignes de
                    95 px et la liste cessait de se parcourir. */}
                <small>{t(sv.ou)}</small>
              </span>
              <span className={styles.chev} aria-hidden="true">
                {ici ? "–" : "+"}
              </span>
            </button>
            {ici && (
              <div className={styles.fiche} id={`${id}-${sv.cle}`}>
                <p>{t(sv.phrase.key, sv.phrase.params)}</p>
                {sv.sinon && <p className={styles.sinon}>{t(sv.sinon.key, sv.sinon.params)}</p>}
                {/* Ce qu'il faut avoir d'abord, dit ici et pas dans la liste. */}
                {sv.porte && <p className={styles.porte}>{t(sv.porte.key, sv.porte.params)}</p>}
                {pas && (
                  <ol className={styles.etapes}>
                    {pas.map((e) => (
                      <li key={e}>{t(e)}</li>
                    ))}
                  </ol>
                )}
                <Link href={sv.href} className={styles.cta}>
                  {t(sv.geste.key, sv.geste.params)}
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
