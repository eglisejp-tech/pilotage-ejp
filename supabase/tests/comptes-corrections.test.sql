-- Corrections de l'écran 13 (décision T74, migration 20261025192715_comptes_corrections.sql) :
-- correction de l'adresse d'un compte jamais activé, suppression d'un ministère vide, lectures
-- v_ministeres_supprimables et v_comptes_jamais_actives, journal, inaltérabilité.
-- Les droits d'exécution des quatre fonctions serveur (anonyme, aal1, aal2, appelants qui ne sont
-- pas EJP Tech) sont dans comptes-serveur-droits.test.sql.
-- Les données d'essai de chaque cas de refus s'ajoutent sans les triggers de leur table (désactivés
-- le temps d'un ajout, dans cette transaction annulée) : seule compte la ligne qui vise le
-- ministère, pas le parcours de saisie, que d'autres fichiers testent.
-- Revu par T75 (migration 20261026090000_supprimer_partout.sql) : chaque cas a sa raison
-- (private.raisons_suppression_ministere, un code et un nombre) ; le cas « session saisie »
-- (une session saisie par un AUTRE ministère qui l'attend) ne bloque plus, c'est l'erreur de
-- T74 qui refusait EJP TECH ; une trace écrite par le compte (journal, déclaration, conditions)
-- dit que le compte a été activé. Les six critères d'acceptation de T75 sont dans
-- comptes-suppression.test.sql.
begin;

select plan(107);

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

-- Comptes : EJP Tech (appelant, session aal2), l'administration de l'église, un compte du conseil
-- invité (adresse non confirmée), un ministère « à activer » (adresse confirmée, un facteur non
-- vérifié et une session), un compte activé, un compte désactivé jamais activé, et un utilisateur
-- Auth qui a déjà l'adresse « prise ».
create temp table ctx as
select tests.creer_compte('essai-t74-tech@exemple.test', 'admin_plateforme') as tech,
       tests.creer_compte('essai-t74-eglise@exemple.test', 'admin_eglise') as eglise,
       tests.creer_compte('essai-t74-invite@exemple.test', 'conseil') as invite,
       tests.creer_compte('essai-t74-active@exemple.test', 'conseil') as active,
       tests.creer_compte('essai-t74-inactif@exemple.test', 'conseil') as inactif,
       tests.creer_ministere('Essai T74 à activer') as ma,
       gen_random_uuid() as sa,
       gen_random_uuid() as pris;
alter table ctx add column aact uuid;
update ctx set aact = tests.creer_compte('essai-t74-a-activer@exemple.test', 'ministere', ma);
insert into auth.users (id, email) select pris, 'essai-t74-prise@exemple.test' from ctx;
update auth.users set email_confirmed_at = now()
 where id in ((select aact from ctx), (select active from ctx), (select pris from ctx));
-- Exception voulue (comme rls-comptes-matrice) : pgTAP ne peut pas appeler l'API Auth.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
select gen_random_uuid(), active, 'Essai T74', 'totp', 'verified', now(), now() from ctx;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
select gen_random_uuid(), aact, 'Essai T74', 'totp', 'unverified', now(), now() from ctx;
insert into auth.sessions (id, user_id, aal)
select sa, tech, 'aal2'::auth.aal_level from ctx
union all select gen_random_uuid(), aact, 'aal1'::auth.aal_level from ctx;
update public.compte set desactive_le = now() where user_id = (select inactif from ctx);
-- Ce que l'adresse fausse a pu ouvrir sur le compte « à activer » : une connexion Google
-- (identité rattachée) et un lien à usage unique ; plus son identité email, qui reste
-- (migration 20261025211216, même exception que mfa_factors ci-dessus).
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), 'essai-t74-google', aact, '{"sub": "essai-t74-google"}'::jsonb, 'google', now(), now(), now()
  from ctx;
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), aact::text, aact, jsonb_build_object('sub', aact::text), 'email', now(), now(), now()
  from ctx;
