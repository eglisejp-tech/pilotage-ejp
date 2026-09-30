-- Fonctions de l'API vues du domaine « points et traçabilité » (BRIEF, section 3, règles 7 et
-- 8, section 7, « Fonctions de l'API » et « Tests obligatoires » ; décision D3, propositions
-- P03 et P04) : chaque fonction pour chaque profil en aal1 et en aal2, et pour l'anonyme
-- (matrice en boucle, chaque appel annulé aussitôt) ; statuts intermédiaires ; « Marquer
-- traité » ; un point traité ne se rouvre pas et reste « Traité ».
begin;

select plan(182);

-- Jeu d'essai : trois ministères et un compte par profil (tests.creer_compte désactive le
-- berger du jeu d'exemple dans cette transaction).
create temp table ctx as
select tests.creer_ministere('Fonctions points A') as a_m,
       tests.creer_ministere('Fonctions points B') as b_m,
       tests.creer_ministere('Fonctions points C') as c_m;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column berger uuid,
  add column conseil uuid, add column admin uuid, add column tech uuid, add column s1 uuid,
  add column p1 uuid, add column q1 uuid, add column q2 uuid, add column q3 uuid, add column q4 uuid,
  add column q5 uuid, add column q6 uuid, add column q7 uuid;
update ctx set a = tests.creer_compte('fonctions-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('fonctions-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('fonctions-c@exemple.test', 'ministere', c_m),
               berger = tests.creer_compte('fonctions-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('fonctions-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('fonctions-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('fonctions-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated, anon;

-- A crée ses points : P1 (mentionne B) sert à la matrice des fonctions, Q1 à Q5 à « Marquer
-- traité », Q6 aux statuts, Q7 au point qui reste traité. L'administration déclare une session
-- sans saisie.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.creer_point(v.titre, v.description, null, 'normale', null, v.mentions)
  from (values
    ('Fonctions point 1', 'Description du point 1', array[(select b_m from ctx)]),
    ('Point D3 mentionné', null, array[(select b_m from ctx)]),
    ('Point D3 créateur', null, '{}'::uuid[]),
    ('Point D3 berger', null, '{}'::uuid[]),
    ('Point D3 conseil', null, '{}'::uuid[]),
    ('Point D3 longueur', null, '{}'::uuid[]),
    ('Point des statuts', null, array[(select b_m from ctx)]),
    ('Point traité malgré une date plus récente', null, '{}'::uuid[])
  ) as v(titre, description, mentions)
$$, 'jeu d''essai : A crée huit points');
select tests.deconnecter();

select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$
  select public.declarer_session('autre', private.aujourdhui() + 20, 'Rassemblement essai points',
    array[(select a_m from ctx)])
$$, 'jeu d''essai : l''administration déclare une session sans saisie');
select tests.deconnecter();

update ctx set s1 = (select s.id from public.session s where s.intitule = 'Rassemblement essai points'),
               p1 = (select p.id from public.point_attention p where p.titre = 'Fonctions point 1'),
               q1 = (select p.id from public.point_attention p where p.titre = 'Point D3 mentionné'),
               q2 = (select p.id from public.point_attention p where p.titre = 'Point D3 créateur'),
               q3 = (select p.id from public.point_attention p where p.titre = 'Point D3 berger'),
               q4 = (select p.id from public.point_attention p where p.titre = 'Point D3 conseil'),
               q5 = (select p.id from public.point_attention p where p.titre = 'Point D3 longueur'),
               q6 = (select p.id from public.point_attention p where p.titre = 'Point des statuts'),
               q7 = (select p.id from public.point_attention p where p.titre = 'Point traité malgré une date plus récente');

select ok((select count(*) from ctx where s1 is not null and p1 is not null and q1 is not null and q2 is not null
             and q3 is not null and q4 is not null and q5 is not null and q6 is not null and q7 is not null) = 1,
  'le jeu d''essai a sa session et ses huit points');

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

-- Chaque fonction de l'API : un appel valable, les profils qui y ont droit en aal2 (dans
-- l'ordre : créateur, mentionné, autre ministère, berger, conseil, administration, EJP Tech)
-- et le message que reçoivent les autres profils en aal2. En aal1, tout profil reçoit
-- « Double authentification requise. » (42501) ; l'anonyme n'a pas le droit d'exécuter (42501).
create temp table appel as
select x.ordre, x.fonction, x.requete, x.autorises, x.refus
from ctx
cross join lateral (values
  (1, 'creer_point',
      'select public.creer_point(''Essai de la matrice'', null, null, ''normale'', null, ''{}'')',
      '{1, 2, 3}'::int[], 'Seul un compte de ministère peut créer un point.'),
  (2, 'changer_statut_point',
      format('select public.changer_statut_point(%L, %L)', ctx.p1, 'en_cours'),
      '{1, 2}'::int[], 'Ce point n''existe pas ou vous n''y avez pas accès.'),
  (3, 'marquer_traite',
      format('select public.marquer_traite(%L, %L)', ctx.p1, 'Réglé avec le ministère concerné.'),
      '{1, 2, 4, 5}'::int[], 'Ce point n''existe pas ou vous n''y avez pas accès.'),
  (4, 'ajouter_evenement',
      format('select public.ajouter_evenement(%L, %L, %L)', 'Essai de la matrice', private.aujourdhui() + 5, 'brouillon'),
      '{1, 2, 3}'::int[], 'Seul un compte de ministère peut ajouter un événement.'),
  (5, 'declarer_session',
      format('select public.declarer_session(%L, %L, %L, %L)', 'autre', private.aujourdhui() + 21,
             'Rassemblement de la matrice', array[ctx.a_m]),
      '{6}'::int[], 'Seule l''administration de l''église déclare une session.'),
  (6, 'modifier_session',
      format('select public.modifier_session(%L, %L)', ctx.s1, array[ctx.a_m, ctx.b_m]),
      '{6}'::int[], 'Cette session n''existe pas ou vous n''y avez pas accès.'),
  (7, 'supprimer_session',
      format('select public.supprimer_session(%L)', ctx.s1),
      '{6}'::int[], 'Cette session n''existe pas ou vous n''y avez pas accès.'),
  (8, 'marquer_relu',
      format('select public.marquer_relu(%L, %L)', 'point_attention', ctx.p1),
      '{7}'::int[], 'Seul EJP Tech peut relire un texte.'),
  (9, 'masquer_texte',
      format('select public.masquer_texte(%L, %L, %L, %L)', 'point_attention', ctx.p1, 'description', 'autre'),
      '{7}'::int[], 'Seul EJP Tech peut masquer un texte.')
) as x(ordre, fonction, requete, autorises, refus);

-- Exécute une requête au nom d'un compte (null : l'anonyme), puis annule tout ce qu'elle a
-- fait. Rend « ok » si elle passe, sinon le code d'erreur (mode « code ») ou le code suivi du
-- message (mode « message »).
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
    execute p_requete;
    v_resultat := 'ok';
    raise exception using errcode = 'ZZ002', message = 'essai annulé';
  exception
    when sqlstate 'ZZ002' then
      null;
    when others then
      v_resultat := case p_mode when 'message' then sqlstate || ' ' || sqlerrm else sqlstate end;
  end;
  return v_resultat;
