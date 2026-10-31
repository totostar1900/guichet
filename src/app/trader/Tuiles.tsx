"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import { BriefDuService } from "@/components/EnBref";
import { ICONE_SERVICE, teinteDuService } from "@/components/nav/IconesServices";
import { RAYONS, type ServiceVu } from "@/lib/domain/services";
import type { Apercu } from "@/lib/domain/apercus";
import styles from "./page.module.css";

/**
 * TRADE EN UN SEUL ÉCRAN : DES TUILES, ET UN « i » POUR CHACUNE.
 *
 * ─── Ce qui a disparu, le 31 octobre 2026, et pourquoi ──────────────────────
 *
 * DEUX CRANS SÉPARAIENT LE CLIENT DU SERVICE. Le premier était la liste du
 * rayon « Programmer et tenir » ; le second, une fiche qui redisait la raison
 * d'être et les étapes avant de proposer un bouton pour continuer.
 *
 * LA FICHE DISAIT CE QUE LE BRIEF DIT DÉJÀ, mot pour mot : les deux lisaient
 * `RAISON` et `ETAPES` dans la même table. On traversait donc un écran entier
 * pour lire ce que la page d'arrivée allait reproposer derrière son « En
 * bref ». La demande du dirigeant : que ce soit LA MÊME PAGE, ouverte d'un
 * discret « i » sur la tuile ou du bouton de l'en-tête, « reportée ailleurs au
 * besoin ».
 *
 * LA LISTE DU RAYON, ELLE, A SUIVI SON DERNIER CRAN. « Placer » avait perdu le
 * sien le 24 octobre ; « Programmer et tenir » était le seul qui en gardait un,
 * et un seul niveau intermédiaire pour la moitié des services est une
 * exception, pas une grammaire. Le rayon reste écrit — il range la grille — il
 * n'est plus un endroit où l'on va.
 *
 * ET LA SÉPARATION LARGE / TÉLÉPHONE EST TOMBÉE AVEC. Elle existait parce que
 * trois plis dépliables valaient mieux, sur grand écran, qu'un mur de deux
 * mille pixels sur téléphone. Une grille de tuiles n'a pas ce défaut : elle
 * tient en une colonne sous 430 px et en deux au-dessus, et c'est le même
 * écran pour tout le monde. Deux arrangements d'un même contenu finissent
 * toujours par diverger — c'est ce que l'ancien fichier déclarait en tête, et
 * la meilleure façon de le tenir est de n'en avoir qu'un.
 *
 * ─── Ce que la tuile a gagné en route ───────────────────────────────────────
 *
 * LA PORTE, qui ne se lisait que sur la fiche. Quand le compte-titres n'est
 * pas ouvert, les services du compte changent de destination — ils mènent à
 * l'ouverture — et la fiche était le seul endroit qui le disait. Sans elle,
 * cinq tuiles emmèneraient ailleurs que là où elles annoncent, sans un mot.
 * Elle prend donc la place de la ligne fixe, et les deux ne coexistent jamais.
 *
 * LA PHRASE DU CLIENT NE REVIENT PAS, et c'est une décision du dirigeant du
 * 31 octobre 2026. Elle vivait sur la fiche ; la tuile garde la ligne fixe,
 * qui dit de quoi il s'agit, et les aperçus, qui disent ce qui attend
 * derrière. Les chiffres du client se lisent sur sa page, à un doigt de là.
 */
export function Tuiles({ services, apercus }: { services: ServiceVu[]; apercus?: Record<string, Apercu[]> }) {
  const t = useT();
  return (
    <div className={styles.rayons}>
      {RAYONS.map((r) => {
        const siens = services.filter((sv) => sv.rayon === r.cle);
        if (!siens.length) return null;
        return (
          <section key={r.cle}>
            {/* L'INTERTITRE NE CLIQUE PAS. Il rangeait une liste qu'on
                ouvrait ; il ne range plus qu'une grille qu'on voit. Un titre
                qui ressemble à un lien et n'en est pas se fait viser une fois
                par lecteur. */}
            <h2 className={styles.rayon}>{t(r.nom)}</h2>
            <p className={styles.quoi}>{t(r.quoi)}</p>
            <ul className={styles.tuiles}>
              {siens.map((sv) => (
                <li key={sv.cle} className={styles.case}>
                  <div className={styles.tuile} style={teinteDuService(sv.cle)}>
                    <span className={styles.marque} aria-hidden="true">
                      {ICONE_SERVICE[sv.cle]}
                    </span>
                    {/* LE LIEN S'ÉTEND SUR LA TUILE ENTIÈRE, par un calque posé
                        en « ::after ». C'est ce qui permet au « i » d'être un
                        VRAI bouton : un bouton dans un lien est invalide en
                        HTML, et le navigateur ne le clique pas. Ici il n'y a
                        qu'un lien et qu'un bouton, frères, et le second passe
                        au-dessus du calque. */}
                    <b>
                      <Link href={sv.href} className={styles.lien}>
                        {t(sv.nom)}
                      </Link>
                    </b>
                    {/* CE DONT IL S'AGIT — ou, quand le compte n'est pas
                        ouvert, ce qu'il faut avoir d'abord : la tuile mène
                        alors à l'ouverture, et le taire ferait d'elle un
                        mensonge poli. */}
                    <span className={styles.sous}>{sv.porte ? t(sv.porte.key, sv.porte.params) : t(sv.sous)}</span>
                    {(apercus?.[sv.cle] ?? []).length > 0 && (
                      <span className={styles.apercus}>
                        {(apercus?.[sv.cle] ?? []).map((a) => (
                          <span key={a.nom} className={`${styles.apercuLigne}${a.prose ? ` ${styles.prose}` : ""}`}>
                            <em>{t(a.nom)}</em>
                            <b>{t(a.dit.key, a.dit.params)}</b>
                          </span>
                        ))}
                      </span>
                    )}
                    {/* LE PIED : l'état à gauche, le « i » à droite. Il tient
                        le bas de la tuile quelle que soit la hauteur du reste,
                        de sorte que les ronds s'alignent d'une tuile à
                        l'autre. */}
                    <span className={styles.pied}>
                      {sv.etat === "en_place" && <small>{t("en place")}</small>}
                      <span className={styles.info}>
                        <BriefDuService cle={sv.cle} />
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
