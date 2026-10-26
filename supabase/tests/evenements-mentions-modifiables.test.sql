-- Modifier les mentions d'un événement (T78, lot 1, modèle de T54 ; docs/conception/
-- calendrier-evenements.md, sections 6.2, 7 (S5, S10) et 16 ; migration
-- 20261026235900_evenements_corrections.sql).
--
-- S5 : un événement de Coordination mentionne FIJ ; Coordination décoche FIJ, coche Accueil et
-- enregistre. FIJ ne lit plus l'événement (evenement, evenement_etat, evenement_mention,
-- v_evenement, v_evenement_mention), Accueil le lit ; le journal a deux lignes (une mention
-- retirée, une ajoutée, l'identifiant du ministère seulement). Rien n'est modifié ni effacé : un
-- retrait est une ligne de evenement_mention_retrait. La même liste n'écrit rien. Un ministère
-- désactivé encore mentionné peut rester ou être retiré, pas ajouté ; jamais le porteur, jamais
-- un ministère inconnu ; une seule mention en vigueur par ministère (mention_unique). Jusqu'au
-- dernier jour compris (heure de Paris) : un événement passé refuse, celui du jour accepte ; un
-- événement retiré refuse.
-- S10 : un ministère mentionné ne modifie rien (42501), ni le berger, le conseil,
-- l'administration, EJP Tech ou un autre ministère ; l'aal1 est refusée.
-- Q18 (décision du 26 octobre 2026) : aucune ligne de mention existante n'est reprise ; une
-- mention sans date (d'avant T78) se date par son événement, et le verrou reste posé.
begin;

select plan(49);

create temp table ctx as
select tests.compte('Ministère Coordination') as coo,
       (select m.id from public.ministere m where m.code = 'coordination') as coo_m,
       tests.compte('Ministère FIJ') as fij,
       (select m.id from public.ministere m where m.code = 'fij') as fij_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Mentions T78, Accueil') as accueil_m,
       tests.creer_ministere('Mentions T78, bientôt désactivé') as x_m,
       tests.creer_ministere('Mentions T78, autre') as autre_m;
alter table ctx add column accueil uuid, add column autre uuid, add column e uuid, add column m uuid,
  add column t uuid, add column p uuid, add column ancien uuid;
update ctx set accueil = tests.creer_compte('mentions-t78-accueil@exemple.test', 'ministere', accueil_m),
               autre = tests.creer_compte('mentions-t78-autre@exemple.test', 'ministere', autre_m);
grant select on ctx to authenticated, anon;

select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Mentions T78, samedi', private.aujourdhui() + 12, 'valide',
                                  array[(select fij_m from ctx), (select x_m from ctx)], null::smallint)
$$, 'jeu d''essai : Coordination ajoute un événement qui mentionne FIJ');
select lives_ok($$
  select public.ajouter_evenement('Mentions T78, droits', private.aujourdhui() + 12, 'valide',
                                  array[(select fij_m from ctx)], null::smallint)
$$, 'jeu d''essai : un second événement qui mentionne FIJ');
select lives_ok($$
  select public.ajouter_evenement('Mentions T78, aujourd''hui', private.aujourdhui(), 'valide', '{}', null::smallint)
$$, 'jeu d''essai : un événement du jour, sans mention');
select tests.deconnecter();
update ctx set e = (select x.id from public.evenement x where x.titre = 'Mentions T78, samedi'),
               m = (select x.id from public.evenement x where x.titre = 'Mentions T78, droits'),
               t = (select x.id from public.evenement x where x.titre = 'Mentions T78, aujourd''hui');

-- Un événement d'hier, et un événement dont la mention n'a ni date ni auteur (posée avant T78),
-- écrits comme le jeu d'exemple (sans compte connecté).
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select coo_m, 'Mentions T78, hier', now() - interval '3 days', coo from ctx
  returning id)
