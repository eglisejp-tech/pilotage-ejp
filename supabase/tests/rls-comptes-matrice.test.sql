-- Matrice des droits de l'écran 13, « Ministères et comptes » (lot L1 ; plan des étapes 5 à 8,
-- section 3.2 ; BRIEF, section 7, « Matrice des droits », et section 8), écrite en données et
-- parcourue par tests.verifier_matrice (000-outils.test.sql).
--
-- Objets lus par l'écran : v_etat_comptes (et private.etat_comptes, qu'elle lit), compte et
-- ministere (lecture, aucune écriture directe) et indicateur, avec la requête exacte de
-- src/data/comptes.ts (indicateurs propres actifs ou à valider, colonne « Indicateurs ») ; les
-- écritures passent par les Edge Functions, dont les fonctions serveur restent fermées à
-- authenticated (comptes-serveur-droits.test.sql).
-- Profils (huit comptes) : les ministères Communication et FIJ, le berger, le conseil,
-- l'administration de l'église et EJP Tech du jeu d'exemple, plus un ministère désactivé et une
-- administration désactivée créés ici (son jeton aal2 reste valable jusqu'à 1 h, BRIEF
-- section 7). En aal2, la dérivation ajoute la ligne aal1 de chaque lecture acceptée (zéro ligne
-- lue) et la ligne de l'anonyme (refusé partout). Les écritures directes, refusées par les GRANT
-- en aal2, sont écrites aussi en aal1 pour chaque profil (42501 : le refus des GRANT passe avant
-- les triggers et la RLS). Un compte désactivé lit encore sa propre ligne de compte, en aal1
-- comme en aal2 (écran « Ce compte est désactivé »).
-- Tests précis : les quatre états de v_etat_comptes (invitation envoyée, à activer, activée,
-- désactivé), l'activation interrompue (facteur non vérifié : « À activer ») et l'adresse lue
-- dans Auth, pour l'administration seulement ; l'administration lit tous les comptes, et autant
-- d'indicateurs propres que la table en contient.
begin;

