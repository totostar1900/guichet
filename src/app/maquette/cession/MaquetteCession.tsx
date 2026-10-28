"use client";

import { useState } from "react";
import { Attente, Bandeau, Boite, chiffres, MILLIERS, Pied, Recap, Tete, Trop } from "../commun";
import styles from "../commun.module.css";

/**
 * ON PART DE CE QU'ON DÉTIENT, ET NON D'UNE SOMME QU'ON DÉCIDE.
 *
 * C'est la seule question neuve de cette maquette, et elle change deux choses
 * dans une forme qui ne change pas par ailleurs :
 *
 *   LE CHIFFRE A UN PLAFOND, et ce plafond n'est pas une règle de la maison :
 *   c'est ce que le client possède. Taper plus que ses titres n'est donc pas
 *   une faute à corriger mais une impossibilité à dire — et on la dit en
 *   montrant le nombre qu'il a, pas en refusant la frappe.
 *
 *   LA CONSÉQUENCE QUI COMPTE EST CE QUI RESTE. Ailleurs, on montre ce que le
 *   montant achète. Ici, « il vous restera 108 titres » est la phrase que le
 *   client se dit à lui-même pendant qu'il tape, et elle n'est écrite nulle
 *   part aujourd'hui.
 *
 * LE PRODUIT EST UNE ESTIMATION, et le mot « au dernier cours » le dit : une
 * cession s'exécute au marché, pas au cours affiché. Le récapitulatif le
 * répète, parce que c'est là qu'on signe.
 */
export function MaquetteCession({ titre, isin, cours, detenu }: { titre: string; isin: string; cours: number; detenu: number }) {
  const [brut, setBrut] = useState("");
  const [etape, setEtape] = useState<1 | 2>(1);

  const demande = Number(chiffres(brut) || 0);
  const trop = demande > detenu;
  const produit = demande * cours;
  const reste = Math.max(0, detenu - demande);
  const pret = demande > 0 && !trop;

  return (
    <div className={styles.ecran}>
      <Bandeau essaie="on part de ce qu'on détient" />
      <Tete sur="Vos titres" titre={titre} isin={isin} />

      {etape === 1 ? (
        <>
          <Boite
            id="titres"
            question="Combien de titres voulez-vous céder ?"
            valeur={brut ? MILLIERS(demande) : ""}
            onChange={(v) => setBrut(chiffres(v).slice(0, 9))}
            unite={demande > 1 ? "titres" : "titre"}
            dessous={
              demande === 0 ? (
                <Attente>Ce que la cession vous rapporte s&apos;affiche ici pendant que vous tapez.</Attente>
              ) : trop ? (
                <Trop>Vous en détenez {MILLIERS(detenu)} : on ne peut pas céder davantage.</Trop>
              ) : (
                <>
                  <b>≈ {MILLIERS(produit)} FCFA</b>
                  <span>
                    {" "}au dernier cours de {MILLIERS(cours)} FCFA · il vous restera {MILLIERS(reste)} {reste > 1 ? "titres" : "titre"}
                  </span>
                </>
              )
            }
          />
          <Pied mot="Continuer" pret={pret} sur={() => setEtape(2)} note={`Vous détenez ${MILLIERS(detenu)} titres de cette ligne`} />
        </>
      ) : (
        <>
          <Recap
            titre="Vérifiez, puis envoyez"
            lignes={[
              { quoi: "Vous cédez", dit: `${MILLIERS(demande)} ${demande > 1 ? "titres" : "titre"}`, fort: true },
              { quoi: "Produit estimé", dit: `≈ ${MILLIERS(produit)} FCFA au dernier cours` },
              { quoi: "Il vous restera", dit: `${MILLIERS(reste)} ${reste > 1 ? "titres" : "titre"}` },
            ]}
            /* TROIS LIGNES ET LES COORDONNÉES, comme les trois autres. Le
               règlement avait sa ligne ; mesuré sur un 390 × 844, le bouton
               d'envoi passait alors SOUS la barre d'onglets, à six pixels
               près — la même faute que celle corrigée le 28 octobre sur le
               passage d'ordre, et que ma mesure d'alors avait manquée parce
               qu'elle comptait jusqu'au bas de l'écran et non jusqu'au haut
               de la barre. T+3 est un fait de règlement, pas une des trois
               décisions : il se lit dans la phrase, comme sur la vraie page. */
            mot="Règlement T+3, sur votre provision. Une cession s'exécute au marché : le produit dépend du cours au moment de l'exécution, pas de celui affiché ici. Le desk vous confirme l'exécution et son prix."
          />
          <Pied mot="Envoyer au desk" sur={() => setEtape(1)} second="Corriger" surSecond={() => setEtape(1)} />
        </>
      )}
    </div>
  );
}
