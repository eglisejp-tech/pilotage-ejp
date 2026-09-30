-- Étape 1, migration 6 sur 7 : fonctions de l'API (BRIEF, section 7, « Fonctions de l'API »).
--
-- Chaque fonction (sauf ajouter_evenement) existe en deux parties : private.<nom> en security
-- definer, qui porte tous les contrôles et commence par private.exige_aal2(), et public.<nom>
-- en security invoker, d'une ligne, que l'API appelle. Un refus de droit lève l'erreur 42501
-- (PostgREST répond 403) avec le même message qu'un objet absent ; une erreur de saisie lève
-- l'exception par défaut (400). Aucune fonction n'utilise de SQL dynamique.
-- Le journal est écrit ici pour l'action de chaque fonction : compte = auth.uid(), le = now(),
-- jamais de texte libre dans detail.

-- Aides internes (appelées seulement par les fonctions ci-dessous, au nom du propriétaire)

create function private.date_en_lettres(p_date date) returns text
language sql immutable set search_path = '' as $$
  select (array['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])[extract(isodow from p_date)::int]
      || ' ' || case when extract(day from p_date) = 1 then '1er' else extract(day from p_date)::int::text end
      || ' ' || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
                       'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from p_date)::int]
$$;

create function private.libelle_session(p_type public.type_session, p_intitule text) returns text
language sql immutable set search_path = '' as $$
  select case p_type
           when 'batir' then 'Bâtir l''Église'
           when 'anti_dispersion' then 'Anti-Dispersion'
           else '« ' || p_intitule || ' »'
         end
$$;

-- Ministères attendus d'une session : doublons retirés, tous actifs, au moins un.
create function private.ministeres_actifs(p_ministeres uuid[]) returns uuid[]
language plpgsql stable set search_path = '' as $$
declare
  v_ministeres uuid[];
begin
  select coalesce(array_agg(distinct x.id), '{}') into v_ministeres
  from unnest(p_ministeres) as x(id)
  where x.id is not null;
  if exists (select 1 from unnest(v_ministeres) as x(id)
             where not exists (select 1 from public.ministere m where m.id = x.id and m.desactive_le is null)) then
    raise exception 'Un ministère coché n''est pas actif.';
  end if;
  if cardinality(v_ministeres) = 0 then
    raise exception 'Cochez au moins un ministère.';
  end if;
  return v_ministeres;
end $$;

-- Auteur d'une écriture qui porte des champs libres ; verrouille la ligne visée.
create function private.auteur_texte(p_cible text, p_cible_id uuid) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_auteur uuid;
begin
  if p_cible = 'point_attention' then
    select p.saisi_par into v_auteur from public.point_attention p
     where p.id = p_cible_id
       for update;
  elsif p_cible = 'point_suivi' then
    select s.saisi_par into v_auteur from public.point_suivi s
     where s.id = p_cible_id and nullif(btrim(s.commentaire), '') is not null
       for update;
  elsif p_cible = 'evenement' then
    select e.saisi_par into v_auteur from public.evenement e
     where e.id = p_cible_id
       for update;
  elsif p_cible = 'reunion' then
    select r.saisi_par into v_auteur from public.reunion r
     where r.id = p_cible_id
       and (nullif(btrim(r.objet), '') is not null or nullif(btrim(r.decision_attendue), '') is not null)
       for update;
  end if;
  if v_auteur is null then
    raise exception 'Ce texte n''existe pas ou ne contient aucun champ libre.';
  end if;
  return v_auteur;
end $$;

-- Points d'attention

create function private.creer_point(p_titre text, p_description text, p_action_attendue text,
  p_priorite public.priorite, p_echeance date, p_mentions uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_description text;
  v_action text;
  v_priorite public.priorite;
  v_mentions uuid[];
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
  select coalesce(array_agg(distinct x.id), '{}') into v_mentions
  from unnest(p_mentions) as x(id)
  where x.id is not null;
  if exists (select 1 from unnest(v_mentions) as x(id)
             where x.id = v_ministere
                or not exists (select 1 from public.ministere m where m.id = x.id and m.desactive_le is null)) then
    raise exception 'Ce ministère ne peut pas être mentionné.';
  end if;
  insert into public.point_attention (ministere_id, titre, description, action_attendue, priorite, echeance)
  values (v_ministere, v_titre, v_description, v_action, v_priorite, p_echeance)
  returning id into v_point;
  insert into public.point_mention (point_id, ministere_id)
  select v_point, x.id from unnest(v_mentions) as x(id);
  insert into public.point_suivi (point_id, statut) values (v_point, 'a_traiter');
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_ministere, 'point_cree', 'point_attention', v_point,
          jsonb_build_object('priorite', v_priorite, 'mentions', to_jsonb(v_mentions)));
  return v_point;
end $$;

create function private.changer_statut_point(p_point_id uuid, p_statut public.statut_point)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_mon_ministere uuid;
  v_point public.point_attention%rowtype;
  v_actuel public.statut_point;
begin
  perform private.exige_aal2();
  v_mon_ministere := private.mon_ministere();
  select p.* into v_point from public.point_attention p
   where p.id = p_point_id
     and (p.ministere_id = v_mon_ministere
          or exists (select 1 from public.point_mention m
                      where m.point_id = p.id and m.ministere_id = v_mon_ministere))
     for update of p;
  if v_point.id is null then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.point_suivi s where s.point_id = p_point_id and s.statut = 'traite') then
    raise exception 'Ce point est traité : il ne change plus.';
  end if;
  if p_statut is null then
    raise exception 'Choisissez un statut.';
  end if;
  if p_statut = 'traite' then
    raise exception 'Utilisez le bouton Marquer traité.';
  end if;
  select s.statut into v_actuel from public.point_suivi s
   where s.point_id = p_point_id
   order by s.saisi_le desc
   limit 1;
  if v_actuel = p_statut then
    return;                               -- même statut : rien n'est écrit
  end if;
  insert into public.point_suivi (point_id, statut) values (p_point_id, p_statut);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_point.ministere_id, 'point_statut', 'point_attention', p_point_id,
          jsonb_build_object('statut', jsonb_build_array(v_actuel, p_statut)));
