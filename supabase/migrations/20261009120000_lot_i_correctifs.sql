-- Étape 4, lot I (base) : correctifs du 7 octobre 2026 (docs/decisions.md, P52, T45, T46, T47 ;
-- audit de B8 ; Q11). Chaque objet est recréé depuis sa dernière version, avec toutes ses
-- autres protections.
--
-- 1. P52 : le berger, le conseil et EJP Tech (private.lit_tout()) lisent la valeur EXACTE d'un
--    indicateur sensible : plus de « moins de 3 », plus de masquage secondaire, pour les mois
--    finis, le mois en cours, la somme de l'année, la courbe et la répartition. Le ministère
--    garde ses valeurs exactes ; l'administration garde ses lignes sans valeur, avec leur date
--    (P50) ; un autre ministère ne lit toujours rien ; jamais sur la vue de l'église ; jamais une
--    source de calcul (controler_terme le refuse toujours) ; le journal n'écrit toujours aucune
--    valeur ni aucune ligne sensible (journaliser_mesures ne change pas). Les colonnes restent
--    (moins_de_3, derniere_moins_de_3, mois_en_cours_moins_de_3, somme_moins_de_3, masquee,
--    tout_masque), toujours fausses, pour que les écrans ne cassent pas.
--    - private.mesures_periode() : version de 20261008100000, valeur exacte pour lit_tout ;
--      v_mesure_periode, v_indicateur_serie et v_calcul la lisent sans changer ;
--    - v_indicateur_suivi : version de 20261008100000, sans le seuil de la somme de l'année ;
--    - private.ventilations_sensibles() : version de 20261009105000, valeurs exactes pour
--      lit_tout, sans la règle de P47 ;
--    - private.sous_seuil(bigint) et private.repartition_protegee(integer[]) ne servent plus :
--      supprimées ;
--    - private.usage_indicateurs() ne rend jamais une valeur : inchangée. L'heure exacte d'une
--      saisie sensible reste lisible (T46).
-- 2. Audit de B8 : private.textes_a_relire() (version de 20260930163200) gagne la cible
--    precision_sensible : ministère de la précision, champs {texte}, libellé de l'indicateur et
--    mois (deux colonnes ajoutées à la fin), jamais la valeur ; rien pour un indicateur retiré
--    pour confidentialité (Q11). Filtre aal2 et EJP Tech seul inchangés. La signature change :
--    la vue et la fonction sont supprimées puis recréées, avec leurs droits.
-- 3. T47 : la politique de lecture de journal et v_journal (version de 20261009110000) : en
--    plus de demande_indicateur (P51), l'administration ne lit plus les lignes texte_relu et
--    texte_masque de cible point_attention, point_suivi, evenement ou reunion (elle ne lit ni
--    les fiches ni les points). T39 et P51 gardés ; T45 : le berger et le conseil lisent
--    toujours les lignes texte_relu et texte_masque d'une précision.
-- 4. Q11 : la lecture de categorie_sensible (version de 20261009105000) et celle de
--    demande_indicateur (version de 20261008110000) écartent un indicateur retiré pour
--    confidentialité.
--
-- Aucune donnée personnelle ; dates métier à l'heure de Paris (private.aujourdhui(),
-- private.mois_courant(), private.dimanche_reference()) ; aucun SQL dynamique.

-- 1. P52 : valeurs exactes des sensibles pour le berger, le conseil et EJP Tech

