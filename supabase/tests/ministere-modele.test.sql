-- Liste des indicateurs prévus choisie pour chaque ministère (décision T72, migration
-- 20261025003417_ministere_modele.sql).
--
-- 1. Matrice des droits (BRIEF, section 7), écrite en données et parcourue par
--    tests.verifier_matrice (000-outils.test.sql) : v_ministere_modele (administration de
--    l'église et EJP Tech), private.ministere_modele (rien pour personne), choisir_modele_prevus
--    (EJP Tech seul, en public comme en private), private.modeles_ministeres, les aides privées
--    (personne) ; la dérivation ajoute l'aal1 de chaque ligne acceptée et l'anonyme. Puis la RLS,
--    la politique restrictive et la séquence de la table privée.
-- 2. choisir_modele_prevus : modèle inconnu, choix et journal {avant, apres}, second choix
--    identique sans écriture, un modèle par ministère actif, refus de quitter une liste dont un
--    prévu est suivi (vers une autre liste ou vers « aucun »), passage possible une fois les
--    prévus retirés, « aucun » réversible, historique gardé.
-- 3. creer_indicateurs_prevus : refuse un modèle différent du lien, pose le lien vide.
-- 4. Inaltérabilité de la table, même pour son propriétaire.
-- 5. Journal : l'administration, le ministère, le berger, le conseil et EJP Tech lisent les lignes
--    du choix ; un autre ministère et l'aal1, rien. Un ministère désactivé ne reçoit pas de liste.
-- 6. Reprise (private.reprendre_modeles) : modèle le plus représenté des prévus non retirés, nom
--    exact (Protocole, même avec « Aucun prévu » au journal), modèle déjà pris, « aucun » du
--    journal, prévus tous retirés, ministère désactivé, ministère sans rien ; FIJ du jeu
--    d'exemple relié à « coordo fij » sans changer de nom ; une ligne de journal « Système » par
--    lien ; second appel sans effet ; aucune ligne d'indicateur ni de mesure touchée.
-- 7. Référence : les 23 ministères de K14c et P43, créés dans la transaction quand le jeu
--    d'exemple ne les a pas : chacun a un modèle suggéré du catalogue, ou figure sur la liste
--    explicite « aucun » (Prodiges Academy) ; chaque modèle du catalogue est suggéré à l'un d'eux ;
--    les noms connus de la production.
begin;

create temp table ctx as
select tests.creer_ministere('Essai lien libre') as libre,
       tests.creer_ministere('Essai lien autre') as autre,
       tests.creer_ministere('Essai lien neuf') as neuf,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column ministere uuid, add column ministere_autre uuid;
update ctx set ministere = tests.creer_compte('lien-libre@exemple.test', 'ministere', libre),
               ministere_autre = tests.creer_compte('lien-autre@exemple.test', 'ministere', autre);
grant select on ctx to authenticated, anon;

-- Catalogue d'essai : trois listes pour les choix, quatre pour la reprise.
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre) values
  ('essai_lien_a1', 'essai lien a', 'Essai lien a un', 'Premier prévu d''essai de la liste a.', 'mois', 1),
  ('essai_lien_a2', 'essai lien a', 'Essai lien a deux', 'Second prévu d''essai de la liste a.', 'mois', 2),
  ('essai_lien_b1', 'essai lien b', 'Essai lien b un', 'Prévu d''essai de la liste b.', 'mois', 1),
  ('essai_lien_c1', 'essai lien c', 'Essai lien c un', 'Prévu d''essai de la liste c.', 'mois', 1),
  ('essai_rep_x1', 'essai reprise x', 'Essai reprise x un', 'Premier prévu d''essai de la reprise x.', 'mois', 1),
  ('essai_rep_x2', 'essai reprise x', 'Essai reprise x deux', 'Second prévu d''essai de la reprise x.', 'mois', 2),
  ('essai_rep_y1', 'essai reprise y', 'Essai reprise y un', 'Premier prévu d''essai de la reprise y.', 'mois', 1),
  ('essai_rep_y2', 'essai reprise y', 'Essai reprise y deux', 'Second prévu d''essai de la reprise y.', 'mois', 2),
  ('essai_rep_z1', 'essai reprise z', 'Essai reprise z un', 'Prévu d''essai de la reprise z.', 'mois', 1),
  ('essai_rep_n1', 'essai reprise nom', 'Essai reprise nom un', 'Prévu d''essai de la reprise par le nom.', 'mois', 1);

