-- Catalogue et indicateurs prévus (lot B3 ; docs/plan-etape-4.md, section 4, « B3 » ;
-- configuration-indicateurs.md 5.5, 5.8 et 5.11 ; contrat-etape-4.md, sections 5 à 7 ; P41, P42).
-- Catalogue privé et contrôle de ses termes ; v_catalogue (administration, EJP Tech) ;
-- v_suggestions (sans ce qui est déjà sur la fiche, ni un chiffre commun) ;
-- creer_indicateurs_prevus : profils, modèle inconnu, tout ou rien, sans doublon, « aucun »,
-- sensibles créés actifs avec les autres prévus, termes des calculs, une ligne de journal ;
-- limite de 30 lignes par fiche (31e refusée, remplacement accepté à 30).
begin;

select plan(35);

create temp table ctx as
select tests.creer_ministere('Catalogue A') as a_m,
       tests.creer_ministere('Catalogue B') as b_m,
       tests.creer_ministere('Catalogue C') as c_m,
       tests.creer_ministere('Catalogue D') as d_m,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column d uuid, add column ancien uuid, add column nouveau uuid;
update ctx set a = tests.creer_compte('catalogue-a@exemple.test', 'ministere', a_m),
               d = tests.creer_compte('catalogue-d@exemple.test', 'ministere', d_m);
grant select on ctx to authenticated;

-- Catalogue d'essai : un modèle de six prévus (un sensible, un calcul), trois suggestions (une
-- qui porte le libellé d'un prévu, une qui porte celui d'un chiffre commun), un modèle dont deux
-- prévus ont le même libellé normalisé et un modèle dont le prévu porte un nom déjà pris.
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, unite, sensible, calcul, ordre) values
  ('essai_cat_presents', 'essai catalogue', 'Essai catalogue présents', 'Présents d''essai du catalogue.', 'dimanche', 'nombre', false, null, 1),
  ('essai_cat_activites', 'essai catalogue', 'Essai catalogue activités', 'Activités d''essai du catalogue.', 'mois', 'nombre', false, null, 2),
  ('essai_cat_realisees', 'essai catalogue', 'Essai catalogue réalisées', 'Activités réalisées d''essai du catalogue.', 'mois', 'nombre', false, null, 3),
  ('essai_cat_situations', 'essai catalogue', 'Essai catalogue situations', 'Situations d''essai du catalogue.', 'mois', 'nombre', true, null, 4),
  ('essai_cat_inscrits', 'essai catalogue', 'Essai catalogue inscrits', 'Inscrits d''essai du catalogue.', 'a_ce_jour', 'grand_nombre', false, null, 5),
  ('essai_cat_part', 'essai catalogue', 'Essai catalogue part', 'Part d''essai du catalogue, calculée.', 'mois', 'nombre', false, 'taux', 6),
  ('essai_cat_sug', 'suggestion', 'Essai catalogue suggestion', 'Suggestion d''essai du catalogue.', 'mois', 'nombre', false, null, 1),
  ('essai_cat_sug_prevu', 'suggestion', 'Essai catalogue activités', 'Activités d''essai du catalogue.', 'mois', 'nombre', false, null, 2),
  ('essai_cat_sug_commun', 'suggestion', 'Stars au service', 'Suggestion d''essai qui imite un chiffre commun.', 'dimanche', 'nombre', false, null, 3),
  ('essai_conflit_un', 'essai conflit', 'Essai conflit un', 'Premier prévu d''essai du conflit.', 'mois', 'nombre', false, null, 1),
  ('essai_conflit_deux', 'essai conflit', 'Nombre de essai conflit un', 'Second prévu d''essai du conflit.', 'mois', 'nombre', false, null, 2),
  ('essai_existant', 'essai existant', 'Essai existant pris', 'Prévu d''essai dont le nom est déjà pris.', 'mois', 'nombre', false, null, 1);