-- Saisie qui fait foi de chaque période, avec le filtre du lecteur. valeur : exacte pour le
-- ministère qui saisit, pour les chiffres communs, et pour le berger, le conseil et EJP Tech,
-- sensibles compris (P52) ; null pour l'administration sur un indicateur propre (une ligne sans
-- valeur, avec sa date, P50). moins_de_3 : toujours faux, gardé pour les écrans. Elle ignore la
-- RLS, donc elle réapplique le filtre du lecteur : rien hors aal2 ni pour un compte inactif ; un
-- autre ministère ne lit que les communs ; un retiré pour confidentialité n'y figure pour
-- personne (Q11), un ajout refusé seulement pour son ministère. Seule la saisie qui fait foi est
-- rendue, avec son heure : jamais une saisie intermédiaire du mois en cours d'un sensible.
-- Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.mesures_periode()
returns table (indicateur_id uuid, ministere_id uuid, nature text, periode date,
               valeur integer, moins_de_3 boolean, saisi_le timestamptz)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_type() as type, private.mon_ministere() as ministere, private.lit_tout() as lit_tout
     where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  ),
  derniere as (
    -- Même ordre que l'index de mesure (ministere_id, indicateur_id, date_ref desc, saisi_le desc,
    -- id desc) : la lecture le parcourt sans trier la table.
    select distinct on (m.ministere_id, m.indicateur_id, m.date_ref)
           m.indicateur_id, m.ministere_id, m.date_ref, m.valeur, m.saisi_le
      from public.mesure m
     order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc
  ),
  lues as (
    select d.indicateur_id, d.ministere_id, i.nature, d.date_ref, d.valeur, d.saisi_le,
           moi.type, moi.lit_tout,
           coalesce(d.ministere_id = moi.ministere, false) as sienne,
           i.ministere_id is null and not i.sensible as commun,
           i.retrait_motif is not distinct from 'refuse' as refuse
      from derniere d
      join public.indicateur i on i.id = d.indicateur_id
     cross join moi
     where moi.type is not null
       and i.retrait_motif is distinct from 'confidentialite'
  )
  select l.indicateur_id, l.ministere_id, l.nature, l.date_ref,
         case when l.sienne or l.commun or l.lit_tout then l.valeur end,
         false,
         l.saisi_le
    from lues l
   where l.sienne
      or (not l.refuse
          and (l.lit_tout or l.type = 'admin_eglise' or (l.type = 'ministere' and l.commun)))
$$;

-- Suivi de chaque indicateur lisible : version de 20261008100000, sans le seuil de la somme de
-- l'année (P52). La somme compte toutes les valeurs lues de l'année : exacte pour le ministère,
-- le berger, le conseil et EJP Tech ; null pour l'administration, qui ne lit aucune valeur d'un
-- indicateur propre. somme_moins_de_3 reste, toujours faux. Mêmes colonnes, mêmes types.
create or replace view public.v_indicateur_suivi with (security_invoker = true) as
with p as (select * from private.mesures_periode()),
repere as (
  select private.aujourdhui() as jour, private.mois_courant() as mois,
         make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier
)
select i.id as indicateur_id, i.ministere_id, i.libelle, i.definition, i.nature, i.unite, i.sensible,
       i.etat, i.origine, i.calcul,
       d.periode as derniere_periode,
       d.valeur as derniere_valeur,
       coalesce(d.moins_de_3, false) as derniere_moins_de_3,
       d.saisi_le as derniere_saisie_le,
       c.valeur as mois_en_cours_valeur,
       coalesce(c.moins_de_3, false) as mois_en_cours_moins_de_3,
       s.somme as somme_annee,
       false as somme_moins_de_3,
       s.depart as somme_depuis,
       s.nb_saisies as somme_nb_saisies,
       s.nb_attendues as somme_nb_attendues,
       coalesce(i.nature = 'a_ce_jour' and d.periode < r.jour - 30, false) as plus_de_30_jours,
       e.etat_valeur,
       case when i.etat = 'en_attente' then r.jour - (i.cree_le at time zone 'Europe/Paris')::date end as attente_jours,
       i.retire_le
  from public.indicateur i
 cross join repere r
  left join public.ministere m on m.id = i.ministere_id
  left join lateral (
    select x.periode, x.valeur, x.moins_de_3, x.saisi_le
      from p as x
     where x.indicateur_id = i.id and x.ministere_id = i.ministere_id
       and (i.nature <> 'mois' or x.periode < r.mois)
     order by x.periode desc
     limit 1
  ) as d on true
  left join lateral (
    select x.valeur, x.moins_de_3
      from p as x
     where i.nature = 'mois' and x.indicateur_id = i.id and x.ministere_id = i.ministere_id
       and x.periode = r.mois
  ) as c on true
  left join lateral (
    select b.depart, t.somme, t.nb_saisies,
           (select count(*)::integer
              from generate_series(b.depart::timestamp, b.fin::timestamp,
                                   case i.nature when 'mois' then interval '1 month' else interval '7 days' end) as q(periode)
             where private.actif_le(m.cree_le, m.desactive_le, private.fin_periode(i.nature, q.periode::date))
               and (i.retire_le is null or (i.retire_le at time zone 'Europe/Paris')::date > q.periode::date)
           ) as nb_attendues
      from (
        select a.fin,
               greatest(a.debut, least(a.creation, coalesce(
                 (select min(x.periode) from p as x
                   where x.indicateur_id = i.id and x.ministere_id = i.ministere_id
                     and x.periode between a.debut and a.fin),
                 a.creation))) as depart
          from (select private.periode_de(i.nature, r.janvier) as debut,
                       private.derniere_periode_finie(i.nature) as fin,
                       private.periode_de(i.nature, (i.cree_le at time zone 'Europe/Paris')::date) as creation
               ) as a
      ) as b
     cross join lateral (
       select sum(x.valeur) as somme, count(*)::integer as nb_saisies
         from p as x
        where x.indicateur_id = i.id and x.ministere_id = i.ministere_id
          and x.periode between b.depart and b.fin
     ) as t
     where i.ministere_id is not null and i.calcul is null and i.nature in ('dimanche', 'mois')
       and not i.sans_somme and i.etat <> 'en_attente'
  ) as s on true
  left join lateral (
    select case
             when not exists (select 1 from p as x where x.indicateur_id = i.id and x.ministere_id = i.ministere_id)
               then 'jamais_saisi'
             when i.nature = 'a_ce_jour' then 'saisi'
             when f.fin < private.periode_de(i.nature, (i.cree_le at time zone 'Europe/Paris')::date)
                  or not private.actif_le(m.cree_le, m.desactive_le, private.fin_periode(i.nature, f.fin))
                  or (i.retire_le is not null and (i.retire_le at time zone 'Europe/Paris')::date <= f.fin)
                  or exists (select 1 from p as x
                              where x.indicateur_id = i.id and x.ministere_id = i.ministere_id and x.periode = f.fin)
               then 'saisi'
             else 'non_saisi'
           end as etat_valeur
      from (select private.derniere_periode_finie(i.nature) as fin) as f
     where i.ministere_id is not null and i.calcul is null
  ) as e on true
 where coalesce(i.retrait_motif, '') not in ('confidentialite', 'refuse')
   and (i.etat <> 'retire'
        or exists (select 1 from p as x where x.indicateur_id = i.id)
        or exists (select 1 from public.indicateur_terme t
                     join p as x on x.indicateur_id = t.source_id
                    where t.calcul_id = i.id));

