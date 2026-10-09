"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import { RAYONS, type ServiceVu } from "@/lib/domain/services";
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
  /* TROIS RAYONS, ET LA QUESTION DE CHACUN SOUS SON NOM. Une bande unique
     de dix lignes ne dit pas par où commencer ; trois rayons nommés par
     l'intention répondent avant qu'on ait lu une ligne. L'ordre ne change
     pas à l'intérieur : ce qui tourne déjà passe devant ce qui reste à
     prendre. */
  return (
    <div className={styles.rayons}>
      {RAYONS.map((r) => {
        const siens = services.filter((sv) => sv.rayon === r.cle);
        if (!siens.length) return null;
        return (
          <section key={r.cle} className={styles.rayon}>
            <div className={styles.rayonTete}>
              <h3>{t(r.nom)}</h3>
              <span>{t(r.quoi)}</span>
            </div>
            <div className={styles.bande}>
              {siens.map((sv) => {
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
              {/* LE NOM SEUL. Le lieu (« Portefeuille › Espèces ») tenait une
                  seconde ligne sous chacun des neuf : neuf adresses à lire pour
                  choisir un service, quand le lien les y mène déjà. */}
              <span className={styles.quoi}>
                <b>{t(sv.nom)}</b>
              </span>
              <span className={styles.chev} aria-hidden="true">
                {ici ? "–" : "+"}
              </span>
            </button>
            {ici && (
              <div className={styles.fiche} id={`${id}-${sv.cle}`}>
                {/* UNE PHRASE, PAS DEUX. La précision dessous redisait la même
                    chose d'un cran plus bas, et une fiche ouverte doit mener au
                    geste. Ce qui conditionne l'accès, lui, reste. */}
                <p>{t(sv.phrase.key, sv.phrase.params)}</p>
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
          </section>
        );
      })}
    </div>
  );
}
