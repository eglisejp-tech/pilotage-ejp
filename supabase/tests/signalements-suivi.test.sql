-- Suivi des signalements (T77, qui révise T39 ; conception du 26 octobre 2026, section 6) :
-- - le cas de Coordination rejoué (critères 1 à 7) : Reçu, « Prendre en charge », « Répondre au
--   ministère » (une question), « Répondre à EJP Tech », seconde réponse, « Oui, c'est réglé »,
--   puis tout geste refusé ; une ligne de journal par geste, avec le seul code de l'écran ;
-- - la clôture automatique après 7 jours pleins, le fuseau de Paris et l'ordre des lignes
--   (critères 8 à 10), sur des lignes antidatées par le propriétaire ;
-- - le ministère sans compte actif (14), « Clore le signalement » (15), les refus de droit (16),
--   les données personnelles (17), l'ancien site sur la nouvelle base (18), la reprise des
--   signalements déjà clos (19), la fraîcheur (20) et le masquage des réponses ;
-- - la structure : colonnes etape et ordre, fin de l'unicité, une seule fin par signalement,
--   séquence sans droit, colonnes de v_signalement (les 11 de l'ancien site, puis les 7 nouvelles).
-- La matrice des droits de chaque profil est dans rls-signalements-matrice.test.sql.
begin;

create temp table ctx as
select c.user_id as coo, c.ministere_id as coo_m,
       tests.compte('Ministère Communication') as com,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Suivi sans compte') as sc_m,
       tests.creer_ministere('Suivi automatique') as au_m
  from public.compte c
 where c.libelle = 'Ministère Coordination' and c.desactive_le is null;
alter table ctx add column sc uuid, add column au uuid,
  add column s uuid, add column r1 uuid, add column r2 uuid, add column rm uuid,
  add column s_sc uuid, add column a7 uuid, add column a8 uuid, add column ao uuid,
  add column ar uuid, add column ac uuid, add column aa uuid, add column ap uuid, add column s_dm uuid,
  add column dm_m uuid, add column dm uuid, add column fraicheur timestamptz;
update ctx set sc = tests.creer_compte('suivi-sans-compte@exemple.test', 'ministere', sc_m),
               au = tests.creer_compte('suivi-automatique@exemple.test', 'ministere', au_m);
grant select on ctx to authenticated;
-- Fraîcheur de Coordination avant tout geste (critère 20), lue comme le berger la lit.
update ctx set fraicheur = (
  select (e ->> 'derniere_saisie')::timestamptz
    from jsonb_array_elements(tests.lire(ctx.berger, 'aal2',
      'select derniere_saisie from public.v_tableau_ministeres where ministere_id = (select coo_m from ctx)')) as e);

-- L'état d'un signalement lu par un compte : statut, dernière étape, ouvert, fin, âge, délai de
-- réponse restant (date limite moins le jour de Paris) et compte actif du ministère.
create function pg_temp.etat(p_compte uuid, p_id uuid) returns jsonb language sql as $$
  select tests.lire(p_compte, 'aal2', format(
    'select statut, derniere_etape, ouvert, fin, jours_depuis, '
    || 'reponse_possible_jusquau - private.aujourdhui() as delai, compte_actif '
    || 'from public.v_signalement where id = %L', p_id))
$$;
-- Les lignes de journal d'un signalement, lues par un compte, dans l'ordre d'écriture.
create function pg_temp.journal(p_compte uuid, p_id uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(e order by (e ->> 'id')::bigint), '[]'::jsonb)
    from jsonb_array_elements(tests.lire(p_compte, 'aal2', format(
      'select id, action, detail, cible from public.journal where cible_id = %L', p_id))) as e
$$;
-- Midi, heure de Paris, il y a p_jours jours de Paris : une heure sans ambiguïté de fuseau.
create function pg_temp.midi_il_y_a(p_jours int) returns timestamptz language sql stable as $$
  select ((private.aujourdhui() - p_jours)::timestamp + time '12:00') at time zone 'Europe/Paris'
$$;

select plan(136);

select ok((select count(*) from ctx where coo is not null and coo_m is not null and com is not null
             and berger is not null and conseil is not null and admin is not null and tech is not null
             and sc is not null and au is not null and fraicheur is not null) = 1,
  'le jeu d''exemple et le contexte fournissent Coordination, Communication, les autres profils et deux ministères d''essai');

-- 0. Structure

select results_eq($$
  select column_name::text collate "default" from information_schema.columns
   where table_schema = 'public' and table_name = 'signalement_suivi' order by ordinal_position
$$, $$ values ('id'), ('signalement_id'), ('commentaire'), ('saisi_le'), ('saisi_par'), ('etape'), ('ordre') $$,
  'signalement_suivi : les colonnes du lot B7, puis etape et ordre');
select col_not_null('public', 'signalement_suivi', 'etape', 'signalement_suivi.etape est obligatoire');
select col_hasnt_default('public', 'signalement_suivi', 'etape',
  'signalement_suivi.etape n''a pas de valeur par défaut : chaque ligne dit son étape');
select is((select is_identity::text collate "default" || '/' || identity_generation::text collate "default"
             from information_schema.columns
            where table_schema = 'public' and table_name = 'signalement_suivi' and column_name = 'ordre'),
  'YES/ALWAYS', 'signalement_suivi.ordre est tiré par la base (generated always as identity)');
select is_empty($$
  select 1 from pg_constraint c
   where c.conrelid = 'public.signalement_suivi'::regclass and c.contype = 'u'
$$, 'signalement_suivi : plus d''unicité sur signalement_id (une ligne par étape)');
select ok((select indisunique and pg_get_expr(indpred, indrelid) like '%regle%' and pg_get_expr(indpred, indrelid) like '%clos%'
             from pg_index where indexrelid = 'public.signalement_suivi_une_fin'::regclass),
  'un index unique partiel garde une seule fin (regle ou clos) par signalement');
select ok(not has_sequence_privilege('authenticated', 'public.signalement_suivi_ordre_seq', 'USAGE')
          and not has_sequence_privilege('authenticated', 'public.signalement_suivi_ordre_seq', 'UPDATE')
          and not has_sequence_privilege('anon', 'public.signalement_suivi_ordre_seq', 'USAGE')
          and not has_sequence_privilege('service_role', 'public.signalement_suivi_ordre_seq', 'USAGE'),
  'la séquence d''ordre n''est ouverte à personne');
select results_eq($$
  select column_name::text collate "default" from information_schema.columns
   where table_schema = 'public' and table_name = 'v_signalement' order by ordinal_position
$$, $$ values ('id'), ('ministere_id'), ('ministere_nom'), ('ecran'), ('texte'), ('saisi_le'), ('suivi_id'),
              ('commentaire'), ('clos_le'), ('ouvert'), ('clos_recent'),
              ('statut'), ('derniere_etape'), ('statut_le'), ('jours_depuis'), ('fin'),
              ('reponse_possible_jusquau'), ('compte_actif') $$,
  'v_signalement : les 11 colonnes de l''ancien site, dans le même ordre, puis les 7 du suivi');
select function_returns('public', 'prendre_en_charge_signalement', array['uuid'], 'void',
  'prendre_en_charge_signalement(p_signalement_id) ne rend rien');
select function_returns('public', 'repondre_au_ministere', array['uuid', 'text'], 'uuid',
  'repondre_au_ministere(p_signalement_id, p_reponse) rend l''identifiant de la ligne de réponse');
select function_returns('public', 'confirmer_signalement', array['uuid'], 'void',
  'confirmer_signalement(p_signalement_id) ne rend rien');
select function_returns('public', 'repondre_a_ejp_tech', array['uuid', 'text'], 'void',
  'repondre_a_ejp_tech(p_signalement_id, p_texte) ne rend rien');
select function_returns('public', 'clore_signalement', array['uuid', 'text'], 'void',
  'clore_signalement garde sa signature (ancien site)');

-- 1. Coordination signale (critère 1) : Reçu, aucune ligne de suivi.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.signaler_difficulte('saisie_evenement',
                    'Problème au niveau de la saisie des événement dans le calendrier') $$,
  'critère 1 : Coordination envoie son signalement depuis « Ajouter un événement »');
