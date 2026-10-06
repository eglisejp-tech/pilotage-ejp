-- « Précision » jointe au total du mois d'un indicateur sensible (lot B8 ; docs/plan-etape-4.md,
-- section 4, « B8 » ; docs/decisions.md, P46 et T41 ; contrat-etape-4.md, sections 1, 5, 6 et 7).
--
-- Longueur après trim (9, 10, 280 et 281 caractères) ; familles refusées de verifier_texte
-- (email, 5 chiffres de suite, civilité suivie d'un nom, texte masqué) ; précision pour un
-- non-sensible refusée ; seule la précision du total le plus récent se lit, un total plus récent
-- sans précision n'en laisse aucune ; après deux précisions du même mois, le berger et le
-- conseil lisent une seule ligne, sans mesure_id ni date d'envoi, et jamais la table brute ;
-- relecture et masquage par EJP Tech seul (texte_relu et texte_masque au journal, avec le
-- ministère de la précision) ; aucun texte dans le journal, detail compris ; v_journal dit
-- « Précision : » suivi du libellé et du mois au ministère et à EJP Tech, rien à
-- l'administration. Enfin marquer_relu accepte aussi les textes des indicateurs (B3).
begin;

select plan(43);

create temp table ctx as
select tests.creer_ministere('B8 précision A') as a_m,
       tests.creer_ministere('B8 précision B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '2 months')::date as m2;
alter table ctx add column a uuid, add column b uuid, add column sens uuid, add column ord uuid,
  add column p_m1 uuid, add column p_ancienne uuid;
update ctx set a = tests.creer_compte('b8-precision-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('b8-precision-b@exemple.test', 'ministere', b_m);

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sensible, ordre) values
  ('essai_b8_prec', 'essai b8 prec', 'Essai B8 précision', 'Sensible d''essai avec une précision.', 'mois', true, 1);
insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, modele_code, ordre)
select v.libelle, v.definition, 'mois', c.a_m, v.sensible, v.modele, v.ordre
  from ctx c
 cross join (values ('Essai B8 précision', 'Sensible d''essai avec une précision.', true, 'essai_b8_prec', 1),
                    ('Essai B8 précision ordinaire', 'Indicateur du mois d''essai, non sensible.', false, null, 2))
       as v(libelle, definition, sensible, modele, ordre);
update ctx set
  sens = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_b8_prec'),
  ord = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai B8 précision ordinaire');
grant select on ctx to authenticated, anon;

-- Textes envoyés, pour vérifier qu'aucun n'arrive au journal.
create temp table textes (texte text);
insert into textes values ('Dix carac.'), (repeat('abcd', 70)), ('Première précision du mois.'),
  ('Seconde précision du mois.');
grant select on textes to authenticated, anon;

create function pg_temp.envoi(p_mois date, p_valeur integer, p_precision text, p_indicateur uuid default null)
returns integer language sql as $$
  select public.saisir_chiffres_mois(p_mois, jsonb_build_array(jsonb_build_object(
    'indicateur_id', coalesce(p_indicateur, (select sens from ctx)), 'valeur', p_valeur, 'precision', p_precision)))
$$;
grant execute on function pg_temp.envoi(date, integer, text, uuid) to authenticated;

select ok((select count(*) from ctx where a is not null and berger is not null and conseil is not null and sens is not null
             and ord is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes et les indicateurs utilisés ici');

-- 1. Longueur et familles de texte
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select pg_temp.envoi((select m1 from ctx), 3, '  Neuf car.  ') $$,
  'P0001', 'La précision doit faire entre 10 et 280 caractères.', '9 caractères après trim : refusé');
select is(pg_temp.envoi((select m1 from ctx), 3, '  Dix carac.  '), 1, '10 caractères après trim : accepté');
select is((select texte from public.precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m1 from ctx)),
  'Dix carac.', 'la précision est enregistrée sans ses espaces de bord');
select lives_ok($$ select pg_temp.envoi((select m2 from ctx), 3, repeat('abcd', 70)) $$, '280 caractères : accepté');
select throws_ok($$ select pg_temp.envoi((select m2 from ctx), 3, repeat('abcd', 70) || 'e') $$,
  'P0001', 'La précision doit faire entre 10 et 280 caractères.', '281 caractères : refusé');
select throws_ok($$ select pg_temp.envoi((select m2 from ctx), 3, 'Écrire à contact@exemple.test pour la suite.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'une adresse email est refusée');
select throws_ok($$ select pg_temp.envoi((select m2 from ctx), 3, 'Rappeler le 06 12 34 56 78 demain matin.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', '5 chiffres de suite (un numéro) sont refusés');
select throws_ok($$ select pg_temp.envoi((select m2 from ctx), 3, 'Passage de Mme Durand pour une aide.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'une civilité suivie d''un nom est refusée');
select throws_ok($$ select pg_temp.envoi((select m2 from ctx), 3, '[texte masqué par EJP Tech]') $$,
  'P0001', 'Les crochets et « texte masqué » sont réservés à la modération.', 'le texte du masquage est refusé');
select throws_ok($$ select pg_temp.envoi((select m2 from ctx), 3, 'Précision pour un chiffre ordinaire.', (select ord from ctx)) $$,
  'P0001', 'Une précision accompagne seulement un indicateur sensible.', 'une précision pour un non-sensible est refusée');

-- 2. Deux précisions dans le même mois, puis un total plus récent sans précision
select lives_ok($$ select pg_temp.envoi((select m2 from ctx), 4, 'Première précision du mois.') $$, 'première précision de m2');
select lives_ok($$ select pg_temp.envoi((select m2 from ctx), 5, 'Seconde précision du mois.') $$, 'seconde précision de m2');
select results_eq($$
  select texte from public.v_precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx)
$$, $$ values ('Seconde précision du mois.') $$, 'le ministère lit la précision du total le plus récent');
select is((select count(*)::integer from public.precision_sensible
            where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx)), 3,
  'le ministère lit toutes ses précisions dans la table brute');
select tests.deconnecter();
update ctx set p_ancienne = (select p.id from public.precision_sensible p
                              where p.indicateur_id = ctx.sens and p.texte = 'Première précision du mois.'),
               p_m1 = (select p.id from public.precision_sensible p where p.indicateur_id = ctx.sens and p.mois = ctx.m1);

select is(tests.lire((select berger from ctx), 'aal2',
    'select * from public.v_precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx)'),
  jsonb_build_array(jsonb_build_object('indicateur_id', (select sens from ctx), 'ministere_id', (select a_m from ctx),
                                       'mois', (select m2 from ctx), 'texte', 'Seconde précision du mois.')),
  'après deux précisions du mois, le berger lit une seule ligne, sans mesure_id ni date d''envoi');
select is(tests.compter((select conseil from ctx), 'aal2',
    'select 1 from public.v_precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx)'), 1,
  'le conseil lit la même ligne');
select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_precision_sensible'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('mois', 'date'), ('texte', 'text') $$,
  'v_precision_sensible : colonnes et types du contrat, ni mesure_id ni date d''envoi');
select is(tests.compter((select berger from ctx), 'aal2',
    'select 1 from public.precision_sensible where ministere_id = (select a_m from ctx)'), 0,
  'le berger ne lit pas la table brute (envois intermédiaires)');
select is(tests.compter((select conseil from ctx), 'aal2',
    'select 1 from public.precision_sensible where ministere_id = (select a_m from ctx)'), 0,
  'le conseil ne lit pas la table brute');
select is(tests.compter((select tech from ctx), 'aal2',
    'select 1 from public.precision_sensible where ministere_id = (select a_m from ctx)'), 4,
  'EJP Tech lit la table brute (relecture et masquage)');
select is(tests.compter((select admin from ctx), 'aal2',
    'select 1 from public.v_precision_sensible where ministere_id = (select a_m from ctx)'), 0,
  'l''administration ne lit aucune précision');
select is(tests.compter((select b from ctx), 'aal2',
    'select 1 from public.v_precision_sensible where ministere_id = (select a_m from ctx)'), 0,
  'un autre ministère ne lit aucune précision');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.saisir_chiffres_mois((select m2 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 6)))
$$, 'le ministère corrige le total de m2 sans précision (champ vidé)');
select is_empty($$ select 1 from public.v_precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx) $$,
  'un total plus récent sans précision n''en laisse aucune à l''affichage');
