-- Valeurs attendues du jeu d'exemple (BRIEF, section 13) : seulement ce qui ne dépend pas du
-- jour, puisque le jeu est recalé pour que le 27 sept. 2026 soit le dimanche de référence.
-- Lecture par le berger en aal2, à travers les vues (RLS comprise).
begin;

select plan(26);

select tests.se_connecter(tests.compte('Berger'), 'aal2');

-- Contenu du jeu
select results_eq($$ select count(*)::int from public.ministere where desactive_le is null $$, $$ values (8) $$,
  '8 ministères actifs');
select results_eq($$ select count(*)::int from public.compte where desactive_le is null $$, $$ values (13) $$,
  '13 comptes : un par ministère, le berger, deux membres du conseil, l''administration, EJP Tech');
select results_eq($$ select count(*)::int from public.session $$, $$ values (8) $$, '8 sessions');
select results_eq($$ select count(*)::int from public.v_evenement $$, $$ values (11) $$, '11 événements');
select results_eq($$ select count(*)::int from public.reunion $$, $$ values (7) $$, '7 réunions');
select results_eq($$ select count(*) filter (where statut <> 'traite')::int, count(*) filter (where statut = 'traite')::int
                      from public.v_point $$,
  $$ values (6, 4) $$, '10 points d''attention : 6 ouverts, 4 traités');

-- STARs au service du dimanche de référence (27 sept.) : 52, 6 sur 8, écart +3 sur 6
select results_eq($$
  select t.total::int, t.nb_saisis::int, t.nb_attendus::int
    from public.v_total_dimanche t join public.indicateur i on i.id = t.indicateur_id
   where i.code = 'service' and t.dimanche = private.dimanche_reference()
$$, $$ values (52, 6, 8) $$, 'service du 27 sept. : 52, 6 sur 8');
select results_eq($$
  select e.ecart::int, e.nb_comparables::int
    from public.v_ecart_dimanche e join public.indicateur i on i.id = e.indicateur_id
   where i.code = 'service' and e.dimanche = private.dimanche_reference()
$$, $$ values (3, 6) $$, 'écart du service : +3 pour les 6 ministères qui ont saisi les deux fois');
select results_eq($$
  select t.total::int
    from public.v_total_dimanche t join public.indicateur i on i.id = t.indicateur_id
   where i.code = 'service' order by t.dimanche
$$, $$ values (52), (57), (53), (56), (54), (56), (50), (54), (55), (52) $$,
  'courbe du service : les 10 dimanches, du 26 juil. au 27 sept.');

-- STARs actifs : 83, 8 sur 8, une valeur de plus de 30 jours (Social, 27 août)
select results_eq($$
  select total::int, nb_saisis::int, nb_actifs::int, nb_plus_de_30_jours::int, plus_ancienne - private.dimanche_reference()
    from public.v_total_a_ce_jour where code = 'actifs'
$$, $$ values (83, 8, 8, 1, -31) $$, 'STARs actifs : 83, 8 sur 8, 1 valeur de plus de 30 jours (27 août)');

-- En FIJ : 64 sur 83, 77 %, 8 sur 8
select results_eq($$ select total::int, nb_saisis::int from public.v_total_a_ce_jour where code = 'en_fij' $$,
  $$ values (64, 8) $$, 'dont en FIJ : 64, 8 sur 8');
select results_eq($$ select en_fij::int, actifs::int, nb_ministeres::int, pourcentage::int from public.v_pourcentage_fij $$,
  $$ values (64, 83, 8, 77) $$, 'pourcentage FIJ : 64 sur 83 STARs actifs, 77 %, calculé sur 8 ministères');

-- Carte des FIJ : 29 FIJ, 8 départements
select results_eq($$ select sum(valeur)::int, count(*)::int from public.v_carte_fij $$, $$ values (29, 8) $$,
  'carte des FIJ : 29 au total, 8 départements');

-- Bâtir l'Église du 26 sept. : 58, 6 sur 8, manquent Coordination et Intégration, écart +1 sur 6
select results_eq($$
  select c.total::int, c.nb_saisis::int, c.nb_attendus::int, c.manquants
    from public.v_session_completude c
   where c.type = 'batir' and c.date = private.dimanche_reference() - 1
$$, $$ values (58, 6, 8, array['Coordination', 'Intégration']) $$,
  'Bâtir l''Église du 26 sept. : 58, 6 sur 8, manquent Coordination et Intégration');
