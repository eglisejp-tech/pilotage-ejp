-- Incidents d'envoi (T76, lot C ; conception validée le 26 octobre 2026,
-- docs/conception/erreurs-envoi.md, sections 6 et 7, avec les réponses « Proposé » Q4, Q5, Q6,
-- Q10 et Q11).
--
-- Quand un enregistrement échoue sur un appareil, EJP Tech doit pouvoir l'expliquer sans lire la
-- production à l'aveugle : quoi, quand, quel écran, quelle version du site, quel navigateur,
-- quelle issue. Le téléphone garde l'incident dans une file locale, puis l'envoie ici dès que la
-- session de son espace est en aal2.
--
-- 1. private.incident : un journal technique, jamais une saisie. Ni texte saisi, ni message
--    d'erreur, ni compte, ni prénom, ni adresse, ni IP, ni user agent complet : la référence de
--    l'envoi (unique), l'heure du téléphone (bornée) et celle de la base, le profil et le
--    ministère imposés par la base (Q4 : pas le compte), l'écran (modèle d'adresse) et
--    l'opération (listes fermées, sinon « autre »), le genre et l'issue du classement unique, le
--    statut HTTP, le code (SQLSTATE, code PostgREST ou code d'Edge Function, jamais le message),
--    le nom de l'erreur, la durée, en ligne et visible, la version du site, la famille et la
--    version majeure du navigateur et le système (Q10). RLS activée, politique restrictive aal2,
--    aucun droit pour aucun rôle de l'API. Inaltérable (update et truncate refusés, même au
--    propriétaire) ; seule la purge des incidents reçus il y a plus de 90 jours (Q5) supprime,
--    sous le réglage local pilotage.purge_incidents, à chaque écriture et à chaque lecture (Q11 :
--    aucune tâche planifiée). La table n'est pas dans la liste « ajout seulement » de CLAUDE.md :
--    c'est un journal technique, comme ceux de Supabase.
-- 2. noter_incidents(p_incidents jsonb) : tout compte actif en aal2 (exige_aal2 d'abord ; rien
--    avant aal2, un incident attend dans la file du téléphone). 20 incidents par appel au plus,
--    100 par 24 h par ministère (comptes de ministère) ou par profil (autres comptes), au-delà
--    ignorés sans erreur ; une ligne sans genre, sans issue, sans référence ou sans version
--    valable est ignorée ; toute clé inconnue est ignorée ; une référence déjà reçue n'est pas
--    recopiée (on conflict do nothing) ; une heure du téléphone illisible, de plus de 7 jours ou
--    de plus d'un jour dans le futur devient l'heure de la base. Rend le nombre d'incidents
--    gardés. Aucun journal.
-- 3. incidents_recents(p_avant timestamptz default null) : EJP Tech seul, en aal2 (tout autre
--    profil : 42501 « introuvable »). 50 lignes à la fois, du plus récent au plus ancien, avant
--    p_avant pour la suite ; le nom du ministère (null s'il n'existe plus) et le nombre total
--    d'incidents gardés. Une seule surcharge : aucun risque PGRST203.
-- 4. recu_le prend clock_timestamp() : deux incidents d'un même lot ont deux heures distinctes,
--    la suite de la liste (avant p_avant) n'en perd aucun.
-- Aucune clé étrangère vers ministere (comme le journal depuis T74) : la suppression d'un
-- ministère (T75) ne dépend pas des incidents. Aucun SQL dynamique.

-- 1. Listes fermées, immutable (modèle de private.ecrans_signalement()) : une adresse ou une
-- opération nouvelle s'y ajoute par migration ; d'ici là, elle arrive en « autre ». Elles servent
-- aux contrôles (check) de la table : on y ajoute, on n'en retire jamais une valeur encore présente
-- dans des incidents (une sauvegarde ne se restaurerait plus).

-- Les codes des Edge Functions des comptes (supabase/functions/_shared/http.ts, CodeErreur) :
-- un code d'incident est un SQLSTATE, un code PostgREST ou l'un d'eux, jamais un mot libre.
create function private.codes_incident() returns text[]
language sql immutable set search_path = '' as $$
  select array['requete_invalide', 'methode_non_autorisee', 'non_authentifie', 'session_revoquee',
               'double_authentification_requise', 'acces_refuse', 'type_interdit', 'ministere_inconnu',
               'compte_inconnu', 'propre_compte', 'adresse_deja_utilisee', 'ministere_a_deja_un_compte',
               'nom_ministere_deja_pris', 'berger_deja_actif', 'compte_desactive', 'compte_actif',
               'invitation_deja_acceptee', 'invitation_trop_recente', 'conflit', 'invitation_non_envoyee',
               'activation_incomplete', 'compte_deja_active', 'ministere_non_vide', 'ministere_de_reference',
               'suppression_incomplete', 'erreur_interne']
