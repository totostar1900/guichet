-- The desk's changes to the reference data wait as drafts until « Publier » :
-- draft = {"op":"set","data":{…}} (new value) or {"op":"reset"} (back to the code default, or removal).
-- A row may hold a draft and no published value yet (a new entry).
alter table reference alter column data drop not null;
alter table reference add column if not exists draft jsonb;
alter table reference add column if not exists draft_by text;
alter table reference add column if not exists draft_at timestamptz;
