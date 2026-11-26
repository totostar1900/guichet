import { requireResponsable } from "@/lib/auth";
import { chargerLeCommissionnement, dusDuMois } from "@/lib/commissionnement-donnees";
import { cleDuReleve } from "@/lib/domain/commissionnement";

export const dynamic = "force-dynamic";

/**
 * L'EXPORT DU RELEVÉ DE COMMISSIONNEMENT, POUR LA COMPTABILITÉ (25 novembre 2026, planche « Deux tableaux », point 6B) : un fichier CSV à point-virgule, que l'on ouvre dans Excel, par mois et, au choix, par
 * société. La direction seule le télécharge. Aucune donnée client n'y figure : des codes, des parts, des montants par fonds. Un relevé déjà envoyé redonne le total figé à l'envoi.
 */
export async function GET(req: Request): Promise<Response> {
  await requireResponsable("/desk/commissionnement");
  const url = new URL(req.url);
  const mois = url.searchParams.get("m") ?? "";
  const societe = url.searchParams.get("societe") ?? "";
  if (!/^\d{4}-\d{2}$/.test(mois)) return new Response("Mois invalide.", { status: 400 });
  if (societe && !/^SG-\d{4}$/.test(societe)) return new Response("Société invalide.", { status: 400 });

  const c = await chargerLeCommissionnement();
  const dus = (await dusDuMois(mois, c)).filter((d) => !societe || d.du.societe === societe);
  const champ = (v: string | number): string => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lignes = [["Mois", "Code société", "Société", "Code fonds", "Fonds", "ISIN", "Souscriptions", "Rachats", "Encours moyen", "Dû transactions", "Dû encours", "Total dû"].join(";")];
  for (const d of dus) {
    const s = d.du.societe ?? "";
    lignes.push([mois, s, c.societes.get(s)?.nom ?? "", d.fonds.code, d.offre.title, d.offre.isin ?? "", d.du.souscriptions, d.du.rachats, d.du.encoursMoyen, d.du.transactions, d.du.encours, d.du.total].map(champ).join(";"));
  }
  const figes = [...new Set(dus.map((d) => d.du.societe).filter((s): s is string => Boolean(s)))].flatMap((s) => {
    const r = c.releves.get(cleDuReleve(s, mois));
    return r?.totalFige != null ? [`${s} : total figé à l'envoi ${r.totalFige}`] : [];
  });
  if (figes.length) lignes.push("", ...figes.map(champ));
  const nom = `commissionnement-${societe || "toutes-les-societes"}-${mois}.csv`;
  return new Response(`﻿${lignes.join("\r\n")}\r\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nom}"`, "cache-control": "no-store" } });
}
