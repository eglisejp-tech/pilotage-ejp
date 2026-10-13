-- Observabilité des personnes (décision T56) : déclaration du prénom, attribution des lignes de
-- journal à la personne déclarée sur la session, effacement d'un prénom.
--
-- - declarer_intervenant : aal2, session du jeton, prénom nettoyé puis contrôlé (vide, trop long,
--   chiffres, @, crochets, chevrons refusés ; initiale permise), motif fixé par la base ;
-- - le compte, la session et l'heure d'une déclaration sont imposés par la base ;
-- - deux sessions du même compte en même temps : chaque saisie va à la bonne personne ; une
--   session sans déclaration laisse la ligne sans lien ; après « Ce n'est pas moi », la ligne
--   suivante va au nouveau prénom ; une Edge Function (p_session) est attribuée à la déclaration
--   de sa session ;
-- - v_ma_declaration rend l'âge de la déclaration (rappel des 7 jours) ;
-- - effacer_prenom : EJP Tech seul, toutes les déclarations du même prénom sur le compte, une
--   seule fois, puis inaltérable ; effacer_prenoms_anciens : plus de 12 mois seulement ;
-- - le prénom n'entre jamais dans le journal.
begin;

select plan(56);

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

-- Change la session d'un compte (une autre connexion, sur un autre appareil) : la session existe
-- aussi dans auth.sessions, comme après une vraie connexion.
create function pg_temp.changer_session(p_compte uuid, p_session uuid) returns void
language sql as $$
  insert into pg_temp.sessions_t56 (compte, session) values (p_compte, p_session)
  on conflict (compte) do update set session = excluded.session;
  insert into auth.sessions (id, user_id, aal) values (p_session, p_compte, 'aal2'::auth.aal_level)
  on conflict (id) do nothing;
$$;

create temp table ctx as
select tests.creer_ministere('Personnes T56 A') as a_m,
       tests.creer_ministere('Personnes T56 B') as b_m,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       gen_random_uuid() as s1,
       gen_random_uuid() as s2,
       gen_random_uuid() as s3,
       gen_random_uuid() as s4,
       gen_random_uuid() as sb,
       gen_random_uuid() as sadm,
       gen_random_uuid() as stech;
alter table ctx add column a uuid, add column b uuid;
update ctx set a = tests.creer_compte('personnes-t56-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('personnes-t56-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated, anon;
select pg_temp.changer_session(tech, stech) from ctx;
select pg_temp.changer_session(berger, gen_random_uuid()) from ctx;

-- Dernière ligne de journal d'un compte, et le prénom qui lui est attribué (null : aucun lien).
create function pg_temp.prenom_derniere_ligne(p_compte uuid) returns text
language sql as $$
  select i.prenom
    from (select j.id from public.journal j where j.compte = p_compte order by j.id desc limit 1) d
    left join public.journal_intervenant ji on ji.journal_id = d.id
    left join public.intervenant i on i.id = ji.intervenant_id
$$;

-- 1. Déclaration : droits et contrôles

select pg_temp.changer_session(a, s1) from ctx;
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$ select public.declarer_intervenant('Bérénice', 'connexion') $$,
  '42501', 'Double authentification requise.', 'aal1 : declarer_intervenant refusée');
select tests.deconnecter();

-- Comptes de ministère seulement (T56).
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.declarer_intervenant('Bérénice', 'connexion') $$,
  '42501', 'Seul un compte de ministère indique un prénom.',
  'l''administration de l''église n''indique pas de prénom');
select tests.deconnecter();

-- Sans session dans le jeton (B n'en a pas encore) : refus.
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.declarer_intervenant('Bérénice', 'connexion') $$,
  '42501', 'Session inconnue : reconnectez-vous.', 'un jeton sans session est refusé');
select tests.deconnecter();

-- Une session fermée ou révoquée (absente de auth.sessions) : refus.
update pg_temp.sessions_t56 set session = gen_random_uuid() where compte = (select a from ctx);
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.declarer_intervenant('Bérénice', 'connexion') $$,
  '42501', 'Session inconnue : reconnectez-vous.', 'une session fermée ou révoquée est refusée');
select tests.deconnecter();
select pg_temp.changer_session(a, s1) from ctx;

select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.declarer_intervenant('', 'connexion') $$,
  'P0001', 'Indiquez votre prénom.', 'un prénom vide est refusé');
select throws_ok($$ select public.declarer_intervenant('    ', 'connexion') $$,
  'P0001', 'Indiquez votre prénom.', 'un prénom fait d''espaces est refusé');
select throws_ok($$ select public.declarer_intervenant(repeat('a', 31), 'connexion') $$,
  'P0001', '30 caractères au plus.', 'un prénom de 31 caractères est refusé');
