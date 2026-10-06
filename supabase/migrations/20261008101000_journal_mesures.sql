-- Étape 4, lot B2, migration 3 sur 3 : journal des saisies de chiffres (docs/plan-etape-4.md,
-- section 4, « B2 » ; docs/conception/contrat-etape-4.md, section 1, code mesure_saisie ;
-- configuration-indicateurs.md 5.10 ; docs/decisions.md, P45 ; BRIEF, section 3, règle 10).
--
-- 1. private.journaliser_mesures : toujours une ligne mesure_saisie par envoi (même compte, même
--    ministère, même heure), avec detail = {"lignes": [{"indicateur_id", "date_ref", "valeur",
--    "corrige"}]} :
--    - la valeur n'est écrite que pour un chiffre commun ; un indicateur propre n'a que son
--      identifiant et sa période (« Publications (septembre) ») ;
--    - corrige vaut vrai sur une ligne qui remplace une valeur déjà saisie pour la même période ;
--    - une ligne d'indicateur sensible n'entre jamais dans le detail, ni son identifiant, ni sa
--      date, ni corrige (P45) : chaque saisie intermédiaire du mois en cours et sa date seraient
--      sinon lisibles au journal par le berger, le conseil, EJP Tech et l'administration. Un envoi
--      qui ne contient que des sensibles a {"lignes": []}.
--    Le journal ne recopie jamais un texte libre ni un libellé.
-- 2. private.journal_lisible_administration : l'administration lit toutes les lignes
--    mesure_saisie, qui ne portent plus de valeur propre ni de ligne sensible, et les codes
--    indicateur_* et indicateurs_prevus_crees (B3), qui n'en portent jamais. Une ligne écrite
--    avant ce lot (étapes 1 à 3, ou saisie faite entre les lots B1 et B2) qui porte la valeur d'un
--    indicateur propre ou une ligne sensible lui reste cachée. Ni les statistiques FIJ par
--    département ni les événements : la liste fermée ne change pas pour eux.

-- 1. Journal des saisies

create or replace function private.journaliser_mesures() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, detail)
  select n.saisi_le, n.saisi_par, n.ministere_id, 'mesure_saisie',
         jsonb_build_object('lignes', coalesce(
           jsonb_agg(
             case when i.ministere_id is null
                  then jsonb_build_object('indicateur_id', n.indicateur_id, 'date_ref', n.date_ref,
                                          'valeur', n.valeur, 'corrige', c.corrige)
                  else jsonb_build_object('indicateur_id', n.indicateur_id, 'date_ref', n.date_ref,
                                          'corrige', c.corrige)
             end
             order by n.id) filter (where not i.sensible),
           '[]'::jsonb))
    from nouvelles n
    join public.indicateur i on i.id = n.indicateur_id
   cross join lateral (
     select exists (select 1 from public.mesure x
                     where x.indicateur_id = n.indicateur_id and x.ministere_id = n.ministere_id
                       and x.date_ref = n.date_ref and x.id < n.id) as corrige
   ) as c
   group by n.saisi_le, n.saisi_par, n.ministere_id;
  return null;
end $$;

-- 2. Journal de l'administration de l'église
--
-- Seul endroit qui liste ce que l'administration lit dans le journal (la politique de lecture de
-- journal et v_journal l'appellent) : pour élargir, modifier cette fonction seulement.
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
      'indicateur_refuse', 'indicateur_retire'])
  end
$$;
