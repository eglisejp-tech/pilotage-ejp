-- Ponctualité des événements, migration 1 sur 3 : heures des événements (T68, demande de
-- Coordination et réponses de la personne responsable du 23 octobre 2026 ; docs/decisions.md,
-- T68). Le lot de lecture (comptages et ponctualité) est dans 20261023120500_evenements_comptages.sql.
--
-- 1. evenement_etat gagne deux colonnes facultatives, en minutes depuis minuit à l'heure de Paris
--    (comme l'unité « heure » des indicateurs, K22a) : heure_prevue et heure_debut. Une heure de
--    début n'existe que sur un état « Terminé » (contrainte nommée). Les colonnes suivent les
--    droits de la table : GRANT insert et politique « ajout » du ministère porteur inchangés.
-- 2. private.controler_evenement_etat() recréée. Après le verrou et la lecture du dernier état :
--    une heure prévue vide reprend celle du dernier état ; une heure de début hors « Terminé » est
--    refusée ; une heure de début vide sur un « Terminé » reprend celle du dernier état ; une heure
--    de début sur une date à venir est refusée ; « Rien n'a changé » compare aussi les deux heures.
--    Une heure se corrige, elle ne s'efface pas. Le premier état passe par les deux refus.
--    Comme avant, le contrôle ne vise que le ministère porteur en aal2 (sinon la RLS refuse).
-- 3. ajouter_evenement à 5 arguments (heure prévue, sans valeur par défaut pour que PostgREST ne
--    trouve jamais deux candidates) ; les versions à 4 et 3 arguments délèguent avec null.
-- 4. v_evenement recréée : les neuf colonnes inchangées, puis heure_prevue, heure_debut, retard
--    (minutes signées, négatif pour une avance, seulement sur un « Terminé » qui a ses deux
--    heures) et a_l_heure (retard de 5 minutes au plus, K22b). L'écran ne recalcule rien.
-- 5. Journal : evenement_ajoute porte heure_prevue si elle est renseignée ; evenement_modifie
--    porte heure_prevue et heure_debut si elles sont renseignées et changent. Clé absente sinon,
--    entiers en minutes, jamais de texte libre.

-- 1. Colonnes

alter table public.evenement_etat
  add column heure_prevue smallint check (heure_prevue between 0 and 1439),
  add column heure_debut smallint check (heure_debut between 0 and 1439),
  add constraint evenement_etat_heure_debut_termine check (heure_debut is null or statut = 'termine');

-- 2. Fonctions de ponctualité, pures : l'écart ramené dans ]-720, 720] (une heure de début après
-- minuit pour une heure prévue le soir : 23 h 30 puis 0 h 05 donne 35), et la tolérance de K22b.
-- Lues par v_evenement (security_invoker) : authenticated les exécute, comme aujourdhui().

create function private.retard_minutes(p_prevue smallint, p_debut smallint) returns integer
language sql immutable strict set search_path = '' as $$
  select case when x.ecart > 720 then x.ecart - 1440 else x.ecart end
    from (select ((p_debut::integer - p_prevue::integer) % 1440 + 1440) % 1440 as ecart) as x
$$;

create function private.tolerance_ponctualite() returns integer
language sql immutable set search_path = '' as $$
  select 5
$$;

revoke all on function private.retard_minutes(smallint, smallint), private.tolerance_ponctualite()
  from public, anon, authenticated, service_role;
grant execute on function private.retard_minutes(smallint, smallint), private.tolerance_ponctualite()
  to authenticated;

-- 3. Contrôle de chaque nouvel état

create or replace function private.controler_evenement_etat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_trouve boolean;
  v_date date;
  v_statut public.statut_evenement;
  v_prevue smallint;
  v_debut smallint;
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2'
     or not exists (select 1 from public.evenement e
                     where e.id = new.evenement_id and e.ministere_id = private.mon_ministere()) then
    return new;
  end if;
  -- Verrou sur l'événement : deux envois simultanés (double clic, deux onglets, nouvel essai
  -- du réseau) se suivent, et le second lit le dernier état déjà validé par le premier.
  perform 1 from public.evenement e where e.id = new.evenement_id for no key update;
  select x.date, x.statut, x.heure_prevue, x.heure_debut into v_date, v_statut, v_prevue, v_debut
    from public.evenement_etat x
   where x.evenement_id = new.evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  v_trouve := found;
  -- Une heure vide reprend la dernière : une heure se corrige, elle ne s'efface pas.
  if new.heure_prevue is null then
    new.heure_prevue := v_prevue;
  end if;
  if new.heure_debut is not null and new.statut <> 'termine' then
    raise exception 'L''heure de début se saisit pour un événement terminé.';
  end if;
  if new.heure_debut is null and new.statut = 'termine' then
    new.heure_debut := v_debut;
  end if;
  if new.heure_debut is not null and new.date > private.aujourdhui() then
    raise exception 'L''heure de début se saisit le jour de l''événement ou après.';
  end if;
  if not v_trouve then
    return new;
  end if;
  if new.date is distinct from v_date and new.date < private.aujourdhui() then
    raise exception 'La nouvelle date doit être aujourd''hui ou plus tard.';
  end if;
  if new.date = v_date and new.statut = v_statut
     and new.heure_prevue is not distinct from v_prevue
     and new.heure_debut is not distinct from v_debut then
    raise exception 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.';
  end if;
  return new;
end $$;

-- 4. Ajout d'un événement avec son heure prévue

