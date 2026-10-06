-- Étape 4, lot B8 : précisions et répartitions des indicateurs sensibles (docs/plan-etape-4.md,
-- section 4, « B8 » et matrice ; docs/conception/contrat-etape-4.md, sections 1, 5, 6 et 7 ;
-- docs/decisions.md, P45, P46, P47 et T41, modèle approuvé par écrit le 6 octobre 2026).
--
-- 1. Contraintes de W0 réécrites (sa migration est figée) : journal_cible_check et
--    moderation_cible_check gagnent precision_sensible, moderation_cible_champ_check gagne le
--    couple (precision_sensible, texte), avec l'union de tous les codes actuels.
--    journal_action_check ne change pas : aucun code d'action nouveau.
-- 2. Table categorie_sensible : les catégories d'un indicateur sensible du catalogue, écrites
--    seulement par migration (réglage local pilotage.migration), d'après la liste de la
--    coordination. Aucune ligne en production ici : chaque liste arrivera par une petite
--    migration. Une catégorie qui sert dans une répartition ne change plus, sauf la pose de
--    retiree_le (de null à une date) quand la coordination change sa liste.
-- 3. Tables ventilation_sensible et precision_sensible, en ajout seulement, attachées au total
--    (ligne de mesure) qu'elles accompagnent. Seule saisir_chiffres_mois y écrit (aucun GRANT
--    insert). Une répartition reprend toutes les catégories en cours de la liste (une catégorie
--    laissée vide vaut 0), une seule fois par total, et sa somme ne dépasse jamais le total.
--    La précision fait 10 à 280 caractères après trim ; seule exception à l'ajout seulement :
--    masquer_texte.
-- 4. private.repartition_protegee(integer[]) : la règle d'affichage de P47 (règles 1 à 6), une
--    seule fonction, appelée par la vue et par le test qui joue le lecteur.
-- 5. Lectures : v_ventilation_sensible et v_precision_sensible, adossées à
--    private.ventilations_sensibles() et private.precisions_sensibles() (security definer, aal2
--    contrôlé dans le jeton, filtre du lecteur réappliqué) : le total le plus récent de chaque
--    mois seulement (même départage que v_mesure_periode), valeurs exactes pour le ministère,
--    règle de P47 pour le berger, le conseil et EJP Tech, rien pour l'administration ni pour un
--    autre ministère, rien pour un indicateur retiré pour confidentialité.
-- 6. saisir_chiffres_mois(p_mois, p_lignes) : « Chiffres du mois » en un appel, une seule
--    instruction insert dans mesure (donc une seule ligne de journal mesure_saisie, sans ligne
--    sensible ni texte), puis les répartitions et les précisions, tout ou rien.
-- 7. Modération et journal : masquer_texte et marquer_relu recréés depuis leur dernière version
--    (B3 pour masquer_texte, étape 1 pour marquer_relu) avec le couple (precision_sensible,
--    texte) ; private.auteur_texte connaît aussi les cibles demande_indicateur et validation
--    (marquer_relu les refusait). La politique de lecture de journal et v_journal retirent à
--    l'administration les lignes de cible precision_sensible (matrice : « rien ») ; v_journal
--    donne pour cette cible « Précision : » suivi du libellé actuel de l'indicateur et du mois,
--    sous la RLS du lecteur, jamais le texte.
--
-- Aucune donnée personnelle ; dates métier à l'heure de Paris (private.mois_courant() et
-- controler_mesure) ; aucun SQL dynamique.

-- 1. Contraintes du journal et de la modération

alter table public.journal
  drop constraint journal_cible_check,
  add constraint journal_cible_check check (cible in (
    'session', 'evenement', 'reunion', 'point_attention', 'point_suivi', 'compte', 'ministere',
    'indicateur', 'demande_indicateur', 'validation', 'signalement', 'signalement_suivi',
    'precision_sensible'));

alter table public.moderation
  drop constraint moderation_cible_check,
  add constraint moderation_cible_check check (cible in (
    'point_attention', 'point_suivi', 'evenement', 'reunion',
    'demande_indicateur', 'validation', 'signalement', 'signalement_suivi', 'precision_sensible')),
  drop constraint moderation_cible_champ_check,
  add constraint moderation_cible_champ_check check (champ is null or (cible, champ) in (
    ('point_attention', 'titre'), ('point_attention', 'description'), ('point_attention', 'action_attendue'),
    ('point_suivi', 'commentaire'), ('evenement', 'titre'),
    ('reunion', 'objet'), ('reunion', 'decision_attendue'),
    ('demande_indicateur', 'pourquoi'), ('validation', 'motif'),
    ('signalement', 'texte'), ('signalement_suivi', 'commentaire'),
    ('precision_sensible', 'texte')));

