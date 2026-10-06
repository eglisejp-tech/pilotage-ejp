-- Étape 4, lot B3 (1 sur 2) : catalogue, demandes et décisions (docs/plan-etape-4.md, section 4,
-- « B3 » ; docs/conception/contrat-etape-4.md, sections 1, 5, 6 et 7 ;
-- configuration-indicateurs.md 5.5 ; validation-metier.md 2 et 6 ; décisions T30, T35, P41, Q13).
--
-- 1. Catalogue privé : private.indicateur_prevu (prévus de la coordination par modèle, et
--    suggestions communes, modèle « suggestion ») et private.indicateur_prevu_terme (termes des
--    calculs prévus, par codes du même modèle). Écrits par migration seulement (B4), illisibles
--    par l'API.
-- 2. Tables demande_indicateur (une demande d'un ministère, avec son « Pourquoi ») et validation
--    (la décision d'EJP Tech) : ajout seulement, inaltérables même pour le propriétaire, sauf le
--    masquage du « Pourquoi » ou du motif par masquer_texte (réglage local pilotage.masquage).
-- 3. private.peut_configurer() : administration de l'église et EJP Tech (Q13 : EJP Tech agit sur
--    demande écrite, la base laisse les deux profils agir).
-- 4. Vues v_catalogue (administration, EJP Tech), v_suggestions (ministère pour sa fiche,
--    administration, EJP Tech), v_a_valider (EJP Tech seul).
-- 5. masquer_texte étendu aux couples (demande_indicateur, pourquoi) et (validation, motif).
-- 6. v_journal : cible_texte des cibles indicateur, demande_indicateur et validation (libellé
--    actuel de l'indicateur, sous la RLS du lecteur ; jamais le « Pourquoi » ni le motif).
--
-- Les fonctions de configuration et de validation sont dans 20261008110500_indicateurs_fonctions.sql.
-- Aucune donnée personnelle ; dates métier à l'heure de Paris (private.aujourdhui()).

-- 1. Catalogue

-- Une ligne par indicateur prévu d'un modèle (nom normalisé du ministère de la liste de la
-- coordination), ou par suggestion commune (modèle « suggestion »). « aucun » est réservé à
-- creer_indicateurs_prevus (un ministère sans prévu). Une suggestion est un compte simple, que
-- le ministère ajoute lui-même : jamais sensible, jamais un calcul.
create table private.indicateur_prevu (
  code text primary key check (code ~ '^[a-z0-9_]{1,60}$'),
  modele text not null check (char_length(modele) between 1 and 60 and modele <> 'aucun'),
  libelle text not null check (char_length(libelle) between 2 and 60),
  definition text not null check (char_length(definition) between 10 and 140),
  nature text not null check (nature in ('dimanche', 'mois', 'a_ce_jour')),
  unite text not null default 'nombre' check (unite in ('nombre', 'grand_nombre', 'euros', 'heure', 'jours')),
  sensible boolean not null default false,
  calcul text check (calcul in ('taux', 'moyenne', 'difference', 'somme', 'evolution')),
  sans_somme boolean not null default false,
  saisi_dimanche_matin boolean not null default false,
  libelle_sessions boolean not null default false,
  ordre smallint not null default 0,
  check (not sensible or (nature = 'mois' and unite = 'nombre' and calcul is null and not saisi_dimanche_matin)),
  check (modele <> 'suggestion' or (unite = 'nombre' and not sensible and calcul is null))
);
create index on private.indicateur_prevu (modele, ordre);

-- Termes d'un calcul prévu, comme indicateur_terme (B1) : la source est le code d'un prévu du
-- même modèle, ou un comptage d'événements. creer_indicateurs_prevus les traduit en
-- identifiants ; le trigger controler_terme de B1 contrôle ensuite chaque terme.
create table private.indicateur_prevu_terme (
  prevu_code text not null references private.indicateur_prevu (code),
  ordre smallint not null check (ordre between 1 and 4),
  role text not null check (role in ('haut', 'bas', 'plus', 'moins', 'terme')),
  source_code text references private.indicateur_prevu (code),
  comptage text check (comptage in ('prevus', 'realises', 'annules', 'reportes', 'en_attente', 'sans_etat_final')),
  agregat text not null default 'periode' check (agregat in ('periode', 'somme_dimanches_du_mois', 'fin_de_mois')),
  decalage smallint not null default 0 check (decalage between 0 and 3),
  primary key (prevu_code, ordre),
  check ((source_code is null) <> (comptage is null))
);
create index on private.indicateur_prevu_terme (source_code);

-- Un terme vise un calcul prévu, et sa source un prévu du même modèle.
create function private.controler_prevu_terme() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from private.indicateur_prevu p where p.code = new.prevu_code and p.calcul is not null) then
    raise exception 'Un terme prévu appartient à un calcul prévu.';
  end if;
  if new.source_code is not null and not exists (
       select 1 from private.indicateur_prevu s join private.indicateur_prevu c on c.modele = s.modele
        where s.code = new.source_code and c.code = new.prevu_code and s.calcul is null and not s.sensible) then
    raise exception 'La source d''un calcul prévu est un indicateur saisi, non sensible, du même modèle.';
  end if;
  return new;
