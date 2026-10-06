-- saisir_chiffres_mois (lot B8 ; docs/plan-etape-4.md, section 4, « B8 » ; contrat-etape-4.md,
-- section 7 ; docs/decisions.md, P45, T41 ; BRIEF, section 3, règle 10).
--
-- Un envoi de 5 lignes, dont 2 sensibles avec précision et répartition, écrit 5 totaux, leurs
-- répartitions et leurs précisions, et une seule ligne de journal mesure_saisie, sans valeur
-- propre, sans ligne sensible et sans texte ; tout ou rien sur une erreur de la dernière ligne ;
-- mois en cours d'un sensible accepté, mois futur refusé ; contrôles de forme ; indicateur d'un
-- autre ministère, commun, du dimanche, calculé ou retiré refusé ; EJP Tech, berger, conseil,
-- administration, ministère désactivé et aal1 refusés ; saisi_le et saisi_par imposés.
begin;

select plan(36);

create temp table ctx as
select tests.creer_ministere('B8 saisie A') as a_m,
       tests.creer_ministere('B8 saisie B') as b_m,
       tests.creer_ministere('B8 saisie désactivé') as d_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (select i.id from public.indicateur i where i.code = 'service') as commun,
       private.mois_courant() as m0,
       (private.mois_courant() - interval '1 month')::date as m1;
alter table ctx add column a uuid, add column b uuid, add column d uuid,
  add column o1 uuid, add column o2 uuid, add column o3 uuid, add column s1 uuid, add column s2 uuid,
  add column attente uuid, add column dim uuid, add column calc uuid, add column retire uuid,
  add column autre uuid, add column inactif uuid;
update ctx set a = tests.creer_compte('b8-saisie-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('b8-saisie-b@exemple.test', 'ministere', b_m),
               d = tests.creer_compte('b8-saisie-d@exemple.test', 'ministere', d_m);

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sensible, ordre) values
  ('essai_b8_scm_un', 'essai b8 scm', 'Essai B8 sensible un', 'Premier sensible d''essai de la saisie du mois.', 'mois', true, 1),
  ('essai_b8_scm_deux', 'essai b8 scm', 'Essai B8 sensible deux', 'Second sensible d''essai de la saisie du mois.', 'mois', true, 2);
select set_config('pilotage.migration', 'oui', true);
insert into public.categorie_sensible (prevu_code, code, libelle, ordre)
select p.code, c.code, c.libelle, c.ordre
  from (values ('essai_b8_scm_un'), ('essai_b8_scm_deux')) as p(code)
 cross join (values ('chute', 'Chute', 1), ('malaise', 'Malaise', 2), ('autre', 'Autre', 3)) as c(code, libelle, ordre);
select set_config('pilotage.migration', '', true);

insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, modele_code, ordre, etat, origine, calcul)
select v.libelle, 'Indicateur d''essai de la saisie du mois.', v.nature, case when v.autre then c.b_m else c.a_m end,
       v.sensible, v.modele, v.ordre, v.etat, v.origine, v.calcul
  from ctx c
 cross join (values ('Essai B8 ordinaire un', 'mois', false, null, 1, 'actif', 'eglise', null, false),
                    ('Essai B8 ordinaire deux', 'mois', false, null, 2, 'actif', 'eglise', null, false),
                    ('Essai B8 ordinaire trois', 'mois', false, null, 3, 'actif', 'eglise', null, false),
                    ('Essai B8 sensible un', 'mois', true, 'essai_b8_scm_un', 4, 'actif', 'eglise', null, false),
                    ('Essai B8 sensible deux', 'mois', true, 'essai_b8_scm_deux', 5, 'actif', 'eglise', null, false),
                    ('Essai B8 à valider', 'mois', false, null, 6, 'en_attente', 'ministere', null, false),
                    ('Essai B8 du dimanche', 'dimanche', false, null, 7, 'actif', 'eglise', null, false),
                    ('Essai B8 calculé', 'mois', false, null, 8, 'actif', 'eglise', 'taux', false),
                    ('Essai B8 à retirer', 'mois', false, null, 9, 'actif', 'eglise', null, false),
                    ('Essai B8 autre ministère', 'mois', false, null, 1, 'actif', 'eglise', null, true))
       as v(libelle, nature, sensible, modele, ordre, etat, origine, calcul, autre);
