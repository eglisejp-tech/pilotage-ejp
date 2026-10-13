-- Matrice des droits de l'acceptation des conditions par personne (décision T61 ; BRIEF,
-- section 7, « Matrice des droits », et section 8), écrite en données et parcourue par
-- tests.verifier_matrice (000-outils.test.sql).
--
-- Objets : la table acceptation_personne (lecture, ajout direct, modification, suppression), la
-- fonction accepter_conditions (appel avec une version valide, appel avec une version mal formée),
-- les colonnes d'acceptation de v_personnes et la colonne du_jour de v_ma_declaration (T63).
-- Profils (six comptes) : deux ministères A et B, le berger, le conseil, l'administration de
-- l'église et EJP Tech. Chaque compte a sa session de connexion (revendication session_id du
-- jeton) : ce fichier remplace tests.se_connecter, le temps de sa transaction, par une version
-- qui la pose. Avant la matrice : A a déclaré « Marie » et accepté la version 2026-01-01 ; B a
-- déclaré « Paul » sans rien accepter.
-- Attendus : chaque session de ministère lit les acceptations de sa personne, jamais celles d'une
-- autre personne ni d'un autre compte ; EJP Tech lit tout ; le berger, le conseil et
-- l'administration ne lisent rien. Aucune écriture directe (GRANT select seulement) ; la fonction
-- est ouverte aux six profils en aal2 (le ministère avec un prénom déclaré). La dérivation ajoute
-- la ligne aal1 de chaque ligne acceptée et la ligne de l'anonyme (refusé partout).
begin;

-- Sessions de connexion des comptes du test : tests.se_connecter les pose dans le jeton.
create temp table sessions_t61 (compte uuid primary key, session uuid not null);
grant select on sessions_t61 to authenticated, anon;

create or replace function tests.se_connecter(p_utilisateur uuid, p_aal text default 'aal2') returns void
language plpgsql as $$
declare
  v_session uuid;
begin
  select s.session into v_session from pg_temp.sessions_t61 s where s.compte = p_utilisateur;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    jsonb_strip_nulls(jsonb_build_object('sub', p_utilisateur, 'role', 'authenticated', 'aal', p_aal,
                                         'session_id', v_session))::text, true);
  perform set_config('request.jwt.claim.sub', p_utilisateur::text, true);
end $$;

