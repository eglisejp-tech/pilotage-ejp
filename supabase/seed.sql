-- Jeu d'exemple de l'étape 1 (BRIEF, section 13) : local et CI seulement.
-- supabase db push ne l'applique pas sans --include-seed : ne jamais passer cette option.
--
-- Données du prototype (docs/reference/prototype.html, générateur de graine 7) et des
-- maquettes. Les lignes du journal du prototype deviennent de vraies saisies ; les triggers
-- écrivent le journal des saisies directes, ce fichier écrit celui des actions faites
-- d'ordinaire par les fonctions de l'API et les Edge Functions.
-- Chaque ligne porte saisi_le (heure de Paris) et saisi_par explicites ; les lignes d'un même
-- envoi partagent saisi_le. Toutes les dates sont décalées d'un nombre entier de semaines,
-- calculé au chargement, pour que le dimanche 27 sept. 2026 devienne
-- private.dimanche_reference() : le jeu reste actuel et les tests ne vieillissent pas.
-- Valeurs attendues (dates avant décalage) : BRIEF, section 13, et supabase/tests/calculs.test.sql.

-- Décalage des dates et des heures (heure de Paris)

create function pg_temp.j(p_jour date) returns date
language sql stable as $$
  select p_jour + (private.dimanche_reference() - date '2026-09-27')
$$;

create function pg_temp.h(p_heure timestamp) returns timestamptz
language sql stable as $$
  select (p_heure + (private.dimanche_reference() - date '2026-09-27') * interval '1 day') at time zone 'Europe/Paris'
$$;

-- Ministères et comptes (identifiants fixes, adresses en @exemple.test)

create temp table graine_ministere (
  code text primary key,
  ordre integer not null,
  ministere uuid not null,
  compte uuid not null,
  nom text not null,
  description text not null,
  email text not null
);

insert into graine_ministere (code, ordre, ministere, compte, nom, description, email) values
  ('com', 1, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'Communication', 'Visuels, réseaux sociaux, annonces du dimanche.', 'communication@exemple.test'),
  ('int', 2, '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002',
   'Intégration', 'Accueil des nouveaux et suivi jusqu''à la FIJ.', 'integration@exemple.test'),
  ('coo', 3, '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003',
   'Coordination', 'Planning général, salles, logistique des événements.', 'coordination@exemple.test'),
  ('jeu', 4, '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004',
   'Jeunesse', 'Activités et sorties des jeunes.', 'jeunesse@exemple.test'),
  ('soc', 5, '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005',
   'Social', 'Entraide, collectes, accompagnement matériel.', 'social@exemple.test'),
  ('fij', 6, (select m.id from public.ministere m where m.code = 'fij'), '20000000-0000-4000-8000-000000000006',
   'FIJ', 'Familles d''impact jeunesse et pilotes.', 'fij@exemple.test'),
  ('pju', 7, '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007',
   'Prodiges Junior', 'Accueil des enfants le dimanche.', 'junior@exemple.test'),
  ('for', 8, '10000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000008',
   'EJP Formation', 'Parcours « Mes premiers pas avec Jésus ».', 'formation@exemple.test');

create temp table graine_compte (
  code text primary key,
  compte uuid not null,
  type public.type_compte not null,
  ministere uuid,
  libelle text not null,
  email text not null
);

insert into graine_compte (code, compte, type, ministere, libelle, email)
select g.code, g.compte, 'ministere', g.ministere, 'Ministère ' || g.nom, g.email
from graine_ministere g;

insert into graine_compte (code, compte, type, ministere, libelle, email) values
  ('berger', '20000000-0000-4000-8000-000000000011', 'berger', null, 'Berger', 'berger@exemple.test'),
  ('conseil1', '20000000-0000-4000-8000-000000000012', 'conseil', null, 'Conseil, compte 1', 'conseil1@exemple.test'),
  ('conseil3', '20000000-0000-4000-8000-000000000013', 'conseil', null, 'Conseil, compte 3', 'conseil3@exemple.test'),
  ('admin', '20000000-0000-4000-8000-000000000021', 'admin_eglise', null, 'Administration de l''église', 'administration@exemple.test'),
  ('ejptech', '20000000-0000-4000-8000-000000000031', 'admin_plateforme', null, 'EJP Tech, compte 1', 'ejptech1@exemple.test');

