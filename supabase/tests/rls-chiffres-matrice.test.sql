-- Matrice des droits du domaine « chiffres » (BRIEF, section 7, « Matrice des droits » et
-- « Tests obligatoires »), écrite comme des données (table, opération, profil, niveau aal,
-- résultat attendu), puis exécutée en boucle.
-- Tables : ministere, compte, indicateur, mesure, fij_departement, session, session_attendu,
-- participation. Profils : ministère (Communication), ministère FIJ, berger, conseil,
-- administration de l'église, EJP Tech, ministère désactivé et anonyme, en aal1 et en aal2 ;
-- service_role (clé secrète des Edge Functions) pour les tables de saisie en ajout seul.
-- EJP Tech lit ce que lit le berger et n'ajoute rien (docs/decisions.md, T29).
-- Résultat d'une lecture : le nombre de lignes lues. Résultat d'une écriture : « accepté » ou
-- le code d'erreur (42501 : droit absent ou refus de la RLS). Update et delete sont refusés à
-- tous, sur toutes les tables (règle 1). Chaque essai tourne dans une sous-transaction annulée.
begin;

select plan(521);

-- Contexte : comptes du jeu d'exemple, un ministère désactivé avec son compte, et un
-- indicateur propre de Jeunesse avec un chiffre (un ministère ne lit pas les chiffres propres
-- d'un autre ministère).
create temp table ctx as
select tests.compte('Ministère Communication') as com,
       tests.ministere('Communication') as com_m,
       tests.compte('Ministère FIJ') as fij,
       tests.ministere('FIJ') as fij_m,
       tests.compte('Ministère Jeunesse') as jeu,
       tests.ministere('Jeunesse') as jeu_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as ejptech,
       (select i.id from public.indicateur i where i.code = 'service') as service,
       (select s.id from public.session s where s.type = 'batir' and s.date = private.dimanche_reference() - 1) as batir,
       private.dimanche_reference() as dimanche;

-- desactiver-compte pose la date de désactivation du compte et de son ministère.
alter table ctx add column des_m uuid, add column des uuid;
update ctx set des_m = tests.creer_ministere('Essai matrice, ministère désactivé');
update ctx set des = tests.creer_compte('essai-matrice-desactive@exemple.test', 'ministere', des_m);
update public.ministere set desactive_le = now() where id = (select des_m from ctx);
update public.compte set desactive_le = now() where user_id = (select des from ctx);

insert into public.indicateur (libelle, nature, ministere_id, ordre)
select 'Essai matrice, propre à Jeunesse', 'dimanche', c.jeu_m, 90 from ctx c;
insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_par)
select i.id, c.jeu_m, c.dimanche, 4, c.jeu
from ctx c
join public.indicateur i on i.ministere_id = c.jeu_m and i.libelle = 'Essai matrice, propre à Jeunesse';

-- Profils. cible : le ministère au nom duquel le profil tente d'écrire (le sien pour un compte
-- de ministère, Communication sinon). mesures : lignes de mesure que le profil doit lire.
create temp table profil (
  ordre integer primary key,
  code text not null unique,
  nom text not null,
  user_id uuid,
  cible uuid not null,
  mesures integer
);
insert into profil (ordre, code, nom, user_id, cible)
select 1, 'ministere', 'ministère Communication', c.com, c.com_m from ctx c
union all select 2, 'ministere_fij', 'ministère FIJ', c.fij, c.fij_m from ctx c
union all select 3, 'berger', 'berger', c.berger, c.com_m from ctx c
union all select 4, 'conseil', 'conseil', c.conseil, c.com_m from ctx c
union all select 5, 'admin_eglise', 'administration de l''église', c.admin, c.com_m from ctx c
union all select 6, 'admin_plateforme', 'EJP Tech', c.ejptech, c.com_m from ctx c
union all select 7, 'desactive', 'ministère désactivé', c.des, c.des_m from ctx c
union all select 8, 'anonyme', 'anonyme', null, c.com_m from ctx c;