select results_eq($$
  select e.ecart::int, e.nb_comparables::int
    from public.v_ecart_session e join public.session s on s.id = e.session_id
   where s.type = 'batir' and s.date = private.dimanche_reference() - 1
$$, $$ values (1, 6) $$, 'écart de Bâtir l''Église : +1 sur 6 ministères');

-- Anti-Dispersion du 19 sept. : 61, 8 sur 8, écart +2 sur 8
select results_eq($$
  select c.total::int, c.nb_saisis::int, c.nb_attendus::int, cardinality(c.manquants)
    from public.v_session_completude c
   where c.type = 'anti_dispersion' and c.date = private.dimanche_reference() - 8
$$, $$ values (61, 8, 8, 0) $$, 'Anti-Dispersion du 19 sept. : 61, 8 sur 8');
select results_eq($$
  select e.ecart::int, e.nb_comparables::int
    from public.v_ecart_session e join public.session s on s.id = e.session_id
   where s.type = 'anti_dispersion' and s.date = private.dimanche_reference() - 8
$$, $$ values (2, 8) $$, 'écart d''Anti-Dispersion : +2 sur 8 ministères');

-- « À décider » : les trois premiers points ouverts
select results_eq($$
  select titre from public.v_point where statut <> 'traite'
   order by (statut = 'attente_decision') desc, priorite desc, echeance asc nulls last, cree_le asc
   limit 3
$$, $$ values ('Financement de Welcome Prodiges'), ('Planning du trimestre à valider'), ('Salle pour la soirée de louange') $$,
  '« À décider » : Financement de Welcome Prodiges, Planning du trimestre à valider, Salle pour la soirée de louange');

-- Tableau des ministères (berger) : prochain événement, prochaine réunion, point ouvert
select results_eq($$
  select prochain_evenement_titre, point_ouvert_priorite::text
    from public.v_tableau_ministeres where nom = 'Intégration'
$$, $$ values ('Welcome Prodiges', 'urgente') $$, 'Intégration : prochain événement Welcome Prodiges, point ouvert urgent');
select results_eq($$
  select prochaine_reunion_date - private.dimanche_reference(), prochaine_reunion_heure, point_ouvert_priorite::text
    from public.v_tableau_ministeres where nom = 'Communication'
$$, $$ values (8, time '19:30', 'haute') $$, 'Communication : réunion le lundi 5 oct. à 19 h 30, point ouvert haut');
select results_eq($$ select point_ouvert_priorite::text from public.v_tableau_ministeres where nom = 'Social' $$,
  $$ values (null::text) $$, 'Social : aucun point ouvert (son point est traité)');

-- Journal : une ligne par envoi, jamais de texte libre
select results_eq($$
  select count(*)::int from public.journal j
   where j.action = 'mesure_saisie' and j.ministere_id = (select m.id from public.ministere m where m.nom = 'Communication')
$$, $$ values (11) $$, 'Communication : 11 envois de chiffres (10 dimanches, puis actifs, FIJ et visuels)');
select results_eq($$ select count(*)::int, max((detail ->> 'total')::int) from public.journal where action = 'fij_saisie' $$,
  $$ values (1, 29) $$, 'la carte des FIJ donne une ligne de journal, 29 au total');
select results_eq($$
  select count(*) filter (where action = 'evenement_ajoute')::int, count(*) filter (where action = 'evenement_modifie')::int
    from public.journal
$$, $$ values (11, 4) $$, '11 événements ajoutés, 4 mises à jour');

-- Modération : un point de Social masqué, un point de Coordination relu
select results_eq($$
  select p.description from public.point_attention p where p.titre = 'Lieu de stockage de la collecte'
$$, $$ values ('[texte masqué par EJP Tech]') $$, 'le point de Social est masqué');
select tests.deconnecter();

select results_eq($$ select decision, motif from public.moderation order by le $$,
  $$ values ('rien_a_signaler', null), ('masque', 'nom_personne') $$,
  'modération : un point relu, un point masqué (nom d''une personne)');

select * from finish();
rollback;