-- 2. Catégories des indicateurs sensibles

create table public.categorie_sensible (
  prevu_code text not null references private.indicateur_prevu (code),
  code text not null check (code ~ '^[a-z_]{1,30}$'),
  libelle text not null check (char_length(libelle) between 1 and 40 and libelle = btrim(libelle)),
  ordre smallint not null check (ordre > 0),                -- rang dans la liste : unique, il départage la règle de P47
  retiree_le date,
  primary key (prevu_code, code),
  constraint categorie_sensible_ordre_key unique (prevu_code, ordre)
);

-- 3. Répartitions et précisions

create table public.ventilation_sensible (
  id bigint generated always as identity primary key,
  mesure_id bigint not null references public.mesure,
  indicateur_id uuid not null references public.indicateur,
  ministere_id uuid not null references public.ministere,
  mois date not null check (extract(day from mois) = 1),
  categorie text not null,
  valeur integer not null check (valeur between 0 and 9999),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint ventilation_sensible_mesure_categorie_key unique (mesure_id, categorie)
);
create index on public.ventilation_sensible (ministere_id, indicateur_id, mois);

create table public.precision_sensible (
  id uuid primary key default gen_random_uuid(),
  mesure_id bigint not null unique references public.mesure,
  indicateur_id uuid not null references public.indicateur,
  ministere_id uuid not null references public.ministere,
  mois date not null check (extract(day from mois) = 1),
  texte text not null,                                     -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  constraint precision_sensible_texte_check check (char_length(texte) between 10 and 280 and texte = btrim(texte))
);
create index on public.precision_sensible (ministere_id, indicateur_id, mois);

alter table public.categorie_sensible enable row level security;
alter table public.ventilation_sensible enable row level security;
alter table public.precision_sensible enable row level security;

-- Catégories : écrites seulement sous pilotage.migration (aucun compte de l'application ne peut
-- poser ce réglage : l'API n'expose ni set_config ni le schéma private), pour un indicateur
-- sensible du catalogue. Dès qu'une répartition l'utilise, une catégorie ne change plus et ne
-- s'efface plus ; seul changement permis, la pose de retiree_le de null à une date.
create function private.controler_categorie_sensible() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_utilisee boolean;
begin
  if coalesce(current_setting('pilotage.migration', true), '') <> 'oui' then
    raise exception 'Les catégories d''un indicateur sensible s''écrivent seulement par migration.'
      using errcode = '42501';
  end if;
  if tg_op = 'TRUNCATE' then
    if exists (select 1 from public.ventilation_sensible) then
      raise exception 'Une catégorie qui sert dans une répartition ne s''efface pas.' using errcode = '42501';
    end if;
    return null;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    select exists (select 1 from public.ventilation_sensible v
                     join public.indicateur i on i.id = v.indicateur_id
                    where i.modele_code = old.prevu_code and v.categorie = old.code)
      into v_utilisee;
    if v_utilisee and (tg_op = 'DELETE'
                       or not (old.retiree_le is null and new.retiree_le is not null
                               and (to_jsonb(new) - 'retiree_le') = (to_jsonb(old) - 'retiree_le'))) then
      raise exception 'Cette catégorie sert déjà dans une répartition : elle ne change plus, elle se retire seulement.'
        using errcode = '42501';
    end if;
    if tg_op = 'DELETE' then
      return old;
    end if;
  end if;
  if not exists (select 1 from private.indicateur_prevu p where p.code = new.prevu_code and p.sensible) then
    raise exception 'Une catégorie appartient à un indicateur sensible du catalogue.';
  end if;
  return new;
end $$;

create trigger controler_categorie_sensible before insert or update or delete on public.categorie_sensible
  for each row execute function private.controler_categorie_sensible();
create trigger controler_categorie_sensible_vider before truncate on public.categorie_sensible
  for each statement execute function private.controler_categorie_sensible();

