-- Plages des événements (T78, lot 2 ; docs/conception/calendrier-evenements.md, sections 5, 6.4,
-- 9, 10.2 et 12 ; décision de la personne responsable du 26 octobre 2026, réponses « Proposé »,
-- le verrou « ajout seulement » jamais levé).
--
-- 1. Un événement sur plusieurs jours : evenement_etat gagne date_fin (null : un seul jour ; sinon
--    du lendemain du premier jour à 30 jours après, soit 31 jours au plus) et heure_fin
--    (facultative, minutes depuis minuit à l'heure de Paris, comme heure_prevue). Les colonnes
--    suivent les droits de la table : GRANT insert et politique « ajout » du porteur inchangés.
-- 2. Une série : evenement gagne serie_id, posé à la création par ajouter_evenements_serie et
--    jamais changé (aucun GRANT insert ni update sur evenement). Une série est faite d'événements
--    ordinaires, chacun avec sa vie propre.
-- 3. private.controler_evenement_etat() recréée : une date de fin vide reprend la durée du dernier
--    état (un report de l'ancien site garde la durée, S7) ; une date de fin égale au premier jour
--    redevient vide (retour à un seul jour, envoyé par le nouveau site) ; une heure de fin vide
--    reprend la dernière ; une fin avant le début, plus de 31 jours, ou une nouvelle fin passée
--    sont refusées ; « Rien n'a changé » compare aussi la fin et l'heure de fin.
-- 4. v_evenement : quatre colonnes à la fin (date_fin, heure_fin, jours_fin, serie_id) ; jours
--    garde son sens (premier jour), jours_fin compte jusqu'au dernier jour.
-- 5. Comptages : « à venir » et « passé sans état final » se lisent sur le dernier jour ; le mois,
--    le report et la ponctualité, sur le premier jour.
-- 6. Journal : evenement_ajoute porte date_fin, heure_fin et serie quand ils existent ;
--    evenement_modifie porte date_fin et heure_fin quand ils changent.
-- 7. ajouter_evenement à huit arguments (dates de début et de fin, heures prévue et de fin,
--    numéro), tous obligatoires (PGRST203) ; la version à six arguments (T76) délègue avec une fin
--    vide, celles à cinq, quatre et trois délèguent déjà. L'empreinte d'un envoi sans fin reste
--    celle de T76 : un numéro reçu avant la migration est reconnu après.
-- 8. ajouter_evenements_serie : 2 à 31 dates sans doublon, aucune passée, 12 mois au plus entre
--    la première et la dernière ; un événement par date, en une transaction, avec le numéro
--    anti-doublon de T76 (opération ajouter_evenements_serie, liste fermée de private.envoi
--    recréée) ; une instruction insert par table, donc une ligne de journal par événement.
-- 9. Gestes « Toute la série » (Q8) : corriger_titre_serie (dates non retirées),
--    modifier_mentions_serie (dates à venir), retirer_serie (porteur : dates à venir sans état
--    final ; EJP Tech : toutes). Chacun applique la fonction de l'événement à chaque date, dans la
--    même transaction : une ligne de journal par événement touché.
-- 10. modifier_mentions_evenement et retirer_evenement recréés : le porteur agit jusqu'au dernier
--    jour compris (au lieu du premier).
-- 11. Modération (Q14) : une ligne par série dans les textes à relire (création et correction du
--    nom faite en une fois sur la série) ; masquer le nom d'une date masque toute la série.
-- 12. Liste fermée des écritures des incidents d'envoi : les quatre fonctions nouvelles.
--
-- Rien n'est modifié ni effacé dans les tables en ajout seulement (seule exception inchangée :
-- masquer_texte sur un nom). Aucune donnée personnelle ; aucune date du jour dans une contrainte ;
-- aucun SQL dynamique.

-- 1. Colonnes

alter table public.evenement add column serie_id uuid;
create index evenement_serie_idx on public.evenement (serie_id) where serie_id is not null;

alter table public.evenement_etat
  add column date_fin date,
  add column heure_fin smallint check (heure_fin between 0 and 1439),
  add constraint evenement_etat_date_fin check (date_fin is null or date_fin between date + 1 and date + 30);

-- 2. Contrôle de chaque nouvel état : version de 20261026235900_evenements_corrections.sql, plus
-- la date de fin et l'heure de fin. Comme avant, le contrôle ne vise que le porteur en aal2 (sinon
-- la RLS refuse, 42501, sans rien lui apprendre) ; le propriétaire des tables est refusé sur un
-- événement retiré.
create or replace function private.controler_evenement_etat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_trouve boolean;
  v_date date;
  v_fin date;
  v_statut public.statut_evenement;
  v_prevue smallint;
  v_debut smallint;
  v_heure_fin smallint;
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2'
     or not exists (select 1 from public.evenement e
                     where e.id = new.evenement_id and e.ministere_id = private.mon_ministere()) then
    if (select auth.uid()) is null
       and exists (select 1 from public.evenement_retrait r where r.evenement_id = new.evenement_id) then
      raise exception 'Cet événement a été retiré.';
    end if;
    return new;
  end if;
  -- Verrou sur l'événement : deux envois simultanés se suivent, et le second lit le dernier état
  -- déjà validé par le premier ; un retrait en cours est terminé.
  perform 1 from public.evenement e where e.id = new.evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = new.evenement_id) then
    raise exception 'Cet événement a été retiré.';
  end if;
  select x.date, x.date_fin, x.statut, x.heure_prevue, x.heure_debut, x.heure_fin
    into v_date, v_fin, v_statut, v_prevue, v_debut, v_heure_fin
    from public.evenement_etat x
   where x.evenement_id = new.evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  v_trouve := found;
  -- Dernier jour : vide, il reprend la durée du dernier état (l'ancien site ne l'envoie pas) ;
  -- égal au premier jour, l'événement revient à un seul jour.
  if new.date_fin is null and v_fin is not null then
    new.date_fin := new.date + (v_fin - v_date);
  elsif new.date_fin = new.date then
    new.date_fin := null;
  end if;
  if new.date_fin < new.date then
    raise exception 'Le dernier jour doit suivre le premier.';
  end if;
  if new.date_fin > new.date + 30 then
    raise exception 'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.';
  end if;
  -- Une heure vide reprend la dernière : une heure se corrige, elle ne s'efface pas.
  if new.heure_prevue is null then
    new.heure_prevue := v_prevue;
  end if;
  if new.heure_fin is null then
    new.heure_fin := v_heure_fin;
  end if;
  if new.heure_debut is not null and new.statut <> 'termine' then
    raise exception 'L''heure de début se saisit pour un événement terminé.';
  end if;
  if new.heure_debut is null and new.statut = 'termine' then
    new.heure_debut := v_debut;
  end if;
  -- La ponctualité se mesure au début du premier jour.
  if new.heure_debut is not null and new.date > private.aujourdhui() then
    raise exception 'L''heure de début se saisit le jour de l''événement ou après.';
  end if;
  if not v_trouve then
    return new;
  end if;
  if new.date is distinct from v_date and new.date < private.aujourdhui() then
    raise exception 'La nouvelle date doit être aujourd''hui ou plus tard.';
  end if;
  if coalesce(new.date_fin, new.date) is distinct from coalesce(v_fin, v_date)
     and coalesce(new.date_fin, new.date) < private.aujourdhui() then
    raise exception 'La date de fin doit être aujourd''hui ou plus tard.';
  end if;
  if new.date = v_date and new.date_fin is not distinct from v_fin and new.statut = v_statut
     and new.heure_prevue is not distinct from v_prevue
     and new.heure_debut is not distinct from v_debut
     and new.heure_fin is not distinct from v_heure_fin then
    raise exception 'Rien n''a changé : ce statut et cette date sont déjà enregistrés.';
  end if;
  return new;
