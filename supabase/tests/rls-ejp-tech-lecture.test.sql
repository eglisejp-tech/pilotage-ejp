-- EJP Tech lit tout comme le berger, en lecture seule (docs/decisions.md, T29 ; BRIEF, section 7,
-- « Matrice des droits » et « Tests obligatoires ») : chaque table et chaque vue lue par le
-- berger rend les mêmes lignes à EJP Tech ; la modération reste à EJP Tech, l'état des comptes à
-- l'administration ; EJP Tech n'ajoute rien, n'appelle aucune fonction d'action du berger, du
-- conseil, d'un ministère ou de l'administration, et ne lit rien en aal1.
begin;

select plan(135);

-- Jeu d'essai : comptes du jeu d'exemple, plus un ministère A qui crée un point (il mentionne
-- Communication), un événement et sa prochaine réunion.
create temp table ctx as
select tests.creer_ministere('EJP Tech lecture A') as a_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       (select s.id from public.session s where s.type = 'batir' and s.date = private.dimanche_reference() - 1) as batir,
       private.dimanche_reference() as dimanche;
alter table ctx add column a uuid, add column p1 uuid, add column ev uuid, add column reu uuid;
update ctx set a = tests.creer_compte('ejptech-lecture-a@exemple.test', 'ministere', a_m);
grant select on ctx to authenticated;

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.creer_point('EJP Tech lecture, point', 'Description du point', 'Décision attendue', 'haute',
    private.aujourdhui() + 7, array[(select com_m from ctx)])
$$, 'jeu d''essai : A crée un point qui mentionne Communication');
select lives_ok($$ select public.ajouter_evenement('EJP Tech lecture, événement', private.aujourdhui() + 10, 'brouillon') $$,
  'jeu d''essai : A ajoute un événement');
select lives_ok($$
  insert into public.reunion (ministere_id, date, heure, objet)
  select ctx.a_m, private.aujourdhui() + 3, '20:00', 'EJP Tech lecture, réunion' from ctx
$$, 'jeu d''essai : A déclare sa prochaine réunion');
select tests.deconnecter();

update ctx set p1 = (select p.id from public.point_attention p where p.titre = 'EJP Tech lecture, point'),
               ev = (select e.id from public.evenement e where e.titre = 'EJP Tech lecture, événement'),
               reu = (select r.id from public.reunion r where r.objet = 'EJP Tech lecture, réunion');

select ok((select count(*) from ctx
            where berger is not null and conseil is not null and admin is not null and tech is not null
              and com is not null and service is not null and batir is not null and a is not null
              and p1 is not null and ev is not null and reu is not null) = 1,
  'le jeu d''exemple et le jeu d''essai fournissent les comptes, le point, l''événement et la réunion');

-- Lectures : chaque table et chaque vue que lit le berger, en aal2 puis en aal1.
create temp table relation (ordre integer primary key, nom text not null);
insert into relation (ordre, nom) values
  (1, 'ministere'), (2, 'compte'), (3, 'indicateur'), (4, 'mesure'), (5, 'fij_departement'),
  (6, 'session'), (7, 'session_attendu'), (8, 'participation'), (9, 'evenement'), (10, 'evenement_etat'),
  (11, 'reunion'), (12, 'point_attention'), (13, 'point_mention'), (14, 'point_suivi'), (15, 'journal'),
  (16, 'v_semaine'), (17, 'v_derniere_mesure'), (18, 'v_mesure_dimanche'), (19, 'v_total_dimanche'),
  (20, 'v_total_a_ce_jour'), (21, 'v_pourcentage_fij'), (22, 'v_carte_fij'), (23, 'v_participation_courante'),
  (24, 'v_session_completude'), (25, 'v_ecart_dimanche'), (26, 'v_ecart_session'), (27, 'v_evenement'),
  (28, 'v_prochaine_reunion'), (29, 'v_point'), (30, 'v_journal'), (31, 'v_tableau_ministeres');

-- 31 relations x 3 essais = 93 assertions.
create function pg_temp.lectures() returns setof text
language plpgsql as $$
declare
  c record;
  r record;
  v_requete text;
  v_berger jsonb;
begin
  select * into c from ctx;
  for r in select * from relation order by ordre loop
    v_requete := format('select * from public.%I', r.nom);
    v_berger := tests.lire(c.berger, 'aal2', v_requete);
    return next ok(jsonb_array_length(v_berger) > 0, format('%s : le berger lit des lignes', r.nom));
    return next is(tests.lire(c.tech, 'aal2', v_requete), v_berger,
      format('%s : EJP Tech lit les mêmes lignes que le berger', r.nom));
    return next is(tests.compter(c.tech, 'aal1', v_requete), case when r.nom = 'compte' then 1 else 0 end,
      format('%s : EJP Tech en aal1 ne lit rien (sauf sa ligne de compte)', r.nom));
  end loop;