-- Le ministère FIJ vient de la migration des données de référence : on lui donne sa
-- description et une date de création antérieure aux saisies.
insert into public.ministere (id, nom, description, cree_le)
select g.ministere, g.nom, g.description, pg_temp.h(timestamp '2026-06-01 09:00')
from graine_ministere g
where g.code <> 'fij';

update public.ministere m
   set description = g.description, cree_le = pg_temp.h(timestamp '2026-06-01 09:00')
  from graine_ministere g
 where g.code = 'fij' and m.id = g.ministere;

-- Utilisateurs Auth : colonnes minimales, plus les jetons vides que GoTrue lit comme du texte
-- (l'étape 2 leur donne un mot de passe et un facteur TOTP par l'API d'administration).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', c.compte, 'authenticated', 'authenticated', c.email,
       pg_temp.h(timestamp '2026-06-01 10:00'), '{"provider": "email", "providers": ["email"]}', '{}',
       pg_temp.h(timestamp '2026-06-01 09:30'), pg_temp.h(timestamp '2026-06-01 09:30'), '', '', '', ''
from graine_compte c;

insert into public.compte (user_id, type, ministere_id, libelle, cree_le)
select c.compte, c.type, c.ministere, c.libelle, pg_temp.h(timestamp '2026-06-01 09:30')
from graine_compte c;

-- Journal des comptes : le compte de l'administration est amorcé par EJP Tech (compte nul,
-- « Système ») ; l'administration crée ensuite les ministères et les autres comptes.
insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select pg_temp.h(timestamp '2026-06-01 09:05'), null, null, 'compte_cree', 'compte', c.compte,
       jsonb_build_object('type', c.type)
from graine_compte c
where c.code = 'admin'
union all
select pg_temp.h(timestamp '2026-06-01 09:10'), a.compte, g.ministere, 'ministere_cree', 'ministere', g.ministere,
       '{}'::jsonb
from graine_ministere g
cross join graine_compte a
where a.code = 'admin' and g.code <> 'fij'
union all
select pg_temp.h(timestamp '2026-06-01 09:30'), a.compte, c.ministere, 'compte_cree', 'compte', c.compte,
       jsonb_build_object('type', c.type)
from graine_compte c
cross join graine_compte a
where a.code = 'admin' and c.code <> 'admin';

-- Indicateur propre des maquettes (Communication)
insert into public.indicateur (libelle, nature, ministere_id, ordre)
select 'Visuels livrés ce mois', 'a_ce_jour', g.ministere, 10
from graine_ministere g
where g.code = 'com';

-- Chiffres : une seule instruction, pour que le trigger écrive une ligne de journal par envoi
-- (même compte, même ministère, même heure).
-- STARs au service : 10 dimanches, du 26 juillet au 27 septembre, dans l'ordre.
-- STARs actifs et dont en FIJ : un envoi à la date indiquée.
-- Visuels livrés ce mois : envoyés avec les chiffres du jour.
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select i.id, g.ministere, pg_temp.j(v.dimanche), v.valeur, pg_temp.h(v.dimanche + time '13:10'), g.compte
from (values
    ('com', array[8, 11, 9, 9, 10, 10, 9, 11, 11, 10]),
    ('int', array[8, 8, 8, 7, 7, 8, 8, 7, 9, 8]),
    ('coo', array[5, 5, 3, 5, 6, 5, 5, 5, 6, null]),
    ('jeu', array[9, 8, 8, 10, 8, 8, 8, 9, 8, 11]),
    ('soc', array[5, 6, 7, 4, 5, 6, null, null, null, null]),
    ('fij', array[6, 6, 5, 8, 5, 6, 6, 7, 8, 7]),
    ('pju', array[6, 7, 7, 7, 7, 7, 8, 8, 7, 9]),
    ('for', array[5, 6, 6, 6, 6, 6, 6, 7, 6, 7])
  ) as s(code, valeurs)
cross join lateral (
  select x.valeur, date '2026-07-26' + 7 * (x.rang::integer - 1) as dimanche
  from unnest(s.valeurs) with ordinality as x(valeur, rang)
) as v
join graine_ministere g on g.code = s.code
join public.indicateur i on i.code = 'service'
where v.valeur is not null
union all
select i.id, g.ministere, pg_temp.j(a.jour), v.valeur, pg_temp.h(a.jour + time '20:00'), g.compte
from (values
    ('com', date '2026-09-24', 14, 11),
    ('int', date '2026-09-24', 12, 9),
    ('coo', date '2026-09-18', 6, 5),
    ('jeu', date '2026-09-24', 13, 10),
    ('soc', date '2026-08-27', 9, 6),
    ('fij', date '2026-09-24', 10, 10),
    ('pju', date '2026-09-24', 11, 7),
    ('for', date '2026-09-24', 8, 6)
  ) as a(code, jour, actifs, en_fij)
