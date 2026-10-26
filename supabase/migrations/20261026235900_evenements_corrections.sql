-- Événements : corriger le nom, modifier les mentions, retirer un événement créé par erreur
-- (T78, lot 1 ; docs/conception/calendrier-evenements.md, sections 6.1 à 6.3, 9, 10.1, 10.4, 11
-- et 12). Décision de la personne responsable du 26 octobre 2026 : les réponses « Proposé »,
-- sauf Q18 : le verrou « ajout seulement » n'est jamais levé, même le temps d'une reprise ; la
-- date des mentions déjà enregistrées se lit sur l'événement (sa création), sans modifier aucune
-- ligne.
--
-- Tout reste en ajout seulement : une correction ou un retrait est une ligne nouvelle, la plus
-- récente fait foi, rien n'est modifié ni effacé (seule exception : masquer_texte sur un nom).
--
-- 1. evenement_mention gagne un identifiant (colonne nouvelle, posée par la base pour chaque
--    ligne sans instruction update : le trigger d'inaltérabilité reste en place), une date et un
--    auteur. Les lignes d'avant n'ont ni date ni auteur : ils se lisent sur leur événement
--    (v_evenement_mention). La clé (événement, ministère) devient l'identifiant : un ministère
--    retiré puis ajouté de nouveau a deux lignes ; mention_unique refuse deux mentions en vigueur.
-- 2. Tables nouvelles, en ajout seulement : evenement_mention_retrait (un retrait désigne la
--    ligne d'ajout qu'il annule, modèle de T54), evenement_titre (un nom corrigé ; seul
--    masquer_texte le réécrit) et evenement_retrait (une ligne par événement retiré). Lues avec
--    les événements lisibles ; aucune politique ni aucun GRANT d'écriture : les fonctions écrivent.
-- 3. Lectures : un ministère retiré des mentions ne lit plus l'événement
--    (evenements_mentionnant_mon_ministere) ; v_evenement_mention donne les mentions en vigueur
--    des événements non retirés ; v_evenement (mêmes colonnes, dans le même ordre, puis deux à la
--    fin pour l'écran : titre_precedent et titre_corrige_le) donne le nom en vigueur et ne rend
--    plus un événement retiré.
-- 4. Un état sur un événement retiré est refusé (« Cet événement a été retiré. »), ancien site
--    compris : au porteur après le verrou, au propriétaire des tables ; les autres comptes restent
--    refusés par la RLS (42501), sans rien apprendre de l'événement.
-- 5. Comptages : un événement retiré ne compte nulle part (comptages par mois, totaux de
--    l'église, « depuis ») ; le tableau des ministères ne l'annonce plus et donne le nom en
--    vigueur du prochain événement.
-- 6. Fonctions de l'API (private en security definer, public en security invoker, d'une ligne) :
--    corriger_titre_evenement (porteur, tant que l'événement n'est pas retiré),
--    modifier_mentions_evenement (porteur, jusqu'à la date de l'événement comprise, heure de
--    Paris) et retirer_evenement (porteur jusqu'à la date comprise, EJP Tech à tout moment ;
--    définitif). Même nom, même liste, déjà retiré : rien n'est écrit, sans erreur.
-- 7. Journal : quatre codes (evenement_titre_corrige, evenement_mention_ajoutee,
--    evenement_mention_retiree, evenement_retire), au ministère porteur, cible evenement, sans
--    aucun texte libre ; la cible evenement_titre pour la modération. v_journal donne le nom en
--    vigueur d'un événement. La liste des codes reprend ceux du suivi des signalements (T77,
--    20261026140703_signalements_suivi.sql) ; le tableau des ministères aussi (fraîcheur de
--    T77). Condition de mise en ligne : T77, puis T76 B et C, PUIS ce lot ; avant de fusionner
--    ce lot, comparer journal_action_check et tableau_ministeres à la version finale de T77.
-- 8. Modération : chaque nom corrigé entre dans la file des textes à relire ; masquer_texte
--    gagne le couple (evenement_titre, titre) et ne masque que cette version ; l'administration
--    ne lit pas ces lignes de modération (comme les autres textes d'un événement).
--
-- Aucune donnée personnelle ; aucune date du jour dans une contrainte ; aucun SQL dynamique.

-- 1. evenement_mention : identifiant, date, auteur

alter table public.evenement_mention drop constraint evenement_mention_pkey;
alter table public.evenement_mention
  add column id uuid not null default gen_random_uuid(),
  add column saisi_le timestamptz,
  add column saisi_par uuid references public.compte (user_id);
-- Valeurs par défaut des lignes nouvelles seulement : les lignes d'avant gardent leurs valeurs.
alter table public.evenement_mention
  alter column saisi_le set default now(),
  alter column saisi_par set default auth.uid(),
  add constraint evenement_mention_pkey primary key (id);
create index evenement_mention_evenement_ministere_idx on public.evenement_mention (evenement_id, ministere_id);

create trigger forcer_auteur before insert on public.evenement_mention
  for each row execute function private.forcer_auteur();

-- 2. Tables nouvelles

create table public.evenement_mention_retrait (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null unique references public.evenement_mention (id),   -- l'ajout qu'il annule
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);

create table public.evenement_titre (             -- la ligne la plus récente fait foi
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references public.evenement,
  titre text not null,                            -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint evenement_titre_titre_check check (char_length(btrim(titre)) between 1 and 80)
);
create index evenement_titre_evenement_idx on public.evenement_titre (evenement_id, saisi_le desc, id desc);

create table public.evenement_retrait (            -- une ligne par événement retiré, définitive
  evenement_id uuid primary key references public.evenement,
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);

alter table public.evenement_mention_retrait enable row level security;
alter table public.evenement_titre enable row level security;
alter table public.evenement_retrait enable row level security;

create trigger forcer_auteur before insert on public.evenement_mention_retrait
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.evenement_mention_retrait
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.evenement_mention_retrait
  for each statement execute function private.refuser_modification();

create trigger forcer_auteur before insert on public.evenement_titre
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.evenement_titre
  for each row execute function private.refuser_modification_sauf_masquage('titre');
create trigger ajout_seulement_vider before truncate on public.evenement_titre
  for each statement execute function private.refuser_modification();

create trigger forcer_auteur before insert on public.evenement_retrait
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.evenement_retrait
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.evenement_retrait
  for each statement execute function private.refuser_modification();

-- Lecture : avec les événements lisibles (le porteur, les ministères mentionnés, le berger, le
-- conseil et EJP Tech ; jamais l'administration ni un autre ministère), comme evenement_mention.
create policy lecture on public.evenement_mention_retrait for select to authenticated
  using (mention_id in (select m.id from public.evenement_mention m));
create policy lecture on public.evenement_titre for select to authenticated
  using (evenement_id in (select e.id from public.evenement e));
create policy lecture on public.evenement_retrait for select to authenticated
  using (evenement_id in (select e.id from public.evenement e));

create policy double_authentification on public.evenement_mention_retrait as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.evenement_titre as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.evenement_retrait as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.evenement_mention_retrait, public.evenement_titre, public.evenement_retrait
  from public, anon, authenticated, service_role;
grant select on public.evenement_mention_retrait, public.evenement_titre, public.evenement_retrait
  to authenticated;

-- Un ministère n'a qu'une mention en vigueur par événement, même pour le propriétaire des tables.
create function private.refuser_mention_evenement_double() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.evenement_mention m
              where m.evenement_id = new.evenement_id and m.ministere_id = new.ministere_id
                and not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id)) then
    raise exception 'Ce ministère est déjà mentionné sur cet événement.';
  end if;
  return new;
end $$;

revoke all on function private.refuser_mention_evenement_double() from public, anon, authenticated, service_role;

create trigger mention_unique before insert on public.evenement_mention
  for each row execute function private.refuser_mention_evenement_double();

-- 3. Lectures

-- Événements qui mentionnent encore le ministère du compte (politique de evenement). Même
-- signature : les droits restent en place.
create or replace function private.evenements_mentionnant_mon_ministere() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.evenement_id from public.evenement_mention m
   where m.ministere_id = (select private.mon_ministere())
     and not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id)