-- Répartition du total le plus récent de chaque indicateur sensible, ministère et mois :
-- version de 20261009105000, valeurs exactes pour le ministère et pour le berger, le conseil et
-- EJP Tech (P52), sans masquage. Même départage que private.mesures_periode (saisi_le puis id
-- décroissants). Un mois dont le total le plus récent n'a pas de répartition n'a aucune ligne ;
-- sinon une ligne par catégorie (une catégorie retirée depuis garde son libellé) et une ligne
-- « Non réparti » (categorie null, ordre 32767). moins_de_3, masquee et tout_masque restent,
-- toujours faux. Rien pour l'administration ni pour un autre ministère, rien hors aal2, rien
-- pour un retiré pour confidentialité, rien d'un ajout refusé hors son ministère. Même
-- signature : create or replace garde le propriétaire et les droits.
create or replace function private.ventilations_sensibles()
returns table (indicateur_id uuid, ministere_id uuid, periode date, categorie text, libelle text, ordre smallint,
               valeur integer, moins_de_3 boolean, masquee boolean, tout_masque boolean)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_ministere() as ministere, private.lit_tout() as lit_tout
     where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  ),
  derniere as (
    select distinct on (m.ministere_id, m.indicateur_id, m.date_ref)
           m.id, m.indicateur_id, m.ministere_id, m.date_ref, m.valeur
      from public.mesure m
      join public.indicateur i on i.id = m.indicateur_id
     where i.sensible
     order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc
  ),
  lues as (
    select d.id, d.indicateur_id, d.ministere_id, d.date_ref, d.valeur, i.modele_code
      from derniere d
      join public.indicateur i on i.id = d.indicateur_id
     cross join moi
     where i.retrait_motif is distinct from 'confidentialite'
       and (d.ministere_id = moi.ministere
            or (moi.lit_tout and i.retrait_motif is distinct from 'refuse'))
  )
  select l.indicateur_id, l.ministere_id, l.date_ref, v.categorie, c.libelle, c.ordre, v.valeur,
         false, false, false
    from lues l
    join public.ventilation_sensible v on v.mesure_id = l.id
    left join public.categorie_sensible c on c.prevu_code = l.modele_code and c.code = v.categorie
  union all
  select l.indicateur_id, l.ministere_id, l.date_ref, null, 'Non réparti', 32767::smallint, l.valeur - r.somme,
         false, false, false
    from lues l
   cross join lateral (select sum(v.valeur)::integer as somme
                         from public.ventilation_sensible v where v.mesure_id = l.id) as r
   where r.somme is not null
