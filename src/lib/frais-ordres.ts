import { positionFor } from "@/lib/documents/position";
import type { OrdreExecute } from "@/lib/domain/frais-suivi";
import type { Intent, Offer } from "@/lib/domain/types";
import { localIso } from "@/lib/format";

/**
 * Un ordre exécuté, tel que le suivi et le rapprochement le lisent : sa famille, son opération, le montant sur lequel les règles s'appliquent.
 * Un seul endroit, pour que la page du suivi et celle du rapprochement comptent les mêmes ordres de la même façon.
 */
export const FAMILLE = (o: Offer): "fonds" | "titres" | "adjudication" | undefined => (o.kind === "FONDS" ? "fonds" : o.kind === "MARCHE" ? "titres" : o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA" || o.kind === "ACTIONS" ? "adjudication" : undefined);

export function ordreExecute(i: Intent, o: Offer): OrdreExecute | undefined {
  const famille = FAMILLE(o);
  if (!famille) return undefined;
  const pos = positionFor(i, o);
  const operation = famille === "fonds" ? (i.type === "rachat" ? "rachat" : "souscription") : famille === "titres" ? (i.type === "vente" ? "vente" : "achat") : "souscription";
  const taux = famille === "fonds" ? (operation === "rachat" ? o.fund?.exitFeePct : o.fund?.entryFeePct) ?? 0 : 0;
  return { id: i.id, offerId: o.id, ref: i.ref, jour: localIso(new Date(i.createdAt)), famille, operation, base: pos.principal, droitsDuFonds: (pos.principal * taux) / 100, fraisDeLaLigne: o.commissionPct > 0 && famille !== "fonds" ? pos.commission : 0, regle: i.state === "reglee" };
}

