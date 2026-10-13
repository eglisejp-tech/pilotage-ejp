-- Acceptation des conditions par personne sur un compte partagé (décision T61) : ce que la
-- session d'un compte de ministère lit pour savoir si la personne déclarée a accepté la version
-- courante (la question de l'écran), et ce qu'écrit accepter_conditions. Rappel du jour (T63) :
-- v_ma_declaration dit si la déclaration de la session est du jour de Paris.
--
-- - sans prénom déclaré sur la session, refus ; aal1 refusé ; version mal formée refusée ;
-- - Marie accepte : une ligne attachée à sa déclaration, saisie par le compte, rien dans
--   acceptation_conditions ; idempotente ;
-- - Paul, deuxième personne du même compte, sur un autre appareil : il n'a pas accepté, il
--   accepte lui-même ; il ne lit pas l'acceptation de Marie ;
-- - Marie sur un troisième appareil (« marie », majuscules ignorées) : déjà acceptée, un appel de
--   plus n'ajoute rien ; « Marie D. » est une autre personne ;
-- - nouvelle version : chaque personne accepte de nouveau, l'ancienne ligne reste ;
-- - rappel du jour (T63) : du_jour vrai pour une déclaration d'aujourd'hui (minuit de Paris
--   compris), faux pour celle d'hier soir ; la confirmation est un rappel, du jour, et
--   l'acceptation reste ; « Ce n'est pas moi » : Léa accepte elle-même ;
-- - comptes non partagés : acceptation par compte, inchangée (T53) ;
-- - une Marie d'un autre ministère ne lit rien de A ;
-- - EJP Tech lit qui a accepté quelle version (v_personnes) ;
-- - effacement : l'acceptation reste, attachée à « [prénom effacé] » ; une déclaration effacée
--   n'accepte rien ; Marie qui revient accepte de nouveau ;
-- - aucune ligne de journal.
begin;

select plan(55);

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

-- Change la session d'un compte (une autre connexion, sur un autre appareil) : la session existe
-- aussi dans auth.sessions, comme après une vraie connexion.
create function pg_temp.changer_session(p_compte uuid, p_session uuid) returns void
language sql as $$
  insert into pg_temp.sessions_t61 (compte, session) values (p_compte, p_session)
  on conflict (compte) do update set session = excluded.session;
  insert into auth.sessions (id, user_id, aal) values (p_session, p_compte, 'aal2'::auth.aal_level)
  on conflict (id) do nothing;
$$;

create temp table ctx as
select tests.creer_ministere('Personnes T61 A') as a_m,
       tests.creer_ministere('Personnes T61 B') as b_m,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       gen_random_uuid() as s1,
       gen_random_uuid() as s2,
       gen_random_uuid() as s3,
       gen_random_uuid() as s4,
       gen_random_uuid() as s5,
       gen_random_uuid() as s6,
       gen_random_uuid() as sb;
alter table ctx add column a uuid, add column b uuid, add column journal_avant integer;
update ctx set a = tests.creer_compte('personnes-t61-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('personnes-t61-b@exemple.test', 'ministere', b_m),
               journal_avant = (select count(*)::integer from public.journal);
grant select on ctx to authenticated, anon;

-- La question de l'écran : la session du compte lit-elle une acceptation de cette version ?
create function pg_temp.acceptee(p_compte uuid, p_version text) returns integer
language sql as $$
  select tests.compter(p_compte, 'aal2',
    format('select 1 from public.acceptation_personne where version = %L', p_version))
$$;

-- Nombre d'acceptations d'une version sur le compte A, par prénom déclaré (majuscules ignorées).
create function pg_temp.lignes(p_prenom text, p_version text) returns integer
language sql as $$
  select count(*)::integer from public.acceptation_personne ap
    join public.intervenant i on i.id = ap.intervenant_id
   where i.compte = (select a from pg_temp.ctx) and lower(i.prenom) = lower(p_prenom)
     and ap.version = p_version
$$;

-- 1. Sans prénom déclaré : refus

select pg_temp.changer_session(a, s1) from ctx;
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$ select public.accepter_conditions('2026-01-01') $$,
  '42501', 'Double authentification requise.', 'aal1 : accepter_conditions refusée');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.accepter_conditions('2026-01-01') $$,
  '42501', 'Indiquez d''abord votre prénom.',
  'un compte de ministère sans prénom déclaré sur sa session n''accepte rien');
