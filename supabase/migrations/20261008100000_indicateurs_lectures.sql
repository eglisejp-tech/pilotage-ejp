-- Étape 4, lot B2, migration 1 sur 3 : lectures des indicateurs (docs/plan-etape-4.md, section 4,
-- « B2 » ; docs/conception/contrat-etape-4.md, section 6 ; configuration-indicateurs.md 3.4 et
-- 5.6 ; BRIEF, section 3, règles 2 et 13 ; docs/decisions.md, P33, P35, P45).
--
-- 1. Périodes : private.periode_de, private.fin_periode, private.derniere_periode_finie (heure de
--    Paris), private.sous_seuil (1 et 2 deviennent « moins de 3 »).
-- 2. private.mesures_periode() : saisie la plus récente par indicateur, ministère et période
--    (règle 2, départage par id), lue en security definer. Elle ignore la RLS, donc elle
--    réapplique le filtre du lecteur : rien hors aal2 ni pour un compte inactif ; le ministère lit
--    ses valeurs exactes, sensibles compris, et les chiffres communs de tous ; le berger, le
--    conseil et EJP Tech (private.lit_tout()) lisent tout, avec le seuil « moins de 3 » sur les
--    sensibles (X4, K5c), mois en cours compris (P45) ; l'administration lit les communs et des
--    lignes sans valeur pour les indicateurs propres ; un autre ministère ne lit que les communs.
--    Un indicateur retiré pour confidentialité n'y figure pour personne (Q11), un ajout refusé
--    seulement pour son ministère. Seule la saisie qui fait foi est rendue, avec son heure : jamais
--    une saisie intermédiaire du mois en cours d'un sensible.
-- 3. Vues security_invoker : v_mesure_periode, v_indicateur_serie, v_indicateur_suivi, v_calcul
--    (adossées à private.mesures_periode()) et v_usage_indicateurs (adossée à
--    private.usage_indicateurs(), administration et EJP Tech seulement, jamais une valeur).
--
-- La fermeture de la lecture directe des lignes sensibles de mesure (politique de lecture) est
-- dans la migration suivante (20261008100500_indicateurs_seuil_sensibles.sql).
--
-- Règles de lecture (docs/conception/configuration-indicateurs.md, 3.4 ; P33) :
-- - une période est finie jusqu'au dimanche de référence, ou si le mois est avant le mois en
--   cours ; le mois en cours se lit à part, hors de la somme et de sa complétude ;
-- - la somme de l'année part de la plus récente de deux périodes, celle du 1er janvier ou celle
--   qui contient l'ajout de l'indicateur, et recule jusqu'à une période plus ancienne de l'année
--   que le ministère a rattrapée ; périodes attendues : les périodes finies depuis ce départ où le
--   ministère était actif (à la fin de la période) et l'indicateur pas encore retiré ;
-- - pour un sensible lu par un autre profil que son ministère, la somme ne compte que les mois
--   affichés (les mois de 1 ou 2 sont rendus « moins de 3 » et n'y entrent pas) : aucune
--   différence entre la somme et la série affichées ne révèle un mois masqué. Chaque mois affiché
--   valant 0 ou au moins 3, cette somme ne vaut jamais 1 ni 2 : une année dont tous les mois sont
--   sous 3 n'a pas de somme, et somme_moins_de_3 reste faux (garde du contrat, K5c, qui
--   rendrait « moins de 3 » une somme de 1 ou 2 si la règle changeait) ;
-- - aucune absence n'est rendue 0 : une période sans saisie a une valeur null.
--
-- Aucune date du navigateur, jamais current_date : les dates métier viennent de
-- private.aujourdhui(), private.dimanche_reference() et private.mois_courant().

-- 1. Périodes et seuil

