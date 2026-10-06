-- Répartition du total d'un indicateur sensible par catégories (lot B8 ; docs/plan-etape-4.md,
-- section 4, « B8 » ; docs/decisions.md, P47 et T41 ; contrat-etape-4.md, sections 5, 6 et 7).
--
-- Écriture par saisir_chiffres_mois : somme au-dessus du total refusée avec son message,
-- catégorie hors liste refusée, catégories pour un non-sensible ou pour un sensible sans liste
-- refusées, catégorie absente écrite à 0. Lecture par v_ventilation_sensible : « Non réparti »
-- juste, seule la répartition du total le plus récent, une correction sans catégories ne laisse
-- aucune ligne, valeurs exactes pour le ministère, règle de P47 pour le berger (total de 0, 1
-- ou 2 masqué en entier, départage, cas nommé B, A, C), jeu d'exemple seed/44. Catégories :
-- 3 à 6 par indicateur (la base refuse une répartition hors de cette plage, liste ramenée à 2
-- par un retrait ou montée à 7), ordre unique et au moins 1, écrites par migration seulement,
-- figées dès qu'elles servent, une catégorie retirée reste lue dans une ancienne répartition,
-- aucune répartition avec une catégorie absente de la liste.
-- Enfin la simulation du lecteur : pour 4 à 7 cases et un total de 3 à 16, toutes les
-- répartitions, leur affichage par private.repartition_protegee (la fonction de la vue), et
-- aucune case de 1 ou 2 qui n'aurait qu'une valeur possible dans son groupe d'affichage.
begin;

select plan(57);

create temp table ctx as
select tests.creer_ministere('B8 répartition A') as a_m,
       tests.creer_ministere('B8 répartition B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '2 months')::date as m2,
       (private.mois_courant() - interval '3 months')::date as m3,
       (private.mois_courant() - interval '4 months')::date as m4,
       (private.mois_courant() - interval '5 months')::date as m5;
alter table ctx add column a uuid, add column b uuid,
  add column sens uuid, add column sans uuid, add column ord uuid, add column social uuid;
update ctx set a = tests.creer_compte('b8-repartition-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('b8-repartition-b@exemple.test', 'ministere', b_m);

-- Catalogue d'essai : un sensible avec la liste B, A, C (dans cet ordre), un sensible sans liste.
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sensible, ordre) values
  ('essai_b8_rep', 'essai b8 rep', 'Essai B8 répartition', 'Sensible d''essai réparti par catégories.', 'mois', true, 1),
  ('essai_b8_sans', 'essai b8 rep', 'Essai B8 sans liste', 'Sensible d''essai sans liste de catégories.', 'mois', true, 2);
select set_config('pilotage.migration', 'oui', true);
insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values
  ('essai_b8_rep', 'b', 'Catégorie B', 1), ('essai_b8_rep', 'a', 'Catégorie A', 2), ('essai_b8_rep', 'c', 'Catégorie C', 3);
select set_config('pilotage.migration', '', true);

insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, modele_code, ordre)
select v.libelle, v.definition, 'mois', c.a_m, v.sensible, v.modele, v.ordre
  from ctx c
 cross join (values ('Essai B8 répartition', 'Sensible d''essai réparti par catégories.', true, 'essai_b8_rep', 1),
                    ('Essai B8 sans liste', 'Sensible d''essai sans liste de catégories.', true, 'essai_b8_sans', 2),
                    ('Essai B8 ordinaire', 'Indicateur du mois d''essai, non sensible.', false, null, 3))
       as v(libelle, definition, sensible, modele, ordre);
update ctx set
  sens = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_b8_rep'),
  sans = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_b8_sans'),
  ord = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.libelle = 'Essai B8 ordinaire'),
  social = (select i.id from public.indicateur i
             where i.ministere_id = tests.ministere('Social') and i.modele_code = 'social_beneficiaires_passages');
grant select on ctx to authenticated, anon;

