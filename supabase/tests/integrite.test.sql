-- Intégrité appliquée par la base (BRIEF, section 6, « Règles d'intégrité », et section 7,
-- « Intégrité ») : auteur et heure imposés, dates des mesures, FIJ et actifs, dates des
-- sessions et des réunions, une ligne de journal par envoi, journal et modération
-- inaltérables, compte désactivé.
begin;

select plan(39);

create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère Intégration') as integ,
       tests.ministere('Intégration') as integ_m,
       tests.compte('Ministère FIJ') as fij,
       tests.ministere('FIJ') as fij_m,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.ministere('Jeunesse') as jeu_m,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       (select i.id from public.indicateur i where i.code = 'actifs') as actifs,
       (select i.id from public.indicateur i where i.code = 'en_fij') as en_fij,
       (select i.id from public.indicateur i where i.libelle = 'Visuels livrés ce mois') as visuels,
       (select s.id from public.session s where s.type = 'batir' and s.date = private.dimanche_reference() - 1) as batir,
       (select e.id from public.evenement e where e.titre = 'Welcome Prodiges') as evenement_integ;

-- Une session future, déclarée par l'administration (saisie refusée).
insert into public.session (type, date, intitule, saisi_par)
select 'autre', private.aujourdhui() + 7, 'Rassemblement futur de test', ctx.admin from ctx;
alter table ctx add column session_future uuid;
update ctx set session_future = (select s.id from public.session s where s.intitule = 'Rassemblement futur de test');

grant select on ctx to authenticated;

select ok((select count(*) from ctx where com is not null and fij is not null and berger is not null
             and service is not null and visuels is not null and batir is not null and evenement_integ is not null) = 1,
  'le jeu d''exemple fournit les comptes, les indicateurs, la session et l''événement utilisés ici');

-- Auteur et heure imposés
select tests.se_connecter((select com from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
  select ctx.service, ctx.com_m, private.dimanche_reference(), 10, '2099-01-01', ctx.berger from ctx
$$, 'un ministère envoie saisi_le = 2099-01-01 et le saisi_par du berger : la ligne est acceptée');
select tests.deconnecter();

select is((select m.saisi_par from public.mesure m order by m.id desc limit 1), (select com from ctx),
  'la ligne est au nom du compte connecté, pas du berger');
select ok((select m.saisi_le from public.mesure m order by m.id desc limit 1) between now() and clock_timestamp(),
  'la ligne est datée de maintenant, pas de 2099');

-- Dates des mesures
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, private.dimanche_reference() - 1, 10 from ctx
$$, 'P0001', 'La date doit être un dimanche passé ou aujourd''hui.', 'un samedi est refusé');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, private.dimanche_reference() + 7, 10 from ctx
$$, 'P0001', 'La date doit être un dimanche passé ou aujourd''hui.', 'un dimanche futur est refusé');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.actifs, ctx.com_m, date '2020-01-05', 15 from ctx
$$, 'une valeur « à ce jour » envoyée avec une date ancienne est acceptée');
select tests.deconnecter();

select is((select m.date_ref from public.mesure m order by m.id desc limit 1), private.aujourdhui(),
  'la valeur « à ce jour » prend la date du jour (heure de Paris)');

-- Dont en FIJ, jamais plus que les STARs actifs (dernières valeurs du même ministère)
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.en_fij, ctx.com_m, private.aujourdhui(), 20 from ctx
$$, 'P0001', 'Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.', '« dont en FIJ » supérieur aux actifs refusé');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.en_fij, ctx.com_m, private.aujourdhui(), 12 from ctx
$$, '« dont en FIJ » égal ou inférieur aux actifs accepté');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.actifs, ctx.com_m, private.aujourdhui(), 5 from ctx
$$, 'P0001', 'Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.',
  'des actifs plus bas que le dernier « dont en FIJ » sont refusés');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.actifs, ctx.com_m, private.aujourdhui(), 30 from ctx
  union all
  select ctx.en_fij, ctx.com_m, private.aujourdhui(), 25 from ctx
$$, 'actifs et « dont en FIJ » du même envoi sont comparés après l''envoi');

-- Une ligne de journal par envoi
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, private.dimanche_reference() - 7, 11 from ctx
  union all
  select ctx.actifs, ctx.com_m, private.aujourdhui(), 30 from ctx
  union all
  select ctx.en_fij, ctx.com_m, private.aujourdhui(), 24 from ctx
$$, 'un envoi de trois chiffres est accepté');
select tests.deconnecter();

select is((select count(*)::int from public.journal j
            where j.compte = (select com from ctx)
              and j.le = (select max(m.saisi_le) from public.mesure m where m.saisi_par = (select com from ctx))),
  1, 'un envoi de plusieurs lignes donne une seule ligne de journal');
select is((select jsonb_array_length(j.detail -> 'lignes') from public.journal j
            where j.compte = (select com from ctx)
              and j.le = (select max(m.saisi_le) from public.mesure m where m.saisi_par = (select com from ctx))),
  3, 'la ligne de journal cite les trois chiffres de l''envoi');
select is((select j.ministere_id from public.journal j
            where j.compte = (select com from ctx)
              and j.le = (select max(m.saisi_le) from public.mesure m where m.saisi_par = (select com from ctx))),
  (select com_m from ctx), 'la ligne de journal vise le ministère de la saisie');

