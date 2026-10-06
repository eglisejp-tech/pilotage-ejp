-- Étape 4, lot B5 : statistiques FIJ par département, base (docs/plan-etape-4.md, section 4,
-- « B5 » ; docs/conception/contrat-etape-4.md, sections 4 à 8 ; BRIEF, « Coordo FIJ :
-- statistiques par département (P40) » ; vague-1-decisions.md, X5 et K47).
--
-- Coordo FIJ (ministère de code fij) saisit chaque semaine quatre rubriques pour les 8
-- départements, 32 valeurs au plus en un envoi. La semaine va du lundi au dimanche et se nomme
-- par son dimanche (K47b : « membres du mardi » et les trois présences se saisissent dans la
-- semaine qui se termine le dimanche).
--
-- - private.fij_rubrique : liste fermée des quatre rubriques (codes fixés par W0), illisible
--   par l'API ;
-- - public.fij_statistique : ajout seulement (trigger d'inaltérabilité, même pour le
--   propriétaire), auteur et heure imposés par forcer_auteur, lecture par le ministère fij, le
--   berger, le conseil et EJP Tech ; aucun GRANT insert : l'ajout passe par la fonction ;
-- - saisir_fij_statistiques : private en security definer, public en security invoker, ministère
--   fij seulement (EJP Tech ne saisit rien), une ligne de journal par envoi, sans valeur ;
-- - v_fij_statistique : une ligne par rubrique et par dimanche, sur les 10 dimanches jusqu'au
--   dimanche de référence (heure de Paris) ; dernière saisie de chaque département, total,
--   complétude sur 8 ; un département absent ne compte jamais 0, une semaine vide a un total nul.

-- 1. Rubriques (liste fermée)

create table private.fij_rubrique (
  code text primary key,
  libelle text not null unique check (char_length(libelle) between 1 and 60),
  ordre smallint not null unique
);

insert into private.fij_rubrique (code, libelle, ordre) values
  ('culte_ejp', 'Présents au culte EJP', 1),
  ('reunion_fij', 'Présents à la réunion FIJ', 2),
  ('evangelisation', 'Présents à l''évangélisation', 3),
  ('membres_mardi', 'Membres du mardi', 4);

alter table private.fij_rubrique enable row level security;
revoke all on private.fij_rubrique from public, anon, authenticated, service_role;

-- 2. Table des saisies (ajout seulement)

