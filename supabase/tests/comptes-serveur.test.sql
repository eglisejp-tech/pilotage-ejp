-- Fonctions serveur des comptes (migration comptes_fonctions_serveur), appelées par les Edge
-- Functions creer-compte, desactiver-compte et reinitialiser-2fa avec la clé secrète
-- (service_role). Droits, contrôles de l'appelant, règles de création, libellés, désactivation,
-- réinitialisation, sessions supprimées et journal au nom de l'appelant.
begin;

select plan(52);

-- pgTAP est ouvert à anon et authenticated par 000-outils ; ce fichier appelle aussi au nom de
-- service_role (droits annulés avec la transaction).
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
    execute pg_catalog.format('grant execute on function %s to service_role', v_fonction);
  end loop;
end $$;

-- Utilisateurs Auth sans compte (ce que laisse une invitation) et comptes de test.
create function pg_temp.utilisateur(p_email text) returns uuid
language sql as $$ insert into auth.users (id, email) values (gen_random_uuid(), p_email) returning id $$;

create temp table ctx as
select tests.creer_compte('essai-admin@exemple.test', 'admin_eglise') as admin,
       tests.creer_compte('essai-admin-inactif@exemple.test', 'admin_eglise') as admin_inactif,
       tests.creer_compte('essai-conseil@exemple.test', 'conseil') as conseil,
       tests.creer_ministere('Essai Comptes A') as m_a,
       pg_temp.utilisateur('essai-u1@exemple.test') as u1,
       pg_temp.utilisateur('essai-u2@exemple.test') as u2,
       pg_temp.utilisateur('essai-u3@exemple.test') as u3,
       pg_temp.utilisateur('essai-u4@exemple.test') as u4,
       pg_temp.utilisateur('essai-u5@exemple.test') as u5,
       pg_temp.utilisateur('essai-u6@exemple.test') as u6,
       pg_temp.utilisateur('essai-u7@exemple.test') as u7,
       gen_random_uuid() as s2,
       gen_random_uuid() as s5;
update public.compte set desactive_le = now() where user_id = (select admin_inactif from ctx);
-- Un seul berger actif : ceux du jeu d'exemple sont désactivés dans cette transaction.
update public.compte set desactive_le = now() where type = 'berger' and desactive_le is null;
grant select on ctx to service_role, authenticated;

-- Droits

select results_eq($$
  select (p.pronamespace::regnamespace::text || '.' || p.proname) collate "C" from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
     and has_function_privilege('service_role', p.oid, 'EXECUTE')
   order by 1
$$, $$ values ('private.serveur_controler_cible'), ('private.serveur_controler_creation_compte'),
              ('private.serveur_creer_compte'), ('private.serveur_desactiver_compte'),
              ('private.serveur_reinitialiser_2fa'), ('public.serveur_controler_cible'),
              ('public.serveur_controler_creation_compte'), ('public.serveur_creer_compte'),
              ('public.serveur_desactiver_compte'), ('public.serveur_reinitialiser_2fa') $$,
  'service_role exécute exactement les 10 fonctions serveur des comptes');
select schema_privs_are('private', 'service_role', array['USAGE']::name[],
  'service_role a seulement usage sur le schéma private');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.proname like 'serveur\_%' and p.prosecdef and p.pronamespace <> 'private'::regnamespace
$$, 'les fonctions serveur security definer sont toutes dans private');

-- L'administration, même en aal2, n'appelle pas ces fonctions directement
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'conseil') $$,
  '42501', null, 'authenticated ne peut pas appeler serveur_creer_compte');
select throws_ok($$ select public.serveur_desactiver_compte((select admin from ctx), (select conseil from ctx)) $$,
  '42501', null, 'authenticated ne peut pas appeler serveur_desactiver_compte');
select throws_ok($$ select public.serveur_reinitialiser_2fa((select admin from ctx), (select conseil from ctx)) $$,
  '42501', null, 'authenticated ne peut pas appeler serveur_reinitialiser_2fa');
select tests.deconnecter();

-- Appelant : un compte actif de l'administration, sinon 42501
set local role service_role;
select throws_ok($$ select public.serveur_creer_compte((select conseil from ctx), (select u7 from ctx), 'conseil') $$,
  '42501', 'appelant_non_autorise', 'un compte du conseil ne crée pas de compte');
select throws_ok($$ select public.serveur_creer_compte((select admin_inactif from ctx), (select u7 from ctx), 'conseil') $$,
  '42501', 'appelant_non_autorise', 'une administration désactivée ne crée pas de compte');
select throws_ok($$ select public.serveur_creer_compte(null, (select u7 from ctx), 'conseil') $$,
  '42501', 'appelant_non_autorise', 'sans appelant, rien n''est créé');
select throws_ok($$ select public.serveur_desactiver_compte((select conseil from ctx), (select u1 from ctx)) $$,
  '42501', 'appelant_non_autorise', 'un compte du conseil ne désactive pas de compte');
select throws_ok($$ select public.serveur_reinitialiser_2fa((select conseil from ctx), (select u1 from ctx)) $$,
  '42501', 'appelant_non_autorise', 'un compte du conseil ne réinitialise pas la double authentification');

