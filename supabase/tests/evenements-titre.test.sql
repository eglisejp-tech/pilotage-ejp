-- Corriger le nom d'un événement (T78, lot 1 ; docs/conception/calendrier-evenements.md,
-- sections 6.1, 7 (S4, S13) et 16 ; migration 20261026235900_evenements_corrections.sql).
--
-- S4 : Communication corrige « Soirée de lounge » en « Soirée de louange ». Le nom en vigueur est
-- la ligne la plus récente de evenement_titre : v_evenement le donne au porteur, au ministère
-- mentionné et au berger, avec l'ancien nom et le jour de la correction ; evenement.titre garde
-- le nom de création. Le journal dit « A corrigé le nom d'un événement » sans aucun des deux
-- textes, et v_journal montre le nom en vigueur. Même nom (espaces compris) : rien n'est écrit.
-- Nom vide, de 81 caractères ou absent : refusé. Un événement retiré ne change plus de nom. Seul
-- le porteur corrige (mentionné, autre ministère, berger, conseil, administration et EJP Tech :
-- 42501 ; aal1 refusée). EJP Tech relit chaque version dans les textes à relire.
-- S13 : EJP Tech masque une version ; le calendrier montre « [texte masqué par EJP Tech] », les
-- autres versions ne changent pas ; l'administration ne lit pas cette ligne de journal.
begin;

select plan(42);

create temp table ctx as
select tests.compte('Ministère Communication') as com,
       '10000000-0000-4000-8000-000000000001'::uuid as com_m,
       tests.compte('Ministère FIJ') as fij,
       (select m.id from public.ministere m where m.code = 'fij') as fij_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Titre, autre ministère') as autre_m;
alter table ctx add column autre uuid, add column ev uuid, add column retire uuid,
  add column v1 uuid, add column v2 uuid;
update ctx set autre = tests.creer_compte('titre-autre@exemple.test', 'ministere', autre_m);
grant select on ctx to authenticated, anon;

select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Soirée de lounge', private.aujourdhui() + 5, 'valide',
                                  array[(select fij_m from ctx)], null::smallint)
$$, 'jeu d''essai : Communication ajoute « Soirée de lounge », qui mentionne FIJ');
select tests.deconnecter();
update ctx set ev = (select e.id from public.evenement e where e.titre = 'Soirée de lounge'
                      and e.ministere_id = '10000000-0000-4000-8000-000000000001');

-- S4
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Soirée de louange') $$,
  'S4 : Communication corrige le nom');
select tests.deconnecter();
update ctx set v1 = (select t.id from public.evenement_titre t where t.evenement_id = ctx.ev);

select is(tests.lire((select com from ctx), 'aal2',
  'select titre, titre_precedent, titre_corrige_le = private.aujourdhui() as aujourdhui
     from public.v_evenement where id = (select ev from ctx)'),
  jsonb_build_array(jsonb_build_object('titre', 'Soirée de louange', 'titre_precedent', 'Soirée de lounge',
                                       'aujourdhui', true)),
  'S4 : le porteur lit le nouveau nom, l''ancien et le jour de la correction');
select is(tests.lire((select fij from ctx), 'aal2',
  'select titre, titre_precedent from public.v_evenement where id = (select ev from ctx)'),
  jsonb_build_array(jsonb_build_object('titre', 'Soirée de louange', 'titre_precedent', 'Soirée de lounge')),
  'S4 : le ministère mentionné lit le nouveau nom et l''ancien');
select is(tests.lire((select berger from ctx), 'aal2',
  'select titre from public.v_evenement where id = (select ev from ctx)'),
  jsonb_build_array(jsonb_build_object('titre', 'Soirée de louange')),
  'S4 : le berger lit le nouveau nom');
select is((select titre from public.evenement where id = (select ev from ctx)), 'Soirée de lounge',
  'S4 : evenement.titre garde le nom de création (rien n''est modifié)');
select ok((select count(*) = 1 and bool_and(t.saisi_par = c.com and t.titre = 'Soirée de louange')
             from public.evenement_titre t cross join ctx c where t.evenement_id = c.ev),
  'S4 : une ligne dans evenement_titre, au nom du compte du porteur');
select is((select count(*)::integer from public.journal
            where cible_id = (select ev from ctx) and action = 'evenement_titre_corrige'), 1,
  'S4 : une ligne de journal evenement_titre_corrige');
select ok((select bool_and(j.detail = '{}'::jsonb and j.ministere_id = c.com_m and j.compte = c.com
                           and j.cible = 'evenement')
             from public.journal j cross join ctx c
            where j.cible_id = c.ev and j.action = 'evenement_titre_corrige'),
  'S4 : la ligne porte le ministère et le compte, sans aucun des deux noms');
select is(tests.lire((select com from ctx), 'aal2',
  'select cible_texte from public.v_journal where cible_id = (select ev from ctx) and action = ''evenement_ajoute'''),
  jsonb_build_array(jsonb_build_object('cible_texte', 'Soirée de louange')),
  'S4 : le journal nomme l''événement par son nom en vigueur');

-- Même nom, espaces autour compris : rien n'est écrit, sans erreur.
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$ select public.corriger_titre_evenement((select ev from ctx), '  Soirée de louange  ') $$,
  'même nom : pas d''erreur (un second envoi après une réponse perdue)');