select ok((select count(*) from ctx where a is not null and berger is not null and sens is not null and sans is not null
             and ord is not null and social is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes et les indicateurs utilisés ici');
select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_ventilation_sensible'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('periode', 'date'), ('categorie', 'text'),
              ('libelle', 'text'), ('ordre', 'smallint'), ('valeur', 'integer'), ('moins_de_3', 'boolean'),
              ('masquee', 'boolean'), ('tout_masque', 'boolean') $$,
  'v_ventilation_sensible : colonnes et types du contrat');

-- 1. Refus à l'écriture
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 7, 'categories', jsonb_build_object('b', 4, 'a', 3, 'c', 2))))
$$, 'P0001', 'La somme des catégories (9) dépasse le total du mois (7).', 'une somme au-dessus du total est refusée, avec ses nombres');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 7, 'categories', jsonb_build_object('b', 1, 'x', 1))))
$$, 'P0001', 'Cette catégorie n''est pas dans la liste de l''indicateur.', 'une catégorie hors liste est refusée');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select ord from ctx), 'valeur', 7, 'categories', jsonb_build_object('b', 1))))
$$, 'P0001', 'Cet indicateur n''a pas de répartition.', 'des catégories pour un indicateur non sensible sont refusées');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sans from ctx), 'valeur', 7, 'categories', jsonb_build_object('b', 1))))
$$, 'P0001', 'Cet indicateur n''a pas de répartition.', 'des catégories pour un sensible sans liste sont refusées');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 7, 'categories', jsonb_build_object('b', 1.5))))
$$, 'P0001', 'Chaque catégorie compte un nombre entier de 0 à 9 999.', 'une catégorie non entière est refusée');
select throws_ok($$
  select public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 7, 'categories', jsonb_build_array(1, 2))))
$$, 'P0001', 'La répartition se donne par catégorie.', 'une répartition qui n''est pas un objet est refusée');

-- 2. Cas nommé de P47 : ordre B, A, C ; B = 4, A = 5, C = 1, total 10
select is(public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 10, 'categories', jsonb_build_object('b', 4, 'a', 5, 'c', 1)))),
  1, 'le ministère envoie le total de 10 et sa répartition (une ligne de mesure)');
select results_eq($$
  select categorie, libelle, valeur, moins_de_3, masquee, tout_masque from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m1 from ctx) order by ordre
$$, $$ values ('b', 'Catégorie B', 4, false, false, false), ('a', 'Catégorie A', 5, false, false, false),
              ('c', 'Catégorie C', 1, false, false, false), (null, 'Non réparti', 0, false, false, false) $$,
  'le ministère lit les valeurs exactes de sa répartition, « Non réparti » en dernier');
select tests.deconnecter();

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select categorie, valeur, moins_de_3, masquee, tout_masque from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m1 from ctx) order by ordre
$$, $$ values ('b', null::integer, false, false, true), ('a', null, false, false, true),
              ('c', null, false, false, true), (null, null, false, false, true) $$,
  'cas nommé (B = 4, A = 5, C = 1) : le berger lit la répartition masquée en entier');
select tests.deconnecter();
select is_empty($$ select 1 from private.repartition_protegee(array[4, 5, 1, 0]) where not tout_masque $$,
  'cas nommé : la fonction de la vue masque tout');

-- 3. « Non réparti », correction du total, catégorie absente écrite à 0
select tests.se_connecter((select a from ctx), 'aal2');
select is(public.saisir_chiffres_mois((select m2 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 9, 'categories', jsonb_build_object('b', 3)))),
  1, 'un total de 9 réparti en partie');
select results_eq($$
  select categorie, valeur from public.ventilation_sensible
   where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx) order by categorie
$$, $$ values ('a', 0), ('b', 3), ('c', 0) $$, 'les catégories absentes de l''envoi sont écrites à 0 (toute la liste)');
select results_eq($$
  select categorie, valeur from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m2 from ctx) order by ordre
$$, $$ values ('b', 3), ('a', 0), ('c', 0), (null, 6) $$, '« Non réparti » vaut le total moins la somme des catégories');
select lives_ok($$
  select public.saisir_chiffres_mois((select m2 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 12, 'categories', jsonb_build_object('b', 5, 'a', 4))))
$$, 'le ministère corrige le total et sa répartition');
select results_eq($$
  select categorie, valeur from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m2 from ctx) order by ordre
$$, $$ values ('b', 5), ('a', 4), ('c', 0), (null, 3) $$, 'seule la répartition du total le plus récent se lit');
select lives_ok($$
  select public.saisir_chiffres_mois((select m2 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 12)))
$$, 'le ministère corrige encore le total, sans répartition');
select is_empty($$
  select 1 from public.v_ventilation_sensible where indicateur_id = (select sens from ctx) and periode = (select m2 from ctx)
$$, 'une correction du total sans catégories ne laisse aucune ligne pour ce mois (pas « tout non réparti »)');
select is((select count(*)::integer from public.ventilation_sensible
            where indicateur_id = (select sens from ctx) and mois = (select m2 from ctx)), 6,
  'les répartitions anciennes restent dans la table (ajout seulement), lues par le seul ministère');

-- 4. Petits totaux : 2, puis 1
select lives_ok($$
  select public.saisir_chiffres_mois((select m3 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 2, 'categories', jsonb_build_object('b', 2))))
