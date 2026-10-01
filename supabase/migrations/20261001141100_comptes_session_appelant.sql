-- Étape 2 : la session de l'appelant doit encore exister (décision T15 de docs/decisions.md).
--
-- Un jeton d'accès reste valable jusqu'à son expiration (1 h), même après une déconnexion ou la
-- suppression de la session. Pour les fonctions de comptes, l'Edge Function passe désormais la
-- revendication session_id du JWT vérifié (p_session) ; la base exige une ligne de auth.sessions
-- avec cet identifiant, l'utilisateur de l'appelant et le niveau aal2, sinon 42501
-- session_revoquee (réponse 401 { erreur: 'session_revoquee' }). Un jeton volé ou d'une session
-- révoquée ne sert donc plus aux fonctions de comptes.
--
-- Mise en place sans réécrire les fonctions des migrations précédentes :
-- 1. les anciennes private.serveur_<nom> deviennent private.executer_<nom> (même corps, plus
--    exécutables par service_role) ;
-- 2. de nouvelles private.serveur_<nom>, en security definer, prennent p_session en deuxième
--    paramètre, contrôlent l'appelant puis sa session, et appellent private.executer_<nom> ;
-- 3. les fonctions public.serveur_<nom> sont recréées avec la même signature que leur partie
--    private, toujours d'une ligne en security invoker, pour service_role seulement.

