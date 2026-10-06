-- Étape 4, lot B1 : définition des indicateurs (docs/plan-etape-4.md, section 4, « B1 » ;
-- docs/conception/contrat-etape-4.md, sections 4, 5 et 7 ; configuration-indicateurs.md 5.2 à 5.4 ;
-- vague-1-decisions.md, X2, X3, X7 et X8).
--
-- 1. Aides : private.normaliser(text) (immuable, libellé normalisé) et private.mois_courant().
-- 2. Colonnes de indicateur : nature « mois », unité, définition, sensible, calcul, état, origine,
--    modèle, remplacement, auteurs, retrait, drapeaux (sans_somme, saisi_dimanche_matin,
--    libelle_sessions). Contraintes de l'étape 1 remplacées : nature, clé (ministère, libellé)
--    remplacée par un index unique sur le libellé normalisé hors retirés, plafond de mesure.valeur
--    porté à 9 999 999 (le plafond de chaque unité est contrôlé par controler_mesure).
-- 3. Table indicateur_terme (X8) : termes d'un calcul, écrits à sa création puis figés.
-- 4. Trigger controler_indicateur : sens figé, aucune suppression ; un indicateur sensible se
--    crée et s'active comme les autres (P42), sans aucun réglage d'activation.
-- 5. controler_mesure réécrit : plafond de l'unité, mois au 1er, ni mois futur ni avant janvier
--    de l'année précédente, mois en cours refusé pour un sensible, calcul jamais saisi.
-- 6. Politiques : lecture de indicateur et indicateur_terme (Q3 : un ministère lit les communs
--    et les siens) ; ajout dans mesure (indicateur actif ou à valider, non calculé).
-- 7. Ministère Coordination de code « coordination » (X7), comme FIJ.
--
-- Aucune donnée personnelle, aucune date du navigateur : les dates métier se calculent à
-- l'heure de Paris.

-- 1. Aides