end $$;

-- 9 fonctions x 15 profils (7 en aal1, 7 en aal2, l'anonyme) = 135 appels.
create function pg_temp.verifier_fonctions() returns setof text
language plpgsql as $$
declare
  r record;
begin
  for r in
    select f.fonction, f.requete, v.nom as profil, v.compte, v.aal,
           case
             when v.compte is null then '42501'
             when v.aal = 'aal1' then '42501 Double authentification requise.'
             when v.ordre = any (f.autorises) then 'ok'
             else '42501 ' || f.refus
           end as attendu
    from appel f
    cross join (
      select p.ordre, p.nom, p.compte, n.aal, n.rang
        from profil p
       cross join (values (1, 'aal1'), (2, 'aal2')) as n(rang, aal)
      union all
      select 8, 'anonyme', null::uuid, null::text, 3
    ) as v
    order by f.ordre, v.rang, v.ordre
  loop
    return next is(
      pg_temp.essai(r.compte, r.aal, r.requete, case when r.compte is null then 'code' else 'message' end),
      r.attendu,
      format('%s, %s : %s', r.fonction, r.profil || coalesce(' en ' || r.aal, ''),
             case r.attendu when 'ok' then 'acceptée' else 'refusée' end));
  end loop;
end $$;

select * from pg_temp.verifier_fonctions();

-- Statuts intermédiaires (règle 7, P04) : le ministère créateur et les ministères mentionnés
-- font passer un point ouvert d'un statut ouvert à un autre ; personne d'autre.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select q6 from ctx), 'en_cours') $$,
  'statuts : le ministère créateur passe le point « En cours »');
select tests.deconnecter();
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select q6 from ctx), 'attente_decision') $$,
  'statuts : le ministère mentionné passe le point « En attente de décision »');
select lives_ok($$ select public.changer_statut_point((select q6 from ctx), 'a_traiter') $$,
  'statuts : le ministère mentionné le remet « À traiter »');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select q6 from ctx), 'a_traiter') $$,
  'statuts : le même statut est accepté sans rien écrire');
