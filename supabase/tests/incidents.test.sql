-- Incidents d'envoi (T76, lot C ; docs/conception/erreurs-envoi.md, sections 6 et 14, test 15 ;
-- migration 20261026*_incidents_envoi.sql).
--
-- Le cas réel d'abord : l'ajout d'événement de Coordination resté sans réponse devient un
-- incident « Pas de réponse, issue inconnue », que seul EJP Tech lit. Puis : chaque profil actif
-- en aal2 écrit ; aal1 et anonyme refusés ; profil et ministère imposés par la base (les valeurs
-- envoyées sont ignorées) ; clés inconnues ignorées, jamais recopiées ; valeurs hors liste en
-- « autre » ou vides ; ligne sans genre, sans issue ou sans référence valable ignorée ; 25
-- envoyés, 20 gardés ; 101e incident en 24 h du même ministère ignoré ; même référence ignorée ;
-- heure du téléphone hors fenêtre remplacée par l'heure de la base ; lecture par
-- incidents_recents : EJP Tech seul, aal2, 50 lignes, du plus récent au plus ancien, le nom du
-- ministère, le total ; purge des incidents de plus de 90 jours à l'écriture et à la lecture ;
-- private.incident sans aucun droit, inaltérable hors purge ; la matrice des profils.
begin;

create temp table ctx as
select tests.compte('Ministère Coordination') as coo,
       tests.ministere('Coordination') as coo_m,
       tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère Social') as soc,
       tests.ministere('Social') as soc_m,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.ministere('Jeunesse') as jeu_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column total bigint, add column apres_k7 timestamptz;
grant select, update on ctx to authenticated;
grant select on ctx to anon;

-- Une référence de six caractères de l'alphabet des références (sans 0, 1, I, L, O), tirée d'un
-- rang : 1 donne 222223, 2 donne 222224...
create function pg_temp.ref(p_rang integer) returns text
language sql immutable as $$
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (p_rang / power(31, 5 - i)::integer) % 31 + 1, 1), ''
                    order by i)
    from generate_series(0, 5) as i
$$;
grant execute on function pg_temp.ref(integer) to authenticated, anon;

-- Un incident tel que la file du téléphone l'envoie (le cas réel du 26 octobre 2026), complété
-- ou corrigé par p_autres.
create function pg_temp.incident(p_reference text, p_autres jsonb default '{}') returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'reference', p_reference, 'survenu_le', to_char(statement_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'ecran', '/saisir/evenement', 'operation', 'ajouter_evenement', 'genre', 'sans_reponse',
    'issue', 'inconnue', 'rattrape', false, 'nom_erreur', 'TypeError', 'duree_ms', 1234,
    'en_ligne', true, 'visible', true, 'version', '3f2a1c9', 'navigateur', 'safari',
    'version_navigateur', 26, 'systeme', 'ios') || p_autres
$$;
grant execute on function pg_temp.incident(text, jsonb) to authenticated, anon;

