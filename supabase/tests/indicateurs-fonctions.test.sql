-- Fonctions de configuration des indicateurs (lot B3 ; docs/plan-etape-4.md, section 4, « B3 » ;
-- configuration-indicateurs.md 4.6, 5.8 et 6.1 ; contrat-etape-4.md, sections 1 et 7 ; Q13).
-- limites_indicateurs (valeurs, appelants, verrou sur la ligne du ministère) ; creer_calcul
-- (sources d'un autre ministère, sensibles ou communes refusées, rythmes incompatibles,
-- remplacement, ministère et berger refusés, administration et EJP Tech acceptés) ;
-- corriger_indicateur (avant et après saisie, doublon, mots refusés, commun, suggestion,
-- retiré) ; creer_indicateur (domaine sensible, forme d'un sensible, remplacement d'une autre
-- fiche) ; retirer_indicateur (motifs, saisies gardées, calculs retirés avec leur source,
-- confidentialité) ; journal sans texte ; mot sensible refusé à la correction d'un indicateur non
-- sensible ; remplacement d'un calcul d'une autre fiche ou d'une autre sorte ; calculs retirés avec
-- l'indicateur remplacé ; verrou du ministère dans ajouter_suggestion, creer_indicateur et
-- creer_calcul ; fiche désactivée refusée.
begin;

select plan(78);

create temp table ctx as
select tests.creer_ministere('Fonctions A') as a_m,
       tests.creer_ministere('Fonctions B') as b_m,
       tests.creer_ministere('Fonctions verrou') as e_m,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (select i.id from public.indicateur i where i.code = 'service') as service;
alter table ctx add column a uuid, add column b uuid,
  add column h uuid, add column bs uuid, add column dim uuid, add column sens uuid, add column sai uuid,
  add column vie uuid, add column aut uuid, add column sug uuid, add column c1 uuid, add column c2 uuid;
update ctx set a = tests.creer_compte('fonctions-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('fonctions-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated;

insert into public.indicateur (libelle, definition, nature, ministere_id, sensible)
select x.libelle, 'Indicateur d''essai des fonctions de configuration.', x.nature,
       case when x.autre then c.b_m else c.a_m end, x.sensible
from ctx c
cross join (values ('Essai fonctions haut', 'mois', false, false), ('Essai fonctions bas', 'mois', false, false),
                   ('Essai fonctions dimanche', 'dimanche', false, false), ('Essai fonctions sensible', 'mois', true, false),
                   ('Essai fonctions saisi', 'mois', false, false), ('Essai fonctions vierge', 'mois', false, false),
                   ('Essai fonctions autre', 'mois', false, true)) as x(libelle, nature, sensible, autre);
update ctx set
  h = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions haut'),
  bs = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions bas'),
  dim = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions dimanche'),
  sens = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions sensible'),
  sai = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions saisi'),
  vie = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions vierge'),
  aut = (select i.id from public.indicateur i where i.ministere_id = ctx.b_m and i.libelle = 'Essai fonctions autre');
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre)
values ('essai_fn_sug', 'suggestion', 'Essai fonctions suggestion', 'Suggestion d''essai des fonctions.', 'mois', 1);

-- 1. Limites d'une fiche
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_fn_sug', 'Pourquoi d''essai des fonctions.') $$,
  'le ministère ajoute une suggestion (un ajout à valider)');
select lives_ok($$ insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
                   select x.id, c.a_m, (private.mois_courant() - interval '1 month')::date, 5
                     from ctx c cross join lateral (values (c.sai), (c.h)) as x(id) $$,
  'le ministère saisit deux de ses indicateurs');
select tests.deconnecter();
update ctx set sug = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_fn_sug');