update public.indicateur set etat = 'retire', retrait_motif = 'plus_suivi' where libelle = 'Essai B8 à retirer';
update ctx set
  o1 = (select i.id from public.indicateur i where i.libelle = 'Essai B8 ordinaire un'),
  o2 = (select i.id from public.indicateur i where i.libelle = 'Essai B8 ordinaire deux'),
  o3 = (select i.id from public.indicateur i where i.libelle = 'Essai B8 ordinaire trois'),
  s1 = (select i.id from public.indicateur i where i.libelle = 'Essai B8 sensible un'),
  s2 = (select i.id from public.indicateur i where i.libelle = 'Essai B8 sensible deux'),
  attente = (select i.id from public.indicateur i where i.libelle = 'Essai B8 à valider'),
  dim = (select i.id from public.indicateur i where i.libelle = 'Essai B8 du dimanche'),
  calc = (select i.id from public.indicateur i where i.libelle = 'Essai B8 calculé'),
  retire = (select i.id from public.indicateur i where i.libelle = 'Essai B8 à retirer'),
  autre = (select i.id from public.indicateur i where i.libelle = 'Essai B8 autre ministère');
update public.ministere set desactive_le = now() where id = (select d_m from ctx);
grant select on ctx to authenticated, anon;

-- Une ligne de l'envoi, et l'envoi des cinq lignes de référence (valeur de la dernière : p_dernier).
create function pg_temp.ligne(p_indicateur uuid, p_valeur integer) returns jsonb language sql as $$
  select jsonb_build_object('indicateur_id', p_indicateur, 'valeur', p_valeur)
$$;
create function pg_temp.cinq_lignes(p_dernier integer default 5, p_precision text default 'Deuxième précision d''essai.')
returns jsonb language sql as $$
  select jsonb_build_array(
    pg_temp.ligne((select o1 from ctx), 11), pg_temp.ligne((select o2 from ctx), 12),
    pg_temp.ligne((select o3 from ctx), 13),
    pg_temp.ligne((select s1 from ctx), 7) || jsonb_build_object(
      'categories', jsonb_build_object('chute', 4, 'malaise', 2), 'precision', 'Première précision d''essai.'),
    pg_temp.ligne((select s2 from ctx), p_dernier) || jsonb_build_object(
      'categories', jsonb_build_object('autre', 3), 'precision', p_precision))
$$;
grant execute on function pg_temp.ligne(uuid, integer), pg_temp.cinq_lignes(integer, text) to authenticated, anon;

create temp view compte_ecrit as
select (select count(*) from public.mesure m where m.ministere_id = (select a_m from ctx)) as mesures,
       (select count(*) from public.ventilation_sensible v where v.ministere_id = (select a_m from ctx)) as ventilations,
       (select count(*) from public.precision_sensible p where p.ministere_id = (select a_m from ctx)) as precisions,
       (select count(*) from public.journal j where j.compte = (select a from ctx)) as journal;

