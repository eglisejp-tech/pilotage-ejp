-- Vague 1 des indicateurs (lot B4 ; docs/plan-etape-4.md, section 4, « B4 » ;
-- docs/conception/vague-1-decisions.md, section 4 ; réponse de la personne responsable du
-- 6 octobre 2026 sur les parts, question 1).
--
-- 1. Catalogue : nombres par modèle et totaux (161 saisis, 41 calculs, 11 sensibles, 19 parts,
--    unités, 11 suggestions, 21 modèles), 29 calculs de la V1 et 12 calculs étendus, aucun
--    libellé normalisé en double dans un modèle ni avec un chiffre commun, sources des calculs
--    existantes et non sensibles, chaque part marquée, drapeaux, textes exacts.
-- 2. Création par l'administration pour un ministère d'essai par modèle : comptes, état actif
--    (sensibles compris), termes complets, journal, aucune validation ni ajout, MCAD 21 lignes
--    sur 30, second appel sans doublon, « aucun » pour Protocole, suggestions déjà prévues
--    écartées, aucun calcul sur un sensible ou un commun.
-- 3. Parts : un haut au-dessus du bas donne « Non calculé, à vérifier » (haut_depasse_bas) ;
--    sur l'année, la règle porte sur les sommes (annee_resultat null si Σ haut > Σ bas, aucune
--    période écartée) ; un haut de 0 donne 0, un bas de 0 donne bas_nul avant tout ; un taux qui
--    n'est pas une part dépasse 100 % ; une part à 100 % se calcule ; part figée et réservée aux
--    taux. La création et le remplacement d'une part par creer_calcul : calcul-part.test.sql.
-- 4. Jeu d'exemple (seed/40-indicateurs.sql) : sensible à 2 rendu « moins de 3 » au berger, part
--    à vérifier de Formation, une valeur par unité, un ajout à valider, un validé, un refusé, un
--    retiré avec saisies.
begin;

select plan(50);

create temp table attendu (modele text primary key, saisis integer, calculs integer, sensibles integer, parts integer,
                           v1 integer);
insert into attendu values
  ('integration', 8, 4, 0, 0, 1),
  ('coordination', 6, 4, 0, 2, 1),
  ('communication', 10, 4, 0, 1, 2),
  ('social', 7, 0, 3, 0, 0),
  ('film', 8, 2, 0, 1, 2),
  ('tech', 6, 2, 0, 0, 2),
  ('mcad', 16, 5, 0, 2, 3),
  ('mpi', 9, 3, 0, 2, 3),
  ('sante', 7, 1, 4, 1, 1),
  ('merch', 9, 3, 0, 0, 1),
  ('production', 7, 0, 0, 0, 0),
  ('prodiges musique', 6, 1, 0, 1, 1),
  ('kumi', 11, 1, 1, 1, 1),
  ('eagles', 7, 1, 1, 1, 1),
  ('entretien', 8, 2, 0, 0, 2),
  ('coordo fij', 3, 0, 0, 0, 0),
  ('multilingue', 8, 2, 0, 2, 2),
  ('securite', 7, 2, 0, 1, 2),
  ('formation', 6, 3, 0, 3, 3),
  ('mds', 8, 0, 0, 0, 0),
  ('prodiges junior', 4, 1, 2, 1, 1);

-- Les dix-neuf parts du catalogue (P49 : les quinze « plafond 100 % » et les quatre taux de même
-- nature ajoutés par EJP Tech) et les onze sensibles.
create temp table parts_attendues (modele text, libelle text);
insert into parts_attendues values
  ('coordination', 'Taux de réalisation des événements'),
  ('coordination', 'Part des événements à l''heure'),
  ('kumi', 'Taux de participation'),
  ('eagles', 'Taux de participation'),
  ('prodiges junior', 'Taux de présence'),
  ('communication', 'Taux de demandes traitées dans les délais'),
  ('film', 'Taux de livraison dans les délais'),
  ('mcad', 'Taux de couverture des événements'),
  ('mcad', 'Taux de présence des équipiers'),
  ('mpi', 'Prière des Stars : taux de participation'),
  ('mpi', 'Chaîne de prière : taux de participation'),
  ('sante', 'Taux de couverture des événements'),
  ('prodiges musique', 'Répétitions : taux de présence'),
  ('multilingue', 'Taux de couverture des événements'),
  ('multilingue', 'Part des demandes satisfaites'),
  ('securite', 'Taux de couverture des postes'),
  ('formation', 'Taux de présence'),
  ('formation', 'Taux de complétion'),
  ('formation', 'Taux de satisfaction');

