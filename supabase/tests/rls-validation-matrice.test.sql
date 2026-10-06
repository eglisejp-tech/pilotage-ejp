-- Matrice des droits du catalogue, de la validation et des fonctions de configuration (lot B3 ;
-- docs/plan-etape-4.md, section 4, « Matrice des droits des objets nouveaux » ;
-- validation-metier.md 6.5 ; contrat-etape-4.md, section 8), écrite en données et parcourue par
-- tests.verifier_matrice (000-outils.test.sql).
--
-- Objets : demande_indicateur et validation (lecture, ajout direct, modification, suppression),
-- v_a_valider, v_catalogue, v_suggestions, moderation (couples nouveaux), les fonctions
-- valider_indicateur, creer_indicateurs_prevus, creer_indicateur, creer_calcul,
-- corriger_indicateur, retirer_indicateur, ajouter_suggestion, limites_indicateurs,
-- verifier_libelle, masquer_texte sur les deux couples nouveaux, et le catalogue privé
-- (illisible par l'API).
-- Profils : un ministère porteur (A, qui a trois demandes), un autre ministère (B), les
-- ministères FIJ et Coordination du jeu d'exemple, le berger, le conseil, l'administration de
-- l'église et EJP Tech, en aal2 ; la dérivation ajoute la ligne aal1 de chacun (zéro ligne lue,
-- toute autre action refusée) et la ligne de l'anonyme (refusé partout).
-- Puis l'inaltérabilité, même au propriétaire, sauf le masquage d'un texte.
begin;

create temp table ctx as
select tests.creer_ministere('Matrice B3 porteur') as a_m,
       tests.creer_ministere('Matrice B3 autre') as b_m,
       tests.creer_ministere('Matrice B3 configuration') as c_m,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid,
  add column d1 uuid, add column d2 uuid, add column d3 uuid, add column v2 uuid, add column v3 uuid,
  add column haut uuid, add column bas uuid, add column corr uuid, add column ret uuid;
update ctx set a = tests.creer_compte('matrice-b3-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-b3-b@exemple.test', 'ministere', b_m);
grant select on ctx to authenticated, anon;

-- Catalogue d'essai : quatre suggestions et un modèle de deux prévus.
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre) values
  ('essai_matrice_s1', 'suggestion', 'Essai matrice suggestion un', 'Première suggestion d''essai de la matrice.', 'mois', 1),
  ('essai_matrice_s2', 'suggestion', 'Essai matrice suggestion deux', 'Deuxième suggestion d''essai de la matrice.', 'mois', 2),
  ('essai_matrice_s3', 'suggestion', 'Essai matrice suggestion trois', 'Troisième suggestion d''essai de la matrice.', 'mois', 3),
  ('essai_matrice_s4', 'suggestion', 'Essai matrice suggestion quatre', 'Quatrième suggestion d''essai de la matrice.', 'mois', 4),
  ('essai_matrice_p1', 'essai matrice', 'Essai matrice prévu un', 'Premier prévu d''essai de la matrice.', 'mois', 1),
  ('essai_matrice_p2', 'essai matrice', 'Essai matrice prévu deux', 'Deuxième prévu d''essai de la matrice.', 'dimanche', 2);

-- Indicateurs de la fiche C, écrits comme le ferait une migration (sans valeur).
insert into public.indicateur (libelle, definition, nature, ministere_id)
select x.libelle, 'Indicateur d''essai de la matrice des droits.', 'mois', c.c_m
from ctx c
cross join (values ('Essai matrice haut'), ('Essai matrice bas'), ('Essai matrice à corriger'),
                   ('Essai matrice à retirer')) as x(libelle);
update ctx set
  haut = (select i.id from public.indicateur i where i.libelle = 'Essai matrice haut'),
  bas = (select i.id from public.indicateur i where i.libelle = 'Essai matrice bas'),
  corr = (select i.id from public.indicateur i where i.libelle = 'Essai matrice à corriger'),
  ret = (select i.id from public.indicateur i where i.libelle = 'Essai matrice à retirer');

-- A ajoute trois suggestions ; EJP Tech refuse les deux dernières, puis masque le « Pourquoi »
-- et le motif de la troisième.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_matrice_s1', 'Pourquoi d''essai de la matrice, numéro un.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_matrice_s2', 'Pourquoi d''essai de la matrice, numéro deux.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_matrice_s3', 'Pourquoi d''essai de la matrice, numéro trois.');
  perform tests.deconnecter();
