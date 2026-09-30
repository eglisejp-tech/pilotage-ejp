-- Étape 1, migration 5 sur 7 : vues de lecture et fonctions de lecture (BRIEF, section 6).
--
-- Toutes les vues se créent with (security_invoker = true) : sans cette option, une vue
-- s'exécute avec les droits de son propriétaire et contourne la RLS et la politique aal2.
-- Les effectifs communs sont lisibles par tous les profils sauf EJP Tech : un ministère obtient
-- les mêmes totaux que le berger, et EJP Tech n'obtient aucune ligne.

-- Semaine affichée (règle 11). Sans table, la vue filtre elle-même : rien hors aal2 ni pour un
-- compte inactif, comme toutes les autres lectures.
create view public.v_semaine with (security_invoker = true) as
select private.aujourdhui() as aujourdhui, private.dimanche_reference() as dimanche,
       private.dimanche_reference() - 6 as lundi,
       extract(week from private.dimanche_reference())::int as numero          -- semaine ISO
where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  and (select private.mon_type()) is not null;

-- Dernière valeur de chaque indicateur pour chaque ministère (règle 2).
create view public.v_derniere_mesure with (security_invoker = true) as
select distinct on (m.ministere_id, m.indicateur_id)
       m.ministere_id, m.indicateur_id, i.code, i.nature, m.date_ref, m.valeur, m.saisi_le
from public.mesure m join public.indicateur i on i.id = m.indicateur_id
order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc;

-- Saisie la plus récente de chaque ministère pour chaque dimanche.
create view public.v_mesure_dimanche with (security_invoker = true) as
select distinct on (m.indicateur_id, m.ministere_id, m.date_ref)
       m.indicateur_id, m.ministere_id, m.date_ref as dimanche, m.valeur
from public.mesure m join public.indicateur i on i.id = m.indicateur_id
where i.nature = 'dimanche'
order by m.indicateur_id, m.ministere_id, m.date_ref, m.saisi_le desc, m.id desc;

-- Totaux des 10 derniers dimanches, pour la courbe et la complétude (règles 3 et 13).
create view public.v_total_dimanche with (security_invoker = true) as
with dimanches as (
  select (private.dimanche_reference() - 7 * g)::date as dimanche from generate_series(0, 9) as g
)
select i.id as indicateur_id, d.dimanche,
       sum(v.valeur) as total,                                -- null si aucune saisie : trou dans la courbe
       count(v.ministere_id) as nb_saisis,
       (select count(*) from public.ministere mi
         where private.actif_le(mi.cree_le, mi.desactive_le, d.dimanche)
            or exists (select 1 from public.v_mesure_dimanche w
                        where w.indicateur_id = i.id and w.dimanche = d.dimanche and w.ministere_id = mi.id)
       ) as nb_attendus
from dimanches d
cross join public.indicateur i
left join public.v_mesure_dimanche v on v.indicateur_id = i.id and v.dimanche = d.dimanche
where i.ministere_id is null and i.nature = 'dimanche'
group by i.id, d.dimanche;

-- Totaux « à ce jour » des ministères actifs aujourd'hui (règles 3 et 13).
create view public.v_total_a_ce_jour with (security_invoker = true) as
select d.indicateur_id, d.code, sum(d.valeur) as total, count(*) as nb_saisis,
       (select count(*) from public.ministere mi where mi.desactive_le is null) as nb_actifs,
       min(d.date_ref) as plus_ancienne,
       count(*) filter (where d.date_ref < private.aujourdhui() - 30) as nb_plus_de_30_jours
from public.v_derniere_mesure d
join public.ministere m on m.id = d.ministere_id and m.desactive_le is null
where d.nature = 'a_ce_jour' and d.code is not null
group by d.indicateur_id, d.code;

-- Pourcentage de STARs en FIJ, calculé à partir des sommes (règle 4), jamais saisi.
-- having : aucune ligne quand aucun ministère lisible n'a les deux valeurs (EJP Tech, aal1).
create view public.v_pourcentage_fij with (security_invoker = true) as
select sum(f.valeur) as en_fij, sum(a.valeur) as actifs, count(*) as nb_ministeres,
       round(100.0 * sum(f.valeur) / nullif(sum(a.valeur), 0)) as pourcentage
