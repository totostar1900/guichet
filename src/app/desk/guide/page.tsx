import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { DeskNav } from "@/components/DeskNav";
import { StartTour } from "@/components/DeskTour";
import { GUIDE, ROLES, TOUR } from "@/data/desk-guide";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const metadata = { title: "Guide du desk" };

/**
 * The desk manual: the two roles, the guided tour, then one section per page
 * with every field explained and a screenshot when one has been captured
 * (public/guide/<key>.png — regenerated with `npm run guide:shots`).
 */
export default async function GuidePage() {
  const t = await getT();
  const shot = (key: string) => (existsSync(path.join(process.cwd(), "public", "guide", `${key}.png`)) ? `/guide/${key}.png` : null);
  return (
    <>
      <DeskNav current="/desk/guide" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Guide du desk")}</div>
          <h1 className="display">{t("Le mode d'emploi, page par page")}</h1>
          <p className="muted">{t("Une visite guidée de {n} étapes qui vous promène dans l'application, puis le détail de chaque page et de chaque champ. Le guide suit l'application : quand une page change, cette page change.", { n: TOUR.length })}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="btn sm" href="/desk/docs">
            {t("Documentation")} →
          </Link>
          <StartTour />
        </div>
      </div>

      <div className={styles.roles}>
        {(["operateur", "responsable"] as const).map((k) => (
          <div key={k} className={`panel ${styles.role}`} data-coach={k === "operateur" ? "role-op" : "role-resp"}>
            <div className="panel-h">
              <h2>{t(ROLES[k].title)}</h2>
            </div>
            <div className={styles.roleBody}>
              <p>{t(ROLES[k].text)}</p>
              <b>{t("Ne peut pas")}</b>
              <ul>
                {ROLES[k].cannot.map((c) => (
                  <li key={c}>{t(c)}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <nav className={styles.toc} aria-label={t("Sommaire")}>
        {GUIDE.map((s) => (
          <a key={s.key} href={`#${s.key}`}>
            {t(s.title)}
          </a>
        ))}
      </nav>

      {GUIDE.map((s) => {
        const img = shot(s.key);
        return (
          <section key={s.key} id={s.key} className={`panel ${styles.section}`}>
            <div className="panel-h">
              <h2>{t(s.title)}</h2>
              <span className={`${styles.roleTag} ${s.role === "responsable" ? styles.resp : ""}`}>{t(s.role === "responsable" ? "Responsable" : "Opérateur desk")}</span>
              {!s.path.includes("…") && (
                <Link className="btn sm ghost" href={s.path}>
                  {t("Ouvrir la page")}
                </Link>
              )}
            </div>
            <div className={styles.body}>
              <div className={styles.intro}>
                <p>{t(s.purpose)}</p>
                <p className={styles.when}>
                  <b>{t("Quand :")}</b> {t(s.when)}
                </p>
              </div>
              {img && (
                <figure className={styles.shot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${t("Capture d'écran")} — ${t(s.title)}`} loading="lazy" />
                  <figcaption>{t(s.title)}</figcaption>
                </figure>
              )}
              <dl className={styles.fields}>
                {s.fields.map((f) => (
                  <div key={f.name}>
                    <dt>{t(f.name)}</dt>
                    <dd>
                      {t(f.what)}
                      {f.how && <span className={styles.how}>{t(f.how)}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              {s.tips && (
                <ul className={styles.tips}>
                  {s.tips.map((tip) => (
                    <li key={tip}>{t(tip)}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