$$, 'un total de 2 se répartit');
select lives_ok($$
  select public.saisir_chiffres_mois((select m4 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 1, 'categories', jsonb_build_object('a', 1))))
$$, 'un total de 1 se répartit');
select results_eq($$
  select categorie, valeur from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m3 from ctx) order by ordre
$$, $$ values ('b', 2), ('a', 0), ('c', 0), (null, 0) $$, 'le ministère lit son total de 2 réparti, valeurs exactes');
select tests.deconnecter();

select tests.se_connecter((select berger from ctx), 'aal2');
select is((select count(*)::integer from public.v_ventilation_sensible
            where indicateur_id = (select sens from ctx) and periode in ((select m3 from ctx), (select m4 from ctx))
              and tout_masque and valeur is null and not moins_de_3 and not masquee), 8,
  'un total de 1 ou de 2 : le berger lit les deux répartitions masquées en entier');
select results_eq($$
  select categorie, valeur, moins_de_3, masquee, tout_masque from public.v_ventilation_sensible
   where indicateur_id = (select social from ctx)
     and periode = (private.mois_courant() - interval '4 months')::date
   order by ordre
$$, $$ values ('malaise', null::integer, false, true, false), ('blessure', null, true, false, false),
              ('autre', 0, false, false, false), (null, 0, false, false, false) $$,
  'jeu d''exemple : Social (6 réparti 4, 2, 0) se lit « masqué », « moins de 3 », 0 et 0 pour le berger');
select results_eq($$
  select categorie, valeur, moins_de_3, masquee, tout_masque from public.v_ventilation_sensible
   where indicateur_id = (select social from ctx) and periode = private.mois_courant()
   order by ordre
$$, $$ values ('malaise', 4, false, false, false), ('blessure', 3, false, false, false),
              ('autre', 0, false, false, false), (null, 0, false, false, false) $$,
  'jeu d''exemple : le mois en cours de Social (7 réparti 4, 3, 0, aucun petit nombre) s''affiche en entier');
select tests.deconnecter();
select results_eq($$
  select r.valeur, r.moins_de_3, r.masquee, r.tout_masque from private.repartition_protegee(array[0, 0, 0, 0]) r order by r.rang
$$, $$ values (null::integer, false, false, true), (null, false, false, true), (null, false, false, true),
              (null, false, false, true) $$, 'un total de 0 : la répartition est masquée en entier');

-- 5. Règle de P47, cas choisis
select results_eq($$
  select r.valeur, r.moins_de_3, r.masquee from private.repartition_protegee(array[4, 2, 0, 4]) r order by r.rang
$$, $$ values (null::integer, false, true), (null, true, false), (0, false, false), (4, false, false) $$,
  'à égalité, la première case dans l''ordre de la liste est masquée, « Non réparti » en dernier');
select results_eq($$
  select r.valeur, r.moins_de_3, r.masquee from private.repartition_protegee(array[3, 1, 0, 5]) r order by r.rang
$$, $$ values (3, false, false), (null::integer, true, false), (0, false, false), (null, false, true) $$,
  '« Non réparti » se masque quand il est la plus grande case');
select is_empty($$ select 1 from private.repartition_protegee(array[3, 2, 4, 0]) where tout_masque $$,
  'une case « moins de 3 » à 2 : la case masquée suffit, rien n''est masqué en entier');
select is_empty($$ select 1 from private.repartition_protegee(array[3, 4, 1, 0]) where not tout_masque $$,
  'règle 6 : la case masquée vaut exactement la borne (3 plus 1), tout est masqué');
select is_empty($$ select 1 from private.repartition_protegee(array[1, 2, 0, 1]) where not tout_masque $$,
  'aucune case de 3 ou plus : tout est masqué');
select is_empty($$ select 1 from private.repartition_protegee(array[5, 3, 0, 0]) where valeur is null or moins_de_3 or masquee $$,
  'aucune case « moins de 3 » : tout s''affiche');

-- 6. Catégories : 3 à 6, écrites par migration, figées dès qu'elles servent, retrait
select is_empty($$
  select c.prevu_code from public.categorie_sensible c
   where c.retiree_le is null
   group by c.prevu_code having count(*) not between 3 and 6
$$, 'chaque indicateur sensible qui a des catégories en a de 3 à 6');
select is_empty($$
  select c.prevu_code from public.categorie_sensible c
    join private.indicateur_prevu p on p.code = c.prevu_code
   where not p.sensible
$$, 'toute catégorie appartient à un indicateur sensible du catalogue');
select throws_ok($$
  insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values ('essai_b8_rep', 'd', 'Catégorie D', 4)
$$, '42501', 'Les catégories d''un indicateur sensible s''écrivent seulement par migration.',
  'une catégorie ne s''ajoute pas hors migration, même par le propriétaire');
