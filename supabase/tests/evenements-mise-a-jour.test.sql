-- Mise à jour d'un événement (T37, décidé le 6 octobre 2026 ; docs/plan-etape-4.md, section 4,
-- « B6 ») : le trigger private.controler_evenement_etat() refuse une nouvelle date passée et une
-- ligne identique au dernier état, avec les messages repris par le formulaire 11. Une date
-- inchangée, même passée, reste permise. Un refus n'écrit aucune ligne de journal. Les dates se
-- calculent à l'heure de Paris (bascule de minuit).
begin;

select plan(25);

-- Jeu d'essai : deux ministères et leurs comptes.
create temp table ctx as
select tests.creer_ministere('Mise à jour A') as a_m,
       tests.creer_ministere('Mise à jour B') as b_m;
alter table ctx add column a uuid, add column b uuid, add column ev1 uuid, add column ev2 uuid,
  add column ev3 uuid;
update ctx set a = tests.creer_compte('maj-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('maj-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated;

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Mise à jour, événement 1', private.aujourdhui() + 5, 'attente_validation', '{}')
$$, 'jeu d''essai : A ajoute un événement en attente de validation, dans 5 jours');
select tests.deconnecter();

update ctx set ev1 = (select e.id from public.evenement e where e.titre = 'Mise à jour, événement 1');

-- Événement déjà passé, écrit comme le jeu d'exemple (sans compte connecté) : date d'il y a
-- 10 jours, toujours en attente.
insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select gen_random_uuid(), a_m, 'Mise à jour, événement passé', now() - interval '20 days', a from ctx;
update ctx set ev2 = (select e.id from public.evenement e where e.titre = 'Mise à jour, événement passé');
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select ev2, private.aujourdhui() - 10, 'attente_validation', now() - interval '20 days', a from ctx;

-- Événement à venir : nouvelle date
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui() - 1, 'attente_validation' from ctx
$$, 'P0001', 'La nouvelle date doit être aujourd''hui ou plus tard.',
  'une nouvelle date d''hier est refusée, avec son message');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui() - 1, 'valide' from ctx
$$, 'P0001', 'La nouvelle date doit être aujourd''hui ou plus tard.',
  'une nouvelle date d''hier est refusée, même avec un autre statut');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui(), 'attente_validation' from ctx
$$, 'une nouvelle date du jour est acceptée');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui(), 'attente_validation' from ctx
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.',
  'une ligne identique au dernier état est refusée, avec son message');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui() + 7, 'attente_validation' from ctx
$$, 'une date changée avec le même statut est acceptée (report)');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui() + 7, 'valide' from ctx
$$, 'un statut changé avec la même date est accepté');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ctx.ev1, v.jour, 'valide' from ctx
  cross join (values (private.aujourdhui() + 8), (private.aujourdhui() + 8)) as v(jour)
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.',
  'dans un même envoi, la deuxième ligne identique à la première est refusée, et tout l''envoi avec elle');
select tests.deconnecter();

select results_eq($$
  select j.action, j.compte, j.ministere_id, j.detail from public.journal j
   where j.cible_id = (select ev1 from ctx) order by j.id
$$, $$
  select 'evenement_ajoute', a, a_m,
         jsonb_build_object('date', private.aujourdhui() + 5, 'statut', 'attente_validation', 'mentions', '[]'::jsonb)
    from ctx
  union all select 'evenement_modifie', a, a_m,
         jsonb_build_object('date', private.aujourdhui(), 'statut', 'attente_validation',
                            'date_precedente', private.aujourdhui() + 5) from ctx
  union all select 'evenement_modifie', a, a_m,
         jsonb_build_object('date', private.aujourdhui() + 7, 'statut', 'attente_validation',
                            'date_precedente', private.aujourdhui()) from ctx
  union all select 'evenement_modifie', a, a_m,
         jsonb_build_object('date', private.aujourdhui() + 7, 'statut', 'valide',
                            'date_precedente', private.aujourdhui() + 7) from ctx
$$, 'journal : une ligne par mise à jour acceptée, avec la date précédente ; aucune ligne pour un refus');
select is((select count(*)::int from public.evenement_etat x where x.evenement_id = (select ev1 from ctx)), 4,
  'les refus n''ont ajouté aucun état');

