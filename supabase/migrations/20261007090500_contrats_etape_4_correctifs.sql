-- Étape 4, lot W0 : correctif de 20261007090000_contrats_etape_4.sql (figée).
--
-- docs/conception/contrat-etape-4.md, section 1 : les contraintes du journal et de la
-- modération portent un nom explicite, pour qu'une étape suivante les retrouve sans dépendre
-- du nom que Postgres donne à un check sans nom. La migration de contrats a nommé les quatre
-- listes fermées, mais a laissé le check voisin de moderation sous son nom d'origine
-- (moderation_check : une décision « masque » si et seulement si un champ et un motif sont
-- donnés, 20260930163150_types_et_tables.sql). Il prend ici le nom moderation_masque_check.
-- Seul le nom change : même expression, aucune ligne relue, aucun droit touché.

alter table public.moderation rename constraint moderation_check to moderation_masque_check;
