-- Étape 2 : fonctions de base des Edge Functions de comptes (BRIEF, section 8, « Les Edge
-- Functions ») : creer-compte, desactiver-compte, reinitialiser-2fa.
--
-- Pourquoi des fonctions : chaque action écrit plusieurs lignes (ministère, compte, journal) qui
-- réussissent ou échouent ensemble, dans une seule transaction. Même modèle que l'API :
-- private.serveur_<nom> en security definer porte les contrôles, public.serveur_<nom> en
-- security invoker, d'une ligne, la rend appelable par PostgREST.
--
-- Seul service_role (la clé secrète, lue uniquement par les Edge Functions) les exécute : ni
-- anon ni authenticated. Elles ne commencent donc pas par private.exige_aal2() : l'Edge Function
-- a déjà vérifié le JWT de l'appelant, son niveau aal2 et son compte, et passe son identifiant
-- (p_appelant). La base le vérifie encore : compte actif de type admin_eglise, sinon 42501.
--
-- Les refus lèvent un code court (message de l'exception) que l'Edge Function traduit en réponse
-- HTTP. Le journal porte le compte de l'appelant, jamais d'email ni de texte libre.
--
-- Sessions : supprimer un facteur TOTP ne déconnecte pas le compte (Supabase redescend ses
-- sessions en aal1, d'où l'on peut enrôler un nouveau facteur), et un bannissement laisse les
-- jetons de rafraîchissement revenir à sa levée. La réinitialisation et la désactivation
-- suppriment donc les sessions du compte (les jetons de rafraîchissement suivent par clé
-- étrangère). Un jeton d'accès déjà émis reste valable jusqu'à son expiration (1 h) : risque
-- accepté (BRIEF, section 8, règle 4).

-- service_role appelle les fonctions private.serveur_* à travers leur fonction public.
grant usage on schema private to service_role;

-- Aides internes (exécutées seulement au nom du propriétaire, par les fonctions ci-dessous)

-- L'appelant doit être un compte actif de l'administration de l'église.
create function private.controler_appelant(p_appelant uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_appelant is null or not exists (
    select 1 from public.compte c
     where c.user_id = p_appelant and c.type = 'admin_eglise' and c.desactive_le is null
  ) then
    raise exception 'appelant_non_autorise' using errcode = '42501';
  end if;
end $$;

-- Règles de création (BRIEF, section 8) : jamais admin_eglise ; un ministère existant actif sans
-- compte actif, ou un nouveau ministère au nom libre ; un seul berger actif.
create function private.controler_creation_compte(
  p_type public.type_compte, p_ministere_id uuid, p_ministere_nom text
) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_type is null then
    raise exception 'requete_invalide';
  end if;
  if p_type = 'admin_eglise' then
    raise exception 'type_interdit';
  end if;
  if p_type = 'ministere' then
    if (p_ministere_id is null) = (p_ministere_nom is null) then
      raise exception 'requete_invalide';
    end if;
    if p_ministere_id is not null then
      if not exists (select 1 from public.ministere m where m.id = p_ministere_id and m.desactive_le is null) then
        raise exception 'ministere_inconnu';
      end if;
      if exists (select 1 from public.compte c where c.ministere_id = p_ministere_id and c.desactive_le is null) then
        raise exception 'ministere_a_deja_un_compte';
      end if;
    else
      -- 50 caractères au plus : le libellé « Ministère <nom> » tient dans 60.
      if char_length(btrim(p_ministere_nom)) not between 1 and 50 then
        raise exception 'requete_invalide';
      end if;
      if exists (select 1 from public.ministere m where lower(btrim(m.nom)) = lower(btrim(p_ministere_nom))) then
        raise exception 'nom_ministere_deja_pris';
      end if;
    end if;
  elsif p_ministere_id is not null or p_ministere_nom is not null then
    raise exception 'requete_invalide';
  elsif p_type = 'berger'
    and exists (select 1 from public.compte c where c.type = 'berger' and c.desactive_le is null) then
    raise exception 'berger_deja_actif';
  end if;
end $$;

-- Compte visé par une désactivation ou une réinitialisation : existant, actif, autre que
-- l'appelant.
create function private.controler_cible(p_appelant uuid, p_user_id uuid) returns public.compte
language plpgsql stable set search_path = '' as $$
declare
  v_compte public.compte;
begin
  select c.* into v_compte from public.compte c where c.user_id = p_user_id;
  if not found then
    raise exception 'compte_inconnu';
  end if;
  if p_user_id = p_appelant then
    raise exception 'propre_compte';
  end if;
  if v_compte.desactive_le is not null then
    raise exception 'compte_desactive';
  end if;
  return v_compte;
end $$;

-- Supprime les sessions du compte (voir l'en-tête).
create function private.revoquer_sessions(p_user_id uuid) returns void
language sql volatile set search_path = '' as $$
  delete from auth.sessions s where s.user_id = p_user_id
$$;

-- Contrôles préalables, sans écriture : l'Edge Function les appelle avant d'agir dans Auth,
-- pour ne pas inviter une adresse ni bannir un compte qui serait refusé ensuite.

-- L'adresse n'est lue que pour ce contrôle, jamais écrite : une adresse qui a déjà un compte
-- n'est pas invitée de nouveau (l'invitation renverrait l'utilisateur Auth existant).
create function private.serveur_controler_creation_compte(
  p_appelant uuid, p_email text, p_type public.type_compte, p_ministere_id uuid, p_ministere_nom text
) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appelant(p_appelant);
  if nullif(btrim(p_email), '') is null then
    raise exception 'requete_invalide';
  end if;
  if exists (select 1 from auth.users u join public.compte c on c.user_id = u.id
              where lower(u.email) = lower(btrim(p_email))) then
    raise exception 'adresse_deja_utilisee';
  end if;
  perform private.controler_creation_compte(p_type, p_ministere_id, p_ministere_nom);
end $$;

create function private.serveur_controler_cible(p_appelant uuid, p_user_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appelant(p_appelant);
  perform private.controler_cible(p_appelant, p_user_id);
end $$;

-- creer-compte : après l'invitation dans Auth. Crée le ministère si besoin (journal
-- ministere_cree), la ligne compte avec son libellé imposé, puis le journal compte_cree.
create function private.serveur_creer_compte(
  p_appelant uuid, p_user_id uuid, p_type public.type_compte,
  p_ministere_id uuid, p_ministere_nom text, p_ministere_description text
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ministere uuid := p_ministere_id;
  v_libelle text;
  v_numero integer;
begin
  -- Les créations et désactivations passent l'une après l'autre (numéro du libellé, berger
  -- unique, un compte actif par ministère).
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  perform private.controler_appelant(p_appelant);
  perform private.controler_creation_compte(p_type, p_ministere_id, p_ministere_nom);
  if p_user_id is null or not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'compte_inconnu';
  end if;
  if exists (select 1 from public.compte c where c.user_id = p_user_id) then
    raise exception 'adresse_deja_utilisee';
  end if;
  if char_length(p_ministere_description) > 280 then
    raise exception 'requete_invalide';
  end if;

  if p_type = 'ministere' and p_ministere_nom is not null then
    insert into public.ministere (nom, description)
    values (btrim(p_ministere_nom), nullif(btrim(p_ministere_description), ''))
    returning id into v_ministere;
    insert into public.journal (compte, ministere_id, action, cible, cible_id)
    values (p_appelant, v_ministere, 'ministere_cree', 'ministere', v_ministere);
  end if;

  -- Libellé imposé (BRIEF, section 6) : jamais tapé, jamais le nom d'une personne ; le numéro
  -- suit le plus grand déjà donné à ce type et n'est jamais réutilisé.
  if p_type = 'ministere' then
    select left('Ministère ' || m.nom, 60) into v_libelle from public.ministere m where m.id = v_ministere;
  elsif p_type = 'berger' then
    v_libelle := 'Berger';
  else
    select coalesce(max(substring(c.libelle from ', compte ([0-9]{1,9})$')::integer), 0) + 1
      into v_numero
      from public.compte c where c.type = p_type;
    v_libelle := case p_type when 'conseil' then 'Conseil' else 'EJP Tech' end || ', compte ' || v_numero;
  end if;

  insert into public.compte (user_id, type, ministere_id, libelle)
  values (p_user_id, p_type, v_ministere, v_libelle);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, v_ministere, 'compte_cree', 'compte', p_user_id, jsonb_build_object('type', p_type));
end $$;

-- desactiver-compte : après le bannissement dans Auth. Pose desactive_le sur le compte et, pour
-- un compte de ministère, sur son ministère ; garde toutes les données ; supprime les sessions.
create function private.serveur_desactiver_compte(p_appelant uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_compte public.compte;
  v_ministere_desactive boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  perform private.controler_appelant(p_appelant);
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  v_compte := private.controler_cible(p_appelant, p_user_id);

  update public.compte set desactive_le = now() where user_id = p_user_id;
  if v_compte.type = 'ministere' then
    update public.ministere set desactive_le = now()
     where id = v_compte.ministere_id and desactive_le is null;
    v_ministere_desactive := found;
  end if;
  perform private.revoquer_sessions(p_user_id);

  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, v_compte.ministere_id, 'compte_desactive', 'compte', p_user_id,
          jsonb_build_object('type', v_compte.type, 'ministere_desactive', v_ministere_desactive));
end $$;

-- reinitialiser-2fa : après la suppression des facteurs et le nouveau mot de passe dans Auth.
-- Supprime les sessions du compte, puis écrit le journal.
create function private.serveur_reinitialiser_2fa(p_appelant uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_compte public.compte;
begin
  perform private.controler_appelant(p_appelant);
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  v_compte := private.controler_cible(p_appelant, p_user_id);
  perform private.revoquer_sessions(p_user_id);
  insert into public.journal (compte, ministere_id, action, cible, cible_id)
  values (p_appelant, v_compte.ministere_id, 'double_auth_reinitialisee', 'compte', p_user_id);
end $$;

-- Fonctions public, d'une ligne, en security invoker

create function public.serveur_controler_creation_compte(
  p_appelant uuid, p_email text, p_type public.type_compte,
  p_ministere_id uuid default null, p_ministere_nom text default null
) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_creation_compte(p_appelant, p_email, p_type, p_ministere_id, p_ministere_nom);
$$;

create function public.serveur_controler_cible(p_appelant uuid, p_user_id uuid) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_cible(p_appelant, p_user_id);
$$;

create function public.serveur_creer_compte(
  p_appelant uuid, p_user_id uuid, p_type public.type_compte,
  p_ministere_id uuid default null, p_ministere_nom text default null, p_ministere_description text default null
) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_creer_compte(p_appelant, p_user_id, p_type, p_ministere_id, p_ministere_nom,
                                      p_ministere_description);
$$;

create function public.serveur_desactiver_compte(p_appelant uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_desactiver_compte(p_appelant, p_user_id);
$$;

create function public.serveur_reinitialiser_2fa(p_appelant uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_reinitialiser_2fa(p_appelant, p_user_id);
$$;

-- Droits : aides internes à personne ; fonctions serveur à service_role seulement.

revoke all on function
  private.controler_appelant(uuid),
  private.controler_creation_compte(public.type_compte, uuid, text),
  private.controler_cible(uuid, uuid),
  private.revoquer_sessions(uuid)
from public, anon, authenticated, service_role;

revoke all on function
  private.serveur_controler_creation_compte(uuid, text, public.type_compte, uuid, text),
  private.serveur_controler_cible(uuid, uuid),
  private.serveur_creer_compte(uuid, uuid, public.type_compte, uuid, text, text),
  private.serveur_desactiver_compte(uuid, uuid),
  private.serveur_reinitialiser_2fa(uuid, uuid),
  public.serveur_controler_creation_compte(uuid, text, public.type_compte, uuid, text),
  public.serveur_controler_cible(uuid, uuid),
  public.serveur_creer_compte(uuid, uuid, public.type_compte, uuid, text, text),
  public.serveur_desactiver_compte(uuid, uuid),
  public.serveur_reinitialiser_2fa(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  private.serveur_controler_creation_compte(uuid, text, public.type_compte, uuid, text),
  private.serveur_controler_cible(uuid, uuid),
  private.serveur_creer_compte(uuid, uuid, public.type_compte, uuid, text, text),
  private.serveur_desactiver_compte(uuid, uuid),
  private.serveur_reinitialiser_2fa(uuid, uuid),
  public.serveur_controler_creation_compte(uuid, text, public.type_compte, uuid, text),
  public.serveur_controler_cible(uuid, uuid),
  public.serveur_creer_compte(uuid, uuid, public.type_compte, uuid, text, text),
  public.serveur_desactiver_compte(uuid, uuid),
  public.serveur_reinitialiser_2fa(uuid, uuid)
to service_role;
