-- Mentions de ministères sur les événements (T32 ; docs/plan-etape-4.md, section 4, « B6 ») :
-- ajouter_evenement à quatre arguments refuse soi-même, un ministère désactivé ou inconnu,
-- retire les doublons ; les mentions sont posées avant le premier état et figées ; une ligne
-- de journal porte les identifiants mentionnés, jamais un nom ; le ministère mentionné lit
-- l'événement (et seulement lui) sans pouvoir changer son état.
begin;

select plan(31);

-- Jeu d'essai : A porte les événements, B et C sont mentionnés, D est désactivé, E est un
-- autre ministère.
create temp table ctx as
select tests.creer_ministere('Mentions A') as a_m,
       tests.creer_ministere('Mentions B') as b_m,
       tests.creer_ministere('Mentions C') as c_m,
       tests.creer_ministere('Mentions D') as d_m,
       tests.creer_ministere('Mentions E') as e_m;
alter table ctx add column a uuid, add column b uuid, add column e uuid, add column berger uuid,
  add column ev uuid, add column ev_sans uuid;
update ctx set a = tests.creer_compte('mentions-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('mentions-b@exemple.test', 'ministere', b_m),
               e = tests.creer_compte('mentions-e@exemple.test', 'ministere', e_m),
               berger = tests.creer_compte('mentions-berger@exemple.test', 'berger');
update public.ministere set desactive_le = now() where id = (select d_m from ctx);
grant select on ctx to authenticated;

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Mentions, événement', private.aujourdhui() + 5, 'attente_validation',
    array[(select b_m from ctx), (select b_m from ctx), null::uuid, (select c_m from ctx)])
$$, 'A ajoute un événement qui mentionne B (deux fois), C et une valeur vide');
select throws_ok($$
  select public.ajouter_evenement('Mentions, soi-même', private.aujourdhui() + 5, 'brouillon', array[(select a_m from ctx)])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'un ministère ne se mentionne pas lui-même');
select throws_ok($$
  select public.ajouter_evenement('Mentions, désactivé', private.aujourdhui() + 5, 'brouillon', array[(select d_m from ctx)])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'un ministère désactivé ne se mentionne pas');
select throws_ok($$
  select public.ajouter_evenement('Mentions, inconnu', private.aujourdhui() + 5, 'brouillon', array[gen_random_uuid()])
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'un ministère inconnu ne se mentionne pas');
select throws_ok($$
  select public.ajouter_evenement('Mentions, date passée', private.aujourdhui() - 1, 'brouillon', array[(select b_m from ctx)])
$$, 'P0001', 'La date ne peut pas être passée.', 'à l''ajout, une date passée garde le refus de l''étape 3');
select lives_ok($$ select public.ajouter_evenement('Mentions, sans mention', private.aujourdhui() + 6, 'brouillon') $$,
  'la version à trois arguments ajoute un événement sans mention');
select tests.deconnecter();

update ctx set ev = (select e.id from public.evenement e where e.titre = 'Mentions, événement'),
               ev_sans = (select e.id from public.evenement e where e.titre = 'Mentions, sans mention');

select is((select count(*)::int from public.evenement e
            where e.titre in ('Mentions, soi-même', 'Mentions, désactivé', 'Mentions, inconnu', 'Mentions, date passée')),
  0, 'un ajout refusé ne laisse aucun événement');
select set_eq($$ select m.ministere_id from public.evenement_mention m where m.evenement_id = (select ev from ctx) $$,
  $$ select b_m from ctx union all select c_m from ctx $$,
  'une mention par ministère : doublons et valeurs vides retirés');
select is((select count(*)::int from public.evenement_mention m where m.evenement_id = (select ev_sans from ctx)), 0,
  'la version à trois arguments n''écrit aucune mention');

-- Journal : une ligne, les identifiants mentionnés, jamais un nom
select results_eq($$
  select j.action, j.compte, j.ministere_id, j.detail from public.journal j
   where j.cible_id = (select ev from ctx) order by j.id
$$, $$
  select 'evenement_ajoute', a, a_m,
         jsonb_build_object('date', private.aujourdhui() + 5, 'statut', 'attente_validation',
                            'mentions', (select jsonb_agg(x.id order by x.id) from unnest(array[b_m, c_m]) as x(id)))
    from ctx
$$, 'journal : une ligne evenement_ajoute avec la date, le statut et les identifiants mentionnés');
select is((select count(*)::int from public.journal j, ctx
            where j.cible_id = ctx.ev
              and (strpos(j.detail::text, 'Mentions B') > 0 or strpos(j.detail::text, 'Mentions C') > 0
                   or strpos(j.detail::text, 'Mentions, événement') > 0)), 0,
  'journal : ni le nom d''un ministère, ni le nom de l''événement');
