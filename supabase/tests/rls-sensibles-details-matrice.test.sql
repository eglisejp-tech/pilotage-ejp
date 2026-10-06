-- Matrice des droits des précisions et des répartitions des indicateurs sensibles (lot B8 ;
-- docs/plan-etape-4.md, section 4, « Matrice des droits des objets nouveaux » ; contrat-etape-4.md,
-- section 8), écrite en données et parcourue par tests.verifier_matrice (000-outils.test.sql).
--
-- Objets : categorie_sensible, ventilation_sensible et precision_sensible (lecture, ajout direct,
-- modification, suppression), v_ventilation_sensible, v_precision_sensible, saisir_chiffres_mois,
-- le couple de modération (precision_sensible, texte) (moderation, masquer_texte, marquer_relu)
-- et les lignes de journal de cible precision_sensible (journal, v_journal).
-- Profils : un ministère porteur (A, qui a saisi deux totaux avec précision, l'un réparti), un
-- autre ministère (B), les ministères FIJ et Coordination du jeu d'exemple, le berger, le
-- conseil, l'administration de l'église et EJP Tech, en aal2 ; la dérivation ajoute la ligne
-- aal1 de chacun (zéro ligne lue, toute autre action refusée) et la ligne de l'anonyme (refusé
-- partout). L'administration et un autre ministère ne lisent aucune précision ni aucune
-- répartition.
-- Puis l'inaltérabilité, même au propriétaire, sauf le masquage d'une précision, et le retrait
-- pour confidentialité, qui vide les quatre lectures, EJP Tech compris.
begin;

create temp table ctx as
select tests.creer_ministere('Matrice B8 porteur') as a_m,
       tests.creer_ministere('Matrice B8 autre') as b_m,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '2 months')::date as m2,
       (private.mois_courant() - interval '3 months')::date as m3;
alter table ctx add column a uuid, add column b uuid, add column sens uuid, add column p1 uuid, add column p2 uuid;
update ctx set a = tests.creer_compte('matrice-b8-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-b8-b@exemple.test', 'ministere', b_m);

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sensible, ordre) values
  ('essai_b8_mat', 'essai b8 mat', 'Essai B8 matrice', 'Sensible d''essai de la matrice des droits.', 'mois', true, 1);
select set_config('pilotage.migration', 'oui', true);
insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values
  ('essai_b8_mat', 'p', 'Catégorie P', 1), ('essai_b8_mat', 'q', 'Catégorie Q', 2), ('essai_b8_mat', 'r', 'Catégorie R', 3);
select set_config('pilotage.migration', '', true);
insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, modele_code)
select 'Essai B8 matrice', 'Sensible d''essai de la matrice des droits.', 'mois', c.a_m, true, 'essai_b8_mat' from ctx c;
update ctx set sens = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_b8_mat');
grant select on ctx to authenticated, anon;

-- A envoie deux mois : 6 réparti 4 et 2 avec une précision, puis 3 avec une précision.
-- EJP Tech relit la première précision.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 6, 'categories', jsonb_build_object('p', 4, 'q', 2),
    'precision', 'Précision de la matrice des droits.')));
  perform public.saisir_chiffres_mois((select m2 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 3, 'precision', 'Seconde précision de la matrice.')));
  perform tests.deconnecter();
end $$;
update ctx set p1 = (select p.id from public.precision_sensible p where p.indicateur_id = ctx.sens and p.mois = ctx.m1),
               p2 = (select p.id from public.precision_sensible p where p.indicateur_id = ctx.sens and p.mois = ctx.m2);
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.marquer_relu('precision_sensible', (select p1 from ctx));
  perform tests.deconnecter();
end $$;

