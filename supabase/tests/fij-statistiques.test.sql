-- Statistiques FIJ par département (lot B5 ; docs/plan-etape-4.md, section 4, « B5 » ;
-- contrat-etape-4.md, sections 4 à 7 ; BRIEF, « Coordo FIJ : statistiques par département »).
-- Structure, jeu d'exemple (seed/41-fij-statistiques.sql), saisie par le ministère fij
-- (dernière saisie gagnante, semaine du lundi au dimanche, complétude « 8 dép. sur 8 »), une
-- ligne de journal par envoi et sans valeur, refus des autres profils, dates à l'heure de Paris.
-- La matrice des droits de ces objets est dans rls-fij-statistiques-matrice.test.sql.
begin;

select plan(78);

create temp table ctx as
select (select c.user_id from public.compte c
          join public.ministere m on m.id = c.ministere_id
         where m.code = 'fij' and c.desactive_le is null) as fij,
       (select m.id from public.ministere m where m.code = 'fij') as fij_m,
       tests.compte('Ministère Communication') as com,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as ejptech,
       private.dimanche_reference() as ref;
-- Un envoi complet : 4 rubriques pour 8 départements, 2 partout (total 16 par rubrique).
alter table ctx add column toutes jsonb;
update ctx set toutes = (
  select jsonb_agg(jsonb_build_object('rubrique', r.code, 'departement', d.code, 'valeur', 2)
                   order by r.ordre, d.code)
    from (values ('culte_ejp', 1), ('reunion_fij', 2), ('evangelisation', 3), ('membres_mardi', 4)) as r(code, ordre)
   cross join unnest(array['75', '77', '78', '91', '92', '93', '94', '95']) as d(code));
grant select on ctx to authenticated, anon;

-- 1. Structure

select has_table('public', 'fij_statistique', 'la table fij_statistique existe');
select results_eq($$
  select c.column_name::text, c.data_type::text from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'fij_statistique' order by c.ordinal_position
$$, $$ values ('id', 'bigint'), ('ministere_id', 'uuid'), ('rubrique', 'text'), ('departement', 'text'),
              ('dimanche', 'date'), ('valeur', 'integer'), ('saisi_le', 'timestamp with time zone'),
              ('saisi_par', 'uuid') $$,
  'fij_statistique : colonnes et types du contrat');
select has_table('private', 'fij_rubrique', 'la liste fermée private.fij_rubrique existe');
select results_eq($$ select code, libelle, ordre::int from private.fij_rubrique order by ordre $$,
  $$ values ('culte_ejp', 'Présents au culte EJP', 1), ('reunion_fij', 'Présents à la réunion FIJ', 2),
            ('evangelisation', 'Présents à l''évangélisation', 3), ('membres_mardi', 'Membres du mardi', 4) $$,
  'les quatre rubriques, leurs libellés et leur ordre');
select has_view('public', 'v_fij_statistique', 'la vue v_fij_statistique existe');
select results_eq($$
  select c.column_name::text, c.data_type::text from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'v_fij_statistique' order by c.ordinal_position
$$, $$ values ('rubrique', 'text'), ('rubrique_libelle', 'text'), ('rubrique_ordre', 'smallint'),
              ('dimanche', 'date'), ('total', 'bigint'), ('nb_departements', 'integer'),
              ('departements', 'jsonb'), ('derniere_saisie_le', 'timestamp with time zone') $$,
  'v_fij_statistique : colonnes et types du contrat');
select has_function('public', 'saisir_fij_statistiques', array['date', 'jsonb'],
  'public.saisir_fij_statistiques(date, jsonb) existe');
select function_returns('public', 'saisir_fij_statistiques', array['date', 'jsonb'], 'void',
  'saisir_fij_statistiques ne rend rien');
select ok((select p.prosecdef from pg_proc p where p.oid = 'private.saisir_fij_statistiques(date, jsonb)'::regprocedure)
          and not (select p.prosecdef from pg_proc p where p.oid = 'public.saisir_fij_statistiques(date, jsonb)'::regprocedure),
  'partie private en security definer, partie public en security invoker');