select throws_ok($$ select public.accepter_conditions('1er janvier 2026') $$,
  'P0001', 'Version des conditions inconnue.', 'une version mal formée est refusée');

-- 2. Marie, sur le premier appareil, déclare puis accepte.
select lives_ok($$ select public.declarer_intervenant('Marie', 'connexion') $$, 'session 1 : Marie déclare');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-01-01'), 0,
  'Marie n''a pas encore accepté : l''écran des conditions le lui demande');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.accepter_conditions('2026-01-01') $$, 'Marie accepte');
select lives_ok($$ select public.accepter_conditions('2026-01-01') $$, 'un second appel ne fait rien, sans erreur');
select tests.deconnecter();
select results_eq($$
  select i.prenom, ap.version, ap.saisi_par = i.compte, ap.saisi_le is not null
    from public.acceptation_personne ap join public.intervenant i on i.id = ap.intervenant_id
   where i.compte = (select a from ctx)
$$, $$ values ('Marie'::text, '2026-01-01'::text, true, true) $$,
  'une seule ligne, attachée à la déclaration de Marie, saisie par le compte (auteur et heure imposés)');
select is(pg_temp.acceptee((select a from ctx), '2026-01-01'), 1, 'la session de Marie lit son acceptation');
select is((select count(*)::integer from public.acceptation_conditions where compte = (select a from ctx)), 0,
  'rien dans acceptation_conditions : un compte de ministère n''accepte plus par compte');

-- 3. Paul, deuxième personne du même compte, sur un autre appareil.
select pg_temp.changer_session(a, s2) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Paul', 'connexion') $$, 'session 2 : Paul déclare');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-01-01'), 0,
  'Paul n''a pas accepté : l''acceptation de Marie ne vaut pas pour lui');
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.acceptation_personne'), 0,
  'Paul ne lit pas l''acceptation de Marie');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.accepter_conditions('2026-01-01') $$, 'Paul accepte à son tour');
select tests.deconnecter();
select results_eq($$
  select i.prenom from public.acceptation_personne ap join public.intervenant i on i.id = ap.intervenant_id
   where i.compte = (select a from ctx) and ap.version = '2026-01-01' order by ap.id
$$, $$ values ('Marie'::text), ('Paul') $$, 'deux acceptations de la même version, une par personne');

-- 4. Marie revient sur un troisième appareil, en minuscules : elle a déjà accepté.
select pg_temp.changer_session(a, s3) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('marie', 'connexion') $$, 'session 3 : marie déclare');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-01-01'), 1,
  'marie (majuscules ignorées) a déjà accepté : l''écran ne revient pas');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.accepter_conditions('2026-01-01') $$, 'un appel de plus ne fait rien');
select tests.deconnecter();
select is(pg_temp.lignes('Marie', '2026-01-01'), 1, 'toujours une seule ligne pour Marie');
-- « Marie D. » est une autre personne.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie D.', 'changement') $$, 'session 3 : Marie D. déclare');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-01-01'), 0,
  '« Marie D. » est une autre personne : elle accepte elle-même');

-- 5. Nouvelle version : chaque personne accepte de nouveau, à sa prochaine connexion.
select pg_temp.changer_session(a, s1) from ctx;
select is(pg_temp.acceptee((select a from ctx), '2026-02-01'), 0,
  'nouvelle version : Marie doit accepter de nouveau');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.accepter_conditions('2026-02-01') $$, 'Marie accepte la nouvelle version');
select tests.deconnecter();
select is(pg_temp.lignes('Marie', '2026-01-01') + pg_temp.lignes('Marie', '2026-02-01'), 2,
  'la nouvelle version s''ajoute, l''ancienne reste');
