-- Étape 4, lot B4 : vague 1 des indicateurs (docs/plan-etape-4.md, section 4, « B4 » ;
-- docs/conception/vague-1-decisions.md, sections 4 à 6 ; docs/conformite/libelles-a-valider.md ;
-- docs/conception/contrat-etape-4.md, sections 5 et 6 ; configuration-indicateurs.md 5.5 et 5.11).
--
-- 1. Part (réponse écrite de la personne responsable du 6 octobre 2026, question 1, changement du
--    modèle de données approuvé) : colonne part sur indicateur et sur private.indicateur_prevu. Un
--    taux qui est une part (« plafond 100 % » du catalogue) ne dépasse jamais 100 % : quand son
--    haut dépasse son bas, v_calcul rend « Non calculé, à vérifier » (non_calcule_raison
--    haut_depasse_bas), jamais 120 % ni un 100 % plafonné. part ne vaut vrai que pour un taux et
--    se fige comme le reste du sens.
-- 2. Catalogue de la vague 1 dans private.indicateur_prevu : 21 modèles (un par ministère de la
--    liste de la coordination, Protocole et Prodiges Academy n'en ont pas), 161 indicateurs saisis
--    (11 sensibles, actifs dès leur création, P42, sans catégories : lot B8), 41 calculs (29 taux
--    et moyennes lus dès la V1, 12 calculs étendus écrits avec leurs termes et invisibles jusqu'au
--    lot L1), 15 parts, et les 11 suggestions communes. Libellés et définitions copiés de
--    vague-1-decisions.md, section 4 (identiques à libelles-a-valider.md). La définition d'un
--    calcul est le texte « Comment il se calcule » de libelles-a-valider.md ; quatre textes de
--    plus de 140 caractères gardent leur première phrase (Retard du début du culte, Taux de
--    réalisation des événements, Évolution de l'audience, Délai d'attente moyen) et Taux de
--    complétion perd sa phrase du milieu. Les définitions des suggestions sont génériques (« par
--    le ministère ») ; celles qui existent déjà comme prévus (Activités réalisées, Participants,
--    Nouveaux participants, Projets réalisés de Kumi et d'Eagles) en reprennent le texte.
-- 3. Libellés des communs (X6) : private.libelle_commun (13 lignes, dont les 2 lignes de
--    référence de l'église pour MDS), lue par private.communs_de_fiche() derrière la vue
--    v_commun_fiche (security_invoker). Le modèle d'une fiche est celui de ses prévus.
-- 4. creer_indicateurs_prevus recopie part (même signature, même corps sinon).
-- 5. v_calcul réécrite (mêmes colonnes) : code haut_depasse_bas pour une part ; sur l'année, une
--    période d'une part dont le haut dépasse le bas sort de la somme et de la complétude.
--
-- Valeurs de départ de Production (Budget matériel prévu 5 164 €, Personnes formées (total) 25,
-- Projets annulés de mars 2026 : 1) : ce sont des saisies du ministère à la mise en service, pas
-- des données du catalogue ; aucune ligne ici (le ministère et son compte n'existent qu'en
-- préproduction et en production).
--
-- Aucune donnée personnelle ; aucune date du jour dans une contrainte ; dates métier à l'heure de
-- Paris (private.aujourdhui(), private.mois_courant(), private.dimanche_reference()).

-- 1. Part

alter table public.indicateur
  add column part boolean not null default false,
  add constraint indicateur_part_check check (not part or calcul = 'taux');

alter table private.indicateur_prevu
  add column part boolean not null default false,
  add constraint indicateur_prevu_part_check check (not part or calcul = 'taux');

-- part fait partie du sens : figé comme lui (controler_indicateur, lot B1, fige le reste).
create function private.figer_part() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.part is distinct from old.part then
    raise exception 'Le sens d''un indicateur est figé : remplacez-le pour en changer.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger figer_part before update on public.indicateur
  for each row execute function private.figer_part();

-- 2. Catalogue de la vague 1
--
-- Code : modèle et libellé normalisés. Ordre : saisis dans l'ordre du catalogue, puis calculs.
-- Rythme « Semaine » : nature dimanche (semaine du lundi au dimanche). Somme « non » : sans_somme.

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, unite, sensible, calcul, part,
                                      sans_somme, saisi_dimanche_matin, libelle_sessions, ordre) values
  ('integration_nouveaux_arrivants_na', 'integration', 'Nouveaux arrivants (NA)',
   'Personnes venues au culte pour la première fois ce dimanche, sans décision ce jour. Une personne compte une fois.',
   'dimanche', 'nombre', false, null, false, false, false, false, 1),
  ('integration_nouveaux_convertis_nc', 'integration', 'Nouveaux convertis (NC)',
   'Personnes qui prennent ce dimanche une première décision de suivre le Christ. Une personne est NA ou NC.',
   'dimanche', 'nombre', false, null, false, false, false, false, 2),
  ('integration_welcome_prodiges_sessions', 'integration', 'Welcome Prodiges : sessions',
   'Sessions de Welcome Prodiges tenues dans le mois. Si aucune, enregistrez 0.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('integration_welcome_prodiges_presents', 'integration', 'Welcome Prodiges : présents',
   'Personnes accueillies présentes aux sessions du mois, séances additionnées. L''équipe d''accueil n''est pas comptée.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('integration_na_revenus_au_culte', 'integration', 'NA revenus au culte',
   'Parmi les NA des dimanches du mois précédent, ceux revenus au moins un dimanche ce mois. Un total, sans liste.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('integration_integres_en_fij_na_et_nc', 'integration', 'Intégrés en FIJ (NA et NC)',
   'NA et NC entrés dans une FIJ dans le mois. Une personne compte une fois.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('integration_sans_nouvelles_apres_3_mois', 'integration', 'Sans nouvelles après 3 mois',
   'Parmi les NA et NC accueillis il y a 3 mois, ceux dont l''équipe n''a plus de nouvelles. Un total, sans liste.',
   'mois', 'nombre', false, null, false, false, false, false, 7),
  ('integration_presences_d_equipiers_aux_evenements', 'integration', 'Présences d''équipiers aux événements',
   'Présences de l''équipe d''Intégration aux événements hors dimanche. Une personne compte à chaque événement.',
   'mois', 'nombre', false, null, false, false, false, false, 8),
  ('integration_welcome_prodiges_presents_par_session', 'integration', 'Welcome Prodiges : présents par session',
   'Moyenne du mois : « Welcome Prodiges : présents » divisés par « Welcome Prodiges : sessions ».',
   'mois', 'nombre', false, 'moyenne', false, false, false, false, 9),
  ('integration_taux_de_retour_des_na', 'integration', 'Taux de retour des NA',
   '« NA revenus au culte » du mois, divisés par la somme des NA des dimanches du mois précédent.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 10),
  ('integration_taux_de_conversion_na_vers_fij', 'integration', 'Taux de conversion NA vers FIJ',
   '« Intégrés en FIJ (NA et NC) » du mois, divisés par la somme des NA et des NC des dimanches du même mois.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 11),
  ('integration_taux_de_perte', 'integration', 'Taux de perte',
   '« Sans nouvelles après 3 mois » d''un mois, divisés par la somme des NA et des NC des dimanches du mois d''il y a 3 mois.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 12),
  ('coordination_bapteme_baptises', 'coordination', 'Baptême : baptisés',
   'Personnes baptisées dans le mois, toutes sessions de baptême additionnées.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('coordination_bapteme_sessions', 'coordination', 'Baptême : sessions',
   'Sessions de baptême tenues dans le mois. Si aucune, enregistrez 0.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('coordination_bapteme_baptises_a_la_derniere_session_du_mois', 'coordination', 'Baptême : baptisés à la dernière session du mois',
   'Personnes baptisées à la dernière session de baptême du mois. Si aucune session, enregistrez 0.',
   'mois', 'nombre', false, null, false, true, false, false, 3),
  ('coordination_heure_de_debut_du_culte', 'coordination', 'Heure de début du culte',
   'Heure réelle à laquelle le culte de ce dimanche a commencé.',
   'dimanche', 'heure', false, null, false, true, false, false, 4),
  ('coordination_heure_prevue_du_culte', 'coordination', 'Heure prévue du culte',
   'Heure de début prévue du culte du dimanche, à la date de la saisie.',
   'a_ce_jour', 'heure', false, null, false, true, false, false, 5),
  ('coordination_evenements_commences_a_l_heure', 'coordination', 'Événements commencés à l''heure',
   'Parmi les événements terminés du mois déclarés dans l''outil, ceux commencés au plus 5 minutes après l''heure prévue.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('coordination_bapteme_baptises_par_session', 'coordination', 'Baptême : baptisés par session',
   'Moyenne du mois : « Baptême : baptisés » divisés par « Baptême : sessions ».',
   'mois', 'nombre', false, 'moyenne', false, false, false, false, 7),
  ('coordination_retard_du_debut_du_culte', 'coordination', 'Retard du début du culte',
   'Écart en minutes entre « Heure de début du culte » et l''« Heure prévue du culte » en vigueur ce dimanche.',
   'dimanche', 'nombre', false, 'difference', false, false, false, false, 8),
  ('coordination_taux_de_realisation_des_evenements', 'coordination', 'Taux de réalisation des événements',
   'Événements réalisés, divisés par la somme des réalisés, des annulés et des passés sans état final.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 9),
  ('coordination_part_des_evenements_a_l_heure', 'coordination', 'Part des événements à l''heure',
   '« Événements commencés à l''heure » divisés par « Événements réalisés (église) » du même mois. Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 10),
  ('communication_publications', 'communication', 'Publications',
   'Mises en ligne sur un compte de l''église dans le mois. Une publication reprise sur deux plateformes compte une fois.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('communication_campagnes_terminees', 'communication', 'Campagnes terminées',
   'Ensembles de publications autour d''un thème, comptés le mois où ils se terminent.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('communication_contenus_produits', 'communication', 'Contenus produits',
   'Visuels, vidéos ou textes créés dans le mois, publiés ou non.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('communication_portee_toutes_plateformes', 'communication', 'Portée (toutes plateformes)',
   'Portée du mois relevée sur les statistiques de tous les comptes de l''église, plateformes additionnées.',
   'mois', 'grand_nombre', false, null, false, false, false, false, 4),
  ('communication_interactions_toutes_plateformes', 'communication', 'Interactions (toutes plateformes)',
   'J''aime, commentaires, partages et enregistrements du mois, relevés sur tous les comptes de l''église.',
   'mois', 'grand_nombre', false, null, false, false, false, false, 5),
  ('communication_vues_toutes_plateformes', 'communication', 'Vues (toutes plateformes)',
   'Vues du mois relevées sur tous les comptes de l''église, plateformes additionnées.',
   'mois', 'grand_nombre', false, null, false, false, false, false, 6),
  ('communication_abonnes_toutes_plateformes', 'communication', 'Abonnés (toutes plateformes)',
   'Abonnés de tous les comptes de l''église le jour du relevé, plateformes additionnées. Relevé une fois par mois.',
   'a_ce_jour', 'grand_nombre', false, null, false, true, false, false, 7),
  ('communication_demandes_recues', 'communication', 'Demandes reçues',
   'Demandes de communication reçues des ministères et de l''équipe pastorale dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 8),
  ('communication_demandes_traitees', 'communication', 'Demandes traitées',
   'Demandes de communication menées à terme dans le mois, quel que soit leur mois d''arrivée.',
   'mois', 'nombre', false, null, false, false, false, false, 9),
  ('communication_demandes_traitees_dans_les_delais', 'communication', 'Demandes traitées dans les délais',
   'Demandes traitées à la date convenue avec le demandeur, sinon sous 7 jours calendaires.',
   'mois', 'nombre', false, null, false, false, false, false, 10),
  ('communication_taux_d_engagement', 'communication', 'Taux d''engagement',
   '« Interactions (toutes plateformes) » divisées par « Portée (toutes plateformes) » du même mois.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 11),
  ('communication_taux_de_demandes_traitees_dans_les_delais', 'communication', 'Taux de demandes traitées dans les délais',
   '« Demandes traitées dans les délais » divisées par « Demandes traitées ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 12),
  ('communication_evolution_des_vues', 'communication', 'Évolution des vues',
   'Pour « Vues (toutes plateformes) » : écart avec le mois précédent et depuis janvier, en nombre et en %.',
   'mois', 'grand_nombre', false, 'evolution', false, false, false, false, 13),
  ('communication_evolution_des_abonnes', 'communication', 'Évolution des abonnés',
   'Même écart pour « Abonnés (toutes plateformes) », pris en fin de mois.',
   'mois', 'grand_nombre', false, 'evolution', false, false, false, false, 14),
  ('social_actions_sociales', 'social', 'Actions sociales',
   'Actions sociales menées et terminées dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('social_beneficiaires_passages', 'social', 'Bénéficiaires (passages)',
   'Aides apportées dans le mois. Chaque passage compte une fois, même pour une personne déjà aidée.',
   'mois', 'nombre', true, null, false, false, false, false, 2),
  ('social_personnes_accompagnees', 'social', 'Personnes accompagnées',
   'Personnes qui ont eu au moins un entretien de suivi dans le mois. Une personne compte une fois.',
   'mois', 'nombre', true, null, false, false, false, false, 3),
  ('social_nouveaux_beneficiaires', 'social', 'Nouveaux bénéficiaires',
   'Personnes aidées pour la première fois dans le mois. Un total, sans liste.',
   'mois', 'nombre', true, null, false, false, false, false, 4),
  ('social_partenariats_actifs', 'social', 'Partenariats actifs',
   'Partenariats en cours avec des structures extérieures, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 5),
  ('social_actions_externes', 'social', 'Actions externes',
   'Actions menées avec un partenaire extérieur ou chez lui dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('social_fonds_leves', 'social', 'Fonds levés',
   'Fonds levés dans le mois, à l''euro près, sans nom de donateur. La comptabilité de l''église fait foi.',
   'mois', 'euros', false, null, false, false, false, false, 7),
  ('film_tournages', 'film', 'Tournages',
   'Tournages terminés dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('film_videos_produites', 'film', 'Vidéos produites',
   'Vidéos montées et terminées dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('film_videos_publiees', 'film', 'Vidéos publiées',
   'Vidéos de Film mises en ligne dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('film_projets_en_cours', 'film', 'Projets en cours',
   'Projets vidéo lancés et pas encore livrés, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 4),
  ('film_projets_termines', 'film', 'Projets terminés',
   'Projets vidéo livrés dans le mois. Un projet est un film, un clip ou un reportage avec une date convenue.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('film_projets_livres_dans_les_delais', 'film', 'Projets livrés dans les délais',
   'Projets terminés du mois livrés à la date convenue au lancement, ou avant.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('film_vues_des_videos_film', 'film', 'Vues des vidéos Film',
   'Vues du mois des vidéos de Film, relevées sur les statistiques des plateformes où Film publie.',
   'mois', 'grand_nombre', false, null, false, false, false, false, 7),
  ('film_jours_de_production_des_projets_termines', 'film', 'Jours de production des projets terminés',
   'Somme, pour les projets terminés du mois, des jours calendaires entre lancement et livraison.',
   'mois', 'jours', false, null, false, true, false, false, 8),
  ('film_delai_moyen_de_production', 'film', 'Délai moyen de production',
   'Moyenne : « Jours de production des projets terminés » divisés par « Projets terminés ».',
   'mois', 'jours', false, 'moyenne', false, false, false, false, 9),
  ('film_taux_de_livraison_dans_les_delais', 'film', 'Taux de livraison dans les délais',
   '« Projets livrés dans les délais » divisés par « Projets terminés ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 10),
  ('tech_demandes_recues', 'tech', 'Demandes reçues',
   'Demandes d''aide ou de travail reçues des ministères et de l''équipe dans le mois, sans nom ni objet.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('tech_demandes_resolues', 'tech', 'Demandes résolues',
   'Demandes closes dans le mois, quel que soit leur mois d''arrivée.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('tech_demandes_en_cours', 'tech', 'Demandes en cours',
   'Demandes ouvertes, pas encore résolues, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 3),
  ('tech_incidents_techniques', 'tech', 'Incidents techniques',
   'Pannes ou dysfonctionnements des outils numériques de l''église survenus dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('tech_incidents_recurrents', 'tech', 'Incidents récurrents',
   'Incidents du mois dont la même cause s''est déjà produite dans les 30 jours avant. Chaque répétition compte.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('tech_jours_de_resolution_des_demandes_resolues', 'tech', 'Jours de résolution des demandes résolues',
   'Somme, pour les demandes résolues du mois, des jours calendaires entre réception et résolution (0 le jour même).',
   'mois', 'jours', false, null, false, true, false, false, 6),
  ('tech_temps_moyen_de_resolution', 'tech', 'Temps moyen de résolution',
   'Moyenne : « Jours de résolution des demandes résolues » divisés par « Demandes résolues ».',
   'mois', 'jours', false, 'moyenne', false, false, false, false, 7),
  ('tech_taux_de_resolution_des_demandes', 'tech', 'Taux de résolution des demandes',
   '« Demandes résolues » divisées par « Demandes reçues ». Peut dépasser 100 % (des demandes d''un mois précédent peuvent être closes).',
   'mois', 'nombre', false, 'taux', false, false, false, false, 8),
  ('mcad_evenements_couverts', 'mcad', 'Événements couverts',
   'Événements filmés ou diffusés par MCAD dans le mois, cultes compris.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('mcad_evenements_a_couvrir', 'mcad', 'Événements à couvrir',
   'Événements pour lesquels une captation ou une diffusion a été demandée à MCAD dans le mois, couverts ou non.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('mcad_cultes_captes', 'mcad', 'Cultes captés',
   'Cultes filmés ce dimanche. Si aucun, enregistrez 0.',
   'dimanche', 'nombre', false, null, false, false, false, false, 3),
  ('mcad_diffusions_en_direct', 'mcad', 'Diffusions en direct',
   'Cultes et événements diffusés en direct dans le mois, toutes plateformes. Les « lives » comptent ici.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('mcad_contenus_audiovisuels_produits', 'mcad', 'Contenus audiovisuels produits',
   'Vidéos, replays et extraits terminés dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('mcad_plateformes_de_diffusion', 'mcad', 'Plateformes de diffusion',
   'Plateformes où MCAD diffuse le jour de la saisie (par exemple YouTube, Instagram).',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 6),
  ('mcad_pic_de_spectateurs_du_direct', 'mcad', 'Pic de spectateurs du direct',
   'Plus grand nombre de spectateurs connectés en même temps au direct du culte de ce dimanche.',
   'dimanche', 'grand_nombre', false, null, false, true, false, false, 7),
  ('mcad_vues_des_diffusions_mcad', 'mcad', 'Vues des diffusions MCAD',
   'Vues du mois des directs et replays de MCAD, relevées sur les statistiques des plateformes.',
   'mois', 'grand_nombre', false, null, false, false, false, false, 8),
  ('mcad_problemes_audio', 'mcad', 'Problèmes audio',
   'Problèmes de son pendant une captation ou un direct du mois, sans coupure du direct.',
   'mois', 'nombre', false, null, false, false, false, false, 9),
  ('mcad_problemes_video', 'mcad', 'Problèmes vidéo',
   'Problèmes d''image pendant une captation ou un direct du mois, sans coupure du direct.',
   'mois', 'nombre', false, null, false, false, false, false, 10),
  ('mcad_interruptions_de_diffusion', 'mcad', 'Interruptions de diffusion',
   'Coupures d''un direct dans le mois, quelle qu''en soit la cause. Une coupure ne compte pas en audio ou vidéo.',
   'mois', 'nombre', false, null, false, false, false, false, 11),
  ('mcad_mobilises_aux_evenements', 'mcad', 'Mobilisés aux événements',
   'Présences d''équipiers de MCAD aux événements hors dimanche. Une personne compte à chaque événement où elle sert.',
   'mois', 'nombre', false, null, false, false, false, false, 12),
  ('mcad_personnes_formees', 'mcad', 'Personnes formées',
   'Équipiers qui ont suivi une formation de MCAD dans le mois, sans liste.',
   'mois', 'nombre', false, null, false, false, false, false, 13),
  ('mcad_nouveaux_equipiers_integres', 'mcad', 'Nouveaux équipiers intégrés',
   'Personnes entrées dans l''équipe de MCAD dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 14),
  ('mcad_postes_d_equipe_prevus', 'mcad', 'Postes d''équipe prévus',
   'Postes d''équipe prévus au planning du mois, dimanches et événements additionnés.',
   'mois', 'nombre', false, null, false, false, false, false, 15),
  ('mcad_postes_d_equipe_tenus', 'mcad', 'Postes d''équipe tenus',
   'Postes du planning du mois effectivement tenus par un équipier.',
   'mois', 'nombre', false, null, false, false, false, false, 16),
  ('mcad_taux_de_couverture_des_evenements', 'mcad', 'Taux de couverture des événements',
   '« Événements couverts » divisés par « Événements à couvrir ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 17),
  ('mcad_vues_par_evenement_couvert', 'mcad', 'Vues par événement couvert',
   'Moyenne : « Vues des diffusions MCAD » divisées par « Événements couverts ».',
   'mois', 'grand_nombre', false, 'moyenne', false, false, false, false, 18),
  ('mcad_taux_de_presence_des_equipiers', 'mcad', 'Taux de présence des équipiers',
   '« Postes d''équipe tenus » divisés par « Postes d''équipe prévus ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 19),
  ('mcad_evolution_de_l_audience', 'mcad', 'Évolution de l''audience',
   'Écart entre le « Pic de spectateurs du direct » de ce dimanche et celui du dimanche précédent, seulement si ce dernier est saisi.',
   'dimanche', 'grand_nombre', false, 'evolution', false, false, false, false, 20),
  ('mcad_incidents_techniques', 'mcad', 'Incidents techniques',
   'Somme : « Problèmes audio » + « Problèmes vidéo » + « Interruptions de diffusion ». Un incident compte dans une seule catégorie.',
   'mois', 'nombre', false, 'somme', false, false, false, false, 21),
  ('mpi_priere_des_stars_sessions', 'mpi', 'Prière des Stars : sessions',
   'Prières des Stars tenues dans la semaine du lundi au dimanche. Si aucune, enregistrez 0.',
   'dimanche', 'nombre', false, null, false, false, false, false, 1),
  ('mpi_priere_des_stars_presents', 'mpi', 'Prière des Stars : présents',
   'Présences aux Prières des Stars de la semaine, séances additionnées. Aucun nom.',
   'dimanche', 'nombre', false, null, false, false, false, false, 2),
  ('mpi_priere_des_stars_attendus', 'mpi', 'Prière des Stars : attendus',
   'Personnes attendues aux Prières des Stars de la semaine (inscrites ou prévues), séances additionnées.',
   'dimanche', 'nombre', false, null, false, false, false, false, 3),
  ('mpi_chaine_de_priere_presents', 'mpi', 'Chaîne de prière : présents',
   'Personnes présentes à la chaîne de prière du dimanche, comptées une fois chacune.',
   'dimanche', 'nombre', false, null, false, false, false, false, 4),
  ('mpi_chaine_de_priere_presents_la_nuit', 'mpi', 'Chaîne de prière : présents la nuit',
   'Personnes présentes à la chaîne de prière la nuit du samedi au dimanche. À saisir le dimanche matin.',
   'dimanche', 'nombre', false, null, false, false, true, false, 5),
  ('mpi_chaine_de_priere_attendus', 'mpi', 'Chaîne de prière : attendus',
   'Personnes prévues au planning de la chaîne de prière du dimanche.',
   'dimanche', 'nombre', false, null, false, false, false, false, 6),
  ('mpi_chaine_de_priere_personnes_differentes', 'mpi', 'Chaîne de prière : personnes différentes',
   'Personnes différentes venues à la chaîne de prière dans le mois, comptées hors outil, sans nom.',
   'mois', 'nombre', false, null, false, true, false, false, 7),
  ('mpi_sainte_cene_personnes_dans_l_equipe', 'mpi', 'Sainte cène : personnes dans l''équipe',
   'Personnes de l''équipe sainte cène le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 8),
  ('mpi_sainte_cene_portions_distribuees', 'mpi', 'Sainte cène : portions distribuées',
   'Portions de sainte cène distribuées au culte de ce dimanche. On compte des portions, pas des personnes.',
   'dimanche', 'nombre', false, null, false, false, false, false, 9),
  ('mpi_priere_des_stars_presents_par_session', 'mpi', 'Prière des Stars : présents par session',
   'Moyenne : « Prière des Stars : présents » divisés par « Prière des Stars : sessions ».',
   'dimanche', 'nombre', false, 'moyenne', false, false, false, false, 10),
  ('mpi_priere_des_stars_taux_de_participation', 'mpi', 'Prière des Stars : taux de participation',
   '« Prière des Stars : présents » divisés par « Prière des Stars : attendus ». Plafonné à 100 %.',
   'dimanche', 'nombre', false, 'taux', true, false, false, false, 11),
  ('mpi_chaine_de_priere_taux_de_participation', 'mpi', 'Chaîne de prière : taux de participation',
   '« Chaîne de prière : présents » divisés par « Chaîne de prière : attendus ». Plafonné à 100 %.',
   'dimanche', 'nombre', false, 'taux', true, false, false, false, 12),
  ('sante_evenements_couverts', 'sante', 'Événements couverts',
   'Événements EJP où l''équipe santé a assuré sa présence dans le mois, cultes compris.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('sante_evenements_a_couvrir', 'sante', 'Événements à couvrir',
   'Événements EJP où l''équipe santé devait être présente dans le mois, couverts ou non.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('sante_prises_en_charge', 'sante', 'Prises en charge',
   'Personnes prises en charge par l''équipe santé dans le mois, une fois chacune. Aucun détail.',
   'mois', 'nombre', true, null, false, false, false, false, 3),
  ('sante_interventions', 'sante', 'Interventions',
   'Gestes de l''équipe (soin, appel aux secours) dans le mois. Une prise en charge peut en compter plusieurs.',
   'mois', 'nombre', true, null, false, false, false, false, 4),
  ('sante_incidents_avec_intervention', 'sante', 'Incidents avec intervention',
   'Incidents (malaise, chute, accident) du mois qui ont demandé l''équipe santé ou les secours.',
   'mois', 'nombre', true, null, false, false, false, false, 5),
  ('sante_orientations_vers_une_structure_ou_un_professionnel', 'sante', 'Orientations vers une structure ou un professionnel',
   'Personnes orientées vers une structure de santé ou un professionnel dans le mois.',
   'mois', 'nombre', true, null, false, false, false, false, 6),
  ('sante_mobilises_aux_evenements', 'sante', 'Mobilisés aux événements',
   'Présences de l''équipe santé aux événements hors dimanche. Une personne compte à chaque événement où elle sert.',
   'mois', 'nombre', false, null, false, false, false, false, 7),
  ('sante_taux_de_couverture_des_evenements', 'sante', 'Taux de couverture des événements',
   '« Événements couverts » divisés par « Événements à couvrir ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 8),
  ('merch_chiffre_d_affaires', 'merch', 'Chiffre d''affaires',
   'Montant des ventes du mois, à l''euro près, tous lieux confondus. La comptabilité de l''église fait foi.',
   'mois', 'euros', false, null, false, false, false, false, 1),
  ('merch_articles_vendus', 'merch', 'Articles vendus',
   'Articles vendus dans le mois, au culte, aux événements et ailleurs, toutes tailles confondues.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('merch_commandes', 'merch', 'Commandes',
   'Ventes enregistrées dans le mois. Une vente compte pour une commande, quel que soit le nombre d''articles.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('merch_articles_vendus_vetements', 'merch', 'Articles vendus : vêtements',
   'Vêtements vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('merch_articles_vendus_accessoires', 'merch', 'Articles vendus : accessoires',
   'Accessoires vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('merch_articles_vendus_autres_articles', 'merch', 'Articles vendus : autres articles',
   'Autres articles vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('merch_cout_d_achat_des_articles_vendus', 'merch', 'Coût d''achat des articles vendus',
   'Prix d''achat ou de fabrication des articles vendus dans le mois, à l''euro près.',
   'mois', 'euros', false, null, false, false, false, false, 7),
  ('merch_stock_disponible', 'merch', 'Stock disponible',
   'Articles du merch en réserve le jour de la saisie, toutes tailles confondues.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 8),
  ('merch_produits_en_stock_critique', 'merch', 'Produits en stock critique',
   'Produits dont le stock est sous le seuil de réassort fixé par Merch, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 9),
  ('merch_panier_moyen', 'merch', 'Panier moyen',
   'Moyenne : « Chiffre d''affaires » divisé par « Commandes », en euros, avec une décimale.',
   'mois', 'euros', false, 'moyenne', false, false, false, false, 10),
  ('merch_marge_estimee', 'merch', 'Marge estimée',
   '« Chiffre d''affaires » moins « Coût d''achat des articles vendus ». Elle est « estimée » parce que les frais généraux ne sont pas comptés.',
   'mois', 'euros', false, 'difference', false, false, false, false, 11),
  ('merch_evolution_des_ventes', 'merch', 'Évolution des ventes',
   'Pour « Chiffre d''affaires » : écart avec le mois précédent et depuis janvier, en euros et en %.',
   'mois', 'euros', false, 'evolution', false, false, false, false, 12),
  ('production_evenements_couverts', 'production', 'Événements couverts',
   'Événements EJP couverts par Production dans le mois : cultes, veillées, baptêmes, camps, conférence.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('production_mag_projets_produits', 'production', 'Mag : projets produits',
   'Magazines produits dans la semaine du lundi au dimanche. Si aucun, enregistrez 0.',
   'dimanche', 'nombre', false, null, false, false, false, false, 2),
  ('production_photo_projets_produits', 'production', 'Photo : projets produits',
   'Projets photo produits dans la semaine du lundi au dimanche. Si aucun, enregistrez 0.',
   'dimanche', 'nombre', false, null, false, false, false, false, 3),
  ('production_projets_en_cours', 'production', 'Projets en cours',
   'Projets de production en cours le jour de la saisie, formations comprises.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 4),
  ('production_projets_annules', 'production', 'Projets annulés',
   'Projets de production annulés dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('production_budget_materiel_prevu', 'production', 'Budget matériel prévu',
   'Budget prévu pour le matériel de Production, à l''euro près, le jour de la saisie. Première valeur : le devis.',
   'a_ce_jour', 'euros', false, null, false, true, false, false, 6),
  ('production_personnes_formees_total', 'production', 'Personnes formées (total)',
   'Personnes formées par Production depuis ses premières formations, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 7),
  ('prodiges_musique_chanteurs_de_l_equipe', 'prodiges musique', 'Chanteurs de l''équipe',
   'Chanteurs et choristes de l''équipe le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 1),
  ('prodiges_musique_musiciens_de_l_equipe', 'prodiges musique', 'Musiciens de l''équipe',
   'Instrumentistes de l''équipe le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 2),
  ('prodiges_musique_morceaux_prepares', 'prodiges musique', 'Morceaux préparés',
   'Morceaux préparés par l''équipe dans le mois pour le culte ou un événement.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('prodiges_musique_morceaux_originaux_realises', 'prodiges musique', 'Morceaux originaux réalisés',
   'Morceaux originaux de Prodiges Musique terminés dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('prodiges_musique_repetitions_presents', 'prodiges musique', 'Répétitions : présents',
   'Présences aux répétitions de la semaine du lundi au dimanche, séances additionnées. Aucun nom.',
   'dimanche', 'nombre', false, null, false, false, false, false, 5),
  ('prodiges_musique_repetitions_attendus', 'prodiges musique', 'Répétitions : attendus',
   'Présences attendues aux répétitions de la semaine, séances additionnées, selon le planning.',
   'dimanche', 'nombre', false, null, false, false, false, false, 6),
  ('prodiges_musique_repetitions_taux_de_presence', 'prodiges musique', 'Répétitions : taux de présence',
   '« Répétitions : présents » divisés par « Répétitions : attendus ». Plafonné à 100 %.',
   'dimanche', 'nombre', false, 'taux', true, false, false, false, 7),
  ('kumi_activites_realisees', 'kumi', 'Activités réalisées',
   'Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('kumi_participantes', 'kumi', 'Participantes',
   'Femmes venues à au moins une activité dans le mois, comptées une fois, hors outil.',
   'mois', 'nombre', false, null, false, true, false, false, 2),
  ('kumi_nouvelles_participantes', 'kumi', 'Nouvelles participantes',
   'Femmes venues à une activité pour la première fois dans le mois. Un total, sans liste.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('kumi_projets_realises', 'kumi', 'Projets réalisés',
   'Projets de plusieurs semaines menés à terme dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('kumi_femmes_inscrites', 'kumi', 'Femmes inscrites',
   'Femmes inscrites aux activités de Kumi le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 5),
  ('kumi_nouvelles_integrations_dans_les_equipes', 'kumi', 'Nouvelles intégrations dans les équipes',
   'Personnes qui ont rejoint une équipe de Kumi dans le mois. Différent des nouveaux STARs comptés par MDS.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('kumi_pages_roses_prestataires_inscrites', 'kumi', 'Pages Roses : prestataires inscrites',
   'Prestataires inscrites sur Pages Roses le jour du relevé, selon la plateforme. Relevé une fois par mois.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 7),
  ('kumi_pages_roses_profils_actifs', 'kumi', 'Pages Roses : profils actifs',
   'Profils que Pages Roses compte comme actifs le jour du relevé. Relevé une fois par mois.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 8),
  ('kumi_pages_roses_demandes_de_mise_en_relation', 'kumi', 'Pages Roses : demandes de mise en relation',
   'Demandes de mise en relation reçues sur Pages Roses dans le mois, selon la plateforme.',
   'mois', 'nombre', false, null, false, false, false, false, 9),
  ('kumi_pages_roses_reservations', 'kumi', 'Pages Roses : réservations',
   'Réservations enregistrées sur Pages Roses dans le mois, selon la plateforme.',
   'mois', 'nombre', false, null, false, false, false, false, 10),
  ('kumi_call_your_sister_prises_en_charge', 'kumi', 'Call your sister : prises en charge',
   'Prises en charge de Call your sister dans le mois. Aucun détail.',
   'mois', 'nombre', true, null, false, false, false, false, 11),
  ('kumi_taux_de_participation', 'kumi', 'Taux de participation',
   '« Participantes » divisées par « Femmes inscrites » en vigueur à la fin du mois.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 12),
  ('eagles_activites_realisees', 'eagles', 'Activités réalisées',
   'Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('eagles_participants', 'eagles', 'Participants',
   'Personnes venues à au moins une activité dans le mois, comptées une fois, hors outil.',
   'mois', 'nombre', false, null, false, true, false, false, 2),
  ('eagles_nouveaux_participants', 'eagles', 'Nouveaux participants',
   'Personnes venues à une activité pour la première fois dans le mois. Un total, sans liste.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('eagles_projets_realises', 'eagles', 'Projets réalisés',
   'Projets de plusieurs semaines menés à terme dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('eagles_inscrits', 'eagles', 'Inscrits',
   'Personnes inscrites aux activités d''Eagles le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 5),
  ('eagles_nouvelles_integrations_dans_les_equipes', 'eagles', 'Nouvelles intégrations dans les équipes',
   'Personnes qui ont rejoint une équipe d''Eagles dans le mois. Différent des nouveaux STARs comptés par MDS.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('eagles_la_plate_forme_d_ecoute_prises_en_charge', 'eagles', 'La plate-forme d''écoute : prises en charge',
   'Prises en charge de la plate-forme d''écoute dans le mois. Aucun détail.',
   'mois', 'nombre', true, null, false, false, false, false, 7),
  ('eagles_taux_de_participation', 'eagles', 'Taux de participation',
   '« Participants » divisés par « Inscrits » en vigueur à la fin du mois.',
   'mois', 'nombre', false, 'taux', false, false, false, false, 8),
  ('entretien_problemes_signales', 'entretien', 'Problèmes signalés',
   'Problèmes d''entretien signalés dans le mois (locaux, matériel, propreté).',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('entretien_problemes_resolus', 'entretien', 'Problèmes résolus',
   'Problèmes d''entretien réglés dans le mois, quel que soit le mois du signalement.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('entretien_jours_pour_resoudre_les_problemes', 'entretien', 'Jours pour résoudre les problèmes',
   'Somme, pour les problèmes résolus du mois, des jours calendaires entre signalement et résolution.',
   'mois', 'jours', false, null, false, true, false, false, 3),
  ('entretien_taches_realisees', 'entretien', 'Tâches réalisées',
   'Tâches d''entretien terminées dans le mois (nettoyage, rangement, réparation).',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('entretien_produits_d_entretien_manquants', 'entretien', 'Produits d''entretien manquants',
   'Types de produits d''entretien à racheter le jour de la saisie. Le détail passe par un point d''attention.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 5),
  ('entretien_equipements_manquants', 'entretien', 'Équipements manquants',
   'Types d''équipements manquants le jour de la saisie. Le détail passe par un point d''attention.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 6),
  ('entretien_problemes_en_attente', 'entretien', 'Problèmes en attente',
   'Problèmes d''entretien signalés et pas encore résolus, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 7),
  ('entretien_jours_d_attente_des_problemes_en_attente', 'entretien', 'Jours d''attente des problèmes en attente',
   'Somme, pour les problèmes en attente le jour de la saisie, des jours écoulés depuis leur signalement.',
   'a_ce_jour', 'jours', false, null, false, true, false, false, 8),
  ('entretien_delai_moyen_de_resolution', 'entretien', 'Délai moyen de résolution',
   'Moyenne : « Jours pour résoudre les problèmes » divisés par « Problèmes résolus ».',
   'mois', 'jours', false, 'moyenne', false, false, false, false, 9),
  ('entretien_delai_d_attente_moyen', 'entretien', 'Délai d''attente moyen',
   'Moyenne : « Jours d''attente des problèmes en attente » divisés par « Problèmes en attente ».',
   'a_ce_jour', 'jours', false, 'moyenne', false, false, false, false, 10),
  ('coordo_fij_parcours_fij_nouveaux', 'coordo fij', 'Parcours FIJ : nouveaux',
   'Jeunes venus en FIJ pour la première fois dans le mois, tous départements. Un total, sans liste.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('coordo_fij_parcours_fij_reguliers', 'coordo fij', 'Parcours FIJ : réguliers',
   'Jeunes venus au moins trois fois en FIJ dans le mois, comptés hors outil. Un total, sans liste.',
   'mois', 'nombre', false, null, false, true, false, false, 2),
  ('coordo_fij_parcours_fij_au_service', 'coordo fij', 'Parcours FIJ : au service',
   'Jeunes des FIJ qui ont servi au moins un dimanche du mois dans un ministère. Différent de « dont en FIJ ».',
   'mois', 'nombre', false, null, false, true, false, false, 3),
  ('multilingue_langues_couvertes', 'multilingue', 'Langues couvertes',
   'Langues interprétées pendant le culte de ce dimanche.',
   'dimanche', 'nombre', false, null, false, true, false, false, 1),
  ('multilingue_evenements_couverts', 'multilingue', 'Événements couverts',
   'Événements hors culte où l''interprétation a été assurée dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('multilingue_evenements_a_couvrir', 'multilingue', 'Événements à couvrir',
   'Événements hors culte où Multilingue était attendu dans le mois, couverts ou non.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('multilingue_personnes_servies_par_la_traduction', 'multilingue', 'Personnes servies par la traduction',
   'Personnes qui ont utilisé la traduction ce dimanche (récepteurs distribués ou places de la zone interprétée).',
   'dimanche', 'nombre', false, null, false, false, false, false, 4),
  ('multilingue_mobilises_aux_evenements', 'multilingue', 'Mobilisés aux événements',
   'Présences d''interprètes aux événements hors dimanche. Une personne compte à chaque événement où elle sert.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('multilingue_demandes_de_traduction', 'multilingue', 'Demandes de traduction',
   'Demandes de traduction reçues dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('multilingue_demandes_satisfaites', 'multilingue', 'Demandes satisfaites',
   'Demandes de traduction honorées dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 7),
  ('multilingue_incidents_de_traduction', 'multilingue', 'Incidents de traduction',
   'Incidents qui ont gêné la traduction dans le mois (matériel, absence, langue non couverte).',
   'mois', 'nombre', false, null, false, false, false, false, 8),
  ('multilingue_taux_de_couverture_des_evenements', 'multilingue', 'Taux de couverture des événements',
   '« Événements couverts » divisés par « Événements à couvrir ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 9),
  ('multilingue_part_des_demandes_satisfaites', 'multilingue', 'Part des demandes satisfaites',
   '« Demandes satisfaites » divisées par « Demandes de traduction ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 10),
  ('securite_evenements_couverts', 'securite', 'Événements couverts',
   'Événements où des agents de sécurité ont été présents dans le mois, cultes compris.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('securite_incidents', 'securite', 'Incidents',
   'Faits anormaux constatés par les agents dans le mois. Hors malaises, soins et secours : Santé les compte.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('securite_interventions', 'securite', 'Interventions',
   'Actions des agents en réponse à un incident dans le mois. Hors malaises, soins et secours : Santé les compte.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('securite_exercices_et_formations', 'securite', 'Exercices et formations',
   'Exercices et formations de sécurité tenus dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('securite_postes_a_tenir', 'securite', 'Postes à tenir',
   'Postes prévus au plan de sécurité de ce dimanche.',
   'dimanche', 'nombre', false, null, false, false, false, false, 5),
  ('securite_postes_tenus', 'securite', 'Postes tenus',
   'Postes effectivement occupés ce dimanche.',
   'dimanche', 'nombre', false, null, false, false, false, false, 6),
  ('securite_mobilises_aux_evenements', 'securite', 'Mobilisés aux événements',
   'Présences d''agents et de bénévoles aux événements hors dimanche. Une personne compte à chaque événement.',
   'mois', 'nombre', false, null, false, false, false, false, 7),
  ('securite_taux_de_couverture_des_postes', 'securite', 'Taux de couverture des postes',
   '« Postes tenus » divisés par « Postes à tenir ». Plafonné à 100 %.',
   'dimanche', 'nombre', false, 'taux', true, false, false, false, 8),
  ('securite_incidents_par_evenement', 'securite', 'Incidents par événement',
   'Moyenne : « Incidents » divisés par « Événements couverts ».',
   'mois', 'nombre', false, 'moyenne', false, false, false, false, 9),
  ('formation_inscrits_pcnc', 'formation', 'Inscrits (PCNC)',
   'Personnes inscrites au parcours PCNC le jour de la saisie, y compris celles qui l''ont terminé.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 1),
  ('formation_personnes_ayant_termine_la_formation', 'formation', 'Personnes ayant terminé la formation',
   'Parmi les inscrits au parcours PCNC, personnes qui l''ont terminé, le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 2),
  ('formation_seances_presences', 'formation', 'Séances : présences',
   'Présences aux séances de formation du mois, séances additionnées. Aucun nom.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('formation_seances_presences_attendues', 'formation', 'Séances : présences attendues',
   'Inscrits attendus aux séances du mois, séances additionnées.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('formation_reponses_au_questionnaire', 'formation', 'Réponses au questionnaire',
   'Réponses reçues dans le mois au questionnaire anonyme de satisfaction de Formation.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('formation_reponses_satisfaites', 'formation', 'Réponses satisfaites',
   'Parmi ces réponses, celles qui disent « satisfait » ou donnent une des deux meilleures notes.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('formation_taux_de_presence', 'formation', 'Taux de présence',
   '« Séances : présences » divisées par « Séances : présences attendues ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 7),
  ('formation_taux_de_completion', 'formation', 'Taux de complétion',
   '« Personnes ayant terminé la formation » divisées par « Inscrits (PCNC) ». Plafonné à 100 %.',
   'a_ce_jour', 'nombre', false, 'taux', true, false, false, false, 8),
  ('formation_taux_de_satisfaction', 'formation', 'Taux de satisfaction',
   '« Réponses satisfaites » divisées par « Réponses au questionnaire ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 9),
  ('mds_nouveaux_stars', 'mds', 'Nouveaux STARs',
   'STARs enregistrés par MDS pour la première fois dans le mois. Un nombre, sans liste ni nom.',
   'mois', 'nombre', false, null, false, false, false, false, 1),
  ('mds_stars_desactives', 'mds', 'STARs désactivés',
   'STARs retirés des actifs dans le mois (départ, arrêt, transfert).',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('mds_recrutements_aboutis', 'mds', 'Recrutements aboutis',
   'Candidatures du formulaire de recrutement qui ont mené à une intégration dans une équipe, comptées ce mois-là.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('mds_recrutements_non_aboutis', 'mds', 'Recrutements non aboutis',
   'Candidatures du formulaire closes sans intégration (abandon, refus, sans réponse), comptées le mois de la clôture.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('mds_espaces_care', 'mds', 'Espaces Care',
   'Espaces Care (espace nourriture) tenus ce dimanche.',
   'dimanche', 'nombre', false, null, false, false, false, false, 5),
  ('mds_badges_distribues', 'mds', 'Badges distribués',
   'Badges remis à des STARs dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('mds_badges_actifs', 'mds', 'Badges actifs',
   'Badges en circulation et valides le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 7),
  ('mds_badges_en_attente', 'mds', 'Badges en attente',
   'Badges demandés et pas encore remis le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 8),
  ('prodiges_junior_enfants_presents', 'prodiges junior', 'Enfants présents',
   'Enfants accueillis ce dimanche, en un seul total, sans âge ni nom.',
   'dimanche', 'nombre', false, null, false, false, false, true, 1),
  ('prodiges_junior_nouveaux_enfants', 'prodiges junior', 'Nouveaux enfants',
   'Enfants accueillis pour la première fois à Prodiges Junior dans le mois.',
   'mois', 'nombre', true, null, false, false, false, false, 2),
  ('prodiges_junior_enfants_deja_venus', 'prodiges junior', 'Enfants déjà venus',
   'Enfants accueillis dans le mois qui l''avaient déjà été avant. Un total, sans liste.',
   'mois', 'nombre', true, null, false, false, false, false, 3),
  ('prodiges_junior_enfants_inscrits', 'prodiges junior', 'Enfants inscrits',
   'Enfants inscrits à Prodiges Junior le jour de la saisie.',
   'a_ce_jour', 'nombre', false, null, false, true, false, false, 4),
  ('prodiges_junior_taux_de_presence', 'prodiges junior', 'Taux de présence',
   '« Enfants présents » divisés par « Enfants inscrits » en vigueur ce dimanche.',
   'dimanche', 'nombre', false, 'taux', false, false, false, false, 5);

-- Suggestions communes (configuration-indicateurs.md 5.11 ; vague-1-decisions.md, « Suggestions
-- communes ») : comptes simples, ajoutés par un ministère avec son « Pourquoi », validés par
-- EJP Tech (T30). Jamais sensibles, jamais calculées. Une fiche dont un prévu porte le même
-- libellé normalisé ne se les voit pas proposer (v_suggestions).
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, sans_somme, ordre) values
  ('suggestion_evenements_couverts', 'suggestion', 'Événements couverts',
   'Événements EJP où le ministère a assuré sa présence dans le mois, cultes compris.', 'mois', false, 1),
  ('suggestion_evenements_a_couvrir', 'suggestion', 'Événements à couvrir',
   'Événements EJP où le ministère devait être présent dans le mois, couverts ou non.', 'mois', false, 2),
  ('suggestion_mobilises_aux_evenements', 'suggestion', 'Mobilisés aux événements',
   'Présences de l''équipe du ministère aux événements hors dimanche. Une personne compte à chaque événement où elle sert.', 'mois', false, 3),
  ('suggestion_demandes_recues', 'suggestion', 'Demandes reçues',
   'Demandes reçues par le ministère dans le mois, sans nom ni objet.', 'mois', false, 4),
  ('suggestion_demandes_traitees', 'suggestion', 'Demandes traitées',
   'Demandes menées à terme par le ministère dans le mois, quel que soit leur mois d''arrivée.', 'mois', false, 5),
  ('suggestion_projets_en_cours', 'suggestion', 'Projets en cours',
   'Projets du ministère lancés et pas encore terminés, le jour de la saisie.', 'a_ce_jour', true, 6),
  ('suggestion_personnes_formees', 'suggestion', 'Personnes formées',
   'Personnes qui ont suivi une formation du ministère dans le mois, sans liste.', 'mois', false, 7),
  ('suggestion_activites_realisees', 'suggestion', 'Activités réalisées',
   'Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.', 'mois', false, 8),
  ('suggestion_participants', 'suggestion', 'Participants',
   'Personnes venues à au moins une activité dans le mois, comptées une fois, hors outil.', 'mois', true, 9),
  ('suggestion_nouveaux_participants', 'suggestion', 'Nouveaux participants',
   'Personnes venues à une activité pour la première fois dans le mois. Un total, sans liste.', 'mois', false, 10),
  ('suggestion_projets_realises', 'suggestion', 'Projets réalisés',
   'Projets de plusieurs semaines menés à terme dans le mois.', 'mois', false, 11);

-- Termes des 41 calculs (le trigger controler_prevu_terme de B3 contrôle chaque ligne : source
-- du même modèle, saisie, jamais sensible). Taux et moyennes de la V1 : un haut et un bas, à
-- l'agrégat « période », sans décalage. Calculs étendus (lus au lot L1) : somme des NA et des NC
-- des dimanches du mois, décalés d'un ou de trois mois ; différence signée ; comptages
-- d'événements de l'église ; évolution ; abonnés en fin de mois ; somme de trois incidents.
insert into private.indicateur_prevu_terme (prevu_code, ordre, role, source_code, comptage, agregat, decalage) values
  ('integration_welcome_prodiges_presents_par_session', 1, 'haut', 'integration_welcome_prodiges_presents', null, 'periode', 0),
  ('integration_welcome_prodiges_presents_par_session', 2, 'bas', 'integration_welcome_prodiges_sessions', null, 'periode', 0),
  ('integration_taux_de_retour_des_na', 1, 'haut', 'integration_na_revenus_au_culte', null, 'periode', 0),
  ('integration_taux_de_retour_des_na', 2, 'bas', 'integration_nouveaux_arrivants_na', null, 'somme_dimanches_du_mois', 1),
  ('integration_taux_de_conversion_na_vers_fij', 1, 'haut', 'integration_integres_en_fij_na_et_nc', null, 'periode', 0),
  ('integration_taux_de_conversion_na_vers_fij', 2, 'bas', 'integration_nouveaux_arrivants_na', null, 'somme_dimanches_du_mois', 0),
  ('integration_taux_de_conversion_na_vers_fij', 3, 'bas', 'integration_nouveaux_convertis_nc', null, 'somme_dimanches_du_mois', 0),
  ('integration_taux_de_perte', 1, 'haut', 'integration_sans_nouvelles_apres_3_mois', null, 'periode', 0),
  ('integration_taux_de_perte', 2, 'bas', 'integration_nouveaux_arrivants_na', null, 'somme_dimanches_du_mois', 3),
  ('integration_taux_de_perte', 3, 'bas', 'integration_nouveaux_convertis_nc', null, 'somme_dimanches_du_mois', 3),
  ('coordination_bapteme_baptises_par_session', 1, 'haut', 'coordination_bapteme_baptises', null, 'periode', 0),
  ('coordination_bapteme_baptises_par_session', 2, 'bas', 'coordination_bapteme_sessions', null, 'periode', 0),
  ('coordination_retard_du_debut_du_culte', 1, 'plus', 'coordination_heure_de_debut_du_culte', null, 'periode', 0),
  ('coordination_retard_du_debut_du_culte', 2, 'moins', 'coordination_heure_prevue_du_culte', null, 'periode', 0),
  ('coordination_taux_de_realisation_des_evenements', 1, 'haut', null, 'realises', 'periode', 0),
  ('coordination_taux_de_realisation_des_evenements', 2, 'bas', null, 'realises', 'periode', 0),
  ('coordination_taux_de_realisation_des_evenements', 3, 'bas', null, 'annules', 'periode', 0),
  ('coordination_taux_de_realisation_des_evenements', 4, 'bas', null, 'sans_etat_final', 'periode', 0),
  ('coordination_part_des_evenements_a_l_heure', 1, 'haut', 'coordination_evenements_commences_a_l_heure', null, 'periode', 0),
  ('coordination_part_des_evenements_a_l_heure', 2, 'bas', null, 'realises', 'periode', 0),
  ('communication_taux_d_engagement', 1, 'haut', 'communication_interactions_toutes_plateformes', null, 'periode', 0),
  ('communication_taux_d_engagement', 2, 'bas', 'communication_portee_toutes_plateformes', null, 'periode', 0),
  ('communication_taux_de_demandes_traitees_dans_les_delais', 1, 'haut', 'communication_demandes_traitees_dans_les_delais', null, 'periode', 0),
  ('communication_taux_de_demandes_traitees_dans_les_delais', 2, 'bas', 'communication_demandes_traitees', null, 'periode', 0),
  ('communication_evolution_des_vues', 1, 'terme', 'communication_vues_toutes_plateformes', null, 'periode', 0),
  ('communication_evolution_des_abonnes', 1, 'terme', 'communication_abonnes_toutes_plateformes', null, 'fin_de_mois', 0),
  ('film_delai_moyen_de_production', 1, 'haut', 'film_jours_de_production_des_projets_termines', null, 'periode', 0),
  ('film_delai_moyen_de_production', 2, 'bas', 'film_projets_termines', null, 'periode', 0),
  ('film_taux_de_livraison_dans_les_delais', 1, 'haut', 'film_projets_livres_dans_les_delais', null, 'periode', 0),
  ('film_taux_de_livraison_dans_les_delais', 2, 'bas', 'film_projets_termines', null, 'periode', 0),
  ('tech_temps_moyen_de_resolution', 1, 'haut', 'tech_jours_de_resolution_des_demandes_resolues', null, 'periode', 0),
  ('tech_temps_moyen_de_resolution', 2, 'bas', 'tech_demandes_resolues', null, 'periode', 0),
  ('tech_taux_de_resolution_des_demandes', 1, 'haut', 'tech_demandes_resolues', null, 'periode', 0),
  ('tech_taux_de_resolution_des_demandes', 2, 'bas', 'tech_demandes_recues', null, 'periode', 0),
  ('mcad_taux_de_couverture_des_evenements', 1, 'haut', 'mcad_evenements_couverts', null, 'periode', 0),
  ('mcad_taux_de_couverture_des_evenements', 2, 'bas', 'mcad_evenements_a_couvrir', null, 'periode', 0),
  ('mcad_vues_par_evenement_couvert', 1, 'haut', 'mcad_vues_des_diffusions_mcad', null, 'periode', 0),
  ('mcad_vues_par_evenement_couvert', 2, 'bas', 'mcad_evenements_couverts', null, 'periode', 0),
  ('mcad_taux_de_presence_des_equipiers', 1, 'haut', 'mcad_postes_d_equipe_tenus', null, 'periode', 0),
  ('mcad_taux_de_presence_des_equipiers', 2, 'bas', 'mcad_postes_d_equipe_prevus', null, 'periode', 0),
  ('mcad_evolution_de_l_audience', 1, 'terme', 'mcad_pic_de_spectateurs_du_direct', null, 'periode', 0),
  ('mcad_incidents_techniques', 1, 'terme', 'mcad_problemes_audio', null, 'periode', 0),
  ('mcad_incidents_techniques', 2, 'terme', 'mcad_problemes_video', null, 'periode', 0),
  ('mcad_incidents_techniques', 3, 'terme', 'mcad_interruptions_de_diffusion', null, 'periode', 0),
  ('mpi_priere_des_stars_presents_par_session', 1, 'haut', 'mpi_priere_des_stars_presents', null, 'periode', 0),
  ('mpi_priere_des_stars_presents_par_session', 2, 'bas', 'mpi_priere_des_stars_sessions', null, 'periode', 0),
  ('mpi_priere_des_stars_taux_de_participation', 1, 'haut', 'mpi_priere_des_stars_presents', null, 'periode', 0),
  ('mpi_priere_des_stars_taux_de_participation', 2, 'bas', 'mpi_priere_des_stars_attendus', null, 'periode', 0),
  ('mpi_chaine_de_priere_taux_de_participation', 1, 'haut', 'mpi_chaine_de_priere_presents', null, 'periode', 0),
  ('mpi_chaine_de_priere_taux_de_participation', 2, 'bas', 'mpi_chaine_de_priere_attendus', null, 'periode', 0),
  ('sante_taux_de_couverture_des_evenements', 1, 'haut', 'sante_evenements_couverts', null, 'periode', 0),
  ('sante_taux_de_couverture_des_evenements', 2, 'bas', 'sante_evenements_a_couvrir', null, 'periode', 0),
  ('merch_panier_moyen', 1, 'haut', 'merch_chiffre_d_affaires', null, 'periode', 0),
  ('merch_panier_moyen', 2, 'bas', 'merch_commandes', null, 'periode', 0),
  ('merch_marge_estimee', 1, 'plus', 'merch_chiffre_d_affaires', null, 'periode', 0),
  ('merch_marge_estimee', 2, 'moins', 'merch_cout_d_achat_des_articles_vendus', null, 'periode', 0),
  ('merch_evolution_des_ventes', 1, 'terme', 'merch_chiffre_d_affaires', null, 'periode', 0),
  ('prodiges_musique_repetitions_taux_de_presence', 1, 'haut', 'prodiges_musique_repetitions_presents', null, 'periode', 0),
  ('prodiges_musique_repetitions_taux_de_presence', 2, 'bas', 'prodiges_musique_repetitions_attendus', null, 'periode', 0),
  ('kumi_taux_de_participation', 1, 'haut', 'kumi_participantes', null, 'periode', 0),
  ('kumi_taux_de_participation', 2, 'bas', 'kumi_femmes_inscrites', null, 'periode', 0),
  ('eagles_taux_de_participation', 1, 'haut', 'eagles_participants', null, 'periode', 0),
  ('eagles_taux_de_participation', 2, 'bas', 'eagles_inscrits', null, 'periode', 0),
  ('entretien_delai_moyen_de_resolution', 1, 'haut', 'entretien_jours_pour_resoudre_les_problemes', null, 'periode', 0),
  ('entretien_delai_moyen_de_resolution', 2, 'bas', 'entretien_problemes_resolus', null, 'periode', 0),
  ('entretien_delai_d_attente_moyen', 1, 'haut', 'entretien_jours_d_attente_des_problemes_en_attente', null, 'periode', 0),
  ('entretien_delai_d_attente_moyen', 2, 'bas', 'entretien_problemes_en_attente', null, 'periode', 0),
  ('multilingue_taux_de_couverture_des_evenements', 1, 'haut', 'multilingue_evenements_couverts', null, 'periode', 0),
  ('multilingue_taux_de_couverture_des_evenements', 2, 'bas', 'multilingue_evenements_a_couvrir', null, 'periode', 0),
  ('multilingue_part_des_demandes_satisfaites', 1, 'haut', 'multilingue_demandes_satisfaites', null, 'periode', 0),
  ('multilingue_part_des_demandes_satisfaites', 2, 'bas', 'multilingue_demandes_de_traduction', null, 'periode', 0),
  ('securite_taux_de_couverture_des_postes', 1, 'haut', 'securite_postes_tenus', null, 'periode', 0),
  ('securite_taux_de_couverture_des_postes', 2, 'bas', 'securite_postes_a_tenir', null, 'periode', 0),
  ('securite_incidents_par_evenement', 1, 'haut', 'securite_incidents', null, 'periode', 0),
  ('securite_incidents_par_evenement', 2, 'bas', 'securite_evenements_couverts', null, 'periode', 0),
  ('formation_taux_de_presence', 1, 'haut', 'formation_seances_presences', null, 'periode', 0),
  ('formation_taux_de_presence', 2, 'bas', 'formation_seances_presences_attendues', null, 'periode', 0),
  ('formation_taux_de_completion', 1, 'haut', 'formation_personnes_ayant_termine_la_formation', null, 'periode', 0),
  ('formation_taux_de_completion', 2, 'bas', 'formation_inscrits_pcnc', null, 'periode', 0),
  ('formation_taux_de_satisfaction', 1, 'haut', 'formation_reponses_satisfaites', null, 'periode', 0),
  ('formation_taux_de_satisfaction', 2, 'bas', 'formation_reponses_au_questionnaire', null, 'periode', 0),
  ('prodiges_junior_taux_de_presence', 1, 'haut', 'prodiges_junior_enfants_presents', null, 'periode', 0),
  ('prodiges_junior_taux_de_presence', 2, 'bas', 'prodiges_junior_enfants_inscrits', null, 'periode', 0);

-- 3. Libellés des communs (X6)
--
-- Le nom de la demande de la coordination pour un chiffre commun, sur la fiche des ministères
-- d'un modèle (libelles-a-valider.md, « Chiffres communs » de chaque section) ; et, pour MDS,
-- les deux lignes de référence de l'église (reference_eglise), dont les valeurs et la
-- complétude restent lues dans v_total_a_ce_jour et v_total_dimanche (K52a). Écrite par
-- migration seulement, illisible par l'API.
create table private.libelle_commun (
  modele text not null check (char_length(modele) between 1 and 60 and modele not in ('aucun', 'suggestion')),
  commun_code text not null check (commun_code in ('service', 'actifs', 'en_fij')),
  reference_eglise boolean not null default false,
  libelle text not null check (char_length(libelle) between 2 and 60),
  ordre smallint not null,
  primary key (modele, commun_code, reference_eglise)
);
alter table private.libelle_commun enable row level security;
revoke all on private.libelle_commun from public, anon, authenticated, service_role;

insert into private.libelle_commun (modele, commun_code, reference_eglise, libelle, ordre) values
  ('integration', 'service', false, 'Équipe présente au culte', 1),
  ('mcad', 'service', false, 'Équipiers mobilisés', 1),
  ('sante', 'service', false, 'Personnes mobilisées', 1),
  ('kumi', 'service', false, 'Femmes mobilisées', 1),
  ('kumi', 'actifs', false, 'Bénévoles actives', 2),
  ('eagles', 'actifs', false, 'Bénévoles actifs', 2),
  ('entretien', 'service', false, 'Personnes actives mobilisées', 1),
  ('multilingue', 'service', false, 'Interprètes mobilisés', 1),
  ('securite', 'service', false, 'Agents et bénévoles mobilisés', 1),
  ('formation', 'service', false, 'Formateurs mobilisés', 1),
  ('prodiges junior', 'service', false, 'Animateurs mobilisés', 1),
  ('mds', 'actifs', true, 'STARs actifs de l''église', 4),
  ('mds', 'service', true, 'STARs au service de l''église', 5);

-- Libellés des communs de chaque fiche : une ligne par commun renommé et par ministère dont un
-- indicateur vient d'un prévu du modèle (créé par « Créer », retiré compris). La fonction ignore
-- la RLS : elle réapplique le filtre du lecteur. Toutes les fiches pour le berger, le conseil et
-- EJP Tech (private.lit_tout()) ; la sienne pour un ministère ; rien pour l'administration, un
-- compte inactif ni hors aal2.
create function private.communs_de_fiche()
returns table (ministere_id uuid, commun_code text, libelle text, ordre smallint, reference_eglise boolean)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.lit_tout() as lit_tout, private.mon_ministere() as ministere
     where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select distinct on (m.id, l.commun_code, l.reference_eglise)
         m.id, l.commun_code, l.libelle, l.ordre, l.reference_eglise
    from moi
   cross join public.ministere m
    join private.libelle_commun l
      on exists (select 1 from public.indicateur i
                   join private.indicateur_prevu p on p.code = i.modele_code
                  where i.ministere_id = m.id and p.modele = l.modele)
   where moi.lit_tout or m.id = moi.ministere
   order by m.id, l.commun_code, l.reference_eglise, l.modele
$$;

create view public.v_commun_fiche with (security_invoker = true) as
select c.ministere_id, c.commun_code, c.libelle, c.ordre, c.reference_eglise
  from private.communs_de_fiche() as c;

revoke all on function private.communs_de_fiche() from public, anon, authenticated, service_role;
grant execute on function private.communs_de_fiche() to authenticated;
revoke all on public.v_commun_fiche from public, anon, authenticated, service_role;
grant select on public.v_commun_fiche to authenticated;

-- 4. creer_indicateurs_prevus recopie part. Même signature : create or replace garde le
-- propriétaire et les droits. Seule différence avec 20261008110500_indicateurs_fonctions.sql :
-- la colonne part de l'ajout des prévus.
create or replace function private.creer_indicateurs_prevus(p_ministere_id uuid, p_modele text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_codes text[];
  v_nombre integer;
  v_lignes integer;
  v_pris text;
  v_commun boolean;
  v_manque text;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(p_ministere_id);

  -- Un ministère sans prévu (Protocole) : une ligne de journal la première fois, rien ensuite.
  if p_modele = 'aucun' then
    if exists (select 1 from public.indicateur i
                 join private.indicateur_prevu p on p.code = i.modele_code and p.modele <> 'suggestion'
                where i.ministere_id = p_ministere_id) then
      raise exception 'Cette fiche a déjà des indicateurs prévus : « aucun » ne s''applique pas.';
    end if;
    if not exists (select 1 from public.journal j
                    where j.ministere_id = p_ministere_id and j.action = 'indicateurs_prevus_crees'
                      and j.detail ->> 'modele' = 'aucun') then
      insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
      values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'indicateurs_prevus_crees',
              'ministere', p_ministere_id, jsonb_build_object('modele', 'aucun', 'nombre', 0));
    end if;
    return 0;
  end if;
  if p_modele is null or p_modele = 'suggestion'
     or not exists (select 1 from private.indicateur_prevu p where p.modele = p_modele) then
    raise exception 'Ce modèle n''existe pas dans le catalogue.';
  end if;

  -- Prévus qui manquent : jamais créés sur cette fiche, quel que soit leur état (un prévu retiré
  -- ne renaît pas par un second appel).
  select array_agg(p.code order by p.ordre, p.code) into v_codes
    from private.indicateur_prevu p
   where p.modele = p_modele
     and not exists (select 1 from public.indicateur i
                      where i.ministere_id = p_ministere_id and i.modele_code = p.code);
  v_nombre := coalesce(array_length(v_codes, 1), 0);
  if v_nombre = 0 then
    return 0;
  end if;

  -- Doublon : un prévu au nom d'un indicateur de la fiche (hors retirés) ou d'un chiffre commun,
  -- ou deux prévus du modèle au même nom normalisé (catalogue à corriger).
  select i.libelle, i.ministere_id is null into v_pris, v_commun
    from public.indicateur i
    join private.indicateur_prevu p on p.code = any (v_codes)
                                   and private.normaliser(p.libelle) = private.normaliser(i.libelle)
   where (i.ministere_id = p_ministere_id or i.ministere_id is null) and i.etat <> 'retire'
   order by i.ministere_id nulls last
   limit 1;
  if v_pris is not null then
    if v_commun then
      raise exception 'Un indicateur prévu porte le nom du chiffre commun « % » : le catalogue est à corriger.', v_pris;
    end if;
    raise exception 'La fiche a déjà « % » : retirez-le avant de créer les indicateurs prévus.', v_pris;
  end if;
  select p1.libelle into v_pris
    from private.indicateur_prevu p1
    join private.indicateur_prevu p2 on (p2.ordre, p2.code) > (p1.ordre, p1.code)
                                    and private.normaliser(p2.libelle) = private.normaliser(p1.libelle)
   where p1.code = any (v_codes) and p2.code = any (v_codes)
   order by p1.ordre, p1.code
   limit 1;
  if v_pris is not null then
    raise exception 'Deux indicateurs prévus portent le même nom, « % » : le catalogue est à corriger.', v_pris;
  end if;
  v_lignes := private.lignes_fiche(p_ministere_id, null) + v_nombre;
  if v_lignes > 30 then
    raise exception 'Avec les indicateurs prévus, la fiche compterait % indicateurs : 30 au plus.', v_lignes;
  end if;
  -- La source d'un calcul à créer doit être suivie sur la fiche (créée ici ou avant, active).
  select c.libelle into v_manque
    from private.indicateur_prevu_terme t
    join private.indicateur_prevu c on c.code = t.prevu_code
   where t.prevu_code = any (v_codes) and t.source_code is not null
     and t.source_code <> all (v_codes)
     and not exists (select 1 from public.indicateur s
                      where s.ministere_id = p_ministere_id and s.modele_code = t.source_code and s.etat = 'actif')
   limit 1;
  if v_manque is not null then
    raise exception 'Le calcul « % » demande un chiffre qui n''est plus suivi sur cette fiche.', v_manque;
  end if;

  -- Tous les prévus manquants en une instruction, actifs (sensibles compris, P42), puis les
  -- termes des calculs. Un trigger de B1 contrôle chaque ligne.
  insert into public.indicateur (libelle, definition, nature, unite, sensible, calcul, part, ministere_id, etat,
                                 origine, modele_code, sans_somme, saisi_dimanche_matin, libelle_sessions, ordre)
  select p.libelle, p.definition, p.nature, p.unite, p.sensible, p.calcul, p.part, p_ministere_id, 'actif',
         'eglise', p.code, p.sans_somme, p.saisi_dimanche_matin, p.libelle_sessions, p.ordre
    from private.indicateur_prevu p
   where p.code = any (v_codes)
   order by p.ordre, p.code;

  insert into public.indicateur_terme (calcul_id, ordre, role, source_id, comptage, agregat, decalage)
  select c.id, t.ordre, t.role, s.id, t.comptage, t.agregat, t.decalage
    from private.indicateur_prevu_terme t
    join public.indicateur c on c.ministere_id = p_ministere_id and c.modele_code = t.prevu_code
    left join public.indicateur s on s.ministere_id = p_ministere_id and s.modele_code = t.source_code
                                 and s.etat = 'actif'
   where t.prevu_code = any (v_codes)
   order by t.prevu_code, t.ordre;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'indicateurs_prevus_crees',
          'ministere', p_ministere_id, jsonb_build_object('modele', p_modele, 'nombre', v_nombre));
  return v_nombre;
end $$;

-- 5. v_calcul, réécrite depuis 20261008100000_indicateurs_lectures.sql (mêmes colonnes, même
-- ordre, mêmes types : create or replace garde le propriétaire et les droits).
--
-- Calculs de la V1 : taux et moyennes dont tous les termes sont des indicateurs, à l'agrégat
-- « période » et sans décalage (les calculs étendus restent invisibles jusqu'au lot L1). Pour la
-- dernière période finie : Σ haut et Σ bas de la période, un bas « à ce jour » étant pris en
-- vigueur à la fin de la période ; « Non calculé » avec sa raison si une source manque
-- (source_non_saisie, avec la première source qui manque), si le bas vaut 0 (bas_nul), ou, pour
-- une part (indicateur.part), si le haut dépasse le bas (haut_depasse_bas : « Non calculé, à
-- vérifier », jamais 120 % ni un 100 % plafonné ; haut et bas restent lisibles). Sur l'année :
-- Σ haut ÷ Σ bas sur les périodes attendues qui ont toutes leurs valeurs, jamais une moyenne de
-- taux ; une période d'une part dont le haut dépasse le bas en est écartée, et la complétude le
-- montre (« 8 mois sur 9 ») ; départ : le plus récent des départs de ses sources. Un calcul de
-- deux « à ce jour » donne le résultat du jour, sans valeur sur l'année. Le taux est en pour cent,
-- arrondi à l'entier ; un taux qui n'est pas une part peut dépasser 100 % (« Taux de résolution
-- des demandes »). L'administration lit les lignes sans valeur ni raison.
create or replace view public.v_calcul with (security_invoker = true) as
with p as (select * from private.mesures_periode()),
repere as (
  select private.aujourdhui() as jour, private.mon_ministere() as moi, private.lit_tout() as lit_tout,
         make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier
),
calculs as (
  select i.id, i.ministere_id, i.calcul, i.nature, i.retire_le, i.part,
         m.cree_le as ministere_cree_le, m.desactive_le as ministere_desactive_le,
         coalesce(private.derniere_periode_finie(i.nature), r.jour) as fin,
         private.periode_de(i.nature, r.janvier) as debut,
         coalesce(r.lit_tout or i.ministere_id = r.moi, false) as voit
    from public.indicateur i
    join public.ministere m on m.id = i.ministere_id
   cross join repere r
   where i.calcul in ('taux', 'moyenne')
     and coalesce(i.retrait_motif, '') not in ('confidentialite', 'refuse')
     -- Un calcul à valider, ou dont une source est à valider, refusée ou retirée pour
     -- confidentialité, n'a aucune ligne : ses valeurs restent hors de tout total et de tout calcul
     -- (T30), et rien d'un retiré pour confidentialité ne se lit (Q11), pour tous les lecteurs.
     and i.etat <> 'en_attente'
     and not exists (select 1 from public.indicateur_terme t
                      where t.calcul_id = i.id
                        and (t.source_id is null or t.agregat <> 'periode' or t.decalage <> 0))
     and not exists (select 1 from public.indicateur_terme t
                       join public.indicateur s on s.id = t.source_id
                      where t.calcul_id = i.id
                        and (s.etat = 'en_attente' or s.retrait_motif in ('refuse', 'confidentialite')))
),
termes as (
  select c.id as calcul_id, t.ordre, t.role, t.source_id, s.nature as source_nature,
         -- Départ de la source : la période de son ajout, reculée jusqu'à la plus ancienne période
         -- de l'année qu'elle a rattrapée.
         greatest(c.debut, least(
           private.periode_de(c.nature, (s.cree_le at time zone 'Europe/Paris')::date),
           coalesce(
             (select min(x.periode) from p as x
               where s.nature = c.nature and x.indicateur_id = s.id and x.ministere_id = c.ministere_id
                 and x.periode between c.debut and c.fin),
             private.periode_de(c.nature, (s.cree_le at time zone 'Europe/Paris')::date)))) as depart
    from calculs c
    join public.indicateur_terme t on t.calcul_id = c.id
    join public.indicateur s on s.id = t.source_id
),
periodes as (
  select c.id as calcul_id, q.periode::date as periode
    from calculs c
   cross join lateral generate_series(least(c.debut, c.fin)::timestamp, c.fin::timestamp,
                                      case c.nature when 'mois' then interval '1 month' else interval '7 days' end) as q(periode)
   where c.nature <> 'a_ce_jour'
  union all
  select c.id, c.fin from calculs c where c.nature = 'a_ce_jour'
),
valeurs as (
  select q.calcul_id, q.periode, t.ordre, t.role, t.source_id, v.valeur
    from periodes q
    join calculs c on c.id = q.calcul_id
    join termes t on t.calcul_id = q.calcul_id
    left join lateral (
      select x.valeur
        from p as x
       where x.indicateur_id = t.source_id and x.ministere_id = c.ministere_id
         and case when t.source_nature = 'a_ce_jour' then x.periode <= private.fin_periode(c.nature, q.periode)
                  else x.periode = q.periode end
       order by x.periode desc
       limit 1
    ) as v on true
),
par_periode as (
  select v.calcul_id, v.periode,
         bool_and(v.valeur is not null) as complete,
         sum(v.valeur) filter (where v.role = 'haut') as haut,
         sum(v.valeur) filter (where v.role = 'bas') as bas,
         (array_agg(v.source_id order by v.ordre) filter (where v.valeur is null))[1] as manque
    from valeurs v
   group by v.calcul_id, v.periode
),
annee as (
  select c.id as calcul_id,
         sum(pp.haut) filter (where pp.complete and not (c.part and pp.haut > pp.bas)) as haut,
         sum(pp.bas) filter (where pp.complete and not (c.part and pp.haut > pp.bas)) as bas,
         count(*) filter (where pp.complete and not (c.part and pp.haut > pp.bas))::integer as nb_periodes,
         count(*)::integer as nb_attendues
    from calculs c
    join par_periode pp on pp.calcul_id = c.id
   where c.nature <> 'a_ce_jour'
     and pp.periode >= c.debut
     and pp.periode >= (select max(t.depart) from termes t where t.calcul_id = c.id)
     and pp.periode <= c.fin
     and private.actif_le(c.ministere_cree_le, c.ministere_desactive_le, private.fin_periode(c.nature, pp.periode))
     and (c.retire_le is null or (c.retire_le at time zone 'Europe/Paris')::date > pp.periode)
   group by c.id
)
select c.id as indicateur_id, c.ministere_id, c.calcul, c.fin as periode,
       case when c.voit then pp.haut end as haut,
       case when c.voit then pp.bas end as bas,
       case when c.voit and pp.complete and pp.bas > 0 and not (c.part and pp.haut > pp.bas) then
         case c.calcul when 'taux' then round(100.0 * pp.haut / pp.bas) else pp.haut::numeric / pp.bas end
       end as resultat,
       case when c.voit then a.haut::bigint end as annee_haut,
       case when c.voit then a.bas::bigint end as annee_bas,
       case when c.voit and a.bas > 0 then
         case c.calcul when 'taux' then round(100.0 * a.haut / a.bas) else a.haut::numeric / a.bas end
       end as annee_resultat,
       case when c.voit and c.nature <> 'a_ce_jour' then coalesce(a.nb_periodes, 0) end as annee_nb_periodes,
       case when c.voit and c.nature <> 'a_ce_jour' then coalesce(a.nb_attendues, 0) end as annee_nb_attendues,
       case
         when not c.voit then null
         when pp.complete is distinct from true then 'source_non_saisie'
         when pp.bas = 0 then 'bas_nul'
         when c.part and pp.haut > pp.bas then 'haut_depasse_bas'
       end as non_calcule_raison,
       case when c.voit and pp.complete is distinct from true then pp.manque end as non_calcule_source_id
  from calculs c
  left join par_periode pp on pp.calcul_id = c.id and pp.periode = c.fin
  left join annee a on a.calcul_id = c.id;

-- 6. Droits : la fonction du trigger n'est exécutable par personne (le trigger l'appelle au nom
-- du propriétaire de la table).
revoke all on function private.figer_part() from public, anon, authenticated, service_role;
