-- Correctifs du lot I, base (20261009120000_lot_i_correctifs.sql ; docs/decisions.md, P52,
-- T45, T47 et Q11 ; audit de B8).
--
-- 1. Audit de B8 : la précision d'un indicateur sensible entre dans la file de relecture
--    d'EJP Tech (cible precision_sensible, ministère de la précision, champs {texte}, libellé de
--    l'indicateur et mois, jamais la valeur) ; personne d'autre ne la lit ; la relecture change
--    son état ; un indicateur retiré pour confidentialité en sort. Les autres cibles gardent
--    indicateur_libelle et mois à null.
-- 2. T45 : le berger et le conseil lisent toujours les lignes de journal de la relecture d'une
--    précision ; l'administration non. T47 est contrôlé dans rls-points-journal.test.sql,
--    rls-points-matrice.test.sql et audit.test.sql.
-- 3. Q11 : un indicateur retiré pour confidentialité vide la lecture de ses catégories
--    (categorie_sensible) et de sa demande (demande_indicateur), EJP Tech et son ministère
--    compris.
-- 4. P52 : la répartition et la précision du mois, lues par le berger, sont exactes.
begin;

select plan(24);

create temp table ctx as
select tests.creer_ministere('Lot I porteur') as a_m,
       tests.creer_ministere('Lot I autre') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.ministere('Social') as social_m,
       (private.mois_courant() - interval '1 month')::date as m1;
alter table ctx add column a uuid, add column b uuid, add column sens uuid, add column sugg uuid,
  add column p1 uuid, add column d1 uuid;
update ctx set a = tests.creer_compte('lot-i-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('lot-i-b@exemple.test', 'ministere', b_m);

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sensible, ordre) values
  ('essai_lot_i_sens', 'essai lot i', 'Essai lot I sensible', 'Sensible d''essai des correctifs du lot I.', 'mois', true, 1),
  ('essai_lot_i_sugg', 'suggestion', 'Essai lot I suggestion', 'Suggestion d''essai des correctifs du lot I.', 'mois', false, 1);
select set_config('pilotage.migration', 'oui', true);
insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values
  ('essai_lot_i_sens', 'x', 'Catégorie X', 1), ('essai_lot_i_sens', 'y', 'Catégorie Y', 2),
  ('essai_lot_i_sens', 'z', 'Catégorie Z', 3);
select set_config('pilotage.migration', '', true);
insert into public.indicateur (libelle, definition, nature, ministere_id, sensible, modele_code)
select 'Essai lot I sensible', 'Sensible d''essai des correctifs du lot I.', 'mois', c.a_m, true, 'essai_lot_i_sens' from ctx c;
update ctx set sens = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_lot_i_sens');
grant select on ctx to authenticated, anon;

-- A envoie le mois dernier : 7, réparti 2, 1 et 4, avec une précision ; A ajoute une
-- suggestion avec son « Pourquoi ».
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.saisir_chiffres_mois((select m1 from ctx), jsonb_build_array(jsonb_build_object(
    'indicateur_id', (select sens from ctx), 'valeur', 7, 'categories', jsonb_build_object('x', 2, 'y', 1, 'z', 4),
    'precision', 'Précision d''essai des correctifs du lot I.')));
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_lot_i_sugg', 'Pourquoi d''essai des correctifs du lot I.');
  perform tests.deconnecter();
end $$;
update ctx set
  p1 = (select p.id from public.precision_sensible p where p.indicateur_id = ctx.sens),
  sugg = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_lot_i_sugg');
update ctx set d1 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.sugg);

select ok((select count(*) from ctx where a is not null and b is not null and berger is not null and conseil is not null
             and admin is not null and tech is not null and social_m is not null and sens is not null
             and sugg is not null and p1 is not null and d1 is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes, la précision et la demande utilisés ici');

-- 1. File de relecture : la précision

select is(tests.lire((select tech from ctx), 'aal2', $$
  select cible, ministere_id, champs, etat, indicateur_libelle, mois from public.v_textes_a_relire
   where cible_id = (select p1 from ctx)
$$), (select jsonb_build_array(jsonb_build_object(
        'cible', 'precision_sensible', 'ministere_id', a_m,
        'champs', jsonb_build_object('texte', 'Précision d''essai des correctifs du lot I.'),
        'etat', 'a_relire', 'indicateur_libelle', 'Essai lot I sensible', 'mois', m1)) from ctx),
  'EJP Tech lit la précision dans sa file : ministère, texte, libellé de l''indicateur et mois, à relire');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select auteur_libelle from public.v_textes_a_relire where cible_id = (select p1 from ctx)
$$), (select jsonb_build_array(jsonb_build_object('auteur_libelle', c.libelle))
        from public.compte c where c.user_id = (select a from ctx)),
  'la précision porte le compte de son auteur');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select array(select jsonb_object_keys(champs)) as cles from public.v_textes_a_relire where cible_id = (select p1 from ctx)
$$), '[{"cles": ["texte"]}]'::jsonb,
  'la file ne porte que le texte de la précision, jamais la valeur du total ni la répartition');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.v_textes_a_relire where cible = 'precision_sensible' and ministere_id = (select social_m from ctx)
