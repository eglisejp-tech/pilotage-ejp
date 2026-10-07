-- Jeu d'exemple du lot B4 (docs/plan-etape-4.md, section 3, « Jeux d'exemple ») : indicateurs
-- de la vague 1 sur les ministères d'exemple, local et CI seulement.
-- supabase db push ne l'applique pas sans --include-seed : ne jamais passer cette option.
--
-- - Prévus créés pour sept ministères d'exemple, comme le bouton « Créer » de l'administration
--   (creer_indicateurs_prevus) : Communication, Intégration, Coordination, Social, FIJ (modèle
--   « coordo fij »), Prodiges Junior et EJP Formation (modèle « formation »), sensibles compris,
--   actifs dès leur création (P42), avec les termes de leurs calculs et une ligne de journal
--   indicateurs_prevus_crees par fiche. Jeunesse n'a pas de modèle : l'administration lui a
--   ajouté deux indicateurs (un grand nombre et des jours), et elle a demandé trois suggestions.
-- - Une valeur par unité : nombre, grand nombre (Jeunesse), euros (Social, Fonds levés), heure
--   (Coordination, Heure de début et Heure prévue du culte), jours (Jeunesse).
-- - Un sensible : « Bénéficiaires (passages) » de Social, 6, 1, 0 et 2 sur les quatre derniers
--   mois finis (le dernier à 2 : « moins de 3 » pour le berger, parcours de la fiche, lot E2). Le
--   mois en cours d'un sensible et ses catégories viennent de seed/44 (lot B8).
-- - Un ajout à valider (Participants), un validé (Activités réalisées), un refusé (Projets
--   réalisés), demandés par Jeunesse, chacun avec son « Pourquoi », décidés par EJP Tech.
-- - Un retiré avec saisies : « Présences d'équipiers aux événements » d'Intégration.
-- - Des mois (le mois en cours pour « Welcome Prodiges : présents ») et des dimanches ; une part
--   dont le haut dépasse le bas (Formation, Taux de satisfaction du dernier mois : 12 réponses
--   satisfaites pour 10 réponses, « Non calculé, à vérifier »).
--
-- Communication ne reçoit aucune valeur : jeu-exemple.test.sql compte ses 11 envois de chiffres.
-- Les saisies passent par le trigger de mesure, qui écrit une ligne de journal par envoi ; les
-- gestes de configuration et de validation (fonctions de l'API d'ordinaire) ont leur ligne
-- écrite ici, sans texte libre. Aucune heure n'est après maintenant.
--
-- Ce fichier se suffit à lui-même (docs/conception/contrat-etape-4.md, section 3) : il redéfinit
-- les aides de décalage de seed.sql et retrouve les ministères et les comptes par leurs
-- identifiants fixes (Coordination et FIJ par leur code).

create or replace function pg_temp.j(p_jour date) returns date
language sql stable as $$
  select p_jour + (private.dimanche_reference() - date '2026-09-27')
$$;

create or replace function pg_temp.h(p_heure timestamp) returns timestamptz
language sql stable as $$
  select (p_heure + (private.dimanche_reference() - date '2026-09-27') * interval '1 day') at time zone 'Europe/Paris'
$$;