$$;

-- Les modèles d'adresse de l'application (src/features/navigation/profils.ts), plus les pages
-- de connexion qui écrivent (conditions, personne qui utilise le compte) et « Mes signalements »
-- (T77, mis en ligne avant ce lot). Jamais un identifiant.
create function private.ecrans_incident() returns text[]
language sql immutable set search_path = '' as $$
  select array['/', '/ma-fiche', '/ma-fiche/indicateurs', '/ministeres', '/ministeres/:id',
               '/saisir/dimanche', '/saisir/mois', '/saisir/session/:id', '/saisir/fij',
               '/saisir/fij-statistiques', '/saisir/evenement', '/saisir/evenement/:id',
               '/saisir/reunion', '/saisir/point', '/signaler', '/signalements', '/points', '/journal',
               '/journal-technique', '/comptes', '/sessions', '/indicateurs', '/indicateurs/:id',
               '/moderation', '/personnes', '/conditions-a-accepter', '/qui-utilise', 'autre']
$$;

-- Les écritures de l'outil (catalogue de la conception, section 4.5) : fonctions de la base,
-- tables remplies directement, Edge Functions des comptes, et les gestes du suivi des
-- signalements (T77, mis en ligne avant ce lot).
create function private.operations_incident() returns text[]
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
               'evenement_etat', 'fij_departement', 'mesure', 'participation', 'passage', 'reunion',
               'creer-compte', 'relancer-invitation', 'desactiver-compte', 'reactiver-compte',
               'reinitialiser-2fa', 'corriger-adresse', 'supprimer-ministere',
               'autre']
$$;

-- 2. Table

create table private.incident (
  id bigint generated always as identity primary key,
  reference text not null unique check (reference ~ '^[2-9A-HJKMNP-Z]{6}$'),
  survenu_le timestamptz not null,
  recu_le timestamptz not null default clock_timestamp(),
  profil public.type_compte not null,
  ministere_id uuid,                                   -- sans clé étrangère (comme le journal, T74)
  ecran text not null check (ecran = any (private.ecrans_incident())),
  operation text not null check (operation = any (private.operations_incident())),
  genre text not null check (genre in ('session', 'sans_reponse', 'reponse_perdue', 'reponse_illisible',
                                       'delai', 'refus_inconnu', 'bogue')),
  issue text not null check (issue in ('enregistre', 'inconnue', 'rien_enregistre')),
  rattrape boolean not null default false,
  statut_http smallint check (statut_http between 100 and 599),
  code text check (code ~ '^([0-9A-Z]{5}|PGRST[0-9]{3})$' or code = any (private.codes_incident())),
  nom_erreur text check (nom_erreur in ('TypeError', 'AbortError', 'TimeoutError', 'SyntaxError', 'ZodError',
                                        'ReponsePerdue', 'FunctionsFetchError', 'FunctionsRelayError',
                                        'FunctionsHttpError', 'Error', 'autre')),
  duree_ms integer check (duree_ms between 0 and 120000),
  en_ligne boolean,
  visible boolean,
  version text not null check (version ~ '^([0-9a-f]{7}|local)$'),
  navigateur text check (navigateur in ('safari', 'chrome', 'firefox', 'edge', 'samsung', 'autre')),
  version_navigateur smallint check (version_navigateur between 1 and 999),
  systeme text check (systeme in ('ios', 'android', 'macos', 'windows', 'linux', 'autre'))
);

create index incident_recu_idx on private.incident (recu_le desc);
create index incident_debit_idx on private.incident (profil, ministere_id, recu_le);

alter table private.incident enable row level security;
create policy double_authentification on private.incident as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
revoke all on private.incident from public, anon, authenticated, service_role;
revoke all on sequence private.incident_id_seq from public, anon, authenticated, service_role;

-- Inaltérable, sauf la purge à 90 jours (trigger du lot B, 20261026151133_envoi_idempotent.sql).
create trigger ajout_seulement before update or delete on private.incident
  for each row execute function private.refuser_modification_sauf_purge('pilotage.purge_incidents', 'recu_le', '90 days');
create trigger ajout_seulement_vider before truncate on private.incident
  for each statement execute function private.refuser_modification();

-- 3. Aides internes (au nom du propriétaire)

-- Efface les incidents reçus il y a plus de 90 jours (Proposé, Q5 et Q11).
create function private.purger_incidents() returns void
language plpgsql set search_path = '' as $$
begin
  perform set_config('pilotage.purge_incidents', 'oui', true);
  delete from private.incident i where i.recu_le < statement_timestamp() - interval '90 days';
  perform set_config('pilotage.purge_incidents', '', true);
