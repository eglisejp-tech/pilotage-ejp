-- Fonctions de l'API (BRIEF, section 7, « Fonctions de l'API » et « Tests obligatoires »).
-- Chaque fonction appelée en aal1 échoue ; l'anonyme n'exécute rien ; les contrôles de chaque
-- fonction ; « Marquer traité » (D3) ; journal écrit par les fonctions.
begin;

select plan(103);

-- Ministères de test A (créateur), B (mentionné), C (autre), D (désactivé plus bas) ; comptes
-- du jeu d'exemple pour le berger, le conseil, l'administration et EJP Tech.
create temp table ctx as
select tests.creer_ministere('Essai A') as a_m,
       tests.creer_ministere('Essai B') as b_m,
       tests.creer_ministere('Essai C') as c_m,
       tests.creer_ministere('Essai D') as d_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 3') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as ejptech,
       (select s.id from public.session s where s.type = 'batir' and s.date = private.dimanche_reference() - 1) as batir;
alter table ctx add column a uuid, add column b uuid, add column c uuid,
  add column p1 uuid, add column p2 uuid, add column p3 uuid, add column ev uuid, add column s1 uuid,
  add column suivi_sans_texte uuid;
update ctx set a = tests.creer_compte('essai-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('essai-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('essai-c@exemple.test', 'ministere', c_m);
grant select on ctx to authenticated, anon;

select ok((select count(*) from ctx where berger is not null and conseil is not null and admin is not null
             and ejptech is not null and batir is not null) = 1,
  'le jeu d''exemple fournit le berger, le conseil, l''administration, EJP Tech et la session du 26 sept.');

-- Chaque fonction appelée en aal1 échoue
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$ select public.creer_point('Essai', null, null, 'normale', null, '{}') $$,
  '42501', 'Double authentification requise.', 'aal1 : creer_point refusée');
select throws_ok($$ select public.changer_statut_point(gen_random_uuid(), 'en_cours') $$,
  '42501', 'Double authentification requise.', 'aal1 : changer_statut_point refusée');
select throws_ok($$ select public.marquer_traite(gen_random_uuid(), 'Commentaire assez long') $$,
  '42501', 'Double authentification requise.', 'aal1 : marquer_traite refusée');
select throws_ok($$ select public.ajouter_evenement('Essai', private.aujourdhui(), 'brouillon') $$,
  '42501', 'Double authentification requise.', 'aal1 : ajouter_evenement refusée');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal1');
select throws_ok($$ select public.declarer_session('batir', '2027-10-09', null, array[(select a_m from ctx)]) $$,
  '42501', 'Double authentification requise.', 'aal1 : declarer_session refusée');
select throws_ok($$ select public.modifier_session((select batir from ctx), array[(select a_m from ctx)]) $$,
  '42501', 'Double authentification requise.', 'aal1 : modifier_session refusée');
select throws_ok($$ select public.supprimer_session((select batir from ctx)) $$,
  '42501', 'Double authentification requise.', 'aal1 : supprimer_session refusée');
select tests.deconnecter();
select tests.se_connecter((select ejptech from ctx), 'aal1');
select throws_ok($$ select public.marquer_relu('evenement', gen_random_uuid()) $$,
  '42501', 'Double authentification requise.', 'aal1 : marquer_relu refusée');
select throws_ok($$ select public.masquer_texte('evenement', gen_random_uuid(), 'titre', 'autre') $$,
  '42501', 'Double authentification requise.', 'aal1 : masquer_texte refusée');
select tests.deconnecter();

-- L'anonyme n'exécute aucune fonction (ni de public, ni de private)
select tests.anonyme();
select throws_ok($$ select public.creer_point('Essai', null, null, 'normale', null, '{}') $$, '42501', null,
  'anonyme : creer_point refusée');
select throws_ok($$ select public.changer_statut_point(gen_random_uuid(), 'en_cours') $$, '42501', null,
  'anonyme : changer_statut_point refusée');
select throws_ok($$ select public.marquer_traite(gen_random_uuid(), null) $$, '42501', null,
  'anonyme : marquer_traite refusée');
select throws_ok($$ select public.ajouter_evenement('Essai', '2030-01-01', 'brouillon') $$, '42501', null,
  'anonyme : ajouter_evenement refusée');
select throws_ok($$ select public.declarer_session('batir', '2030-01-05', null, '{}') $$, '42501', null,
  'anonyme : declarer_session refusée');
select throws_ok($$ select public.modifier_session(gen_random_uuid(), '{}') $$, '42501', null,
  'anonyme : modifier_session refusée');
