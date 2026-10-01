-- Matrice des droits des fonctions serveur des comptes (migrations comptes_fonctions_serveur,
-- comptes_relance_reactivation, comptes_revocation_sessions) : aucune n'est exécutable par anon
-- ni par authenticated ; chaque fonction public, contrôles préalables compris, est refusée à
-- l'anonyme, à un compte connecté en aal1 et en aal2, et, au nom de service_role, à un appelant
-- qui n'est pas l'administration de l'église.
begin;

select plan(44);

-- pgTAP au nom de service_role (droits annulés avec la transaction).
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

create temp table ctx as
select tests.creer_compte('essai-matrice-admin@exemple.test', 'admin_eglise') as admin,
       tests.creer_compte('essai-matrice-conseil@exemple.test', 'conseil') as conseil,
       tests.creer_compte('essai-matrice-cible@exemple.test', 'conseil') as cible;

-- Un appel par fonction public : %1$L est l'appelant, %2$L le compte visé. Les valeurs sont
-- écrites en littéraux, pour que seul le droit sur la fonction soit en jeu.
create temp table appels (nom text primary key, modele text not null);
insert into appels values
  ('serveur_controler_cible', 'select public.serveur_controler_cible(%1$L, %2$L)'),
  ('serveur_controler_creation_compte',
   'select public.serveur_controler_creation_compte(%1$L, ''essai-matrice@exemple.test'', ''conseil'')'),
  ('serveur_controler_reactivation', 'select public.serveur_controler_reactivation(%1$L, %2$L)'),
  ('serveur_controler_relance', 'select public.serveur_controler_relance(%1$L, %2$L)'),
  ('serveur_creer_compte', 'select public.serveur_creer_compte(%1$L, %2$L, ''conseil'')'),
  ('serveur_desactiver_compte', 'select public.serveur_desactiver_compte(%1$L, %2$L)'),
  ('serveur_reactiver_compte', 'select public.serveur_reactiver_compte(%1$L, %2$L)'),
  ('serveur_reinitialiser_2fa', 'select public.serveur_reinitialiser_2fa(%1$L, %2$L)'),
  ('serveur_relancer_invitation', 'select public.serveur_relancer_invitation(%1$L, %2$L)'),
  ('serveur_revoquer_sessions', 'select public.serveur_revoquer_sessions(%1$L, %2$L)');
grant select on ctx, appels to anon, authenticated, service_role;

-- Droits déclarés
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace) and p.proname like 'serveur\_%'),
  20, 'vingt fonctions serveur : dix dans public, dix dans private');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace) and p.proname like 'serveur\_%'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
          or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
$$, 'aucune fonction serveur n''est exécutable par anon ni par authenticated');

-- Anonyme
select tests.anonyme();
select throws_ok(format(a.modele, c.admin, c.cible), '42501', 'permission denied for function ' || a.nom,
                 'anon : ' || a.nom || ' refusée')
  from appels a cross join ctx c order by a.nom;
select tests.deconnecter();

-- Administration connectée en aal1, puis en aal2 : jamais d'appel direct
select tests.se_connecter((select admin from ctx), 'aal1');
select throws_ok(format(a.modele, c.admin, c.cible), '42501', 'permission denied for function ' || a.nom,
                 'authenticated aal1 : ' || a.nom || ' refusée')
  from appels a cross join ctx c order by a.nom;
select tests.deconnecter();

select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok(format(a.modele, c.admin, c.cible), '42501', 'permission denied for function ' || a.nom,
                 'authenticated aal2 : ' || a.nom || ' refusée')
  from appels a cross join ctx c order by a.nom;
select tests.deconnecter();

-- Clé secrète, mais appelant du conseil : refus avant toute lecture ou écriture
set local role service_role;
select throws_ok(format(a.modele, c.conseil, c.cible), '42501', 'appelant_non_autorise',
                 'service_role, appelant du conseil : ' || a.nom || ' refusée')
  from appels a cross join ctx c order by a.nom;
reset role;

-- serveur_revoquer_sessions (première étape de reinitialiser-2fa après le mot de passe) :
-- supprime les sessions du compte, sans ligne de journal.
insert into auth.sessions (id, user_id) values (gen_random_uuid(), (select cible from ctx));
set local role service_role;
select lives_ok($$ select public.serveur_revoquer_sessions((select admin from ctx), (select cible from ctx)) $$,
  'serveur_revoquer_sessions acceptée pour l''administration');
reset role;
select ok(not exists (select 1 from auth.sessions s where s.user_id = (select cible from ctx))
          and not exists (select 1 from public.journal j where j.cible_id = (select cible from ctx)),
  'serveur_revoquer_sessions : sessions supprimées, aucune ligne de journal');

select * from finish();
rollback;
