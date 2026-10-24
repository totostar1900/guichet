import Link from "next/link";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { getT } from "@/i18n/server";
import { indexPageData } from "@/lib/market/index-data";
import { quarters } from "@/lib/market/index-quarter";
import { quarterGlance } from "@/lib/market/quarter-glance";
import { BackToTop } from "@/components/BackToTop";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Les notes de marché") };
}

const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(Number(v.toFixed(d)) === 0 ? 0 : v, d)}`;

/**
 * L'archive des notes trimestrielles, par année.
 *
 * Le pas à pas d'une note ne montre que ses deux voisines : c'est ce qui lui
 * permet de garder la même hauteur quand il y aura vingt notes. Il n'est
 * honnête qu'avec cette page derrière lui, qui montre la série entière, et
 * dit d'un trimestre ce qu'il a fait avant qu'on l'ouvre.
 */
export default async function NotesArchivePage() {
  const t = await getT();
  const data = await indexPageData();
  const closed = quarters(data);
  const years = [...new Set(closed.map((q) => q.year))].sort((a, b) => b - a);
  const qlabel = (q: { q: number; year: number }) => t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year });

  return (
    <Glissement>
      <div className={styles.page}>
        {/* L'EN-TÊTE DE L'ÉTALON, et le cran en arrière qui manquait : cette
            archive est sous « L'indice », et on n'en revenait que par le
            bouton du navigateur. Sa feuille posait aussi
            « font-family: var(--font-display) » sur son titre, c'est-à-dire la
            fonte de l'interface sous un autre nom — le jeton vaut
            « var(--font-ui) » depuis le 24 octobre. */}
        <EnTete
          retour={{ href: "/indice", mot: t("L'indice") }}
          titre={t("Les notes de marché")}
          phrase={t("Une note par trimestre sur l'indice BVMAC All Share : ce que le trimestre a fait, les sociétés derrière le chiffre, ce qui s'est échangé. Chacune est calculée sur les seules séances de son trimestre, et se lit donc de la même façon un an plus tard.")}
        />

        {closed.length === 0 ? (
          <p className={styles.empty}>{t("La première note paraîtra à la clôture du premier trimestre complet lu.")}</p>
        ) : (
          years.map((year) => (
            <section key={year} className={styles.year}>
              <h2>{year}</h2>
              <div className={styles.list}>
                {closed
                  .filter((q) => q.year === year)
                  .map((q) => {
                    const g = quarterGlance(data, q);
                    return (
                      <Link key={q.key} href={`/indice/note/${q.key.toLowerCase()}`} className={styles.note}>
                        <b>{qlabel(q)}</b>
                        <span className={styles.dates}>
                          {t("séances du {a} au {b}", { a: fmtDate(q.from, false), b: fmtDate(q.to, false) })}
                        </span>
                        {g && (
                          <span className={styles.figs}>
                            <em className={g.ret > 0 ? styles.up : g.ret < 0 ? styles.down : ""}>{signed(g.ret)}</em>
                            <small>
                              {t("{n} points d’indice", { n: fmt(g.level) })} · {g.moved} / {g.sessions} {t("séances avec mouvement")}
                            </small>
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </section>
          ))
        )}

        <BackToTop />
      </div>
    </Glissement>
  );
}
