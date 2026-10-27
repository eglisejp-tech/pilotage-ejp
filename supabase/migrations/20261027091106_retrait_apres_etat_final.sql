-- Retrait d'un événement après un état final (T78, lot 1 ; décision de la personne responsable
-- du 27 octobre 2026, docs/decisions.md, T78) ; et la liste des écritures des incidents d'envoi
-- (T76, lot C) complétée des trois fonctions de T78, vérifiée à la fusion de T76 et T77.
--
-- 1. Une fois « Terminé » ou « Annulé » enregistré pour un événement (une ligne de
--    evenement_etat avec ce statut, même remplacée ensuite par un autre état), son ministère
--    porteur ne le retire plus : son retard sortirait des comptages de ponctualité. EJP Tech le
--    retire à tout moment, à la demande du ministère par un signalement. Le refus dit le dernier
--    état final enregistré (« Un événement terminé se retire par EJP Tech. », « Un événement
--    annulé se retire par EJP Tech. ») ; il passe avant celui de la date (« Un événement passé se
--    retire par EJP Tech. »), inchangé. Avant tout état final, le porteur retire encore son
--    événement jusqu'à sa date comprise (heure de Paris). Le contrôle se lit après le verrou sur
--    l'événement : un « Terminé » enregistré au même moment passe avant ou après, jamais entre.
--    Version de 20261026235900_evenements_corrections.sql, plus ce contrôle. Même signature :
--    create or replace garde le propriétaire et les droits (authenticated seul).
-- 2. private.operations_incident() : version de 20261026180530_incidents_envoi.sql, plus
--    corriger_titre_evenement, modifier_mentions_evenement et retirer_evenement (sans elles,
--    leurs incidents arriveraient en « autre »). La liste ne fait que grandir : les lignes déjà
--    gardées restent valables pour le check de private.incident. Même liste dans
--    src/data/incidents.ts (OPERATIONS_INCIDENT), comparée par src/data/incidents.test.ts.
--
-- À la fusion de T76 (lots B et C) et de T77 : journal_action_check, journal_suivi_signalement_cible_check
-- et private.tableau_ministeres de 20261026235900 gardent tout ce que T77 avait posé ; aucune
-- autre fonction, vue, politique ni contrainte de T76 ou de T77 n'est redéfinie par T78.
--
-- Aucune donnée personnelle ; aucune date du jour dans une contrainte ; aucun SQL dynamique.

-- 1. Retrait

create or replace function private.retirer_evenement(p_evenement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
  v_tech boolean;
  v_date date;
  v_statut public.statut_evenement;
  v_final public.statut_evenement;
begin
  perform private.exige_aal2();
  v_tech := private.peut_configurer();
  select e.ministere_id into v_porteur from public.evenement e where e.id = p_evenement_id;
  if v_porteur is null or not (v_tech or coalesce(v_porteur = private.mon_ministere(), false)) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform 1 from public.evenement e where e.id = p_evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = p_evenement_id) then
    return;                               -- déjà retiré : rien n'est écrit
  end if;
  select x.date, x.statut into v_date, v_statut from public.evenement_etat x
   where x.evenement_id = p_evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  if not v_tech then
    -- Le dernier état final enregistré, même remplacé depuis par un autre état.
    select x.statut into v_final from public.evenement_etat x
     where x.evenement_id = p_evenement_id and x.statut in ('termine', 'annule')
     order by x.saisi_le desc, x.id desc
     limit 1;
    if v_final = 'termine' then
      raise exception 'Un événement terminé se retire par EJP Tech.';
    elsif v_final = 'annule' then
      raise exception 'Un événement annulé se retire par EJP Tech.';
    end if;
    if v_date < private.aujourdhui() then
      raise exception 'Un événement passé se retire par EJP Tech.';
    end if;
  end if;
  insert into public.evenement_retrait (evenement_id) values (p_evenement_id);
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_retire', 'evenement', p_evenement_id,
          jsonb_build_object('date', v_date, 'statut', v_statut));
end $$;

-- 2. Écritures gardées par les incidents d'envoi

create or replace function private.operations_incident() returns text[]
language sql immutable set search_path = '' as $$
  select array['accepter_conditions', 'ajouter_evenement', 'ajouter_suggestion', 'changer_statut_point',
               'choisir_modele_prevus', 'clore_signalement', 'corriger_indicateur', 'creer_calcul',
               'creer_indicateur', 'creer_indicateurs_prevus', 'creer_point', 'declarer_intervenant',
               'declarer_session', 'effacer_prenom', 'effacer_prenoms_anciens', 'marquer_relu',
               'marquer_traite', 'masquer_texte', 'modifier_mentions_point', 'modifier_session',
               'retirer_indicateur', 'retirer_mon_indicateur', 'saisir_chiffres_mois',
               'saisir_fij_statistiques', 'signaler_difficulte', 'supprimer_session', 'valider_indicateur',
               'prendre_en_charge_signalement', 'repondre_au_ministere', 'confirmer_signalement',
               'repondre_a_ejp_tech',
               'corriger_titre_evenement', 'modifier_mentions_evenement', 'retirer_evenement',
               'evenement_etat', 'fij_departement', 'mesure', 'participation', 'passage', 'reunion',
               'creer-compte', 'relancer-invitation', 'desactiver-compte', 'reactiver-compte',
               'reinitialiser-2fa', 'corriger-adresse', 'supprimer-ministere',
               'autre']
$$;
