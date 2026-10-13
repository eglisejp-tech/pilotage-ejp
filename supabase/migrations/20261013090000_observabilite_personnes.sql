-- Observabilité des personnes (décision T56 de la personne responsable, 12 octobre 2026 ; BRIEF
-- sections 6, 7 et 8).
--
-- Un compte de ministère est partagé. Après la connexion (puis tous les 7 jours, et après « Ce
-- n'est pas moi »), la personne indique son prénom, l'initiale du nom permise (« Marie D. »). La
-- déclaration est rattachée au compte et à la session de connexion du jeton signé (revendication
-- session_id, déjà lue depuis T15) : deux personnes connectées au même compte sur deux appareils
-- ont deux sessions, donc deux déclarations. Chaque ligne de journal écrite pendant une session
-- est attribuée à la dernière déclaration de cette session.
--
-- 1. private.session_courante() : la session du jeton, ou celle que les Edge Functions passent
--    (p_session, posée par private.controler_session dans pilotage.session_appelant).
--    private.refuser_modification_sauf_effacement() : inaltérabilité, sauf l'effacement d'un
--    prénom par effacer_prenom ou effacer_prenoms_anciens (réglage local pilotage.effacement,
--    marqueur « [prénom effacé] »), sur le modèle de refuser_modification_sauf_masquage.
-- 2. Trois tables en ajout seulement, lues par EJP Tech seul (et, pour intervenant, par la
--    session elle-même, qui doit savoir qu'elle a déclaré) :
--    - intervenant : les déclarations (compte, session, prénom, motif, heure imposés) ;
--    - journal_intervenant : le lien entre une ligne de journal et une déclaration ;
--    - passage : un jour d'utilisation par déclaration (une personne qui ne fait que lire
--      apparaît aussi). Seule table de T56 qu'un compte remplit par un ajout direct : la base
--      impose la déclaration de la session et le jour de Paris.
-- 3. Trigger attribuer_intervenant (après l'ajout dans journal, par instruction) : remplit
--    journal_intervenant. Le prénom n'entre jamais dans journal, ni dans un email, ni dans un
--    texte libre ; journal et v_journal ne changent pas.
-- 4. private.controler_session devient volatile et pose pilotage.session_appelant.
-- 5. Fonctions de l'API (private en security definer, exige_aal2 d'abord ; public en security
--    invoker) : declarer_intervenant, effacer_prenom, effacer_prenoms_anciens. Aucune ligne de
--    journal (l'administration lit le journal) : EJP Tech note un effacement au registre
--    d'exploitation.
-- 6. Vues (security_invoker) : v_ma_declaration (la dernière déclaration de la session qui lit,
--    avec son âge selon l'horloge du serveur), v_personnes et v_journal_intervenant (EJP Tech
--    seul).
--
-- Aucun SQL dynamique. Aucun email copié.

-- 1. Fonctions d'aide

-- Session de connexion de l'appelant : celle du jeton signé (une par connexion et par appareil),
-- sinon celle qu'une Edge Function a contrôlée dans la transaction (le jeton de service_role n'a
-- pas de session).
create function private.session_courante() returns uuid
language sql stable set search_path = '' as $$
  select coalesce(nullif((select auth.jwt()) ->> 'session_id', '')::uuid,
                  nullif(current_setting('pilotage.session_appelant', true), '')::uuid)
$$;

-- Inaltérables, même pour le propriétaire : seule exception, le prénom remplacé par
-- « [prénom effacé] » sous le réglage local pilotage.effacement, sans autre changement. Le champ
-- effaçable est l'argument du trigger. Même message que private.refuser_modification().
create function private.refuser_modification_sauf_effacement() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_efface constant text := '[prénom effacé]';
  v_champ text := tg_argv[0];
begin
  if tg_op = 'UPDATE'
     and coalesce(current_setting('pilotage.effacement', true), '') = 'oui'
     and (to_jsonb(new) - v_champ) = (to_jsonb(old) - v_champ)
     and to_jsonb(new) ->> v_champ = v_efface
     and to_jsonb(old) ->> v_champ is not null
     and to_jsonb(old) ->> v_champ <> v_efface then
    return new;
  end if;
  raise exception 'La table % est en ajout seul : elle ne se modifie pas et ne s''efface pas.', tg_table_name
    using errcode = '42501';
end $$;

-- 2. Tables

-- Prénom : 1 à 30 caractères, des lettres (alphabet latin, accents compris), avec espace,
-- apostrophe ou trait d'union entre deux mots, et un point après un mot (« Marie D. »). Ni
-- chiffre, ni @, ni crochet, ni chevron : ni email, ni téléphone. Seul le marqueur d'effacement
-- échappe à la règle.
create table public.intervenant (
  id bigint generated always as identity primary key,
  compte uuid not null references public.compte (user_id),
  -- Sans clé étrangère : Supabase supprime la ligne de auth.sessions à la déconnexion.
  session_auth uuid not null,
  prenom text not null,
  motif text not null,
  declare_le timestamptz not null default statement_timestamp(),
  constraint intervenant_prenom_check check (
    prenom = '[prénom effacé]'
    or (char_length(prenom) between 1 and 30
        and prenom ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+\.?([ ''’-][A-Za-zÀ-ÖØ-öø-ɏ]+\.?)*$')),
  constraint intervenant_motif_check check (motif in ('connexion', 'rappel', 'changement'))
);
create index intervenant_session_idx on public.intervenant (compte, session_auth, id desc);
create index intervenant_declare_le_idx on public.intervenant (declare_le desc);

create table public.journal_intervenant (
  journal_id bigint primary key references public.journal (id),
  intervenant_id bigint not null references public.intervenant (id)
);
create index journal_intervenant_intervenant_idx on public.journal_intervenant (intervenant_id);

create table public.passage (
  intervenant_id bigint not null references public.intervenant (id),
  jour date not null default private.aujourdhui(),
  premiere_le timestamptz not null default statement_timestamp(),
  primary key (intervenant_id, jour)
);

alter table public.intervenant enable row level security;
alter table public.journal_intervenant enable row level security;
alter table public.passage enable row level security;

-- Dernière déclaration de la session qui appelle (null sans déclaration). Lue par la politique
-- d'ajout de passage et par son trigger, au nom de l'appelant : security definer, pour ne pas
-- dépendre de la politique de lecture de intervenant.
create function private.ma_declaration_courante() returns bigint
language sql stable security definer set search_path = '' as $$
  select i.id from public.intervenant i
   where i.compte = (select auth.uid()) and i.session_auth = (select private.session_courante())
   order by i.id desc
   limit 1
$$;

-- Compte, session et heure imposés par la base pour un compte de l'application (le rôle du
-- propriétaire, dans les tests, garde ses valeurs).
create function private.forcer_intervenant() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.compte := auth.uid();
    new.session_auth := nullif(auth.jwt() ->> 'session_id', '')::uuid;
    new.declare_le := statement_timestamp();
  end if;
  return new;
end $$;

-- Un jour d'utilisation : la déclaration de la session et le jour de Paris, imposés. Sans
-- déclaration, refus.
create function private.forcer_passage() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.intervenant_id := private.ma_declaration_courante();
    new.jour := private.aujourdhui();
    new.premiere_le := statement_timestamp();
    if new.intervenant_id is null then
      raise exception 'Indiquez d''abord votre prénom.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger forcer_intervenant before insert on public.intervenant
  for each row execute function private.forcer_intervenant();
create trigger ajout_seulement before update or delete on public.intervenant
  for each row execute function private.refuser_modification_sauf_effacement('prenom');
create trigger ajout_seulement_vider before truncate on public.intervenant
  for each statement execute function private.refuser_modification();

create trigger ajout_seulement before update or delete on public.journal_intervenant
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.journal_intervenant
  for each statement execute function private.refuser_modification();

create trigger forcer_passage before insert on public.passage
  for each row execute function private.forcer_passage();
create trigger ajout_seulement before update or delete on public.passage
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.passage
  for each statement execute function private.refuser_modification();

-- Lecture : EJP Tech, et la session elle-même pour ses propres déclarations (pas celles des
-- autres personnes du même compte). Ni private.lit_tout(), ni l'administration de l'église.
create policy lecture on public.intervenant for select to authenticated using (
  (compte = (select auth.uid()) and session_auth = (select private.session_courante()))
  or (select private.mon_type()) = 'admin_plateforme');
create policy lecture on public.journal_intervenant for select to authenticated using (
  (select private.mon_type()) = 'admin_plateforme');
create policy lecture on public.passage for select to authenticated using (
  (select private.mon_type()) = 'admin_plateforme');
-- Ajout d'un jour d'utilisation : seulement pour la déclaration de sa session, aujourd'hui.
create policy ajout on public.passage for insert to authenticated with check (
  intervenant_id = (select private.ma_declaration_courante())
  and jour = (select private.aujourdhui()));

create policy double_authentification on public.intervenant as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.journal_intervenant as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.passage as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.intervenant, public.journal_intervenant, public.passage
  from public, anon, authenticated, service_role;
grant select on public.intervenant, public.journal_intervenant to authenticated;
grant select, insert on public.passage to authenticated;

-- 3. Attribution des lignes de journal : chaque ligne d'un compte, écrite pendant une session qui
-- a déclaré, est liée à la dernière déclaration de cette session. Les lignes « Système » (compte
-- nul) et celles d'une session sans déclaration restent sans lien.
create function private.attribuer_intervenant() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid := private.session_courante();
begin
  if v_session is null then
    return null;
  end if;
  insert into public.journal_intervenant (journal_id, intervenant_id)
  select n.id, d.id
    from nouvelles n
    cross join lateral (
      select i.id from public.intervenant i
       where i.compte = n.compte and i.session_auth = v_session
       order by i.id desc
       limit 1) d
   where n.compte is not null;
  return null;
end $$;

create trigger attribuer_intervenant after insert on public.journal
  referencing new table as nouvelles for each statement execute function private.attribuer_intervenant();

-- 4. Session contrôlée par une Edge Function : elle sert aussi à l'attribution.
create or replace function private.controler_session(p_appelant uuid, p_session uuid) returns void
language plpgsql volatile set search_path = '' as $$
begin
  if p_appelant is null or p_session is null or not exists (
    select 1 from auth.sessions s
     where s.id = p_session and s.user_id = p_appelant and s.aal = 'aal2'
  ) then
    raise exception 'session_revoquee' using errcode = '42501';
  end if;
  perform set_config('pilotage.session_appelant', p_session::text, true);
end $$;

-- 5. Fonctions de l'API

-- Déclare le prénom de la personne qui utilise le compte sur cet appareil. Le motif est fixé par
-- la base pour la première déclaration de la session (« connexion ») ; ensuite « changement »
-- (« Ce n'est pas moi ») ou « rappel » (7 jours). Le prénom est nettoyé (espaces) puis contrôlé.
-- Un jour d'utilisation est noté. Aucune ligne de journal.
create function private.declarer_intervenant(p_prenom text, p_motif text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid;
  v_prenom text;
  v_motif text;
begin
  perform private.exige_aal2();
  v_session := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  if v_session is null then
    raise exception 'Session inconnue : reconnectez-vous.' using errcode = '42501';
  end if;
  if p_motif is null or p_motif not in ('connexion', 'rappel', 'changement') then
    raise exception 'Motif inconnu.';
  end if;
  v_prenom := regexp_replace(btrim(coalesce(p_prenom, '')), '\s+', ' ', 'g');
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

-- Efface un prénom, sur demande de la personne : il devient « [prénom effacé] » sur toutes les
-- déclarations du même compte qui portent ce prénom (sans tenir compte des majuscules). EJP Tech
-- seul. Rend le nombre de déclarations changées.
create function private.effacer_prenom(p_intervenant bigint) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_efface constant text := '[prénom effacé]';
  v_compte uuid;
  v_prenom text;
  v_nombre integer;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Seul EJP Tech efface un prénom.' using errcode = '42501';
  end if;
  select i.compte, i.prenom into v_compte, v_prenom from public.intervenant i where i.id = p_intervenant;
  if v_prenom is null or v_prenom = v_efface then
    raise exception 'Prénom introuvable ou déjà effacé.';
  end if;
  perform set_config('pilotage.effacement', 'oui', true);
  update public.intervenant set prenom = v_efface
   where compte = v_compte and lower(prenom) = lower(v_prenom) and prenom <> v_efface;
  get diagnostics v_nombre = row_count;
  perform set_config('pilotage.effacement', '', true);
  return v_nombre;
end $$;

-- Efface les prénoms déclarés il y a plus de 12 mois (jour de Paris). EJP Tech seul, chaque
-- mois. Rend le nombre de déclarations changées (0 si rien n'est à effacer).
create function private.effacer_prenoms_anciens() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_efface constant text := '[prénom effacé]';
  v_nombre integer;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Seul EJP Tech efface un prénom.' using errcode = '42501';
  end if;
  perform set_config('pilotage.effacement', 'oui', true);
  update public.intervenant set prenom = v_efface
   where prenom <> v_efface
     and (declare_le at time zone 'Europe/Paris')::date < (private.aujourdhui() - interval '12 months')::date;
  get diagnostics v_nombre = row_count;
  perform set_config('pilotage.effacement', '', true);
  return v_nombre;
end $$;

create function public.declarer_intervenant(p_prenom text, p_motif text) returns void
language sql security invoker set search_path = '' as $$
  select private.declarer_intervenant(p_prenom, p_motif);
$$;

create function public.effacer_prenom(p_intervenant bigint) returns integer
language sql security invoker set search_path = '' as $$
  select private.effacer_prenom(p_intervenant);
$$;

create function public.effacer_prenoms_anciens() returns integer
language sql security invoker set search_path = '' as $$
  select private.effacer_prenoms_anciens();
$$;

-- 6. Vues

-- La dernière déclaration de la session qui lit, et son âge en secondes (horloge du serveur) :
-- l'écran « Qui utilise l'outil ? » revient au bout de 7 jours. La politique de intervenant ne
-- rend à un compte que les lignes de sa session ; le filtre le redit pour EJP Tech.
create view public.v_ma_declaration with (security_invoker = true) as
select i.id, i.prenom, i.motif, i.declare_le,
       floor(extract(epoch from (now() - i.declare_le)))::integer as age_secondes
  from public.intervenant i
 where i.compte = (select auth.uid()) and i.session_auth = (select private.session_courante())
 order by i.id desc
 limit 1;

-- Personnes, pour EJP Tech : une ligne par compte et par prénom (sans tenir compte des
-- majuscules), avec les connexions, les jours d'utilisation et les actions des 30 derniers jours
-- (jours de Paris), la dernière activité et le nombre de déclarations de plus de 12 mois dont le
-- prénom n'est pas encore effacé. intervenant_id est la dernière déclaration du groupe : c'est
-- elle que « Effacer ce prénom » envoie.
create view public.v_personnes with (security_invoker = true) as
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
  join public.compte c on c.user_id = g.compte;

-- Prénom de chaque ligne de journal écrite par un compte de ministère depuis la première
-- déclaration, pour le Journal technique d'EJP Tech : le prénom déclaré, ou null pour une
-- personne non déclarée. EJP Tech seul.
create view public.v_journal_intervenant with (security_invoker = true) as
select j.id as journal_id, i.prenom
  from public.journal j
  join public.compte c on c.user_id = j.compte and c.type = 'ministere'
  left join public.journal_intervenant ji on ji.journal_id = j.id
  left join public.intervenant i on i.id = ji.intervenant_id
 where (select private.mon_type()) = 'admin_plateforme'
   and j.le >= (select min(x.declare_le) from public.intervenant x);

revoke all on public.v_ma_declaration, public.v_personnes, public.v_journal_intervenant
  from public, anon, authenticated, service_role;
grant select on public.v_ma_declaration, public.v_personnes, public.v_journal_intervenant to authenticated;

-- 7. Droits des fonctions : rien pour public, anon ni service_role. authenticated exécute les
-- fonctions de l'API et celles que lisent les politiques, les vues et le trigger de passage.
revoke all on function
  private.session_courante(),
  private.refuser_modification_sauf_effacement(),
  private.ma_declaration_courante(),
  private.forcer_intervenant(),
  private.forcer_passage(),
  private.attribuer_intervenant(),
  private.declarer_intervenant(text, text),
  private.effacer_prenom(bigint),
  private.effacer_prenoms_anciens(),
  public.declarer_intervenant(text, text),
  public.effacer_prenom(bigint),
  public.effacer_prenoms_anciens()
  from public, anon, authenticated, service_role;
grant execute on function
  private.session_courante(),
  private.ma_declaration_courante(),
  private.declarer_intervenant(text, text),
  private.effacer_prenom(bigint),
  private.effacer_prenoms_anciens(),
  public.declarer_intervenant(text, text),
  public.effacer_prenom(bigint),
  public.effacer_prenoms_anciens()
  to authenticated;