select tests.deconnecter();
select is(tests.compter((select berger from ctx), 'aal2',
    'select 1 from public.v_precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx)'), 0,
  'le berger ne lit plus la précision remplacée');

-- 3. Relecture et masquage par EJP Tech seul
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('precision_sensible', (select p_m1 from ctx), 'texte', 'nom_personne') $$,
  '42501', 'Seul EJP Tech peut masquer un texte.', 'le berger ne masque pas une précision');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.marquer_relu('precision_sensible', (select p_m1 from ctx)) $$,
  '42501', 'Seul EJP Tech peut relire un texte.', 'le ministère auteur ne relit pas sa précision');
select tests.deconnecter();

select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.marquer_relu('precision_sensible', (select p_ancienne from ctx)) $$,
  'EJP Tech relit une précision, même remplacée');
select throws_ok($$ select public.marquer_relu('precision_sensible', (select p_ancienne from ctx)) $$,
  'P0001', 'Ce texte a déjà été relu.', 'une précision ne se relit qu''une fois');
select lives_ok($$ select public.masquer_texte('precision_sensible', (select p_m1 from ctx), 'texte', 'nom_personne') $$,
  'EJP Tech masque une précision');
select throws_ok($$ select public.masquer_texte('precision_sensible', (select p_m1 from ctx), 'texte', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'une précision masquée ne se masque pas deux fois');
select throws_ok($$ select public.masquer_texte('precision_sensible', (select p_ancienne from ctx), 'commentaire', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'seul le champ texte d''une précision se masque');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2',
    'select texte from public.v_precision_sensible where indicateur_id = (select sens from ctx) and mois = (select m1 from ctx)'),
  '[{"texte": "[texte masqué par EJP Tech]"}]'::jsonb, 'le berger lit la précision masquée');