select pg_temp.changer_session(a, s2) from ctx;
select is(pg_temp.acceptee((select a from ctx), '2026-02-01'), 0,
  'Paul n''a pas accepté la nouvelle version : l''écran revient pour lui');

-- 6. Rappel du jour sur le premier appareil (T63) : même personne, même acceptation.
select pg_temp.changer_session(a, s1) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie', 'rappel') $$, 'session 1 : Marie, au rappel');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-02-01'), 1,
  'après le rappel du jour, Marie garde son acceptation');
select is(tests.lire((select a from ctx), 'aal2', 'select du_jour from public.v_ma_declaration'),
  '[{"du_jour": true}]'::jsonb, 'une déclaration faite aujourd''hui est du jour : pas de rappel');

-- Une déclaration d'hier soir, 23 h 59 à Paris (écrite par le propriétaire, qui garde l'heure) :
-- elle n'est plus du jour, le prénom est redemandé à la première ouverture.
select pg_temp.changer_session(a, s5) from ctx;
insert into public.intervenant (compte, session_auth, prenom, motif, declare_le)
select a, s5, 'Marie', 'connexion',
       (private.aujourdhui()::timestamp at time zone 'Europe/Paris') - interval '1 minute' from ctx;
select is(tests.lire((select a from ctx), 'aal2', 'select du_jour from public.v_ma_declaration'),
  '[{"du_jour": false}]'::jsonb,
  'une déclaration d''hier soir (23 h 59, heure de Paris) n''est plus du jour : rappel');

-- Minuit pile, heure de Paris : déjà du jour.
select pg_temp.changer_session(a, s6) from ctx;
insert into public.intervenant (compte, session_auth, prenom, motif, declare_le)
select a, s6, 'Paul', 'connexion', private.aujourdhui()::timestamp at time zone 'Europe/Paris' from ctx;
select is(tests.lire((select a from ctx), 'aal2', 'select du_jour from public.v_ma_declaration'),
  '[{"du_jour": true}]'::jsonb, 'une déclaration de minuit, heure de Paris, est du jour');

-- Sur l'appareil d'hier : Marie confirme son prénom, un rappel du jour ; ses conditions restent.
select pg_temp.changer_session(a, s5) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie', 'rappel') $$,
  'nouvelle journée : Marie confirme son prénom');
select tests.deconnecter();
select is(tests.lire((select a from ctx), 'aal2', 'select motif, du_jour from public.v_ma_declaration'),
  '[{"motif": "rappel", "du_jour": true}]'::jsonb, 'la confirmation est un rappel, et elle est du jour');
select is(pg_temp.acceptee((select a from ctx), '2026-02-01'), 1,
  'Marie a déjà accepté la version en cours : pas d''écran des conditions après le rappel du jour');
select pg_temp.changer_session(a, s1) from ctx;

-- 7. « Ce n'est pas moi » sur le premier appareil : Léa accepte elle-même.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Léa', 'changement') $$, 'session 1 : Léa remplace Marie');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-02-01'), 0,
  'après « Ce n''est pas moi », la nouvelle personne n''a pas accepté');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.accepter_conditions('2026-02-01') $$, 'Léa accepte');
select tests.deconnecter();
select is(pg_temp.lignes('Léa', '2026-02-01'), 1, 'l''acceptation de Léa est attachée à sa propre déclaration');

-- 8. Comptes non partagés : acceptation par compte, inchangée (T53).
do $$
declare
  v_compte uuid;
begin
  for v_compte in select berger from ctx union all select conseil from ctx
                  union all select admin from ctx union all select tech from ctx
  loop
    perform tests.se_connecter(v_compte, 'aal2');
    perform public.accepter_conditions('2026-02-01');
    perform tests.deconnecter();
  end loop;
end $$;
select is((select count(*)::integer from public.acceptation_conditions
            where version = '2026-02-01'
              and compte in (select berger from ctx union all select conseil from ctx
                             union all select admin from ctx union all select tech from ctx)), 4,
  'le berger, le conseil, l''administration et EJP Tech acceptent par compte, comme avant');
