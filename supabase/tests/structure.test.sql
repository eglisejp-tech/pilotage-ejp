-- Structure de sécurité (BRIEF, sections 6, 7 et 8) : RLS partout, politique restrictive aal2,
-- GRANT, fonctions security definer seulement dans private, search_path vide, droits
-- d'exécution, triggers d'intégrité, données de référence.
--
-- Pendant l'étape 4 (docs/plan-etape-4.md, section 3, point 8), ce fichier passe des listes
-- exhaustives aux contrôles génériques : chaque lot ajoute des tables, des vues et des
-- fonctions, et une liste fermée casserait dès la deuxième vague. Les contrôles portent donc
-- sur toute table, toute vue et toute fonction, nouvelles comprises, dès leur lot ; les objets
-- des étapes 1 à 3 doivent toujours exister. Le lot I rétablit les listes exhaustives avec
-- tous les objets de l'étape.
-- Seules listes écrites en données : les tables qu'un ministère remplit par un ajout direct
-- (politique d'ajout et GRANT insert), les droits de service_role (Edge Functions) et les
-- fonctions serveur des comptes.
--
-- Les droits se lisent par has_any_column_privilege (select, insert, update, references) : un
-- GRANT sur une seule colonne compte comme un droit. has_table_privilege ne le verrait pas.
begin;

select plan(58);

-- Politique restrictive de référence, écrite à l'identique de la migration (BRIEF, section 8),
-- sur une table temporaire : chaque table de public doit avoir exactement la même. Un contrôle
-- par « contient aal2 » laisserait passer « <> 'aal2' » ou « = 'aal2' or true ».
create temp table reference_aal2 (x int);
alter table reference_aal2 enable row level security;
create policy double_authentification on reference_aal2 as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- Objets des étapes 1 à 3 : toujours présents (les lots en ajoutent d'autres).
select is_empty($$
  select t.nom from unnest(array[
    'ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
    'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
    'point_suivi', 'journal', 'moderation']) as t(nom)
  except
  select c.relname::text from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
$$, 'les 16 tables des étapes 1 à 3 existent toujours');
select is_empty($$
  select v.nom from unnest(array[
    'v_semaine', 'v_derniere_mesure', 'v_mesure_dimanche', 'v_total_dimanche', 'v_total_a_ce_jour',
    'v_pourcentage_fij', 'v_carte_fij', 'v_participation_courante', 'v_session_completude',
    'v_ecart_dimanche', 'v_ecart_session', 'v_evenement', 'v_prochaine_reunion', 'v_point', 'v_journal',
    'v_tableau_ministeres', 'v_textes_a_relire', 'v_etat_comptes']) as v(nom)
  except
  select c.relname::text from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
$$, 'les 18 vues des étapes 1 à 3 existent toujours');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('m', 'p', 'f')
$$, 'public ne contient ni vue matérialisée, ni table partitionnée, ni table étrangère');

-- RLS et politiques
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity
$$, 'RLS activée sur toutes les tables de public');
select is_empty($$
  with reference as (
    select pg_get_expr(pol.polqual, pol.polrelid) as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
      from pg_policy pol
     where pol.polrelid = 'pg_temp.reference_aal2'::regclass
  )
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and not exists (
       select 1 from pg_policies p cross join reference r
        where p.schemaname = 'public' and p.tablename = c.relname
          and p.policyname = 'double_authentification' and p.permissive = 'RESTRICTIVE'
          and p.roles = array['authenticated']::name[]
          and ((p.cmd = 'ALL' and p.qual = r.qual and p.with_check = r.with_check)
               or (c.relname = 'compte' and p.cmd = 'SELECT' and p.qual like '%aal2%'
                   and p.qual like '%auth.uid()%')))
$$, 'chaque table a exactement la politique restrictive aal2 de référence (using et with check ; compte : lecture de sa propre ligne en aal1)');
select is_empty($$
  select p.tablename, p.policyname from pg_policies p
   where p.schemaname = 'public' and p.permissive = 'PERMISSIVE' and p.cmd not in ('SELECT', 'INSERT')
$$, 'aucune politique permissive update, delete ou all');
select is_empty($$
  select p.tablename, p.policyname from pg_policies p
   where p.schemaname = 'public' and p.roles <> array['authenticated']::name[]
$$, 'toutes les politiques visent authenticated seulement (rien pour anon)');
select is_empty($$
  select p.tablename from pg_policies p
   where p.schemaname = 'public' and p.cmd = 'INSERT'
     and p.tablename not in ('mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion')
$$, 'politiques d''ajout : seulement sur les tables remplies directement par un ministère (les autres passent par l''API)');

