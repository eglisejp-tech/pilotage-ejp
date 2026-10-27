-- Matrice des droits des objets du lot B6 (docs/plan-etape-4.md, section 4, « Matrice des
-- droits des objets nouveaux » ; BRIEF, section 7) : evenement, evenement_etat,
-- evenement_mention, v_evenement et ajouter_evenement à quatre arguments, pour le ministère
-- porteur, le ministère mentionné, un autre ministère, le berger, le conseil, l'administration
-- de l'église et EJP Tech, en aal2 ; puis, par tests.verifier_matrice (000-outils.test.sql),
-- chaque ligne en aal1 (rien lu, tout refusé) et l'anonyme (42501 partout).
-- Heures des événements (T68) : aucune ligne nouvelle de la matrice du BRIEF, les colonnes
-- suivent leur table et leur vue ; les essais 10 à 12 le vérifient (heures de v_evenement,
-- ajout d'un état avec une heure, ajouter_evenement à cinq arguments).
-- Corrections (T78, lot 1 ; conception calendrier-evenements.md, section 10.4) : essais 13 à 27,
-- evenement_titre, evenement_mention_retrait, evenement_retrait et v_evenement_mention en
-- lecture (événements lisibles), aucune écriture directe dans ces tables, un état refusé sur un
-- événement retiré, et les trois fonctions : corriger_titre_evenement et
-- modifier_mentions_evenement pour le porteur seul, retirer_evenement pour le porteur et EJP Tech.
begin;

-- Jeu d'essai : A porte l'événement et mentionne B ; C est un autre ministère ; D, actif, sert
-- de mention à l'essai de ajouter_evenement (aucun profil ne s'y mentionne lui-même).
create temp table ctx as
select tests.creer_ministere('Matrice B6 A') as a_m,
       tests.creer_ministere('Matrice B6 B') as b_m,
       tests.creer_ministere('Matrice B6 C') as c_m,
       tests.creer_ministere('Matrice B6 D') as d_m;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column berger uuid,
  add column conseil uuid, add column admin uuid, add column tech uuid, add column ev uuid,
  add column ev2 uuid, add column ev3 uuid;
