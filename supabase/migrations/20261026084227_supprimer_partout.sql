-- « Supprimer » partout, avec la raison d'un refus (décision T75 de docs/decisions.md, qui révise
-- T74 ; conception validée par la personne responsable le 26 octobre 2026).
--
-- T74 n'affichait « Supprimer » que pour un ministère que la base jugeait vide, sans jamais dire
-- pourquoi un autre ne l'était pas. En production, EJP TECH (créé avec une adresse mal tapée,
-- désactivé, réactivé, invitations envoyées, 8 indicateurs prévus, aucune saisie, compte jamais
-- activé) n'avait pas le bouton. Cause : la règle « une session déjà saisie qui l'attend »
-- (20261025192715_comptes_corrections.sql, reprise par 20261025204627, lignes 47 à 49) comptait
-- les présences de TOUS les ministères de la session, pas les siennes. Une session cochée pendant
-- qu'EJP TECH était actif l'attendait, d'autres ministères y avaient saisi leurs présences : EJP
-- TECH était refusé pour des saisies qui n'étaient pas les siennes. EJP FORMATION, créé après les
-- sessions saisies, n'était attendu par aucune. Le cas est reproduit geste par geste dans
-- supabase/tests/comptes-suppression.test.sql.
--
-- Règles corrigées : seules les vraies données du ministère comptent.
-- 1. private.raisons_suppression dit, avec un code stable et un nombre, chaque raison
--    pour laquelle un ministère ne se supprime pas (l'écran les traduit) :
--      ministere_de_reference  FIJ ou Coordination (posés par les migrations avec un code) :
--                              seule raison rendue, ils ne se suppriment jamais ;
--      compte_deja_active      un de ses comptes a atteint la double authentification un jour :
--                              facteur TOTP vérifié, « Refaire l'activation » (ligne
--                              double_auth_reinitialisee), ou une trace écrite par le compte
--                              lui-même (ligne de journal, personne déclarée, conditions
--                              acceptées). Un clic sur l'invitation sans le code ne compte pas
--                              (validé le 26 octobre 2026) ;
--      chiffres, presences (sessions où il a saisi ses présences), carte_fij, statistiques_fij,
--      repartitions, precisions, points, mentions_points (points distincts), evenements,
--      mentions_evenements (événements distincts), reunions, signalements, demandes,
--      validations, retraits (retraits demandés par le ministère) : ses saisies et ses traces,
--      dans des tables en ajout seulement qui le visent par une clé étrangère.
--    Une ligne d'information, qui ne bloque pas : sessions_attendues, le nombre de sessions qui
--    l'attendent. La suppression le retire de leur liste de ministères attendus
--    (session_attendu n'est pas une table en ajout seulement) : leur complétude passée ne le
--    compte plus (« 6 sur 8 » devient « 6 sur 7 », validé le 26 octobre 2026), la ligne de
--    journal ministere_supprime garde ce nombre (« sessions »).
--    Ne bloquent pas (aucune de ces lignes n'est lue) : les gestes d'administration d'EJP Tech
--    (création, invitation et relance, correction d'adresse, désactivation, réactivation,
--    création ou retrait d'indicateurs prévus, choix de la liste T72), une session qui l'attend
--    sans aucune saisie de lui.
-- 2. private.refus_suppression_ministere (même signature, même contrat) se lit désormais dans
--    cette liste : la suppression revérifie avec les mêmes règles que l'écran, et refuse avec
--    les mêmes codes qu'avant (ministere_de_reference, compte_deja_active, ministere_non_vide),
--    que l'Edge Function supprimer-ministere traduit déjà (elle ne change pas). Une clé
--    étrangère imprévue reste le filet : la suppression échoue et annule tout
--    (ministere_non_vide). v_ministeres_supprimables suit ; elle reste pour l'écran déjà en
--    ligne, qui la lit jusqu'à la mise en ligne du nouveau.
-- 3. Lecture de l'écran, EJP Tech seul, en aal2 : public.raisons_suppression_ministere(id), en
--    security invoker, sur private.raisons_suppression_ministere en security definer. Sans
--    identifiant, les raisons de tous les ministères (l'écran les lit avec la liste) ; avec, celles
--    d'un ministère (l'écran les relit après un refus de la suppression).
-- 4. private.serveur_supprimer_ministere : même corps, plus le nombre de sessions quittées dans
--    la ligne ministere_supprime.

-- 1. Compte activé un jour (la colonne secret des facteurs n'est jamais lue).
create function private.compte_active_un_jour(p_user_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select private.compte_active(p_user_id)
      or exists (select 1 from public.journal j
                  where j.action = 'double_auth_reinitialisee' and j.cible_id = p_user_id)
      or exists (select 1 from public.journal j where j.compte = p_user_id)
      or exists (select 1 from public.intervenant x where x.compte = p_user_id)
      or exists (select 1 from public.acceptation_conditions x where x.compte = p_user_id)
$$;

-- 2. Raisons d'un refus, dans l'ordre d'affichage ; aucune ligne pour un ministère inconnu.
create function private.raisons_suppression(p_ministere_id uuid)
returns table (ordre integer, code text, nombre integer, bloque boolean)
language plpgsql stable set search_path = '' as $$
begin
  if exists (select 1 from public.ministere m where m.id = p_ministere_id and m.code is not null) then
    return query select 1, 'ministere_de_reference'::text, 1, true;
    return;
  end if;
  return query
    select r.ordre, r.code, r.nombre::integer, r.ordre < 100
      from (values
        (2, 'compte_deja_active', (select count(*) from public.compte c
                                    where c.ministere_id = p_ministere_id
                                      and private.compte_active_un_jour(c.user_id))),
        (3, 'chiffres', (select count(*) from public.mesure x where x.ministere_id = p_ministere_id)),
        (4, 'presences', (select count(distinct x.session_id) from public.participation x
                           where x.ministere_id = p_ministere_id)),
        (5, 'carte_fij', (select count(*) from public.fij_departement x where x.ministere_id = p_ministere_id)),
        (6, 'statistiques_fij', (select count(*) from public.fij_statistique x
                                  where x.ministere_id = p_ministere_id)),
        (7, 'repartitions', (select count(*) from public.ventilation_sensible x
                              where x.ministere_id = p_ministere_id)),
        (8, 'precisions', (select count(*) from public.precision_sensible x
                            where x.ministere_id = p_ministere_id)),
        (9, 'points', (select count(*) from public.point_attention x where x.ministere_id = p_ministere_id)),
        (10, 'mentions_points', (select count(distinct x.point_id) from public.point_mention x
                                  where x.ministere_id = p_ministere_id)),
        (11, 'evenements', (select count(*) from public.evenement x where x.ministere_id = p_ministere_id)),
        (12, 'mentions_evenements', (select count(distinct x.evenement_id) from public.evenement_mention x
                                      where x.ministere_id = p_ministere_id)),
        (13, 'reunions', (select count(*) from public.reunion x where x.ministere_id = p_ministere_id)),
        (14, 'signalements', (select count(*) from public.signalement x where x.ministere_id = p_ministere_id)),
        (15, 'demandes', (select count(*) from public.demande_indicateur x
                           where x.ministere_id = p_ministere_id)),
        (16, 'validations', (select count(*) from public.validation x where x.ministere_id = p_ministere_id)),
        (17, 'retraits', (select count(*) from public.retrait_indicateur x
                           where x.ministere_id = p_ministere_id)),
        -- Information : les sessions qu'il quittera.
        (100, 'sessions_attendues', (select count(*) from public.session_attendu x
                                      where x.ministere_id = p_ministere_id))
      ) as r(ordre, code, nombre)
     where r.nombre > 0
     order by r.ordre;
end $$;

-- Pourquoi un ministère ne se supprime pas ; null s'il se supprime. Même signature et mêmes
-- codes que dans 20261025204627_comptes_corrections_activation.sql : la première raison qui
-- bloque, ramenée à l'un des trois codes que l'Edge Function connaît. create or replace garde
-- le propriétaire et les droits (aucun pour personne).
create or replace function private.refus_suppression_ministere(p_ministere_id uuid) returns text
language sql stable set search_path = '' as $$
  select case
    when p_ministere_id is null
      or not exists (select 1 from public.ministere m where m.id = p_ministere_id) then 'ministere_inconnu'
    else (select case when r.code in ('ministere_de_reference', 'compte_deja_active') then r.code
                      else 'ministere_non_vide' end
            from private.raisons_suppression(p_ministere_id) as r
           where r.bloque
           order by r.ordre
           limit 1)
  end
$$;

-- 3. Lecture de l'écran 13 : EJP Tech seul, en aal2. Sans identifiant, tous les ministères.
create function private.raisons_suppression_ministere(p_ministere_id uuid)
returns table (ministere_id uuid, code text, nombre integer, bloque boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if not coalesce(private.mon_type() = 'admin_plateforme', false) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  return query
    select m.id, r.code, r.nombre, r.bloque
      from public.ministere m
     cross join lateral private.raisons_suppression(m.id) as r
     where p_ministere_id is null or m.id = p_ministere_id
     order by m.id, r.ordre;
end $$;

create function public.raisons_suppression_ministere(p_ministere_id uuid default null)
returns table (ministere_id uuid, code text, nombre integer, bloque boolean)
language sql stable security invoker set search_path = '' as $$
  select * from private.raisons_suppression_ministere(p_ministere_id);
$$;

-- 4. Suppression (20261025211216_comptes_corrections_securite.sql) : même corps, plus le nombre
-- de sessions dont le ministère sort, gardé par la ligne ministere_supprime. create or replace
-- garde le propriétaire et les droits (service_role seulement).
create or replace function private.serveur_supprimer_ministere(
  p_appelant uuid, p_session uuid, p_ministere_id uuid
) returns uuid[]
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ministere public.ministere;
  v_comptes uuid[];
  v_indicateurs integer;
  v_sessions integer;
  v_compte uuid;
begin
  perform private.controler_appel(p_appelant, p_session);
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  select m.* into v_ministere from public.ministere m where m.id = p_ministere_id for update;
  perform 1 from public.compte c where c.ministere_id = p_ministere_id for update;
  perform 1 from public.session s
   where s.id in (select a.session_id from public.session_attendu a where a.ministere_id = p_ministere_id)
     for update;
  perform private.controler_suppression_ministere(p_ministere_id);
  select coalesce(array_agg(c.user_id order by c.user_id), array[]::uuid[]) into v_comptes
    from public.compte c where c.ministere_id = p_ministere_id;
  select count(*)::integer into v_indicateurs from public.indicateur i where i.ministere_id = p_ministere_id;
  select count(*)::integer into v_sessions from public.session_attendu a where a.ministere_id = p_ministere_id;

  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, p_ministere_id, 'ministere_supprime', 'ministere', p_ministere_id,
          jsonb_build_object('nom', v_ministere.nom, 'indicateurs', v_indicateurs,
                             'comptes', cardinality(v_comptes), 'sessions', v_sessions));

  begin
    perform set_config('pilotage.suppression_ministere', p_ministere_id::text, true);
    delete from public.indicateur_terme t
     using public.indicateur i
     where i.id = t.calcul_id and i.ministere_id = p_ministere_id;
    delete from public.indicateur where ministere_id = p_ministere_id;
    delete from private.ministere_modele where ministere_id = p_ministere_id;
    perform set_config('pilotage.suppression_ministere', '', true);
    delete from public.session_attendu where ministere_id = p_ministere_id;
    foreach v_compte in array v_comptes loop
      perform private.revoquer_sessions(v_compte);
    end loop;
    delete from public.compte where ministere_id = p_ministere_id;
    delete from public.ministere where id = p_ministere_id;
  exception when foreign_key_violation then
    raise exception 'ministere_non_vide';
  end;
  return v_comptes;
end $$;

-- 5. Droits : les aides à personne ; la lecture privée à authenticated (elle refuse tout autre
-- profil qu'EJP Tech en aal2) ; la fonction public à authenticated seulement.
revoke all on function
  private.compte_active_un_jour(uuid),
  private.raisons_suppression(uuid)
from public, anon, authenticated, service_role;
revoke all on function private.raisons_suppression_ministere(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.raisons_suppression_ministere(uuid) to authenticated;
revoke all on function public.raisons_suppression_ministere(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.raisons_suppression_ministere(uuid) to authenticated;
