-- Catalogue de Protocole (décision T71 de docs/decisions.md, qui révise K51 de
-- docs/conception/vague-1-decisions.md). La liste de la coordination ne demandait rien à Protocole
-- (section vide) : il ne saisissait que les trois chiffres communs, modèle « aucun ». La responsable
-- du Protocole a donné quatre domaines à suivre ; la personne responsable y a choisi les
-- indicateurs ci-dessous le 24 octobre 2026.
--
-- Un nouveau modèle « protocole » dans private.indicateur_prevu : 8 indicateurs saisis, dont 1
-- sensible, et 1 calcul, une part. Comme les autres modèles, le code du modèle est le nom normalisé
-- du ministère de la liste (private.normaliser('Protocole') = 'protocole') : l'écran Indicateurs
-- propose ce modèle à la fiche dont le nom normalisé est « protocole ».
--
-- 1. « Plan de service prêt la veille » : rythme dimanche, 0 ou 1. La borne reste celle de l'unité
--    nombre (9 999) : le catalogue n'a ni unité ni borne « oui ou non », et en ajouter une
--    changerait le modèle de données ; la définition dit quoi saisir. Avec la somme de l'année
--    (sans_somme faux) : un 0 ou un 1 s'additionne, la somme est le nombre de dimanches où le plan
--    était prêt, avec sa complétude ; sans_somme est réservé aux personnes différentes, aux pics,
--    aux heures et aux jours (vague-1-decisions.md, section 4, « Somme »).
-- 2. Les autres saisis sont des comptes du mois, avec la somme de l'année.
-- 3. « Manquements à la confidentialité constatés » est sensible (P45 à P47, comme Santé et
--    Social) : mois, nombre, aucun calcul ; catégories à fixer par la coordination (P47).
-- 4. « Part des demandes traitées » : taux et part (P49), sur le modèle de la « Part des demandes
--    satisfaites » de Multilingue et du « Taux de demandes traitées dans les délais » de
--    Communication : haut « Demandes traitées », bas « Demandes reçues », même mois. La définition
--    de « Demandes traitées » compte les demandes reçues dans le mois : la part ne dépasse jamais
--    100 % sans erreur de saisie (sinon « Non calculé, à vérifier », haut_depasse_bas).
--
-- Libellés et définitions proposés par le lot (guide de rédaction : définir le chiffre ou dire quoi
-- saisir), à relire par la responsable du Protocole avant la création en production. Aucune ligne
-- de public.indicateur n'est écrite ici : EJP Tech crée les prévus de la fiche Protocole par
-- « Créer les indicateurs prévus » (creer_indicateurs_prevus), le jour de la mise en ligne
-- (docs/exploitation.md, section 7.3). La fonction accepte ce modèle même si la réponse « Aucun
-- prévu » est déjà au journal de la fiche.

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, unite, sensible, calcul, part,
                                      sans_somme, saisi_dimanche_matin, libelle_sessions, ordre) values
  ('protocole_plan_de_service_pret_la_veille', 'protocole', 'Plan de service prêt la veille',
   'Enregistrez 1 si le plan du service (placement, accueil, répartition des STARs) était prêt la veille du culte, sinon 0.',
   'dimanche', 'nombre', false, null, false, false, false, false, 1),
  ('protocole_evenements_prepares_une_semaine_avant', 'protocole', 'Événements préparés une semaine avant',
   'Événements tenus dans le mois, hors cultes, dont le Protocole avait son plan au moins une semaine avant.',
   'mois', 'nombre', false, null, false, false, false, false, 2),
  ('protocole_ecarts_aux_consignes_releves', 'protocole', 'Écarts aux consignes relevés',
   'Cas où une consigne n''a pas été respectée (horaires, tenue, placement, accès réservés), sans nom ni détail. Si aucun, enregistrez 0.',
   'mois', 'nombre', false, null, false, false, false, false, 3),
  ('protocole_demandes_recues', 'protocole', 'Demandes reçues',
   'Demandes adressées au Protocole par les autres ministères ou l''équipe pastorale, reçues dans le mois.',
   'mois', 'nombre', false, null, false, false, false, false, 4),
  ('protocole_demandes_traitees', 'protocole', 'Demandes traitées',
   'Parmi les demandes reçues dans le mois, celles que le Protocole a menées à terme.',
   'mois', 'nombre', false, null, false, false, false, false, 5),
  ('protocole_points_d_equipe_tenus', 'protocole', 'Points d''équipe tenus',
   'Réunions ou points d''équipe du Protocole tenus dans le mois. Si aucun, enregistrez 0.',
   'mois', 'nombre', false, null, false, false, false, false, 6),
  ('protocole_manquements_a_la_confidentialite_constates', 'protocole', 'Manquements à la confidentialité constatés',
   'Manquements à la confidentialité constatés dans le mois, comptés sans nom ni détail. Si aucun, enregistrez 0.',
   'mois', 'nombre', true, null, false, false, false, false, 7),
  ('protocole_part_des_demandes_traitees', 'protocole', 'Part des demandes traitées',
   '« Demandes traitées » divisées par « Demandes reçues ». Plafonné à 100 %.',
   'mois', 'nombre', false, 'taux', true, false, false, false, 8);

-- Termes de la part (le trigger controler_prevu_terme contrôle chaque ligne : source du même
-- modèle, saisie, jamais sensible), à l'agrégat « période », sans décalage : un calcul de la V1.
insert into private.indicateur_prevu_terme (prevu_code, ordre, role, source_code, comptage, agregat, decalage) values
  ('protocole_part_des_demandes_traitees', 1, 'haut', 'protocole_demandes_traitees', null, 'periode', 0),
  ('protocole_part_des_demandes_traitees', 2, 'bas', 'protocole_demandes_recues', null, 'periode', 0);
