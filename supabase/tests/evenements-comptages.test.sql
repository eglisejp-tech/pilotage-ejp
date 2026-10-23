-- Comptages d'événements (lot L2, X10 ; K10a à K11) et ponctualité (T68) : migration
-- 20261023120500_evenements_comptages.sql.
--
-- 1. private.comptages_evenements_mois(ministère) sur un ministère d'essai : prévus (historique
--    « Validé » pour une date passée, dernier état pour une date à venir), réalisés, annulés,
--    reportés dans le mois de la date quittée (une avance n'est pas un report), en attente, passés
--    sans état final, dernier état gagnant ; ponctualité des réalisés : avec heures, à l'heure
--    (5 minutes comprises, avance comprise), retard cumulé (avance à 0, passage de minuit à 35).
-- 2. v_evenements_mois : colonnes, lignes du porteur, rien pour un ministère mentionné ni pour
--    l'administration.
-- 3. evenements_eglise_mois() : écart avant et après le jeu d'essai (le jeu d'exemple compte
--    aussi), mois en cours à part, mois vides, ordre décroissant, « depuis » au jour de Paris
--    (un état écrit le 31 décembre à 23 h 30 UTC part du 1er janvier), cultes du dimanche
--    (dernière saisie du dimanche, heure prévue en vigueur, à l'heure, cumul), cultes à 0 sans
--    leur indicateur ; lecteurs : Coordination, berger, conseil, EJP Tech ; refus (42501) pour un
--    autre ministère, l'administration, l'aal1, l'anonyme, et Coordination quand son ministère
--    ou son compte est désactivé.
-- 4. Structure : sources à l'heure de Paris, colonnes de la fonction (aucun titre, aucune date
--    d'événement, aucun ministère).
begin;

select plan(32);

create temp table ctx as
select tests.creer_ministere('Comptages A') as a_m,
       tests.creer_ministere('Comptages B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Ministère Coordination') as coo,
       (select m.id from public.ministere m where m.code = 'coordination') as coo_m,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '3 months')::date as m3,
       private.mois_courant() as mc,
       date_trunc('month', (private.aujourdhui() + 40)::timestamp)::date as mf;
alter table ctx add column a uuid, add column b uuid;
update ctx set a = tests.creer_compte('comptages-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('comptages-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated;

-- Totaux de l'église lus par un compte, en lignes (jsonb rendu par tests.lire).
create function pg_temp.eglise(p_compte uuid)
returns table (mois date, prevus int, realises int, annules int, reportes int, en_attente int,
               passes_sans_etat_final int, avec_heures int, a_l_heure int, retard_cumule int, cultes int,
               cultes_avec_heures int, cultes_a_l_heure int, cultes_retard_cumule int, depuis date)
language sql as $$
  select x.* from jsonb_to_recordset(tests.lire(p_compte, 'aal2', 'select * from public.evenements_eglise_mois()'))
    as x(mois date, prevus int, realises int, annules int, reportes int, en_attente int,
         passes_sans_etat_final int, avec_heures int, a_l_heure int, retard_cumule int, cultes int,
         cultes_avec_heures int, cultes_a_l_heure int, cultes_retard_cumule int, depuis date)
$$;

create temp table avant as select * from pg_temp.eglise((select berger from ctx));

-- Jeu d'essai, écrit comme le jeu d'exemple (sans compte connecté) : un événement de A, puis ses
-- états dans l'ordre donné.
create function pg_temp.evenement(p_titre text) returns uuid
language sql as $$
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select a_m, p_titre, now() - interval '100 days', a from ctx
  returning id
$$;
create function pg_temp.etat(p_titre text, p_rang integer, p_date date, p_statut text,
                             p_prevue integer default null, p_debut integer default null) returns void
language sql as $$
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, heure_debut, saisi_le, saisi_par)
  select e.id, p_date, p_statut::public.statut_evenement, p_prevue, p_debut,
         now() - interval '90 days' + p_rang * interval '1 minute', c.a
    from public.evenement e cross join ctx c
   where e.titre = p_titre and e.ministere_id = c.a_m
$$;

create temp table essais as
select pg_temp.evenement(t) as id from unnest(array['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10',
                                                    'E11', 'E12', 'E13', 'E14']) as t;