insert into auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at)
select gen_random_uuid(), aact, 'confirmation_token', 'essai-t74-jeton', 'essai-t74', now(), now() from ctx;

-- Ministères de la suppression : vide (désactivé, son compte invité, ses indicateurs prévus de la
-- liste « tech », calculs compris, son lien à la liste, une place dans une session sans saisie),
-- vide sans compte, et un par cas de refus.
alter table ctx add column vide uuid, add column cvide uuid, add column sans_compte uuid,
  add column s0 uuid, add column fk uuid, add column cfk uuid;
update ctx set vide = tests.creer_ministere('Essai T74 vide'),
               sans_compte = tests.creer_ministere('Essai T74 sans compte'),
               fk = tests.creer_ministere('Essai T74 clé étrangère');
update ctx set cvide = tests.creer_compte('essai-t74-vide@exemple.test', 'ministere', vide),
               cfk = tests.creer_compte('essai-t74-cle@exemple.test', 'ministere', fk);
insert into auth.sessions (id, user_id, aal) select gen_random_uuid(), cvide, 'aal1'::auth.aal_level from ctx;
grant select on ctx to service_role, authenticated, anon;

select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.creer_indicateurs_prevus((select vide from ctx), 'tech'), 8,
  'le ministère vide reçoit ses 8 indicateurs prévus (liste tech, deux calculs)');
select tests.deconnecter();
insert into public.session (type, date, intitule, saisi_par)
select 'autre', date '2026-12-06', 'Essai T74 sans saisie', tech from ctx;
update ctx set s0 = (select s.id from public.session s where s.intitule = 'Essai T74 sans saisie');
insert into public.session_attendu (session_id, ministere_id) select s0, vide from ctx;
insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
select tech, vide, 'compte_cree', 'compte', cvide, '{"type": "ministere"}'::jsonb from ctx;
update public.ministere set desactive_le = now() where id = (select vide from ctx);
update public.compte set desactive_le = now() where user_id = (select cvide from ctx);
-- Clé étrangère restée hors des contrôles : une session déclarée au nom du compte.
insert into public.session (type, date, intitule, saisi_par)
select 'autre', date '2026-12-07', 'Essai T74 clé', cfk from ctx;

-- Un ministère par cas de refus, avec une seule ligne qui le vise.
create temp table cas (nom text primary key, ministere uuid not null);
insert into cas
select n, tests.creer_ministere('Essai T74 ' || n)
  from unnest(array['mesure', 'participation', 'carte FIJ', 'statistique FIJ', 'répartition', 'précision',
                    'point', 'mention de point', 'événement', 'mention d''événement', 'réunion',
                    'signalement', 'demande', 'validation', 'retrait', 'session saisie', 'journal',
                    'déclaration', 'conditions', 'compte activé', 'activation refaite']) as n;
alter table cas add column compte uuid;
update cas set compte = tests.creer_compte('essai-t74-cas-' || md5(nom) || '@exemple.test', 'ministere', ministere)
 where nom in ('journal', 'déclaration', 'conditions', 'compte activé', 'activation refaite');
create function pg_temp.m(p_nom text) returns uuid language sql stable as $$
  select c.ministere from cas c where c.nom = p_nom $$;
create function pg_temp.c(p_nom text) returns uuid language sql stable as $$
  select c.compte from cas c where c.nom = p_nom $$;

alter table public.mesure disable trigger user;
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_par)
select i.id, pg_temp.m('mesure'), date '2026-10-18', 5, (select tech from ctx)
  from public.indicateur i where i.code = 'service';
alter table public.mesure enable trigger user;
alter table public.participation disable trigger user;
insert into public.participation (session_id, ministere_id, valeur, saisi_par)
select p.session_id, pg_temp.m('participation'), 3, (select tech from ctx) from public.participation p limit 1;
alter table public.participation enable trigger user;
alter table public.fij_departement disable trigger user;
insert into public.fij_departement (ministere_id, departement, valeur, saisi_par)
select pg_temp.m('carte FIJ'), '75', 2, tech from ctx;
alter table public.fij_departement enable trigger user;
alter table public.fij_statistique disable trigger user;
insert into public.fij_statistique (ministere_id, rubrique, departement, dimanche, valeur, saisi_par)
select pg_temp.m('statistique FIJ'), f.rubrique, f.departement, f.dimanche, f.valeur, (select tech from ctx)
  from public.fij_statistique f limit 1;
