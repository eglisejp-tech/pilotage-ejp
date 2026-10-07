-- Matrice des droits du domaine « points et traçabilité » (BRIEF, section 7, « Matrice des
-- droits » et « Tests obligatoires », section 8, double authentification) : point_attention,
-- point_mention, point_suivi, evenement, evenement_etat, reunion, journal et moderation.
-- La matrice est écrite comme des données (table, opération, profil, niveau aal, résultat
-- attendu), puis exécutée en boucle : chaque essai est annulé aussitôt, il ne change rien.
-- Profils : ministère créateur, ministère mentionné, autre ministère, berger, conseil,
-- administration de l'église et EJP Tech, chacun en aal1 et en aal2, puis l'anonyme.
-- Attendus : lecture refusée par la RLS, zéro ligne ; ajout refusé, erreur 42501 ; update,
-- delete ou droit absent, erreur 42501 ; en aal1, zéro ligne et aucune écriture.
begin;

select plan(497);

-- Jeu d'essai : trois ministères et un compte par profil (tests.creer_compte désactive le
-- berger du jeu d'exemple dans cette transaction).
create temp table ctx as
select tests.creer_ministere('Matrice points A') as a_m,
       tests.creer_ministere('Matrice points B') as b_m,
       tests.creer_ministere('Matrice points C') as c_m;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column berger uuid,
  add column conseil uuid, add column admin uuid, add column tech uuid, add column p1 uuid,
  add column p2 uuid, add column ev_a uuid, add column ev_b uuid, add column reunion_a uuid;
update ctx set a = tests.creer_compte('matrice-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('matrice-c@exemple.test', 'ministere', c_m),
               berger = tests.creer_compte('matrice-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('matrice-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('matrice-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('matrice-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

-- A crée deux points (le premier mentionne B), un événement et sa prochaine réunion ; B
-- ajoute un événement ; EJP Tech relit l'événement de B.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.creer_point('Matrice point 1', 'Description du point 1', 'Action du point 1', 'haute',
    private.aujourdhui() + 7, array[(select b_m from ctx)])
$$, 'jeu d''essai : A crée un point qui mentionne B');
select lives_ok($$ select public.creer_point('Matrice point 2', null, null, 'normale', null, '{}') $$,
  'jeu d''essai : A crée un point sans mention');
select lives_ok($$ select public.ajouter_evenement('Matrice événement A', private.aujourdhui() + 10, 'brouillon') $$,
  'jeu d''essai : A ajoute un événement');
select lives_ok($$
  insert into public.reunion (ministere_id, date, heure, objet)
  select ctx.a_m, private.aujourdhui() + 3, '20:00', 'Matrice réunion A' from ctx
$$, 'jeu d''essai : A déclare sa prochaine réunion');
select tests.deconnecter();

select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.ajouter_evenement('Matrice événement B', private.aujourdhui() + 11, 'valide') $$,
  'jeu d''essai : B ajoute un événement');
select tests.deconnecter();

update ctx set p1 = (select p.id from public.point_attention p where p.titre = 'Matrice point 1'),
               p2 = (select p.id from public.point_attention p where p.titre = 'Matrice point 2'),
               ev_a = (select e.id from public.evenement e where e.titre = 'Matrice événement A'),
               ev_b = (select e.id from public.evenement e where e.titre = 'Matrice événement B'),
               reunion_a = (select r.id from public.reunion r where r.objet = 'Matrice réunion A');

select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.marquer_relu('evenement', (select ev_b from ctx)) $$,
  'jeu d''essai : EJP Tech relit l''événement de B');
select tests.deconnecter();

select ok((select count(*) from ctx where p1 is not null and p2 is not null and ev_a is not null
             and ev_b is not null and reunion_a is not null) = 1,
  'le jeu d''essai a ses deux points, ses deux événements et sa réunion');

-- Profils, dans l'ordre des colonnes de la matrice.
create temp table profil as
select x.ordre, x.nom, x.compte
from ctx
cross join lateral (values
  (1, 'ministère créateur', ctx.a),
  (2, 'ministère mentionné', ctx.b),
  (3, 'autre ministère', ctx.c),
  (4, 'berger', ctx.berger),
  (5, 'conseil', ctx.conseil),
  (6, 'administration de l''église', ctx.admin),
  (7, 'EJP Tech', ctx.tech)
) as x(ordre, nom, compte);

