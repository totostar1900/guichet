import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";
import { lignesRetenues, messagesActifs, messagesPourLaLangue, MESSAGES_PAR_DEFAUT, planifierImport, STATUTS_MAX, statutsAffiches, verifierTexte, type LigneDeTableau, type StatutLigne } from "@/lib/domain/statuts";

/**
 * LES STATUTS : le desk choisit les lignes (huit au plus), leur ordre et le message de la première page ; chaque geste est à l'audit, rien ne s'efface
 * (17 novembre 2026, planche « Accueil et insights », idée 1).
 */
const desk: Session = { userId: "u-op", role: "desk", name: "Op Test", email: "op@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true } as Session;
vi.mock("@/lib/auth", () => ({ getSession: async () => desk, requireSession: async () => desk, requireDesk: async () => desk, requireResponsable: async () => desk }));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const aboutit = async <T,>(f: () => Promise<T>): Promise<T | { ok: true; vers: string }> => {
  try {
    return await f();
  } catch (e) {
    const d = (e as { digest?: unknown }).digest;
    if (typeof d === "string" && d.startsWith("NEXT_REDIRECT")) return { ok: true, vers: d.split(";")[2] ?? "" };
    throw e;
  }
};
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("la base des messages de la première page", () => {
  it("part des vingt-huit messages du client, quinze en français et treize en anglais, tous recevables", () => {
    expect(MESSAGES_PAR_DEFAUT).toHaveLength(28);
    expect(MESSAGES_PAR_DEFAUT.filter((m) => m.langue === "fr")).toHaveLength(15);
    expect(MESSAGES_PAR_DEFAUT.filter((m) => m.langue === "en")).toHaveLength(13);
    for (const m of MESSAGES_PAR_DEFAUT) expect(verifierTexte(m.texte), m.texte).toBeUndefined();
    expect(new Set(MESSAGES_PAR_DEFAUT.map((m) => m.id)).size, "deux messages portent le même identifiant").toBe(28);
  });
  it("refuse un conseil, une promesse, une urgence, un texte trop court ou trop long", () => {
    expect(verifierTexte("Court")).toBeTruthy();
    expect(verifierTexte("Profitez de la meilleure séance de l'année")).toBeTruthy();
    expect(verifierTexte("Dernière chance pour souscrire cette semaine")).toBeTruthy();
    expect(verifierTexte("x".repeat(161))).toBeTruthy();
  });
  it("sert la base du code tant que la table est vide, et la langue du client quand elle en a", () => {
    expect(messagesActifs([])).toEqual(MESSAGES_PAR_DEFAUT);
    const fr = messagesPourLaLangue(messagesActifs([]), "fr");
    expect(fr.length).toBe(15);
    expect(fr.every((m) => m.langue === "fr")).toBe(true);
    // Une langue sans message joue tout plutôt que rien.
    expect(messagesPourLaLangue(MESSAGES_PAR_DEFAUT.filter((m) => m.langue === "en"), "fr")).toHaveLength(13);
  });
});

describe("l'import du tableau remplace la base", () => {
  const maintenant = "2026-11-18T10:00:00.000Z";
  let n = 0;
  const nouvel = () => `m-test${++n}`;
  const ligne = (rang: number, texte: string, o: Partial<LigneDeTableau> = {}): LigneDeTableau => ({ rang, texte, langue: "fr", actif: "oui", ...o });

  it("garde les identifiants du tableau téléchargé, ajoute les nouveaux messages, retire ceux qui manquent sans les effacer", () => {
    const lignes = MESSAGES_PAR_DEFAUT.slice(2).map((m, i) => ligne(i + 2, m.texte, { id: m.id, langue: m.langue }));
    lignes.push(ligne(99, "Un message tout neuf pour la semaine."));
    const plan = planifierImport(MESSAGES_PAR_DEFAUT, lignes, "Op", maintenant, nouvel);
    expect(plan.erreurs).toEqual([]);
    expect(plan.ajoutes).toBe(1);
    expect(plan.retires).toBe(2);
    expect(plan.actifs).toBe(27);
    const retires = plan.ecrire.filter((m) => m.retireeLe);
    expect(retires.map((m) => m.id).sort()).toEqual(["m-001", "m-002"]);
    expect(retires.every((m) => m.retireePar === "Op" && m.texte.length > 0), "un message retiré a perdu son texte ou son auteur").toBe(true);
    expect(plan.ecrire.find((m) => m.id === "m-003")?.ajouteePar, "un message conservé a perdu son auteur d'origine").toBe("maison");
  });
  it("« Actif = non » retire, une langue inconnue ou un doublon refuse tout le tableau", () => {
    const base = [ligne(2, "Premier message valable ici.", { id: "m-001" }), ligne(3, "Deuxième message valable ici.", { id: "m-002", actif: "non" })];
    const ok = planifierImport(MESSAGES_PAR_DEFAUT.slice(0, 2), base, "Op", maintenant, nouvel);
    expect(ok.erreurs).toEqual([]);
    expect(ok.actifs).toBe(1);
    const mauvais = planifierImport(MESSAGES_PAR_DEFAUT, [ligne(2, "Un message correct ici."), ligne(3, "Un message correct ici."), ligne(4, "Court"), ligne(5, "Un autre message correct.", { langue: "klingon" })], "Op", maintenant, nouvel);
    expect(mauvais.erreurs.join(" | ")).toMatch(/Ligne 5 : langue/);
    expect(mauvais.erreurs.join(" | ")).toMatch(/Ligne 3 : message en double/);
    expect(mauvais.erreurs.join(" | ")).toMatch(/Ligne 4 : moins de 8/);
  });
  it("refuse un tableau sans aucun message actif : la première page ne resterait pas muette", () => {
    expect(planifierImport(MESSAGES_PAR_DEFAUT, [ligne(2, "Un message qui sort ici.", { actif: "non" })], "Op", maintenant, nouvel).erreurs.join(" ")).toMatch(/Aucun message actif/);
    expect(planifierImport(MESSAGES_PAR_DEFAUT, [], "Op", maintenant, nouvel).erreurs.join(" ")).toMatch(/aucun message/);
  });
});

describe("les statuts sur le dépôt mémoire", () => {
  it("une ligne entre, se déplace, se retire sans s'effacer, et chaque geste est à l'audit", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerStatuts } = await import("@/lib/statuts");
    const { repo } = await import("@/lib/data");
    const offres = (await repo().listOffers()).filter((o) => !o.hidden && o.status !== "withdrawn").slice(0, 3);
    expect(offres.length).toBeGreaterThanOrEqual(3);
    for (const o of offres) await aboutit(() => a.ajouterStatutAction(form({ offerId: o.id })));
    let retenues = lignesRetenues(await listerStatuts());
    expect(retenues.map((l) => l.offerId), "l'ordre d'ajout n'est pas celui de la rangée").toEqual(offres.map((o) => o.id));

    await aboutit(() => a.deplacerStatutAction(form({ offerId: offres[2].id, sens: "haut" })));
    retenues = lignesRetenues(await listerStatuts());
    expect(retenues.map((l) => l.offerId), "la ligne n'a pas monté d'un rang").toEqual([offres[0].id, offres[2].id, offres[1].id]);

    await aboutit(() => a.retirerStatutAction(form({ offerId: offres[2].id })));
    const toutes = (await listerStatuts()).filter((x): x is StatutLigne => x.kind === "ligne");
    expect(toutes, "une ligne a été effacée au lieu d'être retirée").toHaveLength(3);
    const retiree = toutes.find((l) => l.offerId === offres[2].id)!;
    expect(retiree.retireeLe).toBeTruthy();
    expect(retiree.retireePar).toBe("Op Test");
    expect(lignesRetenues(toutes).map((l) => l.offerId)).toEqual([offres[0].id, offres[1].id]);

    const actions = (await repo().listAudit({ entity: "statut", limit: 50 })).map((x) => x.action);
    for (const attendu of ["statut.ajoute", "statut.deplace", "statut.retire"]) expect(actions, `${attendu} n'est pas à l'audit`).toContain(attendu);
  });

  it("refuse la neuvième ligne et une ligne que le client ne peut pas lire", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerStatuts } = await import("@/lib/statuts");
    const { repo } = await import("@/lib/data");
    const offres = (await repo().listOffers()).filter((o) => !o.hidden && o.status !== "withdrawn");
    expect(STATUTS_MAX, "la rangée n'est plus bornée à huit").toBe(8);
    for (const o of offres.slice(0, STATUTS_MAX + 2)) await aboutit(() => a.ajouterStatutAction(form({ offerId: o.id })));
    expect(lignesRetenues(await listerStatuts()).length, "plus de huit lignes dans la rangée").toBeLessThanOrEqual(STATUTS_MAX);
    const r = await aboutit(() => a.ajouterStatutAction(form({ offerId: "n-existe-pas" })));
    expect(JSON.stringify(r)).toContain("refus=ligne");
  });

  it("le tableau téléchargé puis renvoyé conserve la base, un tableau complété l'augmente, et le geste est à l'audit", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerMessages } = await import("@/lib/statuts");
    const { classeurDesMessages, lireClasseurDesMessages } = await import("@/lib/statuts-classeur");
    const { repo } = await import("@/lib/data");
    const ExcelJS = (await import("exceljs")).default;
    // 1. Le téléchargement contient la base du code ; 2. on y ajoute une ligne et on renvoie.
    const telecharge = await classeurDesMessages(messagesActifs(await listerMessages()));
    const relu = await lireClasseurDesMessages(telecharge.buffer.slice(telecharge.byteOffset, telecharge.byteOffset + telecharge.byteLength) as ArrayBuffer);
    expect(relu.filter((l) => l.texte).length, "le tableau téléchargé n'a pas les 28 messages").toBe(28);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(telecharge.buffer.slice(telecharge.byteOffset, telecharge.byteOffset + telecharge.byteLength) as ArrayBuffer);
    wb.worksheets[0].addRow(["", "Du ndolè dans l'assiette, des BTA dans le portefeuille.", "fr", "oui"]);
    const envoye = new Uint8Array(await wb.xlsx.writeBuffer());
    const f = new FormData();
    f.set("tableau", new File([envoye], "messages.xlsx"));
    const r1 = await aboutit(() => a.importerMessagesAction(null, f));
    expect(JSON.stringify(r1)).toContain("importes=29");
    const enBase = await listerMessages();
    expect(enBase.filter((m) => !m.retireeLe)).toHaveLength(29);
    expect(enBase.find((m) => m.id === "m-001")?.texte, "un message de départ n'a pas gardé son identifiant").toBe("Mon capital a trouvé un sens.");
    // 3. Un tableau qui garde 3 messages retire les autres sans les effacer.
    const wb2 = new ExcelJS.Workbook();
    const ws = wb2.addWorksheet("Messages");
    ws.addRow(["Identifiant", "Message", "Langue", "Actif"]);
    for (const m of enBase.slice(0, 3)) ws.addRow([m.id, m.texte, m.langue, "oui"]);
    const f2 = new FormData();
    f2.set("tableau", new File([new Uint8Array(await wb2.xlsx.writeBuffer())], "trois.xlsx"));
    await aboutit(() => a.importerMessagesAction(null, f2));
    const apres = await listerMessages();
    expect(apres.filter((m) => !m.retireeLe)).toHaveLength(3);
    expect(apres, "des messages ont été effacés au lieu d'être retirés").toHaveLength(29);
    const audits = (await repo().listAudit({ entity: "statut", limit: 50 })).filter((x) => x.action === "statut.messages");
    expect(audits.length).toBe(2);
    expect(JSON.stringify(audits[0].after)).toMatch(/retires/);
  });
  it("refuse un fichier qui n'est pas un classeur et un tableau sans colonne Message, sans rien écrire", async () => {
    const a = await import("@/app/desk/statuts/actions");
    const { listerMessages } = await import("@/lib/statuts");
    const avant = (await listerMessages()).length;
    const mauvais = new FormData();
    mauvais.set("tableau", new File([new TextEncoder().encode("pas un classeur")], "x.xlsx"));
    expect(((await a.importerMessagesAction(null, mauvais)) as { ok: boolean }).ok).toBe(false);
    expect(((await a.importerMessagesAction(null, new FormData())) as { ok: boolean }).ok).toBe(false);
    expect((await listerMessages()).length).toBe(avant);
  });
});

