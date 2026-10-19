-- Retrait d'un indicateur par le ministère qui l'a ajouté (décision T62 ;
-- 20261014090000_retrait_par_le_ministere.sql).
--
-- 1. Matrice des droits, écrite en données et parcourue par tests.verifier_matrice
--    (000-outils.test.sql) : retrait_indicateur (lecture, ajout direct, modification,
--    suppression), retirer_mon_indicateur sur une demande à valider, sur un ajout validé et sur un
--    chiffre commun, masquer_texte sur le couple (retrait_indicateur, motif), la modération et le
--    journal de ce couple, les lignes indicateur_retire (journal et v_journal). Profils : le
--    ministère porteur (A), un autre ministère (B), les ministères FIJ et Coordination du jeu
--    d'exemple, le berger, le conseil, l'administration de l'église et EJP Tech, en aal2 ; la
--    dérivation ajoute la ligne aal1 de chaque accès accepté et celle de l'anonyme ; les lignes
--    aal1 des écritures déjà refusées en aal2, que la dérivation n'écrit pas, sont écrites ici.
--    Seconde matrice : un compte de ministère désactivé (C), le compte actif d'un ministère
--    désactivé (D) et un compte EJP Tech désactivé, qui ne lisent ni n'écrivent plus rien de ce
--    qu'ils avaient écrit ou pouvaient lire (EJP Tech actif lit les mêmes lignes : les zéros ne
--    viennent pas d'un jeu vide).
-- 2. Refus : un prévu de la coordination, un ajout d'EJP Tech, l'indicateur d'un autre
--    ministère, un indicateur déjà retiré, un motif absent, de 9 ou de 281 caractères, avec une
--    donnée personnelle ou des crochets, un indicateur inconnu, une session aal1 ; rien ne change.
-- 3. Retrait d'une demande à valider : indicateur retiré (motif « ministere »), ligne de retrait
--    au nom du ministère, motif sans espaces de bord, journal sans le texte, demande sortie de la
--    file d'EJP Tech et plus décidable, demande gardée (ajout seulement).
-- 4. Retrait d'un ajout validé : refusé tant qu'il sert à un calcul (le nom du calcul dans le
--    message, rien ne change) ; le calcul lui-même, créé par EJP Tech, ne se retire pas par le
--    ministère ; une fois le calcul retiré par EJP Tech, les saisies restent, les ajouts du
--    ministère baissent et la suggestion redevient proposée.
-- 5. Masquage du motif par EJP Tech, journal et v_journal (le libellé, jamais le motif).
-- 6. Ajout seulement, même pour le propriétaire, sauf le masquage du motif ; code « ministere »
--    réservé à un ajout de ministère, jamais choisi par EJP Tech.
begin;

create temp table ctx as
select tests.creer_ministere('Retrait T62 porteur') as a_m,
       tests.creer_ministere('Retrait T62 autre') as b_m,
       tests.creer_ministere('Retrait T62 compte désactivé') as c_m,
       tests.creer_ministere('Retrait T62 ministère désactivé') as d_m,
       tests.compte('Ministère FIJ') as fij,
       tests.compte('Ministère Coordination') as coo,
       tests.compte('Berger') as berger,
       tests.compte('Conseil, compte 1') as conseil,
       tests.compte('Administration de l''église') as admin,
       tests.compte('EJP Tech, compte 1') as tech,
       (select i.id from public.indicateur i where i.ministere_id is null and i.code = 'service') as commun;
alter table ctx add column a uuid, add column b uuid, add column c uuid, add column d uuid,
  add column tech2 uuid,
  add column i1 uuid, add column i2 uuid, add column i3 uuid, add column i4 uuid, add column i5 uuid,
  add column ib uuid, add column p1 uuid, add column d1 uuid, add column d2 uuid,
  add column r1 uuid, add column r2 uuid, add column r3 uuid, add column calcul uuid,
  add column ic1 uuid, add column ic2 uuid, add column id1 uuid, add column id2 uuid,
  add column rc uuid, add column rd uuid;
