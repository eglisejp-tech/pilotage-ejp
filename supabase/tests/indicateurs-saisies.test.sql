-- Saisies des indicateurs (étape 4, lot B1 ; configuration-indicateurs.md 5.3 ; BRIEF,
-- section 4, « Unités » et « Rythmes » ; X2) : plafond de chaque unité, mois au 1er, ni mois
-- futur ni avant le 1er janvier de l'année précédente, mois en cours refusé pour un sensible,
-- bascule du mois à l'heure de Paris, dimanche du jour dès le matin, calcul jamais saisi (par
-- le trigger et par la politique), indicateur retiré nommé dans le message, ajout à valider
-- saisissable, EJP Tech et les autres profils refusés.
-- Les instants fixes passent par private.controler_mesure_le(indicateur, date, valeur,
-- instant), que le trigger appelle avec now().
begin;

select plan(55);

create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       private.mois_courant() as mois,
       (private.mois_courant() - interval '1 month')::date as mois_passe,
       private.dimanche_reference() as dimanche;

-- Indicateurs d'essai de Communication, un par unité et par cas.
insert into public.indicateur (libelle, definition, nature, unite, ministere_id, sensible, saisi_dimanche_matin, origine, etat)
select x.libelle, 'Indicateur d''essai des saisies.', x.nature, x.unite, c.com_m, x.sensible, x.matin, x.origine, x.etat
from ctx c
cross join (values
    ('Essai s. nombre', 'mois', 'nombre', false, false, 'eglise', 'actif'),
    ('Essai s. grand nombre', 'mois', 'grand_nombre', false, false, 'eglise', 'actif'),
    ('Essai s. euros', 'mois', 'euros', false, false, 'eglise', 'actif'),
    ('Essai s. heure', 'dimanche', 'heure', false, false, 'eglise', 'actif'),
    ('Essai s. jours', 'mois', 'jours', false, false, 'eglise', 'actif'),
    ('Essai s. dimanche', 'dimanche', 'nombre', false, false, 'eglise', 'actif'),
    ('Essai s. matin', 'dimanche', 'nombre', false, true, 'eglise', 'actif'),
    ('Essai s. sensible', 'mois', 'nombre', true, false, 'eglise', 'actif'),
    ('Essai s. retiré', 'mois', 'nombre', false, false, 'eglise', 'actif'),
    ('Essai s. à valider', 'mois', 'nombre', false, false, 'ministere', 'en_attente'),
    ('Essai s. stock', 'a_ce_jour', 'grand_nombre', false, false, 'eglise', 'actif')
  ) as x(libelle, nature, unite, sensible, matin, origine, etat);
update public.indicateur set etat = 'retire', retrait_motif = 'plus_suivi' where libelle = 'Essai s. retiré';
insert into public.indicateur (libelle, definition, nature, ministere_id, calcul)
select 'Essai s. taux', 'Taux d''essai des saisies.', 'mois', c.com_m, 'taux' from ctx c;
insert into public.indicateur_terme (calcul_id, ordre, role, source_id)
select t.id, 1, 'haut', n.id from public.indicateur t, public.indicateur n
 where t.libelle = 'Essai s. taux' and n.libelle = 'Essai s. nombre'
union all
select t.id, 2, 'bas', g.id from public.indicateur t, public.indicateur g
 where t.libelle = 'Essai s. taux' and g.libelle = 'Essai s. jours';

create function pg_temp.i(p_libelle text) returns uuid language sql stable as $$
  select i.id from public.indicateur i where i.libelle = p_libelle
$$;
-- Identifiants lus par le propriétaire des tables : un autre profil ne lit pas les indicateurs
-- de Communication (Q3).
alter table ctx add column retire uuid, add column nombre uuid;
update ctx set retire = pg_temp.i('Essai s. retiré'), nombre = pg_temp.i('Essai s. nombre');
grant select on ctx to authenticated;
grant execute on function pg_temp.i(text) to authenticated;

-- Un envoi au nom de Communication (aal2), annulé aussitôt : « ok » ou le code et le message.
create function pg_temp.saisir(p_libelle text, p_date date, p_valeur integer) returns text
language plpgsql as $$
declare
  v text;
begin
  begin
    perform tests.se_connecter((select com from ctx), 'aal2');
    insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
    values (pg_temp.i(p_libelle), (select com_m from ctx), p_date, p_valeur);
    v := 'ok';
    raise exception using errcode = 'ZZ003', message = 'annulé';
  exception
    when sqlstate 'ZZ003' then null;
    when others then v := sqlstate || ' ' || sqlerrm;
  end;
  return v;