from public.v_derniere_mesure a
join public.v_derniere_mesure f on f.ministere_id = a.ministere_id and f.code = 'en_fij'
join public.ministere m on m.id = a.ministere_id and m.desactive_le is null
where a.code = 'actifs'
having count(*) > 0;

-- Carte des FIJ : valeur la plus récente de chaque département ; total et date côté lecture.
create view public.v_carte_fij with (security_invoker = true) as
select distinct on (f.departement) f.departement, f.valeur, f.saisi_le
from public.fij_departement f
order by f.departement, f.saisi_le desc, f.id desc;

-- Saisie la plus récente de chaque ministère pour chaque session ; chaque présent déjà compté
-- par son ministère principal ne compte qu'une fois (D2).
create view public.v_participation_courante with (security_invoker = true) as
select distinct on (p.session_id, p.ministere_id)
       p.session_id, p.ministere_id, p.valeur, p.deja_comptes,
       p.valeur - p.deja_comptes as compte_dans_total, p.saisi_le
from public.participation p
order by p.session_id, p.ministere_id, p.saisi_le desc, p.id desc;

-- Complétude, total sans double compte et manquants de chaque session (règles 5 et 13).
create view public.v_session_completude with (security_invoker = true) as
with attendus as (
  select sa.session_id, sa.ministere_id
  from public.session_attendu sa
  join public.session s on s.id = sa.session_id
  join public.ministere m on m.id = sa.ministere_id
  where private.actif_le(m.cree_le, m.desactive_le, s.date)
),
concernes as (
  select session_id, ministere_id from attendus
  union
  select session_id, ministere_id from public.v_participation_courante
)
select s.id as session_id, s.type, s.date, s.intitule,
       s.date <= private.aujourdhui() as a_eu_lieu,
       count(c.ministere_id) as nb_attendus,
       count(p.ministere_id) as nb_saisis,
       coalesce(sum(p.valeur), 0) as total_saisi,
       coalesce(sum(p.compte_dans_total), 0) as total,          -- sans double compte (D2)
       coalesce(array_agg(mi.nom order by mi.nom)
                filter (where c.ministere_id is not null and p.ministere_id is null), '{}') as manquants
from public.session s
left join concernes c on c.session_id = s.id
left join public.ministere mi on mi.id = c.ministere_id
left join public.v_participation_courante p on p.session_id = c.session_id and p.ministere_id = c.ministere_id
group by s.id;

-- Écart entre deux dimanches, à périmètre égal (règle 12).
create view public.v_ecart_dimanche with (security_invoker = true) as
select c.indicateur_id, c.dimanche, sum(c.valeur - p.valeur) as ecart, count(*) as nb_comparables
from public.v_mesure_dimanche c
join public.v_mesure_dimanche p
  on p.indicateur_id = c.indicateur_id and p.ministere_id = c.ministere_id and p.dimanche = c.dimanche - 7
group by c.indicateur_id, c.dimanche;

-- Écart entre deux sessions du même type, à périmètre égal (règle 12).
create view public.v_ecart_session with (security_invoker = true) as
with ordre as (
  select s.id, lag(s.id) over (partition by s.type order by s.date) as precedente
  from public.session s
  where s.type <> 'autre' and s.date <= private.aujourdhui()
)
select o.id as session_id, sum(c.compte_dans_total - p.compte_dans_total) as ecart, count(*) as nb_comparables
from ordre o
join public.v_participation_courante c on c.session_id = o.id
join public.v_participation_courante p on p.session_id = o.precedente and p.ministere_id = c.ministere_id
group by o.id;

-- État le plus récent de chaque événement (règle 14).
create view public.v_evenement with (security_invoker = true) as
select distinct on (e.id) e.id, e.ministere_id, e.titre, x.date, x.statut, x.saisi_le as mis_a_jour_le
from public.evenement e
join public.evenement_etat x on x.evenement_id = e.id
order by e.id, x.saisi_le desc, x.id desc;

-- Prochaine réunion : la déclaration la plus récente, si sa date n'est pas passée (règle 15).
create view public.v_prochaine_reunion with (security_invoker = true) as
select d.id, d.ministere_id, d.date, d.heure, d.objet, d.decision_attendue
from (select distinct on (r.ministere_id) r.* from public.reunion r
      order by r.ministere_id, r.saisi_le desc) d
