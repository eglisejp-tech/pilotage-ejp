-- Étape 4, lot B7 : signalements, base (docs/plan-etape-4.md, section 4, « B7 » et matrice ;
-- docs/conception/contrat-etape-4.md, sections 1, 4, 5, 6, 7 et 8 ; docs/decisions.md, T39 et
-- P51, décidés le 6 octobre 2026).
--
-- Un ministère qui bloque sur un écran l'écrit en quelques mots ; seuls ce ministère et EJP Tech
-- le lisent (ni l'administration de l'église, ni le berger, ni le conseil) ; EJP Tech l'aide en
-- dehors de l'outil, puis clôt le signalement, une seule fois.
--
-- 1. Tables signalement et signalement_suivi, en ajout seulement (trigger d'inaltérabilité,
--    seule exception : masquer_texte sous pilotage.masquage). Lecture : le ministère auteur et
--    EJP Tech, jamais par private.lit_tout() (qui rendrait vrai pour le berger et le conseil).
--    GRANT select seulement : l'ajout passe par les deux fonctions.
-- 2. signaler_difficulte(p_ecran, p_texte) : ministère actif seulement (le ministère vient de
--    la session) ; texte de 10 à 280 caractères après trim, sans donnée personnelle ni crochets
--    (private.texte_libre_refuse, familles de private.verifier_texte) ; une ligne de journal
--    difficulte_signalee dont le detail porte le code de l'écran, jamais le texte.
-- 3. clore_signalement(p_signalement_id, p_commentaire) : EJP Tech seul, sous verrou, une seule
--    clôture (« Ce signalement est déjà clos. ») ; commentaire facultatif de 10 à 280
--    caractères ; une ligne de journal signalement_clos {ecran, avec_commentaire}, jamais le
--    commentaire.
-- 4. Modération : private.auteur_texte, marquer_relu et masquer_texte recréés depuis leur
--    version de B8 (20261009105000), avec les couples (signalement, texte) et
--    (signalement_suivi, commentaire). La ligne de journal d'un texte de signalement porte le
--    ministère du signalement : le ministère auteur la lit, comme la clôture.
-- 5. Journal : la politique de lecture et v_journal recréées depuis leur version de B8. Les
--    lignes des signalements (difficulte_signalee, signalement_clos, et texte_relu ou
--    texte_masque de cible signalement ou signalement_suivi) ne se lisent que par le ministère
--    auteur et EJP Tech (T39). Les lignes texte_relu et texte_masque de cible
--    demande_indicateur ne se lisent plus par l'administration (P51). v_journal donne pour la
--    cible signalement le code de l'écran, sous la RLS du lecteur, jamais le texte.
-- 6. Fraîcheur : private.tableau_ministeres() recréée depuis sa dernière version
--    (20261005172228) ; elle ignore difficulte_signalee (un signalement n'est pas une saisie,
--    règle 6 du BRIEF).
--
-- Aucune donnée personnelle ; aucun email ni notification ; aucun SQL dynamique.

-- 1. Tables

create table public.signalement (
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,
  ecran text not null check (ecran in (
    'saisie_dimanche', 'saisie_mois', 'saisie_session', 'saisie_fij', 'saisie_fij_statistiques',
    'saisie_evenement', 'saisie_reunion', 'autre')),
  texte text not null,                                      -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint signalement_texte_check check (char_length(texte) between 10 and 280 and texte = btrim(texte))
);
create index on public.signalement (ministere_id, saisi_le desc);
create index on public.signalement (saisi_le desc);

-- La clôture d'EJP Tech : une seule par signalement (unique), définitive, comme une décision de
-- validation. Commentaire facultatif.
create table public.signalement_suivi (
  id uuid primary key default gen_random_uuid(),
  signalement_id uuid not null unique references public.signalement,
  commentaire text,                                         -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint signalement_suivi_commentaire_check check (
    commentaire is null or (char_length(commentaire) between 10 and 280 and commentaire = btrim(commentaire)))
);

alter table public.signalement enable row level security;
alter table public.signalement_suivi enable row level security;

