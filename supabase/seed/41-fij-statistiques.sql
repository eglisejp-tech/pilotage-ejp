-- Jeu d'exemple du lot B5 (docs/plan-etape-4.md, section 3, « Jeux d'exemple ») : statistiques
-- FIJ par département de Coordo FIJ (ministère de code fij), local et CI seulement.
-- supabase db push ne l'applique pas sans --include-seed : ne jamais passer cette option.
--
-- Deux semaines des 4 rubriques (dates avant décalage) :
-- - semaine du dimanche 20 sept. : les 8 départements (« 8 dép. sur 8 »), puis une correction
--   du 93 pour les présents au culte EJP le lendemain (la dernière saisie fait foi : 11 puis 13) ;
-- - semaine du dimanche 27 sept., dimanche de référence : 6 départements, sans le 77 ni le 95
--   (« 6 dép. sur 8 »).
-- Totaux attendus : semaine du 20 sept., culte EJP 64, réunion FIJ 52, évangélisation 33,
-- membres du mardi 42 ; semaine du 27 sept., 58, 47, 27 et 40.
--
-- Insertion directe sous le rôle du jeu (forcer_auteur garde saisi_le et saisi_par), sans ligne
-- de journal : la fraîcheur du ministère FIJ que vérifient les tests de l'étape 3 ne bouge pas.
-- Ce fichier se suffit à lui-même : il redéfinit les aides de décalage de seed.sql et retrouve
-- le ministère par son code et le compte par son identifiant fixe.

create or replace function pg_temp.j(p_jour date) returns date
language sql stable as $$
  select p_jour + (private.dimanche_reference() - date '2026-09-27')
$$;

create or replace function pg_temp.h(p_heure timestamp) returns timestamptz
language sql stable as $$
  select (p_heure + (private.dimanche_reference() - date '2026-09-27') * interval '1 day') at time zone 'Europe/Paris'
$$;

insert into public.fij_statistique (ministere_id, rubrique, departement, dimanche, valeur, saisi_le, saisi_par)
select m.id, v.rubrique, v.departement, pg_temp.j(v.dimanche), v.valeur, pg_temp.h(v.saisi),
       '20000000-0000-4000-8000-000000000006'::uuid
from (values
    -- Semaine du 20 sept. : premier envoi, 32 valeurs
    ('culte_ejp', '75', 12, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '77', 6, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '78', 5, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '91', 7, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '92', 9, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '93', 11, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '94', 8, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('culte_ejp', '95', 4, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '75', 10, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '77', 5, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '78', 4, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '91', 6, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '92', 8, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '93', 9, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '94', 7, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('reunion_fij', '95', 3, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '75', 6, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '77', 2, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '78', 3, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '91', 4, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '92', 5, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '93', 7, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '94', 4, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('evangelisation', '95', 2, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '75', 8, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '77', 4, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '78', 3, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '91', 5, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '92', 6, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '93', 8, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '94', 5, date '2026-09-20', timestamp '2026-09-20 20:00'),
    ('membres_mardi', '95', 3, date '2026-09-20', timestamp '2026-09-20 20:00'),
    -- Semaine du 20 sept. : correction du lendemain, une valeur
    ('culte_ejp', '93', 13, date '2026-09-20', timestamp '2026-09-21 19:00'),
    -- Semaine du 27 sept. : 24 valeurs, sans le 77 ni le 95
    ('culte_ejp', '75', 13, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('culte_ejp', '78', 6, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('culte_ejp', '91', 8, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('culte_ejp', '92', 10, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('culte_ejp', '93', 12, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('culte_ejp', '94', 9, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('reunion_fij', '75', 11, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('reunion_fij', '78', 4, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('reunion_fij', '91', 7, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('reunion_fij', '92', 8, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('reunion_fij', '93', 10, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('reunion_fij', '94', 7, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('evangelisation', '75', 5, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('evangelisation', '78', 2, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('evangelisation', '91', 3, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('evangelisation', '92', 6, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('evangelisation', '93', 8, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('evangelisation', '94', 3, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('membres_mardi', '75', 9, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('membres_mardi', '78', 3, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('membres_mardi', '91', 6, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('membres_mardi', '92', 7, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('membres_mardi', '93', 9, date '2026-09-27', timestamp '2026-09-27 12:00'),
    ('membres_mardi', '94', 6, date '2026-09-27', timestamp '2026-09-27 12:00')
  ) as v(rubrique, departement, valeur, dimanche, saisi)
cross join public.ministere m
where m.code = 'fij';