select throws_ok($$ select public.changer_statut_point((select q6 from ctx), 'traite') $$,
  'P0001', 'Utilisez le bouton Marquer traité.', 'statuts : « Traité » ne passe pas par changer_statut_point');
select throws_ok($$ select public.changer_statut_point(gen_random_uuid(), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'statuts : un point inconnu reçoit le même message qu''un point interdit');
select tests.deconnecter();
select tests.se_connecter((select c from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q6 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'statuts : un autre ministère est refusé');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q6 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'statuts : le berger ne change pas les statuts');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q6 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'statuts : le conseil ne change pas les statuts');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q6 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'statuts : l''administration de l''église est refusée');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q6 from ctx), 'en_cours') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'statuts : EJP Tech est refusé');
select tests.deconnecter();

select results_eq($$
  select s.statut::text, s.saisi_par from public.point_suivi s
   where s.point_id = (select q6 from ctx) order by s.saisi_le, s.id
$$, $$
  select 'a_traiter', a from ctx
  union all select 'en_cours', a from ctx
  union all select 'attente_decision', b from ctx
  union all select 'a_traiter', b from ctx
$$, 'statuts : quatre lignes de suivi au nom de leur auteur, rien pour les refus ni pour le même statut');
select results_eq($$
  select j.compte, j.ministere_id, j.detail from public.journal j
   where j.action = 'point_statut' and j.cible_id = (select q6 from ctx) order by j.id
$$, $$
  select a, a_m, '{"statut": ["a_traiter", "en_cours"]}'::jsonb from ctx
  union all select b, a_m, '{"statut": ["en_cours", "attente_decision"]}'::jsonb from ctx
  union all select b, a_m, '{"statut": ["attente_decision", "a_traiter"]}'::jsonb from ctx
$$, 'statuts : trois lignes de journal point_statut, compte de l''auteur, ministère créateur');
select is((select v.statut::text from public.v_point v where v.id = (select q6 from ctx)), 'a_traiter',
  'statuts : le statut courant est le dernier posé');

-- Marquer traité (D3, P03) : refus d'abord, rien ne doit changer
create temp view points_d3 as
select unnest(array[q1, q2, q3, q4, q5]) as id from ctx;
create temp table avant as
select (select count(*) from public.point_suivi s where s.point_id in (select id from points_d3)) as suivis,
       (select count(*) from public.journal j where j.cible_id in (select id from points_d3)) as lignes;

select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q1 from ctx)) $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'D3 : le ministère mentionné sans commentaire est refusé');
select throws_ok($$ select public.marquer_traite((select q1 from ctx), '     ') $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'D3 : un commentaire fait d''espaces compte comme absent');
select throws_ok($$ select public.marquer_traite((select q1 from ctx), '  ' || repeat('x', 9) || '  ') $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'D3 : 9 caractères (espaces autour retirés) sont refusés au ministère mentionné');
select throws_ok($$ select public.marquer_traite((select q1 from ctx), repeat('x', 281)) $$,
  'P0001', 'Le commentaire dépasse 280 caractères.', 'D3 : 281 caractères sont refusés au ministère mentionné');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q2 from ctx)) $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'D3 : le ministère créateur sans commentaire est refusé');
select throws_ok($$ select public.marquer_traite((select q2 from ctx), repeat('x', 9)) $$,
  'P0001', 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
  'D3 : le ministère créateur avec 9 caractères est refusé');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q5 from ctx), repeat('x', 281)) $$,
  'P0001', 'Le commentaire dépasse 280 caractères.', 'D3 : 281 caractères sont refusés au berger');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal1');
select throws_ok($$ select public.marquer_traite((select q3 from ctx)) $$,
  '42501', 'Double authentification requise.', 'D3 : le berger en aal1 est refusé');
select tests.deconnecter();
select tests.se_connecter((select c from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q1 from ctx), 'Commentaire assez long') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'D3 : un ministère ni créateur ni mentionné est refusé');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q3 from ctx)) $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'D3 : l''administration de l''église ne marque jamais un point traité');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q3 from ctx), 'Commentaire assez long') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.', 'D3 : EJP Tech ne marque jamais un point traité');
select tests.deconnecter();
select tests.anonyme();
select throws_ok($$ select public.marquer_traite((select q3 from ctx)) $$, '42501', null,
  'D3 : l''anonyme est refusé');
select tests.deconnecter();

select ok((select count(*) from public.point_suivi s where s.point_id in (select id from points_d3)) = (select suivis from avant)
          and (select count(*) from public.journal j where j.cible_id in (select id from points_d3)) = (select lignes from avant),
  'D3 : les refus ne changent rien, ni suivi ni journal');

