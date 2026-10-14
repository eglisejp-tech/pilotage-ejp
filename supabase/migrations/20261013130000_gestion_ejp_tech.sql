-- EJP Tech reprend la gestion de l'outil (décision T60 de docs/decisions.md, réponses écrites de
-- la personne responsable du 13 octobre 2026). Remplace en partie T29, T35 et P07.
--
-- 1. Ministères et comptes : EJP Tech (admin_plateforme) seul appelle les cinq Edge Functions de
--    comptes (creer-compte, relancer-invitation, desactiver-compte, reactiver-compte,
--    reinitialiser-2fa). La base le vérifie encore dans private.controler_appelant, que toutes
--    les fonctions serveur appellent (par private.controler_appel). creer-compte refuse toujours
--    le type admin_eglise. L'état des comptes (v_etat_comptes) se lit par l'administration de
--    l'église, qui garde la lecture, et par EJP Tech, qui gère.
-- 2. Indicateurs : private.peut_configurer() ne rend vrai qu'à EJP Tech. Toutes les fonctions de
--    configuration la lisent (creer_indicateurs_prevus, creer_indicateur, creer_calcul,
--    corriger_indicateur, retirer_indicateur, ajouter_suggestion hors ministère, verifier_libelle
--    et limites_indicateurs hors ministère) : l'administration y est refusée (42501). Elle garde
--    la lecture : définitions et usage (politiques et vues inchangées), catalogue (v_catalogue)
--    et suggestions (v_suggestions), dont les fonctions ne lisent plus peut_configurer().
--    La validation des ajouts reste à EJP Tech seul (valider_indicateur, inchangée).
-- 3. Sessions : l'administration de l'église et EJP Tech déclarent une session, corrigent ses
--    ministères attendus et suppriment une session sans saisie.
-- 4. Contact : les messages de la base qui renvoyaient vers l'administration pour un indicateur
--    renvoient vers EJP Tech (décision du 12 octobre 2026).
--
-- Chaque fonction garde sa signature : create or replace garde son propriétaire et ses droits
-- d'exécution. Les corps sont ceux des migrations d'origine (citées) : seuls changent les
-- contrôles de profil et trois messages (refus de déclarer une session, 31e ligne d'une fiche,
-- domaine sensible demandé par un ministère). Aucune fonction nouvelle, aucune table, aucun
-- droit nouveau.

-- 1. Comptes

-- Appelant des fonctions serveur de comptes (20260930220244_comptes_fonctions_serveur.sql) : un
-- compte actif d'EJP Tech. Code court inchangé (l'Edge Function répond 403 avant d'arriver ici).
create or replace function private.controler_appelant(p_appelant uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_appelant is null or not exists (
    select 1 from public.compte c
     where c.user_id = p_appelant and c.type = 'admin_plateforme' and c.desactive_le is null
  ) then
    raise exception 'appelant_non_autorise' using errcode = '42501';
  end if;
end $$;

-- État des comptes pour l'écran 13 (20260930163200_vues_et_lectures.sql) : l'administration de
-- l'église (lecture) et EJP Tech (gestion). L'email reste dans auth.users : il n'est lu qu'ici,
-- jamais copié. La colonne secret des facteurs n'est jamais lue.
create or replace function private.etat_comptes()
returns table (
  user_id uuid, type public.type_compte, libelle text, ministere_id uuid, email text,
  desactive_le timestamptz, etat text)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.type, c.libelle, c.ministere_id, u.email::text, c.desactive_le,
         case
           when c.desactive_le is not null then 'desactive'
           when u.email_confirmed_at is null then 'invitation_envoyee'
           when exists (select 1 from auth.mfa_factors f
                         where f.user_id = c.user_id and f.factor_type = 'totp' and f.status = 'verified')
             then 'activee'
           else 'a_activer'
         end
  from public.compte c
  join auth.users u on u.id = c.user_id
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and coalesce((select private.mon_type()) in ('admin_eglise', 'admin_plateforme'), false)
$$;

-- 2. Indicateurs

-- Qui configure (Q13, revu par T60) : EJP Tech seul. Jamais null.
create or replace function private.peut_configurer() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.mon_type() = 'admin_plateforme', false)
$$;