end $$;

-- 3. Vue des événements : version de 20261026235900_evenements_corrections.sql, mêmes colonnes
-- dans le même ordre (l'ancien site les lit), puis le dernier jour (null : un seul jour), l'heure
-- de fin, jours_fin (dernier jour, ou premier s'il n'y en a qu'un, moins aujourd'hui) et la série.
create or replace view public.v_evenement with (security_invoker = true) as
select d.id, d.ministere_id, coalesce(n.titre, d.titre_creation) as titre, d.date, d.statut, d.mis_a_jour_le,
       d.date - private.aujourdhui() as jours,
       (d.statut = 'attente_validation'
        and d.date <= private.aujourdhui() + 3
        and exists (select 1 from public.ministere m where m.id = d.ministere_id and m.desactive_le is null))
         as a_confirmer,
       case when d.date_precedente <> d.date then d.date_precedente end as reporte_du,
       d.heure_prevue, d.heure_debut,
       r.retard,
       r.retard <= private.tolerance_ponctualite() as a_l_heure,
       case when n.titre is not null then coalesce(p.titre, d.titre_creation) end as titre_precedent,
       (n.saisi_le at time zone 'Europe/Paris')::date as titre_corrige_le,
       d.date_fin, d.heure_fin,
       coalesce(d.date_fin, d.date) - private.aujourdhui() as jours_fin,
       d.serie_id
from (
  select distinct on (e.id) e.id, e.ministere_id, e.titre as titre_creation, e.serie_id, x.date, x.statut,
         x.saisi_le as mis_a_jour_le,
         lag(x.date) over (partition by e.id order by x.saisi_le, x.id) as date_precedente,
         x.heure_prevue, x.heure_debut, x.date_fin, x.heure_fin
  from public.evenement e
  join public.evenement_etat x on x.evenement_id = e.id
  where not exists (select 1 from public.evenement_retrait z where z.evenement_id = e.id)
  order by e.id, x.saisi_le desc, x.id desc
) as d
left join lateral (
  select t.titre, t.saisi_le from public.evenement_titre t
   where t.evenement_id = d.id
   order by t.saisi_le desc, t.id desc
   limit 1
) as n on true
left join lateral (
  select t.titre from public.evenement_titre t
   where t.evenement_id = d.id
   order by t.saisi_le desc, t.id desc
   offset 1 limit 1
) as p on true
cross join lateral (
  select case when d.statut = 'termine' then private.retard_minutes(d.heure_prevue, d.heure_debut) end as retard
) as r;

-- 4. Comptages par mois : version de 20261026235900_evenements_corrections.sql ; « à venir » et
-- « passé » se lisent sur le dernier jour, le mois et le report sur le premier. Même signature :
-- create or replace garde le propriétaire et les droits.
create or replace function private.comptages_evenements_mois(p_ministere uuid)
returns table (mois date, prevus integer, realises integer, annules integer, reportes integer,
               en_attente integer, passes_sans_etat_final integer, avec_heures integer, a_l_heure integer,
               retard_cumule integer)
language sql stable set search_path = '' as $$
  with etats as (
    select x.evenement_id, x.date, coalesce(x.date_fin, x.date) as dernier_jour, x.statut, x.heure_prevue,
           x.heure_debut,
           lag(x.date) over (partition by x.evenement_id order by x.saisi_le, x.id) as date_precedente,
           row_number() over (partition by x.evenement_id order by x.saisi_le desc, x.id desc) as rang
      from public.evenement e
      join public.evenement_etat x on x.evenement_id = e.id
     where (p_ministere is null or e.ministere_id = p_ministere)
       and not exists (select 1 from public.evenement_retrait z where z.evenement_id = e.id)
  ),
  dernier as (
    select d.evenement_id, d.date, d.dernier_jour, d.statut,
           case when d.statut = 'termine' then private.retard_minutes(d.heure_prevue, d.heure_debut) end as retard,
           exists (select 1 from etats v
                    where v.evenement_id = d.evenement_id and v.statut in ('valide', 'preparation')) as a_ete_valide
      from etats d
     where d.rang = 1
  ),
  lignes as (
    select date_trunc('month', d.date::timestamp)::date as jour_mois,
           case when d.dernier_jour >= private.aujourdhui() then d.statut in ('valide', 'preparation')
                else d.a_ete_valide end as prevu,
           d.statut = 'termine' as realise,
           d.statut = 'annule' as annule,
           false as reporte,
           d.statut = 'attente_validation' as attente,
           d.dernier_jour < private.aujourdhui() and d.statut in ('valide', 'preparation') as passe,
           d.retard
      from dernier d
    union all
    select r.jour_mois, false, false, false, true, false, false, null::integer
      from (select distinct date_trunc('month', t.date_precedente::timestamp)::date as jour_mois, t.evenement_id
              from etats t
             where t.date > t.date_precedente) as r
  )
  select l.jour_mois,
         (count(*) filter (where l.prevu))::integer,
         (count(*) filter (where l.realise))::integer,
         (count(*) filter (where l.annule))::integer,
         (count(*) filter (where l.reporte))::integer,
         (count(*) filter (where l.attente))::integer,
         (count(*) filter (where l.passe))::integer,
         (count(*) filter (where l.realise and l.retard is not null))::integer,
         (count(*) filter (where l.realise and l.retard <= private.tolerance_ponctualite()))::integer,
         coalesce(sum(greatest(l.retard, 0)) filter (where l.realise), 0)::integer
    from lignes l
   group by l.jour_mois
  having bool_or(l.prevu or l.realise or l.annule or l.reporte or l.attente or l.passe)
   order by l.jour_mois
$$;

-- 5. Journal des événements : version de 20261023120000_evenements_heures.sql, plus la date de
-- fin, l'heure de fin et la série. Une ligne par envoi et par événement, comme avant ; clé absente
-- quand la valeur est vide (ou inchangée pour une mise à jour) ; jamais de texte libre.
create or replace function private.journaliser_evenements() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  select x.saisi_le, x.saisi_par, x.ministere_id, x.action, 'evenement', x.evenement_id,
         case x.action
           when 'evenement_ajoute' then jsonb_build_object(
             'date', x.date, 'statut', x.statut,
             'mentions', coalesce((select jsonb_agg(m.ministere_id order by m.ministere_id)
                                     from public.evenement_mention m
                                    where m.evenement_id = x.evenement_id), '[]'::jsonb))
             || case when x.heure_prevue is not null
                     then jsonb_build_object('heure_prevue', x.heure_prevue) else '{}'::jsonb end
             || case when x.date_fin is not null
                     then jsonb_build_object('date_fin', x.date_fin) else '{}'::jsonb end
             || case when x.heure_fin is not null
                     then jsonb_build_object('heure_fin', x.heure_fin) else '{}'::jsonb end
             || case when x.serie_id is not null
                     then jsonb_build_object('serie', x.serie_id) else '{}'::jsonb end
           else jsonb_build_object('date', x.date, 'statut', x.statut, 'date_precedente', x.date_precedente)
             || case when x.heure_prevue is not null and x.heure_prevue is distinct from x.prevue_precedente
                     then jsonb_build_object('heure_prevue', x.heure_prevue) else '{}'::jsonb end
             || case when x.heure_debut is not null and x.heure_debut is distinct from x.debut_precedent
                     then jsonb_build_object('heure_debut', x.heure_debut) else '{}'::jsonb end
             || case when x.date_fin is distinct from x.fin_precedente
                     then jsonb_build_object('date_fin', x.date_fin) else '{}'::jsonb end
             || case when x.heure_fin is not null and x.heure_fin is distinct from x.heure_fin_precedente
                     then jsonb_build_object('heure_fin', x.heure_fin) else '{}'::jsonb end
         end
  from (
    select distinct on (n.saisi_le, n.saisi_par, n.evenement_id)
           n.saisi_le, n.saisi_par, n.evenement_id, n.date, n.statut, n.heure_prevue, n.heure_debut,
           n.date_fin, n.heure_fin, e.ministere_id, e.serie_id,
           case when exists (select 1 from public.evenement_etat a
                              where a.evenement_id = n.evenement_id
                                and (a.saisi_le < n.saisi_le
                                     or not exists (select 1 from nouvelles y where y.id = a.id)))
                then 'evenement_modifie' else 'evenement_ajoute' end as action,
           p.date as date_precedente, p.heure_prevue as prevue_precedente, p.heure_debut as debut_precedent,
           p.date_fin as fin_precedente, p.heure_fin as heure_fin_precedente
    from nouvelles n
    join public.evenement e on e.id = n.evenement_id
    left join lateral (
      select q.date, q.heure_prevue, q.heure_debut, q.date_fin, q.heure_fin from public.evenement_etat q
       where q.evenement_id = n.evenement_id
         and not exists (select 1 from nouvelles y where y.id = q.id)
       order by q.saisi_le desc, q.id desc
       limit 1
    ) as p on true
    order by n.saisi_le, n.saisi_par, n.evenement_id, n.id desc
  ) as x;
  return null;
end $$;

-- Tableau des ministères : version de 20261026235900_evenements_corrections.sql ; le prochain
-- événement reste affiché jusqu'à son dernier jour (un camp en cours ne disparaît pas du tableau
-- du berger). Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.tableau_ministeres()
returns table (
  ministere_id uuid, nom text, description text, derniere_saisie timestamptz,
  prochain_evenement_date date, prochain_evenement_titre text,
  prochaine_reunion_date date, prochaine_reunion_heure time, point_ouvert_priorite public.priorite)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_type() as type, private.lit_tout() as lit_tout, private.aujourdhui() as jour
    where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select m.id, m.nom, m.description,
         -- Fraîcheur (règle 6) : dernière ligne de journal écrite par un compte du ministère,
         -- sauf un signalement et ses réponses, qui ne sont pas des saisies.
         (select max(j.le) from public.journal j
            join public.compte c on c.user_id = j.compte
           where c.ministere_id = m.id
             and j.action not in ('difficulte_signalee', 'signalement_regle', 'signalement_reponse_ministere')),
         ev.date, ev.titre,
         case when moi.lit_tout then re.date end,
         case when moi.lit_tout then re.heure end,
         case when moi.lit_tout then (
           select max(p.priorite) from public.point_attention p
            where p.ministere_id = m.id
              and not exists (select 1 from public.point_suivi s where s.point_id = p.id and s.statut = 'traite'))
         end
  from moi
  cross join public.ministere m
  left join lateral (
    select x.date,
           coalesce((select n.titre from public.evenement_titre n
                      where n.evenement_id = x.id
                      order by n.saisi_le desc, n.id desc
                      limit 1), x.titre) as titre
    from (select distinct on (e.id) e.id, e.titre, t.date, t.date_fin, t.statut
            from public.evenement e
            join public.evenement_etat t on t.evenement_id = e.id
           where e.ministere_id = m.id
             and not exists (select 1 from public.evenement_retrait z where z.evenement_id = e.id)
           order by e.id, t.saisi_le desc, t.id desc) as x
    where coalesce(x.date_fin, x.date) >= moi.jour and x.statut not in ('termine', 'annule')
    order by x.date, titre                -- le nom en vigueur (colonne rendue)
    limit 1
  ) as ev on true
  left join lateral (
    select r.date, r.heure
    from (select r0.date, r0.heure from public.reunion r0
           where r0.ministere_id = m.id
           order by r0.saisi_le desc
           limit 1) as r
    where r.date >= moi.jour
  ) as re on true
  where m.desactive_le is null
    and (moi.lit_tout or moi.type in ('ministere', 'admin_eglise'))