$$;

-- Mentions en vigueur des événements lisibles et non retirés (sous la RLS du lecteur). Une
-- mention d'avant T78 n'a pas de date : c'est celle de la création de son événement (Q18).
create view public.v_evenement_mention with (security_invoker = true) as
select m.evenement_id, m.ministere_id, coalesce(m.saisi_le, e.saisi_le) as saisi_le
  from public.evenement_mention m
  join public.evenement e on e.id = m.evenement_id
 where not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id)
   and not exists (select 1 from public.evenement_retrait x where x.evenement_id = m.evenement_id);

revoke all on public.v_evenement_mention from public, anon, authenticated, service_role;
grant select on public.v_evenement_mention to authenticated;

-- Vue des événements : version de 20261023120000_evenements_heures.sql, mêmes colonnes dans le
-- même ordre (l'ancien site les lit), puis le nom précédent et le jour (Paris) de la dernière
-- correction, null sans correction. titre : le nom en vigueur (dernière ligne de
-- evenement_titre, sinon le nom de création). Un événement retiré n'y est plus.
create or replace view public.v_evenement with (security_invoker = true) as
select d.id, d.ministere_id, coalesce(n.titre, d.titre_creation) as titre, d.date, d.statut, d.mis_a_jour_le,
       d.date - private.aujourdhui() as jours,
       (d.statut = 'attente_validation'
        and d.date <= private.aujourdhui() + 3
        and exists (select 1 from public.ministere m where m.id = d.ministere_id and m.desactive_le is null))
         as a_confirmer,
       case when d.date_precedente <> d.date then d.date_precedente end as reporte_du,
       d.heure_prevue, d.heure_debut,
       r.retard,
       r.retard <= private.tolerance_ponctualite() as a_l_heure,
       case when n.titre is not null then coalesce(p.titre, d.titre_creation) end as titre_precedent,
       (n.saisi_le at time zone 'Europe/Paris')::date as titre_corrige_le
from (
  select distinct on (e.id) e.id, e.ministere_id, e.titre as titre_creation, x.date, x.statut,
         x.saisi_le as mis_a_jour_le,
         lag(x.date) over (partition by e.id order by x.saisi_le, x.id) as date_precedente,
         x.heure_prevue, x.heure_debut
  from public.evenement e
  join public.evenement_etat x on x.evenement_id = e.id
  where not exists (select 1 from public.evenement_retrait z where z.evenement_id = e.id)
  order by e.id, x.saisi_le desc, x.id desc
) as d
left join lateral (
  select t.titre, t.saisi_le from public.evenement_titre t
   where t.evenement_id = d.id
   order by t.saisi_le desc, t.id desc
   limit 1
) as n on true
left join lateral (
  select t.titre from public.evenement_titre t
   where t.evenement_id = d.id
   order by t.saisi_le desc, t.id desc
   offset 1 limit 1
) as p on true
cross join lateral (
  select case when d.statut = 'termine' then private.retard_minutes(d.heure_prevue, d.heure_debut) end as retard
) as r;

-- 4. Contrôle de chaque nouvel état : version de 20261023120000_evenements_heures.sql, plus le
-- refus d'un état sur un événement retiré. Un compte qui n'est pas le porteur en aal2 passe
-- sans contrôle (la RLS le refuse, 42501, sans rien lui apprendre) ; le propriétaire des tables
-- (aucun compte connecté) est refusé sur un événement retiré.
create or replace function private.controler_evenement_etat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_trouve boolean;
  v_date date;
  v_statut public.statut_evenement;
  v_prevue smallint;
  v_debut smallint;
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2'
     or not exists (select 1 from public.evenement e
                     where e.id = new.evenement_id and e.ministere_id = private.mon_ministere()) then
    if (select auth.uid()) is null
       and exists (select 1 from public.evenement_retrait r where r.evenement_id = new.evenement_id) then
      raise exception 'Cet événement a été retiré.';
    end if;
    return new;
  end if;
  -- Verrou sur l'événement : deux envois simultanés (double clic, deux onglets, nouvel essai
  -- du réseau) se suivent, et le second lit le dernier état déjà validé par le premier ; un
  -- retrait en cours est terminé.
  perform 1 from public.evenement e where e.id = new.evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = new.evenement_id) then
    raise exception 'Cet événement a été retiré.';
  end if;
  select x.date, x.statut, x.heure_prevue, x.heure_debut into v_date, v_statut, v_prevue, v_debut
    from public.evenement_etat x
   where x.evenement_id = new.evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  v_trouve := found;
  -- Une heure vide reprend la dernière : une heure se corrige, elle ne s'efface pas.
  if new.heure_prevue is null then
    new.heure_prevue := v_prevue;
  end if;
  if new.heure_debut is not null and new.statut <> 'termine' then
    raise exception 'L''heure de début se saisit pour un événement terminé.';
  end if;
  if new.heure_debut is null and new.statut = 'termine' then
    new.heure_debut := v_debut;
  end if;
  if new.heure_debut is not null and new.date > private.aujourdhui() then
    raise exception 'L''heure de début se saisit le jour de l''événement ou après.';
  end if;
  if not v_trouve then
    return new;
  end if;
  if new.date is distinct from v_date and new.date < private.aujourdhui() then
    raise exception 'La nouvelle date doit être aujourd''hui ou plus tard.';
  end if;
  if new.date = v_date and new.statut = v_statut
     and new.heure_prevue is not distinct from v_prevue
     and new.heure_debut is not distinct from v_debut then
    raise exception 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.';
  end if;
  return new;
