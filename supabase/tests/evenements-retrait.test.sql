-- Retirer un événement créé par erreur (T78, lot 1 ; docs/conception/calendrier-evenements.md,
-- sections 6.3, 7 (S3, S9), 9 et 16 ; migration 20261026235900_evenements_corrections.sql).
--
-- S3, le doublon du 26 octobre : deux événements identiques de Coordination, datés du jour, huit
-- mentions chacun. Coordination retire l'un : il sort de v_evenement (chez elle et chez les
-- ministères mentionnés), de v_evenement_mention et des comptages (prévus du mois moins 1), le
-- journal de sa fiche dit « A retiré un événement » (date et statut, jamais le nom) ; l'autre
-- reste. Rien n'est modifié ni effacé : l'événement, ses états, ses mentions et ses lignes de
-- journal restent. Un second retrait n'écrit rien ; un état sur un retiré est refusé, pour le
-- porteur comme pour le propriétaire des tables ; un événement passé ne se retire plus par son
-- porteur, mais par EJP Tech. Mentionné, autre ministère, berger, conseil et administration sont
-- refusés (42501), l'aal1 aussi ; evenement_retrait ne se modifie, ne s'efface ni ne se vide.
-- S9, le mauvais espace : un ministère retire l'événement ajouté par erreur ; il quitte son
-- calendrier, ses comptages et le tableau des ministères (prochain événement).
begin;

select plan(43);

create temp table ctx as
select tests.compte('Ministère Coordination') as coo,
       (select m.id from public.ministere m where m.code = 'coordination') as coo_m,
       tests.compte('Ministère FIJ') as fij,
       (select m.id from public.ministere m where m.code = 'fij') as fij_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Retrait, huitième mention') as h_m,
       tests.creer_ministere('Retrait, autre ministère') as autre_m,
       tests.creer_ministere('Retrait, mauvais espace') as s9_m,
       private.mois_courant() as mois;
alter table ctx add column autre uuid, add column s9 uuid, add column mentions uuid[],
  add column e1 uuid, add column e2 uuid, add column passe uuid, add column s9_ev uuid;
update ctx set autre = tests.creer_compte('retrait-autre@exemple.test', 'ministere', autre_m),
               s9 = tests.creer_compte('retrait-espace@exemple.test', 'ministere', s9_m);
-- Huit mentions : les six ministères du jeu d'exemple qui ne sont ni Coordination ni FIJ, FIJ,
-- et un ministère d'essai.
update ctx set mentions = array['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
                                '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005',
                                '10000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000008']::uuid[]
                          || fij_m || h_m;
grant select on ctx to authenticated, anon;

-- Prévus du mois en cours : totaux de l'église (lus par le berger) et fiche de Coordination.
create function pg_temp.prevus_eglise() returns integer
language sql as $$
  select (x.ligne ->> 'prevus')::integer
    from jsonb_array_elements(tests.lire((select berger from ctx), 'aal2',
           format('select mois, prevus from public.evenements_eglise_mois() where mois = %L',
                  (select mois from ctx)))) as x(ligne)
$$;
create function pg_temp.prevus_ministere(p_compte uuid, p_ministere uuid) returns integer
language sql as $$
  select coalesce(sum((x.ligne ->> 'prevus')::integer), 0)::integer
    from jsonb_array_elements(tests.lire(p_compte, 'aal2',
           format('select prevus from public.v_evenements_mois where ministere_id = %L and mois = %L',
                  p_ministere, (select mois from ctx)))) as x(ligne)
$$;
create temp table avant as
select pg_temp.prevus_eglise() as eglise, pg_temp.prevus_ministere(c.coo, c.coo_m) as coordination
  from ctx c;

-- Les deux événements identiques, ajoutés par Coordination (deux envois).
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Retrait, réunion des responsables', private.aujourdhui(), 'valide',
                                  (select mentions from ctx), 1140::smallint)
$$, 'S3 : Coordination ajoute la réunion du jour, avec huit mentions');
select lives_ok($$
  select public.ajouter_evenement('Retrait, réunion des responsables', private.aujourdhui(), 'valide',
                                  (select mentions from ctx), 1140::smallint)
$$, 'S3 : puis la même une seconde fois (le doublon du 26 octobre)');
select tests.deconnecter();
update ctx set e1 = (select e.id from public.evenement e where e.titre = 'Retrait, réunion des responsables'
                      order by e.saisi_le, e.id limit 1),
               e2 = (select e.id from public.evenement e where e.titre = 'Retrait, réunion des responsables'
                      order by e.saisi_le desc, e.id desc limit 1);
select is((select count(distinct x)::integer from ctx, unnest(array[e1, e2]) as x where x is not null), 2,
  'S3 : deux événements distincts');
