import { describe, expect, it } from "vitest";
import { normalizePhone, telLisible } from "@/lib/format";

/**
 * LE NUMÉRO SE RELIT, ET C'EST TOUT CE QU'ON LUI DEMANDE.
 *
 * La page « Qui vous êtes » montre le numéro que la maison compose quand elle
 * appelle, et celui sur lequel part le code qui fait signer. On y vient pour
 * le COMPARER à la carte SIM qu'on a en main, chiffre par chiffre : treize
 * chiffres d'affilée se relisent mal, et l'erreur qu'on ne voit pas ici est
 * celle qui fait manquer un appel du desk.
 *
 * CE QUE CETTE ÉPREUVE TIENT : les groupes de la zone, et le refus de couper
 * ce qu'on ne reconnaît pas. Un numéro mal coupé est pire qu'un numéro nu —
 * l'œil compare des groupes, et des groupes faux se valident à tort.
 *
 * ELLE NE TOUCHE PAS À CE QUI EST ÉCRIT EN BASE : « normalizePhone » garde
 * l'E.164, qui est ce que l'opérateur lit. L'affichage est une vue.
 */
describe("le numéro, rendu lisible", () => {
  it("coupe les neuf chiffres de la zone comme on les dit", () => {
    expect(telLisible("+237687676767")).toBe("+237 6 87 67 67 67");
    /* Un numéro gabonais, congolais ou tchadien : même longueur, même
       découpage. C'est la zone CEMAC entière, pas le seul Cameroun. */
    expect(telLisible("+241062345678")).toBe("+241 0 62 34 56 78");
  });

  it("accepte ce qu'un humain tape, parce que la normalisation passe devant", () => {
    expect(telLisible("6 87 67 67 67")).toBe("+237 6 87 67 67 67");
    expect(telLisible("00237687676767")).toBe("+237 6 87 67 67 67");
  });

  it("rend tel quel ce qu'il ne reconnaît pas", () => {
    /* Un numéro trop court, trop long ou d'un indicatif plus long sort nu :
       mieux vaut ne pas aider que tromper l'œil qui compare. */
    expect(telLisible("+33123456789")).toBe("+33123456789");
    expect(telLisible("+2376876")).toBe("+2376876");
    expect(telLisible("")).toBe("");
    expect(telLisible(undefined)).toBe("");
  });

  it("ne change rien à ce qui s'écrit en base", () => {
    expect(normalizePhone("+237 6 87 67 67 67")).toBe("+237687676767");
  });
});