select tests.deconnecter();
update ctx set s = (select x.id from public.signalement x
                     where x.ministere_id = ctx.coo_m and x.texte like 'Problème au niveau%'
                     order by x.saisi_le desc limit 1);

select is(pg_temp.etat((select tech from ctx), (select s from ctx)),
  '[{"statut": "recu", "derniere_etape": null, "ouvert": true, "fin": null, "jours_depuis": 0, "delai": null, "compte_actif": true}]'::jsonb,
  'critère 1 : EJP Tech lit le signalement Reçu aujourd''hui, sans fin ni date limite, ministère avec compte actif');
select is(pg_temp.etat((select coo from ctx), (select s from ctx)),
  '[{"statut": "recu", "derniere_etape": null, "ouvert": true, "fin": null, "jours_depuis": 0, "delai": null, "compte_actif": true}]'::jsonb,
  'critère 1 : Coordination le lit Reçu (groupe « En cours » de « Mes signalements »)');
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.signalement_suivi where signalement_id = (select s from ctx)'), 0,
  'critère 1 : Reçu ne porte aucune ligne de suivi');
select is(tests.lire((select coo from ctx), 'aal2',
  'select statut from public.v_signalement where ministere_id = (select coo_m from ctx) and ouvert'),
  '[{"statut": "recu"}]'::jsonb,
  'critère 1 : « Ma semaine » de Coordination lit un seul ouvert, Reçu (la ligne discrète, pas le bandeau)');

-- 2. « Prendre en charge » (critère 2).
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.prendre_en_charge_signalement((select s from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'critère 16 : le ministère ne prend pas en charge son signalement');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), 'Le ministère essaie de se répondre.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'critère 16 : le ministère ne répond pas à la place d''EJP Tech');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  'P0001', 'Ce signalement n''attend pas votre réponse.',
  'Reçu : « Oui, c''est réglé » est refusé (EJP Tech n''a pas répondu)');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.prendre_en_charge_signalement((select s from ctx)) $$,
  'critère 2 : EJP Tech prend en charge le signalement');
select throws_ok($$ select public.prendre_en_charge_signalement((select s from ctx)) $$,
  'P0001', 'Ce signalement est déjà pris en charge.',
  'critère 2 : une seconde prise en charge est refusée');
select throws_ok($$ select public.prendre_en_charge_signalement(gen_random_uuid()) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'un signalement introuvable : le refus de droit commun');
select tests.deconnecter();

select is(pg_temp.etat((select coo from ctx), (select s from ctx)),
  '[{"statut": "en_cours", "derniere_etape": "en_cours", "ouvert": true, "fin": null, "jours_depuis": 0, "delai": null, "compte_actif": true}]'::jsonb,
  'critère 2 : Coordination lit En cours (« EJP Tech s''en occupe depuis ... »)');