cross join lateral (values ('actifs', a.actifs), ('en_fij', a.en_fij)) as v(code, valeur)
join graine_ministere g on g.code = a.code
join public.indicateur i on i.code = v.code
union all
select i.id, g.ministere, pg_temp.j(v.jour), v.valeur, pg_temp.h(v.jour + v.heure), g.compte
from (values
    (date '2026-08-30', time '13:10', 7),
    (date '2026-09-13', time '13:10', 3),
    (date '2026-09-24', time '20:00', 6)
  ) as v(jour, heure, valeur)
join graine_ministere g on g.code = 'com'
join public.indicateur i on i.ministere_id = g.ministere and i.libelle = 'Visuels livrés ce mois';

-- Carte des FIJ : les 8 départements en un envoi, le 21 septembre (29 au total).
insert into public.fij_departement (ministere_id, departement, valeur, saisi_le, saisi_par)
select g.ministere, d.departement, d.valeur, pg_temp.h(timestamp '2026-09-21 20:30'), g.compte
from (values ('75', 4), ('77', 3), ('78', 2), ('91', 3), ('92', 5), ('93', 6), ('94', 4), ('95', 2))
  as d(departement, valeur)
join graine_ministere g on g.code = 'fij';

-- Sessions : déclarées par l'administration deux semaines avant, les 8 ministères attendus.
-- Valeurs des présences dans l'ordre des ministères (graine_ministere.ordre) ; null = pas de
-- saisie. deja_comptes vaut 0 : le double comptage se teste par des jeux ciblés.
create temp table graine_session (
  id uuid primary key default gen_random_uuid(),
  type public.type_session not null,
  jour date not null,
  valeurs integer[] not null
);

insert into graine_session (type, jour, valeurs) values
  ('batir', '2026-06-20', array[10, 8, 5, 11, 6, 10, 8, 5]),
  ('batir', '2026-07-18', array[11, 8, 5, 11, 6, 11, 7, 7]),
  ('batir', '2026-08-29', array[10, 9, 6, 11, 8, 11, 9, 8]),
  ('batir', '2026-09-26', array[13, null, null, 13, 7, 10, 8, 7]),
  ('anti_dispersion', '2026-06-27', array[7, 7, 4, 9, 5, 8, 5, 5]),
  ('anti_dispersion', '2026-07-25', array[8, 7, 5, 9, 5, 7, 7, 5]),
  ('anti_dispersion', '2026-08-22', array[10, 7, 6, 9, 7, 8, 7, 5]),
  ('anti_dispersion', '2026-09-19', array[9, 7, 6, 10, 7, 9, 7, 6]);

insert into public.session (id, type, date, saisi_le, saisi_par)
select s.id, s.type, pg_temp.j(s.jour), pg_temp.h((s.jour - 14) + time '20:15'), a.compte
from graine_session s
cross join graine_compte a
where a.code = 'admin';

insert into public.session_attendu (session_id, ministere_id)
select s.id, g.ministere
from graine_session s
cross join graine_ministere g;

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select pg_temp.h((s.jour - 14) + time '20:15'), a.compte, null, 'session_declaree', 'session', s.id,
       jsonb_build_object('type', s.type, 'date', pg_temp.j(s.jour), 'attendus', 8)
from graine_session s
cross join graine_compte a
where a.code = 'admin';

insert into public.participation (session_id, ministere_id, valeur, deja_comptes, saisi_le, saisi_par)
select s.id, g.ministere, x.valeur, 0, pg_temp.h((s.jour + 1) + time '18:30'), g.compte
from graine_session s
cross join lateral unnest(s.valeurs) with ordinality as x(valeur, rang)
join graine_ministere g on g.ordre = x.rang
where x.valeur is not null;

-- Événements : création (premier état), puis mises à jour dans un envoi suivant.
create temp table graine_evenement (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  titre text not null,
  cree timestamp not null,
  jour date not null,
  statut public.statut_evenement not null,
  maj timestamp,
  statut_maj public.statut_evenement
);

