-- Dates et semaines à l'heure de Paris (règle 11, BRIEF section 7, « Dates »).
-- private.dimanche_reference_de est testée avec des instants fixes.
begin;

select plan(19);

select is(private.dimanche_reference_de('2026-09-30 12:00 Europe/Paris'), date '2026-09-27',
  'mercredi 30 sept. 2026, 12 h : le dimanche de référence est le 27 sept.');
select is(extract(week from private.dimanche_reference_de('2026-09-30 12:00 Europe/Paris'))::int, 39,
  'mercredi 30 sept. 2026 : semaine 39');
select is(private.dimanche_reference_de('2026-09-28 00:00 Europe/Paris'), date '2026-09-27',
  'lundi 28 sept. 2026, 0 h : encore le 27 sept.');
select is(private.dimanche_reference_de('2026-10-04 11:59 Europe/Paris'), date '2026-09-27',
  'dimanche 4 oct. 2026, 11 h 59 : encore le 27 sept.');
select is(private.dimanche_reference_de('2026-10-04 12:00 Europe/Paris'), date '2026-10-04',
  'dimanche 4 oct. 2026, 12 h : le 4 oct.');
select is(extract(week from private.dimanche_reference_de('2026-10-04 12:00 Europe/Paris'))::int, 40,
  'dimanche 4 oct. 2026, 12 h : semaine 40');
select is(('2026-09-26 22:30+00'::timestamptz at time zone 'Europe/Paris')::date, date '2026-09-27',
  'samedi 26 sept. 22 h 30 UTC est le dimanche 27 sept. à Paris');
select is(private.dimanche_reference_de('2026-09-26 22:30+00'), date '2026-09-20',
  'samedi 26 sept. 22 h 30 UTC (dimanche 0 h 30 à Paris, avant midi) : encore le 20 sept.');
select is(private.dimanche_reference_de('2026-09-27 10:30+00'), date '2026-09-27',
  'dimanche 27 sept. 10 h 30 UTC (12 h 30 à Paris) : le 27 sept., l''heure de Paris décide');
select is(private.dimanche_reference_de('2026-10-25 11:59 Europe/Paris'), date '2026-10-18',
  'changement d''heure, dimanche 25 oct. 2026, 11 h 59 : encore le 18 oct.');
select is(private.dimanche_reference_de('2026-10-25 12:00 Europe/Paris'), date '2026-10-25',
  'changement d''heure, dimanche 25 oct. 2026, 12 h : le 25 oct.');
select is(private.dimanche_reference_de('2026-10-25 10:30+00'), date '2026-10-18',
  'changement d''heure : 10 h 30 UTC est 11 h 30 à Paris (heure d''hiver), encore le 18 oct.');
select is(private.dimanche_reference_de('2027-01-03 12:00 Europe/Paris'), date '2027-01-03',
  'dimanche 3 janv. 2027, 12 h : le 3 janv.');
select is(extract(week from private.dimanche_reference_de('2027-01-03 12:00 Europe/Paris'))::int, 53,
  'dimanche 3 janv. 2027 : semaine 53, du 28 déc. au 3 janv.');

-- Activité d'un ministère à une date
select ok(private.actif_le('2026-09-01 10:00 Europe/Paris', null, '2026-09-01'),
  'un ministère créé le 1er sept. est actif le 1er sept.');
select ok(not private.actif_le('2026-09-02 00:30 Europe/Paris', null, '2026-09-01'),
  'un ministère créé le 2 sept. (heure de Paris) n''est pas actif le 1er sept.');
select ok(not private.actif_le('2026-06-01 10:00 Europe/Paris', '2026-09-15 08:00 Europe/Paris', '2026-09-15'),
  'un ministère désactivé le 15 sept. n''est plus actif ce jour-là');

-- Le jour et le dimanche de référence courants suivent la même règle
select is(private.aujourdhui(), (now() at time zone 'Europe/Paris')::date, 'aujourdhui() est la date de Paris');
select is(private.dimanche_reference(), private.dimanche_reference_de(now()),
  'dimanche_reference() applique la règle à l''instant présent');

select * from finish();
rollback;