end $$;

-- Contrôle à un instant fixe : « ok » ou le message.
create function pg_temp.le(p_libelle text, p_date date, p_valeur integer, p_instant timestamptz) returns text
language plpgsql as $$
begin
  perform private.controler_mesure_le(pg_temp.i(p_libelle), p_date, p_valeur, p_instant);
  return 'ok';
exception when others then
  return sqlerrm;
end $$;

select ok((select count(*) from ctx where com is not null and jeu is not null and tech is not null and service is not null) = 1
          and pg_temp.i('Essai s. taux') is not null and pg_temp.i('Essai s. stock') is not null,
  'le jeu d''exemple et le contexte fournissent les comptes et les indicateurs utilisés ici');

-- Plafond de chaque unité
select is(pg_temp.saisir('Essai s. nombre', (select mois_passe from ctx), 9999), 'ok', 'nombre : 9 999 accepté');
select is(pg_temp.saisir('Essai s. nombre', (select mois_passe from ctx), 10000), 'P0001 Entre 0 et 9 999.', 'nombre : 10 000 refusé');
select is(pg_temp.saisir('Essai s. nombre', (select mois_passe from ctx), -1), 'P0001 Entre 0 et 9 999.', 'nombre : -1 refusé');
select is(pg_temp.saisir('Essai s. grand nombre', (select mois_passe from ctx), 9999999), 'ok', 'grand nombre : 9 999 999 accepté');
select is(pg_temp.saisir('Essai s. grand nombre', (select mois_passe from ctx), 10000000), 'P0001 Entre 0 et 9 999 999.',
  'grand nombre : 10 000 000 refusé');
select is(pg_temp.saisir('Essai s. euros', (select mois_passe from ctx), 9999999), 'ok', 'euros : 9 999 999 accepté');
select is(pg_temp.saisir('Essai s. euros', (select mois_passe from ctx), 10000000), 'P0001 Entre 0 et 9 999 999.',
  'euros : 10 000 000 refusé');
select is(pg_temp.saisir('Essai s. heure', (select dimanche from ctx), 1439), 'ok', 'heure : 1439 (23 h 59) acceptée');
select is(pg_temp.saisir('Essai s. heure', (select dimanche from ctx), 1440), 'P0001 Choisissez une heure entre 0 h 00 et 23 h 59.',
  'heure : 1440 refusée');
select is(pg_temp.saisir('Essai s. heure', (select dimanche from ctx), 0), 'ok', 'heure : 0 (minuit) acceptée');
select is(pg_temp.saisir('Essai s. jours', (select mois_passe from ctx), 99999), 'ok', 'jours : 99 999 acceptés');
select is(pg_temp.saisir('Essai s. jours', (select mois_passe from ctx), 100000), 'P0001 Entre 0 et 99 999.', 'jours : 100 000 refusés');
select is(pg_temp.saisir('Essai s. stock', (select mois_passe from ctx), 12480), 'ok', '« à ce jour » en grand nombre : 12 480 accepté');
select is(pg_temp.saisir('Essai s. dimanche', (select dimanche from ctx), 10000), 'P0001 Entre 0 et 9 999.',
  'un indicateur du dimanche en nombre reste plafonné à 9 999');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) select service, com_m, dimanche, 10000 from ctx
$$, 'P0001', 'Entre 0 et 9 999.', 'un chiffre commun reste un nombre (9 999 au plus), même pour le propriétaire');

-- Mois
select is(pg_temp.saisir('Essai s. nombre', (select mois_passe from ctx) + 14, 5), 'P0001 Un mois se saisit à la date de son 1er jour.',
  'le 15 du mois est refusé');
select is(pg_temp.saisir('Essai s. nombre', (select mois from ctx), 5), 'ok', 'le mois en cours est accepté (indicateur non sensible)');
select is(pg_temp.saisir('Essai s. nombre', ((select mois from ctx) + interval '1 month')::date, 5),
  'P0001 Ce mois n''est pas encore commencé.', 'un mois futur est refusé');
select is(pg_temp.saisir('Essai s. nombre', make_date(extract(year from private.aujourdhui())::int - 1, 1, 1), 5), 'ok',
  'janvier de l''année précédente est accepté (rattrapage)');
