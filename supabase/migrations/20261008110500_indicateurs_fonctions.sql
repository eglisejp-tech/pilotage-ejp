-- Étape 4, lot B3 (2 sur 2) : fonctions de configuration et de validation (docs/plan-etape-4.md,
-- section 4, « B3 » ; docs/conception/contrat-etape-4.md, sections 1 et 7 ;
-- configuration-indicateurs.md 4.2, 4.6, 5.5, 5.8 et 6.1 ; validation-metier.md 2.4, 2.7 et 6.4).
--
-- Chaque fonction de l'API : private.<nom> en security definer, set search_path = '',
-- perform private.exige_aal2() en première instruction, et public.<nom> d'une ligne en security
-- invoker. Un refus de droit lève 42501 avec « Cet élément n'existe pas ou vous n'y avez pas
-- accès. » ; une erreur de saisie lève l'exception par défaut (P0001), affichée telle quelle.
--
-- - creer_indicateurs_prevus (administration, EJP Tech) : les prévus manquants d'un modèle du
--   catalogue, tout ou rien, sans doublon, sensibles compris (actifs dès leur création, P42) ;
--   « aucun » pour un ministère sans prévu ;
-- - creer_indicateur, creer_calcul (administration, EJP Tech) : ajout actif, remplacement avec
--   retrait de l'ancien (motif « remplace ») ;
-- - ajouter_suggestion (ministère sur sa fiche, avec son « Pourquoi », à valider ;
--   administration et EJP Tech, actif tout de suite) ;
-- - valider_indicateur (EJP Tech seul, T30) : une décision par demande, sous verrou ; un refus
--   retire l'indicateur avec le motif « refuse » ;
-- - corriger_indicateur (tant que rien n'est saisi), retirer_indicateur (motif obligatoire ; un
--   calcul qui en dépend est retiré avec lui) ;
-- - verifier_libelle, limites_indicateurs : contrôles et limites pour l'écran (30 lignes par
--   fiche, saisis et calculs, prévus compris ; 3 ajouts d'un ministère, P41).
-- Les limites se comptent sous un verrou for update sur la ligne du ministère : deux personnes du
-- compte partagé qui cliquent en même temps passent l'une après l'autre.
--
-- Journal : une ligne par geste, sans texte libre, sans libellé, sans « Pourquoi » ni motif
-- écrit (contrat, section 1). Une décision d'EJP Tech est écrite au nom de son compte : la
-- fraîcheur du ministère ne bouge pas.

-- 1. Aides internes (exécutables par personne : les fonctions de l'API les appellent au nom de
-- leur propriétaire)