create temp table sensibles_attendus (modele text, libelle text);
insert into sensibles_attendus values
  ('social', 'Bénéficiaires (passages)'),
  ('social', 'Personnes accompagnées'),
  ('social', 'Nouveaux bénéficiaires'),
  ('sante', 'Prises en charge'),
  ('sante', 'Interventions'),
  ('sante', 'Incidents avec intervention'),
  ('sante', 'Orientations vers une structure ou un professionnel'),
  ('kumi', 'Call your sister : prises en charge'),
  ('eagles', 'La plate-forme d''écoute : prises en charge'),
  ('prodiges junior', 'Nouveaux enfants'),
  ('prodiges junior', 'Enfants déjà venus');

create temp table ctx as
select tests.compte('Administration de l''église') as admin,
       tests.compte('Berger') as berger,
       tests.creer_ministere('Essai vague 1, Protocole') as protocole,
       private.dimanche_reference() as ref,
       (private.mois_courant() - interval '1 month')::date as m1,
       private.periode_de('dimanche', make_date(extract(year from private.aujourdhui())::integer, 1, 1)) as debut_dim,
       make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier;

-- Un ministère d'essai par modèle.
create temp table essai as
select a.modele, tests.creer_ministere('Essai vague 1, ' || a.modele) as ministere from attendu a;

grant select on attendu, parts_attendues, sensibles_attendus, ctx, essai to authenticated;

-- 1. Catalogue

select results_eq($$
  select p.modele, count(*) filter (where p.calcul is null)::int, count(*) filter (where p.calcul is not null)::int,
         count(*) filter (where p.sensible)::int, count(*) filter (where p.part)::int
    from private.indicateur_prevu p
   where p.modele <> 'suggestion'
   group by p.modele
   order by p.modele
$$, $$ select modele, saisis, calculs, sensibles, parts from attendu order by modele $$,
  'chaque modèle : ses indicateurs saisis, ses calculs, ses sensibles et ses parts (vague-1-decisions.md, section 4)');
select results_eq($$
  select count(*) filter (where p.calcul is null and p.modele <> 'suggestion')::int,
         count(*) filter (where p.calcul is not null)::int,
         count(*) filter (where p.sensible)::int,
         count(*) filter (where p.part)::int,
         count(*) filter (where p.unite = 'euros' and p.calcul is null)::int,
         count(*) filter (where p.unite = 'heure' and p.calcul is null)::int,
         count(*) filter (where p.unite = 'jours' and p.calcul is null)::int,
         count(*) filter (where p.modele = 'suggestion')::int,
         count(distinct p.modele) filter (where p.modele <> 'suggestion')::int
    from private.indicateur_prevu p
$$, $$ values (161, 41, 11, 19, 4, 2, 4, 11, 21) $$,
  '161 indicateurs saisis, 41 calculs, 11 sensibles, 19 parts ; 4 en euros, 2 en heure, 4 en jours ; 11 suggestions ; 21 modèles');
select results_eq($$
  select count(*) filter (where v1)::int, count(*) filter (where not v1)::int
    from (select p.calcul in ('taux', 'moyenne')
                 and not exists (select 1 from private.indicateur_prevu_terme t
                                  where t.prevu_code = p.code
                                    and (t.source_code is null or t.agregat <> 'periode' or t.decalage <> 0)) as v1
            from private.indicateur_prevu p where p.calcul is not null) as x
$$, $$ values (29, 12) $$, '29 calculs lus dès la V1 (taux et moyennes), 12 calculs étendus lus au lot L1');
select results_eq($$ select modele, v1 from attendu order by modele $$,
  $$ select p.modele, (count(*) filter (where p.calcul in ('taux', 'moyenne')
                       and not exists (select 1 from private.indicateur_prevu_terme t
                                        where t.prevu_code = p.code
                                          and (t.source_code is null or t.agregat <> 'periode' or t.decalage <> 0))))::int
       from private.indicateur_prevu p where p.modele <> 'suggestion' group by p.modele order by p.modele $$,
  'calculs de la V1 par modèle');
