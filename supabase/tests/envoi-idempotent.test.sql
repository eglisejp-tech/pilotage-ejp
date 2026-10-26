-- Numéro anti-doublon des trois créations (T76, lot B ; docs/conception/erreurs-envoi.md,
-- sections 5 et 14, tests 9 à 12 ; migration 20261026*_envoi_idempotent.sql).
--
-- Le cas réel d'abord : le 26 octobre 2026, Coordination ajoute un événement avec huit mentions
-- dont FIJ, sans heure, à la date du jour ; la base enregistre et la réponse se perd. Le nouvel
-- envoi, avec le même numéro, rend le même événement : une ligne evenement, huit mentions, un
-- état, une seule ligne de journal evenement_ajoute qui porte les huit identifiants.
-- Puis : même numéro avec un autre contenu (refus lisible, rien d'écrit) ; mentions dans un autre
-- ordre et nom entouré d'espaces (même envoi) ; même numéro pour une autre création (refus) ;
-- même numéro sur un autre compte (deux événements) ; ministère mentionné désactivé ou date
-- devenue passée entre les deux envois (le second rend l'événement déjà créé : le numéro est lu
-- avant les contrôles) ; anciennes signatures (sans numéro : deux appels, deux événements) ;
-- aal1 et anonyme refusés. Les mêmes cas essentiels pour creer_point et signaler_difficulte.
-- Enfin private.envoi : aucun droit pour aucun rôle de l'API, inaltérable (update, delete hors
-- purge, truncate), purge des numéros de plus de 7 jours, aides privées sans droit d'exécution,
-- signatures sans valeur par défaut (PGRST203), et la matrice des droits par profil.
begin;

create temp table ctx as
select tests.compte('Ministère Coordination') as coo,
       tests.ministere('Coordination') as coo_m,
       tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.ministere('FIJ') as fij_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Envoi, huitième mention') as huitieme_m,
       tests.creer_ministere('Envoi, mention désactivée') as desactive_m,
       private.aujourdhui() as jour,
       'a1000000-0000-4000-8000-000000000001'::uuid as k,
       'a1000000-0000-4000-8000-000000000002'::uuid as k_desactive,
       'a1000000-0000-4000-8000-000000000003'::uuid as k_passe,
       'a1000000-0000-4000-8000-000000000004'::uuid as k_point,
       'a1000000-0000-4000-8000-000000000005'::uuid as k_signalement,
       'a1000000-0000-4000-8000-000000000006'::uuid as k_vieux,
       'a1000000-0000-4000-8000-000000000007'::uuid as k_recent,
       'a1000000-0000-4000-8000-000000000008'::uuid as k_purge;
alter table ctx add column mentions uuid[], add column ev uuid, add column ev_com uuid,
  add column ev_desactive uuid, add column ev_passe uuid, add column pt uuid, add column sg uuid;
-- Les huit mentions du 26 octobre : les sept autres ministères du jeu d'exemple, dont FIJ, et
-- un huitième créé ici.
update ctx set mentions = (select array_agg(m.id order by m.nom) from public.ministere m
                            where m.desactive_le is null and m.id not in (ctx.coo_m, ctx.desactive_m));
-- Les identifiants créés se notent dans ctx au nom du compte connecté.
grant select, update on ctx to authenticated;
grant select on ctx to anon;

