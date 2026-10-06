-- Jeu d'exemple de l'étape 4, lot B6 : un événement à confirmer, reporté, avec une mention
-- (T31, T32, K10b). Local et CI seulement, chargé après seed.sql (supabase/config.toml).
--
-- « Réunion des responsables » de Coordination, qui mentionne Communication : créée le
-- lundi 14 sept. pour le jeudi 24 sept., en attente de validation, puis reportée le lundi
-- 21 sept. au samedi 26 sept., toujours en attente. Sa date est passée au dimanche de
-- référence : elle reste « à confirmer » (T31) quel que soit le jour de la semaine, sans
-- devenir le prochain événement de Coordination. reporte_du vaut le 24 sept.
-- Les deux écritures sont antérieures à la dernière saisie de Coordination (réunion du
-- 28 sept.) : la fraîcheur des ministères ne change pas. Le trigger de evenement_etat écrit
-- les deux lignes de journal (evenement_ajoute avec la mention, evenement_modifie avec la date
-- précédente), au nom du compte de Coordination.
--
-- Ce fichier se suffit à lui-même (docs/conception/contrat-etape-4.md, section 3) : il
-- redéfinit les aides de décalage de seed.sql et retrouve les ministères par les comptes aux
-- identifiants fixes (le ministère Coordination peut venir de la migration de B1).

create or replace function pg_temp.j(p_jour date) returns date
language sql stable as $$
  select p_jour + (private.dimanche_reference() - date '2026-09-27')
$$;

create or replace function pg_temp.h(p_heure timestamp) returns timestamptz
language sql stable as $$
  select (p_heure + (private.dimanche_reference() - date '2026-09-27') * interval '1 day') at time zone 'Europe/Paris'
$$;

insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select '42000000-0000-4000-8000-000000000001'::uuid, c.ministere_id, 'Réunion des responsables',
       pg_temp.h('2026-09-14 20:00'), c.user_id
from public.compte c
where c.user_id = '20000000-0000-4000-8000-000000000003';             -- Ministère Coordination

-- La mention se pose avant le premier état, comme dans ajouter_evenement.
insert into public.evenement_mention (evenement_id, ministere_id)
select '42000000-0000-4000-8000-000000000001'::uuid, c.ministere_id
from public.compte c
where c.user_id = '20000000-0000-4000-8000-000000000001';             -- Ministère Communication

insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
values ('42000000-0000-4000-8000-000000000001', pg_temp.j('2026-09-24'), 'attente_validation',
        pg_temp.h('2026-09-14 20:00'), '20000000-0000-4000-8000-000000000003');

insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
values ('42000000-0000-4000-8000-000000000001', pg_temp.j('2026-09-26'), 'attente_validation',
        pg_temp.h('2026-09-21 20:15'), '20000000-0000-4000-8000-000000000003');
