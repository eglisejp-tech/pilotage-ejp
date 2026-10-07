-- Journal des saisies de chiffres (lot B2 ; docs/plan-etape-4.md, section 4, « B2 » ;
-- docs/conception/contrat-etape-4.md, section 1, code mesure_saisie ; docs/decisions.md, P45).
--
-- Une ligne mesure_saisie par envoi ; detail {"lignes": [{"indicateur_id", "date_ref", "valeur",
-- "corrige"}]} : la valeur pour un chiffre commun seulement, jamais pour un indicateur propre ;
-- corrige vrai sur une ligne qui remplace une valeur de la même période ; aucune ligne d'un
-- indicateur sensible (ni son identifiant, ni sa date, ni corrige) ; un envoi de sensibles seuls
-- a {"lignes": []}. L'administration lit les envois sans valeur propre, jamais une ligne ancienne
-- qui en porte une ; elle lit les codes indicateur_*, ni les statistiques FIJ ni les événements.
begin;

select plan(28);

select tests.creer_ministere('Essai journal');
update public.ministere set cree_le = now() - interval '2 years' where nom = 'Essai journal';
select tests.creer_compte('essai-journal@exemple.test', 'ministere', tests.ministere('Essai journal'));

create temp table ctx as
select tests.ministere('Essai journal') as m,
       (select c.user_id from public.compte c where c.ministere_id = tests.ministere('Essai journal')) as moi,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Ministère Communication') as com,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       private.dimanche_reference() as ref,
       private.mois_courant() as mc,
       (private.mois_courant() - interval '1 month')::date as m1;
grant select on ctx to authenticated;

create temp table ind as
with a as (
  insert into public.indicateur (libelle, definition, nature, ministere_id, cree_le, texte_le)
  select 'Essai J publications', 'Définition d''essai du journal des saisies.', 'mois', m,
         now() - interval '2 years', now() - interval '2 years' from ctx
  returning id
), b as (
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, cree_le, texte_le)
  select 'Essai J interventions', 'Définition d''essai du journal des saisies.', 'mois', m, true,
         now() - interval '2 years', now() - interval '2 years' from ctx
  returning id
)
select a.id as propre, b.id as sensible from a, b;
grant select on ind to authenticated;

-- Trois envois du ministère, chacun en une instruction :
-- 1. mixte : un chiffre commun, un indicateur propre, le mois en cours d'un sensible ;
-- 2. correction de l'indicateur propre et seconde saisie du mois en cours du sensible ;
-- 3. le sensible seul (troisième saisie du mois en cours).
select tests.se_connecter((select moi from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select service, m, ref, 11 from ctx
  union all select (select propre from ind), m, m1, 6 from ctx
  union all select (select sensible from ind), m, mc, 2 from ctx
$$, 'envoi mixte accepté (commun, propre, sensible du mois en cours)');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select (select propre from ind), m, m1, 8 from ctx
  union all select (select sensible from ind), m, mc, 4 from ctx
$$, 'correction acceptée, seconde saisie du mois en cours du sensible comprise');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select (select sensible from ind), m, mc, 1 from ctx
$$, 'envoi du sensible seul accepté');
select tests.deconnecter();

create temp table envoi as
select row_number() over (order by j.id)::int as n, j.*
  from public.journal j
 where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie';
grant select on envoi to authenticated;

-- 1. Une ligne par envoi, au nom du compte, à l'heure de l'envoi

select is((select count(*)::int from envoi), 3, 'trois envois, trois lignes mesure_saisie');
select is((select count(*)::int from envoi e
            where e.compte = (select moi from ctx) and e.cible is null and e.cible_id is null
              and e.le = (select max(x.saisi_le) from public.mesure x
                           where x.ministere_id = (select m from ctx) and x.saisi_le = e.le)), 3,
  'chaque ligne : le compte de l''auteur, l''heure de son envoi, sans cible');
select is((select count(distinct le)::int from envoi), 3, 'trois heures d''envoi distinctes');

-- 2. Le detail de chaque envoi

select is((select detail from envoi where n = 1),
  jsonb_build_object('lignes', jsonb_build_array(
    jsonb_build_object('indicateur_id', (select service from ctx), 'date_ref', (select ref from ctx), 'valeur', 11,
                       'corrige', false),
    jsonb_build_object('indicateur_id', (select propre from ind), 'date_ref', (select m1 from ctx), 'corrige', false))),
  'envoi mixte : le commun avec sa valeur, le propre sans valeur, aucune ligne du sensible');
select is((select detail from envoi where n = 2),
  jsonb_build_object('lignes', jsonb_build_array(
    jsonb_build_object('indicateur_id', (select propre from ind), 'date_ref', (select m1 from ctx), 'corrige', true))),
  'correction : corrige vrai, sans valeur ; la seconde saisie du sensible n''y figure pas');
select is((select detail from envoi where n = 3), '{"lignes": []}'::jsonb,
  'un envoi qui ne contient qu''un sensible a un detail vide');
select is((select count(*)::int from envoi e
            cross join lateral jsonb_array_elements(e.detail -> 'lignes') as l(ligne)
           where exists (select 1 from jsonb_object_keys(l.ligne) as k
                          where k not in ('indicateur_id', 'date_ref', 'valeur', 'corrige'))), 0,
  'detail : identifiants, dates, nombres et drapeaux seulement, jamais un texte libre ni un libellé');