select has_trigger('public', 'fij_statistique', 'forcer_auteur', 'auteur et heure imposés sur fij_statistique');
select has_trigger('public', 'fij_statistique', 'ajout_seulement', 'fij_statistique ne se modifie pas et ne s''efface pas');
select has_trigger('public', 'fij_statistique', 'ajout_seulement_vider', 'fij_statistique ne se vide pas');
select table_privs_are('public', 'fij_statistique', 'authenticated', array['SELECT']::name[],
  'authenticated : lecture seule de fij_statistique (l''ajout passe par la fonction)');
select table_privs_are('public', 'fij_statistique', 'anon', array[]::name[], 'anon : aucun droit sur fij_statistique');
select table_privs_are('public', 'fij_statistique', 'service_role', array[]::name[],
  'service_role : aucun droit sur fij_statistique');
select ok(has_table_privilege('authenticated', 'public.v_fij_statistique', 'SELECT')
          and not has_table_privilege('authenticated', 'public.v_fij_statistique', 'INSERT')
          and not has_table_privilege('anon', 'public.v_fij_statistique', 'SELECT')
          and not has_table_privilege('service_role', 'public.v_fij_statistique', 'SELECT'),
  'v_fij_statistique : lecture pour authenticated seulement');
select table_privs_are('private', 'fij_rubrique', 'authenticated', array[]::name[],
  'authenticated : aucun droit sur private.fij_rubrique');
select ok(exists (select 1 from pg_constraint c
                   where c.conrelid = 'public.fij_statistique'::regclass and c.contype = 'f'
                     and c.confrelid = 'private.fij_rubrique'::regclass),
  'la rubrique d''une saisie vient de la liste fermée');

-- 2. Jeu d'exemple, lu par le berger

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select rubrique, total::int, nb_departements from public.v_fij_statistique
   where dimanche = (select ref from ctx) order by rubrique_ordre
$$, $$ values ('culte_ejp', 58, 6), ('reunion_fij', 47, 6), ('evangelisation', 27, 6), ('membres_mardi', 40, 6) $$,
  'semaine de référence : 58, 47, 27 et 40, « 6 dép. sur 8 »');
select results_eq($$
  select rubrique, total::int, nb_departements from public.v_fij_statistique
   where dimanche = (select ref from ctx) - 7 order by rubrique_ordre
$$, $$ values ('culte_ejp', 64, 8), ('reunion_fij', 52, 8), ('evangelisation', 33, 8), ('membres_mardi', 42, 8) $$,
  'semaine précédente : 64, 52, 33 et 42, « 8 dép. sur 8 »');
select is((select departements from public.v_fij_statistique
            where rubrique = 'culte_ejp' and dimanche = (select ref from ctx) - 7),
  '{"75": 12, "77": 6, "78": 5, "91": 7, "92": 9, "93": 13, "94": 8, "95": 4}'::jsonb,
  'dernière saisie gagnante : le 93 corrigé le lendemain vaut 13, pas 11');
select is((select departements from public.v_fij_statistique
            where rubrique = 'culte_ejp' and dimanche = (select ref from ctx)),
  '{"75": 13, "78": 6, "91": 8, "92": 10, "93": 12, "94": 9}'::jsonb,
  'un département absent n''apparaît pas (ni 77 ni 95), il ne compte jamais 0');
select results_eq($$
  select count(*)::int, count(distinct dimanche)::int, min(dimanche) - (select ref from ctx),
         max(dimanche) - (select ref from ctx), bool_and(extract(isodow from dimanche) = 7)
    from public.v_fij_statistique
$$, $$ values (40, 10, -63, 0, true) $$,
  '4 rubriques sur les 10 dimanches jusqu''au dimanche de référence (heure de Paris)');
select is((select count(*)::int from public.v_fij_statistique
            where dimanche < (select ref from ctx) - 7
              and total is null and nb_departements = 0 and departements = '{}'::jsonb
              and derniere_saisie_le is null),
  32, 'semaine sans saisie : total null (un trou, jamais 0), complétude 0 sur 8');
select tests.deconnecter();

-- 3. Saisie par le ministère fij : 32 valeurs en un envoi, une ligne de journal

select is((select count(*)::int from public.journal where action = 'fij_statistiques_saisies'), 0,
  'le jeu d''exemple n''écrit aucune ligne fij_statistiques_saisies (fraîcheur inchangée)');