insert into graine_evenement (code, titre, cree, jour, statut, maj, statut_maj) values
  ('int', 'Welcome Prodiges', '2026-09-10 20:00', '2026-10-15', 'brouillon', '2026-09-24 20:30', 'preparation'),
  ('int', 'Parcours d''accueil, session 4', '2026-09-17 20:05', '2026-10-25', 'valide', null, null),
  ('com', 'Soirée de louange', '2026-09-13 13:30', '2026-10-10', 'brouillon', '2026-09-22 21:25', 'attente_validation'),
  ('com', 'Photos des équipes', '2026-09-20 13:20', '2026-10-18', 'brouillon', null, null),
  ('jeu', 'Sortie jeunesse', '2026-09-06 13:30', '2026-10-17', 'attente_validation', '2026-09-20 13:35', 'preparation'),
  ('coo', 'Planning du trimestre', '2026-09-15 20:10', '2026-10-03', 'valide', null, null),
  ('soc', 'Collecte d''hiver', '2026-08-30 13:20', '2026-11-14', 'brouillon', null, null),
  ('fij', 'Rencontre des pilotes', '2026-09-21 20:40', '2026-10-08', 'valide', null, null),
  ('pju', 'Fête des Prodiges Junior', '2026-09-13 13:40', '2026-11-22', 'preparation', null, null),
  ('for', 'Remise des certificats', '2026-08-23 13:30', '2026-09-13', 'valide', '2026-09-13 18:00', 'termine'),
  ('for', 'Nouvelle promotion', '2026-09-20 13:25', '2026-10-04', 'valide', null, null);

insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
select e.id, g.ministere, e.titre, pg_temp.h(e.cree), g.compte
from graine_evenement e
join graine_ministere g on g.code = e.code;

insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select e.id, pg_temp.j(e.jour), e.statut, pg_temp.h(e.cree), g.compte
from graine_evenement e
join graine_ministere g on g.code = e.code;

insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
select e.id, pg_temp.j(e.jour), e.statut_maj, pg_temp.h(e.maj), g.compte
from graine_evenement e
join graine_ministere g on g.code = e.code
where e.maj is not null;

