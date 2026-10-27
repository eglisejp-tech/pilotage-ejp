-- Jeu d'exemple de l'étape 4, lot B7 : deux signalements de Communication (T39), local et CI
-- seulement, chargé après seed.sql (supabase/config.toml). supabase db push ne l'applique pas
-- sans --include-seed : ne jamais passer cette option.
--
-- - Un signalement ouvert sur la saisie d'un événement (saisie_evenement), envoyé le vendredi
--   25 sept. ;
-- - un signalement sur la saisie du dimanche (saisie_dimanche), envoyé le dimanche 20 sept., clos
--   par EJP Tech le mardi 22 sept. avec un commentaire.
-- Suivi (T77), datés par rapport à aujourd'hui (midi, heure de Paris), un signalement par statut
-- pour d'autres ministères que Communication et Coordination (que les parcours vérifient) :
-- Jeunesse, Répondu il y a 2 jours ; Social, En cours après sa réponse d'hier, et un autre
-- confirmé ; Prodiges Junior, Répondu il y a 7 jours (encore ouvert, dernier jour), et un autre
-- pris en charge hier (En cours) ; EJP Formation, Répondu il y a 8 jours (clos par le calcul,
-- sans retour). Aucun ministère sans compte actif ici : un compte désactivé changerait les
-- comptes que lisent les autres tests ; le cas est dans signalements-suivi.test.sql.
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

insert into public.signalement_suivi (id, signalement_id, etape, commentaire, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000011', '43000000-0000-4000-8000-000000000002', 'clos',
   'Réglé avec le ministère, le champ attendait un nombre entier.',
   pg_temp.h('2026-09-22 10:00'), '20000000-0000-4000-8000-000000000031');          -- EJP Tech, compte 1

-- Suivi (T77). Midi, heure de Paris, il y a p_jours jours de Paris.
create or replace function pg_temp.midi(p_jours int) returns timestamptz
language sql stable as $$
  select ((private.aujourdhui() - p_jours)::timestamp + time '12:00') at time zone 'Europe/Paris'
$$;

insert into public.signalement (id, ministere_id, ecran, texte, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000004', 'saisie_reunion',
   'La prochaine réunion ne s''enregistre pas avec une heure du soir.',
   pg_temp.midi(3), '20000000-0000-4000-8000-000000000004'),                         -- Ministère Jeunesse
  ('43000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000005', 'saisie_session',
   'La session de samedi n''apparaît pas dans la liste des sessions à saisir.',
   pg_temp.midi(6), '20000000-0000-4000-8000-000000000005'),                         -- Ministère Social
  ('43000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000005', 'saisie_mois',
   'Le mois dernier ne se propose plus dans la liste des mois.',
   pg_temp.midi(12), '20000000-0000-4000-8000-000000000005'),
  ('43000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000007', 'saisie_dimanche',
   'Le chiffre des enfants accueillis refuse le zéro.',
   pg_temp.midi(9), '20000000-0000-4000-8000-000000000007'),                         -- Ministère Prodiges Junior
  ('43000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000008', 'autre',
   'Le lien vers la fiche ne s''ouvre pas depuis le téléphone.',
   pg_temp.midi(10), '20000000-0000-4000-8000-000000000008'),                        -- Ministère EJP Formation
  ('43000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000007', 'saisie_reunion',
   'La prochaine réunion du mois ne se propose pas.',
   pg_temp.midi(2), '20000000-0000-4000-8000-000000000007');

-- Une ligne par étape, dans l'ordre (ordre est tiré à l'ajout) : une instruction par étape.
insert into public.signalement_suivi (id, signalement_id, etape, commentaire, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000031', '43000000-0000-4000-8000-000000000021', 'en_cours', null,
   pg_temp.midi(2), '20000000-0000-4000-8000-000000000031'),
  ('43000000-0000-4000-8000-000000000033', '43000000-0000-4000-8000-000000000022', 'reponse',
   'Quelle session, et à quelle date ?', pg_temp.midi(5), '20000000-0000-4000-8000-000000000031'),
  ('43000000-0000-4000-8000-000000000035', '43000000-0000-4000-8000-000000000023', 'reponse',
   'Corrigé : le mois dernier se propose de nouveau.', pg_temp.midi(11), '20000000-0000-4000-8000-000000000031'),
  ('43000000-0000-4000-8000-000000000037', '43000000-0000-4000-8000-000000000024', 'reponse',
   'Corrigé : le zéro est de nouveau accepté. Dites-nous si c''est réglé.', pg_temp.midi(7),
   '20000000-0000-4000-8000-000000000031'),
  ('43000000-0000-4000-8000-000000000038', '43000000-0000-4000-8000-000000000025', 'reponse',
   'Le lien s''ouvre de nouveau. Dites-nous si c''est réglé.', pg_temp.midi(8),
   '20000000-0000-4000-8000-000000000031'),
  ('43000000-0000-4000-8000-000000000039', '43000000-0000-4000-8000-000000000026', 'en_cours', null,
   pg_temp.midi(1), '20000000-0000-4000-8000-000000000031');
insert into public.signalement_suivi (id, signalement_id, etape, commentaire, saisi_le, saisi_par) values
  ('43000000-0000-4000-8000-000000000032', '43000000-0000-4000-8000-000000000021', 'reponse',
   'Quelle heure avez-vous choisie, et quel message s''affiche ?', pg_temp.midi(2),
   '20000000-0000-4000-8000-000000000031'),
  ('43000000-0000-4000-8000-000000000034', '43000000-0000-4000-8000-000000000022', 'reponse_ministere',
   'La session du samedi soir, celle de la louange.', pg_temp.midi(1), '20000000-0000-4000-8000-000000000005'),
  ('43000000-0000-4000-8000-000000000036', '43000000-0000-4000-8000-000000000023', 'regle', null,
   pg_temp.midi(10), '20000000-0000-4000-8000-000000000005');