end $$;

create trigger controler_prevu_terme before insert or update on private.indicateur_prevu_terme
  for each row execute function private.controler_prevu_terme();

alter table private.indicateur_prevu enable row level security;
alter table private.indicateur_prevu_terme enable row level security;
revoke all on private.indicateur_prevu from public, anon, authenticated, service_role;
revoke all on private.indicateur_prevu_terme from public, anon, authenticated, service_role;

-- 2. Demandes et décisions (validation-metier.md, 6.2)

-- Une demande d'un ministère : l'ajout d'une suggestion (lot 1), plus tard l'ajout d'un compte
-- écrit ou la correction d'un nom (lot 2). Le « Pourquoi » (ajout seulement) n'est lu que par le
-- ministère et par EJP Tech, et n'est recopié nulle part.
create table public.demande_indicateur (
  id uuid primary key default gen_random_uuid(),
  indicateur_id uuid not null references public.indicateur,
  ministere_id uuid not null references public.ministere,
  objet text not null check (objet in ('ajout', 'correction')),
  libelle text not null check (char_length(libelle) between 2 and 60),   -- nom envoyé, ou nom proposé
  definition text check (char_length(definition) between 10 and 140),     -- correction de la définition (lot 2)
  pourquoi text,                                                           -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint demande_indicateur_pourquoi_objet_check check ((objet = 'ajout') = (pourquoi is not null)),
  constraint demande_indicateur_pourquoi_check check (pourquoi is null or char_length(pourquoi) between 10 and 280),
  constraint demande_indicateur_definition_objet_check check (objet = 'correction' or definition is null)
);
create unique index demande_ajout_unique on public.demande_indicateur (indicateur_id) where objet = 'ajout';
create index on public.demande_indicateur (ministere_id, saisi_le desc);
create index on public.demande_indicateur (indicateur_id, saisi_le desc);

-- La décision d'EJP Tech : une seule par demande (index unique), définitive. Un refus porte un
-- motif de 10 à 280 caractères, une validation n'en porte pas.
create table public.validation (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null unique references public.demande_indicateur,
  ministere_id uuid not null references public.ministere,
  decision text not null check (decision in ('valide', 'refuse')),
  motif text,                                                              -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint validation_motif_check check ((decision = 'valide' and motif is null)
                                           or (decision = 'refuse' and char_length(motif) between 10 and 280))
);
create index on public.validation (ministere_id, saisi_le desc);

alter table public.demande_indicateur enable row level security;
alter table public.validation enable row level security;