-- Carte des FIJ : seulement le ministère FIJ, les 8 départements en un envoi
select tests.se_connecter((select fij from ctx), 'aal2');
select lives_ok($$
  insert into public.fij_departement (ministere_id, departement, valeur)
  select ctx.fij_m, d.departement, 3 from ctx
  cross join (values ('75'), ('77'), ('78'), ('91'), ('92'), ('93'), ('94'), ('95')) as d(departement)
$$, 'le ministère FIJ envoie les 8 départements');
select tests.deconnecter();

select results_eq($$
  select j.action, (j.detail ->> 'total')::int from public.journal j
   where j.compte = (select fij from ctx) and j.action = 'fij_saisie'
     and j.le = (select max(f.saisi_le) from public.fij_departement f)
$$, $$ values ('fij_saisie', 24) $$, 'la carte des FIJ donne une seule ligne de journal, avec le total');

select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$
  insert into public.fij_departement (ministere_id, departement, valeur)
  select ctx.com_m, '75', 3 from ctx
$$, '42501', null, 'un autre ministère que FIJ ne peut pas envoyer la carte');

-- Ajouts refusés par la RLS
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.integ_m, private.dimanche_reference(), 3 from ctx
$$, '42501', null, 'un ministère ne saisit pas pour un autre ministère');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur)
  select ctx.session_future, ctx.com_m, 5 from ctx
$$, '42501', null, 'une session future n''accepte aucune saisie');
select lives_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.batir, ctx.com_m, 14, 1 from ctx
$$, 'une session passée accepte la saisie de tout ministère actif');
select throws_ok($$
  insert into public.participation (session_id, ministere_id, valeur, deja_comptes)
  select ctx.batir, ctx.com_m, 3, 4 from ctx
$$, '23514', null, 'les déjà comptés ne dépassent pas les présents');
select throws_ok($$
  insert into public.reunion (ministere_id, date) select ctx.com_m, private.aujourdhui() - 1 from ctx
$$, '42501', null, 'une réunion passée est refusée');
select lives_ok($$
  insert into public.reunion (ministere_id, date, heure) select ctx.com_m, private.aujourdhui(), '20:00' from ctx
$$, 'une réunion datée d''aujourd''hui est acceptée');
select throws_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select ctx.evenement_integ, private.aujourdhui() + 3, 'annule' from ctx
$$, '42501', null, 'un ministère ne met pas à jour l''événement d''un autre ministère');
select tests.deconnecter();

select tests.se_connecter((select integ from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.visuels, ctx.integ_m, private.aujourdhui(), 3 from ctx
$$, '42501', null, 'un ministère ne saisit pas l''indicateur propre d''un autre ministère');
select tests.deconnecter();

-- Retrait (étape 4) : l'état passe à « retiré », actif suit, et le message nomme l'indicateur.
update public.indicateur set etat = 'retire', retrait_motif = 'plus_suivi' where id = (select visuels from ctx);
select tests.se_connecter((select com from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.visuels, ctx.com_m, private.aujourdhui(), 3 from ctx
$$, 'P0001', '« Visuels livrés ce mois » n''est plus proposé à la saisie.',
  'un indicateur retiré n''accepte plus de saisie, et le message le nomme');
select tests.deconnecter();

select tests.se_connecter((select berger from ctx), 'aal2');
select throws_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.com_m, private.dimanche_reference(), 3 from ctx
$$, '42501', null, 'le berger ne saisit pas de chiffres');
select tests.deconnecter();

-- Journal et modération inaltérables, même pour le propriétaire des tables
select throws_ok($$ update public.journal set detail = detail $$, '42501', null,
  'journal : update refusé au propriétaire');
select throws_ok($$ delete from public.journal $$, '42501', null, 'journal : delete refusé au propriétaire');
select throws_ok($$ truncate public.journal $$, '42501', null, 'journal : truncate refusé au propriétaire');
select throws_ok($$ update public.moderation set motif = motif $$, '42501', null,
  'modération : update refusé au propriétaire');
select throws_ok($$ delete from public.moderation $$, '42501', null, 'modération : delete refusé au propriétaire');
select throws_ok($$ truncate public.moderation $$, '42501', null, 'modération : truncate refusé au propriétaire');

-- Un ministère désactivé perd tous ses droits tout de suite, même avec un jeton encore valable
update public.ministere set desactive_le = now() where id = (select jeu_m from ctx);
update public.compte set desactive_le = now() where user_id = (select jeu from ctx);

select is(tests.compter((select jeu from ctx), 'aal2', 'select * from public.ministere'), 0,
  'compte désactivé : aucune ligne de ministere');
select is(tests.compter((select jeu from ctx), 'aal2', 'select * from public.compte'), 1,
  'compte désactivé : il lit encore sa propre ligne de compte (écran « Ce compte est désactivé »)');
select tests.se_connecter((select jeu from ctx), 'aal2');
select throws_ok($$
  insert into public.reunion (ministere_id, date) select ctx.jeu_m, private.aujourdhui() + 1 from ctx
$$, '42501', null, 'compte désactivé : ajout refusé');
select throws_ok($$ select public.creer_point('Essai', null, null, 'normale', null, '{}') $$,
  '42501', 'Compte inactif ou inconnu.', 'compte désactivé : fonction de l''API refusée');
select tests.deconnecter();

select * from finish();
rollback;