-- Mesure : tout pour le berger, le conseil et EJP Tech (lecture seule, T29) ; les indicateurs
-- communs de tous et ses indicateurs propres pour un ministère ; les indicateurs communs pour
-- l'administration.
update profil p set mesures = case
    when p.code in ('berger', 'conseil', 'admin_plateforme') then (select count(*) from public.mesure)
    when p.code in ('ministere', 'ministere_fij') then
      (select count(*) from public.mesure m join public.indicateur i on i.id = m.indicateur_id
        where i.ministere_id is null or m.ministere_id = p.cible)
    when p.code = 'admin_eglise' then
      (select count(*) from public.mesure m join public.indicateur i on i.id = m.indicateur_id
        where i.ministere_id is null)
    else 0
  end;

-- Tables, colonne modifiée par l'essai d'update, nombre de lignes (lu sans RLS).
create temp table tab (ordre integer primary key, nom text not null, colonne text not null, total integer);
insert into tab (ordre, nom, colonne) values
  (1, 'ministere', 'nom'), (2, 'compte', 'libelle'), (3, 'indicateur', 'libelle'), (4, 'mesure', 'valeur'),
  (5, 'fij_departement', 'valeur'), (6, 'session', 'date'), (7, 'session_attendu', 'ministere_id'),
  (8, 'participation', 'valeur');
update tab set total = case nom
    when 'ministere' then (select count(*) from public.ministere)
    when 'compte' then (select count(*) from public.compte)
    when 'indicateur' then (select count(*) from public.indicateur)
    when 'mesure' then (select count(*) from public.mesure)
    when 'fij_departement' then (select count(*) from public.fij_departement)
    when 'session' then (select count(*) from public.session)
    when 'session_attendu' then (select count(*) from public.session_attendu)
    when 'participation' then (select count(*) from public.participation)
  end;

-- Essai d'ajout de chaque table : une ligne valable, pour que seul le droit décide.
-- {cible} devient le ministère cible du profil.
create temp table ajout (tab text primary key, requete text not null);
insert into ajout (tab, requete)
select 'ministere', 'insert into public.ministere (nom) values (''Essai matrice'')' from ctx
union all
select 'compte', 'insert into public.compte (user_id, type, libelle) values (gen_random_uuid(), ''conseil'', ''Essai matrice'')'
from ctx
union all
select 'indicateur',
       'insert into public.indicateur (libelle, nature, ministere_id) values (''Essai matrice'', ''dimanche'', {cible})'
from ctx
union all
select 'mesure', format('insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur) values (%L, {cible}, %L, 5)',
                       c.service, c.dimanche)
from ctx c
union all
select 'fij_departement', 'insert into public.fij_departement (ministere_id, departement, valeur) values ({cible}, ''75'', 1)'
from ctx
union all
select 'session', format('insert into public.session (type, date, intitule) values (''autre'', %L, ''Essai matrice'')',
                        c.dimanche)
from ctx c
union all
select 'session_attendu', format('insert into public.session_attendu (session_id, ministere_id) values (%L, %L)',
                                c.batir, c.des_m)
from ctx c
union all
select 'participation',
       format('insert into public.participation (session_id, ministere_id, valeur, deja_comptes) values (%L, {cible}, 5, 1)',
              c.batir)
from ctx c;

-- La matrice : 8 tables, 4 opérations, 8 profils, 2 niveaux.
create temp table matrice as
select (row_number() over (order by t.ordre, o.ordre, p.ordre, a.aal))::integer as n,
       t.nom as tab, o.op, p.code as profil, p.nom as profil_nom, a.aal,
       case o.op
         when 'select' then format('select * from public.%I', t.nom)
         when 'insert' then replace(j.requete, '{cible}', format('%L::uuid', p.cible))
         when 'update' then format('update public.%I set %I = %I', t.nom, t.colonne, t.colonne)
         else format('delete from public.%I', t.nom)
       end as requete,
       case
         when p.code = 'anonyme' or o.op in ('update', 'delete') then '42501'
         when o.op = 'insert' then
           case when a.aal = 'aal2'
                 and ((t.nom in ('mesure', 'participation') and p.code in ('ministere', 'ministere_fij'))
                      or (t.nom = 'fij_departement' and p.code = 'ministere_fij'))
                then 'accepté' else '42501' end
         else (case
                 when a.aal = 'aal1' or p.code = 'desactive' then (case when t.nom = 'compte' then 1 else 0 end)
                 when t.nom in ('ministere', 'compte') then t.total
                 when t.nom = 'mesure' then p.mesures
                 else t.total
               end)::text || ' lignes'
       end as attendu