end $$;

-- 5. Comptages

-- Comptages par mois : version de 20261023120500_evenements_comptages.sql, sans les événements
-- retirés. Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.comptages_evenements_mois(p_ministere uuid)
returns table (mois date, prevus integer, realises integer, annules integer, reportes integer,
               en_attente integer, passes_sans_etat_final integer, avec_heures integer, a_l_heure integer,
               retard_cumule integer)
language sql stable set search_path = '' as $$
  with etats as (
    select x.evenement_id, x.date, x.statut, x.heure_prevue, x.heure_debut,
           lag(x.date) over (partition by x.evenement_id order by x.saisi_le, x.id) as date_precedente,
           row_number() over (partition by x.evenement_id order by x.saisi_le desc, x.id desc) as rang
      from public.evenement e
      join public.evenement_etat x on x.evenement_id = e.id
     where (p_ministere is null or e.ministere_id = p_ministere)
       and not exists (select 1 from public.evenement_retrait z where z.evenement_id = e.id)
  ),
  dernier as (
    select d.evenement_id, d.date, d.statut,
           case when d.statut = 'termine' then private.retard_minutes(d.heure_prevue, d.heure_debut) end as retard,
           exists (select 1 from etats v
                    where v.evenement_id = d.evenement_id and v.statut in ('valide', 'preparation')) as a_ete_valide
      from etats d
     where d.rang = 1
  ),
  lignes as (
    select date_trunc('month', d.date::timestamp)::date as jour_mois,
           case when d.date >= private.aujourdhui() then d.statut in ('valide', 'preparation')
                else d.a_ete_valide end as prevu,
           d.statut = 'termine' as realise,
           d.statut = 'annule' as annule,
           false as reporte,
           d.statut = 'attente_validation' as attente,
           d.date < private.aujourdhui() and d.statut in ('valide', 'preparation') as passe,
           d.retard
      from dernier d
    union all
    select r.jour_mois, false, false, false, true, false, false, null::integer
      from (select distinct date_trunc('month', t.date_precedente::timestamp)::date as jour_mois, t.evenement_id
              from etats t
             where t.date > t.date_precedente) as r
  )
  select l.jour_mois,
         (count(*) filter (where l.prevu))::integer,
         (count(*) filter (where l.realise))::integer,
         (count(*) filter (where l.annule))::integer,
         (count(*) filter (where l.reporte))::integer,
         (count(*) filter (where l.attente))::integer,
         (count(*) filter (where l.passe))::integer,
         (count(*) filter (where l.realise and l.retard is not null))::integer,
         (count(*) filter (where l.realise and l.retard <= private.tolerance_ponctualite()))::integer,
         coalesce(sum(greatest(l.retard, 0)) filter (where l.realise), 0)::integer
    from lignes l
   group by l.jour_mois
  having bool_or(l.prevu or l.realise or l.annule or l.reporte or l.attente or l.passe)
   order by l.jour_mois
$$;