describe("ce que le client voit", () => {
  it("une ligne retirée du catalogue sort de la rangée, sans que le desk ait rien à faire", () => {
    const l = (offerId: string, position: number): StatutLigne => ({ kind: "ligne", id: `l-${offerId}`, offerId, position, ajouteePar: "x", ajouteeLe: "2026-11-17T08:00:00Z" });
    const visibles = [{ id: "a" }, { id: "c" }] as never[];
    expect(statutsAffiches([l("a", 1), l("b", 2), l("c", 3)], visibles).map((x) => x.ligne.offerId)).toEqual(["a", "c"]);
  });
});

describe("la place des statuts", () => {
  const lire = (f: string) => readFileSync(f, "utf8");
  it("ouvrent le chapitre du marché de l'Accueil et se taisent sans ligne", () => {
    const t = lire("src/components/accueil/TuilesDuHaut.tsx");
    expect(t).toMatch(/\{aDesStatuts && <Statuts messages=\{statuts\.messages\} items=\{statuts\.items\} \/>\}/);
    expect(t, "le chapitre se rend vide quand il n'y a rien").toMatch(/if \(!aDuDesk && !aEcheances && !aDesStatuts\) return null;/);
  });
  it("la première page tire un message dans la base, au geste du doigt et jamais au rendu", () => {
    const st = lire("src/components/statuts/Statuts.tsx");
    expect(st).toMatch(/setMessage\(messages\.length > 0 \? messages\[Math\.floor\(Math\.random\(\) \* messages\.length\)\] : ""\)/);
    const debut = st.indexOf("export function Statuts");
    expect(st.slice(debut, st.indexOf("const ouvrir", debut)), "le tirage est revenu dans le rendu").not.toMatch(/Math\.random/);
    expect(lire("src/components/statuts/chargerStatuts.ts")).toMatch(/messagesPourLaLangue\(messagesActifs\(enBase\), lang\)/);
  });
  it("la première page est le message sur le logo, chaque ligne a « Voir la fiche » et « Passer un ordre »", () => {
    const s = lire("src/components/statuts/Statuts.tsx");
    expect(s).toMatch(/t\("Voir la fiche"\)/);
    expect(s).toMatch(/t\("Passer un ordre"\)/);
    expect(s).toMatch(/\{it\.ordre && \(/);
    expect(lire("src/components/statuts/Statuts.module.css")).toMatch(/url\("\/icons\/icon-512\.png"\)/);
  });
  it("rien ne défile seul : ni minuterie ni compte à rebours dans la visionneuse", () => {
    expect(lire("src/components/statuts/Statuts.tsx")).not.toMatch(/setInterval|setTimeout/);
  });
  it("le desk les atteint par un onglet, et chaque geste passe par l'audit et la seconde question", () => {
    expect(lire("src/lib/desk-groupes.ts")).toMatch(/\["\/desk\/statuts", "Statuts"\]/);
    const a = lire("src/app/desk/statuts/actions.ts");
    for (const g of ["statut.ajoute", "statut.retire", "statut.deplace", "statut.messages"]) expect(a).toContain(`audit("${g}"`);
    const g = lire("src/app/desk/statuts/Gestion.tsx");
    expect((g.match(/<ConfirmPublish/g) ?? []).length, "un geste des statuts n'a plus de seconde question").toBe(2);
  });
});