update ctx set a = tests.creer_compte('retrait-t62-a@exemple.test', 'ministere', a_m),
               b = tests.creer_compte('retrait-t62-b@exemple.test', 'ministere', b_m),
               c = tests.creer_compte('retrait-t62-c@exemple.test', 'ministere', c_m),
               d = tests.creer_compte('retrait-t62-d@exemple.test', 'ministere', d_m),
               tech2 = tests.creer_compte('retrait-t62-tech2@exemple.test', 'admin_plateforme');
grant select on ctx to authenticated, anon;

-- Catalogue d'essai : cinq suggestions et un modèle d'un prévu.
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre)
select 'essai_ret_s' || x.n, 'suggestion', 'Essai retrait suggestion ' || x.mot,
       'Suggestion d''essai du retrait, la ' || x.mot || '.', 'mois', x.n
from (values (1, 'une'), (2, 'deux'), (3, 'trois'), (4, 'quatre'), (5, 'cinq')) as x(n, mot);
insert into private.indicateur_prevu (code, modele, libelle, definition, nature, ordre) values
  ('essai_ret_p1', 'essai retrait', 'Essai retrait prévu un', 'Premier prévu d''essai du retrait.', 'mois', 1);

-- A ajoute trois suggestions, B une.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_ret_s1', 'Pourquoi d''essai du retrait, numéro un.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_ret_s2', 'Pourquoi d''essai du retrait, numéro deux.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_ret_s3', 'Pourquoi d''essai du retrait, numéro trois.');
  perform tests.se_connecter((select b from ctx), 'aal2');
  perform public.ajouter_suggestion((select b_m from ctx), 'essai_ret_s1', 'Pourquoi d''essai du retrait, pour B.');
  perform tests.deconnecter();
end $$;
update ctx set
  i1 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_ret_s1'),
  i2 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_ret_s2'),
  i3 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_ret_s3'),
  ib = (select i.id from public.indicateur i where i.ministere_id = ctx.b_m and i.modele_code = 'essai_ret_s1');
update ctx set
  d1 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.i1),
  d2 = (select d.id from public.demande_indicateur d where d.indicateur_id = ctx.i2);

-- EJP Tech valide la première, crée le prévu de la fiche et ajoute la cinquième suggestion.
do $$
begin
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.valider_indicateur((select d1 from ctx), 'valide');
  perform public.creer_indicateurs_prevus((select a_m from ctx), 'essai retrait');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_ret_s5');
  perform tests.deconnecter();
end $$;
update ctx set
  p1 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_ret_p1'),
  i5 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_ret_s5');

-- A retire la troisième (à valider), ajoute la quatrième, puis la retire ; EJP Tech masque le
-- motif du premier retrait.
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.retirer_mon_indicateur((select i3 from ctx), 'Motif de retrait MARQUEUR-RETRAIT-1, en double.');
  perform public.ajouter_suggestion((select a_m from ctx), 'essai_ret_s4', 'Pourquoi d''essai du retrait, numéro quatre.');
  perform tests.deconnecter();
end $$;
update ctx set
  i4 = (select i.id from public.indicateur i where i.ministere_id = ctx.a_m and i.modele_code = 'essai_ret_s4'),
  r1 = (select r.id from public.retrait_indicateur r where r.indicateur_id = ctx.i3);
do $$
begin
  perform tests.se_connecter((select a from ctx), 'aal2');
  perform public.retirer_mon_indicateur((select i4 from ctx), 'Motif de retrait MARQUEUR-RETRAIT-2, plus utile.');
  perform tests.se_connecter((select tech from ctx), 'aal2');
  perform public.masquer_texte('retrait_indicateur', (select r1 from ctx), 'motif', 'autre');
  perform tests.deconnecter();
end $$;
update ctx set r2 = (select r.id from public.retrait_indicateur r where r.indicateur_id = ctx.i4);

