-- Correctifs de l'audit RLS (migration correctifs_audit) : journal de l'administration de
-- l'église, ajout d'événement par l'API seulement, statut « Traité » définitif, droits par
-- défaut des fonctions, index du journal. Depuis le lot B2 de l'étape 4
-- (20261008101000_journal_mesures.sql), un envoi de chiffres ne porte plus la valeur d'un
-- indicateur propre ni aucune ligne sensible : l'administration lit tous les envois.
begin;

select plan(21);

create temp table ctx as
select tests.compte('Administration de l''église') as admin,
       tests.compte('Berger') as berger,
       tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère Coordination') as coo,
       (select p.id from public.point_attention p where p.titre = 'Clés de la salle annexe') as point_traite;
grant select on ctx to authenticated;

-- 1. Journal : l'administration ne lit ni les fiches ni les points (P06)
select is(tests.compter((select admin from ctx), 'aal2', $$
  select * from public.journal
   where action in ('reunion_saisie', 'evenement_ajoute', 'evenement_modifie', 'point_cree', 'point_statut', 'point_traite')
$$), 0, 'administration : aucune ligne de journal des réunions, des événements ni des points');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select * from public.v_journal
   where action in ('reunion_saisie', 'evenement_ajoute', 'evenement_modifie', 'point_cree', 'point_statut', 'point_traite')
$$), 0, 'administration : rien non plus dans v_journal');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select 1 from public.journal j
   cross join lateral jsonb_array_elements(case when jsonb_typeof(j.detail -> 'lignes') = 'array'
                                                then j.detail -> 'lignes' else '[]'::jsonb end) as l(ligne)
   join public.indicateur i on i.id = (l.ligne ->> 'indicateur_id')::uuid
  where (i.ministere_id is not null and l.ligne ? 'valeur') or i.sensible
$$), 0, 'administration : aucune valeur d''indicateur propre ni ligne sensible dans le journal lu');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select * from public.v_journal where action = 'mesure_saisie' and ministere_id = (select com_m from ctx)
$$), 11, 'administration : les 11 envois de chiffres de Communication (lot B2 : un indicateur propre n''y porte plus sa valeur)');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select * from public.v_journal
   where action in ('fij_saisie', 'participation_saisie', 'session_declaree', 'ministere_cree', 'compte_cree',
                    'texte_relu', 'texte_masque')
$$), (select count(*)::int from public.journal
       where action in ('fij_saisie', 'participation_saisie', 'session_declaree', 'ministere_cree', 'compte_cree',
                        'texte_relu', 'texte_masque')
         and not (action in ('texte_relu', 'texte_masque')
                  and coalesce(cible, '') in ('point_attention', 'point_suivi', 'evenement', 'reunion',
                                              'demande_indicateur', 'precision_sensible', 'signalement',
                                              'signalement_suivi'))),
  'administration : lit les comptes, les ministères, les sessions, les présences, la carte des FIJ et les actions techniques');
-- T47 (lot I) : la relecture et le masquage d'un point, d'un suivi, d'un événement ou d'une
-- réunion ne se lisent plus par l'administration ; le jeu d'exemple en a deux (points de Social
-- et de Coordination).
select is((select count(*)::int from public.journal
            where action in ('texte_relu', 'texte_masque') and cible = 'point_attention'), 2,
  'le jeu d''exemple a deux lignes de modération de points au journal');
select is(tests.compter((select admin from ctx), 'aal2', $$
  select 1 from public.journal
   where action in ('texte_relu', 'texte_masque') and cible in ('point_attention', 'point_suivi', 'evenement', 'reunion')
  union all
  select 1 from public.v_journal
   where action in ('texte_relu', 'texte_masque') and cible in ('point_attention', 'point_suivi', 'evenement', 'reunion')
$$), 0, 'T47 : l''administration ne lit aucune relecture ni aucun masquage d''un point, d''un événement ou d''une réunion');
select is(tests.compter((select berger from ctx), 'aal2', 'select * from public.v_journal'),
  (select count(*)::int from public.journal), 'le berger lit toujours tout le journal');
