-- Mentions modifiables sur un point non traité (décision T54 ; BRIEF, section 3 règle 7 et
-- section 7, matrice des droits et fonctions de l'API).
--
-- Objets : point_mention (ajouts, avec identifiant, date et auteur), point_mention_retrait
-- (retraits, ajout seulement), la vue v_point_mention (mentions effectives) et les fonctions
-- ajouter_mention_point, retirer_mention_point et modifier_mentions_point.
--
-- Partie 1 : la matrice des droits, écrite en données et parcourue par tests.verifier_matrice
-- (000-outils.test.sql), pour huit profils : ministère créateur, ministère mentionné, ministère
-- retiré, autre ministère, berger, conseil, administration de l'église et EJP Tech. Chaque ligne
-- acceptée a sa ligne aal1 (zéro ligne lue, appel refusé 42501) et chaque objet sa ligne de
-- l'anonyme (refusé partout).
-- Partie 2 : les cas écrits en clair : visibilité (un ministère ajouté voit le point, un ministère
-- retiré ne le voit plus, ajouté de nouveau il le revoit), droits d'action du ministère retiré,
-- berger et conseil, une ligne de journal par ajout et par retrait sans texte libre, refus (point
-- traité, créateur, ministère désactivé, doublon, retrait d'un ministère non mentionné, droit),
-- atomicité de modifier_mentions_point, inaltérabilité, et le cas d'un ministère mentionné qui a
-- été désactivé (plan de l'étape 5, I5).
begin;

-- Jeu d'essai : un ministère créateur (A), un mentionné (B), un retiré (C), un autre (D), un
-- ministère désactivé (E), un ministère mentionné puis désactivé (F). D et E ont des
-- identifiants fixes, dans cet ordre, pour que l'atomicité se prouve (D est traité avant E).
create temp table ctx as
select tests.creer_ministere('Mentions A') as a_m,
       tests.creer_ministere('Mentions B') as b_m,
       tests.creer_ministere('Mentions C') as c_m,
       '00000000-0000-4000-8000-0000000000d1'::uuid as d_m,
       '00000000-0000-4000-8000-0000000000e1'::uuid as e_m,
       tests.creer_ministere('Mentions F') as f_m;
insert into public.ministere (id, nom, cree_le)
select d_m, 'Mentions D', now() - interval '1 year' from ctx
union all
select e_m, 'Mentions E', now() - interval '1 year' from ctx;
update public.ministere set desactive_le = now() where id = (select e_m from ctx);
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column d uuid,
  add column f uuid, add column berger uuid, add column conseil uuid, add column admin uuid,
  add column tech uuid, add column p1 uuid, add column p2 uuid, add column p3 uuid,
  add column p5 uuid, add column mention_b uuid;
update ctx set a = tests.creer_compte('mentions-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('mentions-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('mentions-c@exemple.test', 'ministere', c_m),
               d = tests.creer_compte('mentions-d@exemple.test', 'ministere', d_m),
               f = tests.creer_compte('mentions-f@exemple.test', 'ministere', f_m),
               berger = tests.creer_compte('mentions-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('mentions-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('mentions-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('mentions-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated, anon;

-- A crée quatre points : p1 (mentionne B), p2 (mentionne B et C), p3 (sans mention, traité) et
-- p5 (mentionne F). Puis il retire C de p2.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.creer_point('Mentions point 1', null, null, 'normale', null, array[(select b_m from ctx)]);
  perform public.creer_point('Mentions point 2', null, null, 'normale', null,
                             array[(select b_m from ctx), (select c_m from ctx)]);
  perform public.creer_point('Mentions point 3', null, null, 'normale', null, '{}');
  perform public.creer_point('Mentions point 5', null, null, 'normale', null, array[(select f_m from ctx)]);
  perform tests.deconnecter();
end $$;

update ctx set p1 = (select p.id from public.point_attention p where p.titre = 'Mentions point 1'),
               p2 = (select p.id from public.point_attention p where p.titre = 'Mentions point 2'),
               p3 = (select p.id from public.point_attention p where p.titre = 'Mentions point 3'),
               p5 = (select p.id from public.point_attention p where p.titre = 'Mentions point 5');
update ctx set mention_b = (select m.id from public.point_mention m
                             where m.point_id = ctx.p2 and m.ministere_id = ctx.b_m);

do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.retirer_mention_point((select p2 from ctx), (select c_m from ctx));
  perform public.changer_statut_point((select p2 from ctx), 'en_cours');
  perform public.marquer_traite((select p3 from ctx), 'Le point a été créé par erreur, rien à faire.');
  perform tests.deconnecter();
end $$;

-- Profils, dans l'ordre des colonnes de la matrice.
create temp view profil_mentions (profil, compte) as
  select 'créateur', c.a from ctx c union all select 'mentionné', c.b from ctx c
  union all select 'retiré', c.c from ctx c union all select 'autre ministère', c.d from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;

-- Matrice en aal2. État du point 2 : mentions posées B et C, C retiré, donc B seul est mentionné.
-- Attendus dans l'ordre des profils : créateur, mentionné, retiré, autre ministère, berger,
-- conseil, administration, EJP Tech.
create temp view matrice_mentions (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'créateur'), (2, 'mentionné'), (3, 'retiré'), (4, 'autre ministère'),
                 (5, 'berger'), (6, 'conseil'), (7, 'administration'), (8, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('point_mention', 'lire', array['2', '2', '0', '0', '2', '2', '0', '2'],
      'select 1 from public.point_mention where point_id = (select p2 from ctx)'),
     ('point_mention_retrait', 'lire', array['1', '1', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.point_mention_retrait where mention_id in (select m.id from public.point_mention m where m.point_id = (select p2 from ctx))'),
     ('v_point_mention', 'lire', array['1', '1', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_point_mention where point_id = (select p2 from ctx)'),
     ('v_point', 'lire', array['1', '1', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_point where id = (select p2 from ctx)'),
     ('point_suivi', 'lire', array['2', '2', '0', '0', '2', '2', '0', '2'],
      'select 1 from public.point_suivi where point_id = (select p2 from ctx)'),
     ('point_mention', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.point_mention (point_id, ministere_id) select p2, d_m from ctx'),
     ('point_mention', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.point_mention set ministere_id = ministere_id where point_id = (select p2 from ctx)'),
     ('point_mention', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.point_mention where point_id = (select p2 from ctx)'),
     ('point_mention_retrait', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.point_mention_retrait (mention_id) select mention_b from ctx'),
     ('point_mention_retrait', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.point_mention_retrait set mention_id = mention_id'),
     ('point_mention_retrait', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.point_mention_retrait'),
     ('ajouter_mention_point', 'appeler', array['ok', '42501', '42501', '42501', 'ok', 'ok', '42501', '42501'],
      'select public.ajouter_mention_point((select p2 from ctx), (select d_m from ctx))'),
     ('retirer_mention_point', 'appeler', array['ok', '42501', '42501', '42501', 'ok', 'ok', '42501', '42501'],
      'select public.retirer_mention_point((select p2 from ctx), (select b_m from ctx))'),
     ('modifier_mentions_point', 'appeler', array['ok', '42501', '42501', '42501', 'ok', 'ok', '42501', '42501'],
      'select public.modifier_mentions_point((select p2 from ctx), array[(select b_m from ctx), (select d_m from ctx)])')
   ) as m(objet, action, attendu, requete);
grant select on matrice_mentions, profil_mentions to authenticated, anon;

-- Le plan compte les 65 tests fixes et, par tests.nombre_essais, les essais de la matrice
-- (lignes dérivées comprises).
select plan(65
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_mentions',
                        'select profil, compte from profil_mentions', true));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_mentions',
  'select profil, compte from profil_mentions',
  true);

select ok((select count(*) from ctx where a is not null and b is not null and c is not null
             and d is not null and f is not null and berger is not null and conseil is not null
             and admin is not null and tech is not null and p1 is not null and p2 is not null
             and p3 is not null and p5 is not null and mention_b is not null) = 1,
  'le jeu d''essai a ses neuf comptes, ses quatre points et la mention de B sur le point 2');
select is((select count(*)::integer from public.v_point_mention where point_id = (select p2 from ctx)), 1,
  'le point 2 garde une seule mention effective (B) : C a été retiré');

-- Les refus de la partie 2 (message exact) sur le point 2 : B est mentionné, C est retiré, D n'a
-- jamais été mentionné, E est désactivé.
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.ajouter_mention_point((select p2 from ctx), (select a_m from ctx)) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.',
  'ajouter : le ministère créateur ne peut pas se mentionner');
select throws_ok($$ select public.ajouter_mention_point((select p2 from ctx), (select e_m from ctx)) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.',
  'ajouter : un ministère désactivé ne peut pas être mentionné');
select throws_ok($$ select public.ajouter_mention_point((select p2 from ctx), gen_random_uuid()) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.',
  'ajouter : un ministère inconnu ne peut pas être mentionné');
select throws_ok($$ select public.ajouter_mention_point((select p2 from ctx), null) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.',
  'ajouter : un ministère vide est refusé');
select throws_ok($$ select public.ajouter_mention_point((select p2 from ctx), (select b_m from ctx)) $$,
  'P0001', 'Ce ministère est déjà mentionné sur ce point.',
  'ajouter : un ministère déjà mentionné est refusé (pas de doublon)');
select throws_ok($$ select public.retirer_mention_point((select p2 from ctx), (select d_m from ctx)) $$,
  'P0001', 'Ce ministère n''est pas mentionné sur ce point.',
  'retirer : un ministère jamais mentionné est refusé');
select throws_ok($$ select public.retirer_mention_point((select p2 from ctx), (select c_m from ctx)) $$,
  'P0001', 'Ce ministère n''est pas mentionné sur ce point.',
  'retirer : un ministère déjà retiré est refusé');
select throws_ok($$ select public.retirer_mention_point(gen_random_uuid(), (select b_m from ctx)) $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'retirer : un point inconnu est refusé avec le message d''un point absent');
select throws_ok($$ select public.modifier_mentions_point((select p2 from ctx), null) $$,
  'P0001', 'Choisissez les ministères à mentionner.',
  'modifier : une liste vide de valeur (null) est refusée');
select throws_ok($$ select public.ajouter_mention_point((select p3 from ctx), (select c_m from ctx)) $$,
  'P0001', 'Ce point est traité : ses mentions ne changent plus.',
  'ajouter : un point traité est refusé');
select throws_ok($$ select public.retirer_mention_point((select p3 from ctx), (select c_m from ctx)) $$,
  'P0001', 'Ce point est traité : ses mentions ne changent plus.',
  'retirer : un point traité est refusé');
select throws_ok($$ select public.modifier_mentions_point((select p3 from ctx), '{}') $$,
  'P0001', 'Ce point est traité : ses mentions ne changent plus.',
  'modifier : un point traité est refusé');
select tests.deconnecter();

select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.ajouter_mention_point((select p2 from ctx), (select d_m from ctx)) $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'un ministère mentionné ne modifie pas les mentions (même message qu''un point absent)');
select tests.deconnecter();

-- Visibilité sur le point 1 (mentionne B). Avant tout, C ne le voit pas.
select is(tests.compter((select c from ctx), 'aal2', 'select 1 from public.v_point where id = (select p1 from ctx)'), 0,
  'visibilité : un ministère non mentionné ne voit pas le point');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_mention_point((select p1 from ctx), (select c_m from ctx)) $$,
  'visibilité : A ajoute C');
select tests.deconnecter();
select is(tests.compter((select c from ctx), 'aal2', 'select 1 from public.v_point where id = (select p1 from ctx)'), 1,
  'visibilité : le ministère ajouté voit le point');

select tests.se_connecter((select c from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select p1 from ctx), 'en_cours') $$,
  'visibilité : le ministère ajouté change le statut du point');
select tests.deconnecter();

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.retirer_mention_point((select p1 from ctx), (select b_m from ctx)) $$,
  'visibilité : A retire B');
select tests.deconnecter();
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.v_point where id = (select p1 from ctx)'), 0,
  'visibilité : le ministère retiré ne voit plus le point');
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.point_mention where point_id = (select p1 from ctx)'), 0,
  'visibilité : le ministère retiré ne lit plus les mentions du point');
select is(tests.compter((select c from ctx), 'aal2', 'select 1 from public.v_point_mention where point_id = (select p1 from ctx)'), 1,
  'visibilité : les mentions effectives du point ne contiennent plus B (C seul)');

select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select p1 from ctx), 'a_traiter') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'un ministère retiré ne change plus le statut du point');
select throws_ok($$ select public.marquer_traite((select p1 from ctx), 'Un commentaire assez long pour passer.') $$,
  '42501', 'Ce point n''existe pas ou vous n''y avez pas accès.',
  'un ministère retiré ne marque plus le point traité');
select tests.deconnecter();

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_mention_point((select p1 from ctx), (select b_m from ctx)) $$,
  'visibilité : A ajoute B de nouveau');
select tests.deconnecter();
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from public.v_point where id = (select p1 from ctx)'), 1,
  'visibilité : le ministère ajouté de nouveau revoit le point');

select tests.se_connecter((select b from ctx), 'aal2');
select lives_ok($$ select public.changer_statut_point((select p1 from ctx), 'a_traiter') $$,
  'visibilité : le ministère ajouté de nouveau change le statut du point');
select tests.deconnecter();

-- Berger et conseil modifient aussi les mentions (le point 1 mentionne B et C).
select tests.se_connecter((select berger from ctx), 'aal2');
select lives_ok($$ select public.retirer_mention_point((select p1 from ctx), (select c_m from ctx)) $$,
  'le berger retire une mention');
select tests.deconnecter();
select is(tests.compter((select c from ctx), 'aal2', 'select 1 from public.v_point where id = (select p1 from ctx)'), 0,
  'le ministère retiré par le berger ne voit plus le point');

select tests.se_connecter((select conseil from ctx), 'aal2');
select lives_ok($$ select public.ajouter_mention_point((select p1 from ctx), (select c_m from ctx)) $$,
  'le conseil ajoute une mention');
select tests.deconnecter();
select is(tests.compter((select c from ctx), 'aal2', 'select 1 from public.v_point where id = (select p1 from ctx)'), 1,
  'le ministère ajouté par le conseil voit le point');

-- Atomicité : D (traité en premier) et E (désactivé) ; l'ajout de E est refusé et D n'est pas
-- ajouté non plus.
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  select public.modifier_mentions_point((select p1 from ctx),
    array[(select b_m from ctx), (select c_m from ctx), (select d_m from ctx), (select e_m from ctx)])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.',
  'modifier : un ajout refusé annule toute la modification');
select tests.deconnecter();
select is((select count(*)::integer from public.v_point_mention
            where point_id = (select p1 from ctx) and ministere_id = (select d_m from ctx)), 0,
  'modifier : D n''est pas ajouté quand E est refusé (une seule transaction)');

-- modifier_mentions_point écrit la différence : D ajouté, B et C retirés.
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.modifier_mentions_point((select p1 from ctx), array[(select d_m from ctx)]) $$,
  'modifier : A remplace B et C par D');
select tests.deconnecter();
select is(tests.lire((select a from ctx), 'aal2',
  'select m.ministere_id from public.v_point_mention m where m.point_id = (select p1 from ctx)'),
  (select jsonb_build_array(jsonb_build_object('ministere_id', d_m)) from ctx),
  'modifier : les mentions effectives du point sont exactement la liste envoyée');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.modifier_mentions_point((select p1 from ctx), array[(select d_m from ctx)]) $$,
  'modifier : envoyer la même liste n''écrit rien et n''est pas une erreur');
select lives_ok($$ select public.modifier_mentions_point((select p1 from ctx), '{}') $$,
  'modifier : une liste vide retire toutes les mentions');
select tests.deconnecter();
select is((select count(*)::integer from public.v_point_mention where point_id = (select p1 from ctx)), 0,
  'modifier : le point 1 ne mentionne plus personne');

-- Lignes écrites sur le point 1. Ajouts : B à la création, puis C (A), B de nouveau (A), C
-- (conseil) et D (A). Retraits : B (A), C (berger), puis B et C (A, par la liste qui remplace
-- les deux par D) et D (A, par la liste vide).
select is((select count(*)::integer from public.point_mention
            where point_id = (select p1 from ctx) and ministere_id = (select b_m from ctx)), 2,
  'B a deux lignes d''ajout sur le point 1 (création, puis ajout après son retrait)');
select is((select count(*)::integer from public.point_mention_retrait r
            join public.point_mention m on m.id = r.mention_id
           where m.point_id = (select p1 from ctx) and m.ministere_id = (select b_m from ctx)), 2,
  'chaque ligne d''ajout de B a sa ligne de retrait : rien n''a été modifié ni effacé');
select is((select count(*)::integer from public.point_mention_retrait r
            join public.point_mention m on m.id = r.mention_id
           where m.point_id = (select p1 from ctx) and m.ministere_id = (select c_m from ctx)
             and r.saisi_par = (select berger from ctx)), 1,
  'le retrait posé par le berger porte le compte du berger (auteur imposé par la base)');

select is((select count(*)::integer from public.point_mention m
            where m.point_id = (select p1 from ctx) and m.ministere_id = (select c_m from ctx)
              and m.saisi_par = (select conseil from ctx)), 1,
  'la mention posée par le conseil porte le compte du conseil (auteur imposé par la base)');

-- Journal : une ligne par ajout et par retrait, sans texte, au ministère créateur.
select is((select count(*)::integer from public.journal
            where cible_id = (select p1 from ctx) and action = 'point_mention_ajoutee'), 4,
  'journal : une ligne par ajout sur le point 1 (C, B, C par le conseil, D)');
select is((select count(*)::integer from public.journal
            where cible_id = (select p1 from ctx) and action = 'point_mention_retiree'), 5,
  'journal : une ligne par retrait sur le point 1 (B, C par le berger, B et C et D par les listes)');
select ok((select bool_and(j.ministere_id = (select a_m from ctx) and j.cible = 'point_attention'
                           and (select array_agg(k order by k) from jsonb_object_keys(j.detail) as k) = array['ministere'])
             from public.journal j
            where j.cible_id = (select p1 from ctx) and j.action in ('point_mention_ajoutee', 'point_mention_retiree')),
  'journal : ministère créateur, cible point_attention, détail réduit à l''identifiant du ministère');
select is((select j.compte from public.journal j
            where j.cible_id = (select p1 from ctx) and j.action = 'point_mention_retiree'
              and j.detail = jsonb_build_object('ministere', (select c_m from ctx))
            order by j.id limit 1), (select berger from ctx),
  'journal : le compte du premier retrait de C est celui du berger');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.v_journal j where j.cible_id = (select p1 from ctx) and j.action like ''point_mention%'''), 0,
  'journal : un ministère mentionné ne lit pas les lignes de mentions du ministère créateur');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.v_journal j where j.cible_id = (select p1 from ctx) and j.action = ''point_statut'''), 1,
  'journal : un ministère mentionné lit sa propre ligne de changement de statut (celles de son compte)');