-- Marquer traité : appels acceptés
select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select q1 from ctx), 'Réglé hier') $$,
  'D3 : le ministère mentionné marque traité avec un commentaire de 10 caractères');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select q2 from ctx), '  Point créé par erreur, rien à traiter.  ') $$,
  'D3 : le ministère créateur marque traité avec un commentaire');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select q3 from ctx)) $$,
  'D3 : le berger marque traité sans commentaire');
select lives_ok($$ select public.marquer_traite((select q5 from ctx), repeat('x', 280)) $$,
  'D3 : le berger écrit un commentaire de 280 caractères');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select q4 from ctx), null) $$,
  'D3 : le conseil marque traité sans commentaire');
select tests.deconnecter();

select results_eq($$
  select s.point_id, s.commentaire, s.saisi_par from public.point_suivi s
   where s.statut = 'traite' and s.point_id in (select id from points_d3)
   order by s.saisi_le
$$, $$
  select q1, 'Réglé hier', b from ctx
  union all select q2, 'Point créé par erreur, rien à traiter.', a from ctx
  union all select q3, null, berger from ctx
  union all select q5, repeat('x', 280), berger from ctx
  union all select q4, null, conseil from ctx
$$, 'D3 : une ligne « traite » par point, au nom de l''appelant, commentaire sans les espaces autour');
select results_eq($$
  select j.cible_id, j.compte, j.ministere_id, j.detail from public.journal j
   where j.action = 'point_traite' and j.cible_id in (select id from points_d3)
   order by j.id
$$, $$
  select q1, b, a_m, '{"avec_commentaire": true}'::jsonb from ctx
  union all select q2, a, a_m, '{"avec_commentaire": true}'::jsonb from ctx
  union all select q3, berger, a_m, '{"avec_commentaire": false}'::jsonb from ctx
  union all select q5, berger, a_m, '{"avec_commentaire": true}'::jsonb from ctx
  union all select q4, conseil, a_m, '{"avec_commentaire": false}'::jsonb from ctx
$$, 'D3 : une seule ligne de journal point_traite par point, compte de l''appelant, ministère créateur');

-- Un point traité ne se rouvre pas
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q1 from ctx), 'a_traiter') $$,
  'P0001', 'Ce point est traité : il ne change plus.', 'point traité : le ministère créateur ne le remet pas « À traiter »');
select throws_ok($$ select public.changer_statut_point((select q3 from ctx), 'en_cours') $$,
  'P0001', 'Ce point est traité : il ne change plus.', 'point traité par le berger : il ne se rouvre pas');
select tests.deconnecter();
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q1 from ctx), 'attente_decision') $$,
  'P0001', 'Ce point est traité : il ne change plus.', 'point traité : le ministère mentionné ne le rouvre pas');
select throws_ok($$ select public.marquer_traite((select q1 from ctx), 'Encore une fois, autrement.') $$,
  'P0001', 'Ce point est déjà traité.', 'point traité : il ne se traite pas une deuxième fois');
select tests.deconnecter();
select tests.se_connecter((select conseil from ctx), 'aal2');
select throws_ok($$ select public.marquer_traite((select q2 from ctx)) $$,
  'P0001', 'Ce point est déjà traité.', 'point traité : le conseil ne le traite pas une deuxième fois');
select tests.deconnecter();

select is((select count(*)::int from public.v_point v where v.id in (select id from points_d3) and v.statut = 'traite'), 5,
  'point traité : les cinq points restent « Traité »');
select is((select count(*)::int from public.point_suivi s where s.point_id in (select id from points_d3) and s.statut = 'traite'), 5,
  'point traité : un seul traitement par point');

-- Un point traité reste « Traité » quelle que soit la date des autres lignes de suivi
-- (horloge, jeu d'exemple) : le propriétaire des tables pose une ligne datée de demain, puis
-- le berger marque le point traité.
insert into public.point_suivi (point_id, statut, saisi_le, saisi_par)
select q7, 'attente_decision', now() + interval '1 day', a from ctx;
select tests.se_connecter((select berger from ctx), 'aal2');
select lives_ok($$ select public.marquer_traite((select q7 from ctx)) $$,
  'le berger marque traité un point dont une ligne de suivi est datée de demain');
select tests.deconnecter();
select is((select v.statut::text from public.v_point v where v.id = (select q7 from ctx)), 'traite',
  'un point traité reste « Traité » même si une autre ligne de suivi est plus récente');
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select q7 from ctx), 'en_cours') $$,
  'P0001', 'Ce point est traité : il ne change plus.', 'et il ne se rouvre pas');
select tests.deconnecter();

select * from finish();
rollback;
