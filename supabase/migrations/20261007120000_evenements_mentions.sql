-- Étape 4, lot B6, migration 1 sur 2 : mentions de ministères sur les événements (T32 ;
-- docs/plan-etape-4.md, section 4, « B6 » ; docs/conception/contrat-etape-4.md, sections 1, 5 et 7).
--
-- 1. Table evenement_mention (événement, ministère) : écrite seulement par ajouter_evenement,
--    à la création de l'événement, puis figée (ajout seulement). Aucun GRANT insert, aucune
--    politique d'ajout : seule la fonction y écrit.
-- 2. Lecture : un ministère mentionné lit cet événement (et seulement lui), ses états et ses
--    mentions. La politique de evenement lit les mentions par une fonction security definer,
--    sans RLS, comme pour les points : aucune politique ne relit l'autre table sous RLS (pas de
--    récursion). evenement_etat et evenement_mention suivent evenement.
-- 3. ajouter_evenement(p_titre, p_date, p_statut, p_mentions) : contrôles de creer_point sur les
--    mentions (doublons retirés, ministères actifs seulement, jamais soi-même) ; mentions
--    insérées avant le premier état, pour que la ligne de journal les porte. La version à trois
--    arguments délègue avec '{}'. Le refus d'une date passée de l'étape 3 reste, avec son
--    message (« La date ne peut pas être passée. »).
-- 4. Journal : evenement_ajoute porte la date, le statut et les identifiants des ministères
--    mentionnés (jamais un nom) ; evenement_modifie gagne date_precedente (date de l'état qui
--    précédait l'envoi).

-- 1. Table

create table public.evenement_mention (         -- fixées à la création de l'événement
  evenement_id uuid not null references public.evenement,
  ministere_id uuid not null references public.ministere,
  primary key (evenement_id, ministere_id)
);
create index evenement_mention_ministere_idx on public.evenement_mention (ministere_id);
alter table public.evenement_mention enable row level security;

-- Ajout seulement, même pour le propriétaire des tables.
create trigger ajout_seulement before update or delete on public.evenement_mention
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.evenement_mention
  for each statement execute function private.refuser_modification();

-- 2. Lecture

-- Lit les mentions sans RLS : la politique de evenement ne relit pas evenement_mention sous RLS.
create function private.evenements_mentionnant_mon_ministere() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.evenement_id from public.evenement_mention m where m.ministere_id = private.mon_ministere()
$$;

revoke all on function private.evenements_mentionnant_mon_ministere() from public, anon, authenticated, service_role;
grant execute on function private.evenements_mentionnant_mon_ministere() to authenticated;

-- Berger, conseil et EJP Tech : tout ; un ministère : ses événements et ceux qui le
-- mentionnent ; l'administration : rien.
drop policy lecture on public.evenement;
create policy lecture on public.evenement for select to authenticated using (
  (select private.lit_tout())
  or ministere_id = (select private.mon_ministere())
  or id in (select private.evenements_mentionnant_mon_ministere()));

-- Les mentions des événements lisibles (comme point_mention suit point_attention).
create policy lecture on public.evenement_mention for select to authenticated
  using (evenement_id in (select e.id from public.evenement e));

create policy double_authentification on public.evenement_mention as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.evenement_mention from anon, authenticated, service_role;
grant select on public.evenement_mention to authenticated;

-- 3. Ajout d'un événement avec ses mentions

create function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[])
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
  -- Premier état : le trigger de evenement_etat écrit la ligne de journal evenement_ajoute,
  -- avec les mentions déjà posées, au nom du compte connecté (auteur imposé par forcer_auteur).
  insert into public.evenement_etat (evenement_id, date, statut) values (v_evenement, p_date, p_statut);
  return v_evenement;
end $$;

create function public.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[])
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_evenement(p_titre, p_date, p_statut, p_mentions);
$$;

revoke all on function private.ajouter_evenement(text, date, public.statut_evenement, uuid[])
  from public, anon, authenticated, service_role;
grant execute on function private.ajouter_evenement(text, date, public.statut_evenement, uuid[]) to authenticated;
revoke all on function public.ajouter_evenement(text, date, public.statut_evenement, uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.ajouter_evenement(text, date, public.statut_evenement, uuid[]) to authenticated;

-- La version à trois arguments (étape 3) délègue, sans mention. Même signature : create or
-- replace garde le propriétaire et les droits.
create or replace function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  return private.ajouter_evenement(p_titre, p_date, p_statut, '{}'::uuid[]);
end $$;

-- 4. Journal des événements
--
-- Une ligne par envoi et par événement : evenement_ajoute s'il n'existe aucune ligne d'état
-- plus ancienne pour cet événement, sinon evenement_modifie. Le ministère est celui de
-- l'événement. detail : codes, identifiants et dates seulement, jamais le nom de l'événement
-- ni celui d'un ministère.
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
           else jsonb_build_object('date', x.date, 'statut', x.statut, 'date_precedente', x.date_precedente)
         end
  from (
    select distinct on (n.saisi_le, n.saisi_par, n.evenement_id)
           n.saisi_le, n.saisi_par, n.evenement_id, n.date, n.statut, e.ministere_id,
           case when exists (select 1 from public.evenement_etat p
                              where p.evenement_id = n.evenement_id
                                and (p.saisi_le < n.saisi_le
                                     or not exists (select 1 from nouvelles y where y.id = p.id)))
                then 'evenement_modifie' else 'evenement_ajoute' end as action,
           -- Date de l'état qui précédait l'envoi (le plus récent hors de cet envoi).
           (select p.date from public.evenement_etat p
             where p.evenement_id = n.evenement_id
               and not exists (select 1 from nouvelles y where y.id = p.id)
             order by p.saisi_le desc, p.id desc
             limit 1) as date_precedente
    from nouvelles n
    join public.evenement e on e.id = n.evenement_id
    order by n.saisi_le, n.saisi_par, n.evenement_id, n.id desc
  ) as x;
  return null;
end $$;
