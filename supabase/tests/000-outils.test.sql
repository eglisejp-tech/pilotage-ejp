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

-- Essai d'une requête au nom d'un compte (null : l'anonyme), en aal1 ou en aal2, puis
-- annulation de tout ce qu'elle a fait. Mode « lignes » : rend le nombre de lignes lues.
-- Autre mode : rend « ok » pour un appel (requête qui commence par select) ou pour une écriture
-- qui touche au moins une ligne, et « ok:0 » pour une écriture qui n'en touche aucune (un
-- insert ... select filtré à vide, un update ou un delete que la RLS filtre) : elle ne prouve
-- pas que l'écriture est permise. Une erreur rend son code (42501 pour un droit refusé, 23514
-- pour un check, P0001 pour un refus d'une fonction).
create or replace function tests.essai(p_compte uuid, p_aal text, p_requete text, p_mode text default 'code')
returns text
language plpgsql as $$
declare
  v_resultat text;
  v_lignes bigint;
begin
  begin
    if p_compte is null then
      perform tests.anonyme(p_aal);
    else
      perform tests.se_connecter(p_compte, p_aal);
    end if;
    if p_mode = 'lignes' then
      execute format('select count(*)::text from (%s) as x', p_requete) into v_resultat;
    else
      execute p_requete;
      get diagnostics v_lignes = row_count;
      v_resultat := case when v_lignes > 0 or p_requete ~* '^\s*select\M' then 'ok' else 'ok:0' end;
    end if;
    raise exception using errcode = 'ZZ002', message = 'essai annulé';
  exception
    when sqlstate 'ZZ002' then
      null;
    when others then
      v_resultat := sqlstate;
  end;
  return v_resultat;
end $$;