select is(pg_temp.prevus_eglise() - (select eglise from avant), 2,
  'S3 : avant le retrait, les prévus du mois de l''église comptent les deux');

-- Retrait de e2 par Coordination
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select e2 from ctx)) $$,
  'S3 : Coordination retire le doublon');
select tests.deconnecter();

select is(tests.compter((select coo from ctx), 'aal2',
  'select 1 from public.v_evenement where id in (select e1 from ctx union all select e2 from ctx)'), 1,
  'S3 : le calendrier de Coordination ne garde qu''un événement');
select is(tests.lire((select coo from ctx), 'aal2',
  'select id from public.v_evenement where id in (select e1 from ctx union all select e2 from ctx)'),
  (select jsonb_build_array(jsonb_build_object('id', e1)) from ctx),
  'S3 : l''autre événement reste');
select is(tests.compter((select fij from ctx), 'aal2',
  'select 1 from public.v_evenement where id in (select e1 from ctx union all select e2 from ctx)'), 1,
  'S3 : FIJ, mentionné, ne voit plus le doublon');
select is(tests.compter((select fij from ctx), 'aal2',
  'select 1 from public.v_evenement_mention where evenement_id = (select e2 from ctx)'), 0,
  'S3 : les mentions en vigueur du doublon ne se lisent plus');
select is(tests.compter((select fij from ctx), 'aal2',
  'select 1 from public.v_evenement_mention where evenement_id = (select e1 from ctx)'), 8,
  'S3 : l''autre garde ses huit mentions');
select is(tests.compter((select berger from ctx), 'aal2',
  'select 1 from public.v_evenement where id = (select e2 from ctx)'), 0,
  'S3 : le berger ne voit plus le doublon');
select is(pg_temp.prevus_eglise() - (select eglise from avant), 1,
  'S3 : les prévus du mois de l''église baissent de 1');
select is(pg_temp.prevus_ministere((select coo from ctx), (select coo_m from ctx)) - (select coordination from avant), 1,
  'S3 : les prévus du mois de Coordination (v_evenements_mois) comptent un seul événement');

-- Journal : une ligne, au ministère porteur, avec la date et le statut, jamais le nom.
select is((select count(*)::integer from public.journal
            where cible_id = (select e2 from ctx) and action = 'evenement_retire'), 1,
  'S3 : une ligne de journal evenement_retire');
select ok((select bool_and(j.ministere_id = c.coo_m and j.compte = c.coo and j.cible = 'evenement'
                           and j.detail = jsonb_build_object('date', private.aujourdhui(), 'statut', 'valide'))
             from public.journal j cross join ctx c
            where j.cible_id = c.e2 and j.action = 'evenement_retire'),
  'S3 : la ligne porte Coordination, son compte, la date et le statut (aucun texte libre)');
select is(tests.compter((select coo from ctx), 'aal2',
  'select 1 from public.v_journal where cible_id = (select e2 from ctx) and action = ''evenement_retire'''), 1,
  'S3 : le journal de la fiche de Coordination montre le retrait');
select is(tests.compter((select fij from ctx), 'aal2',
  'select 1 from public.v_journal where cible_id = (select e2 from ctx) and action = ''evenement_retire'''), 0,
  'S3 : un ministère mentionné ne lit pas le journal de Coordination');

-- Rien n'est effacé
select ok((select count(*) = 1 from public.evenement where id = (select e2 from ctx))
          and (select count(*) = 1 from public.evenement_etat where evenement_id = (select e2 from ctx))
          and (select count(*) = 8 from public.evenement_mention where evenement_id = (select e2 from ctx))
          and (select count(*) = 1 from public.journal
                where cible_id = (select e2 from ctx) and action = 'evenement_ajoute'),
  'S3 : l''événement retiré, son état, ses huit mentions et sa ligne d''ajout restent en base');
select is(tests.compter((select fij from ctx), 'aal2',
  'select 1 from public.evenement_retrait where evenement_id = (select e2 from ctx)'), 1,
  'S3 : un ministère mentionné lit le retrait (panneau d''un ancien lien : « retiré le »)');

-- Un second retrait n'écrit rien
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select e2 from ctx)) $$,
  'déjà retiré : un second retrait n''est pas une erreur');
select tests.deconnecter();
select is((select count(*)::integer from public.journal
            where cible_id = (select e2 from ctx) and action = 'evenement_retire'), 1,
  'déjà retiré : aucune ligne de journal de plus');

-- Un état sur un événement retiré est refusé
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select e2, private.aujourdhui() + 1, 'valide' from ctx
$$, 'P0001', 'Cet événement a été retiré.', 'un état sur un événement retiré est refusé au porteur');
select tests.deconnecter();
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut, saisi_par)
  select e2, private.aujourdhui() + 1, 'valide', coo from ctx