-- Ligne d'un ministère actif, verrouillée jusqu'à la fin de la transaction.
create function private.verrouiller_ministere(p_ministere_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  perform 1 from public.ministere m where m.id = p_ministere_id and m.desactive_le is null for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
end $$;

-- Lignes d'une fiche : indicateurs actifs ou à valider, calculs compris, l'indicateur remplacé
-- mis à part.
create function private.lignes_fiche(p_ministere_id uuid, p_sauf uuid) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer from public.indicateur i
   where i.ministere_id = p_ministere_id and i.etat in ('actif', 'en_attente') and i.id is distinct from p_sauf
$$;

-- Ajouts du ministère, actifs ou à valider.
create function private.ajouts_fiche(p_ministere_id uuid) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer from public.indicateur i
   where i.ministere_id = p_ministere_id and i.origine = 'ministere' and i.etat in ('actif', 'en_attente')
$$;

-- Libellé déjà pris sur la fiche (hors retirés, l'indicateur nommé mis à part) ou par un
-- chiffre commun, comparé sur le libellé normalisé ; null s'il est libre.
create function private.libelle_pris(p_ministere_id uuid, p_libelle text, p_sauf uuid) returns text
language sql stable set search_path = '' as $$
  select i.libelle from public.indicateur i
   where (i.ministere_id = p_ministere_id or i.ministere_id is null)
     and i.etat <> 'retire'
     and i.id is distinct from p_sauf
     and private.normaliser(i.libelle) = private.normaliser(p_libelle)
   order by i.ministere_id nulls first
   limit 1
$$;

-- Premier message bloquant de private.verifier_texte pour le libellé et la définition d'un
-- indicateur (administration et EJP Tech), ou null. Libellé : toutes les familles, sauf
-- « cumul » pour un « à ce jour » (« Vues cumulées YouTube »), « sensible » quand la case est
-- cochée ou confirmée, « calcul » pour un calcul (« Taux de résolution »). Définition : données
-- personnelles, crochets et domaine sensible (elle dit la période et l'unité, par exemple
-- « dans le mois »).
create function private.texte_refuse(p_libelle text, p_definition text, p_nature text,
  p_sensible_bloque boolean, p_calcul_bloque boolean)
returns text
language sql stable set search_path = '' as $$
  select x.message
  from (
    select 1 as champ, v.n, v.message
      from private.verifier_texte(p_libelle, false) with ordinality as v(famille, message, bloquant, n)
     where v.bloquant
       and (v.famille <> 'cumul' or p_nature is distinct from 'a_ce_jour')
       and (v.famille <> 'sensible' or p_sensible_bloque)
       and (v.famille <> 'calcul' or p_calcul_bloque)
    union all
    select 2, v.n, v.message
      from private.verifier_texte(p_definition, false) with ordinality as v(famille, message, bloquant, n)
     where v.famille in ('donnees_personnelles', 'crochets')
        or (v.famille = 'sensible' and p_sensible_bloque)
  ) as x
  order by x.champ, x.n
  limit 1
$$;

-- Premier message de données personnelles ou de crochets d'un texte libre (« Pourquoi », motif
-- d'un refus), ou null.
create function private.texte_libre_refuse(p_texte text) returns text
language sql stable set search_path = '' as $$
  select v.message
    from private.verifier_texte(p_texte, true) with ordinality as v(famille, message, bloquant, n)
   where v.famille in ('donnees_personnelles', 'crochets')
   order by v.n
   limit 1
$$;

-- Retire les calculs actifs ou à valider dont l'indicateur est une source (motif
-- « source_retiree ») ; rend leur nombre.
create function private.retirer_calculs_de(p_source_id uuid) returns integer
language plpgsql set search_path = '' as $$
declare
  v_nombre integer;
begin
  update public.indicateur c
     set etat = 'retire', retrait_motif = 'source_retiree'
   where c.calcul is not null and c.etat in ('actif', 'en_attente')
     and exists (select 1 from public.indicateur_terme t where t.calcul_id = c.id and t.source_id = p_source_id);
  get diagnostics v_nombre = row_count;
  return v_nombre;
end $$;

-- 2. Prévus du catalogue

create function private.creer_indicateurs_prevus(p_ministere_id uuid, p_modele text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_codes text[];
  v_nombre integer;
  v_lignes integer;
  v_pris text;
  v_manque text;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(p_ministere_id);

  -- Un ministère sans prévu (Protocole) : une ligne de journal la première fois, rien ensuite.
  if p_modele = 'aucun' then
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

  select i.libelle into v_pris
    from public.indicateur i
    join private.indicateur_prevu p on p.code = any (v_codes)
                                   and private.normaliser(p.libelle) = private.normaliser(i.libelle)
   where i.ministere_id = p_ministere_id and i.etat <> 'retire'
   limit 1;
  if v_pris is not null then
    raise exception 'La fiche a déjà « % » : retirez-le avant de créer les indicateurs prévus.', v_pris;
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
  insert into public.indicateur (libelle, definition, nature, unite, sensible, calcul, ministere_id, etat,
                                 origine, modele_code, sans_somme, saisi_dimanche_matin, libelle_sessions, ordre)
  select p.libelle, p.definition, p.nature, p.unite, p.sensible, p.calcul, p_ministere_id, 'actif',
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

-- 3. Ajout d'un indicateur saisi (administration, EJP Tech). Un ministère écrira ses propres
-- comptes au lot 2 (p_pourquoi) : d'ici là, il est refusé. Contrôles dans l'ordre de
-- configuration-indicateurs.md 5.8 : profil, verrou, remplacement, limite, textes, doublon,
-- rythme et sorte ; puis retrait de l'indicateur remplacé, ajout et une ligne de journal.
create function private.creer_indicateur(p_ministere_id uuid, p_libelle text, p_definition text, p_nature text,
  p_unite text, p_sensible boolean, p_pas_sensible boolean, p_remplace_id uuid, p_pourquoi text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_libelle text := btrim(regexp_replace(coalesce(p_libelle, ''), '\s+', ' ', 'g'));
  v_definition text := btrim(regexp_replace(coalesce(p_definition, ''), '\s+', ' ', 'g'));
  v_unite text := coalesce(p_unite, 'nombre');
  v_sensible boolean := coalesce(p_sensible, false);
  v_message text;
  v_pris text;
  v_id uuid;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform private.verrouiller_ministere(p_ministere_id);
  if p_remplace_id is not null then
    perform 1 from public.indicateur i
     where i.id = p_remplace_id and i.ministere_id = p_ministere_id and i.etat in ('actif', 'en_attente')
       and i.calcul is null
       for update;
    if not found then
      raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
    end if;
  end if;
  if private.lignes_fiche(p_ministere_id, p_remplace_id) >= 30 then
    raise exception 'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.';
  end if;
  if char_length(v_libelle) not between 2 and 60 then
    raise exception 'Donnez un libellé de 2 à 60 caractères.';
  end if;
  if char_length(v_definition) not between 10 and 140 then
    raise exception 'Expliquez ce qu''on compte en 10 à 140 caractères.';
  end if;
  v_message := private.texte_refuse(v_libelle, v_definition, p_nature,
                                    not (v_sensible or coalesce(p_pas_sensible, false)), true);
  if v_message is not null then
    raise exception '%', v_message;
  end if;
  v_pris := private.libelle_pris(p_ministere_id, v_libelle, p_remplace_id);
  if v_pris is not null then
    raise exception 'Cette fiche a déjà « % ».', v_pris;
  end if;
  if p_nature is null or p_nature not in ('dimanche', 'mois', 'a_ce_jour') then
    raise exception 'Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.';
  end if;
  if v_unite not in ('nombre', 'grand_nombre', 'euros', 'heure', 'jours') then
    raise exception 'Choisissez la sorte de nombre.';
  end if;

  if p_remplace_id is not null then
    update public.indicateur set etat = 'retire', retrait_motif = 'remplace' where id = p_remplace_id;
    perform private.retirer_calculs_de(p_remplace_id);
  end if;
  insert into public.indicateur (libelle, definition, nature, unite, sensible, ministere_id, etat, origine, remplace_id)
  values (v_libelle, v_definition, p_nature, v_unite, v_sensible, p_ministere_id, 'actif', 'eglise', p_remplace_id)
  returning id into v_id;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), p_ministere_id, 'indicateur_cree', 'indicateur', v_id,
          jsonb_build_object('nature', p_nature, 'unite', v_unite, 'origine', 'eglise', 'remplace', p_remplace_id));
  return v_id;
end $$;

-- 4. Ajout d'un calcul (administration, EJP Tech) : un taux ou une moyenne de deux indicateurs
-- saisis, actifs et distincts du même ministère, ni communs ni sensibles. Le calcul prend le
-- rythme de son haut et, pour une moyenne, l'unité de son haut. Ses deux termes sont écrits dans
-- la même instruction de l'API (le trigger controler_terme de B1 les contrôle et les fige).
create function private.creer_calcul(p_libelle text, p_definition text, p_type text, p_haut_id uuid,
  p_bas_id uuid, p_remplace_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_libelle text := btrim(regexp_replace(coalesce(p_libelle, ''), '\s+', ' ', 'g'));
  v_definition text := btrim(regexp_replace(coalesce(p_definition, ''), '\s+', ' ', 'g'));
  v_haut public.indicateur%rowtype;
  v_bas public.indicateur%rowtype;
  v_unite text;
  v_message text;
  v_pris text;
  v_id uuid;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if p_type is null or p_type not in ('taux', 'moyenne') then
    raise exception 'Choisissez un taux ou une moyenne.';
  end if;
  select i.* into v_haut from public.indicateur i where i.id = p_haut_id;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select i.* into v_bas from public.indicateur i where i.id = p_bas_id;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if v_haut.ministere_id is null or v_bas.ministere_id is null or v_haut.ministere_id <> v_bas.ministere_id
     or v_haut.calcul is not null or v_bas.calcul is not null then
    raise exception 'Ces deux chiffres ne se calculent pas ensemble.';
  end if;
  if v_haut.id = v_bas.id then
    raise exception 'Un calcul se fait sur des chiffres distincts.';
  end if;
  if v_haut.sensible or v_bas.sensible then
    raise exception 'Un indicateur sensible n''entre dans aucun calcul.';
  end if;
  if v_haut.etat <> 'actif' or v_bas.etat <> 'actif' then
    raise exception 'Un calcul se fait sur des indicateurs actifs.';
  end if;
  perform private.verrouiller_ministere(v_haut.ministere_id);
  if p_remplace_id is not null then
    perform 1 from public.indicateur i
     where i.id = p_remplace_id and i.ministere_id = v_haut.ministere_id and i.etat in ('actif', 'en_attente')
       and i.calcul is not null
       for update;
    if not found then
      raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
    end if;
  end if;
  if private.lignes_fiche(v_haut.ministere_id, p_remplace_id) >= 30 then
    raise exception 'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.';
  end if;
  if char_length(v_libelle) not between 2 and 60 then
    raise exception 'Donnez un libellé de 2 à 60 caractères.';
  end if;
  if char_length(v_definition) not between 10 and 140 then
    raise exception 'Expliquez ce qu''on compte en 10 à 140 caractères.';
  end if;
  v_message := private.texte_refuse(v_libelle, v_definition, v_haut.nature, false, false);
  if v_message is not null then
    raise exception '%', v_message;
  end if;
  v_pris := private.libelle_pris(v_haut.ministere_id, v_libelle, p_remplace_id);
  if v_pris is not null then
    raise exception 'Cette fiche a déjà « % ».', v_pris;
  end if;
  v_unite := case when p_type = 'moyenne' then v_haut.unite else 'nombre' end;

  if p_remplace_id is not null then
    update public.indicateur set etat = 'retire', retrait_motif = 'remplace' where id = p_remplace_id;
  end if;
  insert into public.indicateur (libelle, definition, nature, unite, calcul, ministere_id, etat, origine, remplace_id)
  values (v_libelle, v_definition, v_haut.nature, v_unite, p_type, v_haut.ministere_id, 'actif', 'eglise', p_remplace_id)
  returning id into v_id;
  insert into public.indicateur_terme (calcul_id, ordre, role, source_id)
  values (v_id, 1, 'haut', p_haut_id), (v_id, 2, 'bas', p_bas_id);

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_haut.ministere_id, 'indicateur_cree', 'indicateur', v_id,
          jsonb_build_object('nature', v_haut.nature, 'unite', v_unite, 'origine', 'eglise', 'remplace', p_remplace_id));
  return v_id;
end $$;

-- 5. Ajout d'une suggestion du catalogue. Un ministère, sur sa fiche, avec son « Pourquoi » (10
-- à 280 caractères après btrim, sans données personnelles ni crochets ; aucun rappel sous le
-- champ, T30) : l'indicateur naît à valider, avec sa demande, et compte dans les 3 ajouts du
-- ministère. L'administration et EJP Tech : actif tout de suite, sans demande (p_pourquoi
-- ignoré).
create function private.ajouter_suggestion(p_ministere_id uuid, p_code text, p_pourquoi text)
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
      raise exception 'Votre fiche compte déjà 30 indicateurs. Demandez à l''administration de l''église d''en retirer un.';
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

