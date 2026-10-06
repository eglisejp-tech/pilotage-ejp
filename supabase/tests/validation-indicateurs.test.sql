-- Validation par EJP Tech des indicateurs ajoutés par un ministère (T30 ; lot B3 ;
-- docs/plan-etape-4.md, section 4, « B3 » ; validation-metier.md 2 et 6.6) : « Pourquoi » de 9,
-- 10, 280 et 281 caractères, sans données personnelles ; ajout né à valider, saisissable ;
-- « Pourquoi » jamais au journal, illisible pour le berger, le conseil, l'administration et un
-- autre ministère ; file d'EJP Tech (attente à l'heure de Paris, retard, valeurs) ; décision
-- unique, par EJP Tech seul, sous verrou ; refus retiré avec le motif « refuse », sans ligne
-- indicateur_retire ; demande retirée ; fraîcheur du ministère inchangée par une décision ;
-- limite de 3 ajouts ; ajout de l'administration sans demande ; masquage du « Pourquoi » et du
-- motif sans trace.
begin;

select plan(75);

create temp table ctx as
select tests.creer_ministere('Validation A') as a_m,
       tests.creer_ministere('Validation B') as b_m,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech;
alter table ctx add column a uuid, add column b uuid, add column tech2 uuid,
  add column i1 uuid, add column i2 uuid, add column i3 uuid, add column i4 uuid, add column i8 uuid,
  add column d1 uuid, add column d2 uuid, add column d3 uuid, add column d4 uuid,
  add column vieille uuid, add column recente uuid, add column fraicheur timestamptz;
update ctx set a = tests.creer_compte('validation-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('validation-b@exemple.test', 'ministere', b_m),
               tech2 = tests.creer_compte('validation-tech2@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated;

insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre)
select 'essai_val_s' || n, 'suggestion', 'Essai validation suggestion ' || x.mot,
       'Suggestion d''essai de la validation, la ' || x.mot || '.', 'mois', n
from (values (1, 'une'), (2, 'deux'), (3, 'trois'), (4, 'quatre'), (5, 'cinq'), (6, 'six'), (7, 'sept'),
             (8, 'huit')) as x(n, mot);

-- 1. « Pourquoi » : obligatoire, 10 à 280 caractères après btrim, sans données personnelles
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1') $$,
  'P0001', 'Expliquez pourquoi en 10 caractères au moins.', 'une suggestion d''un ministère sans « Pourquoi » est refusée');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1', '  Neuf car.  ') $$,
  'P0001', 'Expliquez pourquoi en 10 caractères au moins.', 'un « Pourquoi » de 9 caractères (après btrim) est refusé');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1', rpad('Pourquoi ', 281, 'x')) $$,
  'P0001', '280 caractères au plus.', 'un « Pourquoi » de 281 caractères est refusé');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1',
                     'Écrivez à jean@exemple.test pour en savoir plus.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un « Pourquoi » qui contient un email est refusé');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1',
                     'Appeler le 06 12 34 56 78 pour les détails.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un « Pourquoi » qui contient un numéro de téléphone est refusé');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1',
                     '[texte masqué par EJP Tech] pour imiter') $$,
  'P0001', 'Les crochets et « texte masqué » sont réservés à la modération.', 'un « Pourquoi » qui imite le masquage est refusé');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_inconnu', 'Pourquoi d''un code inconnu.') $$,
  'P0001', 'Cette suggestion n''existe pas.', 'un code absent des suggestions est refusé');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1', 'Dix chars.') $$,
  'un « Pourquoi » de 10 caractères est accepté');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s2', rpad('Pourquoi ', 280, 'x')) $$,
  'un « Pourquoi » de 280 caractères est accepté');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s3',
                    '  Suivre MARQUEUR-POURQUOI-B3 chaque mois.  ') $$,
  'un « Pourquoi » avec un marqueur est accepté');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s4', 'Pourquoi de trop ici.') $$,
  'P0001', 'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.',
  'un quatrième ajout du ministère est refusé (3 ajouts actifs ou à valider)');