-- Catalogue entier (20261008110000_validation_indicateurs.sql) : l'administration le lit encore,
-- EJP Tech aussi, en aal2.
create or replace function private.catalogue()
returns table (code text, modele text, libelle text, definition text, nature text, unite text,
               sensible boolean, calcul text, ordre smallint)
language sql stable security definer set search_path = '' as $$
  select p.code, p.modele, p.libelle, p.definition, p.nature, p.unite, p.sensible, p.calcul, p.ordre
  from private.indicateur_prevu p
  where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false)
$$;

-- Suggestions qu'une fiche peut encore ajouter (même migration) : sa fiche pour un ministère,
-- toutes pour l'administration (lecture) et EJP Tech, rien pour les autres, rien hors aal2.
create or replace function private.suggestions()
returns table (ministere_id uuid, code text, libelle text, definition text, nature text, unite text)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false) as configure,
           private.mon_ministere() as ministere
    where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  select m.id, p.code, p.libelle, p.definition, p.nature, p.unite
  from moi
  cross join public.ministere m
  cross join private.indicateur_prevu p
  where p.modele = 'suggestion'
    and m.desactive_le is null
    and (moi.configure or m.id = moi.ministere)
    and not exists (select 1 from public.indicateur i
                     where (i.ministere_id = m.id or i.ministere_id is null)
                       and i.etat <> 'retire'
                       and private.normaliser(i.libelle) = private.normaliser(p.libelle))
$$;

-- Ajout d'une suggestion (20261008110500_indicateurs_fonctions.sql). Seul changement : le
-- message de la 31e ligne d'un ministère renvoie vers EJP Tech. EJP Tech (peut_configurer) :
-- actif tout de suite, sans demande ; l'administration est refusée.
create or replace function private.ajouter_suggestion(p_ministere_id uuid, p_code text, p_pourquoi text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere boolean;
  v_prevu private.indicateur_prevu%rowtype;
  v_pourquoi text;
  v_message text;
  v_pris text;
  v_id uuid;
  v_demande uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_type() = 'ministere';
  if v_ministere then
    if p_ministere_id is null or p_ministere_id is distinct from private.mon_ministere() then
      raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
    end if;
  elsif not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(p_ministere_id);
  select p.* into v_prevu from private.indicateur_prevu p where p.code = p_code and p.modele = 'suggestion';
  if not found then
    raise exception 'Cette suggestion n''existe pas.';
  end if;

  if v_ministere then
    v_pourquoi := btrim(coalesce(p_pourquoi, ''));
    if char_length(v_pourquoi) < 10 then
      raise exception 'Expliquez pourquoi en 10 caractères au moins.';
    end if;
    if char_length(v_pourquoi) > 280 then
      raise exception '280 caractères au plus.';
    end if;
    v_message := private.texte_libre_refuse(v_pourquoi);
    if v_message is not null then
      raise exception '%', v_message;
    end if;
    if private.ajouts_fiche(p_ministere_id) >= 3 then
      raise exception 'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.';
    end if;
    if private.lignes_fiche(p_ministere_id, null) >= 30 then
      raise exception 'Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d''en retirer un.';
    end if;
  elsif private.lignes_fiche(p_ministere_id, null) >= 30 then
    raise exception 'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.';
  end if;
  v_pris := private.libelle_pris(p_ministere_id, v_prevu.libelle, null);
  if v_pris is not null then
    raise exception '% a déjà « % ».', case when v_ministere then 'Votre fiche' else 'Cette fiche' end, v_pris;
  end if;

  insert into public.indicateur (libelle, definition, nature, unite, ministere_id, etat, origine, modele_code,
                                 sans_somme, saisi_dimanche_matin, libelle_sessions)
  values (v_prevu.libelle, v_prevu.definition, v_prevu.nature, v_prevu.unite, p_ministere_id,
          case when v_ministere then 'en_attente' else 'actif' end,
          case when v_ministere then 'ministere' else 'eglise' end,
          v_prevu.code, v_prevu.sans_somme, v_prevu.saisi_dimanche_matin, v_prevu.libelle_sessions)
  returning id into v_id;
  if v_ministere then
    insert into public.demande_indicateur (indicateur_id, ministere_id, objet, libelle, pourquoi)
    values (v_id, p_ministere_id, 'ajout', v_prevu.libelle, v_pourquoi)
    returning id into v_demande;
  end if;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'indicateur_cree', 'indicateur', v_id,
          jsonb_build_object('nature', v_prevu.nature, 'unite', v_prevu.unite,
                             'origine', case when v_ministere then 'ministere' else 'eglise' end,
                             'remplace', null)
          || case when v_ministere then jsonb_build_object('attente', true, 'demande', v_demande)
                  else '{}'::jsonb end);
  return v_id;
