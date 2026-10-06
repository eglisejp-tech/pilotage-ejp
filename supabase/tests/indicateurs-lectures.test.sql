-- Lectures des indicateurs (lot B2 ; docs/plan-etape-4.md, section 4, « B2 » ;
-- docs/conception/contrat-etape-4.md, section 6) : v_mesure_periode, v_indicateur_serie,
-- v_indicateur_suivi, v_calcul et v_usage_indicateurs.
--
-- Correction d'un même dimanche, départage par id, trous, mois en cours hors somme, départ de la
-- somme et rattrapage, ministère désactivé, ajout à valider hors somme, « à ce jour » de plus de
-- 30 jours, états de la dernière période, taux 16 sur 20 = 80, « Non calculé », Σ/Σ sur l'année,
-- calculs étendus absents de v_calcul, retirés et refusés, lignes sans valeur de l'administration.
-- Le seuil des sensibles est dans indicateurs-seuil.test.sql, la matrice des droits dans
-- rls-indicateurs-matrice.test.sql.
--
-- Les dates se calculent à partir de private.mois_courant(), private.dimanche_reference() et
-- private.aujourdhui() (heure de Paris) : les attendus restent justes quel que soit le jour du
-- test, y compris en janvier et en février, où une partie des mois écoulés tombe l'année d'avant.
begin;

select plan(63);

-- Ministères d'essai, créés il y a deux ans (toute période des courbes est couverte), et le
-- compte du premier.
select tests.creer_ministere('Essai lectures');
select tests.creer_ministere('Essai désactivé');
update public.ministere set cree_le = now() - interval '2 years'
 where nom in ('Essai lectures', 'Essai désactivé');
select tests.creer_compte('essai-lectures@exemple.test', 'ministere', tests.ministere('Essai lectures'));

create temp table ctx as
select tests.ministere('Essai lectures') as m,
       (select c.user_id from public.compte c where c.ministere_id = tests.ministere('Essai lectures')) as moi,
       tests.ministere('Essai désactivé') as m_des,
       tests.compte('Berger') as berger,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       tests.compte('Ministère Coordination') as coo,
       private.aujourdhui() as jour,
       private.dimanche_reference() as ref,
       private.mois_courant() as mc,
       (private.mois_courant() - interval '1 month')::date as m1,
       (private.mois_courant() - interval '2 months')::date as m2,
       (private.mois_courant() - interval '3 months')::date as m3,
       make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier;
grant select on ctx to authenticated;

-- Nombre de mois de a à b, bornes comprises (0 si b est avant a).
create function pg_temp.nb_mois(a date, b date) returns integer language sql immutable as $$
  select greatest(0, (extract(year from b)::integer * 12 + extract(month from b)::integer)
                     - (extract(year from a)::integer * 12 + extract(month from a)::integer) + 1)
$$;
grant execute on function pg_temp.nb_mois(date, date) to authenticated;

-- Indicateur d'essai : définition fixe, créé il y a deux ans sauf mention contraire.
create function pg_temp.ind(p_libelle text, p_nature text, p_ministere uuid,
                            p_cree_le timestamptz default now() - interval '2 years',
                            p_etat text default 'actif', p_origine text default 'eglise',
                            p_calcul text default null)
returns uuid language sql as $$
  insert into public.indicateur (libelle, definition, nature, ministere_id, cree_le, texte_le, etat, origine, calcul)
  values (p_libelle, 'Définition d''essai du lot B2.', p_nature, p_ministere, p_cree_le, p_cree_le, p_etat, p_origine,
          p_calcul)
  returning id
$$;

-- Une saisie (un envoi) au nom du compte d'essai, à l'heure donnée.
create function pg_temp.saisir(p_indicateur uuid, p_date date, p_valeur integer,
                               p_le timestamptz default now() - interval '1 hour')
returns void language sql as $$
  insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur, saisi_le, saisi_par)
  select p_indicateur, i.ministere_id, p_date, p_valeur, p_le, (select moi from ctx)
    from public.indicateur i where i.id = p_indicateur
$$;

-- Terme d'un calcul.
create function pg_temp.terme(p_calcul uuid, p_ordre integer, p_role text, p_source uuid, p_decalage integer default 0)
returns void language sql as $$
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id, decalage)
  values (p_calcul, p_ordre, p_role, p_source, p_decalage)
