import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { niveauDuMarche, type NiveauMarche } from "@/lib/market/niveau-marche";
import type { IntakeItem } from "@/lib/domain/types";
import { extractionAvailable } from "@/lib/intake/extract";
import { fmtDateTime } from "@/lib/format";
import { NewSourceForm } from "./NewSourceForm";
import { ValidateForm } from "./ValidateForm";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "À valider" };

const SOURCE_LABEL: Record<IntakeItem["source"], string> = {
  mail: "E-mail",
  pdf: "PDF",
  photo: "Photo",
  texte: "Texte",
};
const STATE_LABEL: Record<IntakeItem["state"], [string, string]> = {
  a_valider: ["new", "À valider"],
  en_revue: ["review", "En revue"],
  publie: ["ok", "Publié"],
  bloque: ["blocked", "À compléter"],
  rejete: ["off", "Rejeté"],
};


/** Une ligne de la file : la source, son état, son titre, sa provenance. */
function QueueItem({ q, current, label }: { q: IntakeItem; current: boolean; label: string }) {
  const cls = STATE_LABEL[q.state][0];
  return (
    <Link href={`/desk/a-valider?item=${q.id}`} className={styles.qitem} aria-current={current ? "true" : undefined}>
      <div className={styles.meta}>
        <span className={`${styles.src} ${styles[`src_${q.source}`]}`}>{SOURCE_LABEL[q.source]}</span>
        <span className={`${styles.st} ${styles[`st_${cls}`]}`}>
          {label}
          {q.state === "publie" && q.publishedAt ? ` · ${fmtDateTime(q.publishedAt)}` : ""}
        </span>
      </div>
      <b>{q.title}</b>
      <span className={styles.meta}>{q.fromLabel}</span>
    </Link>
  );
}
export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; nouveau?: string }>;
}) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const queue = await r.listIntake();
  const todo = queue.filter(
    (q) =>
      q.state === "a_valider" || q.state === "en_revue" || q.state === "bloque",
  );
  // Publiées et rejetées : rien n'y attend le desk. Elles restent atteignables,
  // parce qu'on republie une version et qu'on rouvre une source rejetée, mais
  // elles cessent de pousser hors de l'écran ce qui reste à faire.
  const classees = queue
    .filter((q) => q.state === "publie" || q.state === "rejete")
    .sort((a, b) => (b.publishedAt ?? b.receivedAt).localeCompare(a.publishedAt ?? a.receivedAt));
  const selectedId = sp.item ?? todo[0]?.id;
  const selected = selectedId
    ? queue.find((q) => q.id === selectedId)
    : undefined;
  const offer = selected?.offerId
    ? await r.getOffer(selected.offerId)
    : undefined;

  /* L'ANCIENNE RÉFÉRENCE A QUITTÉ CETTE PAGE, et avec elle sa dernière
     décision : le chiffre qui partait dans le champ du BTA. Elle appariait par
     l'ÉTIQUETTE de durée ; « niveauDuMarche », ci-dessous, apparie par la vie
     restante, et NiveauEtPrix convertit ce niveau dans l'unité du champ —
     taux précompté pour un bon, prix pour une obligation — avec les dates de
     CETTE ligne. Voir la note de ValidateForm pour la mesure qui a tranché. */
  const draft = selected?.draft;

  /**
   * LE NIVEAU DU MARCHÉ, apparié par la VIE RESTANTE et non par l'étiquette.
   *
   * L'ancienne référence ci-dessus demandait au dépôt les séances de MÊME
   * ÉTIQUETTE de durée, ce qui faisait servir de modèle à une ligne neuve de
   * quatre ans un abondement auquel il ne restait qu'un an et demi à courir.
   * La nouvelle mesure a besoin de tout l'historique du pays et de
   * l'instrument, et trie elle-même : le filtre ne peut donc plus vivre dans
   * la requête. Soixante séances suffisaient à l'étiquette ; un panier
   * d'échéance en demande davantage, d'où la fenêtre large.
   *
   * Les deux cohabitent le temps que la seconde fasse ses preuves à l'écran.
   */
  let niveau: NiveauMarche | undefined;
  if (draft && draft.country && draft.deadlineAt && draft.maturityOn && (draft.kind === "BTA" || draft.kind === "OTA")) {
    const on = draft.deadlineAt.slice(0, 10);
    const annees = (Date.parse(draft.maturityOn) - Date.parse(on)) / 86_400_000 / 365;
    if (annees > 0) {
      const historique = await r.listAuctionResults({ instrument: draft.kind, limit: 600 });
      niveau = niveauDuMarche({ country: draft.country, instrument: draft.kind, annees, on }, historique);
    }
  }
  const showNew = sp.nouveau === "1" || (!selected && queue.length === 0);

  return (
    <>
      <DeskNav
        current="/desk/a-valider"
        badges={{ "/desk/a-valider": todo.length }}
      />

      <div className={styles.intake}>
        <aside className={styles.queue} aria-label={t("File d'entrée")}>
          <Link
            href="/desk/a-valider?nouveau=1"
            className={`btn ${styles.newBtn}`}
          >
            {t("+ Nouvelle source")}
          </Link>
          {!extractionAvailable() && (
            <div className={styles.noApi}>
              {t(
                "Extraction automatique désactivée : ajoutez ANTHROPIC_API_KEY dans .env.local. Les champs se remplissent à la main.",
              )}
            </div>
          )}
          {todo.map((q) => (
            <QueueItem
              key={q.id}
              q={q}
              current={q.id === selected?.id && !showNew}
              label={t(STATE_LABEL[q.state][1])}
            />
          ))}
          {todo.length === 0 && classees.length > 0 && (
            <p className={styles.inbox}>{t("Rien n'attend le desk.")}</p>
          )}
          {classees.length > 0 && (
            <details className={styles.filed} open={classees.some((q) => q.id === selected?.id) && !showNew}>
              <summary>
                {t("Classées")} <span>{classees.length}</span>
              </summary>
              {classees.map((q) => (
                <QueueItem
                  key={q.id}
                  q={q}
                  current={q.id === selected?.id && !showNew}
                  label={t(STATE_LABEL[q.state][1])}
                />
              ))}
            </details>
          )}
        </aside>

        <div className={styles.main}>
          {/* Une clef par fiche : sans elle, React garde le meme formulaire d une
              source a l autre. Les champs non controles conservent alors la valeur
              tapee sur la precedente, et « Publier » aurait pose le taux d une ligne
              sur une autre. Ce n etait pas un affichage en retard, c etait une
              publication fausse a un clic. */}
          {showNew ? (
            <NewSourceForm extraction={extractionAvailable()} />
          ) : selected ? (
            <ValidateForm key={selected.id} item={selected} offer={offer} niveau={niveau} />
          ) : (
            <div className="empty">
              {t("Sélectionnez une source ou déposez-en une nouvelle.")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
