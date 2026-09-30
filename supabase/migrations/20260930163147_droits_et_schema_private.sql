-- Étape 1, migration 1 sur 7 : droits par défaut et schéma private (BRIEF, section 7).
--
-- Un nouveau projet Supabase ne donne plus de droits automatiques à anon, authenticated et
-- service_role sur public. On rend le local identique au distant : aucun droit implicite.
-- Chaque migration écrit ensuite ses propres GRANT, objet par objet.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role, public;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

-- Schéma des fonctions internes. Il n'est jamais exposé dans l'API : il ne figure pas dans
-- api.schemas de supabase/config.toml. Les fonctions security definer vivent ici seulement.
create schema private;
revoke all on schema private from public;

-- Les politiques RLS et les vues appellent des fonctions de private au nom du compte connecté.
-- anon n'a aucun droit sur ce schéma.
grant usage on schema private to authenticated;
