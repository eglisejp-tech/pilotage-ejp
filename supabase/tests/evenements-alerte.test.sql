-- Alerte des événements encore en attente de validation (T31, T32 ; docs/plan-etape-4.md,
-- section 4, « B6 ») : v_evenement.a_confirmer est vrai pour le dernier état « en attente de
-- validation » dont la date tombe dans les 3 jours ou est passée (heure de Paris), si le
-- ministère porteur est actif. Le porteur, les ministères mentionnés, le berger, le conseil et
-- EJP Tech voient l'alerte ; l'administration et les autres ministères ne voient rien.
begin;

select plan(18);

-- Jeu d'essai : A porte les événements, B est mentionné sur l'un d'eux, C est un autre
-- ministère, D porte un événement puis est désactivé.
create temp table ctx as
select tests.creer_ministere('Alerte A') as a_m,
       tests.creer_ministere('Alerte B') as b_m,
       tests.creer_ministere('Alerte C') as c_m,
       tests.creer_ministere('Alerte D') as d_m;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column d uuid,
  add column berger uuid, add column conseil uuid, add column admin uuid, add column tech uuid;
update ctx set a = tests.creer_compte('alerte-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('alerte-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('alerte-c@exemple.test', 'ministere', c_m),
               d = tests.creer_compte('alerte-d@exemple.test', 'ministere', d_m),
               berger = tests.creer_compte('alerte-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('alerte-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('alerte-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('alerte-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

-- Événements écrits comme le jeu d'exemple (sans compte connecté), pour poser aussi des dates
-- passées : un état, écrit il y a deux jours.
create function pg_temp.evenement(p_ministere uuid, p_compte uuid, p_titre text, p_date date,
  p_statut public.statut_evenement) returns uuid
language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.evenement (id, ministere_id, titre, saisi_le, saisi_par)
  values (v_id, p_ministere, p_titre, now() - interval '2 days', p_compte);
  insert into public.evenement_etat (evenement_id, date, statut, saisi_le, saisi_par)
  values (v_id, p_date, p_statut, now() - interval '2 days', p_compte);
  return v_id;
end $$;

select pg_temp.evenement(a_m, a, v.titre, private.aujourdhui() + v.jours, v.statut)
  from ctx
 cross join (values ('Alerte J+4', 4, 'attente_validation'::public.statut_evenement),
                    ('Alerte J+3', 3, 'attente_validation'),
                    ('Alerte J', 0, 'attente_validation'),
                    ('Alerte J-10', -10, 'attente_validation'),
                    ('Alerte valide', 1, 'valide'),
                    ('Alerte brouillon', 1, 'brouillon'),
                    ('Alerte annule', 1, 'annule'),
                    ('Alerte report', 1, 'attente_validation')) as v(titre, jours, statut);
select pg_temp.evenement(d_m, d, 'Alerte ministère désactivé', private.aujourdhui() + 1, 'attente_validation')
  from ctx;
insert into public.evenement_mention (evenement_id, ministere_id)
select e.id, ctx.b_m from public.evenement e, ctx where e.titre = 'Alerte J+3';
update public.ministere set desactive_le = now() where id = (select d_m from ctx);

-- Vue de commodité, lue sous la RLS du lecteur (security_invoker).
create temp view alerte with (security_invoker = true) as
select e.titre, e.jours, e.a_confirmer from public.v_evenement e where e.titre like 'Alerte %';
grant select on alerte to authenticated;

select is(tests.lire((select berger from ctx), 'aal2', 'select * from alerte where titre <> ''Alerte report'''),
  (select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text)
     from (values ('Alerte J+4', 4, false), ('Alerte J+3', 3, true), ('Alerte J', 0, true),
                  ('Alerte J-10', -10, true), ('Alerte valide', 1, false), ('Alerte brouillon', 1, false),
                  ('Alerte annule', 1, false), ('Alerte ministère désactivé', 1, false))
          as x(titre, jours, a_confirmer)),
  'berger : J+4 non ; J+3, J et J-10 oui ; validé, brouillon et annulé non ; ministère désactivé non');

-- Report : à J+5 l'alerte s'arrête, à J+2 elle revient
select is(tests.lire((select berger from ctx), 'aal2', 'select a_confirmer from alerte where titre = ''Alerte report'''),
  '[{"a_confirmer": true}]'::jsonb, 'report : en attente à J+1, à confirmer');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, private.aujourdhui() + 5, 'attente_validation' from public.evenement e where e.titre = 'Alerte report'
$$, 'report : le porteur reporte l''événement à J+5');
select tests.deconnecter();
select is(tests.lire((select berger from ctx), 'aal2', 'select jours, a_confirmer from alerte where titre = ''Alerte report'''),
  '[{"jours": 5, "a_confirmer": false}]'::jsonb, 'report à J+5 : plus d''alerte');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  insert into public.evenement_etat (evenement_id, date, statut)
  select e.id, private.aujourdhui() + 2, 'attente_validation' from public.evenement e where e.titre = 'Alerte report'
$$, 'report : le porteur ramène l''événement à J+2');
select tests.deconnecter();
select is(tests.lire((select berger from ctx), 'aal2', 'select jours, a_confirmer from alerte where titre = ''Alerte report'''),
  '[{"jours": 2, "a_confirmer": true}]'::jsonb, 'report à J+2 : l''alerte revient');