select ok((select count(*) from ctx where a is not null and o1 is not null and s1 is not null and s2 is not null
             and attente is not null and dim is not null and calc is not null and retire is not null and autre is not null
             and commun is not null and berger is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes et les indicateurs utilisés ici');

-- 1. Un envoi de cinq lignes
select tests.se_connecter((select a from ctx), 'aal2');
select is(public.saisir_chiffres_mois((select m1 from ctx), pg_temp.cinq_lignes()), 5,
  'un envoi de 5 lignes, dont 2 sensibles avec précision et répartition, écrit 5 totaux');
select tests.deconnecter();

select is((select count(*)::integer from public.journal where compte = (select a from ctx) and action = 'mesure_saisie'), 1,
  'une seule ligne de journal mesure_saisie pour tout l''envoi');
select is((select detail from public.journal where compte = (select a from ctx) and action = 'mesure_saisie'),
  jsonb_build_object('lignes', jsonb_build_array(
    jsonb_build_object('indicateur_id', (select o1 from ctx), 'date_ref', (select m1 from ctx), 'corrige', false),
    jsonb_build_object('indicateur_id', (select o2 from ctx), 'date_ref', (select m1 from ctx), 'corrige', false),
    jsonb_build_object('indicateur_id', (select o3 from ctx), 'date_ref', (select m1 from ctx), 'corrige', false))),
  'le journal ne garde que les trois lignes non sensibles, sans valeur propre, sans précision ni répartition');
select is((select count(*)::integer from public.journal where compte = (select a from ctx)), 1,
  'aucune autre ligne de journal (ni pour la précision, ni pour la répartition)');
select results_eq($$
  select i.libelle, v.categorie, v.valeur
    from public.ventilation_sensible v join public.indicateur i on i.id = v.indicateur_id
   where v.ministere_id = (select a_m from ctx) order by i.ordre, v.categorie
$$, $$ values ('Essai B8 sensible un', 'autre', 0), ('Essai B8 sensible un', 'chute', 4),
              ('Essai B8 sensible un', 'malaise', 2), ('Essai B8 sensible deux', 'autre', 3),
              ('Essai B8 sensible deux', 'chute', 0), ('Essai B8 sensible deux', 'malaise', 0) $$,
  'les deux répartitions sont écrites, toute la liste, les catégories absentes à 0');
select is_empty($$
  select 1 from public.ventilation_sensible v join public.mesure m on m.id = v.mesure_id
   where v.ministere_id = (select a_m from ctx)
     and (m.indicateur_id <> v.indicateur_id or m.ministere_id <> v.ministere_id or m.date_ref <> v.mois)
  union all
  select 1 from public.precision_sensible p join public.mesure m on m.id = p.mesure_id
   where p.ministere_id = (select a_m from ctx)
     and (m.indicateur_id <> p.indicateur_id or m.ministere_id <> p.ministere_id or m.date_ref <> p.mois)
$$, 'répartitions et précisions sont attachées au total qu''elles accompagnent');
select results_eq($$
  select i.libelle, p.texte from public.precision_sensible p join public.indicateur i on i.id = p.indicateur_id
   where p.ministere_id = (select a_m from ctx) order by i.ordre
$$, $$ values ('Essai B8 sensible un', 'Première précision d''essai.'), ('Essai B8 sensible deux', 'Deuxième précision d''essai.') $$,
  'les deux précisions sont écrites');
select is((select count(distinct x.saisi_le)::integer
             from (select m.saisi_le, m.saisi_par from public.mesure m where m.ministere_id = (select a_m from ctx)
                   union all
                   select v.saisi_le, v.saisi_par from public.ventilation_sensible v where v.ministere_id = (select a_m from ctx)
                   union all
                   select p.saisi_le, p.saisi_par from public.precision_sensible p where p.ministere_id = (select a_m from ctx)) as x
            where x.saisi_par = (select a from ctx)), 1,
  'saisi_le et saisi_par imposés : le compte du ministère, une seule heure pour tout l''envoi');
select is((select count(*)::integer from public.mesure m where m.ministere_id = (select a_m from ctx)
            and m.saisi_par is distinct from (select a from ctx)), 0, 'aucune ligne au nom d''un autre compte');

-- 2. Tout ou rien
create temp table avant as select * from compte_ecrit;
grant select on avant, compte_ecrit to authenticated;
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.saisir_chiffres_mois((select m1 from ctx), pg_temp.cinq_lignes(10000)) $$,
  'P0001', 'Entre 0 et 9 999.', 'erreur de la dernière ligne (plafond, contrôlé par controler_mesure) : refus');
select throws_ok($$ select public.saisir_chiffres_mois((select m1 from ctx), pg_temp.cinq_lignes(5, 'Court.')) $$,
  'P0001', 'La précision doit faire entre 10 et 280 caractères.', 'erreur de la dernière ligne (précision) : refus');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx),
    pg_temp.cinq_lignes() || jsonb_build_array(pg_temp.ligne((select s1 from ctx), 2) || '{"categories": {"chute": 3}}'::jsonb))
$$, 'P0001', 'Un indicateur ne se saisit qu''une fois par envoi.', 'un indicateur en double est refusé');
select tests.deconnecter();
select is((select to_jsonb(c) from compte_ecrit c), (select to_jsonb(a) from avant a),
  'tout ou rien : aucun total, aucune répartition, aucune précision ni ligne de journal après un refus');