$$;

create temp table ind as
select pg_temp.ind('Essai L dimanche', 'dimanche', m) as dim,
       pg_temp.ind('Essai L mois', 'mois', m) as mois,
       pg_temp.ind('Essai L résolues', 'mois', m) as res,
       pg_temp.ind('Essai L reçues', 'mois', m) as rec,
       pg_temp.ind('Essai L vide', 'mois', m) as vide,
       pg_temp.ind('Essai L zéro', 'mois', m) as zero,
       pg_temp.ind('Essai L stock', 'a_ce_jour', m) as stock,
       pg_temp.ind('Essai L trou', 'mois', m) as trou,
       pg_temp.ind('Essai L en attente', 'mois', m, now() - interval '3 days', 'en_attente', 'ministere') as attente,
       pg_temp.ind('Essai L refusé', 'mois', m, now() - interval '20 days', 'en_attente', 'ministere') as refuse,
       pg_temp.ind('Essai L retiré vide', 'mois', m) as retire_vide,
       pg_temp.ind('Essai L retiré', 'mois', m) as retire,
       pg_temp.ind('Essai L ajouté', 'mois', m, ((m2 + 10)::timestamp at time zone 'Europe/Paris')) as ajoute,
       pg_temp.ind('Essai L rattrapé', 'mois', m, ((m2 + 10)::timestamp at time zone 'Europe/Paris')) as rattrape,
       pg_temp.ind('Essai L désactivé', 'mois', m_des) as des
  from ctx;
