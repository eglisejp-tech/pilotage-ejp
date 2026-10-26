-- Suivi des signalements (T77, qui révise T39 ; conception validée le 26 octobre 2026, sans le
-- courriel). Un signalement passe par quatre statuts : Reçu (aucune ligne de suivi), En cours,
-- Répondu, Clos. Le statut ne se stocke pas : il se lit dans la dernière ligne de suivi (par
-- `ordre`) et dans le jour de Paris. Chaque étape est une ligne ajoutée à signalement_suivi,
-- jamais une mise à jour (ajout seulement, CLAUDE.md).
--
-- 1. signalement_suivi gagne etape (en_cours, reponse, regle, reponse_ministere, clos) et ordre
--    (tiré par la base, sous le verrou du signalement), et perd son unicité : une ligne par
--    étape, une seule fin (regle ou clos) par signalement. Les lignes existantes, toutes des
--    clôtures, reçoivent etape = 'clos' par la valeur par défaut du catalogue (aucun UPDATE,
--    aucun déclencheur), puis la valeur par défaut est retirée : chaque ligne dit son étape.
-- 2. Des fonctions pures, la seule règle du statut : la date limite de réponse du ministère
--    (jour de Paris de la réponse d'EJP Tech, plus 7, inclus) et le statut lu dans la dernière
--    étape. La clôture automatique se calcule, sans tâche planifiée ni écriture : le lendemain
--    de la date limite, à 0 h, heure de Paris.
-- 3. Quatre gestes, chacun par une fonction (private en security definer, appelée par public en
--    security invoker), sous verrou for update sur le signalement, statut relu sous le verrou :
--    prendre_en_charge_signalement et repondre_au_ministere (EJP Tech), confirmer_signalement et
--    repondre_a_ejp_tech (le ministère du signalement, à l'étape Répondu).
-- 4. clore_signalement garde sa signature (l'ancien site l'appelle encore) : le contrôle « déjà
--    clos » se fait par le statut, sous le verrou, et la ligne porte etape = 'clos'.
-- 5. Journal : quatre codes, toujours de cible signalement (un check l'impose) : la politique de
--    lecture et v_journal les retirent donc déjà au berger, au conseil et à l'administration,
--    sans changement. Aucun texte, aucune adresse au journal.
-- 6. Fraîcheur : confirmer ou répondre à EJP Tech n'est pas une saisie (règle 6).
-- 7. v_signalement : ses 11 colonnes gardent leur nom, leur type, leur ordre et leur sens pour
--    l'ancien site ; 7 colonnes s'ajoutent à la fin.
-- Aucun email, aucune notification hors de l'outil (T77 : sans le courriel). Aucun SQL
-- dynamique. Migration à sens unique : dès qu'un signalement a deux lignes de suivi, l'ancienne
-- unicité ne peut plus se recréer ; un retour arrière ne concerne que le site.

-- 1. signalement_suivi : une ligne par étape

alter table public.signalement_suivi
  add column etape text not null default 'clos',
  add column ordre bigint generated always as identity;
alter table public.signalement_suivi alter column etape drop default;

alter table public.signalement_suivi
  drop constraint signalement_suivi_signalement_id_key,
  add constraint signalement_suivi_etape_check
    check (etape in ('en_cours', 'reponse', 'regle', 'reponse_ministere', 'clos')),
  -- Une réponse porte toujours son texte ; une prise en charge et une confirmation n'en portent
  -- jamais ; une clôture au choix (l'ancien site clôt sans réponse). Le masquage remplace un
  -- texte par « [texte masqué par EJP Tech] », jamais par null.
  add constraint signalement_suivi_etape_commentaire_check check (
    case etape
      when 'reponse' then commentaire is not null
      when 'reponse_ministere' then commentaire is not null
      when 'en_cours' then commentaire is null
      when 'regle' then commentaire is null
      else true
    end);

-- Une seule fin par signalement, même au propriétaire : un Clos ne se rouvre pas.
create unique index signalement_suivi_une_fin on public.signalement_suivi (signalement_id)
  where etape in ('regle', 'clos');
-- La dernière ligne d'un signalement, par ordre : une seule, même si le propriétaire donnait un
-- ordre (overriding system value).
create unique index signalement_suivi_par_ordre on public.signalement_suivi (signalement_id, ordre desc);

-- La séquence d'ordre ne sert qu'aux fonctions (propriétaire) : aucun droit.
revoke all on sequence public.signalement_suivi_ordre_seq from public, anon, authenticated, service_role;

-- 2. La règle du statut, à un seul endroit

-- Dernier jour de Paris où le ministère peut répondre à une réponse d'EJP Tech : le jour de la
-- réponse plus 7, inclus (une réponse le dimanche 1er novembre se discute jusqu'au dimanche 8).
create function private.reponse_possible_jusquau(p_reponse_le timestamptz) returns date
language sql stable set search_path = '' as $$
  select (p_reponse_le at time zone 'Europe/Paris')::date + 7
$$;

-- Instant de la clôture automatique : 0 h, heure de Paris, le lendemain de la date limite
-- (jamais date::timestamptz, qui suivrait le fuseau de la session).
create function private.cloture_automatique_le(p_reponse_le timestamptz) returns timestamptz
language sql stable set search_path = '' as $$
  select (private.reponse_possible_jusquau(p_reponse_le) + 1)::timestamp at time zone 'Europe/Paris'
$$;

-- Statut d'un signalement, lu dans sa dernière étape (null : aucune ligne, Reçu), l'instant de
-- cette étape et le jour de Paris où on le lit.
create function private.statut_signalement(p_etape text, p_le timestamptz, p_jour date) returns text
language sql stable set search_path = '' as $$
  select case
    when p_etape is null then 'recu'
    when p_etape in ('en_cours', 'reponse_ministere') then 'en_cours'
    when p_etape = 'reponse' and p_jour <= private.reponse_possible_jusquau(p_le) then 'repondu'
    else 'clos'
  end
$$;

-- Statut actuel d'un signalement, pour les fonctions d'écriture (au nom du propriétaire, sous le
-- verrou du signalement) : sa dernière ligne de suivi par ordre, et le jour de Paris.
-- Règle du verrou : chaque fonction d'écriture (volatile) verrouille d'abord le signalement
-- (select ... for update), puis appelle cette fonction dans une instruction à part. En READ
-- COMMITTED (PostgREST), cette instruction prend une photo neuve, après le verrou : elle voit la
-- ligne qu'un geste concurrent vient de valider. Ne jamais fusionner l'appel dans le select du
-- verrou, ni rendre la fonction appelante stable.
create function private.statut_du_signalement(p_signalement_id uuid) returns text
language sql stable set search_path = '' as $$
  select private.statut_signalement(d.etape, d.saisi_le, private.aujourdhui())
    from (select 1) as un
    left join lateral (
      select x.etape, x.saisi_le from public.signalement_suivi x
       where x.signalement_id = p_signalement_id
       order by x.ordre desc
       limit 1) as d on true
$$;

-- Une réponse (d'EJP Tech ou du ministère) : obligatoire, 10 à 280 caractères après btrim, sans
-- donnée personnelle ni marqueur de la modération (T43). Rend le texte à écrire.
create function private.texte_de_reponse(p_texte text) returns text
language plpgsql set search_path = '' as $$
declare
  v_texte text := btrim(coalesce(p_texte, ''));
  v_message text;
begin
  if char_length(v_texte) < 10 then
    raise exception 'Écrivez votre réponse (10 caractères au moins).';
  end if;
  if char_length(v_texte) > 280 then
    raise exception 'La réponse dépasse 280 caractères.';
  end if;
  v_message := private.texte_libre_refuse(v_texte);
  if v_message is not null then
    raise exception '%', v_message;
  end if;
  return v_texte;
end $$;

-- 3. Les gestes d'EJP Tech

-- « Prendre en charge » : Reçu vers En cours.
create function private.prendre_en_charge_signalement(p_signalement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_signalement public.signalement%rowtype;
  v_statut text;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select s.* into v_signalement from public.signalement s where s.id = p_signalement_id for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  v_statut := private.statut_du_signalement(p_signalement_id);
  if v_statut = 'clos' then
    raise exception 'Ce signalement est déjà clos.';
  elsif v_statut = 'repondu' then
    raise exception 'Ce signalement attend le retour du ministère.';
  elsif v_statut = 'en_cours' then
    raise exception 'Ce signalement est déjà pris en charge.';
  end if;

  insert into public.signalement_suivi (signalement_id, etape) values (p_signalement_id, 'en_cours');
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_signalement.ministere_id, 'signalement_pris_en_charge',
          'signalement', p_signalement_id, jsonb_build_object('ecran', v_signalement.ecran));
end $$;

create function public.prendre_en_charge_signalement(p_signalement_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.prendre_en_charge_signalement(p_signalement_id);
$$;

-- « Répondre au ministère » : une question ou ce qui a été fait, Reçu ou En cours vers Répondu.
-- Refusée quand le ministère n'a plus de compte actif (personne ne lirait la réponse) : « Clore
-- le signalement » reste. Rend l'identifiant de la ligne de réponse.
create function private.repondre_au_ministere(p_signalement_id uuid, p_reponse text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_signalement public.signalement%rowtype;
  v_statut text;
  v_reponse text;
  v_id uuid;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select s.* into v_signalement from public.signalement s where s.id = p_signalement_id for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  v_statut := private.statut_du_signalement(p_signalement_id);
  if v_statut = 'clos' then
    raise exception 'Ce signalement est déjà clos.';
  elsif v_statut = 'repondu' then
    raise exception 'Ce signalement attend le retour du ministère.';
  end if;
  -- Un seul compte actif possible par ministère (index compte_un_par_ministere).
  if not exists (select 1 from public.compte c
                   join public.ministere m on m.id = c.ministere_id
                  where c.ministere_id = v_signalement.ministere_id
                    and c.desactive_le is null and m.desactive_le is null) then
    raise exception 'Ce ministère n''a plus de compte actif.';
  end if;
  v_reponse := private.texte_de_reponse(p_reponse);

  insert into public.signalement_suivi (signalement_id, etape, commentaire)
  values (p_signalement_id, 'reponse', v_reponse)
  returning id into v_id;
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_signalement.ministere_id, 'signalement_repondu',
          'signalement', p_signalement_id, jsonb_build_object('ecran', v_signalement.ecran));
  return v_id;
end $$;

create function public.repondre_au_ministere(p_signalement_id uuid, p_reponse text)
returns uuid language sql security invoker set search_path = '' as $$
  select private.repondre_au_ministere(p_signalement_id, p_reponse);
$$;

-- 4. Les gestes du ministère (le compte actif du ministère du signalement, à l'étape Répondu)

-- Le signalement du ministère connecté, verrouillé, s'il attend sa réponse ; sinon le refus de
-- droit commun, ou le message du statut relu sous le verrou. Appelée au nom du propriétaire par
-- confirmer_signalement et repondre_a_ejp_tech, après exige_aal2.
create function private.signalement_a_verifier(p_signalement_id uuid) returns public.signalement
language plpgsql set search_path = '' as $$
declare
  v_signalement public.signalement%rowtype;
  v_statut text;
begin
  if private.mon_type() is distinct from 'ministere' or private.mon_ministere() is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select s.* into v_signalement from public.signalement s
   where s.id = p_signalement_id and s.ministere_id = private.mon_ministere()
   for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  v_statut := private.statut_du_signalement(p_signalement_id);
  if v_statut = 'clos' then
    raise exception 'Ce signalement est déjà clos.';
  elsif v_statut <> 'repondu' then
    raise exception 'Ce signalement n''attend pas votre réponse.';
  end if;
  return v_signalement;
end $$;

-- « Oui, c'est réglé » : Répondu vers Clos.
create function private.confirmer_signalement(p_signalement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_signalement public.signalement%rowtype;
begin
  perform private.exige_aal2();
  v_signalement := private.signalement_a_verifier(p_signalement_id);
  -- Le statut est relu sous le verrou ; l'index unique d'une seule fin reste le dernier filet.
  begin
    insert into public.signalement_suivi (signalement_id, etape) values (p_signalement_id, 'regle');
  exception when unique_violation then
    raise exception 'Ce signalement est déjà clos.';
  end;
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_signalement.ministere_id, 'signalement_regle',
          'signalement', p_signalement_id, jsonb_build_object('ecran', v_signalement.ecran));
end $$;

create function public.confirmer_signalement(p_signalement_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.confirmer_signalement(p_signalement_id);
$$;

-- « Répondre à EJP Tech » : Répondu vers En cours, avec un texte obligatoire.
create function private.repondre_a_ejp_tech(p_signalement_id uuid, p_texte text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_signalement public.signalement%rowtype;
  v_texte text;
begin
  perform private.exige_aal2();
  v_signalement := private.signalement_a_verifier(p_signalement_id);
  v_texte := private.texte_de_reponse(p_texte);
  insert into public.signalement_suivi (signalement_id, etape, commentaire)
  values (p_signalement_id, 'reponse_ministere', v_texte);
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_signalement.ministere_id, 'signalement_reponse_ministere',
          'signalement', p_signalement_id, jsonb_build_object('ecran', v_signalement.ecran));
end $$;

create function public.repondre_a_ejp_tech(p_signalement_id uuid, p_texte text)
returns void language sql security invoker set search_path = '' as $$
  select private.repondre_a_ejp_tech(p_signalement_id, p_texte);
$$;

-- 5. « Clore le signalement » (EJP Tech), même signature que B7 : commentaire facultatif en base
-- (l'ancien site clôt sans réponse), obligatoire à l'écran (schéma Zod). Tout statut sauf Clos :
-- l'ancien site peut encore clore un Répondu.

create or replace function private.clore_signalement(p_signalement_id uuid, p_commentaire text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_signalement public.signalement%rowtype;
  v_commentaire text;
  v_message text;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select s.* into v_signalement from public.signalement s where s.id = p_signalement_id for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if private.statut_du_signalement(p_signalement_id) = 'clos' then
    raise exception 'Ce signalement est déjà clos.';
  end if;
  v_commentaire := nullif(btrim(coalesce(p_commentaire, '')), '');
  if v_commentaire is not null then
    if char_length(v_commentaire) < 10 then
      raise exception 'Le commentaire fait 10 caractères au moins, ou reste vide.';
    end if;
    if char_length(v_commentaire) > 280 then
      raise exception 'Le commentaire dépasse 280 caractères.';
    end if;
    v_message := private.texte_libre_refuse(v_commentaire);
    if v_message is not null then
      raise exception '%', v_message;
    end if;
  end if;

  -- Le statut est relu sous le verrou ; l'index unique d'une seule fin reste le dernier filet.
  begin
    insert into public.signalement_suivi (signalement_id, etape, commentaire)
    values (p_signalement_id, 'clos', v_commentaire);
  exception when unique_violation then
    raise exception 'Ce signalement est déjà clos.';
  end;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_signalement.ministere_id, 'signalement_clos',
          'signalement', p_signalement_id,
          jsonb_build_object('ecran', v_signalement.ecran, 'avec_commentaire', v_commentaire is not null));
end $$;

-- 6. Journal : quatre codes du suivi (version de 20261025192715_comptes_corrections.sql, plus ces
-- codes), toujours de cible signalement.

alter table public.journal
  drop constraint journal_action_check,
  add constraint journal_action_check check (action in (
    -- Étapes 1 à 3
    'mesure_saisie', 'fij_saisie', 'participation_saisie', 'evenement_ajoute', 'evenement_modifie',
    'reunion_saisie', 'point_cree', 'point_statut', 'point_traite',
    'session_declaree', 'session_modifiee', 'session_supprimee',
    'ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive', 'compte_reactive',
    'double_auth_reinitialisee', 'texte_relu', 'texte_masque',
    -- Étape 4 : indicateurs (B3) et statistiques FIJ par département (B5)
    'indicateur_cree', 'indicateurs_prevus_crees', 'indicateur_corrige', 'indicateur_valide',
    'indicateur_refuse', 'indicateur_retire', 'fij_statistiques_saisies',
    -- Étape 4 : signalements (B7)
    'difficulte_signalee', 'signalement_clos',
    -- Étape 5 : mentions modifiables (T54)
    'point_mention_ajoutee', 'point_mention_retiree',
    -- Étape 8 : liste des indicateurs prévus d'un ministère (T72)
    'modele_prevus_choisi',
    -- Étape 8 : corrections de l'écran 13 (T74)
    'adresse_corrigee', 'ministere_supprime',
    -- Étape 8 : suivi des signalements (T77)
    'signalement_pris_en_charge', 'signalement_repondu', 'signalement_regle',
    'signalement_reponse_ministere')),
  -- C'est la cible signalement qui retire ces lignes au berger, au conseil et à l'administration
  -- (politique de lecture du journal et v_journal) : elle est obligatoire.
  add constraint journal_suivi_signalement_cible_check check (
    action not in ('signalement_pris_en_charge', 'signalement_repondu', 'signalement_regle',
                   'signalement_reponse_ministere')
    or coalesce(cible = 'signalement' and cible_id is not null, false));

-- 7. Fraîcheur : version de 20261009110000_signalements.sql ; ni un signalement, ni la réponse ou
-- la confirmation d'un ministère ne sont des saisies (règle 6). Les gestes d'EJP Tech sont écrits
-- par son compte, qui n'a pas de ministère. Même signature : les droits sont redonnés plus bas.
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
    select x.date, x.titre
    from (select distinct on (e.id) e.id, e.titre, t.date, t.statut
            from public.evenement e
            join public.evenement_etat t on t.evenement_id = e.id
           where e.ministere_id = m.id
           order by e.id, t.saisi_le desc, t.id desc) as x
    where x.date >= moi.jour and x.statut not in ('termine', 'annule')
    order by x.date, x.titre
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

-- 8. v_signalement, sous la RLS du lecteur (security_invoker) : le ministère auteur et EJP Tech.
-- Les 11 colonnes de B7, même nom, même type, même ordre, même sens pour l'ancien site :
-- - suivi_id et commentaire : la dernière ligne d'EJP Tech avec un texte (une réponse ou une
--   clôture), la « Réponse : » que l'ancien site affiche et la cible de son masquage ;
-- - clos_le : la confirmation ou la clôture ; pour une clôture automatique, 0 h à Paris le
--   lendemain de la date limite ; null si ouvert ;
-- - ouvert : statut différent de Clos ; clos_recent : clos depuis 30 jours au plus (jour de Paris).
-- Puis les 7 colonnes du suivi : statut, derniere_etape (null pour Reçu), statut_le (instant du
-- statut : dernière ligne, envoi pour Reçu, clos_le pour un Clos), jours_depuis (jour de Paris
-- moins celui de statut_le : l'âge affiché à EJP Tech), fin (confirme, automatique, ejp_tech,
-- null si ouvert), reponse_possible_jusquau (pour un Répondu) et compte_actif (le ministère a un
-- compte actif, lu dans compte et ministere, que tout profil actif lit). L'écran ne calcule
-- jamais une date ni une durée avec l'horloge du navigateur.
create or replace view public.v_signalement with (security_invoker = true) as
select s.id,
       s.ministere_id,
       m.nom as ministere_nom,
       s.ecran,
       s.texte,
       s.saisi_le,
       r.id as suivi_id,
       r.commentaire,
       f.clos_le,
       st.statut <> 'clos' as ouvert,
       coalesce(private.aujourdhui() - (f.clos_le at time zone 'Europe/Paris')::date <= 30, false) as clos_recent,
       st.statut,
       d.etape as derniere_etape,
       f.statut_le,
       private.aujourdhui() - (f.statut_le at time zone 'Europe/Paris')::date as jours_depuis,
       case when st.statut <> 'clos' then null
            when d.etape = 'regle' then 'confirme'
            when d.etape = 'reponse' then 'automatique'
            else 'ejp_tech' end as fin,
       case when st.statut = 'repondu' then private.reponse_possible_jusquau(d.saisi_le) end
         as reponse_possible_jusquau,
       coalesce(m.desactive_le is null
                and exists (select 1 from public.compte c
                             where c.ministere_id = s.ministere_id and c.desactive_le is null), false)
         as compte_actif
from public.signalement s
left join public.ministere m on m.id = s.ministere_id
left join lateral (
  select x.etape, x.saisi_le from public.signalement_suivi x
   where x.signalement_id = s.id
   order by x.ordre desc
   limit 1) as d on true
left join lateral (
  select x.id, x.commentaire from public.signalement_suivi x
   where x.signalement_id = s.id and x.etape in ('reponse', 'clos') and x.commentaire is not null
   order by x.ordre desc
   limit 1) as r on true
cross join lateral (
  select private.statut_signalement(d.etape, d.saisi_le, private.aujourdhui()) as statut) as st
cross join lateral (
  select case when st.statut <> 'clos' then null
              when d.etape = 'reponse' then private.cloture_automatique_le(d.saisi_le)
              else d.saisi_le end as clos_le,
         case when d.etape is null then s.saisi_le
              when st.statut = 'clos' and d.etape = 'reponse' then private.cloture_automatique_le(d.saisi_le)
              else d.saisi_le end as statut_le) as f;

revoke all on public.v_signalement from public, anon, authenticated, service_role;
grant select on public.v_signalement to authenticated;

-- 9. Droits des fonctions : rien pour public, anon ni service_role. authenticated exécute les
-- fonctions de l'API, le tableau des ministères et les fonctions pures que lit v_signalement
-- (security_invoker). statut_du_signalement, texte_de_reponse et signalement_a_verifier ne
-- s'exécutent qu'au nom du propriétaire, depuis les fonctions d'écriture.
revoke all on function
  private.reponse_possible_jusquau(timestamptz),
  private.cloture_automatique_le(timestamptz),
  private.statut_signalement(text, timestamptz, date),
  private.statut_du_signalement(uuid),
  private.texte_de_reponse(text),
  private.signalement_a_verifier(uuid),
  private.prendre_en_charge_signalement(uuid),
  public.prendre_en_charge_signalement(uuid),
  private.repondre_au_ministere(uuid, text),
  public.repondre_au_ministere(uuid, text),
  private.confirmer_signalement(uuid),
  public.confirmer_signalement(uuid),
  private.repondre_a_ejp_tech(uuid, text),
  public.repondre_a_ejp_tech(uuid, text),
  private.clore_signalement(uuid, text),
  private.tableau_ministeres()
  from public, anon, authenticated, service_role;
grant execute on function
  private.reponse_possible_jusquau(timestamptz),
  private.cloture_automatique_le(timestamptz),
  private.statut_signalement(text, timestamptz, date),
  private.prendre_en_charge_signalement(uuid),
  public.prendre_en_charge_signalement(uuid),
  private.repondre_au_ministere(uuid, text),
  public.repondre_au_ministere(uuid, text),
  private.confirmer_signalement(uuid),
  public.confirmer_signalement(uuid),
  private.repondre_a_ejp_tech(uuid, text),
  public.repondre_a_ejp_tech(uuid, text),
  private.clore_signalement(uuid, text),
  private.tableau_ministeres()
  to authenticated;
