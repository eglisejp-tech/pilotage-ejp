-- Structure de sécurité (BRIEF, sections 6, 7 et 8) : RLS partout, politique restrictive aal2,
-- GRANT, fonctions security definer seulement dans private, search_path vide, droits
-- d'exécution, triggers d'intégrité, données de référence.
--
-- Deux familles de contrôles (docs/plan-etape-4.md, section 3, point 8, et lot I) :
--  1. des contrôles génériques, qui portent sur toute table, toute vue et toute fonction, y
--     compris celles qu'une migration ajouterait un jour (RLS, politique aal2 de référence,
--     aucun droit pour anon, search_path vide, exige_aal2, forcer_auteur, inaltérabilité...) ;
--  2. des listes exhaustives, rétablies par le lot I avec tous les objets des migrations de
--     l'étape 4 : les tables de public et de private, les vues, les politiques (table, nom,
--     opération, nature), les droits d'authenticated sur chaque table, les fonctions de public
--     et de private (nombre d'arguments, security definer, droit d'exécution d'authenticated et
--     de service_role) et les triggers. Ces listes sont fermées : une migration qui ajoute,
--     retire ou change un de ces objets met ce fichier à jour dans le même lot, sinon le job
--     « base » échoue et nomme la ligne qui manque ou qui dépasse.
-- Autres listes écrites en données : les tables qu'un ministère remplit par un ajout direct
-- (GRANT insert), les droits de service_role sur les tables (Edge Functions) et les fonctions
-- serveur des comptes.
--
-- Les droits se lisent par has_any_column_privilege (select, insert, update, references) : un
-- GRANT sur une seule colonne compte comme un droit. has_table_privilege ne le verrait pas.
--
-- Les colonnes du catalogue (types name) sont comparées avec collate "default" (voir
-- .claude/skills/nouvelle-table/SKILL.md, « Pièges connus des tests pgTAP »).
begin;

select plan(67);

