-- Journal et modération du domaine « points et traçabilité » (BRIEF, section 3, règles 9 et
-- 10, section 6, « Journal », section 7, matrice des droits et « Tests obligatoires ») : le
-- journal est écrit par les triggers et les fonctions, avec les bons codes d'action et sans
-- texte libre, et personne ne le modifie ; la modération, réservée à EJP Tech, remplace le
-- seul champ visé et écrit une ligne de moderation et une ligne de journal ; EJP Tech lit les
-- textes libres (file de relecture) mais aucun chiffre.
begin;

select plan(73);

-- Jeu d'essai : deux ministères et un compte par profil (tests.creer_compte désactive le
-- berger du jeu d'exemple dans cette transaction).
create temp table ctx as
select tests.creer_ministere('Journal points A') as a_m,
       tests.creer_ministere('Journal points B') as b_m;
alter table ctx add column a uuid, add column b uuid, add column berger uuid, add column conseil uuid,
  add column admin uuid, add column tech uuid, add column pt1 uuid, add column pt2 uuid,
  add column suivi1 uuid, add column suivi2 uuid, add column ev uuid, add column reu uuid;
update ctx set a = tests.creer_compte('journal-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('journal-b@exemple.test', 'ministere', b_m),
               berger = tests.creer_compte('journal-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('journal-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('journal-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('journal-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

-- Écritures du jeu d'essai, une instruction chacune : A crée un point qui mentionne B et le
-- passe « En cours », crée un deuxième point, ajoute un événement, déclare sa prochaine
-- réunion, saisit un chiffre, puis met à jour l'événement (deux lignes d'état en un envoi) ;
-- B marque le premier point traité, le berger le deuxième, chacun avec un commentaire.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.creer_point('Journal point 1', 'Description libre du point', 'Action libre du point', 'urgente',
    private.aujourdhui() + 3, array[(select b_m from ctx)])
$$, 'jeu d''essai : A crée un point qui mentionne B');
select tests.deconnecter();

update ctx set pt1 = (select p.id from public.point_attention p where p.titre = 'Journal point 1');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select pt1 from ctx), 'en_cours') $$,
  'jeu d''essai : A passe le point « En cours »');
select lives_ok($$ select public.creer_point('Journal point 2', 'Deuxième description libre', null, 'normale', null, '{}') $$,
  'jeu d''essai : A crée un deuxième point');
select lives_ok($$ select public.ajouter_evenement('Journal événement libre', private.aujourdhui() + 8, 'brouillon') $$,
  'jeu d''essai : A ajoute un événement');
select lives_ok($$
  insert into public.reunion (ministere_id, date, heure, objet, decision_attendue)
  select ctx.a_m, private.aujourdhui() + 4, '19:30', 'Objet libre de réunion', 'Décision libre attendue' from ctx
$$, 'jeu d''essai : A déclare sa prochaine réunion, avec un objet et une décision attendue');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select i.id, ctx.a_m, private.dimanche_reference(), 12 from public.indicateur i cross join ctx where i.code = 'service'
$$, 'jeu d''essai : A saisit un chiffre du dimanche');
select tests.deconnecter();

update ctx set pt2 = (select p.id from public.point_attention p where p.titre = 'Journal point 2'),
               ev = (select e.id from public.evenement e where e.titre = 'Journal événement libre'),
               reu = (select r.id from public.reunion r where r.objet = 'Objet libre de réunion');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ctx.ev, v.jour, v.statut from ctx
  cross join (values (private.aujourdhui() + 9, 'preparation'::public.statut_evenement),
                     (private.aujourdhui() + 10, 'valide'::public.statut_evenement)) as v(jour, statut)
$$, 'jeu d''essai : A met à jour l''événement, deux lignes d''état dans un seul envoi');
select tests.deconnecter();
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select pt1 from ctx), 'Commentaire libre du ministère mentionné') $$,
  'jeu d''essai : B marque le premier point traité, avec un commentaire');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select pt2 from ctx), 'Commentaire libre du berger') $$,
  'jeu d''essai : le berger marque le deuxième point traité, avec un commentaire');
