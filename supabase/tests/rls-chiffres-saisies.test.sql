-- Saisies des chiffres (BRIEF, sections 3, 6 et 7) : un ministère n'écrit que pour son
-- ministère ; un indicateur propre n'est saisi et lu que par son ministère (et lu par le berger
-- et le conseil) ; la carte des FIJ est réservée au ministère FIJ ; présences : date de la
-- session et contrainte des déjà comptés ; tables en ajout seul, même pour l'auteur de la ligne.
-- Double comptage (D2, règle 5) : total d'une session = somme, sur la saisie la plus récente
-- de chaque ministère, des présents moins les déjà comptés ; complétude et manquants
-- identiques pour chaque profil, EJP Tech compris (lecture seule, T29) ; rien en aal1.
begin;

select plan(53);

create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.ministere('Intégration') as integ_m,
       tests.compte('Ministère FIJ') as fij,
       tests.ministere('FIJ') as fij_m,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.ministere('Jeunesse') as jeu_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 3') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as ejptech,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       (select i.id from public.indicateur i where i.libelle = 'Visuels livrés ce mois') as visuels,
       (select s.id from public.session s where s.type = 'batir' and s.date = private.dimanche_reference() - 1) as batir,
       private.dimanche_reference() as dimanche,
       private.aujourdhui() as aujourdhui;

alter table ctx add column a_m uuid, add column b_m uuid, add column c_m uuid, add column d_m uuid,
  add column e_m uuid, add column a uuid, add column b uuid, add column d uuid, add column propre uuid,
  add column s1 uuid, add column s2 uuid, add column s_jour uuid, add column s_demain uuid;

-- Ministères de test : A, B et C attendus ; D non attendu ; E attendu mais désactivé avant la
-- date des sessions (il ne compte pas dans les attendus).
update ctx set a_m = tests.creer_ministere('Essai présences A'),
               b_m = tests.creer_ministere('Essai présences B'),
               c_m = tests.creer_ministere('Essai présences C'),
               d_m = tests.creer_ministere('Essai présences D'),
               e_m = tests.creer_ministere('Essai présences E');
update ctx set a = tests.creer_compte('essai-presences-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('essai-presences-b@exemple.test', 'ministere', b_m),
               d = tests.creer_compte('essai-presences-d@exemple.test', 'ministere', d_m);
update public.ministere set desactive_le = now() - interval '10 days' where id = (select e_m from ctx);

-- Sessions « Autre rassemblement » écrites par le propriétaire, comme le ferait
-- declarer_session : deux il y a deux jours, une aujourd'hui, une demain.
insert into public.session (type, date, intitule, saisi_par)
select 'autre'::public.type_session, c.aujourdhui - 2, x.intitule, c.admin
from ctx c cross join (values ('Essai présences 1'), ('Essai présences 2')) as x(intitule)
union all
select 'autre'::public.type_session, c.aujourdhui, 'Essai présences du jour', c.admin from ctx c
union all
select 'autre'::public.type_session, c.aujourdhui + 1, 'Essai présences de demain', c.admin from ctx c;

update ctx set s1 = (select s.id from public.session s where s.intitule = 'Essai présences 1'),
               s2 = (select s.id from public.session s where s.intitule = 'Essai présences 2'),
               s_jour = (select s.id from public.session s where s.intitule = 'Essai présences du jour'),
               s_demain = (select s.id from public.session s where s.intitule = 'Essai présences de demain');

insert into public.session_attendu (session_id, ministere_id)
select c.s1, c.a_m from ctx c
union all
select c.s2, x.ministere_id
from ctx c cross join lateral unnest(array[c.a_m, c.b_m, c.c_m, c.e_m]) as x(ministere_id);

-- Indicateur propre de Jeunesse (posé d'ordinaire par une migration), avec un chiffre.
insert into public.indicateur (libelle, nature, ministere_id, ordre)
select 'Essai saisies, propre à Jeunesse', 'dimanche', c.jeu_m, 90 from ctx c;
update ctx set propre = (select i.id from public.indicateur i where i.libelle = 'Essai saisies, propre à Jeunesse');
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_par)
select c.propre, c.jeu_m, c.dimanche - 7, 3, c.jeu from ctx c;

grant select on ctx to authenticated, anon;

select ok((select count(*) from ctx
            where com is not null and fij is not null and jeu is not null and berger is not null
              and conseil is not null and admin is not null and ejptech is not null and service is not null
              and visuels is not null and batir is not null and a is not null and b is not null and d is not null
              and propre is not null and s1 is not null and s2 is not null and s_jour is not null
              and s_demain is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes, les indicateurs et les sessions utilisés ici');

-- Un ministère n'écrit que pour son ministère
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, ctx.dimanche, 4321 from ctx
  union all
  select ctx.service, ctx.integ_m, ctx.dimanche, 4321 from ctx
$$, '42501', null, 'un envoi qui mêle son ministère et un autre est refusé en entier');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.batir, ctx.integ_m, 6, 0 from ctx
$$, '42501', null, 'Communication ne saisit pas les présences d''Intégration');
select throws_ok($$
  insert into public.fij_departement (ministere_id, departement, valeur)
  select ctx.fij_m, '75', 3 from ctx
$$, '42501', null, 'Communication n''envoie pas la carte des FIJ, même au nom du ministère FIJ');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.propre, ctx.com_m, ctx.dimanche, 2 from ctx
$$, '42501', null, 'Communication ne saisit pas l''indicateur propre de Jeunesse pour elle-même');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.propre, ctx.jeu_m, ctx.dimanche, 2 from ctx
$$, '42501', null, 'Communication ne saisit pas l''indicateur propre de Jeunesse au nom de Jeunesse');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.visuels, ctx.com_m, ctx.aujourdhui, 8 from ctx
$$, 'Communication saisit son indicateur propre (Visuels livrés ce mois)');
select tests.deconnecter();

