-- Report d'un événement lu dans l'historique (K10b ; docs/plan-etape-4.md, section 4, « B6 ») :
-- « reporté » n'est pas un statut. v_evenement.reporte_du rend la date de l'état précédent si
-- la date a changé au dernier état, sinon null ; la ligne de journal evenement_modifie porte
-- date_precedente. Puis l'événement du jeu d'exemple (seed/42-evenements.sql) : réunion des
-- responsables de Coordination, en attente, reportée, qui mentionne Communication.
begin;

select plan(21);

create temp table ctx as
select tests.creer_ministere('Report A') as a_m;
alter table ctx add column a uuid, add column ev uuid;
update ctx set a = tests.creer_compte('report-a@exemple.test', 'ministere', a_m);
grant select on ctx to authenticated;

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Report, événement', private.aujourdhui() + 5, 'attente_validation', '{}')
$$, 'jeu d''essai : A ajoute un événement à J+5');
select tests.deconnecter();
update ctx set ev = (select e.id from public.evenement e where e.titre = 'Report, événement');

create temp view report with (security_invoker = true) as
select e.date, e.statut, e.reporte_du from public.v_evenement e where e.titre = 'Report, événement';
grant select on report to authenticated;

select is(tests.lire((select a from ctx), 'aal2', 'select reporte_du from report'),
  '[{"reporte_du": null}]'::jsonb, 'un seul état : pas de report');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select ev, private.aujourdhui() + 8, 'attente_validation' from ctx
$$, 'A reporte l''événement à J+8');
select tests.deconnecter();
select is((select reporte_du from report), private.aujourdhui() + 5, 'après le report : reporté du J+5');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select ev, private.aujourdhui() + 8, 'valide' from ctx
$$, 'A passe l''événement « Validé », date inchangée');
select tests.deconnecter();
select is((select reporte_du from report), null::date, 'statut changé sans changer la date : plus de report affiché');

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut) select ev, private.aujourdhui() + 6, 'valide' from ctx
$$, 'A avance l''événement à J+6');
select tests.deconnecter();
select is((select reporte_du from report), private.aujourdhui() + 8, 'après le deuxième changement de date : reporté du J+8');

select results_eq($$
  select j.action, j.detail -> 'date', j.detail -> 'date_precedente' from public.journal j
   where j.cible_id = (select ev from ctx) order by j.id
$$, $$
  values ('evenement_ajoute', to_jsonb(private.aujourdhui() + 5), null::jsonb),
         ('evenement_modifie', to_jsonb(private.aujourdhui() + 8), to_jsonb(private.aujourdhui() + 5)),
         ('evenement_modifie', to_jsonb(private.aujourdhui() + 8), to_jsonb(private.aujourdhui() + 8)),
         ('evenement_modifie', to_jsonb(private.aujourdhui() + 6), to_jsonb(private.aujourdhui() + 8))
$$, 'journal : chaque mise à jour porte la date précédente ; l''ajout n''en a pas');
select is((select count(*)::int from public.journal j
            where j.cible_id = (select ev from ctx) and strpos(j.detail::text, 'Report, événement') > 0), 0,
  'journal : jamais le nom de l''événement');

-- Jeu d'exemple : la réunion des responsables (seed/42-evenements.sql)
create temp table graine as
select tests.compte('Berger') as berger,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Ministère Communication') as com,
       tests.compte('Ministère Intégration') as integ,
       tests.compte('Administration de l''église') as admin,
       tests.ministere('Communication') as com_m,
       (select e.id from public.evenement e where e.titre = 'Réunion des responsables') as ev;
grant select on graine to authenticated;

select is(tests.lire((select berger from graine), 'aal2', $$
  select statut, reporte_du = date - 2 as reporte_de_deux_jours, a_confirmer, jours < 0 as passe
    from public.v_evenement where titre = 'Réunion des responsables'
$$), '[{"passe": true, "statut": "attente_validation", "a_confirmer": true, "reporte_de_deux_jours": true}]'::jsonb,
  'jeu d''exemple : en attente, reportée de deux jours, date passée, à confirmer');
select results_eq($$ select m.ministere_id from public.evenement_mention m where m.evenement_id = (select ev from graine) $$,
  $$ select com_m from graine $$, 'jeu d''exemple : la réunion des responsables mentionne Communication');
select is(tests.compter((select com from graine), 'aal2',
  'select 1 from public.v_evenement where id = (select ev from graine) and a_confirmer'), 1,
  'jeu d''exemple : Communication, mentionnée, lit l''événement et son alerte');
select is(tests.compter((select integ from graine), 'aal2', 'select 1 from public.v_evenement where id = (select ev from graine)'), 0,
  'jeu d''exemple : Intégration ne lit pas l''événement');
select is(tests.compter((select admin from graine), 'aal2', 'select 1 from public.v_evenement where id = (select ev from graine)'), 0,
  'jeu d''exemple : l''administration ne lit pas l''événement');
select is(tests.essai((select com from graine), 'aal2', $$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, e.date, 'valide' from public.v_evenement e where e.titre = 'Réunion des responsables'
$$), '42501', 'jeu d''exemple : Communication, mentionnée, ne change pas le statut');
select is(tests.essai((select coo from graine), 'aal2', $$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, e.date, 'valide' from public.v_evenement e where e.titre = 'Réunion des responsables'
$$), 'ok', 'jeu d''exemple : Coordination passe l''événement « Validé » sur sa date passée inchangée');
select is(tests.essai((select coo from graine), 'aal2', $$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, e.date, e.statut from public.v_evenement e where e.titre = 'Réunion des responsables'
$$), 'P0001', 'jeu d''exemple : Coordination ne renvoie pas le même état');
select is(tests.essai((select coo from graine), 'aal2', $$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, e.date - 1, e.statut from public.v_evenement e where e.titre = 'Réunion des responsables'
$$), 'P0001', 'jeu d''exemple : Coordination ne choisit pas une autre date passée');
select results_eq($$
  select j.action, j.compte, j.detail from public.journal j where j.cible_id = (select ev from graine) order by j.id
$$, $$
  select 'evenement_ajoute', g.coo,
         jsonb_build_object('date', e.date - 2, 'statut', 'attente_validation', 'mentions', jsonb_build_array(g.com_m))
    from graine g join public.v_evenement e on e.id = g.ev
  union all
  select 'evenement_modifie', g.coo,
         jsonb_build_object('date', e.date, 'statut', 'attente_validation', 'date_precedente', e.date - 2)
    from graine g join public.v_evenement e on e.id = g.ev
$$, 'jeu d''exemple : une ligne d''ajout avec la mention, une ligne de report avec la date précédente, au nom de Coordination');
select ok((select max(j.le) from public.journal j where j.cible_id = (select ev from graine))
          < (select max(j.le) from public.journal j where j.compte = (select coo from graine) and j.action = 'reunion_saisie'),
  'jeu d''exemple : la réunion des responsables ne change pas la fraîcheur de Coordination');

select * from finish();
rollback;
