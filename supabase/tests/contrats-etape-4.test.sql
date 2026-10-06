-- Contrats communs de l'étape 4 (lot W0, docs/plan-etape-4.md, section 3, point 2, et
-- docs/conception/contrat-etape-4.md) : listes fermées du journal et de la modération,
-- réécrites par 20261007090000_contrats_etape_4.sql, puis par
-- 20261009105000_sensibles_precisions_repartitions.sql (lot B8, seul autre lot autorisé : cible
-- precision_sensible et couple (precision_sensible, texte), T41), et aide de matrice des droits
-- de 000-outils.test.sql.
-- Les listes attendues sont celles des documents : configuration-indicateurs.md 5.10,
-- validation-metier.md 2.7, plan B5 (statistiques FIJ), T39 (signalements, question 14 : oui),
-- P46 et T41 (précision d'un indicateur sensible).
-- Les codes du lot 2 des indicateurs n'y sont pas. Les noms des contraintes sont ceux du
-- contrat (section 1), moderation_masque_check compris (20261007090500_contrats_etape_4_correctifs.sql).
begin;

create temp table ctx as
select tests.creer_ministere('Contrats étape 4') as m;
alter table ctx add column ministere uuid, add column tech uuid;
update ctx set ministere = tests.creer_compte('contrats-ministere@exemple.test', 'ministere', m),
               tech = tests.creer_compte('contrats-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated, anon;

-- Petite matrice de l'aide (fin du fichier), écrite avant plan() pour que tests.nombre_essais
-- compte ses essais : EJP Tech lit les 17 lignes de modération écrites plus bas, un ministère
-- aucune ; personne n'ajoute ni ne modifie. La ligne aal1 d'EJP Tech est écrite : elle remplace
-- la ligne dérivée.
create temp table matrice_essai (texte text, profils text);
insert into matrice_essai
select format($$
    values
      ('EJP Tech', 'moderation', 'lire', 'aal2', '17', %1$L),
      ('EJP Tech', 'moderation', 'lire', 'aal1', '0', %1$L),
      ('ministère', 'moderation', 'lire', 'aal2', '0', %1$L),
      ('EJP Tech', 'moderation', 'ajouter', 'aal2', '42501', %2$L),
      ('ministère', 'moderation', 'modifier', 'aal2', '42501', %3$L)
  $$,
  'select 1 from public.moderation where cible_id in (select cible_id from essai_moderation)',
  format('insert into public.moderation (cible, cible_id, decision, par) values (%L, %L, %L, %L)',
         'signalement', gen_random_uuid(), 'rien_a_signaler', (select tech from ctx)),
  'update public.moderation set motif = motif where cible_id in (select cible_id from essai_moderation)'),
  $$ select 'EJP Tech', tech from ctx union all select 'ministère', ministere from ctx $$;

select plan(72 + tests.nombre_essais((select texte from matrice_essai), (select profils from matrice_essai), true));

-- Listes attendues
create temp table attendu_action (code text primary key);
insert into attendu_action values
  ('mesure_saisie'), ('fij_saisie'), ('participation_saisie'), ('evenement_ajoute'), ('evenement_modifie'),
  ('reunion_saisie'), ('point_cree'), ('point_statut'), ('point_traite'),
  ('session_declaree'), ('session_modifiee'), ('session_supprimee'),
  ('ministere_cree'), ('compte_cree'), ('invitation_relancee'), ('compte_desactive'), ('compte_reactive'),
  ('double_auth_reinitialisee'), ('texte_relu'), ('texte_masque'),
  ('indicateur_cree'), ('indicateurs_prevus_crees'), ('indicateur_corrige'), ('indicateur_valide'),
  ('indicateur_refuse'), ('indicateur_retire'), ('fij_statistiques_saisies'),
  ('difficulte_signalee'), ('signalement_clos');

create temp table attendu_cible_journal (code text primary key);
insert into attendu_cible_journal values
  ('session'), ('evenement'), ('reunion'), ('point_attention'), ('point_suivi'), ('compte'), ('ministere'),
  ('indicateur'), ('demande_indicateur'), ('validation'), ('signalement'), ('signalement_suivi'),
  ('precision_sensible');

create temp table attendu_cible_moderation (code text primary key);
insert into attendu_cible_moderation values
  ('point_attention'), ('point_suivi'), ('evenement'), ('reunion'),
  ('demande_indicateur'), ('validation'), ('signalement'), ('signalement_suivi'), ('precision_sensible');

create temp table attendu_couple (rang int primary key, cible text not null, champ text not null);
insert into attendu_couple values
  (1, 'point_attention', 'titre'), (2, 'point_attention', 'description'), (3, 'point_attention', 'action_attendue'),
  (4, 'point_suivi', 'commentaire'), (5, 'evenement', 'titre'),
  (6, 'reunion', 'objet'), (7, 'reunion', 'decision_attendue'),
  (8, 'demande_indicateur', 'pourquoi'), (9, 'validation', 'motif'),
  (10, 'signalement', 'texte'), (11, 'signalement_suivi', 'commentaire'),
  (12, 'precision_sensible', 'texte');

-- Valeurs écrites dans un check « colonne in (...) », lues dans sa définition.
create function pg_temp.valeurs_du_check(p_table regclass, p_contrainte name) returns setof text
language sql stable as $$
  select (regexp_matches(pg_get_constraintdef(c.oid), '''([a-z0-9_]+)''', 'g'))[1]
    from pg_constraint c
   where c.conrelid = p_table and c.conname = p_contrainte and c.contype = 'c'
$$;

-- Noms des contraintes fixés par le contrat (section 1)
select is_empty($$
  select n.nom from unnest(array['journal_action_check', 'journal_cible_check', 'moderation_cible_check',
                                 'moderation_cible_champ_check', 'moderation_masque_check']) as n(nom)
  except
  select c.conname::text from pg_constraint c
   where c.conrelid in ('public.journal'::regclass, 'public.moderation'::regclass) and c.contype = 'c'
$$, 'les cinq contraintes du journal et de la modération portent le nom fixé par le contrat');

-- Listes exactes
select set_eq($$ select pg_temp.valeurs_du_check('public.journal', 'journal_action_check') $$,
              $$ select code from attendu_action $$,
  'journal.action : les 20 codes des étapes 1 à 3, les 7 codes du lot 1 des indicateurs et des statistiques FIJ, les 2 codes des signalements, rien d''autre');
select set_eq($$ select pg_temp.valeurs_du_check('public.journal', 'journal_cible_check') $$,
              $$ select code from attendu_cible_journal $$,
  'journal.cible : les 7 cibles des étapes 1 à 3, indicateur, signalement et les cibles de la modération (precision_sensible comprise, B8), rien d''autre');
select set_eq($$ select pg_temp.valeurs_du_check('public.moderation', 'moderation_cible_check') $$,
              $$ select code from attendu_cible_moderation $$,
  'moderation.cible : les 4 cibles des étapes 1 à 3, demande_indicateur, validation, signalement, signalement_suivi et precision_sensible');
select is_empty($$
  select pg_temp.valeurs_du_check('public.moderation', 'moderation_cible_check')
  except
  select pg_temp.valeurs_du_check('public.journal', 'journal_cible_check')
$$, 'toute cible de la modération est une cible du journal (texte_relu et texte_masque)');

-- Une ligne de journal par code d'action, puis par cible (au nom de Système, sans détail).
select lives_ok(format('insert into public.journal (ministere_id, action) values (%L, %L)',
                       (select m from ctx), a.code),
                'journal : le code d''action ' || a.code || ' est accepté')
  from attendu_action a
 order by a.code;
select lives_ok(format('insert into public.journal (ministere_id, action, cible, cible_id) values (%L, %L, %L, %L)',
                       (select m from ctx), 'texte_masque', c.code, gen_random_uuid()),
                'journal : la cible ' || c.code || ' est acceptée')
  from attendu_cible_journal c
 order by c.code;
select throws_ok($$ insert into public.journal (action) values ('indicateur_correction_demandee') $$,
  '23514', null, 'journal : le code indicateur_correction_demandee (lot 2) est refusé');
select throws_ok($$ insert into public.journal (action) values ('indicateur_officiel') $$,
  '23514', null, 'journal : le code indicateur_officiel (lot 2) est refusé');

-- Une ligne de modération par couple (cible, champ), au nom d'EJP Tech.
select lives_ok(format('insert into public.moderation (cible, cible_id, champ, decision, motif, par)
                        values (%L, %L, %L, %L, %L, %L)',
                       c.cible, gen_random_uuid(), c.champ, 'masque', 'autre', (select tech from ctx)),
                format('moderation : le couple (%s, %s) se masque', c.cible, c.champ))
  from attendu_couple c
 order by c.rang;

-- Couples acceptés : exactement ceux de la liste, sur toutes les cibles et tous les champs
-- connus (et deux de plus, indicateur et libelle, qui ne se masquent pas).
create function pg_temp.couple_accepte(p_cible text, p_champ text) returns boolean
language plpgsql as $$
begin
  begin
    insert into public.moderation (cible, cible_id, champ, decision, motif, par)
    values (p_cible, gen_random_uuid(), p_champ, 'masque', 'autre', (select tech from ctx));
    raise exception using errcode = 'ZZ003', message = 'essai annulé';
  exception
    when sqlstate 'ZZ003' then
      return true;
    when check_violation then
      return false;
  end;
end $$;
select set_eq($$
  select c.cible, h.champ
    from (select cible from attendu_couple union select code from attendu_cible_moderation
          union select 'indicateur') as c(cible)
   cross join (select champ from attendu_couple union select 'libelle') as h(champ)
   where pg_temp.couple_accepte(c.cible, h.champ)
$$, $$ select cible, champ from attendu_couple $$,
  'moderation : les 12 couples (cible, champ) de la liste, et eux seuls, se masquent');

select lives_ok(format('insert into public.moderation (cible, cible_id, decision, par) values (%L, %L, %L, %L)',
                       c.code, gen_random_uuid(), 'rien_a_signaler', (select tech from ctx)),
                'moderation : la cible ' || c.code || ' se relit (rien à signaler)')
  from attendu_cible_moderation c
 where c.code in ('demande_indicateur', 'validation', 'signalement', 'signalement_suivi', 'precision_sensible')
 order by c.code;
select throws_ok(format('insert into public.moderation (cible, cible_id, decision, motif, par) values (%L, %L, %L, %L, %L)',
                        'signalement', gen_random_uuid(), 'masque', 'autre', (select tech from ctx)),
  '23514', null, 'moderation : un masquage sans champ reste refusé (contrainte des étapes 1 à 3 gardée)');

-- Aide de matrice (000-outils.test.sql) : la matrice écrite en tête de fichier, sur les lignes
-- de modération écrites ci-dessus. Avec p_deriver : la ligne aal1 dérivée des seules lignes
-- acceptées (celle d'EJP Tech est écrite), puis l'anonyme.
create temp table essai_moderation as
select m.cible_id from public.moderation m where m.par = (select tech from ctx);
grant select on essai_moderation to authenticated, anon;

select * from tests.verifier_matrice((select texte from matrice_essai), (select profils from matrice_essai), true);
select is(tests.nombre_essais((select texte from matrice_essai), (select profils from matrice_essai), true), 9,
  'aide de matrice : 5 lignes écrites, 1 ligne aal1 dérivée (une ligne écrite remplace la sienne, un refus n''en a pas), 3 lignes de l''anonyme');

-- L'aide signale un écart : une ligne volontairement fausse (un ministère qui lirait les 17
-- lignes) fait échouer son test. check_test retire ce test du compte et vérifie son échec.
select * from check_test(
  (select * from tests.verifier_matrice(
     $$ values ('ministère', 'moderation', 'lire', 'aal2', '17',
                'select 1 from public.moderation where cible_id in (select cible_id from essai_moderation)') $$,
     $$ select 'ministère', ministere from ctx $$)),
  false,
  'aide de matrice : une ligne fausse fait échouer son test');
select throws_ok(
  $q$ select * from tests.verifier_matrice(
        $$ values ('EJP Tech', 'moderation', 'lire', 'aal2', '17', 'select 1') $$,
        $$ select 'EJP Tech', tech from ctx union all select 'EJP Tech', ministere from ctx $$) $q$,
  'P0001', null, 'aide de matrice : un profil en double dans p_profils est refusé');

-- tests.essai : une écriture qui ne touche aucune ligne ne vaut pas une écriture acceptée.
select is(
  tests.essai((select ministere from ctx), 'aal2',
              'insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
               select indicateur_id, ministere_id, date_ref, valeur from public.mesure where false'),
  'ok:0', 'tests.essai : une écriture qui ne touche aucune ligne rend « ok:0 », jamais « ok »');

select * from finish();
rollback;
