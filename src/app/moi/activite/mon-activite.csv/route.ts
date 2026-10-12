import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { toCsv } from "@/lib/reporting";
import { localIso } from "@/lib/format";
import { GENRE_LABEL, GESTES } from "@/lib/domain/journal-client";

/**
 * SON ACTIVITÉ, EMPORTÉE PAR LE CLIENT LUI-MÊME.
 *
 * La maquette du 10 octobre 2026 pose ce lien dans « Votre compte », et c'est
 * le seul des trois qui ne demande aucune décision : le registre parle de lui,
 * il doit pouvoir le reprendre sans nous le demander. C'est aussi ce que la
 * déclaration du registre promet, et une promesse qui passe par un courriel
 * au desk n'en est pas une.
 *
 * LE SIEN, ET RIEN QUE LE SIEN : la requête porte l'identifiant de la session,
 * jamais un paramètre d'adresse. Un export qui accepterait un identifiant en
 * paramètre laisserait lire le registre d'un autre en changeant un chiffre.
 */
export async function GET() {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });

  const gestes = await repo()
    .listClientActions({ userId: s.userId, limit: 20000 })
    .catch(() => []);

  /* LA PHRASE À LA DEUXIÈME PERSONNE, celle que le client lit à l'écran : son
     fichier doit dire ce que sa page dit, et non la tournure du desk. */
  const csv = toCsv(
    ["quand", "ce que vous avez fait", "objet", "détail", "famille", "canal"],
    gestes.map((a) => [a.at, GESTES[a.geste]?.phrase ?? a.geste, a.objet ?? "", a.detail ?? "", GENRE_LABEL[a.genre] ?? a.genre, a.canal ?? ""]),
  );

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mon-activite-${localIso(new Date())}.csv"`,
    },
  });
}