-- Répartitions : contrôlées à la fin de chaque instruction d'ajout (transition), que l'ajout
-- vienne de saisir_chiffres_mois ou d'un jeu d'exemple. Chaque total répartit son indicateur
-- sensible, son ministère et son mois ; toutes ses lignes arrivent dans la même instruction
-- (une seule répartition par total) ; la liste en cours de l'indicateur compte de 3 à 6
-- catégories (la règle de P47 suppose au moins 4 cases avec « Non réparti » et n'a été simulée
-- que jusqu'à 7) ; elles reprennent les catégories en cours de la liste, et elles seules ; leur
-- somme ne dépasse pas le total.
create function private.verifier_ventilations() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_somme bigint;
  v_total integer;
begin
  if exists (select 1 from nouvelles n
               join public.mesure m on m.id = n.mesure_id
               join public.indicateur i on i.id = m.indicateur_id
              where n.indicateur_id <> m.indicateur_id or n.ministere_id <> m.ministere_id
                 or n.mois <> m.date_ref or not i.sensible) then
    raise exception 'Une répartition accompagne le total du mois d''un indicateur sensible.';
  end if;
  if exists (select 1 from (select distinct x.mesure_id from nouvelles x) as t
              where (select count(*) from public.ventilation_sensible v where v.mesure_id = t.mesure_id)
                    <> (select count(*) from nouvelles x where x.mesure_id = t.mesure_id)) then
    raise exception 'Un total ne se répartit qu''une fois.';
  end if;
  if exists (select 1
               from (select distinct i.modele_code
                       from nouvelles x join public.indicateur i on i.id = x.indicateur_id) as t
              where (select count(*) from public.categorie_sensible c
                      where c.prevu_code = t.modele_code and c.retiree_le is null) not between 3 and 6) then
    raise exception 'Une répartition demande de 3 à 6 catégories en cours dans la liste de l''indicateur.';
  end if;
  if exists (select 1
               from (select distinct x.mesure_id, i.modele_code
                       from nouvelles x join public.indicateur i on i.id = x.indicateur_id) as t
              where array(select x.categorie from nouvelles x where x.mesure_id = t.mesure_id order by 1)
                    is distinct from
                    array(select c.code from public.categorie_sensible c
                           where c.prevu_code = t.modele_code and c.retiree_le is null order by 1)) then
    raise exception 'Une répartition reprend toutes les catégories en cours de la liste de l''indicateur, et elles seules.';
  end if;
  select s.somme, s.total into v_somme, v_total
    from (select sum(x.valeur) as somme, m.valeur as total
            from nouvelles x join public.mesure m on m.id = x.mesure_id
           group by x.mesure_id, m.valeur) as s
   where s.somme > s.total
   limit 1;
  if found then
    raise exception 'La somme des catégories (%) dépasse le total du mois (%).', v_somme, v_total;
  end if;
  return null;
end $$;

-- Précision : attachée au total du mois d'un indicateur sensible, avec son indicateur, son
-- ministère et son mois ; texte sans espace de bord (la contrainte contrôle sa longueur).
create function private.controler_precision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_mesure public.mesure%rowtype;
begin
  select m.* into v_mesure from public.mesure m where m.id = new.mesure_id;
  if not found then
    return new;                             -- la clé étrangère refuse la ligne
  end if;
  if new.indicateur_id is distinct from v_mesure.indicateur_id
     or new.ministere_id is distinct from v_mesure.ministere_id
     or new.mois is distinct from v_mesure.date_ref
     or not exists (select 1 from public.indicateur i where i.id = v_mesure.indicateur_id and i.sensible) then
    raise exception 'Une précision accompagne le total du mois d''un indicateur sensible.';
  end if;
  new.texte := btrim(new.texte);
  return new;
end $$;

create trigger controler_precision before insert on public.precision_sensible
  for each row execute function private.controler_precision();
create trigger forcer_auteur before insert on public.precision_sensible
  for each row execute function private.forcer_auteur();
create trigger ajout_seulement before update or delete on public.precision_sensible
  for each row execute function private.refuser_modification_sauf_masquage('texte');
create trigger ajout_seulement_vider before truncate on public.precision_sensible
  for each statement execute function private.refuser_modification();

create trigger forcer_auteur before insert on public.ventilation_sensible
  for each row execute function private.forcer_auteur();
create trigger verifier_ventilations after insert on public.ventilation_sensible
  referencing new table as nouvelles for each statement execute function private.verifier_ventilations();
create trigger ajout_seulement before update or delete on public.ventilation_sensible
  for each row execute function private.refuser_modification();
create trigger ajout_seulement_vider before truncate on public.ventilation_sensible
  for each statement execute function private.refuser_modification();

-- Lecture des tables (matrice, section 4). Catégories : comme indicateur (Q3), il existe un
-- indicateur sensible lisible, sous sa propre RLS, dont modele_code vaut prevu_code.
-- Répartitions brutes : le seul ministère qui les saisit. Précisions brutes : le ministère
-- auteur et EJP Tech (relecture et masquage) ; le berger et le conseil lisent
-- v_precision_sensible, qui ne montre ni les envois intermédiaires ni leur date. Rien pour un
-- indicateur retiré pour confidentialité (Q11). Aucune politique d'ajout.
create policy lecture on public.categorie_sensible for select to authenticated using (
  exists (select 1 from public.indicateur i
           where i.modele_code = categorie_sensible.prevu_code and i.sensible));

create policy lecture on public.ventilation_sensible for select to authenticated using (
  ministere_id = (select private.mon_ministere())
  and exists (select 1 from public.indicateur i
               where i.id = ventilation_sensible.indicateur_id
                 and i.retrait_motif is distinct from 'confidentialite'));

create policy lecture on public.precision_sensible for select to authenticated using (
  (ministere_id = (select private.mon_ministere()) or (select private.mon_type()) = 'admin_plateforme')
  and exists (select 1 from public.indicateur i
               where i.id = precision_sensible.indicateur_id
                 and i.retrait_motif is distinct from 'confidentialite'));

create policy double_authentification on public.categorie_sensible as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.ventilation_sensible as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.precision_sensible as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.categorie_sensible, public.ventilation_sensible, public.precision_sensible
  from public, anon, authenticated, service_role;
revoke all on sequence public.ventilation_sensible_id_seq from public, anon, authenticated, service_role;
grant select on public.categorie_sensible, public.ventilation_sensible, public.precision_sensible to authenticated;

-- 4. Règle d'affichage de P47, pour le berger, le conseil et EJP Tech
--
-- p_valeurs : les cases d'une répartition dans l'ordre de la liste de la coordination,
-- « Non réparti » en dernier. Une ligne par case : valeur (null si « moins de 3 » ou masquée),
-- moins_de_3, masquee, tout_masque.
-- 1. « Non réparti » compte comme une case, la dernière ;
-- 2. un total de 0, 1 ou 2 : tout masqué ;
-- 3. une case de 1 ou 2 s'affiche « moins de 3 » ; 0 reste 0 ; 3 ou plus s'affiche ;
-- 4. aucune case « moins de 3 » : tout s'affiche ;
-- 5. sinon la plus grande case de 3 ou plus est masquée, à égalité la première dans l'ordre ;
--    aucune case de 3 ou plus : tout masqué ;
-- 6. tout masqué aussi quand toutes les cases « moins de 3 » valent 1 et que la case masquée
--    vaut exactement la borne : le plus grand de 3 et, pour chaque autre case de 3 ou plus, de
--    sa valeur plus 1 si elle est avant la masquée, de sa valeur sinon.
create function private.repartition_protegee(p_valeurs integer[])
returns table (rang integer, valeur integer, moins_de_3 boolean, masquee boolean, tout_masque boolean)
language sql immutable parallel safe set search_path = '' as $$
  with c as (
    select u.v, u.i::integer as i from unnest(p_valeurs) with ordinality as u(v, i)
  ),
  s as (
    select coalesce(sum(c.v), 0) as total,
           coalesce(bool_or(c.v in (1, 2)), false) as petite,
           coalesce(bool_and(c.v = 1) filter (where c.v in (1, 2)), false) as petites_a_un,
           (select g.i from c as g where g.v >= 3 order by g.v desc, g.i limit 1) as k
      from c
  ),
  b as (
    select s.total, s.petite, s.petites_a_un, s.k,
           (select g.v from c as g where g.i = s.k) as vk,
           greatest(3, (select max(case when g.i < s.k then g.v + 1 else g.v end)
                          from c as g where g.v >= 3 and g.i <> s.k)) as borne
      from s
  ),
  d as (
    select b.petite, b.k,
           (b.total <= 2 or (b.petite and (b.k is null or (b.petites_a_un and b.vk = b.borne)))) as tout
      from b
  )
  select c.i,
         case when d.tout or c.v in (1, 2) or (d.petite and c.i = d.k) then null else c.v end,
         not d.tout and c.v in (1, 2),
         not d.tout and d.petite and c.i = d.k,
         d.tout
    from c cross join d
   order by c.i
$$;

-- 5. Lectures

-- Répartition du total le plus récent de chaque indicateur sensible, ministère et mois (même
-- départage que private.mesures_periode : saisi_le puis id décroissants). Un mois dont le total
-- le plus récent n'a pas de répartition n'a aucune ligne. Sinon une ligne par catégorie (ordre
-- de la liste, une catégorie retirée depuis garde son libellé) et une ligne « Non réparti »
-- (categorie null, ordre 32767). Valeurs exactes pour le ministère ; règle de P47 pour le
-- berger, le conseil et EJP Tech ; rien pour les autres, rien hors aal2.
create function private.ventilations_sensibles()
returns table (indicateur_id uuid, ministere_id uuid, periode date, categorie text, libelle text, ordre smallint,
               valeur integer, moins_de_3 boolean, masquee boolean, tout_masque boolean)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_ministere() as ministere, private.lit_tout() as lit_tout
     where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  ),
  derniere as (
    select distinct on (m.ministere_id, m.indicateur_id, m.date_ref)
           m.id, m.indicateur_id, m.ministere_id, m.date_ref, m.valeur
      from public.mesure m
      join public.indicateur i on i.id = m.indicateur_id
     where i.sensible
     order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc
  ),
  lues as (
    select d.id, d.indicateur_id, d.ministere_id, d.date_ref, d.valeur, i.modele_code,
           coalesce(d.ministere_id = moi.ministere, false) as sienne
      from derniere d
      join public.indicateur i on i.id = d.indicateur_id
     cross join moi
     where i.retrait_motif is distinct from 'confidentialite'
       and (d.ministere_id = moi.ministere
            or (moi.lit_tout and i.retrait_motif is distinct from 'refuse'))
  ),
  cases as (
    select l.id as mesure_id, l.indicateur_id, l.ministere_id, l.date_ref, l.sienne,
           v.categorie, c.libelle, c.ordre, v.valeur
      from lues l
      join public.ventilation_sensible v on v.mesure_id = l.id
      left join public.categorie_sensible c on c.prevu_code = l.modele_code and c.code = v.categorie
    union all
    select l.id, l.indicateur_id, l.ministere_id, l.date_ref, l.sienne,
           null, 'Non réparti', 32767::smallint, l.valeur - r.somme
      from lues l
     cross join lateral (select sum(v.valeur)::integer as somme
                           from public.ventilation_sensible v where v.mesure_id = l.id) as r
     where r.somme is not null
  ),
  numerotees as (
    select x.mesure_id, x.indicateur_id, x.ministere_id, x.date_ref, x.sienne, x.categorie, x.libelle,
           x.ordre, x.valeur,
           (row_number() over (partition by x.mesure_id order by x.ordre, x.categorie nulls last))::integer as rang
      from cases x
  ),
  affichage as (
    select t.mesure_id, p.rang, p.valeur, p.moins_de_3, p.masquee, p.tout_masque
      from (select n.mesure_id, array_agg(n.valeur order by n.rang) as valeurs
              from numerotees n
             where not n.sienne
             group by n.mesure_id) as t
     cross join lateral private.repartition_protegee(t.valeurs) as p
  )
  select n.indicateur_id, n.ministere_id, n.date_ref, n.categorie, n.libelle, n.ordre,
         case when n.sienne then n.valeur else a.valeur end,
         coalesce(not n.sienne and a.moins_de_3, false),
         coalesce(not n.sienne and a.masquee, false),
         coalesce(not n.sienne and a.tout_masque, false)
    from numerotees n
    left join affichage a on a.mesure_id = n.mesure_id and a.rang = n.rang
