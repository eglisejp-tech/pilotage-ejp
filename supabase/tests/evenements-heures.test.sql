-- Heures des événements (T68 ; migration 20261023120000_evenements_heures.sql) : heure prévue
-- et heure de début en minutes depuis minuit (heure de Paris), bornes, heure de début seulement
-- sur un « Terminé » et jamais sur une date à venir, reprise d'une heure vide, ligne identique
-- refusée, retard et « à l'heure » de v_evenement (5 et 6 minutes, avance, passage de minuit),
-- journal, ajouter_evenement à 4 et à 5 arguments, refus en aal1, d'un autre ministère et de
-- l'anonyme.
begin;

select plan(56);

-- Jeu d'essai : A porte les événements, B est un autre ministère.
create temp table ctx as
select tests.creer_ministere('Heures A') as a_m,
       tests.creer_ministere('Heures B') as b_m;
alter table ctx add column a uuid, add column b uuid, add column ev_futur uuid, add column ev_sans uuid,
  add column ev_passe uuid, add column ev_minuit uuid, add column ev_premier uuid;
update ctx set a = tests.creer_compte('heures-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('heures-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated;

-- Dernier état d'un événement (lu par le propriétaire du test).
create function pg_temp.dernier(p_evenement uuid) returns table (statut text, heure_prevue smallint, heure_debut smallint)
language sql stable as $$
  select x.statut::text, x.heure_prevue, x.heure_debut from public.evenement_etat x
   where x.evenement_id = p_evenement order by x.saisi_le desc, x.id desc limit 1
$$;

-- 1. Structure des colonnes

select col_type_is('public', 'evenement_etat', 'heure_prevue', 'smallint', 'evenement_etat.heure_prevue : smallint');
select col_type_is('public', 'evenement_etat', 'heure_debut', 'smallint', 'evenement_etat.heure_debut : smallint');
select col_is_null('public', 'evenement_etat', 'heure_prevue', 'heure_prevue est facultative');
select col_is_null('public', 'evenement_etat', 'heure_debut', 'heure_debut est facultative');
select ok(exists (select 1 from pg_constraint c
                   where c.conrelid = 'public.evenement_etat'::regclass
                     and c.conname = 'evenement_etat_heure_debut_termine'),
  'contrainte nommée evenement_etat_heure_debut_termine');

-- 2. Fonctions pures du retard

select results_eq($$
  select private.retard_minutes(v.prevue::smallint, v.debut::smallint)
    from (values (1, 1140, 1152), (2, 870, 873), (3, 1200, 1195), (4, 1410, 5), (5, 5, 1410),
                 (6, 0, 720), (7, 720, 0), (8, 1140, 1140), (9, 1140, 1146)) as v(n, prevue, debut)
   order by v.n
$$, $$ values (12), (3), (-5), (35), (-35), (720), (720), (0), (6) $$,
  'retard_minutes : écart signé ramené dans ]-720, 720], passage de minuit compris (23 h 30 puis 0 h 05 : 35)');
select is(private.retard_minutes(null::smallint, 5::smallint), null::integer, 'retard_minutes : null sans heure prévue');
select is(private.retard_minutes(1140::smallint, null::smallint), null::integer, 'retard_minutes : null sans heure de début');
select is(private.tolerance_ponctualite(), 5, 'tolérance : 5 minutes (K22b)');
select ok((select bool_and(p.provolatile = 'i') from pg_proc p
            where p.oid in ('private.retard_minutes(smallint, smallint)'::regprocedure,
                            'private.tolerance_ponctualite()'::regprocedure)),
  'retard_minutes et tolerance_ponctualite sont immutable');

-- 3. Ajout avec heure prévue (5 arguments)

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Heures, futur', private.aujourdhui() + 5, 'valide', '{}', 1140::smallint)
$$, 'ajouter_evenement à 5 arguments : un événement à 19 h');
select lives_ok($$
  select public.ajouter_evenement('Heures, sans heure', private.aujourdhui() + 6, 'brouillon', '{}', null)
$$, 'l''heure prévue est facultative');
select lives_ok($$
  select public.ajouter_evenement('Heures, quatre arguments', private.aujourdhui() + 7, 'brouillon', '{}'::uuid[])
$$, 'la version à 4 arguments reste et délègue');
select throws_ok($$
  select public.ajouter_evenement('Heures, invalide', private.aujourdhui() + 5, 'valide', '{}', 1440::smallint)
$$, 'P0001', 'L''heure prévue est invalide.', 'ajout : une heure prévue de 1440 est refusée, avec son message');
select throws_ok($$
  select public.ajouter_evenement('Heures, invalide', private.aujourdhui() + 5, 'valide', '{}', (-1)::smallint)
$$, 'P0001', 'L''heure prévue est invalide.', 'ajout : une heure prévue négative est refusée');
select tests.deconnecter();