select set_config('pilotage.migration', 'oui', true);
select throws_ok($$
  insert into public.categorie_sensible (prevu_code, code, libelle, ordre)
  select p.code, 'essai', 'Essai', 1 from private.indicateur_prevu p where not p.sensible limit 1
$$, 'P0001', 'Une catégorie appartient à un indicateur sensible du catalogue.',
  'une catégorie pour un indicateur non sensible est refusée');
select throws_ok($$
  update public.categorie_sensible set libelle = 'Autre nom' where prevu_code = 'essai_b8_rep' and code = 'c'
$$, '42501', 'Cette catégorie sert déjà dans une répartition : elle ne change plus, elle se retire seulement.',
  'une catégorie qui sert ne change plus, même par migration');
select throws_ok($$
  delete from public.categorie_sensible where prevu_code = 'essai_b8_rep' and code = 'c'
$$, '42501', 'Cette catégorie sert déjà dans une répartition : elle ne change plus, elle se retire seulement.',
  'une catégorie qui sert ne s''efface pas');
select lives_ok($$
  update public.categorie_sensible set retiree_le = private.aujourdhui() where prevu_code = 'essai_b8_rep' and code = 'c'
$$, 'la coordination change sa liste : C, qui sert, est retirée (seul changement permis)');
select lives_ok($$
  insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values ('essai_b8_rep', 'd', 'Catégorie D', 4)
$$, 'la coordination change sa liste : D arrive');
select set_config('pilotage.migration', '', true);

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select categorie, libelle, tout_masque from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m1 from ctx) order by ordre
$$, $$ values ('b', 'Catégorie B', true), ('a', 'Catégorie A', true), ('c', 'Catégorie C', true),
              (null, 'Non réparti', true) $$,
  'une catégorie retirée reste lue, avec son libellé, dans une ancienne répartition');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  select public.saisir_chiffres_mois((select m5 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 5, 'categories', jsonb_build_object('c', 1))))
$$, 'P0001', 'Cette catégorie n''est pas dans la liste de l''indicateur.', 'une catégorie retirée ne se saisit plus');
select lives_ok($$
  select public.saisir_chiffres_mois((select m5 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 5, 'categories', jsonb_build_object('d', 1))))
$$, 'une nouvelle répartition prend la liste en cours');
select results_eq($$
  select categorie, valeur from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx) and periode = (select m5 from ctx) order by ordre
$$, $$ values ('b', 0), ('a', 0), ('d', 1), (null, 4) $$, 'la nouvelle répartition reprend B, A et D, sans C');
select tests.deconnecter();

-- Aucune répartition ne porte une catégorie absente de la liste de son indicateur (le lien ne
-- tient que par les triggers : ce contrôle prévient qu'un futur lot en réécrive un).
select is_empty($$
  select 1 from public.ventilation_sensible v
    join public.indicateur i on i.id = v.indicateur_id
   where not exists (select 1 from public.categorie_sensible c
                      where c.prevu_code = i.modele_code and c.code = v.categorie)
$$, 'aucune ligne de répartition n''a de catégorie absente de la liste de son indicateur');

-- La liste en cours compte de 3 à 6 catégories, sinon l'indicateur n'a pas de répartition (la
-- règle de P47 suppose au moins 4 cases et n'est simulée que jusqu'à 7) : un retrait qui ramène
-- la liste à 2 ou un ajout qui la monte à 7 ferme la répartition, par la fonction et par le trigger.
select set_config('pilotage.migration', 'oui', true);
select throws_ok($$
  insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values ('essai_b8_rep', 'e', 'Catégorie E', 2)
$$, '23505', null, 'deux catégories d''une même liste ne partagent pas le même ordre');
select throws_ok($$
  insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values ('essai_b8_rep', 'e', 'Catégorie E', 0)
$$, '23514', null, 'l''ordre d''une catégorie est au moins 1');
update public.categorie_sensible set retiree_le = private.aujourdhui() where prevu_code = 'essai_b8_rep' and code = 'd';
select set_config('pilotage.migration', '', true);

select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  select public.saisir_chiffres_mois((select m5 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 5, 'categories', jsonb_build_object('b', 1))))
$$, 'P0001', 'Cet indicateur n''a pas de répartition.', 'une liste ramenée à 2 catégories : l''indicateur n''a plus de répartition');
select lives_ok($$
  select public.saisir_chiffres_mois((select m5 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 5)))
