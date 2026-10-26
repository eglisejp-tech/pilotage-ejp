-- « Supprimer » partout, avec la raison d'un refus (décision T75, migration
-- 20261026084227_supprimer_partout.sql). Les six critères d'acceptation de la conception
-- validée le 26 octobre 2026 :
--   1. EJP TECH tel qu'en production : créé avec une adresse mal tapée, 8 indicateurs prévus,
--      attendu par une session saisie par d'autres ministères, désactivé, adresse corrigée,
--      réactivé, invitation relancée, aucune saisie : il se supprime (T74 le refusait) ;
--   2. EJP FORMATION : créé, ses prévus, aucune session : il se supprime ;
--   3. un ministère avec des chiffres (Communication, jeu d'exemple) : refusé, raisons chiffrées ;
--   4. Coordination et FIJ : une seule raison, ils ne se suppriment jamais ;
--   5. un ministère désactivé avec historique : refusé, ses chiffres comptés ;
--   6. un ministère vide attendu par deux sessions (l'une saisie par d'autres, l'autre sans
--      saisie) : il se supprime, les sessions restent sans lui, le journal garde leur nombre.
-- Puis chaque geste d'administration d'EJP Tech, un par un, qui ne bloque pas, et la lecture de
-- l'écran (EJP Tech seul, en aal2). Chaque raison, une par type de donnée, est dans
-- comptes-corrections.test.sql (T74, revu par T75).
-- Les gestes passent par les vraies fonctions : les fonctions serveur des Edge Functions, au
-- nom de service_role, et celles de l'API au nom d'EJP Tech. Auth est simulé comme dans T74
-- (pgTAP ne peut pas appeler l'API Auth : adresse et confirmation écrites dans auth.users).
-- Les assertions qui existaient avant T75 (private.refus_suppression_ministere et les fonctions
-- serveur) passent avant celles de la nouvelle lecture : sur le code de T74, les critères 1 et 6
-- échouent d'abord, puis le fichier s'arrête à la première lecture des raisons.
begin;

select plan(70);

-- pgTAP au nom de service_role et d'authenticated (droits annulés avec la transaction).
do $$
declare
  v_fonction regprocedure;
begin
  for v_fonction in
    select p.oid::regprocedure
      from pg_catalog.pg_depend d
      join pg_catalog.pg_extension e on e.oid = d.refobjid and e.extname = 'pgtap'
      join pg_catalog.pg_proc p on p.oid = d.objid
     where d.classid = 'pg_catalog.pg_proc'::regclass and d.deptype = 'e'
       and pg_catalog.pg_has_role(p.proowner, 'USAGE')
  loop
    execute pg_catalog.format('grant execute on function %s to service_role, authenticated', v_fonction);
  end loop;
end $$;

-- EJP Tech (appelant, session aal2) ; les utilisateurs Auth que l'invitation crée (adresse non
-- confirmée), dont l'adresse mal tapée d'EJP TECH ; une session du jeu d'exemple déjà saisie
-- par d'autres ministères.
create temp table ctx as
select tests.creer_compte('essai-t75-tech@exemple.test', 'admin_plateforme') as tech,
       gen_random_uuid() as sa,
       gen_random_uuid() as u_tech,
       gen_random_uuid() as u_formation,
       gen_random_uuid() as u_gestes,
       (select p.session_id from public.participation p order by p.session_id limit 1) as s_saisie,
       tests.ministere('Communication') as com,
       tests.ministere('Coordination') as coordination,
       tests.ministere('FIJ') as fij,
       tests.creer_ministere('Essai T75 désactivé avec historique') as m_hist,
       tests.creer_ministere('Essai T75 deux sessions') as m_deux;
insert into auth.sessions (id, user_id, aal) select sa, tech, 'aal2'::auth.aal_level from ctx;
insert into auth.users (id, email)
select u_tech, 'ejptech1+minstre@exemple.test' from ctx
union all select u_formation, 'essai-t75-formation@exemple.test' from ctx
union all select u_gestes, 'essai-t75-gestes@exemple.test' from ctx;
alter table ctx add column m_tech uuid, add column m_formation uuid, add column m_gestes uuid,
  add column u_hist uuid, add column s_vide uuid, add column s_gestes uuid,
  add column presences_saisie integer, add column attendus_saisie integer, add column refus_com text;
update ctx set u_hist = tests.creer_compte('essai-t75-historique@exemple.test', 'ministere', m_hist);
grant select on ctx to service_role, authenticated, anon;

-- 1. EJP TECH tel qu'en production (critère 1), geste par geste
set local role service_role;
select lives_ok($$ select public.serveur_creer_compte((select tech from ctx), (select sa from ctx),
                   (select u_tech from ctx), 'ministere', null, 'Essai T75 EJP TECH', null) $$,
  'EJP TECH : créé par EJP Tech avec une adresse mal tapée');
reset role;
update ctx set m_tech = (select c.ministere_id from public.compte c where c.user_id = ctx.u_tech);
select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.creer_indicateurs_prevus((select m_tech from ctx), 'tech'), 8,
  'EJP TECH : ses 8 indicateurs prévus (liste tech)');
