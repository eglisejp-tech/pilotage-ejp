-- Seuil des indicateurs sensibles (lot B2 ; docs/plan-etape-4.md, section 4, « B2 » ;
-- vague-1-decisions.md, K5c et X4 ; docs/decisions.md, P35, P42 et P45).
--
-- 0 reste 0 ; 1 et 2 rendus « moins de 3 » au berger, au conseil et à EJP Tech ; valeur exacte
-- pour le ministère ; lecture directe des lignes sensibles de mesure refusée à tout autre
-- profil ; somme de l'année des seuls mois affichés, sans fuite par différence avec la courbe ;
-- un autre ministère, l'administration, aal1 et l'anonyme ne reçoivent aucune valeur sensible
-- par aucune vue ; aucune vue de l'église ni ligne de journal ne porte un sensible ; mois en
-- cours d'un sensible (P45) : rendu « moins de 3 » au berger et exact au ministère, hors de la
-- somme et de sa complétude ; après deux saisies du même mois (1, puis 4), le berger ne lit que
-- 4, sur une seule ligne, sans la date de la première saisie.
begin;

select plan(42);

select tests.creer_ministere('Essai seuil');
update public.ministere set cree_le = now() - interval '2 years' where nom = 'Essai seuil';
select tests.creer_compte('essai-seuil@exemple.test', 'ministere', tests.ministere('Essai seuil'));

create temp table ctx as
select tests.ministere('Essai seuil') as m,
       (select c.user_id from public.compte c where c.ministere_id = tests.ministere('Essai seuil')) as moi,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Ministère Communication') as com,
       private.mois_courant() as mc,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '2 months')::date as m2,
       (private.mois_courant() - interval '3 months')::date as m3,
       (private.mois_courant() - interval '4 months')::date as m4,
       make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier;
grant select on ctx to authenticated, anon;

create function pg_temp.sensible(p_libelle text) returns uuid language sql as $$
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, cree_le, texte_le)
  select p_libelle, 'Définition d''essai du seuil des sensibles.', 'mois', m, true,
         now() - interval '2 years', now() - interval '2 years'
    from ctx
  returning id
$$;

create function pg_temp.saisir(p_indicateur uuid, p_date date, p_valeur integer,
                               p_le timestamptz default now() - interval '1 hour')
returns void language sql as $$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
  select p_indicateur, m, p_date, p_valeur, p_le, moi from ctx
$$;

create temp table ind as
select pg_temp.sensible('Essai S interventions') as sens,
       pg_temp.sensible('Essai S corrigé') as corr,
       pg_temp.sensible('Essai S petits') as petits,
       pg_temp.sensible('Essai S un') as un;
grant select on ind to authenticated, anon;

-- Valeurs des mois finis, d'où se calculent les attendus (une partie peut tomber l'année d'avant
-- en janvier et en février).
create temp table vals (cle text, mois date, valeur integer);
insert into vals
select 'sens', m4, 1 from ctx union all select 'sens', m3, 5 from ctx
union all select 'sens', m2, 0 from ctx union all select 'sens', m1, 2 from ctx
union all select 'corr', m1, 3 from ctx
union all select 'petits', m2, 2 from ctx union all select 'petits', m1, 1 from ctx
union all select 'un', m1, 1 from ctx;
grant select on vals to authenticated;

select pg_temp.saisir(case v.cle when 'sens' then i.sens when 'corr' then i.corr when 'petits' then i.petits else i.un end,
                      v.mois, v.valeur)
  from vals v cross join ind i;
-- Mois en cours : 2 pour le premier ; 1 puis 4 pour le second (deux envois du même mois).
select pg_temp.saisir(sens, mc, 2) from ind, ctx;
select pg_temp.saisir(corr, mc, 1, now() - interval '3 hours') from ind, ctx;
select pg_temp.saisir(corr, mc, 4, now() - interval '2 hours') from ind, ctx;

-- Attendus du berger : somme des seuls mois affichés de l'année (ni 1 ni 2), complétude de tous
-- les mois saisis de l'année.
create temp table attendu as
select k.cle,
       (select sum(v.valeur) filter (where v.valeur not in (1, 2)) from vals v, ctx
         where v.cle = k.cle and v.mois between ctx.janvier and ctx.m1)::int as somme_affichee,
       (select sum(v.valeur) from vals v, ctx
         where v.cle = k.cle and v.mois between ctx.janvier and ctx.m1)::int as somme_exacte,
       (select count(*) from vals v, ctx where v.cle = k.cle and v.mois between ctx.janvier and ctx.m1)::int as nb
  from (values ('sens'), ('corr'), ('petits'), ('un')) as k(cle);