select throws_ok($$ select public.declarer_intervenant('Marie2', 'connexion') $$,
  'P0001', 'Écrivez seulement votre prénom, en lettres.', 'un prénom avec un chiffre est refusé');
select throws_ok($$ select public.declarer_intervenant('marie@exemple.test', 'connexion') $$,
  'P0001', 'Écrivez seulement votre prénom, en lettres.', 'un email est refusé');
select throws_ok($$ select public.declarer_intervenant('[Marie]', 'connexion') $$,
  'P0001', 'Écrivez seulement votre prénom, en lettres.', 'des crochets sont refusés');
select throws_ok($$ select public.declarer_intervenant('<b>Marie</b>', 'connexion') $$,
  'P0001', 'Écrivez seulement votre prénom, en lettres.', 'des chevrons sont refusés');
select throws_ok($$ select public.declarer_intervenant('06 12 34 56 78', 'connexion') $$,
  'P0001', 'Écrivez seulement votre prénom, en lettres.', 'un numéro de téléphone est refusé');
select throws_ok($$ select public.declarer_intervenant('Bérénice', 'inconnu') $$,
  'P0001', 'Motif inconnu.', 'un motif inconnu est refusé');
select is((select count(*)::integer from public.intervenant where compte = (select a from ctx)), 0,
  'aucun refus n''a écrit de déclaration');

-- Prénoms acceptés : initiale du nom, prénom composé, apostrophe, initiale seule.
select lives_ok($$ select public.declarer_intervenant('  Bérénice   D.  ', 'changement') $$,
  'la première déclaration de la session est acceptée, espaces nettoyés');
select tests.deconnecter();
select results_eq($$
  select prenom, motif from public.intervenant where compte = (select a from ctx) order by id
$$, $$ values ('Bérénice D.'::text, 'connexion'::text) $$,
  'le prénom est nettoyé, et la première déclaration de la session a le motif connexion, quel que soit l''appel');
select ok((select bool_and(compte = (select a from ctx) and session_auth = (select s1 from ctx))
             from public.intervenant where compte = (select a from ctx)),
  'compte et session de la déclaration viennent du jeton');
select is((select count(*)::integer from public.passage p
            join public.intervenant i on i.id = p.intervenant_id
           where i.compte = (select a from ctx) and p.jour = private.aujourdhui()), 1,
  'la déclaration note un jour d''utilisation, aujourd''hui à Paris');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Jean-Pierre', 'connexion') $$,
  'un prénom composé est accepté');
select lives_ok($$ select public.declarer_intervenant('M.', 'changement') $$,
  'une initiale seule est acceptée');
select lives_ok($$ select public.declarer_intervenant('D''Arc', 'rappel') $$,
  'une apostrophe est acceptée');
-- « Chloé » écrit e + accent combinant (copié depuis un téléphone) : accepté, enregistré en NFC.
select lives_ok($$ select public.declarer_intervenant(U&'Chlo\0065\0301', 'rappel') $$,
  'un prénom à l''accent décomposé est accepté');
select tests.deconnecter();
select results_eq($$
  select prenom, motif from public.intervenant where compte = (select a from ctx) order by id
$$, $$ values ('Bérénice D.'::text, 'connexion'::text), ('Jean-Pierre', 'rappel'), ('M.', 'changement'),
              ('D''Arc', 'rappel'), (U&'Chlo\00E9', 'rappel') $$,
  'ensuite : changement pour « Ce n''est pas moi », rappel sinon (connexion demandée comprise) ; prénom en NFC');

-- Le compte, la session et l'heure sont imposés, même pour un ajout direct (rôle du propriétaire
-- avec le jeton d'un compte de l'application).
select tests.se_connecter((select a from ctx), 'aal2');
reset role;
insert into public.intervenant (compte, session_auth, prenom, motif, declare_le)
select b, gen_random_uuid(), 'Zoé', 'rappel', timestamptz '2020-01-01 10:00+01' from ctx;
select tests.deconnecter();
select ok((select compte = (select a from ctx) and session_auth = (select s1 from ctx)
                  and declare_le > timestamptz '2026-01-01'
             from public.intervenant where prenom = 'Zoé'),
  'un ajout avec un autre compte, une autre session ou une autre heure reprend ceux du jeton');

-- 2. Attribution : deux sessions du même compte en même temps.

-- Session 1 : « Marie » (changement), session 2 : « Paul ».
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie', 'changement') $$, 'session 1 : Marie déclare');
select tests.deconnecter();
select pg_temp.changer_session(a, s2) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Paul', 'connexion') $$, 'session 2 : Paul déclare');
select tests.deconnecter();

