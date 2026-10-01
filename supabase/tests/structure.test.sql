-- Structure de sécurité (BRIEF, sections 6, 7 et 8) : tables et vues attendues, RLS partout,
-- politique restrictive aal2, GRANT exacts, fonctions security definer seulement dans private,
-- search_path vide, droits d'exécution, triggers d'intégrité, données de référence.
-- Une table ou une vue ajoutée sans mettre ce fichier à jour fait échouer les tests.
begin;

select plan(80);

-- Objets attendus
select tables_are('public', array[
  'ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
  'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
  'point_suivi', 'journal', 'moderation'
]::name[], 'public contient les 16 tables du modèle, rien de plus');
select views_are('public', array[
  'v_semaine', 'v_derniere_mesure', 'v_mesure_dimanche', 'v_total_dimanche', 'v_total_a_ce_jour',
  'v_pourcentage_fij', 'v_carte_fij', 'v_participation_courante', 'v_session_completude',
  'v_ecart_dimanche', 'v_ecart_session', 'v_evenement', 'v_prochaine_reunion', 'v_point', 'v_journal',
  'v_tableau_ministeres', 'v_textes_a_relire', 'v_etat_comptes'
]::name[], 'public contient les 18 vues de lecture, rien de plus');

-- RLS et politiques
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity
$$, 'RLS activée sur toutes les tables de public');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and not exists (
       select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname
          and p.policyname = 'double_authentification' and p.permissive = 'RESTRICTIVE'
          and p.roles = array['authenticated']::name[] and p.qual like '%aal2%'
          and ((p.cmd = 'ALL' and p.with_check like '%aal2%')
               or (c.relname = 'compte' and p.cmd = 'SELECT' and p.qual like '%auth.uid()%')))
$$, 'chaque table a la politique restrictive aal2 (using et with check ; compte : lecture de sa propre ligne en aal1)');
select is_empty($$
  select p.tablename, p.policyname from pg_policies p
   where p.schemaname = 'public' and p.permissive = 'PERMISSIVE' and p.cmd not in ('SELECT', 'INSERT')
$$, 'aucune politique permissive update, delete ou all');
select is_empty($$
  select p.tablename, p.policyname from pg_policies p
   where p.schemaname = 'public' and p.roles <> array['authenticated']::name[]
$$, 'toutes les politiques visent authenticated seulement (rien pour anon)');
select results_eq($$
  select p.tablename::text collate "default" from pg_policies p
   where p.schemaname = 'public' and p.cmd = 'INSERT' order by p.tablename
$$, $$ values ('evenement_etat'), ('fij_departement'), ('mesure'), ('participation'), ('reunion') $$,
  'politiques d''ajout : les cinq tables remplies directement par les ministères (evenement passe par l''API)');

-- GRANT des tables : exactement la matrice
select table_privs_are('public', t.nom::name, 'authenticated',
         case when t.nom in ('mesure', 'fij_departement', 'participation', 'evenement_etat', 'reunion')
              then array['INSERT', 'SELECT'] else array['SELECT'] end::name[],
         'authenticated : droits exacts sur ' || t.nom)
  from unnest(array['ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
                    'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
                    'point_suivi', 'journal', 'moderation']) as t(nom)
 order by t.nom;
select table_privs_are('public', t.nom::name, 'service_role',
         case when t.nom in ('ministere', 'compte') then array['INSERT', 'SELECT', 'UPDATE']
              when t.nom = 'journal' then array['INSERT']
              else array[]::text[] end::name[],
         'service_role : droits exacts sur ' || t.nom || ' (Edge Functions)')
  from unnest(array['ministere', 'compte', 'indicateur', 'mesure', 'fij_departement', 'session', 'session_attendu',
                    'participation', 'evenement', 'evenement_etat', 'reunion', 'point_attention', 'point_mention',
                    'point_suivi', 'journal', 'moderation']) as t(nom)
 order by t.nom;
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
     and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('anon', c.oid, 'INSERT')
          or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
          or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_table_privilege('anon', c.oid, 'REFERENCES')
          or has_table_privilege('anon', c.oid, 'TRIGGER'))
$$, 'anon n''a aucun droit sur aucune table ni vue de public');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
     and (has_table_privilege('authenticated', c.oid, 'UPDATE') or has_table_privilege('authenticated', c.oid, 'DELETE')
          or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
          or has_table_privilege('authenticated', c.oid, 'REFERENCES')
          or has_table_privilege('authenticated', c.oid, 'TRIGGER'))
$$, 'authenticated n''a aucun droit update, delete ni truncate, sur aucune table');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
     and (has_sequence_privilege('anon', c.oid, 'USAGE') or has_sequence_privilege('anon', c.oid, 'SELECT')
          or has_sequence_privilege('anon', c.oid, 'UPDATE')
          or has_sequence_privilege('authenticated', c.oid, 'UPDATE'))
$$, 'aucun droit sur les séquences pour anon, ni update pour authenticated');

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
select is_empty($$
  select p.oid::regprocedure from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
$$, 'aucune fonction security definer dans public');
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
                                    'serveur_creer_compte', 'serveur_desactiver_compte', 'serveur_reinitialiser_2fa')))
$$, 'aucune fonction de public ni de private n''est exécutable par anon, ni par service_role hors fonctions serveur des comptes');
select results_eq($$
  select p.proname::text collate "default" from pg_proc p
   where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'EXECUTE')
   order by p.proname
$$, $$ values ('ajouter_evenement'), ('changer_statut_point'), ('creer_point'), ('declarer_session'), ('marquer_relu'),
              ('marquer_traite'), ('masquer_texte'), ('modifier_session'), ('supprimer_session') $$,
  'les 9 fonctions de l''API sont exécutables par authenticated, et elles seules dans public');
select results_eq($$
  select p.proname::text collate "default" from pg_proc p
   where p.pronamespace = 'private'::regnamespace and p.prosecdef
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and p.proname in ('ajouter_evenement', 'creer_point', 'changer_statut_point', 'marquer_traite', 'declarer_session',
                       'modifier_session', 'supprimer_session', 'marquer_relu', 'masquer_texte')
   order by p.proname
$$, $$ values ('ajouter_evenement'), ('changer_statut_point'), ('creer_point'), ('declarer_session'), ('marquer_relu'),
              ('marquer_traite'), ('masquer_texte'), ('modifier_session'), ('supprimer_session') $$,
  'les 9 parties private de l''API sont security definer et appelables par authenticated');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
   where p.pronamespace = 'private'::regnamespace
     and p.proname in ('ajouter_evenement', 'creer_point', 'changer_statut_point', 'marquer_traite', 'declarer_session',
                       'modifier_session', 'supprimer_session', 'marquer_relu', 'masquer_texte')
     and regexp_replace(substring(p.prosrc from position('begin' in p.prosrc) + 5), '^\s+', '')
         not like 'perform private.exige_aal2();%'
$$, 'chaque fonction de l''API commence par perform private.exige_aal2()');
select is_empty($$
  select p.proname from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.prosrc not like '%private.' || p.proname || '(%'
$$, 'chaque fonction publique de l''API appelle sa partie private');
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