select throws_ok($$ select public.supprimer_session(gen_random_uuid()) $$, '42501', null,
  'anonyme : supprimer_session refusée');
select throws_ok($$ select public.marquer_relu('evenement', gen_random_uuid()) $$, '42501', null,
  'anonyme : marquer_relu refusée');
select throws_ok($$ select public.masquer_texte('evenement', gen_random_uuid(), 'titre', 'autre') $$, '42501', null,
  'anonyme : masquer_texte refusée');
select throws_ok($$ select private.mon_type() $$, '42501', null, 'anonyme : le schéma private est fermé');
select tests.deconnecter();

-- creer_point
update public.ministere set desactive_le = now() where id = (select d_m from ctx);

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.creer_point('Point 1 de test', 'Ce qui se passe', 'Ce qui est attendu', 'haute',
    private.aujourdhui() + 5, array[(select b_m from ctx), (select b_m from ctx)])
$$, 'un ministère crée un point qui mentionne un autre ministère (doublon retiré)');
select lives_ok($$
  select public.creer_point('Point 2 de test', 'Texte à masquer plus bas', null, 'normale', null, null)
$$, 'un ministère crée un point sans mention');
select lives_ok($$
  select public.creer_point('Point 3 de test', null, null, 'urgente', private.aujourdhui(), '{}')
$$, 'un ministère crée un point dont l''échéance est aujourd''hui');
select throws_ok($$
  select public.creer_point('Essai', null, null, 'normale', null, array[(select a_m from ctx)])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'un ministère ne se mentionne pas lui-même');
select throws_ok($$
  select public.creer_point('Essai', null, null, 'normale', null, array[(select d_m from ctx)])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'un ministère désactivé ne peut pas être mentionné');
select throws_ok($$ select public.creer_point('   ', null, null, 'normale', null, '{}') $$,
  'P0001', 'Donnez un titre au point (80 caractères au plus).', 'un titre vide est refusé');
select throws_ok($$ select public.creer_point(repeat('x', 81), null, null, 'normale', null, '{}') $$,
  'P0001', 'Donnez un titre au point (80 caractères au plus).', 'un titre de 81 caractères est refusé');
select throws_ok($$ select public.creer_point('Essai', repeat('x', 281), null, 'normale', null, '{}') $$,
  'P0001', 'La description dépasse 280 caractères.', 'une description de 281 caractères est refusée');
select throws_ok($$ select public.creer_point('Essai', null, null, 'normale', private.aujourdhui() - 1, '{}') $$,
  'P0001', 'L''échéance ne peut pas être passée.', 'une échéance passée est refusée');
select tests.deconnecter();

select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.creer_point('Essai', null, null, 'normale', null, '{}') $$,
  '42501', 'Seul un compte de ministère peut créer un point.', 'le berger ne crée pas de point');
select tests.deconnecter();

update ctx set p1 = (select p.id from public.point_attention p where p.titre = 'Point 1 de test'),
               p2 = (select p.id from public.point_attention p where p.titre = 'Point 2 de test'),
               p3 = (select p.id from public.point_attention p where p.titre = 'Point 3 de test');

select results_eq($$ select m.ministere_id from public.point_mention m where m.point_id = (select p1 from ctx) $$,
  $$ select b_m from ctx $$, 'le point 1 mentionne B une seule fois');
select results_eq($$ select s.statut::text, s.saisi_par from public.point_suivi s where s.point_id = (select p1 from ctx) $$,
  $$ select 'a_traiter', a from ctx $$, 'le point naît « À traiter », au nom du ministère créateur');
select results_eq($$
  select j.compte, j.ministere_id, j.detail from public.journal j
   where j.action = 'point_cree' and j.cible_id = (select p1 from ctx)
$$, $$
  select a, a_m, jsonb_build_object('priorite', 'haute', 'mentions', jsonb_build_array(b_m)) from ctx
$$, 'une ligne de journal point_cree : compte créateur, ministère créateur, priorité et mentions');

-- changer_statut_point : créateur et mentionnés, points ouverts seulement
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select p1 from ctx), 'en_cours') $$,
  'le ministère créateur passe le point « En cours »');
select tests.deconnecter();
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select p1 from ctx), 'attente_decision') $$,
  'le ministère mentionné passe le point « En attente de décision »');
select lives_ok($$ select public.changer_statut_point((select p1 from ctx), 'attente_decision') $$,
  'le même statut est accepté sans rien écrire');
select throws_ok($$ select public.changer_statut_point((select p1 from ctx), 'traite') $$,
  'P0001', 'Utilisez le bouton Marquer traité.', 'le statut « Traité » passe par marquer_traite');