-- Une saisie dans chaque session.
select pg_temp.changer_session(a, s1) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
insert into public.reunion (ministere_id, date) select a_m, private.aujourdhui() + 1 from ctx;
select tests.deconnecter();
select is(pg_temp.prenom_derniere_ligne((select a from ctx)), 'Marie',
  'la saisie de la session 1 est attribuée à Marie');

select pg_temp.changer_session(a, s2) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
insert into public.reunion (ministere_id, date) select a_m, private.aujourdhui() + 2 from ctx;
select tests.deconnecter();
select is(pg_temp.prenom_derniere_ligne((select a from ctx)), 'Paul',
  'la saisie de la session 2, au même moment, est attribuée à Paul');

-- Session 3, sans déclaration : la ligne reste sans lien.
select pg_temp.changer_session(a, s3) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
insert into public.reunion (ministere_id, date) select a_m, private.aujourdhui() + 3 from ctx;
select tests.deconnecter();
select ok((select j.compte = (select a from ctx) from public.journal j order by j.id desc limit 1)
          and pg_temp.prenom_derniere_ligne((select a from ctx)) is null,
  'une session sans déclaration laisse la ligne sans lien (personne non déclarée)');

-- « Ce n'est pas moi » dans la session 1 : la ligne suivante va au nouveau prénom.
select pg_temp.changer_session(a, s1) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Léa', 'changement') $$, 'session 1 : Léa remplace Marie');
insert into public.reunion (ministere_id, date) select a_m, private.aujourdhui() + 4 from ctx;
select tests.deconnecter();
select is(pg_temp.prenom_derniere_ligne((select a from ctx)), 'Léa',
  'après « Ce n''est pas moi », la saisie suivante est attribuée à Léa');

-- Deux personnes du même compte, deux connexions.
select is((select count(*)::integer from public.intervenant
            where compte = (select a from ctx) and motif = 'connexion'), 2,
  'deux sessions du même compte donnent deux connexions');

-- 3. v_ma_declaration : la déclaration de la session, et son âge.
select is(tests.lire((select a from ctx), 'aal2', 'select prenom from public.v_ma_declaration'),
  '[{"prenom": "Léa"}]'::jsonb, 'v_ma_declaration rend la dernière déclaration de la session');
-- La session 1 a déclaré huit prénoms : le compte ne lit que le dernier, jamais ceux d'avant.
select is(tests.lire((select a from ctx), 'aal2', 'select prenom from public.intervenant'),
  '[{"prenom": "Léa"}]'::jsonb,
  'une session ne lit que sa déclaration courante, pas les prénoms déclarés avant sur le même appareil');
insert into public.intervenant (compte, session_auth, prenom, motif, declare_le)
select a, s4, 'Victor', 'connexion', now() - interval '8 days' from ctx;
select pg_temp.changer_session(a, s4) from ctx;
select ok((tests.lire((select a from ctx), 'aal2', 'select age_secondes from public.v_ma_declaration')
             -> 0 ->> 'age_secondes')::integer >= 7 * 86400,
  'une déclaration de 8 jours a un âge d''au moins 7 jours (rappel)');

-- Jour d'utilisation noté par l'écran (upsert de PostgREST : on conflict do nothing), deux fois
-- le même jour : une seule ligne. Victor (écrit par le propriétaire) n'en avait aucune.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ insert into public.passage (intervenant_id) values (0)
                   on conflict (intervenant_id, jour) do nothing $$,
  'le compte note son jour d''utilisation');
select lives_ok($$ insert into public.passage (intervenant_id) values (0)
                   on conflict (intervenant_id, jour) do nothing $$,
  'une seconde fois le même jour ne fait rien, sans erreur');
select tests.deconnecter();
select is((select count(*)::integer from public.passage p join public.intervenant i on i.id = p.intervenant_id
            where i.compte = (select a from ctx) and i.prenom = 'Victor' and p.jour = private.aujourdhui()), 1,
  'un seul jour d''utilisation pour Victor, aujourd''hui à Paris');

-- 4. Edge Function : la session passée par p_session sert à l'attribution.
insert into auth.sessions (id, user_id, aal) select sadm, admin, 'aal2'::auth.aal_level from ctx;
insert into public.intervenant (compte, session_auth, prenom, motif)
select admin, sadm, 'Nadia', 'connexion' from ctx;
select lives_ok($$ select private.controler_session((select admin from ctx), (select sadm from ctx)) $$,
  'controler_session accepte la session de l''administration');
select is(private.session_courante(), (select sadm from ctx),
  'controler_session pose la session de l''appelant pour la transaction');
insert into public.journal (compte, action, cible, cible_id)
select admin, 'compte_cree', 'compte', berger from ctx;
select is(pg_temp.prenom_derniere_ligne((select admin from ctx)), 'Nadia',
  'une ligne écrite par une fonction serveur est attribuée à la déclaration de sa session');
