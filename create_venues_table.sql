-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    "spreadsheetUrl" TEXT,
    "publishedCsvUrl" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (safe to run on existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'spreadsheetUrl') THEN
        ALTER TABLE venues ADD COLUMN "spreadsheetUrl" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'publishedCsvUrl') THEN
        ALTER TABLE venues ADD COLUMN "publishedCsvUrl" TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read venues
CREATE POLICY "Allow read access for authenticated users" ON venues
    FOR SELECT TO authenticated USING (true);

-- Allow admin/IT users to insert/update/delete venues
CREATE POLICY "Allow full access for admin" ON venues
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed existing venues (insert new rows, update URLs for existing rows)
INSERT INTO venues (name, "spreadsheetUrl", "publishedCsvUrl") VALUES
    ('Swasana Grand Slipi', 'https://docs.google.com/spreadsheets/d/18IYznIAeduPa0pYwvpklmARytnR7y1RVlUll_su0Fww/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQfR6pZ1hBa1lrWumpqjmIhZjliCb5V4OV9y_ItAS4Q1I7ygO-hehs7td4n7eFgxL2R-aOfrcbYu0Az/pubhtml'),
    ('Swasana Brin Gatsu', 'https://docs.google.com/spreadsheets/d/1NFSl2CtrXaI8ZaJzUCmOO-LDBSrW5LIjLyndpbFdi6E/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsuUpX3nkZ2fHCnVOwm_o8Mfihfp0iN6LK06r0rCUgX7mS6LEDR_nS5vvH-A6nieJws6mOXlBTCoJ4/pubhtml'),
    ('Swasana Brin Thamrin', 'https://docs.google.com/spreadsheets/d/137HvRzJ0hl1FS2gphKkulbQQMzNVDiX3WqPtCZt4JDs/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIcANmhyTiJKvJ3b1NnJ3JzvDAaYQjLyaqK-0DPaqzc26Qzlnu-MN-vBsX8dU3jSpche9RU8hfTHcn/pubhtml'),
    ('Swasana Patrajasa', 'https://docs.google.com/spreadsheets/d/1BTsP9XetrfsrORzU9ooK2-hYVouyUbi0bDXg3q6ats0/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScQcwWrNK4w-HNnx4Hd4FV2yNt4ZPBMkQmIiRJEP8c3qn05gwqMcYbQqL2tUd_Q1uk0jzkd8a6x-FZ/pubhtml'),
    ('Swasana Lippo Kuningan', 'https://docs.google.com/spreadsheets/d/1YnY3qa8t248iY_NL1JwUwWVrYLUobUxmCipfsuqYoCc/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR0Yjcqwj8BxFOt5RElWvbnOpcvyHCHOhrgiLdp79Jmj0UhzNQdsDSd2-bE3GJKWCLMMibuW0U8Q2V/pubhtml'),
    ('Swasana Dharmagati', 'https://docs.google.com/spreadsheets/d/1WmC_HKuLr0dvDvJG_I78TfX6PKsGmiLaP9kREQHQjsM/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL2Jd00-9geQekQdyHgS0DygBd-pP_RpD3RrnbY9e_rI3PhvY0ugljPrYXOJfDXGf4jeF5gfTSz4fd/pubhtml'),
    ('Swasana Seskoad', 'https://docs.google.com/spreadsheets/d/1wLFLCTGRYzKvLNitpnnUYfrM56zdvcLN1E3uyly2NdU/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnIBQUQPLMz7Pl71WT2oiDA-BKGj-X2612WjvsToZ3pTw3g0ig_LKFiR4b344SqyvCJ76RqFgOme1U/pubhtml'),
    ('Gunawarman Bripens', 'https://docs.google.com/spreadsheets/d/10sBda1gGjtqAnBzmiPlZz2cPcGpYy_fO7Do9bi-fPbA/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGuWi-s4KmFwYPPcHPD_0oCKjayx3M-yoKqKIST4uINWm4w1KLCFO96fjIDuml9edwKUGk45zmJFX3/pubhtml'),
    ('Gunawarman Samisara', 'https://docs.google.com/spreadsheets/d/1uWcIUhoinRnXB8m1i6TtGgmC6TbqSp7PWX3XFw8jFGM/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTSeQ4tWFS4pNCMTMhrVcxbR-GBlx5ud1iP_wk0sG9rr3H5AxTLm4o3lPcNURRVevEdysdfQbD7YZ5W/pubhtml'),
    ('Pakubuwono', 'https://docs.google.com/spreadsheets/d/1SP1kId9tPv78lbUdg3XnfQpsK_jNczhxzH5fGIbq0gc/edit?usp=sharing', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjvxeeXlUrEiFstebxbxGnHiZWSaHZ6fEDglgxi8YM-va4SlTuapNEO3373sku58EESg6ftod20tfK/pubhtml'),
    ('Swasana Granadi', NULL, NULL)
ON CONFLICT (name) DO UPDATE SET
    "spreadsheetUrl" = EXCLUDED."spreadsheetUrl",
    "publishedCsvUrl" = EXCLUDED."publishedCsvUrl";
