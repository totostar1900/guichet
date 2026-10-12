import Link from "next/link";
import { fmtDateTime } from "@/lib/format";
import { GENRE_LABEL, GENRES, GESTES, MOIS_DE_DETAIL, type ActionClient, type Genre } from "@/lib/domain/journal-client";
import styles from "./page.module.css";

/**
 * LE REGISTRE DES GESTES, à côté de celui des décisions.
 *
 * Deux registres sous une seule adresse : « le journal » est un sujet, et lui
 * donner deux pages ferait chercher laquelle ouvrir. Celui-ci n'est pas
 * chaîné, ne prouve rien, et raconte ce que les clients ont fait ; l'autre
 * prouve ce que la maison a décidé.
 */
export function Gestes({
  rows,
  noms,
  demo,
  genre,
  client,
  du,
  au,
  q,
  aujourdHui,
  combien,
  t,
}: {
  rows: ActionClient[];
  noms: Map<string, string>;
  demo: Set<string>;
  genre: string;
  client?: string;
  du?: string;
  au?: string;
  q?: string;
  aujourdHui: string;
  /** Ce que le registre pèse, pour le dire au bas de la page. */
  combien: { lignes30j: number; clients30j: number; total: number };
  t: (s: string, v?: Record<string, string>) => string;
}) {
  const lien = (g: string) => {
    const u = new URLSearchParams({ registre: "gestes", ...(client ? { client } : {}), ...(g ? { genre: g } : {}) });
    return `/desk/journal?${u.toString()}`;
  };
  return (
    <>
      {/* LA BARRE DE FILTRES DE LA MAQUETTE : deux bornes de date, la famille,
          un champ « qui », et l'export. Les onglets de famille restent à côté :
          ils se cliquent sans formulaire, et c'est le geste le plus fréquent. */}
      <form className={styles.filtres} action="/desk/journal">
        <input type="hidden" name="registre" value="gestes" />
        <label>
          <span>{t("Du")}</span>
          <input type="date" name="du" defaultValue={du} max={aujourdHui} />
        </label>
        <label>
          <span>{t("Au")}</span>
          <input type="date" name="au" defaultValue={au} max={aujourdHui} />
        </label>
        <label className={styles.qui}>
          <span>{t("Qui")}</span>
          <input name="q" defaultValue={q} placeholder={t("un client, un objet, une référence")} />
        </label>
        {genre && <input type="hidden" name="genre" value={genre} />}
        <button className="btn sm" type="submit">
          {t("Appliquer")}
        </button>
        <a className="btn sm ghost" href={`/desk/journal/gestes.csv?${new URLSearchParams({ ...(du ? { du } : {}), ...(au ? { au } : {}), ...(q ? { q } : {}), ...(genre ? { genre } : {}), ...(client ? { client } : {}) })}`}>
          {t("Exporter CSV")}
        </a>
        {(du || au || q || genre || client) && (
          <Link className={styles.vider} href="/desk/journal?registre=gestes">
            {t("Tout voir")}
          </Link>
        )}
      </form>

      <nav className={styles.tabs} aria-label={t("Famille")}>
        <Link href={lien("")} aria-current={genre === "" ? "page" : undefined}>
          {t("Tout")}
        </Link>
        {GENRES.map((g: Genre) => (
          <Link key={g} href={lien(g)} aria-current={g === genre ? "page" : undefined}>
            {t(GENRE_LABEL[g])}
          </Link>
        ))}
      </nav>

      {client && (
        <p className="muted" style={{ fontSize: ".84rem" }}>
          {t("Les gestes de {q} seulement.", { q: noms.get(client) ?? client })}{" "}
          <Link href={`/desk/journal?registre=gestes${genre ? `&genre=${genre}` : ""}`}>{t("voir tout le monde")}</Link>
        </p>
      )}

      <div className="panel">
        <div className="scroll-x">
          <table className={`tbl ${styles.tbl}`}>
            <thead>
              <tr>
                <th>{t("Quand")}</th>
                <th>{t("Qui")}</th>
                <th>{t("Geste")}</th>
                <th>{t("Objet")}</th>
                <th>{t("Famille")}</th>
                <th>{t("Canal")}</th>
                <th>{t("Origine")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{fmtDateTime(a.at)}</td>
                  <td>
                    <Link href={`/desk/journal?registre=gestes&client=${a.userId}`}>{noms.get(a.userId) ?? a.userId}</Link>
                    {demo.has(a.userId) && <span className="st"> {t("démo")}</span>}
                    {/* LEQUEL DES TROIS. Un compte de société ou d indivision est
                        tenu par plusieurs mains ; sans ce nom, la colonne dit le
                        compte et tait la personne. */}
                    {a.agissant && (
                      <>
                        <br />
                        <small className="muted">{t("geste de {q}", { q: a.agissant })}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <b>{t(GESTES[a.geste]?.auDesk ?? a.geste)}</b>
                    {a.detail && (
                      <>
                        <br />
                        <small className="muted">{a.detail}</small>
                      </>
                    )}
                  </td>
                  <td className="mono">{a.objet ?? "—"}</td>
                  <td>
                    <span className="st">{t(GENRE_LABEL[a.genre] ?? a.genre)}</span>
                  </td>
                  {/* LE CANAL ET L'ORIGINE SONT DEUX CHOSES, et les mêler dans
                      une colonne cachait l'un derrière l'autre. « Appareil »,
                      que la maquette demande, n'existe pas au registre : le
                      geste porte une adresse, pas un nom d'appareil, et
                      nommer la colonne autrement serait promettre ce qu'on
                      n'a pas. */}
                  <td>{a.canal ?? <span className="muted">—</span>}</td>
                  <td>
                    <small className="mono">{a.ip ?? "—"}</small>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    {t("Aucun geste sur ce filtre. Le registre a commencé le 10 octobre 2026 : rien d'antérieur n'y figure.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LES DEUX PANNEAUX DE LA MAQUETTE. Le premier chiffre ce que le
          registre coûte et jusqu'à quand il garde ; le second dit ce qu'il
          oblige. Un journal qu'on ne déclare pas est un fichier caché sur sa
          propre clientèle ; déclaré, c'est un service. */}
      <div className={styles.deuxPanneaux}>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Combien de lignes, et jusqu'à quand")}</h2>
          </div>
          <dl className={styles.mesures}>
            <div>
              <dt>{t("Sur trente jours, {n} client(s)", { n: String(combien.clients30j) })}</dt>
              <dd className="num">{combien.lignes30j}</dd>
            </div>
            <div>
              <dt>{t("Au rythme observé, par an")}</dt>
              <dd className="num">{Math.round((combien.lignes30j * 365) / 30)}</dd>
            </div>
            <div>
              <dt>{t("Tout le registre à ce jour")}</dt>
              <dd className="num">{combien.total}</dd>
            </div>
            <div>
              <dt>{t("Détail gardé")}</dt>
              <dd>{t("{n} mois", { n: String(MOIS_DE_DETAIL) })}</dd>
            </div>
            <div>
              <dt>{t("Puis")}</dt>
              <dd>{t("un résumé par mois, sans fin")}</dd>
            </div>
          </dl>
          <p className={styles.note}>
            {t(
              "Treize mois, pour qu'une comparaison d'une année sur l'autre tombe toujours dans le détail. Le résumé mensuel garde les compteurs qui nourrissent l'activité, et perd le geste lui-même.",
            )}
          </p>
        </div>

        <div className="panel">
          <div className="panel-h">
            <h2>{t("Ce que ce registre oblige à faire")}</h2>
          </div>
          <ul className={styles.oblige}>
            <li>{t("Un article de la convention qui dit ce qui est noté, pourquoi, et pendant combien de temps.")}</li>
            <li>{t("Une version de la convention à reprendre, donc un consentement à redemander.")}</li>
            <li>{t("La même activité visible par le client sur son propre écran, puisqu'elle parle de lui.")}</li>
            <li>{t("Aucune décision automatique : une mesure se prend par une personne, avec un motif.")}</li>
          </ul>
          <p className={styles.note}>
            {t("Un journal qu'on ne déclare pas est un fichier caché sur sa propre clientèle. Déclaré, c'est un service : le client y lit ses connexions et repère une intrusion avant nous.")}
          </p>
        </div>
      </div>
    </>
  );
}