end $$;
update ctx set
  d1 = (select d.id from public.demande_indicateur d join public.indicateur i on i.id = d.indicateur_id
         where i.modele_code = 'essai_matrice_s1' and d.ministere_id = ctx.a_m),
  d2 = (select d.id from public.demande_indicateur d join public.indicateur i on i.id = d.indicateur_id
         where i.modele_code = 'essai_matrice_s2' and d.ministere_id = ctx.a_m),
  d3 = (select d.id from public.demande_indicateur d join public.indicateur i on i.id = d.indicateur_id
         where i.modele_code = 'essai_matrice_s3' and d.ministere_id = ctx.a_m);
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.valider_indicateur((select d2 from ctx), 'refuse', 'Motif d''essai du refus, numéro deux.');
  perform public.valider_indicateur((select d3 from ctx), 'refuse', 'Motif d''essai du refus, numéro trois.');
  perform tests.deconnecter();
end $$;
update ctx set v2 = (select v.id from public.validation v where v.demande_id = ctx.d2),
               v3 = (select v.id from public.validation v where v.demande_id = ctx.d3);
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.masquer_texte('demande_indicateur', (select d3 from ctx), 'pourquoi', 'autre');
  perform public.masquer_texte('validation', (select v3 from ctx), 'motif', 'autre');
  perform tests.deconnecter();
end $$;