-- Totaux de l'église : version de 20261023120500_evenements_comptages.sql ; « depuis » ignore
-- les états d'un événement retiré. Même signature.
create or replace function private.evenements_eglise_mois()
returns table (mois date, prevus integer, realises integer, annules integer, reportes integer,
               en_attente integer, passes_sans_etat_final integer, avec_heures integer, a_l_heure integer,
               retard_cumule integer, cultes integer, cultes_avec_heures integer, cultes_a_l_heure integer,
               cultes_retard_cumule integer, depuis date)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if not (private.lit_tout()
          or exists (select 1 from public.ministere k
                      where k.code = 'coordination' and k.id = private.mon_ministere())) then
    raise exception 'Seuls Coordination, le berger, le conseil et EJP Tech lisent les comptages de l''église.'
      using errcode = '42501';
  end if;
  return query
  with evenements as (
    select c.mois as jour_mois, c.prevus as n_prevus, c.realises as n_realises, c.annules as n_annules,
           c.reportes as n_reportes, c.en_attente as n_attente, c.passes_sans_etat_final as n_passes,
           c.avec_heures as n_avec, c.a_l_heure as n_ok, c.retard_cumule as n_cumul
      from private.comptages_evenements_mois(null) as c
  ),
  indicateurs as (
    select i.id, i.modele_code
      from public.indicateur i
      join public.ministere k on k.id = i.ministere_id and k.code = 'coordination'
     where i.etat = 'actif'
       and i.modele_code in ('coordination_heure_de_debut_du_culte', 'coordination_heure_prevue_du_culte')
  ),
  debuts as (
    select distinct on (x.date_ref) x.date_ref as dimanche, x.valeur
      from public.mesure x
      join indicateurs i on i.id = x.indicateur_id and i.modele_code = 'coordination_heure_de_debut_du_culte'
     where x.date_ref <= private.dimanche_reference()
     order by x.date_ref, x.saisi_le desc, x.id desc
  ),
  culte as (
    select d.dimanche,
           private.retard_minutes(
             (select p.valeur from public.mesure p
                join indicateurs i on i.id = p.indicateur_id and i.modele_code = 'coordination_heure_prevue_du_culte'
               where p.date_ref <= d.dimanche
               order by p.date_ref desc, p.saisi_le desc, p.id desc
               limit 1)::smallint,
             d.valeur::smallint) as retard
      from debuts d
  ),
  cultes_par_mois as (
    select date_trunc('month', c.dimanche::timestamp)::date as jour_mois,
           count(*)::integer as n_cultes,
           count(c.retard)::integer as n_avec,
           (count(*) filter (where c.retard <= private.tolerance_ponctualite()))::integer as n_ok,
           coalesce(sum(greatest(c.retard, 0)), 0)::integer as n_cumul
      from culte c
     group by 1
  ),
  depart as (
    select coalesce(least(((select min(x.saisi_le) from public.evenement_etat x
                             where not exists (select 1 from public.evenement_retrait z
                                                where z.evenement_id = x.evenement_id))
                           at time zone 'Europe/Paris')::date,
                          (select min(c.dimanche) from culte c)),
                    private.aujourdhui()) as jour
  )
  select s.jour_mois::date,
         coalesce(e.n_prevus, 0), coalesce(e.n_realises, 0), coalesce(e.n_annules, 0),
         coalesce(e.n_reportes, 0), coalesce(e.n_attente, 0), coalesce(e.n_passes, 0),
         coalesce(e.n_avec, 0), coalesce(e.n_ok, 0), coalesce(e.n_cumul, 0),
         coalesce(u.n_cultes, 0), coalesce(u.n_avec, 0), coalesce(u.n_ok, 0), coalesce(u.n_cumul, 0),
         a.jour
    from depart a
   cross join lateral generate_series(date_trunc('month', a.jour::timestamp), private.mois_courant()::timestamp,
                                      interval '1 month') as s(jour_mois)
    left join evenements e on e.jour_mois = s.jour_mois::date
    left join cultes_par_mois u on u.jour_mois = s.jour_mois::date
   order by s.jour_mois desc;
end $$;

