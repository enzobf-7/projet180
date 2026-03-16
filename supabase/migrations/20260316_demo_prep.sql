-- Migration: préparation démo 18 mars 2026
-- Ajoute personal_todos, program_content, champs missions, system todos conditionnels

-- 1. Colonne day_of_week sur todos (null = quotidien, 0 = dimanche, etc.)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS day_of_week smallint;

-- 2. Table personal_todos (tâches perso ajoutées par le coaché pour le lendemain)
CREATE TABLE IF NOT EXISTS personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_own_personal_todos" ON personal_todos
  FOR ALL USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE INDEX idx_personal_todos_client_date ON personal_todos(client_id, target_date);

-- 3. Champs missions sur habits (progression, description, XP, période)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS progress_percent smallint NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS xp_reward int NOT NULL DEFAULT 100;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS period text;

-- 4. Table program_content (contenu programme configuré par Robin)
CREATE TABLE IF NOT EXISTS program_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number smallint NOT NULL,
  week_number smallint NOT NULL,
  title text NOT NULL DEFAULT '',
  objectives text NOT NULL DEFAULT '',
  focus_text text NOT NULL DEFAULT '',
  robin_notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(phase_number, week_number)
);
ALTER TABLE program_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_read_program_content" ON program_content
  FOR SELECT USING (true);
CREATE POLICY "admin_can_manage_program_content" ON program_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. WhatsApp perso Robin dans app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS robin_whatsapp text;

-- 6. Remplacer les system todos (3 types)
DELETE FROM todos WHERE is_system = true;

-- Quotidien : Préparer to-do de demain
INSERT INTO todos (client_id, title, is_system, day_of_week)
SELECT id, 'Préparer to-do de demain', true, NULL
FROM profiles WHERE role = 'client';

-- Dimanche : Poster wins de la semaine
INSERT INTO todos (client_id, title, is_system, day_of_week)
SELECT id, 'Poster wins de la semaine', true, 0
FROM profiles WHERE role = 'client';