-- 1. Matrice en aal2. Attendus dans l'ordre des profils : ministère, berger, conseil,
-- administration, EJP Tech.
create temp view matrice_lien (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère'), (2, 'berger'), (3, 'conseil'), (4, 'administration'), (5, 'EJP Tech'))
         as p(rang, profil)
   cross join (values
     ('v_ministere_modele', 'lire', array['0', '0', '0', '2', '2'],
      'select 1 from public.v_ministere_modele where ministere_id in (select libre from ctx union all select autre from ctx)'),
     ('private.ministere_modele', 'lire', array['42501', '42501', '42501', '42501', '42501'],
      'select 1 from private.ministere_modele'),
     ('private.ministere_modele', 'ajouter', array['42501', '42501', '42501', '42501', '42501'],
      'insert into private.ministere_modele (ministere_id, modele) select libre, ''aucun'' from ctx'),
     ('private.ministere_modele', 'modifier', array['42501', '42501', '42501', '42501', '42501'],
      'update private.ministere_modele set modele = modele'),
     ('private.ministere_modele', 'supprimer', array['42501', '42501', '42501', '42501', '42501'],
      'delete from private.ministere_modele'),
     ('choisir_modele_prevus', 'appeler', array['42501', '42501', '42501', '42501', 'ok'],
      'select public.choisir_modele_prevus((select autre from ctx), ''essai lien b'')'),
     -- Les parties private ouvertes à authenticated font les mêmes contrôles en direct.
     ('private.choisir_modele_prevus', 'appeler', array['42501', '42501', '42501', '42501', 'ok'],
      'select private.choisir_modele_prevus((select autre from ctx), ''essai lien b'')'),
     ('private.modeles_ministeres', 'lire', array['0', '0', '0', '2', '2'],
      'select 1 from private.modeles_ministeres() where ministere_id in (select libre from ctx union all select autre from ctx)'),
     ('private.modele_suggere', 'appeler', array['42501', '42501', '42501', '42501', '42501'],
      'select private.modele_suggere(''Kumi'')'),
     ('private.modele_choisi', 'appeler', array['42501', '42501', '42501', '42501', '42501'],
      'select private.modele_choisi((select libre from ctx))'),
     ('private.poser_modele', 'appeler', array['42501', '42501', '42501', '42501', '42501'],
      'select private.poser_modele((select libre from ctx), ''aucun'', null)'),
     ('private.reprendre_modeles', 'appeler', array['42501', '42501', '42501', '42501', '42501'],
      'select private.reprendre_modeles()')
   ) as m(objet, action, attendu, requete);
create temp view profil_lien (profil, compte) as
  select 'ministère', c.ministere from ctx c union all select 'berger', c.berger from ctx c
  union all select 'conseil', c.conseil from ctx c union all select 'administration', c.admin from ctx c
  union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_lien, profil_lien to authenticated, anon;

-- Scénarios de la reprise (section 6), écrits comme une migration (sans valeur) : un ministère par
-- cas, sans lien.
alter table ctx add column majorite uuid, add column protocole uuid, add column sans_prevu uuid,
  add column retires uuid, add column retires_aucun uuid, add column porteur uuid, add column par_nom uuid,
  add column sans_rien uuid, add column desactive uuid, add column indicateurs_avant int, add column mesures_avant int;
update ctx set majorite = tests.creer_ministere('Essai reprise majorité'),
               protocole = tests.creer_ministere('Protocole'),
               sans_prevu = tests.creer_ministere('Essai reprise sans prévu'),
               retires = tests.creer_ministere('Essai reprise retirés'),
               retires_aucun = tests.creer_ministere('Essai reprise retirés puis aucun'),
               porteur = tests.creer_ministere('Essai reprise porteur'),
               par_nom = tests.creer_ministere('Essai reprise nom'),
               sans_rien = tests.creer_ministere('Essai reprise sans rien'),
               desactive = tests.creer_ministere('Essai reprise désactivé');
insert into public.indicateur (libelle, definition, nature, ministere_id, modele_code)
select p.libelle, p.definition, p.nature, f.ministere, p.code
  from ctx c
 cross join lateral (values (c.majorite, 'essai_rep_x1'), (c.majorite, 'essai_rep_x2'), (c.majorite, 'essai_rep_y1'),
                            (c.retires, 'essai_rep_z1'), (c.retires_aucun, 'essai_rep_z1'),
                            (c.porteur, 'essai_rep_n1'), (c.desactive, 'essai_rep_x1')) as f(ministere, code)
  join private.indicateur_prevu p on p.code = f.code;
update public.indicateur set etat = 'retire', retrait_motif = 'erreur'
 where ministere_id in (select retires from ctx union all select retires_aucun from ctx);
update public.ministere set desactive_le = now() where id = (select desactive from ctx);
insert into public.journal (ministere_id, action, cible, cible_id, detail)
select x.id, 'indicateurs_prevus_crees', 'ministere', x.id, '{"modele": "aucun", "nombre": 0}'::jsonb
  from ctx c cross join lateral (values (c.protocole), (c.sans_prevu), (c.retires_aucun)) as x(id);

-- Référence (section 7) : K14c et P43.
create temp table reference (nom text primary key, attendu text not null);
insert into reference values
  ('Intégration', 'integration'), ('Coordination', 'coordination'), ('Communication', 'communication'),
  ('Social', 'social'), ('Film', 'film'), ('Tech', 'tech'), ('MCAD', 'mcad'), ('MPI', 'mpi'),
  ('Santé', 'sante'), ('Merch', 'merch'), ('Production', 'production'), ('Prodiges Musique', 'prodiges musique'),
  ('Kumi', 'kumi'), ('Eagles', 'eagles'), ('Entretien', 'entretien'), ('Coordo FIJ', 'coordo fij'),
  ('Multilingue', 'multilingue'), ('Sécurité', 'securite'), ('Formation', 'formation'),
  ('Protocole', 'protocole'), ('MDS', 'mds'), ('Prodiges Junior', 'prodiges junior'),
  -- Liste explicite des ministères sans prévu (P43).
  ('Prodiges Academy', 'aucun');
grant select on reference to authenticated;

select plan(51
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_lien',
                        'select profil, compte from profil_lien', true));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_lien',
  'select profil, compte from profil_lien',
  true);