-- Tableau des ministères : version de T77 (20261026140703_signalements_suivi.sql, fraîcheur sans
-- les réponses d'un signalement), plus : le prochain événement ignore les événements retirés et
-- porte son nom en vigueur. Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.tableau_ministeres()
returns table (
  ministere_id uuid, nom text, description text, derniere_saisie timestamptz,
  prochain_evenement_date date, prochain_evenement_titre text,
  prochaine_reunion_date date, prochaine_reunion_heure time, point_ouvert_priorite public.priorite)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_type() as type, private.lit_tout() as lit_tout, private.aujourdhui() as jour
    where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select m.id, m.nom, m.description,
         -- Fraîcheur (règle 6) : dernière ligne de journal écrite par un compte du ministère,
         -- sauf un signalement et ses réponses, qui ne sont pas des saisies.
         (select max(j.le) from public.journal j
            join public.compte c on c.user_id = j.compte
           where c.ministere_id = m.id
             and j.action not in ('difficulte_signalee', 'signalement_regle', 'signalement_reponse_ministere')),
         ev.date, ev.titre,
         case when moi.lit_tout then re.date end,
         case when moi.lit_tout then re.heure end,
         case when moi.lit_tout then (
           select max(p.priorite) from public.point_attention p
            where p.ministere_id = m.id
              and not exists (select 1 from public.point_suivi s where s.point_id = p.id and s.statut = 'traite'))
         end
  from moi
  cross join public.ministere m
  left join lateral (
    select x.date,
           coalesce((select n.titre from public.evenement_titre n
                      where n.evenement_id = x.id
                      order by n.saisi_le desc, n.id desc
                      limit 1), x.titre) as titre
    from (select distinct on (e.id) e.id, e.titre, t.date, t.statut
            from public.evenement e
            join public.evenement_etat t on t.evenement_id = e.id
           where e.ministere_id = m.id
             and not exists (select 1 from public.evenement_retrait z where z.evenement_id = e.id)
           order by e.id, t.saisi_le desc, t.id desc) as x
    where x.date >= moi.jour and x.statut not in ('termine', 'annule')
    order by x.date, titre                -- le nom en vigueur (colonne rendue)
    limit 1
  ) as ev on true
  left join lateral (
    select r.date, r.heure
    from (select r0.date, r0.heure from public.reunion r0
           where r0.ministere_id = m.id
           order by r0.saisi_le desc
           limit 1) as r
    where r.date >= moi.jour
  ) as re on true
  where m.desactive_le is null
    and (moi.lit_tout or moi.type in ('ministere', 'admin_eglise'))
$$;

revoke all on function private.tableau_ministeres() from public, anon, authenticated, service_role;
grant execute on function private.tableau_ministeres() to authenticated;

-- 6. Fonctions

-- Contrôles communs aux corrections du porteur : l'événement existe et appartient au ministère
-- du compte (sinon le message d'un élément absent, 42501, pour ne rien révéler) ; verrou sur
-- l'événement (deux corrections, un état ou un retrait simultanés se suivent) ; pas retiré.
-- Rend le ministère porteur. Appelée par les fonctions security definer seulement.
create function private.controler_evenement_du_porteur(p_evenement_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
begin
  -- Le droit se contrôle avant le verrou : un compte sans droit ne bloque pas l'événement.
  select e.ministere_id into v_porteur from public.evenement e where e.id = p_evenement_id;
  if v_porteur is null or v_porteur is distinct from private.mon_ministere() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform 1 from public.evenement e where e.id = p_evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = p_evenement_id) then
    raise exception 'Cet événement a été retiré.';
  end if;
  return v_porteur;
end $$;

-- Corriger le nom : une ligne de evenement_titre ; le même nom que celui en vigueur (espaces
-- autour compris) n'écrit rien. Journal sans aucun des deux noms.
create function private.corriger_titre_evenement(p_evenement_id uuid, p_titre text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
  v_titre text := btrim(coalesce(p_titre, ''));
  v_actuel text;
begin
  perform private.exige_aal2();
  v_porteur := private.controler_evenement_du_porteur(p_evenement_id);
  if char_length(v_titre) not between 1 and 80 then
    raise exception 'Donnez un nom à l''événement (80 caractères au plus).';
  end if;
  v_actuel := coalesce((select t.titre from public.evenement_titre t
                         where t.evenement_id = p_evenement_id
                         order by t.saisi_le desc, t.id desc
                         limit 1),
                       (select e.titre from public.evenement e where e.id = p_evenement_id));
  if v_titre = btrim(v_actuel) then
    return;                               -- même nom : rien n'est écrit
  end if;
  insert into public.evenement_titre (evenement_id, titre) values (p_evenement_id, v_titre);
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_titre_corrige', 'evenement',
          p_evenement_id, '{}');
end $$;

-- Modifier les mentions : l'écran envoie la liste voulue, la base retire ceux qui n'y sont plus
-- (même désactivés depuis), puis ajoute les nouveaux (actifs, jamais le porteur), dans la même
-- transaction. Jusqu'à la date de l'événement comprise (heure de Paris). Une ligne de journal par
-- ministère ajouté ou retiré, avec son identifiant seulement.
create function private.modifier_mentions_evenement(p_evenement_id uuid, p_mentions uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
  v_date date;
  v_voulues uuid[];
  v_ministere uuid;
  v_mention uuid;
begin
  perform private.exige_aal2();
  v_porteur := private.controler_evenement_du_porteur(p_evenement_id);
  select x.date into v_date from public.evenement_etat x
   where x.evenement_id = p_evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  if v_date < private.aujourdhui() then
    raise exception 'Les mentions de cet événement ne changent plus.';
  end if;
  if p_mentions is null then
    raise exception 'Choisissez les ministères à mentionner.';
  end if;
  select coalesce(array_agg(distinct x.id), '{}') into v_voulues
    from unnest(p_mentions) as x(id)
   where x.id is not null;
  for v_ministere, v_mention in
    select m.ministere_id, m.id from public.evenement_mention m
     where m.evenement_id = p_evenement_id
       and not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id)
       and m.ministere_id <> all (v_voulues)
     order by m.ministere_id
  loop
    insert into public.evenement_mention_retrait (mention_id) values (v_mention);
    insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
    values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_mention_retiree', 'evenement',
            p_evenement_id, jsonb_build_object('ministere', v_ministere));
  end loop;
  for v_ministere in
    select x.id from unnest(v_voulues) as x(id)
     where not exists (select 1 from public.evenement_mention m
                        where m.evenement_id = p_evenement_id and m.ministere_id = x.id
                          and not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id))
     order by x.id
  loop
    if v_ministere = v_porteur
       or not exists (select 1 from public.ministere k where k.id = v_ministere and k.desactive_le is null) then
      raise exception 'Ce ministère ne peut pas être mentionné.';
    end if;
    insert into public.evenement_mention (evenement_id, ministere_id) values (p_evenement_id, v_ministere);
    insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
    values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_mention_ajoutee', 'evenement',
            p_evenement_id, jsonb_build_object('ministere', v_ministere));
  end loop;
end $$;