-- Calculs : un taux, un taux sans bas saisi, un taux de bas nul, une moyenne, et deux calculs
-- étendus (une différence, un taux décalé d'un mois), invisibles avant L1.
alter table ind add column taux uuid, add column taux_vide uuid, add column taux_zero uuid,
  add column moyenne uuid, add column diff uuid, add column decale uuid;
update ind set taux = pg_temp.ind('Essai L taux', 'mois', (select m from ctx), p_calcul => 'taux'),
               taux_vide = pg_temp.ind('Essai L taux sans bas', 'mois', (select m from ctx), p_calcul => 'taux'),
               taux_zero = pg_temp.ind('Essai L taux bas nul', 'mois', (select m from ctx), p_calcul => 'taux'),
               moyenne = pg_temp.ind('Essai L moyenne', 'mois', (select m from ctx), p_calcul => 'moyenne'),
               diff = pg_temp.ind('Essai L différence', 'mois', (select m from ctx), p_calcul => 'difference'),
               decale = pg_temp.ind('Essai L taux décalé', 'mois', (select m from ctx), p_calcul => 'taux');
select pg_temp.terme(taux, 1, 'haut', res), pg_temp.terme(taux, 2, 'bas', rec),
       pg_temp.terme(taux_vide, 1, 'haut', res), pg_temp.terme(taux_vide, 2, 'bas', vide),
       pg_temp.terme(taux_zero, 1, 'haut', res), pg_temp.terme(taux_zero, 2, 'bas', zero),
       pg_temp.terme(moyenne, 1, 'haut', res), pg_temp.terme(moyenne, 2, 'bas', rec),
       pg_temp.terme(diff, 1, 'plus', res), pg_temp.terme(diff, 2, 'moins', rec),
       pg_temp.terme(decale, 1, 'haut', res), pg_temp.terme(decale, 2, 'bas', rec, 1)
  from ind;
-- Calculs que T30 écarte de tout calcul : un taux à valider, et un taux dont une source est
-- ensuite refusée (retirée avec le motif « refuse »). Leurs sources valent 16 sur 20 (le premier)
-- et 3 sur 4 (le second) : sans l'exclusion, un résultat s'afficherait.
alter table ind add column src_h uuid, add column src_b uuid, add column taux_attente uuid, add column taux_refus uuid;
update ind set src_h = pg_temp.ind('Essai L source haut', 'mois', (select m from ctx)),
               src_b = pg_temp.ind('Essai L source bas', 'mois', (select m from ctx)),
               taux_attente = pg_temp.ind('Essai L taux à valider', 'mois', (select m from ctx),
                                          p_etat => 'en_attente', p_origine => 'ministere', p_calcul => 'taux'),
               taux_refus = pg_temp.ind('Essai L taux source refusée', 'mois', (select m from ctx), p_calcul => 'taux');
select pg_temp.terme(taux_attente, 1, 'haut', res), pg_temp.terme(taux_attente, 2, 'bas', rec),
       pg_temp.terme(taux_refus, 1, 'haut', src_h), pg_temp.terme(taux_refus, 2, 'bas', src_b)
  from ind;
grant select on ind to authenticated;

-- Saisies
-- Dimanche : ref - 7 saisi 5 puis corrigé à 7 ; ref saisi deux fois à la même heure (3 puis 4,
-- départage par id) ; ref - 14 jamais saisi (un trou).
select pg_temp.saisir(dim, ref - 7, 5, now() - interval '3 hours') from ind, ctx;
select pg_temp.saisir(dim, ref - 7, 7, now() - interval '2 hours') from ind, ctx;
select pg_temp.saisir(dim, ref, 3) from ind, ctx;
select pg_temp.saisir(dim, ref, 4) from ind, ctx;
-- Mois : m1 saisi 1 puis corrigé à 4, m2 6, mois en cours 9.
select pg_temp.saisir(mois, m1, 1, now() - interval '3 hours') from ind, ctx;
select pg_temp.saisir(mois, m1, 4, now() - interval '2 hours') from ind, ctx;
select pg_temp.saisir(mois, m2, 6) from ind, ctx;
select pg_temp.saisir(mois, mc, 9) from ind, ctx;
-- Sources des calculs : m1 16 sur 20, m2 3 sur 10, m3 5 sans bas.
select pg_temp.saisir(res, m1, 16), pg_temp.saisir(res, m2, 3), pg_temp.saisir(res, m3, 5) from ind, ctx;
select pg_temp.saisir(rec, m1, 20), pg_temp.saisir(rec, m2, 10) from ind, ctx;
select pg_temp.saisir(zero, m1, 0) from ind, ctx;
select pg_temp.saisir(stock, jour - 40, 12) from ind, ctx;
select pg_temp.saisir(trou, m2, 7) from ind, ctx;
select pg_temp.saisir(attente, m1, 2) from ind, ctx;
select pg_temp.saisir(refuse, m1, 5) from ind, ctx;
select pg_temp.saisir(retire, m2, 8) from ind, ctx;
select pg_temp.saisir(ajoute, m1, 1) from ind, ctx;
select pg_temp.saisir(rattrape, m3, 2), pg_temp.saisir(rattrape, m1, 3) from ind, ctx;
select pg_temp.saisir(des, m2, 5) from ind, ctx;
select pg_temp.saisir(src_h, m1, 3), pg_temp.saisir(src_b, m1, 4) from ind, ctx;

-- Retraits (par le propriétaire des tables, comme une fonction de B3), puis désactivation du
-- second ministère au 1er du mois dernier (heure de Paris).
update public.indicateur set etat = 'retire', retrait_motif = 'refuse' where id in ((select refuse from ind), (select src_b from ind));
update public.indicateur set etat = 'retire', retrait_motif = 'plus_suivi'
 where id in ((select retire from ind), (select retire_vide from ind));
update public.ministere set desactive_le = ((select m1 from ctx)::timestamp at time zone 'Europe/Paris')
 where id = (select m_des from ctx);

-- 1. Structure des vues (contrat, section 6)

select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_mesure_periode'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('nature', 'text'), ('periode', 'date'),
              ('valeur', 'integer'), ('moins_de_3', 'boolean'), ('saisi_le', 'timestamp with time zone') $$,
  'v_mesure_periode : colonnes et types du contrat');
select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_indicateur_serie'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('periode', 'date'), ('rang', 'smallint'),
              ('valeur', 'integer'), ('moins_de_3', 'boolean'), ('complete', 'boolean') $$,
  'v_indicateur_serie : colonnes et types du contrat');
select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_indicateur_suivi'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('libelle', 'text'), ('definition', 'text'),
              ('nature', 'text'), ('unite', 'text'), ('sensible', 'boolean'), ('etat', 'text'), ('origine', 'text'),
              ('calcul', 'text'), ('derniere_periode', 'date'), ('derniere_valeur', 'integer'),
              ('derniere_moins_de_3', 'boolean'), ('derniere_saisie_le', 'timestamp with time zone'),
              ('mois_en_cours_valeur', 'integer'), ('mois_en_cours_moins_de_3', 'boolean'),
              ('somme_annee', 'bigint'), ('somme_moins_de_3', 'boolean'), ('somme_depuis', 'date'),
              ('somme_nb_saisies', 'integer'), ('somme_nb_attendues', 'integer'), ('plus_de_30_jours', 'boolean'),
              ('etat_valeur', 'text'), ('attente_jours', 'integer'), ('retire_le', 'timestamp with time zone') $$,
  'v_indicateur_suivi : colonnes et types du contrat (mois_en_cours_moins_de_3 compris, P45)');
