import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import { ingererCourriel, type Courriel } from "@/lib/intake/courriel";
import { ingestSource } from "@/lib/intake/ingest";
import { lireUnePiece, piecesALire } from "@/lib/intake/lecture";

/**
 * La lecture ne se fait plus dans la requête qui reçoit la pièce.
 *
 * LE DÉFAUT MESURÉ, le 2026-10-01 à 22:04 : une pièce arrivée par courriel est
 * restée « lecture automatique en cours », `extracted_in` à null, pour toujours.
 * La fonction a soixante secondes pour vivre, un modèle qui lit un PDF n'y tient
 * pas, et une fonction tuée n'exécute AUCUN catch : ni le mien, ni celui de la
 * route. Rien ne s'écrivait et rien ne se disait.
 *
 * Ce cliquet tient les trois propriétés qui rendent le nouveau chemin sûr, et
 * chacune se perdrait sans bruit :
 *
 *  - une pièce différée est inscrite ET gardée, jamais perdue ;
 *  - elle se présente dans la file d'attente, donc quelque chose la reprendra ;
 *  - la file ignore ce qui porte déjà son marqueur, pour ne pas écraser une
 *    correction faite à la main.
 */
const courriel = (p: Partial<Courriel>): Courriel => ({ from: "dobm@tresor-congo.cg", subject: "Communiqué", text: "Corps.", attachments: [], headers: {}, ...p });

describe("la pièce est inscrite, la lecture vient après", () => {
  it("un courriel avec pièce jointe inscrit sans lire, et la pièce attend dans la file", async () => {
    const r = await ingererCourriel(
      courriel({
        from: "regulateur@cosumaf.org",
        subject: "Communiqué différé",
        attachments: [{ name: "communique.pdf", mimeType: "application/pdf", bytes: new Uint8Array(9_000), inline: false }],
      }),
    );
    expect(r.created).toHaveLength(1);
    const item = (await repo().listIntake()).find((i) => i.id === r.created[0]);
    expect(item).toBeDefined();
    // Inscrite et gardée : c'est tout ce qu'on demande au webhook.
    expect(item!.fileName?.endsWith(".pdf")).toBe(true);
    // Jamais lue dans la requête : le marqueur est vide.
    expect(item!.readAt).toBeUndefined();
    /* ELLE DIT TOUJOURS POURQUOI AUCUN CHAMP N EST PROPOSÉ, et c est la
       garantie qui compte : « À lire » quand la machine passera, « désactivée »
       quand il n y a pas de clef. Un brouillon vide et muet se lirait comme un
       extracteur médiocre. Ici l environnement de test n a pas de clef, donc
       c est le second motif qui tombe. */
    const motifs = JSON.stringify(item!.draft.remarks);
    expect(motifs === "[]").toBe(false);
    expect(/À lire|désactivée/.test(motifs)).toBe(true);
  });

  it("la file d'attente propose la pièce jamais tentée", async () => {
    const res = await ingestSource({ fromLabel: "essai · file", title: "Pièce en attente", file: { name: "p.pdf", mimeType: "application/pdf", bytes: new Uint8Array(1_000) }, differer: true });
    expect(res.ok).toBe(true);
    const id = res.ok ? res.item.id : "";
    const file = await piecesALire(20);
    expect(file.map((i) => i.id)).toContain(id);
  });

  it("la file ignore ce qui porte déjà son marqueur", async () => {
    const res = await ingestSource({ fromLabel: "essai · marquee", title: "Pièce déjà tentée", file: { name: "q.pdf", mimeType: "application/pdf", bytes: new Uint8Array(1_000) }, differer: true });
    const id = res.ok ? res.item.id : "";
    // Une lecture tentée pose son marqueur même sans rien rendre : sinon la
    // pièce repasserait à chaque passe et paierait son appel.
    await repo().updateIntake(id, { readAt: new Date().toISOString(), readModel: "essai" });
    const file = await piecesALire(20);
    expect(file.map((i) => i.id)).not.toContain(id);
  });

  it("la file laisse une pièce dont le brouillon porte déjà quelque chose", async () => {
    /* LE GARDE QUE J'AVAIS OUBLIÉ, et la migration l'a montré en une requête :
       le marqueur naît vide sur TOUTES les pièces, donc les dix-huit déjà en
       base, dont six travaillées et publiées en septembre, se sont présentées
       comme « à lire ». Une passe les aurait relues et aurait écrasé ce qu'une
       personne avait rempli. La route des adjudications porte cette règle depuis
       le début : elle ne prend que ce qui est vide. */
    const res = await ingestSource({ fromLabel: "essai · remplie", title: "Pièce renseignée", file: { name: "s.pdf", mimeType: "application/pdf", bytes: new Uint8Array(1_000) }, differer: true });
    const id = res.ok ? res.item.id : "";
    await repo().updateIntake(id, { draft: { confidence: {}, official: true, remarks: [], issuer: "Trésor public du Congo", isin: "CG2L00000012" } });
    const file = await piecesALire(20);
    expect(file.map((i) => i.id)).not.toContain(id);
  });

  it("la file laisse une pièce publiée", async () => {
    const res = await ingestSource({ fromLabel: "essai · publiee", title: "Pièce publiée", file: { name: "t.pdf", mimeType: "application/pdf", bytes: new Uint8Array(1_000) }, differer: true });
    const id = res.ok ? res.item.id : "";
    await repo().updateIntake(id, { publishedAt: new Date().toISOString() });
    const file = await piecesALire(20);
    expect(file.map((i) => i.id)).not.toContain(id);
  });

  it("une reprise refuse de relire sans demande explicite", async () => {
    const res = await ingestSource({ fromLabel: "essai · reprise", title: "Pièce lue", file: { name: "r.pdf", mimeType: "application/pdf", bytes: new Uint8Array(1_000) }, differer: true });
    const id = res.ok ? res.item.id : "";
    await repo().updateIntake(id, { readAt: new Date().toISOString(), readModel: "essai" });
    const sansDemande = await lireUnePiece(id);
    // Le motif est dit : sans lui, « rien ne s'est passé » serait indistinguable
    // d'une panne.
    expect(sansDemande?.erreur).toBeDefined();
  });
});