update ctx set p = (select n.id from nouveau n);
insert into public.evenement_mention (evenement_id, ministere_id) select p, fij_m from ctx;
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select p, private.aujourdhui() - 1, 'valide', now() - interval '3 days', coo from ctx;
with nouveau as (
  insert into public.evenement (ministere_id, titre, saisi_le, saisi_par)
  select coo_m, 'Mentions T78, ancienne mention', now() - interval '10 days', coo from ctx
  returning id)
update ctx set ancien = (select n.id from nouveau n);
insert into public.evenement_mention (evenement_id, ministere_id, saisi_le, saisi_par)
select ancien, fij_m, null, null from ctx;
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select ancien, private.aujourdhui() + 4, 'valide', now() - interval '10 days', coo from ctx;

select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.v_evenement where id = (select e from ctx)'), 1,
  'S5, avant : FIJ voit l''événement');
select is(tests.compter((select accueil from ctx), 'aal2', 'select 1 from public.v_evenement where id = (select e from ctx)'), 0,
  'S5, avant : Accueil ne le voit pas');

-- S5
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.modifier_mentions_evenement((select e from ctx), array[(select accueil_m from ctx), (select x_m from ctx)])
$$, 'S5 : Coordination décoche FIJ et coche Accueil');
select tests.deconnecter();

select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.v_evenement where id = (select e from ctx)'), 0,
  'S5 : FIJ ne voit plus l''événement au calendrier');
select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.evenement where id = (select e from ctx)')
          + tests.compter((select fij from ctx), 'aal2', 'select 1 from public.evenement_etat where evenement_id = (select e from ctx)')
          + tests.compter((select fij from ctx), 'aal2', 'select 1 from public.evenement_mention where evenement_id = (select e from ctx)')
          + tests.compter((select fij from ctx), 'aal2', 'select 1 from public.v_evenement_mention where evenement_id = (select e from ctx)'), 0,
  'S5 : FIJ ne lit plus rien de l''événement (identité, états, mentions)');
-- Le retrait de sa mention existe (le porteur le lit), mais FIJ ne le lit pas, ni les autres
-- tables de T78 de cet événement.
select is(tests.compter((select coo from ctx), 'aal2',
            'select 1 from public.evenement_mention_retrait r join public.evenement_mention m on m.id = r.mention_id
              where m.evenement_id = (select e from ctx)'), 1,
  'S5 : le porteur lit le retrait de la mention de FIJ');
select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.evenement_mention_retrait')
          + tests.compter((select fij from ctx), 'aal2', 'select 1 from public.evenement_titre where evenement_id = (select e from ctx)')
          + tests.compter((select fij from ctx), 'aal2', 'select 1 from public.evenement_retrait where evenement_id = (select e from ctx)'), 0,
  'S5 : FIJ ne lit ni ce retrait de mention, ni les noms, ni le retrait de l''événement');
select is(tests.compter((select accueil from ctx), 'aal2', 'select 1 from public.v_evenement where id = (select e from ctx)'), 1,
  'S5 : Accueil voit l''événement');
select is(tests.compter((select accueil from ctx), 'aal2', 'select 1 from public.evenement_etat where evenement_id = (select e from ctx)'), 1,
  'S5 : Accueil lit son état');
