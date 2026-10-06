-- Retrait pour confidentialité (lot B2 ; docs/plan-etape-4.md, section 4, matrice et « B2 » ;
-- vague-1-decisions.md, Q11 ; docs/decisions.md, P35).
--
-- Un indicateur retiré pour confidentialité ne se lit plus par l'API, pour aucun profil, EJP
-- Tech et son ministère compris : ni dans mesure, ni dans v_mesure_periode, v_indicateur_suivi,
-- v_indicateur_serie, v_usage_indicateurs ou v_derniere_mesure. L'export de fin de vie se fait
-- hors de l'API. Le retrait est joué par le propriétaire des tables, comme le fera
-- retirer_indicateur (B3) : état « retiré », motif « confidentialite », textes masqués sous
-- pilotage.masquage.
begin;

create temp table profil (ordre integer primary key, nom text not null, compte uuid);

select tests.creer_ministere('Essai confidentialité');
update public.ministere set cree_le = now() - interval '2 years' where nom = 'Essai confidentialité';
select tests.creer_compte('essai-confidentialite@exemple.test', 'ministere', tests.ministere('Essai confidentialité'));

create temp table ctx as
select tests.ministere('Essai confidentialité') as m,
       (select c.user_id from public.compte c where c.ministere_id = tests.ministere('Essai confidentialité')) as moi,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '2 months')::date as m2;
grant select on ctx to authenticated;

insert into profil (ordre, nom, compte)
select 1, 'ministère porteur', moi from ctx
union all select 2, 'ministère Communication', tests.compte('Ministère Communication')
union all select 3, 'ministère Coordination', tests.compte('Ministère Coordination')
union all select 4, 'berger', tests.compte('Berger')
union all select 5, 'conseil', tests.compte('Conseil, compte 1')
union all select 6, 'administration', tests.compte('Administration de l''église')
union all select 7, 'EJP Tech', tests.compte('EJP Tech, compte 1');

create temp table ind as
with a as (
  insert into public.indicateur (libelle, definition, nature, ministere_id, cree_le, texte_le)
  select 'Essai C interventions', 'Définition d''essai du retrait pour confidentialité.', 'mois', m,
         now() - interval '2 years', now() - interval '2 years' from ctx
  returning id
), b as (
  insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, cree_le, texte_le)
  select 'Essai C sensible', 'Définition d''essai du retrait pour confidentialité.', 'mois', m, true,
         now() - interval '2 years', now() - interval '2 years' from ctx
  returning id
)
select a.id as ordinaire, b.id as sensible from a, b;
grant select on ind to authenticated;

insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select ind.ordinaire, ctx.m, ctx.m1, 7, now() - interval '1 hour', ctx.moi from ind, ctx
union all select ind.ordinaire, ctx.m, ctx.m2, 9, now() - interval '1 hour', ctx.moi from ind, ctx
union all select ind.sensible, ctx.m, ctx.m1, 4, now() - interval '1 hour', ctx.moi from ind, ctx;

-- Objets lus, filtrés sur les deux indicateurs.
create temp table objet (rang integer primary key, nom text not null, requete text not null);
insert into objet values
  (1, 'mesure', 'select 1 from public.mesure where indicateur_id in (select ordinaire from ind union all select sensible from ind)'),
  (2, 'v_mesure_periode', 'select 1 from public.v_mesure_periode where indicateur_id in (select ordinaire from ind union all select sensible from ind)'),
  (3, 'v_indicateur_suivi', 'select 1 from public.v_indicateur_suivi where indicateur_id in (select ordinaire from ind union all select sensible from ind)'),
  (4, 'v_indicateur_serie', 'select 1 from public.v_indicateur_serie where indicateur_id in (select ordinaire from ind union all select sensible from ind)'),
  (5, 'v_usage_indicateurs', 'select 1 from public.v_usage_indicateurs where indicateur_id in (select ordinaire from ind union all select sensible from ind)'),
  (6, 'v_derniere_mesure', 'select 1 from public.v_derniere_mesure where indicateur_id in (select ordinaire from ind union all select sensible from ind)');

select plan(6 + (select count(*)::integer from profil) * (select count(*)::integer from objet));

-- Avant le retrait : les lectures ne sont pas vides.
select is(tests.compter((select moi from ctx), 'aal2', (select requete from objet where rang = 1)), 3,
  'avant : le ministère lit ses trois lignes, sensible comprise');
select is(tests.compter((select berger from ctx), 'aal2', (select requete from objet where rang = 1)), 2,
  'avant : le berger lit les deux lignes non sensibles');
select is(tests.compter((select berger from ctx), 'aal2', (select requete from objet where rang = 3)), 2,
  'avant : le berger lit le suivi des deux indicateurs');
select is(tests.compter((select admin from ctx), 'aal2', (select requete from objet where rang = 5)), 2,
  'avant : l''administration lit leur usage');

-- Retrait pour confidentialité, textes masqués.
select set_config('pilotage.masquage', 'oui', true);
update public.indicateur
   set etat = 'retire', retrait_motif = 'confidentialite',
       libelle = '[retiré pour confidentialité]', definition = '[retiré pour confidentialité]'
 where id in ((select ordinaire from ind), (select sensible from ind));
select set_config('pilotage.masquage', '', true);

select is((select count(*)::int from public.indicateur
            where id in ((select ordinaire from ind), (select sensible from ind))
              and etat = 'retire' and retrait_motif = 'confidentialite'), 2,
  'les deux indicateurs sont retirés pour confidentialité');
select is((select count(*)::int from public.mesure
            where indicateur_id in ((select ordinaire from ind), (select sensible from ind))), 3,
  'les valeurs restent en base (export de fin de vie hors de l''API)');

-- Après : rien pour personne, par aucun objet.
select is(tests.compter(p.compte, 'aal2', o.requete), 0,
          format('retiré pour confidentialité : %s ne lit rien par %s', p.nom, o.nom))
  from profil p cross join objet o
 order by o.rang, p.ordre;

select * from finish();
rollback;