-- Prochaines réunions (Social n'en a pas déclaré).
insert into public.reunion (ministere_id, date, heure, objet, decision_attendue, saisi_le, saisi_par)
select g.ministere, pg_temp.j(r.jour), r.heure, r.objet, r.decision, pg_temp.h(r.saisi), g.compte
from (values
    ('int', date '2026-10-02', time '20:00', 'Préparation de Welcome Prodiges', 'Validation du budget',
     timestamp '2026-09-29 21:12'),
    ('com', date '2026-10-05', time '19:30', 'Calendrier éditorial d''octobre', null, timestamp '2026-09-27 13:15'),
    ('coo', date '2026-10-06', time '20:00', 'Répartition des salles', 'Arbitrage des créneaux du samedi',
     timestamp '2026-09-28 22:15'),
    ('jeu', date '2026-10-09', time '19:00', 'Sortie du 17 octobre', null, timestamp '2026-09-27 18:10'),
    ('fij', date '2026-10-08', time '20:30', 'Point pilotes', null, timestamp '2026-09-21 20:45'),
    ('pju', date '2026-10-12', time '19:00', 'Supports du trimestre', null, timestamp '2026-09-27 13:20'),
    ('for', date '2026-10-01', time '20:00', 'Bilan de la promotion', null, timestamp '2026-09-20 13:30')
  ) as r(code, jour, heure, objet, decision, saisi)
join graine_ministere g on g.code = r.code;

-- Points d'attention (union du prototype et des maquettes). La description du point de
-- Social a été masquée par EJP Tech (motif « nom d'une personne ») : elle est stockée masquée.
create temp table graine_point (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  titre text not null unique,
  description text,
  action text,
  priorite public.priorite not null,
  echeance date,
  cree timestamp not null,
  mentions text[] not null
);

insert into graine_point (code, titre, description, action, priorite, echeance, cree, mentions) values
  ('int', 'Financement de Welcome Prodiges',
   'Budget nécessaire pour l''accueil du 15 octobre (collation, supports imprimés).',
   'Décision du conseil sur le budget', 'urgente', '2026-10-05', '2026-09-24 20:40', '{}'),
  ('coo', 'Planning du trimestre à valider',
   'Les dates d''octobre à décembre doivent être arrêtées avant la réunion.',
   'Valider les dates du trimestre', 'haute', '2026-09-28', '2026-09-28 22:10', '{}'),
  ('com', 'Salle pour la soirée de louange',
   'La salle du 10 octobre n''est pas encore confirmée.',
   'Confirmer la salle', 'haute', '2026-10-03', '2026-09-22 21:30', '{coo}'),
  ('jeu', 'Renfort de 4 STARs pour la sortie',
   'Il manque 4 accompagnateurs pour la sortie du 17 octobre.',
   'Trouver des volontaires', 'normale', '2026-10-10', '2026-09-27 18:04', '{soc}'),
  ('int', 'Visuels pour Welcome Prodiges',
   'Affiche et flyer de l''accueil du 15 octobre.',
   'Livrer les visuels', 'normale', '2026-10-08', '2026-09-29 18:03', '{com}'),
  ('pju', 'Réimpression des supports',
   'Les livrets du trimestre sont épuisés.',
   'Passer la commande', 'normale', '2026-10-11', '2026-09-20 13:40', '{}'),
  ('com', 'Micros pour Bâtir l''Église',
   'Deux micros sans fil ne fonctionnent plus.',
   'Remplacer les micros', 'haute', '2026-09-26', '2026-09-20 21:00', '{}'),
  ('pju', 'Transport des Prodiges Junior',
   'Il manque un moyen de transport pour la sortie des enfants.',
   'Trouver une solution de transport', 'normale', '2026-09-27', '2026-09-13 14:00', '{}'),
  ('coo', 'Clés de la salle annexe',
   'Le double des clés de la salle annexe est introuvable.',
   'Faire refaire un double', 'normale', '2026-09-20', '2026-09-15 20:00', '{}'),
  ('soc', 'Lieu de stockage de la collecte',
   '[texte masqué par EJP Tech]',
   null, 'normale', '2026-09-15', '2026-09-06 14:00', '{coo}');

-- Changements de statut et traitements, après la création (chaque point naît « À traiter »).
-- Un compte de ministère écrit toujours un commentaire ; le berger n'en écrit pas ici.
create temp table graine_suivi (
  titre text not null,
  statut public.statut_point not null,
  commentaire text,
  par text not null,
  quand timestamp not null
);

insert into graine_suivi (titre, statut, commentaire, par, quand) values
  ('Financement de Welcome Prodiges', 'attente_decision', null, 'int', '2026-09-27 13:30'),
  ('Salle pour la soirée de louange', 'en_cours', null, 'coo', '2026-09-25 19:00'),
  ('Réimpression des supports', 'en_cours', null, 'pju', '2026-09-23 20:00'),
  ('Micros pour Bâtir l''Église', 'traite', null, 'berger', '2026-09-30 09:12'),
  ('Transport des Prodiges Junior', 'traite',
   'Deux véhicules de l''église assurent le transport jusqu''à fin octobre.', 'conseil3', '2026-09-26 10:30'),
  ('Clés de la salle annexe', 'traite',
   'Un nouveau double a été fait et rangé au secrétariat.', 'coo', '2026-09-21 19:20'),
  ('Lieu de stockage de la collecte', 'traite', null, 'berger', '2026-09-14 11:30');

insert into public.point_attention (id, ministere_id, titre, description, action_attendue, priorite, echeance,
  saisi_le, saisi_par)
select p.id, g.ministere, p.titre, p.description, p.action, p.priorite, pg_temp.j(p.echeance), pg_temp.h(p.cree),
       g.compte
from graine_point p
join graine_ministere g on g.code = p.code;

insert into public.point_mention (point_id, ministere_id)
select p.id, g.ministere
from graine_point p
cross join lateral unnest(p.mentions) as m(code)
join graine_ministere g on g.code = m.code;

insert into public.point_suivi (point_id, statut, commentaire, saisi_le, saisi_par)
select p.id, 'a_traiter', null, pg_temp.h(p.cree), g.compte
from graine_point p
join graine_ministere g on g.code = p.code
union all
select p.id, s.statut, s.commentaire, pg_temp.h(s.quand), c.compte
from graine_suivi s
join graine_point p on p.titre = s.titre
join graine_compte c on c.code = s.par;

-- Journal des points (écrit d'ordinaire par creer_point, changer_statut_point et
-- marquer_traite) : ministère concerné = ministère créateur, quel que soit l'auteur.
insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select pg_temp.h(p.cree), g.compte, g.ministere, 'point_cree', 'point_attention', p.id,
       jsonb_build_object('priorite', p.priorite, 'mentions',
         coalesce((select jsonb_agg(m.ministere order by m.ministere)
                     from graine_ministere m
                    where m.code = any (p.mentions)), '[]'::jsonb))
from graine_point p
join graine_ministere g on g.code = p.code
union all
select pg_temp.h(s.quand), c.compte, g.ministere,
       case when s.statut = 'traite' then 'point_traite' else 'point_statut' end,
       'point_attention', p.id,
       case when s.statut = 'traite' then jsonb_build_object('avec_commentaire', s.commentaire is not null)
            else jsonb_build_object('statut', jsonb_build_array('a_traiter'::public.statut_point, s.statut)) end
from graine_suivi s
join graine_point p on p.titre = s.titre
join graine_ministere g on g.code = p.code
join graine_compte c on c.code = s.par;

-- Modération : le point de Social masqué, le point de Coordination relu.
insert into public.moderation (cible, cible_id, champ, decision, motif, par, le)
select 'point_attention', p.id, 'description', 'masque', 'nom_personne', c.compte,
       pg_temp.h(timestamp '2026-09-29 21:47')
from graine_point p
cross join graine_compte c
where p.titre = 'Lieu de stockage de la collecte' and c.code = 'ejptech'
union all
select 'point_attention', p.id, null, 'rien_a_signaler', null, c.compte,
       pg_temp.h(timestamp '2026-09-29 21:45')
from graine_point p
cross join graine_compte c
where p.titre = 'Planning du trimestre à valider' and c.code = 'ejptech';

insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
select m.le, m.par, g.ministere,
       case m.decision when 'masque' then 'texte_masque' else 'texte_relu' end,
       m.cible, m.cible_id,
       case m.decision when 'masque' then jsonb_build_object('champ', m.champ, 'motif', m.motif)
            else '{}'::jsonb end
from public.moderation m
join graine_point p on p.id = m.cible_id
join graine_ministere g on g.code = p.code;

-- Étape 2 : connexion des comptes d'exemple pour les parcours Playwright (local et CI seulement,
-- jamais un projet distant). Un mot de passe de test commun, et un facteur TOTP vérifié avec un
-- secret de test fixe, repris par e2e/comptes.ts pour générer les codes avec otplib. Ce ne sont
-- pas de vrais secrets. Le Ministère EJP Formation reste sans facteur : il passe par
-- l'activation (BRIEF, section 8, « Tests obligatoires »).
-- Écart au BRIEF (section 8) : les facteurs s'écrivent ici dans auth.mfa_factors, colonnes
-- stables depuis l'arrivée du TOTP, au lieu d'un script par l'API (mfa.enroll), pour éviter la
-- limite de 15 vérifications par minute et rester identiques d'un lancement à l'autre.

update auth.users u
   set encrypted_password = extensions.crypt('essai-local-pilotage-ejp', extensions.gen_salt('bf'))
  from graine_compte c
 where u.id = c.compte;

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret,
  created_at, updated_at)