-- 6. Décision d'EJP Tech sur une demande (T30). Contrôles dans l'ordre de validation-metier.md
-- 6.4 : EJP Tech seul (42501), décision, verrou sur la demande, aucune décision déjà prise,
-- demande non sortie, motif. Une validation rend l'indicateur actif (toutes ses valeurs
-- comptent) ; un refus le retire avec le motif « refuse », par la même mise à jour bornée que
-- retirer_indicateur, sans ligne indicateur_retire. Les corrections du nom (lot 2) ne se
-- décident pas encore : aucune fonction du lot 1 n'en écrit.
create function private.valider_indicateur(p_demande_id uuid, p_decision text, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_demande public.demande_indicateur%rowtype;
  v_etat text;
  v_motif text;
  v_message text;
begin
  perform private.exige_aal2();
  if private.mon_type() is distinct from 'admin_plateforme' then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('valide', 'refuse') then
    raise exception 'Choisissez de valider ou de refuser.';
  end if;
  select d.* into v_demande from public.demande_indicateur d where d.id = p_demande_id for update;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.validation v where v.demande_id = p_demande_id) then
    raise exception 'Cette demande a déjà été décidée.';
  end if;
  if v_demande.objet <> 'ajout' then
    raise exception 'Une correction du nom ne se décide pas encore dans l''outil.';
  end if;
  select i.etat into v_etat from public.indicateur i where i.id = v_demande.indicateur_id for update;
  if v_etat is distinct from 'en_attente' then
    raise exception 'Cette demande a été retirée ou remplacée : il n''y a plus rien à décider.';
  end if;
  if p_decision = 'refuse' then
    v_motif := btrim(coalesce(p_motif, ''));
    if char_length(v_motif) < 10 then
      raise exception 'Expliquez le refus (10 caractères au moins).';
    end if;
    if char_length(v_motif) > 280 then
      raise exception 'Le motif dépasse 280 caractères.';
    end if;
    v_message := private.texte_libre_refuse(v_motif);
    if v_message is not null then
      raise exception '%', v_message;
    end if;
  end if;

  insert into public.validation (demande_id, ministere_id, decision, motif)
  values (p_demande_id, v_demande.ministere_id, p_decision, v_motif);
  if p_decision = 'valide' then
    update public.indicateur set etat = 'actif' where id = v_demande.indicateur_id;
  else
    update public.indicateur set etat = 'retire', retrait_motif = 'refuse' where id = v_demande.indicateur_id;
  end if;

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_demande.ministere_id,
          case when p_decision = 'valide' then 'indicateur_valide' else 'indicateur_refuse' end,
          'indicateur', v_demande.indicateur_id,
          jsonb_build_object('demande', p_demande_id, 'objet', v_demande.objet));