select results_eq($$
  select action, ministere_id, detail from public.journal
   where cible = 'precision_sensible' and cible_id in ((select p_m1 from ctx), (select p_ancienne from ctx))
   order by id
$$, $$ values ('texte_relu', (select a_m from ctx), '{}'::jsonb),
              ('texte_masque', (select a_m from ctx), '{"champ": "texte", "motif": "nom_personne"}'::jsonb) $$,
  'journal : texte_relu et texte_masque, au ministère de la précision, sans texte');

-- 4. Journal : aucun texte, libellé de la cible, lecteurs
select is_empty($$
  select 1 from public.journal j cross join textes t
   where (j.ministere_id = (select a_m from ctx) or j.compte = (select a from ctx))
     and position(t.texte in j.detail::text) > 0
$$, 'aucune précision n''est recopiée dans le journal, detail compris');
select is_empty($$
  select 1 from public.journal j
   where j.compte = (select a from ctx) and j.action = 'mesure_saisie' and j.detail <> '{"lignes": []}'::jsonb
$$, 'les envois du sensible gardent un detail sans ligne (P45)');
select is(tests.lire((select a from ctx), 'aal2',
    'select cible_texte from public.v_journal where cible = ''precision_sensible'' and action = ''texte_masque'' and cible_id = (select p_m1 from ctx)'),
  jsonb_build_array(jsonb_build_object('cible_texte',
    'Précision : Essai B8 précision, '
    || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
              'novembre', 'décembre'])[extract(month from (select m1 from ctx))::integer]
    || ' ' || extract(year from (select m1 from ctx))::integer)),
  'v_journal : le ministère lit « Précision : » suivi du libellé et du mois, jamais le texte');
select is(tests.lire((select berger from ctx), 'aal2',
    'select cible_texte from public.v_journal where cible = ''precision_sensible'' and cible_id = (select p_m1 from ctx)'),
  '[{"cible_texte": null}]'::jsonb,
  'v_journal : le berger lit la ligne, sans le libellé (il ne lit pas la table brute)');
select is(tests.compter((select admin from ctx), 'aal2',
    'select 1 from public.journal where cible = ''precision_sensible'' and ministere_id = (select a_m from ctx)'), 0,
  'journal : l''administration ne lit aucune ligne de cible precision_sensible');
select is(tests.compter((select admin from ctx), 'aal2',
    'select 1 from public.v_journal where cible = ''precision_sensible'' and ministere_id = (select a_m from ctx)'), 0,
  'v_journal : l''administration non plus');

-- 5. marquer_relu accepte aussi les textes des indicateurs (couples de B3)
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$
  select public.marquer_relu('demande_indicateur',
    (select d.id from public.demande_indicateur d
      where d.pourquoi is not null and not exists (select 1 from public.moderation m where m.cible_id = d.id)
      order by d.saisi_le limit 1))
$$, 'EJP Tech relit le « Pourquoi » d''une demande');
select lives_ok($$
  select public.marquer_relu('validation',
    (select v.id from public.validation v
      where v.motif is not null and not exists (select 1 from public.moderation m where m.cible_id = v.id)
      order by v.saisi_le limit 1))
$$, 'EJP Tech relit le motif d''un refus');
select tests.deconnecter();

select * from finish();
rollback;