-- Matrice en aal2 (section 9), écrite avant plan() : attendus dans l'ordre des profils
-- (Coordination, Communication, berger, conseil, administration, EJP Tech).
create temp view matrice_incident (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2', m.attendu[p.rang], m.requete
    from (values (1, 'ministère coordination'), (2, 'ministère communication'), (3, 'berger'),
                 (4, 'conseil'), (5, 'administration'), (6, 'EJP Tech')) as p(rang, profil)
   cross join (values
     ('private.incident', 'lire', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'select 1 from private.incident'),
     ('private.incident', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into private.incident (reference, survenu_le, profil, ecran, operation, genre, issue, version) values (''ZZZZZZ'', now(), ''berger'', ''autre'', ''autre'', ''bogue'', ''inconnue'', ''local'')'),
     ('private.incident', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'update private.incident set rattrape = rattrape'),
     ('private.incident', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from private.incident'),
     ('noter_incidents', 'appeler', array['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
      'select public.noter_incidents(jsonb_build_array(pg_temp.incident(''YYYYYY'')))'),
     ('incidents_recents', 'appeler', array['42501', '42501', '42501', '42501', '42501', 'ok'],
      'select * from public.incidents_recents()'),
     ('private.noter_incidents', 'appeler', array['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
      'select private.noter_incidents(''[]''::jsonb)'),
     ('private.purger_incidents', 'appeler', array['42501', '42501', '42501', '42501', '42501', '42501'],
      'select private.purger_incidents()')
   ) as m(objet, action, attendu, requete);
create temp view profil_incident (profil, compte) as
  select 'ministère coordination', c.coo from ctx c union all select 'ministère communication', c.com from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;
grant select on matrice_incident, profil_incident to authenticated, anon;

select plan(63 + tests.nombre_essais('select * from matrice_incident', 'select * from profil_incident', true));

-- 1. Le cas réel : Coordination, « Ajouter un événement », pas de réponse

select tests.se_connecter((select coo from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident('K7Q4MX'))), 1,
  'Coordination en aal2 note l''incident de son ajout resté sans réponse');
select tests.deconnecter();
select results_eq($$
  select i.profil::text, i.ministere_id, i.ecran, i.operation, i.genre, i.issue, i.rattrape, i.nom_erreur,
         i.duree_ms, i.en_ligne, i.visible, i.version, i.navigateur, i.version_navigateur, i.systeme
    from private.incident i where i.reference = 'K7Q4MX'
$$, $$ select 'ministere'::text, coo_m, '/saisir/evenement'::text, 'ajouter_evenement'::text, 'sans_reponse'::text,
              'inconnue'::text, false, 'TypeError'::text, 1234, true, true, '3f2a1c9'::text, 'safari'::text,
              26::smallint, 'ios'::text from ctx $$,
  'l''incident garde le profil et le ministère de la base, l''écran, l''opération, le genre, l''issue et le navigateur');
select ok((select i.recu_le > statement_timestamp() - interval '1 minute' from private.incident i where i.reference = 'K7Q4MX'),
  'recu_le : l''heure de la base');

-- 2. Chaque profil actif en aal2 écrit ; aal1 et anonyme refusés

select tests.se_connecter((select berger from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(1)))), 1, 'le berger écrit');
select tests.se_connecter((select conseil from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(2)))), 1, 'le conseil écrit');
select tests.se_connecter((select admin from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(3)))), 1, 'l''administration écrit');
select tests.se_connecter((select tech from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(4)))), 1, 'EJP Tech écrit');
select tests.deconnecter();
select results_eq($$
  select i.reference, i.profil::text, i.ministere_id from private.incident i
   where i.reference in (pg_temp.ref(1), pg_temp.ref(2), pg_temp.ref(3), pg_temp.ref(4)) order by i.reference
$$, $$ values (pg_temp.ref(1), 'berger'::text, null::uuid), (pg_temp.ref(2), 'conseil', null),
              (pg_temp.ref(3), 'admin_eglise', null), (pg_temp.ref(4), 'admin_plateforme', null) $$,
  'hors ministère : le profil, sans ministère');
select is(tests.essai((select coo from ctx), 'aal1',
  $$select public.noter_incidents(jsonb_build_array(pg_temp.incident('AAAAAA')))$$), '42501',
  'aal1 : noter_incidents refusé (un incident attend dans la file)');
select is(tests.essai(null, null,
  $$select public.noter_incidents('[{"reference": "AAAAAA"}]'::jsonb)$$), '42501',
  'anonyme : noter_incidents refusé');
select is((select count(*)::int from private.incident where reference = 'AAAAAA'), 0, 'rien n''est écrit en aal1');

-- 3. Ce que la base impose, ce qu'elle ignore

select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(10), jsonb_build_object(
  'profil', 'admin_plateforme', 'ministere_id', (select coo_m from ctx), 'compte', (select tech from ctx),
  'texte', 'Témoin secret du formulaire', 'email', 'temoin@exemple.test', 'message', 'TypeError: Load failed')))), 1,
  'un incident avec des clés en trop est gardé');
select tests.deconnecter();
select results_eq($$ select i.profil::text, i.ministere_id from private.incident i where i.reference = pg_temp.ref(10) $$,
  $$ select 'ministere'::text, com_m from ctx $$, 'profil et ministère imposés : les valeurs envoyées sont ignorées');