end $$;

-- Contrôles d'un texte d'indicateur (20261007100500_indicateurs_lexique.sql). Seul changement :
-- pour un ministère, un domaine sensible se demande à EJP Tech.
create or replace function private.verifier_texte(p_texte text, p_pour_ministere boolean)
returns table (famille text, message text, bloquant boolean)
language plpgsql stable set search_path = '' as $$
declare
  v_brut text := coalesce(p_texte, '');
  v_normal text;
  v_nom text;
  v_familles text[] := array[]::text[];
begin
  -- Dans le texte brut, avant toute normalisation.
  if v_brut ~* '(@|http|www)'
     or regexp_replace(v_brut, '[[:space:].' || chr(160) || chr(8239) || '-]', '', 'g') ~ '[0-9]{5}'
     or v_brut ~ ('(^|[^A-Za-zÀ-ÖØ-öø-ÿ])'
                  || '(M\.|[Mm]me|[Mm]mes|[Mm]lle|Mr|[Mm]onsieur|[Mm]adame|[Mm]ademoiselle|[Ff]r[eè]re|'
                  || '[Ss]oeur|[Ss]œur|[Pp]asteur|[Pp]asteure|[Dd]octeur|Dr\.?|[Pp]ère|[Mm]aître|[Dd]iacre|'
                  || '[Aa]pôtre|[Pp]rophète)'
                  || '[[:space:]' || chr(160) || ']+[A-ZÀ-ÖØ-ÞŒ]') then
    v_familles := v_familles || 'donnees_personnelles'::text;
  end if;
  if position('[' in v_brut) > 0 or v_brut ~* 'texte masqu' then
    v_familles := v_familles || 'crochets'::text;
  end if;
  if position('%' in v_brut) > 0 then
    v_familles := v_familles || 'calcul'::text;
  end if;

  -- Sur le texte normalisé, noms connus des dispositifs retirés.
  v_normal := ' ' || private.normaliser(v_brut) || ' ';
  foreach v_nom in array array['priere des stars', 'welcome prodiges', 'pages roses', 'call your sister'] loop
    v_normal := replace(v_normal, ' ' || v_nom || ' ', ' ');
  end loop;
  v_familles := v_familles || array(
    select distinct t.famille from private.terme t
     where (t.pour = 'tous' or coalesce(p_pour_ministere, false))
       and v_normal ~ (' ' || regexp_replace(t.terme, '([a-z0-9]+)', '\1(e|s|es|x)?', 'g') || ' '));

  return query
  select f.code,
         case f.code
           when 'donnees_personnelles' then 'N''écrivez aucun nom ni information personnelle.'
           when 'crochets' then 'Les crochets et « texte masqué » sont réservés à la modération.'
           when 'calcul' then 'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.'
           when 'cumul' then 'La somme de l''année s''affiche toute seule : saisissez le chiffre de la période.'
           when 'periode' then 'Inutile d''écrire la période : choisissez le rythme plus bas.'
           when 'sensible' then
             case when coalesce(p_pour_ministere, false)
                  then 'Ce chiffre semble toucher la santé, l''accompagnement ou les enfants. Un domaine sensible se demande à EJP Tech, qui vérifiera votre ajout.'
                  else 'Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n''est pas le cas.'
             end
         end,
         case when f.code = 'sensible' then not coalesce(p_pour_ministere, false) else true end
    from unnest(array['donnees_personnelles', 'crochets', 'calcul', 'cumul', 'periode', 'sensible'])
         with ordinality as f(code, rang)
   where f.code = any (v_familles)
   order by f.rang;
