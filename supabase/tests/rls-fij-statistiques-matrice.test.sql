-- Matrice des droits des statistiques FIJ par département (lot B5 ; docs/plan-etape-4.md,
-- section 4, « Matrice des droits des objets nouveaux » ; contrat-etape-4.md, section 8),
-- écrite en données et parcourue par tests.verifier_matrice (000-outils.test.sql).
--
-- Objets : fij_statistique (lecture, ajout direct, modification, suppression),
-- v_fij_statistique, private.fij_rubriques() (rubriques servies à la vue),
-- saisir_fij_statistiques, et private.fij_rubrique (illisible par l'API).
-- Profils : les sept comptes du jeu d'exemple (ministère FIJ, ministère Communication,
-- ministère Coordination, berger, conseil, administration de l'église, EJP Tech), en aal2 ; la
-- dérivation ajoute la ligne aal1 de chacun (zéro ligne lue, toute autre action refusée) et la
-- ligne de l'anonyme (refusé partout).
-- Attendu : le ministère fij lit et saisit (par la fonction seulement) ; le berger, le conseil
-- et EJP Tech lisent ; l'administration et les autres ministères ne lisent rien ; personne
-- n'écrit directement dans la table, ni ne la modifie, ni ne l'efface, pas même son propriétaire.
begin;

create temp table ctx as
select (select c.user_id from public.compte c
          join public.ministere m on m.id = c.ministere_id
         where m.code = 'fij' and c.desactive_le is null) as fij,
       (select m.id from public.ministere m where m.code = 'fij') as fij_m,
       tests.compte('Ministère Communication') as com,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as ejptech,
       private.dimanche_reference() as ref;
grant select on ctx to authenticated, anon;

create temp table profil (ordre integer primary key, nom text not null unique, compte uuid, lecteur boolean not null);
insert into profil (ordre, nom, compte, lecteur)
select 1, 'ministère FIJ', c.fij, true from ctx c
union all select 2, 'ministère Communication', c.com, false from ctx c
union all select 3, 'ministère Coordination', c.coo, false from ctx c
union all select 4, 'berger', c.berger, true from ctx c
union all select 5, 'conseil', c.conseil, true from ctx c
union all select 6, 'administration', c.admin, false from ctx c
union all select 7, 'EJP Tech', c.ejptech, true from ctx c;

-- Objets essayés, avec leur requête (la même pour tous les profils) et l'attendu d'un lecteur
-- et d'un autre profil. Le ministère fij est seul à saisir.
create temp table objet (
  rang integer primary key,
  objet text not null,
  action text not null,
  requete text not null,
  pour_lecteur text not null,
  pour_autre text not null
);
insert into objet (rang, objet, action, requete, pour_lecteur, pour_autre)
select 1, 'fij_statistique', 'lire', 'select 1 from public.fij_statistique',
       (select count(*) from public.fij_statistique)::text, '0'
union all
select 2, 'fij_statistique', 'ajouter',
       format('insert into public.fij_statistique (ministere_id, rubrique, departement, dimanche, valeur) '
              'values (%L, %L, %L, %L, 1)', c.fij_m, 'culte_ejp', '75', c.ref),
       '42501', '42501'
  from ctx c
union all
select 3, 'fij_statistique', 'modifier', 'update public.fij_statistique set valeur = 0', '42501', '42501'
union all
select 4, 'fij_statistique', 'supprimer', 'delete from public.fij_statistique', '42501', '42501'
union all
select 5, 'v_fij_statistique', 'lire', 'select 1 from public.v_fij_statistique', '40', '0'
union all
select 6, 'private.fij_rubriques()', 'lire', 'select 1 from private.fij_rubriques()', '4', '0'
union all
select 7, 'saisir_fij_statistiques', 'appeler',
       format('select public.saisir_fij_statistiques(%L::date, %L::jsonb)', c.ref,
              '[{"rubrique": "culte_ejp", "departement": "75", "valeur": 3}]'),
       '42501', '42501'
  from ctx c;

-- Seul le ministère fij saisit par la fonction : son attendu est « ok ».
create temp table matrice as
select row_number() over (order by o.rang, p.ordre) as rang,
       p.nom as profil, o.objet, o.action, 'aal2'::text as aal,
       case
         when o.rang = 7 and p.ordre = 1 then 'ok'
         when p.lecteur then o.pour_lecteur
         else o.pour_autre
       end as attendu,
       o.requete
  from objet o
 cross join profil p;

-- private.fij_rubrique : rien pour personne, en aal1 comme en aal2, ni pour l'anonyme
-- (2 actions : 7 profils en aal2 et en aal1, puis l'anonyme).
create temp table matrice_privee as
select row_number() over (order by a.rang, n.aal, p.ordre) as rang,
       p.nom as profil, 'private.fij_rubrique'::text as objet, a.action, n.aal, '42501'::text as attendu, a.requete
  from (values (1, 'lire', 'select 1 from private.fij_rubrique'),
               (2, 'ajouter', 'insert into private.fij_rubrique (code, libelle, ordre) values (''autre'', ''Autre'', 9)'))
       as a(rang, action, requete)
 cross join (values ('aal1'), ('aal2')) as n(aal)
 cross join profil p
union all
select 100 + a.rang, 'anonyme', 'private.fij_rubrique', a.action, null, '42501', a.requete
  from (values (1, 'lire', 'select 1 from private.fij_rubrique'),
               (2, 'ajouter', 'insert into private.fij_rubrique (code, libelle, ordre) values (''autre'', ''Autre'', 9)'))
       as a(rang, action, requete);

-- Le plan compte les 3 tests fixes (inaltérabilité) et, par tests.nombre_essais, les essais de
-- chaque matrice (lignes dérivées comprises) : l'aide de 000-outils.test.sql en décide.
select plan(3
  + tests.nombre_essais($$ select profil, objet, action, aal, attendu, requete from matrice order by rang $$,
                        $$ select nom, compte from profil $$, true)
  + tests.nombre_essais($$ select profil, objet, action, aal, attendu, requete from matrice_privee order by rang $$,
                        $$ select nom, compte from profil $$, false));

-- Lignes en aal2, puis leurs dérivées en aal1 et celles de l'anonyme.
select * from tests.verifier_matrice(
  $$ select profil, objet, action, aal, attendu, requete from matrice order by rang $$,
  $$ select nom, compte from profil $$,
  true);

select * from tests.verifier_matrice(
  $$ select profil, objet, action, aal, attendu, requete from matrice_privee order by rang $$,
  $$ select nom, compte from profil $$,
  false);

-- Inaltérabilité, même pour le propriétaire de la table (rôle du test).
select throws_ok($$ update public.fij_statistique set valeur = valeur $$, '42501',
  'La table fij_statistique est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'fij_statistique : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.fij_statistique $$, '42501',
  'La table fij_statistique est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'fij_statistique : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.fij_statistique $$, '42501',
  'La table fij_statistique est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'fij_statistique : le propriétaire ne peut pas vider la table');

select * from finish();
rollback;
