-- Numéro anti-doublon des trois créations (T76, lot B ; conception validée le 26 octobre 2026,
-- docs/conception/erreurs-envoi.md, section 5, avec les réponses « Proposé » Q2, Q3 et Q5).
--
-- Le 26 octobre 2026, Coordination ajoute un événement ; la base enregistre, la réponse se perd.
-- Un nouvel envoi refaisait un événement de plus, ineffaçable (ajout seulement) et compté deux
-- fois dans les comptages de l'église. Désormais, le téléphone tire un numéro au premier envoi
-- et le renvoie à chaque nouvel essai : la base reconnaît l'envoi et rend ce qu'elle a créé.
--
-- 1. private.envoi : une ligne par envoi numéroté (compte, numéro, opération, identifiant créé,
--    empreinte md5 des valeurs normalisées), clé (compte, numéro). Le compte est imposé par
--    auth.uid(), jamais envoyé par le téléphone. RLS activée, politique restrictive aal2, aucun
--    droit pour aucun rôle de l'API (modèle de private.ministere_modele, T72). Inaltérable
--    (update et truncate refusés, même au propriétaire) ; seule la purge des numéros de plus de
--    7 jours supprime, sous le réglage local pilotage.purge_envoi. La table n'est pas dans la
--    liste « ajout seulement » de CLAUDE.md : elle ne garde aucune saisie, l'empreinte dérive
--    d'un texte libre et ne vit que 7 jours.
-- 2. Aides internes, sans droit d'exécution pour aucun rôle de l'API : envoi_existant (rend
--    l'identifiant d'un envoi déjà reçu, ou refuse « Cet envoi est déjà enregistré avec d'autres
--    valeurs. » si l'opération ou l'empreinte diffèrent), retenir_envoi (pose le numéro, on
--    conflict do nothing), purger_envois, et le trigger refuser_modification_sauf_purge.
-- 3. Nouvelles signatures, le numéro en dernier argument, **obligatoire** (sans valeur par
--    défaut : un appel de l'ancien site, sans p_cle, ne correspond qu'à sa fonction, jamais aux
--    deux, PGRST203) : ajouter_evenement à 6 arguments, creer_point à 7, signaler_difficulte à 3.
--    Le numéro est lu juste après le contrôle du compte, avant les contrôles métier : un nouvel
--    essai après minuit, ou après la désactivation d'un ministère mentionné, rend ce qui a été
--    créé au lieu d'un refus faux. Même numéro, même contenu : le même identifiant, rien
--    d'écrit, aucune ligne de journal. Même numéro, autre contenu ou autre création : refus,
--    rien d'écrit. Deux requêtes concurrentes du même numéro : la seconde attend la première sur
--    la clé primaire, puis relit son numéro. Sans numéro (p_cle null) : comportement d'avant.
-- 4. Anciennes signatures (ajouter_evenement à 5 arguments, creer_point à 6, signaler_difficulte
--    à 2) : create or replace, même signature (propriétaire et droits gardés), qui délèguent
--    sans numéro. Les versions à 3 et 4 arguments d'ajouter_evenement délèguent déjà à celle
--    à 5. L'ancien site (Netlify, bundle figé) garde exactement son comportement. Un lot D, plus
--    tard, les retirera.
-- Journal : inchangé, une ligne par création réelle, aucune pour un envoi reconnu ni pour la
-- purge. Tables en ajout seulement (evenement, point_attention, signalement et leurs lignes)
-- inchangées. Aucune donnée personnelle, aucun SQL dynamique.

-- 1. Table

create table private.envoi (
  compte uuid not null references public.compte (user_id),
  cle uuid not null,
  operation text not null check (operation in ('ajouter_evenement', 'creer_point', 'signaler_difficulte')),
  cible_id uuid not null,                         -- l'événement, le point ou le signalement créé
  empreinte text not null check (empreinte ~ '^[0-9a-f]{32}$'),
  le timestamptz not null default statement_timestamp(),
  primary key (compte, cle)
);