grant select on attendu to authenticated;

-- 1. Le seuil

select results_eq($$
  select private.sous_seuil(0), private.sous_seuil(1), private.sous_seuil(2), private.sous_seuil(3),
         private.sous_seuil(null)
$$, $$ values (false, true, true, false, false) $$, 'seuil : 1 et 2 sont « moins de 3 », 0 et 3 non, une absence non plus');

-- 2. Le berger : seuil sur chaque mois, mois en cours compris

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select periode, valeur, moins_de_3 from public.v_mesure_periode
   where indicateur_id = (select sens from ind) order by periode
$$, $$ select m4, null::int, true from ctx union all select m3, 5, false from ctx
       union all select m2, 0, false from ctx union all select m1, null, true from ctx
       union all select mc, null, true from ctx $$,
  'berger : 1 et 2 rendus « moins de 3 » (valeur nulle), 0 reste 0, 5 reste 5, mois en cours compris');
select results_eq($$
  select derniere_periode, derniere_valeur, derniere_moins_de_3, mois_en_cours_valeur, mois_en_cours_moins_de_3
    from public.v_indicateur_suivi where indicateur_id = (select sens from ind)
$$, $$ select m1, null::int, true, null::int, true from ctx $$,
  'berger : dernier mois écoulé et mois en cours « moins de 3 » (P45)');
select results_eq($$
  select s.somme_annee::int, s.somme_moins_de_3, s.somme_nb_saisies
    from public.v_indicateur_suivi s where s.indicateur_id = (select sens from ind)
$$, $$ select somme_affichee, false, nb from attendu where cle = 'sens' $$,
  'berger : la somme de l''année ne compte que les mois affichés ; la complétude compte tous les mois saisis, hors mois en cours');
select is((select s.somme_annee::int from public.v_indicateur_suivi s where s.indicateur_id = (select sens from ind)),
  (select sum(x.valeur)::int from public.v_indicateur_serie x, public.v_indicateur_suivi s
    where x.indicateur_id = (select sens from ind) and s.indicateur_id = x.indicateur_id
      and x.periode >= s.somme_depuis),
  'aucune différence entre la somme affichée et la courbe affichée ne révèle un mois masqué');
select results_eq($$
  select rang::int, valeur, moins_de_3 from public.v_indicateur_serie
   where indicateur_id = (select sens from ind) and rang >= 9 order by rang
$$, $$ values (9, null::int, true), (10, 5, false), (11, 0, false), (12, null, true) $$,
  'berger : la courbe applique le même seuil');
select results_eq($$
  select s.somme_annee, s.somme_moins_de_3, s.somme_nb_saisies
    from public.v_indicateur_suivi s where s.indicateur_id = (select petits from ind)
$$, $$ select null::bigint, false, nb from attendu where cle = 'petits' $$,
  'berger : une année de mois tous sous 3 n''a aucune somme affichée (ni 3, ni « moins de 3 »)');
select results_eq($$
  select count(*)::int, max(valeur), max(saisi_le) from public.v_mesure_periode
   where indicateur_id = (select corr from ind) and periode = (select mc from ctx)
$$, $$ values (1, 4, now() - interval '2 hours') $$,
  'P45 : après 1 puis 4 dans le mois en cours, le berger lit 4, une seule ligne, l''heure de la seconde saisie');
select is((select mois_en_cours_valeur from public.v_indicateur_suivi where indicateur_id = (select corr from ind)), 4,
  'P45 : le suivi rend la saisie qui fait foi du mois en cours (4, pas « moins de 3 »)');
select is((select count(*)::int from public.v_mesure_periode
            where indicateur_id in (select sens from ind union all select corr from ind union all select petits from ind
                                    union all select un from ind)
              and saisi_le = now() - interval '3 hours'), 0,
  'P45 : la date de la première saisie du mois n''est lue nulle part');
