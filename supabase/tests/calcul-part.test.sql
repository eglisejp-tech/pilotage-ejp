-- Part d'un calcul créé par l'administration (lot B4 ; décision P49 : « posée à la création d'un
-- calcul, jamais modifiée ensuite » ; docs/plan-etape-4.md, section 4, « B4 »).
-- creer_calcul reçoit un 7e paramètre p_part : vrai pour un taux qui est une part, faux, ou null
-- (la valeur du calcul remplacé, sinon faux). Une moyenne n'est jamais une part. Un calcul
-- remplacé garde sa protection : le remplaçant d'une part est une part, sauf choix contraire.
-- Les valeurs de v_calcul (0 pour un haut de 0, bas_nul, haut_depasse_bas, somme de l'année) sont
-- vérifiées dans indicateurs-vague-1.test.sql, partie 3.
begin;

select plan(21);

create temp table ctx as
select tests.creer_ministere('Part A') as a_m,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin;
alter table ctx add column a uuid, add column h uuid, add column bs uuid;
update ctx set a = tests.creer_compte('part-a@exemple.test', 'ministere', a_m);
grant select on ctx to authenticated;

insert into public.indicateur (libelle, definition, nature, ministere_id)
select x.libelle, 'Indicateur d''essai de la part d''un calcul.', 'mois', c.a_m
  from ctx c cross join (values ('Essai part haut'), ('Essai part bas')) as x(libelle);
update ctx set
  h = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai part haut'),
  bs = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai part bas');

create function pg_temp.part_de(p_libelle text) returns boolean
language sql stable security definer as $$
  select i.part from public.indicateur i
   where i.ministere_id = (select a_m from ctx) and i.libelle = p_libelle and i.etat = 'actif'
$$;
grant execute on function pg_temp.part_de(text) to authenticated;

-- Signature : un seul creer_calcul, à sept paramètres, pour authenticated seulement.
select has_function('public', 'creer_calcul', array['text', 'text', 'text', 'uuid', 'uuid', 'uuid', 'boolean'],
  'public.creer_calcul a sept paramètres');
select hasnt_function('public', 'creer_calcul', array['text', 'text', 'text', 'uuid', 'uuid', 'uuid'],
  'l''ancienne version à six paramètres n''existe plus (public)');
select hasnt_function('private', 'creer_calcul', array['text', 'text', 'text', 'uuid', 'uuid', 'uuid'],
  'l''ancienne version à six paramètres n''existe plus (private)');
select is(has_function_privilege('anon', 'public.creer_calcul(text, text, text, uuid, uuid, uuid, boolean)', 'execute'), false,
  'l''anonyme n''exécute pas creer_calcul');
select is(has_function_privilege('authenticated', 'public.creer_calcul(text, text, text, uuid, uuid, uuid, boolean)', 'execute'), true,
  'authenticated exécute creer_calcul');
select is(has_function_privilege('anon', 'private.creer_calcul(text, text, text, uuid, uuid, uuid, boolean)', 'execute'), false,
  'l''anonyme n''exécute pas la partie private');

select tests.se_connecter((select admin from ctx), 'aal2');

-- Sans p_part : un taux n'est pas une part.
select lives_ok($$ select public.creer_calcul('Taux d''essai simple', 'Taux d''essai créé sans choix de part.', 'taux',
                                              (select h from ctx), (select bs from ctx), null) $$,
  'appel à six paramètres : un taux est créé');
select is(pg_temp.part_de('Taux d''essai simple'), false, 'sans p_part, un taux nouveau n''est pas une part');

-- p_part vrai : une part. Une moyenne marquée part est refusée.
select lives_ok($$ select public.creer_calcul('Part d''essai créée', 'Part d''essai créée par l''administration.', 'taux',
                                              (select h from ctx), (select bs from ctx), null, true) $$,
  'l''administration crée une part');
select is(pg_temp.part_de('Part d''essai créée'), true, 'la part créée porte le drapeau part');
select throws_ok($$ select public.creer_calcul('Moyenne d''essai part', 'Moyenne d''essai marquée part.', 'moyenne',
                                               (select h from ctx), (select bs from ctx), null, true) $$,
  'P0001', 'Seul un taux peut être une part.', 'une moyenne marquée part est refusée');

-- Remplacement d'une part : le remplaçant garde la protection par défaut.
select lives_ok($$ select public.creer_calcul('Part d''essai remplacée', 'Part d''essai qui en remplace une autre.', 'taux',
                                              (select h from ctx), (select bs from ctx),
                                              (select i.id from public.indicateur i
                                                where i.ministere_id = (select a_m from ctx) and i.libelle = 'Part d''essai créée')) $$,
  'l''administration remplace une part par un taux, sans choix de part');
select tests.deconnecter();
select results_eq($$
  select a.etat, a.retrait_motif, n.part, n.libelle
    from public.indicateur a join public.indicateur n on n.remplace_id = a.id
   where a.ministere_id = (select a_m from ctx) and a.libelle = 'Part d''essai créée'
$$, $$ values ('retire'::text, 'remplace'::text, true, 'Part d''essai remplacée'::text) $$,
  'l''ancienne part est retirée (remplacée) et son remplaçant est une part');
select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.creer_calcul('Taux d''essai sans part', 'Taux d''essai qui remplace une part, sans protection.', 'taux',
                                              (select h from ctx), (select bs from ctx),
                                              (select i.id from public.indicateur i
                                                where i.ministere_id = (select a_m from ctx) and i.libelle = 'Part d''essai remplacée'),
                                              false) $$,
  'le choix explicite p_part faux remplace une part par un taux sans protection');
select is(pg_temp.part_de('Taux d''essai sans part'), false, 'le choix explicite est respecté');

-- Une moyenne qui remplace une part n'est pas une part (le défaut ne casse pas la contrainte).
select lives_ok($$ select public.creer_calcul('Part d''essai à remplacer', 'Part d''essai remplacée ensuite par une moyenne.', 'taux',
                                              (select h from ctx), (select bs from ctx), null, true) $$,
  'l''administration crée une seconde part');
select lives_ok($$ select public.creer_calcul('Moyenne d''essai neuve', 'Moyenne d''essai qui remplace une part.', 'moyenne',
                                              (select h from ctx), (select bs from ctx),
                                              (select i.id from public.indicateur i
                                                where i.ministere_id = (select a_m from ctx) and i.libelle = 'Part d''essai à remplacer')) $$,
  'une moyenne remplace une part');
select is(pg_temp.part_de('Moyenne d''essai neuve'), false, 'une moyenne n''est jamais une part, même en remplaçant une part');

-- Appelants : le ministère et le berger restent refusés, avec ou sans p_part.
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.creer_calcul('Part d''essai refusée', 'Part d''essai refusée au ministère.', 'taux',
                                               (select h from ctx), (select bs from ctx), null, true) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère ne crée pas de part');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.creer_calcul('Part d''essai refusée', 'Part d''essai refusée au berger.', 'taux',
                                               (select h from ctx), (select bs from ctx), null, true) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne crée pas de part');
select tests.deconnecter();

select lives_ok($$ set constraints all immediate $$, 'à la fin de la transaction, termes et remplacements sont complets');
set constraints all deferred;

select * from finish();
rollback;