select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_calcul'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('calcul', 'text'), ('periode', 'date'),
              ('haut', 'bigint'), ('bas', 'bigint'), ('resultat', 'numeric'), ('annee_haut', 'bigint'),
              ('annee_bas', 'bigint'), ('annee_resultat', 'numeric'), ('annee_nb_periodes', 'integer'),
              ('annee_nb_attendues', 'integer'), ('non_calcule_raison', 'text'), ('non_calcule_source_id', 'uuid') $$,
  'v_calcul : colonnes et types du contrat');
select results_eq($$
  select a.attname::text collate "default", format_type(a.atttypid, a.atttypmod) collate "default"
    from pg_attribute a where a.attrelid = 'public.v_usage_indicateurs'::regclass and a.attnum > 0 order by a.attnum
$$, $$ values ('indicateur_id', 'uuid'), ('ministere_id', 'uuid'), ('nb_periodes_saisies', 'integer'),
              ('nb_periodes_attendues', 'integer'), ('derniere_saisie_le', 'timestamp with time zone'),
              ('jamais_saisi', 'boolean'), ('attente_jours', 'integer') $$,
  'v_usage_indicateurs : colonnes et types du contrat');

-- 2. v_mesure_periode, lue par le ministère

select tests.se_connecter((select moi from ctx), 'aal2');
select results_eq($$
  select periode - (select ref from ctx), valeur from public.v_mesure_periode
   where indicateur_id = (select dim from ind) order by periode
$$, $$ values (-7, 7), (0, 4) $$,
  'dimanche : une ligne par période, la correction fait foi (7) ; à la même heure, la saisie de plus grand id (4) ; aucun trou rendu 0');
select is((select saisi_le from public.v_mesure_periode
            where indicateur_id = (select dim from ind) and periode = (select ref from ctx) - 7),
  now() - interval '2 hours', 'saisi_le : l''heure de la saisie qui fait foi');
select results_eq($$
  select periode, valeur, moins_de_3, nature from public.v_mesure_periode
   where indicateur_id = (select mois from ind) order by periode
$$, $$ select m2, 6, false, 'mois'::text from ctx union all select m1, 4, false, 'mois' from ctx
       union all select mc, 9, false, 'mois' from ctx $$,
  'mois : un mois par son 1er jour, mois en cours compris, la saisie la plus récente de chaque mois');
select is((select count(*)::int from public.v_mesure_periode where indicateur_id = (select refuse from ind)), 1,
  'un ajout refusé garde ses valeurs pour son ministère');
select ok((select count(*) from public.v_mesure_periode m
            join public.indicateur i on i.id = m.indicateur_id
           where i.ministere_id is null and m.ministere_id <> (select m from ctx)) > 0,
  'le ministère lit les chiffres communs des autres ministères');
select tests.deconnecter();

-- 3. v_indicateur_serie

select tests.se_connecter((select moi from ctx), 'aal2');
select results_eq($$
  select count(*)::int, min(rang)::int, max(rang)::int, min(periode) - (select ref from ctx),
         max(periode) - (select ref from ctx), count(valeur)::int, bool_and(complete), bool_or(moins_de_3)
    from public.v_indicateur_serie where indicateur_id = (select dim from ind)
$$, $$ values (10, 1, 10, -63, 0, 2, true, false) $$,
  'dimanche : 10 dimanches jusqu''au dimanche de référence, rang 1 le plus ancien, 8 trous à null, tous complets');
select results_eq($$
  select rang::int, periode, valeur from public.v_indicateur_serie
   where indicateur_id = (select mois from ind) and valeur is not null order by rang
$$, $$ select 11, m2, 6 from ctx union all select 12, m1, 4 from ctx $$,
  'mois : 12 mois finis, le dernier mois écoulé au rang 12, le mois en cours hors de la courbe');