select is_empty($$
  select p.modele from private.indicateur_prevu p where p.modele in ('protocole', 'prodiges academy', 'aucun')
$$, 'Protocole et Prodiges Academy n''ont aucun prévu');
select is_empty($$
  select p.modele, private.normaliser(p.libelle) from private.indicateur_prevu p
   group by p.modele, private.normaliser(p.libelle) having count(*) > 1
$$, 'aucun libellé normalisé en double dans un modèle, suggestions comprises');
select is_empty($$
  select p.code from private.indicateur_prevu p
    join public.indicateur c on c.ministere_id is null and private.normaliser(c.libelle) = private.normaliser(p.libelle)
$$, 'aucun prévu ni aucune suggestion ne porte le libellé normalisé d''un chiffre commun');
select is_empty($$
  select p.code from private.indicateur_prevu p
    join private.libelle_commun l on l.modele = p.modele and private.normaliser(l.libelle) = private.normaliser(p.libelle)
$$, 'aucun prévu ne porte le nom d''un chiffre commun renommé de sa fiche');
select is_empty($$
  select t.prevu_code, t.ordre from private.indicateur_prevu_terme t
    join private.indicateur_prevu c on c.code = t.prevu_code
   where t.source_code is not null
     and not exists (select 1 from private.indicateur_prevu s
                      where s.code = t.source_code and s.modele = c.modele and s.calcul is null and not s.sensible)
$$, 'chaque source d''un calcul est un indicateur saisi du même modèle, jamais sensible');
select is_empty($$
  select p.code from private.indicateur_prevu p
   where p.calcul is not null
     and not exists (select 1 from private.indicateur_prevu_terme t where t.prevu_code = p.code)
$$, 'chaque calcul a ses termes');
select set_eq($$ select p.modele, p.libelle from private.indicateur_prevu p where p.part $$,
  $$ select modele, libelle from parts_attendues $$,
  'les dix-neuf parts du catalogue sont marquées part, et elles seules (liste de P49)');
select is_empty($$
  select p.code from private.indicateur_prevu p where p.part and p.calcul is distinct from 'taux'
$$, 'part seulement pour un taux');
select throws_ok($$
  insert into private.indicateur_prevu (code, modele, libelle, definition, nature, calcul, part)
  values ('essai_part_moyenne', 'essai part', 'Essai part moyenne', 'Moyenne d''essai marquée part.', 'mois', 'moyenne', true)
$$, '23514', 'new row for relation "indicateur_prevu" violates check constraint "indicateur_prevu_part_check"',
  'une moyenne du catalogue n''est pas une part');
select set_eq($$ select p.modele, p.libelle from private.indicateur_prevu p where p.sensible $$,
  $$ select modele, libelle from sensibles_attendus $$, 'les onze indicateurs sensibles du catalogue');
select is_empty($$
  select p.code from private.indicateur_prevu p
   where p.sensible and (p.nature <> 'mois' or p.unite <> 'nombre' or p.calcul is not null or p.saisi_dimanche_matin)
$$, 'un sensible se saisit chaque mois, en nombre, sans calcul');
select results_eq($$
  select p.modele, p.libelle, p.saisi_dimanche_matin, p.libelle_sessions from private.indicateur_prevu p
   where p.saisi_dimanche_matin or p.libelle_sessions order by p.modele
$$, $$ values ('mpi'::text, 'Chaîne de prière : présents la nuit'::text, true, false),
              ('prodiges junior', 'Enfants présents', false, true) $$,
  'drapeaux : présents la nuit saisis le dimanche matin (MPI), sessions réalisées (Prodiges Junior)');