-- La matrice en aal2, table par table. « lecture » : lignes du jeu d'essai que lit chaque
-- profil. « ajout » : résultat d'un ajout direct visant le ministère créateur A (ok : accepté,
-- 42501 : refusé). Colonnes dans l'ordre des profils : créateur, mentionné, autre ministère,
-- berger, conseil, administration, EJP Tech.
-- Un événement ne se crée que par ajouter_evenement : l'ajout direct dans evenement est
-- refusé à tous. Journal du jeu d'essai (6 lignes) : point_cree des deux points,
-- evenement_ajoute des deux événements, reunion_saisie de A (ministère A) ; texte_relu de
-- l'événement de B (ministère B). L'administration de l'église ne lit aucune ligne de journal
-- sur les points, les événements et les réunions (private.journal_lisible_administration),
-- ni, depuis le lot I (T47), leur relecture texte_relu. EJP Tech lit tout ce que lit le berger, en
-- lecture seule (docs/decisions.md, T29) : ses ajouts restent refusés ; seul EJP Tech lit la
-- modération.
-- Pour tous les profils : update et delete refusés (42501). En aal1 : zéro ligne, écritures
-- refusées (42501). Anonyme : 42501 partout, il n'a aucun droit.
create temp table matrice as
select x.ordre, x.nom_table, x.lecture, x.ajout, x.filtre, x.colonne, x.requete_ajout
from ctx
cross join lateral (values
  (1, 'point_attention',
      '{2, 1, 0, 2, 2, 0, 2}'::int[],
      '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('id in (%L, %L)', ctx.p1, ctx.p2), 'titre',
      format('insert into public.point_attention (ministere_id, titre) values (%L, %L)', ctx.a_m, 'Ajout direct')),
  (2, 'point_mention',
      '{1, 1, 0, 1, 1, 0, 1}'::int[],
      '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('point_id in (%L, %L)', ctx.p1, ctx.p2), 'ministere_id',
      format('insert into public.point_mention (point_id, ministere_id) values (%L, %L)', ctx.p2, ctx.c_m)),
  (3, 'point_suivi',
      '{2, 1, 0, 2, 2, 0, 2}'::int[],
      '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('point_id in (%L, %L)', ctx.p1, ctx.p2), 'statut',
      format('insert into public.point_suivi (point_id, statut) values (%L, %L)', ctx.p2, 'en_cours')),
  (4, 'evenement',
      '{1, 1, 0, 2, 2, 0, 2}'::int[],
      '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('id in (%L, %L)', ctx.ev_a, ctx.ev_b), 'titre',
      format('insert into public.evenement (ministere_id, titre) values (%L, %L)', ctx.a_m, 'Ajout direct')),
  (5, 'evenement_etat',
      '{1, 1, 0, 2, 2, 0, 2}'::int[],
      '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('evenement_id in (%L, %L)', ctx.ev_a, ctx.ev_b), 'statut',
      format('insert into public.evenement_etat (evenement_id, date, statut) values (%L, %L, %L)',
             ctx.ev_a, private.aujourdhui() + 12, 'valide')),
  (6, 'reunion',
      '{1, 0, 0, 1, 1, 0, 1}'::int[],
      '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('id = %L', ctx.reunion_a), 'objet',
      format('insert into public.reunion (ministere_id, date, heure) values (%L, %L, %L)',
             ctx.a_m, private.aujourdhui() + 2, '19:00')),
  (7, 'journal',
      '{4, 2, 0, 6, 6, 0, 6}'::int[],
      '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('cible_id in (%L, %L, %L, %L, %L)', ctx.p1, ctx.p2, ctx.ev_a, ctx.ev_b, ctx.reunion_a), 'detail',
      format('insert into public.journal (compte, ministere_id, action, cible, cible_id) values (%L, %L, %L, %L, %L)',
             ctx.a, ctx.a_m, 'point_cree', 'point_attention', ctx.p1)),
  (8, 'moderation',
      '{0, 0, 0, 0, 0, 0, 1}'::int[],
      '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('cible_id in (%L, %L, %L, %L, %L)', ctx.p1, ctx.p2, ctx.ev_a, ctx.ev_b, ctx.reunion_a), 'motif',
      format('insert into public.moderation (cible, cible_id, decision, par) values (%L, %L, %L, %L)',
             'point_attention', ctx.p1, 'rien_a_signaler', ctx.tech))
) as x(ordre, nom_table, lecture, ajout, filtre, colonne, requete_ajout);

-- Exécute une requête au nom d'un compte (null : l'anonyme), puis annule tout ce qu'elle a
-- fait. Rend le nombre de lignes lues (mode « lignes »), « ok » pour une écriture acceptée,
-- sinon le code d'erreur.
create function pg_temp.essai(p_compte uuid, p_aal text, p_requete text, p_mode text)
returns text
language plpgsql as $$
declare
  v_resultat text;
begin
  begin
    if p_compte is null then
      perform tests.anonyme();
    else
      perform tests.se_connecter(p_compte, p_aal);
    end if;
    if p_mode = 'lignes' then
      execute format('select count(*)::text from (%s) as x', p_requete) into v_resultat;
    else
      execute p_requete;
      v_resultat := 'ok';
    end if;
    raise exception using errcode = 'ZZ002', message = 'essai annulé';
  exception
    when sqlstate 'ZZ002' then
      null;
    when others then
      v_resultat := sqlstate;
  end;
  return v_resultat;