-- Libellé normalisé : accents retirés, minuscules, tout signe qui n'est ni une lettre ni un
-- chiffre remplacé par une espace, espaces réduits, « nombre de » de tête retiré.
-- « Nombre de projets en cours » et « Projets en cours » donnent le même texte.
create function private.normaliser(p_texte text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select regexp_replace(
           btrim(regexp_replace(
             lower(translate(
               replace(replace(replace(replace(p_texte, 'œ', 'oe'), 'Œ', 'OE'), 'æ', 'ae'), 'Æ', 'AE'),
               'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ',
               'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUYY')),
             '[^a-z0-9]+', ' ', 'g')),
           '^nombre (de |d |des )', '')
$$;

-- 1er du mois en cours, à l'heure de Paris.
create function private.mois_courant() returns date
language sql stable set search_path = '' as $$
  select date_trunc('month', private.aujourdhui())::date
$$;

-- 2. Colonnes de indicateur

alter table public.indicateur
  drop constraint indicateur_nature_check,
  drop constraint indicateur_ministere_id_libelle_key,
  add column definition text,
  add column unite text not null default 'nombre',
  add column sensible boolean not null default false,
  add column calcul text,
  add column etat text not null default 'actif',
  add column origine text not null default 'eglise',
  add column modele_code text,
  add column remplace_id uuid references public.indicateur,
  add column cree_le timestamptz not null default now(),
  add column cree_par uuid references public.compte (user_id),
  add column texte_le timestamptz not null default now(),
  add column texte_par uuid references public.compte (user_id),
  add column retire_le timestamptz,
  add column retrait_motif text,
  add column sans_somme boolean not null default false,
  add column saisi_dimanche_matin boolean not null default false,
  add column libelle_sessions boolean not null default false;

-- Lignes existantes : les trois communs reçoivent leur origine et leur définition (les textes
-- visibles de la saisie du dimanche, maquette 08). Un indicateur propre déjà créé en
-- préproduction reçoit une définition d'attente, à corriger tant que rien n'est saisi.
update public.indicateur set origine = 'commun' where ministere_id is null;
update public.indicateur set definition = case code
    when 'service' then 'Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n''a servi, enregistrez 0.'
    when 'actifs' then 'Comptez chaque STAR dans un seul ministère : son ministère principal.'
    when 'en_fij' then 'Parmi ces STARs actifs, ceux qui participent à une FIJ.'
  end
 where ministere_id is null;
update public.indicateur set definition = 'Définition à compléter par l''administration de l''église.'
 where definition is null;

alter table public.indicateur
  alter column definition set not null,
  add constraint indicateur_nature_check check (nature in ('dimanche', 'mois', 'a_ce_jour')),
  add constraint indicateur_unite_check check (unite in ('nombre', 'grand_nombre', 'euros', 'heure', 'jours')),
  add constraint indicateur_calcul_check check (calcul in ('taux', 'moyenne', 'difference', 'somme', 'evolution')),
  add constraint indicateur_etat_check check (etat in ('en_attente', 'actif', 'retire')),
  add constraint indicateur_origine_check check (origine in ('commun', 'eglise', 'ministere')),
  add constraint indicateur_retrait_motif_check check (retrait_motif in (
    'plus_suivi', 'doublon', 'erreur', 'se_calcule', 'deja_commun', 'domaine_sensible', 'hors_regles',
    'remplace', 'confidentialite', 'source_retiree', 'refuse')),
  add constraint indicateur_definition_check check (char_length(definition) between 10 and 140),
  add constraint indicateur_origine_commun_check check ((origine = 'commun') = (ministere_id is null)),
  add constraint indicateur_actif_etat_check check (actif = (etat = 'actif')),
  add constraint indicateur_retrait_check check (
    (etat = 'retire') = (retire_le is not null) and (retire_le is null) = (retrait_motif is null)),
  add constraint indicateur_en_attente_check check (etat <> 'en_attente' or origine = 'ministere'),
  add constraint indicateur_sensible_check check (
    not sensible or (nature = 'mois' and unite = 'nombre' and calcul is null and not saisi_dimanche_matin)),
  add constraint indicateur_calcul_ministere_check check (calcul is null or ministere_id is not null),
  add constraint indicateur_remplace_check check (remplace_id <> id),
  add constraint indicateur_remplace_id_key unique (remplace_id);

-- Un libellé normalisé est unique sur une fiche, hors retirés : un remplaçant garde le nom de
-- l'indicateur qu'il remplace (celui-ci est retiré d'abord), un libellé retiré peut renaître.
create unique index indicateur_libelle_normalise on public.indicateur (ministere_id, private.normaliser(libelle))
  where etat <> 'retire';

-- Plafond large : le plafond de chaque unité est contrôlé par controler_mesure.
alter table public.mesure
  drop constraint mesure_valeur_check,
  add constraint mesure_valeur_check check (valeur between 0 and 9999999);

-- 3. Termes des calculs (X8)

create table public.indicateur_terme (
  calcul_id uuid not null references public.indicateur,
  ordre smallint not null check (ordre between 1 and 4),
  role text not null check (role in ('haut', 'bas', 'plus', 'moins', 'terme')),
  source_id uuid references public.indicateur,
  comptage text check (comptage in ('prevus', 'realises', 'annules', 'reportes', 'en_attente', 'sans_etat_final')),
  agregat text not null default 'periode' check (agregat in ('periode', 'somme_dimanches_du_mois', 'fin_de_mois')),
  decalage smallint not null default 0 check (decalage between 0 and 3),
  primary key (calcul_id, ordre),
  constraint indicateur_terme_source_ou_comptage_check check ((source_id is null) <> (comptage is null))
);
create index on public.indicateur_terme (source_id);
alter table public.indicateur_terme enable row level security;

-- 4. Sens figé : controler_indicateur (avant ajout, mise à jour et suppression, pour tous les
-- rôles, migrations et jeux d'exemple compris). Il ne contrôle que la structure : les mots
-- (familles de verifier_texte) sont contrôlés par les fonctions de l'API (B3).
--
-- Réglages locaux de transaction, qu'aucun client ne peut poser (l'API n'expose ni set_config
-- ni le schéma private) :
-- - pilotage.masquage = 'oui' : retrait pour confidentialité, les deux textes remplacés par
--   « [retiré pour confidentialité] » dans la même mise à jour que le passage à « retiré » ;
-- - pilotage.migration = 'oui' : une migration change le libellé, la définition ou l'ordre d'un
--   chiffre commun ;
-- - pilotage.validation = 'oui' (lot 2) : valider_indicateur pose le nom corrigé d'un ajout
--   validé d'un ministère.
create function private.controler_indicateur() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_masque constant text := '[retiré pour confidentialité]';
  v_migration boolean := coalesce(current_setting('pilotage.migration', true), '') = 'oui';
  v_masquage boolean := coalesce(current_setting('pilotage.masquage', true), '') = 'oui';
  v_validation boolean := coalesce(current_setting('pilotage.validation', true), '') = 'oui';
  v_ancien public.indicateur%rowtype;
  v_suggestion boolean := false;
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'Un indicateur ne se supprime pas : il se retire.' using errcode = '42501';
  end if;

  -- Textes : espaces de bord retirés, espaces réduits, longueurs.
  new.libelle := regexp_replace(btrim(new.libelle), '\s+', ' ', 'g');
  new.definition := regexp_replace(btrim(new.definition), '\s+', ' ', 'g');
  if new.libelle is null or char_length(new.libelle) not between 2 and 60 then
    raise exception 'Donnez un libellé de 2 à 60 caractères.';
  end if;
  if new.definition is null or char_length(new.definition) not between 10 and 140 then
    raise exception 'Expliquez ce qu''on compte en 10 à 140 caractères.';
  end if;

  if tg_op = 'INSERT' then
    if new.etat is null or new.etat not in ('actif', 'en_attente') then
      raise exception 'Un indicateur naît actif ou à valider.';
    end if;
    new.actif := new.etat = 'actif';
    if position(v_masque in new.libelle) > 0 or position(v_masque in new.definition) > 0 then
      raise exception 'Ce texte est réservé au retrait pour confidentialité.';
    end if;
    -- Un indicateur sensible se crée et s'active comme les autres (P42) : seule sa forme est
    -- imposée.
    if new.sensible then
      if new.nature <> 'mois' or new.saisi_dimanche_matin then
        raise exception 'Un indicateur sensible se saisit chaque mois.';
      end if;
      if new.unite <> 'nombre' then
        raise exception 'Un indicateur sensible est un nombre de 0 à 9 999.';
      end if;
      if new.calcul is not null then
        raise exception 'Un indicateur sensible ne se calcule pas.';
      end if;
    end if;
    if new.saisi_dimanche_matin and (new.nature <> 'dimanche' or new.calcul is not null) then
      raise exception 'Seul un indicateur saisi du dimanche se saisit dès le dimanche matin.';
    end if;
    if new.calcul is not null and new.ministere_id is null then
      raise exception 'Un chiffre commun ne se calcule pas.';
    end if;
    -- Remplacement : un indicateur de la même fiche, jamais un commun ; le remplaçant d'un
    -- sensible est sensible.
    if new.remplace_id is not null then
      select i.* into v_ancien from public.indicateur i where i.id = new.remplace_id;
      if not found or v_ancien.ministere_id is null or v_ancien.ministere_id is distinct from new.ministere_id then
        raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
      end if;
      if v_ancien.sensible and not new.sensible then
        raise exception 'Le remplaçant d''un indicateur sensible est sensible.';
      end if;
    end if;
    -- Auteur et heure imposés pour un compte de l'application ; une migration ou un jeu
    -- d'exemple garde les siens (cree_par nul : Système).
    if auth.uid() is not null then
      new.cree_le := statement_timestamp();
      new.cree_par := auth.uid();
      new.texte_le := statement_timestamp();
      new.texte_par := auth.uid();
    end if;
    return new;
  end if;

  -- Mise à jour : tout ce qui fait le sens est figé.
  if new.id <> old.id or new.code is distinct from old.code or new.ministere_id is distinct from old.ministere_id
     or new.nature <> old.nature or new.unite <> old.unite or new.sensible <> old.sensible
     or new.calcul is distinct from old.calcul or new.origine <> old.origine
     or new.modele_code is distinct from old.modele_code or new.remplace_id is distinct from old.remplace_id
     or new.cree_le <> old.cree_le or new.cree_par is distinct from old.cree_par
     or new.sans_somme <> old.sans_somme or new.saisi_dimanche_matin <> old.saisi_dimanche_matin
     or new.libelle_sessions <> old.libelle_sessions
     or (new.ordre <> old.ordre and not (v_migration and old.ministere_id is null)) then
    raise exception 'Le sens d''un indicateur est figé : remplacez-le pour en changer.' using errcode = '42501';
  end if;

  -- État : actif vers retiré, à valider vers actif ou retiré ; un retiré ne change plus.
  if old.etat = 'retire' and (new is distinct from old) then
    raise exception 'Un indicateur retiré ne change plus.' using errcode = '42501';
  end if;
  if new.etat <> old.etat then
    if not ((old.etat = 'actif' and new.etat = 'retire')
            or (old.etat = 'en_attente' and new.etat in ('actif', 'retire'))) then
      raise exception 'Ce changement d''état n''est pas permis.' using errcode = '42501';
    end if;
    new.actif := new.etat = 'actif';
    if new.etat = 'retire' then
      if new.retrait_motif is null then
        raise exception 'Choisissez le motif du retrait.';
      end if;
      new.retire_le := case when auth.uid() is not null then statement_timestamp()
                            else coalesce(new.retire_le, now()) end;
    end if;
  elsif new.actif is distinct from old.actif or new.retire_le is distinct from old.retire_le
        or new.retrait_motif is distinct from old.retrait_motif then
    raise exception 'L''état d''un indicateur change seulement par un retrait ou une validation.' using errcode = '42501';
  end if;

  -- Textes
  if new.libelle <> old.libelle or new.definition <> old.definition then
    -- Une suggestion garde le texte du catalogue (private.indicateur_prevu, posé par B3 ;
    -- modele = 'suggestion', docs/conception/contrat-etape-4.md, section 5).
    if old.modele_code is not null and to_regclass('private.indicateur_prevu') is not null then
      select exists (select 1 from private.indicateur_prevu p
                      where p.code = old.modele_code and p.modele = 'suggestion')
        into v_suggestion;
    end if;
    if v_masquage and new.etat = 'retire' and old.etat <> 'retire' and new.retrait_motif = 'confidentialite'
       and new.libelle = v_masque and new.definition = v_masque then
      null;                                 -- retrait pour confidentialité
    elsif position(v_masque in new.libelle) > 0 or position(v_masque in new.definition) > 0 then
      raise exception 'Ce texte est réservé au retrait pour confidentialité.';
    elsif old.ministere_id is null then
      if not v_migration then
        raise exception 'Un chiffre commun ne change que par une migration.' using errcode = '42501';
      end if;
    elsif old.origine = 'ministere' and not v_suggestion and new.definition = old.definition
          and (old.etat = 'en_attente' or (old.etat = 'actif' and v_validation)) then
      null;                                 -- lot 2 : nom d'un ajout de ministère (T30)
    elsif v_suggestion then
      raise exception 'Une suggestion garde le texte du catalogue.' using errcode = '42501';
    elsif exists (select 1 from public.mesure m where m.indicateur_id = old.id)
          or exists (select 1 from public.indicateur_terme t
                       join public.mesure m on m.indicateur_id = t.source_id
                      where t.calcul_id = old.id) then
      raise exception 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.';
    end if;
    if auth.uid() is not null then
      new.texte_le := statement_timestamp();
      new.texte_par := auth.uid();
    end if;
  elsif new.texte_le <> old.texte_le or new.texte_par is distinct from old.texte_par then
    raise exception 'Le sens d''un indicateur est figé : remplacez-le pour en changer.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger controler_indicateur before insert or update or delete on public.indicateur
  for each row execute function private.controler_indicateur();
create trigger controler_indicateur_vider before truncate on public.indicateur
  for each statement execute function private.controler_indicateur();

-- Termes : un terme vise un calcul, à sa création ; sa source est un indicateur actif de la
-- même fiche, ni commun ni sensible, de rythme compatible ; un comptage d'événements se lit par
-- mois. Les règles de lecture (taux et moyennes seulement en V1) sont celles des vues (B2).
create function private.controler_terme() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_calcul public.indicateur%rowtype;
  v_source public.indicateur%rowtype;
begin
  select i.* into v_calcul from public.indicateur i where i.id = new.calcul_id;
  if not found or v_calcul.calcul is null then
    raise exception 'Un terme appartient à un calcul.';
  end if;
  -- Écrit seulement à la création du calcul : dans la même instruction de l'API (une fonction
  -- de configuration), jamais après. Une migration ou un jeu d'exemple écrit le calcul et ses
  -- termes dans la même transaction.
  if v_calcul.etat = 'retire' or (auth.uid() is not null and v_calcul.cree_le <> statement_timestamp()) then
    raise exception 'Les termes d''un calcul s''écrivent à sa création, puis ne changent plus.' using errcode = '42501';
  end if;
  if not ((v_calcul.calcul in ('taux', 'moyenne') and new.role in ('haut', 'bas'))
          or (v_calcul.calcul = 'difference' and new.role in ('plus', 'moins'))
          or (v_calcul.calcul in ('somme', 'evolution') and new.role = 'terme')) then
    raise exception 'Ce rôle ne convient pas à ce calcul.';
  end if;
  if new.decalage > 0 and v_calcul.nature <> 'mois' then
    raise exception 'Un décalage se compte en mois : il demande un calcul du mois.';
  end if;
  if new.source_id is not null then
    select i.* into v_source from public.indicateur i where i.id = new.source_id;
    if not found or v_source.ministere_id is null or v_source.ministere_id is distinct from v_calcul.ministere_id
       or v_source.id = v_calcul.id then
      raise exception 'Ces deux chiffres ne se calculent pas ensemble.';
    end if;
    if v_source.sensible then
      raise exception 'Un indicateur sensible n''entre dans aucun calcul.';
    end if;
    if v_source.etat <> 'actif' then
      raise exception 'Un calcul se fait sur des indicateurs actifs.';
    end if;
    if not ((new.agregat = 'periode'
             and (v_source.nature = v_calcul.nature or (v_source.nature = 'a_ce_jour' and new.role <> 'haut')))
            or (new.agregat = 'somme_dimanches_du_mois' and v_source.nature = 'dimanche' and v_calcul.nature = 'mois')
            or (new.agregat = 'fin_de_mois' and v_source.nature = 'a_ce_jour' and v_calcul.nature = 'mois')) then
      raise exception 'Ces deux chiffres ne se calculent pas ensemble.';
    end if;
  elsif new.agregat <> 'periode' or v_calcul.nature <> 'mois' then
    raise exception 'Un comptage d''événements se lit par mois.';
  end if;
  return new;
end $$;

-- Un calcul complet à la fin de la transaction : taux et moyenne, un haut et un bas au moins ;
-- différence, un « plus » et un « moins » au moins ; somme, 2 à 4 termes ; évolution, un terme.
create function private.verifier_termes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_indicateur public.indicateur%rowtype;
  v_haut integer;
  v_bas integer;
  v_plus integer;
  v_moins integer;
  v_terme integer;
begin
  if tg_table_name = 'indicateur' then
    v_id := new.id;
  else
    v_id := new.calcul_id;
  end if;
  select i.* into v_indicateur from public.indicateur i where i.id = v_id;
  if not found or v_indicateur.calcul is null then
    return null;
  end if;
  select count(*) filter (where t.role = 'haut'), count(*) filter (where t.role = 'bas'),
         count(*) filter (where t.role = 'plus'), count(*) filter (where t.role = 'moins'),
         count(*) filter (where t.role = 'terme')
    into v_haut, v_bas, v_plus, v_moins, v_terme
    from public.indicateur_terme t
   where t.calcul_id = v_id;
  if not ((v_indicateur.calcul in ('taux', 'moyenne') and v_haut >= 1 and v_bas >= 1 and v_plus + v_moins + v_terme = 0)
          or (v_indicateur.calcul = 'difference' and v_plus >= 1 and v_moins >= 1 and v_haut + v_bas + v_terme = 0)
          or (v_indicateur.calcul = 'somme' and v_terme between 2 and 4 and v_haut + v_bas + v_plus + v_moins = 0)
          or (v_indicateur.calcul = 'evolution' and v_terme = 1 and v_haut + v_bas + v_plus + v_moins = 0)) then
    raise exception 'Le calcul « % » n''a pas tous ses termes.', v_indicateur.libelle;
  end if;
  return null;
end $$;

create trigger controler_terme before insert on public.indicateur_terme
  for each row execute function private.controler_terme();
create constraint trigger termes_complets after insert on public.indicateur
  deferrable initially deferred
  for each row when (new.calcul is not null) execute function private.verifier_termes();
create constraint trigger termes_complets after insert on public.indicateur_terme
  deferrable initially deferred
  for each row execute function private.verifier_termes();
create trigger ajout_seulement before update or delete on public.indicateur_terme
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.indicateur_terme
  for each statement execute function private.refuser_modification();

-- 5. Saisies : controler_mesure réécrit
--
-- Contrôles d'une valeur à un instant donné (l'heure de Paris décide du jour et du mois). Le
-- trigger l'appelle avec now() ; les tests l'appellent avec des instants fixes (bascule du mois,
-- dimanche matin). Dans l'ordre : indicateur ni actif ni à valider, calcul, plafond de l'unité,
-- puis la date (mois au 1er, ni futur, ni avant le 1er janvier de l'année précédente, mois en
-- cours refusé pour un sensible ; dimanche passé ou du jour, dès le matin).
create function private.controler_mesure_le(p_indicateur_id uuid, p_date_ref date, p_valeur integer,
  p_instant timestamptz)
