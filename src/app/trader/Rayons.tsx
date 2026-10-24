"use client";

import { useT } from "@/i18n/client";
import { Pli } from "@/components/Pli";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import { RAYONS, type ServiceVu } from "@/lib/domain/services";
import { Fiche } from "./Fiche";
import styles from "./page.module.css";
import type { Apercu } from "@/lib/domain/apercus";

/**
 * LES TROIS RAYONS, DANS LA GRAMMAIRE DE PLIS DE LA MAISON.
 *
 * La page tenait ses propres bandes, écrites pour elle : un en-tête de rayon,
 * une surface, des lignes qui s'ouvrent. « Mes documents », « Réinvestir » et
 * « Épargne programmée » faisaient la même chose avec le composant `Pli`, et
 * trois pages bâties sur la même idée ne se ressemblaient pas — l'espace
 * entre les chapitres, l'épaisseur des filets et le chevron différaient d'une
 * page à l'autre.
 *
 * Une maison a une grammaire ou elle n'en a pas. Celle-ci en a une : une
 * BANDE pleine pour un rayon, un FILET pour un groupe dedans, et le pli garde
 * son état sur l'appareil, de sorte qu'on retrouve la page comme on l'a
 * laissée.
 *
 * LE RAYON PORTE SON COMPTE, ET C'EST CE QUI TOURNE DÉJÀ. Ni « trois
 * services » ni « 1 sur 3 » : un client cherche le sien, pas un inventaire,
 * et un nombre total devient faux le jour où la liste bouge. Ce qui est en
 * place, lui, est une information — c'est la seule chose que le pli replié
 * doit encore dire.
 */
export function Rayons({ services, etapes, raisons, apercus }: { services: ServiceVu[]; etapes: Record<string, string[]>; raisons: Record<string, string>; /** Ce qui attend derrière chaque service : le même aperçu que les tuiles du téléphone. */ apercus?: Record<string, Apercu[]> }) {
  const t = useT();
  return (
    <div className={styles.rayons}>
      {RAYONS.map((r) => {
        const siens = services.filter((sv) => sv.rayon === r.cle);
        if (!siens.length) return null;
        const enPlace = siens.filter((sv) => sv.etat === "en_place").length;
        return (
          <Pli key={r.cle} cle={`trade:${r.cle}`} titre={t(r.nom)} sous={t(r.quoi)} compte={enPlace > 0 ? (enPlace > 1 ? t("{n} en place", { n: String(enPlace) }) : t("1 en place")) : undefined}>
            <div className={styles.dedans}>
              {siens.map((sv) => (
                <Pli
                  key={sv.cle}
                  cle={`trade:${r.cle}:${sv.cle}`}
                  niveau="filet"
                  titre={t(sv.nom)}
                  defaut={false}
                  marque={ICONE_SERVICE[sv.cle]}
                  compte={sv.etat === "en_place" ? t("en place") : undefined}
                >
                  <Fiche sv={sv} raison={raisons[sv.cle]} etapes={etapes[sv.cle]} apercus={apercus?.[sv.cle]} />
                </Pli>
              ))}
            </div>
          </Pli>
        );
      })}
    </div>
  );
}
