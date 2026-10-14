-- Compte visé par les fonctions serveur des comptes (décision T60, revue du 13 octobre 2026) :
-- jamais celui de l'administration de l'église.
--
-- Avant T60, seule l'administration appelait desactiver-compte, reinitialiser-2fa,
-- relancer-invitation et reactiver-compte : son propre compte lui était refusé (propre_compte),
-- et c'était le seul compte d'administration. Depuis 20261013130000_gestion_ejp_tech.sql, EJP Tech
-- les appelle : sans ce contrôle, un appel direct d'une Edge Function désactiverait, réactiverait,
-- relancerait ou réinitialiserait le compte de l'administration, que l'écran 13 ne montre pas.
-- Ce compte se gère au tableau de bord de Supabase, sur demande écrite de la coordination
-- (BRIEF, section 8, règle 5 ; docs/exploitation.md, 8.5), comme sa création (creer-compte
-- refuse déjà le type admin_eglise). Le refus réutilise le code court type_interdit, que les
-- Edge Functions traduisent déjà (400) : aucune Edge Function ne change.
--
-- Les deux fonctions gardent leur signature, leur propriétaire et leurs droits (create or
-- replace) ; leurs corps sont ceux d'origine (20260930220244_comptes_fonctions_serveur.sql et
-- 20261001084923_comptes_relance_reactivation.sql), avec le contrôle du type ajouté après
-- propre_compte. Aucune table, aucune fonction nouvelle, aucun droit nouveau.

-- Compte visé par une désactivation, une réinitialisation, une relance ou la suppression des
-- sessions : existant, autre que l'appelant, autre que l'administration de l'église, actif.
create or replace function private.controler_cible(p_appelant uuid, p_user_id uuid) returns public.compte
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
  if v_compte.type = 'admin_eglise' then
    raise exception 'type_interdit';
  end if;
  if v_compte.desactive_le is not null then
    raise exception 'compte_desactive';
  end if;
  return v_compte;
end $$;

-- Compte visé par une réactivation : existant, autre que l'appelant, autre que l'administration
-- de l'église, désactivé, et sans conflit avec un compte actif (un seul berger actif, un seul
-- compte actif par ministère).
create or replace function private.controler_cible_desactivee(p_appelant uuid, p_user_id uuid) returns public.compte
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
  if v_compte.type = 'admin_eglise' then
    raise exception 'type_interdit';
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

-- Droits inchangés (aides internes : personne ne les exécute, sinon leur propriétaire), redits ici.
revoke all on function
  private.controler_cible(uuid, uuid),
  private.controler_cible_desactivee(uuid, uuid)
from public, anon, authenticated, service_role;
