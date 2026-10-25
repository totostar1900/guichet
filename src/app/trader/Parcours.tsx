"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/i18n/client";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import { Rubriques } from "@/components/mobile/Rubriques";
import { RAYONS, type ServiceVu } from "@/lib/domain/services";
import { Fiche } from "./Fiche";
import { cheminDu, niveauDu, retourDe, SANS_LISTE } from "./niveaux";
import styles from "./Parcours.module.css";
import type { Apercu } from "@/lib/domain/apercus";

/**
 * LE PARCOURS DU TÉLÉPHONE : TROIS ÉCRANS QUI GLISSENT.
 *
 * Sur un écran large, dix services tiennent sous trois bandes qu'on déplie :
 * on voit l'ensemble, on choisit, on lit. Sur un téléphone, la même page
 * faisait 2 000 pixels de mur, et déplier une bande poussait le reste si bas
 * qu'on perdait de vue ce qu'on venait de lire.
 *
 * Un téléphone ne montre pas un ensemble, il montre UN endroit : trois
 * niveaux, un par écran, et l'on se déplace entre eux.
 *
 *   LE PREMIER pose la question du client : placer, programmer, tenir.
 *   LE DEUXIÈME donne les services de ce rayon-là.
 *   LE TROISIÈME donne le service entier, et c'est là que la place gagnée
 *   sert : la raison d'être tient enfin, à côté des étapes et du geste.
 *
 * ─── Ce qui fait que ça ne désoriente pas ──────────────────────────────────
 *
 * LES TROIS ÉCRANS SONT CÔTE À CÔTE, et c'est un seul ruban qu'on fait
 * glisser : ils ne se remplacent pas, ils défilent. Un écran qui se substitue
 * à un autre laisse le lecteur deviner d'où il vient ; un ruban le lui
 * montre, et la direction du mouvement dit s'il avance ou s'il revient.
 *
 * LE CHEMIN EST ÉCRIT EN HAUT, en entier, et chaque cran y ramène d'un
 * doigt. Il ne paraît qu'à partir du deuxième écran : au premier, il ne
 * portait qu'un seul cran, « Trade », c'est-à-dire le titre de la page écrit
 * une seconde fois cinq cents pixels plus bas et en plus petit.
 *
 * LES TROIS POINTS N'Y SONT PLUS (24 octobre 2026). Ils comptaient la
 * profondeur — « je suis au deuxième de trois » — pendant que le chemin, à
 * dix pixels de là, la NOMMAIT : « Trade › Placer ». Deux dispositifs pour un
 * seul fait, et le plus pauvre des deux était aussi le plus voyant : une
 * rangée de points à droite d'une barre se lit partout ailleurs comme un
 * nombre de pages à suivre, et c'est ainsi qu'elle a été lue. Elle était
 * « aria-hidden » : rien ne se perd pour qui écoute la page.
 *
 * L'ADRESSE SUIT, parce que le bouton « retour » du téléphone est le geste
 * le plus employé de tous. « ?r=placer&s=epargne » : le navigateur empile
 * donc les trois niveaux, le retour système remonte d'un cran comme la
 * flèche de l'écran, et un lien partagé rouvre exactement le même endroit.
 * La page reste montée pendant ce temps — le composant lit l'adresse, il ne
 * se démonte pas — sans quoi il n'y aurait rien à faire glisser.
 *
 * CE QUI N'EST PAS À L'ÉCRAN N'EXISTE PAS POUR LE DOIGT NI POUR LA VOIX :
 * les deux panneaux hors champ sont « inert », donc ni tabulables ni lus.
 * Sans cela, le lecteur d'écran récite trente lignes invisibles.
 */