select results_eq($$
  select count(*)::int, min(periode), count(valeur)::int
    from public.v_indicateur_serie where indicateur_id = (select mois from ind)
$$, $$ select 12, (mc - interval '12 months')::date, 2 from ctx $$,
  'mois : 12 lignes, du plus ancien au plus récent, les trous à null');
select results_eq($$
  select rang::int, complete from public.v_indicateur_serie
   where indicateur_id = (select ajoute from ind) and rang >= 11 order by rang
$$, $$ values (11, false), (12, true) $$,
  'indicateur ajouté pendant un mois : ce mois est incomplet (cercle vide), le suivant complet');
select is((select count(*)::int from public.v_indicateur_serie
            where indicateur_id in ((select attente from ind), (select stock from ind), (select taux from ind))), 0,
  'pas de courbe pour un ajout à valider, un « à ce jour » ni un calcul');
select tests.deconnecter();
select is(tests.lire((select berger from ctx), 'aal2', $$
  select rang, complete from public.v_indicateur_serie where indicateur_id = (select des from ind) and rang >= 11
$$), '[{"rang": 11, "complete": true}, {"rang": 12, "complete": false}]'::jsonb,
  'ministère désactivé le mois dernier : ce mois est incomplet');

-- 4. v_indicateur_suivi, lue par le ministère

select tests.se_connecter((select moi from ctx), 'aal2');
select results_eq($$
  select derniere_periode, derniere_valeur, derniere_moins_de_3, mois_en_cours_valeur, mois_en_cours_moins_de_3,
         etat_valeur
    from public.v_indicateur_suivi where indicateur_id = (select mois from ind)
$$, $$ select m1, 4, false, 9, false, 'saisi'::text from ctx $$,
  'dernière valeur : le dernier mois écoulé ; le mois en cours à part');
select results_eq($$
  select somme_annee::int, somme_moins_de_3, somme_depuis, somme_nb_saisies, somme_nb_attendues
    from public.v_indicateur_suivi where indicateur_id = (select mois from ind)
$$, $$ select nullif((case when m1 >= janvier then 4 else 0 end) + (case when m2 >= janvier then 6 else 0 end), 0),
              false, janvier, (m1 >= janvier)::int + (m2 >= janvier)::int, pg_temp.nb_mois(janvier, m1) from ctx $$,
  'somme de l''année : mois finis depuis janvier, le mois en cours hors de la somme et de sa complétude');
select results_eq($$
  select somme_annee::int, somme_depuis, somme_nb_saisies, somme_nb_attendues
    from public.v_indicateur_suivi where indicateur_id = (select ajoute from ind)
$$, $$ select case when m1 >= greatest(janvier, m2) then 1 end, greatest(janvier, m2),
              (m1 >= greatest(janvier, m2))::int, pg_temp.nb_mois(greatest(janvier, m2), m1) from ctx $$,
  'départ de la somme : le mois de l''ajout de l''indicateur (« Depuis ... »)');
select results_eq($$
  select somme_annee::int, somme_depuis, somme_nb_saisies, somme_nb_attendues
    from public.v_indicateur_suivi where indicateur_id = (select rattrape from ind)
$$, $$ select nullif((case when m3 >= d then 2 else 0 end) + (case when m1 >= d then 3 else 0 end), 0), d,
              (m3 >= d)::int + (m1 >= d)::int, pg_temp.nb_mois(d, m1)
         from (select greatest(janvier, least(m2, coalesce(case when m3 >= janvier then m3 when m1 >= janvier then m1 end, m2))) as d,
                      m1, m3 from ctx) as x $$,
  'rattrapage : un mois saisi avant l''ajout recule le départ de la somme jusqu''à lui');
select results_eq($$
  select etat, derniere_valeur, somme_annee::int, somme_nb_saisies, somme_nb_attendues, attente_jours
    from public.v_indicateur_suivi where indicateur_id = (select attente from ind)
$$, $$ select 'en_attente'::text, 2, null::int, null::int, null::int,
              private.aujourdhui() - ((now() - interval '3 days') at time zone 'Europe/Paris')::date $$,
  'ajout à valider : ses valeurs, aucune somme ni complétude, jours d''attente à l''heure de Paris');
