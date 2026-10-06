-- Matrice des droits des objets du lot B6 (docs/plan-etape-4.md, section 4, « Matrice des
-- droits des objets nouveaux » ; BRIEF, section 7) : evenement, evenement_etat,
-- evenement_mention, v_evenement et ajouter_evenement à quatre arguments, pour le ministère
-- porteur, le ministère mentionné, un autre ministère, le berger, le conseil, l'administration
-- de l'église et EJP Tech, en aal2 ; puis, par tests.verifier_matrice (000-outils.test.sql),
-- chaque ligne en aal1 (rien lu, tout refusé) et l'anonyme (42501 partout).
begin;

select plan(139);

-- Jeu d'essai : A porte l'événement et mentionne B ; C est un autre ministère ; D, actif, sert
-- de mention à l'essai de ajouter_evenement (aucun profil ne s'y mentionne lui-même).
create temp table ctx as
select tests.creer_ministere('Matrice B6 A') as a_m,
       tests.creer_ministere('Matrice B6 B') as b_m,
       tests.creer_ministere('Matrice B6 C') as c_m,
       tests.creer_ministere('Matrice B6 D') as d_m;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column berger uuid,
  add column conseil uuid, add column admin uuid, add column tech uuid, add column ev uuid;
update ctx set a = tests.creer_compte('matrice-b6-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('matrice-b6-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('matrice-b6-c@exemple.test', 'ministere', c_m),
               berger = tests.creer_compte('matrice-b6-berger@exemple.test', 'berger'),
               conseil = tests.creer_compte('matrice-b6-conseil@exemple.test', 'conseil'),
               admin = tests.creer_compte('matrice-b6-admin@exemple.test', 'admin_eglise'),
               tech = tests.creer_compte('matrice-b6-tech@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$
  select public.ajouter_evenement('Matrice B6, événement', private.aujourdhui() + 10, 'attente_validation',
    array[(select b_m from ctx)])
$$, 'jeu d''essai : A ajoute un événement qui mentionne B');
select tests.deconnecter();
update ctx set ev = (select e.id from public.evenement e where e.titre = 'Matrice B6, événement');
select ok((select count(*) from ctx where ev is not null) = 1, 'le jeu d''essai a son événement');

-- Profils, dans l'ordre des colonnes de la matrice.
create temp table profil as
select x.ordre, x.nom, x.compte
from ctx
cross join lateral (values
  (1, 'ministère porteur', ctx.a),
  (2, 'ministère mentionné', ctx.b),
  (3, 'autre ministère', ctx.c),
  (4, 'berger', ctx.berger),
  (5, 'conseil', ctx.conseil),
  (6, 'administration', ctx.admin),
  (7, 'EJP Tech', ctx.tech)
) as x(ordre, nom, compte);

-- La matrice en aal2. Colonnes des attendus dans l'ordre des profils : porteur, mentionné,
-- autre ministère, berger, conseil, administration, EJP Tech. « lire » : lignes de
-- l'événement du jeu d'essai ; toute autre action : ok ou le code d'erreur.
create temp table matrice as
select row_number() over (order by o.rang, p.ordre) as rang,
       p.nom as profil, o.objet, o.action, 'aal2'::text as aal, o.attendus[p.ordre] as attendu, o.requete
from ctx
cross join lateral (values
  (1, 'evenement', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement where id = %L', ctx.ev)),
  (2, 'evenement_etat', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_etat where evenement_id = %L', ctx.ev)),
  (3, 'evenement_mention', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select 1 from public.evenement_mention where evenement_id = %L', ctx.ev)),
  (4, 'v_evenement', 'lire', '{1, 1, 0, 1, 1, 0, 1}'::text[],
      format('select jours, a_confirmer, reporte_du from public.v_evenement where id = %L', ctx.ev)),
  (5, 'evenement_mention', 'ajouter', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_mention (evenement_id, ministere_id) values (%L, %L)', ctx.ev, ctx.c_m)),
  (6, 'evenement_mention', 'modifier', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('update public.evenement_mention set ministere_id = %L where evenement_id = %L', ctx.c_m, ctx.ev)),
  (7, 'evenement_mention', 'supprimer', '{42501, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('delete from public.evenement_mention where evenement_id = %L', ctx.ev)),
  (8, 'evenement_etat', 'ajouter', '{ok, 42501, 42501, 42501, 42501, 42501, 42501}'::text[],
      format('insert into public.evenement_etat (evenement_id, date, statut) values (%L, %L, %L)',
             ctx.ev, private.aujourdhui() + 12, 'valide')),
  (9, 'ajouter_evenement', 'appeler', '{ok, ok, ok, 42501, 42501, 42501, 42501}'::text[],
      format('select public.ajouter_evenement(%L, %L, %L, array[%L]::uuid[])',
             'Matrice B6, essai', private.aujourdhui() + 5, 'brouillon', ctx.d_m))
) as o(rang, objet, action, attendus, requete)
cross join profil p;
grant select on matrice, profil to authenticated, anon;

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice order by rang',
  'select nom, compte from profil',
  true);

-- Aucune écriture directe dans evenement_mention : ni GRANT insert, ni politique d'ajout.
select ok(not has_table_privilege('authenticated', 'public.evenement_mention', 'INSERT'),
  'evenement_mention : aucun GRANT insert pour authenticated (ajout par ajouter_evenement seulement)');
select is_empty($$
  select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'evenement_mention' and p.cmd <> 'SELECT'
     and p.policyname <> 'double_authentification'
$$, 'evenement_mention : aucune politique d''ajout, de modification ni de suppression');

select * from finish();
rollback;
