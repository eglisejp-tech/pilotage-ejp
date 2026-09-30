-- Étape 1, migration 4 sur 7 : politiques RLS et GRANT (BRIEF, section 7, matrice des droits,
-- et section 8, politique restrictive aal2).
--
-- Lecture : politiques permissives « lecture ». Ajout : politiques « ajout », seulement sur les
-- six tables que les ministères remplissent directement. Aucune politique ni aucun GRANT
-- update ou delete : les seuls changements passent par les fonctions de l'API (migration 6)
-- ou par les Edge Functions (clé secrète, service_role).
-- Dans les politiques, (select ...) évalue une seule fois auth.uid() et les fonctions d'aide.

-- Lecture (permissives)

create policy lecture on public.ministere for select to authenticated
  using ((select private.mon_type()) is not null);

-- Un compte désactivé lit encore sa propre ligne (écran « Ce compte est désactivé »).
create policy lecture on public.compte for select to authenticated
  using ((select private.mon_type()) is not null or user_id = (select auth.uid()));

create policy lecture on public.indicateur for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'berger', 'conseil', 'admin_eglise'));
create policy lecture on public.fij_departement for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'berger', 'conseil', 'admin_eglise'));
create policy lecture on public.session for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'berger', 'conseil', 'admin_eglise'));
create policy lecture on public.session_attendu for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'berger', 'conseil', 'admin_eglise'));
create policy lecture on public.participation for select to authenticated
  using ((select private.mon_type()) in ('ministere', 'berger', 'conseil', 'admin_eglise'));

-- Ministère : indicateurs communs de tous et ses indicateurs propres. Administration :
-- indicateurs communs. Berger et conseil : tout. EJP Tech : rien.
create policy lecture on public.mesure for select to authenticated using (
  (select private.est_decideur())
  or ministere_id = (select private.mon_ministere())
  or ((select private.mon_type()) in ('ministere', 'admin_eglise')
      and indicateur_id in (select i.id from public.indicateur i where i.ministere_id is null)));

create policy lecture on public.evenement for select to authenticated
  using ((select private.est_decideur()) or ministere_id = (select private.mon_ministere()));
create policy lecture on public.reunion for select to authenticated
  using ((select private.est_decideur()) or ministere_id = (select private.mon_ministere()));
create policy lecture on public.evenement_etat for select to authenticated
  using (evenement_id in (select e.id from public.evenement e));

-- Points : le ministère créateur, les ministères mentionnés (ce point seulement), le berger
-- et le conseil. Les mentions sont lues par une fonction security definer : aucune politique
-- ne relit l'autre table sous RLS (pas de récursion).
create policy lecture on public.point_attention for select to authenticated using (
  (select private.est_decideur())
  or ministere_id = (select private.mon_ministere())
  or id in (select private.points_mentionnant_mon_ministere()));
create policy lecture on public.point_mention for select to authenticated
  using (point_id in (select p.id from public.point_attention p));
create policy lecture on public.point_suivi for select to authenticated
  using (point_id in (select p.id from public.point_attention p));

-- Journal : tout pour le berger, le conseil et l'administration ; les lignes de son ministère
-- et de son compte pour un ministère ; les actions techniques pour EJP Tech.
create policy lecture on public.journal for select to authenticated using (
  (select private.mon_type()) in ('berger', 'conseil', 'admin_eglise')
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid())))
  or ((select private.mon_type()) = 'admin_plateforme'
      and action in ('ministere_cree', 'compte_cree', 'invitation_relancee', 'compte_desactive',
                     'compte_reactive', 'double_auth_reinitialisee', 'texte_relu', 'texte_masque')));

create policy lecture on public.moderation for select to authenticated
  using ((select private.mon_type()) = 'admin_plateforme');

-- Ajout (le with check s'évalue après les triggers before insert : auteur et date déjà posés)

create policy ajout on public.mesure for insert to authenticated with check (
  ministere_id = (select private.mon_ministere())
  and exists (select 1 from public.indicateur i
              where i.id = mesure.indicateur_id and i.actif
                and (i.ministere_id is null or i.ministere_id = mesure.ministere_id)));

create policy ajout on public.fij_departement for insert to authenticated with check (
  ministere_id = (select private.mon_ministere()) and ministere_id = (select private.ministere_fij()));

create policy ajout on public.participation for insert to authenticated with check (
  ministere_id = (select private.mon_ministere())
  and exists (select 1 from public.session s
              where s.id = participation.session_id and s.date <= (select private.aujourdhui())));

create policy ajout on public.evenement for insert to authenticated
  with check (ministere_id = (select private.mon_ministere()));

create policy ajout on public.evenement_etat for insert to authenticated with check (
  exists (select 1 from public.evenement e
          where e.id = evenement_etat.evenement_id and e.ministere_id = (select private.mon_ministere())));

create policy ajout on public.reunion for insert to authenticated
  with check (ministere_id = (select private.mon_ministere()) and reunion.date >= (select private.aujourdhui()));

-- Double authentification (section 8) : politique restrictive sur chaque table exposée, en
-- plus des politiques ci-dessus. Une seule exception : en aal1, un compte lit sa propre ligne
-- de compte ; compte n'ayant aucune écriture côté client, sa politique vise seulement select.

create policy double_authentification on public.ministere as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.compte as restrictive for select to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' or user_id = (select auth.uid()));
create policy double_authentification on public.indicateur as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.mesure as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.fij_departement as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.session as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.session_attendu as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.participation as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.evenement as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.evenement_etat as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.reunion as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.point_attention as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.point_mention as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.point_suivi as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.journal as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
create policy double_authentification on public.moderation as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- GRANT explicites. On part de zéro, puis on accorde exactement la matrice :
-- anon : rien ; authenticated : lecture partout, ajout sur six tables ; service_role : ce
-- qu'écrivent les Edge Functions (ministère, compte et leurs lignes de journal).
-- Les colonnes identity n'exigent aucun droit sur leur séquence.

revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;

grant select on public.ministere, public.compte, public.indicateur, public.mesure, public.fij_departement,
  public.session, public.session_attendu, public.participation, public.evenement, public.evenement_etat,
  public.reunion, public.point_attention, public.point_mention, public.point_suivi, public.journal,
  public.moderation to authenticated;
grant insert on public.mesure, public.fij_departement, public.participation, public.evenement,
  public.evenement_etat, public.reunion to authenticated;

grant select, insert, update on public.ministere, public.compte to service_role;   -- Edge Functions
grant insert on public.journal to service_role;
