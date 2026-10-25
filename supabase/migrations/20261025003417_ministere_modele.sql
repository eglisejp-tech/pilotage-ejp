-- Lien explicite entre un ministère et sa liste d'indicateurs prévus (décision T72 de
-- docs/decisions.md, accord de la personne responsable du 25 octobre 2026 sur la recommandation
-- de l'audit). Jusqu'ici, l'écran Indicateurs déduisait la liste du nom normalisé du ministère
-- (le code du modèle est le nom normalisé du ministère de la liste de la coordination) : une fiche
-- nommée « EJP Tech » ou « Ministère Santé » en production restait « À choisir » sans que rien ne
-- soit enregistré. Le choix devient une donnée de la base.
--
-- 1. private.ministere_modele : une ligne par choix, en ajout seulement (l'historique reste) ; la
--    plus récente fait foi. modele est un code du catalogue privé ou « aucun ». Aucun droit pour
--    personne : seules les fonctions ci-dessous l'écrivent et la lisent. RLS et politique
--    restrictive aal2 en plus.
-- 2. Lecture par public.v_ministere_modele (security_invoker), servie par
--    private.modeles_ministeres() : l'administration de l'église et EJP Tech, en aal2. Une ligne
--    par ministère : le modèle choisi (null : rien choisi), la date du choix et le modèle suggéré.
-- 3. private.modele_suggere(nom) : présélection seulement, jamais un choix automatique. Le nom
--    normalisé exact d'un modèle, sinon un nom connu de la production ; « aucun » pour Prodiges
--    Academy (liste explicite des ministères sans prévu).
-- 4. choisir_modele_prevus (public et private) : EJP Tech seul (T60), exige_aal2, verrou du
--    ministère et de la table. Refuse un modèle inconnu, refuse de quitter une liste dont un prévu
--    est encore suivi (non retiré), refuse un modèle qui sert déjà à un autre ministère actif
--    (Proposé). « Aucun » se choisit et se quitte comme un modèle. Une ligne de journal
--    « modele_prevus_choisi », détail {avant, apres} : deux codes, aucun texte libre.
-- 5. creer_indicateurs_prevus garde sa signature et son corps (20261009100000_indicateurs_vague_1.sql
--    et le correctif 20261010120500_prevus_retires_aucun.sql) : il pose le lien s'il est vide et
--    refuse un modèle différent du lien. Le contrôle « un modèle par ministère » reste au choix
--    explicite (Proposé, T72).
-- 6. Journal : le code d'action modele_prevus_choisi (contrainte journal_action_check), lisible
--    par l'administration de l'église comme les autres gestes de configuration.
-- 7. Reprise des fiches existantes (private.reprendre_modeles, appelée une fois ici et gardée
--    pour les tests ; personne ne peut l'appeler par l'API). Pour chaque ministère actif sans
--    lien, dans cet ordre : le modèle le plus représenté de ses prévus non retirés ; sinon le
--    modèle de son nom normalisé exact, s'il ne sert à aucune autre fiche ; sinon « aucun » si
--    cette réponse est au journal (indicateurs_prevus_crees, modèle « aucun ») ; sinon pas de
--    lien (l'écran demande le choix). C'est ce que l'écran affichait jusqu'ici. Une ligne de
--    journal « Système » par lien posé. Aucune ligne d'indicateur ni de mesure n'est touchée.

-- 1. Table

create table private.ministere_modele (
  id bigint generated always as identity primary key,
  ministere_id uuid not null references public.ministere (id),
  modele text not null check (char_length(modele) between 1 and 60 and modele <> 'suggestion'),
  choisi_le timestamptz not null default statement_timestamp(),
  choisi_par uuid references public.compte (user_id)       -- null : « Système » (reprise, jeu d'exemple)
);

create index ministere_modele_ministere_idx on private.ministere_modele (ministere_id, id desc);

alter table private.ministere_modele enable row level security;
create policy double_authentification on private.ministere_modele as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
revoke all on private.ministere_modele from public, anon, authenticated, service_role;
revoke all on sequence private.ministere_modele_id_seq from public, anon, authenticated, service_role;

create trigger ajout_seulement before update or delete on private.ministere_modele
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on private.ministere_modele
  for each statement execute function private.refuser_modification();

-- 2. Journal : un code d'action nouveau (liste de 20261010122000_mentions_modifiables.sql).

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
    'modele_prevus_choisi'));

-- L'administration de l'église lit ce geste de configuration (20261008101000_journal_mesures.sql :
-- seule la liste gagne modele_prevus_choisi). Même signature : create or replace garde le
-- propriétaire et les droits.
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
      'indicateur_refuse', 'indicateur_retire', 'modele_prevus_choisi'])
  end
