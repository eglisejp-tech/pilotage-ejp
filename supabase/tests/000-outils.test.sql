-- Outils partagés par les tests pgTAP (BRIEF, section 7, « Tests obligatoires »).
-- Ce fichier passe en premier (ordre alphabétique) et n'est pas annulé : le schéma tests reste
-- pour les fichiers suivants. Il n'existe qu'en local et en CI, jamais dans une migration.
-- Chaque fichier de test ouvre ensuite sa propre transaction et l'annule à la fin.

create extension if not exists pgtap with schema extensions;

-- Depuis la migration correctifs_audit, une fonction créée par postgres n'est plus exécutable
-- par public. Les tests appellent pgTAP au nom d'authenticated et d'anon : on leur ouvre ses
-- fonctions quand postgres en est le propriétaire (sinon elles gardent leurs droits).
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
    execute pg_catalog.format('grant execute on function %s to anon, authenticated', v_fonction);
  end loop;
end $$;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;
-- Les fonctions d'aide ajoutées plus tard dans tests par les autres fichiers restent appelables.
alter default privileges for role postgres in schema tests grant execute on functions to anon, authenticated;

-- Crée un ministère actif depuis un an (actif à toutes les dates du jeu d'exemple).
create or replace function tests.creer_ministere(p_nom text) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.ministere (nom, cree_le) values (p_nom, now() - interval '1 year')
  returning id into v_id;
  return v_id;
end $$;

-- Ligne minimale dans auth.users, puis dans compte. Un seul berger actif : l'ancien est
-- désactivé dans la transaction du test.
create or replace function tests.creer_compte(p_email text, p_type public.type_compte, p_ministere uuid default null)
returns uuid
language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_id, p_email);
  if p_type = 'berger' then
    update public.compte set desactive_le = now() where type = 'berger' and desactive_le is null;
  end if;
  insert into public.compte (user_id, type, ministere_id, libelle)
  values (v_id, p_type, p_ministere, left('Test ' || p_email, 60));
  return v_id;
end $$;

-- Se connecter comme un compte : rôle authenticated et jeton simulé (sub, role, aal).
create or replace function tests.se_connecter(p_utilisateur uuid, p_aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_utilisateur, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('request.jwt.claim.sub', p_utilisateur::text, true);
end $$;

-- Visiteur anonyme (clé publique sans session).
create or replace function tests.anonyme(p_aal text default null) returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon', 'aal', p_aal)::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Retour au rôle du test (propriétaire des tables), sans jeton.
create or replace function tests.deconnecter() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Lit une requête au nom d'un compte et rend ses lignes en jsonb (triées), puis revient au
-- rôle du test : tout ce que la requête a pu changer est annulé.
create or replace function tests.lire(p_utilisateur uuid, p_aal text, p_requete text) returns jsonb
language plpgsql as $$
declare
  v_lignes jsonb;
begin
  begin
    perform tests.se_connecter(p_utilisateur, p_aal);
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text), ''[]''::jsonb) from (%s) as x',
                   p_requete)
      into v_lignes;
    raise exception using errcode = 'ZZ001', message = 'lecture terminée';
  exception
    when sqlstate 'ZZ001' then
      null;
  end;
  return v_lignes;
end $$;

-- Nombre de lignes d'une requête au nom d'un compte.
create or replace function tests.compter(p_utilisateur uuid, p_aal text, p_requete text) returns integer
language sql as $$
  select jsonb_array_length(tests.lire(p_utilisateur, p_aal, p_requete))
$$;

-- Compte et ministère du jeu d'exemple, par libellé ou par nom.
create or replace function tests.compte(p_libelle text) returns uuid
language sql stable as $$
  select c.user_id from public.compte c where c.libelle = p_libelle and c.desactive_le is null
$$;

create or replace function tests.ministere(p_nom text) returns uuid
language sql stable as $$
  select m.id from public.ministere m where m.nom = p_nom
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(2);
select has_schema('tests', 'le schéma des outils de test existe');
select has_function('tests', 'se_connecter', array['uuid', 'text'], 'tests.se_connecter(user_id, aal) existe');
select * from finish();
