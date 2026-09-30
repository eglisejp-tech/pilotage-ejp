-- Vues de lecture des chiffres (BRIEF, sections 3, 6 et 7). Un ministère, le conseil et
-- l'administration obtiennent les mêmes totaux, la même complétude et la même fraîcheur que le
-- berger ; EJP Tech, un compte en aal1 et un compte désactivé n'obtiennent aucune ligne ;
-- l'anonyme n'a aucun droit. Pourcentage FIJ calculé à partir des sommes (règle 4), jamais une
-- moyenne de pourcentages ; complétude des dimanches et des valeurs « à ce jour » (règle 13) ;
-- un ministère désactivé sort des totaux du moment mais garde ses chiffres dans les courbes
-- des dimanches où il était actif.
begin;

select plan(134);

create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.ministere('Jeunesse') as jeu_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as ejptech,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       (select i.id from public.indicateur i where i.code = 'actifs') as actifs,
       (select i.id from public.indicateur i where i.code = 'en_fij') as en_fij,
       private.dimanche_reference() as dimanche,
       private.aujourdhui() as aujourdhui;

alter table ctx add column p_m uuid, add column q_m uuid, add column r_m uuid, add column s_m uuid,
  add column n2_m uuid, add column n3_m uuid, add column z_m uuid, add column p uuid, add column q uuid,
  add column r uuid, add column s uuid, add column n2 uuid, add column n3 uuid, add column z uuid,
  add column propre uuid;

-- P, Q, R, S et N3 existent depuis un an ; N2 est créé aujourd'hui.
update ctx set p_m = tests.creer_ministere('Essai vues P'),
               q_m = tests.creer_ministere('Essai vues Q'),
               r_m = tests.creer_ministere('Essai vues R'),
               s_m = tests.creer_ministere('Essai vues S'),
               n3_m = tests.creer_ministere('Essai vues N3');
insert into public.ministere (nom) values ('Essai vues N2');
update ctx set n2_m = (select m.id from public.ministere m where m.nom = 'Essai vues N2');
update ctx set p = tests.creer_compte('essai-vues-p@exemple.test', 'ministere', p_m),
               q = tests.creer_compte('essai-vues-q@exemple.test', 'ministere', q_m),
               r = tests.creer_compte('essai-vues-r@exemple.test', 'ministere', r_m),
               s = tests.creer_compte('essai-vues-s@exemple.test', 'ministere', s_m),
               n2 = tests.creer_compte('essai-vues-n2@exemple.test', 'ministere', n2_m),
               n3 = tests.creer_compte('essai-vues-n3@exemple.test', 'ministere', n3_m);

-- S : 7 STARs actifs saisis il y a 45 jours (une valeur de plus de 30 jours).
-- N3 : 50 STARs actifs et 3 STARs au service cinq dimanches avant, saisis quand il était
-- actif ; son compte et son ministère sont désactivés depuis 30 jours.
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select c.actifs, c.s_m, c.aujourdhui - 45, 7, now() - interval '45 days', c.s from ctx c;
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
select c.actifs, c.n3_m, c.aujourdhui - 40, 50, now() - interval '40 days', c.n3 from ctx c
union all
select c.service, c.n3_m, c.dimanche - 35, 3, now() - interval '40 days', c.n3 from ctx c;
update public.ministere set desactive_le = now() - interval '30 days' where id = (select n3_m from ctx);
update public.compte set desactive_le = now() - interval '30 days' where user_id = (select n3 from ctx);

-- Indicateur propre de Jeunesse (dimanche), saisi les deux derniers dimanches.
insert into public.indicateur (libelle, nature, ministere_id, ordre)
select 'Essai vues, propre à Jeunesse', 'dimanche', c.jeu_m, 90 from ctx c;
update ctx set propre = (select i.id from public.indicateur i where i.libelle = 'Essai vues, propre à Jeunesse');
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_par)
select c.propre, c.jeu_m, c.dimanche - 7, 5, c.jeu from ctx c
union all
select c.propre, c.jeu_m, c.dimanche, 8, c.jeu from ctx c;

grant select on ctx to authenticated, anon;

