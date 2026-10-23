import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { typeOf } from "@/lib/registry";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { Rubriques } from "@/components/mobile/Rubriques";
import { INSTRUMENTS_PAGES } from "@/lib/nav-groups";
import styles from "@/app/aide/page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instruments" };

/**
 * LE SOMMAIRE DES INSTRUMENTS, ET LE SEUL CHIFFRE QU'IL PORTE.
 *
 * Les trois façons d'entrer sur une ligne : ce qui se négocie à la cote, ce
 * qui se souscrit en fonds, et les séances que les six Trésors annoncent.
 * Elles vivaient dans un tiroir de tuiles ouvert par le bas ; elles ont une
 * page.
 *
 * CHAQUE RUBRIQUE DIT COMBIEN ELLE CONTIENT, et c'est la seule chose qu'un
 * sommaire d'instruments puisse ajouter d'utile. « Adjudications » ne dit pas
 * s'il y a une séance ouverte cette semaine ; « Adjudications · 3 ouvertes »
 * le dit, et épargne le détour. Zéro ne s'écrit pas : une rubrique vide se
 * visite quand même, et annoncer son vide serait l'éteindre.
 *
 * LE COMPTE EST CELUI DE CE QUI EST OUVERT, jamais du catalogue entier. Un
 * nombre total vieillit mal et ne décide de rien : ce qui décide, c'est ce
 * qu'on peut prendre aujourd'hui.
 */
/** Le singulier et le pluriel de chaque rubrique, dans son unité à elle. */
const UNITE: Record<string, [string, string]> = {
  titres: ["1 ligne", "{n} lignes"],
  fonds: ["1 fonds", "{n} fonds"],
  calendrier: ["1 séance", "{n} séances"],
};

export default async function InstrumentsSommaire() {
  await requireSession("/instruments");
  const t = await getT();
  /* LE SEGMENT VIT SUR LE TYPE DE PRODUIT, pas sur la ligne : « primaire » se
     lit au référentiel, que le desk peut surcharger. On l'attend donc avant
     de compter, sinon les trois comptes tomberaient sur les valeurs livrées
     avec le code. */
  const [offers] = await Promise.all([repo().listOffers().catch(() => []), loadRegistry()]);

  const vivantes = offers.filter((o) => !o.hidden && o.status === "published");
  const segment = (o: (typeof vivantes)[number]) => typeOf(o).segment;
  const compte: Record<string, number> = {
    titres: vivantes.filter((o) => segment(o) === "secondaire").length,
    fonds: vivantes.filter((o) => segment(o) === "fonds").length,
    calendrier: vivantes.filter((o) => segment(o) === "primaire").length,
  };

  return (
    <Glissement>
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Instruments")}</h1>
          <p>{t("Les trois façons d'entrer sur une ligne : la cote, les fonds, et les séances des Trésors.")}</p>
        </header>

        <Rubriques
          items={INSTRUMENTS_PAGES.map((p) => ({
            href: p.href,
            nom: t(p.label),
            quoi: t(p.hint),
            /* CHAQUE RUBRIQUE COMPTE DANS SON UNITÉ. « 2 ouvertes » convient
               à une séance, qui ouvre et se ferme ; une ligne de la cote ne
               s'ouvre pas, et un fonds encore moins. Un mot juste coûte un
               tableau de trois entrées, un mot faux coûte la confiance dans
               les deux autres. Zéro ne s'écrit pas : une rubrique vide se
               visite quand même, et annoncer son vide l'éteindrait. */
            etiquette: compte[p.key] ? t(UNITE[p.key][compte[p.key] > 1 ? 1 : 0], { n: String(compte[p.key]) }) : undefined,
          }))}
        />
      </div>
    </Glissement>
  );
}
