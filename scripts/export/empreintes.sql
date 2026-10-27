-- Pour chaque table de public et private : nom, nombre de lignes, empreinte md5 des lignes triées
-- (T79). Lu par scripts/export/empreintes.sh, sur la base Supabase LOCALE seulement : il sert à
-- prouver qu'une restauration rend exactement les lignes exportées (saisi_le et saisi_par compris).
select
  format('%I.%I', table_schema, table_name),
  (xpath('/row/n/text()', query_to_xml(
    format('select count(*) as n from %I.%I', table_schema, table_name), false, true, '')))[1]::text,
  (xpath('/row/e/text()', query_to_xml(
    format('select md5(coalesce(string_agg(t::text, chr(10) order by t::text), %L)) as e from %I.%I t',
      '', table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables
where table_schema in ('public', 'private') and table_type = 'BASE TABLE'
order by 1;
