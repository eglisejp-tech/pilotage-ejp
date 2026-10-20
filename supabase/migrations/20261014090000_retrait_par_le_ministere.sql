-- Retrait d'un indicateur par le ministère qui l'a ajouté (décision T62 de docs/decisions.md,
-- réponse écrite de la personne responsable du 13 octobre 2026 à P53, proposition 1 : « Oui, un
-- ministère peut retirer lui-même un indicateur, mais doit expliquer pourquoi, et ça doit
-- apparaître au niveau d'EJP Tech. »). Après T60 (retirer_indicateur réservé à EJP Tech).
--
-- 1. Table public.retrait_indicateur, en ajout seulement : un retrait d'un ajout de ministère, par
--    ce ministère, avec son motif (10 à 280 caractères, texte libre sans donnée personnelle ni
--    crochets). Une ligne par indicateur. Seule exception à l'ajout seulement : le masquage du
--    motif par masquer_texte (réglage local pilotage.masquage). Lue par le ministère qui l'a
--    écrite et par EJP Tech, par personne d'autre. Aucune politique d'ajout : la fonction écrit.
--    Les retraits d'EJP Tech gardent leur motif de la liste dans indicateur.retrait_motif.
-- 2. indicateur.retrait_motif gagne le code « ministere » (posé par la base, jamais choisi), et
--    ce code n'existe que pour un ajout de ministère (origine « ministere »).
-- 3. retirer_mon_indicateur(p_indicateur_id, p_motif) : compte de ministère actif, sur sa fiche,
--    un indicateur ajouté par lui (à valider : « Retirer la demande » ; validé : « Retirer »).
--    Les prévus de la coordination et les ajouts d'EJP Tech sont refusés. Les saisies restent.
--    La source d'un calcul actif ou à valider est refusée, avec le nom du calcul : un calcul
--    d'EJP Tech ne disparaît pas sans lui (configuration-indicateurs.md, 4.2 et 7.3, contact EJP
--    Tech depuis T60). Une demande à valider sort de la file d'EJP Tech (v_a_valider ne garde
--    que les ajouts à valider). Une ligne de journal indicateur_retire, sans le texte du motif.
-- 4. Contraintes du journal et de la modération réécrites (leurs migrations sont figées) :
--    journal_cible_check et moderation_cible_check gagnent retrait_indicateur,
--    moderation_cible_champ_check gagne le couple (retrait_indicateur, motif), avec l'union de
--    tous les codes actuels (20261009105000_sensibles_precisions_repartitions.sql).
-- 5. masquer_texte recréée depuis sa dernière version (20261009110000_signalements.sql), avec le
--    couple (retrait_indicateur, motif). Le motif n'entre pas dans la file de la Modération,
--    comme le « Pourquoi » et le motif d'un refus : EJP Tech le masque depuis l'écran Indicateurs.
-- 6. Politique de lecture de journal et v_journal recréées depuis leur dernière version
--    (20261009120000_lot_i_correctifs.sql) : l'administration ne lit pas les lignes texte_relu et
--    texte_masque de cible retrait_indicateur (comme P51 et T47) ; v_journal donne pour cette
--    cible le libellé actuel de l'indicateur, sous la RLS du lecteur, jamais le motif.
--
-- Aucune donnée personnelle ; aucune date du jour dans une contrainte ; aucun SQL dynamique.

-- 1. Table

create table public.retrait_indicateur (
  id uuid primary key default gen_random_uuid(),
  indicateur_id uuid not null unique references public.indicateur,
  ministere_id uuid not null references public.ministere,
  -- « en_attente » : la demande est retirée avant la décision d'EJP Tech ; « actif » : un ajout validé.
  etat_avant text not null check (etat_avant in ('en_attente', 'actif')),
  motif text not null,                                                     -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint retrait_indicateur_motif_check check (char_length(motif) between 10 and 280)
);
create index on public.retrait_indicateur (ministere_id, saisi_le desc);
create index on public.retrait_indicateur (saisi_le desc);

alter table public.retrait_indicateur enable row level security;

create trigger forcer_auteur before insert on public.retrait_indicateur
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.retrait_indicateur
  for each row execute function private.refuser_modification_sauf_masquage('motif');
create trigger ajout_seulement_vider before truncate on public.retrait_indicateur
  for each statement execute function private.refuser_modification();