create index envoi_le_idx on private.envoi (le);

alter table private.envoi enable row level security;
create policy double_authentification on private.envoi as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
revoke all on private.envoi from public, anon, authenticated, service_role;

-- Inaltérable, sauf la purge : un trigger avant update et delete qui refuse, sauf la suppression
-- d'une ligne plus ancienne que la durée de conservation, sous le réglage local de la purge.
-- Arguments : nom du réglage, colonne de l'heure, durée de conservation. Servira aussi aux
-- incidents d'envoi (lot C).
create function private.refuser_modification_sauf_purge() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting(tg_argv[0], true), '') = 'oui'
     and (to_jsonb(old) ->> tg_argv[1])::timestamptz < statement_timestamp() - tg_argv[2]::interval then
    return old;
  end if;
  raise exception 'La table % est en ajout seul : elle ne se modifie pas et ne s''efface pas.', tg_table_name
    using errcode = '42501';
end $$;

create trigger ajout_seulement before update or delete on private.envoi
  for each row execute function private.refuser_modification_sauf_purge('pilotage.purge_envoi', 'le', '7 days');
create trigger ajout_seulement_vider before truncate on private.envoi
  for each statement execute function private.refuser_modification();

-- 2. Aides internes (au nom du propriétaire, appelées par les fonctions privées de l'API)

-- Un envoi déjà reçu de ce compte sous ce numéro : son identifiant si l'opération et l'empreinte
-- sont les mêmes ; un refus sinon (on ne rend jamais l'existant en silence : la personne croirait
-- sa correction enregistrée) ; null si le numéro est nouveau.
create function private.envoi_existant(p_cle uuid, p_operation text, p_empreinte text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_operation text;
  v_empreinte text;
  v_cible uuid;
begin
  select e.operation, e.empreinte, e.cible_id into v_operation, v_empreinte, v_cible
    from private.envoi e
   where e.compte = (select auth.uid()) and e.cle = p_cle;
  if not found then
    return null;
  end if;
  if v_operation <> p_operation or v_empreinte <> p_empreinte then
    raise exception 'Cet envoi est déjà enregistré avec d''autres valeurs.';
  end if;
  return v_cible;
end $$;

-- Pose le numéro d'un envoi. Faux si une ligne existe déjà : un envoi concurrent du même numéro
-- vient d'être validé (l'insertion l'a attendu sur la clé primaire).
create function private.retenir_envoi(p_cle uuid, p_operation text, p_cible uuid, p_empreinte text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into private.envoi (compte, cle, operation, cible_id, empreinte)
  values ((select auth.uid()), p_cle, p_operation, p_cible, p_empreinte)
  on conflict (compte, cle) do nothing;
  return found;
end $$;

-- Efface les numéros de plus de 7 jours (Proposé, Q5), à chaque envoi numéroté : pas de tâche
-- planifiée. Le réglage local n'ouvre que cette instruction.
create function private.purger_envois() returns void
language plpgsql set search_path = '' as $$
begin
  perform set_config('pilotage.purge_envoi', 'oui', true);
  delete from private.envoi e where e.le < statement_timestamp() - interval '7 days';
  perform set_config('pilotage.purge_envoi', '', true);
end $$;

revoke all on function
  private.refuser_modification_sauf_purge(),
  private.envoi_existant(uuid, text, text),
  private.retenir_envoi(uuid, text, uuid, text),
  private.purger_envois()
  from public, anon, authenticated, service_role;

-- 3. Ajouter un événement, avec numéro

create function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint, p_cle uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
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
  -- Mentions : doublons et valeurs vides retirés, triées (l'ordre des cases ne change pas l'envoi).
  select coalesce(array_agg(distinct x.id order by x.id), '{}') into v_mentions
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  -- Numéro : lu avant les contrôles métier.
  if p_cle is not null then
    v_empreinte := md5(jsonb_build_array(v_titre, p_date, p_statut, p_heure_prevue, v_mentions)::text);
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
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  if p_heure_prevue is not null and p_heure_prevue not between 0 and 1439 then
    raise exception 'L''heure prévue est invalide.';
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
  -- Premier état, avec l'heure prévue et jamais d'heure de début : le trigger de evenement_etat
  -- écrit la ligne de journal evenement_ajoute, avec les mentions déjà posées, au nom du compte
  -- connecté (auteur imposé par forcer_auteur).
  insert into public.evenement_etat (evenement_id, date, statut, heure_prevue)
  values (v_evenement, p_date, p_statut, p_heure_prevue);
  return v_evenement;
end $$;

create function public.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint, p_cle uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_evenement(p_titre, p_date, p_statut, p_mentions, p_heure_prevue, p_cle);
$$;

-- La version à cinq arguments (ancien site) délègue, sans numéro ; celles à quatre et trois
-- arguments délèguent déjà à celle-ci. Même signature : create or replace garde le
-- propriétaire et les droits.
create or replace function private.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement,
  p_mentions uuid[], p_heure_prevue smallint)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  return private.ajouter_evenement(p_titre, p_date, p_statut, p_mentions, p_heure_prevue, null::uuid);
end $$;

-- 4. Créer un point, avec numéro

create function private.creer_point(p_titre text, p_description text, p_action_attendue text,
  p_priorite public.priorite, p_echeance date, p_mentions uuid[], p_cle uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_description text;
  v_action text;
  v_priorite public.priorite;
  v_mentions uuid[];
  v_empreinte text;
  v_point uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if v_ministere is null then
    raise exception 'Seul un compte de ministère peut créer un point.' using errcode = '42501';
  end if;
  v_titre := btrim(coalesce(p_titre, ''));
  v_description := nullif(btrim(p_description), '');
  v_action := nullif(btrim(p_action_attendue), '');
  v_priorite := coalesce(p_priorite, 'normale');
  select coalesce(array_agg(distinct x.id order by x.id), '{}') into v_mentions
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  -- Numéro : lu avant les contrôles métier.
  if p_cle is not null then
    v_empreinte := md5(jsonb_build_array(v_titre, v_description, v_action, v_priorite, p_echeance,
                                         v_mentions)::text);
    v_point := private.envoi_existant(p_cle, 'creer_point', v_empreinte);
    if v_point is not null then
      return v_point;
    end if;
  end if;
  if char_length(v_titre) not between 1 and 80 then
    raise exception 'Donnez un titre au point (80 caractères au plus).';
  end if;
  if char_length(v_description) > 280 then
    raise exception 'La description dépasse 280 caractères.';
  end if;
  if char_length(v_action) > 80 then
    raise exception 'L''action attendue dépasse 80 caractères.';
  end if;
  if p_echeance < private.aujourdhui() then
    raise exception 'L''échéance ne peut pas être passée.';
  end if;
  if exists (select 1 from unnest(v_mentions) as x(id)
             where x.id = v_ministere
                or not exists (select 1 from public.ministere m where m.id = x.id and m.desactive_le is null)) then
    raise exception 'Ce ministère ne peut pas être mentionné.';
  end if;
  v_point := gen_random_uuid();
  if p_cle is not null then
    if not private.retenir_envoi(p_cle, 'creer_point', v_point, v_empreinte) then
      return private.envoi_existant(p_cle, 'creer_point', v_empreinte);
    end if;
    perform private.purger_envois();
  end if;
  insert into public.point_attention (id, ministere_id, titre, description, action_attendue, priorite, echeance)
  values (v_point, v_ministere, v_titre, v_description, v_action, v_priorite, p_echeance);
  insert into public.point_mention (point_id, ministere_id)
  select v_point, x.id from unnest(v_mentions) as x(id);
  insert into public.point_suivi (point_id, statut) values (v_point, 'a_traiter');
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_ministere, 'point_cree', 'point_attention', v_point,
          jsonb_build_object('priorite', v_priorite, 'mentions', to_jsonb(v_mentions)));
  return v_point;
end $$;

create function public.creer_point(p_titre text, p_description text, p_action_attendue text,
  p_priorite public.priorite, p_echeance date, p_mentions uuid[], p_cle uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select private.creer_point(p_titre, p_description, p_action_attendue, p_priorite, p_echeance, p_mentions, p_cle);
$$;

-- La version à six arguments (ancien site) délègue, sans numéro.
create or replace function private.creer_point(p_titre text, p_description text, p_action_attendue text,
  p_priorite public.priorite, p_echeance date, p_mentions uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  return private.creer_point(p_titre, p_description, p_action_attendue, p_priorite, p_echeance, p_mentions,
                             null::uuid);
end $$;

-- 5. Signaler une difficulté, avec numéro

create function private.signaler_difficulte(p_ecran text, p_texte text, p_cle uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_texte text;
  v_message text;
  v_empreinte text;
  v_id uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if private.mon_type() is distinct from 'ministere' or v_ministere is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  v_texte := btrim(coalesce(p_texte, ''));
  -- Numéro : lu avant les contrôles métier.
  if p_cle is not null then
    v_empreinte := md5(jsonb_build_array(p_ecran, v_texte)::text);
    v_id := private.envoi_existant(p_cle, 'signaler_difficulte', v_empreinte);
    if v_id is not null then
      return v_id;
    end if;
  end if;
  if p_ecran is null or p_ecran <> all (private.ecrans_signalement()) then
    raise exception 'Choisissez l''écran concerné dans la liste.';
  end if;
  if char_length(v_texte) < 10 then
    raise exception 'Décrivez la difficulté (10 caractères au moins).';
  end if;
  if char_length(v_texte) > 280 then
    raise exception 'Le signalement dépasse 280 caractères.';
  end if;
  v_message := private.texte_libre_refuse(v_texte);
  if v_message is not null then
    raise exception '%', v_message;
  end if;
  v_id := gen_random_uuid();
  if p_cle is not null then
    if not private.retenir_envoi(p_cle, 'signaler_difficulte', v_id, v_empreinte) then
      return private.envoi_existant(p_cle, 'signaler_difficulte', v_empreinte);
    end if;
    perform private.purger_envois();
  end if;

  insert into public.signalement (id, ministere_id, ecran, texte)
  values (v_id, v_ministere, p_ecran, v_texte);

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_ministere, 'difficulte_signalee', 'signalement', v_id,
          jsonb_build_object('ecran', p_ecran));
  return v_id;
end $$;

create function public.signaler_difficulte(p_ecran text, p_texte text, p_cle uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select private.signaler_difficulte(p_ecran, p_texte, p_cle);
$$;

-- La version à deux arguments (ancien site) délègue, sans numéro.
create or replace function private.signaler_difficulte(p_ecran text, p_texte text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  return private.signaler_difficulte(p_ecran, p_texte, null::uuid);
end $$;

-- 6. Droits des fonctions nouvelles : authenticated seulement, rien pour anon ni service_role.

revoke all on function
  private.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint, uuid),
  public.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint, uuid),
  private.creer_point(text, text, text, public.priorite, date, uuid[], uuid),
  public.creer_point(text, text, text, public.priorite, date, uuid[], uuid),
  private.signaler_difficulte(text, text, uuid),
  public.signaler_difficulte(text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function
  private.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint, uuid),
  public.ajouter_evenement(text, date, public.statut_evenement, uuid[], smallint, uuid),
  private.creer_point(text, text, text, public.priorite, date, uuid[], uuid),
  public.creer_point(text, text, text, public.priorite, date, uuid[], uuid),
  private.signaler_difficulte(text, text, uuid),
  public.signaler_difficulte(text, text, uuid)
  to authenticated;
