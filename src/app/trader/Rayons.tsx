"use client";

import { useT } from "@/i18n/client";
import { Pli } from "@/components/Pli";
import { ICONE_SERVICE, teinteDuService } from "@/components/nav/IconesServices";
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
 * LE RAYON NE PORTE PLUS DE COMPTE DU TOUT. Il refusait déjà « trois
 * services » et « 1 sur 3 » — un client cherche le sien, pas un inventaire,
 * et un total devient faux le jour où la liste bouge. Il gardait « 2 en
 * place », au motif que ce qui est en place est une information et non un
 * inventaire.
 *
 * LA DISTINCTION EST TOMBÉE LE 29 OCTOBRE 2026, et pour une raison qui vaut
 * plus que celle qu'elle remplace : elle demandait au lecteur de savoir d'où
 * vient le nombre pour décider s'il a le droit d'être là. Il ne le sait pas.
 * Il voit un chiffre dans un intitulé. Le filet déplié dit encore « en
 * place » sur CHAQUE service concerné, ce qui est plus précis qu'un total :
 * on apprend lesquels, et non combien.
 */
export function Rayons({ services, etapes, raisons, apercus }: { services: ServiceVu[]; etapes: Record<string, string[]>; raisons: Record<string, string>; /** Ce qui attend derrière chaque service : le même aperçu que les tuiles du téléphone. */ apercus?: Record<string, Apercu[]> }) {
  const t = useT();
  return (
    <div className={styles.rayons}>
      {RAYONS.map((r) => {
        const siens = services.filter((sv) => sv.rayon === r.cle);
        if (!siens.length) return null;
        return (
          <Pli key={r.cle} cle={`trade:${r.cle}`} titre={t(r.nom)} sous={t(r.quoi)}>
            <div className={styles.dedans}>
              {siens.map((sv) => (
                /* LA MÊME LIGNE FIXE QUE LA TUILE DU TÉLÉPHONE. Les deux
                   écrans lisent la même donnée et rendent le même texte :
                   replié, le filet disait le seul nom pendant que la tuile
                   disait le nom ET ce dont il s'agit. */
                <Pli
                  key={sv.cle}
                  cle={`trade:${r.cle}:${sv.cle}`}
                  niveau="filet"
                  titre={t(sv.nom)}
                  sous={t(sv.sous)}
                  defaut={false}
                  marque={ICONE_SERVICE[sv.cle]}
                  teinte={teinteDuService(sv.cle)}
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
