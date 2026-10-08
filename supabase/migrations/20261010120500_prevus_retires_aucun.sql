-- Correctif du 8 octobre 2026, constaté en production : un ministère dont tous les indicateurs
-- prévus ont été retirés (par exemple les prévus d'un autre modèle, créés par erreur puis retirés
-- avec le motif « erreur ») ne pouvait plus recevoir le modèle « aucun » : le contrôle comptait
-- aussi les prévus retirés. Il ne compte plus que les prévus qui ne sont pas retirés.
-- La règle « un prévu retiré ne renaît pas par un second appel » ne change pas.
--
-- Seule cette condition change. Plutôt que de recopier les 370 lignes de
-- private.creer_indicateurs_prevus (dernière définition : 20261009100000_indicateurs_vague_1.sql),
-- la migration reprend la définition en place, remplace la condition et s'arrête si le texte
-- attendu manque ou apparaît plus d'une fois. create or replace garde le propriétaire et les droits.
do $migration$
declare
  v_avant constant text := E'where i.ministere_id = p_ministere_id) then\n'
    || E'      raise exception ''Cette fiche a déjà des indicateurs prévus';
  v_apres constant text := E'where i.ministere_id = p_ministere_id and i.etat <> ''retire'') then\n'
    || E'      raise exception ''Cette fiche a déjà des indicateurs prévus';
  v_definition text;
begin
  v_definition := pg_get_functiondef('private.creer_indicateurs_prevus(uuid, text)'::regprocedure);
  if (length(v_definition) - length(replace(v_definition, v_avant, ''))) / length(v_avant) <> 1 then
    raise exception 'creer_indicateurs_prevus : condition du modèle « aucun » introuvable ou en double';
  end if;
  execute replace(v_definition, v_avant, v_apres);
end
$migration$;
