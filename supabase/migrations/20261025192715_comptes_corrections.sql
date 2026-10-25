-- Corrections de l'écran 13, « Ministères et comptes » (décision T74 de docs/decisions.md,
-- décisions de la personne responsable du 25 octobre 2026). EJP Tech avait créé le ministère
-- « EJP TECH » avec une adresse mal tapée : la seule action possible, « Désactiver », a désactivé
-- tout le ministère. Deux gestes nouveaux, par deux Edge Functions (corriger-adresse et
-- supprimer-ministere), et deux lectures pour l'écran.
--
-- 1. Corriger l'adresse d'un compte jamais activé (aucun facteur TOTP vérifié : états
--    « Invitation envoyée » et « À activer »), pour tous les types de comptes de l'écran.
--    L'adresse n'est gardée que dans Auth (auth.users.email, lue par private.etat_comptes) :
--    aucune table publique ne la copie. L'Edge Function change l'adresse et le mot de passe
--    (valeur aléatoire) par l'API d'administration Auth, puis private.serveur_corriger_adresse
--    vérifie que l'adresse d'Auth est bien la nouvelle, retire sa confirmation (l'API ne la retire
--    pas, et l'invitation ne repart que vers une adresse non confirmée), supprime les sessions et
--    écrit le journal adresse_corrigee (détail : le type du compte, jamais l'adresse). Le
--    ministère, ses indicateurs et son historique ne bougent pas.
-- 2. Supprimer un ministère vide (private.refus_suppression_ministere dit pourquoi un ministère
--    ne se supprime pas) : aucune saisie (chiffres, présences, carte des FIJ, statistiques par
--    département, répartitions et précisions sensibles), aucun point créé ni mentionné, aucun
--    événement créé ni mentionné, aucune réunion, aucun signalement, aucune demande, validation
--    ni retrait d'indicateur, aucune session déjà saisie qui l'attend, aucune trace de ses comptes
--    (journal, déclaration, conditions), aucun compte activé ; jamais FIJ ni Coordination (codes
--    posés par les migrations, Proposé). Sont supprimés : ses indicateurs (et les termes de ses
--    calculs), ses liens à une liste de prévus (T72), ses places dans les sessions sans saisie,
--    ses comptes (sessions comprises), puis le ministère. L'Edge Function supprime ensuite les
--    utilisateurs Auth des comptes rendus par la base. Une ligne de journal ministere_supprime
--    garde le nom du ministère (décision T74), jamais une adresse.
-- 3. Le journal ne perd rien : ni ses lignes, ni le ministère qu'elles concernent. Sa clé
--    étrangère vers ministere (sans action) aurait interdit toute suppression : elle devient un
--    contrôle à l'ajout (private.controler_journal_ministere, même verrou que la clé étrangère),
--    et le journal garde l'identifiant d'un ministère supprimé. v_journal lit alors son nom dans la
--    ligne ministere_supprime (index partiel).
-- 4. Tables en ajout seulement touchées par la suppression : de la règle 1 du BRIEF, seulement
--    indicateur_terme (termes des calculs propres du ministère : de la configuration, jamais une
--    saisie) ; en plus, indicateur (« ne se supprime pas : il se retire ») et
--    private.ministere_modele (T72). Leur refus garde son message, avec une seule exception : une
--    suppression faite par private.serveur_supprimer_ministere, sous le réglage local de
--    transaction pilotage.suppression_ministere (identifiant du ministère supprimé), et seulement
--    pour les lignes de ce ministère. Même modèle que pilotage.masquage : aucun client ne pose ce
--    réglage (l'API n'expose ni set_config ni le schéma private), et aucun rôle de l'API n'a le
--    droit delete sur ces tables. Toute autre table qui viserait encore le ministère ou ses
--    comptes garde sa clé étrangère : la suppression échoue alors (ministere_non_vide).
-- 5. Lectures de l'écran (EJP Tech seul, en aal2) : v_ministeres_supprimables (le bouton
--    « Supprimer » n'apparaît que pour eux) et v_comptes_jamais_actives (« Réactiver » propose de
--    changer l'adresse).
--
-- Même modèle que les migrations comptes_* : private.serveur_<nom> en security definer contrôle
-- l'appelant et sa session (private.controler_appel, décision T15), public.serveur_<nom> en
-- security invoker, d'une ligne ; exécutables par service_role seulement (la clé secrète des
-- Edge Functions). Les refus lèvent un code court que l'Edge Function traduit.

-- 1. Journal

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
    'adresse_corrigee', 'ministere_supprime'));