select is((select count(*)::int from public.mesure m
            where m.indicateur_id in (select sens from ind union all select corr from ind union all select petits from ind
                                      union all select un from ind)), 0,
  'berger : lecture directe des lignes sensibles de mesure refusée (aucune ligne)');
select is((select count(*)::int from public.v_derniere_mesure where indicateur_id = (select sens from ind)), 0,
  'berger : aucune ligne sensible par v_derniere_mesure');
select tests.deconnecter();

-- 3. Le conseil et EJP Tech lisent comme le berger

select is(tests.lire((select conseil from ctx), 'aal2', $$
  select valeur, moins_de_3 from public.v_mesure_periode
   where indicateur_id = (select sens from ind) and periode in ((select m1 from ctx), (select m2 from ctx))
$$), '[{"valeur": 0, "moins_de_3": false}, {"valeur": null, "moins_de_3": true}]'::jsonb,
  'conseil : 2 rendu « moins de 3 », 0 reste 0');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select valeur, moins_de_3 from public.v_mesure_periode
   where indicateur_id = (select sens from ind) and periode in ((select m1 from ctx), (select m2 from ctx))
$$), '[{"valeur": 0, "moins_de_3": false}, {"valeur": null, "moins_de_3": true}]'::jsonb,
  'EJP Tech : 2 rendu « moins de 3 », 0 reste 0');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select mois_en_cours_valeur, mois_en_cours_moins_de_3 from public.v_indicateur_suivi
   where indicateur_id = (select sens from ind)
$$), '[{"mois_en_cours_valeur": null, "mois_en_cours_moins_de_3": true}]'::jsonb,
  'EJP Tech : mois en cours « moins de 3 »');
select is(tests.compter((select conseil from ctx), 'aal2', $$
  select 1 from public.mesure where indicateur_id = (select sens from ind)
$$), 0, 'conseil : lecture directe des lignes sensibles refusée');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.mesure where indicateur_id = (select sens from ind)
$$), 0, 'EJP Tech : lecture directe des lignes sensibles refusée');

-- 4. Le ministère lit ses valeurs exactes et ses lignes brutes

select tests.se_connecter((select moi from ctx), 'aal2');
select results_eq($$
  select periode, valeur, moins_de_3 from public.v_mesure_periode
   where indicateur_id = (select sens from ind) order by periode
$$, $$ select m4, 1, false from ctx union all select m3, 5, false from ctx union all select m2, 0, false from ctx
       union all select m1, 2, false from ctx union all select mc, 2, false from ctx $$,
  'ministère : valeurs exactes, mois en cours compris, jamais « moins de 3 »');
select results_eq($$
  select derniere_valeur, derniere_moins_de_3, mois_en_cours_valeur, mois_en_cours_moins_de_3,
         somme_annee::int, somme_moins_de_3, somme_nb_saisies
    from public.v_indicateur_suivi where indicateur_id = (select sens from ind)
$$, $$ select 2, false, 2, false, somme_exacte, false, nb from attendu where cle = 'sens' $$,
  'ministère : dernière valeur 2, mois en cours 2, somme exacte de l''année, hors mois en cours');
select results_eq($$
  select somme_annee::int, somme_moins_de_3 from public.v_indicateur_suivi where indicateur_id = (select un from ind)
$$, $$ select somme_exacte, false from attendu where cle = 'un' $$,
  'ministère : une somme de 1 reste exacte pour lui');
select is((select count(*)::int from public.mesure where indicateur_id = (select corr from ind)), 3,
  'ministère : il lit ses lignes brutes, les deux saisies du mois en cours comprises');
select results_eq($$
  select rang::int, valeur, moins_de_3 from public.v_indicateur_serie
   where indicateur_id = (select sens from ind) and rang >= 9 order by rang
$$, $$ values (9, 1, false), (10, 5, false), (11, 0, false), (12, 2, false) $$,
  'ministère : sa courbe exacte');
select tests.deconnecter();

-- 5. Ni un autre ministère, ni l'administration, ni aal1, ni l'anonyme