-- Lecture : le ministère qui a retiré et EJP Tech, comme le « Pourquoi » d'une demande. Ni le
-- berger, ni le conseil, ni l'administration de l'église, ni un autre ministère.
create policy lecture on public.retrait_indicateur for select to authenticated using (
  ministere_id = (select private.mon_ministere())
  or (select private.mon_type()) = 'admin_plateforme');
create policy double_authentification on public.retrait_indicateur as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.retrait_indicateur from public, anon, authenticated, service_role;
grant select on public.retrait_indicateur to authenticated;

-- 2. Motif « ministere » d'un retrait

alter table public.indicateur
  drop constraint indicateur_retrait_motif_check,
  add constraint indicateur_retrait_motif_check check (retrait_motif in (
    'plus_suivi', 'doublon', 'erreur', 'se_calcule', 'deja_commun', 'domaine_sensible', 'hors_regles',
    'remplace', 'confidentialite', 'source_retiree', 'refuse', 'ministere')),
  add constraint indicateur_retrait_ministere_check check (
    retrait_motif is distinct from 'ministere' or origine = 'ministere');

-- 3. Retrait par le ministère

-- Contrôles dans l'ordre : aal2 et compte actif (exige_aal2), compte de ministère, verrou du
-- ministère puis de l'indicateur (même ordre que retirer_indicateur et creer_calcul), indicateur de
-- sa fiche, ajouté par lui, pas déjà retiré, source d'aucun calcul suivi, motif. Le verrou du
-- ministère fait attendre un calcul en cours de création sur cette source (creer_calcul le prend
-- aussi) : le contrôle de la source le voit.
create function private.retirer_mon_indicateur(p_indicateur_id uuid, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_indicateur public.indicateur%rowtype;
  v_motif text := btrim(coalesce(p_motif, ''));
  v_message text;
  v_calcul text;
  v_retrait uuid;
  v_avec_saisies boolean;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if private.mon_type() is distinct from 'ministere' or v_ministere is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(v_ministere);
  select i.* into v_indicateur from public.indicateur i
   where i.id = p_indicateur_id and i.ministere_id = v_ministere
     for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if v_indicateur.origine <> 'ministere' then
    raise exception 'Cet indicateur n''a pas été ajouté par votre ministère. Demandez à EJP Tech de le retirer.';
  end if;
  if v_indicateur.etat = 'retire' then
    raise exception 'Cet indicateur est déjà retiré.';
  end if;
  select c.libelle into v_calcul from public.indicateur c
   where c.calcul is not null and c.etat in ('actif', 'en_attente')
     and exists (select 1 from public.indicateur_terme t where t.calcul_id = c.id and t.source_id = p_indicateur_id)
   order by c.libelle, c.id
   limit 1;
  if v_calcul is not null then
    raise exception 'Ce chiffre sert au calcul « % » : demandez à EJP Tech de le retirer.', v_calcul;
  end if;
  if char_length(v_motif) < 10 then
    raise exception 'Expliquez pourquoi vous le retirez (10 caractères au moins).';
  end if;
  if char_length(v_motif) > 280 then
    raise exception 'Le motif dépasse 280 caractères.';
  end if;
  v_message := private.texte_libre_refuse(v_motif);
  if v_message is not null then
    raise exception '%', v_message;
  end if;
  v_avec_saisies := exists (select 1 from public.mesure m where m.indicateur_id = p_indicateur_id);

  insert into public.retrait_indicateur (indicateur_id, ministere_id, etat_avant, motif)
  values (p_indicateur_id, v_ministere, v_indicateur.etat, v_motif)
  returning id into v_retrait;
  update public.indicateur set etat = 'retire', retrait_motif = 'ministere' where id = p_indicateur_id;

  -- Journal : des codes, des booléens et des identifiants, jamais le motif.
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_ministere, 'indicateur_retire', 'indicateur',
          p_indicateur_id,
          jsonb_build_object('motif', 'ministere', 'attente', v_indicateur.etat = 'en_attente',
                             'avec_saisies', v_avec_saisies, 'retrait', v_retrait));
end $$;

create function public.retirer_mon_indicateur(p_indicateur_id uuid, p_motif text)
returns void language sql security invoker set search_path = '' as $$
  select private.retirer_mon_indicateur(p_indicateur_id, p_motif);
