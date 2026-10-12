import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { toCsv } from "@/lib/reporting";
import { localIso } from "@/lib/format";
import { GENRES, GENRE_LABEL, GESTES, type Genre } from "@/lib/domain/journal-client";

/**
 * LE REGISTRE DES GESTES EMPORTÉ EN TABLEUR.
 *
 * La maquette du 10 octobre 2026 pose ce bouton à côté des filtres, et il ne
 * sert pas la curiosité : un registre qu'on ne peut pas sortir ne se vérifie
 * pas. Un auditeur demande la période, pas l'écran.
 *
 * IL EMPORTE EXACTEMENT CE QUE LA PAGE MONTRE, filtres compris. Un export qui
 * rendrait tout le registre quand l'écran en montre une semaine ferait
 * promettre à son nom un contenu qu'il n'a pas, et c'est ainsi qu'un fichier
 * finit par circuler pour autre chose que ce qu'on croyait.
 *
 * Desk seulement : ces lignes nomment des clients et ce qu'ils ont fait.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const genre = sp.get("genre");
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const du = sp.get("du") ?? undefined;
  const au = sp.get("au") ?? undefined;

  const r = repo();
  const [bruts, contacts] = await Promise.all([
    r.listClientActions({
      userId: sp.get("client") ?? undefined,
      genre: (GENRES as readonly string[]).includes(genre ?? "") ? (genre as Genre) : undefined,
      from: du,
      to: au,
      /* Plus large que la page, qui s'arrête à trois cents : un tableur sert
         justement à ce qu'un écran ne peut pas montrer. Borné quand même,
         parce qu'un fichier sans fin ne s'ouvre pas davantage. */
      limit: 20000,
    }),
    r.listContacts().catch(() => []),
  ]);

  const noms = new Map(contacts.map((c) => [c.id, c.name]));
  const lignes = q ? bruts.filter((a) => [noms.get(a.userId), a.objet, a.detail, GESTES[a.geste]?.auDesk].some((x) => x?.toLowerCase().includes(q))) : bruts;

  /* Les mêmes colonnes que l'écran, dans le même ordre : un export qui range
     autrement oblige à relire la page pour comprendre le fichier. */
  const csv = toCsv(
    ["quand", "qui", "compte", "agissant", "geste", "clef", "objet", "détail", "famille", "canal", "origine"],
    lignes.map((a) => [a.at, noms.get(a.userId) ?? a.userId, a.userId, a.agissant ?? "", GESTES[a.geste]?.auDesk ?? a.geste, a.geste, a.objet ?? "", a.detail ?? "", GENRE_LABEL[a.genre] ?? a.genre, a.canal ?? "", a.ip ?? ""]),
  );

  const nom = `gestes-${du ?? "origine"}-${au ?? localIso(new Date())}.csv`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nom}"`,
    },
  });
}
