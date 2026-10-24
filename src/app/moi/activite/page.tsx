import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { MOIS_DE_DETAIL, GENRE_LABEL, GESTES, type ActionClient } from "@/lib/domain/journal-client";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votre activité" };

/**
 * CE QUE LE CLIENT VOIT DE SON PROPRE JOURNAL.
 *
 * Le registre des gestes existe d'abord pour la maison, et c'est précisément
 * pour cela qu'il doit se montrer. Un journal qu'on ne déclare pas est un
 * fichier tenu sur sa clientèle ; déclaré et visible, c'est un service : le
 * client y lit ses connexions et repère un accès qui n'est pas le sien avant
 * nous. La page est donc la même matière, à la deuxième personne.
 */
const jourDe = (at: string) => at.slice(0, 10);

export default async function ActivitePage() {
  const t = await getT();
  const s = await requireSession("/moi/activite");
  const r = repo();
  const [gestes, devices] = await Promise.all([
    r.listClientActions({ userId: s.userId, limit: 200 }),
    r.listDevices(s.userId).catch(() => []),
  ]);

  const parJour = new Map<string, ActionClient[]>();
  for (const g of gestes) {
    const j = jourDe(g.at);
    parJour.set(j, [...(parJour.get(j) ?? []), g]);
  }
  const derniere = gestes[0];
  const premiere = gestes[gestes.length - 1];

  return (
    <Glissement>
      <main className="wrap">
        <EnTete
          surTitre={t("Mon compte")}
          titre={t("Votre activité")}
          phrase={t(
            "Tout ce qui a été fait sur votre compte. Vous y voyez ce que nous voyons. Si une ligne vous surprend, dites-le nous : c'est le moyen le plus rapide de repérer un accès qui ne serait pas le vôtre.",
          )}
        />

        <div className={styles.compteurs}>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Dernier geste")}</span>
            <b>{derniere ? fmtDateTime(derniere.at) : "—"}</b>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Appareils reconnus")}</span>
            <b>{devices.length}</b>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Gestes enregistrés")}</span>
            <b>{gestes.length}</b>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Depuis le")}</span>
            <b>{premiere ? fmtDate(jourDe(premiere.at)) : "—"}</b>
          </div>
        </div>

        {gestes.length === 0 ? (
          <p className={styles.vide}>
            {t("Rien n'est encore enregistré. Le registre a commencé le 10 octobre 2026 : ce qui s'est passé avant n'y figure pas.")}
          </p>
        ) : (
          <div className={styles.fil}>
            {[...parJour.entries()].map(([jour, lignes]) => (
              <section key={jour}>
                <h2 className={styles.jour}>{fmtDate(jour)}</h2>
                {lignes.map((g) => (
                  <div key={g.id} className={styles.ligne}>
                    <span className={styles.heure}>{g.at.slice(11, 16)}</span>
                    <div className={styles.quoi}>
                      <div>{t(GESTES[g.geste]?.phrase ?? g.geste)}</div>
                      {(g.detail || g.objet) && <small className="muted">{[g.detail, g.objet].filter(Boolean).join(" · ")}</small>}
                      {g.genre === "securite" && (
                        <div>
                          <Link href="/moi/securite">{t("Ce n'était pas vous ?")}</Link>
                        </div>
                      )}
                    </div>
                    <span className="st">{t(GENRE_LABEL[g.genre] ?? g.genre)}</span>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        <div className="panel">
          <h2>{t("Ce que nous notons, et pour quoi faire")}</h2>
          <p>
            {t(
              "Vos gestes dans le Guichet, avec leur date, leur objet et l'appareil utilisé. Les pages que vous ouvrez ne sont notées que par l'objet consulté, une fois par jour : ni la durée, ni le défilement, ni la souris.",
            )}
          </p>
          <p className="muted">
            {t(
              "Cela sert à tenir votre dossier, à prouver ce que vous avez signé, à repérer un accès qui ne serait pas le vôtre, et à ne pas vous redemander ce que vous avez déjà donné.",
            )}
          </p>
          {/* COMBIEN DE TEMPS, et ce n'est pas un détail : une page qui dit ce
              qu'elle note sans dire jusqu'à quand ne déclare qu'à moitié. */}
          <p className="muted">{t("Le détail est gardé {n} mois, puis seuls des compteurs restent.", { n: String(MOIS_DE_DETAIL) })}</p>
        </div>

        {/* VOTRE COMPTE. Le panneau que la maquette pose à côté, et qui
            manquait. Des trois liens qu'elle dessine, un seul ne demande
            aucune décision : reprendre son activité en fichier. Le sommeil et
            la clôture sont des parcours à définir, pas des boutons à poser :
            ce qu'ils gèlent, qui les lève, et ce que la réglementation oblige à
            garder sous scellé. En attendant, le chemin existe et il est dit. */}
        <div className="panel">
          <h2>{t("Votre compte")}</h2>
          <p>
            <a href="/moi/activite/mon-activite.csv">{t("Recevoir toute mon activité en fichier")}</a>
          </p>
          <p className="muted">{t("Le fichier porte tout ce que cette page montre, depuis l'ouverture de votre compte, dans un format qu'un tableur ouvre.")}</p>
          <p>
            <Link href="/trader#conseiller">{t("Mettre mon compte en sommeil, ou en demander la clôture")}</Link>
          </p>
          <p className="muted">
            {t(
              "Ces deux demandes passent aujourd'hui par votre conseiller, qui vous dira ce qui est gelé, ce qui reste, et ce que la réglementation nous oblige à conserver. Rien n'est effacé sans que vous ayez lu la liste.",
            )}
          </p>
        </div>
      </main>
    </Glissement>
  );
}