select tests.deconnecter();

update ctx set suivi1 = (select s.id from public.point_suivi s where s.point_id = ctx.pt1 and s.statut = 'traite'),
               suivi2 = (select s.id from public.point_suivi s where s.point_id = ctx.pt2 and s.statut = 'traite');

select ok((select count(*) from ctx where pt1 is not null and pt2 is not null and suivi1 is not null
             and suivi2 is not null and ev is not null and reu is not null) = 1,
  'le jeu d''essai a ses deux points, leurs traitements, son événement et sa réunion');

-- Objets du jeu d'essai qui portent des textes libres.
create temp view objets as
select unnest(array[pt1, pt2, suivi1, suivi2, ev, reu]) as id from ctx;
grant select on objets to authenticated;

-- Journal : une ligne par écriture, écrite par les triggers (événement, réunion) et par les
-- fonctions (points), avec le compte de l'auteur, le ministère créateur, et un detail fait de
-- codes, de dates et d'identifiants.
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.cible_id, j.detail from public.journal j
   where j.cible_id in (select id from objets) order by j.id
$$, $$
  select 'point_cree', a, a_m, 'point_attention', pt1,
         jsonb_build_object('priorite', 'urgente', 'mentions', jsonb_build_array(b_m)) from ctx
  union all select 'point_statut', a, a_m, 'point_attention', pt1, '{"statut": ["a_traiter", "en_cours"]}'::jsonb from ctx
  union all select 'point_cree', a, a_m, 'point_attention', pt2, '{"priorite": "normale", "mentions": []}'::jsonb from ctx
  union all select 'evenement_ajoute', a, a_m, 'evenement', ev,
                   jsonb_build_object('date', private.aujourdhui() + 8, 'statut', 'brouillon') from ctx
  union all select 'reunion_saisie', a, a_m, 'reunion', reu,
                   jsonb_build_object('date', private.aujourdhui() + 4, 'heure', time '19:30') from ctx
  union all select 'evenement_modifie', a, a_m, 'evenement', ev,
                   jsonb_build_object('date', private.aujourdhui() + 10, 'statut', 'valide') from ctx
  union all select 'point_traite', b, a_m, 'point_attention', pt1, '{"avec_commentaire": true}'::jsonb from ctx
  union all select 'point_traite', berger, a_m, 'point_attention', pt2, '{"avec_commentaire": true}'::jsonb from ctx
$$, 'journal : une ligne par écriture, bon code d''action, compte de l''auteur, ministère créateur, detail sans texte');

-- EJP Tech lit les textes libres dans sa file de relecture, sans priorité, statut ni chiffre.
select tests.se_connecter((select tech from ctx), 'aal2');
select results_eq($$
  select t.cible, t.cible_id, t.ministere_id, t.champs, t.etat from public.v_textes_a_relire t
   where t.cible_id in (select id from objets) order by t.ecrit_le
$$, $$
  select 'point_attention', pt1, a_m,
         '{"titre": "Journal point 1", "description": "Description libre du point", "action_attendue": "Action libre du point"}'::jsonb,
         'a_relire' from ctx
  union all select 'point_attention', pt2, a_m,
                   '{"titre": "Journal point 2", "description": "Deuxième description libre"}'::jsonb, 'a_relire' from ctx
  union all select 'evenement', ev, a_m, '{"titre": "Journal événement libre"}'::jsonb, 'a_relire' from ctx
  union all select 'reunion', reu, a_m,
                   '{"objet": "Objet libre de réunion", "decision_attendue": "Décision libre attendue"}'::jsonb, 'a_relire' from ctx
  union all select 'point_suivi', suivi1, b_m, '{"commentaire": "Commentaire libre du ministère mentionné"}'::jsonb, 'a_relire' from ctx
  union all select 'point_suivi', suivi2, null, '{"commentaire": "Commentaire libre du berger"}'::jsonb, 'a_relire' from ctx
$$, 'EJP Tech lit chaque texte libre du jeu d''essai dans la file de relecture, avec le ministère de l''auteur');
select tests.deconnecter();