-- Actif, il est coché dans une session que d'autres ministères ont déjà saisie ; le ministère
-- vide du critère 6 aussi.
select lives_ok($$ select public.modifier_session((select s_saisie from ctx),
                   (select array_agg(a.ministere_id) from public.session_attendu a
                      join public.ministere m on m.id = a.ministere_id
                     where a.session_id = (select s_saisie from ctx) and m.desactive_le is null)
                   || array[(select m_tech from ctx), (select m_deux from ctx)]) $$,
  'EJP TECH et le ministère du critère 6 : attendus par une session déjà saisie par d''autres');
select lives_ok($$ select public.declarer_session('autre', date '2026-12-13', 'Essai T75 sans saisie',
                   array[(select m_deux from ctx)]) $$,
  'le ministère du critère 6 : attendu aussi par une session sans aucune saisie');
select tests.deconnecter();
update ctx set s_vide = (select s.id from public.session s where s.intitule = 'Essai T75 sans saisie');
set local role service_role;
select lives_ok($$ select public.serveur_desactiver_compte((select tech from ctx), (select sa from ctx),
                   (select u_tech from ctx)) $$, 'EJP TECH : désactivé, son compte et le ministère');
-- « Réactiver » en corrigeant l'adresse (T74) : la correction d'abord, compte désactivé.
select lives_ok($$ select public.serveur_preparer_correction_adresse((select tech from ctx), (select sa from ctx),
                   (select u_tech from ctx), 'ejptech1+ministere@exemple.test') $$,
  'EJP TECH : correction de l''adresse préparée');
reset role;
update auth.users set email = 'ejptech1+ministere@exemple.test' where id = (select u_tech from ctx);
set local role service_role;
select lives_ok($$ select public.serveur_corriger_adresse((select tech from ctx), (select sa from ctx),
                   (select u_tech from ctx), 'ejptech1+ministere@exemple.test') $$,
  'EJP TECH : adresse corrigée');
select lives_ok($$ select public.serveur_reactiver_compte((select tech from ctx), (select sa from ctx),
                   (select u_tech from ctx)) $$, 'EJP TECH : réactivé');
select lives_ok($$ select public.serveur_relancer_invitation((select tech from ctx), (select sa from ctx),
                   (select u_tech from ctx)) $$, 'EJP TECH : invitation relancée');
reset role;

-- 2. EJP FORMATION (critère 2) : créé, ses prévus, aucune session
set local role service_role;
select lives_ok($$ select public.serveur_creer_compte((select tech from ctx), (select sa from ctx),
                   (select u_formation from ctx), 'ministere', null, 'Essai T75 EJP FORMATION', null) $$,
  'EJP FORMATION : créé par EJP Tech');
reset role;
update ctx set m_formation = (select c.ministere_id from public.compte c where c.user_id = ctx.u_formation);
select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.creer_indicateurs_prevus((select m_formation from ctx), 'mds'), 8,
  'EJP FORMATION : ses 8 indicateurs prévus (liste mds)');