-- Mois écoulé (m1)
select pg_temp.etat('E1', 1, m1 + 2, 'valide', 1140), pg_temp.etat('E1', 2, m1 + 2, 'termine', 1140, 1152) from ctx;
select pg_temp.etat('E2', 1, m1 + 3, 'valide', 870), pg_temp.etat('E2', 2, m1 + 3, 'termine', 870, 873) from ctx;
select pg_temp.etat('E3', 1, m1 + 4, 'valide', 1200), pg_temp.etat('E3', 2, m1 + 4, 'termine', 1200, 1195) from ctx;
select pg_temp.etat('E4', 1, m1 + 5, 'attente_validation', 1170), pg_temp.etat('E4', 2, m1 + 5, 'termine', 1170) from ctx;
select pg_temp.etat('E5', 1, m1 + 6, 'valide'), pg_temp.etat('E5', 2, m1 + 6, 'annule') from ctx;
select pg_temp.etat('E6', 1, m1 + 7, 'preparation') from ctx;
select pg_temp.etat('E7', 1, m1 + 8, 'attente_validation') from ctx;
select pg_temp.etat('E8', 1, m1 + 9, 'brouillon') from ctx;
select pg_temp.etat('E9', 1, m1 + 10, 'valide'), pg_temp.etat('E9', 2, private.aujourdhui() + 40, 'valide') from ctx;
select pg_temp.etat('E10', 1, m1 + 11, 'valide', 1410), pg_temp.etat('E10', 2, m1 + 11, 'termine', 1410, 5) from ctx;
select pg_temp.etat('E11', 1, m1 + 12, 'valide', 1140), pg_temp.etat('E11', 2, m1 + 12, 'termine', 1140, 1200),
       pg_temp.etat('E11', 3, m1 + 12, 'annule', 1140) from ctx;
select pg_temp.etat('E12', 1, m1 + 20, 'valide'), pg_temp.etat('E12', 2, m1 + 13, 'valide') from ctx;
-- Mois en cours : un événement d'aujourd'hui, commencé avec 10 minutes de retard.
select pg_temp.etat('E13', 1, private.aujourdhui(), 'valide', 600),
       pg_temp.etat('E13', 2, private.aujourdhui(), 'termine', 600, 610) from ctx;
-- E9 mentionne B.
insert into public.evenement_mention (evenement_id, ministere_id)
select e.id, c.b_m from public.evenement e cross join ctx c where e.titre = 'E9' and e.ministere_id = c.a_m;
-- Départ à minuit à Paris : un brouillon dont le premier état est écrit le 31 décembre 2025 à
-- 23 h 30 UTC, soit le 1er janvier 2026 à 0 h 30 à Paris.
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select e.id, c.m1 + 14, 'brouillon', timestamptz '2025-12-31 23:30:00+00', c.a
  from public.evenement e cross join ctx c where e.titre = 'E14' and e.ministere_id = c.a_m;

