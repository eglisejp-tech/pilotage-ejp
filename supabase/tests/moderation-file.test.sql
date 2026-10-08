-- File de modération de l'écran 15 (lot L6 ; plan des étapes 5 à 8, section 3.2 ; BRIEF, section 9,
-- « Modération », et section 7, « Matrice des droits »). Aucune migration dans ce lot : la file
-- (private.textes_a_relire, 20261009120000_lot_i_correctifs.sql) porte déjà la précision des
-- chiffres sensibles, et masquer_texte (20261009110000_signalements.sql) masque déjà les deux
-- textes d'un signalement. Ce fichier contrôle ce que l'écran lit et appelle.
--
-- 1. Structure : la file n'a que onze colonnes, sans aucune valeur chiffrée ; une précision y
--    porte son texte seul, avec le libellé de l'indicateur et le mois ; un signalement n'y est pas.
-- 2. Matrice (tests.verifier_matrice) : seul EJP Tech, en aal2, lit la file et appelle
--    marquer_relu et masquer_texte ; ni le ministère auteur, ni un autre ministère, ni le berger,
--    ni le conseil, ni l'administration, ni l'anonyme ; en aal1, tout est vide ou refusé ; aucun
--    ajout direct dans moderation.
-- 3. Parcours d'EJP Tech : relire un point (une seule fois), masquer le titre puis la description
--    d'un autre point, masquer le texte d'un signalement ; la file, la fiche, le journal (champ et
--    motif, jamais le texte) et ce que lit l'auteur suivent.
begin;

-- Contexte : deux ministères d'essai avec leur compte, les comptes du jeu d'exemple, deux points
-- et un signalement du ministère A, et une précision du jeu d'exemple (seed/44).
create temp table ctx as
select tests.creer_ministere('Modération L6 A') as a_m,
       tests.creer_ministere('Modération L6 B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid, add column p1 uuid, add column p2 uuid,
  add column s uuid, add column prec uuid;
update ctx set a = tests.creer_compte('moderation-l6-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('moderation-l6-b@exemple.test', 'ministere', b_m),
               prec = (select p.id from public.precision_sensible p order by p.saisi_le, p.id limit 1);
grant select on ctx to authenticated, anon;

do $$
declare
  v_ctx ctx%rowtype;
  v_p1 uuid;
  v_p2 uuid;
  v_s uuid;
begin
  select * into v_ctx from ctx;
  perform tests.se_connecter(v_ctx.a, 'aal2');
  v_p1 := public.creer_point('Titre relu du lot L6', 'Description relue du lot L6.', null, 'normale', null, array[]::uuid[]);
  v_p2 := public.creer_point('Titre masque du lot L6', 'Description masquee du lot L6.', null, 'normale', null, array[]::uuid[]);
  v_s := public.signaler_difficulte('autre', 'Signalement du lot L6 a masquer.');
  perform tests.deconnecter();
  update ctx set p1 = v_p1, p2 = v_p2, s = v_s;
end $$;

-- Matrice en aal2. Attendus dans l'ordre des profils : ministère A (auteur), ministère B, berger,
-- conseil, administration, EJP Tech.
create temp view matrice_l6_aal2 (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère a'), (2, 'ministère b'), (3, 'berger'), (4, 'conseil'),
                 (5, 'administration'), (6, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('v_textes_a_relire', 'lire', array['0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_textes_a_relire where cible_id = (select p1 from ctx)'),
     ('v_textes_a_relire', 'lire', array['0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_textes_a_relire where cible_id = (select prec from ctx)'),
     ('v_textes_a_relire', 'lire', array['0', '0', '0', '0', '0', '0'],
      'select 1 from public.v_textes_a_relire where cible_id = (select s from ctx)'),
     ('moderation', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.moderation (cible, cible_id, champ, decision, motif, par) select ''point_attention'', p1, null, ''rien_a_signaler'', null, tech from ctx'),
     ('marquer_relu', 'appeler', array['42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.marquer_relu(''point_attention'', (select p1 from ctx))'),
     ('masquer_texte', 'appeler', array['42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''point_attention'', (select p2 from ctx), ''titre'', ''autre'')'),
     ('masquer_texte', 'appeler', array['42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''signalement'', (select s from ctx), ''texte'', ''autre'')')
   ) as m(objet, action, attendu, requete);
create temp view matrice_l6 (profil, objet, action, aal, attendu, requete) as
  select * from matrice_l6_aal2
  union all
  -- Écriture directe en aal1 : refusée par les GRANT, pour chaque profil.
  select m.profil, m.objet, m.action, 'aal1', '42501', m.requete
    from matrice_l6_aal2 m
   where m.action = 'ajouter';
create temp view profil_l6 (profil, compte) as
  select 'ministère a', c.a from ctx c union all select 'ministère b', c.b from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_l6_aal2, matrice_l6, profil_l6 to authenticated, anon;

select plan(22
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_l6',
                        'select profil, compte from profil_l6', true));

select ok((select count(*) from ctx where a is not null and b is not null and berger is not null
             and conseil is not null and admin is not null and tech is not null and p1 is not null
             and p2 is not null and s is not null and prec is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes, les deux points, le signalement et une précision');

-- 1. Structure : onze colonnes, aucune valeur chiffrée
select set_eq($$
  select a.attname::text from pg_catalog.pg_attribute a
   where a.attrelid = 'public.v_textes_a_relire'::regclass and a.attnum > 0 and not a.attisdropped
$$, $$ values ('cible'), ('cible_id'), ('ministere_id'), ('auteur_libelle'), ('ecrit_le'), ('champs'),
              ('etat'), ('decision_le'), ('motif'), ('indicateur_libelle'), ('mois') $$,
  'la file n''a que ses onze colonnes : aucune valeur, aucun total, aucune répartition, aucune priorité');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select array(select jsonb_object_keys(champs)) as cles from public.v_textes_a_relire
   where cible_id = (select prec from ctx)
$$), '[{"cles": ["texte"]}]'::jsonb,
  'une précision n''apporte que son texte dans les champs de la file');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.v_textes_a_relire x
   where x.cible = 'precision_sensible' and x.cible_id = (select prec from ctx)
     and x.indicateur_libelle is not null and x.mois is not null
$$), 1, 'une précision dit le libellé de l''indicateur et le mois');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.v_textes_a_relire x
   where to_jsonb(x) ?| array['valeur', 'total', 'categories', 'repartition', 'nb_saisis', 'priorite', 'statut']
$$), 0, 'aucune ligne de la file ne porte une clé de valeur, de priorité ou de statut');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select cible, ministere_id, champs, etat from public.v_textes_a_relire where cible_id = (select p1 from ctx)
$$), (select jsonb_build_array(jsonb_build_object(
        'cible', 'point_attention', 'ministere_id', a_m,
        'champs', jsonb_build_object('titre', 'Titre relu du lot L6', 'description', 'Description relue du lot L6.'),
        'etat', 'a_relire')) from ctx),
  'un point écrit par A est à relire : son ministère, son titre et sa description');
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.v_textes_a_relire where cible not in (''point_attention'', ''point_suivi'', ''evenement'', ''reunion'', ''precision_sensible'')'),
  0, 'la file ne porte que les cinq cibles prévues : un signalement a son bloc, pas la file');

-- 2. Matrice
select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_l6',
  'select profil, compte from profil_l6',
  true);