end $$;

-- 3. Sessions (20260930163204_fonctions_api.sql) : l'administration de l'église et EJP Tech.
-- Seuls les contrôles de profil changent (et le message du refus de déclarer).

create or replace function private.declarer_session(p_type public.type_session, p_date date, p_intitule text,
  p_ministeres uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_intitule text;
  v_ministeres uuid[];
  v_session uuid;
begin
  perform private.exige_aal2();
  if not coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false) then
    raise exception 'Seules l''administration de l''église et EJP Tech déclarent une session.' using errcode = '42501';
  end if;
  if p_type is null or p_date is null then
    raise exception 'Choisissez le type et la date de la session.';
  end if;
  v_intitule := nullif(btrim(p_intitule), '');
  if p_type = 'autre' and (v_intitule is null or char_length(v_intitule) > 80) then
    raise exception 'Donnez un nom au rassemblement (80 caractères au plus).';
  end if;
  if p_type <> 'autre' and v_intitule is not null then
    raise exception 'Seul un autre rassemblement porte un nom.';
  end if;
  v_ministeres := private.ministeres_actifs(p_ministeres);
  if exists (select 1 from public.session s
              where s.type = p_type and s.date = p_date
                and (p_type <> 'autre' or s.intitule = v_intitule)) then
    raise exception 'Une session % est déjà déclarée le %.',
      private.libelle_session(p_type, v_intitule), private.date_en_lettres(p_date);
  end if;
  insert into public.session (type, date, intitule) values (p_type, p_date, v_intitule)
  returning id into v_session;
  insert into public.session_attendu (session_id, ministere_id)
  select v_session, x.id from unnest(v_ministeres) as x(id);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), null, 'session_declaree', 'session', v_session,
          jsonb_build_object('type', p_type, 'date', p_date, 'attendus', cardinality(v_ministeres)));
  return v_session;
end $$;

-- Remplace les ministères attendus. Un ministère désactivé depuis garde sa ligne : l'écran ne
-- le propose plus, et la complétude passée ne change pas.
create or replace function private.modifier_session(p_session_id uuid, p_ministeres uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_session public.session%rowtype;
  v_ministeres uuid[];
  v_avant integer;
  v_apres integer;
  v_retires integer;
  v_ajoutes integer;
begin
  perform private.exige_aal2();
  if not coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false) then
    raise exception 'Cette session n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select * into v_session from public.session where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'Cette session n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  v_ministeres := private.ministeres_actifs(p_ministeres);
  select count(*) into v_avant from public.session_attendu a where a.session_id = p_session_id;
  delete from public.session_attendu a
   where a.session_id = p_session_id
     and a.ministere_id <> all (v_ministeres)
     and exists (select 1 from public.ministere m where m.id = a.ministere_id and m.desactive_le is null);
  get diagnostics v_retires = row_count;
  insert into public.session_attendu (session_id, ministere_id)
  select p_session_id, x.id from unnest(v_ministeres) as x(id)
  on conflict do nothing;
  get diagnostics v_ajoutes = row_count;
  if v_retires = 0 and v_ajoutes = 0 then
    return;                               -- aucun changement : rien n'est écrit
  end if;
  select count(*) into v_apres from public.session_attendu a where a.session_id = p_session_id;
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), null, 'session_modifiee', 'session', p_session_id,
          jsonb_build_object('attendus', jsonb_build_array(v_avant, v_apres)));
end $$;

create or replace function private.supprimer_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_session public.session%rowtype;
begin
  perform private.exige_aal2();
  if not coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false) then
    raise exception 'Cette session n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select * into v_session from public.session where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'Cette session n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.participation p where p.session_id = p_session_id) then
    raise exception 'Des ministères ont déjà saisi : la session ne peut plus être supprimée.';
  end if;
  delete from public.session where id = p_session_id;       -- les attendus partent avec (cascade)
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), null, 'session_supprimee', 'session', p_session_id,
          jsonb_build_object('type', v_session.type, 'date', v_session.date));
end $$;