-- Cultes du dimanche dans le mois m3 (aucune heure du jeu d'exemple n'y est en vigueur) :
-- heure prévue 10 h 30 trois jours avant le premier dimanche, puis 10 h 20 le lundi après le
-- deuxième ; débuts 10 h 42 (12), 10 h 35 (5, à l'heure), 10 h 15 (avance, 0), puis 11 h 40
-- corrigé en 10 h 40 (20). Saisies au nom du compte de Coordination.
create temp table dimanches as
select n, (c.m3 + ((7 - extract(isodow from c.m3)::int) % 7) + 7 * (n - 1))::date as jour
  from ctx c cross join generate_series(1, 4) as n;
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select i.id, c.coo_m, v.jour, v.valeur, now() - interval '50 days' + v.rang * interval '1 minute', c.coo
  from ctx c
  cross join lateral (values
    ('coordination_heure_prevue_du_culte', (select jour from dimanches where n = 1) - 3, 630, 1),
    ('coordination_heure_prevue_du_culte', (select jour from dimanches where n = 2) + 1, 620, 2),
    ('coordination_heure_de_debut_du_culte', (select jour from dimanches where n = 1), 642, 3),
    ('coordination_heure_de_debut_du_culte', (select jour from dimanches where n = 2), 635, 4),
    ('coordination_heure_de_debut_du_culte', (select jour from dimanches where n = 3), 615, 5),
    ('coordination_heure_de_debut_du_culte', (select jour from dimanches where n = 4), 700, 6),
    ('coordination_heure_de_debut_du_culte', (select jour from dimanches where n = 4), 640, 7)
  ) as v(code, jour, valeur, rang)
  join public.indicateur i on i.ministere_id = c.coo_m and i.modele_code = v.code and i.etat = 'actif';

-- 1. Comptages d'un ministère

select results_eq($$
  select mois, prevus, realises, annules, reportes, en_attente, passes_sans_etat_final, avec_heures, a_l_heure,
         retard_cumule
    from private.comptages_evenements_mois((select a_m from ctx))
$$, $$
  select m1, 8, 5, 2, 1, 1, 2, 4, 2, 50 from ctx
  union all select mc, 0, 1, 0, 0, 0, 0, 1, 0, 10 from ctx
  union all select mf, 1, 0, 0, 0, 0, 0, 0, 0, 0 from ctx
$$, 'comptages de A : mois écoulé (prévus, réalisés, annulés, reportés, en attente, passés, ponctualité), mois en cours, mois à venir');
select is_empty($$ select 1 from private.comptages_evenements_mois((select b_m from ctx)) $$,
  'un ministère sans événement n''a aucune ligne (un événement mentionné reste à son porteur)');
select ok((select bool_and(c.mois = date_trunc('month', c.mois::timestamp)::date)
             from private.comptages_evenements_mois(null) as c),
  'chaque ligne est un mois (1er du mois)');

-- 2. Vue par ministère

select results_eq($$
  select column_name::text collate "default", data_type::text collate "default" from information_schema.columns
   where table_schema = 'public' and table_name = 'v_evenements_mois' order by ordinal_position
$$, $$ values ('ministere_id', 'uuid'), ('mois', 'date'), ('prevus', 'integer'), ('realises', 'integer'),
              ('annules', 'integer'), ('reportes', 'integer'), ('en_attente', 'integer'),
              ('passes_sans_etat_final', 'integer') $$,
  'v_evenements_mois : ministère, mois et les six comptages, sans la ponctualité');
select ok(coalesce((select c.reloptions @> array['security_invoker=true'] from pg_class c
                     where c.oid = 'public.v_evenements_mois'::regclass), false),
  'v_evenements_mois est security_invoker');
select is(tests.lire((select a from ctx), 'aal2', $$
  select mois, prevus, realises, annules, reportes, en_attente, passes_sans_etat_final
    from public.v_evenements_mois where ministere_id = (select a_m from ctx) $$),
  tests.lire((select berger from ctx), 'aal2', $$
  select mois, prevus, realises, annules, reportes, en_attente, passes_sans_etat_final
    from public.v_evenements_mois where ministere_id = (select a_m from ctx) $$),
  'le porteur et le berger lisent les mêmes comptages de A');
select is(tests.compter((select a from ctx), 'aal2',
    $$ select 1 from public.v_evenements_mois where ministere_id = (select a_m from ctx) $$), 3,
  'le porteur lit ses trois mois');
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.v_evenements_mois'), 0,
  'un ministère mentionné ne lit aucun comptage de l''autre ministère');
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.v_evenements_mois'), 0,
  'l''administration ne lit aucun comptage');
select is(tests.compter((select tech from ctx), 'aal2',
    $$ select 1 from public.v_evenements_mois where ministere_id = (select a_m from ctx) $$), 3,
  'EJP Tech lit les comptages de A');

-- 3. Totaux de l'église

create temp table apres as select * from pg_temp.eglise((select berger from ctx));

select results_eq($$
  select p.prevus - coalesce(v.prevus, 0), p.realises - coalesce(v.realises, 0), p.annules - coalesce(v.annules, 0),
         p.reportes - coalesce(v.reportes, 0), p.en_attente - coalesce(v.en_attente, 0),
         p.passes_sans_etat_final - coalesce(v.passes_sans_etat_final, 0), p.avec_heures - coalesce(v.avec_heures, 0),
         p.a_l_heure - coalesce(v.a_l_heure, 0), p.retard_cumule - coalesce(v.retard_cumule, 0),
         p.cultes - coalesce(v.cultes, 0)
    from apres p left join avant v on v.mois = p.mois
   where p.mois = (select m1 from ctx)
$$, $$ values (8, 5, 2, 1, 1, 2, 4, 2, 50, 0) $$,
  'église, mois écoulé : le jeu d''essai ajoute 8 prévus, 5 réalisés dont 4 avec heures et 2 à l''heure, 50 minutes');