from tab t
join ajout j on j.tab = t.nom
cross join (values (1, 'select'), (2, 'insert'), (3, 'update'), (4, 'delete')) as o(ordre, op)
cross join profil p
cross join (values ('aal1'), ('aal2')) as a(aal);

-- La clé secrète (service_role) ne modifie ni n'efface les saisies non plus.
insert into matrice (n, tab, op, profil, profil_nom, aal, requete, attendu)
select (512 + row_number() over (order by t.ordre, o.ordre))::integer, t.nom, o.op, 'service_role',
       'service_role (clé secrète)', 'aal2',
       case o.op when 'update' then format('update public.%I set %I = %I', t.nom, t.colonne, t.colonne)
                 else format('delete from public.%I', t.nom) end,
       '42501'
from tab t
cross join (values (1, 'update'), (2, 'delete')) as o(ordre, op)
where t.nom in ('mesure', 'fij_departement', 'participation');

-- Un essai : se connecter comme le profil, exécuter la requête, noter le résultat, puis tout
-- annuler (sous-transaction), rôle et jeton compris.
create function pg_temp.essayer(p_profil text, p_aal text, p_requete text, out resultat text, out erreur text)
language plpgsql as $$
declare
  v_utilisateur uuid;
  v_lignes bigint;
  v_connecte boolean := false;
begin
  select p.user_id into v_utilisateur from profil p where p.code = p_profil;
  begin
    if p_profil = 'anonyme' then
      perform tests.anonyme(p_aal);
    elsif p_profil = 'service_role' then
      perform set_config('role', 'service_role', true);
      perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
      perform set_config('request.jwt.claim.sub', '', true);
    else
      perform tests.se_connecter(v_utilisateur, p_aal);
    end if;
    v_connecte := true;
    if p_requete like 'select %' then
      execute format('select count(*) from (%s) as x', p_requete) into v_lignes;
      resultat := v_lignes || ' lignes';
    else
      execute p_requete;
      resultat := 'accepté';
    end if;
    raise exception using errcode = 'ZZ001', message = 'essai terminé';
  exception
    when sqlstate 'ZZ001' then
      null;
    when others then
      resultat := case when v_connecte then sqlstate else 'connexion impossible' end;
      erreur := sqlerrm;
  end;
end $$;

create function pg_temp.derouler_matrice() returns setof text
language plpgsql as $$
declare
  r record;
  e record;
begin
  for r in select * from matrice order by n loop
    select * into e from pg_temp.essayer(r.profil, r.aal, r.requete);
    return next is(e.resultat, r.attendu,
      case when r.profil = 'service_role'
           then format('%s, %s par %s : %s', r.tab, r.op, r.profil_nom, r.attendu)
           else format('%s, %s par %s en %s : %s', r.tab, r.op, r.profil_nom, r.aal, r.attendu) end);
    if e.resultat is distinct from r.attendu then
      return next diag(format('requête : %s ; message : %s', r.requete, coalesce(e.erreur, 'aucun')));
    end if;
  end loop;
end $$;

select ok((select count(*) from ctx
            where com is not null and fij is not null and jeu is not null and berger is not null
              and conseil is not null and admin is not null and ejptech is not null and service is not null
              and batir is not null and des is not null) = 1,
  'le jeu d''exemple et le contexte fournissent les comptes, l''indicateur et la session utilisés ici');
select ok((select mesures from profil where code = 'berger') > (select mesures from profil where code = 'ministere')
          and (select mesures from profil where code = 'ministere') > (select mesures from profil where code = 'admin_eglise'),
  'mesure : le berger lit plus de lignes que Communication, qui en lit plus que l''administration (indicateurs propres)');
select is((select count(*)::integer from matrice), 518,
  'la matrice compte 512 essais (8 tables, 4 opérations, 8 profils, 2 niveaux) et 6 essais de service_role');

select * from pg_temp.derouler_matrice();

select * from finish();
rollback;
