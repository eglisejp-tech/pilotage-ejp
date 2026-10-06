-- Matrice des droits des lectures des indicateurs (lot B2 ; docs/plan-etape-4.md, section 4,
-- « Matrice des droits des objets nouveaux » ; contrat-etape-4.md, section 8), écrite en données
-- et parcourue par tests.verifier_matrice (000-outils.test.sql).
--
-- Objets : mesure (lecture, lignes sensibles comprises), v_mesure_periode, v_indicateur_serie,
-- v_indicateur_suivi, v_calcul, v_usage_indicateurs et les lignes mesure_saisie du journal.
-- Profils : le ministère porteur (créé par le test), trois autres ministères du jeu d'exemple
-- (Communication, FIJ, Coordination), le berger, le conseil, l'administration de l'église et EJP
-- Tech, en aal2 ; la dérivation ajoute la ligne aal1 de chacun (zéro ligne lue) et la ligne de
-- l'anonyme (refusé partout).
-- Attendu : le ministère lit les valeurs exactes des siens, sensibles compris ; le berger, le
-- conseil et EJP Tech lisent tout, avec le seuil « moins de 3 » sur les sensibles et sans leurs
-- lignes brutes ; l'administration lit des lignes sans valeur (sauf communs) et l'usage ; un
-- autre ministère ne lit rien des indicateurs propres ; l'usage est à l'administration et à EJP
-- Tech seulement.
begin;

select tests.creer_ministere('Essai matrice B2');
update public.ministere set cree_le = now() - interval '2 years' where nom = 'Essai matrice B2';
select tests.creer_compte('essai-matrice-b2@exemple.test', 'ministere', tests.ministere('Essai matrice B2'));

create temp table ctx as
select tests.ministere('Essai matrice B2') as m,
       (select c.user_id from public.compte c where c.ministere_id = tests.ministere('Essai matrice B2')) as moi,
       private.mois_courant() as mc,
       (private.mois_courant() - interval '1 month')::date as m1;
grant select on ctx to authenticated, anon;

create function pg_temp.ind(p_libelle text, p_sensible boolean default false, p_calcul text default null)
returns uuid language sql as $$
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, calcul, cree_le, texte_le)
  select p_libelle, 'Définition d''essai de la matrice du lot B2.', 'mois', m, p_sensible, p_calcul,
         now() - interval '2 years', now() - interval '2 years'
    from ctx
  returning id
$$;

create temp table ind as
select pg_temp.ind('Essai M réalisés') as propre,
       pg_temp.ind('Essai M prévus') as propre2,
       pg_temp.ind('Essai M interventions', true) as sensible;
alter table ind add column taux uuid;
update ind set taux = pg_temp.ind('Essai M taux', p_calcul => 'taux');
insert into public.indicateur_terme (calcul_id, ordre, role, source_id)
select taux, 1, 'haut', propre from ind union all select taux, 2, 'bas', propre2 from ind;
grant select on ind to authenticated, anon;

-- Un envoi : 7 sur 10, et le sensible à 2 pour le mois dernier et pour le mois en cours.
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select ind.propre, ctx.m, ctx.m1, 7, now() - interval '1 hour', ctx.moi from ind, ctx
union all select ind.propre2, ctx.m, ctx.m1, 10, now() - interval '1 hour', ctx.moi from ind, ctx
union all select ind.sensible, ctx.m, ctx.m1, 2, now() - interval '1 hour', ctx.moi from ind, ctx
union all select ind.sensible, ctx.m, ctx.mc, 2, now() - interval '1 hour', ctx.moi from ind, ctx;

create temp table profil (ordre integer primary key, nom text not null unique, compte uuid, sorte text not null);
insert into profil (ordre, nom, compte, sorte)
select 1, 'ministère porteur', moi, 'porteur' from ctx
union all select 2, 'ministère Communication', tests.compte('Ministère Communication'), 'autre'
union all select 3, 'ministère FIJ',
                 (select c.user_id from public.compte c join public.ministere x on x.id = c.ministere_id
                   where x.code = 'fij' and c.desactive_le is null), 'autre'
union all select 4, 'ministère Coordination', tests.compte('Ministère Coordination'), 'autre'
union all select 5, 'berger', tests.compte('Berger'), 'lecteur'
union all select 6, 'conseil', tests.compte('Conseil, compte 1'), 'lecteur'
union all select 7, 'administration', tests.compte('Administration de l''église'), 'admin'
union all select 8, 'EJP Tech', tests.compte('EJP Tech, compte 1'), 'tech';

