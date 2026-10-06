-- Étape 4, lot B2, migration 2 sur 3 : seuil des indicateurs sensibles et retrait pour
-- confidentialité dans la lecture de mesure (docs/plan-etape-4.md, section 4, « B2 » ;
-- docs/conception/vague-1-decisions.md, K5c, Q9, Q11 et X4 ; docs/decisions.md, P35, P42, P45).
--
-- Politique de lecture de mesure, réécrite depuis 20261005172228_droits_lecture_ejp_tech.sql :
-- - les lignes brutes d'un indicateur sensible ne se lisent que par le ministère qui les saisit
--   (Q9 inversée). Le berger, le conseil et EJP Tech lisent leurs valeurs par v_mesure_periode,
--   v_indicateur_serie et v_indicateur_suivi, adossées à private.mesures_periode() (migration
--   précédente), qui applique le seuil « moins de 3 » et ne rend que la saisie qui fait foi de
--   chaque mois, jamais une saisie intermédiaire du mois en cours ni sa date (P45) ;
-- - un indicateur retiré pour confidentialité ne se lit plus par l'API, pour aucun profil, EJP
--   Tech et son ministère compris (Q11) ; l'export de fin de vie se fait hors de l'API ;
-- - le reste ne change pas : le ministère lit ses lignes et les chiffres communs de tous,
--   l'administration les chiffres communs, le berger, le conseil et EJP Tech tout le reste.
--
-- La politique relit indicateur sous la RLS du lecteur : chaque profil qui lit une ligne de
-- mesure lit aussi son indicateur (un ministère lit les communs et les siens, Q3).

drop policy lecture on public.mesure;
create policy lecture on public.mesure for select to authenticated using (
  exists (
    select 1 from public.indicateur i
     where i.id = mesure.indicateur_id
       and i.retrait_motif is distinct from 'confidentialite'
       and (mesure.ministere_id = (select private.mon_ministere())
            or ((select private.lit_tout()) and not i.sensible)
            or ((select private.mon_type()) in ('ministere', 'admin_eglise')
                and i.ministere_id is null and not i.sensible))));