select results_eq($$
  select p.realises - coalesce(v.realises, 0), p.avec_heures - coalesce(v.avec_heures, 0),
         p.a_l_heure - coalesce(v.a_l_heure, 0), p.retard_cumule - coalesce(v.retard_cumule, 0)
    from apres p left join avant v on v.mois = p.mois
   where p.mois = (select mc from ctx)
$$, $$ values (1, 1, 0, 10) $$, 'église, mois en cours : une ligne à part, 1 réalisé avec 10 minutes de retard');
select results_eq($$
  select p.cultes - coalesce(v.cultes, 0), p.cultes_avec_heures - coalesce(v.cultes_avec_heures, 0),
         p.cultes_a_l_heure - coalesce(v.cultes_a_l_heure, 0), p.cultes_retard_cumule - coalesce(v.cultes_retard_cumule, 0),
         p.prevus - coalesce(v.prevus, 0)
    from apres p left join avant v on v.mois = p.mois
   where p.mois = (select m3 from ctx)
$$, $$ values (4, 4, 2, 37, 0) $$,
  'cultes : 4 dimanches, dernière saisie du dimanche, heure prévue en vigueur, 2 à l''heure, 12 + 5 + 0 + 20 minutes');
select is((select count(*)::int from apres where mois = (select mf from ctx)), 0,
  'aucune ligne après le mois en cours');
select results_eq($$ select distinct depuis from apres $$, $$ values (date '2026-01-01') $$,
  'depuis : jour de Paris du plus ancien état (31 décembre 23 h 30 UTC donne le 1er janvier)');
select results_eq($$
  select x.mois from jsonb_to_recordset(tests.lire((select berger from ctx), 'aal2',
           'select row_number() over () as rang, mois from public.evenements_eglise_mois()'))
           as x(rang int, mois date)
   order by x.rang
$$, $$
  select g::date from generate_series((select mc from ctx)::timestamp, timestamp '2026-01-01', interval '-1 month') as g
$$, 'une ligne par mois, du mois en cours au mois de « depuis », mois vides compris, le plus récent d''abord');
select ok((select bool_and(a.prevus >= 0 and a.cultes >= 0 and a.avec_heures <= a.realises and a.a_l_heure <= a.avec_heures
                           and a.cultes_avec_heures <= a.cultes and a.cultes_a_l_heure <= a.cultes_avec_heures)
             from apres a),
  'complétude cohérente : à l''heure parmi les « avec heures », eux-mêmes parmi les réalisés et les cultes');

-- Lecteurs
select is(tests.lire((select coo from ctx), 'aal2', 'select * from public.evenements_eglise_mois()'),
          tests.lire((select berger from ctx), 'aal2', 'select * from public.evenements_eglise_mois()'),
  'Coordination lit les mêmes totaux que le berger (K11)');
select is(tests.lire((select conseil from ctx), 'aal2', 'select * from public.evenements_eglise_mois()'),
          tests.lire((select berger from ctx), 'aal2', 'select * from public.evenements_eglise_mois()'),
  'le conseil lit les mêmes totaux que le berger');
select is(tests.lire((select tech from ctx), 'aal2', 'select * from public.evenements_eglise_mois()'),
          tests.lire((select berger from ctx), 'aal2', 'select * from public.evenements_eglise_mois()'),
  'EJP Tech lit les mêmes totaux que le berger');
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select * from public.evenements_eglise_mois() $$, '42501',
  'Seuls Coordination, le berger, le conseil et EJP Tech lisent les comptages de l''église.',
  'un autre ministère est refusé, avec son message');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select * from public.evenements_eglise_mois() $$, '42501',
  'Seuls Coordination, le berger, le conseil et EJP Tech lisent les comptages de l''église.',
  'l''administration est refusée');
select tests.deconnecter();
select tests.se_connecter((select coo from ctx), 'aal1');
select throws_ok($$ select * from public.evenements_eglise_mois() $$, '42501', 'Double authentification requise.',
  'aal1 : Coordination est refusée');