select results_eq($$
  select derniere_periode - (select jour from ctx), derniere_valeur, plus_de_30_jours, somme_annee::int, etat_valeur
    from public.v_indicateur_suivi where indicateur_id = (select stock from ind)
$$, $$ values (-40, 12, true, null::int, 'saisi'::text) $$,
  '« à ce jour » saisi il y a 40 jours : plus de 30 jours, sans somme de l''année');
select results_eq($$
  select indicateur_id, etat_valeur, derniere_valeur from public.v_indicateur_suivi
   where indicateur_id in ((select vide from ind), (select trou from ind), (select zero from ind))
   order by etat_valeur
$$, $$ select vide, 'jamais_saisi'::text, null::int from ind union all select trou, 'non_saisi', 7 from ind
       union all select zero, 'saisi', 0 from ind $$,
  'états : jamais saisi, dernier mois attendu non saisi, 0 saisi (jamais une absence)');
select results_eq($$
  select somme_annee::int, somme_nb_saisies, somme_nb_attendues from public.v_indicateur_suivi
   where indicateur_id = (select vide from ind)
$$, $$ select null::int, 0, pg_temp.nb_mois(janvier, m1) from ctx $$,
  'rien de saisi : aucune somme, « 0 mois sur N »');
select is((select count(*)::int from public.v_indicateur_suivi
            where indicateur_id in ((select refuse from ind), (select retire_vide from ind))), 0,
  'un ajout refusé et un retiré sans saisie n''y figurent pas');
select results_eq($$
  select etat, retire_le is not null, derniere_valeur from public.v_indicateur_suivi
   where indicateur_id = (select retire from ind)
$$, $$ values ('retire'::text, true, 8) $$, 'un retiré avec saisies reste, pour le bloc « Retirés »');
select results_eq($$
  select calcul, etat_valeur, somme_annee::int from public.v_indicateur_suivi where indicateur_id = (select taux from ind)
$$, $$ values ('taux'::text, null::text, null::int) $$, 'un calcul y figure avec sa définition, ses valeurs dans v_calcul');
select ok((select count(*) from public.v_indicateur_suivi s
            join public.indicateur i on i.id = s.indicateur_id
           where i.ministere_id is null and s.derniere_valeur is null and s.somme_annee is null) = 3,
  'les trois chiffres communs y figurent par leur seule définition');
select tests.deconnecter();

select is(tests.lire((select berger from ctx), 'aal2', $$
  select somme_nb_attendues, etat_valeur from public.v_indicateur_suivi where indicateur_id = (select des from ind)
$$), (select jsonb_build_array(jsonb_build_object('somme_nb_attendues', pg_temp.nb_mois(janvier, m2), 'etat_valeur', 'saisi'))
        from ctx),
  'ministère désactivé : le mois de la désactivation n''est plus attendu');
select is(tests.compter((select berger from ctx), 'aal2', $$
  select 1 from public.v_indicateur_suivi where indicateur_id = (select refuse from ind)
$$), 0, 'berger : un ajout refusé n''y figure pas');
select is(tests.compter((select berger from ctx), 'aal2', $$
  select 1 from public.v_mesure_periode where indicateur_id = (select refuse from ind)
$$), 0, 'berger : aucune valeur d''un ajout refusé');
select is(tests.compter((select berger from ctx), 'aal2', $$
  select 1 from public.mesure where indicateur_id = (select refuse from ind)
$$), 0, 'berger : aucune ligne brute de mesure d''un ajout refusé (jamais pour un ajout refusé)');
select is(tests.compter((select moi from ctx), 'aal2', $$
  select 1 from public.mesure where indicateur_id = (select refuse from ind)
$$), 1, 'le ministère garde les lignes brutes de son ajout refusé');

-- 5. v_calcul, lue par le berger

select tests.se_connecter((select berger from ctx), 'aal2');
select results_eq($$
  select calcul, periode, haut::int, bas::int, resultat, non_calcule_raison, non_calcule_source_id
    from public.v_calcul where indicateur_id = (select taux from ind)
$$, $$ select 'taux'::text, m1, 16, 20, 80::numeric, null::text, null::uuid from ctx $$,
  'taux du dernier mois écoulé : 16 sur 20 = 80 %');
