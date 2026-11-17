-- 0134 · Règles d'accès : auth.uid() / auth.role() évalués une fois par requête, pas une fois par ligne.
-- Lint Supabase « auth_rls_initplan » (26 règles du schéma public). Même logique d'accès, même nom,
-- mêmes rôles, même commande : seule l'écriture de l'appel change, `(select auth.uid())`.
-- Idempotent : une expression déjà enveloppée n'est pas retouchée.
do $$
declare
  p record;
  nq text;
  nw text;
  sql text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'auth\.(uid|role)\(\)' or coalesce(with_check, '') ~ 'auth\.(uid|role)\(\)')
  loop
    nq := p.qual;
    nw := p.with_check;
    if nq is not null and nq !~* '\(\s*select\s+auth\.' then
      nq := regexp_replace(nq, 'auth\.(uid|role)\(\)', '(select auth.\1())', 'g');
    end if;
    if nw is not null and nw !~* '\(\s*select\s+auth\.' then
      nw := regexp_replace(nw, 'auth\.(uid|role)\(\)', '(select auth.\1())', 'g');
    end if;
    if nq is distinct from p.qual or nw is distinct from p.with_check then
      sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if nq is not null then sql := sql || ' using (' || nq || ')'; end if;
      if nw is not null then sql := sql || ' with check (' || nw || ')'; end if;
      execute sql;
    end if;
  end loop;
end $$;