$$;

-- 3. Aides (security invoker, appelées par les fonctions security definer ci-dessous, aucun droit
-- pour authenticated).

-- Modèle choisi pour un ministère : la ligne la plus récente ; null si rien n'est choisi.
create function private.modele_choisi(p_ministere_id uuid) returns text
language sql stable set search_path = '' as $$
  select x.modele from private.ministere_modele x
   where x.ministere_id = p_ministere_id
   order by x.id desc
   limit 1
$$;

-- Pose un lien et l'écrit au journal : deux codes, jamais un texte libre. L'auteur est le compte
-- du jeton (null pendant une migration : « Système »).
create function private.poser_modele(p_ministere_id uuid, p_modele text, p_avant text) returns void
language plpgsql set search_path = '' as $$
begin
  insert into private.ministere_modele (ministere_id, modele, choisi_le, choisi_par)
  values (p_ministere_id, p_modele, statement_timestamp(), (select auth.uid()));
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'modele_prevus_choisi', 'ministere',
          p_ministere_id, jsonb_build_object('avant', p_avant, 'apres', p_modele));
end $$;

-- Modèle suggéré pour un nom de ministère : présélection de l'écran, jamais un choix. D'abord le
-- modèle dont le code est le nom normalisé ; sinon un nom connu de la production ; « aucun » pour
-- Prodiges Academy (P43, liste explicite des ministères sans prévu). Un nom connu qui vise un
-- modèle absent du catalogue ne suggère rien.
create function private.modele_suggere(p_nom text) returns text
language sql stable set search_path = '' as $$
  with saisi as (select private.normaliser(p_nom) as nom_normalise),
  connus (nom_normalise, modele) as (values
    ('fij', 'coordo fij'),
    ('ejp formation', 'formation'),
    ('ejp tech', 'tech'),
    ('ministere sante', 'sante'),
    ('mcad communication audiovisuelle', 'mcad'),
    ('mpi priere', 'mpi'),
    ('coordo', 'coordination'),
    ('merchandising', 'merch'),
    ('aigles', 'eagles'),
    ('prodiges academy', 'aucun'))
  select coalesce(
    (select p.modele from private.indicateur_prevu p, saisi s
      where p.modele = s.nom_normalise and p.modele <> 'suggestion'
      limit 1),
    (select c.modele from connus c, saisi s
      where c.nom_normalise = s.nom_normalise
        and (c.modele = 'aucun'
             or exists (select 1 from private.indicateur_prevu p where p.modele = c.modele))))
$$;

-- 4. Lecture : une ligne par ministère pour l'administration de l'église et EJP Tech, en aal2.

create function private.modeles_ministeres()
returns table (ministere_id uuid, modele text, choisi_le timestamptz, suggere text)
language sql stable security definer set search_path = '' as $$
  select m.id, l.modele, l.choisi_le, private.modele_suggere(m.nom)
    from public.ministere m
    left join lateral (
      select x.modele, x.choisi_le from private.ministere_modele x
       where x.ministere_id = m.id
       order by x.id desc
       limit 1) l on true
   where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and coalesce(private.mon_type() in ('admin_eglise', 'admin_plateforme'), false)
$$;

create view public.v_ministere_modele with (security_invoker = true) as
select v.ministere_id, v.modele, v.choisi_le, v.suggere
  from private.modeles_ministeres() as v;

-- 5. Choix explicite (EJP Tech, T60).