alter table public.fij_statistique enable trigger user;
alter table public.ventilation_sensible disable trigger user;
insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur, saisi_par)
select v.mesure_id, v.indicateur_id, pg_temp.m('répartition'), v.mois, v.categorie || ' essai', v.valeur, (select tech from ctx)
  from public.ventilation_sensible v limit 1;
alter table public.ventilation_sensible enable trigger user;
alter table public.precision_sensible disable trigger user;
insert into public.precision_sensible (mesure_id, indicateur_id, ministere_id, mois, texte, saisi_par)
select x.id, x.indicateur_id, pg_temp.m('précision'), date '2026-09-01', 'Précision d''essai T74.', (select tech from ctx)
  from public.mesure x
 where not exists (select 1 from public.precision_sensible p where p.mesure_id = x.id)
 limit 1;
alter table public.precision_sensible enable trigger user;
insert into public.point_attention (ministere_id, titre, saisi_par) select pg_temp.m('point'), 'Essai T74', tech from ctx;
alter table public.point_mention disable trigger user;
insert into public.point_mention (point_id, ministere_id, saisi_par)
select p.id, pg_temp.m('mention de point'), (select tech from ctx) from public.point_attention p
 where p.titre <> 'Essai T74' limit 1;
alter table public.point_mention enable trigger user;
insert into public.evenement (ministere_id, titre, saisi_par) select pg_temp.m('événement'), 'Essai T74', tech from ctx;
alter table public.evenement_mention disable trigger user;
insert into public.evenement_mention (evenement_id, ministere_id)
select e.id, pg_temp.m('mention d''événement') from public.evenement e where e.titre <> 'Essai T74' limit 1;
alter table public.evenement_mention enable trigger user;
insert into public.reunion (ministere_id, date, saisi_par) select pg_temp.m('réunion'), date '2026-11-08', tech from ctx;
alter table public.signalement disable trigger user;
insert into public.signalement (ministere_id, ecran, texte, saisi_par)
select pg_temp.m('signalement'), s.ecran, 'Signalement d''essai T74.', (select tech from ctx) from public.signalement s limit 1;
alter table public.signalement enable trigger user;
alter table public.demande_indicateur disable trigger user;
insert into public.demande_indicateur (indicateur_id, ministere_id, objet, libelle, saisi_par)
select i.id, pg_temp.m('demande'), 'correction', 'Essai T74', (select tech from ctx)
  from public.indicateur i where i.code = 'service';
alter table public.demande_indicateur enable trigger user;
alter table public.validation disable trigger user;
insert into public.validation (demande_id, ministere_id, decision, saisi_par)
select d.id, pg_temp.m('validation'), 'valide', (select tech from ctx) from public.demande_indicateur d
 where not exists (select 1 from public.validation v where v.demande_id = d.id) limit 1;
alter table public.validation enable trigger user;
alter table public.retrait_indicateur disable trigger user;
insert into public.retrait_indicateur (indicateur_id, ministere_id, etat_avant, motif, saisi_par)
select i.id, pg_temp.m('retrait'), 'actif', 'Retrait d''essai T74.', (select tech from ctx)
  from public.indicateur i
 where i.ministere_id is not null
   and not exists (select 1 from public.retrait_indicateur r where r.indicateur_id = i.id)
 limit 1;
alter table public.retrait_indicateur enable trigger user;
insert into public.session_attendu (session_id, ministere_id)
select p.session_id, pg_temp.m('session saisie') from public.participation p
 where p.ministere_id <> pg_temp.m('participation') limit 1;