select results_eq($$
  select p.libelle, p.nature, p.unite, p.sans_somme, p.definition from private.indicateur_prevu p
   where p.code in ('production_budget_materiel_prevu', 'mcad_pic_de_spectateurs_du_direct',
                    'coordination_heure_de_debut_du_culte', 'tech_taux_de_resolution_des_demandes')
   order by p.code
$$, $$ values
  ('Heure de début du culte'::text, 'dimanche'::text, 'heure'::text, true,
   'Heure réelle à laquelle le culte de ce dimanche a commencé.'::text),
  ('Pic de spectateurs du direct', 'dimanche', 'grand_nombre', true,
   'Plus grand nombre de spectateurs connectés en même temps au direct du culte de ce dimanche.'),
  ('Budget matériel prévu', 'a_ce_jour', 'euros', true,
   'Budget prévu pour le matériel de Production, à l''euro près, le jour de la saisie. Première valeur : le devis.'),
  ('Taux de résolution des demandes', 'mois', 'nombre', false,
   '« Demandes résolues » divisées par « Demandes reçues ». Peut dépasser 100 % (des demandes d''un mois précédent peuvent être closes).') $$,
  'textes, rythmes et unités repris du catalogue (exemples)');
select results_eq($$ select p.code, p.libelle, p.nature from private.indicateur_prevu p where p.modele = 'suggestion' order by p.ordre $$,
  $$ values ('suggestion_evenements_couverts'::text, 'Événements couverts'::text, 'mois'::text),
            ('suggestion_evenements_a_couvrir', 'Événements à couvrir', 'mois'),
            ('suggestion_mobilises_aux_evenements', 'Mobilisés aux événements', 'mois'),
            ('suggestion_demandes_recues', 'Demandes reçues', 'mois'),
            ('suggestion_demandes_traitees', 'Demandes traitées', 'mois'),
            ('suggestion_projets_en_cours', 'Projets en cours', 'a_ce_jour'),
            ('suggestion_personnes_formees', 'Personnes formées', 'mois'),
            ('suggestion_activites_realisees', 'Activités réalisées', 'mois'),
            ('suggestion_participants', 'Participants', 'mois'),
            ('suggestion_nouveaux_participants', 'Nouveaux participants', 'mois'),
            ('suggestion_projets_realises', 'Projets réalisés', 'mois') $$,
  'les onze suggestions communes');
select results_eq($$
  select count(*)::int, count(*) filter (where reference_eglise)::int, max(char_length(libelle)) <= 60
    from private.libelle_commun
$$, $$ values (13, 2, true) $$, '13 communs affichés sous le nom de la demande, dont 2 lignes de référence de MDS');

-- 2. Création par l'administration (bouton « Créer »)

select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select count(public.creer_indicateurs_prevus(e.ministere, e.modele)) from essai e $$,
  'l''administration crée les prévus d''un ministère d''essai pour chacun des 21 modèles');
select is(public.creer_indicateurs_prevus((select e.ministere from essai e where e.modele = 'mcad'), 'mcad'), 0,
  'un second appel ne crée aucun doublon');
select is(public.creer_indicateurs_prevus((select protocole from ctx), 'aucun'), 0,
  'Protocole : modèle « aucun », aucun indicateur');
select is(tests.lire((select admin from ctx), 'aal2',
    format('select ajouts, ajouts_max, lignes, lignes_max from public.limites_indicateurs(%L)',
           (select e.ministere from essai e where e.modele = 'mcad'))),
  '[{"ajouts": 0, "ajouts_max": 3, "lignes": 21, "lignes_max": 30}]'::jsonb,
  'MCAD : 21 lignes sur 30, aucun ajout du ministère compté');
select tests.deconnecter();

select lives_ok($$ set constraints all immediate $$, 'chaque calcul créé a tous ses termes (contrôle différé du lot B1)');
set constraints all deferred;

select results_eq($$
  select e.modele, count(*) filter (where i.calcul is null)::int, count(*) filter (where i.calcul is not null)::int,
         count(*) filter (where i.sensible)::int, count(*) filter (where i.part)::int
    from essai e join public.indicateur i on i.ministere_id = e.ministere
   group by e.modele order by e.modele
$$, $$ select modele, saisis, calculs, sensibles, parts from attendu order by modele $$,
  'chaque fiche d''essai reçoit les indicateurs de son modèle, part recopiée');