select tests.deconnecter();

select is((select count(*)::int from public.point_suivi s where s.point_id = (select p1 from ctx)), 3,
  'trois lignes de suivi : À traiter, En cours, En attente de décision (le doublon n''écrit rien)');
select is((select v.statut::text from public.v_point v where v.id = (select p1 from ctx)), 'attente_decision',
  'le statut courant est le plus récent');
select results_eq($$
  select j.compte, j.ministere_id, j.detail -> 'statut' from public.journal j
   where j.action = 'point_statut' and j.cible_id = (select p1 from ctx) order by j.id
$$, $$
  select a, a_m, '["a_traiter", "en_cours"]'::jsonb from ctx
  union all
  select b, a_m, '["en_cours", "attente_decision"]'::jsonb from ctx
$$, 'deux lignes de journal point_statut, ministère créateur, ancien et nouveau statut');

select tests.se_connecter((select c from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select p1 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'un autre ministère ne change pas le statut');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select p1 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'le berger ne change pas les statuts');
select tests.deconnecter();

-- marquer_traite (D3)
create temp table avant as
select (select count(*) from public.point_suivi s where s.point_id = (select p1 from ctx)) as suivis,
       (select count(*) from public.journal j where j.cible_id = (select p1 from ctx)) as journal;

select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx)) $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'ministère mentionné sans commentaire : refusé');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), '  Fait.  ') $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'ministère mentionné avec un commentaire de moins de 10 caractères : refusé');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), null) $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'ministère créateur sans commentaire : refusé');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), repeat('x', 281)) $$,
  'P0001', 'Le commentaire dépasse 280 caractères.', 'commentaire de 281 caractères : refusé');
select tests.deconnecter();
select tests.se_connecter((select c from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Commentaire assez long') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'ministère ni créateur ni mentionné : refusé');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Commentaire assez long') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'administration de l''église : refusée');
select tests.deconnecter();
select tests.se_connecter((select ejptech from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Commentaire assez long') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'EJP Tech : refusé');
select tests.deconnecter();
select tests.anonyme();
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Commentaire assez long') $$,
  '42501', null, 'anonyme : refusé');
select tests.deconnecter();

select ok((select count(*) from public.point_suivi s where s.point_id = (select p1 from ctx)) = (select suivis from avant)
          and (select count(*) from public.journal j where j.cible_id = (select p1 from ctx)) = (select journal from avant),
  'les refus ne changent rien : ni suivi, ni journal');

select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select p1 from ctx), 'Salle confirmée par écrit pour le 10 octobre.') $$,
  'ministère mentionné avec un commentaire : accepté');
select tests.deconnecter();

select results_eq($$
  select s.statut::text, s.commentaire, s.saisi_par from public.point_suivi s
   where s.point_id = (select p1 from ctx) and s.statut = 'traite'
$$, $$ select 'traite', 'Salle confirmée par écrit pour le 10 octobre.', b from ctx $$,
  'une ligne point_suivi « traite » avec le commentaire, au nom du ministère mentionné');
select results_eq($$
  select j.compte, j.ministere_id, j.detail from public.journal j
   where j.action = 'point_traite' and j.cible_id = (select p1 from ctx)
$$, $$ select b, a_m, '{"avec_commentaire": true}'::jsonb from ctx $$,
  'une seule ligne de journal : compte de l''appelant, ministère créateur');

select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), null) $$,
  'P0001', 'Ce point est déjà traité.', 'un point déjà traité est refusé');
select lives_ok($$ select public.marquer_traite((select p2 from ctx)) $$,
  'le berger marque traité sans commentaire');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select p1 from ctx), 'en_cours') $$,
  'P0001', 'Ce point est traité : il ne change plus.', 'changer_statut_point échoue sur un point traité');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select p3 from ctx), '   ') $$,
  'le conseil marque traité sans commentaire (espaces ignorés)');
select tests.deconnecter();

select results_eq($$
  select j.compte, j.detail from public.journal j
   where j.action = 'point_traite' and j.cible_id in (select p2 from ctx union all select p3 from ctx)
   order by j.id
$$, $$
  select berger, '{"avec_commentaire": false}'::jsonb from ctx
  union all
  select conseil, '{"avec_commentaire": false}'::jsonb from ctx
$$, 'berger et conseil : une ligne de journal chacun, sans commentaire');
select is((select s.commentaire from public.point_suivi s where s.point_id = (select p3 from ctx) and s.statut = 'traite'),
  null, 'un commentaire vide est enregistré comme absent');