-- Qui voit l'alerte : J+3 (qui mentionne B), J, J-10 et le report à J+2
select is(tests.compter((select a from ctx), 'aal2', 'select 1 from alerte where a_confirmer'), 4,
  'le ministère porteur voit ses 4 événements à confirmer');
select is(tests.compter((select b from ctx), 'aal2', 'select 1 from alerte where a_confirmer'), 1,
  'le ministère mentionné voit l''événement qui le mentionne');
select is(tests.compter((select c from ctx), 'aal2', 'select 1 from alerte'), 0,
  'un autre ministère ne voit rien');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from alerte where a_confirmer'), 4,
  'le berger voit les 4 événements à confirmer');
select is(tests.compter((select conseil from ctx), 'aal2', 'select 1 from alerte where a_confirmer'), 4,
  'le conseil voit les 4 événements à confirmer');
select is(tests.compter((select tech from ctx), 'aal2', 'select 1 from alerte where a_confirmer'), 4,
  'EJP Tech voit les 4 événements à confirmer');
select is(tests.compter((select admin from ctx), 'aal2', 'select 1 from alerte'), 0,
  'l''administration de l''église ne voit rien');
select is(tests.compter((select berger from ctx), 'aal1', 'select 1 from alerte'), 0,
  'aal1 : rien');
select is(tests.lire((select tech from ctx), 'aal2', 'select * from alerte'),
          tests.lire((select berger from ctx), 'aal2', 'select * from alerte'),
  'EJP Tech lit les mêmes lignes que le berger');

-- Minuit à Paris : jours se compte depuis la date de Paris (private.aujourdhui()), jamais
-- depuis la date UTC ; entre 22 h et minuit UTC, les deux diffèrent d'un jour.
select is(tests.compter((select berger from ctx), 'aal2', $$
  select 1 from public.v_evenement
   where titre like 'Alerte %' and jours <> date - (now() at time zone 'Europe/Paris')::date
$$), 0, 'minuit à Paris : jours se compte depuis la date de Paris');

-- Structure de la vue
select results_eq($$
  select column_name::text, data_type::text from information_schema.columns
   where table_schema = 'public' and table_name = 'v_evenement' order by ordinal_position
$$, $$ values ('id', 'uuid'), ('ministere_id', 'uuid'), ('titre', 'text'), ('date', 'date'),
              ('statut', 'USER-DEFINED'), ('mis_a_jour_le', 'timestamp with time zone'),
              ('jours', 'integer'), ('a_confirmer', 'boolean'), ('reporte_du', 'date') $$,
  'v_evenement : les six colonnes de l''étape 3, puis jours, a_confirmer et reporte_du');
select ok(coalesce((select c.reloptions @> array['security_invoker=true'] from pg_class c
                     where c.oid = 'public.v_evenement'::regclass), false),
  'v_evenement reste security_invoker');

select * from finish();
rollback;