select throws_ok($$ select public.ajouter_suggestion((select b_m from ctx), 'essai_val_s4', 'Pourquoi pour une autre fiche.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un ministère n''ajoute rien sur une autre fiche');
select tests.deconnecter();

update ctx set
  i1 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_val_s1'),
  i2 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_val_s2'),
  i3 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_val_s3');
update ctx set
  d1 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.i1),
  d2 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.i2),
  d3 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.i3);

select is((select count(*)::int from public.indicateur i where i.ministere_id = (select a_m from ctx)), 3,
  'un ajout refusé ne laisse aucun indicateur');
select results_eq($$ select i.etat, i.origine, i.actif, i.libelle from public.indicateur i where i.id = (select i1 from ctx) $$,
  $$ values ('en_attente'::text, 'ministere'::text, false, 'Essai validation suggestion une'::text) $$,
  'l''ajout d''un ministère naît à valider, avec le libellé de la suggestion');
select results_eq($$ select d.objet, d.libelle, d.pourquoi, d.saisi_par, d.definition from public.demande_indicateur d
                      where d.id = (select d3 from ctx) $$,
  $$ select 'ajout'::text, 'Essai validation suggestion trois'::text, 'Suivre MARQUEUR-POURQUOI-B3 chaque mois.'::text,
            a, null::text from ctx $$,
  'la demande garde le nom envoyé et le « Pourquoi » (sans espaces de bord), au nom du compte du ministère');
select is((select count(*)::int from public.demande_indicateur d where d.ministere_id = (select a_m from ctx)), 3,
  'une demande par ajout accepté, aucune pour un refus');
select is((select count(*)::int from public.journal j
            where j.ministere_id = (select a_m from ctx) and j.action = 'indicateur_cree'), 3,
  'une ligne de journal par ajout accepté, aucune pour un refus');
select results_eq($$ select j.compte, j.cible, j.cible_id, j.detail from public.journal j
                      where j.action = 'indicateur_cree' and j.cible_id = (select i3 from ctx) $$,
  $$ select a, 'indicateur'::text, i3,
            jsonb_build_object('nature', 'mois', 'unite', 'nombre', 'origine', 'ministere', 'remplace', null,
                               'attente', true, 'demande', d3) from ctx $$,
  'la ligne indicateur_cree porte des codes et des identifiants seulement (attente, demande)');
select is_empty($$ select 1 from public.journal j where j::text like '%MARQUEUR-%' or j::text like '%Dix chars%' $$,
  'le « Pourquoi » n''est jamais recopié dans le journal');

-- 2. Saisie pendant l'attente
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
                   select i1, a_m, (private.mois_courant() - interval '1 month')::date, 4 from ctx $$,
  'un indicateur à valider se saisit déjà');
select tests.deconnecter();
select is(tests.compter((select berger from ctx), 'aal2',
  format('select 1 from public.mesure where indicateur_id = %L', (select i1 from ctx))), 1,
  'le berger lit la valeur d''un indicateur à valider');

-- 3. Lecture des demandes : le ministère et EJP Tech seulement
select is(tests.compter((select a from ctx), 'aal2',
  format('select 1 from public.demande_indicateur where ministere_id = %L', (select a_m from ctx))), 3,
  'le ministère lit ses demandes');
select is(tests.compter((select tech from ctx), 'aal2',
  format('select 1 from public.demande_indicateur where ministere_id = %L', (select a_m from ctx))), 3,
  'EJP Tech lit les demandes');
select is(tests.compter((select berger from ctx), 'aal2',
  format('select 1 from public.demande_indicateur where ministere_id = %L', (select a_m from ctx))), 0,
  'le berger ne lit aucune demande ni aucun « Pourquoi »');
