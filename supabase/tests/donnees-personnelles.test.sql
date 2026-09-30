-- Données personnelles (règles 9 et 10, BRIEF section 7, « Données personnelles ») : un texte
-- masqué ne laisse aucune trace, ni dans sa table, ni dans le journal, ni dans la modération.
begin;

select plan(7);

create temp table ctx as
select tests.creer_ministere('Essai confidentialité A') as a_m,
       tests.creer_ministere('Essai confidentialité B') as b_m,
       tests.compte('EJP Tech, compte 1') as ejptech;
alter table ctx add column a uuid, add column b uuid, add column point uuid, add column suivi uuid;
update ctx set a = tests.creer_compte('confidentialite-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('confidentialite-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated;

-- Un point dont la description contient un marqueur, traité avec un commentaire qui en contient un autre
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.creer_point('Point confidentiel', 'Appeler MARQUEUR-DESCRIPTION-4217 demain', null, 'normale', null,
    array[(select b_m from ctx)])
$$, 'un ministère crée un point dont la description contient un marqueur');
select tests.deconnecter();
update ctx set point = (select p.id from public.point_attention p where p.titre = 'Point confidentiel');

select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$
  select public.marquer_traite((select point from ctx), 'Réglé avec MARQUEUR-COMMENTAIRE-9031 par téléphone')
$$, 'le ministère mentionné le marque traité avec un commentaire qui contient un autre marqueur');
select tests.deconnecter();
update ctx set suivi = (select s.id from public.point_suivi s where s.point_id = (select point from ctx) and s.statut = 'traite');

-- EJP Tech masque les deux textes
select tests.se_connecter((select ejptech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('point_attention', (select point from ctx), 'description', 'nom_personne') $$,
  'EJP Tech masque la description');
select lives_ok($$ select public.masquer_texte('point_suivi', (select suivi from ctx), 'commentaire', 'coordonnees') $$,
  'EJP Tech masque le commentaire de traitement');
select tests.deconnecter();

-- Aucune trace des marqueurs, colonnes et detail du journal compris
select is_empty($$
  select 'point_attention' from public.point_attention x where x::text like '%MARQUEUR-%'
  union all
  select 'point_suivi' from public.point_suivi x where x::text like '%MARQUEUR-%'
  union all
  select 'journal' from public.journal x where x::text like '%MARQUEUR-%'
  union all
  select 'moderation' from public.moderation x where x::text like '%MARQUEUR-%'
$$, 'aucune ligne de point_attention, point_suivi, journal ni moderation ne contient les marqueurs');
select is(tests.compter((select ejptech from ctx), 'aal2',
  $$ select * from public.v_textes_a_relire x where x::text like '%MARQUEUR-%' $$), 0,
  'la file de relecture d''EJP Tech ne montre plus les marqueurs');
select is(tests.compter((select a from ctx), 'aal2',
  $$ select * from public.v_journal x where x::text like '%MARQUEUR-%' $$), 0,
  'le journal lisible du ministère ne montre pas les marqueurs');

select * from finish();
rollback;