end $$;

select * from pg_temp.lectures();

-- Ce qui ne change pas : la modération reste à EJP Tech, l'état des comptes à l'administration.
select is(tests.compter((select tech from ctx), 'aal2', 'select * from public.moderation'),
  (select count(*)::int from public.moderation), 'moderation : EJP Tech lit toutes les décisions');
select is(tests.compter((select berger from ctx), 'aal2', 'select * from public.moderation'), 0,
  'moderation : le berger n''en lit aucune');
select ok(tests.compter((select tech from ctx), 'aal2', 'select * from public.v_textes_a_relire') > 0,
  'file de relecture : EJP Tech la lit');
select is(tests.compter((select berger from ctx), 'aal2', 'select * from public.v_textes_a_relire'), 0,
  'file de relecture : le berger n''y lit rien');
select is(tests.compter((select tech from ctx), 'aal2', 'select * from public.v_etat_comptes'), 0,
  'état des comptes : EJP Tech n''y lit rien');
select ok(tests.compter((select admin from ctx), 'aal2', 'select * from public.v_etat_comptes') > 0,
  'état des comptes : l''administration de l''église le lit');

-- Lecture et actions : lit_tout ouvre la lecture, est_decideur (actions) ne change pas.
select is(tests.lire((select tech from ctx), 'aal2', 'select private.lit_tout() as l, private.est_decideur() as d'),
  '[{"d": false, "l": true}]'::jsonb, 'EJP Tech lit tout, mais n''est pas décideur');
select is(tests.lire((select berger from ctx), 'aal2', 'select private.lit_tout() as l, private.est_decideur() as d'),
  '[{"d": true, "l": true}]'::jsonb, 'le berger lit tout et décide');
select is(tests.lire((select conseil from ctx), 'aal2', 'select private.lit_tout() as l, private.est_decideur() as d'),
  '[{"d": true, "l": true}]'::jsonb, 'le conseil lit tout et décide');
select is(tests.lire((select admin from ctx), 'aal2', 'select private.lit_tout() as l'),
  '[{"l": false}]'::jsonb, 'l''administration de l''église ne lit pas tout');
select is(tests.lire((select com from ctx), 'aal2', 'select private.lit_tout() as l'),
  '[{"l": false}]'::jsonb, 'un ministère ne lit pas tout');
select is_empty($$
  select p.tablename from pg_policies p
   where p.schemaname = 'public' and p.cmd = 'INSERT'
     and (coalesce(p.with_check, '') like '%lit_tout%' or coalesce(p.qual, '') like '%lit_tout%')
$$, 'aucune politique d''ajout ne lit lit_tout : la lecture n''ouvre aucune écriture');
select is_empty($$
  select p.tablename from pg_policies p
   where p.schemaname = 'public' and p.policyname = 'lecture' and p.qual like '%est_decideur%'
$$, 'les politiques de lecture passent par lit_tout, plus par est_decideur');

-- Actions refusées à EJP Tech, en aal2 : rien ne doit changer.
create temp table avant as
select (select count(*) from public.mesure) as mesures,
       (select count(*) from public.fij_departement) as fij,
       (select count(*) from public.participation) as participations,
       (select count(*) from public.evenement) as evenements,
       (select count(*) from public.evenement_etat) as etats,
       (select count(*) from public.reunion) as reunions,
       (select count(*) from public.point_attention) as points,
       (select count(*) from public.point_mention) as mentions,
       (select count(*) from public.point_suivi) as suivis,
       (select count(*) from public.session) as sessions,
       (select count(*) from public.journal) as lignes,
       (select count(*) from public.moderation) as decisions;

select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, ctx.dimanche, 5 from ctx
$$, '42501', null, 'EJP Tech ne saisit aucun chiffre pour un ministère');
select throws_ok($$
  insert into public.fij_departement (ministere_id, departement, valeur)
  select m.id, '75', 1 from public.ministere m where m.code = 'fij'
$$, '42501', null, 'EJP Tech n''envoie pas la carte des FIJ');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.batir, ctx.com_m, 5, 0 from ctx
$$, '42501', null, 'EJP Tech ne saisit aucune présence');
select throws_ok($$ insert into public.evenement (ministere_id, titre) select ctx.a_m, 'Ajout direct' from ctx $$,
  '42501', null, 'EJP Tech n''ajoute aucun événement directement');
select throws_ok($$ select public.ajouter_evenement('Essai EJP Tech', private.aujourdhui() + 5, 'brouillon') $$,
  '42501', 'Seul un compte de ministère peut ajouter un événement.', 'EJP Tech n''ajoute aucun événement par l''API');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ctx.ev, private.aujourdhui() + 12, 'valide' from ctx