-- Matrice en aal2. Attendus dans l'ordre des profils : porteur, autre ministère, FIJ,
-- Coordination, berger, conseil, administration, EJP Tech.
create temp view matrice_b8 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère porteur'), (2, 'ministère autre'), (3, 'ministère fij'),
                 (4, 'ministère coordination'), (5, 'berger'), (6, 'conseil'), (7, 'administration'),
                 (8, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('categorie_sensible', 'lire', array['3', '0', '0', '0', '3', '3', '3', '3'],
      'select 1 from public.categorie_sensible where prevu_code = ''essai_b8_mat'''),
     ('categorie_sensible', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values (''essai_b8_mat'', ''s'', ''Catégorie S'', 4)'),
     ('categorie_sensible', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.categorie_sensible set libelle = libelle where prevu_code = ''essai_b8_mat'''),
     ('categorie_sensible', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.categorie_sensible where prevu_code = ''essai_b8_mat'''),
     ('ventilation_sensible', 'lire', array['3', '0', '0', '0', '0', '0', '0', '0'],
      'select 1 from public.ventilation_sensible where indicateur_id = (select sens from ctx)'),
     ('ventilation_sensible', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur) select m.id, m.indicateur_id, m.ministere_id, m.date_ref, ''r'', 0 from public.mesure m where m.indicateur_id = (select sens from ctx)'),
     ('ventilation_sensible', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.ventilation_sensible set valeur = valeur where indicateur_id = (select sens from ctx)'),
     ('ventilation_sensible', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.ventilation_sensible where indicateur_id = (select sens from ctx)'),
     ('v_ventilation_sensible', 'lire', array['4', '0', '0', '0', '4', '4', '0', '4'],
      'select 1 from public.v_ventilation_sensible where indicateur_id = (select sens from ctx)'),
     ('precision_sensible', 'lire', array['2', '0', '0', '0', '0', '0', '0', '2'],
      'select 1 from public.precision_sensible where indicateur_id = (select sens from ctx)'),
     ('precision_sensible', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.precision_sensible (mesure_id, indicateur_id, ministere_id, mois, texte) select m.id, m.indicateur_id, m.ministere_id, m.date_ref, ''Précision ajoutée en direct.'' from public.mesure m where m.indicateur_id = (select sens from ctx)'),
     ('precision_sensible', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.precision_sensible set texte = texte where indicateur_id = (select sens from ctx)'),
     ('precision_sensible', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.precision_sensible where indicateur_id = (select sens from ctx)'),
     ('v_precision_sensible', 'lire', array['2', '0', '0', '0', '2', '2', '0', '2'],
      'select 1 from public.v_precision_sensible where indicateur_id = (select sens from ctx)'),
     ('saisir_chiffres_mois', 'appeler', array['ok', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.saisir_chiffres_mois((select m3 from ctx), jsonb_build_array(jsonb_build_object(''indicateur_id'', (select sens from ctx), ''valeur'', 2)))'),
     ('moderation (precision_sensible)', 'lire', array['0', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.moderation where cible = ''precision_sensible'' and cible_id in (select p1 from ctx union all select p2 from ctx)'),
     ('masquer_texte (precision_sensible, texte)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''precision_sensible'', (select p2 from ctx), ''texte'', ''situation_personnelle'')'),
     ('marquer_relu (precision_sensible)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.marquer_relu(''precision_sensible'', (select p2 from ctx))'),
     ('journal (cible precision_sensible)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.journal where cible = ''precision_sensible'' and cible_id in (select p1 from ctx union all select p2 from ctx)'),
     ('v_journal (cible precision_sensible)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_journal where cible = ''precision_sensible'' and cible_id in (select p1 from ctx union all select p2 from ctx)')
   ) as m(objet, action, attendu, requete);
create temp view profil_b8 (profil, compte) as
  select 'ministère porteur', c.a from ctx c union all select 'ministère autre', c.b from ctx c
  union all select 'ministère fij', c.fij from ctx c union all select 'ministère coordination', c.coo from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;

-- Lectures vidées par le retrait pour confidentialité (fin du fichier).
create temp table lecture_b8 (rang int primary key, objet text, requete text);
insert into lecture_b8 values
  (1, 'ventilation_sensible', 'select 1 from public.ventilation_sensible where indicateur_id = (select sens from ctx)'),
  (2, 'v_ventilation_sensible', 'select 1 from public.v_ventilation_sensible where indicateur_id = (select sens from ctx)'),
  (3, 'precision_sensible', 'select 1 from public.precision_sensible where indicateur_id = (select sens from ctx)'),
  (4, 'v_precision_sensible', 'select 1 from public.v_precision_sensible where indicateur_id = (select sens from ctx)');
grant select on matrice_b8, profil_b8, lecture_b8 to authenticated, anon;

-- Le plan compte les 24 tests fixes (contexte, inaltérabilité, masquage, retrait pour
-- confidentialité) et, par tests.nombre_essais, les essais de la matrice (lignes dérivées
-- comprises).
select plan(24
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_b8',
                        'select profil, compte from profil_b8', true));

select ok((select count(*) from ctx where a is not null and b is not null and fij is not null and coo is not null
             and berger is not null and conseil is not null and admin is not null and tech is not null
             and p1 is not null and p2 is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes et les deux précisions utilisés ici');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_b8',
  'select profil, compte from profil_b8',
  true);

-- Inaltérabilité, même pour le propriétaire des tables (rôle du test).
select throws_ok($$ update public.ventilation_sensible set valeur = valeur where indicateur_id = (select sens from ctx) $$,
  '42501', 'La table ventilation_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ventilation_sensible : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.ventilation_sensible where indicateur_id = (select sens from ctx) $$,
  '42501', 'La table ventilation_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ventilation_sensible : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.ventilation_sensible $$,
  '42501', 'La table ventilation_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ventilation_sensible : le propriétaire ne peut pas la vider');
select throws_ok($$ update public.precision_sensible set texte = 'Autre précision d''essai.' where id = (select p2 from ctx) $$,
  '42501', 'La table precision_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'precision_sensible : le propriétaire ne peut pas réécrire une précision');
select throws_ok($$ delete from public.precision_sensible where id = (select p2 from ctx) $$,
  '42501', 'La table precision_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'precision_sensible : le propriétaire ne peut pas effacer une précision');
select throws_ok($$ truncate public.precision_sensible $$,
  '42501', 'La table precision_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'precision_sensible : le propriétaire ne peut pas la vider');
select throws_ok($$ update public.precision_sensible set texte = '[texte masqué par EJP Tech]' where id = (select p2 from ctx) $$,
  '42501', 'La table precision_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sans le réglage de masquage, masquer directement une précision est refusé');
select set_config('pilotage.masquage', 'oui', true);
select throws_ok($$ update public.precision_sensible set texte = 'Autre précision d''essai.' where id = (select p2 from ctx) $$,
  '42501', 'La table precision_sensible est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sous le réglage de masquage, la précision ne prend que le texte masqué');
select lives_ok($$ update public.precision_sensible set texte = '[texte masqué par EJP Tech]' where id = (select p2 from ctx) $$,
  'sous le réglage de masquage, le masquage de la précision passe (masquer_texte)');
select set_config('pilotage.masquage', '', true);
select throws_ok($$ update public.categorie_sensible set ordre = 5 where prevu_code = 'essai_b8_mat' and code = 'r' $$,
  '42501', 'Les catégories d''un indicateur sensible s''écrivent seulement par migration.',
  'categorie_sensible : le propriétaire ne la modifie pas hors migration');
select throws_ok($$ truncate public.categorie_sensible $$,
  '42501', 'Les catégories d''un indicateur sensible s''écrivent seulement par migration.',
  'categorie_sensible : le propriétaire ne la vide pas');

-- Retrait pour confidentialité (Q11) : les quatre lectures se vident pour tous, EJP Tech compris.
select set_config('pilotage.masquage', 'oui', true);
update public.indicateur
   set etat = 'retire', retrait_motif = 'confidentialite',
       libelle = '[retiré pour confidentialité]', definition = '[retiré pour confidentialité]'
 where id = (select sens from ctx);
select set_config('pilotage.masquage', '', true);

select is(tests.compter(p.compte, 'aal2', l.requete), 0,
          format('retiré pour confidentialité : %s ne lit plus rien dans %s', p.profil, l.objet))
  from (select 1 as rang, 'le ministère porteur' as profil, c.a as compte from ctx c
        union all select 2, 'le berger', c.berger from ctx c
        union all select 3, 'EJP Tech', c.tech from ctx c) as p
 cross join lecture_b8 l
 order by p.rang, l.rang;

select * from finish();
rollback;