$$;

create view public.v_ventilation_sensible with (security_invoker = true) as
select v.indicateur_id, v.ministere_id, v.periode, v.categorie, v.libelle, v.ordre,
       v.valeur, v.moins_de_3, v.masquee, v.tout_masque
  from private.ventilations_sensibles() as v;

-- Précision attachée au total le plus récent de chaque indicateur sensible, ministère et mois,
-- sans mesure_id ni date d'envoi : le berger et le conseil ne voient ni les textes remplacés,
-- ni le nombre d'envois. Un total plus récent sans précision n'a aucune ligne. Texte masqué :
-- « [texte masqué par EJP Tech] » (masquer_texte réécrit la ligne). Mêmes lecteurs que la
-- répartition.
create function private.precisions_sensibles()
returns table (indicateur_id uuid, ministere_id uuid, mois date, texte text)
language sql stable security definer set search_path = '' as $$
  with moi as (
    select private.mon_ministere() as ministere, private.lit_tout() as lit_tout
     where coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  ),
  derniere as (
    select distinct on (m.ministere_id, m.indicateur_id, m.date_ref)
           m.id, m.indicateur_id, m.ministere_id, m.date_ref
      from public.mesure m
      join public.indicateur i on i.id = m.indicateur_id
     where i.sensible
     order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc
  )
  select d.indicateur_id, d.ministere_id, d.date_ref, p.texte
    from derniere d
    join public.indicateur i on i.id = d.indicateur_id
    join public.precision_sensible p on p.mesure_id = d.id
   cross join moi
   where i.retrait_motif is distinct from 'confidentialite'
     and (d.ministere_id = moi.ministere
          or (moi.lit_tout and i.retrait_motif is distinct from 'refuse'))
