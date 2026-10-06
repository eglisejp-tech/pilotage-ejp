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
-- Insertion directe sous pilotage.migration, sans passer par signaler_difficulte ni
-- clore_signalement : aucune ligne de journal, pour que la fraîcheur de Communication et les
-- comptes du journal que vérifient les tests de l'étape 3 ne bougent pas (contrat de l'étape 4,
-- section 3). forcer_auteur garde saisi_le et saisi_par (rôle du jeu, sans compte connecté).
--
-- Ce fichier se suffit à lui-même : il redéfinit les aides de décalage de seed.sql et retrouve
-- le ministère et les comptes par leurs identifiants fixes.

create or replace function pg_temp.h(p_heure timestamp) returns timestamptz
language sql stable as $$
  select (p_heure + (private.dimanche_reference() - date '2026-09-27') * interval '1 day') at time zone 'Europe/Paris'
$$;

select set_config('pilotage.migration', 'oui', false);

insert into public.signalement (id, ministere_id, ecran, texte, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'saisie_evenement',
   'Le formulaire refuse la date de notre soirée de louange, alors qu''elle est bien à venir.',
   pg_temp.h('2026-09-25 18:40'), '20000000-0000-4000-8000-000000000001'),          -- Ministère Communication
  ('43000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'saisie_dimanche',
   'Le bouton Envoyer reste grisé après la saisie des STARs au service.',
   pg_temp.h('2026-09-20 13:10'), '20000000-0000-4000-8000-000000000001');

insert into public.signalement_suivi (id, signalement_id, commentaire, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000011', '43000000-0000-4000-8000-000000000002',
   'Réglé avec le ministère : le champ attendait un nombre entier.',
   pg_temp.h('2026-09-22 10:00'), '20000000-0000-4000-8000-000000000031');          -- EJP Tech, compte 1

select set_config('pilotage.migration', '', false);