end $$;

-- 7. Correction du libellé et de la définition (administration, EJP Tech ; le ministère au lot
-- 2) : jamais un chiffre commun ni une suggestion, tant qu'aucune valeur n'est saisie (pour un
-- calcul : aucune valeur de ses sources). Rend « corrige » (« envoye » viendra au lot 2, pour la
-- correction d'un ajout validé d'un ministère).
create function private.corriger_indicateur(p_indicateur_id uuid, p_libelle text, p_definition text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_libelle text := btrim(regexp_replace(coalesce(p_libelle, ''), '\s+', ' ', 'g'));
  v_definition text := btrim(regexp_replace(coalesce(p_definition, ''), '\s+', ' ', 'g'));
  v_indicateur public.indicateur%rowtype;
  v_message text;
  v_pris text;
  v_champs jsonb := '[]'::jsonb;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  select i.* into v_indicateur from public.indicateur i where i.id = p_indicateur_id for update;
  if not found or v_indicateur.ministere_id is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if v_indicateur.etat = 'retire' then
    raise exception 'Un indicateur retiré ne change plus.';
  end if;
  if exists (select 1 from private.indicateur_prevu p
              where p.code = v_indicateur.modele_code and p.modele = 'suggestion') then
    raise exception 'Une suggestion garde le nom qu''elle a dans tous les ministères.';
  end if;
  if exists (select 1 from public.mesure m where m.indicateur_id = p_indicateur_id)
     or exists (select 1 from public.indicateur_terme t
                  join public.mesure m on m.indicateur_id = t.source_id
                 where t.calcul_id = p_indicateur_id) then
    raise exception 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.';
  end if;
  if char_length(v_libelle) not between 2 and 60 then
    raise exception 'Donnez un libellé de 2 à 60 caractères.';
  end if;
  if char_length(v_definition) not between 10 and 140 then
    raise exception 'Expliquez ce qu''on compte en 10 à 140 caractères.';
  end if;
  -- Le domaine sensible n'est pas redemandé : la case et la confirmation ont été données à la
  -- création, et une correction ne change pas ce qu'on compte.
  v_message := private.texte_refuse(v_libelle, v_definition, v_indicateur.nature, false,
                                    v_indicateur.calcul is null);
  if v_message is not null then
    raise exception '%', v_message;
  end if;
  v_pris := private.libelle_pris(v_indicateur.ministere_id, v_libelle, p_indicateur_id);
  if v_pris is not null then
    raise exception 'Cette fiche a déjà « % ».', v_pris;
  end if;
  if v_libelle <> v_indicateur.libelle then
    v_champs := v_champs || '["libelle"]'::jsonb;
  end if;
  if v_definition <> v_indicateur.definition then
    v_champs := v_champs || '["definition"]'::jsonb;
  end if;
  if jsonb_array_length(v_champs) = 0 then
    raise exception 'Rien n''a changé : ce libellé et cette définition sont déjà enregistrés.';
  end if;

  update public.indicateur set libelle = v_libelle, definition = v_definition where id = p_indicateur_id;
  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_indicateur.ministere_id, 'indicateur_corrige',
          'indicateur', p_indicateur_id, jsonb_build_object('champs', v_champs));
  return 'corrige';
