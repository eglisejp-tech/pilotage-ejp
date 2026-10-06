-- Matrice des droits des signalements (lot B7 ; docs/plan-etape-4.md, section 4, « B7 » et
-- « Matrice des droits des objets nouveaux » ; contrat-etape-4.md, sections 1 et 8 ;
-- docs/decisions.md, T39 et P51), écrite en données et parcourue par tests.verifier_matrice
-- (000-outils.test.sql).
--
-- Objets : signalement et signalement_suivi (lecture, ajout direct, modification, suppression),
-- signaler_difficulte, clore_signalement, les couples de modération (signalement, texte) et
-- (signalement_suivi, commentaire) (moderation, masquer_texte, marquer_relu), les lignes de
-- journal des signalements (journal, v_journal) et les lignes texte_relu et texte_masque de
-- cible demande_indicateur (P51).
-- Profils : un ministère porteur (A, deux signalements, dont un clos avec un commentaire), un
-- autre ministère (B, un signalement), les ministères FIJ et Coordination du jeu d'exemple, le
-- berger, le conseil, l'administration de l'église et EJP Tech, en aal2 ; la dérivation ajoute
-- la ligne aal1 de chacun (zéro ligne lue, toute autre action refusée) et la ligne de l'anonyme
-- (refusé partout).
-- Tests précis : l'administration, le berger et le conseil ne lisent aucun signalement, aucune
-- clôture (v_signalement comprise) et aucune ligne de journal des signalements, jeu d'exemple
-- compris, et se voient refuser les deux fonctions ; une ligne texte_masque sur un signalement
-- n'est lue que par le ministère auteur et EJP Tech ; les lignes de P51 sont lues par le
-- ministère auteur, EJP Tech, le berger et le conseil, pas par l'administration ni un autre
-- ministère ; un ministère désactivé (C), dont le signalement a été écrit et clos avant, ne lit
-- plus rien, alors qu'EJP Tech le lit.
-- Puis l'inaltérabilité, même au propriétaire (chaque trigger contre truncate vérifié), sauf
-- le masquage d'un texte.
begin;

create temp table ctx as
select tests.creer_ministere('Matrice B7 porteur') as a_m,
       tests.creer_ministere('Matrice B7 autre') as b_m,
       tests.creer_ministere('Matrice B7 désactivé') as c_m,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid, add column c uuid,
  add column s1 uuid, add column s2 uuid, add column sb uuid, add column sc uuid, add column x2 uuid,
  add column d1 uuid, add column d2 uuid;
update ctx set a = tests.creer_compte('matrice-b7-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-b7-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('matrice-b7-c@exemple.test', 'ministere', c_m);
grant select on ctx to authenticated, anon;

-- Deux suggestions d'essai, pour les lignes de P51.
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre) values
  ('essai_b7_s1', 'suggestion', 'Essai matrice signalements un', 'Première suggestion d''essai des signalements.', 'mois', 1),
  ('essai_b7_s2', 'suggestion', 'Essai matrice signalements deux', 'Deuxième suggestion d''essai des signalements.', 'mois', 2);

-- A signale deux difficultés et ajoute deux suggestions ; B signale une difficulté.
do $$
declare
  v_s1 uuid;
  v_s2 uuid;
  v_sb uuid;
  v_sc uuid;
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  v_s1 := public.signaler_difficulte('saisie_evenement', 'Le formulaire refuse la date de notre soirée.');
  v_s2 := public.signaler_difficulte('saisie_mois', 'Le mois de septembre ne se propose plus.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_b7_s1', 'Pourquoi d''essai des signalements, numéro un.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_b7_s2', 'Pourquoi d''essai des signalements, numéro deux.');
  perform tests.deconnecter();
  perform tests.se_connecter((select b from ctx), 'aal2');
  v_sb := public.signaler_difficulte('autre', 'Une difficulté d''essai du ministère B.');
  perform tests.deconnecter();
  -- Le ministère C signale avant sa désactivation (posée plus bas).
  perform tests.se_connecter((select c from ctx), 'aal2');
  v_sc := public.signaler_difficulte('saisie_session', 'Une difficulté d''essai du ministère C.');
  perform tests.deconnecter();
  update ctx set s1 = v_s1, s2 = v_s2, sb = v_sb, sc = v_sc;
end $$;
update ctx set
  d1 = (select d.id from public.demande_indicateur d join public.indicateur i on i.id = d.indicateur_id
         where i.modele_code = 'essai_b7_s1' and d.ministere_id = ctx.a_m),
  d2 = (select d.id from public.demande_indicateur d join public.indicateur i on i.id = d.indicateur_id
         where i.modele_code = 'essai_b7_s2' and d.ministere_id = ctx.a_m);