select tests.se_connecter((select fij from ctx), 'aal2');
select lives_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14, (select toutes from ctx)) $$,
  'le ministère fij saisit les 32 valeurs d''une semaine en un envoi');
select tests.deconnecter();

select results_eq($$
  select count(*)::int, count(distinct saisi_le)::int, bool_and(saisi_par = (select fij from ctx)),
         bool_and(ministere_id = (select fij_m from ctx))
    from public.fij_statistique where dimanche = (select ref from ctx) - 14
$$, $$ values (32, 1, true, true) $$,
  '32 lignes, une seule heure d''envoi, auteur et ministère posés par la base');
select results_eq($$
  select compte, ministere_id, cible, cible_id, detail from public.journal where action = 'fij_statistiques_saisies'
$$, $$ select fij, fij_m, null::text, null::uuid, jsonb_build_object('dimanche', ref - 14, 'nombre', 32) from ctx $$,
  'une seule ligne de journal : auteur, ministère fij, sans cible, {"dimanche", "nombre"}');
select ok((select le from public.journal where action = 'fij_statistiques_saisies')
          = (select max(saisi_le) from public.fij_statistique where dimanche = (select ref from ctx) - 14),
  'le journal porte l''heure de l''envoi');

select tests.se_connecter((select fij from ctx), 'aal2');
select results_eq($$
  select rubrique, total::int, nb_departements from public.v_fij_statistique
   where dimanche = (select ref from ctx) - 14 order by rubrique_ordre
$$, $$ values ('culte_ejp', 16, 8), ('reunion_fij', 16, 8), ('evangelisation', 16, 8), ('membres_mardi', 16, 8) $$,
  'le ministère fij lit sa semaine : 16 par rubrique, « 8 dép. sur 8 »');

-- Correction : un second envoi de deux valeurs pour la même semaine
select lives_ok($$
  select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": 5},
      {"rubrique": "membres_mardi", "departement": "95", "valeur": 0}]'::jsonb)
$$, 'le ministère fij corrige deux valeurs de la même semaine');
select results_eq($$
  select rubrique, total::int, nb_departements, departements -> '75', departements -> '95'
    from public.v_fij_statistique
   where dimanche = (select ref from ctx) - 14 and rubrique in ('culte_ejp', 'membres_mardi')
   order by rubrique_ordre
$$, $$ values ('culte_ejp', 19, 8, '5'::jsonb, '2'::jsonb), ('membres_mardi', 14, 8, '2'::jsonb, '0'::jsonb) $$,
  'dernière saisie gagnante : 75 vaut 5, 95 vaut 0 (un 0 saisi reste 0), complétude inchangée');
select tests.deconnecter();

select results_eq($$
  select detail from public.journal where action = 'fij_statistiques_saisies' order by id
$$, $$ select jsonb_build_object('dimanche', ref - 14, 'nombre', 32) from ctx
       union all select jsonb_build_object('dimanche', ref - 14, 'nombre', 2) from ctx $$,
  'une ligne de journal par envoi : 32 puis 2 valeurs');
select is((select count(*)::int from public.journal
            where action = 'fij_statistiques_saisies'
              and (select array_agg(k order by k) from jsonb_object_keys(detail) as k) <> array['dimanche', 'nombre']),
  0, 'le journal ne porte que le dimanche et le nombre de valeurs, jamais une valeur');

-- 4. Semaine du lundi au dimanche, dates à l'heure de Paris

select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) + 1, (select toutes from ctx)) $$,
  'P0001', 'La date doit être un dimanche passé ou aujourd''hui.', 'un lundi est refusé : la semaine se nomme par son dimanche');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 1, (select toutes from ctx)) $$,
  'P0001', 'La date doit être un dimanche passé ou aujourd''hui.', 'un samedi est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) + 14, (select toutes from ctx)) $$,
  'P0001', 'La date doit être un dimanche passé ou aujourd''hui.', 'un dimanche futur est refusé (heure de Paris)');
select throws_ok($$ select public.saisir_fij_statistiques(null, (select toutes from ctx)) $$,
  'P0001', 'La date doit être un dimanche passé ou aujourd''hui.', 'une date absente est refusée');
select lives_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 21,
    '[{"rubrique": "evangelisation", "departement": "93", "valeur": 4}]'::jsonb) $$,
  'un envoi partiel (une seule valeur) est accepté');