select is(tests.compter((select a from ctx), 'aal2',
  'select 1 from public.v_journal j where j.cible_id = (select p1 from ctx) and j.action like ''point_mention%'''), 9,
  'journal : le ministère créateur lit les neuf lignes de mentions de son point');
select is(tests.compter((select admin from ctx), 'aal2',
  'select 1 from public.v_journal j where j.action like ''point_mention%'''), 0,
  'journal : l''administration de l''église ne lit aucune ligne de mentions');

-- Une seule mention en vigueur par ministère et par point, même pour le propriétaire des tables
-- (B est mentionné sur le point 2).
select throws_ok($$ insert into public.point_mention (point_id, ministere_id) select p2, b_m from ctx $$,
  'P0001', 'Ce ministère est déjà mentionné sur ce point.',
  'point_mention : un second ajout sans retrait est refusé par la base, même pour le propriétaire');

-- Inaltérabilité, même pour le propriétaire des tables.
select throws_ok($$ update public.point_mention set ministere_id = ministere_id $$,
  '42501', 'La table point_mention est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'point_mention : aucune modification, même pour le propriétaire');
select throws_ok($$ delete from public.point_mention $$,
  '42501', 'La table point_mention est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'point_mention : aucune suppression, même pour le propriétaire');
select throws_ok($$ update public.point_mention_retrait set saisi_le = now() $$,
  '42501', 'La table point_mention_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'point_mention_retrait : aucune modification, même pour le propriétaire');
select throws_ok($$ delete from public.point_mention_retrait $$,
  '42501', 'La table point_mention_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'point_mention_retrait : aucune suppression, même pour le propriétaire');
select throws_ok($$ truncate public.point_mention_retrait $$,
  '42501', 'La table point_mention_retrait est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'point_mention_retrait : aucun vidage, même pour le propriétaire');

-- I5 : un ministère mentionné qui a été désactivé. Le point 5 mentionne F ; F est désactivé.
update public.ministere set desactive_le = now() where id = (select f_m from ctx);
select is(tests.compter((select f from ctx), 'aal2', 'select 1 from public.v_point where id = (select p5 from ctx)'), 0,
  'ministère mentionné désactivé : son compte ne lit plus le point');
select tests.se_connecter((select f from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select p5 from ctx), 'en_cours') $$,
  '42501', 'Compte inactif ou inconnu.',
  'ministère mentionné désactivé : il ne change plus le statut du point');
select tests.deconnecter();
select is(tests.compter((select a from ctx), 'aal2',
  'select 1 from public.v_point_mention where point_id = (select p5 from ctx) and ministere_id = (select f_m from ctx)'), 1,
  'ministère mentionné désactivé : le créateur lit encore sa mention (« désactivé » à l''écran)');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.modifier_mentions_point((select p5 from ctx), array[(select f_m from ctx), (select c_m from ctx)])
$$, 'ministère mentionné désactivé : la liste peut le garder et ajouter un ministère actif');
select tests.deconnecter();
select is((select count(*)::integer from public.v_point_mention where point_id = (select p5 from ctx)), 2,
  'ministère mentionné désactivé : F reste mentionné et C est ajouté');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.retirer_mention_point((select p5 from ctx), (select f_m from ctx)) $$,
  'ministère mentionné désactivé : le créateur peut le retirer');
select throws_ok($$ select public.ajouter_mention_point((select p5 from ctx), (select f_m from ctx)) $$,
  'P0001', 'Ce ministère ne peut pas être mentionné.',
  'ministère désactivé retiré : il ne peut plus être ajouté');
select tests.deconnecter();
select is((select count(*)::integer from public.v_point_mention
            where point_id = (select p5 from ctx) and ministere_id = (select f_m from ctx)), 0,
  'ministère mentionné désactivé : une fois retiré, il n''est plus mentionné');

select * from finish();
rollback;