select is_empty($$
  select i.id from essai e join public.indicateur i on i.ministere_id = e.ministere
   where not (i.etat = 'actif' and i.actif and i.origine = 'eglise' and i.modele_code is not null)
$$, 'tous actifs dès leur création, sensibles compris (P42), origine église, avec leur code de prévu');
select is((select count(*)::int from essai e
             join public.indicateur c on c.ministere_id = e.ministere
             join public.indicateur_terme t on t.calcul_id = c.id), 83,
  'les 41 calculs reçoivent leurs 83 termes');
select is_empty($$
  select t.calcul_id from essai e
    join public.indicateur c on c.ministere_id = e.ministere
    join public.indicateur_terme t on t.calcul_id = c.id
    join public.indicateur s on s.id = t.source_id
   where s.sensible or s.ministere_id is distinct from e.ministere
$$, 'aucun calcul sur un sensible, un chiffre commun ou un autre ministère');
select is_empty($$
  select i.id from essai e join public.indicateur i on i.ministere_id = e.ministere
    join private.indicateur_prevu p on p.code = i.modele_code
   where p.modele = 'suggestion'
$$, 'aucune demande de la coordination ne vient des suggestions : les prévus seuls sont créés');
select is((select count(*)::int from public.demande_indicateur d join essai e on e.ministere = d.ministere_id), 0,
  'aucun prévu ne passe par la validation d''EJP Tech');
select results_eq($$
  select e.modele, j.detail from essai e
    join public.journal j on j.ministere_id = e.ministere and j.action = 'indicateurs_prevus_crees'
   order by e.modele
$$, $$ select a.modele, jsonb_build_object('modele', a.modele, 'nombre', a.saisis + a.calculs) from attendu a order by a.modele $$,
  'une ligne de journal par fiche : le modèle et le nombre, sans texte');
select is(tests.compter((select berger from ctx), 'aal2',
    'select 1 from public.v_calcul where ministere_id in (select ministere from essai)'), 29,
  'le berger lit les 29 calculs de la V1 dans v_calcul, les 12 calculs étendus restent invisibles');
select results_eq($$
  select (select count(*)::int from public.v_suggestions s join essai e on e.ministere = s.ministere_id where e.modele = 'kumi'),
         (select count(*)::int from public.v_suggestions s join essai e on e.ministere = s.ministere_id where e.modele = 'eagles')
$$, $$ values (0, 0) $$, 'v_suggestions ne rend rien au propriétaire du test (hors aal2)');
select is(tests.lire((select admin from ctx), 'aal2', $$
  select (select count(*) from public.v_suggestions s join essai e on e.ministere = s.ministere_id where e.modele = 'kumi') as kumi,
         (select count(*) from public.v_suggestions s join essai e on e.ministere = s.ministere_id where e.modele = 'eagles') as eagles
$$), '[{"kumi": 9, "eagles": 7}]'::jsonb,
  'une suggestion déjà prévue (Activités réalisées, Participants...) n''est plus proposée à Kumi ni à Eagles');

-- 3. Parts : haut au-dessus du bas

create function pg_temp.saisir(p_modele text, p_code text, p_date date, p_valeur integer) returns void
language sql as $$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
  select i.id, i.ministere_id, p_date, p_valeur, now() - interval '1 hour', (select admin from ctx)
    from public.indicateur i join essai e on e.ministere = i.ministere_id
   where e.modele = p_modele and i.modele_code = p_code
$$;
create function pg_temp.calcul(p_modele text, p_code text) returns uuid
language sql stable as $$
  select i.id from public.indicateur i join essai e on e.ministere = i.ministere_id
   where e.modele = p_modele and i.modele_code = p_code
$$;
grant execute on function pg_temp.calcul(text, text) to authenticated;