select is(tests.compter((select conseil from ctx), 'aal2',
  format('select 1 from public.demande_indicateur where ministere_id = %L', (select a_m from ctx))), 0,
  'le conseil ne lit aucune demande');
select is(tests.compter((select admin from ctx), 'aal2',
  format('select 1 from public.demande_indicateur where ministere_id = %L', (select a_m from ctx))), 0,
  'l''administration ne lit aucune demande');
select is(tests.compter((select b from ctx), 'aal2',
  format('select 1 from public.demande_indicateur where ministere_id = %L', (select a_m from ctx))), 0,
  'un autre ministère ne lit aucune demande');
select is(tests.compter((select berger from ctx), 'aal2',
  format('select 1 from public.v_journal x where x::text like %L', '%MARQUEUR-%')), 0,
  'aucune ligne de v_journal ne montre le « Pourquoi » au berger');

-- 4. File d'EJP Tech : attente à l'heure de Paris, retard au-delà de 7 jours, valeurs saisies
insert into public.indicateur (libelle, definition, nature, ministere_id, etat, origine)
select x.libelle, 'Ajout d''essai pour la file d''attente.', 'mois', c.b_m, 'en_attente', 'ministere'
from ctx c cross join (values ('Essai file vieille'), ('Essai file récente')) as x(libelle);
update ctx set vieille = (select i.id from public.indicateur i where i.libelle = 'Essai file vieille'),
               recente = (select i.id from public.indicateur i where i.libelle = 'Essai file récente');
insert into public.demande_indicateur (indicateur_id, ministere_id, objet, libelle, pourquoi, saisi_le, saisi_par)
select c.vieille, c.b_m, 'ajout', 'Essai file vieille', 'Pourquoi d''un ajout ancien.',
       ((private.aujourdhui() - 9)::timestamp + time '12:00') at time zone 'Europe/Paris', c.b from ctx c
union all
select c.recente, c.b_m, 'ajout', 'Essai file récente', 'Pourquoi d''un ajout récent.',
       ((private.aujourdhui() - 7)::timestamp + time '23:30') at time zone 'Europe/Paris', c.b from ctx c;

select is_empty($$ select 1 from public.v_a_valider $$,
  'v_a_valider ne rend rien hors d''un compte EJP Tech (ici, le propriétaire du test)');
select is(tests.lire((select tech from ctx), 'aal2',
  format('select libelle_envoye, attente_jours, en_retard from public.v_a_valider where ministere_id = %L', (select b_m from ctx))),
  '[{"en_retard": false, "attente_jours": 7, "libelle_envoye": "Essai file récente"}, {"en_retard": true, "attente_jours": 9, "libelle_envoye": "Essai file vieille"}]'::jsonb,
  'EJP Tech lit l''attente en jours à l''heure de Paris, en retard au-delà de 7 jours');
select is(tests.lire((select tech from ctx), 'aal2',
  format('select objet, libelle_actuel, libelle_envoye, ministere_nom, nature, pourquoi, nb_valeurs from public.v_a_valider where demande_id = %L',
         (select d1 from ctx))),
  '[{"nature": "mois", "objet": "ajout", "pourquoi": "Dix chars.", "nb_valeurs": 1, "ministere_nom": "Validation A", "libelle_actuel": "Essai validation suggestion une", "libelle_envoye": "Essai validation suggestion une"}]'::jsonb,
  'EJP Tech lit la demande, son « Pourquoi » et le nombre de valeurs déjà saisies');
select is(tests.compter((select berger from ctx), 'aal2', 'select 1 from public.v_a_valider'), 0,
  'le berger ne lit pas la file');

-- 5. Décisions
-- Fraîcheur du ministère (règle 6 : dernière ligne de journal écrite par un de ses comptes),
-- lue avant les décisions.
update ctx set fraicheur = (select max(j.le) from public.journal j
                              join public.compte c on c.user_id = j.compte where c.ministere_id = ctx.a_m);

