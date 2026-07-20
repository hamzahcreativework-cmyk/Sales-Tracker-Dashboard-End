-- Add id_bitrix column to laporan_bitrix table
-- Migration: Add Bitrix ID tracking

ALTER TABLE laporan_bitrix
ADD COLUMN id_bitrix TEXT;

-- Add comment for documentation
COMMENT ON COLUMN laporan_bitrix.id_bitrix IS 'Bitrix24 contact ID from external system';

-- Create index for faster lookups
CREATE INDEX idx_laporan_bitrix_id_bitrix ON laporan_bitrix(id_bitrix);