insert into public.journal (compte, ministere_id, action, detail)
values (pg_temp.c('journal'), null, 'texte_relu', '{}'::jsonb);
alter table public.intervenant disable trigger user;
insert into public.intervenant (compte, session_auth, prenom, motif)
values (pg_temp.c('déclaration'), gen_random_uuid(), 'Essai', 'connexion');
alter table public.intervenant enable trigger user;
alter table public.acceptation_conditions disable trigger user;
insert into public.acceptation_conditions (compte, version, saisi_par)
values (pg_temp.c('conditions'), '2026-10-10', pg_temp.c('conditions'));
alter table public.acceptation_conditions enable trigger user;
update auth.users set email_confirmed_at = now() where id = pg_temp.c('compte activé');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), pg_temp.c('compte activé'), 'Essai T74', 'totp', 'verified', now(), now());
-- Activé un jour, puis « Refaire l'activation » : plus de facteur, mais la ligne de journal reste
-- (migration 20261025204627).
insert into public.journal (compte, ministere_id, action, cible, cible_id)
values ((select tech from ctx), pg_temp.m('activation refaite'), 'double_auth_reinitialisee', 'compte',
        pg_temp.c('activation refaite'));
grant select on cas to service_role, authenticated, anon;
-- Lus au nom de service_role, qui n'exécute ni pg_temp ni tests.
alter table ctx add column m_mesure uuid, add column m_active uuid, add column fij uuid;
update ctx set m_mesure = pg_temp.m('mesure'), m_active = pg_temp.m('compte activé'), fij = tests.ministere('FIJ');

-- 1. Pourquoi un ministère ne se supprime pas (un test par cas)

select is(private.refus_suppression_ministere((select vide from ctx)), null,
  'ministère vide (désactivé, indicateurs prévus, lien, session sans saisie, compte invité) : supprimable');
select is(private.refus_suppression_ministere((select sans_compte from ctx)), null, 'ministère vide sans compte : supprimable');
select is(private.refus_suppression_ministere(gen_random_uuid()), 'ministere_inconnu', 'ministère inconnu');
select is(private.refus_suppression_ministere(tests.ministere('FIJ')), 'ministere_de_reference',
  'FIJ (code posé par une migration) : jamais supprimé');
select is(private.refus_suppression_ministere(tests.ministere('Coordination')), 'ministere_de_reference',
  'Coordination (code posé par une migration) : jamais supprimé');
-- T75 : la session saisie par un autre ministère ne bloque plus ; une trace écrite par le compte
-- dit qu'il a été activé.
select is(private.refus_suppression_ministere(c.ministere),
          case when c.nom = 'session saisie' then null
               when c.nom in ('compte activé', 'activation refaite', 'journal', 'déclaration', 'conditions')
                 then 'compte_deja_active'
               else 'ministere_non_vide' end,
          'refus : ' || c.nom)
  from cas c order by c.nom;
-- T75 : la raison de chaque cas, son code et son nombre (une ligne visée), seule raison qui bloque.
select results_eq(
         format('select r.code, r.nombre from private.raisons_suppression_ministere(%L) r where r.bloque', c.ministere),
         case when r.code is null then 'select null::text, null::integer where false'
              else format('values (%L::text, 1)', r.code) end,
         'raison : ' || c.nom || coalesce(' (' || r.code || ')', ', aucune'))
  from cas c
  join (values ('mesure', 'chiffres'), ('participation', 'presences'), ('carte FIJ', 'carte_fij'),
               ('statistique FIJ', 'statistiques_fij'), ('répartition', 'repartitions'),
               ('précision', 'precisions'), ('point', 'points'), ('mention de point', 'mentions_points'),
               ('événement', 'evenements'), ('mention d''événement', 'mentions_evenements'),
               ('réunion', 'reunions'), ('signalement', 'signalements'), ('demande', 'demandes'),
               ('validation', 'validations'), ('retrait', 'retraits'), ('session saisie', null),
               ('journal', 'compte_deja_active'), ('déclaration', 'compte_deja_active'),
               ('conditions', 'compte_deja_active'), ('compte activé', 'compte_deja_active'),
               ('activation refaite', 'compte_deja_active')) as r(nom, code) on r.nom = c.nom
 order by c.nom;