select is(tests.lire((select a from ctx), 'aal2',
  format('select ajouts, ajouts_max, lignes, lignes_max from public.limites_indicateurs(%L)', (select a_m from ctx))),
  '[{"ajouts": 1, "ajouts_max": 3, "lignes": 7, "lignes_max": 30}]'::jsonb,
  'le ministère lit ses limites : 1 ajout sur 3, 7 lignes sur 30');
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select * from public.limites_indicateurs((select a_m from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un autre ministère n''apprend rien des limites d''une fiche');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select * from public.limites_indicateurs((select a_m from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne lit pas les limites');
select tests.deconnecter();
select is(tests.essai((select a from ctx), 'aal1',
  format('select * from public.limites_indicateurs(%L)', (select a_m from ctx))), '42501',
  'hors double authentification, les limites sont refusées');
-- Verrou : la ligne du ministère est verrouillée par la transaction qui lit ses limites.
select ok((select m.xmax::text = '0' from public.ministere m where m.id = (select e_m from ctx)),
  'avant l''appel, la ligne du ministère n''est pas verrouillée');
select tests.se_connecter((select admin from ctx), 'aal2');
select is((select l.lignes from public.limites_indicateurs((select e_m from ctx)) as l), 0,
  'l''administration lit les limites d''une fiche vide');
select tests.deconnecter();
select ok((select m.xmax::text = (txid_current() % 4294967296)::text from public.ministere m where m.id = (select e_m from ctx)),
  'limites_indicateurs verrouille la ligne du ministère jusqu''à la fin de la transaction');

-- 2. creer_calcul
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select bs from ctx), null) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère ne crée pas de calcul');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select bs from ctx), null) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne crée pas de calcul');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select aut from ctx), null) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'une source d''un autre ministère est refusée');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select sens from ctx), null) $$,
  'P0001', 'Un indicateur sensible n''entre dans aucun calcul.', 'une source sensible est refusée');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select service from ctx), null) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'une source commune est refusée');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'somme', (select h from ctx), (select bs from ctx), null) $$,
  'P0001', 'Choisissez un taux ou une moyenne.', 'creer_calcul fait un taux ou une moyenne');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select h from ctx), null) $$,
  'P0001', 'Un calcul se fait sur des chiffres distincts.', 'deux fois la même source est refusée');
select throws_ok($$ select public.creer_calcul('Part d''essai', 'Part d''essai des fonctions.', 'taux', (select h from ctx), (select dim from ctx), null) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'deux rythmes incompatibles sont refusés');
select lives_ok($$ select public.creer_calcul('Taux d''essai des fonctions', 'Part d''essai des fonctions, calculée.', 'taux',
                                              (select h from ctx), (select bs from ctx), null) $$,
  'l''administration crée un taux');
select tests.deconnecter();
update ctx set c1 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.calcul is not null);
select results_eq($$ select i.calcul, i.nature, i.unite, i.origine, i.etat,
                            (select count(*)::int from public.indicateur_terme t where t.calcul_id = i.id)
                       from public.indicateur i where i.id = (select c1 from ctx) $$,
  $$ values ('taux'::text, 'mois'::text, 'nombre'::text, 'eglise'::text, 'actif'::text, 2) $$,
  'le calcul prend le rythme de ses sources et reçoit ses deux termes');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.creer_calcul('Taux d''essai des fonctions', 'Part d''essai des fonctions, autre formule.', 'moyenne',
                                              (select h from ctx), (select bs from ctx), (select c1 from ctx)) $$,
  'EJP Tech remplace le calcul, sous le même nom');
select tests.deconnecter();
update ctx set c2 = (select i.id from public.indicateur i where i.remplace_id = ctx.c1);
select results_eq($$ select a.etat, a.retrait_motif, n.calcul, n.etat from public.indicateur a, public.indicateur n
                      where a.id = (select c1 from ctx) and n.id = (select c2 from ctx) $$,
  $$ values ('retire'::text, 'remplace'::text, 'moyenne'::text, 'actif'::text) $$,
  'l''ancien calcul est retiré avec le motif « remplace »');