-- EJP Tech clôt s2 avec un commentaire, masque le texte de s1, relit le commentaire de la
-- clôture, relit le « Pourquoi » de d1 et masque celui de d2.
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.clore_signalement((select s2 from ctx), 'Transmis à l''administration, merci.');
  perform public.masquer_texte('signalement', (select s1 from ctx), 'texte', 'nom_personne');
  perform public.clore_signalement((select sc from ctx), 'Clôture d''essai du ministère C.');
  perform tests.deconnecter();
end $$;
update ctx set x2 = (select x.id from public.signalement_suivi x where x.signalement_id = ctx.s2);
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.marquer_relu('signalement_suivi', (select x2 from ctx));
  perform public.marquer_relu('demande_indicateur', (select d1 from ctx));
  perform public.masquer_texte('demande_indicateur', (select d2 from ctx), 'pourquoi', 'autre');
  perform tests.deconnecter();
end $$;

-- Le ministère C est désactivé après ses écrits (comme desactiver-compte : le compte et le
-- ministère reçoivent la date de désactivation).
update public.ministere set desactive_le = now() where id = (select c_m from ctx);
update public.compte set desactive_le = now() where user_id = (select c from ctx);

-- Matrice en aal2. Attendus dans l'ordre des profils : porteur, autre ministère, FIJ,
-- Coordination, berger, conseil, administration, EJP Tech.
create temp view matrice_b7 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère porteur'), (2, 'ministère autre'), (3, 'ministère fij'),
                 (4, 'ministère coordination'), (5, 'berger'), (6, 'conseil'), (7, 'administration'),
                 (8, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('signalement', 'lire', array['2', '1', '0', '0', '0', '0', '0', '3'],
      'select 1 from public.signalement where id in (select s1 from ctx union all select s2 from ctx union all select sb from ctx)'),
     ('signalement', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.signalement (ministere_id, ecran, texte) select a_m, ''autre'', ''Ajout direct d''''un signalement.'' from ctx'),
     ('signalement', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.signalement set texte = texte where id = (select s2 from ctx)'),
     ('signalement', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.signalement where id = (select s2 from ctx)'),
     ('v_signalement', 'lire', array['2', '1', '0', '0', '0', '0', '0', '3'],
      'select 1 from public.v_signalement where id in (select s1 from ctx union all select s2 from ctx union all select sb from ctx)'),
     ('signalement_suivi', 'lire', array['1', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.signalement_suivi where signalement_id in (select s1 from ctx union all select s2 from ctx union all select sb from ctx)'),
     ('signalement_suivi', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.signalement_suivi (signalement_id) select sb from ctx'),
     ('signalement_suivi', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.signalement_suivi set commentaire = commentaire where id = (select x2 from ctx)'),
     ('signalement_suivi', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.signalement_suivi where id = (select x2 from ctx)'),
     ('signaler_difficulte', 'appeler', array['ok', 'ok', 'ok', 'ok', '42501', '42501', '42501', '42501'],
      'select public.signaler_difficulte(''autre'', ''Difficulté d''''essai de la matrice.'')'),
     ('clore_signalement', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.clore_signalement((select s1 from ctx), ''Commentaire d''''essai de la matrice.'')'),
     ('clore_signalement (sans commentaire)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.clore_signalement((select sb from ctx))'),
     ('moderation (signalements)', 'lire', array['0', '0', '0', '0', '0', '0', '0', '2'],
      'select 1 from public.moderation where cible in (''signalement'', ''signalement_suivi'') and cible_id in (select s1 from ctx union all select x2 from ctx)'),
     ('masquer_texte (signalement, texte)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''signalement'', (select sb from ctx), ''texte'', ''coordonnees'')'),
     ('masquer_texte (signalement_suivi, commentaire)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''signalement_suivi'', (select x2 from ctx), ''commentaire'', ''autre'')'),
     ('marquer_relu (signalement)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.marquer_relu(''signalement'', (select sb from ctx))'),
     ('journal (difficulte_signalee, signalement_clos)', 'lire', array['3', '0', '0', '0', '0', '0', '0', '3'],
      'select 1 from public.journal where action in (''difficulte_signalee'', ''signalement_clos'') and cible_id in (select s1 from ctx union all select s2 from ctx)'),
     ('journal (difficulte_signalee du ministère B)', 'lire', array['0', '1', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.journal where action = ''difficulte_signalee'' and cible_id = (select sb from ctx)'),
     ('journal (texte_masque, cible signalement)', 'lire', array['1', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.journal where action = ''texte_masque'' and cible = ''signalement'' and cible_id = (select s1 from ctx)'),
     ('journal (texte_relu, cible signalement_suivi)', 'lire', array['1', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.journal where action = ''texte_relu'' and cible = ''signalement_suivi'' and cible_id = (select x2 from ctx)'),
     ('v_journal (difficulte_signalee, signalement_clos)', 'lire', array['3', '0', '0', '0', '0', '0', '0', '3'],
      'select 1 from public.v_journal where action in (''difficulte_signalee'', ''signalement_clos'') and cible_id in (select s1 from ctx union all select s2 from ctx)'),
     ('v_journal (texte_masque, cible signalement)', 'lire', array['1', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_journal where action = ''texte_masque'' and cible = ''signalement'' and cible_id = (select s1 from ctx)'),
     ('v_journal (texte_relu, cible signalement_suivi)', 'lire', array['1', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_journal where action = ''texte_relu'' and cible = ''signalement_suivi'' and cible_id = (select x2 from ctx)'),
     ('journal (P51, texte_relu de demande_indicateur)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.journal where action = ''texte_relu'' and cible = ''demande_indicateur'' and cible_id = (select d1 from ctx)'),
     ('journal (P51, texte_masque de demande_indicateur)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.journal where action = ''texte_masque'' and cible = ''demande_indicateur'' and cible_id = (select d2 from ctx)'),
     ('v_journal (P51, texte_relu de demande_indicateur)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_journal where action = ''texte_relu'' and cible = ''demande_indicateur'' and cible_id = (select d1 from ctx)'),
     ('v_journal (P51, texte_masque de demande_indicateur)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_journal where action = ''texte_masque'' and cible = ''demande_indicateur'' and cible_id = (select d2 from ctx)')
   ) as m(objet, action, attendu, requete);
create temp view profil_b7 (profil, compte) as
  select 'ministère porteur', c.a from ctx c union all select 'ministère autre', c.b from ctx c
  union all select 'ministère fij', c.fij from ctx c union all select 'ministère coordination', c.coo from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;

-- Lectures que ni l'administration, ni le berger, ni le conseil ne font, sur toute la table
-- (jeu d'exemple compris : seed/43-signalements.sql).
create temp table lecture_b7 (rang int primary key, objet text, requete text);
insert into lecture_b7 values
  (1, 'signalement', 'select 1 from public.signalement'),
  (2, 'signalement_suivi', 'select 1 from public.signalement_suivi'),
  (3, 'journal (lignes des signalements)',
   'select 1 from public.journal where action in (''difficulte_signalee'', ''signalement_clos'') or cible in (''signalement'', ''signalement_suivi'')'),
  (4, 'v_journal (lignes des signalements)',
   'select 1 from public.v_journal where action in (''difficulte_signalee'', ''signalement_clos'') or cible in (''signalement'', ''signalement_suivi'')'),
  (5, 'v_signalement', 'select 1 from public.v_signalement');

-- Le ministère désactivé (C) ne lit plus rien de ses signalements, écrits et clos avant sa
-- désactivation ; EJP Tech les lit (preuve que le zéro ne vient pas d'un jeu vide).
create temp table desactive_b7 (rang int primary key, objet text, requete text, attendu_tech int);
insert into desactive_b7 values
  (1, 'signalement', 'select 1 from public.signalement where id = (select sc from ctx)', 1),
  (2, 'signalement_suivi', 'select 1 from public.signalement_suivi where signalement_id = (select sc from ctx)', 1),
  (3, 'journal (difficulte_signalee, signalement_clos)',
   'select 1 from public.journal where action in (''difficulte_signalee'', ''signalement_clos'') and cible_id = (select sc from ctx)', 2),
  (4, 'v_journal (difficulte_signalee, signalement_clos)',
   'select 1 from public.v_journal where action in (''difficulte_signalee'', ''signalement_clos'') and cible_id = (select sc from ctx)', 2),
  (5, 'v_signalement', 'select 1 from public.v_signalement where id = (select sc from ctx)', 1);
grant select on matrice_b7, profil_b7, lecture_b7, desactive_b7 to authenticated, anon;

-- Le plan compte les 41 tests fixes (contexte, 15 lectures vides, 3 textes de v_journal, 12 pour
-- l'inaltérabilité et le masquage, 10 pour le ministère désactivé) et, par
-- tests.nombre_essais, les essais de la matrice (lignes dérivées comprises).
select plan(41
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_b7',
                        'select profil, compte from profil_b7', true));

select ok((select count(*) from ctx where a is not null and b is not null and fij is not null and coo is not null
             and berger is not null and conseil is not null and admin is not null and tech is not null
             and c is not null and s1 is not null and s2 is not null and sb is not null and sc is not null
             and x2 is not null and d1 is not null and d2 is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes, les quatre signalements, la clôture et les deux demandes');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_b7',
  'select profil, compte from profil_b7',
  true);

-- Premier test précis : rien pour l'administration, le berger et le conseil, sur toute la table.
select is(tests.compter(p.compte, 'aal2', l.requete), 0,
          format('%s ne lit rien dans %s', p.profil, l.objet))
  from (select 1 as rang, 'l''administration' as profil, c.admin as compte from ctx c
        union all select 2, 'le berger', c.berger from ctx c
        union all select 3, 'le conseil', c.conseil from ctx c) as p
 cross join lecture_b7 l
 order by p.rang, l.rang;

-- v_journal nomme l'écran du signalement, sous la RLS du lecteur, jamais le texte.
select is(tests.lire((select a from ctx), 'aal2',
  'select cible_texte from public.v_journal where action = ''difficulte_signalee'' and cible_id = (select s1 from ctx)'),
  '[{"cible_texte": "saisie_evenement"}]'::jsonb,
  'v_journal donne au ministère auteur le code de l''écran du signalement');
select is(tests.lire((select tech from ctx), 'aal2',
  'select cible_texte from public.v_journal where action = ''signalement_clos'' and cible_id = (select s2 from ctx)'),
  '[{"cible_texte": "saisie_mois"}]'::jsonb,
  'v_journal donne à EJP Tech le code de l''écran du signalement clos');
select is(tests.lire((select a from ctx), 'aal2',
  'select cible_texte from public.v_journal where action = ''texte_relu'' and cible = ''signalement_suivi'' and cible_id = (select x2 from ctx)'),
  '[{"cible_texte": "saisie_mois"}]'::jsonb,
  'v_journal donne au ministère auteur le code de l''écran pour la ligne d''un commentaire de clôture');

-- Ministère désactivé (C) : rien, alors qu'EJP Tech lit les mêmes lignes.
select is(tests.compter((select c from ctx), 'aal2', d.requete), 0,
          format('un ministère désactivé ne lit plus : %s', d.objet))
  from desactive_b7 d order by d.rang;
select is(tests.compter((select tech from ctx), 'aal2', d.requete), d.attendu_tech,
          format('EJP Tech lit les lignes du ministère désactivé : %s', d.objet))
  from desactive_b7 d order by d.rang;

-- Inaltérabilité, même pour le propriétaire des tables (rôle du test).
select throws_ok($$ update public.signalement set ecran = 'autre' where id = (select s2 from ctx) $$,
  '42501', 'La table signalement est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'signalement : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.signalement where id = (select sb from ctx) $$,
  '42501', 'La table signalement est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'signalement : le propriétaire ne peut pas effacer une ligne');
-- Vider : un trigger before truncate par table (le contrôle générique ne regarde que update et
-- delete). Chaque trigger est vérifié seul : une table vidée avec cascade déclencherait ceux des
-- deux tables, ce qui cacherait l'absence de l'un.
select has_trigger('public', 'signalement', 'ajout_seulement_vider', 'signalement : trigger contre truncate');
select has_trigger('public', 'signalement_suivi', 'ajout_seulement_vider', 'signalement_suivi : trigger contre truncate');
select throws_ok($$ truncate public.signalement_suivi $$,
  '42501', 'La table signalement_suivi est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'signalement_suivi : le propriétaire ne peut pas la vider');
select throws_ok($$ truncate public.signalement cascade $$, '42501', null::text,
  'signalement : le propriétaire ne peut pas la vider, même avec cascade');
select throws_ok($$ update public.signalement_suivi set commentaire = 'Autre commentaire d''essai.' where id = (select x2 from ctx) $$,
  '42501', 'La table signalement_suivi est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'signalement_suivi : le propriétaire ne peut pas réécrire une clôture');
select throws_ok($$ delete from public.signalement_suivi where id = (select x2 from ctx) $$,
  '42501', 'La table signalement_suivi est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'signalement_suivi : le propriétaire ne peut pas effacer une clôture');
select throws_ok($$ update public.signalement set texte = '[texte masqué par EJP Tech]' where id = (select s2 from ctx) $$,
  '42501', 'La table signalement est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sans le réglage de masquage, masquer directement un signalement est refusé');
select set_config('pilotage.masquage', 'oui', true);
select throws_ok($$ update public.signalement set texte = 'Autre texte du signalement.' where id = (select s2 from ctx) $$,
  '42501', 'La table signalement est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sous le réglage de masquage, le signalement ne prend que le texte masqué');
select throws_ok($$ update public.signalement set texte = '[texte masqué par EJP Tech]', ecran = 'autre' where id = (select s2 from ctx) $$,
  '42501', 'La table signalement est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sous le réglage de masquage, le signalement ne change aucune autre colonne');
select lives_ok($$ update public.signalement set texte = '[texte masqué par EJP Tech]' where id = (select s2 from ctx) $$,
  'sous le réglage de masquage, le masquage du signalement passe (masquer_texte)');
select set_config('pilotage.masquage', '', true);

select * from finish();
rollback;