select ok((select count(*) from ctx
            where com is not null and fij is not null and jeu is not null and berger is not null
              and conseil is not null and admin is not null and ejptech is not null and service is not null
              and actifs is not null and en_fij is not null and n2 is not null and n3 is not null
              and propre is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes et les indicateurs utilisés ici');

-- Saisies par les ministères de test (aal2, sous RLS)
select tests.se_connecter((select p from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.actifs, ctx.p_m, ctx.aujourdhui, 10 from ctx
  union all
  select ctx.en_fij, ctx.p_m, ctx.aujourdhui, 10 from ctx
$$, 'P saisit 10 STARs actifs, dont 10 en FIJ (100 %)');
select tests.deconnecter();
select tests.se_connecter((select q from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.actifs, ctx.q_m, ctx.aujourdhui, 90 from ctx
  union all
  select ctx.en_fij, ctx.q_m, ctx.aujourdhui, 0 from ctx
$$, 'Q saisit 90 STARs actifs, dont 0 en FIJ (0 %)');
select tests.deconnecter();
select tests.se_connecter((select r from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.en_fij, ctx.r_m, ctx.aujourdhui, 5 from ctx
$$, 'R saisit 5 STARs en FIJ, sans STARs actifs');
select tests.deconnecter();
select tests.se_connecter((select n2 from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.service, ctx.n2_m, ctx.dimanche - 7, 4 from ctx
$$, 'N2, créé aujourd''hui, saisit 4 STARs au service du dimanche précédent');
select tests.deconnecter();

-- Pourcentage de STARs en FIJ : somme des « dont en FIJ » sur somme des actifs, pour les
-- ministères actifs qui ont les deux valeurs (règle 4)
select is(tests.lire((select berger from ctx), 'aal2',
    'select en_fij, actifs, nb_ministeres, pourcentage from public.v_pourcentage_fij'),
  '[{"en_fij": 74, "actifs": 183, "nb_ministeres": 10, "pourcentage": 40}]'::jsonb,
  'pourcentage FIJ : 74 sur 183 (64 + 10 + 0 sur 83 + 10 + 90), soit 40 %, sur 10 ministères ; R, S et N3 exclus');
select isnt((select pourcentage::integer from public.v_pourcentage_fij),
  (select round(avg(100.0 * f.valeur / a.valeur))::integer
     from public.v_derniere_mesure a
     join public.v_derniere_mesure f on f.ministere_id = a.ministere_id and f.code = 'en_fij'
     join public.ministere m on m.id = a.ministere_id and m.desactive_le is null
    where a.code = 'actifs' and a.valeur > 0),
  'le pourcentage vient des sommes, pas de la moyenne des pourcentages des ministères (72 %)');

-- Totaux « à ce jour » : ministères actifs aujourd'hui, valeurs de plus de 30 jours
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, nb_saisis, nb_actifs, nb_plus_de_30_jours from public.v_total_a_ce_jour where code = ''actifs'''),
  '[{"total": 190, "nb_saisis": 11, "nb_actifs": 13, "nb_plus_de_30_jours": 2}]'::jsonb,
  'STARs actifs : 190 (83 + 10 + 90 + 7), 11 sur 13, 2 valeurs de plus de 30 jours ; N3, désactivé, sort du total');
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, nb_saisis, nb_actifs, nb_plus_de_30_jours from public.v_total_a_ce_jour where code = ''en_fij'''),
  '[{"total": 79, "nb_saisis": 11, "nb_actifs": 13, "nb_plus_de_30_jours": 1}]'::jsonb,
  'dont en FIJ : 79 (64 + 10 + 0 + 5), 11 sur 13');

-- Complétude d'un dimanche : ministères actifs ce jour-là, plus ceux qui ont saisi sans l'être
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, nb_saisis, nb_attendus from public.v_total_dimanche where indicateur_id = (select service from ctx) and dimanche = (select dimanche - 7 from ctx)'),
  '[{"total": 59, "nb_saisis": 8, "nb_attendus": 13}]'::jsonb,
  'dimanche précédent : 59 (55 + 4), 8 sur 13 ; N2 compte parce qu''il a saisi, N3 (désactivé avant) ne compte pas');
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, nb_saisis, nb_attendus from public.v_total_dimanche where indicateur_id = (select service from ctx) and dimanche = (select dimanche - 35 from ctx)'),
  '[{"total": 57, "nb_saisis": 9, "nb_attendus": 13}]'::jsonb,
  'cinq dimanches avant : 57 (54 + 3), 9 sur 13 ; N3, actif ce jour-là, garde son chiffre dans la courbe');
select is(tests.compter((select berger from ctx), 'aal2',
    'select * from public.v_total_dimanche where indicateur_id = (select propre from ctx)'), 0,
  'un indicateur propre n''est jamais additionné dans la vue de l''église');

-- Indicateurs propres dans les vues
select is(tests.compter((select com from ctx), 'aal2',
    'select * from public.v_mesure_dimanche where indicateur_id = (select propre from ctx)'), 0,
  'v_mesure_dimanche : Communication ne lit pas l''indicateur propre de Jeunesse');
select is(tests.compter((select jeu from ctx), 'aal2',
    'select * from public.v_mesure_dimanche where indicateur_id = (select propre from ctx)'), 2,
  'v_mesure_dimanche : Jeunesse lit ses deux dimanches');
select is(tests.compter((select admin from ctx), 'aal2',
    'select * from public.v_derniere_mesure where code is null'), 0,
  'v_derniere_mesure : l''administration ne lit aucun indicateur propre');
select is(tests.compter((select berger from ctx), 'aal2',
    'select * from public.v_derniere_mesure where code is null'), 2,
  'v_derniere_mesure : le berger lit les indicateurs propres de Communication et de Jeunesse');

-- Tableau des ministères : ministères actifs ; réunion et point ouvert pour le berger et le
-- conseil seulement
select is(tests.compter((select berger from ctx), 'aal2', 'select * from public.v_tableau_ministeres'), 13,
  'le tableau des ministères liste les 13 ministères actifs, pas le ministère désactivé');
select is(tests.compter((select com from ctx), 'aal2',
    'select * from public.v_tableau_ministeres where prochaine_reunion_date is not null or prochaine_reunion_heure is not null or point_ouvert_priorite is not null'), 0,
  'un ministère ne reçoit ni la prochaine réunion ni le point ouvert des ministères');
select is(tests.compter((select admin from ctx), 'aal2',
    'select * from public.v_tableau_ministeres where prochaine_reunion_date is not null or prochaine_reunion_heure is not null or point_ouvert_priorite is not null'), 0,
  'l''administration non plus');
select ok(tests.compter((select berger from ctx), 'aal2',
    'select * from public.v_tableau_ministeres where prochaine_reunion_date is not null or prochaine_reunion_heure is not null or point_ouvert_priorite is not null') > 0,
  'le berger les reçoit');

-- Chaque vue, pour chaque profil : les mêmes lignes que le berger (indicateurs communs), rien
-- pour EJP Tech, en aal1 ni pour un compte désactivé ; l'anonyme n'a aucun droit.
create temp table vue (ordre integer primary key, nom text not null, requete text not null);
insert into vue (ordre, nom, requete) values
  (1, 'v_derniere_mesure', 'select * from public.v_derniere_mesure where code is not null'),
  (2, 'v_mesure_dimanche',
   'select v.* from public.v_mesure_dimanche v join public.indicateur i on i.id = v.indicateur_id where i.ministere_id is null'),
  (3, 'v_total_dimanche', 'select * from public.v_total_dimanche'),
  (4, 'v_total_a_ce_jour', 'select * from public.v_total_a_ce_jour'),
  (5, 'v_pourcentage_fij', 'select * from public.v_pourcentage_fij'),
  (6, 'v_carte_fij', 'select * from public.v_carte_fij'),
  (7, 'v_participation_courante', 'select * from public.v_participation_courante'),
  (8, 'v_session_completude', 'select * from public.v_session_completude'),
  (9, 'v_ecart_dimanche',
   'select v.* from public.v_ecart_dimanche v join public.indicateur i on i.id = v.indicateur_id where i.ministere_id is null'),
  (10, 'v_ecart_session', 'select * from public.v_ecart_session'),
  (11, 'v_tableau_ministeres',
   'select ministere_id, nom, description, derniere_saisie, prochain_evenement_date, prochain_evenement_titre from public.v_tableau_ministeres');

-- Code d'erreur d'une lecture anonyme ; tout est annulé ensuite (sous-transaction).
create function pg_temp.code_anonyme(p_requete text) returns text
language plpgsql as $$
declare
  v_code text := 'accepté';
  v_connecte boolean := false;
begin
  begin
    perform tests.anonyme();
    v_connecte := true;
    execute p_requete;
    raise exception using errcode = 'ZZ001', message = 'essai terminé';
  exception
    when sqlstate 'ZZ001' then
      null;
    when others then
      v_code := case when v_connecte then sqlstate else 'connexion impossible' end;
  end;
  return v_code;
end $$;

create function pg_temp.lectures() returns setof text
language plpgsql as $$
declare
  c record;
  v record;
  v_berger jsonb;
begin
  select * into c from ctx;
  for v in select * from vue order by ordre loop
    v_berger := tests.lire(c.berger, 'aal2', v.requete);
    return next ok(jsonb_array_length(v_berger) > 0, format('%s : le berger lit des lignes', v.nom));
    return next is(tests.lire(c.com, 'aal2', v.requete), v_berger,
      format('%s : le ministère Communication lit la même chose que le berger', v.nom));
    return next is(tests.lire(c.fij, 'aal2', v.requete), v_berger,
      format('%s : le ministère FIJ lit la même chose que le berger', v.nom));
    return next is(tests.lire(c.conseil, 'aal2', v.requete), v_berger,
      format('%s : le conseil lit la même chose que le berger', v.nom));
    return next is(tests.lire(c.admin, 'aal2', v.requete), v_berger,
      format('%s : l''administration lit la même chose que le berger', v.nom));
    return next is(tests.compter(c.ejptech, 'aal2', v.requete), 0,
      format('%s : EJP Tech ne lit aucune ligne', v.nom));
    return next is(tests.compter(c.com, 'aal1', v.requete), 0,
      format('%s : aucune ligne pour un ministère en aal1', v.nom));
    return next is(tests.compter(c.berger, 'aal1', v.requete), 0,
      format('%s : aucune ligne pour le berger en aal1', v.nom));
    return next is(tests.compter(c.n3, 'aal2', v.requete), 0,
      format('%s : aucune ligne pour un compte désactivé', v.nom));
    return next is(pg_temp.code_anonyme(v.requete), '42501',
      format('%s : l''anonyme n''a aucun droit (42501)', v.nom));
  end loop;
end $$;

select * from pg_temp.lectures();

-- Somme des actifs nulle : Z, créé aujourd'hui et seul ministère resté actif, saisit 0 et 0.
insert into public.ministere (nom) values ('Essai vues Z');
update ctx set z_m = (select m.id from public.ministere m where m.nom = 'Essai vues Z');
update ctx set z = tests.creer_compte('essai-vues-z@exemple.test', 'ministere', z_m);
select tests.se_connecter((select z from ctx), 'aal2');
select lives_ok($$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
  select ctx.actifs, ctx.z_m, ctx.aujourdhui, 0 from ctx
  union all
  select ctx.en_fij, ctx.z_m, ctx.aujourdhui, 0 from ctx
$$, 'Z saisit 0 STARs actifs, dont 0 en FIJ');
select tests.deconnecter();
update public.ministere set desactive_le = now() where desactive_le is null and id <> (select z_m from ctx);

select is(tests.lire((select berger from ctx), 'aal2',
    'select en_fij, actifs, nb_ministeres, pourcentage from public.v_pourcentage_fij'),
  '[{"en_fij": 0, "actifs": 0, "nb_ministeres": 1, "pourcentage": null}]'::jsonb,
  'somme des actifs nulle : le pourcentage n''est pas calculé (« Non calculé »)');
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, nb_saisis, nb_actifs from public.v_total_a_ce_jour where code = ''actifs'''),
  '[{"total": 0, "nb_saisis": 1, "nb_actifs": 1}]'::jsonb,
  'les ministères désactivés sortent des totaux du moment');
select is(tests.lire((select berger from ctx), 'aal2',
    'select total, nb_saisis, nb_attendus from public.v_total_dimanche where indicateur_id = (select service from ctx) and dimanche = (select dimanche - 7 from ctx)'),
  '[{"total": 59, "nb_saisis": 8, "nb_attendus": 13}]'::jsonb,
  'mais leurs chiffres restent dans la courbe des dimanches où ils étaient actifs (59, 8 sur 13)');

select * from finish();
rollback;