select tests.deconnecter();
select tests.anonyme();
select throws_ok($$ select * from public.evenements_eglise_mois() $$, '42501', null, 'anonyme : refusé');
select tests.deconnecter();

-- Coordination désactivée : le ministère, puis le compte (private.mon_type() rend null, donc
-- exige_aal2() refuse). Chacun est réactivé après son essai, pour la suite du fichier.
update public.ministere set desactive_le = now() where id = (select coo_m from ctx);
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select * from public.evenements_eglise_mois() $$, '42501', 'Compte inactif ou inconnu.',
  'ministère Coordination désactivé : son compte est refusé');
select tests.deconnecter();
update public.ministere set desactive_le = null where id = (select coo_m from ctx);
update public.compte set desactive_le = now() where user_id = (select coo from ctx);
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select * from public.evenements_eglise_mois() $$, '42501', 'Compte inactif ou inconnu.',
  'compte de Coordination désactivé : refusé');
select tests.deconnecter();
update public.compte set desactive_le = null where user_id = (select coo from ctx);

-- Cultes sans leur indicateur : EJP Tech retire « Heure de début du culte », les colonnes des
-- cultes valent 0.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$
  select public.retirer_indicateur(i.id, 'plus_suivi') from public.indicateur i
   where i.ministere_id = (select coo_m from ctx) and i.modele_code = 'coordination_heure_de_debut_du_culte'
     and i.etat = 'actif'
$$, 'EJP Tech retire l''heure de début du culte');
select tests.deconnecter();
select results_eq($$
  select sum(cultes)::int, sum(cultes_avec_heures)::int, sum(cultes_a_l_heure)::int, sum(cultes_retard_cumule)::int
    from pg_temp.eglise((select berger from ctx))
$$, $$ values (0, 0, 0, 0) $$, 'sans indicateur actif « Heure de début du culte » : colonnes des cultes à 0');

-- 4. Structure
select is(pg_get_function_result('public.evenements_eglise_mois()'::regprocedure),
  'TABLE(mois date, prevus integer, realises integer, annules integer, reportes integer, en_attente integer, '
  || 'passes_sans_etat_final integer, avec_heures integer, a_l_heure integer, retard_cumule integer, cultes integer, '
  || 'cultes_avec_heures integer, cultes_a_l_heure integer, cultes_retard_cumule integer, depuis date)',
  'evenements_eglise_mois : des totaux par mois, sans titre, sans date d''événement, sans ministère');
select ok((select p.prosecdef from pg_proc p where p.oid = 'private.evenements_eglise_mois()'::regprocedure)
          and not (select p.prosecdef from pg_proc p where p.oid = 'public.evenements_eglise_mois()'::regprocedure)
          and not (select p.prosecdef from pg_proc p where p.oid = 'private.comptages_evenements_mois(uuid)'::regprocedure),
  'private.evenements_eglise_mois security definer ; public et comptages_evenements_mois security invoker');
select ok((select p.prosrc from pg_proc p where p.oid = 'private.comptages_evenements_mois(uuid)'::regprocedure)
            like '%private.aujourdhui()%'
          and (select p.prosrc from pg_proc p where p.oid = 'private.evenements_eglise_mois()'::regprocedure)
                like '%Europe/Paris%'
          and (select p.prosrc from pg_proc p where p.oid = 'private.evenements_eglise_mois()'::regprocedure)
                like '%private.dimanche_reference()%'
          and not exists (select 1 from pg_proc p
                           where p.oid in ('private.comptages_evenements_mois(uuid)'::regprocedure,
                                           'private.evenements_eglise_mois()'::regprocedure)
                             and p.prosrc ~* '(current_date|now\(\)|localtimestamp|current_timestamp)'),
  'minuit à Paris : dates et mois par private.aujourdhui(), le dimanche de référence et Europe/Paris, jamais current_date ni now()');
select ok(not has_function_privilege('anon', 'public.evenements_eglise_mois()', 'EXECUTE')
          and not has_function_privilege('service_role', 'public.evenements_eglise_mois()', 'EXECUTE')
          and not has_table_privilege('anon', 'public.v_evenements_mois', 'SELECT'),
  'rien pour anon ni service_role');

select * from finish();
rollback;