end $$;

-- 8 tables x 4 opérations x 15 profils (7 en aal1, 7 en aal2, l'anonyme) = 480 essais.
create function pg_temp.verifier_matrice() returns setof text
language plpgsql as $$
declare
  r record;
begin
  for r in
    select m.nom_table, o.operation, v.nom as profil, v.compte, v.aal,
           case o.operation
             when 'select' then format('select 1 from public.%I where %s', m.nom_table, m.filtre)
             when 'insert' then m.requete_ajout
             when 'update' then format('update public.%I set %I = %I where %s', m.nom_table, m.colonne, m.colonne, m.filtre)
             else format('delete from public.%I where %s', m.nom_table, m.filtre)
           end as requete,
           case
             when v.compte is null then '42501'
             when v.aal = 'aal1' then case o.operation when 'select' then '0' else '42501' end
             when o.operation = 'select' then m.lecture[v.ordre]::text
             when o.operation = 'insert' then m.ajout[v.ordre]
             else '42501'
           end as attendu
    from matrice m
    cross join (values (1, 'select'), (2, 'insert'), (3, 'update'), (4, 'delete')) as o(rang, operation)
    cross join (
      select p.ordre, p.nom, p.compte, n.aal, n.rang
        from profil p
       cross join (values (1, 'aal1'), (2, 'aal2')) as n(rang, aal)
      union all
      select 8, 'anonyme', null::uuid, null::text, 3
    ) as v
    order by m.ordre, o.rang, v.rang, v.ordre
  loop
    return next is(
      pg_temp.essai(r.compte, r.aal, r.requete, case r.operation when 'select' then 'lignes' else 'code' end),
      r.attendu,
      format('%s, %s, %s : %s', r.nom_table, r.operation, r.profil || coalesce(' en ' || r.aal, ''),
             case r.attendu when 'ok' then 'accepté' when '42501' then 'refusé (42501)' else r.attendu || ' ligne(s)' end));
  end loop;
end $$;

select * from pg_temp.verifier_matrice();

-- Cas obligatoires, écrits en clair (lecture en aal2)
select is(tests.compter((select c from ctx), 'aal2',
  'select 1 from public.v_point v where v.id in (select p1 from ctx union all select p2 from ctx)'), 0,
  'un ministère ne lit pas le point d''un autre ministère qui ne le mentionne pas (v_point comprise)');
select is(tests.lire((select b from ctx), 'aal2',
  'select v.id, v.statut from public.v_point v where v.id in (select p1 from ctx union all select p2 from ctx)'),
  (select jsonb_build_array(jsonb_build_object('id', p1, 'statut', 'a_traiter')) from ctx),
  'le ministère mentionné lit le point qui le mentionne, avec son statut, et pas l''autre point du créateur');
select is(tests.lire((select b from ctx), 'aal2',
  'select m.ministere_id from public.point_mention m where m.point_id = (select p1 from ctx)'),
  (select jsonb_build_array(jsonb_build_object('ministere_id', b_m)) from ctx),
  'le ministère mentionné lit les mentions de ce point');
select is(tests.compter((select a from ctx), 'aal2',
  'select 1 from public.v_point v where v.id in (select p1 from ctx union all select p2 from ctx)'), 2,
  'le ministère créateur lit ses deux points');
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.v_point'), 0,
  'l''administration de l''église ne lit aucun point');
select is(tests.compter((select admin from ctx), 'aal2',
  'select 1 from public.v_journal j where j.cible_id in (select p1 from ctx union all select p2 from ctx)'), 0,
  'l''administration ne lit aucune ligne de journal sur les points, même par v_journal');
select is(tests.lire((select admin from ctx), 'aal2',
  'select j.action from public.v_journal j
    where j.cible_id in (select ev_a from ctx union all select ev_b from ctx union all select reunion_a from ctx)'),
  '[]'::jsonb,
  'l''administration ne lit ni les événements ni les réunions au journal, ni leur relecture par EJP Tech (T47)');
select is(tests.lire((select berger from ctx), 'aal2',
  'select j.action, j.cible_texte from public.v_journal j where j.cible_id = (select p1 from ctx)'),
  '[{"action": "point_cree", "cible_texte": "Matrice point 1"}]'::jsonb,
  'le berger lit la ligne de journal du point avec son titre actuel');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.v_journal j where j.cible_id = (select p1 from ctx)'), 0,
  'la mention ne donne pas accès au journal du ministère créateur');
select is(tests.lire((select tech from ctx), 'aal2',
  'select v.* from public.v_point v where v.id in (select p1 from ctx union all select p2 from ctx)'),
  tests.lire((select berger from ctx), 'aal2',
  'select v.* from public.v_point v where v.id in (select p1 from ctx union all select p2 from ctx)'),
  'EJP Tech lit les points et leur statut comme le berger, en lecture seule (T29)');

select * from finish();
rollback;
