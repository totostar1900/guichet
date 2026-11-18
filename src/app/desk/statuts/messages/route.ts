import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { messagesActifs } from "@/lib/domain/statuts";
import { listerMessages } from "@/lib/statuts";
import { classeurDesMessages } from "@/lib/statuts-classeur";

/**
 * LE TABLEAU DES MESSAGES DE LA PREMIÈRE PAGE, À TÉLÉCHARGER (18 novembre 2026) : la base en jeu, une ligne par message, prête à être complétée puis renvoyée. Desk seulement.
 */
export async function GET() {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });
  const xlsx = await classeurDesMessages(messagesActifs(await listerMessages()));
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="statuts-messages-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