where d.date >= private.aujourdhui();

-- Points d'attention avec leur statut courant et leur traitement (règles 7 et 8).
create view public.v_point with (security_invoker = true) as
select p.id, p.ministere_id, p.titre, p.description, p.action_attendue, p.priorite, p.echeance,
       p.saisi_le as cree_le, p.saisi_par as cree_par,
       s.statut, s.saisi_le as statut_le,
       t.id as traitement_id, t.saisi_le as traite_le, t.saisi_par as traite_par,
       t.commentaire as traite_commentaire
from public.point_attention p
join lateral (select x.statut, x.saisi_le from public.point_suivi x
              where x.point_id = p.id order by x.saisi_le desc limit 1) s on true
left join public.point_suivi t on t.point_id = p.id and t.statut = 'traite';

-- Journal lisible : le texte visé est lu au moment de l'affichage, sous RLS (règle 10). Un
-- compte qui ne peut pas lire l'objet obtient null ; un texte masqué s'affiche masqué.
create view public.v_journal with (security_invoker = true) as
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
left join public.ministere m on m.id = j.ministere_id;

-- Lectures identiques pour tous les lecteurs, ou limitées à certaines colonnes : une fonction
-- security definer de private, lue à travers une vue security_invoker. Chaque fonction ne rend
-- rien hors aal2 ni hors des profils prévus.

-- Tableau des ministères (ministère, berger, conseil, administration ; rien pour EJP Tech).
-- Prochaine réunion et point ouvert : seulement pour le berger et le conseil.
create function private.tableau_ministeres()
returns table (
  ministere_id uuid, nom text, description text, derniere_saisie timestamptz,
  prochain_evenement_date date, prochain_evenement_titre text,
  prochaine_reunion_date date, prochaine_reunion_heure time, point_ouvert_priorite public.priorite)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_type() as type, private.aujourdhui() as jour
    where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select m.id, m.nom, m.description,
         -- Fraîcheur (règle 6) : dernière ligne de journal écrite par un compte du ministère.
         (select max(j.le) from public.journal j
            join public.compte c on c.user_id = j.compte
           where c.ministere_id = m.id),
         ev.date, ev.titre,
         case when moi.type in ('berger', 'conseil') then re.date end,
         case when moi.type in ('berger', 'conseil') then re.heure end,
         case when moi.type in ('berger', 'conseil') then (
           select max(p.priorite) from public.point_attention p
            where p.ministere_id = m.id
              and not exists (select 1 from public.point_suivi s where s.point_id = p.id and s.statut = 'traite'))
         end
  from moi
  cross join public.ministere m
  left join lateral (
    select x.date, x.titre
    from (select distinct on (e.id) e.id, e.titre, t.date, t.statut
            from public.evenement e
            join public.evenement_etat t on t.evenement_id = e.id
           where e.ministere_id = m.id
           order by e.id, t.saisi_le desc, t.id desc) as x
    where x.date >= moi.jour and x.statut not in ('termine', 'annule')
    order by x.date, x.titre
    limit 1
  ) as ev on true
  left join lateral (
    select r.date, r.heure
    from (select r0.date, r0.heure from public.reunion r0
           where r0.ministere_id = m.id
           order by r0.saisi_le desc
           limit 1) as r
    where r.date >= moi.jour
  ) as re on true
  where m.desactive_le is null
    and moi.type in ('ministere', 'berger', 'conseil', 'admin_eglise')
$$;

-- File de relecture d'EJP Tech : une ligne par écriture qui porte des champs libres. Tous les
-- éléments à relire, puis ceux écrits dans les 30 derniers jours. Jamais de priorité, de
-- statut ni de chiffre.
create function private.textes_a_relire()
returns table (
  cible text, cible_id uuid, ministere_id uuid, auteur_libelle text, ecrit_le timestamptz,
  champs jsonb, etat text, decision_le timestamptz, motif text)