-- Période qui contient un jour : le dimanche de sa semaine (du lundi au dimanche), le 1er de son
-- mois, ou le jour lui-même pour un « à ce jour ».
create function private.periode_de(p_nature text, p_jour date) returns date
language sql immutable parallel safe set search_path = '' as $$
  select case p_nature
           when 'dimanche' then p_jour + (7 - extract(isodow from p_jour)::integer) % 7
           when 'mois' then date_trunc('month', p_jour::timestamp)::date
           else p_jour
         end
$$;

-- Dernier jour d'une période : le dernier jour du mois, sinon la période elle-même.
create function private.fin_periode(p_nature text, p_periode date) returns date
language sql immutable parallel safe set search_path = '' as $$
  select case p_nature
           when 'mois' then (p_periode::timestamp + interval '1 month')::date - 1
           else p_periode
         end
$$;

-- Dernière période finie, heure de Paris : le dimanche de référence, ou le mois qui précède le
-- mois en cours. Null pour un « à ce jour », qui n'a pas de période.
create function private.derniere_periode_finie(p_nature text) returns date
language sql stable set search_path = '' as $$
  select case p_nature
           when 'dimanche' then private.dimanche_reference()
           when 'mois' then (private.mois_courant()::timestamp - interval '1 month')::date
         end
$$;

-- Seuil des petits nombres (K5c) : 1 et 2 s'affichent « moins de 3 », 0 reste 0.
create function private.sous_seuil(p_valeur bigint) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(p_valeur in (1, 2), false)
$$;

-- 2. Saisie qui fait foi de chaque période, avec le filtre du lecteur et le seuil
--
-- valeur : exacte pour le ministère qui saisit, pour les chiffres communs et, hors sensibles,
-- pour le berger, le conseil et EJP Tech ; seuil sur les sensibles pour ces trois profils ; null
-- pour l'administration sur un indicateur propre (une ligne sans valeur : l'administration sait
-- qu'une période est saisie, comme par v_usage_indicateurs, jamais ce qu'elle vaut). moins_de_3 :
-- vrai pour 1 et 2 d'un sensible lu par un autre profil que son ministère.
create function private.mesures_periode()
returns table (indicateur_id uuid, ministere_id uuid, nature text, periode date,
               valeur integer, moins_de_3 boolean, saisi_le timestamptz)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_type() as type, private.mon_ministere() as ministere, private.lit_tout() as lit_tout
     where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  ),
  derniere as (
    -- Même ordre que l'index de mesure (ministere_id, indicateur_id, date_ref desc, saisi_le desc,
    -- id desc) : la lecture le parcourt sans trier la table.
    select distinct on (m.ministere_id, m.indicateur_id, m.date_ref)
           m.indicateur_id, m.ministere_id, m.date_ref, m.valeur, m.saisi_le
      from public.mesure m
     order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc
  ),
  lues as (
    select d.indicateur_id, d.ministere_id, i.nature, i.sensible, d.date_ref, d.valeur, d.saisi_le,
           moi.type, moi.lit_tout,
           coalesce(d.ministere_id = moi.ministere, false) as sienne,
           i.ministere_id is null and not i.sensible as commun,
           i.retrait_motif is not distinct from 'refuse' as refuse
      from derniere d
      join public.indicateur i on i.id = d.indicateur_id
     cross join moi
     where moi.type is not null
       and i.retrait_motif is distinct from 'confidentialite'
  )
  select l.indicateur_id, l.ministere_id, l.nature, l.date_ref,
         case
           when l.sienne or l.commun or (l.lit_tout and not l.sensible) then l.valeur
           when l.lit_tout and not private.sous_seuil(l.valeur) then l.valeur
         end,
         not l.sienne and l.lit_tout and l.sensible and private.sous_seuil(l.valeur),
         l.saisi_le
    from lues l
   where l.sienne
      or (not l.refuse
          and (l.lit_tout or l.type = 'admin_eglise' or (l.type = 'ministere' and l.commun)))
$$;

-- 3. Vues