-- Sécurité (dimanche) : 8 postes tenus sur 10 le dimanche d'avant, puis 12 sur 10 ; Tech (mois,
-- pas une part) : 12 demandes résolues pour 10 reçues ; Formation : 10 réponses satisfaites sur 10.
select pg_temp.saisir('securite', 'securite_postes_tenus', ref - 7, 8),
       pg_temp.saisir('securite', 'securite_postes_a_tenir', ref - 7, 10),
       pg_temp.saisir('securite', 'securite_postes_tenus', ref, 12),
       pg_temp.saisir('securite', 'securite_postes_a_tenir', ref, 10),
       pg_temp.saisir('tech', 'tech_demandes_resolues', m1, 12),
       pg_temp.saisir('tech', 'tech_demandes_recues', m1, 10),
       pg_temp.saisir('formation', 'formation_reponses_satisfaites', m1, 10),
       pg_temp.saisir('formation', 'formation_reponses_au_questionnaire', m1, 10),
       pg_temp.saisir('formation', 'formation_seances_presences', m1, 12),
       pg_temp.saisir('formation', 'formation_seances_presences_attendues', m1, 10),
       pg_temp.saisir('mcad', 'mcad_postes_d_equipe_tenus', m1, 0),
       pg_temp.saisir('mcad', 'mcad_postes_d_equipe_prevus', m1, 10),
       pg_temp.saisir('film', 'film_projets_livres_dans_les_delais', m1, 3),
       pg_temp.saisir('film', 'film_projets_termines', m1, 0)
  from ctx;

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select periode - (select ref from ctx), haut, bas, resultat, non_calcule_raison, non_calcule_source_id
    from public.v_calcul where indicateur_id = pg_temp.calcul('securite', 'securite_taux_de_couverture_des_postes')
$$, $$ values (0, 12::bigint, 10::bigint, null::numeric, 'haut_depasse_bas'::text, null::uuid) $$,
  'une part dont le haut dépasse le bas : « Non calculé, à vérifier », ni 120 % ni 100 %, haut et bas lisibles');
select results_eq($$
  select annee_haut, annee_bas, annee_resultat, annee_nb_periodes, annee_nb_attendues
    from public.v_calcul where indicateur_id = pg_temp.calcul('securite', 'securite_taux_de_couverture_des_postes')
$$, $$ select case when ref - 7 >= debut_dim then 20 else 12 end::bigint, case when ref - 7 >= debut_dim then 20 else 10 end::bigint,
              case when ref - 7 >= debut_dim then 100::numeric end,
              1 + (ref - 7 >= debut_dim)::int, 1 + (ref - 7 >= debut_dim)::int
         from ctx $$,
  'sur l''année, la règle porte sur les sommes : aucun dimanche écarté (8 + 12 sur 10 + 10 = 100 %), et le seul dimanche à 12 sur 10 la première semaine de l''année donne null');
select results_eq($$
  select periode - (select m1 from ctx), haut, bas, resultat, non_calcule_raison
    from public.v_calcul where indicateur_id = pg_temp.calcul('formation', 'formation_taux_de_presence')
$$, $$ values (0, 12::bigint, 10::bigint, null::numeric, 'haut_depasse_bas'::text) $$,
  'une part à un mois (Formation, taux de présence) : 12 sur 10 est à vérifier');
select results_eq($$
  select annee_haut, annee_bas, annee_resultat, annee_nb_periodes
    from public.v_calcul where indicateur_id = pg_temp.calcul('formation', 'formation_taux_de_presence')
$$, $$ select case when m1 >= janvier then 12::bigint end, case when m1 >= janvier then 10::bigint end,
              null::numeric, (m1 >= janvier)::int
         from ctx $$,
  'sur l''année, Σ haut au-dessus de Σ bas : annee_resultat est null (jamais 120 %), la somme reste lisible');
select results_eq($$
  select resultat, non_calcule_raison
    from public.v_calcul where indicateur_id = pg_temp.calcul('mcad', 'mcad_taux_de_presence_des_equipiers')
$$, $$ values (0::numeric, null::text) $$, 'une part dont le haut vaut 0 se calcule : 0 %, pas « Non calculé »');
select results_eq($$
  select resultat, non_calcule_raison
    from public.v_calcul where indicateur_id = pg_temp.calcul('film', 'film_taux_de_livraison_dans_les_delais')
$$, $$ values (null::numeric, 'bas_nul'::text) $$, 'une part dont le bas vaut 0 (haut 3) : bas_nul, avant haut_depasse_bas');
select results_eq($$
  select resultat, non_calcule_raison
    from public.v_calcul where indicateur_id = pg_temp.calcul('tech', 'tech_taux_de_resolution_des_demandes')
$$, $$ values (120::numeric, null::text) $$, 'un taux qui n''est pas une part peut dépasser 100 % (Taux de résolution des demandes)');
select results_eq($$
  select resultat, non_calcule_raison
    from public.v_calcul where indicateur_id = pg_temp.calcul('formation', 'formation_taux_de_satisfaction')
$$, $$ values (100::numeric, null::text) $$, 'une part dont le haut égale le bas se calcule : 100 %');
select tests.deconnecter();

