-- Un événement sur plusieurs jours (T78, lot 2 ; docs/conception/calendrier-evenements.md,
-- sections 5.1, 7 (S6, S7), 9, 10.2 et 16, test 8 ; migration 20261027141108_evenements_plages.sql).
--
-- S6, le camp de Toussaint : Jeunesse saisit « Plusieurs jours », du premier au dernier jour, de
-- 10 h à 17 h. Un seul événement, un prévu dans le mois du premier jour ; un camp en cours (commencé
-- hier, fini demain) n'est pas « passé sans état final » ; un camp fini sans état final l'est ;
-- l'heure de début réelle se saisit dès le premier jour, ponctualité mesurée une fois ; 32 jours
-- et une fin avant le début sont refusés ; le journal porte la date de fin et l'heure de fin.
-- S7, le report par l'ancien site (sans les champs de fin) : la base garde la durée et l'heure de
-- fin. Puis : retour à un seul jour (dernier jour égal au premier), une nouvelle date de fin passée
-- refusée, les dates d'un événement passé figées pour le porteur et corrigées par EJP Tech
-- (20261027164105_plages_regles.sql), « Rien n'a changé » qui compare aussi la fin, les
-- mentions et le retrait permis jusqu'au
-- dernier jour compris, les anciennes signatures inchangées (même numéro, même événement) et des
-- signatures sans valeur par défaut.
begin;

select plan(46);

create temp table ctx as
select tests.creer_ministere('Plages, Jeunesse') as j_m,
       tests.creer_ministere('Plages, mentionné') as m_m,
       tests.creer_ministere('Plages, autre mention') as n_m,
       private.aujourdhui() as jour,
       gen_random_uuid() as k, gen_random_uuid() as k2;
alter table ctx add column j uuid, add column camp uuid, add column un_jour uuid, add column encours uuid,
  add column fini uuid, add column encours2 uuid, add column ancien uuid;
update ctx set j = tests.creer_compte('plages-jeunesse@exemple.test', 'ministere', j_m);
grant select, update on ctx to authenticated;
grant select on ctx to anon;

-- Comptages de Jeunesse (v_evenements_mois), sur un mois ou sur tous (p_mois null).
create function pg_temp.comptage(p_colonne text, p_mois date) returns integer
language sql as $$
  select coalesce(sum((x.ligne ->> p_colonne)::integer), 0)::integer
    from jsonb_array_elements(tests.lire((select j from ctx), 'aal2',
           format('select * from public.v_evenements_mois where ministere_id = %L and (%L::date is null or mois = %L::date)',
                  (select j_m from ctx), p_mois, p_mois))) as x(ligne)