-- L'administration de l'église lit ces deux gestes, comme les autres gestes sur les comptes
-- (version de 20261025003417_ministere_modele.sql, plus les deux codes). Même signature.
create or replace function private.journal_lisible_administration(p_action text, p_detail jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    -- Chiffres : tous les envois, sauf une ligne ancienne qui porte la valeur d'un indicateur
    -- propre ou une ligne d'indicateur sensible.
    when p_action = 'mesure_saisie' then not exists (
      select 1
        from jsonb_array_elements(case when jsonb_typeof(p_detail -> 'lignes') = 'array'
                                       then p_detail -> 'lignes' else '[]'::jsonb end) as l(ligne)
        join public.indicateur i on i.id = (l.ligne ->> 'indicateur_id')::uuid
       where i.sensible or (i.ministere_id is not null and l.ligne ? 'valeur'))
    -- Comptes, ministères, sessions et présences, carte des FIJ, configuration des indicateurs,
    -- actions techniques.
    else p_action = any (array[
      'fij_saisie', 'participation_saisie',
      'session_declaree', 'session_modifiee', 'session_supprimee',
      'ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive', 'compte_reactive',
      'double_auth_reinitialisee', 'texte_relu', 'texte_masque',
      'indicateur_cree', 'indicateurs_prevus_crees', 'indicateur_corrige', 'indicateur_valide',
      'indicateur_refuse', 'indicateur_retire', 'modele_prevus_choisi',
      'adresse_corrigee', 'ministere_supprime'])
  end
$$;

-- Ministère concerné : la clé étrangère devient un contrôle à l'ajout. Comme elle, il verrouille
-- la ligne du ministère (for key share) jusqu'à la fin de la transaction : une suppression en
-- cours attend, puis l'ajout échoue. Security definer : for key share demande le droit update.
alter table public.journal drop constraint journal_ministere_id_fkey;

create function private.controler_journal_ministere() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ministere_id is not null then
    perform 1 from public.ministere m where m.id = new.ministere_id for key share;
    if not found then
      raise exception 'Ce ministère n''existe pas.';
    end if;
  end if;
  return new;
end $$;

create trigger controler_ministere before insert on public.journal
  for each row execute function private.controler_journal_ministere();

-- Nom d'un ministère supprimé, lu par v_journal.
create index journal_ministere_supprime_idx on public.journal (cible_id) where action = 'ministere_supprime';

-- v_journal : version de 20261014090000_retrait_par_le_ministere.sql, mêmes colonnes. Seul
-- changement : pour un ministère supprimé, son nom (ministere_nom) et le texte des lignes qui
-- visaient le ministère ou son compte viennent de la ligne ministere_supprime (lue sous la RLS du
-- lecteur). Les autres lignes ne changent pas.
create or replace view public.v_journal with (security_invoker = true) as
select j.id, j.le, j.compte, j.ministere_id, j.action, j.cible, j.cible_id, j.detail,
       case when j.compte is null then 'Système' else a.libelle end as compte_libelle,
       a.ministere_id as auteur_ministere_id,
       coalesce(m.nom, ms.nom) as ministere_nom,
       case j.cible
         when 'point_attention' then (select p.titre from public.point_attention p where p.id = j.cible_id)
         when 'point_suivi' then (select p.titre from public.point_suivi s
                                    join public.point_attention p on p.id = s.point_id
                                   where s.id = j.cible_id)
         when 'evenement' then (select e.titre from public.evenement e where e.id = j.cible_id)
         when 'reunion' then (select r.objet from public.reunion r where r.id = j.cible_id)
         when 'session' then (select x.intitule from public.session x where x.id = j.cible_id)
         when 'compte' then coalesce((select c.libelle from public.compte c where c.user_id = j.cible_id),
                                     left('Ministère ' || ms.nom, 60))
         when 'ministere' then coalesce((select x.nom from public.ministere x where x.id = j.cible_id),
                                        case when j.cible_id = j.ministere_id then ms.nom end)
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
         when 'signalement_suivi' then (select s.ecran from public.signalement_suivi x
                                          join public.signalement s on s.id = x.signalement_id
                                         where x.id = j.cible_id)
         when 'retrait_indicateur' then (select i.libelle from public.retrait_indicateur r
                                           join public.indicateur i on i.id = r.indicateur_id
                                          where r.id = j.cible_id)
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
-- Seulement quand le ministère n'existe plus (filtre évalué une fois par ligne).
left join lateral (
  select s.detail ->> 'nom' as nom
    from public.journal s
   where m.id is null and j.ministere_id is not null
     and s.action = 'ministere_supprime' and s.cible_id = j.ministere_id
   order by s.id desc
   limit 1) ms on true
where ((select private.mon_type()) is distinct from 'admin_eglise'
       or (private.journal_lisible_administration(j.action, j.detail)
           and coalesce(j.cible, '') <> 'precision_sensible'
           and (j.action not in ('texte_relu', 'texte_masque')
                or coalesce(j.cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi',
                                                 'evenement', 'reunion', 'retrait_indicateur'))))
  and ((coalesce(j.cible, '') not in ('signalement', 'signalement_suivi')
        and j.action not in ('difficulte_signalee', 'signalement_clos'))
       or (select private.mon_type()) in ('admin_plateforme', 'ministere'));

-- 2. Inaltérabilité : la seule exception, la suppression d'un ministère vide

-- Refus d'origine (private.refuser_modification et, pour un indicateur, le message de
-- private.controler_indicateur), sauf la suppression des lignes du ministère que
-- private.serveur_supprimer_ministere supprime, sous pilotage.suppression_ministere.
create function private.refuser_modification_sauf_ministere_supprime() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_supprime text := nullif(current_setting('pilotage.suppression_ministere', true), '');
  v_ministere uuid;