select is((pg_temp.journal((select coo from ctx), (select s from ctx)) -> 1) - 'id',
  '{"action": "signalement_pris_en_charge", "detail": {"ecran": "saisie_evenement"}, "cible": "signalement"}'::jsonb,
  'critère 2 : une ligne signalement_pris_en_charge, cible signalement, avec le seul code de l''écran, lue par Coordination');
select results_eq($$
  select j.compte = (select tech from ctx), j.ministere_id = (select coo_m from ctx)
    from public.journal j where j.action = 'signalement_pris_en_charge' and j.cible_id = (select s from ctx)
$$, $$ values (true, true) $$,
  'critère 2 : la ligne est au nom d''EJP Tech et au ministère du signalement');

-- 3. « Répondre au ministère » : une question (critère 3). Contrôles du texte d'abord.
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), repeat('q', 9)) $$,
  'P0001', 'Écrivez votre réponse (10 caractères au moins).', 'une réponse de 9 caractères est refusée');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), '    ') $$,
  'P0001', 'Écrivez votre réponse (10 caractères au moins).', 'une réponse vide est refusée (obligatoire)');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), null) $$,
  'P0001', 'Écrivez votre réponse (10 caractères au moins).', 'une réponse absente est refusée');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), repeat('q', 281)) $$,
  'P0001', 'La réponse dépasse 280 caractères.', 'une réponse de 281 caractères est refusée');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), 'Écrivez à equipe@exemple.test, merci.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'une adresse dans la réponse est refusée');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), '[texte masqué par EJP Tech] encore') $$,
  'P0001', 'Les crochets et « texte masqué » sont réservés à la modération.', 'les crochets sont refusés');
select lives_ok($$ select public.repondre_au_ministere((select s from ctx),
  '  Quel événement, à quelle date, et quel message s''affiche quand vous enregistrez ? MARQUEURQUESTION  ') $$,
  'critère 3 : EJP Tech répond par une question');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), 'Une seconde réponse trop tôt.') $$,
  'P0001', 'Ce signalement attend le retour du ministère.',
  'critère 3 : une seconde réponse avant le retour du ministère est refusée');
select throws_ok($$ select public.prendre_en_charge_signalement((select s from ctx)) $$,
  'P0001', 'Ce signalement attend le retour du ministère.',
  'critère 3 : « Prendre en charge » est refusé à l''étape Répondu');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'critère 16 : EJP Tech ne confirme pas à la place du ministère');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), 'EJP Tech essaie de répondre pour le ministère.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'critère 16 : EJP Tech ne répond pas à la place du ministère');
select tests.deconnecter();
update ctx set r1 = (select x.id from public.signalement_suivi x
                      where x.signalement_id = ctx.s and x.etape = 'reponse' order by x.ordre limit 1);

select is(pg_temp.etat((select tech from ctx), (select s from ctx)),
  '[{"statut": "repondu", "derniere_etape": "reponse", "ouvert": true, "fin": null, "jours_depuis": 0, "delai": 7, "compte_actif": true}]'::jsonb,
  'critère 3 : Répondu (« En attente du ministère »), réponse possible jusqu''au jour de Paris + 7');
select is(tests.lire((select tech from ctx), 'aal2',
  'select suivi_id = (select r1 from ctx) as suivi, commentaire from public.v_signalement where id = (select s from ctx)'),
  '[{"suivi": true, "commentaire": "Quel événement, à quelle date, et quel message s''affiche quand vous enregistrez ? MARQUEURQUESTION"}]'::jsonb,
  'critère 3 : suivi_id et commentaire donnent la réponse d''EJP Tech, sans espace de bord (« Réponse : » de l''ancien site)');
select is((pg_temp.journal((select tech from ctx), (select s from ctx)) -> 2) - 'id',
  '{"action": "signalement_repondu", "detail": {"ecran": "saisie_evenement"}, "cible": "signalement"}'::jsonb,
  'critère 3 : une ligne signalement_repondu, avec le seul code de l''écran');

-- 4. Coordination lit la question (critère 4).
select is(tests.lire((select coo from ctx), 'aal2',
  'select etape, commentaire is not null as avec_texte from public.signalement_suivi where signalement_id = (select s from ctx)'),
  '[{"etape": "en_cours", "avec_texte": false}, {"etape": "reponse", "avec_texte": true}]'::jsonb,
  'critère 4 : Coordination lit les deux lignes de suivi de son signalement');
select is(tests.lire((select coo from ctx), 'aal2',
  'select statut from public.v_signalement where ministere_id = (select coo_m from ctx) and ouvert'),
  '[{"statut": "repondu"}]'::jsonb,
  'critère 4 : « Ma semaine » de Coordination lit un Répondu (le bandeau)');
select is(tests.compter((select com from ctx), 'aal2',
  'select 1 from public.v_signalement where id = (select s from ctx)'), 0,
  'critère 16 : Communication ne lit pas le signalement de Coordination');
select is(tests.compter((select com from ctx), 'aal2',
  'select 1 from public.signalement_suivi where signalement_id = (select s from ctx)'), 0,
  'critère 16 : Communication ne lit pas ses lignes de suivi');
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'critère 16 : Communication ne confirme pas le signalement de Coordination');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), 'Communication essaie de répondre.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'critère 16 : Communication ne répond pas pour Coordination');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne confirme pas');
select throws_ok($$ select public.prendre_en_charge_signalement((select s from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne prend pas en charge');
select tests.se_connecter((select coo from ctx), 'aal1');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  '42501', 'Double authentification requise.', 'en aal1, Coordination ne confirme pas');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), 'Une réponse sans double authentification.') $$,
  '42501', 'Double authentification requise.', 'en aal1, Coordination ne répond pas');