select is((select string_agg(a.attname::text, ', ' order by a.attnum) collate "default"
             from pg_attribute a
            where a.attrelid = 'public.v_textes_a_relire'::regclass and a.attnum > 0 and not a.attisdropped),
  'cible, cible_id, ministere_id, auteur_libelle, ecrit_le, champs, etat, decision_le, motif',
  'la file de relecture n''a que des textes et leur suivi : ni priorité, ni statut, ni chiffre');

select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : un ministère n''y lit rien');
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : le ministère mentionné n''y lit rien');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : le berger n''y lit rien');
select is(tests.compter((select conseil from ctx), 'aal2', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : le conseil n''y lit rien');
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : l''administration de l''église n''y lit rien');
select is(tests.compter((select tech from ctx), 'aal1', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : EJP Tech en aal1 n''y lit rien');

-- Modération réservée à EJP Tech : les autres profils sont refusés sans rien changer.
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'nom_personne') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'modération : le ministère créateur ne masque pas un texte');
select tests.deconnecter();
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'nom_personne') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'modération : le ministère mentionné ne masque pas un texte');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'nom_personne') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'modération : le berger ne masque pas un texte');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'nom_personne') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'modération : le conseil ne masque pas un texte');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'nom_personne') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'modération : l''administration de l''église ne masque pas un texte');
select tests.deconnecter();

select ok((select p.description from public.point_attention p where p.id = (select pt1 from ctx)) = 'Description libre du point'
          and not exists (select 1 from public.moderation m where m.cible_id in (select id from objets))
          and not exists (select 1 from public.journal j where j.cible_id in (select id from objets)
                                                         and j.action in ('texte_relu', 'texte_masque')),
  'modération : les refus ne changent ni le texte, ni la modération, ni le journal');

-- EJP Tech masque et relit
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'nom_personne') $$,
  'modération : EJP Tech masque la description d''un point');
select lives_ok($$ select public.masquer_texte('point_suivi', (select suivi1 from ctx), 'commentaire', 'situation_personnelle') $$,
  'modération : EJP Tech masque le commentaire de traitement d''un ministère');
select lives_ok($$ select public.masquer_texte('point_suivi', (select suivi2 from ctx), 'commentaire', 'autre') $$,
  'modération : EJP Tech masque le commentaire de traitement du berger');
select lives_ok($$ select public.marquer_relu('reunion', (select reu from ctx)) $$,
  'modération : EJP Tech relit la réunion');
select lives_ok($$ select public.masquer_texte('reunion', (select reu from ctx), 'objet', 'coordonnees') $$,
  'modération : un texte déjà relu peut encore être masqué (objet de la réunion)');
select lives_ok($$ select public.masquer_texte('evenement', (select ev from ctx), 'titre', 'nom_personne') $$,
  'modération : EJP Tech masque le titre d''un événement');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'description', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'modération : un texte déjà masqué est refusé');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt2 from ctx), 'action_attendue', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'modération : un champ vide est refusé');
