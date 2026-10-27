-- Une série d'événements répétés (T78, lot 2 ; docs/conception/calendrier-evenements.md,
-- sections 5.2, 6.4, 7 (S1, S2, S8), 9, 10.2 et 16, test 9 ; migration
-- 20261027141108_evenements_plages.sql).
--
-- S1, le cas réel : Coordination saisit « Se répète », chaque lundi pendant sept semaines, de 19 h
-- à 21 h, « Réunion des responsables », « Validé », huit mentions dont FIJ. La base crée sept
-- événements ordinaires liés par le même serie_id, 56 mentions, sept lignes evenement_ajoute (une
-- par événement, chacune avec la série) ; FIJ voit les sept ; chaque mois compte ses dates.
-- S2, la réponse perdue : le même numéro rend la même série sans rien écrire (sept, pas
-- quatorze) ; le même numéro avec d'autres dates est refusé. Limites (Q2) : 2 à 31 dates, aucune
-- passée, 12 mois au plus ; les doublons de dates comptent une fois.
-- Portée « Toute la série » (Q8, section 6.4) : le nom sur toutes les dates non retirées, les
-- mentions sur les dates à venir ; S8, le retrait par le porteur des dates à venir (sans état
-- final), les dates passées restent, puis EJP Tech retire le reste. Modération (Q14) : une ligne
-- par série dans les textes à relire, masquer le nom d'une date masque toute la série.
-- Droits : un ministère mentionné et le berger refusés (42501) ; la matrice complète est dans
-- rls-evenements-matrice.test.sql.
begin;

select plan(44);

create temp table ctx as
select tests.compte('Ministère Coordination') as coo,
       (select m.id from public.ministere m where m.code = 'coordination') as coo_m,
       tests.compte('Ministère FIJ') as fij,
       (select m.id from public.ministere m where m.code = 'fij') as fij_m,
       tests.compte('Berger') as berger,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.creer_ministere('Série, huitième mention') as h_m,
       tests.creer_ministere('Série, Accueil') as acc_m,
       private.aujourdhui() as jour,
       gen_random_uuid() as k1;
alter table ctx add column lundis date[], add column mentions uuid[], add column serie uuid, add column passe uuid,
  add column representant uuid, add column titre_representant uuid;
-- Sept lundis, à partir du premier lundi d'au moins une semaine plus tard.
update ctx set lundis = (select array_agg(p.premier + 7 * i order by i)
                           from (select jour + 7 + (8 - extract(isodow from jour + 7)::integer) % 7 as premier) as p,
                                generate_series(0, 6) as i),
               mentions = array['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
                                '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005',
                                '10000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000008']::uuid[]
                          || fij_m || h_m;
grant select, update on ctx to authenticated;
grant select on ctx to anon;

-- Prévus de Coordination dans un mois (v_evenements_mois).
create function pg_temp.prevus(p_mois date) returns integer
language sql as $$
  select coalesce(sum((x.ligne ->> 'prevus')::integer), 0)::integer
    from jsonb_array_elements(tests.lire((select coo from ctx), 'aal2',
           format('select prevus from public.v_evenements_mois where ministere_id = %L and mois = %L',
                  (select coo_m from ctx), p_mois))) as x(ligne)
$$;
create temp table avant as
select m.mois, pg_temp.prevus(m.mois) as prevus
  from (select distinct date_trunc('month', d::timestamp)::date as mois from ctx, unnest(lundis) as d) as m;

select is((select extract(isodow from d)::integer from ctx, unnest(lundis) as d group by 1), 1,
  'contexte : sept lundis');

-- S1
select tests.se_connecter((select coo from ctx), 'aal2');
update ctx set serie = public.ajouter_evenements_serie('Série, réunion des responsables', lundis, 'valide', mentions,
                                                      1140::smallint, 1260::smallint, k1);
select tests.deconnecter();
select isnt((select serie from ctx), null, 'S1 : la série est créée');
select is((select count(*)::integer from public.evenement e cross join ctx c
            where e.serie_id = c.serie and e.ministere_id = c.coo_m and e.titre = 'Série, réunion des responsables'),
  7, 'S1 : sept événements de Coordination, même serie_id');