select tests.deconnecter();

-- 5. « Répondre à EJP Tech » (critère 5), après les contrôles du texte (critère 17).
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), repeat('r', 9)) $$,
  'P0001', 'Écrivez votre réponse (10 caractères au moins).', 'une réponse du ministère de 9 caractères est refusée');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), '') $$,
  'P0001', 'Écrivez votre réponse (10 caractères au moins).', 'la réponse du ministère est obligatoire');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), repeat('r', 281)) $$,
  'P0001', 'La réponse dépasse 280 caractères.', 'une réponse du ministère de 281 caractères est refusée');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), 'Appelez Jean au 06 12 34 56 78') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.',
  'critère 17 : un numéro de téléphone dans la réponse du ministère est refusé');
select lives_ok($$ select public.repondre_a_ejp_tech((select s from ctx),
  'L''événement du 15 novembre ne s''enregistre pas, un message rouge s''affiche. MARQUEURRETOUR') $$,
  'critère 5 : Coordination répond à EJP Tech');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), 'Une seconde réponse du ministère.') $$,
  'P0001', 'Ce signalement n''attend pas votre réponse.',
  'critère 5 : une seconde réponse du ministère attend une réponse d''EJP Tech');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  'P0001', 'Ce signalement n''attend pas votre réponse.',
  'critère 5 : « Oui, c''est réglé » attend aussi une réponse d''EJP Tech');
select tests.deconnecter();
update ctx set rm = (select x.id from public.signalement_suivi x
                      where x.signalement_id = ctx.s and x.etape = 'reponse_ministere');

select is(pg_temp.etat((select tech from ctx), (select s from ctx)),
  '[{"statut": "en_cours", "derniere_etape": "reponse_ministere", "ouvert": true, "fin": null, "jours_depuis": 0, "delai": null, "compte_actif": true}]'::jsonb,
  'critère 5 : En cours, après la réponse du ministère (« Le ministère a répondu le ... »), dans « À traiter »');
select is(tests.lire((select tech from ctx), 'aal2',
  'select suivi_id = (select r1 from ctx) as suivi from public.v_signalement where id = (select s from ctx)'),
  '[{"suivi": true}]'::jsonb,
  'critère 5 : suivi_id reste la réponse d''EJP Tech (la réponse du ministère n''est pas « Réponse : »)');
select results_eq($$
  select j.action, j.compte = (select coo from ctx), j.ministere_id = (select coo_m from ctx), j.detail
    from public.journal j where j.action = 'signalement_reponse_ministere' and j.cible_id = (select s from ctx)
$$, $$ values ('signalement_reponse_ministere', true, true, '{"ecran": "saisie_evenement"}'::jsonb) $$,
  'critère 5 : une ligne signalement_reponse_ministere, au nom de Coordination, avec le seul code de l''écran');
select is(tests.compter((select coo from ctx), 'aal2',
  'select 1 from public.v_signalement where ministere_id = (select coo_m from ctx) and statut = ''repondu'''), 0,
  'critère 5 : plus de Répondu pour Coordination : le bandeau laisse la place à la ligne');

-- 6. Seconde réponse d'EJP Tech (critère 6).
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.repondre_au_ministere((select s from ctx),
  'Corrigé : la date du 15 novembre s''enregistre de nouveau. MARQUEURSOLUTION') $$,
  'critère 6 : EJP Tech répond de nouveau');
select tests.deconnecter();
update ctx set r2 = (select x.id from public.signalement_suivi x
                      where x.signalement_id = ctx.s and x.etape = 'reponse' order by x.ordre desc limit 1);
select is(pg_temp.etat((select coo from ctx), (select s from ctx)),
  '[{"statut": "repondu", "derniere_etape": "reponse", "ouvert": true, "fin": null, "jours_depuis": 0, "delai": 7, "compte_actif": true}]'::jsonb,
  'critère 6 : de nouveau Répondu, avec une nouvelle date limite');
select is(tests.lire((select coo from ctx), 'aal2',
  'select suivi_id = (select r2 from ctx) as suivi, commentaire from public.v_signalement where id = (select s from ctx)'),
  '[{"suivi": true, "commentaire": "Corrigé : la date du 15 novembre s''enregistre de nouveau. MARQUEURSOLUTION"}]'::jsonb,
  'critère 6 : la dernière réponse d''EJP Tech');