select gen_random_uuid(), c.compte, 'Pilotage EJP', 'totp', 'verified', s.secret,
       pg_temp.h(timestamp '2026-06-01 10:30'), pg_temp.h(timestamp '2026-06-01 10:30')
from graine_compte c
join (values
  ('com', 'YJTOKMCFVXDQLKWSSDG62WS4CBUNIOWU'),
  ('int', 'QFBU6WYYED6J6XYT4MLHPDP4T655MIMK'),
  ('coo', 'DZKIAXZKNOT4CD2KM7HNFXA2U6RWLE7S'),
  ('jeu', 'RVS4EQ4HK7NCDYPMAXAVSH3AMXKGTFCL'),
  ('soc', 'QUV24H3RTESF3EVRWUDYUCMFYHJJJXMR'),
  ('fij', 'JFUBDN4SQ27VJIYUMZSSXSJUBKRTOP4V'),
  ('pju', '6OFAX3LHNGHDNB6SL3FIWO6CGIDVSYB5'),
  ('berger', 'PAZKKX42TXYWVHS4EANMAHL6HNIQSIIY'),
  ('conseil1', 'EK2Z5HTKXWGENCEU64D5P3G37MVGXZJY'),
  ('conseil3', 'LR4FVZOOEIUXAOWPBYAQZYODFLZP45W7'),
  ('admin', 'RVZWRYDFFXXUBQR5LUD4RQMD5OHHCW3U'),
  ('ejptech', 'UC42SX5DFYC556NXA5SXZDGRALYXXHA4')
) as s (code, secret) on s.code = c.code;
