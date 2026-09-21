import { fold } from "@/lib/text";
import Link from "next/link";
import { Suspense } from "react";
import { Toolbar } from "@/components/ui/Toolbar";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { getLang, getT } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { fmtDate, fmtDay, fmtTime } from "@/lib/format";
import { publishedNews } from "@/lib/news";
import { linkHref, RUBRIC_LABEL, RUBRICS, type NewsItem } from "@/lib/news/model";
import { positionsFrom } from "@/lib/positions";
import { summarize } from "@/lib/domain/summary";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Actualités") };
}

/** The reader's view: what the desk selected this month, grouped by day, the original one click away. */
export default async function NewsPage({ searchParams }: { searchParams: Promise<{ rubrique?: string; q?: string; archive?: string }> }) {
  const [t, lang, sp, session] = await Promise.all([getT(), getLang(), searchParams, getSession()]);
  const now = new Date();
  const archive = sp.archive === "1";
  const all = await publishedNews(now, archive);
  const q = fold(sp.q ?? "").trim();
  const rubric = (RUBRICS as string[]).includes(sp.rubrique ?? "") ? sp.rubrique : "";
  const shown = all.filter((n) => (!rubric || n.rubric === rubric) && (!q || fold(`${n.title} ${n.titleEn ?? ""} ${n.why} ${n.source} ${n.links.map((l) => l.label).join(" ")}`).includes(q)));
  const featured = !q && !rubric && !archive ? shown.find((n) => n.featured) : undefined;
  const rest = shown.filter((n) => n !== featured);
  const byDay = new Map<string, NewsItem[]>();
  const firstDay = rest[0]?.publishedAt.slice(0, 10);
  for (const n of rest) {
    const day = n.publishedAt.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), n]);
  }
  const title = (n: NewsItem) => (lang === "en" && n.titleEn ? n.titleEn : t(n.title));
  const why = (n: NewsItem) => (lang === "en" && n.whyEn ? n.whyEn : t(n.why));
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const thisWeek = all.filter((n) => n.publishedAt >= weekAgo).length;

  // Signed-in readers: what was published about the lines they hold or asked for.
  let mine: { href: string; label: string; hint: string }[] = [];
  if (session && session.role === "client") {
    const r = repo();
    const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
    const own = intents.filter((i) => i.clientId === session.userId);
    const held = new Set([...positionsFrom(own, offers, now).map((p) => p.offer.id), ...own.map((i) => i.offerId)]);
    mine = all
      .flatMap((n) => n.links.filter((l) => l.kind === "offer" && held.has(l.key)).map((l) => ({ n, l })))
      .filter((x, i, arr) => arr.findIndex((y) => y.l.key === x.l.key) === i)
      .slice(0, 5)
      .map(({ n, l }) => {
        const o = offers.find((x) => x.id === l.key);
        return { href: `/offres/${l.key}`, label: l.label, hint: o ? t(summarize(o, now).status) : fmtDate(n.publishedAt, false) };
      });
  }

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.head}>
          <span className="eyebrow">{t("Actualités")}</span>
          <h1>{t("Ce qui bouge sur le marché, en trois lignes")}</h1>
          <p>{t("Chaque jour, le desk retient les publications qui comptent pour vos lignes, communiqués des Trésors, bulletins de la BVMAC, avis de la COSUMAF, presse économique, et dit pourquoi. Les articles restent chez leurs éditeurs : le Guichet renvoie vers l'original.")}</p>
        </div>

        <div data-coach="filters">
          <Suspense>
            <Toolbar placeholder={t("Une ligne, un émetteur, un mot")} chipKey="rubrique" chips={[{ value: "", label: t("Tout") }, ...RUBRICS.map((r) => ({ value: r, label: t(RUBRIC_LABEL[r]), count: all.filter((n) => n.rubric === r).length || undefined }))]} />
          </Suspense>
        </div>

        {featured && (
          <article className={styles.featured} data-coach="featured">
            <div className={styles.when}>
              <b>{t("À LA UNE")}</b>
              <span>{fmtDate(featured.publishedAt, false)}</span>
              <small>{featured.source}</small>
            </div>
            <div className={styles.body}>
              <a className={styles.title} href={featured.url} target="_blank" rel="noreferrer noopener">
                {title(featured)} ↗
              </a>
              <p className={styles.why}>
                <b>{t("Pourquoi ça compte.")}</b> {why(featured)}
              </p>
              <Chips n={featured} />
              <span className={styles.meta} style={{ textAlign: "left", flexDirection: "row" }}>
                {featured.format ? `${t(featured.format)} · ` : ""}
                {featured.domain}
              </span>
            </div>
          </article>
        )}

        <div className={styles.list}>
          {rest.length === 0 && <div className={styles.empty}>{q || rubric ? t("Aucune publication ne correspond.") : t("Rien à signaler pour l'instant : le desk publie ici dès qu'une source suivie dit quelque chose qui compte pour vos lignes.")}</div>}
          {[...byDay.entries()].map(([day, items]) => (
            <div key={day}>
              <div className={styles.day}>{fmtDay(`${day}T12:00:00`)}</div>
              {items.map((n, k) => (
                <article key={n.id} className={styles.item} data-coach={k === 0 && day === firstDay ? "item" : undefined}>
                  <div className={styles.when}>
                    <b>{fmtTime(n.publishedAt)}</b>
                    <span className={`${styles.src} ${styles[n.rubric] ?? ""}`}>{n.source}</span>
                  </div>
                  <div className={styles.body}>
                    <a className={styles.title} href={n.url} target="_blank" rel="noreferrer noopener">
                      {title(n)} ↗
                    </a>
                    <p className={styles.why}>
                      <b>{t("Pourquoi ça compte.")}</b> {why(n)}
                    </p>
                    <Chips n={n} />
                  </div>
                  <div className={styles.meta}>
                    <span>
                      {n.domain}
                      {n.format ? ` · ${t(n.format)}` : ""}
                    </span>
                    {n.publishedBy && (
                      <span>
                        {t("Sélection")} : {t("desk")} · {n.publishedBy}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.foot}>
          <span>{t(thisWeek > 1 ? "{n} publications cette semaine · {m} en tout" : "{n} publication cette semaine · {m} en tout", { n: thisWeek, m: all.length })}</span>
          {archive ? <Link href="/actualites">{t("Retour au mois en cours")} →</Link> : <Link href="/actualites?archive=1">{t("Semaines précédentes")} →</Link>}
        </div>
        <CoachMarks
          id="actualites"
          replayLabel={t("Comment lire cette page ?")}
          stops={[
            ...(featured ? [{ target: "featured", title: t("À la une"), text: t("Une seule publication en tête, choisie par le desk : celle qui change quelque chose pour le plus de lignes aujourd'hui. Le titre ouvre l'original chez son éditeur.") }] : []),
            ...(rest.length ? [{ target: "item", title: t("Pourquoi ça compte"), text: t("Sous chaque titre, deux lignes du desk : ce que la publication change pour vos lignes, sans recommandation. Les puces mènent à la ligne, à la société ou au terme concerné.") }] : []),
            { target: "filters", title: t("Par rubrique ou par mot"), text: t("Trésors, BVMAC, Sociétés, Fonds, Réglementation : ou une recherche : une ligne, un émetteur, un mot. Les publications restent visibles trente jours, puis dans « Semaines précédentes ».") },
            { target: "digest", title: t("Le vendredi, un résumé"), text: t("Les liens de la semaine, par WhatsApp ou e-mail, aux clients qui acceptent nos messages. Rien d'autre, et STOP l'arrête.") },
          ]}
        />
        <p className={styles.legal}>{t("Les articles et communiqués appartiennent à leurs éditeurs ; le Guichet n'en reproduit ni le texte ni les images. La sélection et les deux lignes de lecture sont rédigées par le desk de Purpose Capital et n'ont pas valeur de conseil.")}</p>
      </div>

      <aside className={styles.rail}>
        {session?.role === "client" && (
          <div className={styles.card}>
            <span className="eyebrow">{t("En lien avec vos lignes")}</span>
            {mine.length ? (
              <div className={styles.mine}>
                {mine.map((m) => (
                  <Link key={m.href} href={m.href}>
                    <span>{m.label}</span>
                    <span>{m.hint}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p>{t("Rien de publié ce mois-ci sur les lignes que vous détenez ou avez demandées.")}</p>
            )}
            <small>{t("D'après vos ordres et positions.")}</small>
          </div>
        )}
        <div className={styles.card} data-coach="digest">
          <span className="eyebrow">{t("Être prévenu")}</span>
          <p>{t("Un résumé le vendredi, par WhatsApp ou e-mail, avec les liens de la semaine. Rien d'autre.")}</p>
          <small>{session ? t("Envoyé à tous les clients qui acceptent nos messages ; répondez STOP pour l'arrêter.") : t("Réservé aux clients : ouvrez un compte ou connectez-vous.")}</small>
          {!session && (
            <Link className="btn sm" href="/connexion?next=/actualites">
              {t("Se connecter")}
            </Link>
          )}
        </div>
        <div className={styles.card}>
          <span className="eyebrow">{t("Sources suivies")}</span>
          <div className={styles.sources}>
            <span>{t("BVMAC : bulletins et avis")}</span>
            <span>{t("Trésors publics : Cameroun, RCA, Congo, Gabon, Tchad, Guinée équatoriale")}</span>
            <span>{t("COSUMAF : visas et décisions")}</span>
            <span>{t("BEAC : marché des titres publics")}</span>
            <span>{t("Sociétés cotées : communiqués, AGO")}</span>
            <span>{t("Sociétés de gestion : lettres et VL")}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

async function Chips({ n }: { n: NewsItem }) {
  const t = await getT();
  if (n.links.length === 0) return null;
  return (
    <div className={styles.chips}>
      {n.links.map((l) => (
        <Link key={`${l.kind}-${l.key}`} href={linkHref(l)}>
          {l.kind === "term" ? `${t("Guide")} · ${t(l.label)}` : t(l.label)}
        </Link>
      ))}
    </div>
  );
}