$$, '42501', null, 'EJP Tech ne change pas l''état d''un événement');
select throws_ok($$
  insert into public.reunion (ministere_id, date, heure)
  select ctx.a_m, private.aujourdhui() + 2, '19:00' from ctx
$$, '42501', null, 'EJP Tech ne déclare aucune réunion');
select throws_ok($$ insert into public.point_attention (ministere_id, titre) select ctx.a_m, 'Ajout direct' from ctx $$,
  '42501', null, 'EJP Tech n''ajoute aucun point directement');
select throws_ok($$ insert into public.point_mention (point_id, ministere_id) select ctx.p1, ctx.a_m from ctx $$,
  '42501', null, 'EJP Tech n''ajoute aucune mention');
select throws_ok($$ insert into public.point_suivi (point_id, statut) select ctx.p1, 'en_cours' from ctx $$,
  '42501', null, 'EJP Tech n''ajoute aucun suivi de point directement');
select throws_ok($$ select public.creer_point('Essai EJP Tech', null, null, 'normale', null, '{}') $$,
  '42501', 'Seul un compte de ministère peut créer un point.', 'EJP Tech ne crée aucun point');
select throws_ok($$ select public.changer_statut_point((select p1 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne change le statut d''aucun point');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Réglé avec le ministère concerné.') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne marque aucun point traité, avec un commentaire');
select throws_ok($$ select public.marquer_traite((select p1 from ctx)) $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne marque aucun point traité, sans commentaire');
select throws_ok($$
  select public.declarer_session('autre', private.aujourdhui() + 21, 'Rassemblement EJP Tech', array[(select a_m from ctx)])
$$, '42501', 'Seule l''administration de l''église déclare une session.', 'EJP Tech ne déclare aucune session');
select throws_ok($$ select public.modifier_session((select batir from ctx), array[(select a_m from ctx)]) $$,
  '42501', 'Cette session n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne modifie aucune session');
select throws_ok($$ select public.supprimer_session((select batir from ctx)) $$,
  '42501', 'Cette session n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne supprime aucune session');
select throws_ok($$
  insert into public.journal (compte, ministere_id, action, cible, cible_id)
  select ctx.tech, ctx.a_m, 'point_traite', 'point_attention', ctx.p1 from ctx
$$, '42501', null, 'EJP Tech n''écrit pas dans le journal directement');
select throws_ok($$
  insert into public.moderation (cible, cible_id, decision, par)
  select 'point_attention', ctx.p1, 'rien_a_signaler', ctx.tech from ctx
$$, '42501', null, 'EJP Tech n''écrit pas dans la modération directement (seulement par ses fonctions)');
select throws_ok($$ update public.mesure set valeur = valeur $$, '42501', null, 'EJP Tech ne modifie aucun chiffre');
select throws_ok($$ delete from public.point_attention where id = (select p1 from ctx) $$, '42501', null,
  'EJP Tech n''efface aucun point');
select tests.deconnecter();

select ok((select mesures = (select count(*) from public.mesure)
             and fij = (select count(*) from public.fij_departement)
             and participations = (select count(*) from public.participation)
             and evenements = (select count(*) from public.evenement)
             and etats = (select count(*) from public.evenement_etat)
             and reunions = (select count(*) from public.reunion)
             and points = (select count(*) from public.point_attention)
             and mentions = (select count(*) from public.point_mention)
             and suivis = (select count(*) from public.point_suivi)
             and sessions = (select count(*) from public.session)
             and lignes = (select count(*) from public.journal)
             and decisions = (select count(*) from public.moderation)
             from avant)
          and (select v.statut::text from public.v_point v where v.id = (select p1 from ctx)) = 'a_traiter',
  'les refus ne changent rien : ni chiffre, ni fiche, ni point, ni session, ni journal ; le point reste « À traiter »');

-- En aal1, EJP Tech n'appelle aucune fonction.
select tests.se_connecter((select tech from ctx), 'aal1');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Réglé avec le ministère concerné.') $$,
  '42501', 'Double authentification requise.', 'aal1 : marquer_traite refusée à EJP Tech');
select throws_ok($$ select public.marquer_relu('evenement', (select ev from ctx)) $$,
  '42501', 'Double authentification requise.', 'aal1 : marquer_relu refusée à EJP Tech');
select tests.deconnecter();

-- La modération reste à EJP Tech, en aal2.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.marquer_relu('evenement', (select ev from ctx)) $$,
  'EJP Tech relit toujours un texte (modération)');
select tests.deconnecter();

select * from finish();
rollback;