select is((select count(*)::int from envoi e
            cross join lateral jsonb_array_elements(e.detail -> 'lignes') as l(ligne)
           where l.ligne ->> 'indicateur_id' = (select sensible::text from ind)
              or (l.ligne ->> 'date_ref' = (select mc::text from ctx)
                  and l.ligne ->> 'indicateur_id' <> (select service::text from ctx))), 0,
  'aucune ligne ne cite l''indicateur sensible ni la date de son mois en cours');
select is((select count(*)::int from envoi e where strpos(e.detail::text, (select sensible::text from ind)) > 0), 0,
  'l''identifiant du sensible n''apparaît nulle part dans le detail');
select is((select count(*)::int from envoi e
            cross join lateral jsonb_array_elements(e.detail -> 'lignes') as l(ligne)
           where l.ligne ->> 'indicateur_id' = (select propre::text from ind) and l.ligne ? 'valeur'), 0,
  'aucune valeur d''un indicateur propre');

-- 3. Lecteurs : aucune ligne du sensible pour personne

select is(tests.compter((select berger from ctx), 'aal2', $$
  select 1 from public.journal j cross join lateral jsonb_array_elements(j.detail -> 'lignes') as l(ligne)
   where l.ligne ->> 'indicateur_id' = (select sensible::text from ind)
$$), 0, 'berger : aucune ligne de journal ne cite l''indicateur sensible');
select is(tests.compter((select conseil from ctx), 'aal2', $$
  select 1 from public.v_journal j where j.ministere_id = (select m from ctx)
     and strpos(j.detail::text, (select sensible::text from ind)) > 0
$$), 0, 'conseil : rien du sensible dans v_journal');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.journal j where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
$$), 3, 'EJP Tech : lit les trois envois');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.journal j where strpos(j.detail::text, (select sensible::text from ind)) > 0
$$), 0, 'EJP Tech : aucune ligne du sensible');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select 1 from public.journal j where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
$$), 3, 'administration : lit les trois envois, qui ne portent aucune valeur propre ni ligne sensible');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select 1 from public.v_journal j where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
     and strpos(j.detail::text, (select sensible::text from ind)) = 0
$$), 3, 'administration : les mêmes dans v_journal, sans le sensible');
select is(tests.compter((select moi from ctx), 'aal2', $$
  select 1 from public.journal j where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
$$), 3, 'le ministère lit ses trois envois');
select is(tests.compter((select com from ctx), 'aal2', $$
  select 1 from public.journal j where j.ministere_id = (select m from ctx)
$$), 0, 'un autre ministère ne lit rien');

-- 4. Lignes anciennes (étapes 1 à 3) : la valeur d'un indicateur propre ou une ligne sensible
-- restent cachées à l'administration.
insert into public.journal (le, compte, ministere_id, action, detail)
select now() - interval '1 day', moi, m, 'mesure_saisie',
       jsonb_build_object('lignes', jsonb_build_array(
         jsonb_build_object('indicateur_id', (select propre from ind), 'date_ref', m1, 'valeur', 5)))
  from ctx
union all
select now() - interval '1 day', moi, m, 'mesure_saisie',
       jsonb_build_object('lignes', jsonb_build_array(
         jsonb_build_object('indicateur_id', (select sensible from ind), 'date_ref', m1)))
  from ctx;
select is(tests.compter((select admin from ctx), 'aal2', $$
  select 1 from public.journal j where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
$$), 3, 'administration : une ligne ancienne avec une valeur propre ou un sensible lui reste cachée');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select 1 from public.v_journal j where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
$$), 3, 'administration : idem dans v_journal');

-- 5. Liste de l'administration

select results_eq($$
  select private.journal_lisible_administration(a.code, '{}'::jsonb)
    from (values ('indicateur_cree'), ('indicateurs_prevus_crees'), ('indicateur_corrige'), ('indicateur_valide'),
                 ('indicateur_refuse'), ('indicateur_retire')) as a(code)
$$, $$ values (true), (true), (true), (true), (true), (true) $$,
  'administration : les codes de configuration des indicateurs (sans valeur)');
select results_eq($$
  select private.journal_lisible_administration(a.code, '{}'::jsonb)
    from (values ('fij_statistiques_saisies'), ('evenement_ajoute'), ('evenement_modifie'), ('reunion_saisie'),
                 ('point_cree')) as a(code)
$$, $$ values (false), (false), (false), (false), (false) $$,
  'administration : ni les statistiques FIJ, ni les événements, ni les réunions, ni les points');
select ok(private.journal_lisible_administration('mesure_saisie', '{"lignes": []}'::jsonb),
  'administration : un envoi au detail vide est lisible');

-- 6. Le trigger écrit sous l'heure de l'envoi, pas sous now()

select ok((select p.prosecdef and p.proconfig @> array['search_path=""']
             from pg_proc p where p.oid = 'private.journaliser_mesures()'::regprocedure),
  'journaliser_mesures : security definer, search_path vide');
select ok(not has_function_privilege('authenticated', 'private.journaliser_mesures()', 'execute')
          and not has_function_privilege('anon', 'private.journaliser_mesures()', 'execute'),
  'journaliser_mesures n''est appelable ni par authenticated ni par anon');

select * from finish();
rollback;