-- Heure décalée, jamais après maintenant (le dimanche de référence peut être aujourd'hui).
create or replace function pg_temp.hc(p_heure timestamp) returns timestamptz
language sql stable as $$
  select least(pg_temp.h(p_heure), now() - interval '1 hour')
$$;

-- 1er du mois, p_recul mois avant le mois en cours (heure de Paris) : 0 pour le mois en cours.
create or replace function pg_temp.mois(p_recul integer) returns date
language sql stable as $$
  select (private.mois_courant() - make_interval(months => p_recul))::date
$$;

-- Envoi des chiffres d'un mois : le 3 du mois suivant à 20 h (heure de Paris), jamais après
-- maintenant.
create or replace function pg_temp.envoi(p_recul integer) returns timestamptz
language sql stable as $$
  select least(((pg_temp.mois(p_recul - 1) + 2)::timestamp + time '20:00') at time zone 'Europe/Paris',
               now() - interval '1 hour')
$$;

create temp table graine40_fiche (
  code text primary key,
  ministere uuid not null,
  compte uuid not null,
  modele text
);

insert into graine40_fiche (code, ministere, compte, modele) values
  ('com', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'communication'),
  ('int', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'integration'),
  ('coo', (select m.id from public.ministere m where m.code = 'coordination'), '20000000-0000-4000-8000-000000000003',
   'coordination'),
  ('jeu', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', null),
  ('soc', '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 'social'),
  ('fij', (select m.id from public.ministere m where m.code = 'fij'), '20000000-0000-4000-8000-000000000006',
   'coordo fij'),
  ('pju', '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', 'prodiges junior'),
  ('for', '10000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000008', 'formation');

-- 1. Prévus et termes de leurs calculs, en un seul bloc : un calcul est complet (ses termes
-- écrits) à la fin de sa transaction (trigger différé termes_complets du lot B1).
do $$
begin
  insert into public.indicateur (libelle, definition, nature, unite, sensible, calcul, part, ministere_id, etat,
                                 origine, modele_code, sans_somme, saisi_dimanche_matin, libelle_sessions, ordre,
                                 cree_le, cree_par, texte_le, texte_par)
  select p.libelle, p.definition, p.nature, p.unite, p.sensible, p.calcul, p.part, f.ministere, 'actif',
         'eglise', p.code, p.sans_somme, p.saisi_dimanche_matin, p.libelle_sessions, p.ordre,
         pg_temp.h(timestamp '2026-06-01 09:45'), '20000000-0000-4000-8000-000000000021'::uuid,
         pg_temp.h(timestamp '2026-06-01 09:45'), '20000000-0000-4000-8000-000000000021'::uuid
    from graine40_fiche f
    join private.indicateur_prevu p on p.modele = f.modele
   order by f.code, p.ordre;

  insert into public.indicateur_terme (calcul_id, ordre, role, source_id, comptage, agregat, decalage)
  select c.id, t.ordre, t.role, s.id, t.comptage, t.agregat, t.decalage
    from graine40_fiche f
    join public.indicateur c on c.ministere_id = f.ministere
    join private.indicateur_prevu_terme t on t.prevu_code = c.modele_code
    left join public.indicateur s on s.ministere_id = f.ministere and s.modele_code = t.source_code
   order by c.id, t.ordre;
end $$;

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select pg_temp.h(timestamp '2026-06-01 09:45'), '20000000-0000-4000-8000-000000000021'::uuid, f.ministere,
       'indicateurs_prevus_crees', 'ministere', f.ministere,
       jsonb_build_object('modele', f.modele, 'nombre', count(p.code))
  from graine40_fiche f
  join private.indicateur_prevu p on p.modele = f.modele
 group by f.ministere, f.modele;

-- 2. Jeunesse : deux indicateurs ajoutés par l'administration, puis trois suggestions demandées
-- par le ministère (« Pourquoi » sans donnée personnelle).
insert into public.indicateur (libelle, definition, nature, unite, ministere_id, etat, origine, ordre,
                               cree_le, cree_par, texte_le, texte_par)
select v.libelle, v.definition, 'mois', v.unite, f.ministere, 'actif', 'eglise', v.ordre,
       pg_temp.h(timestamp '2026-06-15 10:00'), '20000000-0000-4000-8000-000000000021'::uuid,
       pg_temp.h(timestamp '2026-06-15 10:00'), '20000000-0000-4000-8000-000000000021'::uuid
  from (values
      ('Vues des vidéos de la jeunesse',
       'Vues du mois des vidéos de la jeunesse, relevées sur les statistiques des plateformes.', 'grand_nombre', 20),
      ('Jours de préparation des sorties',
       'Somme, pour les sorties du mois, des jours calendaires entre le début de la préparation et la sortie.', 'jours', 21)
    ) as v(libelle, definition, unite, ordre)
  join graine40_fiche f on f.code = 'jeu';

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select i.cree_le, i.cree_par, i.ministere_id, 'indicateur_cree', 'indicateur', i.id,
       jsonb_build_object('nature', i.nature, 'unite', i.unite, 'origine', 'eglise', 'remplace', null)
  from public.indicateur i
  join graine40_fiche f on f.code = 'jeu' and f.ministere = i.ministere_id
 where i.modele_code is null;

insert into public.indicateur (libelle, definition, nature, unite, ministere_id, etat, origine, modele_code,
                               sans_somme, saisi_dimanche_matin, libelle_sessions, cree_le, cree_par, texte_le, texte_par)
select p.libelle, p.definition, p.nature, p.unite, f.ministere, 'en_attente', 'ministere', p.code,
       p.sans_somme, p.saisi_dimanche_matin, p.libelle_sessions, pg_temp.h(v.cree), f.compte, pg_temp.h(v.cree), f.compte
  from (values
      ('suggestion_activites_realisees', timestamp '2026-09-02 20:00'),
      ('suggestion_projets_realises', timestamp '2026-09-03 20:00'),
      ('suggestion_participants', timestamp '2026-09-24 20:10')
    ) as v(code, cree)
  join private.indicateur_prevu p on p.code = v.code
  join graine40_fiche f on f.code = 'jeu';

insert into public.demande_indicateur (indicateur_id, ministere_id, objet, libelle, pourquoi, saisi_le, saisi_par)
select i.id, i.ministere_id, 'ajout', i.libelle, v.pourquoi, i.cree_le, i.cree_par
  from (values
      ('suggestion_activites_realisees',
       'Suivre les sorties et les ateliers de la jeunesse, pour en faire le bilan avec le conseil.'),
      ('suggestion_projets_realises',
       'Montrer au conseil les projets menés à terme par la jeunesse pendant l''année.'),
      ('suggestion_participants',
       'Savoir combien de jeunes viennent à nos activités, en plus des STARs au service.')
    ) as v(code, pourquoi)
  join graine40_fiche f on f.code = 'jeu'
  join public.indicateur i on i.ministere_id = f.ministere and i.modele_code = v.code;

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select d.saisi_le, d.saisi_par, d.ministere_id, 'indicateur_cree', 'indicateur', i.id,
       jsonb_build_object('nature', i.nature, 'unite', i.unite, 'origine', 'ministere', 'remplace', null,
                          'attente', true, 'demande', d.id)
  from public.demande_indicateur d
  join public.indicateur i on i.id = d.indicateur_id
  join graine40_fiche f on f.code = 'jeu' and f.ministere = d.ministere_id;

-- Décisions d'EJP Tech : Activités réalisées validée, Projets réalisés refusée (motif sans
-- donnée personnelle), Participants encore à valider.
insert into public.validation (demande_id, ministere_id, decision, motif, saisi_le, saisi_par)
select d.id, d.ministere_id, v.decision, v.motif, pg_temp.h(v.le), '20000000-0000-4000-8000-000000000031'::uuid
  from (values
      ('suggestion_activites_realisees', 'valide', null, timestamp '2026-09-04 10:00'),
      ('suggestion_projets_realises', 'refuse',
       'Les projets de la jeunesse se suivent déjà par les points d''attention de la fiche.', timestamp '2026-09-05 10:00')
    ) as v(code, decision, motif, le)
  join graine40_fiche f on f.code = 'jeu'
  join public.indicateur i on i.ministere_id = f.ministere and i.modele_code = v.code
  join public.demande_indicateur d on d.indicateur_id = i.id;

update public.indicateur i set etat = 'actif'
  from graine40_fiche f
 where f.code = 'jeu' and i.ministere_id = f.ministere and i.modele_code = 'suggestion_activites_realisees';

update public.indicateur i set etat = 'retire', retrait_motif = 'refuse', retire_le = pg_temp.h(timestamp '2026-09-05 10:00')
  from graine40_fiche f
 where f.code = 'jeu' and i.ministere_id = f.ministere and i.modele_code = 'suggestion_projets_realises';

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select v.saisi_le, v.saisi_par, v.ministere_id,
       case v.decision when 'valide' then 'indicateur_valide' else 'indicateur_refuse' end,
       'indicateur', d.indicateur_id, jsonb_build_object('demande', d.id, 'objet', d.objet)
  from public.validation v
  join public.demande_indicateur d on d.id = v.demande_id
  join graine40_fiche f on f.code = 'jeu' and f.ministere = v.ministere_id;

-- 3. Saisies : une seule instruction, le trigger de mesure écrit une ligne de journal par envoi
-- (même compte, même ministère, même heure). Un indicateur se retrouve par son code de prévu,
-- ou par son libellé (indicateurs de Jeunesse ajoutés par l'administration).
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select i.id, f.ministere, v.date_ref, v.valeur, v.saisi_le, f.compte
  from (values
      -- Intégration : NA et NC de quatre dimanches, Welcome Prodiges sur trois mois et le mois
      -- en cours, un indicateur bientôt retiré
      ('int', 'integration_nouveaux_arrivants_na', pg_temp.j(date '2026-09-06'), 4, pg_temp.hc(timestamp '2026-09-06 13:30')),
      ('int', 'integration_nouveaux_arrivants_na', pg_temp.j(date '2026-09-13'), 6, pg_temp.hc(timestamp '2026-09-13 13:30')),
      ('int', 'integration_nouveaux_arrivants_na', pg_temp.j(date '2026-09-20'), 3, pg_temp.hc(timestamp '2026-09-20 13:30')),
      ('int', 'integration_nouveaux_arrivants_na', pg_temp.j(date '2026-09-27'), 5, pg_temp.hc(timestamp '2026-09-27 13:30')),
      ('int', 'integration_nouveaux_convertis_nc', pg_temp.j(date '2026-09-13'), 1, pg_temp.hc(timestamp '2026-09-13 13:30')),
      ('int', 'integration_nouveaux_convertis_nc', pg_temp.j(date '2026-09-20'), 0, pg_temp.hc(timestamp '2026-09-20 13:30')),
      ('int', 'integration_nouveaux_convertis_nc', pg_temp.j(date '2026-09-27'), 2, pg_temp.hc(timestamp '2026-09-27 13:30')),
      ('int', 'integration_welcome_prodiges_sessions', pg_temp.mois(3), 1, pg_temp.envoi(3)),
      ('int', 'integration_welcome_prodiges_sessions', pg_temp.mois(2), 1, pg_temp.envoi(2)),
      ('int', 'integration_welcome_prodiges_sessions', pg_temp.mois(1), 2, pg_temp.envoi(1)),
      ('int', 'integration_welcome_prodiges_presents', pg_temp.mois(3), 7, pg_temp.envoi(3)),
      ('int', 'integration_welcome_prodiges_presents', pg_temp.mois(2), 9, pg_temp.envoi(2)),
      ('int', 'integration_welcome_prodiges_presents', pg_temp.mois(1), 18, pg_temp.envoi(1)),
      ('int', 'integration_welcome_prodiges_presents', pg_temp.mois(0), 6, pg_temp.envoi(0)),
      ('int', 'integration_na_revenus_au_culte', pg_temp.mois(2), 3, pg_temp.envoi(2)),
      ('int', 'integration_na_revenus_au_culte', pg_temp.mois(1), 2, pg_temp.envoi(1)),
      ('int', 'integration_integres_en_fij_na_et_nc', pg_temp.mois(1), 1, pg_temp.envoi(1)),
      ('int', 'integration_presences_d_equipiers_aux_evenements', pg_temp.mois(3), 5, pg_temp.envoi(3)),
      ('int', 'integration_presences_d_equipiers_aux_evenements', pg_temp.mois(2), 6, pg_temp.envoi(2)),
      ('int', 'integration_presences_d_equipiers_aux_evenements', pg_temp.mois(1), 4, pg_temp.envoi(1)),
      -- Coordination : heures (10 h 42 et 10 h 35, prévue à 10 h 30), baptêmes du dernier mois
      ('coo', 'coordination_heure_de_debut_du_culte', pg_temp.j(date '2026-09-20'), 642, pg_temp.hc(timestamp '2026-09-20 13:00')),
      ('coo', 'coordination_heure_de_debut_du_culte', pg_temp.j(date '2026-09-27'), 635, pg_temp.hc(timestamp '2026-09-27 13:00')),
      ('coo', 'coordination_heure_prevue_du_culte', pg_temp.j(date '2026-09-01'), 630, pg_temp.hc(timestamp '2026-09-01 20:00')),
      ('coo', 'coordination_bapteme_baptises', pg_temp.mois(1), 7, pg_temp.envoi(1)),
      ('coo', 'coordination_bapteme_sessions', pg_temp.mois(1), 2, pg_temp.envoi(1)),
      ('coo', 'coordination_bapteme_baptises_a_la_derniere_session_du_mois', pg_temp.mois(1), 4, pg_temp.envoi(1)),
      ('coo', 'coordination_evenements_commences_a_l_heure', pg_temp.mois(1), 3, pg_temp.envoi(1)),
      -- Social : le sensible (6, 1, 0, puis 2 au dernier mois fini), des euros, un « à ce jour »
      ('soc', 'social_beneficiaires_passages', pg_temp.mois(4), 6, pg_temp.envoi(4)),
      ('soc', 'social_beneficiaires_passages', pg_temp.mois(3), 1, pg_temp.envoi(3)),
      ('soc', 'social_beneficiaires_passages', pg_temp.mois(2), 0, pg_temp.envoi(2)),
      ('soc', 'social_beneficiaires_passages', pg_temp.mois(1), 2, pg_temp.envoi(1)),
      ('soc', 'social_fonds_leves', pg_temp.mois(2), 800, pg_temp.envoi(2)),
      ('soc', 'social_fonds_leves', pg_temp.mois(1), 1250, pg_temp.envoi(1)),
      ('soc', 'social_actions_sociales', pg_temp.mois(1), 3, pg_temp.envoi(1)),
      ('soc', 'social_partenariats_actifs', pg_temp.j(date '2026-09-03'), 4, pg_temp.hc(timestamp '2026-09-03 20:00')),
      -- Prodiges Junior : enfants présents de deux dimanches, enfants inscrits
      ('pju', 'prodiges_junior_enfants_presents', pg_temp.j(date '2026-09-20'), 14, pg_temp.hc(timestamp '2026-09-20 13:20')),
      ('pju', 'prodiges_junior_enfants_presents', pg_temp.j(date '2026-09-27'), 16, pg_temp.hc(timestamp '2026-09-27 13:20')),
      ('pju', 'prodiges_junior_enfants_inscrits', pg_temp.j(date '2026-09-20'), 40, pg_temp.hc(timestamp '2026-09-20 13:20')),
      -- EJP Formation : séances, questionnaire (12 satisfaites pour 10 réponses au dernier mois)
      ('for', 'formation_seances_presences', pg_temp.mois(2), 24, pg_temp.envoi(2)),
      ('for', 'formation_seances_presences', pg_temp.mois(1), 30, pg_temp.envoi(1)),
      ('for', 'formation_seances_presences_attendues', pg_temp.mois(2), 30, pg_temp.envoi(2)),
      ('for', 'formation_seances_presences_attendues', pg_temp.mois(1), 36, pg_temp.envoi(1)),
      ('for', 'formation_reponses_au_questionnaire', pg_temp.mois(2), 8, pg_temp.envoi(2)),
      ('for', 'formation_reponses_au_questionnaire', pg_temp.mois(1), 10, pg_temp.envoi(1)),
      ('for', 'formation_reponses_satisfaites', pg_temp.mois(2), 6, pg_temp.envoi(2)),
      ('for', 'formation_reponses_satisfaites', pg_temp.mois(1), 12, pg_temp.envoi(1)),
      ('for', 'formation_inscrits_pcnc', pg_temp.j(date '2026-09-20'), 20, pg_temp.hc(timestamp '2026-09-20 20:00')),
      ('for', 'formation_personnes_ayant_termine_la_formation', pg_temp.j(date '2026-09-20'), 12,
       pg_temp.hc(timestamp '2026-09-20 20:00')),
      -- Jeunesse : un grand nombre, des jours, l'ajout validé et l'ajout à valider
      ('jeu', 'Vues des vidéos de la jeunesse', pg_temp.mois(1), 12480, pg_temp.envoi(1)),
      ('jeu', 'Jours de préparation des sorties', pg_temp.mois(1), 9, pg_temp.envoi(1)),
      ('jeu', 'suggestion_activites_realisees', pg_temp.mois(1), 3, pg_temp.envoi(1)),
      ('jeu', 'suggestion_participants', pg_temp.mois(1), 25, now() - interval '2 hours')
    ) as v(fiche, cle, date_ref, valeur, saisi_le)
  join graine40_fiche f on f.code = v.fiche
  join public.indicateur i on i.ministere_id = f.ministere and (i.modele_code = v.cle or i.libelle = v.cle);

-- 4. Retrait avec saisies : Intégration ne suit plus les présences d'équipiers aux événements
-- (motif « plus suivi » ; ses saisies restent lisibles dans le bloc « Retirés »).
update public.indicateur i set etat = 'retire', retrait_motif = 'plus_suivi', retire_le = now() - interval '30 minutes'
  from graine40_fiche f
 where f.code = 'int' and i.ministere_id = f.ministere
   and i.modele_code = 'integration_presences_d_equipiers_aux_evenements';

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select i.retire_le, '20000000-0000-4000-8000-000000000021'::uuid, i.ministere_id, 'indicateur_retire', 'indicateur', i.id,
       jsonb_build_object('motif', 'plus_suivi', 'avec_saisies', true, 'calculs', 0)
  from public.indicateur i
  join graine40_fiche f on f.code = 'int' and f.ministere = i.ministere_id
 where i.modele_code = 'integration_presences_d_equipiers_aux_evenements';
