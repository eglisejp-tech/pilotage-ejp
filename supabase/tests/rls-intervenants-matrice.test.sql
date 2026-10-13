-- Matrice des droits de l'observabilité des personnes (décision T56 ; BRIEF, section 7, « Matrice
-- des droits », et section 8), écrite en données et parcourue par tests.verifier_matrice
-- (000-outils.test.sql).
--
-- Objets : les tables intervenant, journal_intervenant et passage (lecture, ajout direct,
-- modification, suppression), les vues v_ma_declaration, v_personnes et v_journal_intervenant,
-- les fonctions declarer_intervenant, effacer_prenom et effacer_prenoms_anciens.
-- Profils (six comptes) : deux ministères A et B, le berger, le conseil, l'administration de
-- l'église et EJP Tech. Chaque compte a sa session de connexion (revendication session_id du jeton) : ce
-- fichier remplace tests.se_connecter, le temps de sa transaction, par une version qui la pose.
-- Avant la matrice : A a déclaré « Marie » dans sa session (ligne écrite par le propriétaire, donc
-- sans jour d'utilisation) et a déclaré sa prochaine réunion (une ligne de journal, liée à
-- Marie) ; un ministère B a déclaré « Paul » par la fonction (un jour d'utilisation).
-- Attendus : chaque ministère lit sa seule déclaration courante, jamais celle de l'autre ; EJP
-- Tech lit tout ; le berger, le conseil et l'administration ne lisent rien et ne déclarent rien.
-- Aucun ajout direct, sauf un jour d'utilisation pour la session qui a déclaré. Aucune modification ni suppression, même pour le propriétaire. La dérivation
-- ajoute la ligne aal1 de chaque ligne acceptée et la ligne de l'anonyme (refusé partout).
begin;

-- Sessions de connexion des comptes du test : tests.se_connecter les pose dans le jeton.
create temp table sessions_t56 (compte uuid primary key, session uuid not null);
grant select on sessions_t56 to authenticated, anon;

create or replace function tests.se_connecter(p_utilisateur uuid, p_aal text default 'aal2') returns void
language plpgsql as $$
declare
  v_session uuid;
begin
  select s.session into v_session from pg_temp.sessions_t56 s where s.compte = p_utilisateur;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    jsonb_strip_nulls(jsonb_build_object('sub', p_utilisateur, 'role', 'authenticated', 'aal', p_aal,
                                         'session_id', v_session))::text, true);
  perform set_config('request.jwt.claim.sub', p_utilisateur::text, true);
end $$;