select results_eq($$
  select annee_haut::int, annee_bas::int, annee_resultat, annee_nb_periodes, annee_nb_attendues
    from public.v_calcul where indicateur_id = (select taux from ind)
$$, $$ select nullif(h, 0), nullif(b, 0), case when b > 0 then round(100.0 * h / b) end, n, pg_temp.nb_mois(janvier, m1)
         from (select (case when m1 >= janvier then 16 else 0 end) + (case when m2 >= janvier then 3 else 0 end) as h,
                      (case when m1 >= janvier then 20 else 0 end) + (case when m2 >= janvier then 10 else 0 end) as b,
                      (m1 >= janvier)::int + (m2 >= janvier)::int as n, janvier, m1
                 from ctx) as x $$,
  'sur l''année : Σ hauts ÷ Σ bas des mois qui ont les deux valeurs (19 sur 30), jamais une moyenne de taux');
select results_eq($$
  select resultat, haut::int, bas::int, non_calcule_raison, non_calcule_source_id
    from public.v_calcul where indicateur_id = (select taux_vide from ind)
$$, $$ select null::numeric, 16, null::int, 'source_non_saisie'::text, vide from ind $$,
  '« Non calculé » : le bas du mois n''est pas saisi, avec la source qui manque');
select results_eq($$
  select resultat, bas::int, non_calcule_raison from public.v_calcul where indicateur_id = (select taux_zero from ind)
$$, $$ values (null::numeric, 0, 'bas_nul'::text) $$, '« Non calculé » : le bas vaut 0');
select is((select resultat from public.v_calcul where indicateur_id = (select moyenne from ind)), 0.8::numeric,
  'moyenne : 16 pour 20 = 0,8');
select is((select count(*)::int from public.v_calcul
            where indicateur_id in ((select diff from ind), (select decale from ind))), 0,
  'les calculs étendus (différence, décalage) restent invisibles jusqu''au lot L1');
select is((select count(*)::int from public.v_calcul
            where indicateur_id in ((select taux_attente from ind), (select taux_refus from ind))), 0,
  'un calcul à valider, ou dont une source est refusée, n''a aucune ligne : hors de tout calcul et de toute somme (T30)');
select tests.deconnecter();

-- 6. Administration : lignes sans valeur, sauf communs

select tests.se_connecter((select admin from ctx), 'aal2');
select results_eq($$
  select count(*)::int, count(valeur)::int, bool_or(moins_de_3)
    from public.v_mesure_periode where indicateur_id = (select mois from ind)
$$, $$ values (3, 0, false) $$, 'administration : les mois saisis d''un indicateur propre, sans valeur');
select ok((select count(*) from public.v_mesure_periode m join public.indicateur i on i.id = m.indicateur_id
            where i.ministere_id is null and m.valeur is not null) > 0,
  'administration : les valeurs des chiffres communs');
select results_eq($$
  select periode, haut, bas, resultat, annee_haut, annee_resultat, non_calcule_raison
    from public.v_calcul where indicateur_id = (select taux from ind)
$$, $$ select m1, null::bigint, null::bigint, null::numeric, null::bigint, null::numeric, null::text from ctx $$,
  'administration : la ligne du calcul, sans aucune valeur');
select results_eq($$
  select derniere_valeur, mois_en_cours_valeur, somme_annee from public.v_indicateur_suivi
   where indicateur_id = (select mois from ind)
$$, $$ values (null::int, null::int, null::bigint) $$, 'administration : le suivi sans valeur ni somme');
select is((select count(*)::int from public.v_indicateur_serie
            where indicateur_id = (select mois from ind) and valeur is not null), 0,
  'administration : la courbe sans valeur');
select tests.deconnecter();

-- 7. Un autre ministère ne lit rien des indicateurs propres