-- Session de l'appelant : existante, à lui, en aal2.
create function private.controler_session(p_appelant uuid, p_session uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_appelant is null or p_session is null or not exists (
    select 1 from auth.sessions s
     where s.id = p_session and s.user_id = p_appelant and s.aal = 'aal2'
  ) then
    raise exception 'session_revoquee' using errcode = '42501';
  end if;
end $$;

-- Appelant complet : compte actif de l'administration de l'église, puis session vivante.
create function private.controler_appel(p_appelant uuid, p_session uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  perform private.controler_appelant(p_appelant);
  perform private.controler_session(p_appelant, p_session);
end $$;

revoke all on function
  private.controler_session(uuid, uuid),
  private.controler_appel(uuid, uuid)
from public, anon, authenticated, service_role;

-- 1. Les anciennes fonctions deviennent des parties internes

drop function public.serveur_controler_creation_compte(uuid, text, public.type_compte, uuid, text);
drop function public.serveur_controler_cible(uuid, uuid);
drop function public.serveur_creer_compte(uuid, uuid, public.type_compte, uuid, text, text);
drop function public.serveur_desactiver_compte(uuid, uuid);
drop function public.serveur_reinitialiser_2fa(uuid, uuid);
drop function public.serveur_controler_relance(uuid, uuid);
drop function public.serveur_relancer_invitation(uuid, uuid);
drop function public.serveur_controler_reactivation(uuid, uuid);
drop function public.serveur_reactiver_compte(uuid, uuid);
drop function public.serveur_revoquer_sessions(uuid, uuid);

alter function private.serveur_controler_creation_compte(uuid, text, public.type_compte, uuid, text)
  rename to executer_controler_creation_compte;
alter function private.serveur_controler_cible(uuid, uuid) rename to executer_controler_cible;
alter function private.serveur_creer_compte(uuid, uuid, public.type_compte, uuid, text, text)
  rename to executer_creer_compte;
alter function private.serveur_desactiver_compte(uuid, uuid) rename to executer_desactiver_compte;
alter function private.serveur_reinitialiser_2fa(uuid, uuid) rename to executer_reinitialiser_2fa;
alter function private.serveur_controler_relance(uuid, uuid) rename to executer_controler_relance;
alter function private.serveur_relancer_invitation(uuid, uuid) rename to executer_relancer_invitation;
alter function private.serveur_controler_reactivation(uuid, uuid) rename to executer_controler_reactivation;
alter function private.serveur_reactiver_compte(uuid, uuid) rename to executer_reactiver_compte;
alter function private.serveur_revoquer_sessions(uuid, uuid) rename to executer_revoquer_sessions;

revoke all on function
  private.executer_controler_creation_compte(uuid, text, public.type_compte, uuid, text),
  private.executer_controler_cible(uuid, uuid),
  private.executer_creer_compte(uuid, uuid, public.type_compte, uuid, text, text),
  private.executer_desactiver_compte(uuid, uuid),
  private.executer_reinitialiser_2fa(uuid, uuid),
  private.executer_controler_relance(uuid, uuid),
  private.executer_relancer_invitation(uuid, uuid),
  private.executer_controler_reactivation(uuid, uuid),
  private.executer_reactiver_compte(uuid, uuid),
  private.executer_revoquer_sessions(uuid, uuid)
from public, anon, authenticated, service_role;

-- 2. Nouvelles entrées private : appelant et session, puis la partie interne

create function private.serveur_controler_creation_compte(
  p_appelant uuid, p_session uuid, p_email text, p_type public.type_compte, p_ministere_id uuid,
  p_ministere_nom text
) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_controler_creation_compte(p_appelant, p_email, p_type, p_ministere_id, p_ministere_nom);
end $$;

create function private.serveur_controler_cible(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_controler_cible(p_appelant, p_user_id);
end $$;

create function private.serveur_creer_compte(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_type public.type_compte, p_ministere_id uuid,
  p_ministere_nom text, p_ministere_description text
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_creer_compte(p_appelant, p_user_id, p_type, p_ministere_id, p_ministere_nom,
                                        p_ministere_description);
end $$;

create function private.serveur_desactiver_compte(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_desactiver_compte(p_appelant, p_user_id);
end $$;

create function private.serveur_reinitialiser_2fa(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_reinitialiser_2fa(p_appelant, p_user_id);
end $$;

create function private.serveur_controler_relance(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_controler_relance(p_appelant, p_user_id);
end $$;

create function private.serveur_relancer_invitation(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_relancer_invitation(p_appelant, p_user_id);
end $$;

create function private.serveur_controler_reactivation(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_controler_reactivation(p_appelant, p_user_id);
end $$;

create function private.serveur_reactiver_compte(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_reactiver_compte(p_appelant, p_user_id);
end $$;

create function private.serveur_revoquer_sessions(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.executer_revoquer_sessions(p_appelant, p_user_id);
end $$;

-- 3. Fonctions public, d'une ligne, en security invoker

create function public.serveur_controler_creation_compte(
  p_appelant uuid, p_session uuid, p_email text, p_type public.type_compte,
  p_ministere_id uuid default null, p_ministere_nom text default null
) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_creation_compte(p_appelant, p_session, p_email, p_type, p_ministere_id,
                                                   p_ministere_nom);
$$;

create function public.serveur_controler_cible(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_cible(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_creer_compte(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_type public.type_compte,
  p_ministere_id uuid default null, p_ministere_nom text default null, p_ministere_description text default null
) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_creer_compte(p_appelant, p_session, p_user_id, p_type, p_ministere_id, p_ministere_nom,
                                      p_ministere_description);
$$;

create function public.serveur_desactiver_compte(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_desactiver_compte(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_reinitialiser_2fa(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_reinitialiser_2fa(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_controler_relance(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_relance(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_relancer_invitation(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_relancer_invitation(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_controler_reactivation(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_reactivation(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_reactiver_compte(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_reactiver_compte(p_appelant, p_session, p_user_id);
$$;

create function public.serveur_revoquer_sessions(p_appelant uuid, p_session uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_revoquer_sessions(p_appelant, p_session, p_user_id);
$$;

-- Droits : nouvelles fonctions serveur à service_role seulement.

revoke all on function
  private.serveur_controler_creation_compte(uuid, uuid, text, public.type_compte, uuid, text),
  private.serveur_controler_cible(uuid, uuid, uuid),
  private.serveur_creer_compte(uuid, uuid, uuid, public.type_compte, uuid, text, text),
  private.serveur_desactiver_compte(uuid, uuid, uuid),
  private.serveur_reinitialiser_2fa(uuid, uuid, uuid),
  private.serveur_controler_relance(uuid, uuid, uuid),
  private.serveur_relancer_invitation(uuid, uuid, uuid),
  private.serveur_controler_reactivation(uuid, uuid, uuid),
  private.serveur_reactiver_compte(uuid, uuid, uuid),
  private.serveur_revoquer_sessions(uuid, uuid, uuid),
  public.serveur_controler_creation_compte(uuid, uuid, text, public.type_compte, uuid, text),
  public.serveur_controler_cible(uuid, uuid, uuid),
  public.serveur_creer_compte(uuid, uuid, uuid, public.type_compte, uuid, text, text),
  public.serveur_desactiver_compte(uuid, uuid, uuid),
  public.serveur_reinitialiser_2fa(uuid, uuid, uuid),
  public.serveur_controler_relance(uuid, uuid, uuid),
  public.serveur_relancer_invitation(uuid, uuid, uuid),
  public.serveur_controler_reactivation(uuid, uuid, uuid),
  public.serveur_reactiver_compte(uuid, uuid, uuid),
  public.serveur_revoquer_sessions(uuid, uuid, uuid)
from public, anon, authenticated;

grant execute on function
  private.serveur_controler_creation_compte(uuid, uuid, text, public.type_compte, uuid, text),
  private.serveur_controler_cible(uuid, uuid, uuid),
  private.serveur_creer_compte(uuid, uuid, uuid, public.type_compte, uuid, text, text),
  private.serveur_desactiver_compte(uuid, uuid, uuid),
  private.serveur_reinitialiser_2fa(uuid, uuid, uuid),
  private.serveur_controler_relance(uuid, uuid, uuid),
  private.serveur_relancer_invitation(uuid, uuid, uuid),
  private.serveur_controler_reactivation(uuid, uuid, uuid),
  private.serveur_reactiver_compte(uuid, uuid, uuid),
  private.serveur_revoquer_sessions(uuid, uuid, uuid),
  public.serveur_controler_creation_compte(uuid, uuid, text, public.type_compte, uuid, text),
  public.serveur_controler_cible(uuid, uuid, uuid),
  public.serveur_creer_compte(uuid, uuid, uuid, public.type_compte, uuid, text, text),
  public.serveur_desactiver_compte(uuid, uuid, uuid),
  public.serveur_reinitialiser_2fa(uuid, uuid, uuid),
  public.serveur_controler_relance(uuid, uuid, uuid),
  public.serveur_relancer_invitation(uuid, uuid, uuid),
  public.serveur_controler_reactivation(uuid, uuid, uuid),
  public.serveur_reactiver_compte(uuid, uuid, uuid),
  public.serveur_revoquer_sessions(uuid, uuid, uuid)
to service_role;
