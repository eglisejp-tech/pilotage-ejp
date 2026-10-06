-- Étape 4, lot W0 : contrats communs (docs/plan-etape-4.md, section 3, point 2 ;
-- docs/conception/contrat-etape-4.md, « Codes du journal et de la modération »).
--
-- Réécrit une seule fois les listes fermées du journal et de la modération avec l'union de tous
-- les codes de l'étape 4, pour qu'aucun lot ne retouche ces contraintes ensuite :
-- - journal.action : les 20 codes des étapes 1 à 3, puis les 7 codes du lot 1 des indicateurs
--   (configuration-indicateurs.md 5.10, validation-metier.md 2.7, statistiques FIJ) et les 2
--   codes des signalements (T39, question 14 : oui, 6 octobre 2026). Les codes du lot 2
--   (indicateur_correction_demandee, indicateur_officiel) n'y sont pas ;
-- - journal.cible : les 7 cibles actuelles, puis indicateur et signalement, et toute cible de
--   la modération : marquer_relu et masquer_texte écrivent leur ligne de journal avec la cible
--   de la modération (texte_relu, texte_masque), donc chaque cible de moderation est aussi une
--   cible du journal (demande_indicateur, validation, signalement_suivi) ;
-- - moderation.cible : les 4 cibles actuelles, puis demande_indicateur, validation,
--   signalement et signalement_suivi ;
-- - couples (cible, champ) de moderation : les 7 couples actuels, puis (demande_indicateur,
--   pourquoi), (validation, motif), (signalement, texte) et (signalement_suivi, commentaire).
--
-- Seules les contraintes changent : aucune table, aucune donnée, aucun droit. Les contraintes
-- prennent un nom explicite, pour qu'une étape suivante les retrouve. Une liste plus large que
-- l'ancienne : les lignes existantes (jeu d'exemple, préproduction) restent valides.
-- Les noms d'origine sont ceux que Postgres a donnés aux check sans nom de
-- 20260930163150_types_et_tables.sql (une colonne : table_colonne_check ; plusieurs colonnes :
-- table_check, puis table_check1 pour la seconde).

alter table public.journal
  drop constraint journal_action_check,
  add constraint journal_action_check check (action in (
    -- Étapes 1 à 3
    'mesure_saisie', 'fij_saisie', 'participation_saisie', 'evenement_ajoute', 'evenement_modifie',
    'reunion_saisie', 'point_cree', 'point_statut', 'point_traite',
    'session_declaree', 'session_modifiee', 'session_supprimee',
    'ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive', 'compte_reactive',
    'double_auth_reinitialisee', 'texte_relu', 'texte_masque',
    -- Étape 4 : indicateurs (B3) et statistiques FIJ par département (B5)
    'indicateur_cree', 'indicateurs_prevus_crees', 'indicateur_corrige', 'indicateur_valide',
    'indicateur_refuse', 'indicateur_retire', 'fij_statistiques_saisies',
    -- Étape 4 : signalements (B7)
    'difficulte_signalee', 'signalement_clos')),
  drop constraint journal_cible_check,
  add constraint journal_cible_check check (cible in (
    'session', 'evenement', 'reunion', 'point_attention', 'point_suivi', 'compte', 'ministere',
    'indicateur', 'demande_indicateur', 'validation', 'signalement', 'signalement_suivi'));

alter table public.moderation
  drop constraint moderation_cible_check,
  add constraint moderation_cible_check check (cible in (
    'point_attention', 'point_suivi', 'evenement', 'reunion',
    'demande_indicateur', 'validation', 'signalement', 'signalement_suivi')),
  drop constraint moderation_check1,
  add constraint moderation_cible_champ_check check (champ is null or (cible, champ) in (
    ('point_attention', 'titre'), ('point_attention', 'description'), ('point_attention', 'action_attendue'),
    ('point_suivi', 'commentaire'), ('evenement', 'titre'),
    ('reunion', 'objet'), ('reunion', 'decision_attendue'),
    ('demande_indicateur', 'pourquoi'), ('validation', 'motif'),
    ('signalement', 'texte'), ('signalement_suivi', 'commentaire')));