-- 2. Lectures de l'écran : EJP Tech seul, en aal2
select is(tests.essai((select tech from ctx), 'aal2',
  'select 1 from public.v_ministeres_supprimables where ministere_id in (select vide from ctx union all select sans_compte from ctx union all select ministere from cas)',
  'lignes'), '3', 'EJP Tech en aal2 lit les deux ministères vides et celui de la session saisie par un autre (T75), aucun des cas de refus');
select is(tests.essai((select tech from ctx), 'aal1',
  'select 1 from public.v_ministeres_supprimables', 'lignes'), '0', 'EJP Tech en aal1 ne lit rien');
select is(tests.essai(p.compte, 'aal2', 'select 1 from public.v_ministeres_supprimables', 'lignes'), '0',
          p.profil || ' ne lit aucun ministère supprimable')
  from (values ('le ministère Communication', tests.compte('Ministère Communication')),
               ('le berger', tests.compte('Berger')), ('le conseil', tests.compte('Conseil, compte 1')),
               ('l''administration de l''église', tests.compte('Administration de l''église'))) as p(profil, compte);
select is(tests.essai(null, null, 'select 1 from public.v_ministeres_supprimables', 'lignes'), '42501',
  'l''anonyme est refusé (v_ministeres_supprimables)');
select is(tests.essai((select tech from ctx), 'aal2',
  'select user_id from public.v_comptes_jamais_actives where user_id in (select invite from ctx union all select aact from ctx union all select inactif from ctx union all select active from ctx union all select eglise from ctx)',
  'lignes'), '3', 'EJP Tech lit les comptes jamais activés (invité, à activer, désactivé), ni l''activé ni l''administration');
select is(tests.essai((select tech from ctx), 'aal1', 'select 1 from public.v_comptes_jamais_actives', 'lignes'), '0',
  'EJP Tech en aal1 ne lit aucun compte jamais activé');
select is(tests.essai(p.compte, 'aal2', 'select 1 from public.v_comptes_jamais_actives', 'lignes'), '0',
          p.profil || ' ne lit aucun compte jamais activé')
  from (values ('le ministère Communication', tests.compte('Ministère Communication')),
               ('le berger', tests.compte('Berger')), ('le conseil', tests.compte('Conseil, compte 1')),
               ('l''administration de l''église', tests.compte('Administration de l''église'))) as p(profil, compte);
select is(tests.essai(null, null, 'select 1 from public.v_comptes_jamais_actives', 'lignes'), '42501',
  'l''anonyme est refusé (v_comptes_jamais_actives)');

-- 3. Correction d'une adresse
set local role service_role;
select lives_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                   (select invite from ctx), 'essai-t74-nouvelle@exemple.test') $$,
  'contrôle accepté pour une invitation en attente');
select lives_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                   (select invite from ctx), 'essai-t74-invite@exemple.test') $$,
  'contrôle accepté pour l''adresse actuelle du compte (correction interrompue qui se refait)');
select throws_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                    (select active from ctx), 'essai-t74-nouvelle@exemple.test') $$,
  'P0001', 'compte_deja_active', 'compte activé : refusé');
select throws_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                    (select invite from ctx), 'Essai-T74-Prise@exemple.test ') $$,
  'P0001', 'adresse_deja_utilisee', 'adresse d''un autre utilisateur Auth (casse et espaces ignorés) : refusée');
select throws_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                    (select tech from ctx), 'essai-t74-nouvelle@exemple.test') $$,
  'P0001', 'propre_compte', 'le compte de l''appelant : refusé');
select throws_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                    (select eglise from ctx), 'essai-t74-nouvelle@exemple.test') $$,
  'P0001', 'type_interdit', 'le compte de l''administration de l''église : refusé');