select throws_ok($$ select public.masquer_texte('point_attention', (select pt1 from ctx), 'priorite', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'modération : la priorité n''est pas un champ libre');
select throws_ok($$ select public.masquer_texte('reunion', (select reu from ctx), 'decision_attendue', 'rumeur') $$,
  'P0001', 'Choisissez un motif dans la liste.', 'modération : un motif hors liste est refusé');
select throws_ok($$ select public.marquer_relu('reunion', (select reu from ctx)) $$,
  'P0001', 'Ce texte a déjà été relu.', 'modération : un texte déjà relu ne se relit pas');
select tests.deconnecter();

-- Seul le champ visé est remplacé, en entier.
select results_eq($$
  select p.titre, p.description, p.action_attendue, p.priorite::text from public.point_attention p
   where p.id = (select pt1 from ctx)
$$, $$ values ('Journal point 1', '[texte masqué par EJP Tech]', 'Action libre du point', 'urgente') $$,
  'modération : seule la description du point est remplacée');
select results_eq($$
  select s.statut::text, s.commentaire from public.point_suivi s
   where s.id in (select suivi1 from ctx union all select suivi2 from ctx) order by s.saisi_le
$$, $$ values ('traite', '[texte masqué par EJP Tech]'), ('traite', '[texte masqué par EJP Tech]') $$,
  'modération : les commentaires de traitement sont remplacés, le statut ne change pas');
select results_eq($$
  select x.objet, x.decision_attendue from public.reunion x where x.id = (select reu from ctx)
$$, $$ values ('[texte masqué par EJP Tech]', 'Décision libre attendue') $$,
  'modération : seul l''objet de la réunion est remplacé');
select is((select e.titre from public.evenement e where e.id = (select ev from ctx)), '[texte masqué par EJP Tech]',
  'modération : le titre de l''événement est remplacé');

select results_eq($$
  select m.cible, m.cible_id, m.champ, m.decision, m.motif, m.par from public.moderation m
   where m.cible_id in (select id from objets) order by m.id
$$, $$
  select 'point_attention', pt1, 'description', 'masque', 'nom_personne', tech from ctx
  union all select 'point_suivi', suivi1, 'commentaire', 'masque', 'situation_personnelle', tech from ctx
  union all select 'point_suivi', suivi2, 'commentaire', 'masque', 'autre', tech from ctx
  union all select 'reunion', reu, null, 'rien_a_signaler', null, tech from ctx
  union all select 'reunion', reu, 'objet', 'masque', 'coordonnees', tech from ctx
  union all select 'evenement', ev, 'titre', 'masque', 'nom_personne', tech from ctx
$$, 'modération : une ligne par décision, en codes, au nom d''EJP Tech, rien pour les refus');
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.cible, j.cible_id, j.detail from public.journal j
   where j.action in ('texte_relu', 'texte_masque') and j.cible_id in (select id from objets) order by j.id
$$, $$
  select 'texte_masque', tech, a_m, 'point_attention', pt1, '{"champ": "description", "motif": "nom_personne"}'::jsonb from ctx
  union all select 'texte_masque', tech, b_m, 'point_suivi', suivi1,
                   '{"champ": "commentaire", "motif": "situation_personnelle"}'::jsonb from ctx
  union all select 'texte_masque', tech, null, 'point_suivi', suivi2, '{"champ": "commentaire", "motif": "autre"}'::jsonb from ctx
  union all select 'texte_relu', tech, a_m, 'reunion', reu, '{}'::jsonb from ctx
  union all select 'texte_masque', tech, a_m, 'reunion', reu, '{"champ": "objet", "motif": "coordonnees"}'::jsonb from ctx
  union all select 'texte_masque', tech, a_m, 'evenement', ev, '{"champ": "titre", "motif": "nom_personne"}'::jsonb from ctx
$$, 'journal : une ligne par décision de modération, ministère de l''auteur (aucun pour le berger), sans texte');

select is(tests.lire((select tech from ctx), 'aal2',
  'select t.champs, t.etat, t.motif from public.v_textes_a_relire t where t.cible_id = (select pt1 from ctx)'),
  '[{"champs": {"titre": "Journal point 1", "description": "[texte masqué par EJP Tech]", "action_attendue": "Action libre du point"}, "etat": "masque", "motif": "nom_personne"}]'::jsonb,
  'EJP Tech voit le point masqué dans sa file, avec le motif');
select is((select count(*)::int
             from (select to_jsonb(p) as ligne from public.point_attention p
                   union all select to_jsonb(s) from public.point_suivi s
                   union all select to_jsonb(e) from public.evenement e
                   union all select to_jsonb(x) from public.reunion x
                   union all select to_jsonb(j) from public.journal j
                   union all select to_jsonb(m) from public.moderation m) as t
            cross join (values ('Description libre du point'), ('Commentaire libre du ministère mentionné'),
                               ('Commentaire libre du berger'), ('Objet libre de réunion'),
                               ('Journal événement libre')) as v(texte)
           where strpos(t.ligne::text, v.texte) > 0), 0,
  'données personnelles : un texte masqué ne reste nulle part (points, suivis, événements, réunions, journal, modération)');
