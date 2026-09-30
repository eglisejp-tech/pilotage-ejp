-- Étape 1, migration 3 sur 7 : fonctions d'aide et triggers (BRIEF, sections 6 et 7).
--
-- Toutes les fonctions vivent dans private, avec set search_path = '' et des noms qualifiés.
-- Seules les fonctions d'aide lues par les politiques et les vues sont ouvertes à
-- authenticated ; les fonctions de trigger ne sont exécutables par personne (un trigger ne
-- vérifie pas le droit execute au moment où il se déclenche).

-- Fonctions d'aide

-- Type du compte connecté ; null si le compte ou son ministère est désactivé.
create function private.mon_type() returns public.type_compte
language sql stable security definer set search_path = '' as $$
  select c.type from public.compte c left join public.ministere m on m.id = c.ministere_id
  where c.user_id = (select auth.uid()) and c.desactive_le is null
    and (c.type <> 'ministere' or m.desactive_le is null)
$$;

-- Ministère du compte connecté ; null hors compte de ministère actif.
create function private.mon_ministere() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.ministere_id from public.compte c join public.ministere m on m.id = c.ministere_id
  where c.user_id = (select auth.uid()) and c.desactive_le is null and m.desactive_le is null
$$;

-- Berger ou conseil, jamais null.
create function private.est_decideur() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.mon_type() in ('berger', 'conseil'), false)
$$;

-- Première ligne de chaque fonction de l'API : les fonctions security definer contournent la
-- RLS, donc la politique restrictive aal2 ne les protège pas.
create function private.exige_aal2() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'Double authentification requise.' using errcode = '42501';
  end if;
  if private.mon_type() is null then
    raise exception 'Compte inactif ou inconnu.' using errcode = '42501';
  end if;
end $$;

-- Lit les mentions sans RLS : la politique de point_attention ne relit pas point_mention sous
-- RLS, ce qui casse la récursion entre les deux politiques.
create function private.points_mentionnant_mon_ministere() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.point_id from public.point_mention m where m.ministere_id = private.mon_ministere()
$$;

-- Dates métier, toujours à l'heure de Paris (règle 11).
create function private.aujourdhui() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Paris')::date
$$;

-- Dernier dimanche dont midi (heure de Paris) est passé. Testée avec des instants fixes.
create function private.dimanche_reference_de(p_instant timestamptz) returns date
language sql stable set search_path = '' as $$
  select d - (extract(isodow from d)::int % 7)
  from (select ((p_instant at time zone 'Europe/Paris') - interval '12 hours')::date as d) as x
$$;

create function private.dimanche_reference() returns date
language sql stable set search_path = '' as $$
  select private.dimanche_reference_de(now())
$$;

-- Un ministère est actif le jour J s'il existait ce jour-là et n'était pas encore désactivé.
create function private.actif_le(p_cree_le timestamptz, p_desactive_le timestamptz, p_jour date) returns boolean
language sql stable set search_path = '' as $$
  select (p_cree_le at time zone 'Europe/Paris')::date <= p_jour
     and (p_desactive_le is null or (p_desactive_le at time zone 'Europe/Paris')::date > p_jour)
$$;

-- Le ministère FIJ (code posé par la migration des données de référence), s'il est actif.
create function private.ministere_fij() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.ministere m where m.code = 'fij' and m.desactive_le is null
$$;

-- Triggers d'intégrité

-- Auteur et heure imposés : une valeur par défaut ne suffit pas, le client peut envoyer la
-- sienne. statement_timestamp() vaut now() pour une requête de l'API (une instruction par
-- transaction) ; il départage aussi deux envois successifs d'une même transaction (tests).
-- Les lignes d'un même envoi (une instruction insert) gardent la même heure.
create function private.forcer_auteur() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then          -- compte de l'application ; le jeu d'exemple (rôle postgres) garde ses dates
    new.saisi_le := statement_timestamp();
    new.saisi_par := auth.uid();
  end if;
  return new;
end $$;

-- Date d'une mesure : « à ce jour » prend la date du jour ; « dimanche » refuse un autre jour
-- qu'un dimanche et un dimanche futur.
create function private.controler_mesure() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_nature text;
begin
  select i.nature into v_nature from public.indicateur i where i.id = new.indicateur_id;
  if v_nature = 'a_ce_jour' then
    if auth.uid() is not null then
      new.date_ref := private.aujourdhui();
    end if;
  elsif v_nature = 'dimanche' then
    if extract(isodow from new.date_ref) <> 7 or new.date_ref > private.aujourdhui() then
      raise exception 'La date doit être un dimanche passé ou aujourd''hui.';
    end if;
  end if;
  return new;
end $$;

-- Pour chaque ministère de l'envoi, la dernière valeur « dont en FIJ » ne dépasse pas la
-- dernière valeur « STARs actifs » (règle 4). Sans valeur d'actifs, rien à comparer.
create function private.verifier_fij_actifs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1
    from (select distinct n.ministere_id from nouvelles n) as m
    cross join lateral (
      select
        (select d.valeur from public.mesure d join public.indicateur i on i.id = d.indicateur_id
          where d.ministere_id = m.ministere_id and i.code = 'en_fij'
          order by d.date_ref desc, d.saisi_le desc, d.id desc limit 1) as en_fij,
        (select d.valeur from public.mesure d join public.indicateur i on i.id = d.indicateur_id
          where d.ministere_id = m.ministere_id and i.code = 'actifs'
          order by d.date_ref desc, d.saisi_le desc, d.id desc limit 1) as actifs
    ) as v
    where v.en_fij > v.actifs
  ) then
    raise exception 'Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.';
  end if;
  return null;