select is((select count(*)::int from private.incident i
            where to_jsonb(i)::text ~ '(Témoin secret|temoin@exemple|Load failed)'), 0,
  'aucun texte, aucune adresse, aucun message n''est recopié');

select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(11), jsonb_build_object(
  'ecran', '/ministeres/10000000-0000-4000-8000-000000000001', 'operation', 'supprimer_tout',
  'navigateur', 'opera', 'systeme', 'beos', 'nom_erreur', 'RangeError', 'code', 'Ceci est un message libre',
  'statut_http', 999, 'duree_ms', 999999, 'version_navigateur', 5000, 'en_ligne', 'peut-être', 'rattrape', 'oui')))), 1,
  'des valeurs hors liste ne font pas refuser l''incident');
select tests.deconnecter();
select results_eq($$
  select i.ecran, i.operation, i.navigateur, i.systeme, i.nom_erreur, i.code, i.statut_http, i.duree_ms,
         i.version_navigateur, i.en_ligne, i.rattrape
    from private.incident i where i.reference = pg_temp.ref(11)
$$, $$ values ('autre'::text, 'autre'::text, 'autre'::text, 'autre'::text, 'autre'::text, null::text, null::smallint,
               null::integer, null::smallint, null::boolean, false) $$,
  'valeurs hors liste : « autre », ou vide pour un code, un statut, une durée, une version ou un booléen');

select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(
  pg_temp.incident(pg_temp.ref(12), '{"code": "23505", "statut_http": 409, "genre": "refus_inconnu", "issue": "rien_enregistre"}'),
  pg_temp.incident(pg_temp.ref(13), '{"code": "PGRST203"}'),
  pg_temp.incident(pg_temp.ref(14), '{"code": "erreur_interne", "operation": "creer-compte", "ecran": "/comptes"}'))), 3,
  'codes SQLSTATE, PostgREST et Edge Function gardés');
select tests.deconnecter();
select results_eq($$ select i.code, i.operation from private.incident i
                      where i.reference in (pg_temp.ref(12), pg_temp.ref(13), pg_temp.ref(14)) order by i.reference $$,
  $$ values ('23505'::text, 'ajouter_evenement'::text), ('PGRST203', 'ajouter_evenement'), ('erreur_interne', 'creer-compte') $$,
  'le code, jamais le message ; l''opération d''une Edge Function');

select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(
  pg_temp.incident(pg_temp.ref(20), '{"genre": null}'),
  pg_temp.incident(pg_temp.ref(21), '{"genre": "fantaisie"}'),
  pg_temp.incident(pg_temp.ref(22), '{"issue": "peut-etre"}'),
  pg_temp.incident('k7q4mx'),
  pg_temp.incident('K7Q4M0'),
  pg_temp.incident(pg_temp.ref(23), '{"version": "pas une version"}'),
  '"pas un objet"'::jsonb,
  pg_temp.incident(pg_temp.ref(24), '{"genre": "refus"}'))), 0,
  'sans genre ou issue valable, sans référence valable, sans version ou pas un objet : ignoré, sans erreur');
select is(public.noter_incidents('{"reference": "AAAAAA"}'::jsonb), 0, 'un lot qui n''est pas une liste : rien, sans erreur');
-- Même référence : déjà reçue, pas recopiée.
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident('K7Q4MX'))), 0,
  'une référence déjà reçue n''est pas recopiée');
select tests.deconnecter();
select is((select count(*)::int from private.incident where reference = 'K7Q4MX'), 1, 'toujours un seul incident K7Q4MX');

