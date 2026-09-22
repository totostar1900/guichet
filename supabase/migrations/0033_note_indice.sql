-- La note mensuelle sur l'indice est un document comme les autres : un type de plus.
-- « add value » ne cohabite pas avec son usage dans la même transaction : ce fichier ne fait que ça.
alter type document_type add value if not exists 'note_indice';
