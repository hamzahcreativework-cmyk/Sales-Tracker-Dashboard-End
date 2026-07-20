-- Add id_bitrix24 column to deals table
-- Migration: Add Bitrix24 ID tracking for deals

ALTER TABLE deals
ADD COLUMN id_bitrix24 TEXT;

-- Add comment for documentation
COMMENT ON COLUMN deals.id_bitrix24 IS 'Bitrix24 contact ID linked to this deal';

-- Create index for faster lookups
CREATE INDEX idx_deals_id_bitrix24 ON deals(id_bitrix24);
