-- Indicateurs sensibles (étape 4, lot B1 ; BRIEF, section 4, « Indicateurs sensibles » ; P42 ;
-- configuration-indicateurs.md 3.7) : un sensible se crée et s'active comme les autres, sans
-- aucun réglage d'activation ; sa forme est imposée (mois, nombre, aucun calcul) ; il n'est
-- jamais source d'un calcul ; seuls les mois écoulés se saisissent ; son remplaçant est
-- sensible ; la case ne change plus.
-- Les fonctions creer_indicateur et creer_indicateurs_prevus (B3) écrivent par une insertion
-- du propriétaire des tables, comme ici : le trigger controler_indicateur s'applique quel que
-- soit le chemin. B3 rejoue ces cas par ses fonctions.
begin;

select plan(19);

create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       private.mois_courant() as mois,
       (private.mois_courant() - interval '1 month')::date as mois_passe;

insert into public.indicateur (libelle, definition, nature, ministere_id, sensible)
select 'Essai sens. prises en charge', 'Prises en charge d''essai, comptées une fois par mois.', 'mois', c.com_m, true from ctx c;
insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai sens. ateliers', 'Ateliers d''essai réalisés dans le mois.', 'mois', c.com_m from ctx c;
alter table ctx add column sens uuid, add column ateliers uuid;
update ctx set sens = (select i.id from public.indicateur i where i.libelle = 'Essai sens. prises en charge'),
               ateliers = (select i.id from public.indicateur i where i.libelle = 'Essai sens. ateliers');
grant select on ctx to authenticated;

select ok((select count(*) from ctx where com is not null and sens is not null and ateliers is not null) = 1,
  'le jeu d''exemple et le contexte fournissent le compte et les indicateurs utilisés ici');

-- Créé et actif dès sa création (P42)
select results_eq($$ select etat, actif, sensible, nature, unite from public.indicateur where id = (select sens from ctx) $$,
  $$ values ('actif', true, true, 'mois', 'nombre') $$, 'un sensible est actif dès sa création, comme les autres');
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) select sens, com_m, mois_passe, 2 from ctx
$$, 'il se saisit pour le dernier mois écoulé');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) select sens, com_m, mois, 2 from ctx
$$, 'P0001', 'Ce chiffre se saisit une fois le mois fini.', 'le mois en cours est refusé');
select tests.deconnecter();

-- Forme imposée
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible)
  select 'Essai sens. dimanche', 'Sensible d''essai saisi le dimanche.', 'dimanche', com_m, true from ctx
$$, 'P0001', 'Un indicateur sensible se saisit chaque mois.', 'nature « dimanche » refusée');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible)
  select 'Essai sens. à ce jour', 'Sensible d''essai relevé à ce jour.', 'a_ce_jour', com_m, true from ctx
$$, 'P0001', 'Un indicateur sensible se saisit chaque mois.', 'nature « à ce jour » refusée');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, unite, ministere_id, sensible)
  select 'Essai sens. grand nombre', 'Sensible d''essai en grand nombre.', 'mois', 'grand_nombre', com_m, true from ctx
$$, 'P0001', 'Un indicateur sensible est un nombre de 0 à 9 999.', 'unité « grand nombre » refusée');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, unite, ministere_id, sensible)
  select 'Essai sens. euros', 'Sensible d''essai en euros.', 'mois', 'euros', com_m, true from ctx
$$, 'P0001', 'Un indicateur sensible est un nombre de 0 à 9 999.', 'unité « euros » refusée');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, calcul)
  select 'Essai sens. taux', 'Taux sensible d''essai.', 'mois', com_m, true, 'taux' from ctx
$$, 'P0001', 'Un indicateur sensible ne se calcule pas.', 'un calcul sensible est refusé');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, saisi_dimanche_matin)
  select 'Essai sens. matin', 'Sensible d''essai saisi le matin.', 'mois', com_m, true, true from ctx
$$, 'P0001', 'Un indicateur sensible se saisit chaque mois.', 'drapeau du dimanche matin refusé');

-- Jamais source d'un calcul
create function pg_temp.calcul_sur_sensible() returns void language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.indicateur (libelle, definition, nature, ministere_id, calcul)
  select 'Essai sens. part', 'Part d''essai calculée sur un sensible.', 'mois', com_m, 'taux' from ctx
  returning id into v_id;
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id)
  select v_id, 1, 'haut', sens from ctx union all select v_id, 2, 'bas', ateliers from ctx;
end $$;
select throws_ok($$ select pg_temp.calcul_sur_sensible() $$,
  'P0001', 'Un indicateur sensible n''entre dans aucun calcul.', 'un terme dont la source est sensible est refusé');

-- La case ne change plus ; le remplaçant d'un sensible est sensible.
select throws_ok($$ update public.indicateur set sensible = false where id = (select sens from ctx) $$,
  '42501', null, 'un sensible ne cesse pas de l''être');
select throws_ok($$ update public.indicateur set sensible = true where id = (select ateliers from ctx) $$,
  '42501', null, 'un indicateur ne devient pas sensible après coup (il se remplace)');
select lives_ok($$ update public.indicateur set etat = 'retire', retrait_motif = 'remplace' where id = (select sens from ctx) $$,
  'le sensible est retiré pour être remplacé');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai sens. prises en charge', 'Remplaçant d''essai non sensible.', 'mois', com_m, sens from ctx
$$, 'P0001', 'Le remplaçant d''un indicateur sensible est sensible.', 'un remplaçant non sensible est refusé');
select lives_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id, sensible)
  select 'Essai sens. prises en charge', 'Prises en charge d''essai, une par personne et par mois.', 'mois', com_m, sens, true from ctx
$$, 'un remplaçant sensible garde le nom');

-- Aucun réglage d'activation (P42)
select hasnt_table('private', 'reglage', 'aucune table private.reglage');
select is_empty($$
  select c.relname from pg_class c
   where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and c.relname ~ 'reglage'
$$, 'aucune table ni vue de réglage dans public ni dans private');
select is_empty($$
  select p.proname from pg_proc p
   where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
     and p.proname ~ '(activer_sensible|sensibles_actifs|reglage)'
$$, 'aucune fonction d''activation des sensibles');

select * from finish();
rollback;