end $$;

-- 8. Retrait, avec un motif de la liste (administration, EJP Tech). « confidentialite » masque
-- aussi le libellé et la définition (« [retiré pour confidentialité] », sous le réglage local
-- pilotage.masquage). Les saisies restent ; un calcul qui en dépend est retiré avec lui (motif
-- « source_retiree »). Les motifs posés par la base (remplace, source_retiree, refuse) ne se
-- choisissent pas. Rend le nombre de calculs retirés avec lui.
create function private.retirer_indicateur(p_indicateur_id uuid, p_motif text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_masque constant text := '[retiré pour confidentialité]';
  v_indicateur public.indicateur%rowtype;
  v_avec_saisies boolean;
  v_calculs integer;
begin
  perform private.exige_aal2();
  if not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if p_motif is null or p_motif not in ('plus_suivi', 'doublon', 'erreur', 'se_calcule', 'deja_commun',
                                        'domaine_sensible', 'hors_regles', 'confidentialite') then
    raise exception 'Choisissez le motif du retrait.';
  end if;
  select i.* into v_indicateur from public.indicateur i where i.id = p_indicateur_id for update;
  if not found or v_indicateur.ministere_id is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if v_indicateur.etat = 'retire' then
    raise exception 'Cet indicateur est déjà retiré.';
  end if;
  v_avec_saisies := exists (select 1 from public.mesure m where m.indicateur_id = p_indicateur_id);

  if p_motif = 'confidentialite' then
    perform set_config('pilotage.masquage', 'oui', true);
    update public.indicateur
       set etat = 'retire', retrait_motif = 'confidentialite', libelle = v_masque, definition = v_masque
     where id = p_indicateur_id;
    perform set_config('pilotage.masquage', '', true);
  else
    update public.indicateur set etat = 'retire', retrait_motif = p_motif where id = p_indicateur_id;
  end if;
  v_calculs := private.retirer_calculs_de(p_indicateur_id);

  insert into public.journal (le, compte, ministere_id, action, cible, cible_id, detail)
  values (statement_timestamp(), (select auth.uid()), v_indicateur.ministere_id, 'indicateur_retire',
          'indicateur', p_indicateur_id,
          jsonb_build_object('motif', p_motif, 'avec_saisies', v_avec_saisies, 'calculs', v_calculs));
  return v_calculs;
end $$;

-- 9. Contrôles d'un libellé pendant la frappe, pour l'écran : les familles de
-- private.verifier_texte (bloquantes ou non selon le profil), sans « cumul » pour un « à ce
-- jour », puis « doublon » si le libellé normalisé est déjà sur la fiche ou celui d'un chiffre
-- commun. Un ministère n'interroge que sa fiche (42501 sinon : il n'apprend rien d'une autre) ;
-- l'administration et EJP Tech toute fiche ; le berger et le conseil sont refusés.
create function private.verifier_libelle(p_libelle text, p_nature text, p_ministere_id uuid)
returns table (famille text, message text, bloquant boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_ministere boolean;
  v_pris text;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_type() = 'ministere';
  if v_ministere then
    if p_ministere_id is null or p_ministere_id is distinct from private.mon_ministere() then
      raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
    end if;
  elsif not private.peut_configurer()
        or not exists (select 1 from public.ministere m where m.id = p_ministere_id) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;

  return query
  select v.famille, v.message, v.bloquant
    from private.verifier_texte(p_libelle, v_ministere) with ordinality as v(famille, message, bloquant, n)
   where v.famille <> 'cumul' or p_nature is distinct from 'a_ce_jour'
   order by v.n;

  v_pris := private.libelle_pris(p_ministere_id, btrim(regexp_replace(coalesce(p_libelle, ''), '\s+', ' ', 'g')), null);
  if v_pris is not null then
    return query
    select 'doublon'::text,
           format('%s a déjà « %s ».', case when v_ministere then 'Votre fiche' else 'Cette fiche' end, v_pris),
           true;
  end if;
end $$;

-- 10. Limites d'une fiche, pour le panneau d'ajout (fixées par W0 : 3 ajouts, 30 lignes), lues
-- sous un verrou partagé sur la ligne du ministère (après une création en cours). Mêmes appelants
-- que verifier_libelle.
create function private.limites_indicateurs(p_ministere_id uuid)
returns table (ajouts integer, ajouts_max integer, lignes integer, lignes_max integer)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.exige_aal2();
  if private.mon_type() = 'ministere' then
    if p_ministere_id is null or p_ministere_id is distinct from private.mon_ministere() then
      raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
    end if;
  elsif not private.peut_configurer() then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  perform 1 from public.ministere m where m.id = p_ministere_id for share;
  if not found then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  return query
  select private.ajouts_fiche(p_ministere_id), 3, private.lignes_fiche(p_ministere_id, null), 30;
end $$;

-- 11. Parties publiques, security invoker, d'une ligne

create function public.creer_indicateurs_prevus(p_ministere_id uuid, p_modele text)
returns integer language sql security invoker set search_path = '' as $$
  select private.creer_indicateurs_prevus(p_ministere_id, p_modele);
$$;

create function public.creer_indicateur(p_ministere_id uuid, p_libelle text, p_definition text, p_nature text,
  p_unite text, p_sensible boolean, p_pas_sensible boolean, p_remplace_id uuid, p_pourquoi text default null)
returns uuid language sql security invoker set search_path = '' as $$
  select private.creer_indicateur(p_ministere_id, p_libelle, p_definition, p_nature, p_unite, p_sensible,
                                  p_pas_sensible, p_remplace_id, p_pourquoi);
$$;

create function public.creer_calcul(p_libelle text, p_definition text, p_type text, p_haut_id uuid,
  p_bas_id uuid, p_remplace_id uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select private.creer_calcul(p_libelle, p_definition, p_type, p_haut_id, p_bas_id, p_remplace_id);
$$;

create function public.ajouter_suggestion(p_ministere_id uuid, p_code text, p_pourquoi text default null)
returns uuid language sql security invoker set search_path = '' as $$
  select private.ajouter_suggestion(p_ministere_id, p_code, p_pourquoi);
$$;

create function public.valider_indicateur(p_demande_id uuid, p_decision text, p_motif text default null)
returns void language sql security invoker set search_path = '' as $$
  select private.valider_indicateur(p_demande_id, p_decision, p_motif);
$$;

create function public.corriger_indicateur(p_indicateur_id uuid, p_libelle text, p_definition text)
returns text language sql security invoker set search_path = '' as $$
  select private.corriger_indicateur(p_indicateur_id, p_libelle, p_definition);
$$;

create function public.retirer_indicateur(p_indicateur_id uuid, p_motif text)
returns integer language sql security invoker set search_path = '' as $$
  select private.retirer_indicateur(p_indicateur_id, p_motif);
$$;

create function public.verifier_libelle(p_libelle text, p_nature text, p_ministere_id uuid)
returns table (famille text, message text, bloquant boolean)
language sql security invoker set search_path = '' as $$
  select v.famille, v.message, v.bloquant from private.verifier_libelle(p_libelle, p_nature, p_ministere_id) as v;
$$;

create function public.limites_indicateurs(p_ministere_id uuid)
returns table (ajouts integer, ajouts_max integer, lignes integer, lignes_max integer)
language sql security invoker set search_path = '' as $$
  select l.ajouts, l.ajouts_max, l.lignes, l.lignes_max from private.limites_indicateurs(p_ministere_id) as l;
$$;

-- 12. Droits : les aides internes ne sont exécutables par personne ; les fonctions de l'API,
-- privées et publiques, par authenticated seulement.
revoke all on function
  private.verrouiller_ministere(uuid),
  private.lignes_fiche(uuid, uuid),
  private.ajouts_fiche(uuid),
  private.libelle_pris(uuid, text, uuid),
  private.texte_refuse(text, text, text, boolean, boolean),
  private.texte_libre_refuse(text),
  private.retirer_calculs_de(uuid),
  private.creer_indicateurs_prevus(uuid, text),
  private.creer_indicateur(uuid, text, text, text, text, boolean, boolean, uuid, text),
  private.creer_calcul(text, text, text, uuid, uuid, uuid),
  private.ajouter_suggestion(uuid, text, text),
  private.valider_indicateur(uuid, text, text),
  private.corriger_indicateur(uuid, text, text),
  private.retirer_indicateur(uuid, text),
  private.verifier_libelle(text, text, uuid),
  private.limites_indicateurs(uuid),
  public.creer_indicateurs_prevus(uuid, text),
  public.creer_indicateur(uuid, text, text, text, text, boolean, boolean, uuid, text),
  public.creer_calcul(text, text, text, uuid, uuid, uuid),
  public.ajouter_suggestion(uuid, text, text),
  public.valider_indicateur(uuid, text, text),
  public.corriger_indicateur(uuid, text, text),
  public.retirer_indicateur(uuid, text),
  public.verifier_libelle(text, text, uuid),
  public.limites_indicateurs(uuid)
  from public, anon, authenticated, service_role;

grant execute on function
  private.creer_indicateurs_prevus(uuid, text),
  private.creer_indicateur(uuid, text, text, text, text, boolean, boolean, uuid, text),
  private.creer_calcul(text, text, text, uuid, uuid, uuid),
  private.ajouter_suggestion(uuid, text, text),
  private.valider_indicateur(uuid, text, text),
  private.corriger_indicateur(uuid, text, text),
  private.retirer_indicateur(uuid, text),
  private.verifier_libelle(text, text, uuid),
  private.limites_indicateurs(uuid),
  public.creer_indicateurs_prevus(uuid, text),
  public.creer_indicateur(uuid, text, text, text, text, boolean, boolean, uuid, text),
  public.creer_calcul(text, text, text, uuid, uuid, uuid),
  public.ajouter_suggestion(uuid, text, text),
  public.valider_indicateur(uuid, text, text),
  public.corriger_indicateur(uuid, text, text),
  public.retirer_indicateur(uuid, text),
  public.verifier_libelle(text, text, uuid),
  public.limites_indicateurs(uuid)
  to authenticated;