-- Objets lus (filtrés sur le ministère porteur), avec l'attendu de chaque sorte de profil.
create temp table objet (
  rang integer primary key,
  objet text not null,
  requete text not null,
  porteur text not null,
  autre text not null,
  lecteur text not null,
  admin text not null,
  tech text not null
);
insert into objet values
  (1, 'mesure', 'select 1 from public.mesure where ministere_id = (select m from ctx)', '4', '0', '2', '0', '2'),
  (2, 'mesure (lignes sensibles)', 'select 1 from public.mesure where indicateur_id = (select sensible from ind)',
   '2', '0', '0', '0', '0'),
  (3, 'v_mesure_periode', 'select 1 from public.v_mesure_periode where ministere_id = (select m from ctx)',
   '4', '0', '4', '4', '4'),
  (4, 'v_mesure_periode (valeur sensible)',
   'select 1 from public.v_mesure_periode where indicateur_id = (select sensible from ind) and valeur is not null',
   '2', '0', '0', '0', '0'),
  (5, 'v_mesure_periode (moins de 3)',
   'select 1 from public.v_mesure_periode where indicateur_id = (select sensible from ind) and moins_de_3',
   '0', '0', '2', '0', '2'),
  (6, 'v_mesure_periode (valeurs propres)',
   'select 1 from public.v_mesure_periode where indicateur_id in (select propre from ind union all select propre2 from ind) and valeur is not null',
   '2', '0', '2', '0', '2'),
  (7, 'v_indicateur_serie', 'select 1 from public.v_indicateur_serie where ministere_id = (select m from ctx)',
   '36', '0', '36', '36', '36'),
  (8, 'v_indicateur_serie (valeurs)',
   'select 1 from public.v_indicateur_serie where ministere_id = (select m from ctx) and valeur is not null',
   '3', '0', '2', '0', '2'),
  (9, 'v_indicateur_suivi', 'select 1 from public.v_indicateur_suivi where ministere_id = (select m from ctx)',
   '4', '0', '4', '4', '4'),
  (10, 'v_indicateur_suivi (valeur sensible)',
   'select 1 from public.v_indicateur_suivi where indicateur_id = (select sensible from ind) and (derniere_valeur is not null or mois_en_cours_valeur is not null)',
   '1', '0', '0', '0', '0'),
  (11, 'v_indicateur_suivi (moins de 3)',
   'select 1 from public.v_indicateur_suivi where indicateur_id = (select sensible from ind) and derniere_moins_de_3 and mois_en_cours_moins_de_3',
   '0', '0', '1', '0', '1'),
  (12, 'v_calcul', 'select 1 from public.v_calcul where ministere_id = (select m from ctx)', '1', '0', '1', '1', '1'),
  (13, 'v_calcul (résultat)',
   'select 1 from public.v_calcul where ministere_id = (select m from ctx) and resultat = 70',
   '1', '0', '1', '0', '1'),
  (14, 'v_usage_indicateurs', 'select 1 from public.v_usage_indicateurs where ministere_id = (select m from ctx)',
   '0', '0', '0', '3', '3'),
  (15, 'journal (mesure_saisie)',
   'select 1 from public.journal where ministere_id = (select m from ctx) and action = ''mesure_saisie''',
   '1', '0', '1', '1', '1'),
  (16, 'journal (ligne sensible)',
   'select 1 from public.journal j where strpos(j.detail::text, (select sensible::text from ind)) > 0',
   '0', '0', '0', '0', '0');

create temp table matrice as
select row_number() over (order by o.rang, p.ordre) as rang,
       p.nom as profil, o.objet, 'lire'::text as action, 'aal2'::text as aal,
       case p.sorte when 'porteur' then o.porteur when 'autre' then o.autre when 'lecteur' then o.lecteur
                    when 'admin' then o.admin else o.tech end as attendu,
       o.requete
  from objet o
 cross join profil p;

select plan(2
  + tests.nombre_essais($$ select profil, objet, action, aal, attendu, requete from matrice order by rang $$,
                        $$ select nom, compte from profil $$, true));

select ok((select count(*) from profil where compte is null) = 0, 'chaque profil a son compte');
select is((select count(*)::int from public.journal
            where ministere_id = (select m from ctx) and action = 'mesure_saisie'), 1,
  'l''envoi d''essai a écrit une seule ligne de journal');

select * from tests.verifier_matrice(
  $$ select profil, objet, action, aal, attendu, requete from matrice order by rang $$,
  $$ select nom, compte from profil $$,
  true);

select * from finish();
rollback;
