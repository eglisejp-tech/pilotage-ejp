-- Étape 1, migration 2 sur 7 : types et tables (BRIEF, section 6).
--
-- Règle 1 : on ajoute, on ne modifie jamais. Les tables de saisie n'ont aucun droit update ni
-- delete pour les clients (migration 4). Jamais now() ni current_date dans un check : les
-- contrôles qui dépendent du jour vivent dans les triggers et les politiques d'ajout.
-- La RLS est activée ici, dès la création de chaque table : sans politique, tout est refusé.

create type public.type_compte as enum ('ministere', 'berger', 'conseil', 'admin_eglise', 'admin_plateforme');
create type public.statut_point as enum ('a_traiter', 'en_cours', 'attente_decision', 'traite');
create type public.priorite as enum ('normale', 'haute', 'urgente');      -- cet ordre sert aux tris
create type public.statut_evenement as enum ('brouillon', 'attente_validation', 'valide', 'preparation', 'termine', 'annule');
create type public.type_session as enum ('batir', 'anti_dispersion', 'autre');

-- Référence

create table public.ministere (
  id uuid primary key default gen_random_uuid(),
  code text unique,                             -- code technique posé par migration ('fij'), sinon null
  nom text not null unique check (char_length(btrim(nom)) between 1 and 60),
  description text check (char_length(description) <= 280),
  cree_le timestamptz not null default now(),
  desactive_le timestamptz,                     -- null = actif
  check (desactive_le is null or desactive_le >= cree_le)
);

create table public.compte (
  user_id uuid primary key references auth.users (id) on delete restrict,   -- on ne supprime jamais un compte
  type public.type_compte not null,
  ministere_id uuid references public.ministere,
  libelle text not null check (char_length(libelle) <= 60),                 -- fixé par creer-compte, jamais tapé
  cree_le timestamptz not null default now(),
  desactive_le timestamptz,                                                 -- null = actif
  check ((type = 'ministere') = (ministere_id is not null))
);
create unique index compte_un_par_ministere on public.compte (ministere_id) where desactive_le is null;
create unique index compte_un_berger on public.compte (type) where type = 'berger' and desactive_le is null;

create table public.indicateur (
  id uuid primary key default gen_random_uuid(),
  code text unique,                             -- 'service', 'actifs', 'en_fij' ; null pour un indicateur propre
  libelle text not null check (char_length(libelle) <= 60),
  nature text not null check (nature in ('dimanche', 'a_ce_jour')),
  ministere_id uuid references public.ministere,  -- null = indicateur commun
  ordre smallint not null default 0,
  actif boolean not null default true,          -- false : plus proposé à la saisie, historique gardé
  unique (ministere_id, libelle),
  check ((code is null) = (ministere_id is not null))
);
create index on public.indicateur (ministere_id);

-- Saisies (ajout seulement)