select is(tests.lire((select admin from ctx), 'aal2',
    format('select haut, resultat, non_calcule_raison from public.v_calcul where indicateur_id = %L',
           pg_temp.calcul('securite', 'securite_taux_de_couverture_des_postes'))),
  '[{"haut": null, "resultat": null, "non_calcule_raison": null}]'::jsonb,
  'l''administration lit la ligne de la part sans valeur ni raison');
select throws_ok($$
  update public.indicateur set part = false where id = pg_temp.calcul('securite', 'securite_taux_de_couverture_des_postes')
$$, '42501', 'Le sens d''un indicateur est figé : remplacez-le pour en changer.', 'part est figée, même pour le propriétaire');
select throws_ok($$
  insert into public.indicateur (libelle, definition, nature, ministere_id, calcul, part)
  select 'Essai moyenne part', 'Moyenne d''essai marquée part.', 'mois', ministere, 'moyenne', true
    from essai where modele = 'tech'
$$, '23514', 'new row for relation "indicateur" violates check constraint "indicateur_part_check"',
  'seul un taux est une part');

-- 4. Jeu d'exemple

select is(tests.lire((select berger from ctx), 'aal2', $$
  select s.derniere_periode = (select m1 from ctx) as dernier_mois, s.derniere_valeur, s.derniere_moins_de_3
    from public.v_indicateur_suivi s
    join public.indicateur i on i.id = s.indicateur_id
   where i.modele_code = 'social_beneficiaires_passages' and i.ministere_id = tests.ministere('Social')
$$), '[{"dernier_mois": true, "derniere_valeur": null, "derniere_moins_de_3": true}]'::jsonb,
  'jeu d''exemple : le sensible de Social vaut 2 le dernier mois, « moins de 3 » pour le berger');
select is(tests.lire((select berger from ctx), 'aal2', $$
  select c.haut, c.bas, c.resultat, c.non_calcule_raison
    from public.v_calcul c
    join public.indicateur i on i.id = c.indicateur_id
   where i.modele_code = 'formation_taux_de_satisfaction' and i.ministere_id = tests.ministere('EJP Formation')
$$), '[{"bas": 10, "haut": 12, "resultat": null, "non_calcule_raison": "haut_depasse_bas"}]'::jsonb,
  'jeu d''exemple : le taux de satisfaction de Formation est à vérifier (12 pour 10)');
select results_eq($$
  select array_agg(distinct i.unite order by i.unite)
    from public.mesure m join public.indicateur i on i.id = m.indicateur_id
   where i.ministere_id is not null and i.code is null
$$, $$ values (array['euros', 'grand_nombre', 'heure', 'jours', 'nombre']) $$,
  'jeu d''exemple : une valeur par unité');
select results_eq($$
  select i.modele_code, i.etat, i.retrait_motif, v.decision, (select count(*) from public.mesure m where m.indicateur_id = i.id)::int
    from public.indicateur i
    join public.demande_indicateur d on d.indicateur_id = i.id
    left join public.validation v on v.demande_id = d.id
   where i.ministere_id = tests.ministere('Jeunesse')
   order by i.modele_code
$$, $$ values ('suggestion_activites_realisees'::text, 'actif'::text, null::text, 'valide'::text, 1),
              ('suggestion_participants', 'en_attente', null, null, 1),
              ('suggestion_projets_realises', 'retire', 'refuse', 'refuse', 0) $$,
  'jeu d''exemple : un ajout validé, un à valider (déjà saisi), un refusé');
select results_eq($$
  select i.etat, i.retrait_motif, (select count(*) from public.mesure m where m.indicateur_id = i.id)::int
    from public.indicateur i
   where i.modele_code = 'integration_presences_d_equipiers_aux_evenements' and i.ministere_id = tests.ministere('Intégration')
$$, $$ values ('retire'::text, 'plus_suivi'::text, 3) $$, 'jeu d''exemple : un indicateur retiré avec ses saisies');

select * from finish();
rollback;
