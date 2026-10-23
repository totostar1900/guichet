"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/i18n/client";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import { RAYONS, type ServiceVu } from "@/lib/domain/services";
import { Fiche } from "./Fiche";
import styles from "./Parcours.module.css";

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
 * doigt. Trois points disent où l'on est dans la profondeur : « je suis au
 * troisième de trois » se lit sans compter.
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
export function Parcours({ services, etapes, raisons }: { services: ServiceVu[]; etapes: Record<string, string[]>; raisons: Record<string, string> }) {
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
  const niveau = service ? 2 : rayon ? 1 : 0;

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
  const chemin = [t("Trade"), rayon ? t(rayon.nom) : undefined, service ? t(service.nom) : undefined].filter(Boolean) as string[];

  return (
    <div className={styles.parcours}>
      {/* LE CHEMIN, ET TROIS POINTS POUR LA PROFONDEUR. Le fil est fait de
          boutons : chaque cran ramène au sien, et le dernier ne clique pas,
          puisqu'on y est. */}
      <nav className={styles.fil} aria-label={t("Où vous êtes")}>
        {niveau > 0 && (
          <button type="button" className={styles.retour} onClick={() => (niveau === 2 ? aller(rayon?.cle) : aller())} aria-label={t("Revenir")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
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
        <span className={styles.points} aria-hidden="true">
          {[0, 1, 2].map((n) => (
            <i key={n} data-ici={n === niveau ? "oui" : undefined} data-passe={n < niveau ? "oui" : undefined} />
          ))}
        </span>
      </nav>

      {/* LE RUBAN. Trois panneaux côte à côte, et la seule chose qui bouge
          est le décalage : le navigateur n'a qu'une transformation à animer,
          ce qui tient les soixante images par seconde sur un téléphone. */}
      <div className={styles.hublot}>
        <div className={styles.ruban} style={{ ["--niveau" as string]: String(niveau) }}>
          <section className={styles.volet} aria-hidden={niveau !== 0} inert={niveau !== 0}>
            <ul className={styles.liste}>
              {RAYONS.map((r) => {
                const n = services.filter((sv) => sv.rayon === r.cle);
                if (!n.length) return null;
                const enPlace = n.filter((sv) => sv.etat === "en_place").length;
                return (
                  <li key={r.cle}>
                    <button type="button" className={styles.ligne} onClick={() => aller(r.cle)}>
                      <span className={styles.quoi}>
                        <b>{t(r.nom)}</b>
                        <small>{t(r.quoi)}</small>
                      </span>
                      {/* Ce qui tourne déjà, et rien d'autre : un compte de
                          services rendrait un inventaire là où le client
                          cherche le sien. */}
                      {enPlace > 0 && <span className={styles.enPlace}>{enPlace > 1 ? t("{n} en place", { n: String(enPlace) }) : t("1 en place")}</span>}
                      <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.volet} aria-hidden={niveau !== 1} inert={niveau !== 1}>
            {rayon && (
              <>
                <p className={styles.intro}>{t(rayon.quoi)}</p>
                <ul className={styles.liste}>
                  {siens.map((sv) => (
                    <li key={sv.cle}>
                      <button type="button" className={`${styles.ligne} ${sv.etat === "en_place" ? styles.ligneEnPlace : ""}`} onClick={() => aller(rayon.cle, sv.cle)}>
                        <span className={styles.ico}>{ICONE_SERVICE[sv.cle]}</span>
                        <span className={styles.quoi}>
                          <b>{t(sv.nom)}</b>
                        </span>
                        <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={styles.volet} aria-hidden={niveau !== 2} inert={niveau !== 2}>
            {service && <Fiche sv={service} raison={raisons[service.cle]} etapes={etapes[service.cle]} titre />}
          </section>
        </div>
      </div>
    </div>
  );
}
