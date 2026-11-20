import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * « LIRE LA PIÈCE » A PLUS DE TEMPS QUE L'ARRIVÉE D'UN COURRIEL (20 novembre 2026, le client : « le bouton apparaît mais rien ne se passe »).
 * Trois clics, trois abandons à quarante secondes, même avec le modèle rapide : le délai était la seule coupure.
 */
describe("la lecture demandée depuis le desk", () => {
  const extract = lire("src/lib/intake/extract.ts");
  const lecture = lire("src/lib/intake/lecture.ts");
  const ingest = lire("src/lib/intake/ingest.ts");

  it("dispose de deux minutes, la page « À valider » portant sa propre durée maximale", () => {
    expect(extract).toMatch(/LECTURE_DESK_MS = 120_000/);
    expect(extract).toMatch(/timeout: options\.delaiMs \?\? LECTURE_MS/);
    expect(lecture).toMatch(/extractOffer\(input, \{ delaiMs: LECTURE_DESK_MS \}\)/);
    expect(lire("src/app/desk/a-valider/page.tsx")).toMatch(/export const maxDuration = 300;/);
  });

  it("l'arrivée d'un courriel garde ses quarante secondes (le webhook n'a que soixante secondes)", () => {
    expect(extract).toMatch(/const LECTURE_MS = 40_000;/);
    expect(ingest).toMatch(/extractOffer\(extraction!\)/);
    expect(ingest).not.toMatch(/LECTURE_DESK_MS/);
  });

  it("le bouton dit qu'il travaille, et seul celui qui a envoyé le formulaire se grise en le disant", () => {
    const f = lire("src/app/desk/a-valider/ValidateForm.tsx");
    expect(f).toMatch(/useFormStatus\(\)/);
    expect(f).toMatch(/data\?\.get\("geste"\) === "lire"/);
    expect(f).toMatch(/name="geste" value="lire" formAction=\{lireSourceAction\}/);
  });
});

/**
 * RETIRER UNE PIÈCE DE LA FILE (20 novembre 2026, le client : « permettre le retrait d'un communiqué rajouté via nouvelle source »).
 */
describe("le retrait d'une pièce de la file « À valider »", () => {
  const actions = lire("src/app/desk/a-valider/actions.ts");
  const debut = actions.indexOf("export async function retirerSourceAction");
  const corps = actions.slice(debut, actions.indexOf("export async function rejectAction", debut));
  const form = lire("src/app/desk/a-valider/ValidateForm.tsx");

  it("refuse une pièce publiée, garde l'état d'avant à l'audit, et ne touche pas au fichier", () => {
    expect(corps).toMatch(/item\.state === "publie" \|\| item\.offerId/);
    expect(corps).toMatch(/audit\("intake\.remove", "intake", id, \{\s*before: \{/);
    expect(corps).toMatch(/await repo\(\)\.deleteIntake\(id\)/);
    expect(corps, "le fichier du dépôt ne doit pas être effacé").not.toMatch(/supprimerSource|storage|remove\(/);
  });

  it("le bouton se confirme dans la page (aucune boîte du navigateur) et n'existe pas sur une pièce publiée", () => {
    expect(form).toMatch(/\{!published && !item\.offerId && <BoutonRetirer \/>\}/);
    expect(form).toMatch(/Confirmer le retrait/);
    expect(form, "une boîte du navigateur est apparue").not.toMatch(/window\.confirm|confirm\(/);
  });

  it("le dépôt sait retirer, en mémoire comme en base", () => {
    expect(lire("src/lib/data/repository.ts")).toMatch(/deleteIntake\(id: string\): Promise<void>/);
    expect(lire("src/lib/data/memory.ts")).toMatch(/async deleteIntake\(id\)/);
    expect(lire("src/lib/data/supabase.ts")).toMatch(/from\("intake_items"\)\.delete\(\)\.eq\("id", id\)/);
  });
});

/**
 * LA PUBLICATION SE FAIT SUR LE GUICHET, ET SEULEMENT LÀ (20 novembre 2026, le client : « retirer "segments", pas de WhatsApp ni e-mail ; les boutons enregistrer et publier isolés dans leur encadré »).
 */
describe("le formulaire de publication de « À valider »", () => {
  const form = lire("src/app/desk/a-valider/ValidateForm.tsx");
  const actions = lire("src/app/desk/a-valider/actions.ts");
  const css = lire("src/app/desk/a-valider/page.module.css");

  it("ne propose ni segment ni canal de diffusion, et l'action ignore ce qu'un ancien formulaire enverrait", () => {
    expect(form).not.toMatch(/name="segment"|name="channel"|Segments|WhatsApp|E-mail"\]/);
    expect(actions).toMatch(/const channels = \["Guichet web"\];/);
    expect(actions).toMatch(/segment: "Tous les clients"/);
    expect(actions, "la publication lit encore les canaux du formulaire").not.toMatch(/form\.getAll\("channel"\)/);
  });

  it("isole « Enregistrer le brouillon » et « Publier » dans leur encadré, loin du message de blocage", () => {
    const encadre = form.slice(form.lastIndexOf("styles.vPublier"));
    expect(encadre).toMatch(/Enregistrer le brouillon/);
    expect(encadre).toMatch(/Publier/);
    const statut = form.indexOf("styles.vStatut");
    const gestes = form.indexOf("styles.vFoot", statut);
    const publier = form.indexOf("styles.vPublier", gestes);
    expect(form.slice(statut, gestes), "le message de blocage doit être dans sa propre bande").toMatch(/Publication bloquée tant que/);
    expect(form.slice(gestes, publier), "un bouton d'enregistrement est resté dans la rangée des gestes de tri").not.toMatch(/Enregistrer le brouillon|Publier/);
    expect(css).toMatch(/\.vPublier \{[^}]*border: 1px solid var\(--line\)/);
  });
});