insert into private.indicateur_prevu_terme (prevu_code, ordre, role, source_code) values
  ('essai_cat_part', 1, 'haut', 'essai_cat_realisees'),
  ('essai_cat_part', 2, 'bas', 'essai_cat_activites');

-- 1. Catalogue privé : ses termes et ses suggestions sont contrôlés
select throws_ok($$ insert into private.indicateur_prevu_terme (prevu_code, ordre, role, source_code)
                    values ('essai_cat_part', 3, 'haut', 'essai_cat_situations') $$,
  'P0001', 'La source d''un calcul prévu est un indicateur saisi, non sensible, du même modèle.',
  'un prévu sensible n''est la source d''aucun calcul prévu');
select throws_ok($$ insert into private.indicateur_prevu_terme (prevu_code, ordre, role, source_code)
                    values ('essai_cat_activites', 1, 'haut', 'essai_cat_realisees') $$,
  'P0001', 'Un terme prévu appartient à un calcul prévu.', 'un terme prévu vise un calcul prévu');
select throws_ok($$ insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sensible)
                    values ('essai_cat_sug_sensible', 'suggestion', 'Essai suggestion sensible', 'Suggestion sensible d''essai.', 'mois', true) $$,
  '23514', null, 'une suggestion n''est jamais sensible');

-- 2. Lectures du catalogue
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.v_catalogue where code like ''essai_cat%'''), 9,
  'l''administration lit tout le catalogue (prévus et suggestions)');
select is(tests.compter((select tech from ctx), 'aal2', 'select 1 from public.v_catalogue where code like ''essai_cat%'''), 9,
  'EJP Tech lit tout le catalogue');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.v_catalogue'), 0,
  'le berger ne lit pas le catalogue');
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.v_catalogue'), 0,
  'un ministère ne lit pas le catalogue');
select is(tests.lire((select a from ctx), 'aal2',
  format('select code from public.v_suggestions where ministere_id = %L and code like %L', (select a_m from ctx), 'essai_cat%')),
  '[{"code": "essai_cat_sug_prevu"}, {"code": "essai_cat_sug"}]'::jsonb,
  'un ministère lit les suggestions de sa fiche, sans celle qui porte le libellé d''un chiffre commun');

-- 3. creer_indicateurs_prevus : profils et modèle
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateurs_prevus((select a_m from ctx), 'essai catalogue') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère ne crée pas ses prévus');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateurs_prevus((select a_m from ctx), 'essai catalogue') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne crée pas de prévus');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateurs_prevus((select a_m from ctx), 'essai inconnu') $$,
  'P0001', 'Ce modèle n''existe pas dans le catalogue.', 'un modèle absent du catalogue est refusé');
select throws_ok($$ select public.creer_indicateurs_prevus((select a_m from ctx), 'suggestion') $$,
  'P0001', 'Ce modèle n''existe pas dans le catalogue.', 'les suggestions ne sont pas un modèle');
select is(public.creer_indicateurs_prevus((select a_m from ctx), 'essai catalogue'), 6,
  'l''administration crée les six prévus du modèle');
select is(public.creer_indicateurs_prevus((select a_m from ctx), 'essai catalogue'), 0,
  'un second appel ne crée aucun doublon');
select tests.deconnecter();

select results_eq($$ select i.modele_code, i.etat, i.actif, i.origine, i.sensible, i.nature, i.unite, i.calcul
                      from public.indicateur i where i.ministere_id = (select a_m from ctx) order by i.ordre $$,
  $$ values ('essai_cat_presents'::text, 'actif'::text, true, 'eglise'::text, false, 'dimanche'::text, 'nombre'::text, null::text),
            ('essai_cat_activites', 'actif', true, 'eglise', false, 'mois', 'nombre', null),
            ('essai_cat_realisees', 'actif', true, 'eglise', false, 'mois', 'nombre', null),
            ('essai_cat_situations', 'actif', true, 'eglise', true, 'mois', 'nombre', null),
            ('essai_cat_inscrits', 'actif', true, 'eglise', false, 'a_ce_jour', 'grand_nombre', null),
            ('essai_cat_part', 'actif', true, 'eglise', false, 'mois', 'nombre', 'taux') $$,
  'les prévus sont actifs dès leur création, le sensible comme les autres (P42)');
