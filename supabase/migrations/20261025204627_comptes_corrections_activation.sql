-- Suppression d'un ministère vide (décision T74) : un compte activé un jour ne se supprime pas,
-- même après « Refaire l'activation ».
--
-- 20261025192715_comptes_corrections.sql reconnaît un compte activé à son facteur TOTP vérifié.
-- « Refaire l'activation » (reinitialiser-2fa) supprime ce facteur : le compte redevient
-- « À activer » et son ministère, sans saisie, devenait supprimable alors que quelqu'un s'en est
-- servi. La ligne de journal double_auth_reinitialisee qui vise le compte le prouve : elle refuse
-- désormais la suppression (compte_deja_active), comme le facteur vérifié.
-- La correction de l'adresse ne change pas : elle suit l'état affiché (« Invitation envoyée » et
-- « À activer », aussi après « Refaire l'activation »), et ne supprime rien.
--
-- Même signature, même corps que la migration précédente, plus cette condition : create or
-- replace garde le propriétaire et les droits (aucun pour personne).

create or replace function private.refus_suppression_ministere(p_ministere_id uuid) returns text
language sql stable set search_path = '' as $$
  select case
    when p_ministere_id is null
      or not exists (select 1 from public.ministere m where m.id = p_ministere_id) then 'ministere_inconnu'
    -- FIJ et Coordination : posés par les migrations, lus par leur code (Proposé, T74).
    when exists (select 1 from public.ministere m where m.id = p_ministere_id and m.code is not null)
      then 'ministere_de_reference'
    -- Un compte activé, aujourd'hui (facteur vérifié) ou avant « Refaire l'activation ».
    when exists (select 1 from public.compte c
                  where c.ministere_id = p_ministere_id
                    and (private.compte_active(c.user_id)
                         or exists (select 1 from public.journal j
                                     where j.action = 'double_auth_reinitialisee'
                                       and j.cible_id = c.user_id)))
      then 'compte_deja_active'
    when exists (select 1 from public.mesure x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.participation x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.fij_departement x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.fij_statistique x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.ventilation_sensible x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.precision_sensible x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.point_attention x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.point_mention x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.evenement x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.evenement_mention x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.reunion x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.signalement x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.demande_indicateur x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.validation x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.retrait_indicateur x where x.ministere_id = p_ministere_id)
      -- Une session déjà saisie qui l'attend : sa complétude passée ne change pas.
      or exists (select 1 from public.session_attendu a
                  where a.ministere_id = p_ministere_id
                    and exists (select 1 from public.participation p where p.session_id = a.session_id))
      -- Ce qu'un de ses comptes a fait ou déclaré.
      or exists (select 1 from public.compte c
                  where c.ministere_id = p_ministere_id
                    and (exists (select 1 from public.journal j where j.compte = c.user_id)
                         or exists (select 1 from public.intervenant x where x.compte = c.user_id)
                         or exists (select 1 from public.acceptation_conditions x where x.compte = c.user_id)))
      then 'ministere_non_vide'
  end
$$;

revoke all on function private.refus_suppression_ministere(uuid)
  from public, anon, authenticated, service_role;