select tests.deconnecter();
select ok((select count(*) = 1 from public.evenement_titre where evenement_id = (select ev from ctx))
          and (select count(*) = 1 from public.journal
                where cible_id = (select ev from ctx) and action = 'evenement_titre_corrige'),
  'même nom : aucune ligne de plus, ni de nom ni de journal');

-- Refus du nom
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), '   ') $$,
  'P0001', 'Donnez un nom à l''événement (80 caractères au plus).', 'nom vide refusé');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), repeat('a', 81)) $$,
  'P0001', 'Donnez un nom à l''événement (80 caractères au plus).', 'nom de 81 caractères refusé');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), null) $$,
  'P0001', 'Donnez un nom à l''événement (80 caractères au plus).', 'nom absent refusé');
select tests.deconnecter();

-- Droits : le porteur seul.
select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai FIJ') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le ministère mentionné ne corrige pas le nom');
select tests.deconnecter();
select tests.se_connecter((select autre from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai autre') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un autre ministère ne corrige pas le nom');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai berger') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne corrige pas le nom');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai conseil') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le conseil ne corrige pas le nom');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai administration') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'l''administration ne corrige pas le nom');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai EJP Tech') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne corrige pas le nom (il masque)');
select tests.deconnecter();
select tests.se_connecter((select com from ctx), 'aal1');
select throws_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Essai aal1') $$,
  '42501', 'Double authentification requise.', 'aal1 : le porteur ne corrige rien');
select tests.deconnecter();
-- Parité : un événement inconnu donne le même refus qu'un événement d'un autre ministère.
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_evenement(gen_random_uuid(), 'Essai inconnu') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'un événement inconnu : le même refus qu''un événement d''un autre ministère');
select tests.deconnecter();

-- Un événement retiré ne change plus de nom.
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Titre, à retirer', private.aujourdhui() + 6, 'brouillon', '{}', null::smallint)
$$, 'jeu d''essai : un second événement');
select tests.deconnecter();
update ctx set retire = (select e.id from public.evenement e where e.titre = 'Titre, à retirer');
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$ select public.retirer_evenement((select retire from ctx)) $$, 'jeu d''essai : il est retiré');
select throws_ok($$ select public.corriger_titre_evenement((select retire from ctx), 'Titre corrigé') $$,
  'P0001', 'Cet événement a été retiré.', 'un événement retiré ne change plus de nom');
select tests.deconnecter();

-- Seconde correction : l'ancien nom affiché est la version précédente.
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$ select public.corriger_titre_evenement((select ev from ctx), 'Soirée de louange et prière') $$,
  'seconde correction');
select tests.deconnecter();
update ctx set v2 = (select t.id from public.evenement_titre t
                      where t.evenement_id = ctx.ev and t.titre = 'Soirée de louange et prière');
