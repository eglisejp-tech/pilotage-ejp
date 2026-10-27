-- Règles des plages décidées par la personne responsable le 27 octobre 2026 (T78, lot 2 ;
-- docs/decisions.md). La migration 20261027141108_evenements_plages.sql est suivie par git : les
-- deux fonctions sont recréées ici, mêmes signatures, mêmes droits (create or replace les garde).
--
-- 1. Les dates d'un événement passé : une fois son dernier jour passé (heure de Paris,
--    private.aujourdhui()), le porteur ne change plus ses dates, ni le premier jour (report) ni
--    le dernier (prolonger, avancer la fin). Il garde le statut et les heures. EJP Tech corrige
--    les dates à la demande du ministère, par un signalement (docs/exploitation.md, 11.2).
--    Refus : « Les dates d'un événement passé se corrigent par EJP Tech. », avant les autres
--    contrôles de date. Cette règle tranche le point (3) laissé ouvert par le lot 2.
-- 2. « Toute la série » retirée par le porteur : seules les dates sans état final enregistré
--    partent (déjà le cas) ; quand il ne reste rien qu'il puisse retirer, la phrase dit pourquoi :
--    « Les dates terminées, annulées ou passées se retirent par EJP Tech. » (au lieu de la phrase
--    d'un seul événement passé). EJP Tech retire toujours toutes les dates.
--
-- Rien n'est modifié ni effacé dans les tables en ajout seulement ; aucune donnée personnelle ;
-- aucune date du jour dans une contrainte ; aucun SQL dynamique.

-- 1. Contrôle de chaque nouvel état : version de 20261027141108_evenements_plages.sql, plus les
-- dates figées d'un événement passé. Comme avant, le contrôle ne vise que le porteur en aal2
-- (sinon la RLS refuse, 42501, sans rien lui apprendre) ; le propriétaire des tables (EJP Tech,
-- éditeur SQL) est refusé sur un événement retiré seulement.
create or replace function private.controler_evenement_etat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_trouve boolean;
  v_date date;
  v_fin date;
  v_statut public.statut_evenement;
  v_prevue smallint;
  v_debut smallint;
  v_heure_fin smallint;
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2'
     or not exists (select 1 from public.evenement e
                     where e.id = new.evenement_id and e.ministere_id = private.mon_ministere()) then
    if (select auth.uid()) is null
       and exists (select 1 from public.evenement_retrait r where r.evenement_id = new.evenement_id) then
      raise exception 'Cet événement a été retiré.';
    end if;
    return new;
  end if;
  -- Verrou sur l'événement : deux envois simultanés se suivent, et le second lit le dernier état
  -- déjà validé par le premier ; un retrait en cours est terminé.
  perform 1 from public.evenement e where e.id = new.evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = new.evenement_id) then
    raise exception 'Cet événement a été retiré.';
  end if;
  select x.date, x.date_fin, x.statut, x.heure_prevue, x.heure_debut, x.heure_fin
    into v_date, v_fin, v_statut, v_prevue, v_debut, v_heure_fin
    from public.evenement_etat x
   where x.evenement_id = new.evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  v_trouve := found;
  -- Dernier jour : vide, il reprend la durée du dernier état (l'ancien site ne l'envoie pas) ;
  -- égal au premier jour, l'événement revient à un seul jour.
  if new.date_fin is null and v_fin is not null then
    new.date_fin := new.date + (v_fin - v_date);
  elsif new.date_fin = new.date then
    new.date_fin := null;
  end if;
  if new.date_fin < new.date then
    raise exception 'Le dernier jour doit suivre le premier.';
  end if;
  if new.date_fin > new.date + 30 then
    raise exception 'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.';
  end if;
  -- Une heure vide reprend la dernière : une heure se corrige, elle ne s'efface pas.
  if new.heure_prevue is null then
    new.heure_prevue := v_prevue;
  end if;
  if new.heure_fin is null then
    new.heure_fin := v_heure_fin;
  end if;
  if new.heure_debut is not null and new.statut <> 'termine' then
    raise exception 'L''heure de début se saisit pour un événement terminé.';
  end if;
  if new.heure_debut is null and new.statut = 'termine' then
    new.heure_debut := v_debut;
  end if;
  -- La ponctualité se mesure au début du premier jour.
  if new.heure_debut is not null and new.date > private.aujourdhui() then
    raise exception 'L''heure de début se saisit le jour de l''événement ou après.';
  end if;
  if not v_trouve then
    return new;
  end if;
  -- Le dernier jour passé, les dates ne changent plus pour le porteur (27 octobre 2026). Une fin
  -- vide a déjà repris la durée : un état de l'ancien site qui garde la date passe.
  if coalesce(v_fin, v_date) < private.aujourdhui()
     and (new.date is distinct from v_date or new.date_fin is distinct from v_fin) then
    raise exception 'Les dates d''un événement passé se corrigent par EJP Tech.';
  end if;
  if new.date is distinct from v_date and new.date < private.aujourdhui() then
    raise exception 'La nouvelle date doit être aujourd''hui ou plus tard.';
  end if;
  if coalesce(new.date_fin, new.date) is distinct from coalesce(v_fin, v_date)
     and coalesce(new.date_fin, new.date) < private.aujourdhui() then
    raise exception 'La date de fin doit être aujourd''hui ou plus tard.';
  end if;
  if new.date = v_date and new.date_fin is not distinct from v_fin and new.statut = v_statut
     and new.heure_prevue is not distinct from v_prevue
     and new.heure_debut is not distinct from v_debut
     and new.heure_fin is not distinct from v_heure_fin then
    raise exception 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.';
  end if;
  return new;
end $$;

-- 2. Retirer la série : version de 20261027141108_evenements_plages.sql. Le porteur retire les
-- dates à venir (dernier jour compris) qui n'ont aucun état final enregistré, même remplacé
-- depuis ; les autres restent au calendrier. EJP Tech retire toutes les dates. Déjà toutes
-- retirées : rien n'est écrit. Plus rien que le porteur puisse retirer : la phrase le dit.
create or replace function private.retirer_serie(p_serie_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tech boolean;
  v_evenement uuid;
  v_touches integer := 0;
begin
  perform private.exige_aal2();
  v_tech := private.peut_configurer();
  perform private.controler_serie(p_serie_id, v_tech);
  for v_evenement in
    select e.id from public.evenement e
     where e.serie_id = p_serie_id
       and not exists (select 1 from public.evenement_retrait r where r.evenement_id = e.id)
       and (v_tech
            or ((select coalesce(x.date_fin, x.date) from public.evenement_etat x
                  where x.evenement_id = e.id
                  order by x.saisi_le desc, x.id desc
                  limit 1) >= private.aujourdhui()
                and not exists (select 1 from public.evenement_etat x
                                 where x.evenement_id = e.id and x.statut in ('termine', 'annule'))))
     order by e.id
  loop
    perform private.retirer_evenement(v_evenement);
    v_touches := v_touches + 1;
  end loop;
  if v_touches = 0 and exists (select 1 from public.evenement e
                                where e.serie_id = p_serie_id
                                  and not exists (select 1 from public.evenement_retrait r
                                                   where r.evenement_id = e.id)) then
    raise exception 'Les dates terminées, annulées ou passées se retirent par EJP Tech.';
  end if;
end $$;