-- La table privée : RLS, la politique restrictive aal2 seule, aucun droit sur sa séquence.
select ok((select c.relrowsecurity from pg_class c where c.oid = 'private.ministere_modele'::regclass),
  'private.ministere_modele : RLS activée');
select results_eq($$
  select p.policyname::text collate "default", p.permissive::text collate "default", p.cmd::text collate "default",
         p.roles::text collate "default"
    from pg_policies p where p.schemaname = 'private' and p.tablename = 'ministere_modele'
$$, $$ values ('double_authentification'::text, 'RESTRICTIVE'::text, 'ALL'::text, '{authenticated}'::text) $$,
  'private.ministere_modele : la seule politique est la restrictive aal2');
select ok(not has_sequence_privilege('authenticated', 'private.ministere_modele_id_seq', 'USAGE')
          and not has_sequence_privilege('authenticated', 'private.ministere_modele_id_seq', 'UPDATE')
          and not has_sequence_privilege('anon', 'private.ministere_modele_id_seq', 'USAGE'),
  'private.ministere_modele : aucun droit sur sa séquence');

-- 2. choisir_modele_prevus (EJP Tech, aal2)
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.choisir_modele_prevus((select desactive from ctx), 'essai lien c') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'un ministère désactivé ne reçoit pas de liste');
select throws_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'essai inconnu') $$,
  'P0001', 'Ce modèle n''existe pas dans le catalogue.', 'un modèle absent du catalogue est refusé');
select throws_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'suggestion') $$,
  'P0001', 'Ce modèle n''existe pas dans le catalogue.', 'les suggestions ne sont pas une liste');
select lives_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'essai lien a') $$,
  'EJP Tech choisit la liste « essai lien a »');
select lives_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'essai lien a') $$,
  'le même choix une seconde fois passe, sans rien écrire');
select tests.deconnecter();
select results_eq($$ select j.compte, j.cible, j.cible_id, j.detail from public.journal j
                      where j.action = 'modele_prevus_choisi' and j.ministere_id = (select libre from ctx) $$,
  $$ select tech, 'ministere'::text, libre, '{"avant": null, "apres": "essai lien a"}'::jsonb from ctx $$,
  'une seule ligne de journal : deux codes, l''auteur, aucun texte');
