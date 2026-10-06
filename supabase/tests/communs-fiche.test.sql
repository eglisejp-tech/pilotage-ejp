-- Libellés des chiffres communs sur une fiche (lot B4 ; docs/plan-etape-4.md, section 4, « B4 »
-- et « Matrice des droits des objets nouveaux », ligne v_commun_fiche ; contrat-etape-4.md,
-- section 6 ; vague-1-decisions.md, X6).
--
-- v_commun_fiche, servie par private.communs_de_fiche() : les 13 communs affichés sous le nom
-- de la demande, dont les 2 lignes de référence de l'église pour MDS, pour un ministère d'essai
-- par modèle ; colonnes du contrat ; un ministère ne lit que les siens, le berger, le conseil et
-- EJP Tech tous, l'administration rien, en aal1 rien, l'anonyme est refusé ;
-- private.libelle_commun illisible en direct ; le jeu d'exemple (EJP Formation).
-- Matrice écrite en données et parcourue par tests.verifier_matrice (000-outils.test.sql).
begin;

create temp table ctx as
select tests.compte('Administration de l''église') as admin,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Coordination') as coo;

-- Un ministère d'essai par modèle, et le compte des fiches MCAD (porteur) et Kumi (autre).
create temp table essai as
select x.modele, tests.creer_ministere('Essai communs, ' || x.modele) as ministere
  from (select distinct p.modele from private.indicateur_prevu p where p.modele <> 'suggestion') as x;
alter table ctx add column porteur_m uuid, add column autre_m uuid, add column porteur uuid, add column autre uuid;
update ctx set porteur_m = (select e.ministere from essai e where e.modele = 'mcad'),
               autre_m = (select e.ministere from essai e where e.modele = 'kumi');
update ctx set porteur = tests.creer_compte('communs-mcad@exemple.test', 'ministere', porteur_m),
               autre = tests.creer_compte('communs-kumi@exemple.test', 'ministere', autre_m);
-- Un ministère désactivé avec son compte, sur le modèle MCAD (la fiche a ses communs). Hors de
-- « essai » : les nombres de la matrice ne changent pas.
alter table ctx add column des_m uuid, add column des uuid;
update ctx set des_m = tests.creer_ministere('Essai communs, ministère désactivé');
update ctx set des = tests.creer_compte('communs-desactive@exemple.test', 'ministere', des_m);
grant select on ctx, essai to authenticated, anon;

select tests.se_connecter((select admin from ctx), 'aal2');
select count(public.creer_indicateurs_prevus(e.ministere, e.modele)) from essai e;
select public.creer_indicateurs_prevus((select des_m from ctx), 'mcad');
select tests.deconnecter();

-- Désactivation (comme desactiver-compte) une fois la fiche créée.
update public.ministere set desactive_le = now() where id = (select des_m from ctx);
update public.compte set desactive_le = now() where user_id = (select des from ctx);

-- Matrice en aal2. Attendus dans l'ordre des profils : porteur (MCAD), autre (Kumi), FIJ,
-- Coordination, berger, conseil, administration, EJP Tech.
create temp view matrice_cf (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, 'lire', 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère porteur'), (2, 'ministère autre'), (3, 'ministère fij'),
                 (4, 'ministère coordination'), (5, 'berger'), (6, 'conseil'), (7, 'administration'),
                 (8, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('v_commun_fiche (fiche du porteur)', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_commun_fiche where ministere_id = (select porteur_m from ctx)'),
     ('v_commun_fiche (fiches d''essai)', array['1', '2', '0', '0', '13', '13', '0', '13'],
      'select 1 from public.v_commun_fiche where ministere_id in (select ministere from essai)')
   ) as m(objet, attendu, requete);
create temp view profil_cf (profil, compte) as
  select 'ministère porteur', c.porteur from ctx c union all select 'ministère autre', c.autre from ctx c
  union all select 'ministère fij', c.fij from ctx c union all select 'ministère coordination', c.coo from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;

-- Table privée : rien pour personne, en aal1 comme en aal2, ni pour l'anonyme.
create temp view matrice_cf_privee (profil, objet, action, aal, attendu, requete) as
  select p.profil, 'private.libelle_commun', 'lire', n.aal, '42501', 'select 1 from private.libelle_commun'
    from profil_cf p cross join (values ('aal1'), ('aal2')) as n(aal)
  union all
  select 'anonyme', 'private.libelle_commun', 'lire', null, '42501', 'select 1 from private.libelle_commun';
grant select on matrice_cf, profil_cf, matrice_cf_privee to authenticated, anon;

select plan(6
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_cf',
                        'select profil, compte from profil_cf', true)
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_cf_privee',
                        'select profil, compte from profil_cf', false));

