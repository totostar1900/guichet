import { describe, expect, it } from "vitest";
import { fileQueue, waiting } from "@/lib/kyc/queue";
import type { ClientFile } from "@/lib/domain/kyc";

/**
 * La colonne de gauche des Dossiers.
 *
 * Elle portait tous les dossiers, sans recherche ni limite, parce qu'elle
 * faisait deux métiers à la fois : une file de travail et un annuaire. Les
 * deux veulent l'inverse l'un de l'autre, l'une courte et qui diminue, l'autre
 * complète et qui se cherche. L'annuaire est parti au Répertoire ; ce qui suit
 * garde la file dans son rôle.
 */
const file = (id: string, status: ClientFile["status"], name = id, over: Partial<ClientFile["identity"]> = {}): ClientFile =>
  ({ id, userId: `u-${id}`, status, kind: "physique", identity: { name, city: "Douala", ...over }, updatedAt: "2026-09-24T10:00:00Z" }) as unknown as ClientFile;

const ALL = [file("a", "soumis", "Awa Mbarga"), file("b", "en_revue", "Blaise Ondo"), file("c", "complements", "Chantal Eyenga"), file("d", "approuve", "Didier Nkolo"), file("e", "clos", "Estelle Mvondo"), file("f", "brouillon", "Fabrice Abega")];

describe("la file des dossiers", () => {
  it("ne garde que ce qui n'est pas réglé", () => {
    expect(fileQueue(ALL).map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("garde « compléments », qui attend le client mais pas le classement", () => {
    // La balle est chez le client, mais un dossier en attente de pièces se
    // relance : le retirer de la file reviendrait à l'oublier.
    expect(waiting(file("x", "complements"))).toBe(true);
    expect(waiting(file("y", "approuve"))).toBe(false);
    expect(waiting(file("z", "brouillon"))).toBe(false);
  });

  it("garde le dossier ouvert même quand il n'attend rien", () => {
    // Sans cette exception, arriver du Répertoire sur un dossier approuvé
    // l'afficherait à droite avec une colonne vide à gauche.
    expect(fileQueue(ALL, "d").map((f) => f.id)).toEqual(["a", "b", "c", "d"]);
    // Et il ne s'y met pas deux fois quand il attendait déjà.
    expect(fileQueue(ALL, "a").map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("cherche dans tous les états, y compris les dossiers clos", () => {
    // On cherche un nom précisément parce qu'il n'est pas sous les yeux : le
    // limiter à la file rendrait la recherche inutile.
    expect(fileQueue(ALL, undefined, "Estelle").map((f) => f.id)).toEqual(["e"]);
    expect(fileQueue(ALL, undefined, "nkolo").map((f) => f.id)).toEqual(["d"]);
  });

  it("cherche aussi sur la ville, l'adresse et le numéro", () => {
    const list = [file("g", "clos", "Gaston Biya", { city: "Kribi", email: "gaston@exemple.com", phone: "+237699887766" })];
    for (const q of ["kribi", "gaston@exemple", "699887"]) expect(fileQueue(list, undefined, q).map((f) => f.id), q).toEqual(["g"]);
  });

  it("ignore la casse et les espaces autour", () => {
    expect(fileQueue(ALL, undefined, "  AWA  ").map((f) => f.id)).toEqual(["a"]);
    // Une recherche vide n'est pas une recherche : on retombe sur la file.
    expect(fileQueue(ALL, undefined, "   ").map((f) => f.id)).toEqual(["a", "b", "c"]);
  });
});