select is(tests.lire((select tech from ctx), 'aal2',
    format('select modele, suggere from public.v_ministere_modele where ministere_id = %L', (select libre from ctx))),
  '[{"modele": "essai lien a", "suggere": null}]'::jsonb,
  'v_ministere_modele rend la liste choisie ; un nom inconnu n''a aucune suggestion');

select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.choisir_modele_prevus((select autre from ctx), 'essai lien a') $$,
  'P0001', 'Cette liste sert déjà à la fiche « Essai lien libre » : changez d''abord le choix de cette fiche.',
  'une liste sert un seul ministère actif (Proposé)');

-- 3. creer_indicateurs_prevus et le lien
select throws_ok($$ select public.creer_indicateurs_prevus((select libre from ctx), 'essai lien b') $$,
  'P0001', 'Cette fiche suit une autre liste : changez d''abord le choix de la liste.',
  'la création refuse un modèle différent de la liste choisie');
select is(public.creer_indicateurs_prevus((select libre from ctx), 'essai lien a'), 2,
  'la création suit la liste choisie');
select throws_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'essai lien b') $$,
  'P0001', 'Cette fiche suit encore des indicateurs prévus d''une autre liste : retirez-les avant de changer de liste.',
  'une liste dont un prévu est suivi ne se quitte pas pour une autre');
select throws_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'aucun') $$,
  'P0001', 'Cette fiche suit encore des indicateurs prévus d''une autre liste : retirez-les avant de changer de liste.',
  'ni pour « aucun »');
select public.retirer_indicateur(i.id, 'erreur')
  from public.indicateur i where i.ministere_id = (select libre from ctx) and i.modele_code = 'essai_lien_a1';
select throws_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'essai lien b') $$,
  'P0001', 'Cette fiche suit encore des indicateurs prévus d''une autre liste : retirez-les avant de changer de liste.',
  'un seul prévu encore suivi suffit à garder la liste');
select public.retirer_indicateur(i.id, 'erreur')
  from public.indicateur i where i.ministere_id = (select libre from ctx) and i.modele_code = 'essai_lien_a2';
select lives_ok($$ select public.choisir_modele_prevus((select libre from ctx), 'essai lien b') $$,
  'les prévus tous retirés, la liste se change');
select is(public.creer_indicateurs_prevus((select neuf from ctx), 'essai lien c'), 1,
  'une fiche sans liste reçoit ses prévus : creer_indicateurs_prevus pose le lien');

-- « Aucun » réversible, et « essai lien a » libre de nouveau.
select lives_ok($$ select public.choisir_modele_prevus((select autre from ctx), 'aucun') $$,
  '« Aucun prévu » se choisit');
select is(public.creer_indicateurs_prevus((select autre from ctx), 'aucun'), 0,
  'creer_indicateurs_prevus accepte « aucun » quand c''est la liste choisie');
select lives_ok($$ select public.choisir_modele_prevus((select autre from ctx), 'essai lien a') $$,
  '« Aucun prévu » se change en liste, et une liste quittée par une fiche sert à une autre');
select lives_ok($$ select public.choisir_modele_prevus((select autre from ctx), 'aucun') $$,
  'et revient à « Aucun prévu » tant qu''aucun prévu n''est créé');
select tests.deconnecter();

select results_eq($$ select x.modele, x.choisi_par from private.ministere_modele x
                      where x.ministere_id = (select autre from ctx) order by x.id $$,
  $$ select v.modele, c.tech from ctx c cross join (values (1, 'aucun'::text), (2, 'essai lien a'), (3, 'aucun')) as v(rang, modele)
     order by v.rang $$,
  'l''historique reste : trois choix, du plus ancien au plus récent, chacun avec son auteur');
select results_eq($$ select j.detail from public.journal j
                      where j.action = 'modele_prevus_choisi' and j.ministere_id = (select libre from ctx) order by j.id $$,
  $$ values ('{"avant": null, "apres": "essai lien a"}'::jsonb), ('{"avant": "essai lien a", "apres": "essai lien b"}'::jsonb) $$,
  'le journal garde chaque passage, avant et après');
select results_eq($$ select j.detail from public.journal j
                      where j.action = 'modele_prevus_choisi' and j.ministere_id = (select neuf from ctx) $$,
  $$ values ('{"avant": null, "apres": "essai lien c"}'::jsonb) $$,
  'le lien posé par la création est au journal');