create trigger forcer_auteur before insert on public.signalement
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.signalement
  for each row execute function private.refuser_modification_sauf_masquage('texte');
create trigger ajout_seulement_vider before truncate on public.signalement
  for each statement execute function private.refuser_modification();

create trigger forcer_auteur before insert on public.signalement_suivi
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.signalement_suivi
  for each row execute function private.refuser_modification_sauf_masquage('commentaire');
create trigger ajout_seulement_vider before truncate on public.signalement_suivi
  for each statement execute function private.refuser_modification();

-- Lecture : le ministère auteur et EJP Tech. La politique de signalement_suivi relit
-- signalement sous la RLS du lecteur ; celle de signalement ne relit pas signalement_suivi :
-- pas de récursion. Aucune politique d'ajout : les fonctions écrivent.
create policy lecture on public.signalement for select to authenticated using (
  ministere_id = (select private.mon_ministere())
  or (select private.mon_type()) = 'admin_plateforme');

create policy lecture on public.signalement_suivi for select to authenticated using (
  (select private.mon_type()) = 'admin_plateforme'
  or exists (select 1 from public.signalement s
              where s.id = signalement_suivi.signalement_id
                and s.ministere_id = (select private.mon_ministere())));

create policy double_authentification on public.signalement as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.signalement_suivi as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.signalement, public.signalement_suivi from public, anon, authenticated, service_role;
grant select on public.signalement, public.signalement_suivi to authenticated;

-- 2. Signaler une difficulté (ministère actif seulement)

create function private.signaler_difficulte(p_ecran text, p_texte text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_texte text;
  v_message text;
  v_id uuid;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if private.mon_type() is distinct from 'ministere' or v_ministere is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if p_ecran is null or p_ecran not in ('saisie_dimanche', 'saisie_mois', 'saisie_session', 'saisie_fij',
                                        'saisie_fij_statistiques', 'saisie_evenement', 'saisie_reunion', 'autre') then
    raise exception 'Choisissez l''écran concerné dans la liste.';
  end if;
  v_texte := btrim(coalesce(p_texte, ''));
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

  insert into public.signalement (ministere_id, ecran, texte)
  values (v_ministere, p_ecran, v_texte)
  returning id into v_id;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_ministere, 'difficulte_signalee', 'signalement', v_id,
          jsonb_build_object('ecran', p_ecran));
  return v_id;
end $$;

create function public.signaler_difficulte(p_ecran text, p_texte text)
returns uuid language sql security invoker set search_path = '' as $$
  select private.signaler_difficulte(p_ecran, p_texte);
$$;

-- 3. Clore un signalement (EJP Tech seul, une fois)

create function private.clore_signalement(p_signalement_id uuid, p_commentaire text)
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
  if exists (select 1 from public.signalement_suivi x where x.signalement_id = p_signalement_id) then
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

  insert into public.signalement_suivi (signalement_id, commentaire)
  values (p_signalement_id, v_commentaire);

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_signalement.ministere_id, 'signalement_clos',
          'signalement', p_signalement_id,
          jsonb_build_object('ecran', v_signalement.ecran, 'avec_commentaire', v_commentaire is not null));
end $$;

create function public.clore_signalement(p_signalement_id uuid, p_commentaire text default null)
returns void language sql security invoker set search_path = '' as $$
  select private.clore_signalement(p_signalement_id, p_commentaire);
$$;

-- 4. Modération