-- Saisie la plus récente par indicateur, ministère et période (le dimanche, le 1er du mois, ou la
-- date d'un « à ce jour »). Elle étend v_mesure_dimanche au mois.
create view public.v_mesure_periode with (security_invoker = true) as
select p.indicateur_id, p.ministere_id, p.nature, p.periode, p.valeur, p.moins_de_3, p.saisi_le
  from private.mesures_periode() as p;

-- Petite courbe d'un indicateur propre du dimanche ou du mois : les 10 derniers dimanches ou les
-- 12 derniers mois finis, du plus ancien (rang 1) au plus récent, trous à null. complete est faux
-- (cercle vide) pour une période que le ministère et l'indicateur ne couvrent pas en entier :
-- ministère créé ou désactivé pendant la période, indicateur ajouté après son début ou retiré
-- avant sa fin. Un ajout à valider n'a pas de courbe (T30) ; un calcul se lit dans v_calcul.
create view public.v_indicateur_serie with (security_invoker = true) as
with p as (select * from private.mesures_periode())
select i.id as indicateur_id, i.ministere_id, s.periode, s.rang::smallint as rang,
       v.valeur, coalesce(v.moins_de_3, false) as moins_de_3,
       (private.actif_le(m.cree_le, m.desactive_le, s.periode)
        and private.actif_le(m.cree_le, m.desactive_le, private.fin_periode(i.nature, s.periode))
        and (i.cree_le at time zone 'Europe/Paris')::date <= s.periode
        and (i.retire_le is null
             or (i.retire_le at time zone 'Europe/Paris')::date > private.fin_periode(i.nature, s.periode))
       ) as complete
  from public.indicateur i
  join public.ministere m on m.id = i.ministere_id
 cross join lateral (
   select case i.nature
            when 'dimanche' then private.dimanche_reference() - 7 * (10 - g.n)
            else (private.derniere_periode_finie('mois')::timestamp - make_interval(months => 12 - g.n))::date
          end as periode,
          g.n as rang
     from generate_series(1, case i.nature when 'dimanche' then 10 else 12 end) as g(n)
 ) as s
  left join p as v on v.indicateur_id = i.id and v.ministere_id = i.ministere_id and v.periode = s.periode
 where i.ministere_id is not null
   and i.nature in ('dimanche', 'mois')
   and i.calcul is null
   and i.etat <> 'en_attente'
   and coalesce(i.retrait_motif, '') not in ('confidentialite', 'refuse');

-- Suivi de chaque indicateur lisible (fiche du ministère, vue du berger) : dernière valeur et sa
-- période (pour le mois, le dernier mois fini qui a une valeur), mois en cours à part (sensible
-- compris, avec le seuil, P45), somme de l'année avec son départ et sa complétude, alerte « plus
-- de 30 jours » d'un « à ce jour », état de la dernière période attendue, attente d'un ajout à
-- valider. Un chiffre commun n'a ici que sa définition (ses valeurs se lisent dans les vues de
-- l'église et v_mesure_periode) ; un calcul se lit dans v_calcul. Un ajout à valider garde ses
-- valeurs, sans somme (T30). Écartés : un ajout refusé, un retiré pour confidentialité (Q11), un
-- retiré sans saisie (un calcul retiré reste si ses sources ont des saisies).
create view public.v_indicateur_suivi with (security_invoker = true) as
with p as (select * from private.mesures_periode()),
repere as (
  select private.aujourdhui() as jour, private.mois_courant() as mois, private.mon_ministere() as moi,
         make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier
)
select i.id as indicateur_id, i.ministere_id, i.libelle, i.definition, i.nature, i.unite, i.sensible,
       i.etat, i.origine, i.calcul,
       d.periode as derniere_periode,
       d.valeur as derniere_valeur,
       coalesce(d.moins_de_3, false) as derniere_moins_de_3,
       d.saisi_le as derniere_saisie_le,
       c.valeur as mois_en_cours_valeur,
       coalesce(c.moins_de_3, false) as mois_en_cours_moins_de_3,
       case when s.somme_seuil then null else s.somme end as somme_annee,
       coalesce(s.somme_seuil, false) as somme_moins_de_3,
       s.depart as somme_depuis,
       s.nb_saisies as somme_nb_saisies,
       s.nb_attendues as somme_nb_attendues,
       coalesce(i.nature = 'a_ce_jour' and d.periode < r.jour - 30, false) as plus_de_30_jours,
       e.etat_valeur,
       case when i.etat = 'en_attente' then r.jour - (i.cree_le at time zone 'Europe/Paris')::date end as attente_jours,
       i.retire_le
  from public.indicateur i
 cross join repere r
  left join public.ministere m on m.id = i.ministere_id
  left join lateral (
    select x.periode, x.valeur, x.moins_de_3, x.saisi_le
      from p as x
     where x.indicateur_id = i.id and x.ministere_id = i.ministere_id
       and (i.nature <> 'mois' or x.periode < r.mois)
     order by x.periode desc
     limit 1
  ) as d on true
  left join lateral (
    select x.valeur, x.moins_de_3
      from p as x
     where i.nature = 'mois' and x.indicateur_id = i.id and x.ministere_id = i.ministere_id
       and x.periode = r.mois
  ) as c on true
  left join lateral (
    select b.depart, t.somme, t.nb_saisies,
           (select count(*)::integer
              from generate_series(b.depart::timestamp, b.fin::timestamp,
                                   case i.nature when 'mois' then interval '1 month' else interval '7 days' end) as q(periode)
             where private.actif_le(m.cree_le, m.desactive_le, private.fin_periode(i.nature, q.periode::date))
               and (i.retire_le is null or (i.retire_le at time zone 'Europe/Paris')::date > q.periode::date)
           ) as nb_attendues,
           i.sensible and i.ministere_id is distinct from r.moi and private.sous_seuil(t.somme) as somme_seuil
      from (
        select a.fin,
               greatest(a.debut, least(a.creation, coalesce(
                 (select min(x.periode) from p as x
                   where x.indicateur_id = i.id and x.ministere_id = i.ministere_id
                     and x.periode between a.debut and a.fin),
                 a.creation))) as depart
          from (select private.periode_de(i.nature, r.janvier) as debut,
                       private.derniere_periode_finie(i.nature) as fin,
                       private.periode_de(i.nature, (i.cree_le at time zone 'Europe/Paris')::date) as creation
               ) as a
      ) as b
     cross join lateral (
       select sum(x.valeur) as somme, count(*)::integer as nb_saisies
         from p as x
        where x.indicateur_id = i.id and x.ministere_id = i.ministere_id
          and x.periode between b.depart and b.fin
     ) as t
     where i.ministere_id is not null and i.calcul is null and i.nature in ('dimanche', 'mois')
       and not i.sans_somme and i.etat <> 'en_attente'
  ) as s on true
  left join lateral (
    select case
             when not exists (select 1 from p as x where x.indicateur_id = i.id and x.ministere_id = i.ministere_id)
               then 'jamais_saisi'
             when i.nature = 'a_ce_jour' then 'saisi'
             when f.fin < private.periode_de(i.nature, (i.cree_le at time zone 'Europe/Paris')::date)
                  or not private.actif_le(m.cree_le, m.desactive_le, private.fin_periode(i.nature, f.fin))
                  or (i.retire_le is not null and (i.retire_le at time zone 'Europe/Paris')::date <= f.fin)
                  or exists (select 1 from p as x
                              where x.indicateur_id = i.id and x.ministere_id = i.ministere_id and x.periode = f.fin)
               then 'saisi'
             else 'non_saisi'
           end as etat_valeur
      from (select private.derniere_periode_finie(i.nature) as fin) as f
     where i.ministere_id is not null and i.calcul is null
  ) as e on true
 where coalesce(i.retrait_motif, '') not in ('confidentialite', 'refuse')
   and (i.etat <> 'retire'
        or exists (select 1 from p as x where x.indicateur_id = i.id)
        or exists (select 1 from public.indicateur_terme t
                     join p as x on x.indicateur_id = t.source_id
                    where t.calcul_id = i.id));

-- Calculs de la V1 : taux et moyennes dont tous les termes sont des indicateurs, à l'agrégat
-- « période » et sans décalage (les calculs étendus restent invisibles jusqu'au lot L1). Pour la
-- dernière période finie : Σ haut et Σ bas de la période, un bas « à ce jour » étant pris en
-- vigueur à la fin de la période ; « Non calculé » avec sa raison si une source manque
-- (source_non_saisie, avec la première source qui manque) ou si le bas vaut 0 (bas_nul). Sur
-- l'année : Σ haut ÷ Σ bas sur les périodes attendues qui ont toutes leurs valeurs, jamais une
-- moyenne de taux ; départ : le plus récent des départs de ses sources. Un calcul de deux « à ce
-- jour » donne le résultat du jour, sans valeur sur l'année. Le taux est en pour cent, arrondi
-- à l'entier. L'administration lit les lignes sans valeur. Le « plafond 100 % » d'une part
-- (vague-1-decisions.md : « Non calculé » si le haut dépasse le bas) n'est pas appliqué ici :
-- rien dans indicateur ne dit encore qu'un taux est une part (« Taux de résolution » peut
-- dépasser 100 %), et non_calcule_raison n'a pas de code pour lui (contrat, section 6).
create view public.v_calcul with (security_invoker = true) as
with p as (select * from private.mesures_periode()),
repere as (
  select private.aujourdhui() as jour, private.mon_ministere() as moi, private.lit_tout() as lit_tout,
         make_date(extract(year from private.aujourdhui())::integer, 1, 1) as janvier
),
calculs as (
  select i.id, i.ministere_id, i.calcul, i.nature, i.retire_le,
         m.cree_le as ministere_cree_le, m.desactive_le as ministere_desactive_le,
         coalesce(private.derniere_periode_finie(i.nature), r.jour) as fin,
         private.periode_de(i.nature, r.janvier) as debut,
         coalesce(r.lit_tout or i.ministere_id = r.moi, false) as voit
    from public.indicateur i
    join public.ministere m on m.id = i.ministere_id
   cross join repere r
   where i.calcul in ('taux', 'moyenne')
     and coalesce(i.retrait_motif, '') not in ('confidentialite', 'refuse')
     -- Un calcul à valider, ou dont une source est à valider, refusée ou retirée pour
     -- confidentialité, n'a aucune ligne : ses valeurs restent hors de tout total et de tout calcul
     -- (T30), et rien d'un retiré pour confidentialité ne se lit (Q11), pour tous les lecteurs.
     and i.etat <> 'en_attente'
     and not exists (select 1 from public.indicateur_terme t
                      where t.calcul_id = i.id
                        and (t.source_id is null or t.agregat <> 'periode' or t.decalage <> 0))
     and not exists (select 1 from public.indicateur_terme t
                       join public.indicateur s on s.id = t.source_id
                      where t.calcul_id = i.id
                        and (s.etat = 'en_attente' or s.retrait_motif in ('refuse', 'confidentialite')))
),
termes as (
  select c.id as calcul_id, t.ordre, t.role, t.source_id, s.nature as source_nature,
         -- Départ de la source : la période de son ajout, reculée jusqu'à la plus ancienne période
         -- de l'année qu'elle a rattrapée.
         greatest(c.debut, least(
           private.periode_de(c.nature, (s.cree_le at time zone 'Europe/Paris')::date),
           coalesce(
             (select min(x.periode) from p as x
               where s.nature = c.nature and x.indicateur_id = s.id and x.ministere_id = c.ministere_id
                 and x.periode between c.debut and c.fin),
             private.periode_de(c.nature, (s.cree_le at time zone 'Europe/Paris')::date)))) as depart
    from calculs c
    join public.indicateur_terme t on t.calcul_id = c.id
    join public.indicateur s on s.id = t.source_id
),
periodes as (
  select c.id as calcul_id, q.periode::date as periode
    from calculs c
   cross join lateral generate_series(least(c.debut, c.fin)::timestamp, c.fin::timestamp,
                                      case c.nature when 'mois' then interval '1 month' else interval '7 days' end) as q(periode)
   where c.nature <> 'a_ce_jour'
  union all
  select c.id, c.fin from calculs c where c.nature = 'a_ce_jour'
),
valeurs as (
  select q.calcul_id, q.periode, t.ordre, t.role, t.source_id, v.valeur
    from periodes q
    join calculs c on c.id = q.calcul_id
    join termes t on t.calcul_id = q.calcul_id
    left join lateral (
      select x.valeur
        from p as x
       where x.indicateur_id = t.source_id and x.ministere_id = c.ministere_id
         and case when t.source_nature = 'a_ce_jour' then x.periode <= private.fin_periode(c.nature, q.periode)
                  else x.periode = q.periode end
       order by x.periode desc
       limit 1
    ) as v on true
),
par_periode as (
  select v.calcul_id, v.periode,
         bool_and(v.valeur is not null) as complete,
         sum(v.valeur) filter (where v.role = 'haut') as haut,
         sum(v.valeur) filter (where v.role = 'bas') as bas,
         (array_agg(v.source_id order by v.ordre) filter (where v.valeur is null))[1] as manque
    from valeurs v
   group by v.calcul_id, v.periode
),
annee as (
  select c.id as calcul_id,
         sum(pp.haut) filter (where pp.complete) as haut,
         sum(pp.bas) filter (where pp.complete) as bas,
         count(*) filter (where pp.complete)::integer as nb_periodes,
         count(*)::integer as nb_attendues
    from calculs c
    join par_periode pp on pp.calcul_id = c.id
   where c.nature <> 'a_ce_jour'
     and pp.periode >= c.debut
     and pp.periode >= (select max(t.depart) from termes t where t.calcul_id = c.id)
     and pp.periode <= c.fin
     and private.actif_le(c.ministere_cree_le, c.ministere_desactive_le, private.fin_periode(c.nature, pp.periode))
     and (c.retire_le is null or (c.retire_le at time zone 'Europe/Paris')::date > pp.periode)
   group by c.id
)
select c.id as indicateur_id, c.ministere_id, c.calcul, c.fin as periode,
       case when c.voit then pp.haut end as haut,
       case when c.voit then pp.bas end as bas,
       case when c.voit and pp.complete and pp.bas > 0 then
         case c.calcul when 'taux' then round(100.0 * pp.haut / pp.bas) else pp.haut::numeric / pp.bas end
       end as resultat,
       case when c.voit then a.haut::bigint end as annee_haut,
       case when c.voit then a.bas::bigint end as annee_bas,
       case when c.voit and a.bas > 0 then
         case c.calcul when 'taux' then round(100.0 * a.haut / a.bas) else a.haut::numeric / a.bas end
       end as annee_resultat,
       case when c.voit and c.nature <> 'a_ce_jour' then coalesce(a.nb_periodes, 0) end as annee_nb_periodes,
       case when c.voit and c.nature <> 'a_ce_jour' then coalesce(a.nb_attendues, 0) end as annee_nb_attendues,
       case
         when not c.voit then null
         when pp.complete is distinct from true then 'source_non_saisie'
         when pp.bas = 0 then 'bas_nul'
       end as non_calcule_raison,
       case when c.voit and pp.complete is distinct from true then pp.manque end as non_calcule_source_id
  from calculs c
  left join par_periode pp on pp.calcul_id = c.id and pp.periode = c.fin
  left join annee a on a.calcul_id = c.id;

-- Usage des indicateurs propres saisis (administration et EJP Tech) : périodes saisies sur
-- périodes attendues depuis l'ajout (un rattrapage plus ancien recule le départ), dernière
-- saisie, « jamais saisi », attente d'un ajout à valider. Jamais une valeur. Un « à ce jour » se
-- compte par mois (un mois est saisi s'il a une saisie). Un retiré pour confidentialité n'y
-- figure pas (Q11).
create function private.usage_indicateurs()
returns table (indicateur_id uuid, ministere_id uuid, nb_periodes_saisies integer,
               nb_periodes_attendues integer, derniere_saisie_le timestamptz, jamais_saisi boolean,
               attente_jours integer)
language sql stable security definer set search_path = '' as $$
  select i.id, i.ministere_id, u.nb_saisies, u.nb_attendues, u.derniere, u.derniere is null,
         case when i.etat = 'en_attente'
              then private.aujourdhui() - (i.cree_le at time zone 'Europe/Paris')::date end
    from public.indicateur i
    join public.ministere m on m.id = i.ministere_id
   cross join lateral (
     select case i.nature when 'dimanche' then 'dimanche' else 'mois' end as nature
   ) as n
   cross join lateral (
     select least(private.periode_de(n.nature, (i.cree_le at time zone 'Europe/Paris')::date),
                  coalesce((select min(private.periode_de(n.nature, x.date_ref)) from public.mesure x
                             where x.indicateur_id = i.id),
                           private.periode_de(n.nature, (i.cree_le at time zone 'Europe/Paris')::date))) as debut,
            private.derniere_periode_finie(n.nature) as fin
   ) as b
   cross join lateral (
     select (select max(x.saisi_le) from public.mesure x where x.indicateur_id = i.id) as derniere,
            (select count(distinct private.periode_de(n.nature, x.date_ref))::integer from public.mesure x
              where x.indicateur_id = i.id
                and private.periode_de(n.nature, x.date_ref) between b.debut and b.fin) as nb_saisies,
            (select count(*)::integer
               from generate_series(b.debut::timestamp, b.fin::timestamp,
                                    case n.nature when 'mois' then interval '1 month' else interval '7 days' end) as q(periode)
              where private.actif_le(m.cree_le, m.desactive_le, private.fin_periode(n.nature, q.periode::date))
                and (i.retire_le is null or (i.retire_le at time zone 'Europe/Paris')::date > q.periode::date)
            ) as nb_attendues
   ) as u
   where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and (select private.mon_type()) in ('admin_eglise', 'admin_plateforme')
     and i.calcul is null
     and i.retrait_motif is distinct from 'confidentialite'
$$;

create view public.v_usage_indicateurs with (security_invoker = true) as
select u.indicateur_id, u.ministere_id, u.nb_periodes_saisies, u.nb_periodes_attendues,
       u.derniere_saisie_le, u.jamais_saisi, u.attente_jours
  from private.usage_indicateurs() as u;

-- Droits : les fonctions lues par les vues, au nom du compte connecté ; les vues en lecture pour
-- authenticated seulement ; rien pour anon ni service_role.
revoke all on function private.periode_de(text, date), private.fin_periode(text, date),
  private.derniere_periode_finie(text), private.sous_seuil(bigint), private.mesures_periode(),
  private.usage_indicateurs()
  from public, anon, authenticated, service_role;
grant execute on function private.periode_de(text, date), private.fin_periode(text, date),
  private.derniere_periode_finie(text), private.sous_seuil(bigint), private.mesures_periode(),
  private.usage_indicateurs()
  to authenticated;

revoke all on public.v_mesure_periode, public.v_indicateur_serie, public.v_indicateur_suivi, public.v_calcul,
  public.v_usage_indicateurs
  from anon, authenticated, service_role;
grant select on public.v_mesure_periode, public.v_indicateur_serie, public.v_indicateur_suivi, public.v_calcul,
  public.v_usage_indicateurs
  to authenticated;
