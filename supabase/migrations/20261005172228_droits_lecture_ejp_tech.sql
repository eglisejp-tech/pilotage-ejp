-- EJP Tech lit tout comme le berger (docs/decisions.md, T29, décision du 5 octobre 2026).
--
-- EJP Tech (admin_plateforme) lit, en lecture seule, ce que lisent le berger et le conseil :
-- indicateurs, mesures, carte des FIJ, sessions et ministères attendus, présences, événements
-- et leurs états, réunions, points d'attention avec leurs mentions et leurs suivis, journal
-- complet, et le tableau des ministères avec la prochaine réunion et le point ouvert.
--
-- Ce qui ne change pas :
-- - aucune action : les politiques d'ajout, les GRANT et les fonctions de l'API restent les
--   mêmes. private.est_decideur() (berger et conseil) décide toujours de « Marquer traité » ;
--   EJP Tech ne saisit rien, ne change aucun statut et ne déclare aucune session ;
-- - la modération reste à EJP Tech seul (moderation, v_textes_a_relire) ;
-- - l'état des comptes (v_etat_comptes) reste à l'administration de l'église seule ;
-- - les politiques restrictives aal2 restent sur chaque table.
--
-- Les politiques de lecture visées sont supprimées puis recréées avec private.lit_tout(), la
-- seule liste des profils qui lisent tout.

-- Berger, conseil ou EJP Tech : lecture de tout (sauf la modération et l'état des comptes).
-- Jamais null. Pour une lecture seulement : les droits d'action ne la lisent pas.
create function private.lit_tout() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.mon_type() in ('berger', 'conseil', 'admin_plateforme'), false)
$$;

revoke all on function private.lit_tout() from public, anon, authenticated, service_role;
grant execute on function private.lit_tout() to authenticated;

-- Chiffres : ministère et administration comme avant, puis berger, conseil et EJP Tech.
drop policy lecture on public.indicateur;
create policy lecture on public.indicateur for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'admin_eglise') or (select private.lit_tout()));

drop policy lecture on public.fij_departement;
create policy lecture on public.fij_departement for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'admin_eglise') or (select private.lit_tout()));

drop policy lecture on public.session;
create policy lecture on public.session for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'admin_eglise') or (select private.lit_tout()));

drop policy lecture on public.session_attendu;
create policy lecture on public.session_attendu for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'admin_eglise') or (select private.lit_tout()));

drop policy lecture on public.participation;
create policy lecture on public.participation for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'admin_eglise') or (select private.lit_tout()));

-- Mesure : tout pour le berger, le conseil et EJP Tech ; un ministère, les indicateurs communs
-- de tous et ses indicateurs propres ; l'administration, les indicateurs communs.
drop policy lecture on public.mesure;
create policy lecture on public.mesure for select to authenticated using (
  (select private.lit_tout())
  or ministere_id = (select private.mon_ministere())
  or ((select private.mon_type()) in ('ministere', 'admin_eglise')
      and indicateur_id in (select i.id from public.indicateur i where i.ministere_id is null)));

-- Fiches : événements et réunions. evenement_etat suit evenement (sa politique relit evenement
-- sous RLS) : elle ne change pas.
drop policy lecture on public.evenement;
create policy lecture on public.evenement for select to authenticated
  using ((select private.lit_tout()) or ministere_id = (select private.mon_ministere()));

drop policy lecture on public.reunion;
create policy lecture on public.reunion for select to authenticated
  using ((select private.lit_tout()) or ministere_id = (select private.mon_ministere()));

-- Points : le ministère créateur, les ministères mentionnés (ce point seulement), le berger,
-- le conseil et EJP Tech. point_mention et point_suivi suivent point_attention : elles ne
-- changent pas.
drop policy lecture on public.point_attention;
create policy lecture on public.point_attention for select to authenticated using (
  (select private.lit_tout())
  or ministere_id = (select private.mon_ministere())
  or id in (select private.points_mentionnant_mon_ministere()));

-- Journal : tout pour le berger, le conseil et EJP Tech ; la liste de
-- private.journal_lisible_administration pour l'administration ; les lignes de son ministère
-- et de son compte pour un ministère. v_journal ne filtre que l'administration : elle ne change
-- pas.
drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  (select private.lit_tout())
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail))
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid()))));

-- Tableau des ministères : même contenu qu'avant pour le ministère et l'administration (sans
-- prochaine réunion ni point ouvert) ; berger, conseil et EJP Tech reçoivent ces deux colonnes.
-- Même signature : create or replace garde le propriétaire et les droits, redonnés ci-dessous.
create or replace function private.tableau_ministeres()
returns table (
  ministere_id uuid, nom text, description text, derniere_saisie timestamptz,
  prochain_evenement_date date, prochain_evenement_titre text,
  prochaine_reunion_date date, prochaine_reunion_heure time, point_ouvert_priorite public.priorite)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_type() as type, private.lit_tout() as lit_tout, private.aujourdhui() as jour
    where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select m.id, m.nom, m.description,
         -- Fraîcheur (règle 6) : dernière ligne de journal écrite par un compte du ministère.
         (select max(j.le) from public.journal j
            join public.compte c on c.user_id = j.compte
           where c.ministere_id = m.id),
         ev.date, ev.titre,
         case when moi.lit_tout then re.date end,
         case when moi.lit_tout then re.heure end,
         case when moi.lit_tout then (
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
    and (moi.lit_tout or moi.type in ('ministere', 'admin_eglise'))
$$;

revoke all on function private.tableau_ministeres() from public, anon, authenticated, service_role;
grant execute on function private.tableau_ministeres() to authenticated;
