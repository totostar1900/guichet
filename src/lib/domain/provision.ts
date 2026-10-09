import "server-only";
import { repo } from "@/lib/data";
import { cashPosition } from "./cash";

/**
 * LE SOLDE DISPONIBLE D'UN CLIENT, LU EN UN APPEL.
 *
 * Trois endroits en ont besoin depuis le 9 octobre 2026 : la signature d'un
 * ordre qui se demande si la provision le couvre, l'écran qui le dit avant, et
 * la demande de versement. Trois lectures d'un même solde, ce sont trois
 * occasions de n'être pas d'accord sur ce qui est disponible, c'est-à-dire sur
 * l'argent de quelqu'un.
 *
 * ELLE VIT ICI, ET PAS DANS `cash.ts`, pour une raison de frontière : le
 * calcul du solde est pur et se lit des deux côtés, y compris dans un
 * composant client. Dès qu'une fonction y touche la base, tout le module
 * devient « server-only » et le build casse sur les écrans qui l'importent.
 * Le calcul reste donc là-bas, la lecture est ici.
 */
export async function disponibleDe(userId: string): Promise<number> {
  const r = repo();
  const [cash, intents] = await Promise.all([r.listCash(userId).catch(() => []), r.listIntents()]);
  return cashPosition(
    cash,
    intents.filter((i) => i.clientId === userId),
  ).idle;
}