create temp table ctx as
select tests.creer_ministere('Matrice T56 A') as a_m,
       tests.creer_ministere('Matrice T56 B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid, add column ia bigint, add column ib bigint,
                add column journal_avant integer;
update ctx set a = tests.creer_compte('matrice-t56-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-t56-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated, anon;

insert into sessions_t56 (compte, session)
select a, gen_random_uuid() from ctx
union all select b, gen_random_uuid() from ctx
union all select berger, gen_random_uuid() from ctx
union all select conseil, gen_random_uuid() from ctx
union all select admin, gen_random_uuid() from ctx
union all select tech, gen_random_uuid() from ctx;
-- Chaque session existe aussi dans auth.sessions, comme après une vraie connexion.
insert into auth.sessions (id, user_id, aal) select session, compte, 'aal2'::auth.aal_level from sessions_t56;

-- A : déclaration écrite par le propriétaire (aucun jour d'utilisation), puis sa réunion.
select tests.deconnecter();
insert into public.intervenant (compte, session_auth, prenom, motif)
select c.a, s.session, 'Marie', 'connexion' from ctx c join sessions_t56 s on s.compte = c.a;
update ctx set ia = (select i.id from public.intervenant i where i.compte = ctx.a);

-- Le nombre de lignes de journal est relevé juste avant la déclaration de B.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  insert into public.reunion (ministere_id, date) select a_m, private.aujourdhui() + 1 from ctx;
  perform tests.deconnecter();
  update ctx set journal_avant = (select count(*)::integer from public.journal);
  perform tests.se_connecter((select b from ctx), 'aal2');
  perform public.declarer_intervenant('Paul', 'connexion');
  perform tests.deconnecter();
end $$;
update ctx set ib = (select i.id from public.intervenant i where i.compte = ctx.b);

-- Matrice en aal2. Attendus dans l'ordre des profils : ministère A (déclaré par le propriétaire,
-- sans jour d'utilisation), ministère B (déclaré par la fonction, un jour d'utilisation), berger,
-- conseil, administration, EJP Tech.
create temp view matrice_t56 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère a'), (2, 'ministère b'), (3, 'berger'), (4, 'conseil'),
                 (5, 'administration'), (6, 'EJP Tech')) as p(rang, profil)
   cross join (values
     -- Les lignes de A seulement (requête filtrée) : B ne les lit pas.
     ('intervenant', 'lire', array['1', '0', '0', '0', '0', '1'],
      'select 1 from public.intervenant where compte = (select a from ctx)'),
     ('intervenant', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.intervenant (compte, session_auth, prenom, motif) select a, gen_random_uuid(), ''Zoé'', ''connexion'' from ctx'),
     ('intervenant', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.intervenant set prenom = ''[prénom effacé]'' where id = (select ia from ctx)'),
     ('intervenant', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.intervenant where id = (select ia from ctx)'),
     ('journal_intervenant', 'lire', array['0', '0', '0', '0', '0', '1'],
      'select 1 from public.journal_intervenant'),
     ('journal_intervenant', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.journal_intervenant (journal_id, intervenant_id) select max(j.id), (select ib from ctx) from public.journal j'),
     ('journal_intervenant', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.journal_intervenant set intervenant_id = intervenant_id'),
     ('journal_intervenant', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.journal_intervenant'),
     -- Chaque ministère lit les jours de sa déclaration courante (A n'en a aucun, B un) ; EJP
     -- Tech lit tout.
     ('passage', 'lire', array['0', '1', '0', '0', '0', '1'],
      'select 1 from public.passage'),
     -- B a déjà son jour d'utilisation (noté par sa déclaration) : un second ajout simple heurte
     -- la clé primaire.
     ('passage', 'ajouter le jour de sa session', array['ok', '23505', '42501', '42501', '42501', '42501'],
      'insert into public.passage (intervenant_id) select ib from ctx'),
     -- Le chemin de l'écran (upsert de PostgREST, on conflict do nothing), deux lignes d'un coup.
     ('passage', 'ajouter deux fois le même jour', array['ok', 'ok:0', '42501', '42501', '42501', '42501'],
      'insert into public.passage (intervenant_id) values (0), (0) on conflict (intervenant_id, jour) do nothing'),
     ('passage', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.passage set jour = jour - 1'),
     ('passage', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.passage'),
     ('v_ma_declaration', 'lire', array['1', '1', '0', '0', '0', '0'],
      'select 1 from public.v_ma_declaration'),
     ('v_personnes', 'lire', array['0', '0', '0', '0', '0', '2'],
      'select 1 from public.v_personnes where compte in (select a from ctx union all select b from ctx)'),
     ('v_journal_intervenant', 'lire', array['0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_journal_intervenant where journal_id in (select j.id from public.journal j where j.compte = (select a from ctx))'),
     ('declarer_intervenant', 'appeler', array['ok', 'ok', '42501', '42501', '42501', '42501'],
      'select public.declarer_intervenant(''Léa D.'', ''changement'')'),
     ('declarer_intervenant', 'appeler avec un prénom refusé', array['P0001', 'P0001', '42501', '42501', '42501', '42501'],
      'select public.declarer_intervenant(''Léa 2'', ''connexion'')'),
     ('effacer_prenom', 'appeler', array['42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.effacer_prenom((select ia from ctx))'),
     ('effacer_prenoms_anciens', 'appeler', array['42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.effacer_prenoms_anciens()')
   ) as m(objet, action, attendu, requete);
create temp view profil_t56 (profil, compte) as
  select 'ministère a', c.a from ctx c union all select 'ministère b', c.b from ctx c
  union all select 'berger', c.berger from ctx c
  union all select 'conseil', c.conseil from ctx c union all select 'administration', c.admin from ctx c
  union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_t56, profil_t56 to authenticated, anon;

-- Le plan compte les 16 tests fixes et, par tests.nombre_essais, les essais de la matrice (lignes
-- dérivées comprises).
select plan(16
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_t56',
                        'select profil, compte from profil_t56', true));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_t56',
  'select profil, compte from profil_t56',
  true);

select ok((select count(*) from ctx where a is not null and b is not null and berger is not null
             and conseil is not null and admin is not null and tech is not null
             and ia is not null and ib is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les cinq comptes, le ministère B et les deux déclarations');
select is((select count(*)::integer from public.journal_intervenant ji
            join public.journal j on j.id = ji.journal_id
           where j.compte = (select a from ctx) and ji.intervenant_id = (select ia from ctx)), 1,
  'la réunion déclarée par A est attribuée à Marie');
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.intervenant where compte = (select a from ctx)'), 0,
  'un autre ministère ne lit pas les déclarations de A');

-- Une autre session du même compte ne lit pas la déclaration de la première.
update sessions_t56 set session = gen_random_uuid() where compte = (select a from ctx);
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.intervenant'), 0,
  'une autre session du même compte ne lit pas la déclaration de la première (Marie)');
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.v_ma_declaration'), 0,
  'v_ma_declaration est vide pour une session qui n''a pas encore déclaré');

-- Aucune ligne de journal pour une déclaration.
select is((select count(*)::integer from public.journal), (select journal_avant from ctx),
  'les déclarations n''écrivent aucune ligne de journal');

-- Inaltérabilité, même pour le propriétaire des tables (rôle du test).
select tests.deconnecter();
select throws_ok($$ update public.intervenant set prenom = 'Zoé' where id = (select ia from ctx) $$,
  '42501', 'La table intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'intervenant : le propriétaire ne peut pas modifier un prénom');
select throws_ok($$ update public.intervenant set prenom = '[prénom effacé]' where id = (select ia from ctx) $$,
  '42501', 'La table intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'intervenant : sans effacer_prenom, même le marqueur d''effacement est refusé');
select throws_ok($$ delete from public.intervenant where id = (select ia from ctx) $$,
  '42501', 'La table intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'intervenant : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.intervenant cascade $$,
  '42501', null::text, 'intervenant : le propriétaire ne peut pas la vider');
select throws_ok($$ update public.journal_intervenant set intervenant_id = intervenant_id $$,
  '42501', 'La table journal_intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'journal_intervenant : le propriétaire ne peut pas modifier un lien');
select throws_ok($$ delete from public.journal_intervenant $$,
  '42501', 'La table journal_intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'journal_intervenant : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.journal_intervenant $$,
  '42501', 'La table journal_intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'journal_intervenant : le propriétaire ne peut pas la vider');
select throws_ok($$ update public.passage set jour = jour - 1 $$,
  '42501', 'La table passage est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'passage : le propriétaire ne peut pas modifier un jour');
select throws_ok($$ delete from public.passage $$,
  '42501', 'La table passage est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'passage : le propriétaire ne peut pas effacer un jour');
select throws_ok($$ truncate public.passage $$,
  '42501', 'La table passage est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'passage : le propriétaire ne peut pas la vider');

select * from finish();
rollback;