begin
  if tg_op = 'DELETE' and v_supprime is not null then
    if tg_table_name = 'indicateur_terme' then
      select i.ministere_id into v_ministere from public.indicateur i where i.id = old.calcul_id;
    else
      v_ministere := old.ministere_id;    -- indicateur, ministere_modele
    end if;
    if v_ministere is not null and v_ministere::text = v_supprime then
      return old;
    end if;
  end if;
  if tg_table_name = 'indicateur' then
    raise exception 'Un indicateur ne se supprime pas : il se retire.' using errcode = '42501';
  end if;
  raise exception 'La table % est en ajout seul : elle ne se modifie pas et ne s''efface pas.', tg_table_name
    using errcode = '42501';
end $$;

-- indicateur : controler_indicateur garde l'ajout et la mise à jour (son refus de suppression
-- n'est plus atteint) ; la suppression passe par le trigger ci-dessus. La troncature reste
-- refusée (controler_indicateur_vider).
drop trigger controler_indicateur on public.indicateur;
create trigger controler_indicateur before insert or update on public.indicateur
  for each row execute function private.controler_indicateur();
create trigger refuser_suppression before delete on public.indicateur
  for each row execute function private.refuser_modification_sauf_ministere_supprime();

-- indicateur_terme et private.ministere_modele : même trigger ajout_seulement (avant mise à jour
-- et suppression), avec la fonction ci-dessus. La troncature reste refusée.
drop trigger ajout_seulement on public.indicateur_terme;
create trigger ajout_seulement before update or delete on public.indicateur_terme
  for each row execute function private.refuser_modification_sauf_ministere_supprime();
drop trigger ajout_seulement on private.ministere_modele;
create trigger ajout_seulement before update or delete on private.ministere_modele
  for each row execute function private.refuser_modification_sauf_ministere_supprime();

-- 3. Aides internes (exécutées seulement au nom du propriétaire)