select is((select count(*)::integer from public.mesure where valeur = 4321), 0,
  'rien de l''envoi refusé n''a été écrit');

select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$
  insert into public.fij_departement (ministere_id, departement, valeur)
  select ctx.com_m, '75', 3 from ctx
$$, '42501', null, 'le ministère FIJ n''envoie la carte qu''en son nom');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, ctx.dimanche, 3 from ctx
$$, '42501', null, 'le ministère FIJ ne saisit pas les chiffres de Communication');
select tests.deconnecter();

select tests.se_connecter((select jeu from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.propre, ctx.jeu_m, ctx.dimanche, 6 from ctx
$$, 'Jeunesse saisit son indicateur propre');
select tests.deconnecter();

-- Lecture des indicateurs propres
select is(tests.compter((select com from ctx), 'aal2',
    'select * from public.mesure m where m.indicateur_id = (select propre from ctx)'), 0,
  'Communication ne lit pas les chiffres de l''indicateur propre de Jeunesse');
select is(tests.compter((select jeu from ctx), 'aal2',
    'select * from public.mesure m where m.indicateur_id = (select propre from ctx)'), 2,
  'Jeunesse lit les chiffres de son indicateur propre');
select is(tests.compter((select fij from ctx), 'aal2',
    'select * from public.mesure m where m.indicateur_id = (select visuels from ctx)'), 0,
  'le ministère FIJ ne lit pas les chiffres de l''indicateur propre de Communication');
select is(tests.compter((select com from ctx), 'aal2',
    'select * from public.mesure m where m.indicateur_id = (select visuels from ctx)'), 4,
  'Communication lit ses 4 chiffres « Visuels livrés ce mois »');
select is(tests.compter((select admin from ctx), 'aal2',
    'select m.* from public.mesure m join public.indicateur i on i.id = m.indicateur_id where i.ministere_id is not null'), 0,
  'l''administration ne lit aucun chiffre d''indicateur propre');
select is(tests.compter((select berger from ctx), 'aal2',
    'select m.* from public.mesure m join public.indicateur i on i.id = m.indicateur_id where i.ministere_id is not null'), 6,
  'le berger lit les chiffres de tous les indicateurs propres');
select is(tests.compter((select conseil from ctx), 'aal2',
    'select m.* from public.mesure m join public.indicateur i on i.id = m.indicateur_id where i.ministere_id is not null'), 6,
  'le conseil lit les chiffres de tous les indicateurs propres');
select is(tests.compter((select ejptech from ctx), 'aal2',
    'select m.* from public.mesure m join public.indicateur i on i.id = m.indicateur_id where i.ministere_id is not null'), 6,
  'EJP Tech lit les chiffres de tous les indicateurs propres, comme le berger (T29)');
select is(tests.compter((select admin from ctx), 'aal2',
    'select * from public.indicateur i where i.ministere_id is not null'), 2,
  'l''administration lit la liste des indicateurs propres (écran 13), sans leurs chiffres');

-- Présences : date de la session et contrainte des déjà comptés
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s_jour, ctx.a_m, 2, 0 from ctx
$$, 'une session datée d''aujourd''hui accepte la saisie, même d''un ministère non attendu');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s_demain, ctx.a_m, 2, 0 from ctx
$$, '42501', null, 'une session datée de demain n''accepte aucune saisie');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s1, ctx.a_m, 3, 4 from ctx
$$, '23514', null, 'contrainte : les déjà comptés ne dépassent pas les présents (4 sur 3 refusé)');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s1, ctx.a_m, 3, -1 from ctx
$$, '23514', null, 'contrainte : les déjà comptés ne sont pas négatifs');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s1, ctx.a_m, 10000, 0 from ctx
$$, '23514', null, 'contrainte : les présents ne dépassent pas 9999');