end $$;

-- Marquer traité (D3) : ministère créateur ou mentionné (commentaire de 10 à 280 caractères),
-- berger ou conseil (commentaire facultatif, 280 au plus).
create function private.marquer_traite(p_point_id uuid, p_commentaire text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_point public.point_attention%rowtype;
  v_mon_ministere uuid;
  v_commentaire text;
  v_par_ministere boolean := false;
begin
  perform private.exige_aal2();
  v_mon_ministere := private.mon_ministere();
  v_commentaire := nullif(btrim(p_commentaire), '');
  select * into v_point from public.point_attention where id = p_point_id for update;
  if v_point.id is not null and v_mon_ministere is not null then
    v_par_ministere := v_point.ministere_id = v_mon_ministere
      or exists (select 1 from public.point_mention m
                 where m.point_id = p_point_id and m.ministere_id = v_mon_ministere);
  end if;
  if v_point.id is null or not (private.est_decideur() or v_par_ministere) then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.point_suivi s where s.point_id = p_point_id and s.statut = 'traite') then
    raise exception 'Ce point est déjà traité.';
  end if;
  if char_length(v_commentaire) > 280 then
    raise exception 'Le commentaire dépasse 280 caractères.';
  end if;
  if v_par_ministere and coalesce(char_length(v_commentaire), 0) < 10 then
    raise exception 'Expliquez ce qui a été traité et comment (10 caractères au moins).';
  end if;
  insert into public.point_suivi (point_id, statut, commentaire) values (p_point_id, 'traite', v_commentaire);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), v_point.ministere_id, 'point_traite', 'point_attention', p_point_id,
          jsonb_build_object('avec_commentaire', v_commentaire is not null));
end $$;