select is(tests.lire((select coo from ctx), 'aal2',
  'select count(*) filter (where ministere_id in (select accueil_m from ctx union all select x_m from ctx)) as voulues,
          count(*) as toutes
     from public.v_evenement_mention where evenement_id = (select e from ctx)'),
  jsonb_build_array(jsonb_build_object('voulues', 2, 'toutes', 2)),
  'S5 : les mentions en vigueur sont exactement la liste envoyée');
select is((select count(*)::integer from public.journal j cross join ctx c
            where j.cible_id = c.e and j.action = 'evenement_mention_ajoutee'
              and j.detail = jsonb_build_object('ministere', c.accueil_m)), 1,
  'S5 : une ligne de journal pour la mention ajoutée (Accueil)');
select is((select count(*)::integer from public.journal j cross join ctx c
            where j.cible_id = c.e and j.action = 'evenement_mention_retiree'
              and j.detail = jsonb_build_object('ministere', c.fij_m)), 1,
  'S5 : une ligne de journal pour la mention retirée (FIJ)');
select ok((select bool_and(j.ministere_id = c.coo_m and j.compte = c.coo and j.cible = 'evenement'
                           and (select array_agg(k) from jsonb_object_keys(j.detail) as k) = array['ministere'])
             from public.journal j cross join ctx c
            where j.cible_id = c.e and j.action in ('evenement_mention_ajoutee', 'evenement_mention_retiree')),
  'S5 : ministère porteur, compte, cible evenement, détail réduit à l''identifiant du ministère');
select ok(exists (select 1 from public.evenement_mention x
                   join public.evenement_mention_retrait r on r.mention_id = x.id
                   cross join ctx c
                  where x.evenement_id = c.e and x.ministere_id = c.fij_m and r.saisi_par = c.coo),
  'S5 : la mention de FIJ reste en base, avec sa ligne de retrait (rien n''est effacé)');

-- La même liste, dans un autre ordre : rien n'est écrit.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.modifier_mentions_evenement((select e from ctx), array[(select x_m from ctx), (select accueil_m from ctx)])
$$, 'liste identique : pas d''erreur');
select tests.deconnecter();
select is((select count(*)::integer from public.journal
            where cible_id = (select e from ctx) and action like 'evenement_mention%'), 2,
  'liste identique : aucune ligne de journal de plus');

-- Un ministère mentionné puis désactivé : il reste, il se retire, il ne s'ajoute plus.
update public.ministere set desactive_le = now() where id = (select x_m from ctx);
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.modifier_mentions_evenement((select e from ctx), array[(select accueil_m from ctx), (select x_m from ctx)])
$$, 'désactivé : la liste peut le garder');
select tests.deconnecter();
select is((select count(*)::integer from public.v_evenement_mention
            where evenement_id = (select e from ctx) and ministere_id = (select x_m from ctx)), 1,
  'désactivé : il reste mentionné');
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.modifier_mentions_evenement((select e from ctx), array[(select accueil_m from ctx)]) $$,
  'désactivé : il se retire');
select throws_ok($$
  select public.modifier_mentions_evenement((select e from ctx), array[(select accueil_m from ctx), (select x_m from ctx)])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'désactivé : il ne s''ajoute plus');
select throws_ok($$ select public.modifier_mentions_evenement((select e from ctx), array[(select coo_m from ctx)]) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.', 'le porteur ne se mentionne pas lui-même');
select throws_ok($$ select public.modifier_mentions_evenement((select e from ctx), array[gen_random_uuid()]) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.', 'un ministère inconnu ne se mentionne pas');
select throws_ok($$ select public.modifier_mentions_evenement((select e from ctx), null) $$,
  'P0001', 'Choisissez les ministères à mentionner.', 'une liste absente est refusée');
select tests.deconnecter();

-- Une seule mention en vigueur par ministère, même pour le propriétaire des tables.
select throws_ok($$ insert into public.evenement_mention (evenement_id, ministere_id) select e, accueil_m from ctx $$,
  'P0001', 'Ce ministère est déjà mentionné sur cet événement.',
  'mention_unique : un second ajout sans retrait est refusé, même pour le propriétaire');

-- FIJ ajouté de nouveau : il revoit l'événement ; deux lignes d'ajout.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.modifier_mentions_evenement((select e from ctx), array[(select accueil_m from ctx), (select fij_m from ctx)])
$$, 'FIJ est mentionné de nouveau');
select tests.deconnecter();
select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.v_evenement where id = (select e from ctx)'), 1,
  'FIJ revoit l''événement');