select lives_ok($$ set constraints all immediate $$, 'à la fin de la transaction, termes et remplacement sont complets');
set constraints all deferred;
select results_eq($$ select j.compte, j.ministere_id, j.detail from public.journal j
                      where j.action = 'indicateur_cree' and j.cible_id = (select c2 from ctx) $$,
  $$ select tech, a_m, jsonb_build_object('nature', 'mois', 'unite', 'nombre', 'origine', 'eglise', 'remplace', c1) from ctx $$,
  'une ligne de journal par calcul, sans texte');

-- 3. corriger_indicateur
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Essai corrigé', 'Définition corrigée de l''essai.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère ne corrige pas (lot 1)');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Essai corrigé', 'Définition corrigée de l''essai.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne corrige pas');
select tests.se_connecter((select admin from ctx), 'aal2');
select is(public.corriger_indicateur((select vie from ctx), 'Essai fonctions vierge corrigé', 'Définition corrigée de l''essai des fonctions.'),
  'corrige', 'avant toute saisie, l''administration corrige le libellé et la définition');
select tests.deconnecter();
select results_eq($$ select i.libelle, i.definition, i.texte_par from public.indicateur i where i.id = (select vie from ctx) $$,
  $$ select 'Essai fonctions vierge corrigé'::text, 'Définition corrigée de l''essai des fonctions.'::text, admin from ctx $$,
  'les textes changent, au nom de l''administration');
select results_eq($$ select j.detail from public.journal j where j.action = 'indicateur_corrige' and j.cible_id = (select vie from ctx) $$,
  $$ values ('{"champs": ["libelle", "definition"]}'::jsonb) $$, 'la ligne de journal nomme les champs, jamais les textes');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Essai fonctions vierge corrigé', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Rien n''a changé : ce libellé et cette définition sont déjà enregistrés.', 'une correction sans changement est refusée');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Enfants hospitalisés', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Ce chiffre semble sensible : remplacez-le par un nouvel indicateur « Domaine sensible ».',
  'un indicateur non sensible ne prend pas un mot du domaine sensible par une correction');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Essai fonctions haut', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Cette fiche a déjà « Essai fonctions haut ».', 'un libellé déjà sur la fiche est refusé');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Stars au service', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Cette fiche a déjà « STARs au service ».', 'le libellé d''un chiffre commun est refusé');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Essai fonctions vierge corrigé', 'Écrire à jean@exemple.test pour savoir.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'une définition qui contient un email est refusée');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Taux de visuels', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.', 'un mot de calcul est refusé pour un indicateur saisi');
