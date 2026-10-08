-- Matrice des droits de l'acceptation des conditions (décision T53 ; BRIEF, section 7, « Matrice
-- des droits », et section 8), écrite en données et parcourue par tests.verifier_matrice
-- (000-outils.test.sql).
--
-- Objets : acceptation_conditions (lecture, ajout direct, modification, suppression) et
-- accepter_conditions (appel avec une version valide, appel avec une version mal formée).
-- Profils (cinq comptes) : un ministère, le berger, le conseil, l'administration de l'église et
-- EJP Tech du jeu d'exemple. Le ministère, le berger, le conseil et l'administration acceptent la
-- version 2026-01-01 avant la matrice ; EJP Tech ne l'accepte pas. Chacun ne lit que sa propre
-- ligne (1) ; EJP Tech lit les quatre. Aucune écriture directe (GRANT select seulement) ; la
-- fonction est ouverte aux cinq profils en aal2. La dérivation ajoute la ligne aal1 de chaque
-- ligne acceptée (zéro ligne lue, appel refusé) et la ligne de l'anonyme (refusé partout).
-- Tests précis : idempotence d'un second appel, nouvelle version, aucune ligne de journal, auteur
-- imposé, autre ministère qui ne lit rien, inaltérabilité même pour le propriétaire.
begin;

create temp table ctx as
select tests.creer_ministere('Matrice T53 A') as a_m,
       tests.creer_ministere('Matrice T53 B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid, add column journal_avant integer;
update ctx set a = tests.creer_compte('matrice-t53-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-t53-b@exemple.test', 'ministere', b_m),
               journal_avant = (select count(*)::integer from public.journal);
grant select on ctx to authenticated, anon;

-- Quatre comptes acceptent la version 2026-01-01 (EJP Tech non).
do $$
declare
  v_compte uuid;
begin
  for v_compte in select a from ctx union all select berger from ctx
                  union all select conseil from ctx union all select admin from ctx
  loop
    perform tests.se_connecter(v_compte, 'aal2');
    perform public.accepter_conditions('2026-01-01');
    perform tests.deconnecter();
  end loop;
end $$;

-- Matrice en aal2. Attendus dans l'ordre des profils : ministère A, berger, conseil,
-- administration, EJP Tech.
create temp view matrice_t53 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère a'), (2, 'berger'), (3, 'conseil'), (4, 'administration'),
                 (5, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('acceptation_conditions', 'lire', array['1', '1', '1', '1', '4'],
      'select 1 from public.acceptation_conditions where version = ''2026-01-01'''),
     ('acceptation_conditions', 'ajouter', array['42501', '42501', '42501', '42501', '42501'],
      'insert into public.acceptation_conditions (compte, version) select a, ''2026-02-01'' from ctx'),
     ('acceptation_conditions', 'modifier', array['42501', '42501', '42501', '42501', '42501'],
      'update public.acceptation_conditions set version = ''2026-03-01'' where version = ''2026-01-01'''),
     ('acceptation_conditions', 'supprimer', array['42501', '42501', '42501', '42501', '42501'],
      'delete from public.acceptation_conditions where version = ''2026-01-01'''),
     ('accepter_conditions', 'appeler', array['ok', 'ok', 'ok', 'ok', 'ok'],
      'select public.accepter_conditions(''2026-02-01'')'),
     ('accepter_conditions', 'appeler avec une version mal formée', array['P0001', 'P0001', 'P0001', 'P0001', 'P0001'],
      'select public.accepter_conditions(''8 octobre 2026'')')
   ) as m(objet, action, attendu, requete);
create temp view profil_t53 (profil, compte) as
  select 'ministère a', c.a from ctx c union all select 'berger', c.berger from ctx c
  union all select 'conseil', c.conseil from ctx c union all select 'administration', c.admin from ctx c
  union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_t53, profil_t53 to authenticated, anon;

-- Le plan compte les 13 tests fixes et, par tests.nombre_essais, les essais de la matrice (lignes
-- dérivées comprises).
select plan(13
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_t53',
                        'select profil, compte from profil_t53', true));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_t53',
  'select profil, compte from profil_t53',
  true);

select ok((select count(*) from ctx where a is not null and b is not null and berger is not null
             and conseil is not null and admin is not null and tech is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les cinq comptes et le compte de l''autre ministère');

-- Idempotence : un second appel pour la même version ne fait rien, sans erreur.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.accepter_conditions('2026-01-01');
  perform public.accepter_conditions('2026-01-01');
  perform tests.deconnecter();
end $$;
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.accepter_conditions('8 octobre 2026') $$,
  'P0001', 'Version des conditions inconnue.',
  'une version mal formée est refusée avec son message');
select tests.deconnecter();
select is((select count(*)::integer from public.acceptation_conditions
            where compte = (select a from ctx) and version = '2026-01-01'), 1,
  'deux appels pour la même version laissent une seule ligne');

-- Une nouvelle version s'ajoute à l'ancienne.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.accepter_conditions('2026-03-01');
  perform tests.deconnecter();
end $$;
select is((select count(*)::integer from public.acceptation_conditions where compte = (select a from ctx)), 2,
  'une nouvelle version ajoute une ligne, l''ancienne reste');
select ok((select bool_and(saisi_par = compte and saisi_le is not null)
             from public.acceptation_conditions where compte = (select a from ctx)),
  'l''auteur de chaque ligne est le compte lui-même (saisi_par imposé)');

-- Aucune ligne de journal : l'administration lit le journal.
select is((select count(*)::integer from public.journal), (select journal_avant from ctx),
  'accepter les conditions n''écrit aucune ligne au journal');

-- Un autre ministère ne lit pas la ligne du ministère A.
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.acceptation_conditions where compte = (select a from ctx)'), 0,
  'un autre ministère ne lit pas les acceptations du ministère A');

-- Inaltérabilité, même pour le propriétaire des tables (rôle du test).
select throws_ok($$ update public.acceptation_conditions set version = '2026-04-01' where compte = (select a from ctx) $$,
  '42501', 'La table acceptation_conditions est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'acceptation_conditions : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.acceptation_conditions where compte = (select a from ctx) $$,
  '42501', 'La table acceptation_conditions est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'acceptation_conditions : le propriétaire ne peut pas effacer une ligne');
select has_trigger('public', 'acceptation_conditions', 'ajout_seulement_vider',
  'acceptation_conditions : trigger contre truncate');
select throws_ok($$ truncate public.acceptation_conditions $$,
  '42501', 'La table acceptation_conditions est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'acceptation_conditions : le propriétaire ne peut pas la vider');

-- Contraintes : version mal formée et doublon refusés même en direct.
-- Le propriétaire n'a pas de compte de l'application : il donne saisi_par lui-même.
select throws_ok($$ insert into public.acceptation_conditions (compte, version, saisi_par) select a, 'v1', a from ctx $$,
  '23514', null::text, 'acceptation_conditions : une version mal formée est refusée par la table');
select throws_ok($$ insert into public.acceptation_conditions (compte, version, saisi_par) select a, '2026-01-01', a from ctx $$,
  '23505', null::text, 'acceptation_conditions : une version déjà acceptée par le compte est refusée par la table');

select * from finish();
rollback;
