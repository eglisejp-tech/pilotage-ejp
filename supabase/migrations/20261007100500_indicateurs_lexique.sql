-- Étape 4, lot B1 : lexique des textes d'indicateurs (docs/plan-etape-4.md, section 4, « B1 » ;
-- docs/conception/configuration-indicateurs.md 6.1 ; contrat-etape-4.md, sections 4 et 7).
--
-- private.verifier_texte(p_texte, p_pour_ministere) rend une ligne par famille trouvée
-- (famille, message, bloquant), dans un ordre fixe. Elle n'écrit rien et ne refuse rien
-- elle-même : les fonctions de l'API (B3 : verifier_libelle, creer_indicateur,
-- ajouter_suggestion ; B7 : signaler_difficulte) choisissent les familles qui les concernent.
-- C'est la seule garde côté base contre les données personnelles dans le « Pourquoi », qui n'a
-- pas de rappel sous son champ (T30).
--
-- Familles du lot 1 (codes fixés par W0) :
-- - donnees_personnelles : « @ », « http », « www », 5 chiffres ou plus de suite (espaces,
--   points et tirets retirés), civilité suivie d'un mot en majuscule (« Mme Durand ») ;
-- - crochets : « [ » ou « texte masqué » (réservés à la modération) ;
-- - calcul, cumul, periode : mots de private.terme, et « % » pour calcul ;
-- - sensible : mots de private.terme ; bloquant pour l'administration et EJP Tech (sauf case
--   « Domaine sensible » ou confirmation, contrôlées par B3), simple indice pour un ministère.
-- La famille doublon dépend de la fiche : verifier_libelle (B3) la calcule. Un « à ce jour »
-- accepte la famille cumul (« Vues cumulées YouTube ») : verifier_libelle connaît le rythme et
-- l'écarte.
--
-- Les mots se cherchent sur le texte normalisé (private.normaliser), dont on retire d'abord les
-- noms connus des dispositifs (« Prière des Stars », « Welcome Prodiges », « Pages Roses »,
-- « Call your sister ») : les mots d'un terme se suivent, chacun seul ou suivi de « e », « s »,
-- « es » ou « x » (« accompagné » trouve « accompagnées », « moyenne » ne trouve pas
-- « Moyens techniques »).

create table private.terme (
  terme text primary key check (terme ~ '^[a-z0-9]+( [a-z0-9]+)*$'),
  famille text not null check (famille in ('calcul', 'cumul', 'periode', 'sensible')),
  pour text not null default 'tous' check (pour in ('tous', 'ministere'))   -- « ministere » : lot 2
);

insert into private.terme (terme, famille) values
  ('taux', 'calcul'), ('pourcentage', 'calcul'), ('moyenne', 'calcul'), ('ratio', 'calcul'),
  ('evolution', 'calcul'), ('par evenement', 'calcul'), ('par session', 'calcul'), ('par personne', 'calcul'),
  ('delai moyen', 'calcul'), ('temps moyen', 'calcul'), ('panier moyen', 'calcul'),
  ('cumul', 'cumul'), ('cumule', 'cumul'), ('depuis le debut', 'cumul'), ('de l annee', 'cumul'),
  ('depuis janvier', 'cumul'), ('sur l annee', 'cumul'),
  ('ce mois', 'periode'), ('du mois', 'periode'), ('par mois', 'periode'), ('chaque mois', 'periode'),
  ('mensuel', 'periode'), ('mensuelle', 'periode'), ('par semaine', 'periode'), ('chaque semaine', 'periode'),
  ('cette semaine', 'periode'), ('de la semaine', 'periode'), ('hebdomadaire', 'periode'),
  ('chaque dimanche', 'periode'), ('du dimanche', 'periode'), ('par dimanche', 'periode'),
  ('ce dimanche', 'periode'), ('par an', 'periode'), ('par annee', 'periode'), ('cette annee', 'periode'),
  ('annuel', 'periode'), ('annuelle', 'periode'),
  ('sante', 'sensible'), ('soin', 'sensible'), ('medical', 'sensible'), ('malade', 'sensible'),
  ('maladie', 'sensible'), ('hopital', 'sensible'), ('hospitalisation', 'sensible'),
  ('prise en charge', 'sensible'), ('pec', 'sensible'), ('ecoute', 'sensible'), ('accompagne', 'sensible'),
  ('accompagnement', 'sensible'), ('beneficiaire', 'sensible'), ('orientation', 'sensible'),
  ('oriente', 'sensible'), ('enfant', 'sensible'), ('mineur', 'sensible'), ('bebe', 'sensible'),
  ('handicap', 'sensible'), ('deuil', 'sensible'), ('intervention', 'sensible'), ('victime', 'sensible'),
  ('detresse', 'sensible');

