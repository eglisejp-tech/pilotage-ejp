-- Ponctualité des événements, migration 2 sur 3 : comptages d'événements (lot L2, X10 ; K10a à
-- K11) et ponctualité des événements et des cultes (T68 ; docs/decisions.md, T68 ;
-- docs/plan-etape-4.md, section 4, « L2 »).
--
-- 1. private.comptages_evenements_mois(p_ministere) : la seule définition des comptages, par mois
--    (1er du mois, heure de Paris), pour un ministère porteur, ou pour toute l'église si
--    p_ministere est null. Security invoker : sous la RLS de evenement quand authenticated
--    l'appelle (par la vue), sans RLS quand la fonction de l'église l'appelle. Un événement se
--    compte dans le mois de sa date actuelle (dernier état) :
--    - prévus (K10a) : date d'aujourd'hui ou après et dernier état « Validé » ou « En
--      préparation » ; date passée et un état « Validé » ou « En préparation » dans l'historique ;
--    - réalisés : dernier état « Terminé » ; annulés : dernier état « Annulé » ;
--    - en attente (K10a) : dernier état « En attente de validation » ;
--    - passés sans état final (K10c) : date passée, dernier état « Validé » ou « En préparation » ;
--    - reportés (K10b) : un état dont la date est plus tardive que celle de l'état précédent,
--      compté dans le mois de la date quittée (un événement une fois par mois) ;
--    - ponctualité, sur les réalisés : avec_heures (retard calculé), a_l_heure (retard de 5
--      minutes au plus) et retard_cumule (somme des retards, une avance comptant 0 minute).
--    Seuls les mois qui comptent au moins un événement ont une ligne.
-- 2. public.v_evenements_mois (security_invoker) : les comptages par ministère porteur, sans la
--    ponctualité. Un ministère lit ses événements, le berger, le conseil et EJP Tech tous ;
--    l'administration et un ministère mentionné ne lisent rien d'un autre ministère.
-- 3. public.evenements_eglise_mois() (security invoker) appelle private.evenements_eglise_mois()
--    (security definer) : les totaux de l'église, par mois, du mois de « depuis » au mois en cours
--    compris (mois vides compris), le plus récent d'abord, avec la ponctualité des événements et
--    celle des cultes du dimanche. Lecteurs (K11) : le compte du ministère de code
--    « coordination », le berger, le conseil et EJP Tech ; tout autre profil est refusé (42501).
--    Aucun titre, aucune date d'événement, aucun détail par ministère.
--    Cultes : chaque dimanche du mois, jusqu'au dimanche de référence, qui a une « Heure de début
--    du culte » (sa dernière saisie), avec l'« Heure prévue du culte » en vigueur ce dimanche
--    (dernière saisie à cette date ou avant). Indicateurs actifs du ministère « coordination »,
--    retrouvés par leur code de prévu ; s'ils manquent, les colonnes des cultes valent 0.
--    « depuis » : jour (Paris) du plus ancien état d'événement, ou du plus ancien culte compté.

-- 1. Comptages par mois

create function private.comptages_evenements_mois(p_ministere uuid)
returns table (mois date, prevus integer, realises integer, annules integer, reportes integer,
               en_attente integer, passes_sans_etat_final integer, avec_heures integer, a_l_heure integer,
               retard_cumule integer)
language sql stable set search_path = '' as $$
  with etats as (
    select x.evenement_id, x.date, x.statut, x.heure_prevue, x.heure_debut,
           lag(x.date) over (partition by x.evenement_id order by x.saisi_le, x.id) as date_precedente,
           row_number() over (partition by x.evenement_id order by x.saisi_le desc, x.id desc) as rang
      from public.evenement e
      join public.evenement_etat x on x.evenement_id = e.id
     where p_ministere is null or e.ministere_id = p_ministere
  ),
  dernier as (
    select d.evenement_id, d.date, d.statut,
           case when d.statut = 'termine' then private.retard_minutes(d.heure_prevue, d.heure_debut) end as retard,
           exists (select 1 from etats v
                    where v.evenement_id = d.evenement_id and v.statut in ('valide', 'preparation')) as a_ete_valide
      from etats d
     where d.rang = 1
  ),
  lignes as (
    select date_trunc('month', d.date::timestamp)::date as jour_mois,
           case when d.date >= private.aujourdhui() then d.statut in ('valide', 'preparation')
                else d.a_ete_valide end as prevu,
           d.statut = 'termine' as realise,
           d.statut = 'annule' as annule,
           false as reporte,
           d.statut = 'attente_validation' as attente,
           d.date < private.aujourdhui() and d.statut in ('valide', 'preparation') as passe,
           d.retard
      from dernier d
    union all
    select r.jour_mois, false, false, false, true, false, false, null::integer
      from (select distinct date_trunc('month', t.date_precedente::timestamp)::date as jour_mois, t.evenement_id
              from etats t
             where t.date > t.date_precedente) as r
  )
  select l.jour_mois,
         (count(*) filter (where l.prevu))::integer,
         (count(*) filter (where l.realise))::integer,
         (count(*) filter (where l.annule))::integer,
         (count(*) filter (where l.reporte))::integer,
         (count(*) filter (where l.attente))::integer,
         (count(*) filter (where l.passe))::integer,
         (count(*) filter (where l.realise and l.retard is not null))::integer,
         (count(*) filter (where l.realise and l.retard <= private.tolerance_ponctualite()))::integer,
         coalesce(sum(greatest(l.retard, 0)) filter (where l.realise), 0)::integer
    from lignes l
   group by l.jour_mois
  having bool_or(l.prevu or l.realise or l.annule or l.reporte or l.attente or l.passe)
   order by l.jour_mois