select results_eq($$ select t.ordre, t.role, s.modele_code from public.indicateur_terme t
                      join public.indicateur c on c.id = t.calcul_id
                      join public.indicateur s on s.id = t.source_id
                     where c.ministere_id = (select a_m from ctx) order by t.ordre $$,
  $$ values (1::smallint, 'haut'::text, 'essai_cat_realisees'::text), (2::smallint, 'bas'::text, 'essai_cat_activites'::text) $$,
  'le calcul prévu reçoit ses termes, sources de la même fiche');
select results_eq($$ select j.compte, j.cible, j.cible_id, j.detail from public.journal j
                      where j.action = 'indicateurs_prevus_crees' and j.ministere_id = (select a_m from ctx) $$,
  $$ select admin, 'ministere'::text, a_m, '{"modele": "essai catalogue", "nombre": 6}'::jsonb from ctx $$,
  'une seule ligne de journal : le code du modèle et le nombre, sans texte');
select is(tests.lire((select a from ctx), 'aal2',
  format('select code from public.v_suggestions where ministere_id = %L and code like %L', (select a_m from ctx), 'essai_cat%')),
  '[{"code": "essai_cat_sug"}]'::jsonb,
  'une suggestion dont le libellé est déjà sur la fiche n''est plus proposée');

-- Le prévu sensible se saisit dès sa création, par le ministère
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
                   select i.id, i.ministere_id, (private.mois_courant() - interval '1 month')::date, 2
                     from public.indicateur i where i.ministere_id = (select a_m from ctx) and i.modele_code = 'essai_cat_situations' $$,
  'le ministère saisit le prévu sensible dès sa création');
select tests.deconnecter();

-- 4. « aucun » : une ligne de journal la première fois, rien ensuite
select tests.se_connecter((select admin from ctx), 'aal2');
select is(public.creer_indicateurs_prevus((select c_m from ctx), 'aucun'), 0, '« aucun » ne crée aucun indicateur');
select is(public.creer_indicateurs_prevus((select c_m from ctx), 'aucun'), 0, '« aucun » une seconde fois non plus');
select tests.deconnecter();
select results_eq($$ select j.detail from public.journal j
                      where j.action = 'indicateurs_prevus_crees' and j.ministere_id = (select c_m from ctx) $$,
  $$ values ('{"modele": "aucun", "nombre": 0}'::jsonb) $$,
  '« aucun » écrit une seule ligne de journal, la première fois');
select is((select count(*)::int from public.indicateur i where i.ministere_id = (select c_m from ctx)), 0,
  'la fiche sans prévu reste vide');

-- 5. Tout ou rien
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateurs_prevus((select b_m from ctx), 'essai conflit') $$,
  '23505', null, 'deux prévus au même libellé normalisé : l''appel échoue');
select tests.deconnecter();
select is((select count(*)::int from public.indicateur i where i.ministere_id = (select b_m from ctx))
          + (select count(*)::int from public.journal j where j.ministere_id = (select b_m from ctx)), 0,
  'tout ou rien : ni indicateur ni ligne de journal après l''échec');
insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai existant pris', 'Indicateur d''essai dont le nom est pris.', 'mois', b_m from ctx;
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateurs_prevus((select b_m from ctx), 'essai existant') $$,
  'P0001', 'La fiche a déjà « Essai existant pris » : retirez-le avant de créer les indicateurs prévus.',
  'un prévu dont le nom est déjà sur la fiche est refusé, avec le nom en cause');
select tests.deconnecter();