-- Compte activé : un facteur TOTP vérifié (même règle que l'état « Activée » de
-- private.etat_comptes). La colonne secret n'est jamais lue.
create function private.compte_active(p_user_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from auth.mfa_factors f
                  where f.user_id = p_user_id and f.factor_type = 'totp' and f.status = 'verified')
$$;

-- Pourquoi un ministère ne se supprime pas ; null s'il se supprime.
create function private.refus_suppression_ministere(p_ministere_id uuid) returns text
language sql stable set search_path = '' as $$
  select case
    when p_ministere_id is null
      or not exists (select 1 from public.ministere m where m.id = p_ministere_id) then 'ministere_inconnu'
    -- FIJ et Coordination : posés par les migrations, lus par leur code (Proposé, T74).
    when exists (select 1 from public.ministere m where m.id = p_ministere_id and m.code is not null)
      then 'ministere_de_reference'
    when exists (select 1 from public.compte c
                  where c.ministere_id = p_ministere_id and private.compte_active(c.user_id))
      then 'compte_deja_active'
    when exists (select 1 from public.mesure x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.participation x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.fij_departement x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.fij_statistique x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.ventilation_sensible x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.precision_sensible x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.point_attention x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.point_mention x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.evenement x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.evenement_mention x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.reunion x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.signalement x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.demande_indicateur x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.validation x where x.ministere_id = p_ministere_id)
      or exists (select 1 from public.retrait_indicateur x where x.ministere_id = p_ministere_id)
      -- Une session déjà saisie qui l'attend : sa complétude passée ne change pas.
      or exists (select 1 from public.session_attendu a
                  where a.ministere_id = p_ministere_id
                    and exists (select 1 from public.participation p where p.session_id = a.session_id))
      -- Ce qu'un de ses comptes a fait ou déclaré.
      or exists (select 1 from public.compte c
                  where c.ministere_id = p_ministere_id
                    and (exists (select 1 from public.journal j where j.compte = c.user_id)
                         or exists (select 1 from public.intervenant x where x.compte = c.user_id)
                         or exists (select 1 from public.acceptation_conditions x where x.compte = c.user_id)))
      then 'ministere_non_vide'
  end
$$;

-- Refus d'une suppression, chacun avec son code court (lu par l'Edge Function).
create function private.controler_suppression_ministere(p_ministere_id uuid) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_refus text := private.refus_suppression_ministere(p_ministere_id);
begin
  if v_refus = 'ministere_inconnu' then
    raise exception 'ministere_inconnu';
  elsif v_refus = 'ministere_de_reference' then
    raise exception 'ministere_de_reference';
  elsif v_refus = 'compte_deja_active' then
    raise exception 'compte_deja_active';
  elsif v_refus is not null then
    raise exception 'ministere_non_vide';
  end if;
end $$;

-- Correction d'une adresse : compte existant, autre que l'appelant, autre que l'administration
-- de l'église, actif (controler_cible), jamais activé, et nouvelle adresse libre (aucun autre
-- utilisateur Auth ne l'a, même sans compte : Auth la refuserait). L'adresse actuelle du compte
-- est acceptée : une correction interrompue se refait. L'adresse n'est lue que pour ces
-- contrôles, jamais écrite.
create function private.controler_correction_adresse(p_appelant uuid, p_user_id uuid, p_email text)
returns public.compte
language plpgsql stable set search_path = '' as $$
declare
  v_compte public.compte;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email = '' or char_length(v_email) > 254 or position('@' in v_email) < 2 then
    raise exception 'requete_invalide';
  end if;
  v_compte := private.controler_cible(p_appelant, p_user_id);
  if private.compte_active(p_user_id) then
    raise exception 'compte_deja_active';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email and u.id <> p_user_id) then
    raise exception 'adresse_deja_utilisee';
  end if;
  return v_compte;
end $$;

-- 4. Lectures de l'écran 13 (EJP Tech seul, en aal2 ; rien pour les autres profils)