-- Retirer un événement créé par erreur : le porteur jusqu'à la date comprise (heure de Paris),
-- EJP Tech à tout moment (un événement passé est déjà lu par le berger et le conseil : EJP Tech
-- vérifie que c'est une erreur). Définitif ; déjà retiré : rien n'est écrit. Journal : la date
-- et le statut du dernier état, jamais le nom.
create function private.retirer_evenement(p_evenement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
  v_tech boolean;
  v_date date;
  v_statut public.statut_evenement;
begin
  perform private.exige_aal2();
  v_tech := private.peut_configurer();
  select e.ministere_id into v_porteur from public.evenement e where e.id = p_evenement_id;
  if v_porteur is null or not (v_tech or coalesce(v_porteur = private.mon_ministere(), false)) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform 1 from public.evenement e where e.id = p_evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = p_evenement_id) then
    return;                               -- déjà retiré : rien n'est écrit
  end if;
  select x.date, x.statut into v_date, v_statut from public.evenement_etat x
   where x.evenement_id = p_evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  if not v_tech and v_date < private.aujourdhui() then
    raise exception 'Un événement passé se retire par EJP Tech.';
  end if;
  insert into public.evenement_retrait (evenement_id) values (p_evenement_id);
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_retire', 'evenement', p_evenement_id,
          jsonb_build_object('date', v_date, 'statut', v_statut));
end $$;

create function public.corriger_titre_evenement(p_evenement_id uuid, p_titre text)
returns void language sql security invoker set search_path = '' as $$
  select private.corriger_titre_evenement(p_evenement_id, p_titre);
$$;

create function public.modifier_mentions_evenement(p_evenement_id uuid, p_mentions uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.modifier_mentions_evenement(p_evenement_id, p_mentions);
$$;

create function public.retirer_evenement(p_evenement_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.retirer_evenement(p_evenement_id);
$$;

-- Droits : rien pour public, anon ni service_role. Les trois fonctions de l'API (et leur partie
-- private) pour authenticated ; l'aide, pour personne (appelée par des security definer).
revoke all on function
  private.controler_evenement_du_porteur(uuid),
  private.corriger_titre_evenement(uuid, text),
  private.modifier_mentions_evenement(uuid, uuid[]),
  private.retirer_evenement(uuid),
  public.corriger_titre_evenement(uuid, text),
  public.modifier_mentions_evenement(uuid, uuid[]),
  public.retirer_evenement(uuid)
  from public, anon, authenticated, service_role;
grant execute on function
  private.corriger_titre_evenement(uuid, text),
  private.modifier_mentions_evenement(uuid, uuid[]),
  private.retirer_evenement(uuid),
  public.corriger_titre_evenement(uuid, text),
  public.modifier_mentions_evenement(uuid, uuid[]),
  public.retirer_evenement(uuid)
  to authenticated;

-- 7. Journal

-- Codes d'action : la liste de T77 (20261026140703_signalements_suivi.sql), plus les quatre
-- codes de ce lot.
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
    'point_mention_ajoutee', 'point_mention_retiree',
    -- Étape 8 : liste des indicateurs prévus d'un ministère (T72)
    'modele_prevus_choisi',
    -- Étape 8 : corrections de l'écran 13 (T74)
    'adresse_corrigee', 'ministere_supprime',
    -- Étape 8 : suivi des signalements (T77)
    'signalement_pris_en_charge', 'signalement_repondu', 'signalement_regle',
    'signalement_reponse_ministere',
    -- Étape 8 : corrections d'un événement (T78)
    'evenement_titre_corrige', 'evenement_mention_ajoutee', 'evenement_mention_retiree', 'evenement_retire'));

-- Cibles : la liste de 20261014090000_retrait_par_le_ministere.sql, plus le nom corrigé d'un
-- événement (lignes texte_relu et texte_masque).
alter table public.journal
  drop constraint journal_cible_check,
  add constraint journal_cible_check check (cible in (
    'session', 'evenement', 'reunion', 'point_attention', 'point_suivi', 'compte', 'ministere',
    'indicateur', 'demande_indicateur', 'validation', 'signalement', 'signalement_suivi',
    'precision_sensible', 'retrait_indicateur', 'evenement_titre'));

-- Lecture du journal : celle de 20261014090000_retrait_par_le_ministere.sql, plus la cible
-- evenement_titre dans la condition de l'administration (ni texte_relu ni texte_masque).
drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  ((select private.lit_tout())
   and ((coalesce(cible, '') not in ('signalement', 'signalement_suivi')
         and action not in ('difficulte_signalee', 'signalement_clos'))
        or (select private.mon_type()) = 'admin_plateforme'))
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail)
      and coalesce(cible, '') not in ('precision_sensible', 'signalement', 'signalement_suivi')
      and action not in ('difficulte_signalee', 'signalement_clos')
      and (action not in ('texte_relu', 'texte_masque')
           or coalesce(cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi', 'evenement',
                                          'reunion', 'retrait_indicateur', 'evenement_titre')))
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid()))));

