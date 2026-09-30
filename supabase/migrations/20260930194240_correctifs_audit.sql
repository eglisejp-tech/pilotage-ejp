-- Étape 1, migration 8 : correctifs demandés par l'audit RLS indépendant (sur 9d75e2c).
--
-- 1. Journal : l'administration de l'église ne lit plus les lignes des fiches ni des points
--    (P06 : elle voit la vue de l'église et le journal, mais ni les fiches ni les points).
-- 2. Événements : plus d'ajout direct dans evenement ; ajouter_evenement devient une fonction
--    private security definer derrière une fonction public security invoker.
-- 3. Points : dès qu'un suivi « traite » existe, le statut courant est « traite », quelles que
--    soient les heures des autres suivis.
-- 4. Droits par défaut : aucune fonction créée par postgres n'est exécutable par public, dans
--    aucun schéma (les GRANT restent explicites, fonction par fonction).
-- 5. Index du journal par action.

-- 4. Droits par défaut, tous schémas confondus
alter default privileges for role postgres revoke execute on functions from public;

-- 5. Index du journal par action (filtres de l'administration et d'EJP Tech)
create index journal_action_le_idx on public.journal (action, le desc);

-- 1. Journal de l'administration de l'église
--
-- Seul endroit qui liste ce que l'administration lit dans le journal : pour élargir, modifier
-- cette fonction seulement. Les lignes des fiches et des points (réunions, événements, points,
-- indicateurs propres) restent cachées.
create function private.journal_lisible_administration(p_action text, p_detail jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    -- Chiffres : seulement les envois qui ne portent que des indicateurs communs.
    when p_action = 'mesure_saisie' then not exists (
      select 1
        from jsonb_array_elements(case when jsonb_typeof(p_detail -> 'lignes') = 'array'
                                       then p_detail -> 'lignes' else '[]'::jsonb end) as l(ligne)
        join public.indicateur i on i.id = (l.ligne ->> 'indicateur_id')::uuid
       where i.ministere_id is not null)
    -- Comptes, ministères, sessions et présences, carte des FIJ, actions techniques.
    else p_action = any (array[
      'fij_saisie', 'participation_saisie',
      'session_declaree', 'session_modifiee', 'session_supprimee',
      'ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive', 'compte_reactive',
      'double_auth_reinitialisee', 'texte_relu', 'texte_masque'])
  end
$$;

revoke all on function private.journal_lisible_administration(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function private.journal_lisible_administration(text, jsonb) to authenticated;

drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  (select private.mon_type()) in ('berger', 'conseil')
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail))
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid())))
  or ((select private.mon_type()) = 'admin_plateforme'
      and action in ('ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive',
                     'compte_reactive', 'double_auth_reinitialisee', 'texte_relu', 'texte_masque')));

-- La vue applique le même filtre, en plus de la politique de la table.
create or replace view public.v_journal with (security_invoker = true) as
select j.id, j.le, j.compte, j.ministere_id, j.action, j.cible, j.cible_id, j.detail,
       case when j.compte is null then 'Système' else a.libelle end as compte_libelle,
       a.ministere_id as auteur_ministere_id,
       m.nom as ministere_nom,
       case j.cible
         when 'point_attention' then (select p.titre from public.point_attention p where p.id = j.cible_id)
         when 'point_suivi' then (select p.titre from public.point_suivi s
                                    join public.point_attention p on p.id = s.point_id
                                   where s.id = j.cible_id)
         when 'evenement' then (select e.titre from public.evenement e where e.id = j.cible_id)
         when 'reunion' then (select r.objet from public.reunion r where r.id = j.cible_id)
         when 'session' then (select x.intitule from public.session x where x.id = j.cible_id)
         when 'compte' then (select c.libelle from public.compte c where c.user_id = j.cible_id)
         when 'ministere' then (select x.nom from public.ministere x where x.id = j.cible_id)
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
where (select private.mon_type()) is distinct from 'admin_eglise'
   or private.journal_lisible_administration(j.action, j.detail);