$$, 'le total du mois se saisit encore, sans répartition');
select tests.deconnecter();
select throws_ok($$
  insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur, saisi_le, saisi_par)
  select m.id, m.indicateur_id, m.ministere_id, m.date_ref, c.code, 0, m.saisi_le, m.saisi_par
    from public.mesure m
    join public.categorie_sensible c on c.prevu_code = 'essai_b8_rep' and c.retiree_le is null
   where m.id = (select max(x.id) from public.mesure x where x.indicateur_id = (select sens from ctx)
                                                          and x.date_ref = (select m5 from ctx))
$$, 'P0001', 'Une répartition demande de 3 à 6 catégories en cours dans la liste de l''indicateur.',
  'la base refuse une répartition quand la liste en cours compte 2 catégories');

select set_config('pilotage.migration', 'oui', true);
insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values
  ('essai_b8_rep', 'e', 'Catégorie E', 5), ('essai_b8_rep', 'f', 'Catégorie F', 6),
  ('essai_b8_rep', 'g', 'Catégorie G', 7), ('essai_b8_rep', 'h', 'Catégorie H', 8),
  ('essai_b8_rep', 'i', 'Catégorie I', 9);
select set_config('pilotage.migration', '', true);
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$
  select public.saisir_chiffres_mois((select m5 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 5, 'categories', jsonb_build_object('b', 1))))
$$, 'P0001', 'Cet indicateur n''a pas de répartition.', 'une liste montée à 7 catégories : l''indicateur n''a plus de répartition');
select tests.deconnecter();
select throws_ok($$
  insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur, saisi_le, saisi_par)
  select m.id, m.indicateur_id, m.ministere_id, m.date_ref, c.code, 0, m.saisi_le, m.saisi_par
    from public.mesure m
    join public.categorie_sensible c on c.prevu_code = 'essai_b8_rep' and c.retiree_le is null
   where m.id = (select max(x.id) from public.mesure x where x.indicateur_id = (select sens from ctx)
                                                          and x.date_ref = (select m5 from ctx))
$$, 'P0001', 'Une répartition demande de 3 à 6 catégories en cours dans la liste de l''indicateur.',
  'la base refuse une répartition quand la liste en cours compte 7 catégories');

-- 7. Simulation du lecteur (P47, « Contrôle de la règle »)
create temp table simulation as
with recursive comp(n, total, vals, reste) as (
  select g.n, t.t, array[]::integer[], t.t
    from generate_series(3, 7) as g(n) cross join generate_series(3, 16) as t(t)
  union all
  select c.n, c.total, c.vals || a.a, c.reste - a.a
    from comp c cross join lateral generate_series(0, c.reste) as a(a)
   where cardinality(c.vals) < c.n - 1
)
select c.n, c.total, c.vals || c.reste as vals from comp c where cardinality(c.vals) = c.n - 1;

create temp table affichage as
select s.n, s.total, s.vals,
       (select string_agg(case when r.tout_masque then 'T' when r.masquee then 'M' when r.moins_de_3 then 'm'
                               else r.valeur::text end, ',' order by r.rang)
          from private.repartition_protegee(s.vals) as r) as cle
  from simulation s;

create temp view fuites as
select a.n, a.total, a.cle, g.i, min(a.vals[g.i]) as valeur
  from affichage a cross join lateral generate_series(1, a.n) as g(i)
 group by a.n, a.total, a.cle, g.i
having count(distinct a.vals[g.i]) = 1 and min(a.vals[g.i]) in (1, 2);

select is((select count(*)::integer from simulation where n between 4 and 7), 344864,
  'simulation : toutes les répartitions de 4 à 7 cases pour un total de 3 à 16 (344 864)');
select is((select count(*)::integer from simulation where n = 7 and total = 12), 18564,
  'simulation : 18 564 répartitions pour 7 cases et un total de 12');
select is_empty($$ select * from fuites where n between 4 and 7 $$,
  'simulation : de 4 à 7 cases, aucune case de 1 ou 2 ne se retrouve à partir de l''affichage et du total');
select results_eq($$ select n, total, cle, i, valeur from fuites where n = 3 order by i $$,
  $$ values (3, 6, 'T,T,T', 1, 2), (3, 6, 'T,T,T', 2, 2), (3, 6, 'T,T,T', 3, 2) $$,
  'simulation : le contrôle voit une fuite, celle que la consigne de 3 catégories au moins écarte (3 cases, 2, 2 et 2)');

select * from finish();
rollback;
