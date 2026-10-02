"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { duAuxClients, ecart, pourquoiPasDeRapprochement, tenuParLaMaison, type CompteDeclare } from "@/lib/domain/rapprochement";
import { escapeHtml, fmt, localIso } from "@/lib/format";

export type RapproResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Le dû, calculé maintenant : un côté du rapprochement.
 *
 * Il se lit de la page et se recalcule à l'enregistrement, parce que le journal
 * peut bouger entre l'affichage et le clic. Le chiffre gelé dans la ligne est
 * celui du clic, et non celui que l'opérateur avait sous les yeux : c'est le
 * seul qui ait été comparé.
 */
export async function duDuJour() {
  const r = repo();
  const [intents] = await Promise.all([r.listIntents()]);
  const clients = [...new Set(intents.filter((i) => i.clientId).map((i) => i.clientId!))];
  const journaux = await Promise.all(clients.map((id) => r.listCash(id).catch(() => [])));
  return duAuxClients(clients.map((id, i) => ({ entries: journaux[i], intents: intents.filter((x) => x.clientId === id) })));
}

/**
 * Enregistrer le contrôle.
 *
 * Les comptes arrivent du formulaire en trois champs parallèles, parce qu'une
 * ligne de tableau est plus simple à remplir qu'un JSON, et se recomposent ici.
 * Une ligne entièrement vide est ignorée plutôt que refusée : un formulaire qui
 * propose quatre lignes ne doit pas punir celui qui n'en remplit que deux.
 */
export async function enregistrerRapprochement(_p: RapproResult | null, form: FormData): Promise<RapproResult> {
  const desk = await requireDesk("/desk/rapprochement");
  const labels = form.getAll("label").map(String);
  const soldes = form.getAll("balance").map(String);
  const pieces = form.getAll("evidence").map(String);
  const note = String(form.get("note") ?? "").trim().slice(0, 400) || undefined;
  const onDate = String(form.get("onDate") ?? "").trim() || localIso(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(onDate)) return { ok: false, error: "Indiquez la date des relevés comparés." };
  if (onDate > localIso(new Date())) return { ok: false, error: "La date est dans l'avenir : on ne rapproche pas des relevés qui n'existent pas." };

  const accounts: CompteDeclare[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    const label = (labels[i] ?? "").trim();
    const brut = (soldes[i] ?? "").replace(/\s/g, "").replace(",", ".");
    const evidence = (pieces[i] ?? "").trim();
    // Une ligne restée vide n'est pas une erreur, c'est une ligne non remplie.
    if (!label && !brut && !evidence) continue;
    accounts.push({ label, balance: Number(brut), evidence });
  }

  const du = await duDuJour();
  const empeche = pourquoiPasDeRapprochement({ accounts, owed: du.owed, note });
  if (empeche) return { ok: false, error: empeche };

  const held = tenuParLaMaison(accounts);
  const e = ecart(du.owed, held);
  const r = repo();
  const ligne = await r.addRapprochement({ onDate, owed: du.owed, owedAssigned: du.assigned, held, accounts, note, createdBy: desk.name });

  await audit("cash.rapprochement", "client", "tous", {
    after: { rapprochement: ligne.id, owed: du.owed, held, ecart: e.montant, comptes: accounts.length },
    reason: `rapprochement du ${onDate} : dû ${fmt(du.owed)}, tenu ${fmt(held)}${e.sens === "juste" ? ", juste" : `, écart ${e.montant > 0 ? "+" : ""}${fmt(e.montant)}`}`,
  });
  await r.logEvent({
    kind: "desk",
    html:
      e.sens === "manque"
        ? `<b>Rapprochement du ${onDate} : il manque ${fmt(Math.abs(e.montant))} FCFA</b> sur ce que la maison doit à ses clients (dû ${fmt(du.owed)}, tenu ${fmt(held)}) · ${escapeHtml(note ?? "")} · par ${escapeHtml(desk.name)}`
        : `Rapprochement du ${onDate} : dû ${fmt(du.owed)} FCFA, tenu ${fmt(held)}${e.sens === "juste" ? ", juste" : ` (excédent ${fmt(e.montant)})`} · par ${escapeHtml(desk.name)}`,
  });
  revalidatePath("/desk/rapprochement");
  revalidatePath("/desk");
  return {
    ok: true,
    message:
      e.sens === "juste"
        ? `Rapprochement enregistré : ${fmt(du.owed)} FCFA dus, autant de tenus.`
        : e.sens === "excedent"
          ? `Rapprochement enregistré : excédent de ${fmt(e.montant)} FCFA sur les ${fmt(du.owed)} dus.`
          : `Rapprochement enregistré : il manque ${fmt(Math.abs(e.montant))} FCFA sur les ${fmt(du.owed)} dus aux clients.`,
  };
}