-- Création : contrôles
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'admin_eglise') $$,
  'P0001', 'type_interdit', 'creer-compte refuse le type admin_eglise');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'conseil',
                                                       p_ministere_nom => 'Essai') $$,
  'P0001', 'requete_invalide', 'un compte du conseil ne porte pas de ministère');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'ministere') $$,
  'P0001', 'requete_invalide', 'un compte de ministère demande un ministère existant ou un nouveau nom');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), gen_random_uuid(), 'conseil') $$,
  'P0001', 'compte_inconnu', 'l''utilisateur Auth doit exister');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'ministere',
                                                       p_ministere_id => gen_random_uuid()) $$,
  'P0001', 'ministere_inconnu', 'un ministère inconnu est refusé');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'ministere',
                                                       p_ministere_nom => repeat('n', 51)) $$,
  'P0001', 'requete_invalide', 'nom de ministère de 51 caractères refusé');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'ministere',
                                                       p_ministere_nom => 'Essai Comptes Long',
                                                       p_ministere_description => repeat('d', 281)) $$,
  'P0001', 'requete_invalide', 'description de 281 caractères refusée');

-- Création : conseil et EJP Tech, numéro suivant jamais réutilisé
select lives_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u1 from ctx), 'conseil') $$,
  'création d''un compte du conseil');
select lives_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u2 from ctx), 'conseil') $$,
  'création d''un deuxième compte du conseil');
select lives_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u3 from ctx), 'admin_plateforme') $$,
  'création d''un compte EJP Tech');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u1 from ctx), 'conseil') $$,
  'P0001', 'adresse_deja_utilisee', 'un utilisateur qui a déjà un compte est refusé');

-- Création : nouveau ministère, puis ministère existant sans compte actif
select lives_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u4 from ctx), 'ministere',
                                                      p_ministere_nom => '  Essai Comptes Nouveau  ',
                                                      p_ministere_description => '  ') $$,
  'création d''un compte de ministère avec un nouveau ministère');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'ministere',
                                                       p_ministere_nom => 'essai comptes NOUVEAU') $$,
  'P0001', 'nom_ministere_deja_pris', 'un nom de ministère déjà pris est refusé (casse et espaces ignorés)');
select lives_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u5 from ctx), 'ministere',
                                                      p_ministere_id => (select m_a from ctx)) $$,
  'création du compte d''un ministère existant sans compte');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'ministere',
                                                       p_ministere_id => (select m_a from ctx)) $$,
  'P0001', 'ministere_a_deja_un_compte', 'un ministère qui a déjà un compte actif est refusé');

-- Création : un seul berger actif
select lives_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u6 from ctx), 'berger') $$,
  'création du compte du berger');
select throws_ok($$ select public.serveur_creer_compte((select admin from ctx), (select u7 from ctx), 'berger') $$,
  'P0001', 'berger_deja_actif', 'un deuxième berger actif est refusé');

-- Contrôles préalables (sans écriture)
select lives_ok($$ select public.serveur_controler_creation_compte((select admin from ctx), 'essai-u7@exemple.test',
                                                                   'conseil') $$,
  'contrôle préalable accepté pour un compte du conseil');
select throws_ok($$ select public.serveur_controler_creation_compte((select admin from ctx), 'essai-u7@exemple.test',
                                                                    'berger') $$,
  'P0001', 'berger_deja_actif', 'contrôle préalable refusé pour un deuxième berger');
select throws_ok($$ select public.serveur_controler_creation_compte((select admin from ctx), ' ESSAI-U1@exemple.test ',
                                                                    'conseil') $$,
  'P0001', 'adresse_deja_utilisee', 'contrôle préalable refusé pour une adresse qui a déjà un compte');
reset role;

select ok((select c.libelle ~ '^Conseil, compte [0-9]+$' from public.compte c where c.user_id = (select u1 from ctx))
          and (select substring(c.libelle from '[0-9]+$')::int from public.compte c where c.user_id = (select u2 from ctx))
            = (select substring(c.libelle from '[0-9]+$')::int from public.compte c where c.user_id = (select u1 from ctx)) + 1,
  'libellés du conseil : « Conseil, compte n » puis n + 1');
select ok((select c.libelle ~ '^EJP Tech, compte [0-9]+$' and c.type = 'admin_plateforme' and c.ministere_id is null
             from public.compte c where c.user_id = (select u3 from ctx)),
  'libellé d''EJP Tech : « EJP Tech, compte n »');
select ok((select c.libelle = 'Ministère Essai Comptes Nouveau' and m.nom = 'Essai Comptes Nouveau' and m.description is null
             and m.desactive_le is null
             from public.compte c join public.ministere m on m.id = c.ministere_id where c.user_id = (select u4 from ctx)),
  'nouveau ministère : nom sans espaces autour, description vide mise à null, libellé « Ministère <nom> »');
select ok((select c.libelle = 'Ministère Essai Comptes A' and c.ministere_id = (select m_a from ctx)
             from public.compte c where c.user_id = (select u5 from ctx)),
  'ministère existant : compte rattaché, libellé « Ministère <nom> »');