select set_eq($$
  select x.date, x.date_fin, x.statut::text, x.heure_prevue, x.heure_fin from public.evenement_etat x
    join public.evenement e on e.id = x.evenement_id
   where e.serie_id = (select serie from ctx)
$$, $$
  select d, null::date, 'valide'::text, 1140::smallint, 1260::smallint from ctx, unnest(lundis) as d
$$, 'S1 : un état par lundi, Validé, de 19 h à 21 h, sans date de fin');
select is((select count(*)::integer from public.evenement_etat x
             join public.evenement e on e.id = x.evenement_id where e.serie_id = (select serie from ctx)), 7,
  'S1 : un seul état par événement');
select is((select count(*)::integer from public.evenement_mention m
             join public.evenement e on e.id = m.evenement_id where e.serie_id = (select serie from ctx)), 56,
  'S1 : 56 mentions (huit par date)');
select is((select count(*)::integer from public.journal j
             join public.evenement e on e.id = j.cible_id
            where e.serie_id = (select serie from ctx) and j.action = 'evenement_ajoute'
              and j.ministere_id = (select coo_m from ctx) and j.compte = (select coo from ctx)
              and (j.detail ->> 'serie')::uuid = (select serie from ctx)
              and j.detail ->> 'heure_fin' = '1260' and jsonb_array_length(j.detail -> 'mentions') = 8), 7,
  'S1 : sept lignes evenement_ajoute, chacune avec la série, l''heure de fin et les huit mentions');
select is(tests.compter((select fij from ctx), 'aal2',
            format('select 1 from public.v_evenement where serie_id = %L', (select serie from ctx))), 7,
  'S1 : FIJ voit les sept dates dans son calendrier');
select is((select jsonb_object_agg(a.mois, pg_temp.prevus(a.mois) - a.prevus order by a.mois) from avant a),
          (select jsonb_object_agg(x.mois, x.n order by x.mois)
             from (select date_trunc('month', d::timestamp)::date as mois, count(*)::integer as n
                     from ctx, unnest(lundis) as d group by 1) as x),
  'S1 : chaque mois compte ses dates (un prévu par date)');

-- S2 : la réponse se perd, Coordination touche de nouveau le bouton.
select tests.se_connecter((select coo from ctx), 'aal2');
select is(public.ajouter_evenements_serie('Série, réunion des responsables',
                                          (select array_agg(d order by d desc) from ctx, unnest(lundis) as d), 'valide',
                                          (select mentions from ctx), 1140::smallint, 1260::smallint, (select k1 from ctx)),
  (select serie from ctx), 'S2 : même numéro, mêmes dates (dans un autre ordre) : la même série');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, réunion des responsables', (select lundis[1:6] from ctx), 'valide',
                                         (select mentions from ctx), 1140::smallint, 1260::smallint, (select k1 from ctx))
$$, 'P0001', 'Cet envoi est déjà enregistré avec d''autres valeurs.', 'S2 : même numéro, autres dates : refus');
select tests.deconnecter();
select is((select count(*)::integer from public.evenement where serie_id = (select serie from ctx)), 7,
  'S2 : toujours sept événements, pas quatorze');
select is((select count(*)::integer from public.journal j join public.evenement e on e.id = j.cible_id
            where e.serie_id = (select serie from ctx)), 7, 'S2 : aucune ligne de journal de plus');

-- Limites (Q2)
select tests.se_connecter((select coo from ctx), 'aal2');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, trop longue',
    (select array_agg(jour + i) from ctx, generate_series(1, 32) as i), 'valide', '{}'::uuid[], null::smallint,
    null::smallint, gen_random_uuid())
$$, 'P0001', 'Une série compte 31 dates au plus. Raccourcissez la période.', '32 dates : refusé');
select lives_ok($$
  select public.ajouter_evenements_serie('Série, 31 dates',
    (select array_agg(jour + i) from ctx, generate_series(1, 31) as i), 'brouillon', '{}'::uuid[], null::smallint,
    null::smallint, gen_random_uuid())
$$, '31 dates : accepté');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, une date', (select array[jour + 3, jour + 3] from ctx), 'valide',
    '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, 'P0001', 'Une série compte au moins deux dates.', 'une seule date (doublon compris) : refusé');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, passée', (select array[jour - 1, jour + 6] from ctx), 'valide',
    '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, 'P0001', 'La date ne peut pas être passée.', 'une date passée : refusé');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, sur treize mois',
    (select array[jour + 1, (jour + 1 + interval '1 year')::date + 1] from ctx), 'valide', '{}'::uuid[], null::smallint,
    null::smallint, gen_random_uuid())