$$;
-- Dernier état d'un événement, lu par Jeunesse dans v_evenement.
create function pg_temp.vue(p_evenement uuid) returns jsonb
language sql as $$
  select tests.lire((select j from ctx), 'aal2',
           format('select date - private.aujourdhui() as debut, date_fin - private.aujourdhui() as fin,
                          heure_prevue, heure_fin, jours, jours_fin, serie_id
                     from public.v_evenement where id = %L', p_evenement)) -> 0
$$;

-- Structure
select col_type_is('public', 'evenement_etat', 'date_fin', 'date', 'evenement_etat.date_fin : date');
select col_type_is('public', 'evenement_etat', 'heure_fin', 'smallint', 'evenement_etat.heure_fin : smallint');
select col_type_is('public', 'evenement', 'serie_id', 'uuid', 'evenement.serie_id : uuid');
select ok(exists (select 1 from pg_constraint c
                   where c.conrelid = 'public.evenement_etat'::regclass and c.conname = 'evenement_etat_date_fin'),
  'contrainte nommée evenement_etat_date_fin (du lendemain du premier jour à 30 jours après)');

-- S6 : le camp, du premier jour (dans 5 jours) au dernier (dans 7 jours), de 10 h à 17 h.
select tests.se_connecter((select j from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Camp de Toussaint', (select jour + 5 from ctx), (select jour + 7 from ctx), 'valide',
                                  array[(select m_m from ctx)], 600::smallint, 1020::smallint, (select k from ctx))
$$, 'S6 : Jeunesse ajoute le camp sur trois jours, de 10 h à 17 h');
select tests.deconnecter();
update ctx set camp = (select e.id from public.evenement e where e.titre = 'Camp de Toussaint');
select is(pg_temp.vue((select camp from ctx)),
  jsonb_build_object('debut', 5, 'fin', 7, 'heure_prevue', 600, 'heure_fin', 1020, 'jours', 5, 'jours_fin', 7,
                     'serie_id', null),
  'S6 : un seul événement, du premier au dernier jour ; jours compte le premier jour, jours_fin le dernier');
select is(pg_temp.comptage('prevus', null), 1, 'S6 : un seul prévu');
select is(pg_temp.comptage('prevus', (select date_trunc('month', (jour + 5)::timestamp)::date from ctx)), 1,
  'S6 : le prévu compte dans le mois du premier jour');
select is((select j.detail from public.journal j where j.cible_id = (select camp from ctx) and j.action = 'evenement_ajoute'),
  jsonb_build_object('date', (select jour + 5 from ctx), 'statut', 'valide', 'mentions', jsonb_build_array((select m_m from ctx)),
                     'heure_prevue', 600, 'date_fin', (select jour + 7 from ctx), 'heure_fin', 1020),
  'S6 : le journal porte la date de fin et l''heure de fin, jamais le nom');

-- Réponse perdue (T76) : le même numéro et la même fin rendent le même camp ; une autre fin est
-- refusée.
select tests.se_connecter((select j from ctx), 'aal2');
select is(public.ajouter_evenement('Camp de Toussaint', (select jour + 5 from ctx), (select jour + 7 from ctx), 'valide',
                                   array[(select m_m from ctx)], 600::smallint, 1020::smallint, (select k from ctx)),
  (select camp from ctx), 'même numéro, même fin : le même camp, rien d''écrit');
select throws_ok($$
  select public.ajouter_evenement('Camp de Toussaint', (select jour + 5 from ctx), (select jour + 8 from ctx), 'valide',
                                  array[(select m_m from ctx)], 600::smallint, 1020::smallint, (select k from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.', 'même numéro, autre fin : refus');
select tests.deconnecter();

-- Limites (Q3) : 31 jours au plus, le dernier jour après le premier ; heure de fin valide.
select tests.se_connecter((select j from ctx), 'aal2');
select throws_ok($$
  select public.ajouter_evenement('Plages, 32 jours', (select jour + 5 from ctx), (select jour + 36 from ctx), 'valide',
                                  '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, 'P0001', 'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.', '32 jours : refusé');
select lives_ok($$
  select public.ajouter_evenement('Plages, 31 jours', (select jour + 5 from ctx), (select jour + 35 from ctx), 'brouillon',
                                  '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, '31 jours : accepté');
select throws_ok($$
  select public.ajouter_evenement('Plages, à l''envers', (select jour + 5 from ctx), (select jour + 4 from ctx), 'valide',
                                  '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, 'P0001', 'Le dernier jour doit suivre le premier.', 'un dernier jour avant le premier : refusé');
select throws_ok($$
  select public.ajouter_evenement('Plages, heure de fin', (select jour + 5 from ctx), null::date, 'valide',
                                  '{}'::uuid[], null::smallint, 1440::smallint, gen_random_uuid())
$$, 'P0001', 'L''heure de fin est invalide.', 'une heure de fin hors de la journée : refusée');
select lives_ok($$
  select public.ajouter_evenement('Plages, un seul jour', (select jour + 5 from ctx), (select jour + 5 from ctx), 'valide',
                                  '{}'::uuid[], 1140::smallint, 1260::smallint, gen_random_uuid())
$$, 'un dernier jour égal au premier : un événement d''un jour');
select tests.deconnecter();
update ctx set un_jour = (select e.id from public.evenement e where e.titre = 'Plages, un seul jour');
select is((select x.date_fin from public.evenement_etat x where x.evenement_id = (select un_jour from ctx)), null::date,
  'un seul jour : aucune date de fin enregistrée');

-- S7 : l'ancien site reporte le camp d'une semaine, sans date de fin ni heure de fin.
select tests.se_connecter((select j from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select camp, jour + 12, 'valide' from ctx
$$, 'S7 : l''ancien site reporte le camp');
select tests.deconnecter();
select is(pg_temp.vue((select camp from ctx)),
  jsonb_build_object('debut', 12, 'fin', 14, 'heure_prevue', 600, 'heure_fin', 1020, 'jours', 12, 'jours_fin', 14,
                     'serie_id', null),
  'S7 : la base garde la durée (trois jours) et les heures');
select is((select j.detail - 'statut' - 'date_precedente' from public.journal j
            where j.cible_id = (select camp from ctx) and j.action = 'evenement_modifie'),
  jsonb_build_object('date', (select jour + 12 from ctx), 'date_fin', (select jour + 14 from ctx)),
  'S7 : le journal du report porte la nouvelle date de fin');

-- Le nouveau site : retour à un seul jour, puis de nouveau deux jours ; « Rien n'a changé ».
select tests.se_connecter((select j from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select camp, jour + 12, jour + 12, 'valide' from ctx
$$, 'un dernier jour égal au premier ramène le camp à un seul jour');
select is((select x.date_fin from public.evenement_etat x where x.evenement_id = (select camp from ctx)
            order by x.saisi_le desc, x.id desc limit 1), null::date, 'un seul jour : date de fin vide');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select camp, jour + 12, jour + 13, 'valide' from ctx
$$, 'puis deux jours');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select camp, jour + 12, jour + 13, 'valide' from ctx
$$, 'P0001', 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.', 'la même fin : rien n''a changé');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select camp, jour + 12, jour + 43, 'valide' from ctx
$$, 'P0001', 'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.',
  'une mise à jour sur plus de 31 jours : refusée');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select camp, jour + 12, jour + 11, 'valide' from ctx
$$, 'P0001', 'Le dernier jour doit suivre le premier.', 'une mise à jour avec la fin avant le début : refusée');
select tests.deconnecter();

-- Un camp en cours (commencé hier, fini demain) et un camp fini avant-hier, sans état final.
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select j_m, 'Plages, camp en cours', now() - interval '5 days', j from ctx returning id)
update ctx set encours = (select n.id from nouveau n);
insert into public.evenement_etat (evenement_id, date, date_fin, statut, heure_prevue, saisi_le, saisi_par)
select encours, jour - 1, jour + 1, 'valide', 600, now() - interval '5 days', j from ctx;
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select j_m, 'Plages, camp fini', now() - interval '9 days', j from ctx returning id)
update ctx set fini = (select n.id from nouveau n);
insert into public.evenement_etat (evenement_id, date, date_fin, statut, saisi_le, saisi_par)
select fini, jour - 4, jour - 2, 'valide', now() - interval '9 days', j from ctx;
select is(tests.lire((select j from ctx), 'aal2',
            format('select prochain_evenement_titre as t from public.v_tableau_ministeres where ministere_id = %L',
                   (select j_m from ctx))) -> 0 ->> 't', 'Plages, camp en cours',
  'tableau des ministères : le camp en cours reste le prochain événement jusqu''à son dernier jour');
select is(pg_temp.comptage('passes_sans_etat_final', null), 1,
  'S6, le deuxième jour : le camp en cours n''est pas « passé sans état final », le camp fini l''est');
select is(pg_temp.vue((select encours from ctx)) - 'heure_prevue' - 'heure_fin' - 'serie_id',
  jsonb_build_object('debut', -1, 'fin', 1, 'jours', -1, 'jours_fin', 1),
  'le camp en cours : jours négatif, jours_fin positif');

-- Ponctualité : l'heure de début se saisit dès le premier jour, une mesure.
select tests.se_connecter((select j from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut, heure_debut)
  select encours, jour - 1, jour + 1, 'termine', 610 from ctx
$$, 'S6 : Jeunesse indique « Terminé » et l''heure de début réelle du premier jour');
select tests.deconnecter();
select is((tests.lire((select j from ctx), 'aal2',
            format('select retard from public.v_evenement where id = %L', (select encours from ctx))) -> 0 ->> 'retard')::integer,
  10, 'S6 : retard mesuré au début du premier jour (10 minutes)');
select is((select c.avec_heures from private.comptages_evenements_mois((select j_m from ctx)) as c
            where c.mois = (select date_trunc('month', (jour - 1)::timestamp)::date from ctx)), 1,
  'S6 : une seule mesure de ponctualité, dans le mois du premier jour');

-- Une nouvelle date de fin passée est refusée ; raccourcir jusqu'à aujourd'hui est permis.
select tests.se_connecter((select j from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select encours, jour - 1, jour - 1, 'termine' from ctx
$$, 'P0001', 'La date de fin doit être aujourd''hui ou plus tard.', 'une nouvelle date de fin passée : refusée');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select encours, jour - 1, jour, 'termine' from ctx
$$, 'raccourcir le camp en cours jusqu''à aujourd''hui : permis');

-- Le dernier jour passé, le porteur ne change plus les dates (décision de la personne responsable
-- du 27 octobre 2026) : ni prolonger, ni avancer la fin, ni reporter. Le statut, oui ; EJP Tech
-- corrige les dates à la demande du ministère (éditeur SQL, en propriétaire des tables).
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select fini, jour - 4, jour + 1, 'valide' from ctx
$$, 'P0001', 'Les dates d''un événement passé se corrigent par EJP Tech.', 'un camp fini : le porteur ne le prolonge pas');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select fini, jour - 4, jour - 3, 'annule' from ctx
$$, 'P0001', 'Les dates d''un événement passé se corrigent par EJP Tech.', 'un camp fini : le porteur n''avance pas sa fin');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut) select fini, jour + 3, jour + 5, 'valide' from ctx
$$, 'P0001', 'Les dates d''un événement passé se corrigent par EJP Tech.', 'un camp fini : le porteur ne le reporte pas');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select fini, jour - 4, 'termine' from ctx
$$, 'un camp fini : « Terminé » sans changer les dates (ancien site, sans fin) reste permis');
select tests.deconnecter();
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, date_fin, statut, saisi_le, saisi_par)
  select fini, jour - 4, jour - 1, 'termine', clock_timestamp(), tests.compte('EJP Tech, compte 1') from ctx
$$, 'EJP Tech corrige le dernier jour d''un camp fini');
select is(pg_temp.vue((select fini from ctx)) ->> 'fin', '-1', 'le dernier jour corrigé par EJP Tech se lit au calendrier');

-- Mentions et retrait : jusqu'au dernier jour compris (un camp commencé hier, fini dans deux jours).
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select j_m, 'Plages, camp à retirer', now() - interval '5 days', j from ctx returning id)
update ctx set encours2 = (select n.id from nouveau n);
insert into public.evenement_etat (evenement_id, date, date_fin, statut, saisi_le, saisi_par)
select encours2, jour - 2, jour + 2, 'valide', now() - interval '5 days', j from ctx;
select tests.se_connecter((select j from ctx), 'aal2');
select lives_ok($$ select public.modifier_mentions_evenement((select encours2 from ctx), array[(select n_m from ctx)]) $$,
  'les mentions changent jusqu''au dernier jour compris, même après le premier jour');