end $$;

-- Heure envoyée par le téléphone (ISO 8601), ou null si elle est illisible.
create function private.lire_horodatage(p_texte text) returns timestamptz
language plpgsql stable set search_path = '' as $$
begin
  if p_texte is null
     or p_texte !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' then
    return null;
  end if;
  return p_texte::timestamptz;
exception
  when others then
    return null;
end $$;

-- Un incident du lot, lu champ par champ : chaque champ fermé ou borné, une valeur hors liste en
-- « autre » ou vide. Aucune ligne si l'incident n'est pas un objet ou n'a pas de référence, de
-- genre, d'issue ou de version valable. Les clés inconnues ne sont jamais lues. Le profil et le
-- ministère ne sont pas lus : la base les impose.
create function private.lire_incident(p_incident jsonb)
returns table (reference text, survenu_le timestamptz, ecran text, operation text, genre text, issue text,
               rattrape boolean, statut_http smallint, code text, nom_erreur text, duree_ms integer,
               en_ligne boolean, visible boolean, version text, navigateur text, version_navigateur smallint,
               systeme text)
language sql stable set search_path = '' as $$
  select i ->> 'reference',
         private.lire_horodatage(i ->> 'survenu_le'),
         case when (i ->> 'ecran') = any (private.ecrans_incident()) then i ->> 'ecran' else 'autre' end,
         case when (i ->> 'operation') = any (private.operations_incident()) then i ->> 'operation' else 'autre' end,
         i ->> 'genre',
         i ->> 'issue',
         coalesce(i -> 'rattrape' = 'true'::jsonb, false),
         case when (i ->> 'statut_http') ~ '^[1-5][0-9]{2}$' then (i ->> 'statut_http')::smallint end,
         case when (i ->> 'code') ~ '^([0-9A-Z]{5}|PGRST[0-9]{3})$'
                   or (i ->> 'code') = any (private.codes_incident()) then i ->> 'code' end,
         case when (i ->> 'nom_erreur') is null then null
              when (i ->> 'nom_erreur') in ('TypeError', 'AbortError', 'TimeoutError', 'SyntaxError', 'ZodError',
                                            'ReponsePerdue', 'FunctionsFetchError', 'FunctionsRelayError',
                                            'FunctionsHttpError', 'Error') then i ->> 'nom_erreur'
              else 'autre' end,
         case when (i ->> 'duree_ms') ~ '^[0-9]{1,6}$'
              then case when (i ->> 'duree_ms')::integer <= 120000 then (i ->> 'duree_ms')::integer end end,
         case i -> 'en_ligne' when 'true'::jsonb then true when 'false'::jsonb then false end,
         case i -> 'visible' when 'true'::jsonb then true when 'false'::jsonb then false end,
         i ->> 'version',
         case when (i ->> 'navigateur') is null then null
              when (i ->> 'navigateur') in ('safari', 'chrome', 'firefox', 'edge', 'samsung') then i ->> 'navigateur'
              else 'autre' end,
         case when (i ->> 'version_navigateur') ~ '^[0-9]{1,3}$'
              then case when (i ->> 'version_navigateur')::integer >= 1 then (i ->> 'version_navigateur')::smallint end end,
         case when (i ->> 'systeme') is null then null
              when (i ->> 'systeme') in ('ios', 'android', 'macos', 'windows', 'linux') then i ->> 'systeme'
              else 'autre' end
    from (select p_incident as i) as x
   where jsonb_typeof(x.i) = 'object'
     and coalesce(x.i ->> 'reference', '') ~ '^[2-9A-HJKMNP-Z]{6}$'
     and coalesce(x.i ->> 'genre', '') in ('session', 'sans_reponse', 'reponse_perdue', 'reponse_illisible',
                                           'delai', 'refus_inconnu', 'bogue')
     and coalesce(x.i ->> 'issue', '') in ('enregistre', 'inconnue', 'rien_enregistre')
     and coalesce(x.i ->> 'version', '') ~ '^([0-9a-f]{7}|local)$'
$$;

revoke all on function
  private.codes_incident(),
  private.ecrans_incident(),
  private.operations_incident(),
  private.purger_incidents(),
  private.lire_horodatage(text),
  private.lire_incident(jsonb)
  from public, anon, authenticated, service_role;

-- 4. Noter les incidents (tout compte actif en aal2)

