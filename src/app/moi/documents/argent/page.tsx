import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Annee, Ligne } from "../Ligne";
import { chargerLesRayons, type GenreDeMouvement } from "../rayons";
import { Rayon, titreDuRayon } from "../Rayon";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";
export const generateMetadata = () => titreDuRayon("argent");

/** Les puces du journal : un seul journal de l'argent, filtré par genre (planche « Mon argent », 16 novembre 2026, 4A). « Tout » est le défaut et garde aussi les papiers (relevés, avis de garde). */
const FILTRES: { cle: string; mot: string; genre?: GenreDeMouvement }[] = [
  { cle: "tout", mot: "Tout" },
  { cle: "versements", mot: "Versements", genre: "versement" },
  { cle: "prelevements", mot: "Prélèvements", genre: "prelevement" },
  { cle: "retraits", mot: "Retraits", genre: "retrait" },
];

/** Versements, prélèvements, retraits, droits de garde : un mouvement d'argent sans trace consultable est la seule chose que la convention promet et que la page ne donnait pas. */
export default async function ArgentPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const t = await getT();
  const s = await requireSession("/moi/documents/argent");
  const { filtre } = await searchParams;
  const actif = FILTRES.find((f) => f.cle === filtre) ?? FILTRES[0];
  const { argent: tout } = await chargerLesRayons(s.userId, t);
  const argent = actif.genre ? tout.filter((x) => x.genre === actif.genre) : tout;
  return (
    <Rayon cle="argent">
      <div className={styles.puces} role="tablist" aria-label={t("Filtrer le journal")}>
        {FILTRES.map((f) => (
          <Link key={f.cle} href={f.genre ? `/moi/documents/argent?filtre=${f.cle}` : "/moi/documents/argent"} className={f.cle === actif.cle ? styles.puceOn : styles.puce} aria-current={f.cle === actif.cle ? "page" : undefined} replace>
            {t(f.mot)}
          </Link>
        ))}
      </div>
      {argent.length === 0 && <p className="muted">{actif.genre ? t("Rien dans cette liste pour l'instant.") : t("Vos versements, prélèvements et avis de garde paraîtront ici.")}</p>}
      {argent.map((x, i) => {
        const an = x.at.slice(0, 4);
        const avant = i > 0 ? argent[i - 1].at.slice(0, 4) : undefined;
        return (
          <div key={x.clef}>
            {an !== avant && <Annee an={an} />}
            <Ligne titre={x.titre} sous={x.sous} etat={x.etat} ton={x.ton} geste={x.geste} />
          </div>
        );
      })}
    </Rayon>
  );
}