-- Comptes d'essai : invitation envoyée (adresse non confirmée), à activer (adresse confirmée,
-- aucun facteur), activation interrompue (adresse confirmée, facteur TOTP non vérifié), activée
-- (facteur TOTP vérifié), désactivé (un ministère et son compte, désactivés comme par
-- desactiver-compte) et une administration désactivée. Indicateurs d'essai de Communication :
-- un actif, un à valider et un retiré (la requête de l'écran écarte le retiré).
create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Matrice L1 désactivé') as des_m;
alter table ctx add column inv uuid, add column act uuid, add column inter uuid, add column ok uuid,
  add column des uuid, add column adm_des uuid;
update ctx set inv = tests.creer_compte('matrice-l1-invitation@exemple.test', 'conseil'),
               act = tests.creer_compte('matrice-l1-a-activer@exemple.test', 'admin_plateforme'),
               inter = tests.creer_compte('matrice-l1-interrompue@exemple.test', 'conseil'),
               ok = tests.creer_compte('matrice-l1-activee@exemple.test', 'conseil'),
               des = tests.creer_compte('matrice-l1-desactive@exemple.test', 'ministere', des_m),
               adm_des = tests.creer_compte('matrice-l1-admin-desactivee@exemple.test', 'admin_eglise');
update auth.users set email_confirmed_at = now()
 where id in (select act from ctx union all select inter from ctx union all select ok from ctx
              union all select des from ctx union all select adm_des from ctx);
-- Exception voulue à la règle de la BRIEF, section 8 (le script d'installation e2e n'écrit
-- jamais dans auth.mfa_factors, table interne de GoTrue) : pgTAP ne peut pas appeler l'API Auth.
-- L'écriture reste dans cette transaction annulée, avec les seules colonnes requises.
-- Deux insertions (une union rendrait les littéraux en text, refusés par les types d'Auth).
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
select gen_random_uuid(), ok, 'Matrice L1', 'totp', 'verified', now(), now() from ctx;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
select gen_random_uuid(), inter, 'Matrice L1', 'totp', 'unverified', now(), now() from ctx;
update public.ministere set desactive_le = now() where id = (select des_m from ctx);
update public.compte set desactive_le = now()
 where user_id in (select des from ctx union all select adm_des from ctx);

insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai L1 actif', 'Indicateur propre d''essai de l''écran 13.', 'mois', c.com_m from ctx c;
insert into public.indicateur (libelle, definition, nature, ministere_id, origine, etat)
select 'Essai L1 à valider', 'Ajout d''un ministère, en attente de validation.', 'mois', c.com_m, 'ministere', 'en_attente'
  from ctx c;
insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai L1 retiré', 'Indicateur d''essai retiré avant la lecture.', 'mois', c.com_m from ctx c;
update public.indicateur set etat = 'retire', retrait_motif = 'erreur' where libelle = 'Essai L1 retiré';
alter table ctx add column ind_actif uuid, add column ind_att uuid, add column ind_ret uuid;
update ctx set ind_actif = (select i.id from public.indicateur i where i.libelle = 'Essai L1 actif'),
               ind_att = (select i.id from public.indicateur i where i.libelle = 'Essai L1 à valider'),
               ind_ret = (select i.id from public.indicateur i where i.libelle = 'Essai L1 retiré');
grant select on ctx to authenticated, anon;

-- Les six comptes d'essai, lus par les requêtes de la matrice.
create temp view essais_l1 (user_id) as
  select inv from ctx union all select act from ctx union all select inter from ctx
  union all select ok from ctx union all select des from ctx union all select adm_des from ctx;
grant select on essais_l1 to authenticated, anon;

-- Matrice en aal2. Attendus dans l'ordre des profils : Communication, FIJ, berger, conseil,
-- administration, EJP Tech, ministère désactivé, administration désactivée.
create temp view matrice_l1_aal2 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère communication'), (2, 'ministère fij'), (3, 'berger'), (4, 'conseil'),
                 (5, 'administration'), (6, 'EJP Tech'), (7, 'ministère désactivé'),
                 (8, 'administration désactivée')) as p(rang, profil)
   cross join (values
     ('v_etat_comptes', 'lire', array['0', '0', '0', '0', '6', '0', '0', '0'],
      'select 1 from public.v_etat_comptes where user_id in (select user_id from essais_l1)'),
     ('v_etat_comptes (adresses)', 'lire', array['0', '0', '0', '0', '6', '0', '0', '0'],
      'select 1 from public.v_etat_comptes where email like ''matrice-l1-%@exemple.test'''),
     ('private.etat_comptes', 'lire', array['0', '0', '0', '0', '6', '0', '0', '0'],
      'select 1 from private.etat_comptes() e where e.user_id in (select user_id from essais_l1)'),
     ('compte', 'lire', array['6', '6', '6', '6', '6', '6', '1', '1'],
      'select 1 from public.compte where user_id in (select user_id from essais_l1)'),
     ('compte', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.compte (user_id, type, libelle) select inv, ''conseil'', ''Conseil, compte 99'' from ctx'),
     ('compte', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.compte set desactive_le = null where user_id = (select des from ctx)'),
     ('compte', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.compte where user_id = (select inv from ctx)'),
     ('ministere', 'lire', array['1', '1', '1', '1', '1', '1', '0', '0'],
      'select 1 from public.ministere where id = (select des_m from ctx)'),
     ('ministere', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.ministere (nom) values (''Matrice L1 ajout direct'')'),
     ('ministere', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.ministere set desactive_le = null where id = (select des_m from ctx)'),
     ('ministere', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.ministere where id = (select des_m from ctx)'),
     -- Requête de lireIndicateursDesMinisteres : un ministère ne lit que les siens (tous états),
     -- le berger, le conseil, l'administration et EJP Tech lisent tout ; le retiré est écarté.
     ('indicateur (colonne Indicateurs)', 'lire', array['2', '0', '2', '2', '2', '2', '0', '0'],
      'select 1 from public.indicateur where ministere_id is not null and etat in (''actif'', ''en_attente'') and id in (select ind_actif from ctx union all select ind_att from ctx union all select ind_ret from ctx)')
   ) as m(objet, action, attendu, requete);
create temp view matrice_l1 (profil, objet, action, aal, attendu, requete) as
  select * from matrice_l1_aal2
  -- Écritures directes en aal1 : refusées par les GRANT, pour chaque profil.
  union all
  select m.profil, m.objet, m.action, 'aal1', '42501', m.requete
    from matrice_l1_aal2 m
   where m.action <> 'lire'
  -- Un compte désactivé lit sa propre ligne en aal1 aussi (seule exception à la politique aal2).
  union all
  select p.profil, 'compte', 'lire', 'aal1', '1',
         'select 1 from public.compte where user_id in (select user_id from essais_l1)'
    from (values ('ministère désactivé'), ('administration désactivée')) as p(profil);
create temp view profil_l1 (profil, compte) as
  select 'ministère communication', c.com from ctx c union all select 'ministère fij', c.fij from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c
  union all select 'ministère désactivé', c.des from ctx c
  union all select 'administration désactivée', c.adm_des from ctx c;
grant select on matrice_l1_aal2, matrice_l1, profil_l1 to authenticated, anon;

-- Le plan compte les 13 tests fixes (contexte, 4 états et l'activation interrompue, adresses,
-- 2 totaux, 4 lectures vides de v_etat_comptes) et, par tests.nombre_essais, les essais de la
-- matrice (lignes dérivées comprises).
select plan(13
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_l1',
                        'select profil, compte from profil_l1', true));

select ok((select count(*) from ctx where com is not null and com_m is not null and fij is not null
             and berger is not null and conseil is not null and admin is not null and tech is not null
             and inv is not null and act is not null and inter is not null and ok is not null
             and des is not null and adm_des is not null and ind_actif is not null
             and ind_att is not null and ind_ret is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les sept comptes, les six comptes et les trois indicateurs d''essai');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_l1',
  'select profil, compte from profil_l1',
  true);

-- Les quatre états, tels que l'écran les affiche (colonne « Double authentification »), et
-- l'activation interrompue.
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat from public.v_etat_comptes where user_id = (select inv from ctx)'),
          '[{"etat": "invitation_envoyee"}]'::jsonb,
          'adresse pas encore confirmée : « Invitation envoyée »');
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat from public.v_etat_comptes where user_id = (select act from ctx)'),
          '[{"etat": "a_activer"}]'::jsonb,
          'adresse confirmée sans facteur : « À activer »');
select is(tests.lire((select admin from ctx), 'aal2',
            'select etat from public.v_etat_comptes where user_id = (select inter from ctx)'),
          '[{"etat": "a_activer"}]'::jsonb,
          'activation interrompue (facteur TOTP non vérifié) : toujours « À activer »');
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

-- Rien dans toute la vue (jeu d'exemple compris) pour un ministère, le berger, le conseil et
-- l'administration désactivée, dont le jeton aal2 reste valable.
select is(tests.compter(p.compte, 'aal2', 'select 1 from public.v_etat_comptes'), 0,
          format('%s ne lit rien dans v_etat_comptes', p.profil))
  from (select 1 as rang, 'Communication' as profil, c.com as compte from ctx c
        union all select 2, 'le berger', c.berger from ctx c
        union all select 3, 'le conseil', c.conseil from ctx c
        union all select 4, 'l''administration désactivée', c.adm_des from ctx c) as p
 order by p.rang;

select * from finish();
rollback;