$$;

revoke all on function private.comptages_evenements_mois(uuid) from public, anon, authenticated, service_role;
grant execute on function private.comptages_evenements_mois(uuid) to authenticated;

-- 2. Vue par ministère porteur (X10, matrice de la section 7)

create view public.v_evenements_mois with (security_invoker = true) as
select m.id as ministere_id, c.mois, c.prevus, c.realises, c.annules, c.reportes, c.en_attente,
       c.passes_sans_etat_final
  from public.ministere m
 cross join lateral private.comptages_evenements_mois(m.id) as c
 where (select private.lit_tout()) or m.id = (select private.mon_ministere());

revoke all on public.v_evenements_mois from anon, authenticated, service_role;
grant select on public.v_evenements_mois to authenticated;

-- 3. Totaux de l'église (K11) et ponctualité

create function private.evenements_eglise_mois()
returns table (mois date, prevus integer, realises integer, annules integer, reportes integer,
               en_attente integer, passes_sans_etat_final integer, avec_heures integer, a_l_heure integer,
               retard_cumule integer, cultes integer, cultes_avec_heures integer, cultes_a_l_heure integer,
               cultes_retard_cumule integer, depuis date)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if not (private.lit_tout()
          or exists (select 1 from public.ministere k
                      where k.code = 'coordination' and k.id = private.mon_ministere())) then
    raise exception 'Seuls Coordination, le berger, le conseil et EJP Tech lisent les comptages de l''église.'
      using errcode = '42501';
  end if;
  return query
  with evenements as (
    select c.mois as jour_mois, c.prevus as n_prevus, c.realises as n_realises, c.annules as n_annules,
           c.reportes as n_reportes, c.en_attente as n_attente, c.passes_sans_etat_final as n_passes,
           c.avec_heures as n_avec, c.a_l_heure as n_ok, c.retard_cumule as n_cumul
      from private.comptages_evenements_mois(null) as c
  ),
  indicateurs as (
    select i.id, i.modele_code
      from public.indicateur i
      join public.ministere k on k.id = i.ministere_id and k.code = 'coordination'
     where i.etat = 'actif'
       and i.modele_code in ('coordination_heure_de_debut_du_culte', 'coordination_heure_prevue_du_culte')
  ),
  debuts as (
    select distinct on (x.date_ref) x.date_ref as dimanche, x.valeur
      from public.mesure x
      join indicateurs i on i.id = x.indicateur_id and i.modele_code = 'coordination_heure_de_debut_du_culte'
     where x.date_ref <= private.dimanche_reference()
     order by x.date_ref, x.saisi_le desc, x.id desc
  ),
  culte as (
    select d.dimanche,
           private.retard_minutes(
             (select p.valeur from public.mesure p
                join indicateurs i on i.id = p.indicateur_id and i.modele_code = 'coordination_heure_prevue_du_culte'
               where p.date_ref <= d.dimanche
               order by p.date_ref desc, p.saisi_le desc, p.id desc
               limit 1)::smallint,
             d.valeur::smallint) as retard
      from debuts d
  ),
  cultes_par_mois as (
    select date_trunc('month', c.dimanche::timestamp)::date as jour_mois,
           count(*)::integer as n_cultes,
           count(c.retard)::integer as n_avec,
           (count(*) filter (where c.retard <= private.tolerance_ponctualite()))::integer as n_ok,
           coalesce(sum(greatest(c.retard, 0)), 0)::integer as n_cumul
      from culte c
     group by 1
  ),
  depart as (
    select coalesce(least(((select min(x.saisi_le) from public.evenement_etat x) at time zone 'Europe/Paris')::date,
                          (select min(c.dimanche) from culte c)),
                    private.aujourdhui()) as jour
  )
  select s.jour_mois::date,
         coalesce(e.n_prevus, 0), coalesce(e.n_realises, 0), coalesce(e.n_annules, 0),
         coalesce(e.n_reportes, 0), coalesce(e.n_attente, 0), coalesce(e.n_passes, 0),
         coalesce(e.n_avec, 0), coalesce(e.n_ok, 0), coalesce(e.n_cumul, 0),
         coalesce(u.n_cultes, 0), coalesce(u.n_avec, 0), coalesce(u.n_ok, 0), coalesce(u.n_cumul, 0),
         a.jour
    from depart a
   cross join lateral generate_series(date_trunc('month', a.jour::timestamp), private.mois_courant()::timestamp,
                                      interval '1 month') as s(jour_mois)
    left join evenements e on e.jour_mois = s.jour_mois::date
    left join cultes_par_mois u on u.jour_mois = s.jour_mois::date
   order by s.jour_mois desc;
end $$;

create function public.evenements_eglise_mois()
returns table (mois date, prevus integer, realises integer, annules integer, reportes integer,
               en_attente integer, passes_sans_etat_final integer, avec_heures integer, a_l_heure integer,
               retard_cumule integer, cultes integer, cultes_avec_heures integer, cultes_a_l_heure integer,
               cultes_retard_cumule integer, depuis date)
language sql stable security invoker set search_path = '' as $$
  select * from private.evenements_eglise_mois();
$$;

revoke all on function private.evenements_eglise_mois() from public, anon, authenticated, service_role;
grant execute on function private.evenements_eglise_mois() to authenticated;
revoke all on function public.evenements_eglise_mois() from public, anon, authenticated, service_role;
grant execute on function public.evenements_eglise_mois() to authenticated;