create temp table ctx as
select tests.creer_ministere('Matrice T61 A') as a_m,
       tests.creer_ministere('Matrice T61 B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid, add column ia bigint, add column ib bigint,
                add column journal_avant integer;
update ctx set a = tests.creer_compte('matrice-t61-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-t61-b@exemple.test', 'ministere', b_m),
               journal_avant = (select count(*)::integer from public.journal);
grant select on ctx to authenticated, anon;

insert into sessions_t61 (compte, session)
select a, gen_random_uuid() from ctx
union all select b, gen_random_uuid() from ctx
union all select berger, gen_random_uuid() from ctx
union all select conseil, gen_random_uuid() from ctx
union all select admin, gen_random_uuid() from ctx
union all select tech, gen_random_uuid() from ctx;
-- Chaque session existe aussi dans auth.sessions, comme après une vraie connexion.
insert into auth.sessions (id, user_id, aal) select session, compte, 'aal2'::auth.aal_level from sessions_t61;

-- A : Marie déclare et accepte la version 2026-01-01. B : Paul déclare, sans accepter.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.declarer_intervenant('Marie', 'connexion');
  perform public.accepter_conditions('2026-01-01');
  perform tests.deconnecter();
  perform tests.se_connecter((select b from ctx), 'aal2');
  perform public.declarer_intervenant('Paul', 'connexion');
  perform tests.deconnecter();
end $$;
update ctx set ia = (select i.id from public.intervenant i where i.compte = ctx.a),
               ib = (select i.id from public.intervenant i where i.compte = ctx.b);

-- Matrice en aal2. Attendus dans l'ordre des profils : ministère A (Marie, qui a accepté),
-- ministère B (Paul, qui n'a rien accepté), berger, conseil, administration, EJP Tech.
create temp view matrice_t61 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère a'), (2, 'ministère b'), (3, 'berger'), (4, 'conseil'),
                 (5, 'administration'), (6, 'EJP Tech')) as p(rang, profil)
   cross join (values
     -- Les lignes des deux ministères du test seulement (requête filtrée).
     ('acceptation_personne', 'lire', array['1', '0', '0', '0', '0', '1'],
      'select 1 from public.acceptation_personne where intervenant_id in (select ia from ctx union all select ib from ctx)'),
     ('acceptation_personne', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.acceptation_personne (intervenant_id, version) select ib, ''2026-02-01'' from ctx'),
     ('acceptation_personne', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.acceptation_personne set version = ''2026-03-01'' where intervenant_id = (select ia from ctx)'),
     ('acceptation_personne', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.acceptation_personne where intervenant_id = (select ia from ctx)'),
     ('accepter_conditions', 'appeler', array['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
      'select public.accepter_conditions(''2026-02-01'')'),
     ('accepter_conditions', 'appeler avec une version mal formée', array['P0001', 'P0001', 'P0001', 'P0001', 'P0001', 'P0001'],
      'select public.accepter_conditions(''1er février 2026'')'),
     -- Qui a accepté quelle version : EJP Tech seul (Marie, version 2026-01-01). « lire » compte
     -- les lignes (tests.verifier_matrice) ; la requête ne garde que les personnes qui ont accepté.
     ('v_personnes', 'lire', array['0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_personnes where compte in (select a from ctx union all select b from ctx) and version_acceptee is not null'),
     -- Rappel du jour (T63) : chaque session de ministère lit si sa propre déclaration est du
     -- jour ; les autres profils n'ont pas de déclaration.
     ('v_ma_declaration', 'lire', array['1', '1', '0', '0', '0', '0'],
      'select 1 from public.v_ma_declaration where du_jour')
   ) as m(objet, action, attendu, requete);
create temp view profil_t61 (profil, compte) as
  select 'ministère a', c.a from ctx c union all select 'ministère b', c.b from ctx c
  union all select 'berger', c.berger from ctx c
  union all select 'conseil', c.conseil from ctx c union all select 'administration', c.admin from ctx c
  union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_t61, profil_t61 to authenticated, anon;

-- Le plan compte les 9 tests fixes et, par tests.nombre_essais, les essais de la matrice (lignes
-- dérivées comprises).
select plan(9
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_t61',
                        'select profil, compte from profil_t61', true));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_t61',
  'select profil, compte from profil_t61',
  true);

select ok((select count(*) from ctx where a is not null and b is not null and berger is not null
             and conseil is not null and admin is not null and tech is not null
             and ia is not null and ib is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les six comptes et les deux déclarations');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.acceptation_personne where intervenant_id = (select ia from ctx)'), 0,
  'un autre ministère ne lit pas l''acceptation de Marie');

-- Une autre session du même compte, sans déclaration, ne lit rien.
update sessions_t61 set session = gen_random_uuid() where compte = (select a from ctx);
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.acceptation_personne'), 0,
  'une session sans prénom déclaré ne lit aucune acceptation, même sur le même compte');

-- Aucune ligne de journal pour une déclaration ni pour une acceptation.
select is((select count(*)::integer from public.journal), (select journal_avant from ctx),
  'accepter les conditions par personne n''écrit aucune ligne au journal');

-- Inaltérabilité, même pour le propriétaire des tables (rôle du test).
select tests.deconnecter();
select throws_ok($$ update public.acceptation_personne set version = '2026-04-01' where intervenant_id = (select ia from ctx) $$,
  '42501', 'La table acceptation_personne est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'acceptation_personne : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.acceptation_personne where intervenant_id = (select ia from ctx) $$,
  '42501', 'La table acceptation_personne est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'acceptation_personne : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.acceptation_personne $$,
  '42501', 'La table acceptation_personne est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'acceptation_personne : le propriétaire ne peut pas la vider');

-- Contraintes : version mal formée et doublon refusés même en direct. Le propriétaire n'a pas de
-- compte de l'application : il donne saisi_par lui-même.
select throws_ok($$ insert into public.acceptation_personne (intervenant_id, version, saisi_par) select ia, 'v1', a from ctx $$,
  '23514', null::text, 'acceptation_personne : une version mal formée est refusée par la table');
select throws_ok($$ insert into public.acceptation_personne (intervenant_id, version, saisi_par) select ia, '2026-01-01', a from ctx $$,
  '23505', null::text, 'acceptation_personne : une version déjà acceptée sur la même déclaration est refusée par la table');

select * from finish();
rollback;