select is(tests.lire((select tech from ctx), 'aal2',
    format('select ministere_id, modele from public.v_ministere_modele where ministere_id in (%L, %L, %L) order by modele',
           (select libre from ctx), (select autre from ctx), (select neuf from ctx))),
  (select jsonb_agg(x order by x::text) from (
     select jsonb_build_object('ministere_id', c.autre, 'modele', 'aucun') as x from ctx c
     union all select jsonb_build_object('ministere_id', c.libre, 'modele', 'essai lien b') from ctx c
     union all select jsonb_build_object('ministere_id', c.neuf, 'modele', 'essai lien c') from ctx c) as l),
  'la vue rend la ligne la plus récente de chaque ministère');

-- 4. Inaltérabilité, même pour le propriétaire de la table (rôle du test).
select throws_ok($$ update private.ministere_modele set modele = modele where ministere_id = (select libre from ctx) $$,
  '42501', 'La table ministere_modele est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ministere_modele : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from private.ministere_modele where ministere_id = (select libre from ctx) $$,
  '42501', 'La table ministere_modele est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ministere_modele : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate private.ministere_modele $$,
  '42501', 'La table ministere_modele est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'ministere_modele : le propriétaire ne peut pas la vider');
select throws_ok($$ insert into private.ministere_modele (ministere_id, modele) select libre, 'suggestion' from ctx $$,
  '23514', null, 'les suggestions ne sont jamais une liste choisie');

-- 5. Journal : le geste se lit comme les autres gestes de configuration.
select is(tests.compter((select admin from ctx), 'aal2',
    format('select 1 from public.journal where action = %L and ministere_id = %L', 'modele_prevus_choisi', (select libre from ctx))),
  2, 'l''administration lit les choix de liste au journal');
select is(tests.compter((select ministere from ctx), 'aal2',
    format('select 1 from public.journal where action = %L and ministere_id = %L', 'modele_prevus_choisi', (select libre from ctx))),
  2, 'le ministère lit les choix de sa fiche');
select is(tests.compter((select berger from ctx), 'aal2',
    format('select 1 from public.journal where action = %L and ministere_id = %L', 'modele_prevus_choisi', (select libre from ctx))),
  2, 'le berger les lit');
select is(tests.compter((select conseil from ctx), 'aal2',
    format('select 1 from public.journal where action = %L and ministere_id = %L', 'modele_prevus_choisi', (select libre from ctx))),
  2, 'le conseil les lit');
select is(tests.compter((select tech from ctx), 'aal2',
    format('select 1 from public.journal where action = %L and ministere_id = %L', 'modele_prevus_choisi', (select libre from ctx))),
  2, 'EJP Tech les lit');
select is(tests.compter((select ministere_autre from ctx), 'aal2',
    format('select 1 from public.journal where action = %L and ministere_id = %L', 'modele_prevus_choisi', (select libre from ctx))),
  0, 'un autre ministère ne lit pas les choix de cette fiche');
select is(tests.compter((select admin from ctx), 'aal1',
    format('select 1 from public.journal where action = %L', 'modele_prevus_choisi')),
  0, 'en aal1, rien ne se lit');

-- 6. Reprise
update ctx set indicateurs_avant = (select count(*) from public.indicateur),
               mesures_avant = (select count(*) from public.mesure);
select is(private.reprendre_modeles(), 5, 'la reprise pose cinq liens, un par ministère qui en reçoit un');
select set_eq($$
  select m.id, private.modele_choisi(m.id) from public.ministere m
   where m.id in (select majorite from ctx union all select protocole from ctx union all select sans_prevu from ctx
                  union all select retires from ctx union all select retires_aucun from ctx union all select porteur from ctx
                  union all select par_nom from ctx union all select sans_rien from ctx union all select desactive from ctx)
$$, $$
  select x.id, x.modele from ctx c cross join lateral (values
    (c.majorite, 'essai reprise x'::text), (c.protocole, 'protocole'), (c.sans_prevu, 'aucun'),
    (c.retires, null), (c.retires_aucun, 'aucun'), (c.porteur, 'essai reprise nom'), (c.par_nom, null),
    (c.sans_rien, null), (c.desactive, null)) as x(id, modele)
$$, 'reprise : liste la plus représentée, nom exact avant « aucun » (Protocole), « aucun » du journal, prévus retirés ignorés, liste déjà prise, désactivé et fiche vide sans lien');
select results_eq($$
  select count(*)::int, bool_and(j.compte is null), bool_and(j.detail ->> 'avant' is null and j.detail ? 'avant'),
         bool_and(j.cible = 'ministere' and j.cible_id = j.ministere_id)
    from public.journal j
   where j.action = 'modele_prevus_choisi'
     and j.ministere_id in (select majorite from ctx union all select protocole from ctx union all select sans_prevu from ctx
                            union all select retires_aucun from ctx union all select porteur from ctx)
$$, $$ values (5, true, true, true) $$, 'reprise : une ligne de journal « Système » par lien, sans liste avant');
select is(private.reprendre_modeles(), 0, 'un second appel ne pose aucun lien');
select results_eq($$ select (select count(*) from public.indicateur)::int, (select count(*) from public.mesure)::int $$,
  $$ select indicateurs_avant, mesures_avant from ctx $$,
  'la reprise ne touche aucune ligne d''indicateur ni de mesure');
select results_eq($$ select m.nom, private.modele_choisi(m.id) from public.ministere m where m.code = 'fij' $$,
  $$ values ('FIJ'::text, 'coordo fij'::text) $$,
  'jeu d''exemple : FIJ garde son nom et suit la liste « Coordo FIJ » (Proposé)');
select results_eq($$ select private.modele_choisi(m.id) from public.ministere m where m.nom = 'Jeunesse' $$,
  $$ values (null::text) $$, 'jeu d''exemple : Jeunesse, sans prévu ni nom de la liste, reste à choisir');

-- 7. Référence (K14c et P43)
insert into public.ministere (nom, cree_le)
select r.nom, now() - interval '1 year' from reference r
 where not exists (select 1 from public.ministere m where m.nom = r.nom);
select is((select count(*)::int from reference r join public.ministere m on m.nom = r.nom), 23,
  'les 23 ministères de référence existent dans la transaction');
select set_eq($$ select r.nom, private.modele_suggere(r.nom) from reference r $$,
  $$ select nom, attendu from reference $$,
  'chaque ministère de référence a son modèle suggéré, « aucun » pour la liste explicite (Prodiges Academy)');
select is_empty($$
  select r.nom from reference r
   where r.attendu <> 'aucun'
     and not exists (select 1 from private.indicateur_prevu p where p.modele = r.attendu)
$$, 'chaque suggestion de référence est un modèle du catalogue');
select is_empty($$
  select distinct p.modele from private.indicateur_prevu p
   where p.modele <> 'suggestion' and p.modele not like 'essai %'
  except
  select r.attendu from reference r
$$, 'chaque modèle du catalogue est suggéré à un ministère de référence');
select is(tests.compter((select tech from ctx), 'aal2',
    'select 1 from public.v_ministere_modele v join public.ministere m on m.id = v.ministere_id
      join reference r on r.nom = m.nom where v.suggere = r.attendu'),
  23, 'EJP Tech lit la suggestion de chacun dans v_ministere_modele');
select set_eq($$ select x.nom, private.modele_suggere(x.nom) from (values ('EJP Tech'), ('Ministère Santé'),
                    ('MCAD : Communication Audiovisuelle'), ('MPI : Prière'), ('Coordo'), ('Merchandising'),
                    ('Aigles'), ('FIJ'), ('EJP Formation'), ('Jeunesse'), ('  KUMI  ')) as x(nom) $$,
  $$ values ('EJP Tech', 'tech'), ('Ministère Santé', 'sante'), ('MCAD : Communication Audiovisuelle', 'mcad'),
            ('MPI : Prière', 'mpi'), ('Coordo', 'coordination'), ('Merchandising', 'merch'), ('Aigles', 'eagles'),
            ('FIJ', 'coordo fij'), ('EJP Formation', 'formation'), ('Jeunesse', null), ('  KUMI  ', 'kumi') $$,
  'noms connus de la production : la suggestion d''après l''audit, rien pour un nom inconnu');
select results_eq($$ select private.modele_choisi(m.id) from public.ministere m where m.nom = 'Prodiges Academy' $$,
  $$ values (null::text) $$, 'une suggestion n''est jamais un choix : Prodiges Academy créé ici reste sans lien');

select * from finish();
rollback;
