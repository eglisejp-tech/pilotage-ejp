-- Lexique des textes d'indicateurs (étape 4, lot B1 ; configuration-indicateurs.md 6.1 ;
-- contrat-etape-4.md, section 7) : chaque famille de private.verifier_texte, les voisins
-- acceptés, les messages, le caractère bloquant selon le profil, et l'accès (ni la fonction ni
-- le lexique ne sont lisibles par l'API). Le refus d'un « Pourquoi » qui contient un email est
-- testé par B3 (ajouter_suggestion), celui d'un signalement par B7.
begin;

select plan(46);

-- Familles trouvées, dans l'ordre de la fonction, ou « aucune ».
create function pg_temp.familles(p_texte text, p_pour_ministere boolean default false) returns text
language sql as $$
  select coalesce(string_agg(f.famille, ',' order by f.n), 'aucune')
    from private.verifier_texte(p_texte, p_pour_ministere) with ordinality as f(famille, message, bloquant, n)
$$;

-- Données personnelles
select is(pg_temp.familles('Contact : jean@exemple.test'), 'donnees_personnelles', '« @ » refusé');
select is(pg_temp.familles('Voir http exemple'), 'donnees_personnelles', '« http » refusé');
select is(pg_temp.familles('Page www exemple'), 'donnees_personnelles', '« www » refusé');
select is(pg_temp.familles('06 12 34 56 78'), 'donnees_personnelles', 'un numéro de téléphone (10 chiffres, espaces retirés) refusé');
select is(pg_temp.familles('Code 06.12-34'), 'donnees_personnelles', '5 chiffres de suite, points et tirets retirés, refusés');
select is(pg_temp.familles('Promotion 2026'), 'aucune', '4 chiffres (une année) acceptés');
select is(pg_temp.familles('Visites chez Mme Durand'), 'donnees_personnelles', 'civilité suivie d''un nom refusée (Mme)');
select is(pg_temp.familles('Accueil par Frère Paul'), 'donnees_personnelles', 'civilité suivie d''un nom refusée (Frère)');
select is(pg_temp.familles('Rencontre avec M. Durand'), 'donnees_personnelles', 'civilité suivie d''un nom refusée (M.)');
select is(pg_temp.familles('Échange avec Pasteure Élodie'), 'donnees_personnelles', 'civilité suivie d''un nom accentué refusée');
select is(pg_temp.familles('Frères accueillis'), 'aucune', 'un mot proche d''une civilité, sans nom, accepté');

-- Crochets
select is(pg_temp.familles('[texte masqué par EJP Tech]'), 'crochets', '« [texte masqué par EJP Tech] » refusé');
select is(pg_temp.familles('Note [interne]'), 'crochets', 'un crochet refusé');
select is(pg_temp.familles('Texte masqué'), 'crochets', '« texte masqué » refusé, même sans crochet');

-- Calcul, cumul, période
select is(pg_temp.familles('Taux d''engagement'), 'calcul', 'taux refusé');
select is(pg_temp.familles('Engagement en %'), 'calcul', '« % » refusé');
select is(pg_temp.familles('Moyenne des présents'), 'calcul', 'moyenne refusée');
select is(pg_temp.familles('Délai moyen de résolution'), 'calcul', 'délai moyen refusé');
select is(pg_temp.familles('Présents par session'), 'calcul', '« par session » refusé');
select is(pg_temp.familles('Moyens techniques'), 'aucune', 'voisin accepté : « Moyens techniques »');
select is(pg_temp.familles('NA cumulés'), 'cumul', 'cumul refusé (forme plurielle)');
select is(pg_temp.familles('Baptisés depuis janvier'), 'cumul', '« depuis janvier » refusé');
select is(pg_temp.familles('Vues cumulées YouTube'), 'cumul',
  '« Vues cumulées YouTube » donne la famille cumul (verifier_libelle l''accepte pour un « à ce jour »)');
select is(pg_temp.familles('Publications ce mois'), 'periode', '« ce mois » refusé');
select is(pg_temp.familles('Visuels livrés ce mois'), 'periode', 'l''ancien libellé de l''étape 1 tombe dans la famille période');
select is(pg_temp.familles('Rapport hebdomadaire'), 'periode', '« hebdomadaire » refusé');
select is(pg_temp.familles('Bilan mensuelle'), 'periode', '« mensuelle » refusé');
select is(pg_temp.familles('Participants de la nuit du samedi au dimanche'), 'aucune',
  'voisin accepté : « Participants de la nuit du samedi au dimanche »');
select is(pg_temp.familles('Participants par animateur'), 'aucune', 'voisin accepté : « par animateur » n''est pas « par an »');

-- Domaine sensible, après retrait des noms connus des dispositifs
select is(pg_temp.familles('Personnes accompagnées'), 'sensible', 'forme féminine plurielle trouvée (accompagné)');
select is(pg_temp.familles('Prises en charge'), 'sensible', 'terme de plusieurs mots trouvé (prise en charge)');
select is(pg_temp.familles('Interventions'), 'sensible', 'interventions : indice « domaine sensible »');
select is(pg_temp.familles('Nouveaux enfants'), 'sensible', 'enfants : indice « domaine sensible »');
select is(pg_temp.familles('Personnes bénéficiant de la traduction'), 'aucune',
  'voisin accepté : « Personnes bénéficiant de la traduction »');
select is(pg_temp.familles('Prière des Stars : sessions'), 'aucune', 'nom connu retiré : « Prière des Stars : sessions »');
select is(pg_temp.familles('Pages Roses : profils actifs'), 'aucune', 'nom connu retiré : « Pages Roses »');
select is(pg_temp.familles('Call your sister : appels reçus'), 'aucune', 'nom connu retiré : « Call your sister »');
select is(pg_temp.familles('Publications'), 'aucune', 'un libellé simple est accepté');
select is(pg_temp.familles('Taux de prise en charge du mois'), 'calcul,periode,sensible',
  'plusieurs familles, dans l''ordre de la fonction');
select is(pg_temp.familles(null), 'aucune', 'un texte nul ne lève rien');

-- Messages et caractère bloquant
select results_eq($$ select message, bloquant from private.verifier_texte('jean@exemple.test', true) $$,
  $$ values ('N''écrivez aucun nom ni information personnelle.', true) $$,
  'données personnelles : message de la conception, bloquant pour tous');
select results_eq($$ select message, bloquant from private.verifier_texte('[x]', false) $$,
  $$ values ('Les crochets et « texte masqué » sont réservés à la modération.', true) $$, 'crochets : message, bloquant');
select results_eq($$ select bloquant from private.verifier_texte('Prises en charge', false) $$, $$ values (true) $$,
  'sensible : bloquant pour l''administration et EJP Tech (sauf case ou confirmation, B3)');
select results_eq($$ select message, bloquant from private.verifier_texte('Prises en charge', true) $$,
  $$ values ('Ce chiffre semble toucher la santé, l''accompagnement ou les enfants. Un domaine sensible se demande à l''administration de l''église. EJP Tech vérifiera votre ajout.', false) $$,
  'sensible : simple indice pour un ministère');

-- Accès
select ok(not has_function_privilege('authenticated', 'private.verifier_texte(text, boolean)', 'execute')
          and not has_function_privilege('anon', 'private.verifier_texte(text, boolean)', 'execute'),
  'verifier_texte n''est appelable que par les fonctions de la base');
select ok(not has_table_privilege('authenticated', 'private.terme', 'select')
          and not has_table_privilege('anon', 'private.terme', 'select'),
  'le lexique private.terme est illisible par l''API');

select * from finish();
rollback;
