-- Jeu d'exemple de la ponctualité des événements (T68) : heures prévues, heures de début, retards,
-- et comptages de l'église. Local et CI seulement, chargé après seed.sql et seed/40 à 44
-- (supabase/config.toml). supabase db push ne l'applique pas sans --include-seed : ne jamais
-- passer cette option.
--
-- Mois écoulé (m1, 1er du mois précédent, heure de Paris) :
--   01 Jeunesse, « Soirée jeunesse », m1 + 9, Terminé, prévue 19 h, début 19 h 12 : 12 min de
--      retard ;
--   02 Communication, « Atelier photo », m1 + 12, Terminé, 14 h 30 puis 14 h 33 : 3 min, à l'heure ;
--   03 Intégration, « Accueil des nouveaux », m1 + 16, Terminé, 20 h puis 19 h 55 : avance, à
--      l'heure, 0 minute ;
--   04 Social, « Maraude », m1 + 20, Terminé, prévue 19 h 30, sans heure de début ;
--   05 Coordination, « Veillée de prière », m1 + 23, Terminé, 23 h 30 puis 0 h 05 : 35 min
--      (passage de minuit) ;
--   06 EJP Formation, « Soirée des formateurs », m1 + 5, Annulé, prévue 19 h : hors des réalisés.
-- Autour d'aujourd'hui (private.aujourdhui()) :
--   07 Jeunesse, « Tournoi de foot », la veille, Terminé, 19 h puis 19 h 03 : à l'heure ;
--   08 Intégration, « Pique-nique », l'avant-veille, Terminé, prévue 18 h 30, heure de début à
--      indiquer ;
--   09 Communication, « Concert », trois jours avant, Validé : passé sans état final.
-- Quand aujourd'hui est le 4 du mois ou plus tard, le mois écoulé compte 4 réalisés avec leurs
-- heures, dont 2 à l'heure, et 50 minutes de retard cumulé (12 + 3 + 0 + 35).
--
-- Chaque événement est créé dix jours avant sa date, à 20 h, avec le statut « Validé » et son
-- heure prévue ; son état final s'écrit le lendemain de sa date à 20 h, jamais après maintenant
-- moins une heure. Le trigger de evenement_etat écrit les lignes de journal (evenement_ajoute,
-- puis evenement_modifie), au nom du compte du ministère porteur. Sans compte connecté, le
-- trigger de contrôle ne reprend aucune heure : chaque état porte la sienne.
--
-- Ce fichier se suffit à lui-même (docs/conception/contrat-etape-4.md, section 3) : il redéfinit
-- l'aide des mois de seed/40 et retrouve les ministères par les comptes aux identifiants fixes
-- de seed.sql (Coordination peut venir de la migration de B1).

-- 1er du mois, p_recul mois avant le mois en cours (heure de Paris) : 0 pour le mois en cours.
create or replace function pg_temp.mois(p_recul integer) returns date
language sql stable as $$
  select (private.mois_courant() - make_interval(months => p_recul))::date
$$;

-- Maintenant, figé au premier appel de la session, et heure bornée, jamais après maintenant :
-- comme dans seed.sql.
create or replace function pg_temp.maintenant() returns timestamptz
language sql stable as $$
  select coalesce(nullif(current_setting('graine.maintenant', true), '')::timestamptz, now())
$$;

select set_config('graine.maintenant', pg_temp.maintenant()::text, false);

create or replace function pg_temp.borne(p_instant timestamptz) returns timestamptz
language sql stable as $$
  select case when p_instant <= b.limite then p_instant
              else b.limite + make_interval(secs => 3600 * b.ecart / (b.ecart + 3600)) end
    from (select m - interval '2 hours' as limite,
                 extract(epoch from p_instant - (m - interval '2 hours'))::double precision as ecart
            from pg_temp.maintenant() as m) as b
$$;

-- 20 h (heure de Paris) le jour donné, jamais après maintenant moins une heure.
create or replace function pg_temp.a_20h(p_jour date) returns timestamptz
language sql stable as $$
  select pg_temp.borne((p_jour::timestamp + time '20:00') at time zone 'Europe/Paris')
$$;

create temp table graine45 (
  id uuid primary key,
  compte uuid not null,
  titre text not null,
  jour date not null,
  statut_final public.statut_evenement,
  heure_prevue smallint,
  heure_debut smallint
);

insert into graine45 (id, compte, titre, jour, statut_final, heure_prevue, heure_debut) values
  ('45000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'Soirée jeunesse',
   pg_temp.mois(1) + 9, 'termine', 1140, 1152),
  ('45000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Atelier photo',
   pg_temp.mois(1) + 12, 'termine', 870, 873),
  ('45000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Accueil des nouveaux',
   pg_temp.mois(1) + 16, 'termine', 1200, 1195),
  ('45000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'Maraude',
   pg_temp.mois(1) + 20, 'termine', 1170, null),
  ('45000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'Veillée de prière',
   pg_temp.mois(1) + 23, 'termine', 1410, 5),
  ('45000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000008', 'Soirée des formateurs',
   pg_temp.mois(1) + 5, 'annule', 1140, null),
  ('45000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', 'Tournoi de foot',
   private.aujourdhui() - 1, 'termine', 1140, 1143),
  ('45000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'Pique-nique',
   private.aujourdhui() - 2, 'termine', 1110, null),
  ('45000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000001', 'Concert',
   private.aujourdhui() - 3, null, null, null);

insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select g.id, c.ministere_id, g.titre, pg_temp.a_20h(g.jour - 10), c.user_id
from graine45 g
join public.compte c on c.user_id = g.compte;

-- Premier état : « Validé », avec l'heure prévue.
insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, saisi_le, saisi_par)
select g.id, g.jour, 'valide', g.heure_prevue, pg_temp.a_20h(g.jour - 10), g.compte
from graine45 g;

-- État final, dans un envoi suivant : la même heure prévue, l'heure de début d'un « Terminé ».
insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, heure_debut, saisi_le, saisi_par)
select g.id, g.jour, g.statut_final, g.heure_prevue, g.heure_debut, pg_temp.a_20h(g.jour + 1), g.compte
from graine45 g
where g.statut_final is not null;
