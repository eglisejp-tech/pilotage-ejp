-- Étape 2 : fonctions de base des Edge Functions relancer-invitation et reactiver-compte (BRIEF,
-- section 8, « Les Edge Functions »). Même modèle que la migration comptes_fonctions_serveur :
-- private.serveur_<nom> en security definer porte les contrôles, public.serveur_<nom> en security
-- invoker d'une ligne, exécutables par service_role seulement (la clé secrète des Edge
-- Functions), qui passe l'identifiant de l'appelant déjà vérifié (JWT, aal2, compte).
-- Les refus lèvent un code court ; le journal porte le compte de l'appelant, jamais d'email.

-- Aides internes (exécutées seulement au nom du propriétaire)

-- Invitation encore en attente : l'adresse n'a pas été confirmée (lien de l'invitation pas
-- encore ouvert). Seule la date de confirmation est lue, jamais l'adresse.
create function private.controler_invitation_en_attente(p_user_id uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if exists (select 1 from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null) then
    raise exception 'invitation_deja_acceptee';
  end if;
end $$;

-- Compte visé par une réactivation : existant, désactivé, autre que l'appelant, et sans
-- conflit avec un compte actif (un seul berger actif, un seul compte actif par ministère).
create function private.controler_cible_desactivee(p_appelant uuid, p_user_id uuid) returns public.compte
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
  if v_compte.desactive_le is null then
    raise exception 'compte_actif';
  end if;
  if v_compte.type = 'berger' and exists (
    select 1 from public.compte c where c.type = 'berger' and c.desactive_le is null
  ) then
    raise exception 'berger_deja_actif';
  end if;
  if v_compte.type = 'ministere' and exists (
    select 1 from public.compte c
     where c.ministere_id = v_compte.ministere_id and c.desactive_le is null and c.user_id <> p_user_id
  ) then
    raise exception 'ministere_a_deja_un_compte';
  end if;
  return v_compte;
end $$;

-- Contrôles préalables, sans écriture (avant l'action dans Auth)

create function private.serveur_controler_relance(p_appelant uuid, p_user_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appelant(p_appelant);
  perform private.controler_cible(p_appelant, p_user_id);
  perform private.controler_invitation_en_attente(p_user_id);
end $$;

create function private.serveur_controler_reactivation(p_appelant uuid, p_user_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appelant(p_appelant);
  perform private.controler_cible_desactivee(p_appelant, p_user_id);
end $$;

-- relancer-invitation : après le nouvel envoi de l'invitation par Auth. Écrit le journal.
create function private.serveur_relancer_invitation(p_appelant uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_compte public.compte;
begin
  perform private.controler_appelant(p_appelant);
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  v_compte := private.controler_cible(p_appelant, p_user_id);
  insert into public.journal (compte, ministere_id, action, cible, cible_id)
  values (p_appelant, v_compte.ministere_id, 'invitation_relancee', 'compte', p_user_id);
end $$;

-- reactiver-compte : après la levée du bannissement dans Auth. Remet desactive_le à null sur le
-- compte et, pour un compte de ministère, sur son ministère (la période d'arrêt compte alors
-- comme active), puis écrit le journal.
create function private.serveur_reactiver_compte(p_appelant uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_compte public.compte;
begin
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  perform private.controler_appelant(p_appelant);
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  v_compte := private.controler_cible_desactivee(p_appelant, p_user_id);

  update public.compte set desactive_le = null where user_id = p_user_id;
  if v_compte.type = 'ministere' then
    update public.ministere set desactive_le = null where id = v_compte.ministere_id;
  end if;

  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, v_compte.ministere_id, 'compte_reactive', 'compte', p_user_id,
          jsonb_build_object('type', v_compte.type));
end $$;

-- Fonctions public, d'une ligne, en security invoker

create function public.serveur_controler_relance(p_appelant uuid, p_user_id uuid) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_relance(p_appelant, p_user_id);
$$;

create function public.serveur_controler_reactivation(p_appelant uuid, p_user_id uuid) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_reactivation(p_appelant, p_user_id);
$$;

create function public.serveur_relancer_invitation(p_appelant uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_relancer_invitation(p_appelant, p_user_id);
$$;

create function public.serveur_reactiver_compte(p_appelant uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_reactiver_compte(p_appelant, p_user_id);
$$;

-- Droits : aides internes à personne ; fonctions serveur à service_role seulement.

revoke all on function
  private.controler_invitation_en_attente(uuid),
  private.controler_cible_desactivee(uuid, uuid)
from public, anon, authenticated, service_role;

revoke all on function
  private.serveur_controler_relance(uuid, uuid),
  private.serveur_controler_reactivation(uuid, uuid),
  private.serveur_relancer_invitation(uuid, uuid),
  private.serveur_reactiver_compte(uuid, uuid),
  public.serveur_controler_relance(uuid, uuid),
  public.serveur_controler_reactivation(uuid, uuid),
  public.serveur_relancer_invitation(uuid, uuid),
  public.serveur_reactiver_compte(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  private.serveur_controler_relance(uuid, uuid),
  private.serveur_controler_reactivation(uuid, uuid),
  private.serveur_relancer_invitation(uuid, uuid),
  private.serveur_reactiver_compte(uuid, uuid),
  public.serveur_controler_relance(uuid, uuid),
  public.serveur_controler_reactivation(uuid, uuid),
  public.serveur_relancer_invitation(uuid, uuid),
  public.serveur_reactiver_compte(uuid, uuid)
to service_role;
