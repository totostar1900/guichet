import Link from "next/link";
import { fmtDateTime } from "@/lib/format";
import { GENRE_LABEL, GENRES, GESTES, type ActionClient, type Genre } from "@/lib/domain/journal-client";
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
  t,
}: {
  rows: ActionClient[];
  noms: Map<string, string>;
  demo: Set<string>;
  genre: string;
  client?: string;
  t: (s: string, v?: Record<string, string>) => string;
}) {
  const lien = (g: string) => {
    const u = new URLSearchParams({ registre: "gestes", ...(client ? { client } : {}), ...(g ? { genre: g } : {}) });
    return `/desk/journal?${u.toString()}`;
  };
  return (
    <>
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
                    {a.canal && <small className="muted"> {a.canal}</small>}
                  </td>
                  <td>
                    <small className="mono">{a.ip ?? "—"}</small>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t("Aucun geste sur ce filtre. Le registre a commencé le 10 octobre 2026 : rien d'antérieur n'y figure.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