-- Matrice en aal2 (section 11), écrite avant plan() : attendus dans l'ordre des profils
-- (Coordination, Communication, berger, conseil, administration, EJP Tech). private.envoi n'a
-- aucun accès direct pour aucun profil ; les trois créations à numéro sont aux ministères.
create temp view matrice_envoi (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère coordination'), (2, 'ministère communication'), (3, 'berger'),
                 (4, 'conseil'), (5, 'administration'), (6, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('private.envoi', 'lire', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'select 1 from private.envoi'),
     ('private.envoi', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into private.envoi (compte, cle, operation, cible_id, empreinte) select coo, gen_random_uuid(), ''ajouter_evenement'', coo_m, md5(''essai'') from ctx'),
     ('private.envoi', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'update private.envoi set le = le'),
     ('private.envoi', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from private.envoi'),
     ('ajouter_evenement (6 arguments)', 'appeler', array['ok', 'ok', '42501', '42501', '42501', '42501'],
      'select public.ajouter_evenement(''Essai de la matrice'', private.aujourdhui(), ''valide'', ''{}''::uuid[], null::smallint, gen_random_uuid())'),
     ('creer_point (7 arguments)', 'appeler', array['ok', 'ok', '42501', '42501', '42501', '42501'],
      'select public.creer_point(''Essai de la matrice'', null, null, ''normale'', null, ''{}''::uuid[], gen_random_uuid())'),
     ('signaler_difficulte (3 arguments)', 'appeler', array['ok', 'ok', '42501', '42501', '42501', '42501'],
      'select public.signaler_difficulte(''autre'', ''Difficulté d''''essai de la matrice.'', gen_random_uuid())'),
     ('private.envoi_existant', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'select private.envoi_existant(gen_random_uuid(), ''ajouter_evenement'', md5(''essai''))'),
     ('private.retenir_envoi', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'select private.retenir_envoi(gen_random_uuid(), ''ajouter_evenement'', gen_random_uuid(), md5(''essai''))')
   ) as m(objet, action, attendu, requete);
create temp view profil_envoi (profil, compte) as
  select 'ministère coordination', c.coo from ctx c union all select 'ministère communication', c.com from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_envoi, profil_envoi to authenticated, anon;

select plan(73 + tests.nombre_essais('select * from matrice_envoi', 'select * from profil_envoi', true));

-- 1. Le cas réel : deux envois du même numéro, un seul événement

select is(cardinality((select mentions from ctx)), 8, 'contexte : huit ministères à mentionner');
select ok((select fij_m = any (mentions) from ctx), 'contexte : FIJ est parmi les huit mentions');

select tests.se_connecter((select coo from ctx), 'aal2');
update ctx set ev = public.ajouter_evenement('Soirée de rentrée', (select jour from ctx), 'valide',
  (select mentions from ctx), null::smallint, (select k from ctx));
select isnt((select ev from ctx), null, 'premier envoi du numéro : l''événement est créé');
-- La réponse s'est perdue ; Coordination touche de nouveau « Ajouter au calendrier ».
select is(public.ajouter_evenement('Soirée de rentrée', (select jour from ctx), 'valide',
  (select mentions from ctx), null::smallint, (select k from ctx)),
  (select ev from ctx), 'second envoi du même numéro : le même identifiant');
select tests.deconnecter();

select is((select count(*)::int from public.evenement where titre = 'Soirée de rentrée'), 1,
  'un seul événement de ce nom');
select is((select count(*)::int from public.evenement_mention where evenement_id = (select ev from ctx)), 8,
  'ses huit mentions, une fois');
select is((select count(*)::int from public.evenement_etat where evenement_id = (select ev from ctx)), 1,
  'un seul état');
select is((select count(*)::int from public.journal
            where action = 'evenement_ajoute' and cible_id = (select ev from ctx)), 1,
  'une seule ligne de journal evenement_ajoute');
select is((select jsonb_array_length(detail -> 'mentions') from public.journal
            where action = 'evenement_ajoute' and cible_id = (select ev from ctx)), 8,
  'la ligne de journal porte les huit mentions');
select ok((select detail -> 'mentions' ? (select fij_m::text from ctx) from public.journal
            where action = 'evenement_ajoute' and cible_id = (select ev from ctx)),
  'dont FIJ');
select results_eq($$
  select e.compte, e.operation, e.cible_id from private.envoi e where e.cle = (select k from ctx)
$$, $$ select coo, 'ajouter_evenement'::text, ev from ctx $$,
  'private.envoi garde le numéro au nom du compte : opération et événement créé');
select ok((select e.empreinte ~ '^[0-9a-f]{32}$' from private.envoi e where e.cle = (select k from ctx)),
  'l''empreinte est un md5, jamais le texte');

-- 2. Même numéro, autre contenu : refus, rien d'écrit

select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$
  select public.ajouter_evenement('Soirée de rentrée corrigée', (select jour from ctx), 'valide',
    (select mentions from ctx), null::smallint, (select k from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.',
  'même numéro, nom changé : refus lisible');
select throws_ok($$
  select public.ajouter_evenement('Soirée de rentrée', (select jour from ctx), 'valide',
    (select mentions[1:7] from ctx), null::smallint, (select k from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.',
  'même numéro, une mention de moins : refus');
select throws_ok($$
  select public.ajouter_evenement('Soirée de rentrée', (select jour from ctx), 'valide',
    (select mentions from ctx), 1140::smallint, (select k from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.',
  'même numéro, une heure prévue en plus : refus');
-- Mentions dans un autre ordre, en double, nom entouré d'espaces : le même envoi.
select is(public.ajouter_evenement('  Soirée de rentrée ', (select jour from ctx), 'valide',
  (select array_cat(array(select x from unnest(mentions) as x order by x desc), mentions[1:2]) from ctx),
  null::smallint, (select k from ctx)),
  (select ev from ctx), 'mentions dans un autre ordre, en double, nom avec des espaces : le même envoi');
-- Le même numéro pour une autre création.
select throws_ok($$
  select public.creer_point('Point du même numéro', null, null, 'normale', null, '{}'::uuid[], (select k from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.',
  'même numéro pour creer_point : refus');
select throws_ok($$
  select public.signaler_difficulte('saisie_evenement', 'Signalement du même numéro.', (select k from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.',
  'même numéro pour signaler_difficulte : refus');
select tests.deconnecter();

select is((select count(*)::int from public.evenement where titre like 'Soirée de rentrée%'), 1,
  'après les refus, toujours un seul événement');
select is((select count(*)::int from public.point_attention where titre = 'Point du même numéro'), 0,
  'aucun point écrit');
select is((select count(*)::int from private.envoi where cle = (select k from ctx)), 1,
  'une seule ligne de numéro');

-- 3. Le même numéro sur un autre compte : un autre envoi

select tests.se_connecter((select com from ctx), 'aal2');
update ctx set ev_com = public.ajouter_evenement('Soirée de rentrée', (select jour from ctx), 'valide',
  '{}'::uuid[], null::smallint, (select k from ctx));
select tests.deconnecter();
select isnt((select ev_com from ctx), (select ev from ctx),
  'même numéro, autre compte : un autre événement (le numéro vaut pour un compte)');
select is((select count(*)::int from private.envoi where cle = (select k from ctx)), 2,
  'deux lignes de numéro, une par compte');

-- 4. Le numéro est lu avant les contrôles

-- Un ministère mentionné est désactivé entre les deux envois.
select tests.se_connecter((select coo from ctx), 'aal2');
update ctx set ev_desactive = public.ajouter_evenement('Répétition générale', (select jour from ctx) + 3,
  'brouillon', array[(select desactive_m from ctx)], 1140::smallint, (select k_desactive from ctx));
select tests.deconnecter();
update public.ministere set desactive_le = now() where id = (select desactive_m from ctx);
select tests.se_connecter((select coo from ctx), 'aal2');
select is(public.ajouter_evenement('Répétition générale', (select jour from ctx) + 3, 'brouillon',
  array[(select desactive_m from ctx)], 1140::smallint, (select k_desactive from ctx)),
  (select ev_desactive from ctx), 'mention désactivée entre les deux envois : le même événement, pas de refus');
select throws_ok($$
  select public.ajouter_evenement('Répétition générale', (select jour from ctx) + 3, 'brouillon',
    array[(select desactive_m from ctx)], 1140::smallint, 'a1000000-0000-4000-8000-0000000000ff'::uuid)
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.',
  'un nouveau numéro, lui, passe par les contrôles');
select tests.deconnecter();

-- Une date devenue passée (nouvel essai après minuit) : le premier envoi, enregistré la veille,
-- est retrouvé par son numéro. La ligne d'hier est posée au nom du propriétaire, avec l'empreinte
-- de la fonction (nom, date, statut, heure, mentions triées).
insert into public.evenement (ministere_id, titre, saisi_par)
values ((select coo_m from ctx), 'Veillée d''hier', (select coo from ctx));
update ctx set ev_passe = (select id from public.evenement where titre = 'Veillée d''hier');
insert into private.envoi (compte, cle, operation, cible_id, empreinte)
select coo, k_passe, 'ajouter_evenement', ev_passe,
       md5(jsonb_build_array('Veillée d''hier', jour - 1, 'valide'::public.statut_evenement, null::smallint,
                             '{}'::uuid[])::text)
  from ctx;
select tests.se_connecter((select coo from ctx), 'aal2');
select is(public.ajouter_evenement('Veillée d''hier', (select jour from ctx) - 1, 'valide', '{}'::uuid[],
  null::smallint, (select k_passe from ctx)),
  (select ev_passe from ctx), 'date devenue passée : le numéro rend l''événement de la veille, sans refus');
select throws_ok($$
  select public.ajouter_evenement('Veillée d''hier', (select jour from ctx) - 1, 'valide', '{}'::uuid[],
    null::smallint, 'a1000000-0000-4000-8000-0000000000fe'::uuid)
$$, 'P0001', 'La date ne peut pas être passée.', 'sans ce numéro, la date passée est refusée');
select tests.deconnecter();

-- 5. Anciennes signatures : sans numéro, comportement d'avant

select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Ancien site', (select jour from ctx) + 1, 'valide', '{}'::uuid[], null::smallint)
$$, 'ajouter_evenement à 5 arguments, premier appel');
select lives_ok($$
  select public.ajouter_evenement('Ancien site', (select jour from ctx) + 1, 'valide', '{}'::uuid[], null::smallint)
$$, 'ajouter_evenement à 5 arguments, second appel');
select lives_ok($$
  select public.ajouter_evenement('Ancien site, 4 arguments', (select jour from ctx) + 1, 'valide', '{}'::uuid[])
$$, 'ajouter_evenement à 4 arguments reste valide');
select lives_ok($$
  select public.ajouter_evenement('Ancien site, 3 arguments', (select jour from ctx) + 1, 'valide')
$$, 'ajouter_evenement à 3 arguments reste valide');
select lives_ok($$
  select public.ajouter_evenement('Sans numéro', (select jour from ctx) + 1, 'valide', '{}'::uuid[], null::smallint, null::uuid)
$$, 'six arguments avec un numéro vide : comportement d''avant');
select tests.deconnecter();
select is((select count(*)::int from public.evenement where titre = 'Ancien site'), 2,
  'sans numéro, deux appels font deux événements (comportement d''avant)');
select is((select count(*)::int from public.journal j join public.evenement e on e.id = j.cible_id
            where j.action = 'evenement_ajoute' and e.titre = 'Ancien site'), 2,
  'et deux lignes de journal');
select is((select count(*)::int from private.envoi e join public.evenement v on v.id = e.cible_id
            where v.titre in ('Ancien site', 'Ancien site, 4 arguments', 'Ancien site, 3 arguments', 'Sans numéro')), 0,
  'les appels sans numéro n''écrivent aucune ligne de numéro');

-- 6. Refus d'accès : aal1, anonyme, profil sans ministère

select is(tests.essai((select coo from ctx), 'aal1',
  $$select public.ajouter_evenement('Essai aal1', private.aujourdhui(), 'valide', '{}'::uuid[], null::smallint, gen_random_uuid())$$),
  '42501', 'aal1 : ajouter_evenement à 6 arguments refusé (42501)');
select is(tests.essai(null, null,
  $$select public.ajouter_evenement('Essai anonyme', current_date, 'valide', '{}'::uuid[], null::smallint, gen_random_uuid())$$),
  '42501', 'anonyme : ajouter_evenement à 6 arguments refusé (42501)');
select is(tests.essai((select berger from ctx), 'aal2',
  $$select public.ajouter_evenement('Essai berger', private.aujourdhui(), 'valide', '{}'::uuid[], null::smallint, gen_random_uuid())$$),
  '42501', 'berger : ajouter_evenement refusé (seul un compte de ministère)');

-- 7. creer_point : mêmes cas essentiels

select tests.se_connecter((select coo from ctx), 'aal2');
update ctx set pt = public.creer_point('Salle à réserver', 'Pour la soirée de rentrée.', 'Réserver la salle',
  'haute', (select jour from ctx) + 7, array[(select com_m from ctx), (select fij_m from ctx)], (select k_point from ctx));
select is(public.creer_point('Salle à réserver ', ' Pour la soirée de rentrée. ', 'Réserver la salle',
  'haute', (select jour from ctx) + 7, array[(select fij_m from ctx), (select com_m from ctx)], (select k_point from ctx)),
  (select pt from ctx), 'creer_point, même numéro, même contenu (espaces et ordre des mentions) : le même point');
select throws_ok($$
  select public.creer_point('Salle à réserver', 'Pour la soirée de rentrée, corrigé.', 'Réserver la salle',
    'haute', (select jour from ctx) + 7, array[(select com_m from ctx), (select fij_m from ctx)], (select k_point from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.', 'creer_point, même numéro, description changée : refus');
select throws_ok($$
  select public.ajouter_evenement('Salle à réserver', (select jour from ctx), 'valide', '{}'::uuid[], null::smallint, (select k_point from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.', 'le numéro d''un point pour un événement : refus');
select tests.deconnecter();
select is((select count(*)::int from public.point_attention where titre = 'Salle à réserver'), 1, 'un seul point');
select is((select count(*)::int from public.point_suivi where point_id = (select pt from ctx)), 1, 'un seul suivi « À traiter »');
select is((select count(*)::int from public.point_mention where point_id = (select pt from ctx)), 2, 'ses deux mentions, une fois');
select is((select count(*)::int from public.journal where action = 'point_cree' and cible_id = (select pt from ctx)), 1,
  'une seule ligne de journal point_cree');
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.creer_point('Point de l''ancien site', null, null, 'normale', null, '{}'::uuid[])
$$, 'creer_point à 6 arguments reste valide');
select lives_ok($$
  select public.creer_point('Point de l''ancien site', null, null, 'normale', null, '{}'::uuid[])
$$, 'creer_point à 6 arguments, second appel');
select tests.deconnecter();
select is((select count(*)::int from public.point_attention where titre = 'Point de l''ancien site'), 2,
  'sans numéro, deux points (comportement d''avant)');
select is(tests.essai((select coo from ctx), 'aal1',
  $$select public.creer_point('Essai aal1', null, null, 'normale', null, '{}'::uuid[], gen_random_uuid())$$),
  '42501', 'aal1 : creer_point à 7 arguments refusé');

-- 8. signaler_difficulte : mêmes cas essentiels

select tests.se_connecter((select coo from ctx), 'aal2');
update ctx set sg = public.signaler_difficulte('saisie_evenement',
  'Problème au niveau de la saisie des événement dans le calendrier', (select k_signalement from ctx));
select is(public.signaler_difficulte('saisie_evenement',
  '  Problème au niveau de la saisie des événement dans le calendrier ', (select k_signalement from ctx)),
  (select sg from ctx), 'signaler_difficulte, même numéro, même texte : le même signalement');
select throws_ok($$
  select public.signaler_difficulte('saisie_evenement', 'Un autre texte pour le même numéro.', (select k_signalement from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.', 'signaler_difficulte, même numéro, texte changé : refus');
select throws_ok($$
  select public.signaler_difficulte('saisie_mois', 'Problème au niveau de la saisie des événement dans le calendrier', (select k_signalement from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.', 'signaler_difficulte, même numéro, écran changé : refus');
select lives_ok($$
  select public.signaler_difficulte('autre', 'Signalement de l''ancien site, sans numéro.')
$$, 'signaler_difficulte à 2 arguments reste valide');
select tests.deconnecter();
select is((select count(*)::int from public.signalement where id = (select sg from ctx)), 1, 'un seul signalement');
select is((select count(*)::int from public.journal where action = 'difficulte_signalee' and cible_id = (select sg from ctx)), 1,
  'une seule ligne de journal difficulte_signalee');
select is(tests.essai((select berger from ctx), 'aal2',
  $$select public.signaler_difficulte('autre', 'Le berger ne signale pas.', gen_random_uuid())$$),
  '42501', 'berger : signaler_difficulte à 3 arguments refusé');

-- 9. private.envoi : droits, inaltérabilité, purge

select ok((select c.relrowsecurity from pg_class c where c.oid = 'private.envoi'::regclass),
  'private.envoi : RLS activée');
select ok(exists (select 1 from pg_policies p
                   where p.schemaname = 'private' and p.tablename = 'envoi'
                     and p.policyname = 'double_authentification' and p.permissive = 'RESTRICTIVE'
                     and p.cmd = 'ALL' and p.qual like '%aal2%' and p.with_check like '%aal2%'),
  'private.envoi : politique restrictive aal2');
select is_empty($$
  select r.rolname, x.privilege
    from pg_roles r
   cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as x(privilege)
   where r.rolname in ('anon', 'authenticated', 'service_role')
     and has_table_privilege(r.rolname, 'private.envoi', x.privilege)
$$, 'private.envoi : aucun droit pour anon, authenticated ni service_role');
select throws_ok($$ update private.envoi set le = le $$, '42501', null,
  'private.envoi : update refusé, même au propriétaire');
select throws_ok($$ delete from private.envoi $$, '42501', null,
  'private.envoi : delete refusé hors purge, même au propriétaire');
select throws_ok($$ truncate private.envoi $$, '42501', null,
  'private.envoi : truncate refusé, même au propriétaire');

-- Purge : une ligne de 8 jours et une de 6 jours ; un envoi numéroté efface la première seule.
insert into private.envoi (compte, cle, operation, cible_id, empreinte, le)
select com, k_vieux, 'ajouter_evenement', ev_com, md5('vieux'), statement_timestamp() - interval '8 days' from ctx
union all
select com, k_recent, 'ajouter_evenement', ev_com, md5('récent'), statement_timestamp() - interval '6 days' from ctx;
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.signaler_difficulte('autre', 'Un envoi numéroté qui purge les vieux numéros.', (select k_purge from ctx))
$$, 'un envoi numéroté purge en passant');
select tests.deconnecter();
select is((select count(*)::int from private.envoi where cle = (select k_vieux from ctx)), 0,
  'purge : le numéro de plus de 7 jours est effacé');
select is((select count(*)::int from private.envoi where cle = (select k_recent from ctx)), 1,
  'purge : le numéro de 6 jours reste');
select is((select count(*)::int from public.evenement where id = (select ev_com from ctx)), 1,
  'purge : l''événement, lui, reste (ajout seulement)');
-- Sous le réglage de la purge, le propriétaire ne supprime ni ne modifie un numéro récent.
select set_config('pilotage.purge_envoi', 'oui', true);
select throws_ok($$ delete from private.envoi where cle = (select k_recent from ctx) $$, '42501', null,
  'réglage de la purge posé : un numéro de moins de 7 jours ne se supprime pas');
select throws_ok($$ update private.envoi set le = le where cle = (select k_recent from ctx) $$, '42501', null,
  'réglage de la purge posé : aucune modification');
select set_config('pilotage.purge_envoi', '', true);

-- Deux requêtes du même numéro en même temps : la seconde attend la première sur la clé
-- primaire, puis relit son numéro. Simulé par un trigger qui pose le même numéro juste avant
-- (comme une requête concurrente validée entre la lecture du numéro et sa pose).
create function tests.devancer_envoi() returns trigger
language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then
    insert into private.envoi (compte, cle, operation, cible_id, empreinte)
    values (new.compte, new.cle, new.operation, 'b1000000-0000-4000-8000-000000000001',
            case when coalesce(current_setting('tests.devancer', true), '') = 'autre'
                 then md5('autre contenu') else new.empreinte end);
  end if;
  return new;
end $$;
create trigger devancer before insert on private.envoi
  for each row execute function tests.devancer_envoi();
select tests.se_connecter((select coo from ctx), 'aal2');
select is(public.ajouter_evenement('Envoi concurrent', (select jour from ctx) + 2, 'valide', '{}'::uuid[],
  null::smallint, 'a1000000-0000-4000-8000-0000000000c1'::uuid),
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'concurrence, même contenu : l''identifiant de la requête qui a validé d''abord');
select set_config('tests.devancer', 'autre', true);
select throws_ok($$
  select public.creer_point('Point concurrent', null, null, 'normale', null, '{}'::uuid[],
    'a1000000-0000-4000-8000-0000000000c2'::uuid)
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.',
  'concurrence, autre contenu : le refus');
select set_config('tests.devancer', '', true);
select tests.deconnecter();
drop trigger devancer on private.envoi;
select is((select count(*)::int from public.evenement where titre = 'Envoi concurrent')
          + (select count(*)::int from public.point_attention where titre = 'Point concurrent'), 0,
  'concurrence : rien d''écrit par la seconde requête');

-- 10. Signatures et aides

select ok((select p.pronargdefaults = 0 from pg_proc p
            where p.oid = 'public.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint, uuid)'::regprocedure)
      and (select p.pronargdefaults = 0 from pg_proc p
            where p.oid = 'public.creer_point(text, text, text, public.priorite, date, uuid[], uuid)'::regprocedure)
      and (select p.pronargdefaults = 0 from pg_proc p
            where p.oid = 'public.signaler_difficulte(text, text, uuid)'::regprocedure),
  'les trois signatures à numéro n''ont aucune valeur par défaut (un appel de l''ancien site ne trouve qu''une fonction)');
select is_empty($$
  select p.oid::regprocedure, r.rolname from pg_proc p
   cross join (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
   where p.pronamespace = 'private'::regnamespace
     and p.proname in ('envoi_existant', 'retenir_envoi', 'purger_envois', 'refuser_modification_sauf_purge')
     and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
$$, 'les aides du numéro ne sont exécutables par aucun rôle de l''API');

-- 11. Matrice des droits par profil (aal2 écrite ; aal1 et anonyme dérivés)

select * from tests.verifier_matrice('select * from matrice_envoi', 'select * from profil_envoi', true);

select * from finish();
rollback;