-- 5. Contrôles de la saisie

select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14, '[]'::jsonb) $$,
  'P0001', 'Saisissez au moins une valeur.', 'un envoi vide est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14, null) $$,
  'P0001', 'Saisissez au moins une valeur.', 'un envoi absent est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14, '{"culte_ejp": 3}'::jsonb) $$,
  'P0001', 'Saisissez au moins une valeur.', 'un envoi qui n''est pas une liste est refusé');
select throws_ok($$
  select public.saisir_fij_statistiques((select ref from ctx) - 14,
    (select toutes from ctx) || '[{"rubrique": "culte_ejp", "departement": "75", "valeur": 1}]'::jsonb)
$$, 'P0001', 'Un envoi compte 32 valeurs au plus : 4 rubriques pour 8 départements.', '33 valeurs sont refusées');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "presents_mercredi", "departement": "75", "valeur": 1}]'::jsonb) $$,
  'P0001', 'Rubrique inconnue.', 'une rubrique hors de la liste fermée est refusée');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14, '[3]'::jsonb) $$,
  'P0001', 'Rubrique inconnue.', 'un élément qui n''est pas un objet est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "13", "valeur": 1}]'::jsonb) $$,
  'P0001', 'Département inconnu.', 'un département hors des 8 est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "valeur": 1}]'::jsonb) $$,
  'P0001', 'Département inconnu.', 'un département absent est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": 10000}]'::jsonb) $$,
  'P0001', 'Chaque valeur est un nombre entier de 0 à 9 999.', '10 000 est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": -1}]'::jsonb) $$,
  'P0001', 'Chaque valeur est un nombre entier de 0 à 9 999.', 'un nombre négatif est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": 2.5}]'::jsonb) $$,
  'P0001', 'Chaque valeur est un nombre entier de 0 à 9 999.', 'un nombre décimal est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": "5"}]'::jsonb) $$,
  'P0001', 'Chaque valeur est un nombre entier de 0 à 9 999.', 'un texte est refusé');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": null}]'::jsonb) $$,
  'P0001', 'Chaque valeur est un nombre entier de 0 à 9 999.', 'une valeur nulle est refusée : on n''envoie pas un département absent');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75"}]'::jsonb) $$,
  'P0001', 'Chaque valeur est un nombre entier de 0 à 9 999.', 'une valeur manquante est refusée');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx) - 14,
    '[{"rubrique": "culte_ejp", "departement": "75", "valeur": 1},
      {"rubrique": "culte_ejp", "departement": "75", "valeur": 2}]'::jsonb) $$,
  'P0001', 'Chaque rubrique d''un département ne se saisit qu''une fois par envoi.', 'un doublon dans l''envoi est refusé');
select tests.deconnecter();

select results_eq($$
  select (select count(*)::int from public.fij_statistique where dimanche >= (select ref from ctx) - 21
                                                             and dimanche <= (select ref from ctx) - 14),
         (select count(*)::int from public.journal where action = 'fij_statistiques_saisies')
$$, $$ values (35, 3) $$, 'un envoi refusé n''écrit rien : 35 lignes et 3 lignes de journal (trois envois acceptés)');

-- 6. Les autres profils ne saisissent pas (EJP Tech lit tout et ne saisit rien)

select is(tests.essai((select ejptech from ctx), 'aal2',
  $$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$), '42501',
  'EJP Tech ne saisit pas');
select is(tests.essai((select berger from ctx), 'aal2',
  $$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$), '42501',
  'le berger ne saisit pas');
select is(tests.essai((select conseil from ctx), 'aal2',
  $$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$), '42501',
  'le conseil ne saisit pas');
select is(tests.essai((select admin from ctx), 'aal2',
  $$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$), '42501',
  'l''administration ne saisit pas');
select is(tests.essai((select com from ctx), 'aal2',
  $$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$), '42501',
  'un autre ministère ne saisit pas');
select is(tests.essai((select fij from ctx), 'aal1',
  $$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$), '42501',
  'le ministère fij en aal1 ne saisit pas (double authentification)');