-- 6. Trente lignes par fiche (P41) : 25 indicateurs et 6 prévus font 31, refusés ; 24 et 6
-- font 30, acceptés ; la 31e est refusée, un remplacement passe.
insert into public.indicateur (libelle, definition, nature, ministere_id, ordre)
select 'Essai ligne ' || n, 'Indicateur d''essai pour la limite de la fiche.', 'mois', c.d_m, n
from ctx c cross join generate_series(1, 25) as n;
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.creer_indicateurs_prevus((select d_m from ctx), 'essai catalogue') $$,
  'P0001', 'Avec les indicateurs prévus, la fiche compterait 31 indicateurs : 30 au plus.',
  'des prévus qui porteraient la fiche à 31 lignes sont refusés');
select tests.deconnecter();
update public.indicateur set etat = 'retire', retrait_motif = 'plus_suivi'
 where ministere_id = (select d_m from ctx) and libelle = 'Essai ligne 25';
select tests.se_connecter((select admin from ctx), 'aal2');
select is(public.creer_indicateurs_prevus((select d_m from ctx), 'essai catalogue'), 6,
  'des prévus qui portent la fiche à 30 lignes sont acceptés');
select is(tests.lire((select admin from ctx), 'aal2',
  format('select ajouts, ajouts_max, lignes, lignes_max from public.limites_indicateurs(%L)', (select d_m from ctx))),
  '[{"ajouts": 0, "ajouts_max": 3, "lignes": 30, "lignes_max": 30}]'::jsonb,
  'limites_indicateurs compte 30 lignes sur 30, retirés non compris');
select throws_ok($$ select public.creer_indicateur((select d_m from ctx), 'Essai trente et un',
                     'Indicateur d''essai de trop sur la fiche.', 'mois', 'nombre', false, false, null) $$,
  'P0001', 'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.',
  'la 31e ligne est refusée à l''administration');
select tests.se_connecter((select d from ctx), 'aal2');
select throws_ok($$ select public.ajouter_suggestion((select d_m from ctx), 'essai_cat_sug', 'Pourquoi d''essai pour la limite.') $$,
  'P0001', 'Votre fiche compte déjà 30 indicateurs. Demandez à l''administration de l''église d''en retirer un.',
  'la 31e ligne est refusée au ministère');
select tests.deconnecter();
update ctx set ancien = (select i.id from public.indicateur i where i.ministere_id = ctx.d_m and i.libelle = 'Essai ligne 1');
select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.creer_indicateur((select d_m from ctx), 'Essai ligne 1',
                    'Indicateur d''essai remplacé, saisi chaque dimanche.', 'dimanche', 'nombre', false, false, (select ancien from ctx)) $$,
  'à 30 lignes, un remplacement passe, sous le même nom');
select tests.deconnecter();
update ctx set nouveau = (select i.id from public.indicateur i where i.remplace_id = ctx.ancien);
select results_eq($$ select a.etat, a.retrait_motif, n.etat, n.nature from public.indicateur a, public.indicateur n
                      where a.id = (select ancien from ctx) and n.id = (select nouveau from ctx) $$,
  $$ values ('retire'::text, 'remplace'::text, 'actif'::text, 'dimanche'::text) $$,
  'l''ancien est retiré avec le motif « remplace », le nouveau est actif');
select lives_ok($$ set constraints all immediate $$,
  'à la fin de la transaction, remplacements et termes des calculs sont complets');
set constraints all deferred;
select results_eq($$ select j.compte, j.detail from public.journal j
                      where j.action = 'indicateur_cree' and j.cible_id = (select nouveau from ctx) $$,
  $$ select admin, jsonb_build_object('nature', 'dimanche', 'unite', 'nombre', 'origine', 'eglise', 'remplace', ancien) from ctx $$,
  'la ligne de journal du remplaçant nomme l''indicateur remplacé, sans texte');

select * from finish();
rollback;