select tests.deconnecter();

-- 5. Désactivé avec historique (critère 5) : un chiffre saisi, puis désactivé. Le chiffre
-- s'ajoute sans les triggers de mesure (comme dans T74) : seule compte la ligne qui le vise.
alter table public.mesure disable trigger user;
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_par)
select i.id, (select m_hist from ctx), date '2026-10-18', 5, (select tech from ctx)
  from public.indicateur i where i.code = 'service';
alter table public.mesure enable trigger user;
set local role service_role;
select lives_ok($$ select public.serveur_desactiver_compte((select tech from ctx), (select sa from ctx),
                   (select u_hist from ctx)) $$, 'le ministère avec historique : désactivé');
reset role;

-- Les refus, avec la règle d'avant T75 (même fonction, même contrat)
select is(private.refus_suppression_ministere((select m_tech from ctx)), null,
  'critère 1 : EJP TECH tel qu''en production se supprime (T74 rendait ministere_non_vide)');
select is(private.refus_suppression_ministere((select m_formation from ctx)), null,
  'critère 2 : EJP FORMATION se supprime');
select ok(private.refus_suppression_ministere((select com from ctx)) in ('compte_deja_active', 'ministere_non_vide'),
  'critère 3 : Communication, qui a des chiffres, ne se supprime pas');
select is(private.refus_suppression_ministere((select coordination from ctx)), 'ministere_de_reference',
  'critère 4 : Coordination ne se supprime jamais');
select is(private.refus_suppression_ministere((select fij from ctx)), 'ministere_de_reference',
  'critère 4 : FIJ ne se supprime jamais');
select is(private.refus_suppression_ministere((select m_hist from ctx)), 'ministere_non_vide',
  'critère 5 : le ministère désactivé avec historique ne se supprime pas');
select is(private.refus_suppression_ministere((select m_deux from ctx)), null,
  'critère 6 : le ministère attendu par deux sessions, sans saisie de lui, se supprime');

-- Les raisons, dans l'ordre d'affichage (code, nombre, bloque)
select results_eq($$ select r.code, r.nombre, r.bloque from private.raisons_suppression((select m_tech from ctx)) r $$,
  $$ values ('sessions_attendues'::text, 1, false) $$,
  'critère 1 : EJP TECH n''a qu''une information, la session saisie par d''autres qu''il quittera');
select is_empty($$ select 1 from private.raisons_suppression((select m_formation from ctx)) $$,
  'critère 2 : EJP FORMATION n''a aucune raison, aucune session');
select ok(exists (select 1 from private.raisons_suppression((select com from ctx)) r
                   where r.code = 'chiffres' and r.bloque
                     and r.nombre = (select count(*) from public.mesure x where x.ministere_id = (select com from ctx))),
  'critère 3 : Communication : ses chiffres, avec leur nombre exact');
select ok((select bool_and(r.bloque = (r.code <> 'sessions_attendues')) and count(*) >= 2
             from private.raisons_suppression((select com from ctx)) r),
  'critère 3 : Communication : plusieurs raisons, toutes bloquent (sauf l''information des sessions)');
select results_eq($$ select r.code, r.nombre, r.bloque from private.raisons_suppression((select coordination from ctx)) r $$,
  $$ values ('ministere_de_reference'::text, 1, true) $$,
  'critère 4 : Coordination : une seule raison, le ministère de référence');
select results_eq($$ select r.code, r.nombre, r.bloque from private.raisons_suppression((select fij from ctx)) r $$,
  $$ values ('ministere_de_reference'::text, 1, true) $$,
  'critère 4 : FIJ : une seule raison, malgré toutes ses saisies');
select results_eq($$ select r.code, r.nombre, r.bloque from private.raisons_suppression((select m_hist from ctx)) r $$,
  $$ values ('chiffres'::text, 1, true) $$,
  'critère 5 : le ministère désactivé : « 1 chiffre saisi », son compte jamais activé ne compte pas');
select results_eq($$ select r.code, r.nombre, r.bloque from private.raisons_suppression((select m_deux from ctx)) r $$,
  $$ values ('sessions_attendues'::text, 2, false) $$,
  'critère 6 : une information, les deux sessions qu''il quittera');