-- L'heure du téléphone : bornée, sinon celle de la base.
select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(
  pg_temp.incident(pg_temp.ref(30), jsonb_build_object('survenu_le', to_char((statement_timestamp() - interval '2 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))),
  pg_temp.incident(pg_temp.ref(31), jsonb_build_object('survenu_le', to_char((statement_timestamp() - interval '30 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))),
  pg_temp.incident(pg_temp.ref(32), jsonb_build_object('survenu_le', to_char((statement_timestamp() + interval '3 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))),
  pg_temp.incident(pg_temp.ref(33), '{"survenu_le": "hier soir"}'))), 4, 'quatre heures de téléphone, quatre incidents');
select tests.deconnecter();
select ok((select i.survenu_le < statement_timestamp() - interval '1 day' from private.incident i where i.reference = pg_temp.ref(30)),
  'une heure d''il y a 2 jours est gardée');
select ok((select bool_and(abs(extract(epoch from i.survenu_le - i.recu_le)) < 1) from private.incident i
            where i.reference in (pg_temp.ref(31), pg_temp.ref(32), pg_temp.ref(33))),
  'plus de 7 jours, plus d''un jour dans le futur ou illisible : l''heure de la base');

-- 4. Limites d'abus : 20 par appel, 100 par 24 h et par ministère (ou profil)

select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents((select jsonb_agg(pg_temp.incident(pg_temp.ref(100 + n))) from generate_series(1, 25) as n)), 20,
  '25 incidents envoyés, 20 gardés');
select tests.deconnecter();
select is((select count(*)::int from private.incident where reference in (select pg_temp.ref(100 + n) from generate_series(1, 20) as n)), 20,
  'les 20 premiers du lot');
-- Social a déjà 100 incidents depuis 24 h (posés par le propriétaire) : le 101e est ignoré.
insert into private.incident (reference, survenu_le, profil, ministere_id, ecran, operation, genre, issue, version)
select pg_temp.ref(1000 + n), statement_timestamp(), 'ministere', (select soc_m from ctx), '/saisir/dimanche', 'mesure',
       'sans_reponse', 'inconnue', 'local'
  from generate_series(1, 100) as n;
select tests.se_connecter((select soc from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(2000)))), 0,
  '101e incident en 24 h du même ministère : ignoré, sans erreur');
select tests.deconnecter();
select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(2001)))), 1,
  'un autre ministère, lui, écrit encore');
select tests.deconnecter();
-- Jeunesse a déjà 95 incidents : sur 10 envoyés, 5 sont gardés.
insert into private.incident (reference, survenu_le, profil, ministere_id, ecran, operation, genre, issue, version)
select pg_temp.ref(3000 + n), statement_timestamp(), 'ministere', (select jeu_m from ctx), '/saisir/dimanche', 'mesure',
       'sans_reponse', 'inconnue', 'local'
  from generate_series(1, 95) as n;
select tests.se_connecter((select jeu from ctx), 'aal2');
select is(public.noter_incidents((select jsonb_agg(pg_temp.incident(pg_temp.ref(3100 + n))) from generate_series(1, 10) as n)), 5,
  'débit partiel : 95 incidents déjà gardés, 10 envoyés, 5 gardés');
select tests.deconnecter();
select tests.se_connecter((select com from ctx), 'aal2');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(3200)), pg_temp.incident(pg_temp.ref(3200)))), 1,
  'une référence en double dans un même lot : gardée une fois, sans erreur');
select is(public.noter_incidents((select jsonb_agg(pg_temp.incident(pg_temp.ref(3300 + n), jsonb_build_object('bourrage', repeat('x', 2000))))
                                    from generate_series(1, 20) as n)), 0,
  'un lot trop gros (plus de 20 000 octets) : rien, sans erreur');
select is(public.noter_incidents(jsonb_build_array(pg_temp.incident(pg_temp.ref(3400), '{"code": "marie_durand"}'))), 1,
  'un code hors liste est gardé vide');
select tests.deconnecter();
select is((select code from private.incident where reference = pg_temp.ref(3400)), null,
  'code hors liste (ni SQLSTATE, ni code PostgREST, ni code d''Edge Function) : vide, jamais un mot libre');

-- 5. Lecture : EJP Tech seul, en aal2

-- Le nombre d'incidents gardés, et l'heure juste après celle de K7Q4MX (plus de 50 incidents
-- sont arrivés depuis : la lecture le trouve en tête de la suite).
update ctx set total = (select count(*) from private.incident),
               apres_k7 = (select i.recu_le + interval '1 millisecond' from private.incident i where i.reference = 'K7Q4MX');
