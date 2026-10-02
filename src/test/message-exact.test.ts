import { describe, expect, it } from "vitest";
import { MENTION_LIEN_WHATSAPP, blocLigne, signature, texteExact } from "@/app/desk/messages/message-exact";

/**
 * L'aperçu de relecture ne peut pas mentir.
 *
 * LE DÉFAUT QU'ON ÉVITE. La feuille montrait un résumé en trois lignes, et le
 * client recevait trois morceaux de plus : le bloc de la fiche avec son adresse,
 * la signature, et l'enveloppe. Une relecture qui ne montre pas tout n'attrape
 * pas tout, et elle donne en prime la certitude d'avoir relu.
 *
 * LE DÉFAUT QU'ON ÉVITERA DEMAIN. Le serveur composait le texte à la main et
 * l'aperçu l'aurait composé de son côté. Deux codes qui écrivent le même message
 * divergent toujours : une virgule change d'un côté, et plus rien ne le dit. Il
 * n'y a donc qu'un constructeur, et ce cliquet tient sa forme exacte, parce que
 * c'est elle que le client lit.
 *
 * Ces chaînes ne passent jamais par t() : elles s'adressent au client, pas à
 * l'opérateur, et le serveur les écrit en français quelle que soit la langue de
 * l'écran du desk.
 */
const base = { corps: "Bonjour Madame Mbarga,", signataire: "Georges Nitcheu" } as const;
const ligne = { titre: "OTA Cameroun 6,25 % 2029", url: "https://guichet.purposecapital.africa/offres/ota-2029" };

describe("le message exact", () => {
  it("signe du nom de l'opérateur, puis de la maison", () => {
    expect(signature("Georges Nitcheu")).toBe("Georges Nitcheu, Purpose Capital");
  });

  it("sans fiche : le corps, une ligne vide, la signature", () => {
    expect(texteExact({ ...base, canal: "email" })).toBe("Bonjour Madame Mbarga,\n\nGeorges Nitcheu, Purpose Capital");
  });

  it("avec fiche par courriel : titre et adresse, chacun sur sa ligne", () => {
    expect(texteExact({ ...base, ligne, canal: "email" })).toBe(
      "Bonjour Madame Mbarga,\n\nOTA Cameroun 6,25 % 2029\nhttps://guichet.purposecapital.africa/offres/ota-2029\n\nGeorges Nitcheu, Purpose Capital",
    );
  });

  it("avec fiche sur WhatsApp : une phrase de plus, sur ce que le lien reconnaît", () => {
    const sorti = texteExact({ ...base, ligne, canal: "whatsapp" });
    expect(sorti).toContain(`${ligne.url}\n${MENTION_LIEN_WHATSAPP}`);
    expect(sorti.endsWith("\n\nGeorges Nitcheu, Purpose Capital")).toBe(true);
  });

  it("n'ajoute rien par courriel que WhatsApp n'ajoute pas aussi", () => {
    // Sans fiche, les deux canaux donnent le même texte : la seule différence
    // tient au lien, pas au canal.
    expect(texteExact({ ...base, canal: "email" })).toBe(texteExact({ ...base, canal: "whatsapp" }));
  });

  it("coupe les blancs du corps, pour que la signature ne s'éloigne pas", () => {
    expect(texteExact({ ...base, corps: "  Bonjour,  \n\n  ", canal: "email" })).toBe("Bonjour,\n\nGeorges Nitcheu, Purpose Capital");
  });

  it("recompose : les parties que l'aperçu teinte redonnent le texte envoyé", () => {
    /* C'EST LE CLIQUET QUI COMPTE. L'aperçu n'affiche pas la chaîne plate, il
       affiche trois parties, chacune avec sa teinte. Si leur somme cessait
       d'égaler ce que le serveur envoie, l'opérateur relirait autre chose que
       ce qui part. */
    const p = { ...base, ligne, canal: "whatsapp" as const };
    const parties = `${p.corps.trim()}\n\n${blocLigne(p).replace(/^\n+/, "")}\n\n${signature(p.signataire)}`;
    expect(parties).toBe(texteExact(p));
  });

  it("recompose aussi quand il n'y a pas de fiche", () => {
    const p = { ...base, canal: "email" as const };
    expect(blocLigne(p)).toBe("");
    expect(`${p.corps.trim()}\n\n${signature(p.signataire)}`).toBe(texteExact(p));
  });
});