update ctx set a = tests.creer_compte('matrice-b6-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-b6-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('matrice-b6-c@exemple.test', 'ministere', c_m),
               berger = tests.creer_compte('matrice-b6-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('matrice-b6-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('matrice-b6-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('matrice-b6-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

-- Profils, dans l'ordre des colonnes de la matrice.
create temp table profil as
select x.ordre, x.nom, x.compte
from ctx
cross join lateral (values
  (1, 'ministère porteur', ctx.a),
  (2, 'ministère mentionné', ctx.b),
  (3, 'autre ministère', ctx.c),
  (4, 'berger', ctx.berger),
  (5, 'conseil', ctx.conseil),
  (6, 'administration', ctx.admin),
  (7, 'EJP Tech', ctx.tech)
) as x(ordre, nom, compte);

-- La matrice en aal2. Colonnes des attendus dans l'ordre des profils : porteur, mentionné,
-- autre ministère, berger, conseil, administration, EJP Tech. « lire » : lignes de
-- l'événement du jeu d'essai ; toute autre action : ok ou le code d'erreur.
create temp view matrice as
select row_number() over (order by o.rang, p.ordre) as rang,
       p.nom as profil, o.objet, o.action, 'aal2'::text as aal, o.attendus[p.ordre] as attendu, o.requete
from ctx
cross join lateral (values
  (1, 'evenement', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement where id = %L', ctx.ev)),
  (2, 'evenement_etat', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_etat where evenement_id = %L', ctx.ev)),
  (3, 'evenement_mention', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_mention where evenement_id = %L', ctx.ev)),
  (4, 'v_evenement', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select jours, a_confirmer, reporte_du from public.v_evenement where id = %L', ctx.ev)),
  (5, 'evenement_mention', 'ajouter', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_mention (evenement_id, ministere_id) values (%L, %L)', ctx.ev, ctx.c_m)),
  (6, 'evenement_mention', 'modifier', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('update public.evenement_mention set ministere_id = %L where evenement_id = %L', ctx.c_m, ctx.ev)),
  (7, 'evenement_mention', 'supprimer', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('delete from public.evenement_mention where evenement_id = %L', ctx.ev)),
  (8, 'evenement_etat', 'ajouter', '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_etat (evenement_id, date, statut) values (%L, %L, %L)',
             ctx.ev, private.aujourdhui() + 12, 'valide')),
  (9, 'ajouter_evenement', 'appeler', '{ok, ok, ok, 42501, 42501, 42501, 42501}'::text[],
      format('select public.ajouter_evenement(%L, %L, %L, array[%L]::uuid[])',
             'Matrice B6, essai', private.aujourdhui() + 5, 'brouillon', ctx.d_m)),
  (10, 'v_evenement (heures)', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select heure_prevue, heure_debut, retard, a_l_heure from public.v_evenement where id = %L', ctx.ev)),
  (11, 'evenement_etat (heure prévue)', 'ajouter', '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_etat (evenement_id, date, statut, heure_prevue) values (%L, %L, %L, %s)',
             ctx.ev, private.aujourdhui() + 12, 'valide', 1140)),
  (12, 'ajouter_evenement à 5 arguments', 'appeler', '{ok, ok, ok, 42501, 42501, 42501, 42501}'::text[],
      format('select public.ajouter_evenement(%L, %L, %L, array[%L]::uuid[], %s::smallint)',
             'Matrice B6, essai à 19 h', private.aujourdhui() + 5, 'brouillon', ctx.d_m, 1140)),
  -- T78 : ev2 a un nom corrigé et une mention retirée (D) ; ev3 est retiré.
  (13, 'evenement_titre', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_titre where evenement_id = %L', ctx.ev2)),
  (14, 'evenement_mention_retrait', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_mention_retrait where mention_id in '
             '(select m.id from public.evenement_mention m where m.evenement_id = %L)', ctx.ev2)),
  (15, 'v_evenement_mention', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.v_evenement_mention where evenement_id = %L', ctx.ev2)),
  (16, 'evenement_retrait', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_retrait where evenement_id = %L', ctx.ev3)),
  (17, 'v_evenement (retiré)', 'lire', '{0, 0, 0, 0, 0, 0, 0}'::text[],
      format('select 1 from public.v_evenement where id = %L', ctx.ev3)),
  (18, 'evenement_titre', 'ajouter', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_titre (evenement_id, titre) values (%L, %L)', ctx.ev2, 'Essai direct')),
  (19, 'evenement_titre', 'modifier', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('update public.evenement_titre set titre = titre where evenement_id = %L', ctx.ev2)),
  (20, 'evenement_titre', 'supprimer', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('delete from public.evenement_titre where evenement_id = %L', ctx.ev2)),
  (21, 'evenement_mention_retrait', 'ajouter', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_mention_retrait (mention_id) select m.id from public.evenement_mention m '
             'where m.evenement_id = %L and m.ministere_id = %L', ctx.ev2, ctx.b_m)),
  (22, 'evenement_retrait', 'ajouter', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_retrait (evenement_id) values (%L)', ctx.ev2)),
  (23, 'evenement_retrait', 'supprimer', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('delete from public.evenement_retrait where evenement_id = %L', ctx.ev3)),
  (24, 'evenement_etat (événement retiré)', 'ajouter', '{P0001, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_etat (evenement_id, date, statut) values (%L, %L, %L)',
             ctx.ev3, private.aujourdhui() + 12, 'valide')),
  (25, 'corriger_titre_evenement', 'appeler', '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('select public.corriger_titre_evenement(%L, %L)', ctx.ev2, 'Matrice T78, nom corrigé de nouveau')),
  (26, 'modifier_mentions_evenement', 'appeler', '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('select public.modifier_mentions_evenement(%L, array[%L, %L]::uuid[])', ctx.ev2, ctx.b_m, ctx.d_m)),
  (27, 'retirer_evenement', 'appeler', '{ok, 42501, 42501, 42501, 42501, 42501, ok}'::text[],
      format('select public.retirer_evenement(%L)', ctx.ev2))
) as o(rang, objet, action, attendus, requete)
cross join profil p
-- Ligne 24 en aal1 pour le porteur, écrite (un refus en aal2 n'a pas de ligne dérivée) : la
-- politique aal2 refuse avant tout message sur le retrait.
union all
select 1000, 'ministère porteur', 'evenement_etat (événement retiré)', 'ajouter', 'aal1', '42501',
       format('insert into public.evenement_etat (evenement_id, date, statut) values (%L, %L, %L)',
              ctx.ev3, private.aujourdhui() + 12, 'valide')
  from ctx;
grant select on matrice, profil to authenticated, anon;

-- Le plan compte les 9 tests fixes (jeu d'essai, 2 contrôles finaux) et, par tests.nombre_essais,
-- les essais de la matrice (lignes dérivées comprises). La matrice est une vue : elle lit
-- ctx.ev, ctx.ev2 et ctx.ev3 au moment de l'essai, une fois le jeu d'essai posé.
select plan(9 + tests.nombre_essais(
  'select profil, objet, action, aal, attendu, requete from matrice order by rang',
  'select nom, compte from profil',
  true));

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Matrice B6, événement', private.aujourdhui() + 10, 'attente_validation',
    array[(select b_m from ctx)])
$$, 'jeu d''essai : A ajoute un événement qui mentionne B');
select tests.deconnecter();
update ctx set ev = (select e.id from public.evenement e where e.titre = 'Matrice B6, événement');

-- T78 : ev2 mentionne B et D, son nom est corrigé, D est retiré de ses mentions ; ev3 est retiré.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Matrice T78, nom', private.aujourdhui() + 10, 'valide',
    array[(select b_m from ctx), (select d_m from ctx)])
$$, 'jeu d''essai : A ajoute ev2, qui mentionne B et D');
select lives_ok($$
  select public.ajouter_evenement('Matrice T78, retiré', private.aujourdhui() + 10, 'valide', array[(select b_m from ctx)])
$$, 'jeu d''essai : A ajoute ev3, qui mentionne B');
select tests.deconnecter();
update ctx set ev2 = (select e.id from public.evenement e where e.titre = 'Matrice T78, nom'),
               ev3 = (select e.id from public.evenement e where e.titre = 'Matrice T78, retiré');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.corriger_titre_evenement((select ev2 from ctx), 'Matrice T78, nom corrigé') $$,
  'jeu d''essai : A corrige le nom de ev2');
select lives_ok($$ select public.modifier_mentions_evenement((select ev2 from ctx), array[(select b_m from ctx)]) $$,
  'jeu d''essai : A retire D des mentions de ev2');
select lives_ok($$ select public.retirer_evenement((select ev3 from ctx)) $$,
  'jeu d''essai : A retire ev3');
select tests.deconnecter();
select ok((select count(*) from ctx where ev is not null and ev2 is not null and ev3 is not null) = 1,
  'le jeu d''essai a ses trois événements');


select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice order by rang',
  'select nom, compte from profil',
  true);

-- Aucune écriture directe dans evenement_mention : ni GRANT insert, ni politique d'ajout.
select ok(not has_table_privilege('authenticated', 'public.evenement_mention', 'INSERT'),
  'evenement_mention : aucun GRANT insert pour authenticated (ajout par ajouter_evenement seulement)');
select is_empty($$
  select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'evenement_mention' and p.cmd <> 'SELECT'
     and p.policyname <> 'double_authentification'
$$, 'evenement_mention : aucune politique d''ajout, de modification ni de suppression');

select * from finish();
rollback;