-- ajouter_evenement (partie private security definer depuis la migration correctifs_audit)
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_evenement('Événement de test', private.aujourdhui() + 10, 'brouillon') $$,
  'un ministère ajoute un événement');
select throws_ok($$ select public.ajouter_evenement('Essai', private.aujourdhui() - 1, 'brouillon') $$,
  'P0001', 'La date ne peut pas être passée.', 'un événement daté d''hier est refusé');
select throws_ok($$ select public.ajouter_evenement('  ', private.aujourdhui(), 'brouillon') $$,
  'P0001', 'Donnez un nom à l''événement (80 caractères au plus).', 'un événement sans nom est refusé');
select tests.deconnecter();

update ctx set ev = (select e.id from public.evenement e where e.titre = 'Événement de test');

select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.detail ->> 'statut' from public.journal j
   where j.cible_id = (select ev from ctx)
$$, $$ select 'evenement_ajoute', a, a_m, 'evenement', 'brouillon' from ctx $$,
  'l''événement et son premier état donnent une ligne evenement_ajoute');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ctx.ev, private.aujourdhui() + 12, 'valide' from ctx
$$, 'le ministère reporte un nouveau statut');
select tests.deconnecter();

select is((select count(*)::int from public.journal j where j.cible_id = (select ev from ctx) and j.action = 'evenement_modifie'),
  1, 'la mise à jour donne une ligne evenement_modifie');

select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.ajouter_evenement('Essai', private.aujourdhui(), 'brouillon') $$,
  '42501', 'Seul un compte de ministère peut ajouter un événement.', 'le berger n''ajoute pas d''événement');
select tests.deconnecter();

-- declarer_session, modifier_session, supprimer_session (administration de l'église)
select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$
  select public.declarer_session('batir', '2027-10-09', null, array[(select a_m from ctx), (select b_m from ctx)])
$$, 'l''administration déclare une session');
select throws_ok($$
  select public.declarer_session('batir', '2027-10-09', null, array[(select a_m from ctx)])
$$, 'P0001', 'Une session Bâtir l''Église est déjà déclarée le samedi 9 octobre.', 'une session en double est refusée');
select throws_ok($$ select public.declarer_session('anti_dispersion', '2027-10-16', null, '{}') $$,
  'P0001', 'Cochez au moins un ministère.', 'une session sans ministère attendu est refusée');
select throws_ok($$
  select public.declarer_session('anti_dispersion', '2027-10-16', null, array[(select d_m from ctx)])
$$, 'P0001', 'Un ministère coché n''est pas actif.', 'un ministère désactivé ne peut pas être attendu');
select throws_ok($$
  select public.declarer_session('autre', '2027-10-16', '  ', array[(select a_m from ctx)])
$$, 'P0001', 'Donnez un nom au rassemblement (80 caractères au plus).', 'un autre rassemblement sans nom est refusé');
select lives_ok($$
  select public.declarer_session('autre', '2027-10-09', 'Nuit de prière', array[(select a_m from ctx)])
$$, 'un autre rassemblement, avec son nom, le même jour qu''une session Bâtir l''Église');
select tests.deconnecter();

update ctx set s1 = (select s.id from public.session s where s.type = 'batir' and s.date = '2027-10-09');

select results_eq($$
  select j.compte, j.ministere_id, j.detail from public.journal j
   where j.action = 'session_declaree' and j.cible_id = (select s1 from ctx)
$$, $$ select admin, null::uuid, '{"type": "batir", "date": "2027-10-09", "attendus": 2}'::jsonb from ctx $$,
  'une ligne de journal session_declaree, sans ministère, avec le nombre d''attendus');

select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  select public.declarer_session('batir', '2027-10-23', null, array[(select a_m from ctx)])
$$, '42501', 'Seule l''administration de l''église déclare une session.', 'un ministère ne déclare pas de session');
select throws_ok($$ select public.modifier_session((select s1 from ctx), array[(select a_m from ctx)]) $$,
  '42501', 'Cette session n''existe pas ou vous n''y avez pas accès.', 'un ministère ne modifie pas une session');
select throws_ok($$ select public.supprimer_session((select s1 from ctx)) $$,
  '42501', 'Cette session n''existe pas ou vous n''y avez pas accès.', 'un ministère ne supprime pas une session');
select tests.deconnecter();

select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.modifier_session((select s1 from ctx), array[(select a_m from ctx)]) $$,
  'l''administration corrige les ministères attendus');
select throws_ok($$ select public.modifier_session(gen_random_uuid(), array[(select a_m from ctx)]) $$,
  '42501', 'Cette session n''existe pas ou vous n''y avez pas accès.', 'une session inconnue est refusée');