select is((select count(*)::integer from public.evenement_mention
            where evenement_id = (select e from ctx) and ministere_id = (select fij_m from ctx)), 2,
  'FIJ a deux lignes d''ajout (création, puis ajout après le retrait)');

-- Jusqu'au dernier jour compris ; jamais sur un événement retiré.
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select p from ctx), '{}') $$,
  'P0001', 'Les mentions de cet événement ne changent plus.', 'S5, le lendemain : un événement passé refuse');
select lives_ok($$ select public.modifier_mentions_evenement((select t from ctx), array[(select fij_m from ctx)]) $$,
  'le jour même, les mentions changent encore');
select lives_ok($$ select public.retirer_evenement((select t from ctx)) $$, 'jeu d''essai : l''événement du jour est retiré');
select throws_ok($$ select public.modifier_mentions_evenement((select t from ctx), '{}') $$,
  'P0001', 'Cet événement a été retiré.', 'un événement retiré refuse');
select tests.deconnecter();

-- S10 : personne d'autre que le porteur (l'événement « droits » mentionne FIJ).
select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'S10 : le ministère mentionné ne modifie pas les mentions');
select tests.deconnecter();
select tests.se_connecter((select autre from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un autre ministère ne modifie pas les mentions');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne modifie pas les mentions (Q6)');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le conseil ne modifie pas les mentions (Q6)');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'l''administration ne modifie pas les mentions');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne modifie pas les mentions');
select tests.deconnecter();
select tests.se_connecter((select coo from ctx), 'aal1');
select throws_ok($$ select public.modifier_mentions_evenement((select m from ctx), '{}') $$,
  '42501', 'Double authentification requise.', 'aal1 : le porteur ne modifie rien');
select tests.deconnecter();
select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.v_evenement where id = (select m from ctx)'), 1,
  'S10 : après ces refus, FIJ voit toujours l''événement');

-- Q18 : une mention d'avant T78 garde sa ligne telle quelle ; sa date se lit sur l'événement.
select is(tests.lire((select coo from ctx), 'aal2',
  'select m.saisi_le = e.saisi_le as date_de_l_evenement
     from public.v_evenement_mention m join public.evenement e on e.id = m.evenement_id
    where m.evenement_id = (select ancien from ctx)'),
  jsonb_build_array(jsonb_build_object('date_de_l_evenement', true)),
  'Q18 : une mention sans date se date par la création de son événement');
select ok((select bool_and(x.saisi_le is not null and x.saisi_par = c.coo)
             from public.evenement_mention x cross join ctx c
            where x.evenement_id = c.e and x.ministere_id = c.accueil_m),
  'une mention ajoutée porte sa date et son auteur (posés par la base)');
select is((select count(*)::integer from pg_trigger t
            where t.tgrelid = 'public.evenement_mention'::regclass and not t.tgisinternal and t.tgenabled = 'O'
              and t.tgname in ('ajout_seulement', 'ajout_seulement_vider', 'forcer_auteur', 'mention_unique')), 4,
  'Q18 : le verrou d''ajout seulement de evenement_mention est en place (jamais levé), avec l''auteur et l''unicité');

-- Inaltérabilité, même pour le propriétaire des tables.
select throws_ok($$ update public.evenement_mention set ministere_id = ministere_id $$,
  '42501', 'La table evenement_mention est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_mention : aucune modification, même pour le propriétaire');
select throws_ok($$ update public.evenement_mention_retrait set saisi_le = now() $$,
  '42501', 'La table evenement_mention_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_mention_retrait : aucune modification, même pour le propriétaire');
select throws_ok($$ delete from public.evenement_mention_retrait $$,
  '42501', 'La table evenement_mention_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_mention_retrait : aucune suppression, même pour le propriétaire');
select throws_ok($$ truncate public.evenement_mention_retrait $$,
  '42501', 'La table evenement_mention_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_mention_retrait : aucun vidage, même pour le propriétaire');

select * from finish();
rollback;