update ctx set ev_futur = (select e.id from public.evenement e where e.titre = 'Heures, futur'),
               ev_sans = (select e.id from public.evenement e where e.titre = 'Heures, sans heure');

select results_eq($$ select * from pg_temp.dernier((select ev_futur from ctx)) $$,
  $$ values ('valide'::text, 1140::smallint, null::smallint) $$,
  'le premier état porte l''heure prévue, jamais d''heure de début');
select results_eq($$
  select x.heure_prevue from public.evenement_etat x join public.evenement e on e.id = x.evenement_id
   where e.titre = 'Heures, quatre arguments'
$$, $$ values (null::smallint) $$, 'à 4 arguments : aucune heure prévue');
select is((select count(*)::int from public.evenement e where e.titre = 'Heures, invalide'), 0,
  'un ajout refusé n''écrit rien');

-- 4. Refus sur un événement à venir

select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_futur, private.aujourdhui() + 5, 'preparation', 1150 from ctx
$$, 'P0001', 'L''heure de début se saisit pour un événement terminé.',
  'une heure de début hors « Terminé » est refusée, avec son message');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_futur, private.aujourdhui() + 5, 'termine', 1150 from ctx
$$, 'P0001', 'L''heure de début se saisit le jour de l''événement ou après.',
  'une heure de début sur une date à venir est refusée, avec son message');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue)
  select ev_futur, private.aujourdhui() + 5, 'valide', 1440 from ctx
$$, '23514', null, 'une heure prévue de 1440 est refusée par la base');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue)
  select ev_futur, private.aujourdhui() + 5, 'valide', 1170 from ctx
$$, 'une heure prévue changée seule est une mise à jour (la dernière enregistrée fait foi)');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev_futur, private.aujourdhui() + 5, 'valide' from ctx
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.',
  'une heure prévue vide reprend la dernière : la ligne est identique, refusée');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev_futur, private.aujourdhui() + 6, 'valide' from ctx
$$, 'un report sans heure garde l''heure prévue');
select tests.deconnecter();

select results_eq($$ select * from pg_temp.dernier((select ev_futur from ctx)) $$,
  $$ values ('valide'::text, 1170::smallint, null::smallint) $$, 'après le report : 19 h 30 reprise');

-- 5. Événement passé, écrit comme le jeu d'exemple (sans compte connecté) : prévu à 19 h il y a
-- trois jours.
insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select gen_random_uuid(), a_m, 'Heures, passé', now() - interval '20 days', a from ctx;
update ctx set ev_passe = (select e.id from public.evenement e where e.titre = 'Heures, passé');
insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, saisi_le, saisi_par)
select ev_passe, private.aujourdhui() - 3, 'valide', 1140, now() - interval '20 days', a from ctx;

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev_passe, private.aujourdhui() - 3, 'termine' from ctx
$$, 'un événement passé devient « Terminé » sans heure de début');
select tests.deconnecter();
select results_eq($$ select * from pg_temp.dernier((select ev_passe from ctx)) $$,
  $$ values ('termine'::text, 1140::smallint, null::smallint) $$, 'l''heure prévue vide reprend la dernière (19 h)');
select results_eq($$ select retard, a_l_heure from public.v_evenement where id = (select ev_passe from ctx) $$,
  $$ values (null::integer, null::boolean) $$, 'sans heure de début : ni retard, ni « à l''heure »');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_passe, private.aujourdhui() - 3, 'termine', 1146 from ctx
