-- Guichet · contrôle sanctions / PPE (attestation + pré-contrôle automatique)
alter table client_files add column if not exists screening jsonb;