-- Inaltérables, même pour le propriétaire : seule exception, le masquage d'un texte par
-- masquer_texte, qui pose pilotage.masquage dans sa transaction et ne change que ce champ, vers
-- « [texte masqué par EJP Tech] ». Le champ masquable est l'argument du trigger. Même message
-- que private.refuser_modification().
create function private.refuser_modification_sauf_masquage() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_masque constant text := '[texte masqué par EJP Tech]';
  v_champ text := tg_argv[0];
begin
  if tg_op = 'UPDATE'
     and coalesce(current_setting('pilotage.masquage', true), '') = 'oui'
     and (to_jsonb(new) - v_champ) = (to_jsonb(old) - v_champ)
     and to_jsonb(new) ->> v_champ = v_masque
     and to_jsonb(old) ->> v_champ is not null
     and to_jsonb(old) ->> v_champ <> v_masque then
    return new;
  end if;
  raise exception 'La table % est en ajout seul : elle ne se modifie pas et ne s''efface pas.', tg_table_name
    using errcode = '42501';
end $$;

create trigger forcer_auteur before insert on public.demande_indicateur
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.demande_indicateur
  for each row execute function private.refuser_modification_sauf_masquage('pourquoi');
create trigger ajout_seulement_vider before truncate on public.demande_indicateur
  for each statement execute function private.refuser_modification();

create trigger forcer_auteur before insert on public.validation
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.validation
  for each row execute function private.refuser_modification_sauf_masquage('motif');
create trigger ajout_seulement_vider before truncate on public.validation
  for each statement execute function private.refuser_modification();

-- Lecture (validation-metier.md, 6.5) : une demande par le ministère qui l'a écrite et par EJP
-- Tech ; une décision par son ministère, le berger, le conseil, l'administration et EJP Tech.
-- Aucune politique ne relit l'autre table : pas de récursion. Aucune politique d'ajout : les
-- fonctions écrivent.
create policy lecture on public.demande_indicateur for select to authenticated using (
  ministere_id = (select private.mon_ministere())
  or (select private.mon_type()) = 'admin_plateforme');

create policy lecture on public.validation for select to authenticated using (
  (select private.lit_tout())
  or (select private.mon_type()) = 'admin_eglise'
  or ministere_id = (select private.mon_ministere()));

create policy double_authentification on public.demande_indicateur as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.validation as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.demande_indicateur from public, anon, authenticated, service_role;
revoke all on public.validation from public, anon, authenticated, service_role;
grant select on public.demande_indicateur, public.validation to authenticated;

-- 3. Qui configure (Q13) : l'administration de l'église et EJP Tech. Jamais null.
create function private.peut_configurer() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false)
$$;

-- 4. Lectures

-- Catalogue entier (prévus et suggestions), pour l'écran Indicateurs : administration et EJP
-- Tech seulement, en aal2. La table est dans private : la fonction la sert.
create function private.catalogue()
returns table (code text, modele text, libelle text, definition text, nature text, unite text,
               sensible boolean, calcul text, ordre smallint)
language sql stable security definer set search_path = '' as $$
  select p.code, p.modele, p.libelle, p.definition, p.nature, p.unite, p.sensible, p.calcul, p.ordre
  from private.indicateur_prevu p
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and private.peut_configurer()
$$;

create view public.v_catalogue with (security_invoker = true) as
select c.code, c.modele, c.libelle, c.definition, c.nature, c.unite, c.sensible, c.calcul, c.ordre
from private.catalogue() as c;

-- Suggestions qu'une fiche peut encore ajouter : une ligne par ministère actif et par
-- suggestion dont le libellé normalisé n'est pas déjà sur la fiche (hors retirés), ni celui
-- d'un chiffre commun. Filtre du lecteur réappliqué (security definer) : sa fiche pour un
-- ministère, toutes pour l'administration et EJP Tech, rien pour les autres, rien hors aal2.
create function private.suggestions()
returns table (ministere_id uuid, code text, libelle text, definition text, nature text, unite text)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.peut_configurer() as configure, private.mon_ministere() as ministere
    where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select m.id, p.code, p.libelle, p.definition, p.nature, p.unite
  from moi
  cross join public.ministere m
  cross join private.indicateur_prevu p
  where p.modele = 'suggestion'
    and m.desactive_le is null
    and (moi.configure or m.id = moi.ministere)
    and not exists (select 1 from public.indicateur i
                     where (i.ministere_id = m.id or i.ministere_id is null)
                       and i.etat <> 'retire'
                       and private.normaliser(i.libelle) = private.normaliser(p.libelle))
