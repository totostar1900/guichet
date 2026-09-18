import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { DeskNav } from "@/components/DeskNav";
import { StartTour } from "@/components/DeskTour";
import { GUIDE, ROLES } from "@/data/desk-guide";
import styles from "./page.module.css";

export const metadata = { title: "Guide du desk" };

/**
 * The desk manual: the two roles, the guided tour, then one section per page
 * with every field explained and a screenshot when one has been captured
 * (public/guide/<key>.png — regenerated with `npm run guide:shots`).
 */
export default function GuidePage() {
  const shot = (key: string) => (existsSync(path.join(process.cwd(), "public", "guide", `${key}.png`)) ? `/guide/${key}.png` : null);
  return (
    <>
      <DeskNav current="/desk/guide" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">Guide du desk</div>
          <h1 className="display">Le mode d&apos;emploi, page par page</h1>
          <p className="muted">Une visite guidée de dix étapes qui vous promène dans l&apos;application, puis le détail de chaque page et de chaque champ. Le guide suit l&apos;application : quand une page change, cette page change.</p>
        </div>
        <StartTour />
      </div>

      <div className={styles.roles}>
        {(["operateur", "responsable"] as const).map((k) => (
          <div key={k} className={`panel ${styles.role}`} data-coach={k === "operateur" ? "role-op" : "role-resp"}>
            <div className="panel-h">
              <h2>{ROLES[k].title}</h2>
            </div>
            <div className={styles.roleBody}>
              <p>{ROLES[k].text}</p>
              <b>Ne peut pas</b>
              <ul>
                {ROLES[k].cannot.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <nav className={styles.toc} aria-label="Sommaire">
        {GUIDE.map((s) => (
          <a key={s.key} href={`#${s.key}`}>
            {s.title}
          </a>
        ))}
      </nav>

      {GUIDE.map((s) => {
        const img = shot(s.key);
        return (
          <section key={s.key} id={s.key} className={`panel ${styles.section}`}>
            <div className="panel-h">
              <h2>{s.title}</h2>
              <span className={`${styles.roleTag} ${s.role === "responsable" ? styles.resp : ""}`}>{s.role === "responsable" ? "Responsable" : "Opérateur desk"}</span>
              {!s.path.includes("…") && (
                <Link className="btn sm ghost" href={s.path}>
                  Ouvrir la page
                </Link>
              )}
            </div>
            <div className={styles.body}>
              <div className={styles.intro}>
                <p>{s.purpose}</p>
                <p className={styles.when}>
                  <b>Quand :</b> {s.when}
                </p>
              </div>
              {img && (
                <figure className={styles.shot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Capture d'écran — ${s.title}`} loading="lazy" />
                  <figcaption>{s.title}</figcaption>
                </figure>
              )}
              <dl className={styles.fields}>
                {s.fields.map((f) => (
                  <div key={f.name}>
                    <dt>{f.name}</dt>
                    <dd>
                      {f.what}
                      {f.how && <span className={styles.how}>{f.how}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              {s.tips && (
                <ul className={styles.tips}>
                  {s.tips.map((t) => (
                    <li key={t}>{t}</li>
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