-- Événement passé : la date inchangée reste permise
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev2, private.aujourdhui() - 10, 'termine' from ctx
$$, 'un statut changé sur une date passée inchangée est accepté (T31)');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev2, private.aujourdhui() - 10, 'termine' from ctx
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.',
  'événement passé : une ligne identique est refusée');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev2, private.aujourdhui() - 9, 'termine' from ctx
$$, 'P0001', 'La nouvelle date doit être aujourd''hui ou plus tard.',
  'événement passé : une autre date passée est refusée');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev2, private.aujourdhui(), 'attente_validation' from ctx
$$, 'événement passé : un report à aujourd''hui est accepté');
select tests.deconnecter();

select results_eq($$
  select j.action, j.detail ->> 'date_precedente' from public.journal j
   where j.cible_id = (select ev2 from ctx) order by j.id
$$, $$
  values ('evenement_ajoute', null::text),
         ('evenement_modifie', (private.aujourdhui() - 10)::text),
         ('evenement_modifie', (private.aujourdhui() - 10)::text)
$$, 'événement passé : deux mises à jour acceptées, deux lignes de journal');

-- Aucun refus ne renseigne un autre compte sur l'état : la RLS refuse d'abord (42501).
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui() + 7, 'valide' from ctx
$$, '42501', null, 'un autre ministère qui recopie le dernier état est refusé par la RLS, sans message sur l''état');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ev1, private.aujourdhui() + 7, 'valide' from ctx
$$, '42501', null, 'aal1 : le porteur est refusé par la politique aal2, sans message sur l''état');
select tests.deconnecter();

-- Bascule de minuit à Paris : le 14 oct. 2026 à 22 h 30 UTC, il est 0 h 30 le 15 oct. à Paris.
-- private.aujourdhui() est remplacée dans cette transaction (annulée à la fin) par la même
-- règle appliquée à cet instant fixe, au nom de postgres, propriétaire de la fonction.
set local role postgres;
create or replace function private.aujourdhui() returns date
language sql stable set search_path = '' as $$
  select (timestamptz '2026-10-14 22:30:00+00' at time zone 'Europe/Paris')::date
$$;
reset role;
select is(private.aujourdhui(), date '2026-10-15', 'à 22 h 30 UTC le 14 oct., la date de Paris est le 15 oct.');
select is((timestamptz '2026-10-14 22:30:00+00' at time zone 'UTC')::date, date '2026-10-14',
  'au même instant, la date UTC est encore le 14 oct.');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_evenement('Mise à jour, minuit', date '2026-10-20', 'valide', '{}') $$,
  'minuit : A ajoute un événement pour le 20 oct.');
select throws_ok($$ select public.ajouter_evenement('Mise à jour, minuit refusé', date '2026-10-14', 'valide', '{}') $$,
  'P0001', 'La date ne peut pas être passée.', 'minuit : à l''ajout, le 14 oct. est déjà passé à Paris');
select tests.deconnecter();

update ctx set ev3 = (select e.id from public.evenement e where e.titre = 'Mise à jour, minuit');

select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select ev3, date '2026-10-14', 'valide' from ctx
$$, 'P0001', 'La nouvelle date doit être aujourd''hui ou plus tard.',
  'minuit : une nouvelle date au 14 oct. (jour UTC) est refusée, c''est hier à Paris');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select ev3, date '2026-10-15', 'valide' from ctx
$$, 'minuit : une nouvelle date au 15 oct. (aujourd''hui à Paris) est acceptée');
select tests.deconnecter();

-- Structure
select has_trigger('public', 'evenement_etat', 'controler_evenement_etat',
  'le trigger controler_evenement_etat contrôle chaque ajout dans evenement_etat');
select ok((select p.prosecdef from pg_proc p where p.oid = 'private.controler_evenement_etat()'::regprocedure)
          and not has_function_privilege('authenticated', 'private.controler_evenement_etat()', 'EXECUTE'),
  'controler_evenement_etat : security definer, exécutable par personne (fonction de trigger)');

select * from finish();
rollback;