$$, 'P0001', 'Une série tient sur 12 mois au plus.', 'plus de 12 mois entre la première et la dernière date : refusé');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, soi-même', (select array[jour + 1, jour + 8] from ctx), 'valide',
    (select array[coo_m] from ctx), null::smallint, null::smallint, gen_random_uuid())
$$, 'P0001', 'Ce ministère ne peut pas être mentionné.', 'se mentionner soi-même : refusé');
select throws_ok($$
  select public.ajouter_evenements_serie('  ', (select array[jour + 1, jour + 8] from ctx), 'valide',
    '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, 'P0001', 'Donnez un nom à l''événement (80 caractères au plus).', 'un nom vide : refusé');
select lives_ok($$
  select public.ajouter_evenements_serie('Série, doublons', (select array[jour + 3, jour + 3, jour + 4] from ctx),
    'brouillon', '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, 'des dates en double comptent une fois');
select tests.deconnecter();
select is((select count(*)::integer from public.evenement where titre = 'Série, doublons'), 2,
  'des dates en double : deux événements, pas trois');

-- Droits : seul un compte de ministère ajoute une série ; les gestes de série au porteur.
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$
  select public.ajouter_evenements_serie('Série, berger', (select array[jour + 1, jour + 8] from ctx), 'valide',
    '{}'::uuid[], null::smallint, null::smallint, gen_random_uuid())
$$, '42501', 'Seul un compte de ministère peut ajouter un événement.', 'le berger n''ajoute pas de série');
select tests.deconnecter();
select tests.se_connecter((select fij from ctx), 'aal2');
select throws_ok($$ select public.corriger_titre_serie((select serie from ctx), 'Série, nom de FIJ') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère mentionné ne corrige pas le nom');
select throws_ok($$ select public.retirer_serie((select serie from ctx)) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère mentionné ne retire pas la série');
select tests.deconnecter();

-- Une date passée de la même série (écrite par le propriétaire des tables, sans mention).
with nouveau as (
  insert into public.evenement (ministere_id, titre, serie_id, saisi_le, saisi_par)
  select coo_m, 'Série, réunion des responsables', serie, now() - interval '9 days', coo from ctx returning id)
update ctx set passe = (select n.id from nouveau n);
insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select passe, jour - 7, 'valide', now() - interval '9 days', coo from ctx;

-- Nom, toute la série : toutes les dates non retirées, passée comprise ; le même nom : rien.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$ select public.corriger_titre_serie((select serie from ctx), 'Série, réunion des responsables (lundi)') $$,
  'Toute la série : Coordination corrige le nom');
select lives_ok($$ select public.corriger_titre_serie((select serie from ctx), 'Série, réunion des responsables (lundi)') $$,
  'le même nom de nouveau : rien n''est écrit');
select tests.deconnecter();
select is((select count(*)::integer from public.evenement_titre t join public.evenement e on e.id = t.evenement_id
            where e.serie_id = (select serie from ctx)), 8, 'le nom : une version par date, passée comprise (huit)');
select is((select count(*)::integer from public.journal j join public.evenement e on e.id = j.cible_id
            where e.serie_id = (select serie from ctx) and j.action = 'evenement_titre_corrige'), 8,
  'le nom : une ligne de journal par date');

-- Modération (Q14) : une ligne par série, pour la création comme pour la correction du nom.
update ctx set representant = (select (x.ligne ->> 'cible_id')::uuid
                                 from jsonb_array_elements(tests.lire((select tech from ctx), 'aal2',
                                        format('select cible_id from public.v_textes_a_relire where cible = %L and cible_id in '
                                               '(select id from public.evenement where serie_id = %L)',
                                               'evenement', (select serie from ctx)))) as x(ligne)),
               titre_representant = (select (x.ligne ->> 'cible_id')::uuid
                                 from jsonb_array_elements(tests.lire((select tech from ctx), 'aal2',
                                        format('select cible_id from public.v_textes_a_relire where cible = %L and cible_id in '
                                               '(select t.id from public.evenement_titre t join public.evenement e on e.id = t.evenement_id '
                                               'where e.serie_id = %L)',
                                               'evenement_titre', (select serie from ctx)))) as x(ligne));
select ok((select representant is not null and titre_representant is not null from ctx),
  'Q14 : une seule ligne par série dans les textes à relire (création et correction du nom)');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('evenement_titre', (select titre_representant from ctx), 'titre', 'autre') $$,
  'Q14 : EJP Tech masque le nom corrigé de la série');
select lives_ok($$ select public.masquer_texte('evenement', (select representant from ctx), 'titre', 'autre') $$,
  'Q14 : EJP Tech masque le nom de création de la série');
select tests.deconnecter();
select is((select count(*)::integer from public.evenement_titre t join public.evenement e on e.id = t.evenement_id
            where e.serie_id = (select serie from ctx) and t.titre <> '[texte masqué par EJP Tech]'), 0,
  'Q14 : masquer le nom corrigé d''une date le masque sur toute la série');
select is((select count(*)::integer from public.evenement e
            where e.serie_id = (select serie from ctx) and e.titre <> '[texte masqué par EJP Tech]'), 0,
  'Q14 : masquer le nom de création d''une date le masque sur toute la série');

-- Mentions, toute la série : les dates à venir seulement ; FIJ retiré, Accueil ajouté.
select tests.se_connecter((select coo from ctx), 'aal2');
select lives_ok($$
  select public.modifier_mentions_serie((select serie from ctx),
    (select array_remove(mentions, fij_m) || acc_m from ctx))
$$, 'Toute la série : Coordination retire FIJ et ajoute Accueil');
select tests.deconnecter();
select is(tests.compter((select fij from ctx), 'aal2',
            format('select 1 from public.v_evenement where serie_id = %L', (select serie from ctx))), 0,
  'FIJ ne voit plus aucune date de la série');
select is((select count(*)::integer from public.v_evenement_mention m join public.evenement e on e.id = m.evenement_id
            where e.serie_id = (select serie from ctx) and m.ministere_id = (select acc_m from ctx)), 7,
  'Accueil est mentionné sur les sept dates à venir, pas sur la date passée');
select is((select count(*)::integer from public.journal j join public.evenement e on e.id = j.cible_id
            where e.serie_id = (select serie from ctx)
              and j.action in ('evenement_mention_ajoutee', 'evenement_mention_retiree')), 14,
  'les mentions : une ligne de journal par ministère et par date (sept retraits, sept ajouts)');

-- S8 : la série est au mauvais jour. Une date à venir est déjà annulée : elle reste, comme la
-- date passée ; les six autres sortent du calendrier.
select tests.se_connecter((select coo from ctx), 'aal2');
insert into public.evenement_etat (evenement_id, date, statut)
select e.id, c.lundis[7], 'annule' from ctx c join public.evenement e on e.serie_id = c.serie
  join public.evenement_etat x on x.evenement_id = e.id and x.date = c.lundis[7];
select lives_ok($$ select public.retirer_serie((select serie from ctx)) $$, 'S8 : Coordination retire toute la série');
select tests.deconnecter();
select is((select count(*)::integer from public.evenement_retrait r join public.evenement e on e.id = r.evenement_id
            where e.serie_id = (select serie from ctx)), 6,
  'S8 : les six dates à venir sans état final sont retirées');
select is((select count(*)::integer from public.journal j join public.evenement e on e.id = j.cible_id
            where e.serie_id = (select serie from ctx) and j.action = 'evenement_retire'), 6,
  'S8 : six lignes evenement_retire');
select is(tests.compter((select coo from ctx), 'aal2',
            format('select 1 from public.v_evenement where serie_id = %L', (select serie from ctx))), 2,
  'S8 : la date passée et la date annulée restent au calendrier');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.retirer_serie((select serie from ctx)) $$, 'EJP Tech retire le reste de la série');
select tests.deconnecter();
select is(tests.compter((select coo from ctx), 'aal2',
            format('select 1 from public.v_evenement where serie_id = %L', (select serie from ctx))), 0,
  'EJP Tech : toutes les dates sont retirées');

select * from finish();
rollback;
