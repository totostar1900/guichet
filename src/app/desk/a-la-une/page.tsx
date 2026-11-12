import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cohortesDeTous } from "@/lib/desk/cohortes-data";
import { displayStatus, isActionable } from "@/lib/domain/status";
import { summarize } from "@/lib/domain/summary";
import type { Offer } from "@/lib/domain/types";
import { FeaturePanel } from "../featured/FeaturePanel";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "À la une" };

/**
 * « À LA UNE », EN PAGE PROPRE (12 novembre 2026, planche « Annonces », choix 1B).
 *
 * Le panneau vivait dans le Carnet, entre « Aujourd'hui » et « Intentions reçues » : il ne se lisait pas seul, et la journée du desk n'avait pas de page pour ce que la
 * maison met devant les clients. Il garde exactement son contenu (les lignes à la une, les candidates, le segment, qui serait prévenu) ; seule sa place change. Le Carnet
 * ne garde que la tuile « À la une 1/3 », qui mène ici.
 */
export default async function ALaUnePage() {
  const t = await getT();
  await requireDesk("/desk/a-la-une");
  const now = new Date();
  const offers = await repo().listOffers();
  /* Les cohortes se comptent ici pour le choix du segment : écrire aux « Fidèles » sans savoir combien ils sont, c'est écrire à l'aveugle. */
  const cohortes = await cohortesDeTous().catch(() => ({ comptes: {}, parClient: new Map(), bareme: 0 }));

  // À la une : ce qui l'est maintenant, et les lignes qui pourraient l'être (ouvertes ou cotées, non masquées).
  const today = now.toISOString().slice(0, 10);
  const featRow = (o: Offer) => ({ id: o.id, title: o.title, hero: summarize(o, now, { fine: true }).hero, deadline: o.kind === "MARCHE" || o.kind === "FONDS" ? undefined : o.deadlineAt.slice(0, 10), featured: o.featured });
  const featActive = offers.filter((o) => o.featured && o.featured.until >= today).map((o) => ({ ...featRow(o), closed: !isActionable(displayStatus(o, now)) }));
  const featCandidates = offers.filter((o) => !o.hidden && !(o.featured && o.featured.until >= today) && isActionable(displayStatus(o, now))).map(featRow);

  return (
    <>
      <DeskNav current="/desk/a-la-une" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("À la une")}</h1>
          <p className="muted">{t("Les lignes que la maison met en avant dans le Guichet : trois au plus, une raison factuelle, une date de fin. Jamais un conseil.")}</p>
        </header>
        <FeaturePanel active={featActive} candidates={featCandidates} comptes={cohortes.comptes} />
      </main>
    </>
  );
}