$$;

create view public.v_suggestions with (security_invoker = true) as
select s.ministere_id, s.code, s.libelle, s.definition, s.nature, s.unite
from private.suggestions() as s;

-- File d'EJP Tech : une ligne par demande à valider, non sortie. Un ajout sort quand son
-- indicateur n'attend plus (retiré entre-temps) ; une correction (lot 2) quand une correction
-- plus récente du même indicateur existe, ou que l'indicateur est retiré. Lue sous la RLS du
-- lecteur (demande_indicateur, indicateur, mesure), et seulement par EJP Tech, comme v_semaine.
-- attente_jours : jours depuis l'envoi, à l'heure de Paris ; en_retard au-delà de 7 jours.
create view public.v_a_valider with (security_invoker = true) as
select d.id as demande_id,
       d.objet,
       d.indicateur_id,
       d.ministere_id,
       m.nom as ministere_nom,
       i.libelle as libelle_actuel,
       d.libelle as libelle_envoye,
       i.definition,
       i.nature,
       d.pourquoi,
       d.saisi_le,
       (private.aujourdhui() - (d.saisi_le at time zone 'Europe/Paris')::date)::integer as attente_jours,
       (private.aujourdhui() - (d.saisi_le at time zone 'Europe/Paris')::date) > 7 as en_retard,
       (select count(distinct x.date_ref)::integer from public.mesure x where x.indicateur_id = d.indicateur_id) as nb_valeurs
from public.demande_indicateur d
join public.indicateur i on i.id = d.indicateur_id
join public.ministere m on m.id = d.ministere_id
where (select private.mon_type()) = 'admin_plateforme'
  and not exists (select 1 from public.validation v where v.demande_id = d.id)
  and ((d.objet = 'ajout' and i.etat = 'en_attente')
       or (d.objet = 'correction' and i.etat <> 'retire'
           and not exists (select 1 from public.demande_indicateur r
                            where r.indicateur_id = d.indicateur_id and r.objet = 'correction'
                              and (r.saisi_le, r.id::text) > (d.saisi_le, d.id::text))));

revoke all on public.v_catalogue, public.v_suggestions, public.v_a_valider
  from public, anon, authenticated, service_role;
grant select on public.v_catalogue, public.v_suggestions, public.v_a_valider to authenticated;

