-- Add signature fields to onboarding_progress
-- step1_signature_name : nom tapé par le client lors de la signature
-- step1_signed_at      : timestamp ISO de la signature (peut exister déjà en code)

alter table onboarding_progress
  add column if not exists step1_signature_name text,
  add column if not exists step1_signed_at timestamptz;