-- C et D ajoutent deux suggestions chacun et retirent la première, avant leur désactivation : le
-- compte de C est désactivé (son ministère reste actif), le ministère de D est désactivé (son
-- compte reste actif), comme le second compte EJP Tech.
do $$
begin
  perform tests.se_connecter((select c from ctx), 'aal2');
  perform public.ajouter_suggestion((select c_m from ctx), 'essai_ret_s1', 'Pourquoi d''essai du retrait, pour C.');
  perform public.ajouter_suggestion((select c_m from ctx), 'essai_ret_s2', 'Pourquoi d''essai du retrait, pour C encore.');
  perform tests.se_connecter((select d from ctx), 'aal2');
  perform public.ajouter_suggestion((select d_m from ctx), 'essai_ret_s1', 'Pourquoi d''essai du retrait, pour D.');
  perform public.ajouter_suggestion((select d_m from ctx), 'essai_ret_s2', 'Pourquoi d''essai du retrait, pour D encore.');
  perform tests.deconnecter();
end $$;
update ctx set
  ic1 = (select i.id from public.indicateur i where i.ministere_id = ctx.c_m and i.modele_code = 'essai_ret_s1'),
  ic2 = (select i.id from public.indicateur i where i.ministere_id = ctx.c_m and i.modele_code = 'essai_ret_s2'),
  id1 = (select i.id from public.indicateur i where i.ministere_id = ctx.d_m and i.modele_code = 'essai_ret_s1'),
  id2 = (select i.id from public.indicateur i where i.ministere_id = ctx.d_m and i.modele_code = 'essai_ret_s2');
do $$
begin
  perform tests.se_connecter((select c from ctx), 'aal2');
  perform public.retirer_mon_indicateur((select ic1 from ctx), 'Motif de retrait MARQUEUR-RETRAIT-C, avant désactivation.');
  perform tests.se_connecter((select d from ctx), 'aal2');
  perform public.retirer_mon_indicateur((select id1 from ctx), 'Motif de retrait MARQUEUR-RETRAIT-D, avant désactivation.');
  perform tests.deconnecter();
end $$;
update ctx set
  rc = (select r.id from public.retrait_indicateur r where r.indicateur_id = ctx.ic1),
  rd = (select r.id from public.retrait_indicateur r where r.indicateur_id = ctx.id1);
update public.compte set desactive_le = now() where user_id in ((select c from ctx), (select tech2 from ctx));
update public.ministere set desactive_le = now() where id = (select d_m from ctx);

