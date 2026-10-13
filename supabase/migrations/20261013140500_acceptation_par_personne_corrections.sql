-- Acceptation des conditions par personne (décision T61) : corrections après relecture de la
-- migration 20261013140000_acceptation_par_personne.sql (figée : suivie par git). BRIEF
-- sections 7 et 8.
--
-- 1. accepter_conditions : la version doit être une vraie date (AAAA-MM-JJ), au plus le jour de
--    Paris (private.aujourdhui()). Une version impossible (« 2026-13-01 ») ou à venir
--    (« 9999-12-31 »), envoyée directement à l'API, faussait la ligne « Conditions » de l'onglet
--    Personnes (v_personnes garde la plus grande version acceptée). Conséquence pour EJP Tech :
--    VERSION_CONDITIONS n'est jamais une date à venir. Pour un compte de ministère, la session du
--    jeton doit aussi exister dans auth.sessions (session fermée ou révoquée refusée), comme pour
--    declarer_intervenant.
-- 2. conditions_acceptees(p_version) : la question de l'écran, en oui ou non. Pour un compte de
--    ministère, la personne déclarée sur la session (même prénom sur le compte, majuscules
--    ignorées) a-t-elle accepté cette version ? Pour les autres comptes, le compte l'a-t-il
--    acceptée (T53) ? Faux sans déclaration valable.
-- 3. Lecture de acceptation_personne : EJP Tech seul. La session d'un compte de ministère lisait
--    les lignes de sa personne (numéros, versions, heures) : en déclarant un autre prénom, elle
--    apprenait quand cette personne avait accepté. Elle n'a besoin que du oui ou non (2).
-- 4. private.declarations_de_ma_personne() n'est plus lue par une politique : authenticated ne
--    l'exécute plus (les fonctions security definer qui l'appellent ont les droits de leur
--    propriétaire).
--
-- Aucune table nouvelle ; aucun texte libre ; aucun SQL dynamique ; aucune ligne de journal.

-- 1. Accepter les conditions (même signature, même droits : create or replace les garde).
create or replace function private.accepter_conditions(p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_date date;
  v_declaration bigint;
  v_session uuid;
begin
  perform private.exige_aal2();
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Version des conditions inconnue.';
  end if;
  -- Une vraie date (ni 13e mois, ni 30 février), au plus aujourd'hui, jour de Paris.
  begin
    v_date := p_version::date;
  exception when data_exception then
    raise exception 'Version des conditions inconnue.';
  end;
  if to_char(v_date, 'YYYY-MM-DD') <> p_version or v_date > private.aujourdhui() then
    raise exception 'Version des conditions inconnue.';
  end if;
  if private.mon_type() = 'ministere' then
    -- Compte partagé : la personne déclarée sur cette session accepte elle-même (T61).
    v_declaration := private.ma_declaration_courante();
    if v_declaration is null or not exists (
      select 1 from public.intervenant i where i.id = v_declaration and i.prenom <> '[prénom effacé]'
    ) then
      raise exception 'Indiquez d''abord votre prénom.' using errcode = '42501';
    end if;
    v_session := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
    if v_session is null or not exists (
      select 1 from auth.sessions s where s.id = v_session and s.user_id = (select auth.uid())
    ) then
      raise exception 'Session inconnue : reconnectez-vous.' using errcode = '42501';
    end if;
    -- Idempotente : une version déjà acceptée par la personne, sur cet appareil ou sur un autre,
    -- n'ajoute rien.
    if exists (select 1 from public.acceptation_personne a
                where a.version = p_version
                  and a.intervenant_id = any (private.declarations_de_ma_personne())) then
      return;
    end if;
    insert into public.acceptation_personne (intervenant_id, version)
    values (v_declaration, p_version)
    on conflict (intervenant_id, version) do nothing;
    return;
  end if;
  -- Compte non partagé : inchangé (T53), une ligne par compte et par version.
  insert into public.acceptation_conditions (compte, version)
  values ((select auth.uid()), p_version)
  on conflict (compte, version) do nothing;
end $$;

-- 2. La question de l'écran : oui ou non, sans numéro ni heure.
create function private.conditions_acceptees(p_version text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Version des conditions inconnue.';
  end if;
  if private.mon_type() = 'ministere' then
    -- Vide sans déclaration, ou quand la déclaration de la session est effacée : faux.
    return exists (select 1 from public.acceptation_personne a
                    where a.version = p_version
                      and a.intervenant_id = any (private.declarations_de_ma_personne()));
  end if;
  return exists (select 1 from public.acceptation_conditions a
                  where a.compte = (select auth.uid()) and a.version = p_version);
end $$;

create function public.conditions_acceptees(p_version text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.conditions_acceptees(p_version);
$$;

-- 3. Lecture : EJP Tech seul (onglet « Personnes »). Aucune politique d'ajout : la fonction écrit.
drop policy lecture on public.acceptation_personne;
create policy lecture on public.acceptation_personne for select to authenticated using (
  (select private.mon_type()) = 'admin_plateforme');

-- 4. Droits des fonctions : rien pour public, anon ni service_role.
revoke all on function
  private.conditions_acceptees(text),
  public.conditions_acceptees(text)
  from public, anon, authenticated, service_role;
grant execute on function
  private.conditions_acceptees(text),
  public.conditions_acceptees(text)
  to authenticated;
revoke all on function private.declarations_de_ma_personne()
  from public, anon, authenticated, service_role;