-- GRANT des tables
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and has_any_column_privilege('authenticated', c.oid, 'INSERT')
     and c.relname not in ('mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion')
$$, 'authenticated : insert seulement sur les tables remplies directement par un ministère (colonnes comprises)');
select is_empty($$
  select t.nom from unnest(array['mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion']) as t(nom)
   where not has_table_privilege('authenticated', ('public.' || t.nom)::regclass, 'INSERT')
      or not has_table_privilege('authenticated', ('public.' || t.nom)::regclass, 'SELECT')
$$, 'authenticated : lecture et ajout sur les cinq tables remplies directement par un ministère');
select is_empty($$
  select t.nom from unnest(array[
    'ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
    'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
    'point_suivi', 'journal', 'moderation']) as t(nom)
   where not has_table_privilege('authenticated', ('public.' || t.nom)::regclass, 'SELECT')
$$, 'authenticated : lecture des 16 tables des étapes 1 à 3 (sous la RLS)');
select is_empty($$
  with droits as (
    select c.relname,
           array(select d.droit from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
                                                  'REFERENCES', 'TRIGGER']) as d(droit)
                  where has_table_privilege('service_role', c.oid, d.droit)
                  order by d.droit) as obtenus
      from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  )
  select relname, obtenus from droits
   where obtenus <> case relname
                      when 'ministere' then array['INSERT', 'SELECT', 'UPDATE']
                      when 'compte' then array['INSERT', 'SELECT', 'UPDATE']
                      when 'journal' then array['INSERT']
                      else array[]::text[]
                    end
$$, 'service_role : droits exacts sur chaque table (ministere, compte et journal pour les Edge Functions, rien sur les autres)');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
     and (has_any_column_privilege('anon', c.oid, 'SELECT') or has_any_column_privilege('anon', c.oid, 'INSERT')
          or has_any_column_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
          or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_any_column_privilege('anon', c.oid, 'REFERENCES')
          or has_table_privilege('anon', c.oid, 'TRIGGER'))
$$, 'anon n''a aucun droit sur aucune table ni vue de public, ni sur une de leurs colonnes');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
     and (has_any_column_privilege('authenticated', c.oid, 'UPDATE')
          or has_table_privilege('authenticated', c.oid, 'DELETE')
          or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
          or has_any_column_privilege('authenticated', c.oid, 'REFERENCES')
          or has_table_privilege('authenticated', c.oid, 'TRIGGER'))
$$, 'authenticated n''a aucun droit update, delete ni truncate, sur aucune table ni colonne');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
     and (has_sequence_privilege('anon', c.oid, 'USAGE') or has_sequence_privilege('anon', c.oid, 'SELECT')
          or has_sequence_privilege('anon', c.oid, 'UPDATE')
          or has_sequence_privilege('authenticated', c.oid, 'UPDATE'))
$$, 'aucun droit sur les séquences pour anon, ni update pour authenticated');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'private'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
     and (has_any_column_privilege('anon', c.oid, 'SELECT') or has_any_column_privilege('anon', c.oid, 'INSERT')
          or has_any_column_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
          or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_any_column_privilege('anon', c.oid, 'REFERENCES')
          or has_table_privilege('anon', c.oid, 'TRIGGER')
          or has_any_column_privilege('authenticated', c.oid, 'SELECT')
          or has_any_column_privilege('authenticated', c.oid, 'INSERT')
          or has_any_column_privilege('authenticated', c.oid, 'UPDATE')
          or has_table_privilege('authenticated', c.oid, 'DELETE')
          or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
          or has_any_column_privilege('authenticated', c.oid, 'REFERENCES')
          or has_table_privilege('authenticated', c.oid, 'TRIGGER'))
$$, 'ni anon ni authenticated n''ont de droit sur une table ou une vue de private, ni sur une de leurs colonnes');

-- Vues : security_invoker, lecture pour authenticated seulement
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
     and not coalesce(c.reloptions @> array['security_invoker=true'], false)
$$, 'toutes les vues sont security_invoker');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
     and (not has_table_privilege('authenticated', c.oid, 'SELECT')
          or has_table_privilege('authenticated', c.oid, 'INSERT')
          or has_table_privilege('service_role', c.oid, 'SELECT'))
$$, 'vues : lecture pour authenticated, rien d''autre, rien pour service_role');