create function private.noter_incidents(p_incidents jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_profil public.type_compte;
  v_ministere uuid;
  v_place integer;
  v_gardes integer;
begin
  perform private.exige_aal2();
  v_profil := private.mon_type();
  v_ministere := case when v_profil = 'ministere' then private.mon_ministere() end;
  perform private.purger_incidents();
  -- Les numéros anti-doublon (lot B) de plus de 7 jours partent aussi, même sans création.
  perform private.purger_envois();
  -- Un lot qui n'est pas une liste, ou trop gros (20 incidents tiennent en moins de 10 Ko).
  if p_incidents is null or jsonb_typeof(p_incidents) <> 'array' or pg_column_size(p_incidents) > 20000 then
    return 0;
  end if;
  -- Débit : 100 incidents par 24 h par ministère (comptes de ministère) ou par profil. Le verrou
  -- fait passer les envois concurrents d'un même ministère ou profil l'un après l'autre : chacun
  -- compte les incidents déjà gardés par l'autre.
  perform pg_advisory_xact_lock(hashtextextended('incident:' || v_profil::text || ':'
                                                 || coalesce(v_ministere::text, ''), 0));
  select 100 - count(*)::integer into v_place
    from private.incident i
   where i.profil = v_profil and i.ministere_id is not distinct from v_ministere
     and i.recu_le > statement_timestamp() - interval '24 hours';
  if v_place <= 0 then
    return 0;
  end if;
  insert into private.incident (reference, survenu_le, profil, ministere_id, ecran, operation, genre, issue,
                                rattrape, statut_http, code, nom_erreur, duree_ms, en_ligne, visible, version,
                                navigateur, version_navigateur, systeme)
  select l.reference,
         -- L'heure du téléphone, bornée ; sinon celle de la base.
         case when l.survenu_le between statement_timestamp() - interval '7 days'
                                    and statement_timestamp() + interval '1 day'
              then l.survenu_le else clock_timestamp() end,
         v_profil, v_ministere, l.ecran, l.operation, l.genre, l.issue, l.rattrape, l.statut_http, l.code,
         l.nom_erreur, l.duree_ms, l.en_ligne, l.visible, l.version, l.navigateur, l.version_navigateur,
         l.systeme
    from (select e.valeur, e.rang
            from jsonb_array_elements(p_incidents) with ordinality as e(valeur, rang)
           where e.rang <= 20) as lot
   cross join lateral private.lire_incident(lot.valeur) as l
   order by lot.rang
   limit v_place
  on conflict (reference) do nothing;
  get diagnostics v_gardes = row_count;
  return v_gardes;
end $$;

create function public.noter_incidents(p_incidents jsonb) returns integer
language sql security invoker set search_path = '' as $$
  select private.noter_incidents(p_incidents);
$$;

-- 5. Lire les incidents (EJP Tech seul). La lecture purge, donc écrit : elle s'appelle en POST
-- (supabase-js .rpc), jamais en GET (transaction en lecture seule), et reste volatile.

create function private.incidents_recents(p_avant timestamptz)
returns table (reference text, survenu_le timestamptz, recu_le timestamptz, profil public.type_compte,
               ministere_id uuid, ministere_nom text, ecran text, operation text, genre text, issue text,
               rattrape boolean, statut_http smallint, code text, nom_erreur text, duree_ms integer,
               en_ligne boolean, visible boolean, version text, navigateur text, version_navigateur smallint,
               systeme text, total bigint)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.purger_incidents();
  return query
  select i.reference, i.survenu_le, i.recu_le, i.profil, i.ministere_id, m.nom, i.ecran, i.operation, i.genre,
         i.issue, i.rattrape, i.statut_http, i.code, i.nom_erreur, i.duree_ms, i.en_ligne, i.visible, i.version,
         i.navigateur, i.version_navigateur, i.systeme,
         (select count(*) from private.incident t)
    from private.incident i
    left join public.ministere m on m.id = i.ministere_id
   where p_avant is null or i.recu_le < p_avant
   order by i.recu_le desc, i.id desc
   limit 50;
end $$;

create function public.incidents_recents(p_avant timestamptz default null)
returns table (reference text, survenu_le timestamptz, recu_le timestamptz, profil public.type_compte,
               ministere_id uuid, ministere_nom text, ecran text, operation text, genre text, issue text,
               rattrape boolean, statut_http smallint, code text, nom_erreur text, duree_ms integer,
               en_ligne boolean, visible boolean, version text, navigateur text, version_navigateur smallint,
               systeme text, total bigint)
language sql security invoker set search_path = '' as $$
  select * from private.incidents_recents(p_avant);
$$;

-- 6. Droits : authenticated seulement, rien pour anon ni service_role.

revoke all on function
  private.noter_incidents(jsonb),
  public.noter_incidents(jsonb),
  private.incidents_recents(timestamptz),
  public.incidents_recents(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function
  private.noter_incidents(jsonb),
  public.noter_incidents(jsonb),
  private.incidents_recents(timestamptz),
  public.incidents_recents(timestamptz)
  to authenticated;