select is((select j.detail -> 'mentions' from public.journal j where j.cible_id = (select ev_sans from ctx)),
  '[]'::jsonb, 'journal : sans mention, la liste est vide');

-- Lecture : le ministère mentionné lit cet événement, et seulement lui
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.v_evenement where id = (select ev from ctx)'), 1, 'B, mentionné, lit l''événement');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.evenement_etat where evenement_id = (select ev from ctx)'), 1, 'B lit son état');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.evenement_mention where evenement_id = (select ev from ctx)'), 2, 'B lit ses deux mentions');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.v_evenement where id = (select ev_sans from ctx)'), 0,
  'B ne lit pas l''autre événement de A, qui ne le mentionne pas');
select is(tests.compter((select e from ctx), 'aal2',
  'select 1 from public.v_evenement where id in (select ev from ctx union all select ev_sans from ctx)'), 0,
  'E, ni porteur ni mentionné, ne lit aucun des deux événements');
select is(tests.compter((select e from ctx), 'aal2',
  'select 1 from public.evenement_mention where evenement_id = (select ev from ctx)'), 0, 'E ne lit aucune mention');
select is(tests.compter((select berger from ctx), 'aal2',
  'select 1 from public.evenement_mention where evenement_id = (select ev from ctx)'), 2, 'le berger lit les mentions');

-- Le ministère mentionné ne change pas l'état
select tests.se_connecter((select b from ctx), 'aal2');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select ev, private.aujourdhui() + 6, 'valide' from ctx
$$, '42501', null, 'B, mentionné, ne met pas à jour l''événement');
select tests.deconnecter();
select is((select count(*)::int from public.evenement_etat x where x.evenement_id = (select ev from ctx)), 1,
  'l''événement garde son seul état');

-- Ajout seulement : par ajouter_evenement, jamais modifiées
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ insert into public.evenement_mention (evenement_id, ministere_id) select ev, e_m from ctx $$,
  '42501', null, 'le porteur n''ajoute pas de mention directement (aucun GRANT insert)');
select tests.deconnecter();
select throws_ok($$ update public.evenement_mention set ministere_id = ministere_id where evenement_id = (select ev from ctx) $$,
  '42501', null, 'une mention ne se modifie pas, même par le propriétaire des tables');
select throws_ok($$ delete from public.evenement_mention where evenement_id = (select ev from ctx) $$,
  '42501', null, 'une mention ne s''efface pas, même par le propriétaire des tables');
select throws_ok($$ truncate public.evenement_mention $$,
  '42501', null, 'la table des mentions ne se vide pas');

-- Refus de profil et de double authentification
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$ select public.ajouter_evenement('Mentions, aal1', private.aujourdhui() + 5, 'brouillon', '{}') $$,
  '42501', 'Double authentification requise.', 'aal1 : ajouter_evenement à quatre arguments refusée');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$ select public.ajouter_evenement('Mentions, berger', private.aujourdhui() + 5, 'brouillon', '{}') $$,
  '42501', 'Seul un compte de ministère peut ajouter un événement.', 'le berger n''ajoute pas d''événement');
select tests.deconnecter();

-- Structure
select col_is_pk('public', 'evenement_mention', array['evenement_id', 'ministere_id'],
  'clé de evenement_mention : (evenement_id, ministere_id)');
select ok(exists (select 1 from pg_indexes i
                   where i.schemaname = 'public' and i.tablename = 'evenement_mention'
                     and i.indexdef like '%(ministere_id)'),
  'index sur evenement_mention.ministere_id');
select ok((select p.qual from pg_policies p
            where p.schemaname = 'public' and p.tablename = 'evenement' and p.policyname = 'lecture')
          like '%evenements_mentionnant_mon_ministere%',
  'la politique de lecture de evenement lit les mentions par private.evenements_mentionnant_mon_ministere()');
select ok((select p.prosecdef from pg_proc p
            where p.oid = 'private.ajouter_evenement(text, date, public.statut_evenement, uuid[])'::regprocedure)
          and not (select p.prosecdef from pg_proc p
                    where p.oid = 'public.ajouter_evenement(text, date, public.statut_evenement, uuid[])'::regprocedure),
  'ajouter_evenement à quatre arguments : partie private security definer, partie public security invoker');

select * from finish();
rollback;