-- Auteur d'un texte relu : version de B8, plus le texte d'un signalement et le commentaire
-- d'une clôture. Même signature : create or replace garde le propriétaire et les droits.
create or replace function private.auteur_texte(p_cible text, p_cible_id uuid) returns uuid
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
  elsif p_cible = 'demande_indicateur' then
    select d.saisi_par into v_auteur from public.demande_indicateur d
     where d.id = p_cible_id and d.pourquoi is not null
       for update;
  elsif p_cible = 'validation' then
    select v.saisi_par into v_auteur from public.validation v
     where v.id = p_cible_id and v.motif is not null
       for update;
  elsif p_cible = 'precision_sensible' then
    select p.saisi_par into v_auteur from public.precision_sensible p
     where p.id = p_cible_id
       for update;
  elsif p_cible = 'signalement' then
    select s.saisi_par into v_auteur from public.signalement s
     where s.id = p_cible_id
       for update;
  elsif p_cible = 'signalement_suivi' then
    select x.saisi_par into v_auteur from public.signalement_suivi x
     where x.id = p_cible_id and x.commentaire is not null
       for update;
  end if;
  if v_auteur is null then
    raise exception 'Ce texte n''existe pas ou ne contient aucun champ libre.';
  end if;
  return v_auteur;
end $$;

-- Ministère de la ligne de journal d'un texte de signalement : celui du signalement (pour le
-- commentaire d'une clôture, écrit par EJP Tech, celui du signalement clos), pour que le
-- ministère auteur la lise comme sa clôture.
create function private.ministere_du_signalement(p_cible text, p_cible_id uuid) returns uuid
language sql stable set search_path = '' as $$
  select case p_cible
    when 'signalement' then (select s.ministere_id from public.signalement s where s.id = p_cible_id)
    when 'signalement_suivi' then (select s.ministere_id from public.signalement_suivi x
                                     join public.signalement s on s.id = x.signalement_id
                                    where x.id = p_cible_id)
  end
$$;

-- Relecture : version de B8 ; le ministère de la ligne de journal est celui de l'auteur du
-- texte, celui de la précision pour une précision, celui du signalement pour un signalement.
create or replace function private.marquer_relu(p_cible text, p_cible_id uuid)
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
  values ((select auth.uid()),
          case when p_cible = 'precision_sensible'
               then (select p.ministere_id from public.precision_sensible p where p.id = p_cible_id)
               when p_cible in ('signalement', 'signalement_suivi')
               then private.ministere_du_signalement(p_cible, p_cible_id)
               else (select c.ministere_id from public.compte c where c.user_id = v_auteur)
          end,
          'texte_relu', p_cible, p_cible_id, '{}');
end $$;

-- Masquage : les dix couples de B8 repris tels quels, puis (signalement, texte) et
-- (signalement_suivi, commentaire), sous le réglage local pilotage.masquage que le trigger de
-- la table accepte, retiré aussitôt.
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
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère concerné : celui de la précision ou du signalement, sinon celui du compte auteur
  -- (null pour le berger, le conseil et EJP Tech, auteur du motif d'un refus).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()),
          coalesce(v_ministere, (select c.ministere_id from public.compte c where c.user_id = v_auteur)),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- 5. Journal

-- Lecture du journal : celle de B8 (20261009105000), plus deux conditions.
-- - T39 : les lignes des signalements (difficulte_signalee, signalement_clos, et texte_relu ou
--   texte_masque de cible signalement ou signalement_suivi) sont retirées au berger et au
--   conseil (EJP Tech les garde) et à l'administration. Le ministère auteur les garde par sa
--   branche (ministere_id).
-- - P51 : l'administration ne lit plus les lignes texte_relu et texte_masque de cible
--   demande_indicateur ; le berger, le conseil, EJP Tech et le ministère auteur les gardent.
drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  ((select private.lit_tout())
   and ((coalesce(cible, '') not in ('signalement', 'signalement_suivi')
         and action not in ('difficulte_signalee', 'signalement_clos'))
        or (select private.mon_type()) = 'admin_plateforme'))
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail)
      and coalesce(cible, '') not in ('precision_sensible', 'signalement', 'signalement_suivi')
      and action not in ('difficulte_signalee', 'signalement_clos')
      and (coalesce(cible, '') <> 'demande_indicateur' or action not in ('texte_relu', 'texte_masque')))
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid()))));