-- 2. Événements : l'ajout passe seulement par ajouter_evenement. La mise à jour reste une
-- insertion directe dans evenement_etat, pour les événements du ministère seulement : aucune
-- règle de l'API n'y est contournée (la date « pas avant aujourd'hui » vaut à la création ; un
-- événement passé se reporte « Terminé » avec sa date).
drop policy ajout on public.evenement;
revoke insert on public.evenement from authenticated;

create function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_evenement uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if v_ministere is null then
    raise exception 'Seul un compte de ministère peut ajouter un événement.' using errcode = '42501';
  end if;
  v_titre := btrim(coalesce(p_titre, ''));
  if char_length(v_titre) not between 1 and 80 then
    raise exception 'Donnez un nom à l''événement (80 caractères au plus).';
  end if;
  if p_date is null then
    raise exception 'Choisissez une date.';
  end if;
  if p_date < private.aujourdhui() then
    raise exception 'La date ne peut pas être passée.';
  end if;
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  insert into public.evenement (ministere_id, titre) values (v_ministere, v_titre)
  returning id into v_evenement;
  -- Premier état : le trigger de evenement_etat écrit la ligne de journal evenement_ajoute,
  -- au nom du compte connecté (auteur imposé par forcer_auteur).
  insert into public.evenement_etat (evenement_id, date, statut) values (v_evenement, p_date, p_statut);
  return v_evenement;
end $$;

create or replace function public.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement)
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_evenement(p_titre, p_date, p_statut);
$$;

revoke all on function private.ajouter_evenement(text, date, public.statut_evenement)
  from public, anon, authenticated, service_role;
grant execute on function private.ajouter_evenement(text, date, public.statut_evenement) to authenticated;
revoke all on function public.ajouter_evenement(text, date, public.statut_evenement)
  from public, anon, service_role;
grant execute on function public.ajouter_evenement(text, date, public.statut_evenement) to authenticated;

-- 3. Points : « Traité » est définitif, quelles que soient les heures des suivis.
create or replace view public.v_point with (security_invoker = true) as
select p.id, p.ministere_id, p.titre, p.description, p.action_attendue, p.priorite, p.echeance,
       p.saisi_le as cree_le, p.saisi_par as cree_par,
       s.statut, s.saisi_le as statut_le,
       t.id as traitement_id, t.saisi_le as traite_le, t.saisi_par as traite_par,
       t.commentaire as traite_commentaire
from public.point_attention p
join lateral (select x.statut, x.saisi_le from public.point_suivi x
              where x.point_id = p.id
              order by (x.statut = 'traite') desc, x.saisi_le desc
              limit 1) s on true
left join public.point_suivi t on t.point_id = p.id and t.statut = 'traite';

create or replace function private.changer_statut_point(p_point_id uuid, p_statut public.statut_point)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_mon_ministere uuid;
  v_point public.point_attention%rowtype;
  v_actuel public.statut_point;
begin
  perform private.exige_aal2();
  v_mon_ministere := private.mon_ministere();
  select p.* into v_point from public.point_attention p
   where p.id = p_point_id
     and (p.ministere_id = v_mon_ministere
          or exists (select 1 from public.point_mention m
                      where m.point_id = p.id and m.ministere_id = v_mon_ministere))
     for update of p;
  if v_point.id is null then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  -- Statut courant : « traite » l'emporte sur tout autre suivi, même plus récent.
  select s.statut into v_actuel from public.point_suivi s
   where s.point_id = p_point_id
   order by (s.statut = 'traite') desc, s.saisi_le desc
   limit 1;
  if v_actuel = 'traite' then
    raise exception 'Ce point est traité : il ne change plus.';
  end if;
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  if p_statut = 'traite' then
    raise exception 'Utilisez le bouton Marquer traité.';
  end if;
  if v_actuel = p_statut then
    return;                               -- même statut : rien n'est écrit
  end if;
  insert into public.point_suivi (point_id, statut) values (p_point_id, p_statut);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_point.ministere_id, 'point_statut', 'point_attention', p_point_id,
          jsonb_build_object('statut', jsonb_build_array(v_actuel, p_statut)));
end $$;