-- 3. Mois et forme
select tests.se_connecter((select a from ctx), 'aal2');
select is(public.saisir_chiffres_mois((select m0 from ctx), jsonb_build_array(pg_temp.ligne((select s1 from ctx), 2)
            || '{"precision": "Mois en cours, saisi en avance."}'::jsonb)), 1,
  'le mois en cours d''un sensible est accepté (P45), avec sa précision');
select throws_ok($$
  select public.saisir_chiffres_mois(((select m0 from ctx) + interval '1 month')::date,
                                     jsonb_build_array(pg_temp.ligne((select s1 from ctx), 2)))
$$, 'P0001', 'Ce mois n''est pas encore commencé.', 'un mois futur est refusé');
select throws_ok($$ select public.saisir_chiffres_mois((select m1 from ctx) + 1, jsonb_build_array(pg_temp.ligne((select o1 from ctx), 2))) $$,
  'P0001', 'Un mois se saisit à la date de son 1er jour.', 'une date qui n''est pas un 1er du mois est refusée');
select throws_ok($$ select public.saisir_chiffres_mois((select m1 from ctx), '[]'::jsonb) $$,
  'P0001', 'Saisissez au moins un chiffre.', 'un envoi vide est refusé');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx),
    (select jsonb_agg(pg_temp.ligne(gen_random_uuid(), 1)) from generate_series(1, 31)))
$$, 'P0001', 'Un envoi compte 30 chiffres au plus.', 'plus de 30 lignes : refusé');
select throws_ok($$ select public.saisir_chiffres_mois((select m1 from ctx), '[{"valeur": 3}]'::jsonb) $$,
  'P0001', 'Chaque chiffre porte son indicateur et sa valeur.', 'une ligne sans indicateur est refusée');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx),
    jsonb_build_array(jsonb_build_object('indicateur_id', (select o1 from ctx), 'valeur', '7')))
$$, 'P0001', 'Chaque chiffre est un nombre entier.', 'une valeur écrite en texte est refusée');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx),
    jsonb_build_array(jsonb_build_object('indicateur_id', (select o1 from ctx), 'valeur', 2.5)))
$$, 'P0001', 'Chaque chiffre est un nombre entier.', 'une valeur non entière est refusée');
select is(public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(pg_temp.ligne((select attente from ctx), 4))), 1,
  'un indicateur à valider se saisit');

-- 4. Indicateurs refusés (42501, sans rien nommer)
select throws_ok(format('select public.saisir_chiffres_mois(%L, %L)', (select m1 from ctx), jsonb_build_array(pg_temp.ligne(x.id, 1))),
                 '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'refusé : ' || x.cas)
  from (values (1, (select autre from ctx), 'indicateur d''un autre ministère'),
               (2, (select commun from ctx), 'chiffre commun'),
               (3, (select dim from ctx), 'indicateur du dimanche'),
               (4, (select calc from ctx), 'calcul'),
               (5, (select retire from ctx), 'indicateur retiré'),
               (6, gen_random_uuid(), 'indicateur inconnu')) as x(rang, id, cas)
 order by x.rang;
select throws_ok($$ select public.saisir_chiffres_mois((select m1 from ctx), '[{"indicateur_id": "pas-un-uuid", "valeur": 1}]'::jsonb) $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'refusé : identifiant mal formé');
select tests.deconnecter();

-- 5. Profils refusés : EJP Tech lit tout et ne saisit rien ; le berger, le conseil et
-- l'administration ne saisissent pas ; un ministère désactivé non plus ; aal1 refusé.
select is(tests.essai(x.compte, x.aal,
            format('select public.saisir_chiffres_mois(%L, %L)', (select m1 from ctx),
                   jsonb_build_array(pg_temp.ligne((select o1 from ctx), 1)))),
          '42501', x.profil || ' : refusé')
  from (values (1, (select tech from ctx), 'aal2', 'EJP Tech'), (2, (select berger from ctx), 'aal2', 'berger'),
               (3, (select conseil from ctx), 'aal2', 'conseil'), (4, (select admin from ctx), 'aal2', 'administration'),
               (5, (select d from ctx), 'aal2', 'ministère désactivé'), (6, (select a from ctx), 'aal1', 'ministère en aal1'))
       as x(rang, compte, aal, profil)
 order by x.rang;

select * from finish();
rollback;