export function Parcours({
  services,
  etapes,
  raisons,
  racine,
  apercus,
}: {
  services: ServiceVu[];
  etapes: Record<string, string[]>;
  raisons: Record<string, string>;
  /**
   * CE QUI N'APPARTIENT QU'AU PREMIER PANNEAU.
   *
   * Le disponible, ce qui attend, ce qui ferme : trois états rendus par le
   * serveur et passés ici en éléments. Ils vivaient au-dessus du ruban, donc
   * ils se repeignaient à l'identique aux trois niveaux — relevé le
   * 24 octobre 2026 : 441 px sur 844, soit 52 % de l'écran, pour le seul
   * titre, la phrase et la bande des attentes ; le solde et les échéances
   * s'y sont ajoutés depuis.
   *
   * Posés DANS le panneau de la racine, ils glissent avec lui. Au deuxième
   * niveau il ne reste que le chemin et la fiche — c'est-à-dire ce qu'on est
   * venu lire.
   */
  racine?: React.ReactNode;
  /**
   * CE QUI ATTEND DERRIÈRE CHAQUE TUILE, par clef de service.
   *
   * Calculé une fois dans la page, à partir des offres qu'elle tient déjà, et
   * passé aux DEUX arrangements : l'écran large le rend dans la fiche, le
   * téléphone sous la tuile. C'est l'invariant que ce fichier déclare en
   * tête — même donnée, même texte, seule la façon de s'y déplacer change.
   */
  apercus?: Record<string, Apercu[]>;
}) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();

  /* L'ÉTAT EST DANS L'ADRESSE, ET NULLE PART AILLEURS. Un état local en
     double serait une seconde vérité : le retour système changerait l'adresse
     sans changer l'écran, et l'on verrait « Placer » en lisant « Tenir ». */
  const rayonCle = params.get("r") ?? "";
  const serviceCle = params.get("s") ?? "";
  const rayon = RAYONS.find((r) => r.cle === rayonCle);
  const service = services.find((sv) => sv.cle === serviceCle && sv.rayon === rayon?.cle);
  /* Les trois crans, et celui que « Placer » n'a plus : voir « ./niveaux ». */
  const niveau = niveauDu(rayon?.cle, service?.cle);

  const aller = (r?: string, s?: string) => {
    const q = new URLSearchParams();
    if (r) q.set("r", r);
    if (s) q.set("s", s);
    const suite = q.toString();
    /* « scroll: false » : sans lui, chaque cran ramènerait la page en haut
       d'un coup sec au milieu du glissement. */
    router.push(suite ? `/trader?${suite}` : "/trader", { scroll: false });
  };

  const siens = rayon ? services.filter((sv) => sv.rayon === rayon.cle) : [];
  /* Les services du rayon sans liste : ils tiennent la racine. */
  const aPlat = services.filter((sv) => sv.rayon === SANS_LISTE);
  const chemin = cheminDu(t("Trade"), rayon ? { cle: rayon.cle, nom: t(rayon.nom) } : undefined, service ? t(service.nom) : undefined);

  return (
    <div className={styles.parcours}>
      {/* LE CHEMIN. Il est fait de boutons : chaque cran ramène au sien, et le
          dernier ne clique pas, puisqu'on y est. Au premier écran il n'y a
          qu'un cran, et ce cran est le titre de la page : on ne l'écrit pas
          deux fois. */}
      {niveau > 0 && (
        <nav className={styles.fil} aria-label={t("Où vous êtes")}>
          <button type="button" className={styles.retour} onClick={() => aller(retourDe(niveau, rayon?.cle))} aria-label={t("Revenir")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className={styles.chemin}>
            {chemin.map((nom, i) =>
              i === chemin.length - 1 ? (
                <b key={nom} aria-current="page">
                  {nom}
                </b>
              ) : (
                <button key={nom} type="button" onClick={() => (i === 0 ? aller() : aller(rayon?.cle))}>
                  {nom}
                  <i aria-hidden="true">›</i>
                </button>
              ),
            )}
          </span>
        </nav>
      )}

      {/* LE RUBAN. Trois panneaux côte à côte, et la seule chose qui bouge
          est le décalage : le navigateur n'a qu'une transformation à animer,
          ce qui tient les soixante images par seconde sur un téléphone. */}
      <div className={styles.hublot}>
        <div className={styles.ruban} style={{ ["--niveau" as string]: String(niveau) }}>
          {/* LES DEUX NIVEAUX DE LISTE SONT DES SOMMAIRES, et le sommaire de
              la maison est « Rubriques » — lequel est né ICI, de cette
              liste-là. Les six autres sièges sont passés en bandes le
              24 octobre ; celui dont la forme venait restait en filets, parce
              qu'il en gardait une copie pour lui. La copie est partie. */}
          <section className={`${styles.volet} ${styles.racine}`} aria-hidden={niveau !== 0} inert={niveau !== 0}>
            {racine}
            {/* LES FAÇONS D'ENTRER SUR UNE LIGNE, À PLAT ET EN TUILES.
                Elles étaient derrière « Placer », un cran qui répétait la
                question de la page. En tuiles plutôt qu'en bandes parce
                qu'elles se COMPARENT : ce sont des variantes d'un même geste,
                et l'œil doit les prendre d'un coup plutôt que les descendre.
                Les rayons qui restent gardent la bande, qui se descend : eux
                rangent des gestes de natures différentes.
                La dernière s'étale sur la largeur quand elles sont en nombre
                impair — règle de mise en page et non de contenu, pour qu'une
                tuile ne reste jamais seule sur sa rangée. */}
            {aPlat.length > 0 && (
              <ul className={styles.tuiles}>
                {aPlat.map((sv) => (
                  <li key={sv.cle}>
                    <button type="button" className={styles.tuile} onClick={() => aller(SANS_LISTE, sv.cle)}>
                      <span className={styles.marque} aria-hidden="true">
                        {ICONE_SERVICE[sv.cle]}
                      </span>
                      <b>{t(sv.nom)}</b>
                      {/* LA LIGNE FIXE SOUS LE NOM, et non plus la phrase du
                          client. Un en-tête doublé de taille veut un nom court
                          et une ligne qui situe ; la phrase, elle, porte les
                          chiffres de CE client et vit sur la fiche, à un doigt
                          de là, où elle est le sujet plutôt qu'un sous-titre. */}
                      <span className={styles.sous}>{t(sv.sous)}</span>
                      {/* CE QUI ATTEND DERRIÈRE, DANS LES MOTS DE LA MAISON.
                          Le service porte déjà la phrase — « ce qu'il fait,
                          ou ferait, avec les chiffres du client » — et elle
                          était calculée pour les neuf puis montrée au seul
                          niveau 2. L'écran large, lui, rend la fiche ENTIÈRE
                          de chaque service dans sa bande : la phrase s'y lit
                          sans ouvrir quoi que ce soit.
                          Les tuiles rompaient donc l'invariant que ce fichier
                          déclare en tête — « les deux écrans lisent la MÊME
                          donnée et rendent le même texte dans le même ordre ».
                          Elles le tiennent de nouveau.
                          LA PHRASE RESTE, ET LES DEUX LIGNES DE LA MAQUETTE
                          SONT VENUES AVEC. L'objection écrite ici le matin —
                          « pour les adjudications, ce sont exactement celles
                          que Ce qui ferme bientôt pose déjà sur cette même
                          page » — était juste, et elle ne valait que pour
                          CELLE-LÀ : « primaire » n'a toujours pas d'aperçu,
                          par ce motif exact. Les trois autres montrent ce que
                          rien d'autre ne montre ici — la cote, les fonds
                          ouverts, la part qu'on détient — et elles ne coûtent
                          aucune lecture, les offres étant déjà en main.
                          La phrase porte les chiffres DU CLIENT, l'aperçu ceux
                          du CATALOGUE : deux questions, deux lignes. */}
                      {(apercus?.[sv.cle] ?? []).length > 0 && (
                        <span className={styles.apercus}>
                          {(apercus?.[sv.cle] ?? []).map((a) => (
                            <span key={a.nom} className={styles.apercuLigne}>
                              <em>{a.nom}</em>
                              <b>{t(a.dit.key, a.dit.params)}</b>
                            </span>
                          ))}
                        </span>
                      )}
                      {sv.etat === "en_place" && <small>{t("en place")}</small>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Rubriques
              items={RAYONS.filter((r) => r.cle !== SANS_LISTE).flatMap((r) => {
                const n = services.filter((sv) => sv.rayon === r.cle);
                if (!n.length) return [];
                /* Ce qui tourne déjà, et rien d'autre : un compte de services
                   rendrait un inventaire là où le client cherche le sien. */
                const enPlace = n.filter((sv) => sv.etat === "en_place").length;
                return [{ nom: t(r.nom), quoi: t(r.quoi), etiquette: enPlace > 0 ? (enPlace > 1 ? t("{n} en place", { n: String(enPlace) }) : t("1 en place")) : undefined, aller: () => aller(r.cle) }];
              })}
            />
          </section>

          {/* LE SECOND ÉCRAN EST FAIT DES MÊMES TUILES QUE LE PREMIER.
              Il portait une liste en bandes, héritée du temps où ce niveau
              rangeait deux rayons distincts : depuis que « Programmer » et
              « Tenir » n'en font qu'un, ce sont cinq services d'une même
              famille — ce qui s'écrit sur le compte — et une famille se
              COMPARE, elle ne se descend pas. C'est exactement l'argument qui
              avait mis « Placer » en tuiles à la racine, et il vaut ici depuis
              la fusion. Même composant, même écusson, même ligne fixe : deux
              formes pour une même chose finissent toujours par diverger. */}
          <section className={styles.volet} aria-hidden={niveau !== 1} inert={niveau !== 1}>
            {rayon && (
              <>
                <p className={styles.intro}>{t(rayon.quoi)}</p>
                <ul className={styles.tuiles}>
                  {siens.map((sv) => (
                    <li key={sv.cle}>
                      <button type="button" className={styles.tuile} onClick={() => aller(rayon.cle, sv.cle)}>
                        <span className={styles.marque} aria-hidden="true">
                          {ICONE_SERVICE[sv.cle]}
                        </span>
                        <b>{t(sv.nom)}</b>
                        <span className={styles.sous}>{t(sv.sous)}</span>
                        {(apercus?.[sv.cle] ?? []).length > 0 && (
                          <span className={styles.apercus}>
                            {(apercus?.[sv.cle] ?? []).map((a) => (
                              <span key={a.nom} className={styles.apercuLigne}>
                                <em>{a.nom}</em>
                                <b>{t(a.dit.key, a.dit.params)}</b>
                              </span>
                            ))}
                          </span>
                        )}
                        {sv.etat === "en_place" && <small>{t("en place")}</small>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={styles.volet} aria-hidden={niveau !== 2} inert={niveau !== 2}>
            {service && <Fiche sv={service} raison={raisons[service.cle]} etapes={etapes[service.cle]} apercus={apercus?.[service.cle]} titre />}
          </section>
        </div>
      </div>
    </div>
  );
}