create function private.choisir_modele_prevus(p_ministere_id uuid, p_modele text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_avant text;
  v_autre text;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(p_ministere_id);
  -- Deux choix en même temps pour deux ministères ne prennent pas le même modèle.
  lock table private.ministere_modele in share row exclusive mode;
  if p_modele is null or p_modele = 'suggestion'
     or (p_modele <> 'aucun'
         and not exists (select 1 from private.indicateur_prevu p where p.modele = p_modele)) then
    raise exception 'Ce modèle n''existe pas dans le catalogue.';
  end if;

  v_avant := private.modele_choisi(p_ministere_id);
  if v_avant is not distinct from p_modele then
    return;                               -- déjà choisi : rien n'est écrit
  end if;
  -- Un prévu encore suivi (non retiré) d'une autre liste : on ne la quitte pas.
  if exists (select 1 from public.indicateur i
               join private.indicateur_prevu p on p.code = i.modele_code and p.modele <> 'suggestion'
              where i.ministere_id = p_ministere_id and i.etat <> 'retire' and p.modele <> p_modele) then
    raise exception 'Cette fiche suit encore des indicateurs prévus d''une autre liste : retirez-les avant de changer de liste.';
  end if;
  -- Un modèle sert un seul ministère actif (Proposé, T72). « Aucun » sert à tous.
  if p_modele <> 'aucun' then
    select m.nom into v_autre
      from public.ministere m
     where m.id <> p_ministere_id and m.desactive_le is null
       and private.modele_choisi(m.id) = p_modele
     order by m.nom
     limit 1;
    if v_autre is not null then
      raise exception 'Cette liste sert déjà à la fiche « % » : changez d''abord le choix de cette fiche.', v_autre;
    end if;
  end if;

  perform private.poser_modele(p_ministere_id, p_modele, v_avant);
end $$;

create function public.choisir_modele_prevus(p_ministere_id uuid, p_modele text)
returns void language sql security invoker set search_path = '' as $$
  select private.choisir_modele_prevus(p_ministere_id, p_modele);
$$;

-- 6. creer_indicateurs_prevus : corps de 20261009100000_indicateurs_vague_1.sql, avec le
-- correctif de 20261010120500_prevus_retires_aucun.sql (« aucun » ne compte que les prévus non
-- retirés). Nouveau : le verrou de la table des liens, la lecture du lien, sa pose quand il est
-- vide et le refus d'un modèle différent du lien. Même signature : create or replace garde le
-- propriétaire et les droits.
create or replace function private.creer_indicateurs_prevus(p_ministere_id uuid, p_modele text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_codes text[];
  v_nombre integer;
  v_lignes integer;
  v_pris text;
  v_commun boolean;
  v_manque text;
  v_lien text;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(p_ministere_id);
  lock table private.ministere_modele in share row exclusive mode;
  v_lien := private.modele_choisi(p_ministere_id);

  -- Un ministère sans prévu (Prodiges Academy) : le lien « aucun », une ligne de journal la
  -- première fois, rien ensuite.
  if p_modele = 'aucun' then
    if exists (select 1 from public.indicateur i
                 join private.indicateur_prevu p on p.code = i.modele_code and p.modele <> 'suggestion'
                where i.ministere_id = p_ministere_id and i.etat <> 'retire') then
      raise exception 'Cette fiche a déjà des indicateurs prévus : « aucun » ne s''applique pas.';
    end if;
    if v_lien is not null and v_lien <> 'aucun' then
      raise exception 'Cette fiche suit une autre liste : changez d''abord le choix de la liste.';
    end if;
    if v_lien is null then
      perform private.poser_modele(p_ministere_id, 'aucun', null);
    end if;
    if not exists (select 1 from public.journal j
                    where j.ministere_id = p_ministere_id and j.action = 'indicateurs_prevus_crees'
                      and j.detail ->> 'modele' = 'aucun') then
      insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
      values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'indicateurs_prevus_crees',
              'ministere', p_ministere_id, jsonb_build_object('modele', 'aucun', 'nombre', 0));
    end if;
    return 0;
  end if;
  if p_modele is null or p_modele = 'suggestion'
     or not exists (select 1 from private.indicateur_prevu p where p.modele = p_modele) then
    raise exception 'Ce modèle n''existe pas dans le catalogue.';
  end if;
  if v_lien is not null and v_lien <> p_modele then
    raise exception 'Cette fiche suit une autre liste : changez d''abord le choix de la liste.';
  end if;
  if v_lien is null then
    perform private.poser_modele(p_ministere_id, p_modele, null);
  end if;

  -- Prévus qui manquent : jamais créés sur cette fiche, quel que soit leur état (un prévu retiré
  -- ne renaît pas par un second appel).
  select array_agg(p.code order by p.ordre, p.code) into v_codes
    from private.indicateur_prevu p
   where p.modele = p_modele
     and not exists (select 1 from public.indicateur i
                      where i.ministere_id = p_ministere_id and i.modele_code = p.code);
  v_nombre := coalesce(array_length(v_codes, 1), 0);
  if v_nombre = 0 then
    return 0;
  end if;

  -- Doublon : un prévu au nom d'un indicateur de la fiche (hors retirés) ou d'un chiffre commun,
  -- ou deux prévus du modèle au même nom normalisé (catalogue à corriger).
  select i.libelle, i.ministere_id is null into v_pris, v_commun
    from public.indicateur i
    join private.indicateur_prevu p on p.code = any (v_codes)
                                   and private.normaliser(p.libelle) = private.normaliser(i.libelle)
   where (i.ministere_id = p_ministere_id or i.ministere_id is null) and i.etat <> 'retire'
   order by i.ministere_id nulls last
   limit 1;
  if v_pris is not null then
    if v_commun then
      raise exception 'Un indicateur prévu porte le nom du chiffre commun « % » : le catalogue est à corriger.', v_pris;
    end if;
    raise exception 'La fiche a déjà « % » : retirez-le avant de créer les indicateurs prévus.', v_pris;
  end if;
  select p1.libelle into v_pris
    from private.indicateur_prevu p1
    join private.indicateur_prevu p2 on (p2.ordre, p2.code) > (p1.ordre, p1.code)
                                    and private.normaliser(p2.libelle) = private.normaliser(p1.libelle)
   where p1.code = any (v_codes) and p2.code = any (v_codes)
   order by p1.ordre, p1.code
   limit 1;
  if v_pris is not null then
    raise exception 'Deux indicateurs prévus portent le même nom, « % » : le catalogue est à corriger.', v_pris;
  end if;
  v_lignes := private.lignes_fiche(p_ministere_id, null) + v_nombre;
  if v_lignes > 30 then
    raise exception 'Avec les indicateurs prévus, la fiche compterait % indicateurs : 30 au plus.', v_lignes;
  end if;
  -- La source d'un calcul à créer doit être suivie sur la fiche (créée ici ou avant, active).
  select c.libelle into v_manque
    from private.indicateur_prevu_terme t
    join private.indicateur_prevu c on c.code = t.prevu_code
   where t.prevu_code = any (v_codes) and t.source_code is not null
     and t.source_code <> all (v_codes)
     and not exists (select 1 from public.indicateur s
                      where s.ministere_id = p_ministere_id and s.modele_code = t.source_code and s.etat = 'actif')
   limit 1;
  if v_manque is not null then
    raise exception 'Le calcul « % » demande un chiffre qui n''est plus suivi sur cette fiche.', v_manque;
  end if;

  -- Tous les prévus manquants en une instruction, actifs (sensibles compris, P42), puis les
  -- termes des calculs. Un trigger de B1 contrôle chaque ligne.
  insert into public.indicateur (libelle, definition, nature, unite, sensible, calcul, part, ministere_id, etat,
                                 origine, modele_code, sans_somme, saisi_dimanche_matin, libelle_sessions, ordre)
  select p.libelle, p.definition, p.nature, p.unite, p.sensible, p.calcul, p.part, p_ministere_id, 'actif',
         'eglise', p.code, p.sans_somme, p.saisi_dimanche_matin, p.libelle_sessions, p.ordre
    from private.indicateur_prevu p
   where p.code = any (v_codes)
   order by p.ordre, p.code;

  insert into public.indicateur_terme (calcul_id, ordre, role, source_id, comptage, agregat, decalage)
  select c.id, t.ordre, t.role, s.id, t.comptage, t.agregat, t.decalage
    from private.indicateur_prevu_terme t
    join public.indicateur c on c.ministere_id = p_ministere_id and c.modele_code = t.prevu_code
    left join public.indicateur s on s.ministere_id = p_ministere_id and s.modele_code = t.source_code
                                 and s.etat = 'actif'
   where t.prevu_code = any (v_codes)
   order by t.prevu_code, t.ordre;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'indicateurs_prevus_crees',
          'ministere', p_ministere_id, jsonb_build_object('modele', p_modele, 'nombre', v_nombre));
  return v_nombre;