-- 1. Matrice en aal2. Attendus dans l'ordre des profils : porteur, autre ministère, FIJ,
-- Coordination, berger, conseil, administration, EJP Tech. Une écriture refusée en aal2 n'a pas
-- de ligne aal1 dérivée (000-outils.test.sql) : la seconde partie de la vue l'écrit (42501, le
-- GRANT ou exige_aal2 refusent avant tout le reste).
create temp view matrice_retrait (profil, objet, action, aal, attendu, requete) as
  with profils (rang, profil) as (
    values (1, 'ministère porteur'), (2, 'ministère autre'), (3, 'ministère fij'),
           (4, 'ministère coordination'), (5, 'berger'), (6, 'conseil'), (7, 'administration'),
           (8, 'EJP Tech')),
  lignes (objet, action, attendu, requete) as (values
     ('retrait_indicateur', 'lire', array['2', '0', '0', '0', '0', '0', '0', '2'],
      'select 1 from public.retrait_indicateur where ministere_id = (select a_m from ctx)'),
     ('retrait_indicateur', 'ajouter', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'insert into public.retrait_indicateur (indicateur_id, ministere_id, etat_avant, motif) select i2, a_m, ''en_attente'', ''Motif d''''un ajout direct.'' from ctx'),
     ('retrait_indicateur', 'modifier', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'update public.retrait_indicateur set motif = motif where id = (select r2 from ctx)'),
     ('retrait_indicateur', 'supprimer', array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'delete from public.retrait_indicateur where id = (select r2 from ctx)'),
     ('retirer_mon_indicateur (demande à valider)', 'appeler',
      array['ok', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.retirer_mon_indicateur((select i2 from ctx), ''Motif d''''essai de la matrice, à valider.'')'),
     ('retirer_mon_indicateur (ajout validé)', 'appeler',
      array['ok', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.retirer_mon_indicateur((select i1 from ctx), ''Motif d''''essai de la matrice, validé.'')'),
     ('retirer_mon_indicateur (chiffre commun)', 'appeler',
      array['42501', '42501', '42501', '42501', '42501', '42501', '42501', '42501'],
      'select public.retirer_mon_indicateur((select commun from ctx), ''Motif d''''essai de la matrice, commun.'')'),
     ('masquer_texte (retrait_indicateur, motif)', 'appeler',
      array['42501', '42501', '42501', '42501', '42501', '42501', '42501', 'ok'],
      'select public.masquer_texte(''retrait_indicateur'', (select r2 from ctx), ''motif'', ''nom_personne'')'),
     ('moderation (retrait_indicateur)', 'lire', array['0', '0', '0', '0', '0', '0', '0', '1'],
      'select 1 from public.moderation where cible = ''retrait_indicateur'' and cible_id = (select r1 from ctx)'),
     ('journal (texte_masque d''un retrait)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.journal where cible = ''retrait_indicateur'' and cible_id = (select r1 from ctx)'),
     ('v_journal (texte_masque d''un retrait)', 'lire', array['1', '0', '0', '0', '1', '1', '0', '1'],
      'select 1 from public.v_journal where cible = ''retrait_indicateur'' and cible_id = (select r1 from ctx)'),
     ('journal (indicateur_retire par le ministère)', 'lire', array['2', '0', '0', '0', '2', '2', '2', '2'],
      'select 1 from public.journal where action = ''indicateur_retire'' and ministere_id = (select a_m from ctx)'),
     ('v_journal (indicateur_retire par le ministère)', 'lire', array['2', '0', '0', '0', '2', '2', '2', '2'],
      'select 1 from public.v_journal where action = ''indicateur_retire'' and ministere_id = (select a_m from ctx)'))
  select p.profil, l.objet, l.action, 'aal2'::text, l.attendu[p.rang], l.requete
    from profils p cross join lignes l
  union all
  select p.profil, l.objet, l.action, 'aal1'::text, '42501'::text, l.requete
    from profils p cross join lignes l
   where l.action <> 'lire' and l.attendu[p.rang] <> 'ok';
create temp view profil_retrait (profil, compte) as
  select 'ministère porteur', c.a from ctx c union all select 'ministère autre', c.b from ctx c
  union all select 'ministère fij', c.fij from ctx c union all select 'ministère coordination', c.coo from ctx c
  union all select 'berger', c.berger from ctx c union all select 'conseil', c.conseil from ctx c
  union all select 'administration', c.admin from ctx c union all select 'EJP Tech', c.tech from ctx c;
-- Seconde matrice, en aal2, sans dérivation : les comptes désactivés. Attendus dans l'ordre : le
-- compte désactivé de C, le compte actif du ministère désactivé D, le compte EJP Tech désactivé.
-- mon_type() et mon_ministere() ne rendent rien pour eux : exige_aal2 refuse tout appel
-- (« Compte inactif ou inconnu. »), la RLS ne rend aucune ligne.
create temp view matrice_retrait_desactives (profil, objet, action, aal, attendu, requete) as
  select p.profil, m.objet, m.action, 'aal2'::text, m.attendu[p.rang], m.requete
    from (values (1, 'compte de ministère désactivé'), (2, 'ministère désactivé'),
                 (3, 'EJP Tech désactivé')) as p(rang, profil)
   cross join (values
     ('retrait_indicateur (retraits de C et D)', 'lire', array['0', '0', '0'],
      'select 1 from public.retrait_indicateur where ministere_id in ((select c_m from ctx), (select d_m from ctx))'),
     ('journal (indicateur_retire de C et D)', 'lire', array['0', '0', '0'],
      'select 1 from public.journal where action = ''indicateur_retire'' and ministere_id in ((select c_m from ctx), (select d_m from ctx))'),
     ('retirer_mon_indicateur (demande à valider de C)', 'appeler', array['42501', '42501', '42501'],
      'select public.retirer_mon_indicateur((select ic2 from ctx), ''Motif d''''essai d''''un compte désactivé.'')'),
     ('retirer_mon_indicateur (demande à valider de D)', 'appeler', array['42501', '42501', '42501'],
      'select public.retirer_mon_indicateur((select id2 from ctx), ''Motif d''''essai d''''un ministère désactivé.'')'),
     ('masquer_texte (retrait_indicateur, motif de C)', 'appeler', array['42501', '42501', '42501'],
      'select public.masquer_texte(''retrait_indicateur'', (select rc from ctx), ''motif'', ''autre'')')
   ) as m(objet, action, attendu, requete);
create temp view profil_retrait_desactives (profil, compte) as
  select 'compte de ministère désactivé', c.c from ctx c
  union all select 'ministère désactivé', c.d from ctx c
  union all select 'EJP Tech désactivé', c.tech2 from ctx c;
grant select on matrice_retrait, profil_retrait, matrice_retrait_desactives, profil_retrait_desactives
  to authenticated, anon;

-- Le plan compte les 51 tests fixes et, par tests.nombre_essais, les essais des deux matrices
-- (lignes dérivées comprises).
select plan(51
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_retrait',
                        'select profil, compte from profil_retrait', true)
  + tests.nombre_essais('select profil, objet, action, aal, attendu, requete from matrice_retrait_desactives',
                        'select profil, compte from profil_retrait_desactives', false));

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_retrait',
  'select profil, compte from profil_retrait',
  true);

