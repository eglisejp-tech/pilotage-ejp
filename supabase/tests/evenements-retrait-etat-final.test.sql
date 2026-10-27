-- Retrait après un état final (T78, lot 1 ; décision de la personne responsable du 27 octobre
-- 2026 ; migration 20261027091106_retrait_apres_etat_final.sql). Une fois « Terminé » ou « Annulé »
-- enregistré pour un événement, son ministère porteur ne le retire plus, même le jour de
-- l'événement ou avant sa date : son retard sortirait des comptages de ponctualité. EJP Tech le
-- retire, à la demande du ministère par un signalement. Avant tout état final, le porteur le
-- retire encore jusqu'à la date comprise. Un état final enregistré compte même si un état
-- suivant l'a remplacé. Rien n'est écrit quand le retrait est refusé.

begin;

select plan(19);

create temp table ctx as
select tests.compte('Ministère Coordination') as coo,
       (select m.id from public.ministere m where m.code = 'coordination') as coo_m,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Retrait final, autre ministère') as autre_m;
alter table ctx add column termine uuid, add column annule uuid, add column revenu uuid,
  add column avant uuid, add column passe_termine uuid, add column deux uuid, add column autre uuid;
update ctx set autre = tests.creer_compte('retrait-final-autre@exemple.test', 'ministere', autre_m);
grant select on ctx to authenticated, anon;

-- Les événements de Coordination : le culte du jour (Terminé), la soirée de samedi (Annulé),
-- la réunion de vendredi (Terminé par erreur, puis remise en préparation), l'atelier de dimanche
-- (validé puis en préparation, jamais d'état final).
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Retrait final, culte du jour', private.aujourdhui(), 'valide', '{}', 1140::smallint);
  select public.ajouter_evenement('Retrait final, soirée de samedi', private.aujourdhui() + 4, 'valide', '{}', null::smallint);
  select public.ajouter_evenement('Retrait final, réunion de vendredi', private.aujourdhui() + 3, 'valide', '{}', null::smallint);
  select public.ajouter_evenement('Retrait final, atelier de dimanche', private.aujourdhui() + 5, 'valide', '{}', null::smallint);
  select public.ajouter_evenement('Retrait final, concert de jeudi', private.aujourdhui() + 2, 'valide', '{}', null::smallint);
$$, 'Coordination ajoute cinq événements, du jour et à venir');
select tests.deconnecter();
update ctx set termine = (select e.id from public.evenement e where e.titre = 'Retrait final, culte du jour'),
               annule = (select e.id from public.evenement e where e.titre = 'Retrait final, soirée de samedi'),
               revenu = (select e.id from public.evenement e where e.titre = 'Retrait final, réunion de vendredi'),
               avant = (select e.id from public.evenement e where e.titre = 'Retrait final, atelier de dimanche'),
               deux = (select e.id from public.evenement e where e.titre = 'Retrait final, concert de jeudi');

-- Les états, par le porteur, comme l'écran les enregistre.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, heure_debut)
  select termine, private.aujourdhui(), 'termine', 1180::smallint from ctx
$$, 'le culte du jour : Coordination enregistre « Terminé », avec 40 minutes de retard');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select annule, private.aujourdhui() + 4, 'annule' from ctx
$$, 'la soirée de samedi : Coordination enregistre « Annulé »');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select revenu, private.aujourdhui() + 3, 'termine' from ctx;
  insert into public.evenement_etat (evenement_id, date, statut)
  select revenu, private.aujourdhui() + 3, 'preparation' from ctx;
$$, 'la réunion de vendredi : « Terminé » par erreur, puis « En préparation »');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select avant, private.aujourdhui() + 5, 'preparation' from ctx
$$, 'l''atelier de dimanche : « En préparation », aucun état final');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select deux, private.aujourdhui() + 2, 'termine' from ctx;
  insert into public.evenement_etat (evenement_id, date, statut)
  select deux, private.aujourdhui() + 2, 'annule' from ctx;
$$, 'le concert de jeudi : « Terminé » par erreur, puis « Annulé »');

-- Le porteur ne retire plus un événement terminé ou annulé, même à sa date ou avant.
select throws_ok($$ select public.retirer_evenement((select termine from ctx)) $$,
  'P0001', 'Un événement terminé se retire par EJP Tech.',
  'le jour même, Coordination ne retire plus le culte terminé (son retard reste compté)');
select throws_ok($$ select public.retirer_evenement((select annule from ctx)) $$,
  'P0001', 'Un événement annulé se retire par EJP Tech.',
  'avant sa date, Coordination ne retire plus la soirée annulée');
select throws_ok($$ select public.retirer_evenement((select revenu from ctx)) $$,
  'P0001', 'Un événement terminé se retire par EJP Tech.',
  'un « Terminé » enregistré compte, même remplacé ensuite par « En préparation »');
select throws_ok($$ select public.retirer_evenement((select deux from ctx)) $$,
  'P0001', 'Un événement annulé se retire par EJP Tech.',
  'le refus dit le dernier état final enregistré (« Annulé » après « Terminé »)');
select tests.deconnecter();

-- Un autre ministère reçoit le refus d'accès, avant l'état final : il n'apprend rien de l'événement.
select tests.se_connecter((select autre from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select termine from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'un autre ministère ne retire pas le culte terminé et n''apprend pas qu''il est terminé');
select tests.deconnecter();

-- Un événement passé et terminé : la raison de l'état final passe avant celle de la date.
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select coo_m, 'Retrait final, culte d''hier', now() - interval '3 days', coo from ctx
  returning id)
update ctx set passe_termine = (select n.id from nouveau n);
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select passe_termine, private.aujourdhui() - 1, 'valide', now() - interval '3 days', coo from ctx;
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select passe_termine, private.aujourdhui() - 1, 'termine', now() - interval '1 day', coo from ctx;
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select passe_termine from ctx)) $$,
  'P0001', 'Un événement terminé se retire par EJP Tech.',
  'le lendemain d''un événement terminé, la raison dite est l''état final');
select tests.deconnecter();

-- Rien n'est écrit par ces refus.
select is((select count(*)::integer from public.evenement_retrait r, ctx c
            where r.evenement_id in (c.termine, c.annule, c.revenu, c.passe_termine, c.deux)), 0,
  'aucun retrait écrit par les refus');
select is((select count(*)::integer from public.journal j, ctx c
            where j.action = 'evenement_retire' and j.cible_id in (c.termine, c.annule, c.revenu, c.passe_termine, c.deux)), 0,
  'aucune ligne de journal écrite par les refus');

-- EJP Tech les retire, à la demande du ministère.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select termine from ctx)) $$,
  'EJP Tech retire le culte terminé, à la demande de Coordination');
select lives_ok($$ select public.retirer_evenement((select annule from ctx)) $$,
  'EJP Tech retire la soirée annulée');
select tests.deconnecter();
select ok((select j.compte = c.tech and j.ministere_id = c.coo_m
                  and j.detail = jsonb_build_object('date', private.aujourdhui(), 'statut', 'termine')
             from public.journal j cross join ctx c
            where j.cible_id = c.termine and j.action = 'evenement_retire'),
  'journal : le retrait d''EJP Tech va à la fiche de Coordination, avec la date et le statut Terminé');

-- Avant tout état final, le porteur retire encore son événement.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select avant from ctx)) $$,
  'avant tout état final, Coordination retire l''atelier de dimanche');
select tests.deconnecter();
select is((select count(*)::integer from public.evenement_retrait r, ctx c where r.evenement_id = c.avant), 1,
  'l''atelier est retiré');

select * from finish();
rollback;
