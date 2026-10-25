-- Jeu d'exemple de l'étape 4, lot B7 : deux signalements de Communication (T39), local et CI
-- seulement, chargé après seed.sql (supabase/config.toml). supabase db push ne l'applique pas
-- sans --include-seed : ne jamais passer cette option.
--
-- - Un signalement ouvert sur la saisie d'un événement (saisie_evenement), envoyé le vendredi
--   25 sept. ;
-- - un signalement sur la saisie du dimanche (saisie_dimanche), envoyé le dimanche 20 sept., clos
--   par EJP Tech le mardi 22 sept. avec un commentaire.
-- Aucune donnée personnelle : ni nom, ni adresse, ni numéro (les textes passent les familles
-- « données personnelles » et « crochets » de private.verifier_texte).
--
-- Insertion directe (rôle du jeu, sans compte connecté), sans passer par signaler_difficulte ni
-- clore_signalement : aucune ligne de journal, pour que la fraîcheur de Communication et les
-- comptes du journal que vérifient les tests de l'étape 3 ne bougent pas (contrat de l'étape 4,
-- section 3). Aucun réglage de session n'est nécessaire : les triggers des deux tables ne lisent
-- pas pilotage.migration. forcer_auteur garde saisi_le et saisi_par parce qu'aucun compte n'est
-- connecté. signalements.test.sql vérifie le contenu du jeu (E8 en dépend).
--
-- Ce fichier se suffit à lui-même : il redéfinit les aides de décalage de seed.sql et retrouve
-- le ministère et les comptes par leurs identifiants fixes.

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

create or replace function pg_temp.h(p_heure timestamp) returns timestamptz
language sql stable as $$
  select pg_temp.borne((p_heure + (private.dimanche_reference() - date '2026-09-27') * interval '1 day')
                       at time zone 'Europe/Paris')
$$;

insert into public.signalement (id, ministere_id, ecran, texte, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'saisie_evenement',
   'Le formulaire refuse la date de notre soirée de louange, alors qu''elle est bien à venir.',
   pg_temp.h('2026-09-25 18:40'), '20000000-0000-4000-8000-000000000001'),          -- Ministère Communication
  ('43000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'saisie_dimanche',
   'Le bouton Envoyer reste grisé après la saisie des STARs au service.',
   pg_temp.h('2026-09-20 13:10'), '20000000-0000-4000-8000-000000000001');

insert into public.signalement_suivi (id, signalement_id, commentaire, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000011', '43000000-0000-4000-8000-000000000002',
   'Réglé avec le ministère, le champ attendait un nombre entier.',
   pg_temp.h('2026-09-22 10:00'), '20000000-0000-4000-8000-000000000031');          -- EJP Tech, compte 1