select is(tests.lire((select com from ctx), 'aal2',
  'select titre, titre_precedent from public.v_evenement where id = (select ev from ctx)'),
  jsonb_build_array(jsonb_build_object('titre', 'Soirée de louange et prière', 'titre_precedent', 'Soirée de louange')),
  'seconde correction : nom en vigueur et version précédente');

-- Textes à relire : chaque version corrigée, au ministère de son auteur.
select is((select count(*)::integer
             from jsonb_array_elements(tests.lire((select tech from ctx), 'aal2',
                    'select champs ->> ''titre'' as t, ministere_id as m from public.v_textes_a_relire
                      where cible = ''evenement_titre'' and cible_id in (select v1 from ctx union all select v2 from ctx)')) as x(l)
            where x.l ->> 'm' = (select com_m from ctx)::text
              and x.l ->> 't' in ('Soirée de louange', 'Soirée de louange et prière')), 2,
  'textes à relire : EJP Tech lit les deux versions corrigées, au ministère de Communication');

-- S13 : EJP Tech masque la version en vigueur.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('evenement_titre', (select v2 from ctx), 'titre', 'nom_personne') $$,
  'S13 : EJP Tech masque le nom en vigueur');
select tests.deconnecter();
select is(tests.lire((select com from ctx), 'aal2',
  'select titre from public.v_evenement where id = (select ev from ctx)'),
  jsonb_build_array(jsonb_build_object('titre', '[texte masqué par EJP Tech]')),
  'S13 : le calendrier montre le texte masqué');
select ok((select titre = 'Soirée de lounge' from public.evenement where id = (select ev from ctx))
          and (select titre = 'Soirée de louange' from public.evenement_titre where id = (select v1 from ctx)),
  'S13 : les autres versions du nom ne changent pas');
select is((select count(*)::integer from public.moderation
            where cible = 'evenement_titre' and cible_id = (select v2 from ctx) and decision = 'masque' and champ = 'titre'), 1,
  'S13 : une décision de modération sur cette version');
select is((select count(*)::integer from public.journal
            where cible = 'evenement_titre' and cible_id = (select v2 from ctx) and action = 'texte_masque'
              and ministere_id = (select com_m from ctx)), 1,
  'S13 : une ligne de journal texte_masque, au ministère porteur');
select is(tests.compter((select admin from ctx), 'aal2',
  'select 1 from public.v_journal where cible = ''evenement_titre'''), 0,
  'S13 : l''administration ne lit pas les lignes de modération d''un nom d''événement');
select is(tests.compter((select com from ctx), 'aal2',
  'select 1 from public.v_journal where cible = ''evenement_titre'' and action = ''texte_masque'''), 1,
  'S13 : le porteur lit la ligne de masquage de son événement');
select is(tests.lire((select com from ctx), 'aal2',
  'select cible_texte from public.v_journal where cible = ''evenement_titre'' and action = ''texte_masque'''),
  jsonb_build_array(jsonb_build_object('cible_texte', '[texte masqué par EJP Tech]')),
  'S13 : la ligne de masquage nomme la version masquée, jamais le texte d''origine');

-- EJP Tech relit l'autre version : rien à signaler.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.marquer_relu('evenement_titre', (select v1 from ctx)) $$,
  'EJP Tech relit la première version corrigée');
select tests.deconnecter();
select is(tests.lire((select tech from ctx), 'aal2',
  'select etat from public.v_textes_a_relire where cible = ''evenement_titre'' and cible_id = (select v1 from ctx)'),
  jsonb_build_array(jsonb_build_object('etat', 'relu')),
  'la version relue est « relu » dans la file');

-- Inaltérabilité, même pour le propriétaire des tables (seul masquer_texte réécrit un nom).
select throws_ok($$ update public.evenement_titre set titre = 'Autre nom' $$,
  '42501', 'La table evenement_titre est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_titre : aucune modification, même pour le propriétaire');
select throws_ok($$ delete from public.evenement_titre $$,
  '42501', 'La table evenement_titre est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_titre : aucune suppression, même pour le propriétaire');
select throws_ok($$ truncate public.evenement_titre $$,
  '42501', 'La table evenement_titre est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'evenement_titre : aucun vidage, même pour le propriétaire');

select * from finish();
rollback;
