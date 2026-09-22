---
name: guichet-supabase-migrations
description: "How Guichet SQL migrations get applied : through the user's Chrome Supabase SQL editor, using window.monaco to set the text; enum values run alone"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-16T17:37:55.110Z
---

Guichet migrations (supabase/migrations/*.sql) are applied by hand in the Supabase SQL editor of project sernniidkjkwqromvmqu, driven through Claude in Chrome (the user's own logged-in session). There is no SUPABASE_DB_URL locally and no CLI link.

**Why:** the user prefers that I run the SQL rather than paste it; typing long SQL through the editor with `computer.type` is unreliable (Monaco auto-closes brackets/quotes → syntax errors, and CDP typing times out on long text).

**How to apply:** in the SQL tab, `javascript_tool` → `window.monaco.editor.getModels()[0].setValue(sql)` (comment-free, one line), click in the editor, ctrl+Return, then confirm the "Potential issue detected" dialog if the statement contains `drop` or `delete` (it also silently swallows the run otherwise"Success. No rows returned" can mean the dialog was never confirmed). Verify with a Node supabase-js probe using the service key from .env.local (never print keys). `alter type … add value` must run alone before any statement using the value (0017 then 0018). Applied so far: 0001–0029 (2026-09-18: 0023 funds visible+distributed, 0024 inbox columns, 0025 news table with RLS; 2026-09-19: 0026 channel proof columns, `channel_codes`, `trusted_devices`; 0027 `terms_version` / `terms_accepted_at`; 2026-09-20: 0028 `financial_profile` jsonb + `intents.profile_flag`; 0029 `profiles.prefs` jsonb, verified via information_schema). 2026-09-21: 0030 `template_texts` table + `documents.template_versions` jsonb, applied and verified via information_schema; 0031 `reference.data` nullable + `draft`/`draft_by`/`draft_at` (référentiel drafts); 0032 enum values document_type (mandat, coupon, reclamation, transfert) + kyc_status (en_cloture, clos), documents.flow_key unique partial index, client_files.acts jsonb: enum adds and column adds in one editor run, no statement uses the new values. 2026-09-22: 0033 enum value document_type note_indice (run alone); 0034 documents.register_no + unique partial index, appliquée et vérifiée par information_schema (référence imprimée opaque, registre interne). 0035 intents.register_no + unique partial index, appliquée et vérifiée (référence d'ordre opaque, journal des ordres interne).

Related: [[guichet-project]], [[guichet-push-after-each-step]]