select ok((select c.libelle = 'Berger' and c.type = 'berger' from public.compte c where c.user_id = (select u6 from ctx)),
  'libellé du berger : « Berger »');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.cible_id in ((select u4 from ctx), (select c.ministere_id from public.compte c where c.user_id = (select u4 from ctx)))
   order by j.id
$$, $$
  select 'ministere_cree'::text, (select admin from ctx), c.ministere_id, 'ministere'::text, '{}'::jsonb
    from public.compte c where c.user_id = (select u4 from ctx)
  union all
  select 'compte_cree', (select admin from ctx), c.ministere_id, 'compte', '{"type": "ministere"}'::jsonb
    from public.compte c where c.user_id = (select u4 from ctx)
$$, 'nouveau ministère : ministere_cree puis compte_cree, au nom de l''administration');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.detail from public.journal j where j.cible_id = (select u1 from ctx)
$$, $$ values ('compte_cree'::text, (select admin from ctx), null::uuid, '{"type": "conseil"}'::jsonb) $$,
  'compte du conseil : une seule ligne compte_cree, sans ministère');
select ok(not exists (select 1 from public.compte c where c.user_id = (select u7 from ctx))
          and not exists (select 1 from public.journal j where j.cible_id = (select u7 from ctx))
          and not exists (select 1 from public.ministere m where m.nom = 'Essai Comptes Long'),
  'les créations refusées n''écrivent rien');

-- Désactivation et réinitialisation : des sessions à supprimer
insert into auth.sessions (id, user_id) values ((select s2 from ctx), (select u2 from ctx)),
                                               ((select s5 from ctx), (select u5 from ctx));
insert into auth.refresh_tokens (token, user_id, session_id, revoked)
values ('essai-jeton-u5', (select u5 from ctx)::text, (select s5 from ctx), false);

set local role service_role;
select throws_ok($$ select public.serveur_desactiver_compte((select admin from ctx), (select admin from ctx)) $$,
  'P0001', 'propre_compte', 'l''administration ne désactive pas son propre compte');
select throws_ok($$ select public.serveur_desactiver_compte((select admin from ctx), gen_random_uuid()) $$,
  'P0001', 'compte_inconnu', 'compte inconnu refusé');
select lives_ok($$ select public.serveur_desactiver_compte((select admin from ctx), (select u5 from ctx)) $$,
  'désactivation d''un compte de ministère');
select throws_ok($$ select public.serveur_desactiver_compte((select admin from ctx), (select u5 from ctx)) $$,
  'P0001', 'compte_desactive', 'un compte déjà désactivé est refusé');
select throws_ok($$ select public.serveur_controler_cible((select admin from ctx), (select u5 from ctx)) $$,
  'P0001', 'compte_desactive', 'contrôle préalable refusé pour un compte désactivé');
select lives_ok($$ select public.serveur_desactiver_compte((select admin from ctx), (select u1 from ctx)) $$,
  'désactivation d''un compte du conseil');
select throws_ok($$ select public.serveur_reinitialiser_2fa((select admin from ctx), (select admin from ctx)) $$,
  'P0001', 'propre_compte', 'l''administration ne réinitialise pas sa propre double authentification');
select lives_ok($$ select public.serveur_reinitialiser_2fa((select admin from ctx), (select u2 from ctx)) $$,
  'réinitialisation de la double authentification d''un compte du conseil');
reset role;

select ok((select c.desactive_le is not null from public.compte c where c.user_id = (select u5 from ctx))
          and (select m.desactive_le is not null from public.ministere m where m.id = (select m_a from ctx)),
  'désactivation : le compte et son ministère sont désactivés, rien n''est supprimé');
select ok(not exists (select 1 from auth.sessions s where s.user_id = (select u5 from ctx))
          and not exists (select 1 from auth.refresh_tokens r where r.session_id = (select s5 from ctx)),
  'désactivation : sessions et jetons de rafraîchissement supprimés');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.cible_id in ((select u5 from ctx), (select u1 from ctx)) and j.action = 'compte_desactive'
   order by j.id
$$, $$ values
  ('compte_desactive'::text, (select admin from ctx), (select m_a from ctx), 'compte'::text,
   '{"type": "ministere", "ministere_desactive": true}'::jsonb),
  ('compte_desactive', (select admin from ctx), null, 'compte', '{"type": "conseil", "ministere_desactive": false}')
$$, 'désactivation : une ligne compte_desactive par compte, au nom de l''administration');
select ok(not exists (select 1 from auth.sessions s where s.user_id = (select u2 from ctx))
          and (select c.desactive_le is null from public.compte c where c.user_id = (select u2 from ctx)),
  'réinitialisation : sessions supprimées, compte toujours actif');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.cible_id = (select u2 from ctx) and j.action = 'double_auth_reinitialisee'
$$, $$ values ('double_auth_reinitialisee'::text, (select admin from ctx), null::uuid, 'compte'::text, '{}'::jsonb) $$,
  'réinitialisation : une ligne double_auth_reinitialisee au nom de l''administration');

select * from finish();
rollback;