-- Fonctions
-- Tous les schémas du projet (public, private, tests, et tout schéma qu'une migration créerait),
-- hors schémas du système et de Supabase et hors fonctions des extensions.
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.prosecdef
     and p.pronamespace <> 'private'::regnamespace
     and p.pronamespace::regnamespace::text not like 'pg\_%'
     and p.pronamespace::regnamespace::text not in (
           'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public',
           'realtime', '_realtime', 'vault', 'pgsodium', 'pgsodium_masks', 'net', 'supabase_functions',
           'supabase_migrations', 'cron', 'pgbouncer', 'pgmq', '_analytics')
     and pg_get_userbyid(p.proowner) not like 'supabase%'
     and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
$$, 'aucune fonction security definer hors de private, dans aucun schéma du projet (toute fonction de public est security invoker)');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
     and not coalesce(p.proconfig @> array['search_path=""'], false)
$$, 'chaque fonction de public et de private fixe search_path = ''''');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
     and (p.proacl is null
          or exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'))
$$, 'aucune fonction de public ni de private n''est exécutable par public');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
          or (has_function_privilege('service_role', p.oid, 'EXECUTE')
              and p.proname not in ('serveur_controler_creation_compte', 'serveur_controler_cible',
                                    'serveur_creer_compte', 'serveur_desactiver_compte', 'serveur_reinitialiser_2fa',
                                    'serveur_controler_relance', 'serveur_relancer_invitation',
                                    'serveur_controler_reactivation', 'serveur_reactiver_compte',
                                    'serveur_revoquer_sessions')))
$$, 'aucune fonction de public ni de private n''est exécutable par anon, ni par service_role hors fonctions serveur des comptes');
select is_empty($$
  select f.nom from unnest(array['ajouter_evenement', 'changer_statut_point', 'creer_point', 'declarer_session',
                                 'marquer_relu', 'marquer_traite', 'masquer_texte', 'modifier_session',
                                 'supprimer_session']) as f(nom)
  except
  select p.proname::text from pg_proc p
   where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'EXECUTE')
$$, 'les 9 fonctions de l''API des étapes 1 à 3 restent exécutables par authenticated');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.prosrc not like '%private.' || p.proname || '(%'
$$, 'chaque fonction de public appelle sa partie private du même nom');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and not exists (
       select 1 from pg_proc q
        where q.pronamespace = 'private'::regnamespace and q.proname = p.proname
          and q.prosecdef and has_function_privilege('authenticated', q.oid, 'EXECUTE'))
$$, 'chaque fonction de l''API (public, exécutable par authenticated) a sa partie private security definer, appelable par authenticated');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace = 'private'::regnamespace and p.prosecdef
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and exists (select 1 from pg_proc q
                  where q.pronamespace = 'public'::regnamespace
                    and has_function_privilege('authenticated', q.oid, 'EXECUTE')
                    and q.prosrc like '%private.' || p.proname || '(%')
     and regexp_replace(substring(p.prosrc from position('begin' in p.prosrc) + 5), '^\s+', '')
         not like 'perform private.exige_aal2();%'
$$, 'toute partie private de l''API (security definer, appelée par une fonction de public) commence par perform private.exige_aal2()');
-- Le contrôle cherche l'expression elle-même, hors commentaires (« aal2 » écrit dans un
-- commentaire ou dans « <> 'aal2' » ne suffit pas). Les fonctions scalaires lues par les vues
-- (mon_type, aujourdhui, journal_lisible_administration...) restent hors du contrôle : elles ne
-- rendent aucune ligne de données, et les tables qu'elles lisent portent la politique aal2.
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace = 'private'::regnamespace and p.prosecdef and p.proretset
     and exists (select 1 from pg_views v
                  where v.schemaname = 'public' and v.definition like '%private.' || p.proname || '(%')
     and regexp_replace(p.prosrc, '--[^\n]*', '', 'g')
         !~ $re$(perform\s+private\.exige_aal2\(\)|\(select\s+auth\.jwt\(\)\s*->>\s*'aal'\)(,\s*''\))?\s*=\s*'aal2'|\(auth\.jwt\(\)\s*->>\s*'aal'\)\s*=\s*'aal2')$re$
$$, 'toute fonction private security definer qui sert une vue (returns table) contrôle aal2 dans son jeton (expression exacte ou exige_aal2)');
select ok((select count(*) from pg_proc p
            where p.pronamespace = 'private'::regnamespace and p.prosecdef and p.proretset
              and exists (select 1 from pg_views v
                           where v.schemaname = 'public'
                             and v.definition like '%private.' || p.proname || '(%')) >= 3,
  'le contrôle précédent porte bien sur des fonctions (tableau_ministeres, textes_a_relire, etat_comptes au moins)');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
     and p.prosrc ~* '\mexecute\M\s+(format|''|\$)'
$$, 'aucune fonction n''utilise de SQL dynamique');
select schema_privs_are('private', 'anon', array[]::name[], 'anon n''a aucun droit sur le schéma private');
select schema_privs_are('private', 'authenticated', array['USAGE']::name[],
  'authenticated a seulement usage sur le schéma private');
select ok(has_table_privilege((select pg_get_userbyid(p.proowner) from pg_proc p
                                where p.oid = 'private.etat_comptes()'::regprocedure), 'auth.mfa_factors', 'SELECT')
          and has_table_privilege((select pg_get_userbyid(p.proowner) from pg_proc p
                                    where p.oid = 'private.etat_comptes()'::regprocedure), 'auth.users', 'SELECT'),
  'le propriétaire de etat_comptes lit auth.users et auth.mfa_factors');
select ok(position('secret' in (select p.prosrc from pg_proc p where p.oid = 'private.etat_comptes()'::regprocedure)) = 0,
  'etat_comptes ne lit jamais la colonne secret des facteurs');

-- Contraintes : jamais la date du jour dans un check
select is_empty($$
  select c.conname from pg_constraint c
   where c.connamespace = 'public'::regnamespace and c.contype = 'c'
     and pg_get_constraintdef(c.oid) ~* '(now\(\)|current_date|current_timestamp|localtimestamp)'
$$, 'aucun check n''utilise now() ni current_date');

-- Triggers d'intégrité
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'saisi_par' and not a.attisdropped)
     and not exists (select 1 from pg_trigger t
                      where t.tgrelid = c.oid and t.tgname = 'forcer_auteur' and not t.tgisinternal
                        and t.tgenabled <> 'D'
                        and t.tgfoid = 'private.forcer_auteur()'::regprocedure
                        and (t.tgtype & 7) = 7)   -- par ligne (1), avant (2), à l'ajout (4)
$$, 'toute table qui porte saisi_par a le trigger forcer_auteur, avant l''ajout de chaque ligne (auteur et heure imposés par la base)');
-- Tables nouvelles de l'étape 4 (hors des 16 tables des étapes 1 à 3) : toutes en ajout
-- seulement (plan, section 4), donc un trigger avant update et delete, par ligne, qui refuse
-- (seule exception, dans la fonction du trigger : masquer_texte sous pilotage.masquage).
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and c.relname <> all (array[
       'ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
       'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
       'point_suivi', 'journal', 'moderation'])
     and not exists (select 1 from pg_trigger t
                      where t.tgrelid = c.oid and not t.tgisinternal and t.tgenabled <> 'D'
                        and (t.tgtype & 1) = 1 and (t.tgtype & 2) = 2      -- par ligne, avant
                        and (t.tgtype & 8) = 8 and (t.tgtype & 16) = 16)   -- delete et update
$$, 'toute table nouvelle de l''étape 4 a un trigger d''inaltérabilité (avant update et delete, par ligne)');
select has_trigger('public', t.nom::name, 'forcer_auteur'::name, 'auteur et heure imposés sur ' || t.nom)
  from unnest(array['mesure', 'fij_departement', 'session', 'participation', 'evenement', 'evenement_etat',
                    'reunion', 'point_attention', 'point_suivi']) as t(nom)
 order by t.nom;
select has_trigger('public', t.nom::name, ('journal_' || t.nom)::name, 'journal par envoi sur ' || t.nom)
  from unnest(array['mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion']) as t(nom)
 order by t.nom;
select has_trigger('public', 'mesure', 'controler_mesure', 'date d''une mesure contrôlée');
select has_trigger('public', 'mesure', 'verifier_fij_actifs', '« dont en FIJ » comparé aux actifs');
select has_trigger('public', t.nom::name, g.nom::name, g.nom || ' sur ' || t.nom)
  from unnest(array['journal', 'moderation']) as t(nom)
 cross join unnest(array['ajout_seulement', 'ajout_seulement_vider']) as g(nom)
 order by t.nom, g.nom;

-- Données de référence (migration, production comprise)
select results_eq($$
  select code, libelle, nature from public.indicateur where ministere_id is null order by ordre
$$, $$ values ('service', 'STARs au service', 'dimanche'), ('actifs', 'STARs actifs', 'a_ce_jour'),
              ('en_fij', 'Dont en FIJ', 'a_ce_jour') $$, 'les trois indicateurs communs');
select results_eq($$ select nom from public.ministere where code = 'fij' $$, $$ values ('FIJ') $$,
  'le ministère FIJ porte le code fij');

select * from finish();
rollback;
