-- Signalements (lot B7 ; docs/plan-etape-4.md, section 4, « B7 » ; contrat-etape-4.md,
-- sections 1, 4, 5 et 7 ; docs/decisions.md, T39) : tables, signaler_difficulte,
-- clore_signalement, journal sans texte, fraîcheur inchangée, masquage et relecture des deux
-- textes, et le couple (precision_sensible, texte) de B8 toujours masquable après B7.
-- Les droits de chaque profil sont dans rls-signalements-matrice.test.sql.
begin;

create temp table ctx as
select tests.creer_ministere('Signalements A') as a_m,
       tests.creer_ministere('Signalements désactivé') as d_m,
       tests.compte('Berger') as berger,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column d uuid,
  add column s1 uuid, add column s2 uuid, add column s3 uuid,
  add column x1 uuid, add column x2 uuid, add column x3 uuid,
  add column v1 uuid, add column v2 uuid,
  add column fraicheur timestamptz, add column precision uuid;
update ctx set a = tests.creer_compte('signalements-a@exemple.test', 'ministere', a_m),
               d = tests.creer_compte('signalements-d@exemple.test', 'ministere', d_m);
update public.ministere set desactive_le = now() where id = (select d_m from ctx);

-- Une saisie de A il y a deux jours (ligne de journal écrite comme par un trigger) : sa
-- fraîcheur, que les signalements ne doivent pas changer.
insert into public.journal (le, compte, ministere_id, action, detail)
select now() - interval '2 days', c.a, c.a_m, 'reunion_saisie', '{}' from ctx c;
update ctx set fraicheur = now() - interval '2 days',
               precision = (select p.id from public.precision_sensible p order by p.saisi_le, p.id limit 1);
grant select on ctx to authenticated;

select plan(69);