$$;

create view public.v_precision_sensible with (security_invoker = true) as
select p.indicateur_id, p.ministere_id, p.mois, p.texte
  from private.precisions_sensibles() as p;

revoke all on public.v_ventilation_sensible, public.v_precision_sensible from public, anon, authenticated, service_role;
grant select on public.v_ventilation_sensible, public.v_precision_sensible to authenticated;

-- 6. Saisie des chiffres du mois
--
-- p_lignes : 1 à 30 éléments {"indicateur_id", "valeur", "categories", "precision"}, sans
-- doublon d'indicateur. categories (objet {"code": valeur}) seulement pour un indicateur sensible
-- dont la liste en cours compte de 3 à 6 catégories : les codes de sa liste, des entiers de 0 à 9 999 ; une catégorie
-- absente de l'objet vaut 0 (la répartition écrite reprend toute la liste, que la règle de P47
-- suppose) ; un objet vide, null ou absent : pas de répartition. precision seulement pour un
-- indicateur sensible, 10 à 280 caractères après trim, sans donnée personnelle ni crochets ;
-- null ou absente : pas de précision. Les contrôles de la politique d'ajout de mesure sont
-- réappliqués (ministère de la session, indicateur du mois à lui, actif ou à valider, non
-- calculé) ; controler_mesure s'applique toujours (plafond, mois au 1er, ni futur ni trop
-- ancien). Une seule instruction insert dans mesure : une ligne de journal mesure_saisie, qui ne
-- dit rien de la précision ni de la répartition. Rend le nombre de lignes de mesure écrites.
create function private.saisir_chiffres_mois(p_mois date, p_lignes jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ministere uuid;
  v_nombre integer;
  v_ligne record;
  v_categories jsonb;
  v_somme bigint;
  v_texte text;
  v_message text;
  v_ids jsonb;
begin
  perform private.exige_aal2();
  v_ministere := private.mon_ministere();
  if private.mon_type() is distinct from 'ministere' or v_ministere is null then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if p_mois is null or extract(day from p_mois) <> 1 then
    raise exception 'Un mois se saisit à la date de son 1er jour.';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Saisissez au moins un chiffre.';
  end if;
  v_nombre := jsonb_array_length(p_lignes);
  if v_nombre > 30 then
    raise exception 'Un envoi compte 30 chiffres au plus.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_lignes) as e(x)
              where jsonb_typeof(e.x) <> 'object' or jsonb_typeof(e.x -> 'indicateur_id') is distinct from 'string') then
    raise exception 'Chaque chiffre porte son indicateur et sa valeur.';
  end if;
  -- Un identifiant mal formé ne désigne aucun indicateur : même refus qu'un indicateur absent.
  if exists (select 1 from jsonb_array_elements(p_lignes) as e(x)
              where e.x ->> 'indicateur_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if (select count(distinct (e.x ->> 'indicateur_id')::uuid) from jsonb_array_elements(p_lignes) as e(x)) <> v_nombre then
    raise exception 'Un indicateur ne se saisit qu''une fois par envoi.';
  end if;
  -- Le case ne convertit que les nombres JSON : un texte ou un null n'atteint jamais le cast.
  if exists (select 1 from jsonb_array_elements(p_lignes) as e(x)
              cross join lateral (select case when jsonb_typeof(e.x -> 'valeur') = 'number'
                                              then (e.x ->> 'valeur')::numeric end as n) as v
              where v.n is null or v.n <> trunc(v.n) or abs(v.n) > 2147483647) then
    raise exception 'Chaque chiffre est un nombre entier.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_lignes) as e(x)
              where not exists (select 1 from public.indicateur i
                                 where i.id = (e.x ->> 'indicateur_id')::uuid
                                   and i.ministere_id = v_ministere
                                   and i.nature = 'mois'
                                   and i.etat in ('actif', 'en_attente')
                                   and i.calcul is null)) then
    raise exception 'Cet élément n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;

  -- Répartitions et précisions, ligne par ligne dans l'ordre de l'envoi.
  for v_ligne in
    select e.x, i.sensible, i.modele_code, (e.x ->> 'valeur')::numeric::integer as valeur
      from jsonb_array_elements(p_lignes) with ordinality as e(x, rang)
      join public.indicateur i on i.id = (e.x ->> 'indicateur_id')::uuid
     order by e.rang
  loop
    v_categories := v_ligne.x -> 'categories';
    if jsonb_typeof(v_categories) is not null and jsonb_typeof(v_categories) <> 'null' then
      if jsonb_typeof(v_categories) <> 'object' then
        raise exception 'La répartition se donne par catégorie.';
      end if;
      if v_categories <> '{}'::jsonb then
        if not v_ligne.sensible
           or (select count(*) from public.categorie_sensible c
                where c.prevu_code = v_ligne.modele_code and c.retiree_le is null) not between 3 and 6 then
          raise exception 'Cet indicateur n''a pas de répartition.';
        end if;
        if exists (select 1 from jsonb_object_keys(v_categories) as k(code)
                    where not exists (select 1 from public.categorie_sensible c
                                       where c.prevu_code = v_ligne.modele_code and c.code = k.code
                                         and c.retiree_le is null)) then
          raise exception 'Cette catégorie n''est pas dans la liste de l''indicateur.';
        end if;
        if exists (select 1 from jsonb_each(v_categories) as c(code, valeur)
                    cross join lateral (select case when jsonb_typeof(c.valeur) = 'number'
                                                    then c.valeur::text::numeric end as n) as v
                    where v.n is null or v.n <> trunc(v.n) or v.n not between 0 and 9999) then
          raise exception 'Chaque catégorie compte un nombre entier de 0 à 9 999.';
        end if;
        select sum((c.valeur::text)::numeric) into v_somme from jsonb_each(v_categories) as c(code, valeur);
        if v_somme > v_ligne.valeur then
          raise exception 'La somme des catégories (%) dépasse le total du mois (%).', v_somme, v_ligne.valeur;
        end if;
      end if;
    end if;
    if jsonb_typeof(v_ligne.x -> 'precision') is not null and jsonb_typeof(v_ligne.x -> 'precision') <> 'null' then
      if not v_ligne.sensible then
        raise exception 'Une précision accompagne seulement un indicateur sensible.';
      end if;
      if jsonb_typeof(v_ligne.x -> 'precision') <> 'string' then
        raise exception 'La précision doit faire entre 10 et 280 caractères.';
      end if;
      v_texte := btrim(v_ligne.x ->> 'precision');
      if char_length(v_texte) not between 10 and 280 then
        raise exception 'La précision doit faire entre 10 et 280 caractères.';
      end if;
      v_message := private.texte_libre_refuse(v_texte);
      if v_message is not null then
        raise exception '%', v_message;
      end if;
    end if;
  end loop;

  -- Une seule instruction : les totaux de l'envoi partagent saisi_le (forcer_auteur), et le
  -- trigger de journal écrit une seule ligne mesure_saisie.
  with nouvelles as (
    insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
    select (e.x ->> 'indicateur_id')::uuid, v_ministere, p_mois, (e.x ->> 'valeur')::numeric::integer
      from jsonb_array_elements(p_lignes) with ordinality as e(x, rang)
     order by e.rang
    returning id, indicateur_id
  )
  select jsonb_object_agg(n.indicateur_id::text, n.id) into v_ids from nouvelles n;

  -- Répartitions : toutes les catégories en cours de la liste, une catégorie absente valant 0.
  insert into public.ventilation_sensible (mesure_id, indicateur_id, ministere_id, mois, categorie, valeur)
  select (v_ids ->> i.id::text)::bigint, i.id, v_ministere, p_mois, c.code,
         coalesce((e.x -> 'categories' ->> c.code)::numeric::integer, 0)
    from jsonb_array_elements(p_lignes) with ordinality as e(x, rang)
    join public.indicateur i on i.id = (e.x ->> 'indicateur_id')::uuid
    join public.categorie_sensible c on c.prevu_code = i.modele_code and c.retiree_le is null
   where jsonb_typeof(e.x -> 'categories') = 'object' and e.x -> 'categories' <> '{}'::jsonb
   order by e.rang, c.ordre, c.code;

  insert into public.precision_sensible (mesure_id, indicateur_id, ministere_id, mois, texte)
  select (v_ids ->> i.id::text)::bigint, i.id, v_ministere, p_mois, btrim(e.x ->> 'precision')
    from jsonb_array_elements(p_lignes) with ordinality as e(x, rang)
    join public.indicateur i on i.id = (e.x ->> 'indicateur_id')::uuid
   where jsonb_typeof(e.x -> 'precision') = 'string'
   order by e.rang;

  return v_nombre;