select throws_ok($$ select public.corriger_indicateur((select sai from ctx), 'Essai fonctions saisi corrigé', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.', 'un indicateur saisi ne se corrige plus');
select throws_ok($$ select public.corriger_indicateur((select c2 from ctx), 'Moyenne d''essai', 'Moyenne d''essai des fonctions, corrigée.') $$,
  'P0001', 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.', 'un calcul dont une source a des valeurs ne se corrige plus');
select throws_ok($$ select public.corriger_indicateur((select service from ctx), 'STARs au service', 'Définition corrigée d''un commun.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un chiffre commun ne se corrige pas');
select throws_ok($$ select public.corriger_indicateur((select sug from ctx), 'Essai suggestion corrigée', 'Définition corrigée de la suggestion.') $$,
  'P0001', 'Une suggestion garde le nom qu''elle a dans tous les ministères.', 'une suggestion ne se corrige pas sur une fiche');
select throws_ok($$ select public.corriger_indicateur((select c1 from ctx), 'Essai calcul retiré', 'Définition corrigée d''un calcul retiré.') $$,
  'P0001', 'Un indicateur retiré ne change plus.', 'un indicateur retiré ne se corrige pas');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
                   select vie, a_m, (private.mois_courant() - interval '1 month')::date, 3 from ctx $$,
  'le ministère saisit l''indicateur corrigé');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.corriger_indicateur((select vie from ctx), 'Essai fonctions vierge recorrigé', 'Définition corrigée de l''essai des fonctions.') $$,
  'P0001', 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.', 'après une saisie, la correction est refusée');

-- 4. creer_indicateur
select throws_ok($$ select public.creer_indicateur((select a_m from ctx), 'Enfants accueillis', 'Enfants accueillis pendant le culte.',
                                                   'mois', 'nombre', false, false, null) $$,
  'P0001', 'Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n''est pas le cas.',
  'un mot du domaine sensible bloque l''administration sans case ni confirmation');
select lives_ok($$ select public.creer_indicateur((select a_m from ctx), 'Enfants accueillis', 'Enfants accueillis pendant le culte.',
                                                  'mois', 'nombre', false, true, null) $$,
  'confirmé « pas un domaine sensible », l''indicateur est créé');
select lives_ok($$ select public.creer_indicateur((select a_m from ctx), 'Enfants orientés', 'Enfants orientés vers un accompagnement.',
                                                  'mois', 'nombre', true, false, null) $$,
  'case « Domaine sensible » cochée, l''indicateur sensible est créé');
select throws_ok($$ select public.creer_indicateur((select a_m from ctx), 'Enfants présents', 'Enfants présents au culte du matin.',
                                                   'dimanche', 'nombre', true, false, null) $$,
  'P0001', 'Un indicateur sensible se saisit chaque mois.', 'un sensible du dimanche est refusé');
select throws_ok($$ select public.creer_indicateur((select a_m from ctx), 'Essai rythme', 'Indicateur d''essai sans rythme connu.',
                                                   'trimestre', 'nombre', false, false, null) $$,
  'P0001', 'Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.', 'un rythme inconnu est refusé');
select throws_ok($$ select public.creer_indicateur((select a_m from ctx), 'Essai remplaçant', 'Remplaçant d''un indicateur d''une autre fiche.',
                                                   'mois', 'nombre', false, false, (select aut from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un indicateur d''une autre fiche ne se remplace pas');
select throws_ok($$ select public.creer_indicateur((select a_m from ctx), 'Essai remplaçant calcul', 'Remplaçant d''un calcul par un indicateur saisi.',
                                                   'mois', 'nombre', false, false, (select c2 from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un calcul ne se remplace pas par un indicateur saisi');
select throws_ok($$ select public.creer_calcul('Part de remplacement', 'Calcul qui remplace un indicateur d''une autre fiche.', 'taux',
                                               (select h from ctx), (select bs from ctx), (select aut from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un calcul ne remplace pas un indicateur d''une autre fiche');
select throws_ok($$ select public.creer_calcul('Part de remplacement', 'Calcul qui remplace un indicateur saisi.', 'taux',
                                               (select h from ctx), (select bs from ctx), (select sai from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un calcul ne remplace pas un indicateur saisi');
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateur((select a_m from ctx), 'Essai ministère', 'Compte écrit par le ministère.',
                                                   'mois', 'nombre', false, false, null, 'Pourquoi d''un compte écrit.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère n''écrit pas son propre compte (lot 2)');
select tests.deconnecter();
select results_eq($$ select i.sensible, i.etat, i.origine from public.indicateur i
                      where i.ministere_id = (select a_m from ctx) and i.libelle = 'Enfants orientés' $$,
  $$ values (true, 'actif'::text, 'eglise'::text) $$, 'un sensible créé par l''administration est actif dès sa création');

-- Le remplacement d'une source retire les calculs qui en dépendent, et le journal en donne le nombre.
insert into public.indicateur (libelle, definition, nature, ministere_id)
select x.libelle, 'Indicateur d''essai du remplacement d''une source.', 'mois', c.a_m
from ctx c cross join (values ('Essai fonctions racine'), ('Essai fonctions socle')) as x(libelle);
alter table ctx add column r uuid, add column rb uuid;
update ctx set
  r = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions racine'),
  rb = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai fonctions socle');
select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.creer_calcul('Taux de remplacement d''essai', 'Calcul d''essai du remplacement d''une source.', 'taux',
                                              (select r from ctx), (select rb from ctx), null) $$,
  'l''administration crée un calcul sur une racine et un socle');
select lives_ok($$ select public.creer_indicateur((select a_m from ctx), 'Essai fonctions racine neuve', 'Nouvelle racine d''essai, qui remplace l''ancienne.',
                                                  'mois', 'nombre', false, false, (select r from ctx)) $$,
  'l''administration remplace la racine');
select tests.deconnecter();
select results_eq($$ select c.etat, c.retrait_motif from public.indicateur c
                      where c.ministere_id = (select a_m from ctx) and c.libelle = 'Taux de remplacement d''essai' $$,
  $$ values ('retire'::text, 'source_retiree'::text) $$, 'le calcul de la racine remplacée est retiré avec elle');
select results_eq($$ select j.detail from public.journal j
                      where j.action = 'indicateur_cree' and j.cible_id = (select i.id from public.indicateur i where i.remplace_id = (select r from ctx)) $$,
  $$ select jsonb_build_object('nature', 'mois', 'unite', 'nombre', 'origine', 'eglise', 'remplace', r, 'calculs', 1) from ctx $$,
  'la ligne de journal du remplaçant donne le nombre de calculs retirés');

-- 5. retirer_indicateur
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.retirer_indicateur((select vie from ctx), 'plus_suivi') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère ne retire pas (lot 1)');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.retirer_indicateur((select vie from ctx), 'remplace') $$,
  'P0001', 'Choisissez le motif du retrait.', 'un motif posé par la base ne se choisit pas');
select throws_ok($$ select public.retirer_indicateur((select service from ctx), 'plus_suivi') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un chiffre commun ne se retire pas');
select is(public.retirer_indicateur((select sai from ctx), 'plus_suivi'), 0, 'l''administration retire un indicateur saisi');
select throws_ok($$ select public.retirer_indicateur((select sai from ctx), 'erreur') $$,
  'P0001', 'Cet indicateur est déjà retiré.', 'un indicateur retiré ne se retire pas deux fois');
select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.retirer_indicateur((select h from ctx), 'doublon'), 1, 'EJP Tech retire une source : son calcul part avec elle');
select tests.se_connecter((select admin from ctx), 'aal2');
select is(public.retirer_indicateur((select dim from ctx), 'confidentialite'), 0, 'l''administration retire un indicateur pour confidentialité');
select tests.deconnecter();
select results_eq($$ select i.etat, i.retrait_motif, (select count(*)::int from public.mesure m where m.indicateur_id = i.id)
                      from public.indicateur i where i.id = (select sai from ctx) $$,
  $$ values ('retire'::text, 'plus_suivi'::text, 1) $$, 'retiré, l''indicateur garde ses saisies');
select results_eq($$ select i.etat, i.retrait_motif from public.indicateur i where i.id = (select c2 from ctx) $$,
  $$ values ('retire'::text, 'source_retiree'::text) $$, 'le calcul est retiré avec le motif « source retirée »');
select results_eq($$ select i.libelle, i.definition, i.retrait_motif from public.indicateur i where i.id = (select dim from ctx) $$,
  $$ values ('[retiré pour confidentialité]'::text, '[retiré pour confidentialité]'::text, 'confidentialite'::text) $$,
  'pour confidentialité, le libellé et la définition sont masqués');
select results_eq($$ select j.cible_id, j.detail from public.journal j
                      where j.action = 'indicateur_retire' and j.ministere_id = (select a_m from ctx) order by j.id $$,
  $$ select sai, '{"motif": "plus_suivi", "avec_saisies": true, "calculs": 0}'::jsonb from ctx
     union all select h, '{"motif": "doublon", "avec_saisies": true, "calculs": 1}'::jsonb from ctx
     union all select dim, '{"motif": "confidentialite", "avec_saisies": false, "calculs": 0}'::jsonb from ctx $$,
  'une ligne de journal par retrait (aucune pour le calcul retiré avec sa source), sans texte');
select is_empty($$ select 1 from public.journal j where j::text like '%Essai fonctions%' or j::text like '%Enfants%' $$,
  'aucun libellé n''entre au journal');
select is(tests.lire((select berger from ctx), 'aal2',
  format('select cible_texte from public.v_journal where action = %L and cible_id = %L', 'indicateur_retire', (select dim from ctx))),
  '[{"cible_texte": "[retiré pour confidentialité]"}]'::jsonb,
  'v_journal donne le libellé actuel de l''indicateur, masqué après un retrait pour confidentialité');
select is(tests.lire((select a from ctx), 'aal2',
  format('select cible_texte from public.v_journal where action = %L and cible_id = %L', 'indicateur_corrige', (select vie from ctx))),
  '[{"cible_texte": "Essai fonctions vierge corrigé"}]'::jsonb,
  'le ministère lit dans son journal le libellé actuel de son indicateur');
select is(tests.compter((select b from ctx), 'aal2',
  format('select 1 from public.v_journal where cible_id = %L', (select vie from ctx))), 0,
  'un autre ministère ne lit pas ces lignes');

-- 6. Verrou du ministère : une création en cours tient la ligne jusqu'à la fin de la transaction ;
-- une fiche désactivée n'accepte plus de suggestion
select tests.deconnecter();
create temp table verrous as
select tests.creer_ministere('Fonctions verrou suggestion') as m_sug,
       tests.creer_ministere('Fonctions verrou indicateur') as m_ind,
       tests.creer_ministere('Fonctions verrou calcul') as m_cal,
       tests.creer_ministere('Fonctions fiche désactivée') as m_off;
alter table verrous add column haut uuid, add column bas uuid;
grant select on verrous to authenticated;
insert into public.indicateur (libelle, definition, nature, ministere_id)
select x.libelle, 'Indicateur d''essai du verrou d''un calcul.', 'mois', v.m_cal
from verrous v cross join (values ('Essai verrou haut'), ('Essai verrou bas')) as x(libelle);
update verrous set
  haut = (select i.id from public.indicateur i where i.ministere_id = verrous.m_cal and i.libelle = 'Essai verrou haut'),
  bas = (select i.id from public.indicateur i where i.ministere_id = verrous.m_cal and i.libelle = 'Essai verrou bas');
update public.ministere set desactive_le = now() where id = (select m_off from verrous);
select tests.se_connecter((select admin from ctx), 'aal2');
select ok(public.ajouter_suggestion((select m_sug from verrous), 'essai_fn_sug') is not null,
  'l''administration ajoute une suggestion sur une fiche');
select ok(public.creer_indicateur((select m_ind from verrous), 'Essai verrou indicateur', 'Indicateur d''essai du verrou de la fiche.',
                                  'mois', 'nombre', false, false, null) is not null,
  'l''administration crée un indicateur sur une fiche');
select ok(public.creer_calcul('Taux de verrou d''essai', 'Calcul d''essai du verrou de la fiche.', 'taux',
                              (select haut from verrous), (select bas from verrous), null) is not null,
  'l''administration crée un calcul sur une fiche');
select throws_ok($$ select public.ajouter_suggestion((select m_off from verrous), 'essai_fn_sug') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'une fiche désactivée n''accepte aucune suggestion');
select tests.deconnecter();
select ok((select m.xmax::text = (txid_current() % 4294967296)::text from public.ministere m where m.id = (select m_sug from verrous)),
  'ajouter_suggestion verrouille la ligne du ministère jusqu''à la fin de la transaction');
select ok((select m.xmax::text = (txid_current() % 4294967296)::text from public.ministere m where m.id = (select m_ind from verrous)),
  'creer_indicateur verrouille la ligne du ministère jusqu''à la fin de la transaction');
select ok((select m.xmax::text = (txid_current() % 4294967296)::text from public.ministere m where m.id = (select m_cal from verrous)),
  'creer_calcul verrouille la ligne du ministère jusqu''à la fin de la transaction');

select * from finish();
rollback;
