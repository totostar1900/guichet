-- À exécuter seul (valeur d'enum) : les alertes « opportunité du moment ».
alter type notify_kind add value if not exists 'opportunity';
-- puis, dans un second run :
-- alter type notify_channel add value if not exists 'push';