end $$;

create function public.saisir_chiffres_mois(p_mois date, p_lignes jsonb)
returns integer language sql security invoker set search_path = '' as $$
  select private.saisir_chiffres_mois(p_mois, p_lignes);
$$;

-- 7. Modération et journal

-- Auteur d'un texte relu : les cibles des étapes 1 à 3, puis le « Pourquoi » d'une demande, le
-- motif d'un refus et la précision d'un indicateur sensible. Même signature : create or
-- replace garde le propriétaire et les droits.
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
  end if;
  if v_auteur is null then
    raise exception 'Ce texte n''existe pas ou ne contient aucun champ libre.';
  end if;
  return v_auteur;
end $$;

-- Relecture : le ministère de la ligne de journal est celui de l'auteur du texte ; pour une
-- précision, le ministère de la précision.
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
               else (select c.ministere_id from public.compte c where c.user_id = v_auteur)
          end,
          'texte_relu', p_cible, p_cible_id, '{}');
end $$;

-- Masquage : les neuf couples de B3 repris tels quels, puis (precision_sensible, texte), sous le
-- réglage local pilotage.masquage que le trigger de la table accepte, retiré aussitôt.
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
  else
    raise exception 'Ce champ ne peut pas être masqué.';
  end if;
  if v_auteur is null then
    raise exception 'Texte introuvable, vide ou déjà masqué.';
  end if;
  insert into public.moderation (cible, cible_id, champ, decision, motif, par)
  values (p_cible, p_cible_id, p_champ, 'masque', p_motif, (select auth.uid()));
  -- Ministère qui a écrit le texte : celui de la précision, sinon celui du compte auteur (null
  -- pour le berger, le conseil et EJP Tech, auteur du motif d'un refus).
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values ((select auth.uid()),
          coalesce(v_ministere, (select c.ministere_id from public.compte c where c.user_id = v_auteur)),
          'texte_masque', p_cible, p_cible_id, jsonb_build_object('champ', p_champ, 'motif', p_motif));
end $$;

-- Lecture du journal : celle de 20261005172228_droits_lecture_ejp_tech.sql, et l'administration
-- ne lit aucune ligne de cible precision_sensible (texte_relu, texte_masque : elles diraient
-- qu'une précision existe pour un indicateur sensible et un mois).
drop policy lecture on public.journal;
create policy lecture on public.journal for select to authenticated using (
  (select private.lit_tout())
  or ((select private.mon_type()) = 'admin_eglise' and private.journal_lisible_administration(action, detail)
      and coalesce(cible, '') <> 'precision_sensible')
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid()))));

