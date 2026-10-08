-- Matrice des droits de l'écran 14, « Sessions » (lot L2 ; plan des étapes 5 à 8, section 3.2 ;
-- BRIEF, section 7, « Matrice des droits », et section 8), écrite en données et parcourue par
-- tests.verifier_matrice (000-outils.test.sql).
--
-- Objets de l'écran : session, session_attendu et v_session_completude (lectures de
-- src/data/sessionsAdmin.ts), puis declarer_session, modifier_session et supprimer_session
-- (écritures). Aucune écriture directe sur les deux tables : les GRANT n'accordent que select.
-- Profils (cinq comptes) : un ministère attendu, le berger, le conseil, l'administration de
-- l'église et EJP Tech du jeu d'exemple. Tous lisent les sessions (le berger, le conseil et EJP Tech
-- par private.lit_tout) ; seule l'administration déclare, modifie et supprime ; en aal1, tout est
-- refusé ou vide (politique restrictive aal2 et private.exige_aal2). La dérivation ajoute la ligne
-- aal1 de chaque ligne acceptée en aal2 et la ligne de l'anonyme. Les écritures directes, refusées
-- par les GRANT, sont écrites aussi en aal1 (42501 : le refus des GRANT passe avant la RLS).
-- Tests précis : une session déclarée apparaît pour son ministère attendu (liste des sessions
-- passées de « Choisir la session », attendus du ministère), la complétude et les ministères qui
-- manquent suivent les saisies, et une session saisie ne se supprime plus.
begin;

