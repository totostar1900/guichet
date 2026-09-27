"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";

/**
 * « La pièce dit bien cela. »
 *
 * Le crible des anomalies ne dit jamais qu'un chiffre est faux : il dit qu'il
 * se contredit. La plupart du temps la contradiction appartient au Trésor, et
 * notre lecture est fidèle : le Gabon publie un prix moyen au-dessus de son
 * propre maximum, le Tchad un servi supérieur aux soumissions. Quelqu'un
 * ouvre la pièce, constate, et il faut pouvoir le noter.
 *
 * Sans ce geste, le panneau afficherait les mêmes lignes indéfiniment, et
 * deviendrait invisible : la maison a déjà vu le lecteur de bulletins signaler
 * soixante lectures partielles pendant un an sans que personne n'agisse, parce
 * que rien ne changeait jamais.
 *
 * Le motif est rangé sur la séance et compté à part. Si le crible trouve plus
 * tard un autre motif sur la même séance, celui-là se signalera.
 */
export async function anomalieVueAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/analyses");
  const id = String(form.get("id") ?? "");
  const motif = String(form.get("motif") ?? "");
  if (!id || !motif) return;
  const avant = await repo().getAuctionResult(id);
  if (!avant) return;
  const deja = avant.anomaliesVues ?? [];
  if (deja.includes(motif)) return;
  await repo().updateAuctionResult(id, { anomaliesVues: [...deja, motif] });
  await audit("auction.anomalie.vue", "auction_result", id, {
    before: { anomaliesVues: deja },
    after: { anomaliesVues: [...deja, motif] },
    reason: `${desk.name} a ouvert le communiqué de la séance du ${avant.sessionOn} : la contradiction « ${motif} » vient de la pièce, la lecture est fidèle.`,
  });
  revalidatePath("/desk/analyses");
}
