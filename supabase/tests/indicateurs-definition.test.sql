-- Définition des indicateurs (étape 4, lot B1 ; docs/plan-etape-4.md, section 4, « B1 » ;
-- configuration-indicateurs.md 5.2 et 5.4 ; vague-1-decisions.md X3, X7 et X8) : structure,
-- sens figé même pour le propriétaire, aucune suppression, libellé normalisé unique et
-- remplacement sous le même nom, actif lié à l'état, drapeaux, termes des calculs écrits à la
-- création puis figés (les formes des calculs étendus comprises), ministère Coordination, et
-- lignes de la matrice des droits pour indicateur, indicateur_terme et l'ajout dans mesure
-- (cinq profils, ministères porteur, autre, fij et coordination, aal1 et anonyme).
begin;

select plan(263);

-- Contexte : comptes du jeu d'exemple ; indicateurs d'essai de Communication (le ministère
-- porteur), écrits comme le ferait une fonction de configuration.
create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.ministere('Jeunesse') as jeu_m,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (select i.id from public.indicateur i where i.code = 'service') as service;

insert into public.indicateur (libelle, definition, nature, ministere_id)
select x.libelle, x.definition, x.nature, c.com_m
from ctx c
cross join (values
    ('Essai déf. publications', 'Publications parues sur les réseaux, comptées une fois.', 'mois'),
    ('Essai déf. demandes', 'Demandes de visuels reçues des ministères.', 'mois'),
    ('Essai t. ventes', 'Ventes d''essai pour les termes des calculs.', 'mois'),
    ('Essai t. coûts', 'Coûts d''essai pour les termes des calculs.', 'mois'),
    ('Essai t. troisième', 'Troisième source d''essai des calculs.', 'mois'),
    ('Essai t. quatrième', 'Quatrième source d''essai des calculs.', 'mois'),
    ('Essai t. cinquième', 'Cinquième source d''essai des calculs.', 'mois'),
    ('Essai t. arrivants', 'Arrivants d''essai, chaque dimanche.', 'dimanche'),
    ('Essai t. stock', 'Stock d''essai relevé à ce jour.', 'a_ce_jour')
  ) as x(libelle, definition, nature);
insert into public.indicateur (libelle, definition, nature, ministere_id, sensible)
select 'Essai t. sensible', 'Indicateur sensible d''essai des calculs.', 'mois', c.com_m, true from ctx c;
insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai t. Jeunesse', 'Source d''essai d''un autre ministère.', 'mois', c.jeu_m from ctx c;
-- Un ajout à valider et un indicateur retiré de Communication : la lecture les compte (Q3 : le
-- porteur lit tous les états, le berger, le conseil, l'administration et EJP Tech aussi).
insert into public.indicateur (libelle, definition, nature, ministere_id, origine, etat)
select 'Essai déf. attente lecture', 'Ajout d''un ministère, en attente de validation.', 'mois', c.com_m, 'ministere', 'en_attente'
  from ctx c;
insert into public.indicateur (libelle, definition, nature, ministere_id)
select 'Essai déf. retiré lecture', 'Indicateur d''essai retiré avant la lecture.', 'mois', c.com_m from ctx c;
update public.indicateur set etat = 'retire', retrait_motif = 'erreur' where libelle = 'Essai déf. retiré lecture';

alter table ctx add column pub uuid, add column dem uuid, add column taux uuid, add column s1 uuid, add column s2 uuid,
  add column s3 uuid, add column s4 uuid, add column s5 uuid, add column s_dim uuid, add column s_jour uuid,
  add column s_sens uuid, add column s_jeu uuid, add column coo_m uuid, add column att uuid, add column ret uuid;
update ctx set pub = (select i.id from public.indicateur i where i.libelle = 'Essai déf. publications'),
               dem = (select i.id from public.indicateur i where i.libelle = 'Essai déf. demandes'),
               s1 = (select i.id from public.indicateur i where i.libelle = 'Essai t. ventes'),
               s2 = (select i.id from public.indicateur i where i.libelle = 'Essai t. coûts'),
               s3 = (select i.id from public.indicateur i where i.libelle = 'Essai t. troisième'),
               s4 = (select i.id from public.indicateur i where i.libelle = 'Essai t. quatrième'),
               s5 = (select i.id from public.indicateur i where i.libelle = 'Essai t. cinquième'),
               s_dim = (select i.id from public.indicateur i where i.libelle = 'Essai t. arrivants'),
               s_jour = (select i.id from public.indicateur i where i.libelle = 'Essai t. stock'),
               s_sens = (select i.id from public.indicateur i where i.libelle = 'Essai t. sensible'),
               s_jeu = (select i.id from public.indicateur i where i.libelle = 'Essai t. Jeunesse'),
               coo_m = (select m.id from public.ministere m where m.code = 'coordination'),
               att = (select i.id from public.indicateur i where i.libelle = 'Essai déf. attente lecture'),
               ret = (select i.id from public.indicateur i where i.libelle = 'Essai déf. retiré lecture');

-- Un calcul et ses termes, écrits ensemble ; le contrôle différé des termes complets est
-- déclenché tout de suite (set constraints), puis remis en différé.
create function pg_temp.calcul(p_libelle text, p_calcul text, p_nature text, p_termes jsonb,
  p_ministere uuid default null) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.indicateur (libelle, definition, nature, ministere_id, calcul)
  values (p_libelle, 'Calcul d''essai des termes.', p_nature, coalesce(p_ministere, (select com_m from ctx)), p_calcul)
  returning id into v_id;
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id, comptage, agregat, decalage)
  select v_id, coalesce((x.t ->> 'ordre')::smallint, x.n::smallint), x.t ->> 'role', (x.t ->> 'source')::uuid,
         x.t ->> 'comptage', coalesce(x.t ->> 'agregat', 'periode'), coalesce((x.t ->> 'decalage')::smallint, 0)
    from jsonb_array_elements(p_termes) with ordinality as x(t, n);
  set constraints all immediate;
  set constraints all deferred;
  return v_id;