$$), 1, 'jeu d''exemple : la précision de Social est à relire');
select ok(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.v_textes_a_relire where cible <> 'precision_sensible'
$$) > 0, 'jeu d''exemple : la file a aussi des textes des étapes 1 à 3');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.v_textes_a_relire
   where cible <> 'precision_sensible' and (indicateur_libelle is not null or mois is not null)
$$), 0, 'les autres cibles n''ont ni libellé d''indicateur ni mois');

select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.v_textes_a_relire where cible = ''precision_sensible'''), 0,
  'file de relecture : le berger n''y lit aucune précision');
select is(tests.compter((select conseil from ctx), 'aal2', 'select 1 from public.v_textes_a_relire where cible = ''precision_sensible'''), 0,
  'file de relecture : le conseil n''y lit aucune précision');
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from public.v_textes_a_relire where cible = ''precision_sensible'''), 0,
  'file de relecture : l''administration n''y lit aucune précision');
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from public.v_textes_a_relire where cible = ''precision_sensible'''), 0,
  'file de relecture : le ministère auteur n''y lit rien');
select is(tests.compter((select tech from ctx), 'aal1', 'select 1 from public.v_textes_a_relire'), 0,
  'file de relecture : EJP Tech en aal1 n''y lit rien');
select is(tests.essai(null, null, 'select 1 from public.v_textes_a_relire', 'lignes'), '42501',
  'file de relecture : l''anonyme est refusé');

-- 2. Relecture : état relu, et lignes de journal (T45)
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.marquer_relu('precision_sensible', (select p1 from ctx));
  perform tests.deconnecter();
end $$;
select is(tests.lire((select tech from ctx), 'aal2', $$
  select etat from public.v_textes_a_relire where cible_id = (select p1 from ctx)
$$), '[{"etat": "relu"}]'::jsonb, 'après la relecture, la précision est « relu » dans la file');
select is(tests.compter((select berger from ctx), 'aal2',
  'select 1 from public.v_journal where action = ''texte_relu'' and cible = ''precision_sensible'' and cible_id = (select p1 from ctx)'), 1,
  'T45 : le berger lit la ligne de relecture de la précision');
select is(tests.compter((select conseil from ctx), 'aal2',
  'select 1 from public.journal where action = ''texte_relu'' and cible = ''precision_sensible'' and cible_id = (select p1 from ctx)'), 1,
  'T45 : le conseil lit la ligne de relecture de la précision');
select is(tests.compter((select admin from ctx), 'aal2',
  'select 1 from public.journal where cible = ''precision_sensible'' and cible_id = (select p1 from ctx)'), 0,
  'l''administration ne lit pas la ligne de relecture d''une précision');

-- 3. P52 : le berger lit la répartition et la précision exactes
select is(tests.lire((select berger from ctx), 'aal2', $$
  select categorie, valeur, moins_de_3, masquee, tout_masque from public.v_ventilation_sensible
   where indicateur_id = (select sens from ctx)
$$), '[{"valeur": 0, "masquee": false, "categorie": null, "moins_de_3": false, "tout_masque": false},
       {"valeur": 1, "masquee": false, "categorie": "y", "moins_de_3": false, "tout_masque": false},
       {"valeur": 2, "masquee": false, "categorie": "x", "moins_de_3": false, "tout_masque": false},
       {"valeur": 4, "masquee": false, "categorie": "z", "moins_de_3": false, "tout_masque": false}]'::jsonb,
  'P52 : le berger lit 2, 1, 4 et 0 (« Non réparti »), sans « moins de 3 » ni masquage');
select is(tests.compter((select b from ctx), 'aal2',
  'select 1 from public.v_ventilation_sensible where indicateur_id = (select sens from ctx)
   union all select 1 from public.v_precision_sensible where indicateur_id = (select sens from ctx)
   union all select 1 from public.v_mesure_periode where indicateur_id = (select sens from ctx)'), 0,
  'un autre ministère ne lit toujours rien du sensible');

-- 4. Q11 : retrait pour confidentialité par EJP Tech
select is(tests.compter((select a from ctx), 'aal2',
  'select 1 from public.categorie_sensible where prevu_code = ''essai_lot_i_sens''
   union all select 1 from public.demande_indicateur where id = (select d1 from ctx)'), 4,
  'avant le retrait, le ministère lit les trois catégories et sa demande');
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.retirer_indicateur((select sens from ctx), 'confidentialite');
  perform public.retirer_indicateur((select sugg from ctx), 'confidentialite');
  perform tests.deconnecter();
end $$;
select is(tests.compter(p.compte, 'aal2',
  'select 1 from public.categorie_sensible where prevu_code = ''essai_lot_i_sens''
   union all select 1 from public.demande_indicateur where id = (select d1 from ctx)'), 0,
  format('Q11 : après le retrait pour confidentialité, %s ne lit ni les catégories ni la demande', p.profil))
  from (select 1 as rang, 'le ministère' as profil, c.a as compte from ctx c
        union all select 2, 'EJP Tech', c.tech from ctx c
        union all select 3, 'le berger', c.berger from ctx c) as p
 order by p.rang;
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.v_textes_a_relire where cible_id = (select p1 from ctx)'), 0,
  'Q11 : la précision d''un indicateur retiré pour confidentialité sort de la file de relecture');

select * from finish();
rollback;