-- Double comptage (D2) : une session à 13 présents dont 2 déjà comptés compte 11
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s1, ctx.a_m, 13, 2 from ctx
$$, 'A saisit 13 présents, dont 2 déjà comptés par leur ministère principal');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select valeur, deja_comptes, compte_dans_total from public.v_participation_courante where session_id = (select s1 from ctx)'),
  '[{"valeur": 13, "deja_comptes": 2, "compte_dans_total": 11}]'::jsonb,
  'présence courante de A : 13 présents, dont 2 déjà comptés, 11 comptés dans le total');
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, total_saisi, nb_saisis, nb_attendus, manquants from public.v_session_completude where session_id = (select s1 from ctx)'),
  '[{"total": 11, "total_saisi": 13, "nb_saisis": 1, "nb_attendus": 1, "manquants": []}]'::jsonb,
  'une session à 13 présents dont 2 déjà comptés compte 11 (1 sur 1)');

-- Deux ministères à 5 et 5 dont 1 déjà compté donnent 9
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s2, ctx.a_m, 5, 0 from ctx
$$, 'A saisit 5 présents, aucun déjà compté');
select tests.deconnecter();
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s2, ctx.b_m, 5, 1 from ctx
$$, 'B saisit 5 présents, dont 1 déjà compté par son ministère principal');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select total, total_saisi, nb_saisis, nb_attendus, manquants from public.v_session_completude where session_id = (select s2 from ctx)'),
  '[{"total": 9, "total_saisi": 10, "nb_saisis": 2, "nb_attendus": 3, "manquants": ["Essai présences C"]}]'::jsonb,
  'deux ministères à 5 et 5 dont 1 déjà compté donnent 9 ; 2 sur 3 (E, désactivé avant la session, ne compte pas), manque C');

select tests.se_connecter((select d from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s2, ctx.d_m, 4, 4 from ctx
$$, 'D, non attendu, saisit 4 présents, tous déjà comptés (égalité permise)');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select total, total_saisi, nb_saisis, nb_attendus, manquants from public.v_session_completude where session_id = (select s2 from ctx)'),
  '[{"total": 9, "total_saisi": 14, "nb_saisis": 3, "nb_attendus": 4, "manquants": ["Essai présences C"]}]'::jsonb,
  'D rejoint les attendus (3 sur 4) sans changer le total : ses 4 présents comptent déjà ailleurs');

-- Correction : la saisie la plus récente de chaque ministère fait foi
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s2, ctx.a_m, 8, 1 from ctx
$$, 'A corrige par une nouvelle saisie : 8 présents, dont 1 déjà compté');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select total, total_saisi, nb_saisis, nb_attendus, manquants from public.v_session_completude where session_id = (select s2 from ctx)'),
  '[{"total": 11, "total_saisi": 17, "nb_saisis": 3, "nb_attendus": 4, "manquants": ["Essai présences C"]}]'::jsonb,
  'seule la saisie la plus récente de A compte : total 11 (7 + 4 + 0)');
