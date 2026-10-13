-- Observabilité des personnes (T56) : lecture de passage par la session qui le remplit.
--
-- L'écran note le jour d'utilisation par un ajout sans doublon (upsert de PostgREST :
-- insert ... on conflict (intervenant_id, jour) do nothing). PostgreSQL exige alors que la
-- nouvelle ligne passe aussi les politiques de lecture de la table : avec la seule lecture
-- d'EJP Tech, l'ajout était refusé (42501) et aucun jour d'utilisation n'était noté.
--
-- Un compte de ministère actif lit donc les jours d'utilisation de sa déclaration courante, et
-- d'elle seule (aucun prénom dans passage : une déclaration et des dates). EJP Tech lit tout,
-- comme avant. Les migrations 20261013090000 et 20261013100000 sont figées.

drop policy lecture on public.passage;
create policy lecture on public.passage for select to authenticated using (
  ((select private.mon_type()) = 'ministere'
   and intervenant_id = (select private.ma_declaration_courante()))
  or (select private.mon_type()) = 'admin_plateforme');