end $$;

-- 7. Reprise des fiches existantes. Ministères actifs sans lien seulement : un second appel ne
-- pose que les liens qui manquent. Rend le nombre de liens posés.
create function private.reprendre_modeles() returns integer
language plpgsql set search_path = '' as $$
declare
  v_lien record;
  v_nombre integer := 0;
begin
  lock table private.ministere_modele in share row exclusive mode;
  for v_lien in
    with sans_lien as (
      select m.id, private.normaliser(m.nom) as nom_normalise
        from public.ministere m
       where m.desactive_le is null
         and not exists (select 1 from private.ministere_modele x where x.ministere_id = m.id)
    ),
    -- 1. Le modèle le plus représenté de ses prévus non retirés (à égalité, le premier code).
    suivis as (
      select distinct on (i.ministere_id) i.ministere_id, p.modele
        from public.indicateur i
        join private.indicateur_prevu p on p.code = i.modele_code and p.modele <> 'suggestion'
       where i.etat <> 'retire' and i.ministere_id in (select s.id from sans_lien s)
       group by i.ministere_id, p.modele
       order by i.ministere_id, count(*) desc, p.modele
    ),
    -- 2. Le modèle de son nom normalisé exact, s'il ne sert à aucune autre fiche active (déjà
    -- reliée, ou reliée à l'étape 1) et qu'aucune autre fiche sans lien ne porte ce nom.
    par_nom as (
      select s.id as ministere_id, s.nom_normalise as modele
        from sans_lien s
       where not exists (select 1 from suivis x where x.ministere_id = s.id)
         and exists (select 1 from private.indicateur_prevu p
                      where p.modele = s.nom_normalise and p.modele <> 'suggestion')
         and not exists (select 1 from suivis x where x.modele = s.nom_normalise)
         and not exists (select 1 from public.ministere o
                          where o.id <> s.id and o.desactive_le is null
                            and private.modele_choisi(o.id) = s.nom_normalise)
         and not exists (select 1 from sans_lien t where t.id <> s.id and t.nom_normalise = s.nom_normalise)
    ),
    -- 3. « Aucun », si cette réponse est au journal.
    sans_prevu as (
      select s.id as ministere_id, 'aucun'::text as modele
        from sans_lien s
       where not exists (select 1 from suivis x where x.ministere_id = s.id)
         and not exists (select 1 from par_nom x where x.ministere_id = s.id)
         and exists (select 1 from public.journal j
                      where j.ministere_id = s.id and j.action = 'indicateurs_prevus_crees'
                        and j.detail ->> 'modele' = 'aucun')
    )
    select l.ministere_id, l.modele
      from (select x.ministere_id, x.modele from suivis x
            union all select y.ministere_id, y.modele from par_nom y
            union all select z.ministere_id, z.modele from sans_prevu z) as l
     order by l.ministere_id
  loop
    perform private.poser_modele(v_lien.ministere_id, v_lien.modele, null);
    v_nombre := v_nombre + 1;
  end loop;
  return v_nombre;
end $$;

-- 8. Droits : la vue et la fonction de l'API pour authenticated, les aides pour personne.

revoke all on function
  private.modele_choisi(uuid),
  private.poser_modele(uuid, text, text),
  private.modele_suggere(text),
  private.modeles_ministeres(),
  private.choisir_modele_prevus(uuid, text),
  public.choisir_modele_prevus(uuid, text),
  private.reprendre_modeles()
  from public, anon, authenticated, service_role;
grant execute on function
  private.modeles_ministeres(),
  private.choisir_modele_prevus(uuid, text),
  public.choisir_modele_prevus(uuid, text)
  to authenticated;
revoke all on public.v_ministere_modele from public, anon, authenticated, service_role;
grant select on public.v_ministere_modele to authenticated;

-- 9. Reprise, une fois.
select private.reprendre_modeles();
