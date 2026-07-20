-- Safe migration: Add id_bitrix24 column to deals table (with existence check)
-- This version checks if the column already exists before adding it

DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'id_bitrix24'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE deals
        ADD COLUMN id_bitrix24 TEXT;
        
        -- Create index for faster lookups
        CREATE INDEX idx_deals_id_bitrix24 ON deals(id_bitrix24);
        
        RAISE NOTICE 'Column id_bitrix24 added successfully to deals table';
    ELSE
        RAISE NOTICE 'Column id_bitrix24 already exists in deals table';
    END IF;
END $$;