-- v_journal : version de B3, plus la cible precision_sensible (« Précision : » suivi du libellé
-- actuel de l'indicateur et du mois, lu sous la RLS du lecteur : le ministère auteur et EJP
-- Tech, qui lisent la précision ; null pour le berger et le conseil, qui lisent la ligne sans ce
-- texte ; jamais le texte de la précision), et le même retrait pour l'administration que la
-- politique de lecture. Mêmes colonnes.
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
       end as cible_texte
from public.journal j
left join public.compte a on a.user_id = j.compte
left join public.ministere m on m.id = j.ministere_id
where (select private.mon_type()) is distinct from 'admin_eglise'
   or (private.journal_lisible_administration(j.action, j.detail) and coalesce(j.cible, '') <> 'precision_sensible');

-- 8. Droits des fonctions : rien pour public, anon ni service_role ; authenticated exécute
-- les fonctions lues par les vues et la fonction de l'API. Les triggers et la règle d'affichage
-- ne s'appellent qu'au nom du propriétaire.
revoke all on function
  private.controler_categorie_sensible(),
  private.verifier_ventilations(),
  private.controler_precision(),
  private.repartition_protegee(integer[]),
  private.ventilations_sensibles(),
  private.precisions_sensibles(),
  private.saisir_chiffres_mois(date, jsonb),
  public.saisir_chiffres_mois(date, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function
  private.ventilations_sensibles(),
  private.precisions_sensibles(),
  private.saisir_chiffres_mois(date, jsonb),
  public.saisir_chiffres_mois(date, jsonb)
  to authenticated;
