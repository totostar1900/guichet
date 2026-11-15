import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { retourDeLectureSur, sourceDeLectureValide } from "@/lib/lecture";
import { Glissement } from "@/components/mobile/Glissement";
import { Lecteur } from "./Lecteur";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lecture", robots: { index: false } };

type Genre = "pdf" | "html" | "image";

/** Ce que le fichier est, pour choisir comment le montrer : un PDF passe par la visionneuse, une copie de page web par un cadre isolé, une image telle quelle. */
async function genreDe(src: string): Promise<Genre> {
  const piece = /^\/pieces\/([0-9a-z-]{6,40})$/i.exec(src);
  if (piece) {
    const p = (await repo().listPiecesArchivees().catch(() => [])).find((x) => x.id === piece[1]);
    if (!p) return "pdf";
    return p.typeMime === "text/html" ? "html" : /^image\//.test(p.typeMime) ? "image" : "pdf";
  }
  const doc = /^\/offres\/([A-Za-z0-9._-]+)\/doc\/(\d+)$/.exec(src);
  if (doc) {
    const o = await repo().getOffer(doc[1]).catch(() => undefined);
    const d = o?.documents?.[Number(doc[2])];
    if (d && (/^image\//.test(d.mimeType ?? "") || /\.(png|jpe?g)$/i.test(d.name ?? ""))) return "image";
  }
  return "pdf";
}

/**
 * LA LECTURE, SEULE SUR SA PAGE : le contenu, une barre fine, une croix.
 *
 * L'adresse est publique par nature (une fiche de ligne se lit sans compte) ; chaque fichier garde le contrôle de la route qui le sert. La croix recule dans l'historique de
 * l'app, ou à défaut va à « de » (« Mes documents » par défaut) : on ne sort jamais de la maison.
 */
export default async function LirePage({ searchParams }: { searchParams: Promise<{ src?: string; titre?: string; note?: string; de?: string }> }) {
  const sp = await searchParams;
  if (!sourceDeLectureValide(sp.src)) notFound();
  const t = await getT();
  const genre = await genreDe(sp.src);
  return (
    <Glissement>
      <Lecteur src={sp.src} genre={genre} titre={(sp.titre ?? "").slice(0, 80) || t("Document")} note={(sp.note ?? "").slice(0, 240) || undefined} repli={retourDeLectureSur(sp.de)} />
    </Glissement>
  );
}