select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.valider_indicateur((select d1 from ctx), 'peut_etre') $$,
  'P0001', 'Choisissez de valider ou de refuser.', 'une décision hors de la liste est refusée');
select throws_ok($$ select public.valider_indicateur(gen_random_uuid(), 'valide') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'une demande inconnue donne le message d''un objet absent');
select throws_ok($$ select public.valider_indicateur((select d2 from ctx), 'refuse') $$,
  'P0001', 'Expliquez le refus (10 caractères au moins).', 'un refus sans motif est refusé');
select throws_ok($$ select public.valider_indicateur((select d2 from ctx), 'refuse', 'Neuf car.') $$,
  'P0001', 'Expliquez le refus (10 caractères au moins).', 'un motif de 9 caractères est refusé');
select throws_ok($$ select public.valider_indicateur((select d2 from ctx), 'refuse', rpad('Motif ', 281, 'x')) $$,
  'P0001', 'Le motif dépasse 280 caractères.', 'un motif de 281 caractères est refusé');
select throws_ok($$ select public.valider_indicateur((select d2 from ctx), 'refuse', 'Écrire à jean@exemple.test.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un motif qui contient un email est refusé');
select lives_ok($$ select public.valider_indicateur((select d1 from ctx), 'valide', 'Motif ignoré pour une validation.') $$,
  'EJP Tech valide un ajout');
select lives_ok($$ select public.valider_indicateur((select d2 from ctx), 'refuse', 'Dix chars.') $$,
  'EJP Tech refuse un ajout avec un motif de 10 caractères');
select lives_ok($$ select public.valider_indicateur((select d3 from ctx), 'refuse',
                     rpad('Refus MARQUEUR-MOTIF-B3 ', 280, 'x')) $$,
  'EJP Tech refuse un ajout avec un motif de 280 caractères');
select tests.deconnecter();

select tests.se_connecter((select tech2 from ctx), 'aal2');
select throws_ok($$ select public.valider_indicateur((select d1 from ctx), 'refuse', 'Second avis contraire.') $$,
  'P0001', 'Cette demande a déjà été décidée.', 'un second compte EJP Tech ne décide pas une demande déjà décidée');
select tests.deconnecter();

select results_eq($$ select i.etat, i.actif, i.retrait_motif from public.indicateur i where i.id = (select i1 from ctx) $$,
  $$ values ('actif'::text, true, null::text) $$, 'validé : l''indicateur devient actif');
select results_eq($$ select v.decision, v.motif, v.saisi_par, v.ministere_id from public.validation v where v.demande_id = (select d1 from ctx) $$,
  $$ select 'valide'::text, null::text, tech, a_m from ctx $$, 'une validation ne porte pas de motif, au nom d''EJP Tech');
select results_eq($$ select i.etat, i.actif, i.retrait_motif, i.retire_le is not null from public.indicateur i
                      where i.id = (select i2 from ctx) $$,
  $$ values ('retire'::text, false, 'refuse'::text, true) $$, 'refusé : l''indicateur est retiré avec le motif « refuse »');
select results_eq($$ select v.decision, v.motif from public.validation v where v.demande_id = (select d2 from ctx) $$,
  $$ values ('refuse'::text, 'Dix chars.'::text) $$, 'le refus garde son motif dans validation');
select results_eq($$ select j.action, j.compte, j.ministere_id, j.cible, j.detail from public.journal j
                      where j.cible_id = (select i1 from ctx) and j.action like 'indicateur_%' and j.action <> 'indicateur_cree' $$,
  $$ select 'indicateur_valide'::text, tech, a_m, 'indicateur'::text,
            jsonb_build_object('demande', d1, 'objet', 'ajout') from ctx $$,
  'une seule ligne de journal pour une validation, au nom d''EJP Tech, sans texte');
select results_eq($$ select j.action, j.detail from public.journal j
                      where j.cible_id = (select i2 from ctx) and j.action <> 'indicateur_cree' $$,
  $$ select 'indicateur_refuse'::text, jsonb_build_object('demande', d2, 'objet', 'ajout') from ctx $$,
  'une seule ligne de journal pour un refus, sans le motif, et aucune ligne indicateur_retire');
select is_empty($$ select 1 from public.journal j where j::text like '%MARQUEUR-%' or j::text like '%Dix chars%' $$,
  'ni le motif ni le « Pourquoi » n''entrent au journal');
select is((select max(j.le) from public.journal j join public.compte c on c.user_id = j.compte
            where c.ministere_id = (select a_m from ctx)), (select fraicheur from ctx),
  'la fraîcheur du ministère ne bouge pas après les décisions d''EJP Tech');
select is(tests.compter((select tech from ctx), 'aal2',
  format('select 1 from public.v_a_valider where ministere_id = %L', (select a_m from ctx))), 0,
  'une demande décidée sort de la file');

-- Lecture des décisions : le ministère, le berger, le conseil, l'administration et EJP Tech
select is(tests.compter((select a from ctx), 'aal2',
  format('select 1 from public.validation where ministere_id = %L', (select a_m from ctx))), 3,
  'le ministère lit ses décisions et leurs motifs');
select is(tests.compter((select berger from ctx), 'aal2',
  format('select 1 from public.validation where ministere_id = %L', (select a_m from ctx))), 3,
  'le berger lit les décisions');
select is(tests.compter((select admin from ctx), 'aal2',
  format('select 1 from public.validation where ministere_id = %L', (select a_m from ctx))), 3,
  'l''administration lit les décisions');
select is(tests.compter((select b from ctx), 'aal2',
  format('select 1 from public.validation where ministere_id = %L', (select a_m from ctx))), 0,
  'un autre ministère ne lit pas les décisions');

-- 6. Demande retirée avant la décision : plus rien à décider
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s4', 'Pourquoi de la quatrième.') $$,
  'après deux refus, le ministère ajoute de nouveau (les refusés ne comptent pas dans les 3 ajouts)');