revoke all on private.terme from public, anon, authenticated, service_role;

create function private.verifier_texte(p_texte text, p_pour_ministere boolean)
returns table (famille text, message text, bloquant boolean)
language plpgsql stable set search_path = '' as $$
declare
  v_brut text := coalesce(p_texte, '');
  v_normal text;
  v_nom text;
  v_familles text[] := array[]::text[];
begin
  -- Dans le texte brut, avant toute normalisation.
  if v_brut ~* '(@|http|www)'
     or regexp_replace(v_brut, '[[:space:].' || chr(160) || chr(8239) || '-]', '', 'g') ~ '[0-9]{5}'
     or v_brut ~ ('(^|[^A-Za-zÀ-ÖØ-öø-ÿ])'
                  || '(M\.|[Mm]me|[Mm]mes|[Mm]lle|Mr|[Mm]onsieur|[Mm]adame|[Mm]ademoiselle|[Ff]r[eè]re|'
                  || '[Ss]oeur|[Ss]œur|[Pp]asteur|[Pp]asteure|[Dd]octeur|Dr\.?|[Pp]ère|[Mm]aître|[Dd]iacre|'
                  || '[Aa]pôtre|[Pp]rophète)'
                  || '[[:space:]' || chr(160) || ']+[A-ZÀ-ÖØ-ÞŒ]') then
    v_familles := v_familles || 'donnees_personnelles'::text;
  end if;
  if position('[' in v_brut) > 0 or v_brut ~* 'texte masqu' then
    v_familles := v_familles || 'crochets'::text;
  end if;
  if position('%' in v_brut) > 0 then
    v_familles := v_familles || 'calcul'::text;
  end if;

  -- Sur le texte normalisé, noms connus des dispositifs retirés.
  v_normal := ' ' || private.normaliser(v_brut) || ' ';
  foreach v_nom in array array['priere des stars', 'welcome prodiges', 'pages roses', 'call your sister'] loop
    v_normal := replace(v_normal, ' ' || v_nom || ' ', ' ');
  end loop;
  v_familles := v_familles || array(
    select distinct t.famille from private.terme t
     where (t.pour = 'tous' or coalesce(p_pour_ministere, false))
       and v_normal ~ (' ' || regexp_replace(t.terme, '([a-z0-9]+)', '\1(e|s|es|x)?', 'g') || ' '));

  return query
  select f.code,
         case f.code
           when 'donnees_personnelles' then 'N''écrivez aucun nom ni information personnelle.'
           when 'crochets' then 'Les crochets et « texte masqué » sont réservés à la modération.'
           when 'calcul' then 'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.'
           when 'cumul' then 'La somme de l''année s''affiche toute seule : saisissez le chiffre de la période.'
           when 'periode' then 'Inutile d''écrire la période : choisissez le rythme plus bas.'
           when 'sensible' then
             case when coalesce(p_pour_ministere, false)
                  then 'Ce chiffre semble toucher la santé, l''accompagnement ou les enfants. Un domaine sensible se demande à l''administration de l''église. EJP Tech vérifiera votre ajout.'
                  else 'Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n''est pas le cas.'
             end
         end,
         case when f.code = 'sensible' then not coalesce(p_pour_ministere, false) else true end
    from unnest(array['donnees_personnelles', 'crochets', 'calcul', 'cumul', 'periode', 'sensible'])
         with ordinality as f(code, rang)
   where f.code = any (v_familles)
   order by f.rang;
end $$;

revoke all on function private.verifier_texte(text, boolean) from public, anon, authenticated, service_role;