select is((select count(*)::integer from public.acceptation_personne
            where saisi_par in (select berger from ctx union all select conseil from ctx
                                union all select admin from ctx union all select tech from ctx)), 0,
  'aucune acceptation par personne pour un compte non partagé');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.acceptation_personne'), 0,
  'le berger ne lit aucune acceptation par personne');
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.acceptation_personne'), 0,
  'l''administration de l''église ne lit aucune acceptation par personne');

-- 9. Une Marie d'un autre ministère ne lit rien de A.
select pg_temp.changer_session(b, sb) from ctx;
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie', 'connexion') $$, 'B : une autre Marie déclare');
select tests.deconnecter();
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.acceptation_personne'), 0,
  'la Marie du ministère B ne lit pas les acceptations de la Marie de A : elle accepte elle-même');

-- 10. EJP Tech : qui a accepté quelle version (onglet « Personnes »).
select tests.se_connecter((select tech from ctx), 'aal2');
select results_eq($$
  select prenom, version_acceptee from public.v_personnes
   where compte = (select a from ctx) order by lower(prenom) collate "C"
$$, $$ values ('Léa'::text, '2026-02-01'::text), ('Marie', '2026-02-01'), ('Marie D.', null), ('Paul', '2026-01-01') $$,
  'EJP Tech lit la dernière version acceptée par chaque personne du compte (aucune pour Marie D.)');
select ok((select bool_and(acceptee_le is not null) from public.v_personnes
            where compte = (select a from ctx) and version_acceptee is not null),
  'l''heure de l''acceptation accompagne la version');

-- 11. Effacement d'un prénom : l'acceptation reste, attachée à « [prénom effacé] ».
select is(public.effacer_prenom((select max(i.id) from public.intervenant i
                                  where i.compte = (select a from ctx) and i.prenom = 'Marie')), 5,
  'EJP Tech efface « Marie » (ses cinq déclarations sur le compte, « marie » comprise)');
select results_eq($$
  select prenom, version_acceptee from public.v_personnes
   where compte = (select a from ctx) and prenom = '[prénom effacé]'
$$, $$ values ('[prénom effacé]'::text, '2026-02-01'::text) $$,
  'EJP Tech voit l''acceptation sous « [prénom effacé] »');
select tests.deconnecter();
select is((select count(*)::integer from public.acceptation_personne ap
             join public.intervenant i on i.id = ap.intervenant_id
            where i.compte = (select a from ctx) and i.prenom = '[prénom effacé]'), 2,
  'les deux acceptations de Marie restent, attachées à « [prénom effacé] »');

-- Marie revient sur un quatrième appareil : son prénom ne la relie plus à rien.
select pg_temp.changer_session(a, s4) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie', 'connexion') $$, 'session 4 : Marie déclare de nouveau');
select tests.deconnecter();
select is(pg_temp.acceptee((select a from ctx), '2026-02-01'), 0,
  'après l''effacement, Marie accepte de nouveau');

-- Une déclaration effacée n'accepte rien : le prénom est redemandé.
select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.effacer_prenom((select max(i.id) from public.intervenant i
                                  where i.compte = (select a from ctx) and i.prenom = 'Marie')), 1,
  'EJP Tech efface la nouvelle déclaration de Marie');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.accepter_conditions('2026-02-01') $$,
  '42501', 'Indiquez d''abord votre prénom.',
  'une session dont la déclaration est effacée n''accepte rien');
select tests.deconnecter();

-- 12. Aucune ligne de journal (l'administration lit le journal).
select is((select count(*)::integer from public.journal), (select journal_avant from ctx),
  'déclarer et accepter n''écrivent aucune ligne au journal');

-- 13. Inaltérabilité, même pour le propriétaire des tables.
select throws_ok($$ update public.acceptation_personne set version = '2026-04-01' $$,
  '42501', 'La table acceptation_personne est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'le propriétaire ne peut pas modifier une acceptation');
select throws_ok($$ delete from public.acceptation_personne $$,
  '42501', 'La table acceptation_personne est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'le propriétaire ne peut pas effacer une acceptation');

select * from finish();
rollback;
