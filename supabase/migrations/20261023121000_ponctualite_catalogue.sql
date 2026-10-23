-- Ponctualité des événements, migration 3 sur 3 : retrait du catalogue du chiffre saisi
-- « Événements commencés à l'heure » et de sa part (T68 ; réponse de la personne responsable du
-- 23 octobre 2026 : le chiffre saisi est remplacé par le calcul, les valeurs gardées).
--
-- La ponctualité se calcule désormais sur les heures des événements (evenements_eglise_mois(),
-- 20261023120500_evenements_comptages.sql). Les deux prévus de Coordination sortent de
-- private.indicateur_prevu, et les termes de la part de private.indicateur_prevu_terme, comme
-- un prévu entre au catalogue par migration (T64) : creer_indicateurs_prevus ne les crée plus.
--
-- Aucune ligne de public.indicateur ni de public.mesure n'est touchée : sur une fiche où ils
-- existent déjà, EJP Tech retire « Événements commencés à l'heure » par l'écran Indicateurs, motif
-- « Se calcule », le jour de la mise en ligne et pas avant (docs/exploitation.md, section 7.3) ;
-- retirer_calculs_de retire alors la part, et les saisies restent dans mesure. Pas de retrait par
-- migration (B4, T64).

delete from private.indicateur_prevu_terme
 where prevu_code = 'coordination_part_des_evenements_a_l_heure';

delete from private.indicateur_prevu
 where code in ('coordination_part_des_evenements_a_l_heure', 'coordination_evenements_commences_a_l_heure');