language sql stable security definer set search_path = '' as $$
  with ecrits (cible, cible_id, saisi_par, saisi_le, champs) as (
    select 'point_attention', p.id, p.saisi_par, p.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'titre', p.titre,
             'description', nullif(btrim(p.description), ''),
             'action_attendue', nullif(btrim(p.action_attendue), '')))
      from public.point_attention p
    union all
    select 'point_suivi', s.id, s.saisi_par, s.saisi_le, jsonb_build_object('commentaire', s.commentaire)
      from public.point_suivi s
     where nullif(btrim(s.commentaire), '') is not null
    union all
    select 'evenement', e.id, e.saisi_par, e.saisi_le, jsonb_build_object('titre', e.titre)
      from public.evenement e
    union all
    select 'reunion', r.id, r.saisi_par, r.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'objet', nullif(btrim(r.objet), ''),
             'decision_attendue', nullif(btrim(r.decision_attendue), '')))
      from public.reunion r
     where nullif(btrim(r.objet), '') is not null or nullif(btrim(r.decision_attendue), '') is not null
  )
  select x.cible, x.cible_id, c.ministere_id, c.libelle, x.saisi_le, x.champs,
         case d.decision when 'masque' then 'masque' when 'rien_a_signaler' then 'relu' else 'a_relire' end,
         d.le, d.motif
  from ecrits x
  join public.compte c on c.user_id = x.saisi_par
  left join lateral (
    select m.decision, m.le, m.motif from public.moderation m
     where m.cible = x.cible and m.cible_id = x.cible_id
     order by m.le desc, m.id desc
     limit 1
  ) as d on true
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (select private.mon_type()) = 'admin_plateforme'
    and (d.decision is null or (x.saisi_le at time zone 'Europe/Paris')::date >= private.aujourdhui() - 30)
$$;

-- État des comptes pour l'écran 13 (administration de l'église seulement). L'email reste
-- dans auth.users : il n'est lu qu'ici, jamais copié. La colonne secret des facteurs n'est
-- jamais lue.
create function private.etat_comptes()
returns table (
  user_id uuid, type public.type_compte, libelle text, ministere_id uuid, email text,
  desactive_le timestamptz, etat text)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.type, c.libelle, c.ministere_id, u.email::text, c.desactive_le,
         case
           when c.desactive_le is not null then 'desactive'
           when u.email_confirmed_at is null then 'invitation_envoyee'
           when exists (select 1 from auth.mfa_factors f
                         where f.user_id = c.user_id and f.factor_type = 'totp' and f.status = 'verified')
             then 'activee'
           else 'a_activer'
         end
  from public.compte c
  join auth.users u on u.id = c.user_id
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (select private.mon_type()) = 'admin_eglise'
$$;

create view public.v_tableau_ministeres with (security_invoker = true) as
select * from private.tableau_ministeres();

create view public.v_textes_a_relire with (security_invoker = true) as
select * from private.textes_a_relire();

create view public.v_etat_comptes with (security_invoker = true) as
select * from private.etat_comptes();

-- Droits : lecture des vues pour authenticated seulement ; rien pour anon ni service_role.
revoke all on public.v_semaine, public.v_derniere_mesure, public.v_mesure_dimanche, public.v_total_dimanche,
  public.v_total_a_ce_jour, public.v_pourcentage_fij, public.v_carte_fij, public.v_participation_courante,
  public.v_session_completude, public.v_ecart_dimanche, public.v_ecart_session, public.v_evenement,
  public.v_prochaine_reunion, public.v_point, public.v_journal, public.v_tableau_ministeres,
  public.v_textes_a_relire, public.v_etat_comptes
  from anon, authenticated, service_role;
grant select on public.v_semaine, public.v_derniere_mesure, public.v_mesure_dimanche, public.v_total_dimanche,
  public.v_total_a_ce_jour, public.v_pourcentage_fij, public.v_carte_fij, public.v_participation_courante,
  public.v_session_completude, public.v_ecart_dimanche, public.v_ecart_session, public.v_evenement,
  public.v_prochaine_reunion, public.v_point, public.v_journal, public.v_tableau_ministeres,
  public.v_textes_a_relire, public.v_etat_comptes
  to authenticated;

revoke all on function private.tableau_ministeres(), private.textes_a_relire(), private.etat_comptes()
  from public, anon, authenticated, service_role;
grant execute on function private.tableau_ministeres(), private.textes_a_relire(), private.etat_comptes()
  to authenticated;