select tests.se_connecter((select ejptech from ctx), 'aal2');
select throws_ok($$ select public.saisir_fij_statistiques((select ref from ctx), (select toutes from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le refus dit seulement que l''élément est inaccessible');
select tests.deconnecter();

-- 7. Ajout seulement, aussi pour le ministère fij

select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ update public.fij_statistique set valeur = 0 $$, '42501', null,
  'le ministère fij ne modifie pas une saisie');
select throws_ok($$ delete from public.fij_statistique $$, '42501', null,
  'le ministère fij n''efface pas une saisie');
select throws_ok($$
  insert into public.fij_statistique (ministere_id, rubrique, departement, dimanche, valeur)
  select fij_m, 'culte_ejp', '75', ref, 1 from ctx
$$, '42501', null, 'le ministère fij n''écrit pas directement dans la table : il passe par la fonction');
select tests.deconnecter();
select throws_ok($$
  insert into public.fij_statistique (ministere_id, rubrique, departement, dimanche, valeur, saisi_par)
  select fij_m, 'culte_ejp', '75', ref + 1, 1, fij from ctx
$$, '23514', null, 'la table refuse un autre jour qu''un dimanche, même pour son propriétaire');

-- 8. Journal : lu par le ministère fij, le berger, le conseil et EJP Tech ; ni par
-- l'administration (« ni FIJ ni événements »), ni par un autre ministère

select is(tests.compter((select fij from ctx), 'aal2',
  $$ select 1 from public.journal where action = 'fij_statistiques_saisies' $$), 3,
  'le ministère fij lit ses lignes de journal');
select is(tests.compter((select berger from ctx), 'aal2',
  $$ select 1 from public.v_journal where action = 'fij_statistiques_saisies' $$), 3,
  'le berger lit les lignes de journal des statistiques FIJ');
select is(tests.compter((select conseil from ctx), 'aal2',
  $$ select 1 from public.v_journal where action = 'fij_statistiques_saisies' $$), 3,
  'le conseil lit les lignes de journal des statistiques FIJ');
select is(tests.compter((select ejptech from ctx), 'aal2',
  $$ select 1 from public.v_journal where action = 'fij_statistiques_saisies' $$), 3,
  'EJP Tech lit les lignes de journal des statistiques FIJ');
select is(tests.compter((select admin from ctx), 'aal2',
  $$ select 1 from public.journal where action = 'fij_statistiques_saisies' $$), 0,
  'l''administration ne lit pas les lignes de journal des statistiques FIJ');
select is(tests.compter((select admin from ctx), 'aal2',
  $$ select 1 from public.v_journal where action = 'fij_statistiques_saisies' $$), 0,
  'l''administration ne les lit pas non plus dans v_journal');
select is(tests.compter((select com from ctx), 'aal2',
  $$ select 1 from public.journal where action = 'fij_statistiques_saisies' $$), 0,
  'un autre ministère ne lit pas ces lignes de journal');

-- 9. Dates à l'heure de Paris : jamais current_date ni la date du navigateur

select ok((select p.prosrc from pg_proc p where p.oid = 'private.saisir_fij_statistiques(date, jsonb)'::regprocedure)
            like '%private.aujourdhui()%'
          and (select p.prosrc from pg_proc p where p.oid = 'private.saisir_fij_statistiques(date, jsonb)'::regprocedure)
            !~* '(current_date|now\(\)|localtimestamp)',
  'la saisie compare le dimanche à private.aujourdhui()');
select ok(pg_get_viewdef('public.v_fij_statistique'::regclass) like '%private.dimanche_reference()%'
          and pg_get_viewdef('public.v_fij_statistique'::regclass) !~* '(current_date|now\(\)|localtimestamp)',
  'la vue part de private.dimanche_reference()');

-- 10. Ministère fij désactivé : plus de saisie, plus de lecture pour son compte

update public.ministere set desactive_le = now() where id = (select fij_m from ctx);
select is(tests.essai((select fij from ctx), 'aal2',
  $$ select public.saisir_fij_statistiques((select ref from ctx) - 14, (select toutes from ctx)) $$), '42501',
  'un ministère fij désactivé ne saisit plus');
select is(tests.compter((select fij from ctx), 'aal2', 'select 1 from public.v_fij_statistique'), 0,
  'un ministère fij désactivé ne lit plus la vue');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.v_fij_statistique'), 40,
  'le berger lit toujours les 4 rubriques sur 10 dimanches');

select * from finish();
rollback;