select lives_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                   (select inactif from ctx), 'essai-t74-nouvelle@exemple.test') $$,
  'compte désactivé jamais activé : accepté (la réactivation corrige d''abord, migration 20261025211216)');
select throws_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                    gen_random_uuid(), 'essai-t74-nouvelle@exemple.test') $$,
  'P0001', 'compte_inconnu', 'compte inconnu : refusé');
select throws_ok($$ select public.serveur_controler_correction_adresse((select tech from ctx), (select sa from ctx),
                    (select invite from ctx), 'sans-arobase') $$,
  'P0001', 'requete_invalide', 'adresse illisible : refusée');
select throws_ok($$ select public.serveur_corriger_adresse((select tech from ctx), (select sa from ctx),
                    (select aact from ctx), 'essai-t74-corrigee@exemple.test') $$,
  'P0001', 'adresse_non_modifiee', 'écriture refusée tant qu''Auth garde l''ancienne adresse');
-- Préparation, avant l'appel à Auth : l'adresse fausse perd ses accès.
select lives_ok($$ select public.serveur_preparer_correction_adresse((select tech from ctx), (select sa from ctx),
                   (select aact from ctx), 'essai-t74-corrigee@exemple.test') $$,
  'préparation acceptée pour un compte « à activer »');
select throws_ok($$ select public.serveur_preparer_correction_adresse((select tech from ctx), (select sa from ctx),
                    (select active from ctx), 'essai-t74-corrigee@exemple.test') $$,
  'P0001', 'compte_deja_active', 'préparation refusée pour un compte activé');
reset role;
select ok(not exists (select 1 from auth.sessions s where s.user_id = (select aact from ctx))
          and not exists (select 1 from auth.identities i where i.user_id = (select aact from ctx) and i.provider = 'google')
          and exists (select 1 from auth.identities i where i.user_id = (select aact from ctx) and i.provider = 'email')
          and not exists (select 1 from auth.one_time_tokens t where t.user_id = (select aact from ctx))
          and (select u.email from auth.users u where u.id = (select aact from ctx)) = 'essai-t74-a-activer@exemple.test'
          and not exists (select 1 from public.journal j where j.cible_id = (select aact from ctx)),
  'préparation : sessions, identité Google et liens à usage unique supprimés, identité email gardée, rien d''autre');
-- Ce que fait l'Edge Function dans Auth avant l'écriture (adresse et mot de passe), et un accès
-- rouvert entre-temps : l'écriture le coupe de nouveau.
update auth.users set email = 'essai-t74-corrigee@exemple.test' where id = (select aact from ctx);
insert into auth.sessions (id, user_id, aal) select gen_random_uuid(), aact, 'aal1'::auth.aal_level from ctx;
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), 'essai-t74-google-2', aact, '{"sub": "essai-t74-google-2"}'::jsonb, 'google', now(), now(), now()
  from ctx;
alter table ctx add column journal_avant integer;
update ctx set journal_avant = (select count(*) from public.journal);
set local role service_role;
select lives_ok($$ select public.serveur_corriger_adresse((select tech from ctx), (select sa from ctx),
                   (select aact from ctx), 'essai-t74-corrigee@exemple.test') $$,
  'correction enregistrée pour un compte « à activer »');
reset role;
select ok((select u.email_confirmed_at is null from auth.users u where u.id = (select aact from ctx)),
  'correction : l''adresse n''est plus confirmée (l''invitation peut repartir)');
select ok(not exists (select 1 from auth.sessions s where s.user_id = (select aact from ctx))
          and exists (select 1 from auth.sessions s where s.id = (select sa from ctx))
          and not exists (select 1 from auth.identities i where i.user_id = (select aact from ctx) and i.provider <> 'email'),
  'correction : sessions et identité Google du compte supprimées, session de l''appelant gardée');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.cible_id = (select aact from ctx)