-- La lecture de l'écran : EJP Tech seul, en aal2
select is(tests.lire((select tech from ctx), 'aal2',
  format('select code, nombre, bloque from public.raisons_suppression_ministere(%L)', (select m_deux from ctx))),
  '[{"code": "sessions_attendues", "bloque": false, "nombre": 2}]'::jsonb,
  'EJP Tech lit les raisons d''un ministère');
select is(tests.compter((select tech from ctx), 'aal2',
  format('select 1 from public.raisons_suppression_ministere() where ministere_id in (%L, %L, %L)',
         (select m_tech from ctx), (select coordination from ctx), (select m_formation from ctx))),
  2, 'sans identifiant, EJP Tech lit les raisons de tous les ministères (EJP TECH et Coordination, rien pour EJP FORMATION)');
select is(tests.essai((select tech from ctx), 'aal1', 'select * from public.raisons_suppression_ministere()'),
  '42501', 'EJP Tech en aal1 est refusé');
select is(tests.essai(p.compte, 'aal2', 'select * from public.raisons_suppression_ministere()'), '42501',
          p.profil || ' est refusé')
  from (values ('le ministère Communication', tests.compte('Ministère Communication')),
               ('le berger', tests.compte('Berger')), ('le conseil', tests.compte('Conseil, compte 1')),
               ('l''administration de l''église', tests.compte('Administration de l''église'))) as p(profil, compte);
select is(tests.essai(null, null, 'select * from public.raisons_suppression_ministere()'), '42501',
  'l''anonyme est refusé');
-- Revue de sécurité : un compte EJP Tech désactivé dont le jeton aal2 vaut encore (jusqu'à une
-- heure, BRIEF section 7) ; seul exige_aal2 l'arrête (mon_type() est vide).
alter table ctx add column tech_des uuid;
update ctx set tech_des = tests.creer_compte('essai-t75-tech-desactive@exemple.test', 'admin_plateforme');
update public.compte set desactive_le = now() where user_id = (select tech_des from ctx);
select is(tests.essai((select tech_des from ctx), 'aal2', 'select * from public.raisons_suppression_ministere()'),
  '42501', 'un compte EJP Tech désactivé, jeton aal2 encore valable, est refusé');
select ok(not has_function_privilege('anon', 'public.raisons_suppression_ministere(uuid)', 'execute')
          and not has_function_privilege('service_role', 'public.raisons_suppression_ministere(uuid)', 'execute')
          and not has_function_privilege('authenticated', 'private.raisons_suppression(uuid)', 'execute')
          and not has_function_privilege('authenticated', 'private.compte_active_un_jour(uuid)', 'execute'),
  'droits : la lecture à authenticated seulement, les aides à personne');

-- Les suppressions : la base revérifie avec les mêmes règles
alter table ctx add column journal_tech integer;
update ctx set presences_saisie = (select count(*) from public.participation p where p.session_id = ctx.s_saisie),
               attendus_saisie = (select count(*) from public.session_attendu a where a.session_id = ctx.s_saisie),
               refus_com = private.refus_suppression_ministere(ctx.com),
               journal_tech = (select count(*) from public.journal j where j.ministere_id = ctx.m_tech);
set local role service_role;
select is(public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select m_tech from ctx)),
          array[(select u_tech from ctx)], 'critère 1 : EJP TECH supprimé, l''identifiant de son compte rendu à l''Edge Function');
select is(public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select m_formation from ctx)),
          array[(select u_formation from ctx)], 'critère 2 : EJP FORMATION supprimé');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select com from ctx)) $$,
  'P0001', (select refus_com from ctx), 'critère 3 : Communication : suppression refusée');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select coordination from ctx)) $$,
  'P0001', 'ministere_de_reference', 'critère 4 : Coordination : suppression refusée');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select m_hist from ctx)) $$,
  'P0001', 'ministere_non_vide', 'critère 5 : le ministère désactivé avec historique : suppression refusée');