end $$;

-- Un terme : rôle, et source ou comptage.
create function pg_temp.t(p_role text, p_source uuid, p_agregat text default 'periode', p_decalage integer default 0)
returns jsonb language sql as $$
  select jsonb_build_object('role', p_role, 'source', p_source, 'agregat', p_agregat, 'decalage', p_decalage)
$$;
create function pg_temp.c(p_role text, p_comptage text) returns jsonb language sql as $$
  select jsonb_build_object('role', p_role, 'comptage', p_comptage)
$$;

update ctx set taux = pg_temp.calcul('Essai déf. taux', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select pub from ctx)), pg_temp.t('bas', (select dem from ctx))));

grant select on ctx to authenticated, anon;

select ok((select count(*) from ctx
            where com is not null and jeu is not null and fij is not null and coo is not null and berger is not null
              and conseil is not null and admin is not null and tech is not null and service is not null
              and pub is not null and dem is not null and taux is not null and s_sens is not null and s_jeu is not null
              and coo_m is not null and att is not null and ret is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes, les indicateurs et le calcul utilisés ici');

-- Structure
select is_empty($$
  select c.nom from unnest(array['definition', 'unite', 'sensible', 'calcul', 'etat', 'origine', 'modele_code',
    'remplace_id', 'cree_le', 'cree_par', 'texte_le', 'texte_par', 'retire_le', 'retrait_motif', 'sans_somme',
    'saisi_dimanche_matin', 'libelle_sessions']) as c(nom)
  except
  select a.attname::text from pg_attribute a where a.attrelid = 'public.indicateur'::regclass and not a.attisdropped
$$, 'indicateur porte les 17 colonnes de l''étape 4');
select is_empty($$
  select c.nom from unnest(array['haut_id', 'bas_id']) as c(nom)
  intersect
  select a.attname::text from pg_attribute a where a.attrelid = 'public.indicateur'::regclass and not a.attisdropped
$$, 'pas de colonnes haut_id ni bas_id : les termes vivent dans indicateur_terme');
select columns_are('public', 'indicateur_terme',
  array['calcul_id', 'ordre', 'role', 'source_id', 'comptage', 'agregat', 'decalage'],
  'indicateur_terme : calcul, ordre, rôle, source ou comptage, agrégat, décalage');
select col_is_pk('public', 'indicateur_terme', array['calcul_id', 'ordre'], 'clé de indicateur_terme : (calcul_id, ordre)');
select has_index('public', 'indicateur', 'indicateur_libelle_normalise', 'index unique du libellé normalisé hors retirés');
select results_eq($$ select code, origine, definition from public.indicateur where ministere_id is null order by ordre $$,
  $$ values ('service', 'commun', 'Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n''a servi, enregistrez 0.'),
            ('actifs', 'commun', 'Comptez chaque STAR dans un seul ministère : son ministère principal.'),
            ('en_fij', 'commun', 'Parmi ces STARs actifs, ceux qui participent à une FIJ.') $$,
  'les trois communs ont leur origine et leur définition (textes de la saisie du dimanche)');
select results_eq($$ select nature, unite, etat, origine, sensible, actif from public.indicateur where libelle = 'Visuels livrés ce mois' $$,
  $$ values ('a_ce_jour', 'nombre', 'actif', 'eglise', false, true) $$,
  'jeu d''exemple : « Visuels livrés ce mois » garde son libellé de l''étape 1, avec sa définition');
select results_eq($$ select nom from public.ministere where code = 'coordination' $$, $$ values ('Coordination') $$,
  'le ministère Coordination porte le code coordination (X7)');
select results_eq($$
  select count(*)::int, bool_and(j.compte is null) from public.journal j
   where j.action = 'ministere_cree' and j.cible_id = (select coo_m from ctx)
$$, $$ values (1, true) $$, 'Coordination : une ligne ministere_cree, au nom de « Système » (migration), comme FIJ');
select is(private.normaliser('Nombre de projets en cours'), private.normaliser('Projets en cours'),
  'normaliser : « Nombre de projets en cours » et « Projets en cours » se confondent');
select is(private.normaliser('  Œuvres  SOCIALES, été !'), 'oeuvres sociales ete',
  'normaliser : accents, majuscules, signes et espaces');
select is(private.mois_courant(), date_trunc('month', private.aujourdhui())::date,
  'mois_courant : le 1er du mois de private.aujourdhui() (heure de Paris)');
select is(tests.lire((select com from ctx), 'aal2', 'select private.mois_courant() as m'),
  jsonb_build_array(jsonb_build_object('m', private.mois_courant())),
  'mois_courant est lisible par un compte connecté (vues des lots suivants)');

-- Matrice des droits (docs/plan-etape-4.md, section 4) : lignes de B1.
select * from tests.verifier_matrice(
  $$
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère porteur'), (2, 'ministère autre'), (3, 'ministère fij'),
                 (4, 'ministère coordination'), (5, 'berger'), (6, 'conseil'), (7, 'administration'),
                 (8, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('indicateur', 'lire', array['6', '1', '1', '1', '6', '6', '6', '6'],
      'select 1 from public.indicateur i where i.id in (select c.service from ctx c union all select c.pub from ctx c union all select c.dem from ctx c union all select c.taux from ctx c union all select c.att from ctx c union all select c.ret from ctx c)'),
     ('indicateur_terme', 'lire', array['2', '0', '0', '0', '2', '2', '2', '2'],
      'select 1 from public.indicateur_terme t where t.calcul_id = (select taux from ctx)'),
     ('indicateur', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.indicateur (libelle, definition, nature, ministere_id) select ''Essai direct'', ''Ajout direct d''''essai.'', ''mois'', com_m from ctx'),
     ('indicateur', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.indicateur set libelle = libelle where id = (select pub from ctx)'),
     ('indicateur', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.indicateur where id = (select pub from ctx)'),
     ('indicateur_terme', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.indicateur_terme (calcul_id, ordre, role, source_id) select taux, 3, ''bas'', s1 from ctx'),
     ('indicateur_terme', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.indicateur_terme set decalage = 1 where calcul_id = (select taux from ctx)'),
     ('indicateur_terme', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.indicateur_terme where calcul_id = (select taux from ctx)'),
     ('mesure (indicateur propre)', 'ajouter', array['ok', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) select pub, com_m, (private.mois_courant() - interval ''1 month'')::date, 5 from ctx')
   ) as m(objet, action, attendu, requete)
  union all
  select 'ministère porteur', 'mesure (calcul)', 'ajouter', 'aal2', 'P0001',
         'insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) select taux, com_m, (private.mois_courant() - interval ''1 month'')::date, 5 from ctx'
  $$,
  $$
  select 'ministère porteur', c.com from ctx c union all select 'ministère autre', c.jeu from ctx c
  union all select 'ministère fij', c.fij from ctx c union all select 'ministère coordination', c.coo from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c
  $$,
  true);

-- Sens figé, même pour le propriétaire des tables (les migrations et les fonctions de
-- configuration écrivent en son nom).
select throws_ok($$ update public.indicateur set nature = 'dimanche' where id = (select dem from ctx) $$,
  '42501', 'Le sens d''un indicateur est figé : remplacez-le pour en changer.', 'rythme figé');
select throws_ok($$ update public.indicateur set unite = 'grand_nombre' where id = (select dem from ctx) $$,
  '42501', null, 'unité figée');
select throws_ok($$ update public.indicateur set ministere_id = (select jeu_m from ctx) where id = (select dem from ctx) $$,
  '42501', null, 'ministère figé');
select throws_ok($$ update public.indicateur set sensible = true where id = (select dem from ctx) $$,
  '42501', null, 'case sensible figée');
select throws_ok($$ update public.indicateur set calcul = 'moyenne' where id = (select taux from ctx) $$,
  '42501', null, 'sorte de calcul figée');
select throws_ok($$ update public.indicateur set modele_code = 'essai' where id = (select dem from ctx) $$,
  '42501', null, 'modèle figé');
select throws_ok($$ update public.indicateur set remplace_id = (select pub from ctx) where id = (select dem from ctx) $$,
  '42501', null, 'remplacement figé');
select throws_ok($$ update public.indicateur set cree_le = now() - interval '1 day' where id = (select dem from ctx) $$,
  '42501', null, 'date de création figée');
select throws_ok($$ update public.indicateur set sans_somme = true where id = (select dem from ctx) $$,
  '42501', null, 'drapeau sans_somme fixé à la création');
select throws_ok($$ update public.indicateur set saisi_dimanche_matin = true where id = (select s_dim from ctx) $$,
  '42501', null, 'drapeau saisi_dimanche_matin fixé à la création');
select throws_ok($$ update public.indicateur set libelle_sessions = true where id = (select s_dim from ctx) $$,
  '42501', null, 'drapeau libelle_sessions fixé à la création');
select throws_ok($$ update public.indicateur set code = 'essai' where id = (select service from ctx) $$,
  '42501', null, 'code d''un commun figé');
select throws_ok($$ delete from public.indicateur where id = (select dem from ctx) $$,
  '42501', 'Un indicateur ne se supprime pas : il se retire.', 'aucune suppression, même pour le propriétaire');
select throws_ok($$ delete from public.indicateur where id = (select service from ctx) $$,
  '42501', 'Un indicateur ne se supprime pas : il se retire.', 'aucune suppression d''un commun');

-- Textes : corrigés tant que rien n'est saisi, figés ensuite ; communs par une migration.
select lives_ok($$
  update public.indicateur set libelle = 'Essai déf. demandes reçues', definition = 'Demandes de visuels reçues, une par demande.'
   where id = (select dem from ctx)
$$, 'libellé et définition se corrigent tant que rien n''est saisi');
select results_eq($$ select libelle from public.indicateur where id = (select dem from ctx) $$,
  $$ values ('Essai déf. demandes reçues') $$, 'le libellé corrigé est enregistré');
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_par)
select c.pub, c.com_m, (private.mois_courant() - interval '1 month')::date, 7, c.com from ctx c;
select throws_ok($$ update public.indicateur set libelle = 'Essai déf. publications parues' where id = (select pub from ctx) $$,
  'P0001', 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.',
  'libellé figé dès la première valeur saisie');
select throws_ok($$ update public.indicateur set definition = 'Une autre définition des publications.' where id = (select pub from ctx) $$,
  'P0001', 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.',
  'définition figée dès la première valeur saisie');
select throws_ok($$ update public.indicateur set definition = 'Une autre définition du taux d''essai.' where id = (select taux from ctx) $$,
  'P0001', 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.',
  'calcul : texte figé dès la première valeur d''une source');
select throws_ok($$ update public.indicateur set libelle = 'STARs servant' where id = (select service from ctx) $$,
  '42501', 'Un chiffre commun ne change que par une migration.', 'le texte d''un commun ne change pas hors migration');
select set_config('pilotage.migration', 'oui', true);
select lives_ok($$
  update public.indicateur set definition = 'Les STARs qui ont servi ce dimanche dans votre ministère.' where id = (select service from ctx)
$$, 'une migration change la définition d''un commun');
select set_config('pilotage.migration', '', true);

-- Libellés et définitions : longueurs ; « NA » et l'ancien « Visuels livrés ce mois » passent.
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id) select 'N', 'Définition d''essai.', 'mois', com_m from ctx
$$, 'P0001', 'Donnez un libellé de 2 à 60 caractères.', 'libellé d''un caractère refusé');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id) select repeat('x', 61), 'Définition d''essai.', 'mois', com_m from ctx
$$, 'P0001', 'Donnez un libellé de 2 à 60 caractères.', 'libellé de 61 caractères refusé');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id) select 'Essai déf. court', '  Trop bref  ', 'mois', com_m from ctx
$$, 'P0001', 'Expliquez ce qu''on compte en 10 à 140 caractères.', 'définition de 9 caractères après les espaces refusée');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id) select 'Essai déf. long', repeat('x', 141), 'mois', com_m from ctx
$$, 'P0001', 'Expliquez ce qu''on compte en 10 à 140 caractères.', 'définition de 141 caractères refusée');
select lives_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id)
  select '  NA ', 'Nouveaux arrivants accueillis ce dimanche.', 'dimanche', com_m from ctx
$$, '« NA » passe le trigger (il ne contrôle que la structure)');
select results_eq($$ select libelle from public.indicateur where ministere_id = (select com_m from ctx) and libelle = 'NA' $$,
  $$ values ('NA') $$, 'les espaces de bord sont retirés du libellé');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, etat, retire_le, retrait_motif)
  select 'Essai déf. retiré', 'Indicateur d''essai déjà retiré.', 'mois', com_m, 'retire', now(), 'erreur' from ctx
$$, 'P0001', 'Un indicateur naît actif ou à valider.', 'un indicateur ne naît pas retiré');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id)
  select '[retiré pour confidentialité]', 'Indicateur d''essai masqué.', 'mois', com_m from ctx
$$, 'P0001', 'Ce texte est réservé au retrait pour confidentialité.', 'le texte du masquage est refusé à l''ajout');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id) select 'Essai déf. nature', 'Nature d''essai inconnue.', 'jour', com_m from ctx
$$, '23514', null, 'nature hors liste refusée (pas de nature « jour »)');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, unite)
  select 'Essai déf. minutes', 'Unité d''essai inconnue.', 'dimanche', com_m, 'minutes' from ctx
$$, '23514', null, 'unité hors liste refusée (pas d''unité « minutes »)');
select throws_ok($$
  insert into public.indicateur (code, libelle, definition, nature, origine)
  values ('essai_commun', 'Essai commun créé', 'Un commun ne se crée pas hors migration.', 'dimanche', 'commun')
$$, '42501', 'Un chiffre commun ne change que par une migration.', 'un chiffre commun ne se crée que par une migration');
select set_config('pilotage.migration', 'oui', true);
select throws_ok($$
  insert into public.indicateur (code, libelle, definition, nature, origine) values ('essai', 'Essai commun', 'Commun d''essai.', 'mois', 'eglise')
$$, '23514', null, 'origine « commun » si et seulement si le ministère est nul');
select throws_ok($$
  insert into public.indicateur (code, libelle, definition, nature, origine)
  select 'essai_doublon', i.libelle, 'Doublon d''essai d''un chiffre commun.', 'dimanche', 'commun'
    from public.indicateur i where i.code = 'service'
$$, '23505', null, 'deux chiffres communs ne portent pas le même libellé (les NULL ne sont pas distincts)');
select set_config('pilotage.migration', '', true);

-- Libellé normalisé unique sur une fiche, hors retirés ; remplacement sous le même nom.
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id)
  select 'Nombre d''essai déf. publications !', 'Doublon d''essai des publications.', 'mois', com_m from ctx
$$, '23505', null, 'doublon normalisé refusé sur la même fiche');
select lives_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id)
  select 'Essai déf. publications', 'Les publications d''un autre ministère.', 'mois', jeu_m from ctx
$$, 'le même libellé est permis sur une autre fiche');
select lives_ok($$
  update public.indicateur set etat = 'retire', retrait_motif = 'remplace' where id = (select pub from ctx)
$$, 'l''indicateur remplacé est retiré (motif « remplacé »)');
select lives_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai déf. publications', 'Publications parues, comptées une fois par réseau.', 'mois', com_m, pub from ctx
$$, 'le remplaçant garde le même nom');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai déf. second remplaçant', 'Second remplaçant d''essai.', 'mois', com_m, pub from ctx
$$, '23505', null, 'un indicateur n''a qu''un remplaçant');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai déf. commun', 'Remplaçant d''un commun.', 'dimanche', com_m, service from ctx
$$, '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un commun ne se remplace pas');
-- Le remplacé est retiré (motif « remplace ») à la fin de la transaction, dans l'ordre qu'on veut.
create function pg_temp.remplacement_sans_retrait() returns void language plpgsql as $$
begin
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai déf. remplaçant sans retrait', 'Remplaçant d''essai dont l''ancien reste actif.', 'mois', com_m, dem from ctx;
  set constraints all immediate;
  set constraints all deferred;
end $$;
select throws_ok($$ select pg_temp.remplacement_sans_retrait() $$,
  'P0001', 'L''indicateur remplacé est retiré avec le motif « remplacé ».',
  'un remplaçant ne coexiste pas avec l''indicateur encore actif qu''il remplace');
create function pg_temp.remplacement_ordre_libre() returns void language plpgsql as $$
declare
  v_ancien uuid;
begin
  insert into public.indicateur (libelle, definition, nature, ministere_id)
  select 'Essai déf. à remplacer', 'Indicateur d''essai à remplacer.', 'mois', com_m from ctx returning id into v_ancien;
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai déf. remplaçant libre', 'Remplaçant d''essai ajouté avant le retrait.', 'mois', com_m, v_ancien from ctx;
  update public.indicateur set etat = 'retire', retrait_motif = 'remplace' where id = v_ancien;
  set constraints all immediate;
  set constraints all deferred;
end $$;
select lives_ok($$ select pg_temp.remplacement_ordre_libre() $$,
  'le retrait de l''ancien peut suivre l''ajout du remplaçant dans la même transaction');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, remplace_id)
  select 'Essai déf. autre fiche', 'Remplaçant pris sur une autre fiche.', 'mois', jeu_m, dem from ctx
$$, '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'on ne remplace pas l''indicateur d''une autre fiche');

-- État : actif suit l'état ; transitions permises ; un retiré ne change plus.
select lives_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, origine, etat)
  select 'Essai déf. à valider', 'Ajout d''un ministère, à valider.', 'mois', com_m, 'ministere', 'en_attente' from ctx
$$, 'un ajout d''un ministère naît à valider');
select results_eq($$ select etat, actif from public.indicateur where libelle = 'Essai déf. à valider' $$,
  $$ values ('en_attente', false) $$, 'à valider : actif vaut faux, imposé par la base');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, etat)
  select 'Essai déf. attente église', 'Seul un ajout de ministère attend.', 'mois', com_m, 'en_attente' from ctx
$$, '23514', null, 'seul un ajout d''un ministère est à valider');
select throws_ok($$ update public.indicateur set actif = true where libelle = 'Essai déf. à valider' $$,
  '42501', 'L''état d''un indicateur change seulement par un retrait ou une validation.', 'actif ne se change pas seul');
select lives_ok($$ update public.indicateur set etat = 'actif' where libelle = 'Essai déf. à valider' $$,
  'à valider vers actif (validé)');
select results_eq($$ select etat, actif from public.indicateur where libelle = 'Essai déf. à valider' $$,
  $$ values ('actif', true) $$, 'validé : actif suit l''état');
select throws_ok($$ update public.indicateur set etat = 'en_attente' where libelle = 'Essai déf. à valider' $$,
  '42501', 'Ce changement d''état n''est pas permis.', 'actif ne repasse pas à valider');
select throws_ok($$ update public.indicateur set etat = 'retire' where libelle = 'Essai déf. à valider' $$,
  'P0001', 'Choisissez le motif du retrait.', 'un retrait demande un motif');
select throws_ok($$ update public.indicateur set etat = 'retire', retrait_motif = 'autre' where libelle = 'Essai déf. à valider' $$,
  '23514', null, 'motif hors liste refusé');
select lives_ok($$ update public.indicateur set etat = 'retire', retrait_motif = 'plus_suivi' where libelle = 'Essai déf. à valider' $$,
  'actif vers retiré, avec un motif');
select results_eq($$ select actif, retire_le is not null from public.indicateur where libelle = 'Essai déf. à valider' $$,
  $$ values (false, true) $$, 'retiré : actif faux, date de retrait posée');
select throws_ok($$ update public.indicateur set etat = 'actif', retire_le = null, retrait_motif = null where libelle = 'Essai déf. à valider' $$,
  '42501', 'Un indicateur retiré ne change plus.', 'aucune réactivation');
select throws_ok($$ update public.indicateur set definition = 'Une définition changée après retrait.' where libelle = 'Essai déf. à valider' $$,
  '42501', 'Un indicateur retiré ne change plus.', 'un retiré ne change plus de texte');

-- Retrait pour confidentialité : les deux textes masqués dans la même mise à jour, seulement
-- sous pilotage.masquage.
select throws_ok($$
  update public.indicateur set libelle = '[retiré pour confidentialité]', definition = '[retiré pour confidentialité]',
         etat = 'retire', retrait_motif = 'confidentialite'
   where id = (select s5 from ctx)
$$, 'P0001', 'Ce texte est réservé au retrait pour confidentialité.', 'masquage refusé sans le réglage du retrait');
select set_config('pilotage.masquage', 'oui', true);
select throws_ok($$
  update public.indicateur set libelle = '[retiré pour confidentialité]', definition = '[retiré pour confidentialité]'
   where id = (select s5 from ctx)
$$, 'P0001', 'Ce texte est réservé au retrait pour confidentialité.', 'textes masqués sans retrait refusés');
select lives_ok($$
  update public.indicateur set libelle = '[retiré pour confidentialité]', definition = '[retiré pour confidentialité]',
         etat = 'retire', retrait_motif = 'confidentialite'
   where id = (select s5 from ctx)
$$, 'retrait pour confidentialité : textes masqués et retrait dans la même mise à jour');
select set_config('pilotage.masquage', '', true);
select results_eq($$ select libelle, definition, etat, retrait_motif from public.indicateur where id = (select s5 from ctx) $$,
  $$ values ('[retiré pour confidentialité]', '[retiré pour confidentialité]', 'retire', 'confidentialite') $$,
  'les deux textes sont masqués et l''indicateur retiré');

-- Drapeaux et forme
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, saisi_dimanche_matin)
  select 'Essai déf. matin mensuel', 'Un indicateur du mois ne se saisit pas le matin.', 'mois', com_m, true from ctx
$$, 'P0001', 'Seul un indicateur saisi du dimanche se saisit dès le dimanche matin.', 'saisi_dimanche_matin réservé au dimanche');
select lives_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, saisi_dimanche_matin, libelle_sessions, sans_somme)
  select 'Essai déf. matin', 'Présents du dimanche, saisis dès le matin.', 'dimanche', com_m, true, true, true from ctx
$$, 'drapeaux saisi_dimanche_matin, libelle_sessions et sans_somme posés à la création');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, calcul, code, origine)
  values ('Essai calcul commun', 'Un commun ne se calcule pas.', 'mois', 'taux', 'essai_calcul', 'commun')
$$, 'P0001', 'Un chiffre commun ne se calcule pas.', 'un commun n''est jamais un calcul');

-- Termes : les formes des calculs étendus (X9) s'écrivent dans le schéma complet, puis se figent.
select lives_ok($$ select pg_temp.calcul('Essai t. différence', 'difference', 'mois',
  jsonb_build_array(pg_temp.t('plus', (select s1 from ctx)), pg_temp.t('moins', (select s2 from ctx)))) $$,
  'différence signée : un « plus » et un « moins »');
select lives_ok($$ select pg_temp.calcul('Essai t. somme de deux', 'somme', 'mois',
  jsonb_build_array(pg_temp.t('terme', (select s1 from ctx)), pg_temp.t('terme', (select s2 from ctx)))) $$,
  'somme de 2 termes');
select lives_ok($$ select pg_temp.calcul('Essai t. somme de quatre', 'somme', 'mois',
  jsonb_build_array(pg_temp.t('terme', (select s1 from ctx)), pg_temp.t('terme', (select s2 from ctx)),
                    pg_temp.t('terme', (select s3 from ctx)), pg_temp.t('terme', (select s4 from ctx)))) $$,
  'somme de 4 termes');
select throws_ok($$ select pg_temp.calcul('Essai t. somme de un', 'somme', 'mois',
  jsonb_build_array(pg_temp.t('terme', (select s1 from ctx)))) $$,
  'P0001', 'Le calcul « Essai t. somme de un » n''a pas tous ses termes.', 'somme d''un seul terme refusée');
select throws_ok($$ select pg_temp.calcul('Essai t. somme de cinq', 'somme', 'mois',
  jsonb_build_array(pg_temp.t('terme', (select s1 from ctx)), pg_temp.t('terme', (select s2 from ctx)),
                    pg_temp.t('terme', (select s3 from ctx)), pg_temp.t('terme', (select s4 from ctx)),
                    pg_temp.t('terme', (select dem from ctx)))) $$,
  '23514', null, 'somme de 5 termes refusée (4 au plus)');
select lives_ok($$ select pg_temp.calcul('Essai t. évolution', 'evolution', 'mois',
  jsonb_build_array(pg_temp.t('terme', (select s1 from ctx)))) $$,
  'évolution : un terme');
select lives_ok($$ select pg_temp.calcul('Essai t. dimanches du mois', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select s_dim from ctx), 'somme_dimanches_du_mois'))) $$,
  'agrégat « somme des dimanches du mois »');
select lives_ok($$ select pg_temp.calcul('Essai t. décalage', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)),
                    pg_temp.t('bas', (select s_dim from ctx), 'somme_dimanches_du_mois', 3))) $$,
  'décalage de 3 mois accepté');
select throws_ok($$ select pg_temp.calcul('Essai t. décalage 4', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select s2 from ctx), 'periode', 4))) $$,
  '23514', null, 'décalage de 4 mois refusé (0 à 3)');
select lives_ok($$ select pg_temp.calcul('Essai t. fin de mois', 'moyenne', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select s_jour from ctx), 'fin_de_mois'))) $$,
  'agrégat « fin de mois » d''un « à ce jour »');
select lives_ok($$ select pg_temp.calcul('Essai t. comptage', 'taux', 'mois',
  jsonb_build_array(pg_temp.c('haut', 'realises'), pg_temp.c('bas', 'realises'), pg_temp.c('bas', 'annules'),
                    pg_temp.c('bas', 'sans_etat_final')), (select coo_m from ctx)) $$,
  'terme « comptage d''événements » sans source (taux de réalisation de Coordination)');
select throws_ok($$ select pg_temp.calcul('Essai t. comptage dimanche', 'taux', 'dimanche',
  jsonb_build_array(pg_temp.c('haut', 'realises'), pg_temp.t('bas', (select s_dim from ctx)))) $$,
  'P0001', 'Un comptage d''événements se lit par mois.', 'un comptage d''événements demande un calcul du mois');
select throws_ok($$ select pg_temp.calcul('Essai t. calcul sur un sensible', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s_sens from ctx)), pg_temp.t('bas', (select s1 from ctx)))) $$,
  'P0001', 'Un indicateur sensible n''entre dans aucun calcul.', 'source sensible refusée');
select throws_ok($$ select pg_temp.calcul('Essai t. commun', 'taux', 'dimanche',
  jsonb_build_array(pg_temp.t('haut', (select s_dim from ctx)), pg_temp.t('bas', (select service from ctx)))) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'source commune refusée');
select throws_ok($$ select pg_temp.calcul('Essai t. calcul en source', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select taux from ctx)))) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'un calcul n''est jamais la source d''un autre calcul');
-- Sources distinctes : le même chiffre, au même agrégat et au même décalage, une seule fois (les
-- termes s'écrivent un par un : le contrôle lit les termes déjà écrits du calcul).
create function pg_temp.calcul_doublon() returns void language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.indicateur (libelle, definition, nature, ministere_id, calcul)
  select 'Essai t. doublon', 'Calcul d''essai des termes.', 'mois', com_m, 'taux' from ctx returning id into v_id;
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id) select v_id, 1, 'haut', s1 from ctx;
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id) select v_id, 2, 'bas', s1 from ctx;
end $$;
select throws_ok($$ select pg_temp.calcul_doublon() $$,
  'P0001', 'Un calcul se fait sur des chiffres distincts.', 'un taux dont le haut et le bas sont le même chiffre est refusé');
select lives_ok($$ select pg_temp.calcul('Essai t. même chiffre décalé', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select s1 from ctx), 'periode', 1))) $$,
  'le même chiffre à un autre décalage reste une autre source');
select throws_ok($$ select pg_temp.calcul('Essai t. autre fiche', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select s_jeu from ctx)))) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'source d''un autre ministère refusée');
select throws_ok($$ select pg_temp.calcul('Essai t. rythmes', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s_dim from ctx)), pg_temp.t('bas', (select s1 from ctx)))) $$,
  'P0001', 'Ces deux chiffres ne se calculent pas ensemble.', 'un calcul prend le rythme de son haut');
select throws_ok($$ select pg_temp.calcul('Essai t. retirée', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)), pg_temp.t('bas', (select s5 from ctx)))) $$,
  'P0001', 'Un calcul se fait sur des indicateurs actifs.', 'source retirée refusée');
select throws_ok($$ select pg_temp.calcul('Essai t. rôle', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('plus', (select s1 from ctx)), pg_temp.t('bas', (select s2 from ctx)))) $$,
  'P0001', 'Ce rôle ne convient pas à ce calcul.', 'rôle « plus » refusé pour un taux');
select throws_ok($$ select pg_temp.calcul('Essai t. sans bas', 'taux', 'mois',
  jsonb_build_array(pg_temp.t('haut', (select s1 from ctx)))) $$,
  'P0001', 'Le calcul « Essai t. sans bas » n''a pas tous ses termes.', 'un taux sans bas refusé');
select throws_ok($$ select pg_temp.calcul('Essai t. sans terme', 'evolution', 'mois', '[]'::jsonb) $$,
  'P0001', 'Le calcul « Essai t. sans terme » n''a pas tous ses termes.', 'un calcul sans terme refusé');
select throws_ok($$ select pg_temp.calcul('Essai t. source et comptage', 'evolution', 'mois',
  jsonb_build_array(jsonb_build_object('role', 'terme', 'source', (select s1 from ctx), 'comptage', 'prevus'))) $$,
  '23514', null, 'un terme à la fois source et comptage refusé');
select throws_ok($$ select pg_temp.calcul('Essai t. ni source ni comptage', 'evolution', 'mois',
  jsonb_build_array(jsonb_build_object('role', 'terme'))) $$,
  '23514', null, 'un terme sans source ni comptage refusé');
select throws_ok($$ insert into public.indicateur_terme (calcul_id, ordre, role, source_id) select dem, 1, 'haut', s1 from ctx $$,
  'P0001', 'Un terme appartient à un calcul.', 'un terme vise un calcul');
-- Écrit seulement à la création : un compte de l'application n'ajoute pas un terme à un calcul
-- créé dans une instruction précédente (le propriétaire joue ici la fonction de l'API).
create function pg_temp.terme_tardif() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select tech from ctx)::text, true);
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id) select taux, 3, 'bas', s1 from ctx;
end $$;
select throws_ok($$ select pg_temp.terme_tardif() $$,
  '42501', 'Les termes d''un calcul s''écrivent à sa création, puis ne changent plus.', 'aucun terme ajouté après la création');
select throws_ok($$ update public.indicateur_terme set decalage = 1 where calcul_id = (select taux from ctx) $$,
  '42501', null, 'termes figés : aucune modification, même pour le propriétaire');
select throws_ok($$ delete from public.indicateur_terme where calcul_id = (select taux from ctx) $$,
  '42501', null, 'termes figés : aucune suppression, même pour le propriétaire');
select results_eq($$ select ordre::int, role, source_id, agregat, decalage::int from public.indicateur_terme where calcul_id = (select taux from ctx) order by ordre $$,
  $$ select 1, 'haut', pub, 'periode', 0 from ctx union all select 2, 'bas', dem, 'periode', 0 from ctx $$,
  'le taux garde ses deux termes');

select * from finish();
rollback;