select is(pg_temp.saisir('Essai s. nombre', make_date(extract(year from private.aujourdhui())::int - 2, 12, 1), 5),
  'P0001 Ce mois est trop ancien pour être saisi.', 'décembre d''il y a deux ans est refusé');
select is(pg_temp.saisir('Essai s. sensible', (select mois from ctx), 1), 'P0001 Ce chiffre se saisit une fois le mois fini.',
  'sensible : le mois en cours est refusé');
select is(pg_temp.saisir('Essai s. sensible', (select mois_passe from ctx), 1), 'ok', 'sensible : le dernier mois écoulé est accepté');

-- Bascule du mois le 31 octobre 2026 à 23 h 30 UTC : déjà le 1er novembre à Paris.
select is(pg_temp.le('Essai s. nombre', date '2026-11-01', 5, timestamptz '2026-10-31 23:30+00'), 'ok',
  '31 oct. 23 h 30 UTC : novembre est le mois en cours à Paris');
select is(pg_temp.le('Essai s. nombre', date '2026-12-01', 5, timestamptz '2026-10-31 23:30+00'), 'Ce mois n''est pas encore commencé.',
  '31 oct. 23 h 30 UTC : décembre est futur');
select is(pg_temp.le('Essai s. sensible', date '2026-11-01', 1, timestamptz '2026-10-31 23:30+00'),
  'Ce chiffre se saisit une fois le mois fini.', '31 oct. 23 h 30 UTC : novembre en cours, refusé pour un sensible');
select is(pg_temp.le('Essai s. sensible', date '2026-10-01', 1, timestamptz '2026-10-31 23:30+00'), 'ok',
  '31 oct. 23 h 30 UTC : octobre est fini à Paris, accepté pour un sensible');
select is(pg_temp.le('Essai s. nombre', date '2026-11-01', 5, timestamptz '2026-10-31 22:30+00'), 'Ce mois n''est pas encore commencé.',
  '31 oct. 22 h 30 UTC (23 h 30 à Paris) : novembre est encore futur');
select is(pg_temp.le('Essai s. sensible', date '2026-10-01', 1, timestamptz '2026-10-31 22:30+00'),
  'Ce chiffre se saisit une fois le mois fini.', '31 oct. 22 h 30 UTC : octobre est encore en cours pour un sensible');
select is(pg_temp.le('Essai s. nombre', date '2025-01-01', 5, timestamptz '2026-10-31 23:30+00'), 'ok',
  'janvier 2025 accepté en 2026');
select is(pg_temp.le('Essai s. nombre', date '2024-12-01', 5, timestamptz '2026-10-31 23:30+00'), 'Ce mois est trop ancien pour être saisi.',
  'décembre 2024 refusé en 2026');
select is(pg_temp.le('Essai s. nombre', date '2025-01-01', 5, timestamptz '2026-12-31 23:30+00'), 'Ce mois est trop ancien pour être saisi.',
  '31 déc. 2026 23 h 30 UTC : déjà 2027 à Paris, janvier 2025 devient trop ancien');

-- Dimanche du jour dès le matin (heure de Paris), bascule de minuit
select is(pg_temp.le('Essai s. matin', date '2026-10-04', 5, timestamptz '2026-10-04 07:00+00'), 'ok',
  'dimanche 4 oct. à 9 h (Paris) : le dimanche du jour est accepté dès le matin');
select is(pg_temp.le('Essai s. dimanche', date '2026-10-04', 5, timestamptz '2026-10-04 07:00+00'), 'ok',
  'le dimanche du jour est aussi accepté le matin pour un indicateur sans le drapeau');
select is(pg_temp.le('Essai s. matin', date '2026-10-04', 5, timestamptz '2026-10-03 22:30+00'), 'ok',
  'samedi 22 h 30 UTC : déjà dimanche 0 h 30 à Paris, le dimanche est accepté');
select is(pg_temp.le('Essai s. matin', date '2026-10-04', 5, timestamptz '2026-10-03 21:30+00'),
  'La date doit être un dimanche passé ou aujourd''hui.', 'samedi 23 h 30 à Paris : le dimanche est encore futur');
select is(pg_temp.le('Essai s. matin', date '2026-10-03', 5, timestamptz '2026-10-04 07:00+00'),
  'La date doit être un dimanche passé ou aujourd''hui.', 'un samedi est refusé');

-- Calcul jamais saisi : par le trigger, puis par la politique seule
select is(pg_temp.saisir('Essai s. taux', (select mois_passe from ctx), 80), 'P0001 Ce chiffre se calcule : il ne se saisit pas.',
  'un calcul est refusé par le trigger');