select ok((select p.qual from pg_policies p
            where p.schemaname = 'public' and p.tablename = 'journal' and p.policyname = 'lecture')
          like '%journal_lisible_administration%',
  'la politique du journal lit la liste de l''administration à un seul endroit');

-- 2. Événements : l'ajout passe seulement par ajouter_evenement
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$ insert into public.evenement (ministere_id, titre) select com_m, 'Ajout direct' from ctx $$,
  '42501', null, 'un ministère ne peut plus ajouter un événement directement');
select lives_ok($$ select public.ajouter_evenement('Événement par l''API', private.aujourdhui() + 3, 'brouillon') $$,
  'un ministère ajoute un événement par ajouter_evenement');
select tests.deconnecter();

select results_eq($$
  select e.saisi_par, j.action, j.compte, j.ministere_id
    from public.evenement e
    join public.journal j on j.cible_id = e.id
   where e.titre = 'Événement par l''API'
$$, $$ select com, 'evenement_ajoute', com, com_m from ctx $$,
  'l''événement est au nom du ministère, avec une ligne de journal evenement_ajoute');

select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, private.aujourdhui() + 4, 'valide' from public.evenement e where e.titre = 'Événement par l''API'
$$, 'la mise à jour d''un événement du ministère reste une insertion directe');
select tests.deconnecter();

select tests.se_connecter((select com from ctx), 'aal1');
select throws_ok($$ select public.ajouter_evenement('Essai', private.aujourdhui(), 'brouillon') $$,
  '42501', 'Double authentification requise.', 'aal1 : ajouter_evenement refusée');
select tests.deconnecter();

select is_empty($$
  select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'evenement' and p.cmd = 'INSERT'
$$, 'plus de politique d''ajout sur evenement');
select ok((select p.prosecdef from pg_proc p
            where p.oid = 'private.ajouter_evenement(text, date, public.statut_evenement)'::regprocedure)
          and not (select p.prosecdef from pg_proc p
                    where p.oid = 'public.ajouter_evenement(text, date, public.statut_evenement)'::regprocedure),
  'ajouter_evenement : partie private security definer, partie public security invoker');

-- 3. Points : « Traité » est définitif, même si un autre suivi porte une heure plus récente
insert into public.point_suivi (point_id, statut, saisi_le, saisi_par)
select point_traite, 'en_cours', now() + interval '1 hour', coo from ctx;

select is(tests.lire((select berger from ctx), 'aal2', $$
  select statut, statut_le = traite_le as meme_heure from public.v_point where titre = 'Clés de la salle annexe'
$$), '[{"statut": "traite", "meme_heure": true}]'::jsonb,
  'un suivi plus récent qu''un traitement ne rouvre pas le point : le statut courant reste « traite »');

select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$ select public.changer_statut_point((select point_traite from ctx), 'attente_decision') $$,
  'P0001', 'Ce point est traité : il ne change plus.', 'changer_statut_point : « Traité » reste définitif');
select tests.deconnecter();

-- 4. Droits par défaut : une nouvelle fonction de postgres n'est exécutable par public nulle part
set local role postgres;
create schema essai_droits;
create function essai_droits.essai() returns integer language sql as $$ select 1 $$;
reset role;

select ok(not exists (select 1 from pg_proc p
                       cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
                      where p.oid = 'essai_droits.essai()'::regprocedure and a.grantee = 0),
  'une fonction créée par postgres, dans n''importe quel schéma, n''est pas exécutable par public');
select ok(exists (select 1 from pg_default_acl d
                   where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f'),
  'droit par défaut global de postgres sur les fonctions');

-- 5. Index du journal par action
select ok(exists (select 1 from pg_indexes i
                   where i.schemaname = 'public' and i.tablename = 'journal' and i.indexname = 'journal_action_le_idx'
                     and i.indexdef like '%(action, le DESC)%'),
  'index du journal par action, puis par date décroissante');

select * from finish();
rollback;