select throws_ok($$ select public.supprimer_session((select batir from ctx)) $$,
  'P0001', 'Des ministères ont déjà saisi : la session ne peut plus être supprimée.',
  'une session déjà saisie ne se supprime pas');
select tests.deconnecter();

select results_eq($$ select sa.ministere_id from public.session_attendu sa where sa.session_id = (select s1 from ctx) $$,
  $$ select a_m from ctx $$, 'les attendus sont remplacés');
select results_eq($$
  select j.detail from public.journal j where j.action = 'session_modifiee' and j.cible_id = (select s1 from ctx)
$$, $$ values ('{"attendus": [2, 1]}'::jsonb) $$, 'une ligne de journal session_modifiee : 1 attendu au lieu de 2');

select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.supprimer_session((select s1 from ctx)) $$,
  'l''administration supprime une session sans saisie');
select tests.deconnecter();

select ok(not exists (select 1 from public.session s where s.id = (select s1 from ctx))
          and not exists (select 1 from public.session_attendu sa where sa.session_id = (select s1 from ctx)),
  'la session et ses attendus sont supprimés');
select results_eq($$
  select j.compte, j.detail from public.journal j where j.action = 'session_supprimee' and j.cible_id = (select s1 from ctx)
$$, $$ select admin, '{"type": "batir", "date": "2027-10-09"}'::jsonb from ctx $$,
  'une ligne de journal session_supprimee : la session supprimée reste citée');

-- Modération : réservée à EJP Tech
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.marquer_relu('evenement', (select ev from ctx)) $$,
  '42501', 'Seul EJP Tech peut relire un texte.', 'le berger ne relit pas les textes');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'description', 'autre') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'le berger ne masque pas de texte');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'description', 'autre') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'l''administration ne masque pas de texte');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.marquer_relu('point_attention', (select p2 from ctx)) $$,
  '42501', 'Seul EJP Tech peut relire un texte.', 'un ministère ne relit pas les textes');
select tests.deconnecter();

select tests.se_connecter((select ejptech from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'priorite', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'couple (cible, champ) hors liste : refusé');
select throws_ok($$ select public.masquer_texte('compte', (select a from ctx), 'libelle', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'une table hors liste : refusée');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'description', 'inconnu') $$,
  'P0001', 'Choisissez un motif dans la liste.', 'motif hors liste : refusé');
select lives_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'description', 'nom_personne') $$,
  'EJP Tech masque la description d''un point');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'description', 'nom_personne') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'un texte déjà masqué est refusé');
select throws_ok($$ select public.masquer_texte('point_attention', (select p3 from ctx), 'description', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'un champ vide est refusé');
select lives_ok($$ select public.marquer_relu('evenement', (select ev from ctx)) $$,
  'EJP Tech relit un événement : rien à signaler');
select throws_ok($$ select public.marquer_relu('evenement', (select ev from ctx)) $$,
  'P0001', 'Ce texte a déjà été relu.', 'un texte déjà relu est refusé');
select throws_ok($$ select public.marquer_relu('point_attention', (select p2 from ctx)) $$,
  'P0001', 'Ce texte a déjà été relu.', 'un texte déjà masqué ne se relit plus');
select lives_ok($$ select public.masquer_texte('evenement', (select ev from ctx), 'titre', 'autre') $$,
  'un texte déjà relu peut encore être masqué');
select tests.deconnecter();

select is((select p.description from public.point_attention p where p.id = (select p2 from ctx)),
  '[texte masqué par EJP Tech]', 'tout le champ est remplacé');
select results_eq($$
  select m.decision, m.champ, m.motif, m.par from public.moderation m
   where m.cible = 'point_attention' and m.cible_id = (select p2 from ctx)
$$, $$ select 'masque', 'description', 'nom_personne', ejptech from ctx $$, 'une ligne de modération « masque »');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.detail from public.journal j
   where j.cible_id = (select p2 from ctx) and j.action like 'texte%'
$$, $$
  select 'texte_masque', ejptech, a_m, '{"champ": "description", "motif": "nom_personne"}'::jsonb from ctx
$$, 'une ligne de journal texte_masque : ministère qui a écrit, champ et motif, jamais le texte');
select results_eq($$
  select j.action, j.ministere_id from public.journal j where j.cible_id = (select ev from ctx) and j.action like 'texte%'
   order by j.id
$$, $$
  select 'texte_relu', a_m from ctx
  union all
  select 'texte_masque', a_m from ctx
$$, 'relecture puis masquage de l''événement : deux lignes de journal');

select * from finish();
rollback;