$$;

-- Plus aucun lecteur ne reçoit « moins de 3 » ni une répartition masquée.
drop function private.sous_seuil(bigint);
drop function private.repartition_protegee(integer[]);

-- 2. File de relecture d'EJP Tech : la précision d'un indicateur sensible

-- Une ligne par écriture qui porte des champs libres : les cibles de l'étape 1, puis la
-- précision d'un indicateur sensible (champs {texte}, ministère de la précision, libellé actuel
-- de l'indicateur et mois ; jamais la valeur du total ; rien pour un indicateur retiré pour
-- confidentialité, Q11). Tous les éléments à relire, puis ceux écrits dans les 30 derniers
-- jours (heure de Paris). Jamais de priorité, de statut ni de chiffre. indicateur_libelle et
-- mois sont null pour les autres cibles. EJP Tech seul, en aal2.
drop view public.v_textes_a_relire;
drop function private.textes_a_relire();

create function private.textes_a_relire()
returns table (
  cible text, cible_id uuid, ministere_id uuid, auteur_libelle text, ecrit_le timestamptz,
  champs jsonb, etat text, decision_le timestamptz, motif text, indicateur_libelle text, mois date)
language sql stable security definer set search_path = '' as $$
  with ecrits (cible, cible_id, saisi_par, saisi_le, champs, ministere_id, indicateur_libelle, mois) as (
    select 'point_attention', p.id, p.saisi_par, p.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'titre', p.titre,
             'description', nullif(btrim(p.description), ''),
             'action_attendue', nullif(btrim(p.action_attendue), ''))),
           null::uuid, null::text, null::date
      from public.point_attention p
    union all
    select 'point_suivi', s.id, s.saisi_par, s.saisi_le, jsonb_build_object('commentaire', s.commentaire),
           null, null, null
      from public.point_suivi s
     where nullif(btrim(s.commentaire), '') is not null
    union all
    select 'evenement', e.id, e.saisi_par, e.saisi_le, jsonb_build_object('titre', e.titre), null, null, null
      from public.evenement e
    union all
    select 'reunion', r.id, r.saisi_par, r.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'objet', nullif(btrim(r.objet), ''),
             'decision_attendue', nullif(btrim(r.decision_attendue), ''))),
           null, null, null
      from public.reunion r
     where nullif(btrim(r.objet), '') is not null or nullif(btrim(r.decision_attendue), '') is not null
    union all
    select 'precision_sensible', p.id, p.saisi_par, p.saisi_le, jsonb_build_object('texte', p.texte),
           p.ministere_id, i.libelle, p.mois
      from public.precision_sensible p
      join public.indicateur i on i.id = p.indicateur_id
     where i.retrait_motif is distinct from 'confidentialite'
  )
  select x.cible, x.cible_id, coalesce(x.ministere_id, c.ministere_id), c.libelle, x.saisi_le, x.champs,
         case d.decision when 'masque' then 'masque' when 'rien_a_signaler' then 'relu' else 'a_relire' end,
         d.le, d.motif, x.indicateur_libelle, x.mois
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

create view public.v_textes_a_relire with (security_invoker = true) as
select * from private.textes_a_relire();

revoke all on function private.textes_a_relire() from public, anon, authenticated, service_role;
grant execute on function private.textes_a_relire() to authenticated;
revoke all on public.v_textes_a_relire from public, anon, authenticated, service_role;
grant select on public.v_textes_a_relire to authenticated;

