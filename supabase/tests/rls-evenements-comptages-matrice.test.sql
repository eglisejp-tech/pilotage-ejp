-- Matrice des droits des comptages d'événements (lot L2, X10, K11 ; ponctualité T68 ;
-- docs/plan-etape-4.md, section 4, matrice, lignes « Lot L » ; BRIEF, section 7) :
-- v_evenements_mois et evenements_eglise_mois(), pour le ministère Coordination (code
-- « coordination »), le ministère porteur, un ministère mentionné, un autre ministère, le berger,
-- le conseil, l'administration de l'église et EJP Tech, en aal2 ; puis, par
-- tests.verifier_matrice (000-outils.test.sql), chaque ligne en aal1 (rien lu, tout refusé) et
-- l'anonyme (42501 partout).
begin;

-- Jeu d'essai : A porte un événement et mentionne B ; C est un autre ministère ; D sert de mention.
create temp table ctx as
select tests.creer_ministere('Matrice L2 A') as a_m,
       tests.creer_ministere('Matrice L2 B') as b_m,
       tests.creer_ministere('Matrice L2 C') as c_m,
       tests.compte('Ministère Coordination') as coo;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column berger uuid,
  add column conseil uuid, add column admin uuid, add column tech uuid;
update ctx set a = tests.creer_compte('matrice-l2-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-l2-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('matrice-l2-c@exemple.test', 'ministere', c_m),
               berger = tests.creer_compte('matrice-l2-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('matrice-l2-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('matrice-l2-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('matrice-l2-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

-- Profils, dans l'ordre des colonnes de la matrice.
create temp table profil as
select x.ordre, x.nom, x.compte
from ctx
cross join lateral (values
  (1, 'ministère Coordination', ctx.coo),
  (2, 'ministère porteur', ctx.a),
  (3, 'ministère mentionné', ctx.b),
  (4, 'autre ministère', ctx.c),
  (5, 'berger', ctx.berger),
  (6, 'conseil', ctx.conseil),
  (7, 'administration', ctx.admin),
  (8, 'EJP Tech', ctx.tech)
) as x(ordre, nom, compte);

-- La matrice en aal2. « lire » : les lignes des comptages de A (un mois) ; « appeler » : ok ou
-- le code d'erreur.
create temp view matrice as
select row_number() over (order by o.rang, p.ordre) as rang,
       p.nom as profil, o.objet, o.action, 'aal2'::text as aal, o.attendus[p.ordre] as attendu, o.requete
from ctx
cross join lateral (values
  (1, 'v_evenements_mois', 'lire', '{0, 1, 0, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.v_evenements_mois where ministere_id = %L', ctx.a_m)),
  (2, 'evenements_eglise_mois', 'appeler', '{ok, 42501, 42501, 42501, ok, ok, 42501, ok}'::text[],
      'select public.evenements_eglise_mois()')
) as o(rang, objet, action, attendus, requete)
cross join profil p;
grant select on matrice, profil to authenticated, anon;

select plan(2 + tests.nombre_essais(
  'select profil, objet, action, aal, attendu, requete from matrice order by rang',
  'select nom, compte from profil',
  true));

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Matrice L2, événement', private.aujourdhui() + 10, 'attente_validation',
    array[(select b_m from ctx)], 1140::smallint)
$$, 'jeu d''essai : A ajoute un événement à 19 h qui mentionne B');
select tests.deconnecter();
select is((select count(*)::int from private.comptages_evenements_mois((select a_m from ctx))), 1,
  'le jeu d''essai donne un mois de comptages à A');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice order by rang',
  'select nom, compte from profil',
  true);

select * from finish();
rollback;
