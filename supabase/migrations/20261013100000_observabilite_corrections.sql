-- Observabilité des personnes (T56) : corrections après relecture de la migration
-- 20261013090000_observabilite_personnes.sql (figée : suivie par git).
--
-- 1. Lecture de intervenant : un compte de ministère actif ne lit plus que la déclaration
--    courante de sa session (la dernière), jamais les prénoms déclarés avant sur le même
--    appareil. v_ma_declaration lit cette seule ligne.
-- 2. Ajout d'un jour d'utilisation : compte de ministère actif seulement.
-- 3. declarer_intervenant : comptes de ministère seulement (T56, « Comptes de ministère
--    seulement ») ; la session du jeton doit exister dans auth.sessions (session fermée ou
--    révoquée refusée, comme controler_session pour les Edge Functions) ; prénom normalisé en NFC
--    (un « é » décomposé, copié depuis un téléphone, est accepté).
-- 4. v_personnes : comptes de ministère seulement, comme v_journal_intervenant.
-- 5. private.controler_appel devient volatile : elle appelle controler_session, qui pose
--    pilotage.session_appelant.
-- 6. Séquence de intervenant : aucun droit, comme les autres tables en ajout seulement.
--
-- Aucun objet nouveau : mêmes tables, vues, fonctions et politiques (listes de
-- structure.test.sql inchangées). Aucun SQL dynamique.

-- 1. et 2. Politiques

drop policy lecture on public.intervenant;
create policy lecture on public.intervenant for select to authenticated using (
  ((select private.mon_type()) = 'ministere' and id = (select private.ma_declaration_courante()))
  or (select private.mon_type()) = 'admin_plateforme');

drop policy ajout on public.passage;
create policy ajout on public.passage for insert to authenticated with check (
  (select private.mon_type()) = 'ministere'
  and intervenant_id = (select private.ma_declaration_courante())
  and jour = (select private.aujourdhui()));

create or replace view public.v_ma_declaration with (security_invoker = true) as
select i.id, i.prenom, i.motif, i.declare_le,
       floor(extract(epoch from (now() - i.declare_le)))::integer as age_secondes
  from public.intervenant i
 where i.id = (select private.ma_declaration_courante());

-- 3. Déclaration : compte de ministère actif, session vivante, prénom en NFC.
create or replace function private.declarer_intervenant(p_prenom text, p_motif text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid;
  v_prenom text;
  v_motif text;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'ministere' then
    raise exception 'Seul un compte de ministère indique un prénom.' using errcode = '42501';
  end if;
  v_session := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  if v_session is null or not exists (
    select 1 from auth.sessions s where s.id = v_session and s.user_id = (select auth.uid())
  ) then
    raise exception 'Session inconnue : reconnectez-vous.' using errcode = '42501';
  end if;
  if p_motif is null or p_motif not in ('connexion', 'rappel', 'changement') then
    raise exception 'Motif inconnu.';
  end if;
  v_prenom := normalize(regexp_replace(btrim(coalesce(p_prenom, '')), '\s+', ' ', 'g'), NFC);
  if v_prenom = '' then
    raise exception 'Indiquez votre prénom.';
  end if;
  if char_length(v_prenom) > 30 then
    raise exception '30 caractères au plus.';
  end if;
  if v_prenom !~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+\.?([ ''’-][A-Za-zÀ-ÖØ-öø-ɏ]+\.?)*$' then
    raise exception 'Écrivez seulement votre prénom, en lettres.';
  end if;
  v_motif := case
    when not exists (select 1 from public.intervenant i
                      where i.compte = (select auth.uid()) and i.session_auth = v_session) then 'connexion'
    when p_motif = 'changement' then 'changement'
    else 'rappel'
  end;
  insert into public.intervenant (compte, session_auth, prenom, motif)
  values ((select auth.uid()), v_session, v_prenom, v_motif);
  insert into public.passage (intervenant_id) values (private.ma_declaration_courante())
  on conflict do nothing;
end $$;

-- 4. Personnes : comptes de ministère seulement.
create or replace view public.v_personnes with (security_invoker = true) as
with groupes as (
  select i.compte,
         lower(i.prenom) as cle,
         (array_agg(i.prenom order by i.id desc))[1] as prenom,
         max(i.id) as intervenant_id,
         array_agg(i.id) as ids,
         (count(*) filter (where i.motif = 'connexion'
                             and (i.declare_le at time zone 'Europe/Paris')::date > private.aujourdhui() - 30))::integer
           as connexions_30_jours,
         (count(*) filter (where i.prenom <> '[prénom effacé]'
                             and (i.declare_le at time zone 'Europe/Paris')::date
                                 < (private.aujourdhui() - interval '12 months')::date))::integer
           as declarations_anciennes,
         max(i.declare_le) as derniere_declaration
    from public.intervenant i
   where (select private.mon_type()) = 'admin_plateforme'
   group by i.compte, lower(i.prenom)
)
select g.compte,
       c.libelle as compte_libelle,
       g.prenom,
       g.intervenant_id,
       g.connexions_30_jours,
       (select count(distinct p.jour)::integer from public.passage p
         where p.intervenant_id = any (g.ids) and p.jour > private.aujourdhui() - 30) as jours_30_jours,
       (select count(*)::integer from public.journal_intervenant ji
          join public.journal j on j.id = ji.journal_id
         where ji.intervenant_id = any (g.ids)
           and (j.le at time zone 'Europe/Paris')::date > private.aujourdhui() - 30) as actions_30_jours,
       greatest(g.derniere_declaration,
                (select max(p.premiere_le) from public.passage p where p.intervenant_id = any (g.ids)),
                (select max(j.le) from public.journal_intervenant ji
                   join public.journal j on j.id = ji.journal_id
                  where ji.intervenant_id = any (g.ids))) as derniere_activite,
       g.declarations_anciennes
  from groupes g
  join public.compte c on c.user_id = g.compte and c.type = 'ministere';

-- 5. Contrôle des Edge Functions : un effet de bord (set_config), donc volatile.
alter function private.controler_appel(uuid, uuid) volatile;

-- 6. Séquence
revoke all on sequence public.intervenant_id_seq from public, anon, authenticated, service_role;