$$;

-- 6. Numéro anti-doublon : la liste fermée des opérations, plus la série.
alter table private.envoi
  drop constraint envoi_operation_check,
  add constraint envoi_operation_check check (operation in (
    'ajouter_evenement', 'creer_point', 'signaler_difficulte', 'ajouter_evenements_serie'));

-- 7. Ajouter un événement, sur un ou plusieurs jours

create function private.ajouter_evenement(p_titre text, p_date date, p_date_fin date,
  p_statut public.statut_evenement, p_mentions uuid[], p_heure_prevue smallint, p_heure_fin smallint, p_cle uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_fin date;
  v_mentions uuid[];
  v_empreinte text;
  v_evenement uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if v_ministere is null then
    raise exception 'Seul un compte de ministère peut ajouter un événement.' using errcode = '42501';
  end if;
  v_titre := btrim(coalesce(p_titre, ''));
  v_fin := nullif(p_date_fin, p_date);  -- le dernier jour égal au premier : un seul jour
  -- Mentions : doublons et valeurs vides retirés, triées (l'ordre des cases ne change pas l'envoi).
  select coalesce(array_agg(distinct x.id order by x.id), '{}') into v_mentions
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  -- Numéro : lu avant les contrôles métier. Sans fin ni heure de fin, l'empreinte est celle de
  -- la version à six arguments (T76).
  if p_cle is not null then
    v_empreinte := md5((jsonb_build_array(v_titre, p_date, p_statut, p_heure_prevue, v_mentions)
                        || case when v_fin is null and p_heure_fin is null then '[]'::jsonb
                                else jsonb_build_array(v_fin, p_heure_fin) end)::text);
    v_evenement := private.envoi_existant(p_cle, 'ajouter_evenement', v_empreinte);
    if v_evenement is not null then
      return v_evenement;
    end if;
  end if;
  if char_length(v_titre) not between 1 and 80 then
    raise exception 'Donnez un nom à l''événement (80 caractères au plus).';
  end if;
  if p_date is null then
    raise exception 'Choisissez une date.';
  end if;
  if p_date < private.aujourdhui() then
    raise exception 'La date ne peut pas être passée.';
  end if;
  if v_fin < p_date then
    raise exception 'Le dernier jour doit suivre le premier.';
  end if;
  if v_fin > p_date + 30 then
    raise exception 'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.';
  end if;
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  if p_heure_prevue is not null and p_heure_prevue not between 0 and 1439 then
    raise exception 'L''heure prévue est invalide.';
  end if;
  if p_heure_fin is not null and p_heure_fin not between 0 and 1439 then
    raise exception 'L''heure de fin est invalide.';
  end if;
  -- Jamais soi-même ; ministères actifs seulement.
  if exists (select 1 from unnest(v_mentions) as x(id)
             where x.id = v_ministere
                or not exists (select 1 from public.ministere m where m.id = x.id and m.desactive_le is null)) then
    raise exception 'Ce ministère ne peut pas être mentionné.';
  end if;
  v_evenement := gen_random_uuid();
  if p_cle is not null then
    if not private.retenir_envoi(p_cle, 'ajouter_evenement', v_evenement, v_empreinte) then
      -- Un envoi concurrent du même numéro vient d'être validé : il fait foi.
      return private.envoi_existant(p_cle, 'ajouter_evenement', v_empreinte);
    end if;
    perform private.purger_envois();
  end if;
  insert into public.evenement (id, ministere_id, titre) values (v_evenement, v_ministere, v_titre);
  insert into public.evenement_mention (evenement_id, ministere_id)
  select v_evenement, x.id from unnest(v_mentions) as x(id);
  -- Premier état : le trigger de evenement_etat écrit la ligne de journal evenement_ajoute, avec
  -- les mentions déjà posées, au nom du compte connecté.
  insert into public.evenement_etat (evenement_id, date, date_fin, statut, heure_prevue, heure_fin)
  values (v_evenement, p_date, v_fin, p_statut, p_heure_prevue, p_heure_fin);
  return v_evenement;
end $$;

create function public.ajouter_evenement(p_titre text, p_date date, p_date_fin date,
  p_statut public.statut_evenement, p_mentions uuid[], p_heure_prevue smallint, p_heure_fin smallint, p_cle uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_evenement(p_titre, p_date, p_date_fin, p_statut, p_mentions, p_heure_prevue, p_heure_fin, p_cle);
$$;

-- La version à six arguments (T76) délègue avec une fin vide ; celles à cinq, quatre et trois
-- délèguent déjà à elle. Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint, p_cle uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  return private.ajouter_evenement(p_titre, p_date, null::date, p_statut, p_mentions, p_heure_prevue, null::smallint,
                                   p_cle);
end $$;

-- 8. Ajouter une série : un événement par date, en une transaction. L'écran calcule les dates
-- (jours de la semaine) et les montre avant l'envoi ; la base les contrôle.
create function private.ajouter_evenements_serie(p_titre text, p_dates date[], p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint, p_heure_fin smallint, p_cle uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_dates date[];
  v_nombre integer;
  v_mentions uuid[];
  v_empreinte text;
  v_serie uuid;
  v_ids uuid[];
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if v_ministere is null then
    raise exception 'Seul un compte de ministère peut ajouter un événement.' using errcode = '42501';
  end if;
  v_titre := btrim(coalesce(p_titre, ''));
  -- Dates sans doublon ni valeur vide, triées ; mentions de même.
  select coalesce(array_agg(distinct x.jour order by x.jour), '{}') into v_dates
  from unnest(p_dates) as x(jour)
  where x.jour is not null;
  v_nombre := cardinality(v_dates);
  select coalesce(array_agg(distinct x.id order by x.id), '{}') into v_mentions
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  -- Numéro : lu avant les contrôles métier ; l'empreinte porte sur les dates triées.
  if p_cle is not null then
    v_empreinte := md5(jsonb_build_array(v_titre, v_dates, p_statut, p_heure_prevue, p_heure_fin, v_mentions)::text);
    v_serie := private.envoi_existant(p_cle, 'ajouter_evenements_serie', v_empreinte);
    if v_serie is not null then
      return v_serie;
    end if;
  end if;
  if char_length(v_titre) not between 1 and 80 then
    raise exception 'Donnez un nom à l''événement (80 caractères au plus).';
  end if;
  if v_nombre > 31 then
    raise exception 'Une série compte 31 dates au plus. Raccourcissez la période.';
  end if;
  if v_nombre < 2 then
    raise exception 'Une série compte au moins deux dates.';
  end if;
  if v_dates[1] < private.aujourdhui() then
    raise exception 'La date ne peut pas être passée.';
  end if;
  if v_dates[v_nombre] > (v_dates[1] + interval '1 year')::date then
    raise exception 'Une série tient sur 12 mois au plus.';
  end if;
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  if p_heure_prevue is not null and p_heure_prevue not between 0 and 1439 then
    raise exception 'L''heure prévue est invalide.';
  end if;
  if p_heure_fin is not null and p_heure_fin not between 0 and 1439 then
    raise exception 'L''heure de fin est invalide.';
  end if;
  if exists (select 1 from unnest(v_mentions) as x(id)
             where x.id = v_ministere
                or not exists (select 1 from public.ministere m where m.id = x.id and m.desactive_le is null)) then
    raise exception 'Ce ministère ne peut pas être mentionné.';
  end if;
  v_serie := gen_random_uuid();
  select array_agg(gen_random_uuid()) into v_ids from generate_series(1, v_nombre);
  if p_cle is not null then
    if not private.retenir_envoi(p_cle, 'ajouter_evenements_serie', v_serie, v_empreinte) then
      return private.envoi_existant(p_cle, 'ajouter_evenements_serie', v_empreinte);
    end if;
    perform private.purger_envois();
  end if;
  -- Une instruction par table : le trigger de evenement_etat écrit une ligne evenement_ajoute
  -- par événement, chacune avec ses mentions et la série.
  insert into public.evenement (id, ministere_id, titre, serie_id)
  select v_ids[i], v_ministere, v_titre, v_serie from generate_series(1, v_nombre) as i;
  insert into public.evenement_mention (evenement_id, ministere_id)
  select v_ids[i], x.id from generate_series(1, v_nombre) as i cross join unnest(v_mentions) as x(id);
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue, heure_fin)
  select v_ids[i], v_dates[i], p_statut, p_heure_prevue, p_heure_fin from generate_series(1, v_nombre) as i;
  return v_serie;
end $$;

create function public.ajouter_evenements_serie(p_titre text, p_dates date[], p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint, p_heure_fin smallint, p_cle uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_evenements_serie(p_titre, p_dates, p_statut, p_mentions, p_heure_prevue, p_heure_fin, p_cle);
$$;

-- 9. Corrections de l'événement jusqu'au dernier jour compris : versions de
-- 20261026235900_evenements_corrections.sql et 20261027091106_retrait_apres_etat_final.sql, la
-- date passée lue sur le dernier jour. Mêmes signatures : create or replace garde le propriétaire
-- et les droits.
create or replace function private.modifier_mentions_evenement(p_evenement_id uuid, p_mentions uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
  v_dernier_jour date;
  v_voulues uuid[];
  v_ministere uuid;
  v_mention uuid;
begin
  perform private.exige_aal2();
  v_porteur := private.controler_evenement_du_porteur(p_evenement_id);
  select coalesce(x.date_fin, x.date) into v_dernier_jour from public.evenement_etat x
   where x.evenement_id = p_evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  if v_dernier_jour < private.aujourdhui() then
    raise exception 'Les mentions de cet événement ne changent plus.';
  end if;
  if p_mentions is null then
    raise exception 'Choisissez les ministères à mentionner.';
  end if;
  select coalesce(array_agg(distinct x.id), '{}') into v_voulues
    from unnest(p_mentions) as x(id)
   where x.id is not null;
  for v_ministere, v_mention in
    select m.ministere_id, m.id from public.evenement_mention m
     where m.evenement_id = p_evenement_id
       and not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id)
       and m.ministere_id <> all (v_voulues)
     order by m.ministere_id
  loop
    insert into public.evenement_mention_retrait (mention_id) values (v_mention);
    insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
    values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_mention_retiree', 'evenement',
            p_evenement_id, jsonb_build_object('ministere', v_ministere));
  end loop;
  for v_ministere in
    select x.id from unnest(v_voulues) as x(id)
     where not exists (select 1 from public.evenement_mention m
                        where m.evenement_id = p_evenement_id and m.ministere_id = x.id
                          and not exists (select 1 from public.evenement_mention_retrait r where r.mention_id = m.id))
     order by x.id
  loop
    if v_ministere = v_porteur
       or not exists (select 1 from public.ministere k where k.id = v_ministere and k.desactive_le is null) then
      raise exception 'Ce ministère ne peut pas être mentionné.';
    end if;
    insert into public.evenement_mention (evenement_id, ministere_id) values (p_evenement_id, v_ministere);
    insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
    values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_mention_ajoutee', 'evenement',
            p_evenement_id, jsonb_build_object('ministere', v_ministere));
  end loop;
end $$;

create or replace function private.retirer_evenement(p_evenement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
  v_tech boolean;
  v_date date;
  v_dernier_jour date;
  v_statut public.statut_evenement;
  v_final public.statut_evenement;
begin
  perform private.exige_aal2();
  v_tech := private.peut_configurer();
  select e.ministere_id into v_porteur from public.evenement e where e.id = p_evenement_id;
  if v_porteur is null or not (v_tech or coalesce(v_porteur = private.mon_ministere(), false)) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform 1 from public.evenement e where e.id = p_evenement_id for no key update;
  if exists (select 1 from public.evenement_retrait r where r.evenement_id = p_evenement_id) then
    return;                               -- déjà retiré : rien n'est écrit
  end if;
  select x.date, coalesce(x.date_fin, x.date), x.statut into v_date, v_dernier_jour, v_statut
    from public.evenement_etat x
   where x.evenement_id = p_evenement_id
   order by x.saisi_le desc, x.id desc
   limit 1;
  if not v_tech then
    -- Le dernier état final enregistré, même remplacé depuis par un autre état.
    select x.statut into v_final from public.evenement_etat x
     where x.evenement_id = p_evenement_id and x.statut in ('termine', 'annule')
     order by x.saisi_le desc, x.id desc
     limit 1;
    if v_final = 'termine' then
      raise exception 'Un événement terminé se retire par EJP Tech.';
    elsif v_final = 'annule' then
      raise exception 'Un événement annulé se retire par EJP Tech.';
    end if;
    if v_dernier_jour < private.aujourdhui() then
      raise exception 'Un événement passé se retire par EJP Tech.';
    end if;
  end if;
  insert into public.evenement_retrait (evenement_id) values (p_evenement_id);
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_porteur, 'evenement_retire', 'evenement', p_evenement_id,
          jsonb_build_object('date', v_date, 'statut', v_statut));
end $$;

-- 10. Gestes « Toute la série » (Q8)

-- Contrôle commun : la série existe et appartient au ministère du compte (ou, pour le retrait,
-- le compte est EJP Tech) ; sinon le message d'un élément absent (42501), pour ne rien révéler.
-- Verrou sur chaque événement de la série, dans l'ordre des identifiants. Le droit se contrôle
-- avant le verrou. Appelée par les fonctions security definer seulement.
create function private.controler_serie(p_serie_id uuid, p_tech boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_porteur uuid;
begin
  select e.ministere_id into v_porteur from public.evenement e where e.serie_id = p_serie_id limit 1;
  if v_porteur is null or not (p_tech or coalesce(v_porteur = private.mon_ministere(), false)) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform 1 from public.evenement e where e.serie_id = p_serie_id order by e.id for no key update;
  return v_porteur;
end $$;

-- Le nom de toutes les dates non retirées de la série (une ligne de evenement_titre et une ligne
-- de journal par date dont le nom change).
create function private.corriger_titre_serie(p_serie_id uuid, p_titre text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_evenement uuid;
  v_touches integer := 0;
begin
  perform private.exige_aal2();
  perform private.controler_serie(p_serie_id, false);
  for v_evenement in
    select e.id from public.evenement e
     where e.serie_id = p_serie_id
       and not exists (select 1 from public.evenement_retrait r where r.evenement_id = e.id)
     order by e.id
  loop
    perform private.corriger_titre_evenement(v_evenement, p_titre);
    v_touches := v_touches + 1;
  end loop;
  if v_touches = 0 then
    raise exception 'Cet événement a été retiré.';
  end if;
end $$;

-- Les mentions des dates de la série qui ne sont pas passées (dernier jour compris).
create function private.modifier_mentions_serie(p_serie_id uuid, p_mentions uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_evenement uuid;
  v_touches integer := 0;
begin
  perform private.exige_aal2();
  perform private.controler_serie(p_serie_id, false);
  for v_evenement in
    select e.id from public.evenement e
     where e.serie_id = p_serie_id
       and not exists (select 1 from public.evenement_retrait r where r.evenement_id = e.id)
       and (select coalesce(x.date_fin, x.date) from public.evenement_etat x
             where x.evenement_id = e.id
             order by x.saisi_le desc, x.id desc
             limit 1) >= private.aujourdhui()
     order by e.id
  loop
    perform private.modifier_mentions_evenement(v_evenement, p_mentions);
    v_touches := v_touches + 1;
  end loop;
  if v_touches = 0 then
    raise exception 'Les mentions de cet événement ne changent plus.';
  end if;
end $$;

-- Retirer la série : le porteur retire les dates à venir (dernier jour compris) qui n'ont aucun
-- état final enregistré ; les autres restent au calendrier. EJP Tech retire toutes les dates.
-- Déjà toutes retirées : rien n'est écrit.
create function private.retirer_serie(p_serie_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tech boolean;
  v_evenement uuid;
  v_touches integer := 0;
begin
  perform private.exige_aal2();
  v_tech := private.peut_configurer();
  perform private.controler_serie(p_serie_id, v_tech);
  for v_evenement in
    select e.id from public.evenement e
     where e.serie_id = p_serie_id
       and not exists (select 1 from public.evenement_retrait r where r.evenement_id = e.id)
       and (v_tech
            or ((select coalesce(x.date_fin, x.date) from public.evenement_etat x
                  where x.evenement_id = e.id
                  order by x.saisi_le desc, x.id desc
                  limit 1) >= private.aujourdhui()
                and not exists (select 1 from public.evenement_etat x
                                 where x.evenement_id = e.id and x.statut in ('termine', 'annule'))))
     order by e.id
  loop
    perform private.retirer_evenement(v_evenement);
    v_touches := v_touches + 1;
  end loop;
  if v_touches = 0 and exists (select 1 from public.evenement e
                                where e.serie_id = p_serie_id
                                  and not exists (select 1 from public.evenement_retrait r
                                                   where r.evenement_id = e.id)) then
    raise exception 'Un événement passé se retire par EJP Tech.';
  end if;
end $$;

create function public.corriger_titre_serie(p_serie_id uuid, p_titre text)
returns void language sql security invoker set search_path = '' as $$
  select private.corriger_titre_serie(p_serie_id, p_titre);
$$;

create function public.modifier_mentions_serie(p_serie_id uuid, p_mentions uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.modifier_mentions_serie(p_serie_id, p_mentions);
$$;

create function public.retirer_serie(p_serie_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.retirer_serie(p_serie_id);
$$;

-- Droits : rien pour public, anon ni service_role. Les fonctions de l'API (et leur partie
-- private) pour authenticated ; l'aide, pour personne (appelée par des security definer).
revoke all on function
  private.ajouter_evenement(text, date, date, public.statut_evenement, uuid[], smallint, smallint, uuid),
  public.ajouter_evenement(text, date, date, public.statut_evenement, uuid[], smallint, smallint, uuid),
  private.ajouter_evenements_serie(text, date[], public.statut_evenement, uuid[], smallint, smallint, uuid),
  public.ajouter_evenements_serie(text, date[], public.statut_evenement, uuid[], smallint, smallint, uuid),
  private.controler_serie(uuid, boolean),
  private.corriger_titre_serie(uuid, text),
  private.modifier_mentions_serie(uuid, uuid[]),
  private.retirer_serie(uuid),
  public.corriger_titre_serie(uuid, text),
  public.modifier_mentions_serie(uuid, uuid[]),
  public.retirer_serie(uuid)
  from public, anon, authenticated, service_role;
grant execute on function
  private.ajouter_evenement(text, date, date, public.statut_evenement, uuid[], smallint, smallint, uuid),
  public.ajouter_evenement(text, date, date, public.statut_evenement, uuid[], smallint, smallint, uuid),
  private.ajouter_evenements_serie(text, date[], public.statut_evenement, uuid[], smallint, smallint, uuid),
  public.ajouter_evenements_serie(text, date[], public.statut_evenement, uuid[], smallint, smallint, uuid),
  private.corriger_titre_serie(uuid, text),
  private.modifier_mentions_serie(uuid, uuid[]),
  private.retirer_serie(uuid),
  public.corriger_titre_serie(uuid, text),
  public.modifier_mentions_serie(uuid, uuid[]),
  public.retirer_serie(uuid)
  to authenticated;

-- 11. Modération (Q14)

-- Masquage : version de 20261026235900_evenements_corrections.sql ; le nom de création d'une
-- date d'une série se masque sur toute la série, un nom corrigé sur toute la série en une fois
-- (même série, même heure, même auteur : la correction « Toute la série »). Même signature.
create or replace function private.masquer_texte(p_cible text, p_cible_id uuid, p_champ text, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_masque constant text := '[texte masqué par EJP Tech]';
  v_auteur uuid;
  v_ministere uuid;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Seul EJP Tech peut masquer un texte.' using errcode = '42501';
  end if;
  if p_motif is null or p_motif not in ('nom_personne', 'coordonnees', 'situation_personnelle', 'autre') then
    raise exception 'Choisissez un motif dans la liste.';
  end if;
  if p_cible = 'point_attention' and p_champ = 'titre' then
    update public.point_attention set titre = v_masque
     where id = p_cible_id and titre <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'point_attention' and p_champ = 'description' then
    update public.point_attention set description = v_masque
     where id = p_cible_id and nullif(btrim(description), '') is not null and description <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'point_attention' and p_champ = 'action_attendue' then
    update public.point_attention set action_attendue = v_masque
     where id = p_cible_id and nullif(btrim(action_attendue), '') is not null and action_attendue <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'point_suivi' and p_champ = 'commentaire' then
    update public.point_suivi set commentaire = v_masque
     where id = p_cible_id and nullif(btrim(commentaire), '') is not null and commentaire <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'evenement' and p_champ = 'titre' then
    update public.evenement set titre = v_masque
     where id = p_cible_id and titre <> v_masque
    returning saisi_par into v_auteur;
    if v_auteur is not null then
      update public.evenement set titre = v_masque
       where serie_id = (select e.serie_id from public.evenement e where e.id = p_cible_id)
         and titre <> v_masque;
    end if;
  elsif p_cible = 'reunion' and p_champ = 'objet' then
    update public.reunion set objet = v_masque
     where id = p_cible_id and nullif(btrim(objet), '') is not null and objet <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'reunion' and p_champ = 'decision_attendue' then
    update public.reunion set decision_attendue = v_masque
     where id = p_cible_id and nullif(btrim(decision_attendue), '') is not null and decision_attendue <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'demande_indicateur' and p_champ = 'pourquoi' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.demande_indicateur set pourquoi = v_masque
     where id = p_cible_id and pourquoi is not null and pourquoi <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'validation' and p_champ = 'motif' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.validation set motif = v_masque
     where id = p_cible_id and motif is not null and motif <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'precision_sensible' and p_champ = 'texte' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.precision_sensible set texte = v_masque
     where id = p_cible_id and texte <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'signalement' and p_champ = 'texte' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.signalement set texte = v_masque
     where id = p_cible_id and texte <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'signalement_suivi' and p_champ = 'commentaire' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.signalement_suivi set commentaire = v_masque
     where id = p_cible_id and commentaire is not null and commentaire <> v_masque
    returning saisi_par into v_auteur;
    perform set_config('pilotage.masquage', '', true);
    if v_auteur is not null then
      v_ministere := private.ministere_du_signalement(p_cible, p_cible_id);
    end if;
  elsif p_cible = 'retrait_indicateur' and p_champ = 'motif' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.retrait_indicateur set motif = v_masque
     where id = p_cible_id and motif <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  elsif p_cible = 'evenement_titre' and p_champ = 'titre' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.evenement_titre set titre = v_masque
     where id = p_cible_id and titre <> v_masque
    returning saisi_par into v_auteur;
    if v_auteur is not null then
      update public.evenement_titre u set titre = v_masque
        from public.evenement_titre t, public.evenement e, public.evenement f
       where t.id = p_cible_id and e.id = t.evenement_id and e.serie_id is not null
         and f.id = u.evenement_id and f.serie_id = e.serie_id
         and u.saisi_le = t.saisi_le and u.saisi_par = t.saisi_par and u.titre <> v_masque;
    end if;
    perform set_config('pilotage.masquage', '', true);
    if v_auteur is not null then
      v_ministere := (select e.ministere_id from public.evenement_titre t
                        join public.evenement e on e.id = t.evenement_id
                       where t.id = p_cible_id);
    end if;
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère concerné : celui de la précision, du signalement, du retrait ou de l'événement,
  -- sinon celui du compte auteur (null pour le berger, le conseil et EJP Tech, auteur du motif
  -- d'un refus).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()),
          coalesce(v_ministere, (select c.ministere_id from public.compte c where c.user_id = v_auteur)),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- File de relecture d'EJP Tech : version de 20261026235900_evenements_corrections.sql ; une
-- ligne par série (la date au plus petit identifiant), pour le nom de création comme pour une
-- correction faite en une fois sur la série. Même signature et mêmes colonnes.
create or replace function private.textes_a_relire()
returns table (
  cible text, cible_id uuid, ministere_id uuid, auteur_libelle text, ecrit_le timestamptz,
  champs jsonb, etat text, decision_le timestamptz, motif text, indicateur_libelle text, mois date)
language sql stable security definer set search_path = '' as $$
  with ecrits (cible, cible_id, saisi_par, saisi_le, champs, ministere_id, indicateur_libelle, mois) as (
    select 'point_attention', p.id, p.saisi_par, p.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'titre', p.titre,
             'description', nullif(btrim(p.description), ''),
             'action_attendue', nullif(btrim(p.action_attendue), ''))),
           null::uuid, null::text, null::date
      from public.point_attention p
    union all
    select 'point_suivi', s.id, s.saisi_par, s.saisi_le, jsonb_build_object('commentaire', s.commentaire),
           null, null, null
      from public.point_suivi s
     where nullif(btrim(s.commentaire), '') is not null
    union all
    select 'evenement', e.id, e.saisi_par, e.saisi_le, jsonb_build_object('titre', e.titre), null, null, null
      from public.evenement e
     where not exists (select 1 from public.evenement s where s.serie_id = e.serie_id and s.id < e.id)
    union all
    select 'evenement_titre', t.id, t.saisi_par, t.saisi_le, jsonb_build_object('titre', t.titre), null, null, null
      from public.evenement_titre t
      join public.evenement e on e.id = t.evenement_id
     where not exists (select 1 from public.evenement_titre u
                         join public.evenement f on f.id = u.evenement_id
                        where f.serie_id = e.serie_id
                          and u.saisi_le = t.saisi_le and u.saisi_par = t.saisi_par and u.id < t.id)
    union all
    select 'reunion', r.id, r.saisi_par, r.saisi_le,
           jsonb_strip_nulls(jsonb_build_object(
             'objet', nullif(btrim(r.objet), ''),
             'decision_attendue', nullif(btrim(r.decision_attendue), ''))),
           null, null, null
      from public.reunion r
     where nullif(btrim(r.objet), '') is not null or nullif(btrim(r.decision_attendue), '') is not null
    union all
    select 'precision_sensible', p.id, p.saisi_par, p.saisi_le, jsonb_build_object('texte', p.texte),
           p.ministere_id, i.libelle, p.mois
      from public.precision_sensible p
      join public.indicateur i on i.id = p.indicateur_id
     where i.retrait_motif is distinct from 'confidentialite'
  )
  select x.cible, x.cible_id, coalesce(x.ministere_id, c.ministere_id), c.libelle, x.saisi_le, x.champs,
         case d.decision when 'masque' then 'masque' when 'rien_a_signaler' then 'relu' else 'a_relire' end,
         d.le, d.motif, x.indicateur_libelle, x.mois
  from ecrits x
  join public.compte c on c.user_id = x.saisi_par
  left join lateral (
    select m.decision, m.le, m.motif from public.moderation m
     where m.cible = x.cible and m.cible_id = x.cible_id
     order by m.le desc, m.id desc
     limit 1
  ) as d on true
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (select private.mon_type()) = 'admin_plateforme'
    and (d.decision is null or (x.saisi_le at time zone 'Europe/Paris')::date >= private.aujourdhui() - 30)
$$;

-- 12. Écritures gardées par les incidents d'envoi : version de
-- 20261027091106_retrait_apres_etat_final.sql, plus les quatre fonctions de ce lot.
create or replace function private.operations_incident() returns text[]
language sql immutable set search_path = '' as $$
  select array['accepter_conditions', 'ajouter_evenement', 'ajouter_suggestion', 'changer_statut_point',
               'choisir_modele_prevus', 'clore_signalement', 'corriger_indicateur', 'creer_calcul',
               'creer_indicateur', 'creer_indicateurs_prevus', 'creer_point', 'declarer_intervenant',
               'declarer_session', 'effacer_prenom', 'effacer_prenoms_anciens', 'marquer_relu',
               'marquer_traite', 'masquer_texte', 'modifier_mentions_point', 'modifier_session',
               'retirer_indicateur', 'retirer_mon_indicateur', 'saisir_chiffres_mois',
               'saisir_fij_statistiques', 'signaler_difficulte', 'supprimer_session', 'valider_indicateur',
               'prendre_en_charge_signalement', 'repondre_au_ministere', 'confirmer_signalement',
               'repondre_a_ejp_tech',
               'corriger_titre_evenement', 'modifier_mentions_evenement', 'retirer_evenement',
               'ajouter_evenements_serie', 'corriger_titre_serie', 'modifier_mentions_serie', 'retirer_serie',
               'evenement_etat', 'fij_departement', 'mesure', 'participation', 'passage', 'reunion',
               'creer-compte', 'relancer-invitation', 'desactiver-compte', 'reactiver-compte',
               'reinitialiser-2fa', 'corriger-adresse', 'supprimer-ministere',
               'autre']
$$;