-- Sessions (administration de l'église)

create function private.declarer_session(p_type public.type_session, p_date date, p_intitule text,
  p_ministeres uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_intitule text;
  v_ministeres uuid[];
  v_session uuid;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_eglise' then
    raise exception 'Seule l''administration de l''église déclare une session.' using errcode = '42501';
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
create function private.modifier_session(p_session_id uuid, p_ministeres uuid[])
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
  if private.mon_type() is distinct from 'admin_eglise' then
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

create function private.supprimer_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_session public.session%rowtype;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_eglise' then
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

-- Modération (EJP Tech)

create function private.marquer_relu(p_cible text, p_cible_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_auteur uuid;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Seul EJP Tech peut relire un texte.' using errcode = '42501';
  end if;
  v_auteur := private.auteur_texte(p_cible, p_cible_id);
  if exists (select 1 from public.moderation m where m.cible = p_cible and m.cible_id = p_cible_id) then
    raise exception 'Ce texte a déjà été relu.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, null, 'rien_a_signaler', null, (select auth.uid()));
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), (select c.ministere_id from public.compte c where c.user_id = v_auteur),
          'texte_relu', p_cible, p_cible_id, '{}');
end $$;

-- Tout le champ devient « [texte masqué par EJP Tech] ». Une instruction update écrite en dur
-- pour chaque couple (cible, champ) autorisé : aucun SQL dynamique.
create function private.masquer_texte(p_cible text, p_cible_id uuid, p_champ text, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_masque constant text := '[texte masqué par EJP Tech]';
  v_auteur uuid;
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
  elsif p_cible = 'reunion' and p_champ = 'objet' then
    update public.reunion set objet = v_masque
     where id = p_cible_id and nullif(btrim(objet), '') is not null and objet <> v_masque
    returning saisi_par into v_auteur;
  elsif p_cible = 'reunion' and p_champ = 'decision_attendue' then
    update public.reunion set decision_attendue = v_masque
     where id = p_cible_id and nullif(btrim(decision_attendue), '') is not null and decision_attendue <> v_masque
    returning saisi_par into v_auteur;
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère qui a écrit le texte : celui du compte auteur (null pour le berger et le conseil).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()), (select c.ministere_id from public.compte c where c.user_id = v_auteur),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- Parties publiques, security invoker, d'une ligne

create function public.creer_point(p_titre text, p_description text, p_action_attendue text,
  p_priorite public.priorite, p_echeance date, p_mentions uuid[])
returns uuid language sql security invoker set search_path = '' as $$
  select private.creer_point(p_titre, p_description, p_action_attendue, p_priorite, p_echeance, p_mentions);
$$;

create function public.changer_statut_point(p_point_id uuid, p_statut public.statut_point)
returns void language sql security invoker set search_path = '' as $$
  select private.changer_statut_point(p_point_id, p_statut);
$$;

create function public.marquer_traite(p_point_id uuid, p_commentaire text default null)
returns void language sql security invoker set search_path = '' as $$
  select private.marquer_traite(p_point_id, p_commentaire);
$$;

create function public.declarer_session(p_type public.type_session, p_date date, p_intitule text,
  p_ministeres uuid[])
returns uuid language sql security invoker set search_path = '' as $$
  select private.declarer_session(p_type, p_date, p_intitule, p_ministeres);
$$;

create function public.modifier_session(p_session_id uuid, p_ministeres uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.modifier_session(p_session_id, p_ministeres);
$$;

create function public.supprimer_session(p_session_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.supprimer_session(p_session_id);
$$;

create function public.marquer_relu(p_cible text, p_cible_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.marquer_relu(p_cible, p_cible_id);
$$;

create function public.masquer_texte(p_cible text, p_cible_id uuid, p_champ text, p_motif text)
returns void language sql security invoker set search_path = '' as $$
  select private.masquer_texte(p_cible, p_cible_id, p_champ, p_motif);
$$;

-- Événement : security invoker, sans partie private. La RLS s'applique aux deux insertions ;
-- le journal (evenement_ajoute) vient du trigger de evenement_etat.
create function public.ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_ministere uuid;
  v_titre text;
  v_evenement uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if v_ministere is null then
    raise exception 'Seul un compte de ministère peut ajouter un événement.' using errcode = '42501';
  end if;
  v_titre := btrim(coalesce(p_titre, ''));
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
  insert into public.evenement (ministere_id, titre) values (v_ministere, v_titre)
  returning id into v_evenement;
  insert into public.evenement_etat (evenement_id, date, statut) values (v_evenement, p_date, p_statut);
  return v_evenement;
end $$;

-- Droits : les aides internes ne sont exécutables par personne (le propriétaire les appelle) ;
-- les fonctions de l'API, privées et publiques, par authenticated seulement.
revoke all on function
  private.date_en_lettres(date),
  private.libelle_session(public.type_session, text),
  private.ministeres_actifs(uuid[]),
  private.auteur_texte(text, uuid),
  private.creer_point(text, text, text, public.priorite, date, uuid[]),
  private.changer_statut_point(uuid, public.statut_point),
  private.marquer_traite(uuid, text),
  private.declarer_session(public.type_session, date, text, uuid[]),
  private.modifier_session(uuid, uuid[]),
  private.supprimer_session(uuid),
  private.marquer_relu(text, uuid),
  private.masquer_texte(text, uuid, text, text)
  from public, anon, authenticated, service_role;

revoke all on function
  public.creer_point(text, text, text, public.priorite, date, uuid[]),
  public.changer_statut_point(uuid, public.statut_point),
  public.marquer_traite(uuid, text),
  public.ajouter_evenement(text, date, public.statut_evenement),
  public.declarer_session(public.type_session, date, text, uuid[]),
  public.modifier_session(uuid, uuid[]),
  public.supprimer_session(uuid),
  public.marquer_relu(text, uuid),
  public.masquer_texte(text, uuid, text, text)
  from public, anon, authenticated, service_role;

grant execute on function
  private.creer_point(text, text, text, public.priorite, date, uuid[]),
  private.changer_statut_point(uuid, public.statut_point),
  private.marquer_traite(uuid, text),
  private.declarer_session(public.type_session, date, text, uuid[]),
  private.modifier_session(uuid, uuid[]),
  private.supprimer_session(uuid),
  private.marquer_relu(text, uuid),
  private.masquer_texte(text, uuid, text, text),
  public.creer_point(text, text, text, public.priorite, date, uuid[]),
  public.changer_statut_point(uuid, public.statut_point),
  public.marquer_traite(uuid, text),
  public.ajouter_evenement(text, date, public.statut_evenement),
  public.declarer_session(public.type_session, date, text, uuid[]),
  public.modifier_session(uuid, uuid[]),
  public.supprimer_session(uuid),
  public.marquer_relu(text, uuid),
  public.masquer_texte(text, uuid, text, text)
  to authenticated;