-- Contexte : deux ministères actifs d'essai (A attendu, B attendu), le compte du ministère A, et
-- deux sessions déclarées par l'administration en aal2 : s1 dans l'avenir (Bâtir l'Église) et
-- s2 du jour (un autre rassemblement, saisissable par A et B).
create temp table ctx as
select tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Matrice L2 A') as a_m,
       tests.creer_ministere('Matrice L2 B') as b_m;
alter table ctx add column a uuid, add column s1 uuid, add column s2 uuid;
update ctx set a = tests.creer_compte('matrice-l2-a@exemple.test', 'ministere', a_m);
grant select on ctx to authenticated, anon;

do $$
declare
  v_ctx ctx%rowtype;
  v_s1 uuid;
  v_s2 uuid;
begin
  select * into v_ctx from ctx;
  perform tests.se_connecter(v_ctx.admin, 'aal2');
  v_s1 := public.declarer_session('batir', '2030-03-02', null, array[v_ctx.a_m, v_ctx.b_m]);
  -- Le jour de Paris : la session a eu lieu (la date du jour compte), et les deux ministères, créés
  -- il y a un an, sont actifs à cette date.
  v_s2 := public.declarer_session('autre', private.aujourdhui(), 'Matrice L2 passée', array[v_ctx.a_m, v_ctx.b_m]);
  perform tests.deconnecter();
  update ctx set s1 = v_s1, s2 = v_s2;
end $$;

-- Matrice en aal2. Attendus dans l'ordre des profils : ministère A, berger, conseil,
-- administration, EJP Tech.
create temp view matrice_l2_aal2 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère a'), (2, 'berger'), (3, 'conseil'), (4, 'administration'),
                 (5, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('session', 'lire', array['2', '2', '2', '2', '2'],
      'select 1 from public.session where id in (select s1 from ctx union all select s2 from ctx)'),
     ('session_attendu', 'lire', array['4', '4', '4', '4', '4'],
      'select 1 from public.session_attendu where session_id in (select s1 from ctx union all select s2 from ctx)'),
     ('v_session_completude', 'lire', array['2', '2', '2', '2', '2'],
      'select 1 from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
     ('session', 'ajouter', array['42501', '42501', '42501', '42501', '42501'],
      'insert into public.session (type, date) values (''batir'', ''2030-03-09'')'),
     ('session', 'modifier', array['42501', '42501', '42501', '42501', '42501'],
      'update public.session set date = ''2030-03-16'' where id = (select s1 from ctx)'),
     ('session', 'supprimer', array['42501', '42501', '42501', '42501', '42501'],
      'delete from public.session where id = (select s1 from ctx)'),
     ('session_attendu', 'ajouter', array['42501', '42501', '42501', '42501', '42501'],
      'insert into public.session_attendu (session_id, ministere_id) select s1, a_m from ctx'),
     ('session_attendu', 'modifier', array['42501', '42501', '42501', '42501', '42501'],
      'update public.session_attendu set ministere_id = (select b_m from ctx) where session_id = (select s1 from ctx)'),
     ('session_attendu', 'supprimer', array['42501', '42501', '42501', '42501', '42501'],
      'delete from public.session_attendu where session_id = (select s1 from ctx)'),
     ('declarer_session', 'appeler', array['42501', '42501', '42501', 'ok', '42501'],
      'select public.declarer_session(''anti_dispersion'', ''2030-03-09'', null, array[(select a_m from ctx)])'),
     ('modifier_session', 'appeler', array['42501', '42501', '42501', 'ok', '42501'],
      'select public.modifier_session((select s1 from ctx), array[(select a_m from ctx)])'),
     ('supprimer_session', 'appeler', array['42501', '42501', '42501', 'ok', '42501'],
      'select public.supprimer_session((select s1 from ctx))')
   ) as m(objet, action, attendu, requete);
create temp view matrice_l2 (profil, objet, action, aal, attendu, requete) as
  select * from matrice_l2_aal2
  -- Écritures directes en aal1 : refusées par les GRANT, pour chaque profil.
  union all
  select m.profil, m.objet, m.action, 'aal1', '42501', m.requete
    from matrice_l2_aal2 m
   where m.action in ('ajouter', 'modifier', 'supprimer');
create temp view profil_l2 (profil, compte) as
  select 'ministère a', c.a from ctx c union all select 'berger', c.berger from ctx c
  union all select 'conseil', c.conseil from ctx c union all select 'administration', c.admin from ctx c
  union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_l2_aal2, matrice_l2, profil_l2 to authenticated, anon;

-- Le plan compte les 9 tests fixes et, par tests.nombre_essais, les essais de la matrice (lignes
-- dérivées comprises).
select plan(9
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_l2',
                        'select profil, compte from profil_l2', true));

select ok((select count(*) from ctx where berger is not null and conseil is not null and admin is not null
             and tech is not null and a_m is not null and b_m is not null and a is not null
             and s1 is not null and s2 is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les quatre comptes, les deux ministères, le compte A et les deux sessions');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_l2',
  'select profil, compte from profil_l2',
  true);

-- Une session déclarée : ses ministères attendus, avant toute saisie (s1 est dans l'avenir).
select is(tests.lire((select admin from ctx), 'aal2',
            'select type, intitule, nb_attendus, nb_saisis, a_eu_lieu from public.v_session_completude where session_id = (select s1 from ctx)'),
          '[{"type": "batir", "intitule": null, "nb_attendus": 2, "nb_saisis": 0, "a_eu_lieu": false}]'::jsonb,
          'une session à venir : deux attendus, aucune saisie, pas encore eu lieu');
select is(tests.lire((select admin from ctx), 'aal2',
            'select manquants from public.v_session_completude where session_id = (select s2 from ctx)'),
          '[{"manquants": ["Matrice L2 A", "Matrice L2 B"]}]'::jsonb,
          'une session passée sans saisie : les deux ministères attendus manquent');

-- Le ministère attendu voit la session dans « Choisir la session » (sessions passées ou du jour)
-- et parmi les sessions où il est attendu (« Vos saisies »), mais pas la session à venir.
select is(tests.lire((select a from ctx), 'aal2',
            'select session_id from public.v_session_completude where a_eu_lieu and session_id in (select s1 from ctx union all select s2 from ctx)'),
          (select jsonb_build_array(jsonb_build_object('session_id', s2)) from ctx),
          'le ministère attendu voit la session passée dans « Choisir la session », pas la session à venir');
select is(tests.lire((select a from ctx), 'aal2',
            'select session_id from public.session_attendu where ministere_id = (select a_m from ctx) and session_id in (select s1 from ctx union all select s2 from ctx)'),
          (select jsonb_build_array(jsonb_build_object('session_id', s1), jsonb_build_object('session_id', s2))
             from ctx),
          'le ministère attendu lit ses deux sessions attendues');

-- Une saisie du ministère A : la complétude passe à 1 sur 2 et seul B manque.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select s2, a_m, 5, 0 from ctx
$$, 'le ministère attendu saisit ses présents à la session passée');
select tests.deconnecter();
select is(tests.lire((select admin from ctx), 'aal2',
            'select nb_attendus, nb_saisis, manquants from public.v_session_completude where session_id = (select s2 from ctx)'),
          '[{"nb_attendus": 2, "nb_saisis": 1, "manquants": ["Matrice L2 B"]}]'::jsonb,
          'après la saisie de A : 1 sur 2, et seul B manque');

-- Une session saisie ne se supprime plus ; une session sans saisie, si.
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.supprimer_session((select s2 from ctx)) $$,
  'P0001', 'Des ministères ont déjà saisi : la session ne peut plus être supprimée.',
  'une session déjà saisie ne se supprime pas');
select lives_ok($$ select public.supprimer_session((select s1 from ctx)) $$,
  'une session sans saisie se supprime');
select tests.deconnecter();

select * from finish();
rollback;