$$, 'l''heure de début se saisit plus tard, sur un « Terminé »');
select tests.deconnecter();
select results_eq($$ select heure_prevue, heure_debut, retard, a_l_heure from public.v_evenement where id = (select ev_passe from ctx) $$,
  $$ values (1140::smallint, 1146::smallint, 6, false) $$, '19 h 06 pour 19 h : 6 minutes, pas à l''heure');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_passe, private.aujourdhui() - 3, 'termine', 1145 from ctx
$$, 'une heure de début se corrige');
select tests.deconnecter();
select results_eq($$ select retard, a_l_heure from public.v_evenement where id = (select ev_passe from ctx) $$,
  $$ values (5, true) $$, '19 h 05 pour 19 h : 5 minutes, à l''heure (tolérance comprise)');

select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev_passe, private.aujourdhui() - 3, 'termine' from ctx
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.',
  'deux heures vides reprennent les dernières : ligne identique, refusée (une heure ne s''efface pas)');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, heure_debut)
  select ev_passe, private.aujourdhui() - 3, 'termine', 1140, 1145 from ctx
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.',
  'les mêmes heures, le même statut et la même date : refusé');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue)
  select ev_passe, private.aujourdhui() - 3, 'termine', 1150 from ctx
$$, 'l''heure prévue se corrige après coup, l''heure de début est reprise');
select tests.deconnecter();
select results_eq($$ select heure_prevue, heure_debut, retard, a_l_heure from public.v_evenement where id = (select ev_passe from ctx) $$,
  $$ values (1150::smallint, 1145::smallint, -5, true) $$, 'avance de 5 minutes : retard -5, à l''heure');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev_passe, private.aujourdhui() - 3, 'annule' from ctx
$$, 'un « Terminé » passe « Annulé » : l''heure de début n''est pas reprise');
select tests.deconnecter();
select results_eq($$ select * from pg_temp.dernier((select ev_passe from ctx)) $$,
  $$ values ('annule'::text, 1150::smallint, null::smallint) $$, '« Annulé » : heure prévue gardée, aucune heure de début');
select results_eq($$ select retard, a_l_heure from public.v_evenement where id = (select ev_passe from ctx) $$,
  $$ values (null::integer, null::boolean) $$, 'hors « Terminé » : ni retard, ni « à l''heure »');

-- 6. Passage de minuit : prévu à 23 h 30, commencé à 0 h 05.
insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select gen_random_uuid(), a_m, 'Heures, minuit', now() - interval '20 days', a from ctx;
update ctx set ev_minuit = (select e.id from public.evenement e where e.titre = 'Heures, minuit');
insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, saisi_le, saisi_par)
select ev_minuit, private.aujourdhui() - 2, 'valide', 1410, now() - interval '20 days', a from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_minuit, private.aujourdhui() - 2, 'termine', 5 from ctx
$$, 'minuit : « Terminé », commencé à 0 h 05');
select tests.deconnecter();
select results_eq($$ select retard, a_l_heure from public.v_evenement where id = (select ev_minuit from ctx) $$,
  $$ values (35, false) $$, '23 h 30 puis 0 h 05 : 35 minutes de retard, jamais -1405');

-- 7. Premier état écrit directement par le porteur : mêmes refus.
insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select gen_random_uuid(), a_m, 'Heures, premier état', now() - interval '1 day', a from ctx;
update ctx set ev_premier = (select e.id from public.evenement e where e.titre = 'Heures, premier état');
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_premier, private.aujourdhui() + 2, 'valide', 600 from ctx
$$, 'P0001', 'L''heure de début se saisit pour un événement terminé.', 'premier état : heure de début hors « Terminé » refusée');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_premier, private.aujourdhui() + 2, 'termine', 600 from ctx
$$, 'P0001', 'L''heure de début se saisit le jour de l''événement ou après.', 'premier état : heure de début sur une date à venir refusée');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, heure_debut)
  select ev_premier, private.aujourdhui(), 'termine', 600, 603 from ctx
$$, 'le jour même, l''heure de début est acceptée');
select tests.deconnecter();

