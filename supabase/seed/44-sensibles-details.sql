-- Jeu d'exemple du lot B8 (docs/plan-etape-4.md, section 3, « Jeux d'exemple ») : catégories,
-- répartitions et précision de l'indicateur sensible de Social, local et CI seulement.
-- supabase db push ne l'applique pas sans --include-seed : ne jamais passer cette option.
--
-- - Catégories d'exemple de « Bénéficiaires (passages) » (social_beneficiaires_passages) :
--   « Malaise », « Blessure », « Autre ». Jeu d'exemple seulement, jamais en production : les
--   listes de la coordination arriveront chacune par une migration.
-- - Le mois à 6 de seed/40 (quatre mois avant le mois en cours) est réparti 4, 2 et 0, sans
--   rien de non réparti : le berger lit « Malaise : masqué », « Blessure : moins de 3 »,
--   « Autre : 0 » et « Non réparti : 0 » ; Social lit les valeurs exactes.
-- - Le mois en cours (P45, calculé par private.mois_courant(), jamais écrit en dur) reçoit un
--   total de 7, réparti 4, 3 et 0 (aucun petit nombre : tout s'affiche), avec une précision sans
--   donnée personnelle.
--
-- Insertion directe sous le rôle du jeu, comme saisir_chiffres_mois l'écrirait (forcer_auteur
-- garde saisi_le et saisi_par), sans aucune ligne de journal : le trigger de journal de mesure
-- est suspendu le temps de l'ajout, pour que la fraîcheur de Social et les comptes du journal
-- que vérifient les tests ne bougent pas. Les catégories s'écrivent sous pilotage.migration,
-- comme une migration. Tout se fait dans un seul bloc, donc une seule transaction.
-- Ce fichier se suffit à lui-même : il retrouve le ministère et le compte par leurs identifiants
-- fixes, et l'indicateur par son code de catalogue.

do $$
declare
  v_ministere constant uuid := '10000000-0000-4000-8000-000000000005';
  v_compte constant uuid := '20000000-0000-4000-8000-000000000005';
  v_indicateur uuid;
  v_ancien bigint;
  v_courant bigint;
  v_saisi timestamptz := now() - interval '1 hour';
begin
  select i.id into v_indicateur from public.indicateur i
   where i.ministere_id = v_ministere and i.modele_code = 'social_beneficiaires_passages';

  perform set_config('pilotage.migration', 'oui', true);
  insert into public.categorie_sensible (prevu_code, code, libelle, ordre) values
    ('social_beneficiaires_passages', 'malaise', 'Malaise', 1),
    ('social_beneficiaires_passages', 'blessure', 'Blessure', 2),
    ('social_beneficiaires_passages', 'autre', 'Autre', 3);
  perform set_config('pilotage.migration', '', true);

  -- Mois à 6 de seed/40 : sa ligne de mesure existe déjà.
  select m.id into v_ancien from public.mesure m
   where m.indicateur_id = v_indicateur
     and m.date_ref = (private.mois_courant() - interval '4 months')::date;

  insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur,
                                           saisi_le, saisi_par)
  select m.id, m.indicateur_id, m.ministere_id, m.date_ref, v.categorie, v.valeur, m.saisi_le, m.saisi_par
    from public.mesure m
   cross join (values ('malaise', 4), ('blessure', 2), ('autre', 0)) as v(categorie, valeur)
   where m.id = v_ancien;

  -- Mois en cours : un total de 7, sans ligne de journal.
  alter table public.mesure disable trigger journal_mesure;
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
  values (v_indicateur, v_ministere, private.mois_courant(), 7, v_saisi, v_compte)
  returning id into v_courant;
  alter table public.mesure enable trigger journal_mesure;

  insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur,
                                           saisi_le, saisi_par)
  select v_courant, v_indicateur, v_ministere, private.mois_courant(), v.categorie, v.valeur, v_saisi, v_compte
    from (values ('malaise', 4), ('blessure', 3), ('autre', 0)) as v(categorie, valeur);

  insert into public.precision_sensible (mesure_id, indicateur_id, ministere_id, mois, texte, saisi_le, saisi_par)
  values (v_courant, v_indicateur, v_ministere, private.mois_courant(),
          'Plus de passages pendant la collecte de rentrée, tous orientés vers les bonnes permanences.',
          v_saisi, v_compte);
end $$;