-- v_journal : version de 20261025192715_comptes_corrections.sql, mêmes colonnes. Un événement
-- se nomme par son nom en vigueur ; un nom corrigé (cible evenement_titre) par cette version ;
-- la même condition que la politique pour l'administration.
create or replace view public.v_journal with (security_invoker = true) as
select j.id, j.le, j.compte, j.ministere_id, j.action, j.cible, j.cible_id, j.detail,
       case when j.compte is null then 'Système' else a.libelle end as compte_libelle,
       a.ministere_id as auteur_ministere_id,
       coalesce(m.nom, ms.nom) as ministere_nom,
       case j.cible
         when 'point_attention' then (select p.titre from public.point_attention p where p.id = j.cible_id)
         when 'point_suivi' then (select p.titre from public.point_suivi s
                                    join public.point_attention p on p.id = s.point_id
                                   where s.id = j.cible_id)
         when 'evenement' then coalesce((select t.titre from public.evenement_titre t
                                          where t.evenement_id = j.cible_id
                                          order by t.saisi_le desc, t.id desc
                                          limit 1),
                                        (select e.titre from public.evenement e where e.id = j.cible_id))
         when 'evenement_titre' then (select t.titre from public.evenement_titre t where t.id = j.cible_id)
         when 'reunion' then (select r.objet from public.reunion r where r.id = j.cible_id)
         when 'session' then (select x.intitule from public.session x where x.id = j.cible_id)
         when 'compte' then coalesce((select c.libelle from public.compte c where c.user_id = j.cible_id),
                                     left('Ministère ' || ms.nom, 60))
         when 'ministere' then coalesce((select x.nom from public.ministere x where x.id = j.cible_id),
                                        case when j.cible_id = j.ministere_id then ms.nom end)
         when 'indicateur' then (select i.libelle from public.indicateur i where i.id = j.cible_id)
         when 'demande_indicateur' then (select i.libelle from public.demande_indicateur d
                                           join public.indicateur i on i.id = d.indicateur_id
                                          where d.id = j.cible_id)
         when 'validation' then (select i.libelle from public.validation v
                                   join public.demande_indicateur d on d.id = v.demande_id
                                   join public.indicateur i on i.id = d.indicateur_id
                                  where v.id = j.cible_id)
         when 'precision_sensible' then (
           select 'Précision : ' || i.libelle || ', '
                  || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
                            'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from p.mois)::integer]
                  || ' ' || extract(year from p.mois)::integer
             from public.precision_sensible p
             join public.indicateur i on i.id = p.indicateur_id
            where p.id = j.cible_id)
         when 'signalement' then (select s.ecran from public.signalement s where s.id = j.cible_id)
         when 'signalement_suivi' then (select s.ecran from public.signalement_suivi x
                                          join public.signalement s on s.id = x.signalement_id
                                         where x.id = j.cible_id)
         when 'retrait_indicateur' then (select i.libelle from public.retrait_indicateur r
                                           join public.indicateur i on i.id = r.indicateur_id
                                          where r.id = j.cible_id)
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
-- Seulement quand le ministère n'existe plus (filtre évalué une fois par ligne).
left join lateral (
  select s.detail ->> 'nom' as nom
    from public.journal s
   where m.id is null and j.ministere_id is not null
     and s.action = 'ministere_supprime' and s.cible_id = j.ministere_id
   order by s.id desc
   limit 1) ms on true
where ((select private.mon_type()) is distinct from 'admin_eglise'
       or (private.journal_lisible_administration(j.action, j.detail)
           and coalesce(j.cible, '') <> 'precision_sensible'
           and (j.action not in ('texte_relu', 'texte_masque')
                or coalesce(j.cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi',
                                                 'evenement', 'reunion', 'retrait_indicateur', 'evenement_titre'))))
  and ((coalesce(j.cible, '') not in ('signalement', 'signalement_suivi')
        and j.action not in ('difficulte_signalee', 'signalement_clos'))
       or (select private.mon_type()) in ('admin_plateforme', 'ministere'));

-- 8. Modération

-- Contraintes : celles de 20261014090000_retrait_par_le_ministere.sql, plus le nom corrigé d'un
-- événement.
alter table public.moderation
  drop constraint moderation_cible_check,
  add constraint moderation_cible_check check (cible in (
    'point_attention', 'point_suivi', 'evenement', 'reunion',
    'demande_indicateur', 'validation', 'signalement', 'signalement_suivi', 'precision_sensible',
    'retrait_indicateur', 'evenement_titre')),
  drop constraint moderation_cible_champ_check,
  add constraint moderation_cible_champ_check check (champ is null or (cible, champ) in (
    ('point_attention', 'titre'), ('point_attention', 'description'), ('point_attention', 'action_attendue'),
    ('point_suivi', 'commentaire'), ('evenement', 'titre'),
    ('reunion', 'objet'), ('reunion', 'decision_attendue'),
    ('demande_indicateur', 'pourquoi'), ('validation', 'motif'),
    ('signalement', 'texte'), ('signalement_suivi', 'commentaire'),
    ('precision_sensible', 'texte'), ('retrait_indicateur', 'motif'),
    ('evenement_titre', 'titre')));

-- Auteur d'un texte relu : version de 20261009110000_signalements.sql, plus le nom corrigé d'un
-- événement. Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.auteur_texte(p_cible text, p_cible_id uuid) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_auteur uuid;
begin
  if p_cible = 'point_attention' then
    select p.saisi_par into v_auteur from public.point_attention p
     where p.id = p_cible_id
       for update;
  elsif p_cible = 'point_suivi' then
    select s.saisi_par into v_auteur from public.point_suivi s
     where s.id = p_cible_id and nullif(btrim(s.commentaire), '') is not null
       for update;
  elsif p_cible = 'evenement' then
    select e.saisi_par into v_auteur from public.evenement e
     where e.id = p_cible_id
       for update;
  elsif p_cible = 'reunion' then
    select r.saisi_par into v_auteur from public.reunion r
     where r.id = p_cible_id
       and (nullif(btrim(r.objet), '') is not null or nullif(btrim(r.decision_attendue), '') is not null)
       for update;
  elsif p_cible = 'demande_indicateur' then
    select d.saisi_par into v_auteur from public.demande_indicateur d
     where d.id = p_cible_id and d.pourquoi is not null
       for update;
  elsif p_cible = 'validation' then
    select v.saisi_par into v_auteur from public.validation v
     where v.id = p_cible_id and v.motif is not null
       for update;
  elsif p_cible = 'precision_sensible' then
    select p.saisi_par into v_auteur from public.precision_sensible p
     where p.id = p_cible_id
       for update;
  elsif p_cible = 'signalement' then
    select s.saisi_par into v_auteur from public.signalement s
     where s.id = p_cible_id
       for update;
  elsif p_cible = 'signalement_suivi' then
    select x.saisi_par into v_auteur from public.signalement_suivi x
     where x.id = p_cible_id and x.commentaire is not null
       for update;
  elsif p_cible = 'evenement_titre' then
    select t.saisi_par into v_auteur from public.evenement_titre t
     where t.id = p_cible_id
       for update;
  end if;
  if v_auteur is null then
    raise exception 'Ce texte n''existe pas ou ne contient aucun champ libre.';
  end if;
  return v_auteur;