-- 8. Journal : clés en minutes, seulement si renseignées et changées ; jamais de texte libre.
select results_eq($$
  select j.action, j.detail from public.journal j where j.cible_id in (select ev_futur from ctx union all select ev_sans from ctx)
   and j.action = 'evenement_ajoute' order by j.id
$$, $$
  select 'evenement_ajoute', jsonb_build_object('date', private.aujourdhui() + 5, 'statut', 'valide', 'mentions', '[]'::jsonb,
                                                'heure_prevue', 1140)
  union all select 'evenement_ajoute', jsonb_build_object('date', private.aujourdhui() + 6, 'statut', 'brouillon',
                                                          'mentions', '[]'::jsonb)
$$, 'evenement_ajoute : heure_prevue si elle est renseignée, clé absente sinon');
select results_eq($$
  select j.detail ->> 'statut', j.detail -> 'heure_prevue', j.detail -> 'heure_debut'
    from public.journal j where j.cible_id = (select ev_passe from ctx) and j.action = 'evenement_modifie'
   order by j.id
$$, $$ values ('termine'::text, null::jsonb, null::jsonb), ('termine', null, '1146'::jsonb), ('termine', null, '1145'),
              ('termine', '1150'::jsonb, null), ('annule', null, null) $$,
  'evenement_modifie : heure_prevue et heure_debut seulement quand elles changent, en minutes');
select results_eq($$
  select j.detail -> 'heure_prevue' from public.journal j
   where j.cible_id = (select ev_futur from ctx) and j.action = 'evenement_modifie' order by j.id
$$, $$ values ('1170'::jsonb), (null::jsonb) $$, 'un report qui reprend l''heure prévue ne la répète pas');
select is((select count(*)::int from public.journal j
            where j.cible = 'evenement' and j.cible_id in (select ev_futur from ctx union all select ev_passe from ctx
                                                             union all select ev_minuit from ctx)
              and exists (select 1 from jsonb_object_keys(j.detail) as k(cle)
                           where k.cle not in ('date', 'statut', 'mentions', 'date_precedente', 'heure_prevue', 'heure_debut'))), 0,
  'le journal ne porte que des dates, des statuts, des identifiants et des minutes');

-- 9. Droits
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_minuit, private.aujourdhui() - 2, 'termine', 10 from ctx
$$, '42501', null, 'un autre ministère ne saisit pas l''heure de début (RLS, sans message sur l''état)');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$
  select public.ajouter_evenement('Heures, aal1', private.aujourdhui() + 5, 'valide', '{}', 1140::smallint)
$$, '42501', 'Double authentification requise.', 'aal1 : ajouter_evenement à 5 arguments refusée');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select ev_minuit, private.aujourdhui() - 2, 'termine', 10 from ctx
$$, '42501', null, 'aal1 : le porteur ne saisit pas d''heure (politique aal2)');
select tests.deconnecter();
select tests.anonyme();
select throws_ok($$
  select public.ajouter_evenement('Heures, anonyme', '2030-01-01', 'valide', '{}', 1140::smallint)
$$, '42501', null, 'anonyme : ajouter_evenement à 5 arguments refusée');
select tests.deconnecter();

-- 10. Structure des fonctions
select ok((select p.prosecdef and p.pronargdefaults = 0 from pg_proc p
            where p.oid = 'private.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint)'::regprocedure)
          and (select not p.prosecdef and p.pronargdefaults = 0 from pg_proc p
                where p.oid = 'public.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint)'::regprocedure),
  'ajouter_evenement à 5 arguments : private security definer, public security invoker, sans valeur par défaut');
select ok(not exists (select 1 from pg_proc p
                       where p.proname = 'ajouter_evenement' and p.pronargdefaults > 0
                         and p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)),
  'aucune version de ajouter_evenement n''a de valeur par défaut (PostgREST ne voit jamais deux candidates)');
select ok((select p.prosrc from pg_proc p where p.oid = 'private.controler_evenement_etat()'::regprocedure)
            like '%new.date > private.aujourdhui()%'
          and (select p.prosrc from pg_proc p where p.oid = 'private.controler_evenement_etat()'::regprocedure)
                !~* '(current_date|now\(\)|localtimestamp|current_timestamp)',
  'le trigger compare la date de l''heure de début à private.aujourdhui(), jamais à current_date ni à now()');
select ok(pg_get_viewdef('public.v_evenement'::regclass) like '%private.retard_minutes(%'
          and pg_get_viewdef('public.v_evenement'::regclass) like '%private.tolerance_ponctualite()%',
  'v_evenement calcule le retard et « à l''heure » avec les fonctions de la base');

select * from finish();
rollback;
