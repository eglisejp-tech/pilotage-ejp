-- Acceptation des conditions par personne sur un compte partagé (décision T61, réponse écrite de
-- la personne responsable du 13 octobre 2026 : « j'accepte les conditions par personne ») et
-- rappel du prénom chaque jour (décision T63, même date, option « Connexion + chaque jour ») ;
-- BRIEF sections 6, 7 et 8.
--
-- Un compte de ministère est partagé ; depuis T56, chaque personne y indique son prénom (table
-- intervenant, une déclaration par session de connexion). Chaque personne déclarée accepte
-- elle-même la version courante des conditions d'utilisation et prend connaissance de la
-- politique de confidentialité ; à chaque nouvelle version, chacune accepte de nouveau, à sa
-- prochaine connexion. Les comptes non partagés (berger, conseil, administration de l'église,
-- EJP Tech) gardent l'acceptation par compte (T53, acceptation_conditions), sans changement.
--
-- Une personne est, comme dans v_personnes (T56), un prénom sur un compte, sans tenir compte des
-- majuscules : Marie, qui a accepté lundi, n'accepte pas de nouveau mardi sur un autre appareil
-- si elle indique encore « Marie ». « Marie D. » est une autre personne.
--
-- 1. Table acceptation_personne, en ajout seulement, sans exception : l'effacement d'un prénom
--    change intervenant, pas cette table ; l'acceptation reste, attachée à « [prénom effacé] ».
--    Une ligne par déclaration et par version (unique), en pratique une par personne et par
--    version. Lecture : la session d'un compte de ministère actif, pour les déclarations de la
--    personne qu'elle a déclarée (des numéros et des dates, sans prénom), et EJP Tech ; ni
--    l'administration de l'église, ni le berger, ni le conseil, ni un autre ministère. GRANT
--    select seulement.
-- 2. private.declarations_de_ma_personne() : les déclarations du même prénom (majuscules
--    ignorées) sur le compte de la session, la déclaration courante comprise ; vide sans
--    déclaration ou quand elle est effacée. Security definer : la session ne lit dans
--    intervenant que sa déclaration courante (T56).
-- 3. accepter_conditions(p_version) : pour un compte de ministère, l'acceptation de la personne
--    déclarée sur la session (refus sans déclaration valable) ; pour les autres comptes, comme
--    T53. Idempotente ; aucune ligne de journal (l'administration lit le journal).
-- 4. v_personnes : deux colonnes ajoutées à la fin, la dernière version acceptée par la personne
--    et l'heure de cette acceptation (EJP Tech seul, onglet « Personnes »).
-- 5. v_ma_declaration (T63) : une colonne ajoutée à la fin, du_jour, vraie quand la déclaration
--    de la session est du jour de Paris (private.aujourdhui(), jamais la date du navigateur).
--    L'écran « Qui utilise l'outil ? » revient à la première ouverture de chaque nouvelle journée,
--    au lieu du rappel des 7 jours ; age_secondes reste (une vue ne perd pas de colonne) mais ne
--    sert plus. Le motif « rappel » de declarer_intervenant devient le rappel du jour, sans
--    changement de la fonction.
--
-- Les lignes de acceptation_conditions déjà écrites pour un compte de ministère restent (ajout
-- seulement) mais ne sont plus lues pour lui : chaque personne accepte une fois sous son prénom.
-- Aucun prénom dans la nouvelle table ; aucun texte libre ; aucun SQL dynamique. Les migrations
-- précédentes sont figées.

-- 1. Table

create table public.acceptation_personne (
  id bigint generated always as identity primary key,
  intervenant_id bigint not null references public.intervenant (id),
  version text not null,
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint acceptation_personne_version_check check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint acceptation_personne_intervenant_version_key unique (intervenant_id, version)
);
create index acceptation_personne_version_idx on public.acceptation_personne (version);

alter table public.acceptation_personne enable row level security;

create trigger forcer_auteur before insert on public.acceptation_personne
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.acceptation_personne
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.acceptation_personne
  for each statement execute function private.refuser_modification();

-- 2. Les déclarations de la personne déclarée sur la session qui appelle : même compte, même
-- prénom sans tenir compte des majuscules (le regroupement de v_personnes). Un tableau vide sans
-- déclaration, ou quand la déclaration courante porte « [prénom effacé] » (une déclaration
-- effacée ne désigne plus personne).
create function private.declarations_de_ma_personne() returns bigint[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(i.id order by i.id), '{}'::bigint[])
    from public.intervenant m
    join public.intervenant i on i.compte = m.compte and lower(i.prenom) = lower(m.prenom)
   where m.id = (select private.ma_declaration_courante())
     and m.prenom <> '[prénom effacé]'
$$;

-- Lecture : la session d'un compte de ministère actif, pour sa personne ; EJP Tech, tout. Aucune
-- politique d'ajout : la fonction écrit.
create policy lecture on public.acceptation_personne for select to authenticated using (
  ((select private.mon_type()) = 'ministere'
   and intervenant_id = any ((select private.declarations_de_ma_personne())))
  or (select private.mon_type()) = 'admin_plateforme');

create policy double_authentification on public.acceptation_personne as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.acceptation_personne from public, anon, authenticated, service_role;
grant select on public.acceptation_personne to authenticated;
revoke all on sequence public.acceptation_personne_id_seq from public, anon, authenticated, service_role;

-- 3. Accepter les conditions : par personne pour un compte de ministère (T61), par compte sinon
-- (T53). La signature ne change pas : l'écran appelle la même fonction pour tous les profils.
create or replace function private.accepter_conditions(p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_declaration bigint;
begin
  perform private.exige_aal2();
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Version des conditions inconnue.';
  end if;
  if private.mon_type() = 'ministere' then
    -- Compte partagé : la personne déclarée sur cette session accepte elle-même.
    v_declaration := private.ma_declaration_courante();
    if v_declaration is null or not exists (
      select 1 from public.intervenant i where i.id = v_declaration and i.prenom <> '[prénom effacé]'
    ) then
      raise exception 'Indiquez d''abord votre prénom.' using errcode = '42501';
    end if;
    -- Idempotente : une version déjà acceptée par la personne, sur cet appareil ou sur un autre,
    -- n'ajoute rien.
    if exists (select 1 from public.acceptation_personne a
                where a.version = p_version
                  and a.intervenant_id = any (private.declarations_de_ma_personne())) then
      return;
    end if;
    insert into public.acceptation_personne (intervenant_id, version)
    values (v_declaration, p_version)
    on conflict (intervenant_id, version) do nothing;
    return;
  end if;
  -- Compte non partagé : inchangé (T53), une ligne par compte et par version.
  insert into public.acceptation_conditions (compte, version)
  values ((select auth.uid()), p_version)
  on conflict (compte, version) do nothing;
end $$;

-- 4. Personnes, pour EJP Tech : les colonnes de 20261013100000_observabilite_corrections.sql,
-- puis la dernière version acceptée par la personne (toutes ses déclarations, prénom effacé
-- compris) et l'heure de cette acceptation ; null si elle n'a encore rien accepté.
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
       g.declarations_anciennes,
       acceptation.version as version_acceptee,
       acceptation.saisi_le as acceptee_le
  from groupes g
  join public.compte c on c.user_id = g.compte and c.type = 'ministere'
  left join lateral (
    select a.version, a.saisi_le from public.acceptation_personne a
     where a.intervenant_id = any (g.ids)
     order by a.version desc, a.saisi_le
     limit 1) acceptation on true;

-- 5. La déclaration de la session (T63) : les colonnes de
-- 20261013100000_observabilite_corrections.sql, puis du_jour, vraie quand elle a été faite
-- aujourd'hui, jour de Paris. Sinon, l'écran « Qui utilise l'outil ? » revient, le prénom déjà
-- proposé : un seul appui le confirme.
create or replace view public.v_ma_declaration with (security_invoker = true) as
select i.id, i.prenom, i.motif, i.declare_le,
       floor(extract(epoch from (now() - i.declare_le)))::integer as age_secondes,
       (i.declare_le at time zone 'Europe/Paris')::date = private.aujourdhui() as du_jour
  from public.intervenant i
 where i.id = (select private.ma_declaration_courante());

-- 6. Droits des fonctions : rien pour public, anon ni service_role. authenticated exécute la
-- fonction que lit la politique de lecture (accepter_conditions garde ses droits de T53). Les
-- deux vues gardent leurs droits : create or replace view ne les change pas.
revoke all on function private.declarations_de_ma_personne()
  from public, anon, authenticated, service_role;
grant execute on function private.declarations_de_ma_personne() to authenticated;
