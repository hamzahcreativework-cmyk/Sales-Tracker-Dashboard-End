-- Safe migration: Add id_bitrix column to laporan_bitrix table (with existence check)
-- This version checks if the column already exists before adding it

DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'laporan_bitrix' AND column_name = 'id_bitrix'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE laporan_bitrix
        ADD COLUMN id_bitrix TEXT;
        
        -- Create index for faster lookups
        CREATE INDEX idx_laporan_bitrix_id_bitrix ON laporan_bitrix(id_bitrix);
        
        RAISE NOTICE 'Column id_bitrix added successfully to laporan_bitrix table';
    ELSE
        RAISE NOTICE 'Column id_bitrix already exists in laporan_bitrix table';
    END IF;
END $$;