select tests.deconnecter();
update ctx set i4 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_val_s4');
update ctx set d4 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.i4);
select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.retirer_indicateur((select i4 from ctx), 'erreur') $$,
  'l''administration retire l''ajout avant la décision');
select tests.deconnecter();
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.valider_indicateur((select d4 from ctx), 'valide') $$,
  'P0001', 'Cette demande a été retirée ou remplacée : il n''y a plus rien à décider.',
  'une demande dont l''indicateur est retiré ne se décide plus');
select tests.deconnecter();
select is(tests.compter((select tech from ctx), 'aal2',
  format('select 1 from public.v_a_valider where demande_id = %L', (select d4 from ctx))), 0,
  'une demande sortie n''est plus dans la file');

-- 7. Ajout d'une suggestion par l'administration : actif, sans demande ; doublon refusé
select tests.se_connecter((select admin from ctx), 'aal2');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s8') $$,
  'l''administration ajoute une suggestion sans « Pourquoi »');
select throws_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_val_s1') $$,
  'P0001', 'Cette fiche a déjà « Essai validation suggestion une ».', 'une suggestion déjà sur la fiche est refusée');
select tests.deconnecter();
update ctx set i8 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_val_s8');
select results_eq($$ select i.etat, i.origine from public.indicateur i where i.id = (select i8 from ctx) $$,
  $$ values ('actif'::text, 'eglise'::text) $$, 'un ajout de l''administration est actif tout de suite, d''origine église');
select is((select count(*)::int from public.demande_indicateur d where d.indicateur_id = (select i8 from ctx)), 0,
  'un ajout de l''administration n''a pas de demande');
