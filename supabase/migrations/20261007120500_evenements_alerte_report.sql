-- Étape 4, lot B6, migration 2 sur 2 : alerte des événements à confirmer (T31), report lu
-- dans l'historique (K10b) et refus d'une mise à jour sans objet (T37, décidé le 6 octobre
-- 2026) ; docs/plan-etape-4.md, section 4, « B6 » ; docs/conception/contrat-etape-4.md,
-- sections 6 et 7.
--
-- 1. v_evenement gagne en fin trois colonnes, sans changer les six premières :
--    - jours : date de l'événement moins private.aujourdhui() (heure de Paris) ;
--    - a_confirmer : dernier état « en attente de validation », date au plus aujourd'hui plus
--      3 (passée comprise), ministère porteur actif. Un brouillon n'alerte jamais. La vue lit
--      evenement sous RLS : le porteur, les ministères mentionnés, le berger, le conseil et EJP
--      Tech voient l'alerte ; l'administration et les autres ministères ne lisent pas la ligne ;
--    - reporte_du : date de l'état précédent si la date a changé au dernier état, sinon null.
--      « Reporté » n'est pas un statut (K10b) : il se lit dans l'historique.
-- 2. Trigger private.controler_evenement_etat() avant l'ajout d'une ligne de evenement_etat :
--    il compare la ligne nouvelle au dernier état de l'événement. Une date différente de la
--    date actuelle et antérieure à private.aujourdhui() est refusée ; une ligne de même statut
--    et de même date que le dernier état est refusée. Une date inchangée, même passée, reste
--    permise (un événement passé reçoit enfin son statut, T31). Le premier état, écrit par
--    ajouter_evenement, n'a pas de dernier état et passe. Un refus n'écrit aucune ligne de
--    journal (l'ajout n'a pas lieu). Les messages sont repris tels quels par le formulaire 11.
--    Le contrôle ne vise que le ministère porteur en aal2 : tout autre essai est refusé ensuite
--    par la RLS (42501), sans rien dire de l'état de l'événement. Le jeu d'exemple et les
--    migrations (sans compte connecté) gardent leur historique ; service_role n'a aucun droit
--    d'insertion sur evenement_etat (testé), donc cette exception n'est pas exploitable. Le
--    trigger verrouille la ligne de l'événement avant de lire le dernier état, pour que deux
--    envois identiques simultanés ne passent pas tous les deux.

-- 1. Vue des événements

create or replace view public.v_evenement with (security_invoker = true) as
select d.id, d.ministere_id, d.titre, d.date, d.statut, d.mis_a_jour_le,
       d.date - private.aujourdhui() as jours,
       (d.statut = 'attente_validation'
        and d.date <= private.aujourdhui() + 3
        and exists (select 1 from public.ministere m where m.id = d.ministere_id and m.desactive_le is null))
         as a_confirmer,
       case when d.date_precedente <> d.date then d.date_precedente end as reporte_du
from (
  select distinct on (e.id) e.id, e.ministere_id, e.titre, x.date, x.statut, x.saisi_le as mis_a_jour_le,
         lag(x.date) over (partition by e.id order by x.saisi_le, x.id) as date_precedente
  from public.evenement e
  join public.evenement_etat x on x.evenement_id = e.id
  order by e.id, x.saisi_le desc, x.id desc
) as d;

-- 2. Refus d'une nouvelle date passée et d'une mise à jour identique (T37)

create function private.controler_evenement_etat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_date date;
  v_statut public.statut_evenement;
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
  select x.date, x.statut into v_date, v_statut
    from public.evenement_etat x
   where x.evenement_id = new.evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  if not found then
    return new;
  end if;
  if new.date is distinct from v_date and new.date < private.aujourdhui() then
    raise exception 'La nouvelle date doit être aujourd''hui ou plus tard.';
  end if;
  if new.date = v_date and new.statut = v_statut then
    raise exception 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.';
  end if;
  return new;
end $$;

revoke all on function private.controler_evenement_etat() from public, anon, authenticated, service_role;

create trigger controler_evenement_etat before insert on public.evenement_etat
  for each row execute function private.controler_evenement_etat();