end $$;

-- Journal et modération inaltérables, même pour le propriétaire des tables.
create function private.refuser_modification() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'La table % est en ajout seul : elle ne se modifie pas et ne s''efface pas.', tg_table_name
    using errcode = '42501';
end $$;

-- Journal écrit par les saisies directes : une ligne par envoi, groupée par
-- (saisi_par, ministere_id, saisi_le), avec le = saisi_le et compte = saisi_par. Rien n'est
-- écrit si la table de transition est vide. detail ne contient jamais de texte libre.

create function private.journaliser_mesures() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, detail)
  select n.saisi_le, n.saisi_par, n.ministere_id, 'mesure_saisie',
         jsonb_build_object('lignes', jsonb_agg(jsonb_build_object(
           'indicateur_id', n.indicateur_id, 'date_ref', n.date_ref, 'valeur', n.valeur) order by n.id))
  from nouvelles n
  group by n.saisi_le, n.saisi_par, n.ministere_id;
  return null;
end $$;

create function private.journaliser_fij() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, detail)
  select n.saisi_le, n.saisi_par, n.ministere_id, 'fij_saisie', jsonb_build_object('total', sum(n.valeur))
  from nouvelles n
  group by n.saisi_le, n.saisi_par, n.ministere_id;
  return null;
end $$;

-- Une présence vise une session : une ligne par session, avec la dernière valeur de l'envoi.
create function private.journaliser_participations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  select distinct on (n.saisi_le, n.saisi_par, n.ministere_id, n.session_id)
         n.saisi_le, n.saisi_par, n.ministere_id, 'participation_saisie', 'session', n.session_id,
         jsonb_build_object('valeur', n.valeur, 'deja_comptes', n.deja_comptes)
  from nouvelles n
  order by n.saisi_le, n.saisi_par, n.ministere_id, n.session_id, n.id desc;
  return null;
end $$;

-- evenement_ajoute s'il n'existe aucune ligne d'état plus ancienne pour cet événement,
-- sinon evenement_modifie. Le ministère est celui de l'événement.
create function private.journaliser_evenements() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  select distinct on (n.saisi_le, n.saisi_par, n.evenement_id)
         n.saisi_le, n.saisi_par, e.ministere_id,
         case when exists (select 1 from public.evenement_etat x
                            where x.evenement_id = n.evenement_id
                              and (x.saisi_le < n.saisi_le
                                   or not exists (select 1 from nouvelles y where y.id = x.id)))
              then 'evenement_modifie' else 'evenement_ajoute' end,
         'evenement', n.evenement_id,
         jsonb_build_object('date', n.date, 'statut', n.statut)
  from nouvelles n
  join public.evenement e on e.id = n.evenement_id
  order by n.saisi_le, n.saisi_par, n.evenement_id, n.id desc;
  return null;
end $$;

create function private.journaliser_reunions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  select n.saisi_le, n.saisi_par, n.ministere_id, 'reunion_saisie', 'reunion', n.id,
         jsonb_build_object('date', n.date, 'heure', n.heure)
  from nouvelles n;
  return null;
end $$;

-- Pose des triggers

create trigger forcer_auteur before insert on public.mesure for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.fij_departement for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.session for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.participation for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.evenement for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.evenement_etat for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.reunion for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.point_attention for each row execute function private.forcer_auteur();
create trigger forcer_auteur before insert on public.point_suivi for each row execute function private.forcer_auteur();

create trigger controler_mesure before insert on public.mesure
  for each row execute function private.controler_mesure();
create trigger verifier_fij_actifs after insert on public.mesure
  referencing new table as nouvelles for each statement execute function private.verifier_fij_actifs();

create trigger journal_mesure after insert on public.mesure
  referencing new table as nouvelles for each statement execute function private.journaliser_mesures();
create trigger journal_fij_departement after insert on public.fij_departement
  referencing new table as nouvelles for each statement execute function private.journaliser_fij();
create trigger journal_participation after insert on public.participation
  referencing new table as nouvelles for each statement execute function private.journaliser_participations();
create trigger journal_evenement_etat after insert on public.evenement_etat
  referencing new table as nouvelles for each statement execute function private.journaliser_evenements();
create trigger journal_reunion after insert on public.reunion
  referencing new table as nouvelles for each statement execute function private.journaliser_reunions();

create trigger ajout_seulement before update or delete on public.journal
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.journal
  for each statement execute function private.refuser_modification();
create trigger ajout_seulement before update or delete on public.moderation
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.moderation
  for each statement execute function private.refuser_modification();

-- Droits : personne par défaut, puis authenticated pour les fonctions lues par les
-- politiques, les vues et la fonction security invoker ajouter_evenement.
revoke all on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function
  private.mon_type(),
  private.mon_ministere(),
  private.est_decideur(),
  private.exige_aal2(),
  private.points_mentionnant_mon_ministere(),
  private.aujourdhui(),
  private.dimanche_reference_de(timestamptz),
  private.dimanche_reference(),
  private.actif_le(timestamptz, timestamptz, date),
  private.ministere_fij()
  to authenticated;