select is(tests.compter((select berger from ctx), 'aal2',
    'select * from public.v_participation_courante where session_id = (select s2 from ctx)'), 3,
  'une seule présence courante par ministère');

select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s2, ctx.b_m, 6, 2 from ctx
  union all
  select ctx.s2, ctx.b_m, 9, 3 from ctx
$$, 'B envoie deux lignes dans le même envoi (6 dont 2, puis 9 dont 3)');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select valeur, deja_comptes, compte_dans_total from public.v_participation_courante where session_id = (select s2 from ctx) and ministere_id = (select b_m from ctx)'),
  '[{"valeur": 9, "deja_comptes": 3, "compte_dans_total": 6}]'::jsonb,
  'deux lignes du même envoi : la dernière (id le plus grand) fait foi');
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, total_saisi from public.v_session_completude where session_id = (select s2 from ctx)'),
  '[{"total": 13, "total_saisi": 21}]'::jsonb,
  'total de la session : 13 (7 + 6 + 0) pour 21 présents saisis');

-- Mêmes totaux et même complétude pour chaque profil, EJP Tech compris ; rien en aal1
select is(tests.lire((select a from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  tests.lire((select berger from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  'un ministère obtient les mêmes totaux, la même complétude et les mêmes manquants que le berger');
select is(tests.lire((select conseil from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  tests.lire((select berger from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  'le conseil obtient les mêmes totaux que le berger');
select is(tests.lire((select admin from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  tests.lire((select berger from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  'l''administration obtient les mêmes totaux que le berger');
select is(tests.lire((select ejptech from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  tests.lire((select berger from ctx), 'aal2',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'),
  'EJP Tech obtient les mêmes totaux que le berger (lecture seule, T29)');
select is(tests.lire((select ejptech from ctx), 'aal2', 'select * from public.v_participation_courante'),
  tests.lire((select berger from ctx), 'aal2', 'select * from public.v_participation_courante'),
  'EJP Tech lit les mêmes présences que le berger');
select tests.se_connecter((select ejptech from ctx), 'aal2');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.s1, ctx.a_m, 3, 0 from ctx
$$, '42501', null, 'EJP Tech ne saisit aucune présence');
select tests.deconnecter();
select is(tests.compter((select a from ctx), 'aal1',
    'select * from public.v_session_completude where session_id in (select s1 from ctx union all select s2 from ctx)'), 0,
  'en aal1, un ministère ne lit aucune session');

-- Ajout seul : l'auteur ne modifie ni n'efface sa propre ligne (règle 1)
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ update public.participation set valeur = 1 where ministere_id = (select a_m from ctx) $$,
  '42501', null, 'A ne modifie pas sa présence : on ajoute, on ne modifie jamais');
select throws_ok($$ delete from public.participation where ministere_id = (select a_m from ctx) $$,
  '42501', null, 'A n''efface pas sa présence');
select tests.deconnecter();
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$ update public.mesure set valeur = valeur + 1 where ministere_id = (select com_m from ctx) $$,
  '42501', null, 'Communication ne modifie pas ses chiffres');
select throws_ok($$ delete from public.mesure where ministere_id = (select com_m from ctx) $$,
  '42501', null, 'Communication n''efface pas ses chiffres');
select tests.deconnecter();
select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ update public.fij_departement set valeur = 0 where ministere_id = (select fij_m from ctx) $$,
  '42501', null, 'le ministère FIJ ne modifie pas sa carte');
select throws_ok($$ delete from public.fij_departement where ministere_id = (select fij_m from ctx) $$,
  '42501', null, 'le ministère FIJ n''efface pas sa carte');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select valeur, deja_comptes from public.v_participation_courante where session_id = (select s1 from ctx)'),
  '[{"valeur": 13, "deja_comptes": 2}]'::jsonb,
  'la présence de A est intacte après les essais refusés');

select * from finish();
rollback;