returns void
language plpgsql stable set search_path = '' as $$
declare
  v_indicateur public.indicateur%rowtype;
  v_jour date := (p_instant at time zone 'Europe/Paris')::date;
  v_mois date := date_trunc('month', p_instant at time zone 'Europe/Paris')::date;
  v_plafond integer;
begin
  select i.* into v_indicateur from public.indicateur i where i.id = p_indicateur_id;
  if not found then
    return;                                 -- la clé étrangère refuse la ligne
  end if;
  if v_indicateur.etat not in ('actif', 'en_attente') then
    raise exception '« % » n''est plus proposé à la saisie.', v_indicateur.libelle;
  end if;
  if v_indicateur.calcul is not null then
    raise exception 'Ce chiffre se calcule : il ne se saisit pas.';
  end if;
  v_plafond := case v_indicateur.unite
                 when 'nombre' then 9999
                 when 'heure' then 1439
                 when 'jours' then 99999
                 else 9999999
               end;
  if p_valeur is null or p_valeur < 0 or p_valeur > v_plafond then
    raise exception '%', case v_indicateur.unite
                           when 'nombre' then 'Entre 0 et 9 999.'
                           when 'heure' then 'Choisissez une heure entre 0 h 00 et 23 h 59.'
                           when 'jours' then 'Entre 0 et 99 999.'
                           else 'Entre 0 et 9 999 999.'
                         end;
  end if;
  if v_indicateur.nature = 'mois' then
    if extract(day from p_date_ref) <> 1 then
      raise exception 'Un mois se saisit à la date de son 1er jour.';
    end if;
    if p_date_ref > v_mois then
      raise exception 'Ce mois n''est pas encore commencé.';
    end if;
    if p_date_ref < make_date(extract(year from v_jour)::integer - 1, 1, 1) then
      raise exception 'Ce mois est trop ancien pour être saisi.';
    end if;
    if v_indicateur.sensible and p_date_ref = v_mois then
      raise exception 'Ce chiffre se saisit une fois le mois fini.';
    end if;
  elsif v_indicateur.nature = 'dimanche' then
    if extract(isodow from p_date_ref) <> 7 or p_date_ref > v_jour then
      raise exception 'La date doit être un dimanche passé ou aujourd''hui.';
    end if;
  end if;
