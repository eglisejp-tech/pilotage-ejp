-- Vérifie que la base locale fournit ce dont les migrations et les politiques RLS dépendent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select has_schema('public', 'le schéma public existe');
select has_schema('auth', 'le schéma auth de Supabase existe');
select has_function('auth', 'uid', 'auth.uid() est fournie par Supabase');
select has_function('auth', 'jwt', 'auth.jwt() est fournie par Supabase (lecture du niveau aal)');

select * from finish();
rollback;