select tests.se_connecter((select com from ctx), 'aal2');
select is((select count(*)::int from public.v_mesure_periode where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucune ligne sensible par v_mesure_periode');
select is((select count(*)::int from public.v_indicateur_serie where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucune courbe');
select is((select count(*)::int from public.v_indicateur_suivi where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucun suivi');
select is((select count(*)::int from public.mesure where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucune ligne de mesure');
select tests.deconnecter();

select tests.se_connecter((select admin from ctx), 'aal2');
select results_eq($$
  select count(valeur)::int, bool_or(moins_de_3) from public.v_mesure_periode where ministere_id = (select m from ctx)
$$, $$ values (0, false) $$, 'administration : aucune valeur sensible par v_mesure_periode (lignes sans valeur)');
select is((select count(*)::int from public.v_indicateur_serie
            where ministere_id = (select m from ctx) and (valeur is not null or moins_de_3)), 0,
  'administration : aucune valeur sensible par la courbe');
select is((select count(*)::int from public.v_indicateur_suivi
            where ministere_id = (select m from ctx)
              and (derniere_valeur is not null or derniere_moins_de_3 or mois_en_cours_valeur is not null
                   or mois_en_cours_moins_de_3 or somme_annee is not null or somme_moins_de_3)), 0,
  'administration : aucune valeur sensible par le suivi');
select is((select count(*)::int from public.mesure where ministere_id = (select m from ctx)), 0,
  'administration : aucune ligne de mesure');
select tests.deconnecter();

select is(tests.compter((select berger from ctx), 'aal1', $$
  select 1 from public.v_mesure_periode where ministere_id = (select m from ctx)
  union all select 1 from public.v_indicateur_suivi where ministere_id = (select m from ctx)
  union all select 1 from public.v_indicateur_serie where ministere_id = (select m from ctx)
$$), 0, 'berger en aal1 : aucune ligne');
select is(tests.compter((select moi from ctx), 'aal1', $$
  select 1 from public.v_mesure_periode union all select 1 from public.mesure
$$), 0, 'ministère en aal1 : aucune ligne, pas même les siennes');
select is(tests.essai(null, null, 'select 1 from public.v_mesure_periode', 'lignes'), '42501',
  'anonyme : v_mesure_periode refusée');
select is(tests.essai(null, null, 'select 1 from public.v_indicateur_suivi', 'lignes'), '42501',
  'anonyme : v_indicateur_suivi refusée');
select is(tests.essai(null, null, 'select 1 from public.v_indicateur_serie', 'lignes'), '42501',
  'anonyme : v_indicateur_serie refusée');
select is(tests.essai(null, null, 'select 1 from public.mesure', 'lignes'), '42501',
  'anonyme : mesure refusée');

-- 6. Jamais sur la vue de l'église, jamais au journal avec sa valeur (P42)

select tests.se_connecter((select berger from ctx), 'aal2');
select is((select count(*)::int from public.v_total_dimanche
            where indicateur_id in (select sens from ind union all select corr from ind)), 0,
  'aucun sensible dans v_total_dimanche');
select is((select count(*)::int from public.v_total_a_ce_jour
            where indicateur_id in (select sens from ind union all select corr from ind)), 0,
  'aucun sensible dans v_total_a_ce_jour');
select is((select count(*)::int from public.v_mesure_dimanche
            where indicateur_id in (select sens from ind union all select corr from ind)), 0,
  'aucun sensible dans v_mesure_dimanche');
select tests.deconnecter();
select is((select count(*)::int from public.journal j, ind
            where strpos(j.detail::text, ind.sens::text) > 0 or strpos(j.detail::text, ind.corr::text) > 0
               or strpos(j.detail::text, ind.petits::text) > 0 or strpos(j.detail::text, ind.un::text) > 0), 0,
  'aucune ligne de journal ne cite un indicateur sensible');
select is((select count(*)::int from public.journal j
            where j.ministere_id = (select m from ctx) and j.action = 'mesure_saisie'
              and j.detail <> '{"lignes": []}'::jsonb), 0,
  'les envois de sensibles seuls ont un detail vide');

-- 7. Politique de lecture de mesure

-- (La fermeture des lignes sensibles se contrôle par comportement : le conseil et EJP Tech
-- comptent zéro ligne brute d'un sensible, plus haut.)
select ok(not exists (select 1 from pg_policies p
                       where p.schemaname = 'public' and p.tablename = 'mesure' and p.cmd = 'SELECT'
                         and p.permissive = 'PERMISSIVE' and p.policyname <> 'lecture'),
  'mesure n''a pas d''autre politique de lecture permissive');

select * from finish();
rollback;