create table public.fij_statistique (
  id bigint generated always as identity primary key,
  ministere_id uuid not null references public.ministere,
  rubrique text not null references private.fij_rubrique (code),
  departement text not null check (departement in ('75', '77', '78', '91', '92', '93', '94', '95')),
  dimanche date not null check (extract(isodow from dimanche) = 7),   -- dimanche de la semaine
  valeur integer not null check (valeur between 0 and 9999),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
-- Ordre du distinct on de la vue : rubrique, département, dimanche, dernière saisie d'abord.
create index on public.fij_statistique (rubrique, departement, dimanche, saisi_le desc, id desc);
create index on public.fij_statistique (ministere_id);

alter table public.fij_statistique enable row level security;

create trigger forcer_auteur before insert on public.fij_statistique
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.fij_statistique
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.fij_statistique
  for each statement execute function private.refuser_modification();

-- Lecture : le ministère fij (actif), le berger, le conseil et EJP Tech ; rien pour
-- l'administration ni pour un autre ministère. Aucune politique d'ajout.
create policy lecture on public.fij_statistique for select to authenticated using (
  (select private.lit_tout())
  or (ministere_id = (select private.mon_ministere()) and ministere_id = (select private.ministere_fij())));

create policy double_authentification on public.fij_statistique as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.fij_statistique from public, anon, authenticated, service_role;
revoke all on sequence public.fij_statistique_id_seq from public, anon, authenticated, service_role;
grant select on public.fij_statistique to authenticated;

-- 3. Rubriques lues par la vue : servies par une fonction security definer (la table est dans
-- private), seulement en aal2 et seulement aux profils qui lisent les statistiques. Une vue sans
-- droit de lecture rend donc zéro ligne, pas quatre rubriques vides.
create function private.fij_rubriques()
returns table (code text, libelle text, ordre smallint)
language sql stable security definer set search_path = '' as $$
  select r.code, r.libelle, r.ordre
  from private.fij_rubrique r
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (private.lit_tout()
         or (private.mon_ministere() is not null and private.mon_ministere() = private.ministere_fij()))
$$;

-- 4. Vue : une ligne par rubrique et par dimanche (10 dimanches jusqu'au dimanche de
-- référence). Dernière saisie de chaque département (saisi_le puis id décroissants) ; total
-- null et complétude 0 pour une semaine sans saisie (un trou, jamais 0).
create view public.v_fij_statistique with (security_invoker = true) as
with dimanches as (
  select private.dimanche_reference() - 7 * g.n as dimanche
  from generate_series(0, 9) as g(n)
),
dernieres as (
  select distinct on (s.rubrique, s.departement, s.dimanche)
         s.rubrique, s.departement, s.dimanche, s.valeur, s.saisi_le
  from public.fij_statistique s
  where s.dimanche between private.dimanche_reference() - 63 and private.dimanche_reference()
  order by s.rubrique, s.departement, s.dimanche, s.saisi_le desc, s.id desc
)
select r.code as rubrique,
       r.libelle as rubrique_libelle,
       r.ordre as rubrique_ordre,
       d.dimanche,
       sum(x.valeur)::bigint as total,
       count(x.valeur)::integer as nb_departements,
       coalesce(jsonb_object_agg(x.departement, x.valeur) filter (where x.departement is not null),
                '{}'::jsonb) as departements,
       max(x.saisi_le) as derniere_saisie_le
from private.fij_rubriques() as r
cross join dimanches as d
left join dernieres as x on x.rubrique = r.code and x.dimanche = d.dimanche
group by r.code, r.libelle, r.ordre, d.dimanche;

revoke all on public.v_fij_statistique from public, anon, authenticated, service_role;
grant select on public.v_fij_statistique to authenticated;

-- 5. Saisie : 1 à 32 valeurs pour un dimanche passé ou aujourd'hui (heure de Paris), chaque
-- couple (rubrique, département) une fois au plus. Une ligne de journal par envoi :
-- {"dimanche", "nombre"}, jamais une valeur. L'heure du journal est celle des lignes.
-- Le dimanche du jour s'accepte dès minuit, alors que la vue ne l'affiche qu'à partir de midi
-- (private.dimanche_reference()) : une saisie du dimanche matin est enregistrée mais absente de
-- la vue jusqu'à midi, l'écran ne doit donc pas s'appuyer sur la vue pour confirmer l'envoi.
-- Une valeur écrite 5.0 est un entier : le cast passe par numeric.
create function private.saisir_fij_statistiques(p_dimanche date, p_valeurs jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_nombre integer;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if v_ministere is null or v_ministere is distinct from private.ministere_fij() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if p_dimanche is null or extract(isodow from p_dimanche) <> 7 or p_dimanche > private.aujourdhui() then
    raise exception 'La date doit être un dimanche passé ou aujourd''hui.';
  end if;
  if p_valeurs is null or jsonb_typeof(p_valeurs) <> 'array' or jsonb_array_length(p_valeurs) = 0 then
    raise exception 'Saisissez au moins une valeur.';
  end if;
  v_nombre := jsonb_array_length(p_valeurs);
  if v_nombre > 32 then
    raise exception 'Un envoi compte 32 valeurs au plus : 4 rubriques pour 8 départements.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_valeurs) as e(x)
              where jsonb_typeof(e.x) <> 'object'
                 or not exists (select 1 from private.fij_rubrique r where r.code = e.x ->> 'rubrique')) then
    raise exception 'Rubrique inconnue.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_valeurs) as e(x)
              where coalesce(e.x ->> 'departement', '') not in ('75', '77', '78', '91', '92', '93', '94', '95')) then
    raise exception 'Département inconnu.';
  end if;
  -- Le case ne convertit que les nombres JSON : un texte ou un null n'atteint jamais le cast.
  if exists (select 1 from jsonb_array_elements(p_valeurs) as e(x)
              cross join lateral (select case when jsonb_typeof(e.x -> 'valeur') = 'number'
                                              then (e.x ->> 'valeur')::numeric end as n) as v
              where v.n is null or v.n <> trunc(v.n) or v.n not between 0 and 9999) then
    raise exception 'Chaque valeur est un nombre entier de 0 à 9 999.';
  end if;
  if (select count(distinct (e.x ->> 'rubrique', e.x ->> 'departement'))
        from jsonb_array_elements(p_valeurs) as e(x)) <> v_nombre then
    raise exception 'Chaque rubrique d''un département ne se saisit qu''une fois par envoi.';
  end if;

  -- Une seule instruction : les lignes de l'envoi partagent saisi_le (forcer_auteur).
  insert into public.fij_statistique (ministere_id, rubrique, departement, dimanche, valeur)
  select v_ministere, e.x ->> 'rubrique', e.x ->> 'departement', p_dimanche, (e.x ->> 'valeur')::numeric::integer
  from jsonb_array_elements(p_valeurs) with ordinality as e(x, rang)
  order by e.rang;

  insert into public.journal (le, compte, ministere_id, action, detail)
  values (statement_timestamp(), (select auth.uid()), v_ministere, 'fij_statistiques_saisies',
          jsonb_build_object('dimanche', p_dimanche, 'nombre', v_nombre));
end $$;

create function public.saisir_fij_statistiques(p_dimanche date, p_valeurs jsonb)
returns void language sql security invoker set search_path = '' as $$
  select private.saisir_fij_statistiques(p_dimanche, p_valeurs);
$$;

-- 6. Droits des fonctions : authenticated seulement, rien pour public, anon ni service_role.
revoke all on function
  private.fij_rubriques(),
  private.saisir_fij_statistiques(date, jsonb),
  public.saisir_fij_statistiques(date, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function
  private.fij_rubriques(),
  private.saisir_fij_statistiques(date, jsonb),
  public.saisir_fij_statistiques(date, jsonb)
  to authenticated;