select * from tests.verifier_matrice(
  'select profil, objet, action, aal, attendu, requete from matrice_retrait_desactives',
  'select profil, compte from profil_retrait_desactives',
  false);
-- Les zéros ne viennent pas d'un jeu vide : EJP Tech actif lit les deux retraits et leurs deux
-- lignes de journal.
select is(tests.compter((select tech from ctx), 'aal2',
    'select 1 from public.retrait_indicateur where ministere_id in ((select c_m from ctx), (select d_m from ctx))'),
  2, 'EJP Tech lit les retraits écrits par C et D avant leur désactivation');
select is(tests.compter((select tech from ctx), 'aal2',
    'select 1 from public.journal where action = ''indicateur_retire'' and ministere_id in ((select c_m from ctx), (select d_m from ctx))'),
  2, 'EJP Tech lit leurs lignes indicateur_retire');

-- 2. Refus
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.retirer_mon_indicateur((select p1 from ctx), 'Un motif d''essai assez long.') $$,
  'P0001', 'Cet indicateur n''a pas été ajouté par votre ministère. Demandez à EJP Tech de le retirer.',
  'un prévu de la coordination ne se retire pas par le ministère');
select throws_ok($$ select public.retirer_mon_indicateur((select i5 from ctx), 'Un motif d''essai assez long.') $$,
  'P0001', 'Cet indicateur n''a pas été ajouté par votre ministère. Demandez à EJP Tech de le retirer.',
  'un ajout d''EJP Tech sur la fiche ne se retire pas par le ministère');
select throws_ok($$ select public.retirer_mon_indicateur((select ib from ctx), 'Un motif d''essai assez long.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.',
  'l''ajout d''un autre ministère est refusé sans rien en dire');
select throws_ok($$ select public.retirer_mon_indicateur(gen_random_uuid(), 'Un motif d''essai assez long.') $$,
  '42501', 'Cet élément n''existe pas ou vous n''y avez pas accès.', 'un indicateur inconnu est refusé');
select throws_ok($$ select public.retirer_mon_indicateur((select i3 from ctx), 'Un motif d''essai assez long.') $$,
  'P0001', 'Cet indicateur est déjà retiré.', 'un indicateur déjà retiré ne se retire pas deux fois');
select throws_ok($$ select public.retirer_mon_indicateur((select i2 from ctx), null) $$,
  'P0001', 'Expliquez pourquoi vous le retirez (10 caractères au moins).', 'un retrait sans motif est refusé');
select throws_ok($$ select public.retirer_mon_indicateur((select i2 from ctx), '   Neuf car.   ') $$,
  'P0001', 'Expliquez pourquoi vous le retirez (10 caractères au moins).',
  'un motif de 9 caractères (après btrim) est refusé');
select throws_ok($$ select public.retirer_mon_indicateur((select i2 from ctx), rpad('Motif ', 281, 'x')) $$,
  'P0001', 'Le motif dépasse 280 caractères.', 'un motif de 281 caractères est refusé');
select throws_ok($$ select public.retirer_mon_indicateur((select i2 from ctx), 'Demandé par jean@exemple.test, merci.') $$,
  'P0001', 'N''écrivez aucun nom ni information personnelle.', 'un motif qui contient un email est refusé');
select throws_ok($$ select public.retirer_mon_indicateur((select i2 from ctx), '[texte masqué par EJP Tech] imité') $$,
  'P0001', 'Les crochets et « texte masqué » sont réservés à la modération.',
  'un motif qui imite le masquage est refusé');
select tests.deconnecter();
select tests.se_connecter((select a from ctx), 'aal1');
select throws_ok($$ select public.retirer_mon_indicateur((select i2 from ctx), 'Un motif d''essai assez long.') $$,
  '42501', 'Double authentification requise.', 'en aal1, le retrait est refusé');
select tests.deconnecter();
select results_eq($$
  select (select count(*)::int from public.retrait_indicateur r where r.ministere_id = c.a_m),
         (select i.etat from public.indicateur i where i.id = c.i1),
         (select i.etat from public.indicateur i where i.id = c.i2),
         (select i.etat from public.indicateur i where i.id = c.p1)
    from ctx c
$$, $$ values (2, 'actif'::text, 'en_attente'::text, 'actif'::text) $$,
  'aucun refus ne laisse de trace : deux retraits seulement, les autres indicateurs inchangés');

-- 3. Retrait d'une demande à valider
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.retirer_mon_indicateur((select i2 from ctx),
                                                        '  Le ministère ne suit plus ce chiffre MARQUEUR-RETRAIT-3.  ') $$,
  'le ministère retire sa demande à valider');