$$, 'P0001', 'Cet événement a été retiré.', 'un état sur un événement retiré est refusé même au propriétaire des tables');

-- Un événement passé : le porteur ne le retire plus, EJP Tech le peut.
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select coo_m, 'Retrait, réunion d''hier', now() - interval '3 days', coo from ctx
  returning id)
update ctx set passe = (select n.id from nouveau n);
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select passe, private.aujourdhui() - 1, 'valide', now() - interval '3 days', coo from ctx;
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select passe from ctx)) $$,
  'P0001', 'Un événement passé se retire par EJP Tech.', 'S3, le lendemain : le porteur ne retire plus un événement passé');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select passe from ctx)) $$,
  'S3, le lendemain : EJP Tech retire l''événement passé');
select tests.deconnecter();
select ok((select bool_and(j.compte = c.tech and j.ministere_id = c.coo_m
                           and j.detail = jsonb_build_object('date', private.aujourdhui() - 1, 'statut', 'valide'))
             from public.journal j cross join ctx c
            where j.cible_id = c.passe and j.action = 'evenement_retire')
          and (select count(*) = 1 from public.journal where cible_id = (select passe from ctx) and action = 'evenement_retire'),
  'EJP Tech : la ligne de journal va à la fiche du ministère porteur, au nom du compte d''EJP Tech');

-- Droits : seuls le porteur et EJP Tech retirent.
select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select e1 from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère mentionné ne retire pas l''événement');
select tests.deconnecter();
select tests.se_connecter((select autre from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select e1 from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un autre ministère ne retire pas l''événement');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select e1 from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne retire pas l''événement');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select e1 from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le conseil ne retire pas l''événement');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement((select e1 from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'l''administration ne retire pas l''événement');
select tests.deconnecter();
select tests.se_connecter((select coo from ctx), 'aal1');
select throws_ok($$ select public.retirer_evenement((select e1 from ctx)) $$,
  '42501', 'Double authentification requise.', 'aal1 : le porteur ne retire rien');
select tests.deconnecter();
-- Parité : un événement qui n'existe pas donne le même refus qu'un événement d'un autre
-- ministère ; rien ne dit qu'il existe.
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.retirer_evenement(gen_random_uuid()) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'un événement inconnu : le même refus qu''un événement d''un autre ministère');
select tests.deconnecter();
select is(tests.compter((select coo from ctx), 'aal2',
  'select 1 from public.v_evenement where id = (select e1 from ctx)'), 1,
  'après tous ces refus, l''autre événement est toujours au calendrier');

-- Inaltérabilité, même pour le propriétaire des tables
select throws_ok($$ update public.evenement_retrait set saisi_le = now() $$,
  '42501', 'La table evenement_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_retrait : aucune modification, même pour le propriétaire');
select throws_ok($$ delete from public.evenement_retrait $$,
  '42501', 'La table evenement_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_retrait : aucune suppression, même pour le propriétaire');
select throws_ok($$ truncate public.evenement_retrait $$,
  '42501', 'La table evenement_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_retrait : aucun vidage, même pour le propriétaire');

-- S9, le mauvais espace : l'événement ajouté dans le mauvais ministère, puis retiré.
select tests.se_connecter((select s9 from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Retrait, espace de Coordination', private.aujourdhui() + 3, 'valide', '{}', null::smallint)
$$, 'S9 : la personne ajoute l''événement dans le mauvais espace');
select tests.deconnecter();
update ctx set s9_ev = (select e.id from public.evenement e where e.titre = 'Retrait, espace de Coordination');
select is(tests.lire((select berger from ctx), 'aal2',
  format('select prochain_evenement_titre as t from public.v_tableau_ministeres where ministere_id = %L',
         (select s9_m from ctx))),
  jsonb_build_array(jsonb_build_object('t', 'Retrait, espace de Coordination')),
  'S9 : avant le retrait, le tableau des ministères annonce l''événement');
select tests.se_connecter((select s9 from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select s9_ev from ctx)) $$,
  'S9 : elle le retire depuis cet espace');
select tests.deconnecter();
select is(tests.compter((select s9 from ctx), 'aal2', 'select 1 from public.v_evenement'), 0,
  'S9 : le calendrier de ce ministère ne le montre plus');
select is(pg_temp.prevus_ministere((select s9 from ctx), (select s9_m from ctx)), 0,
  'S9 : les comptages de ce ministère ne le comptent pas');
select is(tests.lire((select berger from ctx), 'aal2',
  format('select prochain_evenement_titre as t from public.v_tableau_ministeres where ministere_id = %L',
         (select s9_m from ctx))),
  jsonb_build_array(jsonb_build_object('t', null)),
  'S9 : le tableau des ministères n''annonce plus l''événement retiré');

select * from finish();
rollback;