end $$;

-- Trigger avant ajout : un compte de l'application doit être en aal2 et ne vise que les communs
-- et les indicateurs de son ministère (sinon le message ne nomme rien) ; « à ce jour » prend la
-- date du jour (heure de Paris) ; puis les contrôles de controler_mesure_le.
create or replace function private.controler_mesure() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_indicateur public.indicateur%rowtype;
begin
  select i.* into v_indicateur from public.indicateur i where i.id = new.indicateur_id;
  if auth.uid() is not null then
    if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
      raise exception 'Double authentification requise.' using errcode = '42501';
    end if;
    if v_indicateur.ministere_id is not null and v_indicateur.ministere_id is distinct from private.mon_ministere() then
      raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
    end if;
    if v_indicateur.nature = 'a_ce_jour' then
      new.date_ref := private.aujourdhui();
    end if;
  end if;
  perform private.controler_mesure_le(new.indicateur_id, new.date_ref, new.valeur, now());
  return new;
end $$;

-- 6. Politiques et droits

-- Lecture des définitions (Q3) : un ministère lit les communs et les siens, tous états ; le
-- berger, le conseil, l'administration et EJP Tech lisent tout, ajouts à valider compris.
drop policy lecture on public.indicateur;
create policy lecture on public.indicateur for select to authenticated using (
  (select private.lit_tout())
  or (select private.mon_type()) = 'admin_eglise'
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id is null or ministere_id = (select private.mon_ministere()))));