select tests.deconnecter();
update ctx set r3 = (select r.id from public.retrait_indicateur r where r.indicateur_id = ctx.i2);
select results_eq($$
  select i.etat, i.retrait_motif, i.actif, i.retire_le is not null from public.indicateur i where i.id = (select i2 from ctx)
$$, $$ values ('retire'::text, 'ministere'::text, false, true) $$,
  'l''indicateur est retiré avec le motif « ministere », à l''heure du retrait');
select results_eq($$
  select r.ministere_id, r.etat_avant, r.motif, r.saisi_par from public.retrait_indicateur r where r.id = (select r3 from ctx)
$$, $$ select a_m, 'en_attente'::text, 'Le ministère ne suit plus ce chiffre MARQUEUR-RETRAIT-3.'::text, a from ctx $$,
  'le retrait garde le ministère, l''état d''avant et le motif sans espaces de bord, au nom du compte du ministère');
select results_eq($$
  select j.compte, j.ministere_id, j.cible, j.detail from public.journal j
   where j.action = 'indicateur_retire' and j.cible_id = (select i2 from ctx)
$$, $$ select a, a_m, 'indicateur'::text,
              jsonb_build_object('motif', 'ministere', 'attente', true, 'avec_saisies', false, 'retrait', r3)
         from ctx $$,
  'une ligne indicateur_retire : des codes, des booléens et des identifiants, jamais le motif');
select is(tests.compter((select tech from ctx), 'aal2',
  format('select 1 from public.v_a_valider where demande_id = %L', (select d2 from ctx))), 0,
  'la demande retirée sort de la file d''EJP Tech');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.valider_indicateur((select d2 from ctx), 'valide') $$,
  'P0001', 'Cette demande a été retirée ou remplacée : il n''y a plus rien à décider.',
  'EJP Tech ne décide plus une demande retirée');
select tests.deconnecter();
select is((select count(*)::int from public.demande_indicateur d where d.id = (select d2 from ctx) and d.pourquoi is not null), 1,
  'la demande et son « Pourquoi » restent (ajout seulement)');

-- 4. Retrait d'un ajout validé, avec une saisie et un calcul
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ insert into public.mesure (indicateur_id, ministere_id, date_ref, valeur)
                   select i1, a_m, (private.mois_courant() - interval '1 month')::date, 7 from ctx $$,
  'le ministère saisit son ajout validé');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.creer_calcul('Essai retrait taux', 'Taux d''essai du retrait par le ministère.', 'taux',
                                            (select i1 from ctx), (select p1 from ctx), null) $$,
  'EJP Tech crée un calcul sur cet ajout');