select is(public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select m_deux from ctx)),
          array[]::uuid[], 'critère 6 : le ministère attendu par deux sessions est supprimé');
reset role;

select ok(not exists (select 1 from public.ministere m where m.id in ((select m_tech from ctx), (select m_formation from ctx), (select m_deux from ctx)))
          and not exists (select 1 from public.compte c where c.user_id in ((select u_tech from ctx), (select u_formation from ctx)))
          and not exists (select 1 from public.indicateur i where i.ministere_id in ((select m_tech from ctx), (select m_formation from ctx))),
  'critères 1, 2 et 6 : les ministères, leurs comptes et leurs indicateurs n''existent plus');
select ok(exists (select 1 from public.ministere m where m.id = (select com from ctx))
          and exists (select 1 from public.ministere m where m.id = (select coordination from ctx))
          and exists (select 1 from public.ministere m where m.id = (select m_hist from ctx) and m.desactive_le is not null)
          and exists (select 1 from public.mesure x where x.ministere_id = (select m_hist from ctx)),
  'critères 3, 4 et 5 : rien n''est supprimé, le ministère désactivé garde son chiffre');
select ok(exists (select 1 from public.session s where s.id = (select s_saisie from ctx))
          and exists (select 1 from public.session s where s.id = (select s_vide from ctx))
          and not exists (select 1 from public.session_attendu a
                           where a.ministere_id in ((select m_tech from ctx), (select m_deux from ctx))),
  'critères 1 et 6 : les sessions restent, sans les ministères supprimés dans leurs attendus');
select is((select count(*)::integer from public.participation p where p.session_id = (select s_saisie from ctx)),
          (select presences_saisie from ctx), 'critères 1 et 6 : les présences des autres ministères ne bougent pas');
select is((select count(*)::integer from public.session_attendu a where a.session_id = (select s_saisie from ctx)),
          (select attendus_saisie - 2 from ctx),
  'critères 1 et 6 : la session saisie attend deux ministères de moins (sa complétude passée change)');
select is((select count(*)::integer from public.session_attendu a where a.session_id = (select s_vide from ctx)), 0,
  'critère 6 : la session sans saisie n''attend plus personne');
select results_eq($$
  select j.cible_id, j.detail from public.journal j
   where j.action = 'ministere_supprime'
     and j.cible_id in ((select m_tech from ctx), (select m_formation from ctx), (select m_deux from ctx))
   order by j.detail ->> 'sessions'
$$, $$ values
  ((select m_formation from ctx), '{"nom": "Essai T75 EJP FORMATION", "comptes": 1, "sessions": 0, "indicateurs": 8}'::jsonb),
  ((select m_tech from ctx), '{"nom": "Essai T75 EJP TECH", "comptes": 1, "sessions": 1, "indicateurs": 8}'::jsonb),
  ((select m_deux from ctx), '{"nom": "Essai T75 deux sessions", "comptes": 0, "sessions": 2, "indicateurs": 0}'::jsonb)
$$, 'le journal garde le nom, les indicateurs, les comptes et le nombre de sessions quittées');
select is((select count(*)::integer from public.journal j where j.ministere_id = (select m_tech from ctx)),
          (select journal_tech + 1 from ctx),
  'critère 1 : le journal garde toutes les lignes d''EJP TECH (création, adresse, désactivation...), plus une');

-- 7. Chaque geste d'administration, un par un : aucun ne bloque
set local role service_role;
select lives_ok($$ select public.serveur_creer_compte((select tech from ctx), (select sa from ctx),
                   (select u_gestes from ctx), 'ministere', null, 'Essai T75 gestes', null) $$,
  'gestes : ministère et compte créés');
reset role;
update ctx set m_gestes = (select c.ministere_id from public.compte c where c.user_id = ctx.u_gestes);
select is(private.refus_suppression_ministere((select m_gestes from ctx)), null, 'gestes : la création ne bloque pas');
set local role service_role;
select lives_ok($$ select public.serveur_relancer_invitation((select tech from ctx), (select sa from ctx),
                   (select u_gestes from ctx)) $$, 'gestes : invitation relancée');