select lives_ok($$ select public.retirer_evenement((select encours2 from ctx)) $$,
  'le porteur retire un événement commencé, jusqu''au dernier jour compris');
select tests.deconnecter();

-- Compatibilité : l'ancienne signature à six arguments et la nouvelle, même numéro, même événement.
select tests.se_connecter((select j from ctx), 'aal2');
update ctx set ancien = public.ajouter_evenement('Plages, ancien site', jour + 3, 'valide', '{}'::uuid[], 1140::smallint, k2);
select is(public.ajouter_evenement('Plages, ancien site', (select jour + 3 from ctx), null::date, 'valide', '{}'::uuid[],
                                   1140::smallint, null::smallint, (select k2 from ctx)),
  (select ancien from ctx), 'ancienne signature puis nouvelle, même numéro, sans fin : le même événement');
select tests.deconnecter();
select is((select x.date_fin from public.evenement_etat x where x.evenement_id = (select ancien from ctx)), null::date,
  'l''ancienne signature : un événement d''un jour, comme avant');
select is((select count(*)::integer from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.proname in ('ajouter_evenement', 'ajouter_evenements_serie')
              and p.pronargdefaults > 0), 0,
  'aucune signature d''ajout n''a de valeur par défaut (PGRST203)');
select ok((select p.prosecdef from pg_proc p
            where p.oid = 'private.ajouter_evenement(text, date, date, public.statut_evenement, uuid[], smallint, smallint, uuid)'::regprocedure)
          and not (select p.prosecdef from pg_proc p
            where p.oid = 'public.ajouter_evenement(text, date, date, public.statut_evenement, uuid[], smallint, smallint, uuid)'::regprocedure),
  'ajouter_evenement à huit arguments : security definer dans private, security invoker dans public');

select * from finish();
rollback;
