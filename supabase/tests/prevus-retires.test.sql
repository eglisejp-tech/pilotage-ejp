-- Prévus retirés (correctif du 8 octobre 2026, migration 20261010120500_prevus_retires_aucun.sql) :
-- des prévus tous retirés n'empêchent plus le modèle « aucun » ; un prévu encore actif l'empêche
-- toujours ; un prévu retiré ne renaît pas par un second appel.
begin;

select plan(5);

create temp table ctx as
select tests.creer_ministere('Prévus retirés A') as a_m,
       tests.creer_ministere('Prévus retirés B') as b_m,
       tests.compte('Administration de l''église') as admin;
grant select on ctx to authenticated;

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, unite, sensible, calcul, ordre) values
  ('essai_ret_un', 'essai retires', 'Essai retirés un', 'Premier prévu d''essai des retraits.', 'mois', 'nombre', false, null, 1),
  ('essai_ret_deux', 'essai retires', 'Essai retirés deux', 'Second prévu d''essai des retraits.', 'mois', 'nombre', false, null, 2);

select tests.se_connecter((select admin from ctx), 'aal2');

select is(public.creer_indicateurs_prevus((select a_m from ctx), 'essai retires'), 2,
  'les deux prévus du modèle sont créés sur la fiche A');
select is(public.creer_indicateurs_prevus((select b_m from ctx), 'essai retires'), 2,
  'les deux prévus du modèle sont créés sur la fiche B');

-- Fiche A : les deux prévus sont retirés pour erreur ; fiche B : un seul.
select public.retirer_indicateur(i.id, 'erreur')
  from public.indicateur i where i.ministere_id = (select a_m from ctx);
select public.retirer_indicateur(i.id, 'erreur')
  from public.indicateur i
 where i.ministere_id = (select b_m from ctx) and i.modele_code = 'essai_ret_un';

select is(public.creer_indicateurs_prevus((select a_m from ctx), 'aucun'), 0,
  '« aucun » est accepté quand tous les prévus de la fiche sont retirés');
select throws_ok($$ select public.creer_indicateurs_prevus((select b_m from ctx), 'aucun') $$,
  'P0001', 'Cette fiche a déjà des indicateurs prévus : « aucun » ne s''applique pas.',
  '« aucun » reste refusé quand un prévu de la fiche est encore actif');
select is(public.creer_indicateurs_prevus((select b_m from ctx), 'essai retires'), 0,
  'un prévu retiré ne renaît pas par un second appel');

select * from finish();
rollback;