$$;

revoke all on function private.retirer_mon_indicateur(uuid, text), public.retirer_mon_indicateur(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.retirer_mon_indicateur(uuid, text), public.retirer_mon_indicateur(uuid, text)
  to authenticated;

-- 4. Contraintes du journal et de la modération

alter table public.journal
  drop constraint journal_cible_check,
  add constraint journal_cible_check check (cible in (
    'session', 'evenement', 'reunion', 'point_attention', 'point_suivi', 'compte', 'ministere',
    'indicateur', 'demande_indicateur', 'validation', 'signalement', 'signalement_suivi',
    'precision_sensible', 'retrait_indicateur'));

alter table public.moderation
  drop constraint moderation_cible_check,
  add constraint moderation_cible_check check (cible in (
    'point_attention', 'point_suivi', 'evenement', 'reunion',
    'demande_indicateur', 'validation', 'signalement', 'signalement_suivi', 'precision_sensible',
    'retrait_indicateur')),
  drop constraint moderation_cible_champ_check,
  add constraint moderation_cible_champ_check check (champ is null or (cible, champ) in (
    ('point_attention', 'titre'), ('point_attention', 'description'), ('point_attention', 'action_attendue'),
    ('point_suivi', 'commentaire'), ('evenement', 'titre'),
    ('reunion', 'objet'), ('reunion', 'decision_attendue'),
    ('demande_indicateur', 'pourquoi'), ('validation', 'motif'),
    ('signalement', 'texte'), ('signalement_suivi', 'commentaire'),
    ('precision_sensible', 'texte'), ('retrait_indicateur', 'motif')));

-- 5. Masquage : les douze couples de la version précédente repris tels quels, puis
-- (retrait_indicateur, motif), sous le réglage local pilotage.masquage que le trigger de la table
-- accepte, retiré aussitôt. Même signature : create or replace garde le propriétaire et les droits.
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
  elsif p_cible = 'retrait_indicateur' and p_champ = 'motif' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.retrait_indicateur set motif = v_masque
     where id = p_cible_id and motif <> v_masque
    returning saisi_par, ministere_id into v_auteur, v_ministere;
    perform set_config('pilotage.masquage', '', true);
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère concerné : celui de la précision, du signalement ou du retrait, sinon celui du
  -- compte auteur (null pour le berger, le conseil et EJP Tech, auteur du motif d'un refus).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()),
          coalesce(v_ministere, (select c.ministere_id from public.compte c where c.user_id = v_auteur)),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- 6. Journal

-- Lecture du journal : celle de 20261009120000_lot_i_correctifs.sql, plus la cible
-- retrait_indicateur dans la condition T47 de l'administration (ni texte_relu ni texte_masque).
drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  ((select private.lit_tout())
   and ((coalesce(cible, '') not in ('signalement', 'signalement_suivi')
         and action not in ('difficulte_signalee', 'signalement_clos'))
        or (select private.mon_type()) = 'admin_plateforme'))
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail)
      and coalesce(cible, '') not in ('precision_sensible', 'signalement', 'signalement_suivi')
      and action not in ('difficulte_signalee', 'signalement_clos')
      and (action not in ('texte_relu', 'texte_masque')
           or coalesce(cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi', 'evenement',
                                          'reunion', 'retrait_indicateur')))
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid()))));

-- v_journal : même version, mêmes colonnes ; la cible retrait_indicateur donne le libellé actuel
-- de l'indicateur retiré (lu sous la RLS du lecteur : le ministère qui a retiré et EJP Tech), et
-- la même condition que la politique pour l'administration.
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
where ((select private.mon_type()) is distinct from 'admin_eglise'
       or (private.journal_lisible_administration(j.action, j.detail)
           and coalesce(j.cible, '') <> 'precision_sensible'
           and (j.action not in ('texte_relu', 'texte_masque')
                or coalesce(j.cible, '') not in ('demande_indicateur', 'point_attention', 'point_suivi',
                                                 'evenement', 'reunion', 'retrait_indicateur'))))
  and ((coalesce(j.cible, '') not in ('signalement', 'signalement_suivi')
        and j.action not in ('difficulte_signalee', 'signalement_clos'))
       or (select private.mon_type()) in ('admin_plateforme', 'ministere'));