-- Les termes se lisent comme leur calcul (la politique relit indicateur sous sa RLS).
create policy lecture on public.indicateur_terme for select to authenticated
  using (calcul_id in (select i.id from public.indicateur i));
create policy double_authentification on public.indicateur_terme as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- Ajout d'une mesure : son ministère, un indicateur actif ou à valider (décidé le 6 octobre
-- 2026), jamais un calcul.
drop policy ajout on public.mesure;
create policy ajout on public.mesure for insert to authenticated with check (
  ministere_id = (select private.mon_ministere())
  and exists (select 1 from public.indicateur i
              where i.id = mesure.indicateur_id and i.etat in ('actif', 'en_attente') and i.calcul is null
                and (i.ministere_id is null or i.ministere_id = mesure.ministere_id)));

revoke all on public.indicateur_terme from public, anon, authenticated, service_role;
grant select on public.indicateur_terme to authenticated;

revoke all on function private.normaliser(text) from public, anon, authenticated, service_role;
revoke all on function private.mois_courant() from public, anon, authenticated, service_role;
revoke all on function private.controler_indicateur() from public, anon, authenticated, service_role;
revoke all on function private.controler_terme() from public, anon, authenticated, service_role;
revoke all on function private.verifier_termes() from public, anon, authenticated, service_role;
revoke all on function private.controler_mesure_le(uuid, date, integer, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function private.controler_mesure() from public, anon, authenticated, service_role;
-- Lues par les vues et les politiques des lots suivants, au nom du compte connecté.
grant execute on function private.normaliser(text), private.mois_courant() to authenticated;

-- 7. Ministère Coordination (X7), comme FIJ : le code est posé sur le ministère qui porte ce nom
-- s'il existe déjà, sinon le ministère est créé avec sa ligne de journal (compte nul :
-- « Système »).
update public.ministere set code = 'coordination'
 where id = (select m.id from public.ministere m
              where m.code is null and private.normaliser(m.nom) = 'coordination'
              order by m.cree_le limit 1)
   and not exists (select 1 from public.ministere m where m.code = 'coordination');

with coordination as (
  insert into public.ministere (code, nom)
  select 'coordination', 'Coordination'
   where not exists (select 1 from public.ministere m where m.code = 'coordination')
  returning id
)
insert into public.journal (compte, ministere_id, action, cible, cible_id)
select null, c.id, 'ministere_cree', 'ministere', c.id from coordination c;
