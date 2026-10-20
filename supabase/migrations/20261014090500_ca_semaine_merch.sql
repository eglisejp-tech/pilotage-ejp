-- Chiffre d'affaires de Merch à la semaine (décision T64 de docs/decisions.md, réponses écrites de
-- la personne responsable du 13 octobre 2026 : « Ajouter le CA du dimanche »). Le document des KPI
-- de la coordination dit désormais « CA Hebdomadaires & Mensuels » pour Merch.
--
-- Un nouveau prévu du modèle « merch » dans private.indicateur_prevu, en plus du chiffre
-- d'affaires du mois (merch_chiffre_d_affaires, K39a) : rythme dimanche (la semaine du lundi au
-- dimanche, saisie avec les chiffres du dimanche, comme les autres prévus « Semaine » du
-- catalogue), en euros, avec la somme de l'année. Il n'entre dans aucun calcul.
--
-- Libellé et définition proposés par le lot (statut Proposé, à valider par la personne
-- responsable). Le libellé « Chiffre d'affaires à la semaine » distingue ce prévu de celui du mois
-- sans tomber dans la famille « période » du lexique (« de la semaine », « hebdomadaire » ou « du
-- dimanche » y sont) : EJP Tech pourra corriger la définition sans changer le nom
-- (corriger_indicateur contrôle le libellé entier). La définition dit quoi saisir, comme les
-- autres prévus de la semaine (Production : « dans la semaine du lundi au dimanche. Si aucun,
-- enregistrez 0. »), sans terme de la famille « période ».
--
-- Les quatre KPI que Merch a retirés de son document (stock disponible, produits en stock
-- critique, marge estimée, évolution des ventes) restent au catalogue (« Les garder »), comme le
-- coût d'achat des articles vendus, source de la marge : aucune ligne n'est retirée.
--
-- Une fiche de Merch dont les prévus sont déjà créés voit ce prévu manquer (« 1 à créer » sur
-- l'écran Indicateurs) : EJP Tech le crée par « Créer les indicateurs prévus »
-- (creer_indicateurs_prevus ne crée que les prévus qui manquent, sans doublon).

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, unite, sensible, calcul, part,
                                      sans_somme, saisi_dimanche_matin, libelle_sessions, ordre) values
  ('merch_chiffre_d_affaires_a_la_semaine', 'merch', 'Chiffre d''affaires à la semaine',
   'Montant des ventes dans la semaine du lundi au dimanche, à l''euro près, tous lieux confondus. Si aucune vente, enregistrez 0.',
   'dimanche', 'euros', false, null, false, false, false, false, 13);