-- 3. Journal : T47

-- Lecture du journal : celle de B7 (20261009110000), plus T47 : l'administration ne lit plus
-- les lignes texte_relu et texte_masque de cible point_attention, point_suivi, evenement ou
-- reunion, comme celles de cible demande_indicateur (P51). Le berger, le conseil, EJP Tech et
-- le ministère de la ligne les gardent. T39 (signalements) et le retrait de precision_sensible
-- pour l'administration restent.
drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  ((select private.lit_tout())
   and ((coalesce(cible, '') not in ('signalement', 'signalement_suivi')
         and action not in ('difficulte_signalee', 'signalement_clos'))
        or (select private.mon_type()) = 'admin_plateforme'))
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail)
      and coalesce(cible, '') not in ('precision_sensible', 'signalement', 'signalement_suivi')
      and action not in ('difficulte_signalee', 'signalement_clos')
      and (action not in ('texte_relu', 'texte_masque')
           or coalesce(cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi', 'evenement', 'reunion')))
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid()))));

-- v_journal : version de B7, avec la même condition T47 que la politique de lecture pour
-- l'administration. Mêmes colonnes.
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
         when 'indicateur' then (select i.libelle from public.indicateur i where i.id = j.cible_id)
         when 'demande_indicateur' then (select i.libelle from public.demande_indicateur d
                                           join public.indicateur i on i.id = d.indicateur_id
                                          where d.id = j.cible_id)
         when 'validation' then (select i.libelle from public.validation v
                                   join public.demande_indicateur d on d.id = v.demande_id
                                   join public.indicateur i on i.id = d.indicateur_id
                                  where v.id = j.cible_id)
         when 'precision_sensible' then (
           select 'Précision : ' || i.libelle || ', '
                  || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
                            'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from p.mois)::integer]
                  || ' ' || extract(year from p.mois)::integer
             from public.precision_sensible p
             join public.indicateur i on i.id = p.indicateur_id
            where p.id = j.cible_id)
         when 'signalement' then (select s.ecran from public.signalement s where s.id = j.cible_id)
         when 'signalement_suivi' then (select s.ecran from public.signalement_suivi x
                                          join public.signalement s on s.id = x.signalement_id
                                         where x.id = j.cible_id)
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
where ((select private.mon_type()) is distinct from 'admin_eglise'
       or (private.journal_lisible_administration(j.action, j.detail)
           and coalesce(j.cible, '') <> 'precision_sensible'
           and (j.action not in ('texte_relu', 'texte_masque')
                or coalesce(j.cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi',
                                                 'evenement', 'reunion'))))
  and ((coalesce(j.cible, '') not in ('signalement', 'signalement_suivi')
        and j.action not in ('difficulte_signalee', 'signalement_clos'))
       or (select private.mon_type()) in ('admin_plateforme', 'ministere'));

-- 4. Q11 : rien d'un indicateur retiré pour confidentialité

-- Catégories : lues comme indicateur (Q3), s'il existe un indicateur sensible lisible, sous sa
-- propre RLS, non retiré pour confidentialité, dont modele_code vaut prevu_code.
drop policy lecture on public.categorie_sensible;
create policy lecture on public.categorie_sensible for select to authenticated using (
  exists (select 1 from public.indicateur i
           where i.modele_code = categorie_sensible.prevu_code and i.sensible
             and i.retrait_motif is distinct from 'confidentialite'));

-- Demandes : le ministère qui l'a écrite et EJP Tech, sauf pour un indicateur retiré pour
-- confidentialité (lu sous la RLS du lecteur : le ministère lit ses indicateurs, EJP Tech
-- tous ; la politique d'indicateur ne relit pas demande_indicateur, pas de récursion).
drop policy lecture on public.demande_indicateur;
create policy lecture on public.demande_indicateur for select to authenticated using (
  (ministere_id = (select private.mon_ministere())
   or (select private.mon_type()) = 'admin_plateforme')
  and exists (select 1 from public.indicateur i
               where i.id = demande_indicateur.indicateur_id
                 and i.retrait_motif is distinct from 'confidentialite'));
