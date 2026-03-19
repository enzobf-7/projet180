-- Ajout de client_id pour personnaliser le programme par client
-- client_id = NULL → template de base (global)
-- client_id = uuid → programme personnalisé pour ce client

ALTER TABLE program_content ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Supprimer l'ancienne contrainte d'unicité (phase_number, week_number)
ALTER TABLE program_content DROP CONSTRAINT IF EXISTS program_content_phase_number_week_number_key;

-- Nouvelle contrainte : unicité par client + phase + semaine
ALTER TABLE program_content ADD CONSTRAINT program_content_client_week_unique
  UNIQUE(client_id, phase_number, week_number);

-- Index pour les requêtes par client
CREATE INDEX IF NOT EXISTS idx_program_content_client ON program_content(client_id);