create function private.ministeres_supprimables() returns table (ministere_id uuid)
language sql stable security definer set search_path = '' as $$
  select m.id
    from public.ministere m
   where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and coalesce(private.mon_type() = 'admin_plateforme', false)
     and private.refus_suppression_ministere(m.id) is null
$$;

create view public.v_ministeres_supprimables with (security_invoker = true) as
select v.ministere_id from private.ministeres_supprimables() as v;

-- Comptes jamais activés, désactivés compris (hors administration de l'église).
create function private.comptes_jamais_actives() returns table (user_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.user_id
    from public.compte c
   where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and coalesce(private.mon_type() = 'admin_plateforme', false)
     and c.type <> 'admin_eglise'
     and not private.compte_active(c.user_id)
$$;

create view public.v_comptes_jamais_actives with (security_invoker = true) as
select v.user_id from private.comptes_jamais_actives() as v;

-- 5. Fonctions serveur

-- corriger-adresse, contrôles sans écriture (avant de toucher à Auth).
create function private.serveur_controler_correction_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.controler_correction_adresse(p_appelant, p_user_id, p_email);
end $$;

-- corriger-adresse, après le changement de l'adresse et du mot de passe dans Auth : l'adresse
-- d'Auth doit être la nouvelle ; sa confirmation est retirée (l'invitation ne part que vers une
-- adresse non confirmée, et personne n'a confirmé celle-ci), les sessions de l'ancienne adresse
-- sont supprimées, puis le journal. Une activation faite entre-temps par l'ancienne adresse est
-- refusée (compte_deja_active).
create function private.serveur_corriger_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_compte public.compte;
begin
  perform private.controler_appel(p_appelant, p_session);
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  perform 1 from public.compte c where c.user_id = p_user_id for update;
  v_compte := private.controler_correction_adresse(p_appelant, p_user_id, p_email);
  if not exists (select 1 from auth.users u
                  where u.id = p_user_id and lower(u.email) = lower(btrim(p_email))) then
    raise exception 'adresse_non_modifiee';
  end if;
  update auth.users set email_confirmed_at = null
   where id = p_user_id and email_confirmed_at is not null;
  perform private.revoquer_sessions(p_user_id);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, v_compte.ministere_id, 'adresse_corrigee', 'compte', p_user_id,
          jsonb_build_object('type', v_compte.type));
end $$;

-- supprimer-ministere, contrôles sans écriture.
create function private.serveur_controler_suppression_ministere(
  p_appelant uuid, p_session uuid, p_ministere_id uuid
) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.controler_appel(p_appelant, p_session);
  perform private.controler_suppression_ministere(p_ministere_id);
end $$;

-- supprimer-ministere : contrôle sous verrou, journal (avant la suppression : le contrôle du
-- journal exige que le ministère existe à l'ajout), puis les suppressions. Rend les
-- identifiants des comptes supprimés : l'Edge Function supprime ensuite leurs utilisateurs Auth.
-- Une clé étrangère qui vise encore le ministère ou un de ses comptes annule tout
-- (ministere_non_vide).
create function private.serveur_supprimer_ministere(
  p_appelant uuid, p_session uuid, p_ministere_id uuid
) returns uuid[]
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ministere public.ministere;
  v_comptes uuid[];
  v_indicateurs integer;
  v_compte uuid;
begin
  perform private.controler_appel(p_appelant, p_session);
  perform pg_advisory_xact_lock(hashtext('pilotage_ejp.comptes'));
  select m.* into v_ministere from public.ministere m where m.id = p_ministere_id for update;
  perform private.controler_suppression_ministere(p_ministere_id);
  perform 1 from public.compte c where c.ministere_id = p_ministere_id for update;
  select coalesce(array_agg(c.user_id order by c.user_id), array[]::uuid[]) into v_comptes
    from public.compte c where c.ministere_id = p_ministere_id;
  select count(*)::integer into v_indicateurs from public.indicateur i where i.ministere_id = p_ministere_id;

  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (p_appelant, p_ministere_id, 'ministere_supprime', 'ministere', p_ministere_id,
          jsonb_build_object('nom', v_ministere.nom, 'indicateurs', v_indicateurs,
                             'comptes', cardinality(v_comptes)));

  begin
    perform set_config('pilotage.suppression_ministere', p_ministere_id::text, true);
    delete from public.indicateur_terme t
     using public.indicateur i
     where i.id = t.calcul_id and i.ministere_id = p_ministere_id;
    delete from public.indicateur where ministere_id = p_ministere_id;
    delete from private.ministere_modele where ministere_id = p_ministere_id;
    perform set_config('pilotage.suppression_ministere', '', true);
    delete from public.session_attendu where ministere_id = p_ministere_id;
    foreach v_compte in array v_comptes loop
      perform private.revoquer_sessions(v_compte);
    end loop;
    delete from public.compte where ministere_id = p_ministere_id;
    delete from public.ministere where id = p_ministere_id;
  exception when foreign_key_violation then
    raise exception 'ministere_non_vide';
  end;
  return v_comptes;
end $$;

-- Fonctions public, d'une ligne, en security invoker

create function public.serveur_controler_correction_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_correction_adresse(p_appelant, p_session, p_user_id, p_email);
$$;

create function public.serveur_corriger_adresse(
  p_appelant uuid, p_session uuid, p_user_id uuid, p_email text
) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_corriger_adresse(p_appelant, p_session, p_user_id, p_email);
$$;

create function public.serveur_controler_suppression_ministere(
  p_appelant uuid, p_session uuid, p_ministere_id uuid
) returns void
language sql stable security invoker set search_path = '' as $$
  select private.serveur_controler_suppression_ministere(p_appelant, p_session, p_ministere_id);
$$;

create function public.serveur_supprimer_ministere(
  p_appelant uuid, p_session uuid, p_ministere_id uuid
) returns uuid[]
language sql volatile security invoker set search_path = '' as $$
  select private.serveur_supprimer_ministere(p_appelant, p_session, p_ministere_id);
$$;

-- 6. Droits : aides internes et triggers à personne ; lectures à authenticated (elles ne rendent
-- rien hors EJP Tech en aal2) ; fonctions serveur à service_role seulement.

revoke all on function
  private.controler_journal_ministere(),
  private.refuser_modification_sauf_ministere_supprime(),
  private.compte_active(uuid),
  private.refus_suppression_ministere(uuid),
  private.controler_suppression_ministere(uuid),
  private.controler_correction_adresse(uuid, uuid, text)
from public, anon, authenticated, service_role;

revoke all on function
  private.ministeres_supprimables(),
  private.comptes_jamais_actives()
from public, anon, authenticated, service_role;
grant execute on function
  private.ministeres_supprimables(),
  private.comptes_jamais_actives()
to authenticated;
revoke all on public.v_ministeres_supprimables, public.v_comptes_jamais_actives
  from public, anon, authenticated, service_role;
grant select on public.v_ministeres_supprimables, public.v_comptes_jamais_actives to authenticated;

revoke all on function
  private.serveur_controler_correction_adresse(uuid, uuid, uuid, text),
  private.serveur_corriger_adresse(uuid, uuid, uuid, text),
  private.serveur_controler_suppression_ministere(uuid, uuid, uuid),
  private.serveur_supprimer_ministere(uuid, uuid, uuid),
  public.serveur_controler_correction_adresse(uuid, uuid, uuid, text),
  public.serveur_corriger_adresse(uuid, uuid, uuid, text),
  public.serveur_controler_suppression_ministere(uuid, uuid, uuid),
  public.serveur_supprimer_ministere(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function
  private.serveur_controler_correction_adresse(uuid, uuid, uuid, text),
  private.serveur_corriger_adresse(uuid, uuid, uuid, text),
  private.serveur_controler_suppression_ministere(uuid, uuid, uuid),
  private.serveur_supprimer_ministere(uuid, uuid, uuid),
  public.serveur_controler_correction_adresse(uuid, uuid, uuid, text),
  public.serveur_corriger_adresse(uuid, uuid, uuid, text),
  public.serveur_controler_suppression_ministere(uuid, uuid, uuid),
  public.serveur_supprimer_ministere(uuid, uuid, uuid)
to service_role;
