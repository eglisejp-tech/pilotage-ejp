-- Mentions modifiables sur un point non traité (décision T54, réponses écrites de la personne
-- responsable du 8 octobre 2026 ; BRIEF section 3 règle 7, section 7 matrice et fonctions).
--
-- Sur un point qui n'est pas traité, le ministère créateur, le berger et le conseil ajoutent et
-- retirent des ministères mentionnés (ministères actifs autres que le créateur). Jamais un
-- ministère mentionné, jamais EJP Tech, jamais l'administration de l'église.
--
-- Tout reste en ajout seulement :
-- - un ajout est une nouvelle ligne de point_mention (la clé (point, ministère) devient une
--   clé d'identifiant : un ministère retiré puis ajouté de nouveau a deux lignes) ;
-- - un retrait est une nouvelle ligne de point_mention_retrait, qui désigne la ligne d'ajout
--   qu'elle annule (date, auteur). Rien n'est modifié ni effacé ;
-- - la mention effective d'un ministère sur un point est sa ligne d'ajout qui n'a pas de retrait.
--   Un ministère retiré ne voit plus le point ; le même ministère ajouté de nouveau le revoit.
--
-- 1. point_mention gagne un identifiant, une date et un auteur (les lignes existantes prennent
--    la date et l'auteur du point, qui les a posées à sa création), et devient inaltérable.
-- 2. Table point_mention_retrait, en ajout seulement.
-- 3. Lecture : la fonction qui dit « ce point me mentionne » (politique de point_attention),
--    changer_statut_point et marquer_traite ne comptent que les mentions effectives. La vue
--    v_point_mention donne les mentions effectives des points que le compte lit.
-- 4. Fonctions ajouter_mention_point, retirer_mention_point et modifier_mentions_point (l'écran
--    envoie la liste voulue, la base écrit la différence en une transaction). Une ligne de
--    journal par ajout et par retrait, avec l'identifiant du ministère, jamais un texte.
-- 5. Journal : deux codes d'action nouveaux (point_mention_ajoutee, point_mention_retiree).
--
-- Aucun SQL dynamique ; aucun texte libre.

-- 1. point_mention : identifiant, date, auteur

alter table public.point_mention drop constraint point_mention_pkey;
alter table public.point_mention
  add column id uuid not null default gen_random_uuid(),
  add column saisi_le timestamptz,
  add column saisi_par uuid references public.compte (user_id);
-- Les mentions existantes ont été posées à la création du point.
update public.point_mention m
   set saisi_le = p.saisi_le, saisi_par = p.saisi_par
  from public.point_attention p
 where p.id = m.point_id;
alter table public.point_mention
  alter column saisi_le set not null,
  alter column saisi_le set default now(),
  alter column saisi_par set not null,
  alter column saisi_par set default auth.uid(),
  add constraint point_mention_pkey primary key (id);
create index point_mention_point_ministere_idx on public.point_mention (point_id, ministere_id);

create trigger forcer_auteur before insert on public.point_mention
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.point_mention
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.point_mention
  for each statement execute function private.refuser_modification();

-- 2. Retraits

create table public.point_mention_retrait (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null unique references public.point_mention (id),   -- l'ajout qu'il annule
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);

alter table public.point_mention_retrait enable row level security;

create trigger forcer_auteur before insert on public.point_mention_retrait
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.point_mention_retrait
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.point_mention_retrait
  for each statement execute function private.refuser_modification();

-- Lecture : les retraits des mentions que le compte lit (donc des points qu'il lit). Aucune
-- politique d'ajout : seules les fonctions écrivent.
create policy lecture on public.point_mention_retrait for select to authenticated
  using (mention_id in (select m.id from public.point_mention m));

create policy double_authentification on public.point_mention_retrait as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.point_mention_retrait from public, anon, authenticated, service_role;
grant select on public.point_mention_retrait to authenticated;

-- 3. Mentions effectives

-- Identifiant de la ligne d'ajout qui fait mentionner ce ministère sur ce point (sans retrait),
-- ou null. Lit les tables sans RLS ; appelée par des fonctions security definer seulement.
create function private.mention_effective(p_point_id uuid, p_ministere_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.point_mention m
   where m.point_id = p_point_id and m.ministere_id = p_ministere_id
     and not exists (select 1 from public.point_mention_retrait r where r.mention_id = m.id)
   order by m.saisi_le desc, m.id desc
   limit 1
$$;

revoke all on function private.mention_effective(uuid, uuid) from public, anon, authenticated, service_role;

-- Points qui mentionnent encore le ministère du compte (politique de point_attention). Même
-- signature : les droits restent en place.
create or replace function private.points_mentionnant_mon_ministere() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.point_id from public.point_mention m
   where m.ministere_id = private.mon_ministere()
     and not exists (select 1 from public.point_mention_retrait r where r.mention_id = m.id)
$$;

-- Mentions effectives des points que le compte lit (sous sa RLS).
create view public.v_point_mention with (security_invoker = true) as
select m.point_id, m.ministere_id
  from public.point_mention m
 where not exists (select 1 from public.point_mention_retrait r where r.mention_id = m.id);

revoke all on public.v_point_mention from public, anon, authenticated, service_role;
grant select on public.v_point_mention to authenticated;

-- Changer le statut : créateur ou ministère encore mentionné.
create or replace function private.changer_statut_point(p_point_id uuid, p_statut public.statut_point)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_mon_ministere uuid;
  v_point public.point_attention%rowtype;
  v_actuel public.statut_point;
begin
  perform private.exige_aal2();
  v_mon_ministere := private.mon_ministere();
  select p.* into v_point from public.point_attention p
   where p.id = p_point_id
     and (p.ministere_id = v_mon_ministere
          or private.mention_effective(p.id, v_mon_ministere) is not null)
     for update of p;
  if v_point.id is null then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  -- Statut courant : « traite » l'emporte sur tout autre suivi, même plus récent.
  select s.statut into v_actuel from public.point_suivi s
   where s.point_id = p_point_id
   order by (s.statut = 'traite') desc, s.saisi_le desc
   limit 1;
  if v_actuel = 'traite' then
    raise exception 'Ce point est traité : il ne change plus.';
  end if;
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  if p_statut = 'traite' then
    raise exception 'Utilisez le bouton Marquer traité.';
  end if;
  if v_actuel = p_statut then
    return;                               -- même statut : rien n'est écrit
  end if;
  insert into public.point_suivi (point_id, statut) values (p_point_id, p_statut);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_point.ministere_id, 'point_statut', 'point_attention', p_point_id,
          jsonb_build_object('statut', jsonb_build_array(v_actuel, p_statut)));
end $$;

-- Marquer traité : créateur, ministère encore mentionné, berger ou conseil.
create or replace function private.marquer_traite(p_point_id uuid, p_commentaire text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_point public.point_attention%rowtype;
  v_mon_ministere uuid;
  v_commentaire text;
  v_par_ministere boolean := false;
begin
  perform private.exige_aal2();
  v_mon_ministere := private.mon_ministere();
  v_commentaire := nullif(btrim(p_commentaire), '');
  select * into v_point from public.point_attention where id = p_point_id for update;
  if v_point.id is not null and v_mon_ministere is not null then
    v_par_ministere := v_point.ministere_id = v_mon_ministere
      or private.mention_effective(p_point_id, v_mon_ministere) is not null;
  end if;
  if v_point.id is null or not (private.est_decideur() or v_par_ministere) then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.point_suivi s where s.point_id = p_point_id and s.statut = 'traite') then
    raise exception 'Ce point est déjà traité.';
  end if;
  if char_length(v_commentaire) > 280 then
    raise exception 'Le commentaire dépasse 280 caractères.';
  end if;
  if v_par_ministere and coalesce(char_length(v_commentaire), 0) < 10 then
    raise exception 'Expliquez ce qui a été traité et comment (10 caractères au moins).';
  end if;
  insert into public.point_suivi (point_id, statut, commentaire) values (p_point_id, 'traite', v_commentaire);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_point.ministere_id, 'point_traite', 'point_attention', p_point_id,
          jsonb_build_object('avec_commentaire', v_commentaire is not null));
end $$;

-- 4. Fonctions

-- Contrôles communs : le point existe et le compte est son ministère créateur, le berger ou le
-- conseil (sinon le message d'un point absent, 42501, pour ne rien révéler) ; le point n'est pas
-- traité. Verrouille le point pour la durée de la transaction (deux modifications ne se croisent
-- pas). Rend le ministère créateur.
create function private.controler_mentions_point(p_point_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_createur uuid;
begin
  select p.ministere_id into v_createur from public.point_attention p where p.id = p_point_id for update;
  if v_createur is null
     or not (private.est_decideur() or coalesce(v_createur = private.mon_ministere(), false)) then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.point_suivi s where s.point_id = p_point_id and s.statut = 'traite') then
    raise exception 'Ce point est traité : ses mentions ne changent plus.';
  end if;
  return v_createur;
end $$;

-- Ajoute une mention : ministère actif, autre que le créateur, pas déjà mentionné.
create function private.poser_mention(p_point_id uuid, p_createur uuid, p_ministere_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_ministere_id is null or p_ministere_id = p_createur
     or not exists (select 1 from public.ministere m where m.id = p_ministere_id and m.desactive_le is null) then
    raise exception 'Ce ministère ne peut pas être mentionné.';
  end if;
  if private.mention_effective(p_point_id, p_ministere_id) is not null then
    raise exception 'Ce ministère est déjà mentionné sur ce point.';
  end if;
  insert into public.point_mention (point_id, ministere_id) values (p_point_id, p_ministere_id);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), p_createur, 'point_mention_ajoutee', 'point_attention', p_point_id,
          jsonb_build_object('ministere', p_ministere_id));
end $$;

-- Retire une mention : le ministère doit être mentionné (actif ou désactivé depuis).
create function private.defaire_mention(p_point_id uuid, p_createur uuid, p_ministere_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_mention uuid;
begin
  v_mention := private.mention_effective(p_point_id, p_ministere_id);
  if v_mention is null then
    raise exception 'Ce ministère n''est pas mentionné sur ce point.';
  end if;
  insert into public.point_mention_retrait (mention_id) values (v_mention);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), p_createur, 'point_mention_retiree', 'point_attention', p_point_id,
          jsonb_build_object('ministere', p_ministere_id));
end $$;

create function private.ajouter_mention_point(p_point_id uuid, p_ministere_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  perform private.poser_mention(p_point_id, private.controler_mentions_point(p_point_id), p_ministere_id);
end $$;

create function private.retirer_mention_point(p_point_id uuid, p_ministere_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  perform private.defaire_mention(p_point_id, private.controler_mentions_point(p_point_id), p_ministere_id);
end $$;

-- L'écran envoie la liste voulue : la base retire ceux qui n'y sont plus, puis ajoute les
-- nouveaux, dans la même transaction. Un ministère déjà mentionné qui reste dans la liste n'est
-- pas revérifié (même désactivé depuis) ; seuls les ajouts le sont.
create function private.modifier_mentions_point(p_point_id uuid, p_mentions uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_createur uuid;
  v_voulues uuid[];
  v_ministere uuid;
begin
  perform private.exige_aal2();
  v_createur := private.controler_mentions_point(p_point_id);
  if p_mentions is null then
    raise exception 'Choisissez les ministères à mentionner.';
  end if;
  select coalesce(array_agg(distinct x.id), '{}') into v_voulues
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  for v_ministere in
    select distinct m.ministere_id from public.point_mention m
     where m.point_id = p_point_id
       and not exists (select 1 from public.point_mention_retrait r where r.mention_id = m.id)
       and m.ministere_id <> all (v_voulues)
     order by m.ministere_id
  loop
    perform private.defaire_mention(p_point_id, v_createur, v_ministere);
  end loop;
  for v_ministere in
    select x.id from unnest(v_voulues) as x(id)
     where private.mention_effective(p_point_id, x.id) is null
     order by x.id
  loop
    perform private.poser_mention(p_point_id, v_createur, v_ministere);
  end loop;
end $$;

create function public.ajouter_mention_point(p_point_id uuid, p_ministere_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.ajouter_mention_point(p_point_id, p_ministere_id);
$$;

create function public.retirer_mention_point(p_point_id uuid, p_ministere_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.retirer_mention_point(p_point_id, p_ministere_id);
$$;

create function public.modifier_mentions_point(p_point_id uuid, p_mentions uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.modifier_mentions_point(p_point_id, p_mentions);
$$;

-- Droits : rien pour public, anon ni service_role. Les trois fonctions de l'API (et leur partie
-- private) pour authenticated ; les fonctions d'aide, pour personne (elles ne sont appelées que
-- par des fonctions security definer).
revoke all on function
  private.controler_mentions_point(uuid),
  private.poser_mention(uuid, uuid, uuid),
  private.defaire_mention(uuid, uuid, uuid),
  private.ajouter_mention_point(uuid, uuid),
  private.retirer_mention_point(uuid, uuid),
  private.modifier_mentions_point(uuid, uuid[]),
  public.ajouter_mention_point(uuid, uuid),
  public.retirer_mention_point(uuid, uuid),
  public.modifier_mentions_point(uuid, uuid[])
  from public, anon, authenticated, service_role;
grant execute on function
  private.ajouter_mention_point(uuid, uuid),
  private.retirer_mention_point(uuid, uuid),
  private.modifier_mentions_point(uuid, uuid[]),
  public.ajouter_mention_point(uuid, uuid),
  public.retirer_mention_point(uuid, uuid),
  public.modifier_mentions_point(uuid, uuid[])
  to authenticated;

-- 5. Journal : deux codes d'action nouveaux (liste de 20261007090000_contrats_etape_4.sql).

alter table public.journal
  drop constraint journal_action_check,
  add constraint journal_action_check check (action in (
    -- Étapes 1 à 3
    'mesure_saisie', 'fij_saisie', 'participation_saisie', 'evenement_ajoute', 'evenement_modifie',
    'reunion_saisie', 'point_cree', 'point_statut', 'point_traite',
    'session_declaree', 'session_modifiee', 'session_supprimee',
    'ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive', 'compte_reactive',
    'double_auth_reinitialisee', 'texte_relu', 'texte_masque',
    -- Étape 4 : indicateurs (B3) et statistiques FIJ par département (B5)
    'indicateur_cree', 'indicateurs_prevus_crees', 'indicateur_corrige', 'indicateur_valide',
    'indicateur_refuse', 'indicateur_retire', 'fij_statistiques_saisies',
    -- Étape 4 : signalements (B7)
    'difficulte_signalee', 'signalement_clos',
    -- Étape 5 : mentions modifiables (T54)
    'point_mention_ajoutee', 'point_mention_retiree'));