select is((select j.detail from public.journal j where j.cible_id = (select i8 from ctx)),
  '{"nature": "mois", "unite": "nombre", "origine": "eglise", "remplace": null}'::jsonb,
  'la ligne de journal d''un ajout de l''administration n''a ni attente ni demande');

-- 8. Masquage du « Pourquoi » et du motif par EJP Tech, sans trace
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.masquer_texte('demande_indicateur', (select d3 from ctx), 'pourquoi', 'situation_personnelle') $$,
  'EJP Tech masque un « Pourquoi »');
select lives_ok($$ select public.masquer_texte('validation', (select v.id from public.validation v where v.demande_id = (select d3 from ctx)),
                     'motif', 'autre') $$,
  'EJP Tech masque le motif d''un refus');
select throws_ok($$ select public.masquer_texte('demande_indicateur', (select d3 from ctx), 'pourquoi', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'un « Pourquoi » déjà masqué ne se masque pas deux fois');
select throws_ok($$ select public.masquer_texte('validation', (select v.id from public.validation v where v.demande_id = (select d1 from ctx)),
                     'motif', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'une validation sans motif n''a rien à masquer');
select throws_ok($$ select public.masquer_texte('demande_indicateur', (select d3 from ctx), 'libelle', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'le nom envoyé d''une demande n''est pas un champ masquable');
select tests.deconnecter();
-- Le réglage de masquage retombe à vide à la fin de masquer_texte : le propriétaire ne masque pas
-- lui-même un autre « Pourquoi », dans la même transaction.
select throws_ok($$ update public.demande_indicateur set pourquoi = '[texte masqué par EJP Tech]' where id = (select d1 from ctx) $$,
  '42501', 'La table demande_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'après masquer_texte, le réglage de masquage est remis à vide : une modification directe est refusée');

select is_empty($$
  select 'demande_indicateur' from public.demande_indicateur x where x::text like '%MARQUEUR-%'
  union all select 'validation' from public.validation x where x::text like '%MARQUEUR-%'
  union all select 'moderation' from public.moderation x where x::text like '%MARQUEUR-%'
  union all select 'journal' from public.journal x where x::text like '%MARQUEUR-%'
$$, 'une fois masqués, le « Pourquoi » et le motif ne laissent aucune trace');
select results_eq($$ select d.pourquoi from public.demande_indicateur d where d.id = (select d3 from ctx) $$,
  $$ values ('[texte masqué par EJP Tech]'::text) $$, 'le « Pourquoi » masqué devient le texte de la modération');
select results_eq($$ select j.cible, j.ministere_id, j.detail from public.journal j
                      where j.action = 'texte_masque' and j.cible in ('demande_indicateur', 'validation')
                        and j.cible_id in (select d3 from ctx union all
                                           select v.id from public.validation v where v.demande_id = (select d3 from ctx))
                      order by j.cible $$,
  $$ select 'demande_indicateur'::text, a_m, '{"champ": "pourquoi", "motif": "situation_personnelle"}'::jsonb from ctx
     union all
     select 'validation'::text, null::uuid, '{"champ": "motif", "motif": "autre"}'::jsonb from ctx $$,
  'une ligne texte_masque par masquage, avec le ministère de l''auteur du texte (aucun pour EJP Tech)');
select is(tests.lire((select tech from ctx), 'aal2',
  format('select cible_texte from public.v_journal where action = %L and cible_id = %L', 'texte_masque', (select d3 from ctx))),
  '[{"cible_texte": "Essai validation suggestion trois"}]'::jsonb,
  'v_journal nomme l''indicateur de la demande pour EJP Tech, jamais le « Pourquoi »');
select is(tests.lire((select berger from ctx), 'aal2',
  format('select cible_texte from public.v_journal where action = %L and cible_id = %L', 'texte_masque', (select d3 from ctx))),
  '[{"cible_texte": null}]'::jsonb,
  'pour le berger, qui ne lit pas la demande, v_journal ne donne aucun texte');

select * from finish();
rollback;
