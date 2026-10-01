-- Fonctions serveur de relancer-invitation et reactiver-compte (migration
-- comptes_relance_reactivation), appelées avec la clé secrète (service_role) : droits, appelant,
-- invitation en attente, compte désactivé, conflits, effets et journal au nom de l'appelant.
begin;

select plan(21);

-- pgTAP au nom de service_role (droits annulés avec la transaction), comme comptes-serveur.
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

-- Comptes de test : invitation en attente (adresse non confirmée), adresse confirmée, compte
-- désactivé, compte de ministère désactivé avec son ministère, ancien berger désactivé.
create temp table ctx as
select tests.creer_compte('essai-rr-admin@exemple.test', 'admin_eglise') as admin,
       tests.creer_compte('essai-rr-conseil@exemple.test', 'conseil') as conseil,
       tests.creer_compte('essai-rr-invite@exemple.test', 'conseil') as invite,
       tests.creer_compte('essai-rr-confirme@exemple.test', 'conseil') as confirme,
       tests.creer_compte('essai-rr-inactif@exemple.test', 'conseil') as inactif,
       tests.creer_ministere('Essai Relance Ministère') as m;
alter table ctx add column cm uuid, add column ancien_berger uuid, add column berger uuid;
update ctx set cm = tests.creer_compte('essai-rr-ministere@exemple.test', 'ministere', m);
update ctx set ancien_berger = tests.creer_compte('essai-rr-ancien-berger@exemple.test', 'berger');
-- tests.creer_compte désactive l'ancien berger en créant le nouveau.
update ctx set berger = tests.creer_compte('essai-rr-berger@exemple.test', 'berger');
update auth.users set email_confirmed_at = now() where id = (select confirme from ctx);
update public.compte set desactive_le = now() where user_id in ((select inactif from ctx), (select cm from ctx));
update public.ministere set desactive_le = now() where id = (select m from ctx);
-- Ministère actif dont l'ancien compte est désactivé et le nouveau actif.
alter table ctx add column m2 uuid, add column cm2a uuid, add column cm2b uuid;
update ctx set m2 = tests.creer_ministere('Essai Relance Doublon');
update ctx set cm2a = tests.creer_compte('essai-rr-doublon-a@exemple.test', 'ministere', m2);
update public.compte set desactive_le = now() where user_id = (select cm2a from ctx);
update ctx set cm2b = tests.creer_compte('essai-rr-doublon-b@exemple.test', 'ministere', m2);
-- Sessions aal2 des appelants (la base exige la session de l'appelant, décision T15).
alter table ctx add column sa uuid default gen_random_uuid(), add column sc uuid default gen_random_uuid();
insert into auth.sessions (id, user_id, aal)
select sa, admin, 'aal2'::auth.aal_level from ctx
union all select sc, conseil, 'aal2'::auth.aal_level from ctx;
grant select on ctx to service_role, authenticated;

-- L'administration, même en aal2, n'appelle pas ces fonctions directement
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.serveur_relancer_invitation((select admin from ctx), (select sa from ctx), (select invite from ctx)) $$,
  '42501', null, 'authenticated ne peut pas appeler serveur_relancer_invitation');
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select cm from ctx)) $$,
  '42501', null, 'authenticated ne peut pas appeler serveur_reactiver_compte');
select tests.deconnecter();

set local role service_role;
-- Appelant : un compte actif de l'administration
select throws_ok($$ select public.serveur_relancer_invitation((select conseil from ctx), (select sc from ctx), (select invite from ctx)) $$,
  '42501', 'appelant_non_autorise', 'un compte du conseil ne relance pas d''invitation');
select throws_ok($$ select public.serveur_reactiver_compte((select conseil from ctx), (select sc from ctx), (select cm from ctx)) $$,
  '42501', 'appelant_non_autorise', 'un compte du conseil ne réactive pas de compte');

-- Relance : invitation encore en attente, compte actif, autre que l'appelant
select lives_ok($$ select public.serveur_controler_relance((select admin from ctx), (select sa from ctx), (select invite from ctx)) $$,
  'contrôle de relance accepté pour une invitation en attente');
select throws_ok($$ select public.serveur_controler_relance((select admin from ctx), (select sa from ctx), (select confirme from ctx)) $$,
  'P0001', 'invitation_deja_acceptee', 'relance refusée pour une adresse déjà confirmée');
select throws_ok($$ select public.serveur_controler_relance((select admin from ctx), (select sa from ctx), (select admin from ctx)) $$,
  'P0001', 'propre_compte', 'relance refusée pour le compte de l''appelant');
select throws_ok($$ select public.serveur_controler_relance((select admin from ctx), (select sa from ctx), (select inactif from ctx)) $$,
  'P0001', 'compte_desactive', 'relance refusée pour un compte désactivé');
select lives_ok($$ select public.serveur_relancer_invitation((select admin from ctx), (select sa from ctx), (select invite from ctx)) $$,
  'relance enregistrée');

-- Réactivation : compte désactivé seulement, sans conflit
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select invite from ctx)) $$,
  'P0001', 'compte_actif', 'un compte actif n''est pas réactivé');
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), gen_random_uuid()) $$,
  'P0001', 'compte_inconnu', 'compte inconnu refusé');
select lives_ok($$ select public.serveur_controler_reactivation((select admin from ctx), (select sa from ctx), (select cm from ctx)) $$,
  'contrôle de réactivation accepté pour un compte de ministère désactivé');
select lives_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select cm from ctx)) $$,
  'réactivation d''un compte de ministère');
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select cm from ctx)) $$,
  'P0001', 'compte_actif', 'un compte déjà réactivé est refusé');
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select ancien_berger from ctx)) $$,
  'P0001', 'berger_deja_actif', 'l''ancien berger n''est pas réactivé tant qu''un berger est actif');
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select admin from ctx)) $$,
  'P0001', 'propre_compte', 'l''administration ne réactive pas son propre compte');
select throws_ok($$ select public.serveur_reactiver_compte((select admin from ctx), (select sa from ctx), (select cm2a from ctx)) $$,
  'P0001', 'ministere_a_deja_un_compte', 'l''ancien compte n''est pas réactivé quand son ministère a un compte actif');
reset role;

select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.cible_id = (select invite from ctx)
$$, $$ values ('invitation_relancee'::text, (select admin from ctx), null::uuid, 'compte'::text, '{}'::jsonb) $$,
  'relance : une ligne invitation_relancee au nom de l''administration');
select ok((select c.desactive_le is null from public.compte c where c.user_id = (select cm from ctx))
          and (select m.desactive_le is null from public.ministere m where m.id = (select m from ctx)),
  'réactivation : le compte et son ministère redeviennent actifs');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.cible_id = (select cm from ctx)
$$, $$ values ('compte_reactive'::text, (select admin from ctx), (select m from ctx), 'compte'::text,
               '{"type": "ministere"}'::jsonb) $$,
  'réactivation : une ligne compte_reactive au nom de l''administration');
select ok((select c.desactive_le is not null from public.compte c where c.user_id = (select ancien_berger from ctx))
          and not exists (select 1 from public.journal j where j.cible_id = (select ancien_berger from ctx)),
  'réactivation refusée : rien n''est écrit');

select * from finish();
rollback;