select tests.deconnecter();
update ctx set calcul = (select i.id from public.indicateur i where i.libelle = 'Essai retrait taux');
select tests.se_connecter((select a from ctx), 'aal2');
select throws_ok($$ select public.retirer_mon_indicateur((select i1 from ctx), 'Le ministère arrête ce suivi, trop lourd.') $$,
  'P0001', 'Ce chiffre sert au calcul « Essai retrait taux » : demandez à EJP Tech de le retirer.',
  'la source d''un calcul ne se retire pas par le ministère : le message nomme le calcul');
select throws_ok($$ select public.retirer_mon_indicateur((select calcul from ctx), 'Le ministère ne lit plus ce taux.') $$,
  'P0001', 'Cet indicateur n''a pas été ajouté par votre ministère. Demandez à EJP Tech de le retirer.',
  'le calcul de la fiche, créé par EJP Tech, ne se retire pas par le ministère');
select tests.deconnecter();
select results_eq($$
  select (select i.etat from public.indicateur i where i.id = c.i1),
         (select i.etat from public.indicateur i where i.id = c.calcul),
         (select count(*)::int from public.retrait_indicateur r where r.indicateur_id = c.i1)
    from ctx c
$$, $$ values ('actif'::text, 'actif'::text, 0) $$,
  'le refus ne change rien : la source et le calcul restent actifs, aucun retrait écrit');
select tests.se_connecter((select tech from ctx), 'aal2');
select lives_ok($$ select public.retirer_indicateur((select calcul from ctx), 'plus_suivi') $$,
  'EJP Tech retire le calcul');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.retirer_mon_indicateur((select i1 from ctx), 'Le ministère arrête ce suivi, trop lourd.') $$,
  'le calcul retiré, le ministère retire son ajout validé');
select tests.deconnecter();
select is((select count(*)::int from public.mesure m where m.indicateur_id = (select i1 from ctx)), 1,
  'les saisies restent');
select results_eq($$
  select r.etat_avant, j.detail ->> 'attente', j.detail ->> 'avec_saisies', j.detail ? 'calculs'
    from public.retrait_indicateur r
    join public.journal j on j.cible_id = r.indicateur_id and j.action = 'indicateur_retire'
   where r.indicateur_id = (select i1 from ctx)
$$, $$ values ('actif'::text, 'false'::text, 'true'::text, false) $$,
  'le retrait d''un ajout validé dit « actif », avec saisies, sans calcul retiré avec lui');
select is(tests.lire((select a from ctx), 'aal2',
    format('select ajouts, ajouts_max from public.limites_indicateurs(%L)', (select a_m from ctx))),
  '[{"ajouts": 0, "ajouts_max": 3}]'::jsonb,
  'un ajout retiré ne compte plus dans les 3 ajouts du ministère');
select is(tests.compter((select a from ctx), 'aal2',
    format('select 1 from public.v_suggestions where ministere_id = %L and code like %L', (select a_m from ctx), 'essai_ret_s%')),
  4, 'les quatre suggestions retirées sont de nouveau proposées (la cinquième reste sur la fiche)');
select tests.se_connecter((select a from ctx), 'aal2');
select lives_ok($$ select public.ajouter_suggestion((select a_m from ctx), 'essai_ret_s2', 'Pourquoi d''essai, ajoutée de nouveau.') $$,
  'une suggestion retirée s''ajoute de nouveau, à valider');
select tests.deconnecter();

-- 5. Masquage du motif, journal et v_journal
select is((select r.motif from public.retrait_indicateur r where r.id = (select r1 from ctx)),
  '[texte masqué par EJP Tech]', 'EJP Tech masque le motif d''un retrait');
select results_eq($$
  select m.champ, m.decision, m.motif, m.par from public.moderation m
   where m.cible = 'retrait_indicateur' and m.cible_id = (select r1 from ctx)
$$, $$ select 'motif'::text, 'masque'::text, 'autre'::text, tech from ctx $$,
  'le masquage est consigné dans la modération');