-- v_journal : version de B8, plus la cible signalement (code de l'écran, lu sous la RLS du
-- lecteur : le ministère auteur et EJP Tech ; jamais le texte), et les mêmes conditions que la
-- politique de lecture : P51 pour l'administration, T39 pour tout lecteur autre que EJP Tech
-- et un ministère (dont la RLS ne rend que les lignes de sa fiche et de son compte). Mêmes
-- colonnes.
create or replace view public.v_journal with (security_invoker = true) as
select j.id, j.le, j.compte, j.ministere_id, j.action, j.cible, j.cible_id, j.detail,
       case when j.compte is null then 'Système' else a.libelle end as compte_libelle,
       a.ministere_id as auteur_ministere_id,
       m.nom as ministere_nom,
       case j.cible
         when 'point_attention' then (select p.titre from public.point_attention p where p.id = j.cible_id)
         when 'point_suivi' then (select p.titre from public.point_suivi s
                                    join public.point_attention p on p.id = s.point_id
                                   where s.id = j.cible_id)
         when 'evenement' then (select e.titre from public.evenement e where e.id = j.cible_id)
         when 'reunion' then (select r.objet from public.reunion r where r.id = j.cible_id)
         when 'session' then (select x.intitule from public.session x where x.id = j.cible_id)
         when 'compte' then (select c.libelle from public.compte c where c.user_id = j.cible_id)
         when 'ministere' then (select x.nom from public.ministere x where x.id = j.cible_id)
         when 'indicateur' then (select i.libelle from public.indicateur i where i.id = j.cible_id)
         when 'demande_indicateur' then (select i.libelle from public.demande_indicateur d
                                           join public.indicateur i on i.id = d.indicateur_id
                                          where d.id = j.cible_id)
         when 'validation' then (select i.libelle from public.validation v
                                   join public.demande_indicateur d on d.id = v.demande_id
                                   join public.indicateur i on i.id = d.indicateur_id
                                  where v.id = j.cible_id)
         when 'precision_sensible' then (
           select 'Précision : ' || i.libelle || ', '
                  || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
                            'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from p.mois)::integer]
                  || ' ' || extract(year from p.mois)::integer
             from public.precision_sensible p
             join public.indicateur i on i.id = p.indicateur_id
            where p.id = j.cible_id)
         when 'signalement' then (select s.ecran from public.signalement s where s.id = j.cible_id)
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
where ((select private.mon_type()) is distinct from 'admin_eglise'
       or (private.journal_lisible_administration(j.action, j.detail)
           and coalesce(j.cible, '') <> 'precision_sensible'
           and (coalesce(j.cible, '') <> 'demande_indicateur' or j.action not in ('texte_relu', 'texte_masque'))))
  and ((coalesce(j.cible, '') not in ('signalement', 'signalement_suivi')
        and j.action not in ('difficulte_signalee', 'signalement_clos'))
       or (select private.mon_type()) in ('admin_plateforme', 'ministere'));

-- 6. Fraîcheur : version de 20261005172228_droits_lecture_ejp_tech.sql ; la dernière ligne de
-- journal écrite par un compte du ministère, hors signalement (T39, règle 6). Même signature :
-- create or replace garde le propriétaire, les droits sont redonnés ci-dessous.
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
         -- sauf un signalement, qui n'est pas une saisie.
         (select max(j.le) from public.journal j
            join public.compte c on c.user_id = j.compte
           where c.ministere_id = m.id
             and j.action <> 'difficulte_signalee'),
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

-- 7. Droits des fonctions : rien pour public, anon ni service_role ; authenticated exécute les
-- fonctions de l'API et le tableau des ministères (lu par sa vue). ministere_du_signalement ne
-- s'appelle qu'au nom du propriétaire (marquer_relu, masquer_texte).
revoke all on function
  private.signaler_difficulte(text, text),
  public.signaler_difficulte(text, text),
  private.clore_signalement(uuid, text),
  public.clore_signalement(uuid, text),
  private.ministere_du_signalement(text, uuid),
  private.tableau_ministeres()
  from public, anon, authenticated, service_role;
grant execute on function
  private.signaler_difficulte(text, text),
  public.signaler_difficulte(text, text),
  private.clore_signalement(uuid, text),
  public.clore_signalement(uuid, text),
  private.tableau_ministeres()
  to authenticated;