create table public.mesure (
  id bigint generated always as identity primary key,
  indicateur_id uuid not null references public.indicateur,
  ministere_id uuid not null references public.ministere,
  date_ref date not null,                       -- dimanche concerné, ou date du jour posée par la base (à ce jour)
  valeur integer not null check (valeur between 0 and 9999),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.mesure (ministere_id, indicateur_id, date_ref desc, saisi_le desc, id desc);
create index on public.mesure (indicateur_id, date_ref);

create table public.fij_departement (           -- un envoi = les 8 départements
  id bigint generated always as identity primary key,
  ministere_id uuid not null references public.ministere,
  departement text not null check (departement in ('75', '77', '78', '91', '92', '93', '94', '95')),
  valeur integer not null check (valeur between 0 and 9999),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.fij_departement (departement, saisi_le desc, id desc);

create table public.session (
  id uuid primary key default gen_random_uuid(),
  type public.type_session not null,
  date date not null,
  intitule text check (char_length(btrim(intitule)) between 1 and 80),   -- nom du rassemblement, seulement pour 'autre'
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  check ((type = 'autre') = (intitule is not null))
);
create unique index session_type_date on public.session (type, date) where type <> 'autre';
create unique index session_autre_date_nom on public.session (date, intitule) where type = 'autre';

create table public.session_attendu (
  session_id uuid not null references public.session on delete cascade,
  ministere_id uuid not null references public.ministere,
  primary key (session_id, ministere_id)
);
create index on public.session_attendu (ministere_id);

create table public.participation (             -- la saisie la plus récente de chaque ministère fait foi
  id bigint generated always as identity primary key,
  session_id uuid not null references public.session,        -- sans cascade : une session saisie ne se supprime pas
  ministere_id uuid not null references public.ministere,
  valeur integer not null check (valeur between 0 and 9999), -- tous ses STARs présents
  deja_comptes integer not null default 0,                   -- dont déjà comptés par leur ministère principal (D2)
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  check (deja_comptes between 0 and valeur)
);
create index on public.participation (session_id, ministere_id, saisi_le desc, id desc);

create table public.evenement (                 -- identité ; seul masquer_texte réécrit titre
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,
  titre text not null check (char_length(btrim(titre)) between 1 and 80),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.evenement (ministere_id);

create table public.evenement_etat (            -- la ligne la plus récente fait foi
  id bigint generated always as identity primary key,
  evenement_id uuid not null references public.evenement,
  date date not null,
  statut public.statut_evenement not null,
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.evenement_etat (evenement_id, saisi_le desc, id desc);

create table public.reunion (                   -- la déclaration la plus récente fait foi
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,
  date date not null,
  heure time,
  objet text check (char_length(objet) <= 80),
  decision_attendue text check (char_length(decision_attendue) <= 80),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.reunion (ministere_id, saisi_le desc);

create table public.point_attention (           -- fixé à la création ; seul masquer_texte réécrit un texte
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,   -- ministère créateur
  titre text not null check (char_length(btrim(titre)) between 1 and 80),
  description text check (char_length(description) <= 280),
  action_attendue text check (char_length(action_attendue) <= 80),
  priorite public.priorite not null default 'normale',
  echeance date,
  saisi_le timestamptz not null default now(),              -- date de création
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.point_attention (ministere_id);

create table public.point_mention (             -- fixées à la création
  point_id uuid not null references public.point_attention,
  ministere_id uuid not null references public.ministere,
  primary key (point_id, ministere_id)
);
create index on public.point_mention (ministere_id);

create table public.point_suivi (               -- chaque statut ; le plus récent fait foi
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.point_attention,
  statut public.statut_point not null,
  commentaire text check (char_length(commentaire) <= 280),  -- commentaire de traitement (D3)
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  check (commentaire is null or statut = 'traite')
);
create index on public.point_suivi (point_id, saisi_le desc);
create unique index point_suivi_un_traitement on public.point_suivi (point_id) where statut = 'traite';

-- Traces (ajout seulement, jamais modifiées)

create table public.journal (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  compte uuid references public.compte (user_id),   -- auteur ; null = « Système » (migration, jeu d'exemple, amorçage)
  ministere_id uuid references public.ministere,    -- ministère concerné (BRIEF, section 6, « Journal »)
  action text not null check (action in (
    'mesure_saisie', 'fij_saisie', 'participation_saisie', 'evenement_ajoute', 'evenement_modifie',
    'reunion_saisie', 'point_cree', 'point_statut', 'point_traite',
    'session_declaree', 'session_modifiee', 'session_supprimee',
    'ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive', 'compte_reactive',
    'double_auth_reinitialisee', 'texte_relu', 'texte_masque')),
  cible text check (cible in ('session', 'evenement', 'reunion', 'point_attention', 'point_suivi', 'compte', 'ministere')),
  cible_id uuid,                                    -- sans clé étrangère : une session supprimée reste citée
  detail jsonb not null default '{}' check (jsonb_typeof(detail) = 'object')
);
create index on public.journal (ministere_id, le desc);
create index on public.journal (compte, le desc);
create index on public.journal (le desc);

create table public.moderation (                -- écrite seulement par marquer_relu et masquer_texte
  id bigint generated always as identity primary key,
  cible text not null check (cible in ('point_attention', 'point_suivi', 'evenement', 'reunion')),
  cible_id uuid not null,
  champ text,                                   -- champ masqué ; null pour rien_a_signaler
  decision text not null check (decision in ('rien_a_signaler', 'masque')),
  motif text check (motif in ('nom_personne', 'coordonnees', 'situation_personnelle', 'autre')),
  par uuid not null references public.compte (user_id),
  le timestamptz not null default now(),
  check ((decision = 'masque') = (champ is not null and motif is not null)),
  check (champ is null or (cible, champ) in (
    ('point_attention', 'titre'), ('point_attention', 'description'), ('point_attention', 'action_attendue'),
    ('point_suivi', 'commentaire'), ('evenement', 'titre'),
    ('reunion', 'objet'), ('reunion', 'decision_attendue')))
);
create index on public.moderation (cible, cible_id);

-- RLS sur toutes les tables de public, dès leur création. Les politiques et les GRANT
-- arrivent dans la migration 4 : d'ici là, un client ne voit rien.
alter table public.ministere enable row level security;
alter table public.compte enable row level security;
alter table public.indicateur enable row level security;
alter table public.mesure enable row level security;
alter table public.fij_departement enable row level security;
alter table public.session enable row level security;
alter table public.session_attendu enable row level security;
alter table public.participation enable row level security;
alter table public.evenement enable row level security;
alter table public.evenement_etat enable row level security;
alter table public.reunion enable row level security;
alter table public.point_attention enable row level security;
alter table public.point_mention enable row level security;
alter table public.point_suivi enable row level security;
alter table public.journal enable row level security;
alter table public.moderation enable row level security;
