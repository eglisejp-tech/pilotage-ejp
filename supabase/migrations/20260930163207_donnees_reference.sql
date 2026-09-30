-- Étape 1, migration 7 sur 7 : données de référence (BRIEF, section 6, « Données de référence »).
--
-- Ce qui doit exister partout, production comprise : les trois indicateurs communs et le
-- ministère FIJ (code 'fij'). Les indicateurs propres attendent la liste validée par la
-- coordination (docs/decisions.md, P08) : une migration d'EJP Tech les ajoutera. Le jeu
-- d'exemple (supabase/seed.sql) ne sert qu'au local et à la CI.

insert into public.indicateur (code, libelle, nature, ordre) values
  ('service', 'STARs au service', 'dimanche', 1),
  ('actifs', 'STARs actifs', 'a_ce_jour', 2),
  ('en_fij', 'Dont en FIJ', 'a_ce_jour', 3);

-- Le ministère FIJ et sa ligne de journal (compte nul : « Système », écrit par une migration).
with fij as (
  insert into public.ministere (code, nom) values ('fij', 'FIJ')
  returning id
)
insert into public.journal (compte, ministere_id, action, cible, cible_id)
select null, fij.id, 'ministere_cree', 'ministere', fij.id from fij;
