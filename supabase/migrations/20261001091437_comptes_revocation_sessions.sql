-- Étape 2, correctif d'audit : ordre de reinitialiser-2fa (BRIEF, section 8, règle 4, et P10).
--
-- Avant : facteurs supprimés, puis mot de passe, puis sessions. Un échec après la première étape
-- laissait un compte sans facteur, avec des sessions aal1 vivantes et l'ancien mot de passe
-- partagé : la personne partie pouvait enrôler son propre facteur.
-- Désormais l'Edge Function : 1. remplace le mot de passe ; 2. supprime les sessions par la
-- fonction ci-dessous (sans journal) ; 3. supprime les facteurs ; 4. appelle
-- serveur_reinitialiser_2fa, qui supprime de nouveau les sessions puis écrit le journal.
-- Même modèle que les autres fonctions serveur : contrôles dans private.serveur_<nom> (security
-- definer), public.serveur_<nom> d'une ligne en security invoker, service_role seulement.

create function private.serveur_revoquer_sessions(p_appelant uuid, p_user_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appelant(p_appelant);
  perform private.controler_cible(p_appelant, p_user_id);
  perform private.revoquer_sessions(p_user_id);
end $$;

create function public.serveur_revoquer_sessions(p_appelant uuid, p_user_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_revoquer_sessions(p_appelant, p_user_id);
$$;

revoke all on function
  private.serveur_revoquer_sessions(uuid, uuid),
  public.serveur_revoquer_sessions(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  private.serveur_revoquer_sessions(uuid, uuid),
  public.serveur_revoquer_sessions(uuid, uuid)
to service_role;