select results_eq($$
  select j.compte, j.ministere_id, j.detail from public.journal j
   where j.action = 'texte_masque' and j.cible = 'retrait_indicateur' and j.cible_id = (select r1 from ctx)
$$, $$ select tech, a_m, jsonb_build_object('champ', 'motif', 'motif', 'autre') from ctx $$,
  'la ligne texte_masque porte le ministère du retrait, le champ et le motif de la liste');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.masquer_texte('retrait_indicateur', (select r1 from ctx), 'motif', 'autre') $$,
  'P0001', 'Texte introuvable, vide ou déjà masqué.', 'un motif déjà masqué ne se masque pas deux fois');
select throws_ok($$ select public.masquer_texte('retrait_indicateur', (select r2 from ctx), 'etat_avant', 'autre') $$,
  'P0001', 'Ce champ ne peut pas être masqué.', 'seul le motif d''un retrait se masque');
select tests.deconnecter();
select is(tests.lire((select tech from ctx), 'aal2',
    format('select cible_texte from public.v_journal where cible = %L and cible_id = %L', 'retrait_indicateur', (select r1 from ctx))),
  '[{"cible_texte": "Essai retrait suggestion trois"}]'::jsonb,
  'EJP Tech lit dans v_journal le libellé de l''indicateur retiré, jamais le motif');
select is(tests.lire((select berger from ctx), 'aal2',
    format('select cible_texte from public.v_journal where cible = %L and cible_id = %L', 'retrait_indicateur', (select r1 from ctx))),
  '[{"cible_texte": null}]'::jsonb,
  'le berger lit la ligne sans le libellé : il ne lit pas le retrait');
select is_empty($$ select 1 from public.journal j where j::text like '%MARQUEUR-RETRAIT%' $$,
  'le motif d''un retrait n''est jamais recopié dans le journal');
select is_empty($$ select 1 from public.moderation m where m::text like '%MARQUEUR-RETRAIT%' $$,
  'ni dans la modération');
select is_empty($$ select 1 from public.retrait_indicateur r where r::text like '%MARQUEUR-RETRAIT-1%' $$,
  'le motif masqué ne reste nulle part dans le retrait');

-- 6. Ajout seulement, même pour le propriétaire, sauf le masquage du motif
select throws_ok($$ update public.retrait_indicateur set motif = motif where id = (select r2 from ctx) $$, '42501',
  'La table retrait_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'retrait_indicateur : le propriétaire ne peut pas modifier une ligne');
select throws_ok($$ delete from public.retrait_indicateur where id = (select r2 from ctx) $$, '42501',
  'La table retrait_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'retrait_indicateur : le propriétaire ne peut pas effacer une ligne');
select throws_ok($$ truncate public.retrait_indicateur $$, '42501',
  'La table retrait_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'retrait_indicateur : le propriétaire ne peut pas la vider');
select throws_ok($$ update public.retrait_indicateur set motif = '[texte masqué par EJP Tech]' where id = (select r2 from ctx) $$,
  '42501', 'La table retrait_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sans le réglage de masquage, masquer directement un motif est refusé');
select set_config('pilotage.masquage', 'oui', true);
select throws_ok($$ update public.retrait_indicateur set etat_avant = 'actif', motif = '[texte masqué par EJP Tech]'
                     where id = (select r2 from ctx) $$, '42501',
  'La table retrait_indicateur est en ajout seul : elle ne se modifie pas et ne s''efface pas.',
  'sous le réglage de masquage, aucun autre champ ne change');
select lives_ok($$ update public.retrait_indicateur set motif = '[texte masqué par EJP Tech]' where id = (select r2 from ctx) $$,
  'sous le réglage de masquage, le masquage du motif passe');
select set_config('pilotage.masquage', '', true);
select throws_ok($$ update public.indicateur set etat = 'retire', retrait_motif = 'ministere' where id = (select p1 from ctx) $$,
  '23514', 'new row for relation "indicateur" violates check constraint "indicateur_retrait_ministere_check"',
  'le motif « ministere » n''existe que pour un ajout de ministère');
select tests.se_connecter((select tech from ctx), 'aal2');
select throws_ok($$ select public.retirer_indicateur((select i5 from ctx), 'ministere') $$,
  'P0001', 'Choisissez le motif du retrait.', 'EJP Tech ne choisit pas le motif « ministere »');
select tests.deconnecter();

select * from finish();
rollback;
