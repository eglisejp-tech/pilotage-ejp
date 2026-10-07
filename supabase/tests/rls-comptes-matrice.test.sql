-- Matrice des droits de l'écran 13, « Ministères et comptes » (lot L1 ; plan des étapes 5 à 8,
-- section 3.2 ; BRIEF, section 7, « Matrice des droits », et section 8), écrite en données et
-- parcourue par tests.verifier_matrice (000-outils.test.sql).
--
-- Objets lus ou appelés par l'écran : v_etat_comptes (et private.etat_comptes, qu'elle lit),
-- compte et ministere (lecture, aucune écriture directe), indicateur (le nombre d'indicateurs
-- propres d'un ministère) et v_usage_indicateurs ; les écritures passent par les Edge Functions,
-- dont les fonctions serveur restent fermées à authenticated.
-- Profils (sept comptes) : les ministères Communication et FIJ, le berger, le conseil,
-- l'administration de l'église et EJP Tech du jeu d'exemple, plus un ministère désactivé créé
-- ici ; en aal2, la dérivation ajoute la ligne aal1 de chacun (zéro ligne lue, toute autre
-- action refusée) et la ligne de l'anonyme (refusé partout). Le compte désactivé lit encore sa
-- propre ligne de compte, en aal1 comme en aal2 (écran « Ce compte est désactivé »).
-- Tests précis : les quatre états de v_etat_comptes (invitation envoyée, à activer, activée,
-- désactivé) et l'adresse lue dans Auth, pour l'administration seulement ; l'administration lit
-- tous les comptes, et autant d'indicateurs propres que la table en contient.
begin;

-- Quatre comptes d'essai, un par état : invitation envoyée (adresse non confirmée), à activer
-- (adresse confirmée, aucun facteur), activée (facteur TOTP vérifié), désactivé (un ministère
-- et son compte, désactivés comme par desactiver-compte).
create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Matrice L1 désactivé') as des_m;
alter table ctx add column inv uuid, add column act uuid, add column ok uuid, add column des uuid;
update ctx set inv = tests.creer_compte('matrice-l1-invitation@exemple.test', 'conseil'),
               act = tests.creer_compte('matrice-l1-a-activer@exemple.test', 'admin_plateforme'),
               ok = tests.creer_compte('matrice-l1-activee@exemple.test', 'conseil'),
               des = tests.creer_compte('matrice-l1-desactive@exemple.test', 'ministere', des_m);
update auth.users set email_confirmed_at = now()
 where id in (select act from ctx union all select ok from ctx union all select des from ctx);
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
select gen_random_uuid(), ok, 'Matrice L1', 'totp', 'verified', now(), now() from ctx;
update public.ministere set desactive_le = now() where id = (select des_m from ctx);
update public.compte set desactive_le = now() where user_id = (select des from ctx);
grant select on ctx to authenticated, anon;

-- Matrice en aal2. Attendus dans l'ordre des profils : Communication, FIJ, berger, conseil,
-- administration, EJP Tech, ministère désactivé.
create temp view matrice_l1 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère communication'), (2, 'ministère fij'), (3, 'berger'), (4, 'conseil'),
                 (5, 'administration'), (6, 'EJP Tech'), (7, 'ministère désactivé')) as p(rang, profil)
   cross join (values
     ('v_etat_comptes', 'lire', array['0', '0', '0', '0', '4', '0', '0'],
      'select 1 from public.v_etat_comptes where user_id in (select inv from ctx union all select act from ctx union all select ok from ctx union all select des from ctx)'),
     ('v_etat_comptes (adresses)', 'lire', array['0', '0', '0', '0', '4', '0', '0'],
      'select 1 from public.v_etat_comptes where email like ''matrice-l1-%@exemple.test'''),
     ('private.etat_comptes', 'lire', array['0', '0', '0', '0', '4', '0', '0'],
      'select 1 from private.etat_comptes() e where e.user_id in (select inv from ctx union all select act from ctx union all select ok from ctx union all select des from ctx)'),
     ('compte', 'lire', array['4', '4', '4', '4', '4', '4', '1'],
      'select 1 from public.compte where user_id in (select inv from ctx union all select act from ctx union all select ok from ctx union all select des from ctx)'),
     ('compte', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.compte (user_id, type, libelle) select inv, ''conseil'', ''Conseil, compte 99'' from ctx'),
     ('compte', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.compte set desactive_le = null where user_id = (select des from ctx)'),
     ('compte', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.compte where user_id = (select inv from ctx)'),
     ('ministere', 'lire', array['1', '1', '1', '1', '1', '1', '0'],
      'select 1 from public.ministere where id = (select des_m from ctx)'),
     ('ministere', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.ministere (nom) values (''Matrice L1 ajout direct'')'),
     ('ministere', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.ministere set desactive_le = null where id = (select des_m from ctx)'),
     ('ministere', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.ministere where id = (select des_m from ctx)'),
     ('serveur_creer_compte', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.serveur_creer_compte((select admin from ctx), gen_random_uuid(), ''conseil'', null, null, null)'),
     ('serveur_desactiver_compte', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.serveur_desactiver_compte((select admin from ctx), (select inv from ctx))'),
     ('serveur_reactiver_compte', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.serveur_reactiver_compte((select admin from ctx), (select des from ctx))'),
     ('serveur_reinitialiser_2fa', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.serveur_reinitialiser_2fa((select admin from ctx), (select ok from ctx))'),
     ('serveur_relancer_invitation', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.serveur_relancer_invitation((select admin from ctx), (select inv from ctx))')
   ) as m(objet, action, attendu, requete)
  -- Le compte désactivé lit sa propre ligne en aal1 aussi (seule exception à la politique aal2).
  union all
  select 'ministère désactivé', 'compte', 'lire', 'aal1', '1',
         'select 1 from public.compte where user_id in (select inv from ctx union all select act from ctx union all select ok from ctx union all select des from ctx)';
create temp view profil_l1 (profil, compte) as
  select 'ministère communication', c.com from ctx c union all select 'ministère fij', c.fij from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c
  union all select 'ministère désactivé', c.des from ctx c;

-- Lectures que seuls l'administration (et, pour l'usage, EJP Tech) font, sur toute la vue.
create temp table lecture_l1 (rang int primary key, objet text, requete text);
insert into lecture_l1 values
  (1, 'v_etat_comptes', 'select 1 from public.v_etat_comptes'),
  (2, 'v_usage_indicateurs', 'select 1 from public.v_usage_indicateurs');
grant select on matrice_l1, profil_l1, lecture_l1 to authenticated, anon;

-- Le plan compte les 14 tests fixes (contexte, 4 états, adresses, 2 totaux, 6 lectures vides) et,
-- par tests.nombre_essais, les essais de la matrice (lignes dérivées comprises).
select plan(14
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_l1',
                        'select profil, compte from profil_l1', true));

select ok((select count(*) from ctx where com is not null and fij is not null and berger is not null
             and conseil is not null and admin is not null and tech is not null and inv is not null
             and act is not null and ok is not null and des is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les sept comptes et les quatre comptes d''essai');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_l1',
  'select profil, compte from profil_l1',
  true);

-- Les quatre états, tels que l'écran les affiche (colonne « Double authentification »).
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat from public.v_etat_comptes where user_id = (select inv from ctx)'),
          '[{"etat": "invitation_envoyee"}]'::jsonb,
          'adresse pas encore confirmée : « Invitation envoyée »');
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat from public.v_etat_comptes where user_id = (select act from ctx)'),
          '[{"etat": "a_activer"}]'::jsonb,
          'adresse confirmée sans facteur vérifié : « À activer »');
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat from public.v_etat_comptes where user_id = (select ok from ctx)'),
          '[{"etat": "activee"}]'::jsonb,
          'facteur TOTP vérifié : « Activée »');
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat, (desactive_le is not null) as date from public.v_etat_comptes where user_id = (select des from ctx)'),
          '[{"date": true, "etat": "desactive"}]'::jsonb,
          'compte désactivé : « Désactivé le ... », avec sa date');

-- L'adresse vient d'Auth (aucune table publique ne la garde), pour l'administration seulement.
select is(tests.lire((select admin from ctx), 'aal2',
            'select email, type, ministere_id is not null as ministere from public.v_etat_comptes where user_id = (select des from ctx)'),
          '[{"type": "ministere", "email": "matrice-l1-desactive@exemple.test", "ministere": true}]'::jsonb,
          'v_etat_comptes rend à l''administration l''adresse, le type et le ministère du compte');

-- L'administration lit tous les comptes et toutes les lignes d'indicateurs propres actifs ou à
-- valider (colonne « Indicateurs »), sans valeur.
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.v_etat_comptes'),
          (select count(*)::integer from public.compte),
          'l''administration lit l''état de chaque compte');
select is(tests.compter((select admin from ctx), 'aal2',
            'select 1 from public.indicateur where ministere_id is not null and etat in (''actif'', ''en_attente'')'),
          (select count(*)::integer from public.indicateur
            where ministere_id is not null and etat in ('actif', 'en_attente')),
          'l''administration compte tous les indicateurs propres actifs ou à valider');

-- Rien pour un ministère, le berger et le conseil, sur toute la vue (jeu d'exemple compris).
select is(tests.compter(p.compte, 'aal2', l.requete), 0,
          format('%s ne lit rien dans %s', p.profil, l.objet))
  from (select 1 as rang, 'Communication' as profil, c.com as compte from ctx c
        union all select 2, 'le berger', c.berger from ctx c
        union all select 3, 'le conseil', c.conseil from ctx c) as p
 cross join lecture_l1 l
 order by p.rang, l.rang;

select * from finish();
rollback;