-- 3. Parcours d'EJP Tech
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.marquer_relu('point_attention', (select p1 from ctx)) $$,
  'EJP Tech marque le premier point comme relu');
select throws_ok($$ select public.marquer_relu('point_attention', (select p1 from ctx)) $$,
  'P0001', 'Ce texte a déjà été relu.', 'une seconde relecture du même texte est refusée');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'titre', 'gene') $$,
  'P0001', 'Choisissez un motif dans la liste.', 'un motif hors de la liste est refusé');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'priorite', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'un champ hors de la liste est refusé');
select lives_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'titre', 'nom_personne') $$,
  'EJP Tech masque le titre du second point');
select throws_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'titre', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'un champ déjà masqué ne se masque pas deux fois');
select lives_ok($$ select public.masquer_texte('point_attention', (select p2 from ctx), 'description', 'coordonnees') $$,
  'après le titre, EJP Tech masque aussi la description du même point');
select lives_ok($$ select public.masquer_texte('signalement', (select s from ctx), 'texte', 'autre') $$,
  'EJP Tech masque le texte du signalement');
select tests.deconnecter();

select is(tests.lire((select tech from ctx), 'aal2', $$
  select etat, decision_le is not null as decide, motif from public.v_textes_a_relire where cible_id = (select p1 from ctx)
$$), '[{"etat": "relu", "motif": null, "decide": true}]'::jsonb,
  'la file dit « relu » pour le premier point, sans motif');
select is(tests.lire((select tech from ctx), 'aal2', $$
  select etat, motif, champs from public.v_textes_a_relire where cible_id = (select p2 from ctx)
$$), '[{"etat": "masque", "motif": "coordonnees", "champs": {"titre": "[texte masqué par EJP Tech]",
         "description": "[texte masqué par EJP Tech]"}}]'::jsonb,
  'la file dit « masqué » pour le second point, avec le dernier motif, les deux champs remplacés');
select is(tests.lire((select berger from ctx), 'aal2',
  'select titre, description from public.v_point where id = (select p2 from ctx)'),
  '[{"titre": "[texte masqué par EJP Tech]", "description": "[texte masqué par EJP Tech]"}]'::jsonb,
  'le berger lit le point avec le texte masqué à la place des deux champs');
select is(tests.lire((select a from ctx), 'aal2',
  'select texte from public.v_signalement where id = (select s from ctx)'),
  '[{"texte": "[texte masqué par EJP Tech]"}]'::jsonb,
  'le ministère auteur lit son signalement avec le texte masqué');
select is(tests.compter((select tech from ctx), 'aal2',
  'select 1 from public.journal where action = ''texte_masque'' and cible = ''point_attention'' and cible_id = (select p2 from ctx)'),
  2, 'une ligne de journal par champ masqué');
select is(tests.lire((select tech from ctx), 'aal2',
  'select detail from public.journal where action = ''texte_masque'' and cible = ''signalement'' and cible_id = (select s from ctx)'),
  '[{"detail": {"champ": "texte", "motif": "autre"}}]'::jsonb,
  'le journal du masquage d''un signalement dit le champ et le motif, jamais le texte');
select is(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.journal
   where action in ('texte_relu', 'texte_masque')
     and cible_id in (select p1 from ctx union all select p2 from ctx union all select s from ctx)
     and (detail::text ilike '%lot L6%' or detail::text ilike '%Titre masque%'
          or detail::text ilike '%Titre relu%' or detail::text ilike '%Signalement du%')
$$), 0, 'aucune ligne de journal de ces décisions ne recopie un texte libre');

select * from finish();
rollback;
