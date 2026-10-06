-- verifier_libelle (lot B3 ; docs/plan-etape-4.md, section 4, « B3 » ; configuration-indicateurs.md
-- 6.1 à 6.4 ; contrat-etape-4.md, sections 4 et 7). Contrôle de l'appelant : un ministère
-- n'interroge que sa fiche (42501 sinon, il n'apprend rien d'une autre), le berger et le conseil
-- sont refusés, l'administration et EJP Tech interrogent toute fiche, rien hors aal2. Puis les
-- familles de private.verifier_texte vues par verifier_libelle (bloquantes ou non selon le
-- profil), « cumul » écarté pour un « à ce jour », « doublon » sur la fiche et avec les chiffres
-- communs, et les voisins acceptés.
begin;

select plan(30);

create temp table ctx as
select tests.creer_ministere('Libellé A') as a_m,
       tests.creer_ministere('Libellé B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid;
update ctx set a = tests.creer_compte('libelle-a@exemple.test', 'ministere', a_m);
grant select on ctx to authenticated;

insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai libellé pris', 'Indicateur d''essai dont le libellé est pris.', 'mois', a_m from ctx;

-- Familles trouvées pour un libellé, vues par un compte (famille et bloquant).
create function pg_temp.familles(p_compte uuid, p_libelle text, p_nature text default 'mois') returns jsonb
language sql as $$
  select tests.lire(p_compte, 'aal2',
    format('select famille, bloquant from public.verifier_libelle(%L, %L, %L)', p_libelle, p_nature,
           (select a_m from ctx)))
$$;

-- 1. Contrôle de l'appelant
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select * from public.verifier_libelle('Visuels', 'mois', (select b_m from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère n''interroge pas une autre fiche');
select throws_ok($$ select * from public.verifier_libelle('Visuels', 'mois', null) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère nomme sa fiche');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select * from public.verifier_libelle('Visuels', 'mois', (select a_m from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger est refusé');
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select * from public.verifier_libelle('Visuels', 'mois', (select a_m from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le conseil est refusé');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select * from public.verifier_libelle('Visuels', 'mois', gen_random_uuid()) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'une fiche inconnue donne le message d''un objet absent');
select tests.deconnecter();
select is(tests.compter((select tech from ctx), 'aal2',
  format('select * from public.verifier_libelle(%L, %L, %L)', 'Visuels', 'mois', (select b_m from ctx))), 0,
  'EJP Tech interroge toute fiche : un libellé sans souci ne rend rien');
select is(tests.compter((select a from ctx), 'aal2',
  format('select * from public.verifier_libelle(%L, %L, %L)', 'Visuels', 'mois', (select a_m from ctx))), 0,
  'le ministère interroge sa fiche');
select is(tests.essai((select admin from ctx), 'aal1',
  format('select * from public.verifier_libelle(%L, %L, %L)', 'Visuels', 'mois', (select a_m from ctx))), '42501',
  'hors double authentification, verifier_libelle est refusée');

-- 2. Familles refusées (vues par l'administration)
select is(pg_temp.familles((select admin from ctx), 'Contact jean@exemple.test'),
  '[{"famille": "donnees_personnelles", "bloquant": true}]'::jsonb, '« @ » : données personnelles');
select is(pg_temp.familles((select admin from ctx), 'Inscrits via http'),
  '[{"famille": "donnees_personnelles", "bloquant": true}]'::jsonb, '« http » : données personnelles');
select is(pg_temp.familles((select admin from ctx), 'Appels 06 12 34 56'),
  '[{"famille": "donnees_personnelles", "bloquant": true}]'::jsonb, 'cinq chiffres de suite, espaces retirés : données personnelles');
select is(pg_temp.familles((select admin from ctx), 'Visites de Mme Durand'),
  '[{"famille": "donnees_personnelles", "bloquant": true}]'::jsonb, 'civilité suivie d''un nom : données personnelles');
select is(pg_temp.familles((select admin from ctx), '[Essai] présents'),
  '[{"famille": "crochets", "bloquant": true}]'::jsonb, 'crochets réservés à la modération');
select is(pg_temp.familles((select admin from ctx), 'Taux de présence'),
  '[{"famille": "calcul", "bloquant": true}]'::jsonb, '« taux » : un calcul');
select is(pg_temp.familles((select admin from ctx), 'Présents en %'),
  '[{"famille": "calcul", "bloquant": true}]'::jsonb, '« % » : un calcul');
select is(pg_temp.familles((select admin from ctx), 'Vues cumulées YouTube'),
  '[{"famille": "cumul", "bloquant": true}]'::jsonb, '« cumulées » : un cumul, pour un chiffre du mois');
select is(pg_temp.familles((select admin from ctx), 'Vues cumulées YouTube', 'a_ce_jour'),
  '[]'::jsonb, 'un « à ce jour » accepte « cumulées »');
select is(pg_temp.familles((select admin from ctx), 'Visuels du mois'),
  '[{"famille": "periode", "bloquant": true}]'::jsonb, '« du mois » : la période s''écrit par le rythme');
select is(pg_temp.familles((select admin from ctx), 'Enfants accueillis'),
  '[{"famille": "sensible", "bloquant": true}]'::jsonb, 'domaine sensible : bloquant pour l''administration');
select is(pg_temp.familles((select a from ctx), 'Enfants accueillis'),
  '[{"famille": "sensible", "bloquant": false}]'::jsonb, 'domaine sensible : simple indice pour un ministère');
select is(pg_temp.familles((select admin from ctx), 'Taux de Mme Durand'),
  '[{"famille": "calcul", "bloquant": true}, {"famille": "donnees_personnelles", "bloquant": true}]'::jsonb,
  'deux familles trouvées, deux lignes');

-- 3. Doublons
select is(tests.lire((select admin from ctx), 'aal2',
  format('select famille, message, bloquant from public.verifier_libelle(%L, %L, %L)', 'Essai libellé pris', 'mois', (select a_m from ctx))),
  '[{"famille": "doublon", "message": "Cette fiche a déjà « Essai libellé pris ».", "bloquant": true}]'::jsonb,
  'un libellé déjà sur la fiche : doublon, pour l''administration');
select is(tests.lire((select a from ctx), 'aal2',
  format('select message from public.verifier_libelle(%L, %L, %L)', 'Nombre de essai libelle pris', 'mois', (select a_m from ctx))),
  '[{"message": "Votre fiche a déjà « Essai libellé pris »."}]'::jsonb,
  'un libellé normalisé déjà sur la fiche : doublon, pour le ministère');
select is(tests.lire((select admin from ctx), 'aal2',
  format('select famille, message from public.verifier_libelle(%L, %L, %L)', 'Stars au service', 'dimanche', (select a_m from ctx))),
  '[{"famille": "doublon", "message": "Cette fiche a déjà « STARs au service »."}]'::jsonb,
  'le libellé d''un chiffre commun : doublon');
select is(tests.compter((select admin from ctx), 'aal2',
  format('select * from public.verifier_libelle(%L, %L, %L)', 'Essai libellé pris', 'mois', (select b_m from ctx))), 0,
  'le même libellé sur une autre fiche n''est pas un doublon');
select is(tests.lire((select admin from ctx), 'aal2',
  format('select message from public.verifier_libelle(%L, %L, %L)', 'Contact jean@exemple.test', 'mois', (select a_m from ctx))),
  '[{"message": "N''écrivez aucun nom ni information personnelle."}]'::jsonb,
  'le message de la famille est celui de verifier_texte');

-- 4. Voisins acceptés
select is(pg_temp.familles((select admin from ctx), 'Moyens techniques'), '[]'::jsonb,
  '« Moyens techniques » n''est pas une moyenne');
select is(pg_temp.familles((select admin from ctx), 'Prière des Stars'), '[]'::jsonb,
  '« Prière des Stars » est un nom connu, ni un nom de personne ni un chiffre commun');
select is(pg_temp.familles((select admin from ctx), 'Femmes accueillies'), '[]'::jsonb,
  '« Femmes » n''est pas une civilité');
select is(pg_temp.familles((select admin from ctx), 'Billets 2026'), '[]'::jsonb,
  'quatre chiffres de suite sont acceptés');

select * from finish();
rollback;
