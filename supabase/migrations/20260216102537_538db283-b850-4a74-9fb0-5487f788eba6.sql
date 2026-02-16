
-- Metabolik hesaplamalar için profil tablosuna yeni alanlar ekle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS gender TEXT NULL CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS age INTEGER NULL;