select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_commun_fiche'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('ministere_id', 'uuid'), ('commun_code', 'text'), ('libelle', 'text'), ('ordre', 'smallint'),
              ('reference_eglise', 'boolean') $$,
  'v_commun_fiche : colonnes et types du contrat');

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select e.modele, c.commun_code, c.libelle, c.ordre, c.reference_eglise
    from public.v_commun_fiche c join essai e on e.ministere = c.ministere_id
   order by e.modele, c.ordre, c.commun_code
$$, $$ select * from (values
    ('eagles'::text, 'actifs'::text, 'Bénévoles actifs'::text, 2::smallint, false),
    ('entretien', 'service', 'Personnes actives mobilisées', 1::smallint, false),
    ('formation', 'service', 'Formateurs mobilisés', 1::smallint, false),
    ('integration', 'service', 'Équipe présente au culte', 1::smallint, false),
    ('kumi', 'service', 'Femmes mobilisées', 1::smallint, false),
    ('kumi', 'actifs', 'Bénévoles actives', 2::smallint, false),
    ('mcad', 'service', 'Équipiers mobilisés', 1::smallint, false),
    ('mds', 'actifs', 'STARs actifs de l''église', 4::smallint, true),
    ('mds', 'service', 'STARs au service de l''église', 5::smallint, true),
    ('multilingue', 'service', 'Interprètes mobilisés', 1::smallint, false),
    ('prodiges junior', 'service', 'Animateurs mobilisés', 1::smallint, false),
    ('sante', 'service', 'Personnes mobilisées', 1::smallint, false),
    ('securite', 'service', 'Agents et bénévoles mobilisés', 1::smallint, false)
  ) as x(modele, commun_code, libelle, ordre, reference_eglise)
  order by x.modele, x.ordre, x.commun_code $$,
  'les 13 communs sous le nom de la demande, dont les 2 lignes de référence de l''église pour MDS');
select tests.deconnecter();

select ok((select max(char_length(l.libelle)) from private.libelle_commun l) <= 60,
  'chaque libellé de commun tient en 60 caractères');
select is(tests.lire(tests.compte('Ministère EJP Formation'), 'aal2',
    'select commun_code, libelle, reference_eglise from public.v_commun_fiche'),
  '[{"libelle": "Formateurs mobilisés", "commun_code": "service", "reference_eglise": false}]'::jsonb,
  'jeu d''exemple : EJP Formation lit « Formateurs mobilisés » pour ses STARs au service, et rien d''autre');

select is((select count(*)::int from public.indicateur i where i.ministere_id = (select des_m from ctx)), 21,
  'le ministère désactivé a bien sa fiche MCAD (21 indicateurs, dont un chiffre commun affiché)');
select is(tests.essai((select des from ctx), 'aal2', 'select 1 from public.v_commun_fiche', 'lignes'), '0',
  'un ministère désactivé et son compte ne lisent aucun chiffre commun, pas même ceux de leur fiche');

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_cf',
  'select profil, compte from profil_cf',
  true);

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_cf_privee',
  'select profil, compte from profil_cf',
  false);

select * from finish();
rollback;