select tests.se_connecter((select tech from ctx), 'aal2');
select results_eq($$
  select r.reference, r.profil::text, r.ministere_nom, r.genre, r.issue
    from public.incidents_recents((select apres_k7 from ctx)) r where r.reference = 'K7Q4MX'
$$, $$ values ('K7Q4MX'::text, 'ministere'::text, 'Coordination'::text, 'sans_reponse'::text, 'inconnue'::text) $$,
  'EJP Tech lit l''incident de Coordination, avec le nom du ministère');
select is((select count(*)::int from public.incidents_recents()), 50, '50 lignes à la fois');
select is((select max(r.total) from public.incidents_recents() r), (select total from ctx),
  'avec le nombre total d''incidents gardés');
select ok((select bool_and(a.recu_le >= b.recu_le) from
            (select r.recu_le, row_number() over () as n from public.incidents_recents() r) as a
            join (select r.recu_le, row_number() over () as n from public.incidents_recents() r) as b on b.n = a.n + 1),
  'du plus récent au plus ancien');
select is((select count(*)::int from public.incidents_recents((select min(r.recu_le) from public.incidents_recents() r))) > 0, true,
  '« Afficher 50 de plus » : la suite, avant le plus ancien déjà lu');
select tests.deconnecter();
select is(tests.essai((select coo from ctx), 'aal2', 'select * from public.incidents_recents()'), '42501',
  'un ministère ne lit pas les incidents (42501), même ceux de son ministère');
select is(tests.essai((select berger from ctx), 'aal2', 'select * from public.incidents_recents()'), '42501', 'le berger non plus');
select is(tests.essai((select tech from ctx), 'aal1', 'select * from public.incidents_recents()'), '42501', 'EJP Tech en aal1 non plus');
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$ select * from public.incidents_recents() $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'refus à l''administration : la phrase commune « introuvable »');
select tests.deconnecter();

-- Un ministère supprimé depuis : pas de nom (l'écran dit « Ministère supprimé »).
insert into private.incident (reference, survenu_le, profil, ministere_id, ecran, operation, genre, issue, version)
values ('ZZZZZ2', statement_timestamp(), 'ministere', gen_random_uuid(), '/saisir/dimanche', 'mesure', 'delai', 'inconnue', 'local');
select tests.se_connecter((select tech from ctx), 'aal2');
select is((select r.ministere_nom from public.incidents_recents() r where r.reference = 'ZZZZZ2'), null,
  'un ministère qui n''existe plus : pas de nom');
select tests.deconnecter();

-- 6. Purge : 90 jours, à la lecture et à l'écriture

insert into private.incident (reference, survenu_le, recu_le, profil, ecran, operation, genre, issue, version)
values ('VQEUX2', statement_timestamp() - interval '91 days', statement_timestamp() - interval '91 days', 'berger',
        'autre', 'autre', 'bogue', 'inconnue', 'local'),
       ('VQEUX3', statement_timestamp() - interval '92 days', statement_timestamp() - interval '92 days', 'berger',
        'autre', 'autre', 'bogue', 'inconnue', 'local'),
       ('RECENT', statement_timestamp() - interval '89 days', statement_timestamp() - interval '89 days', 'berger',
        'autre', 'autre', 'bogue', 'inconnue', 'local');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select * from public.incidents_recents() $$, 'EJP Tech ouvre Modération');
select tests.deconnecter();
select is((select count(*)::int from private.incident where reference in ('VQEUX2', 'VQEUX3')), 0,
  'à la lecture, les incidents de plus de 90 jours sont effacés');
select is((select count(*)::int from private.incident where reference = 'RECENT'), 1, 'celui de 89 jours reste');
insert into private.incident (reference, survenu_le, recu_le, profil, ecran, operation, genre, issue, version)
values ('VQEUX4', statement_timestamp() - interval '95 days', statement_timestamp() - interval '95 days', 'berger',
        'autre', 'autre', 'bogue', 'inconnue', 'local');
-- Un numéro anti-doublon de 8 jours (lot B) part aussi à l'écriture d'un incident.
insert into private.envoi (compte, cle, operation, cible_id, empreinte, le)
select coo, 'a2000000-0000-4000-8000-000000000001', 'ajouter_evenement', coo_m, md5('vieux'),
       statement_timestamp() - interval '8 days'
  from ctx;