-- 5. Modération : masquer_texte gagne les deux couples des indicateurs. Même signature : create
-- or replace garde le propriétaire et les droits. Les sept couples des étapes 1 à 3 sont repris
-- tels quels. Pour les deux tables nouvelles, le réglage local pilotage.masquage ouvre la seule
-- mise à jour que leur trigger accepte, puis il est retiré aussitôt.
create or replace function private.masquer_texte(p_cible text, p_cible_id uuid, p_champ text, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_masque constant text := '[texte masqué par EJP Tech]';
  v_auteur uuid;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Seul EJP Tech peut masquer un texte.' using errcode = '42501';
  end if;
  if p_motif is null or p_motif not in ('nom_personne', 'coordonnees', 'situation_personnelle', 'autre') then
    raise exception 'Choisissez un motif dans la liste.';
  end if;
  if p_cible = 'point_attention' and p_champ = 'titre' then
    update public.point_attention set titre = v_masque
     where id = p_cible_id and titre <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'point_attention' and p_champ = 'description' then
    update public.point_attention set description = v_masque
     where id = p_cible_id and nullif(btrim(description), '') is not null and description <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'point_attention' and p_champ = 'action_attendue' then
    update public.point_attention set action_attendue = v_masque
     where id = p_cible_id and nullif(btrim(action_attendue), '') is not null and action_attendue <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'point_suivi' and p_champ = 'commentaire' then
    update public.point_suivi set commentaire = v_masque
     where id = p_cible_id and nullif(btrim(commentaire), '') is not null and commentaire <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'evenement' and p_champ = 'titre' then
    update public.evenement set titre = v_masque
     where id = p_cible_id and titre <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'reunion' and p_champ = 'objet' then
    update public.reunion set objet = v_masque
     where id = p_cible_id and nullif(btrim(objet), '') is not null and objet <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'reunion' and p_champ = 'decision_attendue' then
    update public.reunion set decision_attendue = v_masque
     where id = p_cible_id and nullif(btrim(decision_attendue), '') is not null and decision_attendue <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'demande_indicateur' and p_champ = 'pourquoi' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.demande_indicateur set pourquoi = v_masque
     where id = p_cible_id and pourquoi is not null and pourquoi <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'validation' and p_champ = 'motif' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.validation set motif = v_masque
     where id = p_cible_id and motif is not null and motif <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère qui a écrit le texte : celui du compte auteur (null pour le berger, le conseil
  -- et EJP Tech, auteur du motif d'un refus).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), (select c.ministere_id from public.compte c where c.user_id = v_auteur),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- 6. Journal : le texte d'une cible d'indicateur est le libellé actuel de l'indicateur, lu sous
-- la RLS du lecteur (rien pour un lecteur qui ne lit pas l'indicateur, ou la demande pour les
-- cibles de modération). Jamais le « Pourquoi » ni le motif. Mêmes colonnes et même filtre de
-- l'administration que la version de 20260930194240_correctifs_audit.sql.
create or replace view public.v_journal with (security_invoker = true) as
select j.id, j.le, j.compte, j.ministere_id, j.action, j.cible, j.cible_id, j.detail,
       case when j.compte is null then 'Système' else a.libelle end as compte_libelle,
       a.ministere_id as auteur_ministere_id,
       m.nom as ministere_nom,
       case j.cible
         when 'point_attention' then (select p.titre from public.point_attention p where p.id = j.cible_id)
         when 'point_suivi' then (select p.titre from public.point_suivi s
                                    join public.point_attention p on p.id = s.point_id
                                   where s.id = j.cible_id)
         when 'evenement' then (select e.titre from public.evenement e where e.id = j.cible_id)
         when 'reunion' then (select r.objet from public.reunion r where r.id = j.cible_id)
         when 'session' then (select x.intitule from public.session x where x.id = j.cible_id)
         when 'compte' then (select c.libelle from public.compte c where c.user_id = j.cible_id)
         when 'ministere' then (select x.nom from public.ministere x where x.id = j.cible_id)
         when 'indicateur' then (select i.libelle from public.indicateur i where i.id = j.cible_id)
         when 'demande_indicateur' then (select i.libelle from public.demande_indicateur d
                                           join public.indicateur i on i.id = d.indicateur_id
                                          where d.id = j.cible_id)
         when 'validation' then (select i.libelle from public.validation v
                                   join public.demande_indicateur d on d.id = v.demande_id
                                   join public.indicateur i on i.id = d.indicateur_id
                                  where v.id = j.cible_id)
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
where (select private.mon_type()) is distinct from 'admin_eglise'
   or private.journal_lisible_administration(j.action, j.detail);

-- Droits des fonctions : rien pour public, anon ni service_role ; authenticated exécute les
-- fonctions lues par les vues et les politiques.
revoke all on function
  private.controler_prevu_terme(),
  private.refuser_modification_sauf_masquage(),
  private.peut_configurer(),
  private.catalogue(),
  private.suggestions()
  from public, anon, authenticated, service_role;
grant execute on function
  private.peut_configurer(),
  private.catalogue(),
  private.suggestions()
  to authenticated;