$$, $$ values ('adresse_corrigee'::text, (select tech from ctx), (select ma from ctx), 'compte'::text,
               '{"type": "ministere"}'::jsonb) $$,
  'correction : une ligne adresse_corrigee au nom d''EJP Tech, sans adresse');
select ok((select count(*) from public.journal) = (select journal_avant from ctx) + 1
          and (select m.desactive_le is null from public.ministere m where m.id = (select ma from ctx))
          and (select c.ministere_id = (select ma from ctx) and c.desactive_le is null
                 from public.compte c where c.user_id = (select aact from ctx)),
  'correction : le ministère et son compte ne bougent pas, une seule ligne de journal');

-- 4. Suppression
alter table ctx add column lignes_vide integer, add column indicateurs_vide integer;
update ctx set lignes_vide = (select count(*) from public.journal j where j.ministere_id = vide),
               indicateurs_vide = (select count(*) from public.indicateur i where i.ministere_id = vide);
select ok((select indicateurs_vide from ctx) = 8
          and exists (select 1 from public.indicateur_terme t join public.indicateur i on i.id = t.calcul_id
                       where i.ministere_id = (select vide from ctx))
          and exists (select 1 from private.ministere_modele x where x.ministere_id = (select vide from ctx)),
  'avant la suppression : 8 indicateurs, des termes de calcul et un lien à la liste');
set local role service_role;
select lives_ok($$ select public.serveur_controler_suppression_ministere((select tech from ctx), (select sa from ctx),
                   (select vide from ctx)) $$, 'contrôle de suppression accepté pour le ministère vide');
select throws_ok($$ select public.serveur_controler_suppression_ministere((select tech from ctx), (select sa from ctx),
                    (select m_mesure from ctx)) $$,
  'P0001', 'ministere_non_vide', 'contrôle de suppression refusé pour un ministère qui a une mesure');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx),
                    (select m_active from ctx)) $$,
  'P0001', 'compte_deja_active', 'suppression refusée pour un ministère dont le compte est activé');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx),
                    (select fij from ctx)) $$,
  'P0001', 'ministere_de_reference', 'suppression refusée pour FIJ');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx),
                    (select fk from ctx)) $$,
  'P0001', 'ministere_non_vide', 'une clé étrangère hors des contrôles (session déclarée par le compte) annule tout');
reset role;
select ok(exists (select 1 from public.ministere m where m.id = (select fk from ctx))
          and exists (select 1 from public.compte c where c.user_id = (select cfk from ctx))
          and not exists (select 1 from public.journal j
                           where j.action = 'ministere_supprime' and j.cible_id = (select fk from ctx)),
  'suppression annulée : le ministère, son compte et le journal restent tels quels');

set local role service_role;
select is(public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select vide from ctx)),
          array[(select cvide from ctx)], 'suppression du ministère vide : rend l''identifiant de son compte');
select is(public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx), (select sans_compte from ctx)),
          array[]::uuid[], 'suppression d''un ministère sans compte : aucun compte à supprimer dans Auth');
select throws_ok($$ select public.serveur_supprimer_ministere((select tech from ctx), (select sa from ctx),
                    (select vide from ctx)) $$,
  'P0001', 'ministere_inconnu', 'un ministère déjà supprimé est inconnu');
reset role;

select ok(not exists (select 1 from public.ministere m where m.id in ((select vide from ctx), (select sans_compte from ctx)))
          and not exists (select 1 from public.compte c where c.user_id = (select cvide from ctx)),
  'suppression : le ministère et son compte n''existent plus');
select ok(not exists (select 1 from public.indicateur i where i.ministere_id = (select vide from ctx))
          and not exists (select 1 from private.ministere_modele x where x.ministere_id = (select vide from ctx))
          and not exists (select 1 from public.session_attendu a where a.ministere_id = (select vide from ctx))
          and exists (select 1 from public.session s where s.id = (select s0 from ctx)),
  'suppression : ses indicateurs, son lien à la liste et sa place dans la session partent ; la session reste');
