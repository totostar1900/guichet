import Link from "next/link";
import { cadence, etatDesRobots, prochainTour, robotsAVoir } from "@/lib/domain/robots";
import { DeskNav } from "@/components/DeskNav";
import { healthChecks } from "@/lib/health";
import { HEALTH_HOW } from "@/lib/health-how";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Santé du système" };

/** The target page's address with « depuis=sante&point=… » before any #anchor. */
function fromSante(href: string, key: string): string {
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}depuis=sante&point=${key}${hash ? `#${hash}` : ""}`;
}

const LEVEL: Record<string, string> = { ok: "OK", warn: "À surveiller", crit: "Action requise" };

export default async function SantePage() {
  const t = await getT();
  const [checks, notifications, tours, evenements] = await Promise.all([
    healthChecks(),
    /* Tous les envois récents, pour n'en garder que les échecs : une page de
       santé montre ce qui ne va pas, le reste se lit chez son correspondant. */
    repo().listNotifications(400),
    repo().listTours(200).catch(() => []),
    /* Le fil, pour les avis dus et NON TENTÉS : ceux-là ne laissent aucune
       ligne au registre des envois, faute de canal à essayer. Sélectionnés par
       leur genre et non par leurs mots — chercher une phrase dans du HTML
       marche jusqu'au jour où quelqu'un l'ajuste, et casse alors en silence la
       page qui existe pour voir les pannes. */
    repo().listEvents(400).catch(() => []),
  ]);
  const echecs = notifications.filter((n) => n.status === "failed");
  const manques = evenements.filter((e) => e.kind === "avis_manque");
  /* Un robot muet ressemble à un robot sans travail : c'est l'absence de tour
     qui se voit ici, jamais sa présence. */
  const robots = etatDesRobots(tours);
  const aVoir = robotsAVoir(robots);
  /* Une seule heure pour tout le tableau : deux appels a new Date() dans la
     meme page feraient deux « prochain tour » a la seconde pres differents. */
  const maintenant = new Date();
  /* LE MOT « UTC » NE PARAIT QUE QUAND IL MANQUE. La frequence vient de
     l'expression cron et reste en UTC ; les deux colonnes voisines passent par
     fmtDateTime, qui lit l'horloge du serveur. Sur Vercel c'est UTC et les
     trois s'accordent, donc rien a ajouter. Sur une machine de developpement
     (UTC+3 ici, mesure le 6 octobre 2026) l'ecart saute aux yeux et se lit
     comme une panne : le mot le reduit a ce qu'il est. */
  const serveurEnUTC = maintenant.getTimezoneOffset() === 0;
  const JOURS = [t("dimanche"), t("lundi"), t("mardi"), t("mercredi"), t("jeudi"), t("vendredi"), t("samedi")];
  /**
   * La phrase de la cadence, composee ici et nulle part ailleurs.
   *
   * Les clefs sont ecrites en clair : le script qui cherche les traductions
   * manquantes ne voit pas un t(variable), et c'est l'angle mort qui a deja
   * coute deux passages.
   */
  const phraseCadence = (cron: string): string => {
    let c;
    try {
      c = cadence(cron);
    } catch {
      // Plutot l'expression nue qu'une page de desk blanche.
      return cron;
    }
    const h = c.heure;
    switch (c.quand) {
      case "quotidien":
        return t("chaque jour à {h}", { h });
      case "ouvre":
        return t("chaque jour ouvré à {h}", { h });
      case "hebdo":
        return t("chaque {jour} à {h}", { jour: JOURS[c.jour], h });
      case "mensuel":
        return t("le {j} de chaque mois à {h}", { j: String(c.jourDuMois), h });
      case "trimestriel":
        return t("le {j} du premier mois de chaque trimestre à {h}", { j: String(c.jourDuMois), h });
      default:
        return cron;
    }
  };
  /**
   * Le prochain depart, et dans combien de temps : la date seule se compte mal.
   *
   * LE PIEGE DU FUSEAU, mesure le 6 octobre 2026. `fmtDateTime` lit l'heure
   * locale du serveur : UTC sur Vercel, East Africa Time sur la machine de
   * developpement. En production les trois colonnes s'accordent donc, et la
   * phrase en tete du tableau dit vrai. En local la colonne « Frequence »,
   * qui vient de l'expression cron et reste en UTC, decale de trois heures des
   * deux autres. Ce n'est pas une panne : c'est la page de demonstration qui
   * tourne sur une horloge que Vercel n'a pas.
   *
   * Le delai relatif, lui, ne depend d'aucun fuseau : c'est une difference.
   */
  const prochain = (cron: string): { quand: string; dans: string } | undefined => {
    try {
      const d = prochainTour(cron, maintenant);
      const heures = (d.getTime() - maintenant.getTime()) / 3_600_000;
      const dans = heures < 1 ? t("dans moins d'une heure") : heures < 24 ? t("dans {n} heures", { n: Math.round(heures) }) : t("dans {n} jours", { n: Math.round(heures / 24) });
      return { quand: fmtDateTime(d.toISOString()), dans };
    } catch {
      return undefined;
    }
  };
  const worst = checks.some((c) => c.level === "crit") ? "crit" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  return (
    <>
      <DeskNav current="/desk/sante" />

      <div className={styles.head}>
        <div>
          <h1>{t("Santé du système")}</h1>
          <p className="muted">{t("Ce que la machine fait toute seule : et ce qui attend le desk. Vérifié à chaque passage du cron du soir ; un e-mail part au desk quand un point passe en rouge.")}</p>
        </div>
        <span className={`${styles.badge} ${styles[worst]}`}>{LEVEL[worst]}</span>
      </div>

      <div className={styles.grid}>
        {checks.map((c) => {
          const how = HEALTH_HOW[c.key];
          const act = c.level !== "ok" && how;
          const inner = (
            <>
              <span className={styles.label}>{t(c.label)}</span>
              <b>{t(c.value)}</b>
              {c.detail && <small>{t(c.detail)}</small>}
              {act && <span className={styles.go}>{t("Traiter")} →</span>}
            </>
          );
          return act ? (
            <Link key={c.key} className={`${styles.check} ${styles[c.level]} ${styles.act}`} href={fromSante(how.href, c.key)} title={t(how.how)}>
              {inner}
            </Link>
          ) : (
            <div key={c.key} className={`${styles.check} ${styles[c.level]}`}>
              {inner}
            </div>
          );
        })}
      </div>

      <section className="panel" id="robots">
        <div className="panel-h">
          <h2>{t("Les robots")}</h2>
          <span className="muted">
            {aVoir.length
              ? t("{n} robot(s) à regarder : muet depuis plus que sa cadence, ou en échec.", { n: aVoir.length })
              : t("Tous ont tourné dans leur cadence. Un tour laisse sa ligne même quand il n'a rien fait : c'est l'absence qui se voit.")}
          </span>
        </div>
        {/* LE FUSEAU SE DIT UNE FOIS, ET NON DANS CHAQUE CELLULE. L'ordonnanceur
            de Vercel travaille en UTC et la colonne « Dernier tour » l'est deja :
            melanger deux fuseaux dans une meme ligne couterait plus cher qu'une
            phrase a lire une fois. */}
        <p className={styles.p}>
          {t("Les heures sont en UTC, comme l'ordonnanceur : Yaoundé est à UTC+1, donc une heure de plus que ce qui est écrit ici. Un robot qui se tait au-delà de sa tolérance passe en « muet » : la tolérance vaut environ deux passages, pour qu'un ordonnanceur en retard de cinq minutes ne crie pas tous les matins.")}
        </p>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Robot")}</th>
                <th>{t("Ce qu'il fait")}</th>
                <th>{t("Fréquence")}</th>
                <th>{t("Prochain tour")}</th>
                <th>{t("Dernier tour")}</th>
                <th>{t("État")}</th>
              </tr>
            </thead>
            <tbody>
              {robots.map((r) => (
                <tr key={r.cle}>
                  <td className="mono">{r.cle}</td>
                  <td className="muted">{t(r.quoi)}</td>
                  {/* L'expression nue reste sous le curseur : c'est elle que
                      l'ordonnanceur execute, la phrase n'en est que la lecture. */}
                  <td title={r.cron}>
                    {phraseCadence(r.cron)}
                    {serveurEnUTC ? null : <small className="muted"> UTC</small>}
                  </td>
                  <td>
                    {(() => {
                      const n = prochain(r.cron);
                      if (!n) return <span className="muted">—</span>;
                      return (
                        <>
                          {n.quand}
                          <small className={styles.sous}>{n.dans}</small>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    {r.dernier ? fmtDateTime(r.dernier.startedAt) : <span className="muted">{t("jamais")}</span>}
                    {/* Un tour à la main se montre et ne prouve rien : il ne dit
                        pas que l'ordonnanceur vit. */}
                    {r.dernier?.par === "main" && <small className="muted"> {t("à la main")}</small>}
                  </td>
                  <td>
                    {/* Muet et échoué ne se réparent pas pareil : l'un demande de
                        regarder l'ordonnanceur, l'autre le code. */}
                    {r.etat === "muet" ? (
                      <span className="st annulee">{t("muet depuis plus de {n} heures", { n: r.heures })}</span>
                    ) : r.etat === "echoue" ? (
                      <span className="st annulee">{r.dernier?.error ?? t("échec")}</span>
                    ) : (
                      <span className="st reglee">{t("tourne dans sa cadence")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      {(echecs.length > 0 || manques.length > 0) && (
        <section className="panel" id="envois">
          <div className="panel-h">
            <h2>{t("Ce que le client n'a pas appris")}</h2>
            <span className="muted">{t("{n} avis que la maison devait et n'a pas remis.", { n: echecs.length + manques.length })}</span>
          </div>
          <p className={styles.p}>
            {t("Un avis dû au client peut manquer de deux façons, et elles ne se réparent pas pareil : le fournisseur refuse, ou bien il n'y avait aucun canal à essayer. La première laisse une ligne d'envoi, la seconde n'en laisse aucune — elle ne vivait donc que dans le fil, et il fallait savoir regarder à deux endroits pour une seule question. Les deux sont ici. Les envois réussis se lisent dans Messages, auprès de leur correspondant, et se comptent dans Reporting.")}
          </p>

          {/* DEUX FORMES, ET ON NE LES FORCE PAS DANS UN MÊME TABLEAU.
              Un refus de fournisseur a un canal, une adresse, un objet et un
              motif : ce sont les colonnes. Un avis que rien ne permettait de
              tenter n'a aucun de ces quatre, et la phrase du fil le dit déjà
              entière. Mises sur la même grille, les colonnes mentaient pour la
              moitié des lignes — vu à l'écran, pas en épreuve. */}
          {echecs.length > 0 && (
            <>
              <h3 className={styles.h3}>{t("Le fournisseur a refusé")}</h3>
              <div className="scroll-x">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("Quand")}</th>
                      <th>{t("Canal")}</th>
                      <th>À</th>
                      <th>{t("Objet")}</th>
                      <th>{t("Motif")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {echecs.map((n) => (
                      <tr key={n.id}>
                        <td className="muted">{fmtDateTime(n.createdAt)}</td>
                        <td>{n.channel}</td>
                        <td>{n.contactName ?? n.to}</td>
                        <td className="muted">{n.subject ?? n.kind}</td>
                        <td>{n.error ?? <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {manques.length > 0 && (
            <>
              <h3 className={styles.h3}>{t("Aucun canal à essayer")}</h3>
              <p className={styles.p}>
                {t("Le geste, lui, a bien eu lieu — l'ordre a changé d'état, l'instruction est arrêtée, l'attente est close. Il reste à le dire au client, de la main.")}
              </p>
              <ul className={styles.manques}>
                {manques.map((e) => (
                  <li key={e.id}>
                    {/* L'heure sur sa propre ligne : collée à la phrase,
                        « 19 h 46 PF-1026-023 » se lisait comme une seule suite
                        de chiffres — vu à l'écran, pas en épreuve. */}
                    <span className="muted">{fmtDateTime(e.at)}</span>
                    {/* La phrase du fil porte déjà la référence, le client, l'état
                        et le motif : la découper en colonnes la réécrirait, et
                        deux écritures de la même phrase finissent par diverger. */}
                    <span dangerouslySetInnerHTML={{ __html: e.html }} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className={styles.actions}>
            <Link className="btn sm ghost" href="/desk/messages">
              {t("Messages")} →
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
