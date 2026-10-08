-- Acceptation des conditions d'utilisation (décision T53, réponses de la personne responsable du
-- 8 octobre 2026 ; BRIEF sections 7 et 8).
--
-- Après l'activation (mot de passe choisi, double authentification active) ou à une connexion
-- ultérieure, un compte qui n'a pas accepté la version COURANTE des conditions voit un écran
-- avant l'application. La version courante est une constante du code (src/lib/metier/conditions.ts) ;
-- la base ne la connaît pas : elle garde seulement la date et la version acceptées, par compte
-- (un compte de ministère est partagé, l'acceptation est celle du compte).
--
-- 1. Table acceptation_conditions, en ajout seulement (trigger d'inaltérabilité, aucune
--    exception). Une ligne par compte et par version (unique). Lecture : le compte lui-même (ses
--    lignes) et EJP Tech (admin_plateforme) ; jamais l'administration de l'église, le berger, le
--    conseil ni un autre ministère, donc pas private.lit_tout(). GRANT select seulement.
-- 2. accepter_conditions(p_version) : tout compte actif en aal2 ; idempotente pour une même
--    version (un second appel ne fait rien). Aucune ligne de journal : l'administration lit le
--    journal, et cette information n'est visible que d'EJP Tech.
--
-- Aucune donnée personnelle ; aucun texte libre ; aucun SQL dynamique.

-- 1. Table

create table public.acceptation_conditions (
  id uuid primary key default gen_random_uuid(),
  compte uuid not null default auth.uid() references public.compte (user_id),
  version text not null,
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint acceptation_conditions_version_check check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint acceptation_conditions_compte_version_key unique (compte, version)
);

alter table public.acceptation_conditions enable row level security;

create trigger forcer_auteur before insert on public.acceptation_conditions
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.acceptation_conditions
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.acceptation_conditions
  for each statement execute function private.refuser_modification();

-- Lecture : ses propres lignes, et EJP Tech. Aucune politique d'ajout : la fonction écrit.
create policy lecture on public.acceptation_conditions for select to authenticated using (
  compte = (select auth.uid())
  or (select private.mon_type()) = 'admin_plateforme');

create policy double_authentification on public.acceptation_conditions as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.acceptation_conditions from public, anon, authenticated, service_role;
grant select on public.acceptation_conditions to authenticated;

-- 2. Accepter les conditions

create function private.accepter_conditions(p_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Version des conditions inconnue.';
  end if;
  -- Idempotente : un second appel pour la même version ne fait rien (index unique).
  insert into public.acceptation_conditions (compte, version)
  values ((select auth.uid()), p_version)
  on conflict (compte, version) do nothing;
end $$;

create function public.accepter_conditions(p_version text)
returns void language sql security invoker set search_path = '' as $$
  select private.accepter_conditions(p_version);
$$;

-- 3. Droits des fonctions : rien pour public, anon ni service_role.
revoke all on function
  private.accepter_conditions(text),
  public.accepter_conditions(text)
  from public, anon, authenticated, service_role;
grant execute on function
  private.accepter_conditions(text),
  public.accepter_conditions(text)
  to authenticated;
