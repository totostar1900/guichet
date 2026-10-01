/**
 * La clef d'un fichier dans le dépôt, et pourquoi elle vit seule ici.
 *
 * ELLE N'A PAS DE MODULE « server-only », ET C'EST LE SUJET. Elle vivait dans
 * `storage.ts`, derrière cette barrière, donc aucun script de reprise ne pouvait
 * l'importer. Les scripts en gardaient une copie, et une copie libre dérive :
 * celle du script d'ingestion des avis ne remplaçait que les caractères non
 * ASCII, un par un, là où celle-ci écrase aussi les espaces et les points et
 * réduit toute une suite à un seul tiret. Dix-sept avis de Guinée équatoriale,
 * seul pays dont le nom porte les trois, sont partis sous une clef que
 * l'application n'aurait jamais lue.
 *
 * Le 2026-10-02, le balayage du dépôt a retrouvé ce résidu : sept communiqués
 * que la base désignait et que le dépôt gardait sous un autre nom, donc
 * illisibles, et vingt-deux doublons périmés. La règle est maintenant à un seul
 * endroit, importable de partout, et `src/test/storage-key.test.ts` vérifie
 * qu'aucune copie ne subsiste dans les scripts.
 *
 * C'est une fonction de chaîne pure : elle n'a jamais eu de raison d'être
 * derrière une barrière de serveur.
 */
export const storageKey = (key: string): string =>
  key
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._\-/]+/g, "-");