select ok(not exists (select 1 from auth.sessions s where s.user_id = (select cvide from ctx))
          and exists (select 1 from auth.users u where u.id = (select cvide from ctx)),
  'suppression : sessions du compte supprimées ; l''utilisateur Auth reste à l''Edge Function');
select ok((select count(*) from public.journal j where j.ministere_id = (select vide from ctx))
          = (select lignes_vide from ctx) + 1,
  'suppression : le journal garde toutes les lignes du ministère, plus une');
select results_eq($$
  select j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.action = 'ministere_supprime' and j.cible_id = (select vide from ctx)
$$, $$ values ((select tech from ctx), (select vide from ctx), 'ministere'::text,
               '{"nom": "Essai T74 vide", "comptes": 1, "sessions": 1, "indicateurs": 8}'::jsonb) $$,
  'suppression : une ligne ministere_supprime au nom d''EJP Tech, avec le nom et la session quittée (T75), jamais d''adresse');
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.v_journal where ministere_id = (select vide from ctx) and ministere_nom = ''Essai T74 vide'''),
  (select lignes_vide + 1 from ctx), 'v_journal : chaque ligne du ministère supprimé garde son nom');
select is((tests.lire((select tech from ctx), 'aal2',
  'select cible_texte from public.v_journal where action = ''compte_cree'' and cible_id = (select cvide from ctx)')
  -> 0 ->> 'cible_texte'), 'Ministère Essai T74 vide', 'v_journal : la ligne du compte supprimé garde son libellé');
select is(tests.compter(tests.compte('Administration de l''église'), 'aal2',
  'select 1 from public.v_journal where action = ''ministere_supprime'' and cible_id = (select vide from ctx) and ministere_nom = ''Essai T74 vide'''),
  1, 'l''administration de l''église lit la suppression (journal_lisible_administration)');
select is(tests.compter(tests.compte('Berger'), 'aal2',
  'select 1 from public.v_journal where action = ''ministere_supprime'' and cible_id = (select vide from ctx) and ministere_nom = ''Essai T74 vide'''),
  1, 'le berger lit la suppression, comme tout le journal (lit_tout)');
select is(tests.compter(tests.compte('Ministère Communication'), 'aal2',
  'select 1 from public.v_journal where ministere_id = (select vide from ctx) or cible_id = (select vide from ctx)'),
  0, 'un autre ministère ne lit aucune ligne du ministère supprimé, ni sa suppression');
select throws_ok($$ insert into public.journal (compte, ministere_id, action) values (null, (select vide from ctx), 'texte_relu') $$,
  'P0001', 'Ce ministère n''existe pas.', 'le journal refuse une ligne nouvelle pour un ministère supprimé');
select lives_ok($$ insert into public.ministere (nom) values ('Essai T74 vide') $$,
  'le nom d''un ministère supprimé redevient libre');

-- 5. Inaltérabilité hors de la suppression
select throws_ok($$ delete from public.indicateur where ministere_id = tests.ministere('Communication') $$,
  '42501', 'Un indicateur ne se supprime pas : il se retire.', 'un indicateur ne se supprime toujours pas');
select set_config('pilotage.suppression_ministere', (select vide from ctx)::text, true);
select throws_ok($$ delete from public.indicateur where ministere_id = tests.ministere('Communication') $$,
  '42501', 'Un indicateur ne se supprime pas : il se retire.',
  'le réglage d''un autre ministère ne permet de supprimer aucun indicateur');
select throws_ok($$ delete from private.ministere_modele $$,
  '42501', 'La table ministere_modele est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ni un lien à une liste d''un autre ministère');
select set_config('pilotage.suppression_ministere', '', true);
select throws_ok($$ update public.indicateur_terme set decalage = decalage $$,
  '42501', 'La table indicateur_terme est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'un terme de calcul ne se modifie toujours pas');
select throws_ok($$ delete from public.indicateur_terme $$,
  '42501', 'La table indicateur_terme est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'un terme de calcul ne se supprime toujours pas');

select * from finish();
rollback;