create function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_mentions uuid[];
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
  if p_heure_prevue is not null and p_heure_prevue not between 0 and 1439 then
    raise exception 'L''heure prévue est invalide.';
  end if;
  -- Mentions : doublons et valeurs vides retirés ; jamais soi-même ; ministères actifs seulement.
  select coalesce(array_agg(distinct x.id), '{}') into v_mentions
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  if exists (select 1 from unnest(v_mentions) as x(id)
             where x.id = v_ministere
                or not exists (select 1 from public.ministere m where m.id = x.id and m.desactive_le is null)) then
    raise exception 'Ce ministère ne peut pas être mentionné.';
  end if;
  insert into public.evenement (ministere_id, titre) values (v_ministere, v_titre)
  returning id into v_evenement;
  insert into public.evenement_mention (evenement_id, ministere_id)
  select v_evenement, x.id from unnest(v_mentions) as x(id);
  -- Premier état, avec l'heure prévue et jamais d'heure de début : le trigger de evenement_etat
  -- écrit la ligne de journal evenement_ajoute, avec les mentions déjà posées, au nom du compte
  -- connecté (auteur imposé par forcer_auteur).
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue)
  values (v_evenement, p_date, p_statut, p_heure_prevue);
  return v_evenement;
end $$;

create function public.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint)
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_evenement(p_titre, p_date, p_statut, p_mentions, p_heure_prevue);
$$;

revoke all on function private.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint)
  from public, anon, authenticated, service_role;
grant execute on function private.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint)
  to authenticated;
revoke all on function public.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint)
  from public, anon, authenticated, service_role;
grant execute on function public.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint)
  to authenticated;

-- La version à quatre arguments délègue, sans heure prévue ; celle à trois arguments délègue
-- déjà à celle-ci. Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  return private.ajouter_evenement(p_titre, p_date, p_statut, p_mentions, null::smallint);
end $$;

-- 5. Vue des événements : les neuf colonnes de B6, puis les heures du dernier état, le retard et
-- « à l'heure ».

create or replace view public.v_evenement with (security_invoker = true) as
select d.id, d.ministere_id, d.titre, d.date, d.statut, d.mis_a_jour_le,
       d.date - private.aujourdhui() as jours,
       (d.statut = 'attente_validation'
        and d.date <= private.aujourdhui() + 3
        and exists (select 1 from public.ministere m where m.id = d.ministere_id and m.desactive_le is null))
         as a_confirmer,
       case when d.date_precedente <> d.date then d.date_precedente end as reporte_du,
       d.heure_prevue, d.heure_debut,
       r.retard,
       r.retard <= private.tolerance_ponctualite() as a_l_heure
from (
  select distinct on (e.id) e.id, e.ministere_id, e.titre, x.date, x.statut, x.saisi_le as mis_a_jour_le,
         lag(x.date) over (partition by e.id order by x.saisi_le, x.id) as date_precedente,
         x.heure_prevue, x.heure_debut
  from public.evenement e
  join public.evenement_etat x on x.evenement_id = e.id
  order by e.id, x.saisi_le desc, x.id desc
) as d
cross join lateral (
  select case when d.statut = 'termine' then private.retard_minutes(d.heure_prevue, d.heure_debut) end as retard
) as r;

-- 6. Journal des événements
--
-- Une ligne par envoi et par événement, comme avant. L'état qui précédait l'envoi (le plus
-- récent hors de cet envoi) donne la date précédente et les heures précédentes.
create or replace function private.journaliser_evenements() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  select x.saisi_le, x.saisi_par, x.ministere_id, x.action, 'evenement', x.evenement_id,
         case x.action
           when 'evenement_ajoute' then jsonb_build_object(
             'date', x.date, 'statut', x.statut,
             'mentions', coalesce((select jsonb_agg(m.ministere_id order by m.ministere_id)
                                     from public.evenement_mention m
                                    where m.evenement_id = x.evenement_id), '[]'::jsonb))
             || case when x.heure_prevue is not null
                     then jsonb_build_object('heure_prevue', x.heure_prevue) else '{}'::jsonb end
           else jsonb_build_object('date', x.date, 'statut', x.statut, 'date_precedente', x.date_precedente)
             || case when x.heure_prevue is not null and x.heure_prevue is distinct from x.prevue_precedente
                     then jsonb_build_object('heure_prevue', x.heure_prevue) else '{}'::jsonb end
             || case when x.heure_debut is not null and x.heure_debut is distinct from x.debut_precedent
                     then jsonb_build_object('heure_debut', x.heure_debut) else '{}'::jsonb end
         end
  from (
    select distinct on (n.saisi_le, n.saisi_par, n.evenement_id)
           n.saisi_le, n.saisi_par, n.evenement_id, n.date, n.statut, n.heure_prevue, n.heure_debut,
           e.ministere_id,
           case when exists (select 1 from public.evenement_etat a
                              where a.evenement_id = n.evenement_id
                                and (a.saisi_le < n.saisi_le
                                     or not exists (select 1 from nouvelles y where y.id = a.id)))
                then 'evenement_modifie' else 'evenement_ajoute' end as action,
           p.date as date_precedente, p.heure_prevue as prevue_precedente, p.heure_debut as debut_precedent
    from nouvelles n
    join public.evenement e on e.id = n.evenement_id
    left join lateral (
      select q.date, q.heure_prevue, q.heure_debut from public.evenement_etat q
       where q.evenement_id = n.evenement_id
         and not exists (select 1 from nouvelles y where y.id = q.id)
       order by q.saisi_le desc, q.id desc
       limit 1
    ) as p on true
    order by n.saisi_le, n.saisi_par, n.evenement_id, n.id desc
  ) as x;
  return null;
end $$;
