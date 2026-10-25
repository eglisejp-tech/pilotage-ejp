-- Corrections de l'écran 13 (décision T74) : suites de la revue de sécurité du 25 octobre 2026.
--
-- 1. L'ancienne adresse perd tous ses accès AVANT que l'adresse change dans Auth. Nouvelle étape
--    serveur private.serveur_preparer_correction_adresse (appelée par corriger-adresse entre le
--    contrôle et l'appel à Auth) : sessions supprimées, identités autres que l'email supprimées
--    (une connexion Google faite depuis l'adresse fausse rattache son identité au compte, et Auth
--    la retrouve par son identifiant Google, pas par l'adresse), jetons à usage unique supprimés
--    (liens d'invitation ou de récupération déjà envoyés). private.serveur_corriger_adresse refait
--    les mêmes suppressions après le changement, avant le journal.
-- 2. La correction accepte un compte désactivé jamais activé : « Réactiver » qui corrige
--    l'adresse corrige d'abord, compte encore désactivé (banni dans Auth, rien ne s'ouvre), puis
--    réactive. Avant, la réactivation levait le bannissement alors que l'ancienne adresse avait
--    encore ses accès.
-- 3. Suppression d'un ministère : ses comptes et les sessions qui l'attendent sont verrouillés
--    avant le contrôle. Une présence ajoutée en même temps à une session qui l'attend attend la
--    fin de la suppression (clé étrangère vers la session), ou la fait refuser.
--
-- Les fonctions existantes gardent leur signature (create or replace : propriétaire et droits
-- inchangés) ; la nouvelle fonction serveur suit le modèle des autres (private security
-- definer, public security invoker d'une ligne, service_role seulement).

-- 1. Correction d'une adresse : compte existant, autre que l'appelant, autre que
-- l'administration de l'église, jamais activé, actif ou désactivé, et nouvelle adresse libre.
-- Même signature que dans 20261025192715_comptes_corrections.sql.
create or replace function private.controler_correction_adresse(p_appelant uuid, p_user_id uuid, p_email text)
returns public.compte
language plpgsql stable set search_path = '' as $$
declare
  v_compte public.compte;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email = '' or char_length(v_email) > 254 or position('@' in v_email) < 2 then
    raise exception 'requete_invalide';
  end if;
  select c.* into v_compte from public.compte c where c.user_id = p_user_id;
  if not found then
    raise exception 'compte_inconnu';
  end if;
  if p_user_id = p_appelant then
    raise exception 'propre_compte';
  end if;
  if v_compte.type = 'admin_eglise' then
    raise exception 'type_interdit';
  end if;
  if private.compte_active(p_user_id) then
    raise exception 'compte_deja_active';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email and u.id <> p_user_id) then
    raise exception 'adresse_deja_utilisee';
  end if;
  return v_compte;
end $$;

-- Ce que l'ancienne adresse ouvrait encore : sessions, identités autres que l'email (Google),
-- liens à usage unique déjà envoyés. La colonne secret des facteurs n'est jamais lue.
create function private.couper_ancienne_adresse(p_user_id uuid) returns void
language plpgsql volatile set search_path = '' as $$
begin
  perform private.revoquer_sessions(p_user_id);
  delete from auth.identities i where i.user_id = p_user_id and i.provider <> 'email';
  delete from auth.one_time_tokens t where t.user_id = p_user_id;
end $$;

-- corriger-adresse, après le contrôle et avant l'appel à Auth.
create function private.serveur_preparer_correction_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  perform private.controler_correction_adresse(p_appelant, p_user_id, p_email);
  perform private.couper_ancienne_adresse(p_user_id);
end $$;

-- corriger-adresse, après le changement dans Auth (20261025192715_comptes_corrections.sql), avec
-- les mêmes suppressions que la préparation, refaites juste avant le journal.
create or replace function private.serveur_corriger_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_compte public.compte;
begin
  perform private.controler_appel(p_appelant, p_session);
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  v_compte := private.controler_correction_adresse(p_appelant, p_user_id, p_email);
  if not exists (select 1 from auth.users u
                  where u.id = p_user_id and lower(u.email) = lower(btrim(p_email))) then
    raise exception 'adresse_non_modifiee';
  end if;
  update auth.users set email_confirmed_at = null
   where id = p_user_id and email_confirmed_at is not null;
  perform private.couper_ancienne_adresse(p_user_id);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, v_compte.ministere_id, 'adresse_corrigee', 'compte', p_user_id,
          jsonb_build_object('type', v_compte.type));
end $$;

create function public.serveur_preparer_correction_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_preparer_correction_adresse(p_appelant, p_session, p_user_id, p_email);
$$;

-- 3. Suppression d'un ministère (20261025192715_comptes_corrections.sql) : comptes et sessions
-- qui l'attendent verrouillés avant le contrôle. Le reste du corps ne change pas.
create or replace function private.serveur_supprimer_ministere(
  p_appelant uuid, p_session uuid, p_ministere_id uuid
) returns uuid[]
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ministere public.ministere;
  v_comptes uuid[];
  v_indicateurs integer;
  v_compte uuid;
begin
  perform private.controler_appel(p_appelant, p_session);
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  select m.* into v_ministere from public.ministere m where m.id = p_ministere_id for update;
  perform 1 from public.compte c where c.ministere_id = p_ministere_id for update;
  perform 1 from public.session s
   where s.id in (select a.session_id from public.session_attendu a where a.ministere_id = p_ministere_id)
     for update;
  perform private.controler_suppression_ministere(p_ministere_id);
  select coalesce(array_agg(c.user_id order by c.user_id), array[]::uuid[]) into v_comptes
    from public.compte c where c.ministere_id = p_ministere_id;
  select count(*)::integer into v_indicateurs from public.indicateur i where i.ministere_id = p_ministere_id;

  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, p_ministere_id, 'ministere_supprime', 'ministere', p_ministere_id,
          jsonb_build_object('nom', v_ministere.nom, 'indicateurs', v_indicateurs,
                             'comptes', cardinality(v_comptes)));

  begin
    perform set_config('pilotage.suppression_ministere', p_ministere_id::text, true);
    delete from public.indicateur_terme t
     using public.indicateur i
     where i.id = t.calcul_id and i.ministere_id = p_ministere_id;
    delete from public.indicateur where ministere_id = p_ministere_id;
    delete from private.ministere_modele where ministere_id = p_ministere_id;
    perform set_config('pilotage.suppression_ministere', '', true);
    delete from public.session_attendu where ministere_id = p_ministere_id;
    foreach v_compte in array v_comptes loop
      perform private.revoquer_sessions(v_compte);
    end loop;
    delete from public.compte where ministere_id = p_ministere_id;
    delete from public.ministere where id = p_ministere_id;
  exception when foreign_key_violation then
    raise exception 'ministere_non_vide';
  end;
  return v_comptes;
end $$;

-- Droits : l'aide à personne ; la fonction serveur à service_role seulement.
revoke all on function private.couper_ancienne_adresse(uuid)
  from public, anon, authenticated, service_role;
revoke all on function
  private.serveur_preparer_correction_adresse(uuid, uuid, uuid, text),
  public.serveur_preparer_correction_adresse(uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  private.serveur_preparer_correction_adresse(uuid, uuid, uuid, text),
  public.serveur_preparer_correction_adresse(uuid, uuid, uuid, text)
to service_role;