-- Matrice en aal2. Attendus dans l'ordre des profils : porteur, autre ministère, FIJ,
-- Coordination, berger, conseil, administration, EJP Tech.
create temp view matrice_val (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère porteur'), (2, 'ministère autre'), (3, 'ministère fij'),
                 (4, 'ministère coordination'), (5, 'berger'), (6, 'conseil'), (7, 'administration'),
                 (8, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('demande_indicateur', 'lire', array['3', '0', '0', '0', '0', '0', '0', '3'],
      'select 1 from public.demande_indicateur where ministere_id in (select a_m from ctx union all select b_m from ctx)'),
     ('demande_indicateur', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.demande_indicateur (indicateur_id, ministere_id, objet, libelle, pourquoi) select haut, c_m, ''ajout'', ''Essai direct'', ''Pourquoi d''''un ajout direct.'' from ctx'),
     ('demande_indicateur', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.demande_indicateur set libelle = libelle where id = (select d1 from ctx)'),
     ('demande_indicateur', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.demande_indicateur where id = (select d1 from ctx)'),
     ('validation', 'lire', array['2', '0', '0', '0', '2', '2', '2', '2'],
      'select 1 from public.validation where ministere_id in (select a_m from ctx union all select b_m from ctx)'),
     ('validation', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.validation (demande_id, ministere_id, decision) select d1, a_m, ''valide'' from ctx'),
     ('validation', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.validation set motif = motif where id = (select v2 from ctx)'),
     ('validation', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.validation where id = (select v2 from ctx)'),
     ('v_a_valider', 'lire', array['0', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.v_a_valider where ministere_id in (select a_m from ctx union all select b_m from ctx)'),
     ('v_catalogue', 'lire', array['0', '0', '0', '0', '0', '0', '6', '6'],
      'select 1 from public.v_catalogue where code like ''essai_matrice_%'''),
     ('v_suggestions', 'lire', array['3', '0', '0', '0', '0', '0', '3', '3'],
      'select 1 from public.v_suggestions where ministere_id = (select a_m from ctx) and code like ''essai_matrice_%'''),
     ('moderation (couples des indicateurs)', 'lire', array['0', '0', '0', '0', '0', '0', '0', '2'],
      'select 1 from public.moderation where cible in (''demande_indicateur'', ''validation'') and cible_id in (select d3 from ctx union all select v3 from ctx)'),
     ('valider_indicateur', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.valider_indicateur((select d1 from ctx), ''valide'')'),
     ('creer_indicateurs_prevus', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select public.creer_indicateurs_prevus((select c_m from ctx), ''essai matrice'')'),
     ('creer_indicateur', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select public.creer_indicateur((select c_m from ctx), ''Essai matrice ajout'', ''Définition d''''essai de la matrice.'', ''mois'', ''nombre'', false, false, null)'),
     ('creer_calcul', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select public.creer_calcul(''Essai matrice part'', ''Part d''''essai de la matrice, calculée.'', ''taux'', (select haut from ctx), (select bas from ctx), null)'),
     ('corriger_indicateur', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select public.corriger_indicateur((select corr from ctx), ''Essai matrice corrigé'', ''Définition corrigée de l''''essai de la matrice.'')'),
     ('retirer_indicateur', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select public.retirer_indicateur((select ret from ctx), ''plus_suivi'')'),
     ('ajouter_suggestion', 'appeler', array['ok', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select public.ajouter_suggestion((select a_m from ctx), ''essai_matrice_s4'', ''Pourquoi d''''essai de la matrice, numéro quatre.'')'),
     ('limites_indicateurs', 'appeler', array['ok', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select * from public.limites_indicateurs((select a_m from ctx))'),
     ('verifier_libelle', 'appeler', array['ok', '42501', '42501', '42501', '42501', '42501', 'ok', 'ok'],
      'select * from public.verifier_libelle(''Essai de libellé'', ''mois'', (select a_m from ctx))'),
     ('masquer_texte (demande_indicateur, pourquoi)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''demande_indicateur'', (select d1 from ctx), ''pourquoi'', ''nom_personne'')'),
     ('masquer_texte (validation, motif)', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''validation'', (select v2 from ctx), ''motif'', ''coordonnees'')')
   ) as m(objet, action, attendu, requete);
create temp view profil_val (profil, compte) as
  select 'ministère porteur', c.a from ctx c union all select 'ministère autre', c.b from ctx c
  union all select 'ministère fij', c.fij from ctx c union all select 'ministère coordination', c.coo from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;

-- Catalogue privé : rien pour personne, en aal1 comme en aal2, ni pour l'anonyme.
create temp view matrice_privee (profil, objet, action, aal, attendu, requete) as
  select p.profil, a.objet, a.action, n.aal, '42501', a.requete
    from profil_val p
   cross join (values ('aal1'), ('aal2')) as n(aal)
   cross join (values
     ('private.indicateur_prevu', 'lire', 'select 1 from private.indicateur_prevu'),
     ('private.indicateur_prevu', 'ajouter',
      'insert into private.indicateur_prevu (code, modele, libelle, definition, nature) values (''essai_direct'', ''suggestion'', ''Essai direct'', ''Ajout direct au catalogue.'', ''mois'')'),
     ('private.indicateur_prevu_terme', 'lire', 'select 1 from private.indicateur_prevu_terme')
   ) as a(objet, action, requete)
  union all
  select 'anonyme', a.objet, a.action, null, '42501', a.requete
    from (values
     ('private.indicateur_prevu', 'lire', 'select 1 from private.indicateur_prevu'),
     ('private.indicateur_prevu', 'ajouter',
      'insert into private.indicateur_prevu (code, modele, libelle, definition, nature) values (''essai_direct'', ''suggestion'', ''Essai direct'', ''Ajout direct au catalogue.'', ''mois'')'),
     ('private.indicateur_prevu_terme', 'lire', 'select 1 from private.indicateur_prevu_terme')
   ) as a(objet, action, requete);
grant select on matrice_val, profil_val, matrice_privee to authenticated, anon;

-- Le plan compte les 10 tests fixes (inaltérabilité et masquage) et, par tests.nombre_essais,
-- les essais des deux matrices (lignes dérivées comprises pour la première).
select plan(10
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_val',
                        'select profil, compte from profil_val', true)
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_privee',
                        'select profil, compte from profil_val', false));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_val',
  'select profil, compte from profil_val',
  true);

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_privee',
  'select profil, compte from profil_val',
  false);

-- Inaltérabilité, même pour le propriétaire des tables (rôle du test).
select throws_ok($$ update public.demande_indicateur set libelle = libelle where id = (select d1 from ctx) $$, '42501',
  'La table demande_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'demande_indicateur : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.demande_indicateur where id = (select d1 from ctx) $$, '42501',
  'La table demande_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'demande_indicateur : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.validation, public.demande_indicateur $$, '42501', null::text,
  'demande_indicateur et validation : le propriétaire ne peut pas les vider');
select throws_ok($$ update public.validation set motif = motif where id = (select v2 from ctx) $$, '42501',
  'La table validation est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'validation : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.validation where id = (select v2 from ctx) $$, '42501',
  'La table validation est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'validation : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.validation $$, '42501',
  'La table validation est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'validation : le propriétaire ne peut pas la vider');

-- Seule exception : le masquage du texte, sous le réglage local que pose masquer_texte.
select throws_ok($$ update public.validation set motif = '[texte masqué par EJP Tech]' where id = (select v2 from ctx) $$,
  '42501', 'La table validation est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sans le réglage de masquage, masquer directement un motif est refusé');
select set_config('pilotage.masquage', 'oui', true);
select throws_ok($$ update public.demande_indicateur set libelle = 'Autre nom', pourquoi = '[texte masqué par EJP Tech]'
                     where id = (select d2 from ctx) $$, '42501',
  'La table demande_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sous le réglage de masquage, aucun autre champ ne change');
select throws_ok($$ update public.demande_indicateur set pourquoi = 'Un autre pourquoi d''essai.' where id = (select d2 from ctx) $$,
  '42501', 'La table demande_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sous le réglage de masquage, le « Pourquoi » ne prend que le texte masqué');
select lives_ok($$ update public.demande_indicateur set pourquoi = '[texte masqué par EJP Tech]' where id = (select d2 from ctx) $$,
  'sous le réglage de masquage, le masquage du « Pourquoi » passe');
select set_config('pilotage.masquage', '', true);

select * from finish();
rollback;