select set_config('pilotage.session_appelant', '', true);

-- Le vrai chemin d'une Edge Function : public.serveur_desactiver_compte au nom de service_role
-- (clé secrète, jeton sans session), avec la session de l'appelant passée en p_session.
alter table ctx add column cible uuid;
update ctx set cible = tests.creer_compte('personnes-t56-cible@exemple.test', 'conseil');
grant select on ctx to service_role;
set local role service_role;
select public.serveur_desactiver_compte((select admin from ctx), (select sadm from ctx), (select cible from ctx));
reset role;
select results_eq($$
  select j.action::text, i.prenom
    from (select j.id, j.action from public.journal j where j.compte = (select admin from ctx)
           order by j.id desc limit 1) j
    left join public.journal_intervenant ji on ji.journal_id = j.id
    left join public.intervenant i on i.id = ji.intervenant_id
$$, $$ values ('compte_desactive'::text, 'Nadia'::text) $$,
  'serveur_desactiver_compte (service_role) : la ligne de journal est attribuée à la déclaration de la session');
select set_config('pilotage.session_appelant', '', true);

-- 5. Effacement d'un prénom

-- Une autre « Marie » sur le compte B, qui ne doit pas être effacée.
select pg_temp.changer_session(b, sb) from ctx;
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('Marie', 'connexion') $$, 'B : une autre Marie déclare');
select tests.deconnecter();
-- Une seconde déclaration « marie » sur A (majuscules différentes).
select pg_temp.changer_session(a, s1) from ctx;
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.declarer_intervenant('marie', 'changement') $$, 'A : marie déclare de nouveau');
select tests.deconnecter();

select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.effacer_prenom((select max(id) from public.v_ma_declaration)) $$,
  '42501', 'Seul EJP Tech efface un prénom.', 'le berger n''efface pas un prénom');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.effacer_prenom((select id from public.v_ma_declaration)) $$,
  '42501', 'Seul EJP Tech efface un prénom.', 'le ministère n''efface pas son propre prénom : il le demande à EJP Tech');
select tests.deconnecter();

select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.effacer_prenom((select max(i.id) from public.intervenant i
                                  where i.compte = (select a from ctx) and i.prenom = 'marie')), 2,
  'EJP Tech efface « marie » : les deux déclarations du même prénom sur le compte (Marie et marie)');
select throws_ok($$ select public.effacer_prenom((select max(i.id) from public.intervenant i
                                                   where i.compte = (select a from ctx) and i.prenom = '[prénom effacé]')) $$,
  'P0001', 'Prénom introuvable ou déjà effacé.', 'un prénom déjà effacé ne s''efface pas une seconde fois');
select tests.deconnecter();
select is((select count(*)::integer from public.intervenant
            where compte = (select a from ctx) and lower(prenom) = 'marie'), 0,
  'plus aucune « Marie » sur le compte A');
select is((select count(*)::integer from public.intervenant
            where compte = (select b from ctx) and prenom = 'Marie'), 1,
  'la Marie du compte B reste');
select is(pg_temp.prenom_derniere_ligne((select a from ctx)), 'Léa',
  'les liens du journal restent : la ligne de Léa garde son prénom');

-- Un prénom effacé ne change plus, même sous le réglage d'effacement.
select set_config('pilotage.effacement', 'oui', true);
select throws_ok($$ update public.intervenant set prenom = 'Marie'
                     where compte = (select a from ctx) and prenom = '[prénom effacé]' $$,
  '42501', 'La table intervenant est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'un prénom effacé ne revient pas');
select set_config('pilotage.effacement', '', true);

-- Plus de 12 mois : seule la déclaration ancienne est effacée.
insert into public.intervenant (compte, session_auth, prenom, motif, declare_le)
select b, gen_random_uuid(), 'Ancienne', 'connexion', now() - interval '13 months' from ctx;
select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.effacer_prenoms_anciens(), 1, 'effacer_prenoms_anciens efface la seule déclaration de plus de 12 mois');
select is(public.effacer_prenoms_anciens(), 0, 'un second passage n''efface plus rien');
select tests.deconnecter();
select is((select count(*)::integer from public.intervenant where prenom in ('Ancienne')), 0,
  'la déclaration de plus de 12 mois n''a plus de prénom');

-- 6. Le prénom n'entre jamais dans le journal.
select is_empty($$
  select j.id from public.journal j
   where j::text ~ '(Bérénice|Jean-Pierre|Marie|marie|Paul|Léa|Victor|Nadia|Ancienne|Zoé)'
     and j.compte in (select a from ctx union all select b from ctx union all select admin from ctx)
$$, 'aucune ligne de journal (detail compris) ne contient un prénom déclaré');

select * from finish();
rollback;