-- 7. « Oui, c'est réglé » (critère 7), puis tout geste refusé.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  'critère 7 : Coordination confirme que c''est réglé');
select throws_ok($$ select public.confirmer_signalement((select s from ctx)) $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 7 : une seconde confirmation est refusée');
select throws_ok($$ select public.repondre_a_ejp_tech((select s from ctx), 'Une réponse après la clôture.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 7 : répondre après la clôture est refusé');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.prendre_en_charge_signalement((select s from ctx)) $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 7 : un clos ne se reprend pas en charge');
select throws_ok($$ select public.repondre_au_ministere((select s from ctx), 'Une réponse après la clôture.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 7 : un clos ne reçoit plus de réponse');
select throws_ok($$ select public.clore_signalement((select s from ctx), 'Une clôture après la confirmation.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 7 : un clos ne se clôt pas deux fois');
select tests.deconnecter();

select is(tests.lire((select tech from ctx), 'aal2',
  'select statut, derniere_etape, ouvert, clos_recent, fin, reponse_possible_jusquau, '
  || 'clos_le = (select x.saisi_le from public.signalement_suivi x where x.signalement_id = v.id and x.etape = ''regle'') as clos_le_regle, '
  || 'statut_le = clos_le as statut_le_clos from public.v_signalement v where id = (select s from ctx)'),
  '[{"fin": "confirme", "ouvert": false, "statut": "clos", "clos_le_regle": true, "clos_recent": true, "derniere_etape": "regle", "statut_le_clos": true, "reponse_possible_jusquau": null}]'::jsonb,
  'critère 7 : Clos, confirmé par le ministère, daté de la confirmation (« Clos ces 30 derniers jours »)');
select is((select jsonb_agg(e -> 'action' order by (e ->> 'id')::bigint)
             from jsonb_array_elements(pg_temp.journal((select coo from ctx), (select s from ctx))) as e),
  '["difficulte_signalee", "signalement_pris_en_charge", "signalement_repondu", "signalement_reponse_ministere", "signalement_repondu", "signalement_regle"]'::jsonb,
  'critère 7 : Coordination lit une ligne de journal par geste, dans l''ordre');
select is((select count(*)::int from jsonb_array_elements(pg_temp.journal((select coo from ctx), (select s from ctx))) as e
            where e -> 'detail' = '{"ecran": "saisie_evenement"}'::jsonb and e ->> 'cible' = 'signalement'), 6,
  'critère 7 : chaque ligne porte la cible signalement et le seul code de l''écran');
select is_empty($$ select 1 from public.journal j where j::text ~ 'MARQUEUR(QUESTION|RETOUR|SOLUTION)' $$,
  'le journal ne recopie jamais une réponse, d''EJP Tech ou du ministère');
select is(tests.compter(p.compte, 'aal2',
  'select 1 from public.journal where cible_id = (select s from ctx)'), 0,
  format('critère 16 : %s ne lit aucune ligne de journal du signalement', p.nom))
  from (values (1, 'le berger', (select berger from ctx)), (2, 'le conseil', (select conseil from ctx)),
               (3, 'l''administration', (select admin from ctx))) as p(rang, nom, compte)
 order by p.rang;
select is(tests.compter(p.compte, 'aal2',
  'select 1 from public.signalement_suivi where signalement_id = (select s from ctx)'), 0,
  format('critère 16 : %s ne lit aucune ligne de suivi', p.nom))
  from (values (1, 'le berger', (select berger from ctx)), (2, 'le conseil', (select conseil from ctx)),
               (3, 'l''administration', (select admin from ctx))) as p(rang, nom, compte)
 order by p.rang;

-- Fraîcheur (critère 20) : confirmer et répondre ne sont pas des saisies.
select is((select (e ->> 'derniere_saisie')::timestamptz
             from jsonb_array_elements(tests.lire((select berger from ctx), 'aal2',
               'select derniere_saisie from public.v_tableau_ministeres where ministere_id = (select coo_m from ctx)')) as e),
          (select fraicheur from ctx),
  'critère 20 : la fraîcheur de Coordination ne bouge pas (signalement, réponse, confirmation)');

-- Masquage des réponses (EJP Tech) : une réponse d'EJP Tech et celle du ministère.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('signalement_suivi', (select rm from ctx), 'commentaire', 'autre') $$,
  'EJP Tech masque la réponse du ministère');
select lives_ok($$ select public.masquer_texte('signalement_suivi', (select r1 from ctx), 'commentaire', 'coordonnees') $$,
  'EJP Tech masque sa première réponse');
select tests.deconnecter();
select is(tests.lire((select coo from ctx), 'aal2',
  'select etape, commentaire from public.signalement_suivi where signalement_id = (select s from ctx) and etape in (''reponse'', ''reponse_ministere'') and commentaire like ''[%'''),
  '[{"etape": "reponse", "commentaire": "[texte masqué par EJP Tech]"}, {"etape": "reponse_ministere", "commentaire": "[texte masqué par EJP Tech]"}]'::jsonb,
  'les deux textes masqués se lisent masqués, et la ligne garde son étape');
select is(pg_temp.etat((select coo from ctx), (select s from ctx)) -> 0 ->> 'statut', 'clos',
  'le masquage ne change pas le statut');

-- 8 à 10. Clôture automatique, fuseau de Paris et ordre des lignes (fonctions pures, dates fixes).
select is(private.reponse_possible_jusquau(timestamptz '2026-11-01 21:00:00+01'), date '2026-11-08',
  'critère 8 : une réponse le dimanche 1er novembre à 21 h (Paris) laisse répondre jusqu''au dimanche 8 inclus');
select is(private.statut_signalement('reponse', timestamptz '2026-11-01 21:00:00+01', date '2026-11-08'), 'repondu',
  'critère 8 : le dimanche 8 novembre (même à 23 h 55), il est encore Répondu');
select is(private.statut_signalement('reponse', timestamptz '2026-11-01 21:00:00+01', date '2026-11-09'), 'clos',
  'critère 8 : le lundi 9 novembre (dès 0 h 05), il est Clos');
select is(private.cloture_automatique_le(timestamptz '2026-11-01 21:00:00+01'), timestamptz '2026-11-09 00:00:00+01',
  'critère 8 : la clôture automatique date de 0 h, heure de Paris, le lundi 9 novembre');
select is(private.reponse_possible_jusquau(timestamptz '2026-10-28 23:30:00+00'), date '2026-11-05',
  'critère 9 : une réponse à 0 h 30 heure de Paris le jeudi 29 octobre (23 h 30 UTC le 28) donne le 5 novembre');
select is(private.reponse_possible_jusquau(timestamptz '2026-10-28 22:30:00+00'), date '2026-11-04',
  'critère 9 : une réponse à 23 h 30 heure de Paris le 28 octobre donne le 4 novembre');
select is(private.reponse_possible_jusquau(timestamptz '2026-10-24 21:30:00+00'), date '2026-10-31',
  'critère 9 : à 23 h 30, heure d''été de Paris, le samedi 24 octobre (21 h 30 UTC), jusqu''au samedi 31 octobre');
select results_eq($$
  select private.statut_signalement(e, now(), private.aujourdhui())
    from unnest(array[null, 'en_cours', 'reponse_ministere', 'reponse', 'regle', 'clos']) with ordinality as x(e, n)
   order by n
$$, $$ values ('recu'), ('en_cours'), ('en_cours'), ('repondu'), ('clos'), ('clos') $$,
  'le statut se lit dans la dernière étape : aucune, en cours, réponse du ministère, réponse, réglé, clos');

-- Lignes antidatées par le propriétaire (aucun compte connecté : forcer_auteur garde les dates).
insert into public.signalement (id, ministere_id, ecran, texte, saisi_le, saisi_par)
select x.id, c.au_m, 'saisie_reunion', x.texte, pg_temp.midi_il_y_a(10), c.au
  from ctx c,
       (values ('77000000-0000-4000-8000-000000000007'::uuid, 'Signalement répondu il y a 7 jours.'),
               ('77000000-0000-4000-8000-000000000008'::uuid, 'Signalement répondu il y a 8 jours.'),
               ('77000000-0000-4000-8000-000000000009'::uuid, 'Signalement aux lignes désordonnées.'),
               ('77000000-0000-4000-8000-000000000010'::uuid, 'Signalement de l''ancien site, reçu.'),
               ('77000000-0000-4000-8000-000000000011'::uuid, 'Signalement de l''ancien site, en cours.'),
               ('77000000-0000-4000-8000-000000000012'::uuid, 'Signalement à transmettre à l''administration.'),
               ('77000000-0000-4000-8000-000000000013'::uuid, 'Signalement répondu, clos par l''ancien site.')) as x(id, texte);
update ctx set a7 = '77000000-0000-4000-8000-000000000007', a8 = '77000000-0000-4000-8000-000000000008',
               ao = '77000000-0000-4000-8000-000000000009', ar = '77000000-0000-4000-8000-000000000010',
               ac = '77000000-0000-4000-8000-000000000011', aa = '77000000-0000-4000-8000-000000000012',
               ap = '77000000-0000-4000-8000-000000000013';
insert into public.signalement_suivi (signalement_id, etape, commentaire, saisi_le, saisi_par)
select x.s, x.etape, x.commentaire, x.le, (select tech from ctx)
  from (values ((select a7 from ctx), 'reponse', 'Réponse d''EJP Tech il y a sept jours.', pg_temp.midi_il_y_a(7)),
               ((select a8 from ctx), 'reponse', 'Réponse d''EJP Tech il y a huit jours.', pg_temp.midi_il_y_a(8)),
               ((select ac from ctx), 'en_cours', null, pg_temp.midi_il_y_a(3)),
               ((select ap from ctx), 'reponse', 'Réponse d''EJP Tech il y a deux jours.', pg_temp.midi_il_y_a(2)))
       as x(s, etape, commentaire, le);
-- Critère 10 : la seconde ligne porte une heure plus ancienne de quelques millisecondes.
insert into public.signalement_suivi (signalement_id, etape, saisi_le, saisi_par)
select ao, 'en_cours', now(), tech from ctx;
insert into public.signalement_suivi (signalement_id, etape, commentaire, saisi_le, saisi_par)
select ao, 'reponse', 'Réponse écrite juste après, heure plus ancienne.', now() - interval '5 milliseconds', tech from ctx;

select is(pg_temp.etat((select au from ctx), (select a7 from ctx)),
  '[{"statut": "repondu", "derniere_etape": "reponse", "ouvert": true, "fin": null, "jours_depuis": 7, "delai": 0, "compte_actif": true}]'::jsonb,
  'critère 8 : une réponse d''il y a 7 jours se lit encore Répondu, avec aujourd''hui pour date limite');
select is(tests.lire((select au from ctx), 'aal2',
  'select statut, fin, ouvert, clos_recent, jours_depuis, reponse_possible_jusquau, '
  || 'clos_le = (private.aujourdhui()::timestamp at time zone ''Europe/Paris'') as clos_a_minuit, '
  || 'statut_le = clos_le as statut_le_clos from public.v_signalement where id = (select a8 from ctx)'),
  '[{"fin": "automatique", "statut": "clos", "ouvert": false, "clos_recent": true, "jours_depuis": 0, "clos_a_minuit": true, "statut_le_clos": true, "reponse_possible_jusquau": null}]'::jsonb,
  'critère 8 : une réponse d''il y a 8 jours se lit Clos sans retour, clos aujourd''hui à 0 h, heure de Paris');
select is(tests.lire((select au from ctx), 'aal2',
  'select statut, derniere_etape, statut_le = (select max(x.saisi_le) from public.signalement_suivi x where x.signalement_id = v.id and x.etape = ''reponse'') as statut_le_reponse '
  || 'from public.v_signalement v where id = (select ao from ctx)'),
  '[{"statut": "repondu", "derniere_etape": "reponse", "statut_le_reponse": true}]'::jsonb,
  'critère 10 : le statut suit l''ordre des lignes, pas leur heure');
select tests.se_connecter((select au from ctx), 'aal2');
select throws_ok($$ select public.confirmer_signalement((select a8 from ctx)) $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 8 : passé le délai, « Oui, c''est réglé » est refusé');
select throws_ok($$ select public.repondre_a_ejp_tech((select a8 from ctx), 'Une réponse après le délai.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 8 : passé le délai, « Répondre à EJP Tech » est refusé');
select lives_ok($$ select public.confirmer_signalement((select a7 from ctx)) $$,
  'critère 8 : le dernier jour, « Oui, c''est réglé » passe encore');
select lives_ok($$ select public.repondre_a_ejp_tech((select ao from ctx), 'Réponse du ministère après des lignes désordonnées.') $$,
  'critère 10 : le geste suit le même statut que la vue');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.clore_signalement((select a8 from ctx), 'Clôture d''un signalement déjà clos.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 8 : un clos sans retour ne se clôt pas de nouveau');
select throws_ok($$ select public.prendre_en_charge_signalement((select a8 from ctx)) $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 8 : un clos sans retour ne se reprend pas en charge');
select throws_ok($$ select public.repondre_au_ministere((select a8 from ctx), 'Une réponse après le délai.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'critère 8 : un clos sans retour ne reçoit plus de réponse');
select tests.deconnecter();
select is(pg_temp.etat((select au from ctx), (select a7 from ctx)) -> 0 ->> 'fin', 'confirme',
  'critère 8 : confirmé le dernier jour, il est clos par le ministère');

-- 15 et 18. « Clore le signalement » sur un Reçu, un En cours et un Répondu (aussi l'ancien site).
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.clore_signalement((select aa from ctx), 'Transmis à l''administration, merci pour le signalement.') $$,
  'critère 15 : EJP Tech clôt un Reçu avec une réponse');
select lives_ok($$ select public.clore_signalement((select ar from ctx)) $$,
  'critère 18 : l''ancien site clôt un Reçu sans réponse');
select lives_ok($$ select public.clore_signalement((select ac from ctx), null) $$,
  'critère 18 : l''ancien site clôt un En cours');
select lives_ok($$ select public.clore_signalement((select ao from ctx), '   ') $$,
  'critère 18 : l''ancien site clôt un En cours après la réponse du ministère (réponse vide : aucune)');
select lives_ok($$ select public.clore_signalement((select ap from ctx), 'Clôture d''un signalement répondu, par l''ancien site.') $$,
  'critère 18 : l''ancien site clôt encore un Répondu ouvert');
select tests.deconnecter();
select is(tests.lire((select au from ctx), 'aal2',
  'select statut, fin, commentaire, derniere_etape from public.v_signalement where id = (select aa from ctx)'),
  '[{"fin": "ejp_tech", "statut": "clos", "commentaire": "Transmis à l''administration, merci pour le signalement.", "derniere_etape": "clos"}]'::jsonb,
  'critère 15 : le ministère lit « Clos par EJP Tech » et la réponse');
select is(tests.lire((select tech from ctx), 'aal2',
  'select x.etape, x.commentaire from public.signalement_suivi x where x.signalement_id in (select ar from ctx union all select ac from ctx) and x.etape = ''clos'''),
  '[{"etape": "clos", "commentaire": null}, {"etape": "clos", "commentaire": null}]'::jsonb,
  'critère 18 : la clôture de l''ancien site écrit une ligne clos, sans réponse');
select is(tests.lire((select tech from ctx), 'aal2',
  'select ouvert, statut, fin from public.v_signalement where id in (select ar from ctx union all select ac from ctx union all select ao from ctx)'),
  '[{"fin": "ejp_tech", "ouvert": false, "statut": "clos"}, {"fin": "ejp_tech", "ouvert": false, "statut": "clos"}, {"fin": "ejp_tech", "ouvert": false, "statut": "clos"}]'::jsonb,
  'critère 18 : ouvert devient faux, comme l''ancien site l''attend');
select is(tests.lire((select tech from ctx), 'aal2',
  'select statut, fin, commentaire, suivi_id = (select x.id from public.signalement_suivi x where x.signalement_id = v.id and x.etape = ''clos'') as suivi_clos '
  || 'from public.v_signalement v where id = (select ap from ctx)'),
  '[{"fin": "ejp_tech", "statut": "clos", "suivi_clos": true, "commentaire": "Clôture d''un signalement répondu, par l''ancien site."}]'::jsonb,
  'critère 18 : un Répondu clos par l''ancien site se lit Clos par EJP Tech, avec la réponse de clôture');
select results_eq($$
  select j.action, j.detail from public.journal j where j.cible_id in (select aa from ctx union all select ar from ctx) order by j.detail ->> 'avec_commentaire'
$$, $$ values ('signalement_clos', '{"ecran": "saisie_reunion", "avec_commentaire": false}'::jsonb),
              ('signalement_clos', '{"ecran": "saisie_reunion", "avec_commentaire": true}'::jsonb) $$,
  'critère 15 : la clôture garde sa ligne de journal signalement_clos');

-- 14. Ministère sans compte actif : « Clore le signalement » est le seul geste.
select tests.se_connecter((select sc from ctx), 'aal2');
select lives_ok($$ select public.signaler_difficulte('saisie_mois', 'Le mois de septembre ne se propose plus.') $$,
  'critère 14 : le ministère signale avant la désactivation de son compte');
select tests.deconnecter();
update ctx set s_sc = (select x.id from public.signalement x where x.ministere_id = ctx.sc_m);
update public.compte set desactive_le = now() where user_id = (select sc from ctx);
select is(pg_temp.etat((select tech from ctx), (select s_sc from ctx)) -> 0 -> 'compte_actif', 'false'::jsonb,
  'critère 14 : EJP Tech lit que ce ministère n''a plus de compte actif');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.repondre_au_ministere((select s_sc from ctx), 'Une réponse que personne ne lirait.') $$,
  'P0001', 'Ce ministère n''a plus de compte actif.', 'critère 14 : « Répondre au ministère » est refusé');
select lives_ok($$ select public.clore_signalement((select s_sc from ctx), 'Ministère sans compte actif, signalement clos.') $$,
  'critère 14 : « Clore le signalement » avec une réponse passe');
select tests.deconnecter();
select is(tests.lire((select tech from ctx), 'aal2',
  'select statut, fin from public.v_signalement where id = (select s_sc from ctx)'),
  '[{"fin": "ejp_tech", "statut": "clos"}]'::jsonb,
  'critère 14 : Clos par EJP Tech');
-- Un ministère désactivé dont le compte reste actif : personne ne lirait la réponse non plus.
update ctx set dm_m = tests.creer_ministere('Suivi ministère désactivé');
update ctx set dm = tests.creer_compte('suivi-desactive@exemple.test', 'ministere', dm_m);
select tests.se_connecter((select dm from ctx), 'aal2');
select lives_ok($$ select public.signaler_difficulte('autre', 'Le formulaire ne se propose plus du tout.') $$,
  'critère 14 : un ministère signale avant sa désactivation');
select tests.deconnecter();
update ctx set s_dm = (select x.id from public.signalement x where x.ministere_id = ctx.dm_m);
update public.ministere set desactive_le = now() where id = (select dm_m from ctx);
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.repondre_au_ministere((select s_dm from ctx), 'Une réponse à un ministère désactivé.') $$,
  'P0001', 'Ce ministère n''a plus de compte actif.', 'critère 14 : un ministère désactivé ne reçoit pas de réponse, même avec un compte actif');
select tests.deconnecter();
select is(pg_temp.etat((select tech from ctx), (select s_dm from ctx)) -> 0 -> 'compte_actif', 'false'::jsonb,
  'critère 14 : la vue dit aussi qu''il n''a plus de compte actif');

-- 19. Reprise : le signalement clos du jeu d'exemple (seed/43) garde sa réponse.
select is(tests.lire((select tech from ctx), 'aal2',
  'select statut, fin, derniere_etape, commentaire, ouvert from public.v_signalement where id = ''43000000-0000-4000-8000-000000000002'''),
  '[{"fin": "ejp_tech", "ouvert": false, "statut": "clos", "commentaire": "Réglé avec le ministère, le champ attendait un nombre entier.", "derniere_etape": "clos"}]'::jsonb,
  'critère 19 : un signalement clos avant le suivi se lit Clos par EJP Tech, avec sa réponse');
select is(tests.lire((select tech from ctx), 'aal2',
  'select statut, fin, ouvert from public.v_signalement where id = ''43000000-0000-4000-8000-000000000001'''),
  '[{"fin": null, "ouvert": true, "statut": "recu"}]'::jsonb,
  'critère 19 : un signalement ouvert avant le suivi se lit Reçu');

-- Contraintes de la base, même au propriétaire.
select throws_ok($$ insert into public.signalement_suivi (signalement_id, etape, saisi_par) select a7, 'inconnue', tech from ctx $$,
  '23514', null, 'la base refuse une étape hors liste');
select set_eq($$
  select (regexp_matches(pg_get_constraintdef(c.oid), '''([a-z_]+)''', 'g'))[1]
    from pg_constraint c
   where c.conrelid = 'public.signalement_suivi'::regclass and c.conname = 'signalement_suivi_etape_check'
$$, $$ values ('en_cours'), ('reponse'), ('regle'), ('reponse_ministere'), ('clos') $$,
  'les cinq étapes du vocabulaire fixé, rien d''autre');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, saisi_par) select a7, tech from ctx $$,
  '23502', null, 'la base refuse une ligne sans étape');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, etape, saisi_par) select ar, 'reponse', tech from ctx $$,
  '23514', null, 'la base refuse une réponse sans texte');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, etape, saisi_par) select ar, 'reponse_ministere', tech from ctx $$,
  '23514', null, 'la base refuse une réponse du ministère sans texte');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, etape, commentaire, saisi_par) select ar, 'en_cours', 'Un texte de prise en charge.', tech from ctx $$,
  '23514', null, 'la base refuse un texte sur une prise en charge');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, etape, commentaire, saisi_par) select ar, 'regle', 'Un texte sur une confirmation.', tech from ctx $$,
  '23514', null, 'la base refuse un texte sur une confirmation');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, etape, saisi_par) select ar, 'clos', tech from ctx $$,
  '23505', null, 'la base refuse une seconde fin (une seule ligne regle ou clos par signalement)');
select throws_ok($$ insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
                    select now(), tech, au_m, 'signalement_repondu', 'point_attention', a7, '{}' from ctx $$,
  '23514', null, 'la base refuse une ligne de suivi de signalement dont la cible n''est pas signalement');
select throws_ok($$ insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
                    select now(), tech, au_m, 'signalement_regle', null, null, '{}' from ctx $$,
  '23514', null, 'la base refuse une ligne de suivi de signalement sans cible');

select * from finish();
rollback;