reset role;
select is(private.refus_suppression_ministere((select m_gestes from ctx)), null, 'gestes : la relance ne bloque pas');
-- Un clic sur l'invitation (adresse confirmée, connexion sans le code, facteur non vérifié) :
-- l'état « À activer ». Rien ne s'ouvre sans la double authentification (validé le 26 octobre).
update auth.users set email_confirmed_at = now() where id = (select u_gestes from ctx);
insert into auth.sessions (id, user_id, aal) select gen_random_uuid(), u_gestes, 'aal1'::auth.aal_level from ctx;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
select gen_random_uuid(), u_gestes, 'Essai T75', 'totp', 'unverified', now(), now() from ctx;
select is(private.refus_suppression_ministere((select m_gestes from ctx)), null,
  'gestes : un clic sur l''invitation, sans le code (« À activer »), ne bloque pas');
set local role service_role;
select lives_ok($$ select public.serveur_preparer_correction_adresse((select tech from ctx), (select sa from ctx),
                   (select u_gestes from ctx), 'essai-t75-gestes-corrigee@exemple.test') $$,
  'gestes : correction préparée');
reset role;
update auth.users set email = 'essai-t75-gestes-corrigee@exemple.test' where id = (select u_gestes from ctx);
set local role service_role;
select lives_ok($$ select public.serveur_corriger_adresse((select tech from ctx), (select sa from ctx),
                   (select u_gestes from ctx), 'essai-t75-gestes-corrigee@exemple.test') $$,
  'gestes : adresse corrigée');
reset role;
select is(private.refus_suppression_ministere((select m_gestes from ctx)), null, 'gestes : la correction d''adresse ne bloque pas');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.choisir_modele_prevus((select m_gestes from ctx), 'securite') $$,
  'gestes : liste des prévus choisie (T72)');
select is(public.creer_indicateurs_prevus((select m_gestes from ctx), 'securite'), 9,
  'gestes : ses 9 indicateurs prévus créés');
select lives_ok($$ select public.retirer_indicateur(
                   (select i.id from public.indicateur i
                     where i.ministere_id = (select m_gestes from ctx)
                       and not exists (select 1 from public.indicateur_terme t where t.source_id = i.id or t.calcul_id = i.id)
                     order by i.libelle limit 1), 'plus_suivi') $$,
  'gestes : un prévu retiré par EJP Tech');
select lives_ok($$ select public.declarer_session('autre', date '2026-12-20', 'Essai T75 gestes',
                   array[(select m_gestes from ctx)]) $$,
  'gestes : une session déclarée qui l''attend');
select tests.deconnecter();
select is(private.refus_suppression_ministere((select m_gestes from ctx)), null,
  'gestes : la liste choisie, les prévus créés ou retirés et la session ne bloquent pas');
set local role service_role;
select lives_ok($$ select public.serveur_desactiver_compte((select tech from ctx), (select sa from ctx),
                   (select u_gestes from ctx)) $$, 'gestes : désactivé');
reset role;
select is(private.refus_suppression_ministere((select m_gestes from ctx)), null, 'gestes : la désactivation ne bloque pas');
set local role service_role;
select lives_ok($$ select public.serveur_reactiver_compte((select tech from ctx), (select sa from ctx),
                   (select u_gestes from ctx)) $$, 'gestes : réactivé');
reset role;
select results_eq($$ select r.code, r.nombre, r.bloque from private.raisons_suppression((select m_gestes from ctx)) r $$,
  $$ values ('sessions_attendues'::text, 1, false) $$,
  'gestes : après la réactivation, aucune raison qui bloque, une session à quitter');
set local role service_role;
select is(public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select m_gestes from ctx)),
          array[(select u_gestes from ctx)], 'gestes : le ministère est supprimé');
reset role;
select ok(not exists (select 1 from public.ministere m where m.id = (select m_gestes from ctx))
          and not exists (select 1 from auth.sessions s where s.user_id = (select u_gestes from ctx)),
  'gestes : le ministère n''existe plus, la session ouverte par le clic sur l''invitation est supprimée');

select * from finish();
rollback;