select tests.se_connecter((select coo from ctx), 'aal2');
select is((select count(*)::int from public.v_mesure_periode where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucune ligne de v_mesure_periode');
select is((select count(*)::int from public.v_indicateur_serie where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucune courbe');
select is((select count(*)::int from public.v_indicateur_suivi where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucun suivi');
select is((select count(*)::int from public.v_calcul where ministere_id = (select m from ctx)), 0,
  'autre ministère : aucun calcul');
select tests.deconnecter();

-- 8. v_usage_indicateurs : administration et EJP Tech, jamais une valeur

select tests.se_connecter((select admin from ctx), 'aal2');
select results_eq($$
  select nb_periodes_saisies, nb_periodes_attendues, jamais_saisi, derniere_saisie_le, attente_jours
    from public.v_usage_indicateurs where indicateur_id = (select mois from ind)
$$, $$ select 2, pg_temp.nb_mois(date_trunc('month', (now() - interval '2 years') at time zone 'Europe/Paris')::date, m1),
              false, now() - interval '1 hour', null::int from ctx $$,
  'usage : mois finis saisis sur mois attendus depuis l''ajout, dernière saisie, sans valeur');
select results_eq($$
  select nb_periodes_saisies, jamais_saisi, derniere_saisie_le from public.v_usage_indicateurs
   where indicateur_id = (select vide from ind)
$$, $$ values (0, true, null::timestamptz) $$, 'usage : jamais saisi');
select is((select attente_jours from public.v_usage_indicateurs where indicateur_id = (select attente from ind)),
  private.aujourdhui() - ((now() - interval '3 days') at time zone 'Europe/Paris')::date,
  'usage : jours d''attente d''un ajout à valider');
select is((select count(*)::int from public.v_usage_indicateurs where indicateur_id = (select taux from ind)), 0,
  'usage : un calcul ne se saisit pas, il n''y figure pas');
select tests.deconnecter();

select ok(tests.compter((select tech from ctx), 'aal2', $$
  select 1 from public.v_usage_indicateurs where ministere_id = (select m from ctx)
$$) > 0, 'EJP Tech lit l''usage');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.v_usage_indicateurs'), 0,
  'le berger ne lit pas l''usage');
select is(tests.compter((select moi from ctx), 'aal2', 'select 1 from public.v_usage_indicateurs'), 0,
  'un ministère ne lit pas l''usage');

-- 9. EJP Tech lit comme le berger

select is(tests.lire((select tech from ctx), 'aal2', $$
  select resultat, derniere from (select resultat from public.v_calcul where indicateur_id = (select taux from ind)) as c,
       (select derniere_valeur as derniere from public.v_indicateur_suivi where indicateur_id = (select mois from ind)) as s
$$), '[{"resultat": 80, "derniere": 4}]'::jsonb, 'EJP Tech lit les valeurs, les calculs et le suivi comme le berger');

-- 10. Hors aal2 ni pour un compte inactif : rien

select is(tests.compter((select moi from ctx), 'aal1', $$
  select 1 from public.v_mesure_periode union all select 1 from public.v_indicateur_suivi
  union all select 1 from public.v_calcul union all select 1 from public.v_indicateur_serie
$$), 0, 'aal1 : aucune ligne des quatre vues');
select is(tests.compter((select admin from ctx), 'aal1', 'select 1 from public.v_usage_indicateurs'), 0,
  'aal1 : aucune ligne de v_usage_indicateurs');
update public.compte set desactive_le = now() where user_id = (select moi from ctx);
select is(tests.compter((select moi from ctx), 'aal2', 'select 1 from public.v_mesure_periode'), 0,
  'compte désactivé : aucune ligne de v_mesure_periode');
select is(tests.compter((select moi from ctx), 'aal2', 'select 1 from public.v_indicateur_suivi'), 0,
  'compte désactivé : aucun suivi');

-- 11. Dates à l'heure de Paris

select ok(position('current_date' in pg_get_viewdef('public.v_indicateur_suivi'::regclass)) = 0
          and position('current_date' in pg_get_viewdef('public.v_calcul'::regclass)) = 0
          and position('current_date' in pg_get_viewdef('public.v_indicateur_serie'::regclass)) = 0
          and position('current_date' in (select prosrc from pg_proc where oid = 'private.mesures_periode()'::regprocedure)) = 0
          and position('current_date' in (select prosrc from pg_proc where oid = 'private.usage_indicateurs()'::regprocedure)) = 0,
  'aucune lecture n''utilise current_date : les dates viennent de l''heure de Paris');
select results_eq($$
  select private.periode_de('dimanche', date '2026-10-05'), private.periode_de('dimanche', date '2026-10-11'),
         private.periode_de('mois', date '2026-10-17'), private.fin_periode('mois', date '2026-02-01'),
         private.fin_periode('dimanche', date '2026-10-11')
$$, $$ values (date '2026-10-11', date '2026-10-11', date '2026-10-01', date '2026-02-28', date '2026-10-11') $$,
  'périodes : la semaine du lundi au dimanche, le mois par son 1er jour, la fin du mois');

select * from finish();
rollback;
