-- Add complaint and admin_notes columns to doctor_appointments
ALTER TABLE doctor_appointments 
ADD COLUMN IF NOT EXISTS complaint TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;