-- Politique restrictive de référence, écrite à l'identique de la migration (BRIEF, section 8),
-- sur une table temporaire : chaque table de public doit avoir exactement la même. Un contrôle
-- par « contient aal2 » laisserait passer « <> 'aal2' » ou « = 'aal2' or true ».
create temp table reference_aal2 (x int);
alter table reference_aal2 enable row level security;
create policy double_authentification on reference_aal2 as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- Objets attendus : les listes exhaustives des migrations des étapes 1 à 4.
select tables_are('public', array[
  'ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
  'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
  'point_suivi', 'journal', 'moderation',
  -- étape 4
  'indicateur_terme', 'fij_statistique', 'evenement_mention', 'demande_indicateur', 'validation',
  'categorie_sensible', 'ventilation_sensible', 'precision_sensible', 'signalement', 'signalement_suivi',
  -- étape 6 (T53)
  'acceptation_conditions',
  -- étape 5 (T54)
  'point_mention_retrait'
]::name[], 'public contient les 28 tables du modèle (16 des étapes 1 à 3, 10 de l''étape 4, 1 de l''étape 5, 1 de l''étape 6), rien de plus');
select tables_are('private', array[
  'terme', 'fij_rubrique', 'indicateur_prevu', 'indicateur_prevu_terme', 'libelle_commun'
]::name[], 'private contient les 5 tables internes (lexique, rubriques FIJ, indicateurs prévus, libellés communs), rien de plus');
select views_are('public', array[
  'v_semaine', 'v_derniere_mesure', 'v_mesure_dimanche', 'v_total_dimanche', 'v_total_a_ce_jour',
  'v_pourcentage_fij', 'v_carte_fij', 'v_participation_courante', 'v_session_completude',
  'v_ecart_dimanche', 'v_ecart_session', 'v_evenement', 'v_prochaine_reunion', 'v_point', 'v_journal',
  'v_tableau_ministeres', 'v_textes_a_relire', 'v_etat_comptes',
  -- étape 4
  'v_fij_statistique', 'v_mesure_periode', 'v_indicateur_serie', 'v_indicateur_suivi', 'v_calcul',
  'v_usage_indicateurs', 'v_catalogue', 'v_suggestions', 'v_a_valider', 'v_commun_fiche',
  'v_ventilation_sensible', 'v_precision_sensible', 'v_signalement',
  -- étape 5 (T54)
  'v_point_mention'
]::name[], 'public contient les 32 vues de lecture (18 des étapes 1 à 3, 13 de l''étape 4, 1 de l''étape 5), rien de plus');
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
-- Liste exhaustive des politiques : par table, « lecture » (select), « double_authentification »
-- (restrictive ; select seulement sur compte) et, sur les cinq tables remplies directement par
-- un ministère, « ajout » (insert). Aucune politique update ni delete. Les autres tables
-- s'écrivent par l'API.
select bag_eq($$
  select p.tablename::text collate "default" as nom_table, p.policyname::text collate "default" as nom,
         p.cmd::text collate "default" as operation, p.permissive::text collate "default" as nature
    from pg_policies p
   where p.schemaname = 'public'
$$, $$ values
  ('acceptation_conditions', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('acceptation_conditions', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('categorie_sensible', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('categorie_sensible', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('compte', 'double_authentification', 'SELECT', 'RESTRICTIVE'),
  ('compte', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('demande_indicateur', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('demande_indicateur', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('evenement', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('evenement', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('evenement_etat', 'ajout', 'INSERT', 'PERMISSIVE'),
  ('evenement_etat', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('evenement_etat', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('evenement_mention', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('evenement_mention', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('fij_departement', 'ajout', 'INSERT', 'PERMISSIVE'),
  ('fij_departement', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('fij_departement', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('fij_statistique', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('fij_statistique', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('indicateur', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('indicateur', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('indicateur_terme', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('indicateur_terme', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('journal', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('journal', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('mesure', 'ajout', 'INSERT', 'PERMISSIVE'),
  ('mesure', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('mesure', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('ministere', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('ministere', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('moderation', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('moderation', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('participation', 'ajout', 'INSERT', 'PERMISSIVE'),
  ('participation', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('participation', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('point_attention', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('point_attention', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('point_mention', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('point_mention', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('point_mention_retrait', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('point_mention_retrait', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('point_suivi', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('point_suivi', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('precision_sensible', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('precision_sensible', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('reunion', 'ajout', 'INSERT', 'PERMISSIVE'),
  ('reunion', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('reunion', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('session', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('session', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('session_attendu', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('session_attendu', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('signalement', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('signalement', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('signalement_suivi', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('signalement_suivi', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('validation', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('validation', 'lecture', 'SELECT', 'PERMISSIVE'),
  ('ventilation_sensible', 'double_authentification', 'ALL', 'RESTRICTIVE'),
  ('ventilation_sensible', 'lecture', 'SELECT', 'PERMISSIVE')
$$, 'les 61 politiques de public : lecture et double authentification sur chaque table, ajout sur les cinq tables remplies par un ministère, rien d''autre');

-- GRANT des tables
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and has_any_column_privilege('authenticated', c.oid, 'INSERT')
     and c.relname not in ('mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion')
$$, 'authenticated : insert seulement sur les tables remplies directement par un ministère (colonnes comprises)');
-- Droits exacts d'authenticated sur chacune des 28 tables : lecture (sous la RLS) partout, ajout
-- en plus sur les cinq tables remplies directement par un ministère.
select table_privs_are('public', t.nom::name, 'authenticated',
         case when t.nom in ('mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion')
              then array['INSERT', 'SELECT'] else array['SELECT'] end::name[],
         'authenticated : droits exacts sur ' || t.nom)
  from unnest(array[
    'ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
    'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
    'point_suivi', 'journal', 'moderation',
    'indicateur_terme', 'fij_statistique', 'evenement_mention', 'demande_indicateur', 'validation',
    'categorie_sensible', 'ventilation_sensible', 'precision_sensible', 'signalement',
    'signalement_suivi', 'acceptation_conditions', 'point_mention_retrait']) as t(nom)
 order by t.nom;
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
-- Listes exhaustives des fonctions : (nom, nombre d'arguments, security definer, exécutable par
-- authenticated, exécutable par service_role). Le nombre d'arguments distingue les surcharges
-- (ajouter_evenement à 3 et à 4 arguments). L'API des ministères et du conseil est l'ensemble
-- des fonctions de public exécutables par authenticated (security invoker) ; chacune a sa partie
-- private security definer du même nom. Les fonctions serveur des comptes sont les seules à
-- l'être par service_role.
select bag_eq($$
  select p.proname::text collate "default" as nom, p.pronargs::int as arguments, p.prosecdef as definer,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
         has_function_privilege('service_role', p.oid, 'EXECUTE') as service
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
$$, $$ values
  ('accepter_conditions', 1, false, true, false),
  ('ajouter_evenement', 3, false, true, false),
  ('ajouter_evenement', 4, false, true, false),
  ('ajouter_mention_point', 2, false, true, false),
  ('ajouter_suggestion', 3, false, true, false),
  ('changer_statut_point', 2, false, true, false),
  ('clore_signalement', 2, false, true, false),
  ('corriger_indicateur', 3, false, true, false),
  ('creer_calcul', 7, false, true, false),
  ('creer_indicateur', 9, false, true, false),
  ('creer_indicateurs_prevus', 2, false, true, false),
  ('creer_point', 6, false, true, false),
  ('declarer_session', 4, false, true, false),
  ('limites_indicateurs', 1, false, true, false),
  ('marquer_relu', 2, false, true, false),
  ('marquer_traite', 2, false, true, false),
  ('masquer_texte', 4, false, true, false),
  ('modifier_mentions_point', 2, false, true, false),
  ('modifier_session', 2, false, true, false),
  ('retirer_indicateur', 2, false, true, false),
  ('retirer_mention_point', 2, false, true, false),
  ('saisir_chiffres_mois', 2, false, true, false),
  ('saisir_fij_statistiques', 2, false, true, false),
  ('serveur_controler_cible', 3, false, false, true),
  ('serveur_controler_creation_compte', 6, false, false, true),
  ('serveur_controler_reactivation', 3, false, false, true),
  ('serveur_controler_relance', 3, false, false, true),
  ('serveur_creer_compte', 7, false, false, true),
  ('serveur_desactiver_compte', 3, false, false, true),
  ('serveur_reactiver_compte', 3, false, false, true),
  ('serveur_reinitialiser_2fa', 3, false, false, true),
  ('serveur_relancer_invitation', 3, false, false, true),
  ('serveur_revoquer_sessions', 3, false, false, true),
  ('signaler_difficulte', 2, false, true, false),
  ('supprimer_session', 1, false, true, false),
  ('valider_indicateur', 3, false, true, false),
  ('verifier_libelle', 3, false, true, false)
$$, 'les 37 fonctions de public : 27 de l''API (security invoker, authenticated) et 10 fonctions serveur des comptes (service_role), et elles seules');
select bag_eq($$
  select p.proname::text collate "default" as nom, p.pronargs::int as arguments, p.prosecdef as definer,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
         has_function_privilege('service_role', p.oid, 'EXECUTE') as service
    from pg_proc p
   where p.pronamespace = 'private'::regnamespace
$$, $$ values
  ('accepter_conditions', 1, true, true, false),
  ('actif_le', 3, false, true, false),
  ('ajouter_evenement', 3, true, true, false),
  ('ajouter_evenement', 4, true, true, false),
  ('ajouter_mention_point', 2, true, true, false),
  ('ajouter_suggestion', 3, true, true, false),
  ('ajouts_fiche', 1, false, false, false),
  ('aujourdhui', 0, false, true, false),
  ('auteur_texte', 2, false, false, false),
  ('catalogue', 0, true, true, false),
  ('changer_statut_point', 2, true, true, false),
  ('clore_signalement', 2, true, true, false),
  ('communs_de_fiche', 0, true, true, false),
  ('controler_appel', 2, false, false, false),
  ('controler_appelant', 1, false, false, false),
  ('controler_categorie_sensible', 0, true, false, false),
  ('controler_cible', 2, false, false, false),
  ('controler_cible_desactivee', 2, false, false, false),
  ('controler_creation_compte', 3, false, false, false),
  ('controler_evenement_etat', 0, true, false, false),
  ('controler_indicateur', 0, true, false, false),
  ('controler_invitation_en_attente', 1, false, false, false),
  ('controler_mentions_point', 1, true, false, false),
  ('controler_mesure', 0, true, false, false),
  ('controler_mesure_le', 4, false, false, false),
  ('controler_precision', 0, true, false, false),
  ('controler_prevu_terme', 0, false, false, false),
  ('controler_session', 2, false, false, false),
  ('controler_terme', 0, true, false, false),
  ('corriger_indicateur', 3, true, true, false),
  ('creer_calcul', 7, true, true, false),
  ('creer_indicateur', 9, true, true, false),
  ('creer_indicateurs_prevus', 2, true, true, false),
  ('creer_point', 6, true, true, false),
  ('date_en_lettres', 1, false, false, false),
  ('declarer_session', 4, true, true, false),
  ('defaire_mention', 3, true, false, false),
  ('derniere_periode_finie', 1, false, true, false),
  ('dimanche_reference', 0, false, true, false),
  ('dimanche_reference_de', 1, false, true, false),
  ('ecrans_signalement', 0, false, false, false),
  ('est_decideur', 0, true, true, false),
  ('etat_comptes', 0, true, true, false),
  ('evenements_mentionnant_mon_ministere', 0, true, true, false),
  ('executer_controler_cible', 2, true, false, false),
  ('executer_controler_creation_compte', 5, true, false, false),
  ('executer_controler_reactivation', 2, true, false, false),
  ('executer_controler_relance', 2, true, false, false),
  ('executer_creer_compte', 6, true, false, false),
  ('executer_desactiver_compte', 2, true, false, false),
  ('executer_reactiver_compte', 2, true, false, false),
  ('executer_reinitialiser_2fa', 2, true, false, false),
  ('executer_relancer_invitation', 2, true, false, false),
  ('executer_revoquer_sessions', 2, true, false, false),
  ('exige_aal2', 0, true, true, false),
  ('figer_part', 0, false, false, false),
  ('fij_rubriques', 0, true, true, false),
  ('fin_periode', 2, false, true, false),
  ('forcer_auteur', 0, false, false, false),
  ('journal_lisible_administration', 2, true, true, false),
  ('journaliser_evenements', 0, true, false, false),
  ('journaliser_fij', 0, true, false, false),
  ('journaliser_mesures', 0, true, false, false),
  ('journaliser_participations', 0, true, false, false),
  ('journaliser_reunions', 0, true, false, false),
  ('libelle_pris', 3, false, false, false),
  ('libelle_session', 2, false, false, false),
  ('lignes_fiche', 2, false, false, false),
  ('limites_indicateurs', 1, true, true, false),
  ('lit_tout', 0, true, true, false),
  ('marquer_relu', 2, true, true, false),
  ('marquer_traite', 2, true, true, false),
  ('masquer_texte', 4, true, true, false),
  ('mention_effective', 2, true, false, false),
  ('mesures_periode', 0, true, true, false),
  ('ministere_du_signalement', 2, false, false, false),
  ('ministere_fij', 0, true, true, false),
  ('ministeres_actifs', 1, false, false, false),
  ('modifier_mentions_point', 2, true, true, false),
  ('modifier_session', 2, true, true, false),
  ('mois_courant', 0, false, true, false),
  ('mon_ministere', 0, true, true, false),
  ('mon_type', 0, true, true, false),
  ('normaliser', 1, false, true, false),
  ('periode_de', 2, false, true, false),
  ('peut_configurer', 0, true, true, false),
  ('points_mentionnant_mon_ministere', 0, true, true, false),
  ('poser_mention', 3, true, false, false),
  ('precisions_sensibles', 0, true, true, false),
  ('refuser_mention_double', 0, false, false, false),
  ('refuser_modification', 0, false, false, false),
  ('refuser_modification_sauf_masquage', 0, false, false, false),
  ('retirer_calculs_de', 1, false, false, false),
  ('retirer_indicateur', 2, true, true, false),
  ('retirer_mention_point', 2, true, true, false),
  ('revoquer_sessions', 1, false, false, false),
  ('saisir_chiffres_mois', 2, true, true, false),
  ('saisir_fij_statistiques', 2, true, true, false),
  ('serveur_controler_cible', 3, true, false, true),
  ('serveur_controler_creation_compte', 6, true, false, true),
  ('serveur_controler_reactivation', 3, true, false, true),
  ('serveur_controler_relance', 3, true, false, true),
  ('serveur_creer_compte', 7, true, false, true),
  ('serveur_desactiver_compte', 3, true, false, true),
  ('serveur_reactiver_compte', 3, true, false, true),
  ('serveur_reinitialiser_2fa', 3, true, false, true),
  ('serveur_relancer_invitation', 3, true, false, true),
  ('serveur_revoquer_sessions', 3, true, false, true),
  ('signaler_difficulte', 2, true, true, false),
  ('suggestions', 0, true, true, false),
  ('supprimer_session', 1, true, true, false),
  ('tableau_ministeres', 0, true, true, false),
  ('texte_libre_refuse', 1, false, false, false),
  ('texte_refuse', 5, false, false, false),
  ('textes_a_relire', 0, true, true, false),
  ('usage_indicateurs', 0, true, true, false),
  ('valider_indicateur', 3, true, true, false),
  ('ventilations_sensibles', 0, true, true, false),
  ('verifier_fij_actifs', 0, true, false, false),
  ('verifier_libelle', 3, true, true, false),
  ('verifier_remplacement', 0, true, false, false),
  ('verifier_termes', 0, true, false, false),
  ('verifier_texte', 2, false, false, false),
  ('verifier_ventilations', 0, true, false, false),
  ('verrouiller_ministere', 1, false, false, false)
$$, 'les 125 fonctions de private : security definer, invoker, droits d''exécution d''authenticated et de service_role, et elles seules');
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
-- Liste exhaustive des triggers (hors triggers internes des clés étrangères) sur les tables de
-- public et de private : table, nom. Les contrôles précédents vérifient le fond (fonction,
-- moment, ligne ou instruction) de forcer_auteur et de l'inaltérabilité ; cette liste fige
-- l'ensemble : auteur imposé, journal par envoi, contrôles de date, d'indicateur, de précision
-- et de ventilation, inaltérabilité (avant update et delete, avant truncate) et triggers
-- différés qui exigent les termes d'un indicateur.
select bag_eq($$
  select (c.relnamespace::regnamespace::text || '.' || c.relname::text) collate "default" as relation,
         t.tgname::text collate "default" as declencheur
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
   where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and not t.tgisinternal
$$, $$ values
  ('private.indicateur_prevu_terme', 'controler_prevu_terme'),
  ('public.acceptation_conditions', 'ajout_seulement'),
  ('public.acceptation_conditions', 'ajout_seulement_vider'),
  ('public.acceptation_conditions', 'forcer_auteur'),
  ('public.categorie_sensible', 'controler_categorie_sensible'),
  ('public.categorie_sensible', 'controler_categorie_sensible_vider'),
  ('public.demande_indicateur', 'ajout_seulement'),
  ('public.demande_indicateur', 'ajout_seulement_vider'),
  ('public.demande_indicateur', 'forcer_auteur'),
  ('public.evenement', 'forcer_auteur'),
  ('public.evenement_etat', 'controler_evenement_etat'),
  ('public.evenement_etat', 'forcer_auteur'),
  ('public.evenement_etat', 'journal_evenement_etat'),
  ('public.evenement_mention', 'ajout_seulement'),
  ('public.evenement_mention', 'ajout_seulement_vider'),
  ('public.fij_departement', 'forcer_auteur'),
  ('public.fij_departement', 'journal_fij_departement'),
  ('public.fij_statistique', 'ajout_seulement'),
  ('public.fij_statistique', 'ajout_seulement_vider'),
  ('public.fij_statistique', 'forcer_auteur'),
  ('public.indicateur', 'controler_indicateur'),
  ('public.indicateur', 'controler_indicateur_vider'),
  ('public.indicateur', 'figer_part'),
  ('public.indicateur', 'remplacement_complet'),
  ('public.indicateur', 'termes_complets'),
  ('public.indicateur_terme', 'ajout_seulement'),
  ('public.indicateur_terme', 'ajout_seulement_vider'),
  ('public.indicateur_terme', 'controler_terme'),
  ('public.indicateur_terme', 'termes_complets'),
  ('public.journal', 'ajout_seulement'),
  ('public.journal', 'ajout_seulement_vider'),
  ('public.mesure', 'controler_mesure'),
  ('public.mesure', 'forcer_auteur'),
  ('public.mesure', 'journal_mesure'),
  ('public.mesure', 'verifier_fij_actifs'),
  ('public.moderation', 'ajout_seulement'),
  ('public.moderation', 'ajout_seulement_vider'),
  ('public.participation', 'forcer_auteur'),
  ('public.participation', 'journal_participation'),
  ('public.point_attention', 'forcer_auteur'),
  ('public.point_mention', 'ajout_seulement'),
  ('public.point_mention', 'ajout_seulement_vider'),
  ('public.point_mention', 'forcer_auteur'),
  ('public.point_mention', 'mention_unique'),
  ('public.point_mention_retrait', 'ajout_seulement'),
  ('public.point_mention_retrait', 'ajout_seulement_vider'),
  ('public.point_mention_retrait', 'forcer_auteur'),
  ('public.point_suivi', 'forcer_auteur'),
  ('public.precision_sensible', 'ajout_seulement'),
  ('public.precision_sensible', 'ajout_seulement_vider'),
  ('public.precision_sensible', 'controler_precision'),
  ('public.precision_sensible', 'forcer_auteur'),
  ('public.reunion', 'forcer_auteur'),
  ('public.reunion', 'journal_reunion'),
  ('public.session', 'forcer_auteur'),
  ('public.signalement', 'ajout_seulement'),
  ('public.signalement', 'ajout_seulement_vider'),
  ('public.signalement', 'forcer_auteur'),
  ('public.signalement_suivi', 'ajout_seulement'),
  ('public.signalement_suivi', 'ajout_seulement_vider'),
  ('public.signalement_suivi', 'forcer_auteur'),
  ('public.validation', 'ajout_seulement'),
  ('public.validation', 'ajout_seulement_vider'),
  ('public.validation', 'forcer_auteur'),
  ('public.ventilation_sensible', 'ajout_seulement'),
  ('public.ventilation_sensible', 'ajout_seulement_vider'),
  ('public.ventilation_sensible', 'forcer_auteur'),
  ('public.ventilation_sensible', 'verifier_ventilations')
$$, 'les 68 triggers de public et de private : auteur imposé, journal, contrôles, mention unique, inaltérabilité, termes complets, et eux seuls');

-- Données de référence (migration, production comprise)
select results_eq($$
  select code, libelle, nature from public.indicateur where ministere_id is null order by ordre
$$, $$ values ('service', 'STARs au service', 'dimanche'), ('actifs', 'STARs actifs', 'a_ce_jour'),
              ('en_fij', 'Dont en FIJ', 'a_ce_jour') $$, 'les trois indicateurs communs');
select results_eq($$ select nom from public.ministere where code = 'fij' $$, $$ values ('FIJ') $$,
  'le ministère FIJ porte le code fij');

select * from finish();
rollback;