-- Matrice des droits écrite en données (docs/plan-etape-4.md, section 3, point 8), que chaque
-- lot de base alimente de ses lignes. Rend un test pgTAP par essai (select * from ...).
--
-- p_matrice : requête qui rend, dans cet ordre, six colonnes text :
--   profil   nom d'un profil de p_profils, ou « anonyme » (sans compte) ;
--   objet    table, vue ou fonction essayée (sert au libellé du test) ;
--   action   « lire » compte les lignes rendues ; toute autre action (« ajouter »,
--            « modifier », « supprimer », « appeler »...) exécute la requête ;
--   aal      « aal1 » ou « aal2 » (ignoré pour l'anonyme) ;
--   attendu  pour « lire » : le nombre de lignes, ou un code d'erreur (42501) ; sinon « ok »
--            ou le code d'erreur attendu ;
--   requete  la requête SQL essayée (select pour « lire »).
-- p_profils : requête qui rend (profil text, compte uuid), un compte par profil. Un profil
--   présent deux fois lève une erreur (il doublerait chaque essai).
-- p_deriver : vrai pour ajouter les lignes dérivées, de sorte que la matrice n'écrive que
--   l'aal2 :
--   - pour chaque ligne en aal2 d'un profil qui est **acceptée** (attendu « ok », ou un nombre
--     de lignes de 0 à 9999 pour « lire » ; un code d'erreur a cinq caractères, comme
--     « 42501 »), sa ligne en aal1 : « 0 » pour une lecture d'une table ou d'une vue (la
--     politique restrictive aal2 la vide), « 42501 » pour toute autre action et pour une
--     lecture qui appelle une fonction de public (exige_aal2). Une ligne refusée en aal2 n'a
--     pas de ligne dérivée : l'erreur en aal1 dépend de l'ordre des contrôles (triggers avant
--     la RLS) ;
--   - une fois par objet, action et requête, la ligne de l'anonyme (42501 partout).
--   Une ligne écrite dans la matrice remplace la ligne dérivée de même profil, objet, action et
--   requête (en aal1, ou pour l'anonyme) : c'est le cas de compte, dont un compte lit sa
--   propre ligne en aal1.
-- L'ordre des essais est fixe (objet, action, requête, puis ligne écrite avant ses dérivées).
-- tests.nombre_essais(p_matrice, p_profils, p_deriver) donne leur nombre, pour plan().
-- Les tables temporaires lues par les requêtes doivent être ouvertes à authenticated et à
-- anon par le fichier de test (grant select). Chaque essai est annulé aussitôt.
create or replace function tests.lignes_matrice(p_matrice text, p_profils text, p_deriver boolean default false)
returns table (profil text, objet text, action text, aal text, attendu text, requete text,
               compte uuid, connu boolean)
language plpgsql as $$
declare
  v_doubles text;
begin
  execute format('select string_agg(d.nom, '', '' order by d.nom)
                    from (select x.profil as nom from (%s) as x(profil, compte)
                           group by x.profil having count(*) > 1) as d', p_profils)
    into v_doubles;
  if v_doubles is not null then
    raise exception 'tests.verifier_matrice : profil en double dans p_profils (%)', v_doubles;
  end if;

  return query execute format($requete$
    with m as (
      select x.profil::text as profil, x.objet::text as objet, x.action::text as action,
             x.aal::text as aal, x.attendu::text as attendu, x.requete::text as requete
        from (%s) as x(profil, objet, action, aal, attendu, requete)
    ),
    lignes as (
      select 1 as sous_rang, m.profil, m.objet, m.action, m.aal, m.attendu, m.requete
        from m
      union all
      select 2, m.profil, m.objet, m.action, 'aal1',
             case when m.action = 'lire' and m.requete !~* '\mpublic\.[a-z0-9_]+\s*\('
                  then '0' else '42501' end,
             m.requete
        from m
       where $1 and m.aal = 'aal2' and m.profil <> 'anonyme'
         and (m.attendu = 'ok' or (m.action = 'lire' and m.attendu ~ '^[0-9]{1,4}$'))
         and not exists (select 1 from m e
                          where e.profil = m.profil and e.objet = m.objet and e.action = m.action
                            and e.requete = m.requete and e.aal = 'aal1')
      union all
      select distinct 3, 'anonyme', m.objet, m.action, null::text, '42501', m.requete
        from m
       where $1 and m.profil <> 'anonyme'
         and not exists (select 1 from m e
                          where e.profil = 'anonyme' and e.objet = m.objet and e.action = m.action
                            and e.requete = m.requete)
    )
    select l.profil, l.objet, l.action, l.aal, l.attendu, l.requete,
           p.compte, p.profil is not null
      from lignes l
      left join (%s) as p(profil, compte) on p.profil = l.profil
     order by l.objet, l.action, l.requete, l.sous_rang, l.profil, l.aal nulls first
  $requete$, p_matrice, p_profils) using p_deriver;
end $$;

-- Nombre d'essais que tests.verifier_matrice rendra pour cette matrice (lignes dérivées
-- comprises) : select plan(n + tests.nombre_essais(...)).
create or replace function tests.nombre_essais(p_matrice text, p_profils text, p_deriver boolean default false)
returns integer
language sql as $$
  select count(*)::integer from tests.lignes_matrice(p_matrice, p_profils, p_deriver)
$$;

create or replace function tests.verifier_matrice(p_matrice text, p_profils text, p_deriver boolean default false)
returns setof text
language plpgsql as $$
declare
  r record;
begin
  for r in select * from tests.lignes_matrice(p_matrice, p_profils, p_deriver)
  loop
    if r.profil <> 'anonyme' and (not r.connu or r.compte is null) then
      return next fail(format('%s, %s, %s : profil sans compte dans p_profils', r.objet, r.action, r.profil));
      continue;
    end if;
    return next is(
      tests.essai(case when r.profil = 'anonyme' then null else r.compte end, r.aal, r.requete,
                  case when r.action = 'lire' then 'lignes' else 'code' end),
      r.attendu,
      format('%s, %s, %s : %s', r.objet, r.action,
             r.profil || case when r.profil = 'anonyme' then '' else coalesce(' en ' || r.aal, '') end,
             case
               when r.attendu = 'ok' then 'accepté'
               when r.action = 'lire' and r.attendu ~ '^[0-9]{1,4}$' then r.attendu || ' ligne(s)'
               else 'refusé (' || r.attendu || ')'
             end));
  end loop;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(5);
select has_schema('tests', 'le schéma des outils de test existe');
select has_function('tests', 'se_connecter', array['uuid', 'text'], 'tests.se_connecter(user_id, aal) existe');
select has_function('tests', 'essai', array['uuid', 'text', 'text', 'text'],
  'tests.essai(compte, aal, requête, mode) existe');
select has_function('tests', 'verifier_matrice', array['text', 'text', 'boolean'],
  'tests.verifier_matrice(matrice, profils, dériver) existe (matrice des droits en données)');
select has_function('tests', 'nombre_essais', array['text', 'text', 'boolean'],
  'tests.nombre_essais(matrice, profils, dériver) existe (nombre de tests pour plan)');
select * from finish();