end $$;

-- Masquage : les treize couples de 20261014090000_retrait_par_le_ministere.sql repris tels
-- quels, puis (evenement_titre, titre), sous le réglage local pilotage.masquage que le trigger de
-- la table accepte, retiré aussitôt : seule cette version du nom change. Même signature.
create or replace function private.masquer_texte(p_cible text, p_cible_id uuid, p_champ text, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_masque constant text := '[texte masqué par EJP Tech]';
  v_auteur uuid;
  v_ministere uuid;
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
  elsif p_cible = 'precision_sensible' and p_champ = 'texte' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.precision_sensible set texte = v_masque
     where id = p_cible_id and texte <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'signalement' and p_champ = 'texte' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.signalement set texte = v_masque
     where id = p_cible_id and texte <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'signalement_suivi' and p_champ = 'commentaire' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.signalement_suivi set commentaire = v_masque
     where id = p_cible_id and commentaire is not null and commentaire <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
    if v_auteur is not null then
      v_ministere := private.ministere_du_signalement(p_cible, p_cible_id);
    end if;
  elsif p_cible = 'retrait_indicateur' and p_champ = 'motif' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.retrait_indicateur set motif = v_masque
     where id = p_cible_id and motif <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'evenement_titre' and p_champ = 'titre' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.evenement_titre set titre = v_masque
     where id = p_cible_id and titre <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
    if v_auteur is not null then
      v_ministere := (select e.ministere_id from public.evenement_titre t
                        join public.evenement e on e.id = t.evenement_id
                       where t.id = p_cible_id);
    end if;
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère concerné : celui de la précision, du signalement, du retrait ou de l'événement,
  -- sinon celui du compte auteur (null pour le berger, le conseil et EJP Tech, auteur du motif
  -- d'un refus).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()),
          coalesce(v_ministere, (select c.ministere_id from public.compte c where c.user_id = v_auteur)),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- File de relecture d'EJP Tech : version de 20261009120000_lot_i_correctifs.sql, plus chaque
-- nom corrigé d'un événement (champ {titre}, ministère de son auteur). Même signature et mêmes
-- colonnes : v_textes_a_relire, qui la lit, ne change pas.
create or replace function private.textes_a_relire()
returns table (
  cible text, cible_id uuid, ministere_id uuid, auteur_libelle text, ecrit_le timestamptz,
  champs jsonb, etat text, decision_le timestamptz, motif text, indicateur_libelle text, mois date)
language sql stable security definer set search_path = '' as $$
  with ecrits (cible, cible_id, saisi_par, saisi_le, champs, ministere_id, indicateur_libelle, mois) as (
    select 'point_attention', p.id, p.saisi_par, p.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'titre', p.titre,
             'description', nullif(btrim(p.description), ''),
             'action_attendue', nullif(btrim(p.action_attendue), ''))),
           null::uuid, null::text, null::date
      from public.point_attention p
    union all
    select 'point_suivi', s.id, s.saisi_par, s.saisi_le, jsonb_build_object('commentaire', s.commentaire),
           null, null, null
      from public.point_suivi s
     where nullif(btrim(s.commentaire), '') is not null
    union all
    select 'evenement', e.id, e.saisi_par, e.saisi_le, jsonb_build_object('titre', e.titre), null, null, null
      from public.evenement e
    union all
    select 'evenement_titre', t.id, t.saisi_par, t.saisi_le, jsonb_build_object('titre', t.titre), null, null, null
      from public.evenement_titre t
    union all
    select 'reunion', r.id, r.saisi_par, r.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'objet', nullif(btrim(r.objet), ''),
             'decision_attendue', nullif(btrim(r.decision_attendue), ''))),
           null, null, null
      from public.reunion r
     where nullif(btrim(r.objet), '') is not null or nullif(btrim(r.decision_attendue), '') is not null
    union all
    select 'precision_sensible', p.id, p.saisi_par, p.saisi_le, jsonb_build_object('texte', p.texte),
           p.ministere_id, i.libelle, p.mois
      from public.precision_sensible p
      join public.indicateur i on i.id = p.indicateur_id
     where i.retrait_motif is distinct from 'confidentialite'
  )
  select x.cible, x.cible_id, coalesce(x.ministere_id, c.ministere_id), c.libelle, x.saisi_le, x.champs,
         case d.decision when 'masque' then 'masque' when 'rien_a_signaler' then 'relu' else 'a_relire' end,
         d.le, d.motif, x.indicateur_libelle, x.mois
  from ecrits x
  join public.compte c on c.user_id = x.saisi_par
  left join lateral (
    select m.decision, m.le, m.motif from public.moderation m
     where m.cible = x.cible and m.cible_id = x.cible_id
     order by m.le desc, m.id desc
     limit 1
  ) as d on true
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (select private.mon_type()) = 'admin_plateforme'
    and (d.decision is null or (x.saisi_le at time zone 'Europe/Paris')::date >= private.aujourdhui() - 30)
$$;