select tests.se_connecter((select berger from ctx), 'aal2');
select is(public.noter_incidents('[]'::jsonb), 0, 'un lot vide : rien');
select tests.deconnecter();
select is((select count(*)::int from private.incident where reference = 'VQEUX4'), 0, 'à l''écriture aussi');
select is((select count(*)::int from private.envoi where cle = 'a2000000-0000-4000-8000-000000000001'), 0,
  'les numéros anti-doublon de plus de 7 jours partent avec la même écriture');

-- Sous le réglage de la purge, le propriétaire ne supprime ni ne modifie un incident récent.
select set_config('pilotage.purge_incidents', 'oui', true);
select throws_ok($$ delete from private.incident where reference = 'RECENT' $$, '42501', null,
  'réglage de la purge posé : un incident de moins de 90 jours ne se supprime pas');
select throws_ok($$ update private.incident set rattrape = true where reference = 'RECENT' $$, '42501', null,
  'réglage de la purge posé : aucune modification');
select set_config('pilotage.purge_incidents', '', true);

-- 7. private.incident : droits et inaltérabilité

select ok((select c.relrowsecurity from pg_class c where c.oid = 'private.incident'::regclass), 'RLS activée');
select ok(exists (select 1 from pg_policies p
                   where p.schemaname = 'private' and p.tablename = 'incident'
                     and p.policyname = 'double_authentification' and p.permissive = 'RESTRICTIVE'
                     and p.cmd = 'ALL' and p.qual like '%aal2%' and p.with_check like '%aal2%'),
  'politique restrictive aal2');
select is_empty($$
  select r.rolname, x.privilege
    from (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
   cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as x(privilege)
   where has_table_privilege(r.rolname, 'private.incident', x.privilege)
$$, 'aucun droit pour anon, authenticated ni service_role');
select throws_ok($$ update private.incident set rattrape = true $$, '42501', null, 'update refusé, même au propriétaire');
select throws_ok($$ delete from private.incident $$, '42501', null, 'delete refusé hors purge, même au propriétaire');
select throws_ok($$ truncate private.incident $$, '42501', null, 'truncate refusé, même au propriétaire');
select ok((select bool_and(p.provolatile = 'i') from pg_proc p
            where p.pronamespace = 'private'::regnamespace
              and p.proname in ('codes_incident', 'ecrans_incident', 'operations_incident')),
  'les listes fermées des écrans et des opérations sont immutable');
select ok((select '/saisir/evenement' = any (private.ecrans_incident()) and 'autre' = any (private.ecrans_incident())
              and 'ajouter_evenement' = any (private.operations_incident()) and 'creer-compte' = any (private.operations_incident())
              and 'autre' = any (private.operations_incident())),
  'les listes contiennent les adresses, les opérations et « autre »');
select is_empty($$
  select p.oid::regprocedure, r.rolname from pg_proc p
   cross join (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
   where p.pronamespace = 'private'::regnamespace
     and p.proname in ('codes_incident', 'ecrans_incident', 'operations_incident', 'purger_incidents',
                       'lire_incident', 'lire_horodatage')
     and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
$$, 'les aides des incidents ne sont exécutables par aucun rôle de l''API');
select ok((select p.pronargdefaults = 1 from pg_proc p
            where p.oid = 'public.incidents_recents(timestamp with time zone)'::regprocedure)
      and (select count(*) = 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'incidents_recents'),
  'incidents_recents : une seule surcharge (aucun risque PGRST203)');

-- 8. Aucun journal pour un incident

select is((select count(*)::int from public.journal j where j.le > statement_timestamp() - interval '1 minute'
            and j.detail::text like '%K7Q4MX%'), 0, 'aucune ligne de journal ne cite un incident');

-- 9. Matrice des droits par profil (aal2 écrite ; aal1 et anonyme dérivés)

select * from tests.verifier_matrice('select * from matrice_incident', 'select * from profil_incident', true);

select * from finish();
rollback;