select is(tests.lire((select berger from ctx), 'aal2',
  'select j.cible_texte from public.v_journal j where j.cible_id = (select ev from ctx) and j.action = ''evenement_ajoute'''),
  '[{"cible_texte": "[texte masqué par EJP Tech]"}]'::jsonb,
  'journal : l''écran lit le texte actuel de l''objet, donc masqué');
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.v_journal j where j.action not in (''ministere_cree'', ''compte_cree'', ''invitation_relancee'',
     ''compte_desactive'', ''compte_reactive'', ''double_auth_reinitialisee'', ''texte_relu'', ''texte_masque'')'), 0,
  'EJP Tech ne lit que les actions techniques du journal');
select is(tests.lire((select tech from ctx), 'aal2',
  'select j.action, j.cible_texte from public.v_journal j where j.cible_id = (select pt1 from ctx)'),
  '[{"action": "texte_masque", "cible_texte": null}]'::jsonb,
  'EJP Tech lit la ligne texte_masque du point, sans le titre du point (lu sous RLS)');

-- EJP Tech ne lit aucun chiffre, ni les points, événements et réunions hors de sa file.
create function pg_temp.sans_chiffres() returns setof text
language plpgsql as $$
declare
  v_relation text;
begin
  foreach v_relation in array array['mesure', 'fij_departement', 'participation', 'indicateur', 'session',
    'session_attendu', 'v_derniere_mesure', 'v_mesure_dimanche', 'v_total_dimanche', 'v_total_a_ce_jour',
    'v_carte_fij', 'v_participation_courante', 'v_session_completude', 'v_ecart_dimanche', 'v_ecart_session',
    'v_tableau_ministeres', 'v_point', 'v_evenement', 'v_prochaine_reunion']
  loop
    return next is(tests.compter((select tech from ctx), 'aal2', format('select 1 from public.%I', v_relation)), 0,
      format('EJP Tech ne lit aucune ligne de %s', v_relation));
  end loop;
end $$;

select * from pg_temp.sans_chiffres();
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.v_pourcentage_fij v where v.nb_ministeres > 0 or v.actifs is not null or v.en_fij is not null'), 0,
  'EJP Tech ne lit aucun chiffre de v_pourcentage_fij');
select is(tests.compter((select berger from ctx), 'aal2',
  'select 1 from public.mesure m where m.ministere_id = (select a_m from ctx)'), 1,
  'le chiffre saisi par A existe bien : le berger le lit');

-- Le journal et la modération ne se modifient pas, même par le propriétaire des tables.
select throws_ok($$ update public.journal set detail = '{}' where cible_id = (select pt1 from ctx) $$, '42501', null,
  'journal : même le propriétaire ne modifie pas une ligne');
select throws_ok($$ delete from public.journal where cible_id = (select pt1 from ctx) $$, '42501', null,
  'journal : même le propriétaire n''efface pas une ligne');
select throws_ok($$ update public.moderation set motif = 'autre' where cible_id = (select pt1 from ctx) $$, '42501', null,
  'modération : même le propriétaire ne modifie pas une décision');
select throws_ok($$ delete from public.moderation where cible_id = (select pt1 from ctx) $$, '42501', null,
  'modération : même le propriétaire n''efface pas une décision');

select is((select count(*)::int from public.journal j
            cross join (values ('Journal point'), ('Description libre'), ('Action libre'), ('Deuxième description'),
                               ('Journal événement'), ('Objet libre'), ('Décision libre'), ('Commentaire libre')) as t(texte)
           where j.cible_id in (select id from objets) and strpos(j.detail::text, t.texte) > 0), 0,
  'journal : aucun texte libre recopié dans detail');

select * from finish();
rollback;