alter table public.mesure disable trigger controler_mesure;
select is(pg_temp.saisir('Essai s. taux', (select mois_passe from ctx), 80), '42501 new row violates row-level security policy for table "mesure"',
  'un calcul est aussi refusé par la politique d''ajout');
select is(pg_temp.saisir('Essai s. retiré', (select mois_passe from ctx), 3), '42501 new row violates row-level security policy for table "mesure"',
  'un retiré est aussi refusé par la politique d''ajout');
select is(pg_temp.saisir('Essai s. à valider', (select mois_passe from ctx), 3), 'ok',
  'la politique d''ajout accepte un indicateur à valider');
alter table public.mesure enable trigger controler_mesure;

-- Indicateur retiré, ajout à valider
select is(pg_temp.saisir('Essai s. retiré', (select mois_passe from ctx), 3),
  'P0001 « Essai s. retiré » n''est plus proposé à la saisie.', 'un retiré est refusé, et le message le nomme');
select is(pg_temp.saisir('Essai s. à valider', (select mois_passe from ctx), 3), 'ok',
  'un ajout à valider se saisit déjà');

-- Autres profils : aucun message ne nomme un indicateur qu'ils ne lisent pas
select tests.se_connecter((select jeu from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select retire, com_m, mois_passe, 3 from ctx
$$, '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'un autre ministère est refusé sans que le message nomme l''indicateur');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select nombre, com_m, mois_passe, 3 from ctx
$$, '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un autre ministère ne saisit pas un indicateur de Communication');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select nombre, com_m, mois_passe, 3 from ctx
$$, '42501', null, 'EJP Tech ne saisit pas un indicateur propre');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) select service, com_m, dimanche, 3 from ctx
$$, '42501', null, 'EJP Tech ne saisit pas un chiffre commun');
select tests.deconnecter();
select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select nombre, com_m, mois_passe, 3 from ctx
$$, '42501', null, 'le berger ne saisit pas');
select tests.deconnecter();
select tests.se_connecter((select admin from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select nombre, com_m, mois_passe, 3 from ctx
$$, '42501', null, 'l''administration ne saisit pas');
select tests.deconnecter();
select tests.se_connecter((select com from ctx), 'aal1');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select nombre, com_m, mois_passe, 3 from ctx
$$, '42501', 'Double authentification requise.', 'aal1 : refusé avant tout autre contrôle');
select tests.deconnecter();

-- Ce qui est écrit : la date d'un « à ce jour » est celle du jour (heure de Paris), le reste tel
-- qu'envoyé ; une ligne de journal par envoi.
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select pg_temp.i('Essai s. nombre'), com_m, mois_passe, 14 from ctx
  union all
  select pg_temp.i('Essai s. stock'), com_m, date '2020-01-05', 12480 from ctx
  union all
  select pg_temp.i('Essai s. heure'), com_m, dimanche, 642 from ctx
$$, 'un envoi mêle un mois, un « à ce jour » et une heure');
select tests.deconnecter();
select results_eq($$
  select i.libelle, m.date_ref, m.valeur from public.mesure m join public.indicateur i on i.id = m.indicateur_id
   where m.saisi_par = (select com from ctx) and m.saisi_le = (select max(x.saisi_le) from public.mesure x)
   order by i.libelle
$$, $$ select 'Essai s. heure', dimanche, 642 from ctx
       union all select 'Essai s. nombre', mois_passe, 14 from ctx
       union all select 'Essai s. stock', private.aujourdhui(), 12480 from ctx $$,
  'mois au 1er, dimanche tel quel, « à ce jour » à la date du jour');
select is((select count(*)::int from public.journal j
            where j.compte = (select com from ctx) and j.action = 'mesure_saisie'
              and j.le = (select max(x.saisi_le) from public.mesure x)), 1,
  'un envoi donne une seule ligne de journal');
select is((select count(*)::int from public.mesure m where m.valeur in (10000, 10000000, 1440, 100000)), 0,
  'aucune valeur refusée n''a été écrite');
select ok(not has_function_privilege('authenticated', 'private.controler_mesure_le(uuid, date, integer, timestamptz)', 'execute')
          and not has_function_privilege('anon', 'private.controler_mesure_le(uuid, date, integer, timestamptz)', 'execute'),
  'controler_mesure_le n''est appelable ni par authenticated ni par anon');

select * from finish();
rollback;