select ok((select count(*) from ctx where a is not null and d is not null and berger is not null
             and tech is not null and precision is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes et une précision de B8 (seed/44)');

-- 1. Structure
select has_table('public', 'signalement', 'la table signalement existe');
select has_table('public', 'signalement_suivi', 'la table signalement_suivi existe');
select results_eq($$
  select column_name::text collate "default" from information_schema.columns
   where table_schema = 'public' and table_name = 'signalement' order by ordinal_position
$$, $$ values ('id'), ('ministere_id'), ('ecran'), ('texte'), ('saisi_le'), ('saisi_par') $$,
  'signalement : les colonnes du contrat, dans l''ordre');
select results_eq($$
  select column_name::text collate "default" from information_schema.columns
   where table_schema = 'public' and table_name = 'signalement_suivi' order by ordinal_position
$$, $$ values ('id'), ('signalement_id'), ('commentaire'), ('saisi_le'), ('saisi_par') $$,
  'signalement_suivi : les colonnes du contrat, dans l''ordre');
select function_returns('public', 'signaler_difficulte', array['text', 'text'], 'uuid',
  'signaler_difficulte(p_ecran, p_texte) rend l''identifiant du signalement');
select function_returns('public', 'clore_signalement', array['uuid', 'text'], 'void',
  'clore_signalement(p_signalement_id, p_commentaire) ne rend rien');
select set_eq($$ select unnest(private.ecrans_signalement()) $$, $$ values ('saisie_dimanche'), ('saisie_mois'), ('saisie_session'), ('saisie_fij'),
              ('saisie_fij_statistiques'), ('saisie_evenement'), ('saisie_reunion'), ('autre') $$,
  'signalement.ecran : les 8 codes du contrat, rien d''autre (private.ecrans_signalement())');
select ok((select pg_get_constraintdef(c.oid) like '%ecrans_signalement()%'
             from pg_constraint c
            where c.conrelid = 'public.signalement'::regclass and c.conname = 'signalement_ecran_check'),
  'le check de signalement.ecran lit la même liste que signaler_difficulte (une seule source)');
select is((select count(*)::int from public.signalement s
             join public.ministere m on m.id = s.ministere_id
            where m.nom = 'Communication'
              and s.id in ('43000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002')), 2,
  'jeu d''exemple (seed/43) : deux signalements de Communication');
select is((select count(*)::int from public.signalement s
            where s.id in ('43000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002')
              and not exists (select 1 from public.signalement_suivi x where x.signalement_id = s.id)), 1,
  'jeu d''exemple (seed/43) : un seul des deux est encore ouvert, l''autre est clos');

-- 2. Signaler une difficulté (ministère A)
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.signaler_difficulte('autre', repeat('x', 9)) $$,
  'P0001', 'Décrivez la difficulté (10 caractères au moins).', 'un texte de 9 caractères est refusé');
select throws_ok($$ select public.signaler_difficulte('autre', '   ' || repeat('x', 9) || '   ') $$,
  'P0001', 'Décrivez la difficulté (10 caractères au moins).', 'la longueur se compte après trim');
select throws_ok($$ select public.signaler_difficulte('autre', repeat('x', 281)) $$,
  'P0001', 'Le signalement dépasse 280 caractères.', 'un texte de 281 caractères est refusé');
select throws_ok($$ select public.signaler_difficulte('saisie_inconnue', 'Le formulaire ne s''ouvre pas.') $$,
  'P0001', 'Choisissez l''écran concerné dans la liste.', 'un code d''écran hors liste est refusé');
select throws_ok($$ select public.signaler_difficulte(null, 'Le formulaire ne s''ouvre pas.') $$,
  'P0001', 'Choisissez l''écran concerné dans la liste.', 'un écran absent est refusé');
select throws_ok($$ select public.signaler_difficulte('autre', 'Écrivez à equipe@exemple.test pour la date.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un email dans le texte est refusé');
select throws_ok($$ select public.signaler_difficulte('autre', 'Appelez le 06 12 34 56 78 pour la date.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un numéro de téléphone dans le texte est refusé');
select throws_ok($$ select public.signaler_difficulte('autre', 'Mme Durand ne peut pas poser la date.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'une civilité suivie d''un nom est refusée');
select throws_ok($$ select public.signaler_difficulte('autre', '[texte masqué par EJP Tech] encore') $$,
  'P0001', 'Les crochets et « texte masqué » sont réservés à la modération.',
  'les crochets réservés à la modération sont refusés');
select lives_ok($$ select public.signaler_difficulte('saisie_evenement', '  Le calendrier refuse la date MARQUEURSIGNAL du culte.  ') $$,
  'un ministère actif signale une difficulté sur la saisie d''un événement');
select lives_ok($$ select public.signaler_difficulte('saisie_mois', repeat('x', 10)) $$,
  'un texte de 10 caractères est accepté');
select lives_ok($$ select public.signaler_difficulte('autre', repeat('y', 280)) $$,
  'un texte de 280 caractères est accepté');
select tests.deconnecter();

update ctx set
  s1 = (select s.id from public.signalement s where s.ministere_id = ctx.a_m and s.ecran = 'saisie_evenement'),
  s2 = (select s.id from public.signalement s where s.ministere_id = ctx.a_m and s.ecran = 'saisie_mois'),
  s3 = (select s.id from public.signalement s where s.ministere_id = ctx.a_m and s.ecran = 'autre');

select results_eq($$
  select s.ecran, s.texte, s.saisi_par = (select a from ctx)
    from public.signalement s where s.ministere_id = (select a_m from ctx) order by s.ecran
$$, $$ values ('autre', repeat('y', 280), true),
              ('saisie_evenement', 'Le calendrier refuse la date MARQUEURSIGNAL du culte.', true),
              ('saisie_mois', repeat('x', 10), true) $$,
  'trois signalements, au nom du compte du ministère, texte sans espace de bord');
select results_eq($$
  select j.action, j.compte = (select a from ctx), j.ministere_id = (select a_m from ctx), j.cible, j.detail
    from public.journal j
   where j.cible_id in (select s1 from ctx union all select s2 from ctx union all select s3 from ctx)
   order by j.detail ->> 'ecran'
$$, $$ values ('difficulte_signalee', true, true, 'signalement', '{"ecran": "autre"}'::jsonb),
              ('difficulte_signalee', true, true, 'signalement', '{"ecran": "saisie_evenement"}'::jsonb),
              ('difficulte_signalee', true, true, 'signalement', '{"ecran": "saisie_mois"}'::jsonb) $$,
  'une ligne de journal difficulte_signalee par envoi, cible signalement, avec le seul code de l''écran');
select is((select count(*)::int from public.journal j
            where j.action = 'difficulte_signalee' and j.ministere_id = (select a_m from ctx)), 3,
  'aucune ligne de journal pour un envoi refusé');
select is_empty($$ select 1 from public.journal j where j::text like '%MARQUEURSIGNAL%' $$,
  'le journal ne recopie jamais le texte du signalement');
select is((select (e ->> 'derniere_saisie')::timestamptz
             from jsonb_array_elements(tests.lire((select berger from ctx), 'aal2',
               'select derniere_saisie from public.v_tableau_ministeres where ministere_id = (select a_m from ctx)')) as e),
          (select fraicheur from ctx),
  'fraîcheur de A inchangée par ses signalements (dernière saisie il y a deux jours)');

-- Refus : EJP Tech, le berger, un ministère désactivé, une session aal1.
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.signaler_difficulte('autre', 'EJP Tech essaie de signaler.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'EJP Tech ne signale pas');
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.signaler_difficulte('autre', 'Le berger essaie de signaler.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le berger ne signale pas');
select tests.se_connecter((select d from ctx), 'aal2');
select throws_ok($$ select public.signaler_difficulte('autre', 'Un ministère désactivé essaie.') $$,
  '42501', 'Compte inactif ou inconnu.', 'un ministère désactivé ne signale pas');
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$ select public.signaler_difficulte('autre', 'Une session sans double authentification.') $$,
  '42501', 'Double authentification requise.', 'une session aal1 ne signale pas');

-- 3. Clore un signalement
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.clore_signalement((select s1 from ctx), 'Le ministère essaie de clore.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'le ministère auteur ne clôt pas son signalement');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.clore_signalement((select s1 from ctx), repeat('c', 9)) $$,
  'P0001', 'Le commentaire fait 10 caractères au moins, ou reste vide.', 'un commentaire de 9 caractères est refusé');
select throws_ok($$ select public.clore_signalement((select s1 from ctx), repeat('c', 281)) $$,
  'P0001', 'Le commentaire dépasse 280 caractères.', 'un commentaire de 281 caractères est refusé');
select throws_ok($$ select public.clore_signalement((select s1 from ctx), 'Écrit à equipe@exemple.test hier.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un email dans le commentaire est refusé');
select throws_ok($$ select public.clore_signalement(gen_random_uuid(), 'Commentaire d''un signalement absent.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un signalement inconnu est refusé');
select lives_ok($$ select public.clore_signalement((select s1 from ctx), 'Transmis à l''administration MARQUEURCLOTURE.') $$,
  'EJP Tech clôt un signalement avec un commentaire');
select throws_ok($$ select public.clore_signalement((select s1 from ctx), 'Seconde clôture du signalement.') $$,
  'P0001', 'Ce signalement est déjà clos.', 'une seconde clôture est refusée');
select lives_ok($$ select public.clore_signalement((select s2 from ctx)) $$,
  'EJP Tech clôt un signalement sans commentaire (paramètre par défaut)');
select lives_ok($$ select public.clore_signalement((select s3 from ctx), '    ') $$,
  'un commentaire fait d''espaces vaut une clôture sans commentaire');
select tests.deconnecter();

update ctx set
  x1 = (select x.id from public.signalement_suivi x where x.signalement_id = ctx.s1),
  x2 = (select x.id from public.signalement_suivi x where x.signalement_id = ctx.s2),
  x3 = (select x.id from public.signalement_suivi x where x.signalement_id = ctx.s3);

select results_eq($$
  select x.signalement_id = (select s1 from ctx), x.commentaire, x.saisi_par = (select tech from ctx)
    from public.signalement_suivi x
   where x.id in (select x1 from ctx union all select x2 from ctx union all select x3 from ctx)
   order by x.commentaire nulls last, x.signalement_id = (select s2 from ctx) desc
$$, $$ values (true, 'Transmis à l''administration MARQUEURCLOTURE.', true),
              (false, null::text, true), (false, null::text, true) $$,
  'une clôture par signalement, au nom d''EJP Tech, commentaire facultatif');
select results_eq($$
  select j.compte = (select tech from ctx), j.ministere_id = (select a_m from ctx), j.cible, j.detail
    from public.journal j
   where j.action = 'signalement_clos'
     and j.cible_id in (select s1 from ctx union all select s2 from ctx union all select s3 from ctx)
   order by j.detail ->> 'ecran'
$$, $$ values (true, true, 'signalement', '{"ecran": "autre", "avec_commentaire": false}'::jsonb),
              (true, true, 'signalement', '{"ecran": "saisie_evenement", "avec_commentaire": true}'::jsonb),
              (true, true, 'signalement', '{"ecran": "saisie_mois", "avec_commentaire": false}'::jsonb) $$,
  'une ligne signalement_clos par clôture, au ministère du signalement, avec l''écran et avec_commentaire');
select is_empty($$ select 1 from public.journal j where j::text like '%MARQUEURCLOTURE%' $$,
  'le journal ne recopie jamais le commentaire de clôture');
select is((select (e ->> 'derniere_saisie')::timestamptz
             from jsonb_array_elements(tests.lire((select berger from ctx), 'aal2',
               'select derniere_saisie from public.v_tableau_ministeres where ministere_id = (select a_m from ctx)')) as e),
          (select fraicheur from ctx),
  'fraîcheur de A inchangée par les clôtures d''EJP Tech');
select is(tests.compter((select a from ctx), 'aal2',
  'select 1 from public.signalement_suivi where commentaire = ''Transmis à l''''administration MARQUEURCLOTURE.'''), 1,
  'le ministère auteur lit le commentaire de clôture d''EJP Tech');

-- 4. Masquage et relecture des deux textes ; le couple de B8 marche toujours.
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('signalement', (select s1 from ctx), 'texte', 'nom_personne') $$,
  'EJP Tech masque le texte d''un signalement');
select lives_ok($$ select public.masquer_texte('signalement_suivi', (select x1 from ctx), 'commentaire', 'coordonnees') $$,
  'EJP Tech masque le commentaire d''une clôture');
select throws_ok($$ select public.masquer_texte('signalement', (select s1 from ctx), 'texte', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'un texte déjà masqué ne se masque pas deux fois');
select throws_ok($$ select public.masquer_texte('signalement_suivi', (select x2 from ctx), 'commentaire', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'une clôture sans commentaire n''a rien à masquer');
select throws_ok($$ select public.masquer_texte('signalement', (select s2 from ctx), 'ecran', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'le code de l''écran ne se masque pas');
select lives_ok($$ select public.marquer_relu('signalement', (select s2 from ctx)) $$,
  'EJP Tech relit un signalement');
select throws_ok($$ select public.marquer_relu('signalement_suivi', (select x2 from ctx)) $$,
  'P0001', 'Ce texte n''existe pas ou ne contient aucun champ libre.', 'une clôture sans commentaire ne se relit pas');
select lives_ok($$ select public.marquer_relu('precision_sensible', (select precision from ctx)) $$,
  'après B7, EJP Tech relit toujours une précision (couple de B8)');
select lives_ok($$ select public.masquer_texte('precision_sensible', (select precision from ctx), 'texte', 'autre') $$,
  'après B7, EJP Tech masque toujours une précision (couple de B8)');
select tests.deconnecter();

select results_eq($$
  select (select s.texte from public.signalement s where s.id = (select s1 from ctx)),
         (select x.commentaire from public.signalement_suivi x where x.id = (select x1 from ctx)),
         (select p.texte from public.precision_sensible p where p.id = (select precision from ctx))
$$, $$ values ('[texte masqué par EJP Tech]', '[texte masqué par EJP Tech]', '[texte masqué par EJP Tech]') $$,
  'le texte, le commentaire et la précision masqués deviennent le texte de la modération');
select results_eq($$
  select j.action, j.cible, j.ministere_id = (select a_m from ctx), j.detail
    from public.journal j
   where j.action in ('texte_masque', 'texte_relu')
     and j.cible_id in (select s1 from ctx union all select s2 from ctx union all select x1 from ctx)
   order by j.action, j.cible
$$, $$ values ('texte_masque', 'signalement', true, '{"champ": "texte", "motif": "nom_personne"}'::jsonb),
              ('texte_masque', 'signalement_suivi', true, '{"champ": "commentaire", "motif": "coordonnees"}'::jsonb),
              ('texte_relu', 'signalement', true, '{}'::jsonb) $$,
  'journal : texte_masque et texte_relu au ministère du signalement (clôture comprise), sans texte');
select is_empty($$
  select 'signalement' from public.signalement x where x::text like '%MARQUEUR%'
  union all select 'signalement_suivi' from public.signalement_suivi x where x::text like '%MARQUEUR%'
  union all select 'journal' from public.journal x where x::text like '%MARQUEUR%'
  union all select 'moderation' from public.moderation x where x::text like '%MARQUEUR%'
$$, 'une fois masqués, le texte et le commentaire ne laissent aucune trace');
select results_eq($$
  select m.decision from public.moderation m
   where m.cible = 'precision_sensible' and m.cible_id = (select precision from ctx) order by m.decision
$$, $$ values ('masque'), ('rien_a_signaler') $$,
  'la précision de B8 est relue puis masquée : deux décisions de modération');
select is(tests.lire((select a from ctx), 'aal2',
  'select cible_texte from public.v_journal where action = ''texte_masque'' and cible = ''signalement'' and cible_id = (select s1 from ctx)'),
  '[{"cible_texte": "saisie_evenement"}]'::jsonb,
  'le ministère auteur lit la ligne texte_masque de son signalement, avec le code de l''écran');

-- 5. Contraintes de la base, même au propriétaire (saisi_par donné : aucun compte connecté).
select throws_ok($$ insert into public.signalement (ministere_id, ecran, texte, saisi_par)
                    select a_m, 'inconnu', 'Texte d''un écran inconnu.', a from ctx $$,
  '23514', null, 'la base refuse un code d''écran hors liste');
select throws_ok($$ insert into public.signalement (ministere_id, ecran, texte, saisi_par)
                    select a_m, 'autre', 'Court.', a from ctx $$,
  '23514', null, 'la base refuse un texte de moins de 10 caractères');
select throws_ok($$ insert into public.signalement (ministere_id, ecran, texte, saisi_par)
                    select a_m, 'autre', '  Texte avec des espaces de bord.  ', a from ctx $$,
  '23514', null, 'la base refuse un texte avec des espaces de bord');
select throws_ok($$ insert into public.signalement_suivi (signalement_id, saisi_par) select s1, tech from ctx $$,
  '23505', null, 'la base refuse une seconde clôture');
select throws_ok($$ with n as (insert into public.signalement (ministere_id, ecran, texte, saisi_par)
                               select a_m, 'autre', 'Signalement d''essai des contraintes.', a from ctx returning id)
                    insert into public.signalement_suivi (signalement_id, commentaire, saisi_par)
                    select n.id, 'Court.', (select tech from ctx) from n $$,
  '23514', null, 'la base refuse un commentaire de moins de 10 caractères');

-- 6. v_signalement : ouvert et clos_recent (30 jours, heure de Paris). Trois signalements de A :
-- s1 (clos à l'instant), un ouvert d'hier, un ancien clos il y a 40 jours (insérés par le
-- propriétaire, qui garde les dates données).
with n as (
  insert into public.signalement (ministere_id, ecran, texte, saisi_le, saisi_par)
  select a_m, 'saisie_reunion', 'Signalement ouvert de la vue.', now() - interval '1 day', a from ctx
  returning id)
update ctx set v1 = (select id from n);
with n as (
  insert into public.signalement (ministere_id, ecran, texte, saisi_le, saisi_par)
  select a_m, 'saisie_session', 'Signalement ancien de la vue.', now() - interval '50 days', a from ctx
  returning id),
x as (
  insert into public.signalement_suivi (signalement_id, saisi_le, saisi_par)
  select n.id, now() - interval '40 days', (select tech from ctx) from n)
update ctx set v2 = (select id from n);

select results_eq($$
  select column_name::text collate "default" from information_schema.columns
   where table_schema = 'public' and table_name = 'v_signalement' order by ordinal_position
$$, $$ values ('id'), ('ministere_id'), ('ministere_nom'), ('ecran'), ('texte'), ('saisi_le'), ('suivi_id'),
              ('commentaire'), ('clos_le'), ('ouvert'), ('clos_recent') $$,
  'v_signalement : les colonnes annoncées à E8, dans l''ordre');
select is(tests.lire((select tech from ctx), 'aal2',
  'select ouvert, clos_recent from public.v_signalement where id in (select s1 from ctx union all select v1 from ctx union all select v2 from ctx)'),
  '[{"ouvert": false, "clos_recent": false}, {"ouvert": false, "clos_recent": true}, {"ouvert": true, "clos_recent": false}]'::jsonb,
  'EJP Tech : v_signalement donne clos il y a 40 jours, clos à l''instant, ouvert (lignes triées par tests.lire)');
select is(tests.lire((select a from ctx), 'aal2',
  'select ouvert, clos_recent from public.v_signalement where id in (select s1 from ctx union all select v1 from ctx union all select v2 from ctx)'),
  '[{"ouvert": false, "clos_recent": false}, {"ouvert": false, "clos_recent": true}, {"ouvert": true, "clos_recent": false}]'::jsonb,
  'le ministère auteur lit les mêmes trois lignes de v_signalement');
select is(tests.lire((select a from ctx), 'aal2',
  'select ministere_nom, commentaire is not null as avec_commentaire from public.v_signalement where id = (select s1 from ctx)'),
  '[{"ministere_nom": "Signalements A", "avec_commentaire": true}]'::jsonb,
  'v_signalement donne le nom du ministère et le commentaire de la clôture (masqué : le texte de la modération)');

select * from finish();
rollback;
